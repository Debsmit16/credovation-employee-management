import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const router = Router();

// GET /api/tasks - Get tasks
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignedTo, status, priority, startDate, endDate } = req.query;
    const where: any = {};

    // Role-based filtering
    if (req.user!.role === 'EMPLOYEE') {
      where.assignedToId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      if (assignedTo) {
        where.assignedToId = assignedTo as string;
      } else {
        const reports = await prisma.user.findMany({
          where: { managerId: req.user!.id },
          select: { id: true },
        });
        where.OR = [
          { assignedToId: { in: [req.user!.id, ...reports.map(r => r.id)] } },
          { assignedById: req.user!.id },
        ];
      }
    } else if (assignedTo) {
      where.assignedToId = assignedTo as string;
    }

    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (startDate) where.dueDate = { ...where.dueDate, gte: startOfDay(parseISO(startDate as string)) };
    if (endDate) where.dueDate = { ...where.dueDate, lte: endOfDay(parseISO(endDate as string)) };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, department: true, profilePhoto: true } },
        assignedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 200,
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/today - Get today's tasks for current user
router.get('/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: req.user!.id,
        OR: [
          { dueDate: { gte: today, lt: tomorrow } },
          { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: today } },
        ],
      },
      include: {
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today tasks' });
  }
});

// POST /api/tasks - Create task
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty(),
    body('assignedToId').notEmpty(),
    body('dueDate').notEmpty(),
    body('priority').optional().isIn(['HIGH', 'MEDIUM', 'LOW']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { title, description, assignedToId, dueDate, dueTime, priority } = req.body;

      // Determine if manager-assigned or self-assigned
      const isManagerAssigned = req.user!.id !== assignedToId;

      // If assigning to others, check manager/admin role
      if (isManagerAssigned && !['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Only managers can assign tasks to others' });
        return;
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          assignedToId,
          assignedById: req.user!.id,
          dueDate: parseISO(dueDate),
          dueTime,
          priority: priority || 'MEDIUM',
          isManagerAssigned,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Create notification for assignee
      if (isManagerAssigned) {
        await prisma.notification.create({
          data: {
            userId: assignedToId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            body: `${req.user!.name} assigned you: "${title}"`,
            relatedEntityType: 'task',
            relatedEntityId: task.id,
          },
        });
      }

      res.status(201).json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

// POST /api/tasks/broadcast - Assign task to multiple employees
router.post(
  '/broadcast',
  authenticate,
  authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('title').trim().notEmpty(),
    body('assignedToIds').isArray({ min: 1 }),
    body('dueDate').notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, description, assignedToIds, dueDate, dueTime, priority } = req.body;

      const tasks = await Promise.all(
        assignedToIds.map(async (assignedToId: string) => {
          const task = await prisma.task.create({
            data: {
              title,
              description,
              assignedToId,
              assignedById: req.user!.id,
              dueDate: parseISO(dueDate),
              dueTime,
              priority: priority || 'MEDIUM',
              isManagerAssigned: true,
            },
          });

          await prisma.notification.create({
            data: {
              userId: assignedToId,
              type: 'TASK_ASSIGNED',
              title: 'New Task Assigned',
              body: `${req.user!.name} assigned you: "${title}"`,
              relatedEntityType: 'task',
              relatedEntityId: task.id,
            },
          });

          return task;
        })
      );

      res.status(201).json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to broadcast task' });
    }
  }
);

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id as string } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Assignee can update status and completionNote; creator can update everything
    const isAssignee = task.assignedToId === req.user!.id;
    const isCreator = task.assignedById === req.user!.id;
    const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);

    if (!isAssignee && !isCreator && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to update this task' });
      return;
    }

    const updateData: any = {};
    if (isAssignee) {
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.completionNote !== undefined) updateData.completionNote = req.body.completionNote;
    }
    if (isCreator || isAdmin) {
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.priority) updateData.priority = req.body.priority;
      if (req.body.dueDate) updateData.dueDate = parseISO(req.body.dueDate);
      if (req.body.dueTime !== undefined) updateData.dueTime = req.body.dueTime;
      if (req.body.status) updateData.status = req.body.status;
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id as string },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id as string } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const isCreator = task.assignedById === req.user!.id;
    const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    if (!isCreator && !isAdmin) {
      res.status(403).json({ error: 'Not authorized to delete this task' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;

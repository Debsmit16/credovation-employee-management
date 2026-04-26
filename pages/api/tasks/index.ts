import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { assignedTo, status, priority, startDate, endDate } = req.query;
    const where: any = {};

    if (req.user!.role === 'EMPLOYEE') {
      where.assignedToId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      if (assignedTo) { where.assignedToId = assignedTo as string; }
      else {
        const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
        where.OR = [
          { assignedToId: { in: [req.user!.id, ...reports.map(r => r.id)] } },
          { assignedById: req.user!.id },
        ];
      }
    } else if (assignedTo) { where.assignedToId = assignedTo as string; }

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
  },

  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { title, description, assignedToId, dueDate, dueTime, priority } = req.body;
    if (!title || !assignedToId || !dueDate) return res.status(400).json({ error: 'title, assignedToId, dueDate required' });

    const isManagerAssigned = req.user!.id !== assignedToId;
    if (isManagerAssigned && !['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Only managers can assign tasks to others' });
    }

    const task = await prisma.task.create({
      data: { title, description, assignedToId, assignedById: req.user!.id, dueDate: parseISO(dueDate), dueTime, priority: priority || 'MEDIUM', isManagerAssigned },
      include: { assignedTo: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true, email: true } } },
    });

    if (isManagerAssigned) {
      await prisma.notification.create({
        data: { userId: assignedToId, type: 'TASK_ASSIGNED', title: 'New Task Assigned', body: `${req.user!.name} assigned you: "${title}"`, relatedEntityType: 'task', relatedEntityId: task.id },
      });
    }
    res.status(201).json(task);
  },
});

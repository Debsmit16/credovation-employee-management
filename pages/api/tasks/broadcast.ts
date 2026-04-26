import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO } from 'date-fns';

export default apiHandler({
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { title, description, assignedToIds, dueDate, dueTime, priority } = req.body;
    if (!title || !assignedToIds?.length || !dueDate) return res.status(400).json({ error: 'title, assignedToIds, dueDate required' });

    const tasks = await Promise.all(
      assignedToIds.map(async (assignedToId: string) => {
        const task = await prisma.task.create({
          data: { title, description, assignedToId, assignedById: req.user!.id, dueDate: parseISO(dueDate), dueTime, priority: priority || 'MEDIUM', isManagerAssigned: true },
        });
        await prisma.notification.create({
          data: { userId: assignedToId, type: 'TASK_ASSIGNED', title: 'New Task Assigned', body: `${req.user!.name} assigned you: "${title}"`, relatedEntityType: 'task', relatedEntityId: task.id },
        });
        return task;
      })
    );
    res.status(201).json(tasks);
  },
}, { roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] });

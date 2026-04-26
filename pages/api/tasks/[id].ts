import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO } from 'date-fns';

export default apiHandler({
  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    const task = await prisma.task.findUnique({ where: { id: id as string } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAssignee = task.assignedToId === req.user!.id;
    const isCreator = task.assignedById === req.user!.id;
    const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    if (!isAssignee && !isCreator && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

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
      where: { id: id as string }, data: updateData,
      include: { assignedTo: { select: { id: true, name: true, email: true } }, assignedBy: { select: { id: true, name: true, email: true } } },
    });
    res.json(updated);
  },

  DELETE: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    const task = await prisma.task.findUnique({ where: { id: id as string } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isCreator = task.assignedById === req.user!.id;
    const isAdmin = ['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);
    if (!isCreator && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

    await prisma.task.delete({ where: { id: id as string } });
    res.json({ message: 'Task deleted' });
  },
});

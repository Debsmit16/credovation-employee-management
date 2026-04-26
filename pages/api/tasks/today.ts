import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
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
      include: { assignedBy: { select: { id: true, name: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });
    res.json(tasks);
  },
});

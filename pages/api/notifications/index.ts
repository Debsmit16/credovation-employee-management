import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { type, isRead } = req.query;
    const where: any = { userId: req.user!.id };
    if (type) where.type = type as string;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
    res.json({ notifications, unreadCount });
  },
});

import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    if (id === 'read-all') {
      await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
      return res.json({ success: true });
    }
    await prisma.notification.update({ where: { id: id as string }, data: { isRead: true } });
    res.json({ success: true });
  },
});

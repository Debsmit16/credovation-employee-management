import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const userId = (req.query.userId as string) || req.user!.id;
    if (userId !== req.user!.id && !['HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const currentYear = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({ where: { userId, year: currentYear } });
    res.json(balances);
  },
});

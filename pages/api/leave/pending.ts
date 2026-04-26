import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const where: any = { status: 'PENDING' };
    if (req.user!.role === 'MANAGER') {
      const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
      where.userId = { in: reports.map(r => r.id) };
    }
    const requests = await prisma.leaveRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, department: true, profilePhoto: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(requests);
  },
}, { roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] });

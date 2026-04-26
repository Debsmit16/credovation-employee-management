import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth();
    const y = parseInt(year as string) || new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const where: any = { status: 'APPROVED', OR: [{ startDate: { lte: end }, endDate: { gte: start } }] };
    if (req.user!.role === 'MANAGER') {
      const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
      where.userId = { in: reports.map(r => r.id) };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where, include: { user: { select: { id: true, name: true, department: true, profilePhoto: true } } }, orderBy: { startDate: 'asc' },
    });
    const holidays = await prisma.holiday.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: 'asc' } });
    res.json({ leaves, holidays, month: m, year: y });
  },
}, { roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] });

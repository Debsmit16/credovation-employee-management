import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO, startOfYear, endOfYear } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startOfYear(new Date(year, 0, 1)), lte: endOfYear(new Date(year, 0, 1)) } },
      orderBy: { date: 'asc' },
    });
    res.json(holidays);
  },
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const { name, date, type } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'name and date required' });
    try {
      const holiday = await prisma.holiday.create({ data: { name, date: parseISO(date), type: type || 'PUBLIC' } });
      res.status(201).json(holiday);
    } catch (error: any) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'A holiday already exists on this date' });
      throw error;
    }
  },
});

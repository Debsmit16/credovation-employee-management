import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO } from 'date-fns';

export default apiHandler({
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { holidays } = req.body;
    if (!Array.isArray(holidays) || holidays.length === 0) return res.status(400).json({ error: 'holidays array is required' });
    const created = await Promise.all(
      holidays.map(async (h: any) => {
        try { return await prisma.holiday.create({ data: { name: h.name, date: parseISO(h.date), type: h.type || 'PUBLIC' } }); }
        catch { return null; }
      })
    );
    res.status(201).json({ created: created.filter(Boolean).length, total: holidays.length });
  },
}, { roles: ['HR_ADMIN', 'SUPER_ADMIN'] });

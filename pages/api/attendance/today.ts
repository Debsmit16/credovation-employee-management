import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const today = startOfDay(new Date());
    const log = await prisma.attendanceLog.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });
    res.json(log);
  },
});

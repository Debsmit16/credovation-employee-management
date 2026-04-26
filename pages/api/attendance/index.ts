import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

function qstr(v: any): string | undefined { return typeof v === 'string' ? v : undefined; }

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { userId, startDate, endDate, status } = req.query;
    const where: any = {};

    if (req.user!.role === 'EMPLOYEE') {
      where.userId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      if (qstr(userId)) { where.userId = qstr(userId); }
      else {
        const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
        where.userId = { in: [req.user!.id, ...reports.map(r => r.id)] };
      }
    } else if (qstr(userId)) { where.userId = qstr(userId); }

    if (qstr(startDate)) where.date = { ...where.date, gte: startOfDay(parseISO(qstr(startDate)!)) };
    if (qstr(endDate)) where.date = { ...where.date, lte: endOfDay(parseISO(qstr(endDate)!)) };
    if (qstr(status)) where.status = qstr(status);

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
      orderBy: { date: 'desc' },
      take: 100,
    });
    res.json(logs);
  },

  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { status, morningNote } = req.body;
    const today = startOfDay(new Date());
    const now = new Date();

    const existing = await prisma.attendanceLog.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });
    if (existing) return res.status(409).json({ error: 'Already checked in today' });

    const currentHour = now.getUTCHours() + 5;
    const currentMinute = now.getUTCMinutes() + 30;
    const adjustedHour = currentMinute >= 60 ? currentHour + 1 : currentHour;
    const lateFlag = adjustedHour > 9 || (adjustedHour === 9 && (currentMinute >= 60 ? currentMinute - 60 : currentMinute) > 30);

    const log = await prisma.attendanceLog.create({
      data: { userId: req.user!.id, date: today, checkIn: now, status, morningNote, lateFlag },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(log);
  },
});

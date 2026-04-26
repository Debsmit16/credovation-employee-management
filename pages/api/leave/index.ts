import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parseISO, differenceInDays } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { userId, status, startDate, endDate } = req.query;
    const where: any = {};

    if (req.user!.role === 'EMPLOYEE') { where.userId = req.user!.id; }
    else if (req.user!.role === 'MANAGER') {
      if (userId) { where.userId = userId as string; }
      else {
        const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
        where.userId = { in: [req.user!.id, ...reports.map(r => r.id)] };
      }
    } else if (userId) { where.userId = userId as string; }

    if (status) where.status = status as string;
    if (startDate) where.startDate = { gte: parseISO(startDate as string) };
    if (endDate) where.endDate = { lte: parseISO(endDate as string) };

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, profilePhoto: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json(requests);
  },

  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate) return res.status(400).json({ error: 'leaveType, startDate, endDate required' });

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const dayDiff = differenceInDays(end, start) + 1;
    if (dayDiff > 14) return res.status(400).json({ error: 'Maximum 14 consecutive days per request' });
    if (dayDiff < 1) return res.status(400).json({ error: 'End date must be on or after start date' });

    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: req.user!.id, leaveType, year: currentYear } },
    });
    if (balance && balance.remaining < dayDiff) {
      return res.status(400).json({ error: `Insufficient leave balance. Remaining: ${balance.remaining}, Requested: ${dayDiff}` });
    }

    const request = await prisma.leaveRequest.create({
      data: { userId: req.user!.id, leaveType, startDate: start, endDate: end, reason },
      include: { user: { select: { id: true, name: true, email: true, department: true } } },
    });

    if (balance) {
      await prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: balance.pending + dayDiff, remaining: balance.remaining - dayDiff } });
    }

    if (req.user!.managerId) {
      await prisma.notification.create({
        data: { userId: req.user!.managerId, type: 'LEAVE_REQUEST', title: 'New Leave Request', body: `${req.user!.name} requested ${leaveType.replace('_', ' ').toLowerCase()} from ${startDate} to ${endDate}`, relatedEntityType: 'leave', relatedEntityId: request.id },
      });
    }
    res.status(201).json(request);
  },
});

import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);

    const todayAttendance = await prisma.attendanceLog.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });

    const todayTasks = await prisma.task.findMany({
      where: {
        assignedToId: req.user!.id,
        OR: [{ dueDate: today }, { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: today } }],
      },
      include: { assignedBy: { select: { id: true, name: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    const currentYear = new Date().getFullYear();
    const leaveBalances = await prisma.leaveBalance.findMany({ where: { userId: req.user!.id, year: currentYear } });

    const performanceTrend = await prisma.attendanceLog.findMany({
      where: { userId: req.user!.id, date: { gte: thirtyDaysAgo }, selfRating: { not: null } },
      select: { date: true, selfRating: true, managerRating: true },
      orderBy: { date: 'asc' },
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 10,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 5,
    });

    res.json({ todayAttendance, todayTasks, leaveBalances, performanceTrend, notifications, unreadCount, announcements });
  },
});

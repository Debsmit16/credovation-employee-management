import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const todayAttendance = await prisma.attendanceLog.findMany({
      where: { date: today },
      include: { user: { select: { id: true, name: true, department: true, profilePhoto: true } } },
    });

    const totalEmployees = await prisma.user.count({ where: { isActive: true } });
    const presentToday = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const wfhToday = todayAttendance.filter(a => a.status === 'WFH').length;
    const onSiteToday = todayAttendance.filter(a => a.status === 'ON_SITE_CLIENT').length;

    const onLeaveToday = await prisma.leaveRequest.count({
      where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
    });

    const absent = totalEmployees - presentToday - wfhToday - onSiteToday - onLeaveToday;

    const monthAttendance = await prisma.attendanceLog.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, selfRating: { not: null } },
      select: { selfRating: true },
    });
    const avgRating = monthAttendance.length > 0
      ? Number((monthAttendance.reduce((sum, a) => sum + (a.selfRating || 0), 0) / monthAttendance.length).toFixed(1)) : 0;

    const lateArrivals = await prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { date: { gte: monthStart, lte: monthEnd }, lateFlag: true },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    });
    const lateUsers = lateArrivals.length > 0
      ? await prisma.user.findMany({ where: { id: { in: lateArrivals.map(l => l.userId) } }, select: { id: true, name: true, department: true, profilePhoto: true } }) : [];

    const thirtyDaysAgo = subDays(today, 30);
    const heatmapData = await prisma.attendanceLog.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { userId: true, date: true, status: true, lateFlag: true },
      orderBy: { date: 'asc' },
    });

    const fourWeeksAgo = subDays(today, 28);
    const performanceData = await prisma.attendanceLog.findMany({
      where: { date: { gte: fourWeeksAgo }, selfRating: { not: null } },
      select: { date: true, selfRating: true },
      orderBy: { date: 'asc' },
    });

    const topPerformers = await prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: { date: { gte: monthStart }, selfRating: { not: null } },
      _avg: { selfRating: true }, _count: { id: true },
      orderBy: { _avg: { selfRating: 'desc' } }, take: 5,
    });
    const topPerformerUsers = topPerformers.length > 0
      ? await prisma.user.findMany({ where: { id: { in: topPerformers.map(t => t.userId) } }, select: { id: true, name: true, department: true, profilePhoto: true } }) : [];

    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true, designation: true, profilePhoto: true },
    });

    const allTasks = await prisma.task.groupBy({
      by: ['assignedToId', 'status'],
      where: { dueDate: { gte: monthStart, lte: monthEnd } },
      _count: { id: true },
    });
    const grouped: Record<string, Record<string, number>> = {};
    allTasks.forEach(t => { if (!grouped[t.assignedToId]) grouped[t.assignedToId] = {}; grouped[t.assignedToId][t.status] = t._count.id; });
    const taskCompletionChart = Object.entries(grouped).map(([userId, statuses]) => {
      const emp = employees.find(e => e.id === userId);
      const total = Object.values(statuses).reduce((s, v) => s + v, 0);
      return { userId, name: emp?.name || 'Unknown', completed: statuses['COMPLETED'] || 0, inProgress: statuses['IN_PROGRESS'] || 0, notStarted: statuses['NOT_STARTED'] || 0, blocked: statuses['BLOCKED'] || 0, total, completionRate: total > 0 ? Math.round(((statuses['COMPLETED'] || 0) / total) * 100) : 0 };
    }).sort((a, b) => b.completionRate - a.completionRate);

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 5,
    });

    res.json({
      kpis: { totalEmployees, presentToday, wfhToday, onSiteToday, onLeaveToday, absent: Math.max(0, absent), avgRating },
      todayAttendance,
      lateUsers: lateUsers.map(u => ({ ...u, lateCount: lateArrivals.find(l => l.userId === u.id)?._count.id || 0 })),
      heatmapData, performanceData,
      topPerformers: topPerformers.map(tp => ({ ...topPerformerUsers.find(u => u.id === tp.userId), avgRating: Number(tp._avg.selfRating?.toFixed(1)), logCount: tp._count.id })),
      employees, taskCompletionChart, announcements,
    });
  },
}, { roles: ['HR_ADMIN', 'SUPER_ADMIN'] });

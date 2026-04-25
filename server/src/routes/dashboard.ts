import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { startOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

const router = Router();

// GET /api/dashboard/hr - Full HR dashboard data
router.get('/hr', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Today's attendance summary
    const todayAttendance = await prisma.attendanceLog.findMany({
      where: { date: today },
      include: { user: { select: { id: true, name: true, department: true, profilePhoto: true } } },
    });

    const totalEmployees = await prisma.user.count({ where: { isActive: true } });
    const presentToday = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const wfhToday = todayAttendance.filter(a => a.status === 'WFH').length;
    const onSiteToday = todayAttendance.filter(a => a.status === 'ON_SITE_CLIENT').length;

    // Leave counts today
    const onLeaveToday = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    const absent = totalEmployees - presentToday - wfhToday - onSiteToday - onLeaveToday;

    // Average team rating this month
    const monthAttendance = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        selfRating: { not: null },
      },
      select: { selfRating: true },
    });

    const avgRating = monthAttendance.length > 0
      ? Number((monthAttendance.reduce((sum, a) => sum + (a.selfRating || 0), 0) / monthAttendance.length).toFixed(1))
      : 0;

    // Late arrivals this month (3+)
    const lateArrivals = await prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: {
        date: { gte: monthStart, lte: monthEnd },
        lateFlag: true,
      },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    });

    const lateUsers = lateArrivals.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: lateArrivals.map(l => l.userId) } },
          select: { id: true, name: true, department: true, profilePhoto: true },
        })
      : [];

    // Task completion rates this week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    const weekTasks = await prisma.task.findMany({
      where: { dueDate: { gte: weekStart, lte: weekEnd } },
      select: { assignedToId: true, status: true },
    });

    // Attendance heatmap - last 30 days
    const thirtyDaysAgo = subDays(today, 30);
    const heatmapData = await prisma.attendanceLog.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      select: { userId: true, date: true, status: true, lateFlag: true },
      orderBy: { date: 'asc' },
    });

    // Performance trend - weekly averages (last 4 weeks)
    const fourWeeksAgo = subDays(today, 28);
    const performanceData = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: fourWeeksAgo },
        selfRating: { not: null },
      },
      select: { date: true, selfRating: true },
      orderBy: { date: 'asc' },
    });

    // Top performers
    const topPerformers = await prisma.attendanceLog.groupBy({
      by: ['userId'],
      where: {
        date: { gte: monthStart },
        selfRating: { not: null },
      },
      _avg: { selfRating: true },
      _count: { id: true },
      orderBy: { _avg: { selfRating: 'desc' } },
      take: 5,
    });

    const topPerformerUsers = topPerformers.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topPerformers.map(t => t.userId) } },
          select: { id: true, name: true, department: true, profilePhoto: true },
        })
      : [];

    // All employees for reference
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, department: true, designation: true, profilePhoto: true },
    });

    res.json({
      kpis: {
        totalEmployees,
        presentToday,
        wfhToday,
        onSiteToday,
        onLeaveToday,
        absent: Math.max(0, absent),
        avgRating,
      },
      todayAttendance,
      lateUsers: lateUsers.map(u => ({
        ...u,
        lateCount: lateArrivals.find(l => l.userId === u.id)?._count.id || 0,
      })),
      weekTasks,
      heatmapData,
      performanceData,
      topPerformers: topPerformers.map(tp => ({
        ...topPerformerUsers.find(u => u.id === tp.userId),
        avgRating: Number(tp._avg.selfRating?.toFixed(1)),
        logCount: tp._count.id,
      })),
      employees,
      // Task completion chart data (per employee)
      taskCompletionChart: await (async () => {
        const allTasks = await prisma.task.groupBy({
          by: ['assignedToId', 'status'],
          where: { dueDate: { gte: monthStart, lte: monthEnd } },
          _count: { id: true },
        });
        const grouped: Record<string, Record<string, number>> = {};
        allTasks.forEach(t => {
          if (!grouped[t.assignedToId]) grouped[t.assignedToId] = {};
          grouped[t.assignedToId][t.status] = t._count.id;
        });
        return Object.entries(grouped).map(([userId, statuses]) => {
          const emp = employees.find(e => e.id === userId);
          const total = Object.values(statuses).reduce((s, v) => s + v, 0);
          return {
            userId,
            name: emp?.name || 'Unknown',
            completed: statuses['COMPLETED'] || 0,
            inProgress: statuses['IN_PROGRESS'] || 0,
            notStarted: statuses['NOT_STARTED'] || 0,
            blocked: statuses['BLOCKED'] || 0,
            total,
            completionRate: total > 0 ? Math.round(((statuses['COMPLETED'] || 0) / total) * 100) : 0,
          };
        }).sort((a, b) => b.completionRate - a.completionRate);
      })(),
      // Active announcements
      announcements: await prisma.announcement.findMany({
        where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    });
  } catch (error) {
    console.error('HR Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load HR dashboard' });
  }
});

// GET /api/dashboard/manager - Manager team dashboard
router.get('/manager', authenticate, authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());

    // Get direct reports
    const reports = await prisma.user.findMany({
      where: { managerId: req.user!.id, isActive: true },
      select: { id: true, name: true, email: true, department: true, designation: true, profilePhoto: true },
    });

    const reportIds = reports.map(r => r.id);

    // Today's team attendance
    const teamAttendance = await prisma.attendanceLog.findMany({
      where: { userId: { in: reportIds }, date: today },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });

    // Pending leave approvals
    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { userId: { in: reportIds }, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, profilePhoto: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Team tasks today
    const teamTasks = await prisma.task.findMany({
      where: {
        assignedToId: { in: reportIds },
        OR: [
          { dueDate: today },
          { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: today } },
        ],
      },
      include: {
        assignedTo: { select: { id: true, name: true, profilePhoto: true } },
      },
      orderBy: [{ priority: 'asc' }, { status: 'asc' }],
    });

    // Overdue tasks
    const overdueTasks = teamTasks.filter(t =>
      t.dueDate < today && ['NOT_STARTED', 'IN_PROGRESS'].includes(t.status)
    );

    // Announcements
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    res.json({
      reports,
      teamAttendance,
      pendingLeaves,
      teamTasks,
      overdueTasks,
      teamSize: reports.length,
      checkedInCount: teamAttendance.length,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load manager dashboard' });
  }
});

// GET /api/dashboard/employee - Employee "My Day" data
router.get('/employee', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);

    // Today's attendance
    const todayAttendance = await prisma.attendanceLog.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });

    // Today's tasks
    const todayTasks = await prisma.task.findMany({
      where: {
        assignedToId: req.user!.id,
        OR: [
          { dueDate: today },
          { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: today } },
        ],
      },
      include: { assignedBy: { select: { id: true, name: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    // Leave balances
    const currentYear = new Date().getFullYear();
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { userId: req.user!.id, year: currentYear },
    });

    // Performance trend (last 30 days)
    const performanceTrend = await prisma.attendanceLog.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: thirtyDaysAgo },
        selfRating: { not: null },
      },
      select: { date: true, selfRating: true, managerRating: true },
      orderBy: { date: 'asc' },
    });

    // Recent notifications
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    // Active announcements from HR
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    });

    res.json({
      todayAttendance,
      todayTasks,
      leaveBalances,
      performanceTrend,
      notifications,
      unreadCount,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load employee dashboard' });
  }
});

export default router;

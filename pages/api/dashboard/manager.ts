import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const today = startOfDay(new Date());
    const reports = await prisma.user.findMany({
      where: { managerId: req.user!.id, isActive: true },
      select: { id: true, name: true, email: true, department: true, designation: true, profilePhoto: true },
    });
    const reportIds = reports.map(r => r.id);

    const teamAttendance = await prisma.attendanceLog.findMany({
      where: { userId: { in: reportIds }, date: today },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });

    const pendingLeaves = await prisma.leaveRequest.findMany({
      where: { userId: { in: reportIds }, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, profilePhoto: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const teamTasks = await prisma.task.findMany({
      where: {
        assignedToId: { in: reportIds },
        OR: [{ dueDate: today }, { status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: today } }],
      },
      include: { assignedTo: { select: { id: true, name: true, profilePhoto: true } } },
      orderBy: [{ priority: 'asc' }, { status: 'asc' }],
    });

    const overdueTasks = teamTasks.filter(t => t.dueDate < today && ['NOT_STARTED', 'IN_PROGRESS'].includes(t.status));

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 3,
    });

    res.json({ reports, teamAttendance, pendingLeaves, teamTasks, overdueTasks, teamSize: reports.length, checkedInCount: teamAttendance.length, announcements });
  },
}, { roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] });

import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

const router = Router();

// GET /api/reports/:type - Generate report data
router.get('/:type', authenticate, authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { startDate, endDate, userId, department } = req.query;

    const start = startDate ? startOfDay(parseISO(startDate as string)) : startOfMonth(new Date());
    const end = endDate ? endOfDay(parseISO(endDate as string)) : endOfMonth(new Date());

    let data: any;

    switch (type) {
      case 'attendance': {
        const where: any = { date: { gte: start, lte: end } };
        if (userId) where.userId = userId as string;
        if (department) {
          const deptUsers = await prisma.user.findMany({
            where: { department: department as string },
            select: { id: true },
          });
          where.userId = { in: deptUsers.map(u => u.id) };
        }

        // Manager can only see team
        if (req.user!.role === 'MANAGER') {
          const reports = await prisma.user.findMany({
            where: { managerId: req.user!.id },
            select: { id: true },
          });
          where.userId = { in: reports.map(r => r.id) };
        }

        data = await prisma.attendanceLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, department: true, designation: true } },
          },
          orderBy: [{ date: 'asc' }, { userId: 'asc' }],
        });
        break;
      }

      case 'tasks': {
        const where: any = { dueDate: { gte: start, lte: end } };
        if (userId) where.assignedToId = userId as string;

        if (req.user!.role === 'MANAGER') {
          const reports = await prisma.user.findMany({
            where: { managerId: req.user!.id },
            select: { id: true },
          });
          where.assignedToId = { in: reports.map(r => r.id) };
        }

        data = await prisma.task.findMany({
          where,
          include: {
            assignedTo: { select: { id: true, name: true, department: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: [{ dueDate: 'asc' }],
        });
        break;
      }

      case 'performance': {
        const where: any = {
          date: { gte: start, lte: end },
          selfRating: { not: null },
        };

        data = await prisma.attendanceLog.groupBy({
          by: ['userId'],
          where,
          _avg: { selfRating: true },
          _count: { id: true },
          _min: { selfRating: true },
          _max: { selfRating: true },
        });

        // Enrich with user info
        const userIds = data.map((d: any) => d.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, department: true, designation: true },
        });

        data = data.map((d: any) => ({
          ...d,
          user: users.find(u => u.id === d.userId),
        }));
        break;
      }

      case 'leave': {
        const where: any = {
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
          ],
        };
        if (userId) where.userId = userId as string;

        data = await prisma.leaveRequest.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, department: true } },
            approver: { select: { id: true, name: true } },
          },
          orderBy: [{ startDate: 'asc' }],
        });
        break;
      }

      case 'late-arrivals': {
        const where: any = {
          date: { gte: start, lte: end },
          lateFlag: true,
        };

        data = await prisma.attendanceLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, department: true } },
          },
          orderBy: [{ date: 'asc' }],
        });
        break;
      }

      default:
        res.status(400).json({ error: 'Invalid report type' });
        return;
    }

    res.json({ type, startDate: start, endDate: end, data, count: Array.isArray(data) ? data.length : 0 });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

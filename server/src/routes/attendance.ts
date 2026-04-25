import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { qstr } from '../utils/helpers';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { startOfDay, endOfDay, differenceInHours, parseISO, format } from 'date-fns';

const router = Router();

// POST /api/attendance/checkin
router.post(
  '/checkin',
  authenticate,
  [
    body('status').isIn(['PRESENT', 'WFH', 'ON_SITE_CLIENT']),
    body('morningNote').optional().isLength({ max: 200 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { status, morningNote } = req.body;
      const today = startOfDay(new Date());
      const now = new Date();

      // Check if already checked in today
      const existing = await prisma.attendanceLog.findUnique({
        where: { userId_date: { userId: req.user!.id, date: today } },
      });

      if (existing) {
        res.status(409).json({ error: 'Already checked in today' });
        return;
      }

      // Determine late flag (after 09:30 IST = configurable)
      const currentHour = now.getUTCHours() + 5; // IST offset (simplified)
      const currentMinute = now.getUTCMinutes() + 30;
      const adjustedHour = currentMinute >= 60 ? currentHour + 1 : currentHour;
      const lateThresholdHour = 9;
      const lateThresholdMinute = 30;
      const lateFlag = adjustedHour > lateThresholdHour || 
        (adjustedHour === lateThresholdHour && (currentMinute >= 60 ? currentMinute - 60 : currentMinute) > lateThresholdMinute);

      const log = await prisma.attendanceLog.create({
        data: {
          userId: req.user!.id,
          date: today,
          checkIn: now,
          status: status as any,
          morningNote,
          lateFlag,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json(log);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ error: 'Check-in failed' });
    }
  }
);

// PUT /api/attendance/checkout/:id
router.put(
  '/checkout/:id',
  authenticate,
  [
    body('selfRating').optional().isInt({ min: 1, max: 5 }),
    body('endOfDayNote').optional().isLength({ max: 500 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { selfRating, endOfDayNote } = req.body;

      const log = await prisma.attendanceLog.findUnique({ where: { id: req.params.id as string } });
      if (!log) {
        res.status(404).json({ error: 'Attendance record not found' });
        return;
      }
      if (log.userId !== req.user!.id) {
        res.status(403).json({ error: 'Can only check out your own attendance' });
        return;
      }
      if (log.checkOut) {
        res.status(409).json({ error: 'Already checked out' });
        return;
      }

      // Enforce minimum 4 hours
      const now = new Date();
      if (log.checkIn) {
        const hoursWorked = differenceInHours(now, log.checkIn);
        if (hoursWorked < 4) {
          res.status(400).json({ error: `Minimum 4 hours required. You've worked ${hoursWorked} hours.` });
          return;
        }
      }

      const totalHours = log.checkIn ? 
        Math.round((differenceInHours(now, log.checkIn) + Number.EPSILON) * 100) / 100 : 0;

      const updated = await prisma.attendanceLog.update({
        where: { id: req.params.id as string },
        data: {
          checkOut: now,
          totalHours,
          selfRating,
          endOfDayNote,
          isComplete: true,
        },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Check-out failed' });
    }
  }
);

// GET /api/attendance - Query attendance logs
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, startDate, endDate, status } = req.query;

    const where: any = {};

    // Role-based filtering
    if (req.user!.role === 'EMPLOYEE') {
      where.userId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      if (qstr(userId)) {
        where.userId = qstr(userId);
      } else {
        // Get direct reports
        const reports = await prisma.user.findMany({
          where: { managerId: req.user!.id },
          select: { id: true },
        });
        where.userId = { in: [req.user!.id, ...reports.map(r => r.id)] };
      }
    } else if (qstr(userId)) {
      where.userId = qstr(userId);
    }

    if (qstr(startDate)) where.date = { ...where.date, gte: startOfDay(parseISO(qstr(startDate)!)) };
    if (qstr(endDate)) where.date = { ...where.date, lte: endOfDay(parseISO(qstr(endDate)!)) };
    if (qstr(status)) where.status = qstr(status);

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

// GET /api/attendance/today - Get today's check-in for current user
router.get('/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const log = await prisma.attendanceLog.findUnique({
      where: { userId_date: { userId: req.user!.id, date: today } },
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

// PUT /api/attendance/:id/manager-rating - Manager rates employee's day
router.put(
  '/:id/manager-rating',
  authenticate,
  authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('managerRating').isInt({ min: 1, max: 5 }),
    body('managerComment').optional().isLength({ max: 500 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { managerRating, managerComment } = req.body;
      const log = await prisma.attendanceLog.findUnique({
        where: { id: req.params.id as string },
        include: { user: true },
      });

      if (!log) { res.status(404).json({ error: 'Attendance record not found' }); return; }

      // Verify manager manages this employee
      if (req.user!.role === 'MANAGER' && (log as any).user?.managerId !== req.user!.id) {
        res.status(403).json({ error: 'Can only rate direct reports' }); return;
      }

      const updated = await prisma.attendanceLog.update({
        where: { id: req.params.id as string },
        data: { managerRating, managerComment },
      });

      // Notify employee
      await prisma.notification.create({
        data: {
          userId: log.userId,
          type: 'MANAGER_COMMENT',
          title: 'Manager Feedback',
          body: `${req.user!.name} rated your day: ${'⭐'.repeat(managerRating)}${managerComment ? ` — "${managerComment}"` : ''}`,
          relatedEntityType: 'attendance',
          relatedEntityId: log.id,
        },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update manager rating' });
    }
  }
);

// GET /api/attendance/leave-calendar - Team leave calendar
router.get('/leave-calendar', authenticate, authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth();
    const y = parseInt(year as string) || new Date().getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const where: any = {
      status: 'APPROVED',
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
    };

    if (req.user!.role === 'MANAGER') {
      const reports = await prisma.user.findMany({ where: { managerId: req.user!.id }, select: { id: true } });
      where.userId = { in: reports.map(r => r.id) };
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, department: true, profilePhoto: true } } },
      orderBy: { startDate: 'asc' },
    });

    // Also get holidays
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    res.json({ leaves, holidays, month: m, year: y });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave calendar' });
  }
});

export default router;

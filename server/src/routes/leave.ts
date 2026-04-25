import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseISO, differenceInDays } from 'date-fns';

const router = Router();

// GET /api/leave - Get leave requests
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, status, startDate, endDate } = req.query;
    const where: any = {};

    if (req.user!.role === 'EMPLOYEE') {
      where.userId = req.user!.id;
    } else if (req.user!.role === 'MANAGER') {
      if (userId) {
        where.userId = userId as string;
      } else {
        const reports = await prisma.user.findMany({
          where: { managerId: req.user!.id },
          select: { id: true },
        });
        where.userId = { in: [req.user!.id, ...reports.map(r => r.id)] };
      }
    } else if (userId) {
      where.userId = userId as string;
    }

    if (status) where.status = status as string;
    if (startDate) where.startDate = { gte: parseISO(startDate as string) };
    if (endDate) where.endDate = { lte: parseISO(endDate as string) };

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, profilePhoto: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// GET /api/leave/pending - Pending approvals for manager
router.get('/pending', authenticate, authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = { status: 'PENDING' };

    if (req.user!.role === 'MANAGER') {
      const reports = await prisma.user.findMany({
        where: { managerId: req.user!.id },
        select: { id: true },
      });
      where.userId = { in: reports.map(r => r.id) };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true, profilePhoto: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending leaves' });
  }
});

// GET /api/leave/balances - Get leave balances for current user
router.get('/balances', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || req.user!.id;

    // Only admins can view others' balances
    if (userId !== req.user!.id && !['HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const currentYear = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { userId, year: currentYear },
    });

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
});

// POST /api/leave - Submit leave request
router.post(
  '/',
  authenticate,
  [
    body('leaveType').isIn(['FULL_DAY', 'HALF_DAY', 'SICK_LEAVE', 'EMERGENCY_LEAVE']),
    body('startDate').notEmpty(),
    body('endDate').notEmpty(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { leaveType, startDate, endDate, reason } = req.body;
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      // Validate max 14 consecutive days
      const dayDiff = differenceInDays(end, start) + 1;
      if (dayDiff > 14) {
        res.status(400).json({ error: 'Maximum 14 consecutive days per request' });
        return;
      }
      if (dayDiff < 1) {
        res.status(400).json({ error: 'End date must be on or after start date' });
        return;
      }

      // Check leave balance
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: { userId_leaveType_year: { userId: req.user!.id, leaveType: leaveType as any, year: currentYear } },
      });

      if (balance && balance.remaining < dayDiff) {
        res.status(400).json({ error: `Insufficient leave balance. Remaining: ${balance.remaining}, Requested: ${dayDiff}` });
        return;
      }

      const request = await prisma.leaveRequest.create({
        data: {
          userId: req.user!.id,
          leaveType: leaveType as any,
          startDate: start,
          endDate: end,
          reason,
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: true } },
        },
      });

      // Update pending count in balance
      if (balance) {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pending: balance.pending + dayDiff,
            remaining: balance.remaining - dayDiff,
          },
        });
      }

      // Notify manager
      if (req.user!.managerId) {
        await prisma.notification.create({
          data: {
            userId: req.user!.managerId,
            type: 'LEAVE_REQUEST',
            title: 'New Leave Request',
            body: `${req.user!.name} requested ${leaveType.replace('_', ' ').toLowerCase()} from ${startDate} to ${endDate}`,
            relatedEntityType: 'leave',
            relatedEntityId: request.id,
          },
        });
      }

      res.status(201).json(request);
    } catch (error) {
      console.error('Leave request error:', error);
      res.status(500).json({ error: 'Failed to submit leave request' });
    }
  }
);

// PUT /api/leave/:id/approve - Approve or reject
router.put(
  '/:id/approve',
  authenticate,
  authorize('MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('status').isIn(['APPROVED', 'REJECTED', 'MODIFICATION_REQUESTED']),
    body('comment').optional(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, comment } = req.body;

      const request = await prisma.leaveRequest.findUnique({
        where: { id: req.params.id as string },
        include: { user: true },
      });

      if (!request) {
        res.status(404).json({ error: 'Leave request not found' });
        return;
      }
      if (request.status !== 'PENDING') {
        res.status(400).json({ error: 'Can only update pending requests' });
        return;
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: req.params.id as string },
        data: {
          status: status as any,
          approverId: req.user!.id,
          approverComment: comment,
          resolvedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true } },
        },
      });

      // Update leave balance
      const dayDiff = differenceInDays(request.endDate, request.startDate) + 1;
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: { userId_leaveType_year: { userId: request.userId, leaveType: request.leaveType, year: currentYear } },
      });

      if (balance) {
        if (status === 'APPROVED') {
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              taken: balance.taken + dayDiff,
              pending: Math.max(0, balance.pending - dayDiff),
            },
          });
        } else if (status === 'REJECTED') {
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pending: Math.max(0, balance.pending - dayDiff),
              remaining: balance.remaining + dayDiff,
            },
          });
        }
      }

      // Notify employee
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
          title: `Leave ${status.toLowerCase().replace('_', ' ')}`,
          body: `Your ${request.leaveType.replace('_', ' ').toLowerCase()} request has been ${status.toLowerCase()}${comment ? `: ${comment}` : ''}`,
          relatedEntityType: 'leave',
          relatedEntityId: request.id,
        },
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update leave request' });
    }
  }
);

// PUT /api/leave/:id/cancel
router.put('/:id/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id as string } });
    if (!request) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }
    if (request.userId !== req.user!.id) {
      res.status(403).json({ error: 'Can only cancel your own requests' });
      return;
    }
    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      res.status(400).json({ error: 'Can only cancel pending or approved requests' });
      return;
    }

    // Restore balance
    const dayDiff = differenceInDays(request.endDate, request.startDate) + 1;
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: request.userId, leaveType: request.leaveType, year: currentYear } },
    });

    if (balance) {
      if (request.status === 'PENDING') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { pending: Math.max(0, balance.pending - dayDiff), remaining: balance.remaining + dayDiff },
        });
      } else if (request.status === 'APPROVED') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { taken: Math.max(0, balance.taken - dayDiff), remaining: balance.remaining + dayDiff },
        });
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel leave request' });
  }
});

export default router;

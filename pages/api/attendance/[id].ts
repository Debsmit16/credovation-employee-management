import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { differenceInHours } from 'date-fns';

export default apiHandler({
  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    const action = req.query.action as string | undefined;

    // Manager rating: PUT /api/attendance/[id]?action=manager-rating
    if (action === 'manager-rating') {
      if (!['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const { managerRating, managerComment } = req.body;
      const log = await prisma.attendanceLog.findUnique({ where: { id: id as string }, include: { user: true } });
      if (!log) return res.status(404).json({ error: 'Attendance record not found' });
      if (req.user!.role === 'MANAGER' && (log as any).user?.managerId !== req.user!.id) {
        return res.status(403).json({ error: 'Can only rate direct reports' });
      }
      const updated = await prisma.attendanceLog.update({ where: { id: id as string }, data: { managerRating, managerComment } });
      await prisma.notification.create({
        data: {
          userId: log.userId, type: 'MANAGER_COMMENT', title: 'Manager Feedback',
          body: `${req.user!.name} rated your day: ${'⭐'.repeat(managerRating)}${managerComment ? ` — "${managerComment}"` : ''}`,
          relatedEntityType: 'attendance', relatedEntityId: log.id,
        },
      });
      return res.json(updated);
    }

    // Checkout: PUT /api/attendance/[id] (default)
    const { selfRating, endOfDayNote } = req.body;
    const log = await prisma.attendanceLog.findUnique({ where: { id: id as string } });
    if (!log) return res.status(404).json({ error: 'Attendance record not found' });
    if (log.userId !== req.user!.id) return res.status(403).json({ error: 'Can only check out your own attendance' });
    if (log.checkOut) return res.status(409).json({ error: 'Already checked out' });

    const now = new Date();
    if (log.checkIn) {
      const hoursWorked = differenceInHours(now, log.checkIn);
      if (hoursWorked < 4) return res.status(400).json({ error: `Minimum 4 hours required. You've worked ${hoursWorked} hours.` });
    }

    const totalHours = log.checkIn ? Math.round((differenceInHours(now, log.checkIn) + Number.EPSILON) * 100) / 100 : 0;
    const updated = await prisma.attendanceLog.update({
      where: { id: id as string },
      data: { checkOut: now, totalHours, selfRating, endOfDayNote, isComplete: true },
    });
    res.json(updated);
  },
});

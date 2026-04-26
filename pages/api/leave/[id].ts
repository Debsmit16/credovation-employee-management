import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

export default apiHandler({
  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    const action = req.query.action as string | undefined;
    const leaveId = id as string;

    if (action === 'cancel') {
      const request = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
      if (!request) return res.status(404).json({ error: 'Leave request not found' });
      if (request.userId !== req.user!.id) return res.status(403).json({ error: 'Can only cancel your own requests' });
      if (!['PENDING', 'APPROVED'].includes(request.status)) return res.status(400).json({ error: 'Can only cancel pending or approved requests' });

      const dayDiff = differenceInDays(request.endDate, request.startDate) + 1;
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: { userId_leaveType_year: { userId: request.userId, leaveType: request.leaveType, year: currentYear } },
      });
      if (balance) {
        if (request.status === 'PENDING') {
          await prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: Math.max(0, balance.pending - dayDiff), remaining: balance.remaining + dayDiff } });
        } else if (request.status === 'APPROVED') {
          await prisma.leaveBalance.update({ where: { id: balance.id }, data: { taken: Math.max(0, balance.taken - dayDiff), remaining: balance.remaining + dayDiff } });
        }
      }
      const updated = await prisma.leaveRequest.update({ where: { id: leaveId }, data: { status: 'CANCELLED', resolvedAt: new Date() } });
      return res.json(updated);
    }

    // Default: approve/reject
    if (!['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });

    const { status, comment } = req.body;
    const request = await prisma.leaveRequest.findUnique({ where: { id: leaveId }, include: { user: true } });
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ error: 'Can only update pending requests' });

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status, approverId: req.user!.id, approverComment: comment, resolvedAt: new Date() },
      include: { user: { select: { id: true, name: true, email: true } }, approver: { select: { id: true, name: true } } },
    });

    const dayDiff = differenceInDays(request.endDate, request.startDate) + 1;
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: request.userId, leaveType: request.leaveType, year: currentYear } },
    });
    if (balance) {
      if (status === 'APPROVED') await prisma.leaveBalance.update({ where: { id: balance.id }, data: { taken: balance.taken + dayDiff, pending: Math.max(0, balance.pending - dayDiff) } });
      else if (status === 'REJECTED') await prisma.leaveBalance.update({ where: { id: balance.id }, data: { pending: Math.max(0, balance.pending - dayDiff), remaining: balance.remaining + dayDiff } });
    }

    await prisma.notification.create({
      data: { userId: request.userId, type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', title: `Leave ${status.toLowerCase().replace('_', ' ')}`, body: `Your ${request.leaveType.replace('_', ' ').toLowerCase()} request has been ${status.toLowerCase()}${comment ? `: ${comment}` : ''}`, relatedEntityType: 'leave', relatedEntityId: request.id },
    });
    res.json(updated);
  },
});

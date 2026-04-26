import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const { id } = req.query;
    // Check if it's a history request via query param
    if (req.query.view === 'history') {
      if (!['HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
      const [user, attendance, tasks, leaves, ratings] = await Promise.all([
        prisma.user.findUnique({ where: { id: id as string }, select: { id: true, name: true, email: true, role: true, department: true, designation: true, joinDate: true, isActive: true, phone: true, workLocation: true, manager: { select: { name: true } } } }),
        prisma.attendanceLog.findMany({ where: { userId: id as string }, orderBy: { date: 'desc' }, take: 90 }),
        prisma.task.findMany({ where: { assignedToId: id as string }, include: { assignedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.leaveRequest.findMany({ where: { userId: id as string }, include: { approver: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
        prisma.attendanceLog.aggregate({ where: { userId: id as string, selfRating: { not: null } }, _avg: { selfRating: true }, _count: { id: true } }),
      ]);
      const leaveBalances = await prisma.leaveBalance.findMany({ where: { userId: id as string, year: new Date().getFullYear() } });
      return res.json({ user, attendance, tasks, leaves, leaveBalances, avgRating: ratings._avg?.selfRating ?? null, totalDaysWorked: (ratings._count as any)?.id ?? 0 });
    }
    return res.status(405).json({ error: 'Use /api/users/[id] for user details' });
  },

  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const { id } = req.query;
    const { name, role, department, designation, managerId, isActive } = req.body;
    const cleanManagerId = managerId === "" ? null : managerId;
    
    const employee = await prisma.user.update({
      where: { id: id as string },
      data: { ...(name && { name }), ...(role && { role }), ...(department !== undefined && { department }), ...(designation !== undefined && { designation }), ...(managerId !== undefined && { managerId: cleanManagerId }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, name: true, email: true, role: true, department: true, designation: true, managerId: true, isActive: true, joinDate: true },
    });
    res.json(employee);
  },

  DELETE: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    await prisma.user.update({ where: { id: req.query.id as string }, data: { isActive: false } });
    res.json({ message: 'Employee deactivated' });
  },
});

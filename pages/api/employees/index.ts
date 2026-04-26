import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const { department, isActive, search } = req.query;
    const where: any = {};
    if (department) where.department = department as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) { where.OR = [{ name: { contains: search as string, mode: 'insensitive' } }, { email: { contains: search as string, mode: 'insensitive' } }]; }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, department: true, designation: true, phone: true,
        managerId: true, joinDate: true, isActive: true, profilePhoto: true,
        manager: { select: { id: true, name: true } },
        _count: { select: { attendanceLogs: true, tasksAssigned: true, leaveRequests: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(employees);
  },

  POST: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const { name, email, password, role, department, designation, managerId, joinDate } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password || 'Welcome@123', 12);
    const employee = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'EMPLOYEE', department, designation, managerId, joinDate: joinDate ? new Date(joinDate) : new Date() },
      select: { id: true, name: true, email: true, role: true, department: true, designation: true, joinDate: true },
    });

    const currentYear = new Date().getFullYear();
    const leaveTypes = ['FULL_DAY', 'HALF_DAY', 'SICK_LEAVE', 'EMERGENCY_LEAVE'] as const;
    const entitlements: Record<string, number> = { FULL_DAY: 18, HALF_DAY: 12, SICK_LEAVE: 12, EMERGENCY_LEAVE: 6 };
    await prisma.leaveBalance.createMany({
      data: leaveTypes.map(type => ({ userId: employee.id, leaveType: type, entitled: entitlements[type], remaining: entitlements[type], year: currentYear })),
    });
    res.status(201).json(employee);
  },
});

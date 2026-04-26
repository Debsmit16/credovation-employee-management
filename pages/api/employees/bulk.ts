import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default apiHandler({
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) return res.status(400).json({ error: 'employees array is required' });

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const currentYear = new Date().getFullYear();
    const defaultPassword = await bcrypt.hash('Welcome@123', 12);

    for (const emp of employees) {
      try {
        if (!emp.name || !emp.email) { results.errors.push(`Missing name/email for: ${JSON.stringify(emp)}`); results.skipped++; continue; }
        const existing = await prisma.user.findUnique({ where: { email: emp.email } });
        if (existing) { results.errors.push(`${emp.email} already exists`); results.skipped++; continue; }
        const user = await prisma.user.create({
          data: { name: emp.name, email: emp.email, password: defaultPassword, role: emp.role || 'EMPLOYEE', department: emp.department, designation: emp.designation, managerId: emp.managerId, joinDate: emp.joinDate ? new Date(emp.joinDate) : new Date() },
        });
        const leaveTypes = ['FULL_DAY', 'HALF_DAY', 'SICK_LEAVE', 'EMERGENCY_LEAVE'] as const;
        const entitlements: Record<string, number> = { FULL_DAY: 18, HALF_DAY: 12, SICK_LEAVE: 12, EMERGENCY_LEAVE: 6 };
        await prisma.leaveBalance.createMany({ data: leaveTypes.map(type => ({ userId: user.id, leaveType: type, entitled: entitlements[type], remaining: entitlements[type], year: currentYear })) });
        results.created++;
      } catch (err: any) { results.errors.push(`${emp.email}: ${err.message}`); results.skipped++; }
    }
    res.status(201).json(results);
  },
}, { roles: ['HR_ADMIN', 'SUPER_ADMIN'] });

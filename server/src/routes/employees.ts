import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/employees - List all employees
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, isActive, search } = req.query;
    const where: any = {};

    if (department) where.department = department as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        department: true, designation: true, phone: true,
        managerId: true, joinDate: true, isActive: true, profilePhoto: true,
        manager: { select: { id: true, name: true } },
        _count: {
          select: {
            attendanceLogs: true,
            tasksAssigned: true,
            leaveRequests: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST /api/employees - Add new employee
router.post(
  '/',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN']),
    body('department').optional().trim(),
    body('designation').optional().trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, email, password, role, department, designation, managerId, joinDate } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password || 'Welcome@123', 12);

      const employee = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'EMPLOYEE',
          department,
          designation,
          managerId,
          joinDate: joinDate ? new Date(joinDate) : new Date(),
        },
        select: {
          id: true, name: true, email: true, role: true,
          department: true, designation: true, joinDate: true,
        },
      });

      // Initialize leave balances for current year
      const currentYear = new Date().getFullYear();
      const leaveTypes = ['FULL_DAY', 'HALF_DAY', 'SICK_LEAVE', 'EMERGENCY_LEAVE'] as const;
      const entitlements: Record<string, number> = {
        FULL_DAY: 18,
        HALF_DAY: 12,
        SICK_LEAVE: 12,
        EMERGENCY_LEAVE: 6,
      };

      await prisma.leaveBalance.createMany({
        data: leaveTypes.map(type => ({
          userId: employee.id,
          leaveType: type,
          entitled: entitlements[type],
          remaining: entitlements[type],
          year: currentYear,
        })),
      });

      res.status(201).json(employee);
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  }
);

// PUT /api/employees/:id - Update employee
router.put('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, department, designation, managerId, isActive } = req.body;

    const employee = await prisma.user.update({
      where: { id: req.params.id as string },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(department !== undefined && { department }),
        ...(designation !== undefined && { designation }),
        ...(managerId !== undefined && { managerId }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, designation: true, managerId: true,
        isActive: true, joinDate: true,
      },
    });

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id - Soft delete (deactivate)
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    res.json({ message: 'Employee deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate employee' });
  }
});

// GET /api/employees/:id/history - Full employee history
router.get('/:id/history', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [user, attendance, tasks, leaves, ratings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.params.id as string },
        select: { id: true, name: true, email: true, role: true, department: true, designation: true, joinDate: true, isActive: true, phone: true, workLocation: true, manager: { select: { name: true } } },
      }),
      prisma.attendanceLog.findMany({
        where: { userId: req.params.id as string },
        orderBy: { date: 'desc' },
        take: 90,
      }),
      prisma.task.findMany({
        where: { assignedToId: req.params.id as string },
        include: { assignedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.leaveRequest.findMany({
        where: { userId: req.params.id as string },
        include: { approver: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceLog.aggregate({
        where: { userId: req.params.id as string, selfRating: { not: null } },
        _avg: { selfRating: true },
        _count: { id: true },
      }),
    ]);

    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { userId: req.params.id as string, year: new Date().getFullYear() },
    });

    res.json({ user, attendance, tasks, leaves, leaveBalances, avgRating: ratings._avg?.selfRating ?? null, totalDaysWorked: (ratings._count as any)?.id ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee history' });
  }
});

// POST /api/employees/bulk - Bulk import employees
router.post(
  '/bulk',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { employees } = req.body;
      if (!Array.isArray(employees) || employees.length === 0) {
        res.status(400).json({ error: 'employees array is required' });
        return;
      }

      const results = { created: 0, skipped: 0, errors: [] as string[] };
      const currentYear = new Date().getFullYear();
      const defaultPassword = await bcrypt.hash('Welcome@123', 12);

      for (const emp of employees) {
        try {
          if (!emp.name || !emp.email) {
            results.errors.push(`Missing name/email for: ${JSON.stringify(emp)}`);
            results.skipped++;
            continue;
          }

          const existing = await prisma.user.findUnique({ where: { email: emp.email } });
          if (existing) {
            results.errors.push(`${emp.email} already exists`);
            results.skipped++;
            continue;
          }

          const user = await prisma.user.create({
            data: {
              name: emp.name,
              email: emp.email,
              password: defaultPassword,
              role: emp.role || 'EMPLOYEE',
              department: emp.department,
              designation: emp.designation,
              managerId: emp.managerId,
              joinDate: emp.joinDate ? new Date(emp.joinDate) : new Date(),
            },
          });

          // Initialize leave balances
          const leaveTypes = ['FULL_DAY', 'HALF_DAY', 'SICK_LEAVE', 'EMERGENCY_LEAVE'] as const;
          const entitlements: Record<string, number> = { FULL_DAY: 18, HALF_DAY: 12, SICK_LEAVE: 12, EMERGENCY_LEAVE: 6 };
          await prisma.leaveBalance.createMany({
            data: leaveTypes.map(type => ({
              userId: user.id, leaveType: type, entitled: entitlements[type], remaining: entitlements[type], year: currentYear,
            })),
          });

          results.created++;
        } catch (err: any) {
          results.errors.push(`${emp.email}: ${err.message}`);
          results.skipped++;
        }
      }

      res.status(201).json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk import employees' });
    }
  }
);

// GET /api/employees/departments - Department master list
router.get('/meta/departments', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.departmentMaster.findMany({ orderBy: { name: 'asc' } });
    res.json(departments);
  } catch { res.status(500).json({ error: 'Failed to fetch departments' }); }
});

// POST /api/employees/meta/departments
router.post('/meta/departments', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dept = await prisma.departmentMaster.create({ data: { name: req.body.name } });
    res.status(201).json(dept);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Department already exists' }); return; }
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// GET /api/employees/meta/designations
router.get('/meta/designations', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designations = await prisma.designationMaster.findMany({ orderBy: { name: 'asc' } });
    res.json(designations);
  } catch { res.status(500).json({ error: 'Failed to fetch designations' }); }
});

// POST /api/employees/meta/designations
router.post('/meta/designations', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const desig = await prisma.designationMaster.create({ data: { name: req.body.name } });
    res.status(201).json(desig);
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Designation already exists' }); return; }
    res.status(500).json({ error: 'Failed to create designation' });
  }
});

export default router;

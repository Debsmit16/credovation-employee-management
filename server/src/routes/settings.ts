import { Router, Response } from 'express';
import { body } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/settings - Get all system configs
router.get('/', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const settings: Record<string, string> = {};
    configs.forEach(c => { settings[c.key] = c.value; });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update settings (batch)
router.put(
  '/',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const updates = req.body; // { key: value, key2: value2, ... }

      await Promise.all(
        Object.entries(updates).map(([key, value]) =>
          prisma.systemConfig.upsert({
            where: { key },
            update: { value: String(value), updatedBy: req.user!.id },
            create: { key, value: String(value), updatedBy: req.user!.id },
          })
        )
      );

      res.json({ message: 'Settings updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// GET /api/settings/departments - Get department list
router.get('/departments', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.user.findMany({
      where: { isActive: true, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });
    res.json(departments.map(d => d.department).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

export default router;

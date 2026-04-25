import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseISO, startOfYear, endOfYear } from 'date-fns';

const router = Router();

// GET /api/holidays - Get all holidays for current year
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfYear(new Date(year, 0, 1)),
          lte: endOfYear(new Date(year, 0, 1)),
        },
      },
      orderBy: { date: 'asc' },
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/holidays - Add a holiday
router.post(
  '/',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('date').notEmpty(),
    body('type').optional().isIn(['PUBLIC', 'COMPANY', 'OPTIONAL']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { name, date, type } = req.body;
      const holiday = await prisma.holiday.create({
        data: { name, date: parseISO(date), type: type || 'PUBLIC' },
      });
      res.status(201).json(holiday);
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'A holiday already exists on this date' });
        return;
      }
      res.status(500).json({ error: 'Failed to create holiday' });
    }
  }
);

// POST /api/holidays/bulk - Bulk upload holidays
router.post(
  '/bulk',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { holidays } = req.body; // [{name, date, type}]
      if (!Array.isArray(holidays) || holidays.length === 0) {
        res.status(400).json({ error: 'holidays array is required' });
        return;
      }

      const created = await Promise.all(
        holidays.map(async (h: any) => {
          try {
            return await prisma.holiday.create({
              data: { name: h.name, date: parseISO(h.date), type: h.type || 'PUBLIC' },
            });
          } catch { return null; }
        })
      );

      res.status(201).json({ created: created.filter(Boolean).length, total: holidays.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk create holidays' });
    }
  }
);

// DELETE /api/holidays/:id
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.holiday.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

export default router;

import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/announcements - Get active announcements
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeExpired = req.query.all === 'true';
    const where: any = {};
    if (!includeExpired) {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, designation: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements
router.post(
  '/',
  authenticate,
  authorize('HR_ADMIN', 'SUPER_ADMIN'),
  [
    body('title').trim().notEmpty(),
    body('body').trim().notEmpty(),
    body('priority').optional().isIn(['URGENT', 'NORMAL', 'LOW']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

      const { title, body: aBody, priority, expiresAt } = req.body;
      const announcement = await prisma.announcement.create({
        data: {
          title,
          body: aBody,
          priority: priority || 'NORMAL',
          createdById: req.user!.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Notify all active users
      const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
      await Promise.all(
        users.map(u =>
          prisma.notification.create({
            data: {
              userId: u.id,
              type: 'SYSTEM_ALERT',
              title: `📢 ${title}`,
              body: aBody.substring(0, 100),
              relatedEntityType: 'announcement',
              relatedEntityId: announcement.id,
            },
          })
        )
      );

      res.status(201).json(announcement);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  }
);

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.announcement.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    res.json({ message: 'Announcement deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;

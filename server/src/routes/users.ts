import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true, email: true, name: true, role: true,
        department: true, designation: true, phone: true,
        emergencyContact: true, workLocation: true, profilePhoto: true,
        managerId: true, joinDate: true, isActive: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Employees can only view their own profile
    if (req.user!.role === 'EMPLOYEE' && req.user!.id !== req.params.id) {
      res.status(403).json({ error: 'Can only view your own profile' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id
router.put(
  '/:id',
  authenticate,
  [
    body('phone').optional().trim(),
    body('emergencyContact').optional().trim(),
    body('workLocation').optional().trim(),
    body('profilePhoto').optional(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Users can only edit their own editable fields
      if (req.user!.id !== req.params.id && !['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        res.status(403).json({ error: 'Can only edit your own profile' });
        return;
      }

      const { phone, emergencyContact, workLocation, profilePhoto } = req.body;

      const user = await prisma.user.update({
        where: { id: req.params.id as string },
        data: { phone, emergencyContact, workLocation, profilePhoto },
        select: {
          id: true, email: true, name: true, role: true,
          department: true, designation: true, phone: true,
          emergencyContact: true, workLocation: true, profilePhoto: true,
          managerId: true, joinDate: true,
        },
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

export default router;

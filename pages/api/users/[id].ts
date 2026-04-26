import type { NextApiResponse } from 'next';
import { withAuth, AuthNextApiRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const userId = id as string;

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, role: true,
          department: true, designation: true, phone: true,
          emergencyContact: true, workLocation: true, profilePhoto: true,
          managerId: true, joinDate: true, isActive: true,
          manager: { select: { id: true, name: true, email: true } },
        },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (req.user!.role === 'EMPLOYEE' && req.user!.id !== userId) {
        return res.status(403).json({ error: 'Can only view your own profile' });
      }
      return res.json(user);
    } catch { return res.status(500).json({ error: 'Failed to fetch user' }); }
  }

  if (req.method === 'PUT') {
    try {
      if (req.user!.id !== userId && !['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
        return res.status(403).json({ error: 'Can only edit your own profile' });
      }
      const { phone, emergencyContact, workLocation, profilePhoto } = req.body;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { phone, emergencyContact, workLocation, profilePhoto },
        select: {
          id: true, email: true, name: true, role: true,
          department: true, designation: true, phone: true,
          emergencyContact: true, workLocation: true, profilePhoto: true,
          managerId: true, joinDate: true,
        },
      });
      return res.json(user);
    } catch { return res.status(500).json({ error: 'Failed to update user' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);

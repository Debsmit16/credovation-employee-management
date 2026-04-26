import type { NextApiResponse } from 'next';
import { withAuth, AuthNextApiRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function handler(req: AuthNextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, role: true,
        department: true, designation: true, phone: true,
        emergencyContact: true, workLocation: true, profilePhoto: true,
        managerId: true, joinDate: true, isActive: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export default withAuth(handler);

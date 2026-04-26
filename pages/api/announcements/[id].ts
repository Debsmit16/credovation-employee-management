import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  DELETE: async (req: RouteRequest, res: NextApiResponse) => {
    await prisma.announcement.update({ where: { id: req.query.id as string }, data: { isActive: false } });
    res.json({ message: 'Announcement deactivated' });
  },
}, { roles: ['HR_ADMIN', 'SUPER_ADMIN'] });

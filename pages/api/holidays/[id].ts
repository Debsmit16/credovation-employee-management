import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  DELETE: async (req: RouteRequest, res: NextApiResponse) => {
    await prisma.holiday.delete({ where: { id: req.query.id as string } });
    res.json({ message: 'Holiday deleted' });
  },
}, { roles: ['HR_ADMIN', 'SUPER_ADMIN'] });

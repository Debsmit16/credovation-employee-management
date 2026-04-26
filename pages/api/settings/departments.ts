import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const departments = await prisma.user.findMany({
      where: { isActive: true, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });
    res.json(departments.map(d => d.department).filter(Boolean));
  },
});

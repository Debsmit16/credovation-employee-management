import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (_req: RouteRequest, res: NextApiResponse) => {
    const departments = await prisma.departmentMaster.findMany({ orderBy: { name: 'asc' } });
    res.json(departments);
  },
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    try {
      const dept = await prisma.departmentMaster.create({ data: { name: req.body.name } });
      res.status(201).json(dept);
    } catch (err: any) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Department already exists' });
      throw err;
    }
  },
});

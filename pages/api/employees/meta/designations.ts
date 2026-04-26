import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (_req: RouteRequest, res: NextApiResponse) => {
    const designations = await prisma.designationMaster.findMany({ orderBy: { name: 'asc' } });
    res.json(designations);
  },
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    try {
      const desig = await prisma.designationMaster.create({ data: { name: req.body.name } });
      res.status(201).json(desig);
    } catch (err: any) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Designation already exists' });
      throw err;
    }
  },
});

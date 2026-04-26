import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
    const settings: Record<string, string> = {};
    configs.forEach(c => { settings[c.key] = c.value; });
    res.json(settings);
  },
  PUT: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const updates = req.body;
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemConfig.upsert({ where: { key }, update: { value: String(value), updatedBy: req.user!.id }, create: { key, value: String(value), updatedBy: req.user!.id } })
      )
    );
    res.json({ message: 'Settings updated' });
  },
});

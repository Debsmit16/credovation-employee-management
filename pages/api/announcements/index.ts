import type { NextApiResponse } from 'next';
import { apiHandler, RouteRequest } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export default apiHandler({
  GET: async (req: RouteRequest, res: NextApiResponse) => {
    const includeExpired = req.query.all === 'true';
    const where: any = {};
    if (!includeExpired) { where.isActive = true; where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }]; }
    const announcements = await prisma.announcement.findMany({
      where, include: { createdBy: { select: { id: true, name: true, designation: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 50,
    });
    res.json(announcements);
  },
  POST: async (req: RouteRequest, res: NextApiResponse) => {
    if (!['HR_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    const { title, body: aBody, priority, expiresAt } = req.body;
    if (!title || !aBody) return res.status(400).json({ error: 'title and body required' });
    const announcement = await prisma.announcement.create({
      data: { title, body: aBody, priority: priority || 'NORMAL', createdById: req.user!.id, expiresAt: expiresAt ? new Date(expiresAt) : null },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    await Promise.all(users.map(u => prisma.notification.create({
      data: { userId: u.id, type: 'SYSTEM_ALERT', title: `📢 ${title}`, body: aBody.substring(0, 100), relatedEntityType: 'announcement', relatedEntityId: announcement.id },
    })));
    res.status(201).json(announcement);
  },
});

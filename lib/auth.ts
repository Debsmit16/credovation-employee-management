import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string | null;
  managerId: string | null;
}

export interface AuthNextApiRequest extends NextApiRequest {
  user?: AuthUser;
}

export async function authenticate(
  req: AuthNextApiRequest
): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        managerId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

export function withAuth(
  handler: (req: AuthNextApiRequest, res: NextApiResponse) => Promise<void>,
  allowedRoles?: string[]
) {
  return async (req: AuthNextApiRequest, res: NextApiResponse) => {
    const user = await authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Access token required' });
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.user = user;
    return handler(req, res);
  };
}

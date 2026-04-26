import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = (process.env.JWT_SECRET || 'default-secret') as string;
const JWT_EXPIRES = (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true,
        department: true, designation: true, profilePhoto: true,
        password: true, isActive: true, managerId: true,
      },
    });

    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id } as object, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

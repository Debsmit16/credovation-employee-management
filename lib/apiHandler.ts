import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate, AuthUser } from './auth';

export interface RouteRequest extends NextApiRequest {
  user?: AuthUser;
  params: Record<string, string>;
}

type Handler = (req: RouteRequest, res: NextApiResponse) => Promise<void>;

interface RouteHandlers {
  GET?: Handler;
  POST?: Handler;
  PUT?: Handler;
  DELETE?: Handler;
  PATCH?: Handler;
}

export function apiHandler(handlers: RouteHandlers, options?: { auth?: boolean; roles?: string[] }) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const method = req.method as keyof RouteHandlers;
    const handler = handlers[method];

    if (!handler) {
      res.setHeader('Allow', Object.keys(handlers).join(', '));
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }

    const routeReq = req as RouteRequest;
    // Map query params to params (Express-style)
    routeReq.params = req.query as Record<string, string>;

    // Apply auth if needed
    if (options?.auth !== false) {
      const user = await authenticate(routeReq);
      if (!user) return res.status(401).json({ error: 'Access token required' });
      if (options?.roles && !options.roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      routeReq.user = user;
    }

    try {
      await handler(routeReq, res);
    } catch (error: any) {
      console.error(`API Error [${method} ${req.url}]:`, error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };
}

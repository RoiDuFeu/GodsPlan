import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  provider: 'apple' | 'google';
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  provider: 'apple' | 'google';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    (req as AuthenticatedRequest).userId = payload.userId;
    (req as AuthenticatedRequest).provider = payload.provider;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

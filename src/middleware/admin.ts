import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

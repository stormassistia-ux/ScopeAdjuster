import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin';

// Extend Express Request to include decoded user
export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Missing Bearer Token.' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized. Invalid Token.' });
  }
};

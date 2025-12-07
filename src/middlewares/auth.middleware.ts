import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/express';
import { JwtPayload } from '../types';
import pool from '../config/database';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (typeof decoded === 'string') {
      throw new Error('Invalid token');
    }
    
    const payload = decoded as { userId: number };
    
    // Fetch latest user data from database
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const user = result.rows[0];
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role
    } as JwtPayload;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
      return;
    }

    next();
  };
};

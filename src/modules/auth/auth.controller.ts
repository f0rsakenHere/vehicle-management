import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, phone, role } = req.body;

      // Validate required fields
      if (!name || !email || !password || !phone) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: name, email, password, phone'
        });
        return;
      }

      const result = await authService.signup(name, email, password, phone, role);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  async signin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      const result = await authService.signin(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }
}

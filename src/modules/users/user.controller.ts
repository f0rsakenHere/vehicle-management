import { Response } from 'express';
import { UserService } from './user.service';
import { AuthRequest } from '../../types/express';

const userService = new UserService();

export class UserController {
  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await userService.getAllUsers();

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve users'
      });
    }
  }

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId || '0');

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.password !== undefined) updateData.password = req.body.password;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.role !== undefined) updateData.role = req.body.role;

      const user = await userService.updateUser(
        userId,
        updateData,
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error: any) {
      const statusCode = 
        error.message === 'User not found' ? 404 :
        error.message === 'You can only update your own profile' ? 403 :
        error.message === 'Only admin can change user roles' ? 403 :
        400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update user'
      });
    }
  }

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId || '0');

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const result = await userService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      const statusCode = error.message === 'User not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete user'
      });
    }
  }
}

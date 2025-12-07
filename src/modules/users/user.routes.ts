import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

// Admin only routes
router.get('/', authenticate, authorize('admin'), (req, res) => userController.getAllUsers(req, res));
router.delete('/:userId', authenticate, authorize('admin'), (req, res) => userController.deleteUser(req, res));

// Admin or own profile
router.put('/:userId', authenticate, (req, res) => userController.updateUser(req, res));

export default router;

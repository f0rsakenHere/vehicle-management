import { Router } from 'express';
import { VehicleController } from './vehicle.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const vehicleController = new VehicleController();

// Public routes
router.get('/', (req, res) => vehicleController.getAllVehicles(req, res));
router.get('/:vehicleId', (req, res) => vehicleController.getVehicleById(req, res));

// Admin only routes
router.post('/', authenticate, authorize('admin'), (req, res) => vehicleController.createVehicle(req, res));
router.put('/:vehicleId', authenticate, authorize('admin'), (req, res) => vehicleController.updateVehicle(req, res));
router.delete('/:vehicleId', authenticate, authorize('admin'), (req, res) => vehicleController.deleteVehicle(req, res));

export default router;

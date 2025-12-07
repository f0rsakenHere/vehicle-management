import { Router } from 'express';
import { BookingController } from './booking.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();
const bookingController = new BookingController();

// All booking routes require authentication
router.post('/', authenticate, (req, res) => bookingController.createBooking(req, res));
router.get('/', authenticate, (req, res) => bookingController.getAllBookings(req, res));
router.put('/:bookingId', authenticate, (req, res) => bookingController.updateBooking(req, res));

export default router;

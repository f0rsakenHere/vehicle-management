import { Response } from 'express';
import { BookingService } from './booking.service';
import { AuthRequest } from '../../types/express';

const bookingService = new BookingService();

export class BookingController {
  async createBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { customer_id, vehicle_id, rent_start_date, rent_end_date } = req.body;

      // Validate required fields
      if (!customer_id || !vehicle_id || !rent_start_date || !rent_end_date) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: customer_id, vehicle_id, rent_start_date, rent_end_date'
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

      // Parse customer_id as integer
      const requestedCustomerId = parseInt(customer_id);

      // Authorization: customers can only book for themselves, admins can book for anyone
      if (req.user.role === 'customer' && requestedCustomerId !== req.user.userId) {
        res.status(403).json({
          success: false,
          message: 'You can only create bookings for yourself'
        });
        return;
      }

      const booking = await bookingService.createBooking(
        requestedCustomerId,
        parseInt(vehicle_id),
        rent_start_date,
        rent_end_date
      );

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });
    } catch (error: any) {
      const statusCode = 
        error.message === 'Vehicle not found' ? 404 :
        error.message === 'Vehicle is not available for booking' ? 400 :
        400;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create booking'
      });
    }
  }

  async getAllBookings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const bookings = await bookingService.getAllBookings(
        req.user.userId,
        req.user.role
      );

      res.status(200).json({
        success: true,
        message: req.user.role === 'admin' ? 'Bookings retrieved successfully' : 'Your bookings retrieved successfully',
        data: bookings
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve bookings'
      });
    }
  }

  async updateBooking(req: AuthRequest, res: Response): Promise<void> {
    try {
      const bookingId = parseInt(req.params.bookingId || '0');
      const { status, action } = req.body;

      if (isNaN(bookingId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid booking ID'
        });
        return;
      }

      // Accept both 'status' and 'action' fields for flexibility
      const requestedAction = status || action;

      if (!requestedAction || !['cancel', 'cancelled', 'return', 'returned'].includes(requestedAction)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "cancelled" or "returned"'
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

      // Normalize status to 'cancel' or 'return' for service layer
      const normalizedAction = (requestedAction === 'cancelled' || requestedAction === 'cancel') ? 'cancel' : 'return';

      const booking = await bookingService.updateBooking(
        bookingId,
        req.user.userId,
        req.user.role,
        normalizedAction
      );

      res.status(200).json({
        success: true,
        message: normalizedAction === 'cancel' ? 'Booking cancelled successfully' : 'Booking marked as returned. Vehicle is now available',
        data: booking
      });
    } catch (error: any) {
      const statusCode = 
        error.message === 'Booking not found' ? 404 :
        error.message === 'You can only cancel your own bookings' ? 403 :
        error.message === 'Only admin can mark bookings as returned' ? 403 :
        400;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update booking'
      });
    }
  }
}

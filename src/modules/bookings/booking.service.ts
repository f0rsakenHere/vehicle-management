import pool from '../../config/database';
import { Booking } from '../../types';

export class BookingService {
  async createBooking(
    customerId: number,
    vehicleId: number,
    rentStartDate: string,
    rentEndDate: string
  ) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate dates
      const startDate = new Date(rentStartDate);
      const endDate = new Date(rentEndDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }

      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Check if vehicle exists and is available
      const vehicleResult = await client.query(
        'SELECT * FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      if (vehicleResult.rows.length === 0) {
        throw new Error('Vehicle not found');
      }

      const vehicle = vehicleResult.rows[0];

      if (vehicle.availability_status !== 'available') {
        throw new Error('Vehicle is not available for booking');
      }

      // Check if vehicle has overlapping bookings
      const overlappingBookings = await client.query(
        `SELECT id FROM bookings 
         WHERE vehicle_id = $1 
         AND status = 'active'
         AND (
           (rent_start_date <= $2 AND rent_end_date >= $2) OR
           (rent_start_date <= $3 AND rent_end_date >= $3) OR
           (rent_start_date >= $2 AND rent_end_date <= $3)
         )`,
        [vehicleId, rentStartDate, rentEndDate]
      );

      if (overlappingBookings.rows.length > 0) {
        throw new Error('Vehicle is already booked for the selected dates');
      }

      // Calculate total price
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = days * parseFloat(vehicle.daily_rent_price);

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (customer_id, vehicle_id, rent_start_date, rent_end_date, total_price, status) 
         VALUES ($1, $2, $3, $4, $5, 'active') 
         RETURNING *`,
        [customerId, vehicleId, rentStartDate, rentEndDate, totalPrice]
      );

      // Update vehicle status to booked
      await client.query(
        `UPDATE vehicles SET availability_status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [vehicleId]
      );

      await client.query('COMMIT');

      // Fetch complete booking details with vehicle and customer info
      const completeBooking = await pool.query(
        `SELECT 
          b.*,
          v.vehicle_name,
          v.daily_rent_price,
          v.type as vehicle_type,
          v.registration_number,
          u.name as customer_name,
          u.email as customer_email
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         JOIN users u ON b.customer_id = u.id
         WHERE b.id = $1`,
        [bookingResult.rows[0].id]
      );

      const result = completeBooking.rows[0];
      
      // Format response with nested objects
      return {
        id: result.id,
        customer_id: result.customer_id,
        vehicle_id: result.vehicle_id,
        rent_start_date: result.rent_start_date,
        rent_end_date: result.rent_end_date,
        total_price: parseFloat(result.total_price),
        status: result.status,
        vehicle: {
          vehicle_name: result.vehicle_name,
          daily_rent_price: parseFloat(result.daily_rent_price)
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllBookings(userId: number, userRole: string) {
    let query = `
      SELECT 
        b.*,
        v.vehicle_name,
        v.type as vehicle_type,
        v.registration_number,
        v.daily_rent_price,
        u.name as customer_name,
        u.email as customer_email
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u ON b.customer_id = u.id
    `;

    const params: any[] = [];

    // If customer, only show their bookings
    if (userRole === 'customer') {
      query += ' WHERE b.customer_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await pool.query(query, params);
    
    // Format response based on user role
    if (userRole === 'admin') {
      // Admin sees all bookings with customer info
      return result.rows.map(row => ({
        id: row.id,
        customer_id: row.customer_id,
        vehicle_id: row.vehicle_id,
        rent_start_date: row.rent_start_date,
        rent_end_date: row.rent_end_date,
        total_price: parseFloat(row.total_price),
        status: row.status,
        customer: {
          name: row.customer_name,
          email: row.customer_email
        },
        vehicle: {
          vehicle_name: row.vehicle_name,
          registration_number: row.registration_number
        }
      }));
    } else {
      // Customer sees only their bookings without customer info
      return result.rows.map(row => ({
        id: row.id,
        vehicle_id: row.vehicle_id,
        rent_start_date: row.rent_start_date,
        rent_end_date: row.rent_end_date,
        total_price: parseFloat(row.total_price),
        status: row.status,
        vehicle: {
          vehicle_name: row.vehicle_name,
          registration_number: row.registration_number,
          type: row.vehicle_type
        }
      }));
    }
  }

  async getBookingById(bookingId: number) {
    const result = await pool.query(
      `SELECT 
        b.*,
        v.vehicle_name,
        v.type as vehicle_type,
        v.registration_number,
        u.name as customer_name,
        u.email as customer_email
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       JOIN users u ON b.customer_id = u.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new Error('Booking not found');
    }

    return result.rows[0];
  }

  async updateBooking(
    bookingId: number,
    userId: number,
    userRole: string,
    action: 'cancel' | 'return'
  ) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get booking details
      const bookingResult = await client.query(
        'SELECT * FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      // Check permissions
      if (action === 'cancel') {
        // Only customer can cancel their own booking
        if (userRole !== 'admin' && booking.customer_id !== userId) {
          throw new Error('You can only cancel your own bookings');
        }

        // Check if booking is active
        if (booking.status !== 'active') {
          throw new Error('Only active bookings can be cancelled');
        }

        // Check if booking hasn't started yet
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(booking.rent_start_date);
        
        if (startDate <= today) {
          throw new Error('Cannot cancel booking that has already started');
        }

        // Cancel booking
        await client.query(
          `UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [bookingId]
        );

        // Update vehicle status to available
        await client.query(
          `UPDATE vehicles SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [booking.vehicle_id]
        );
      } else if (action === 'return') {
        // Only admin can mark as returned
        if (userRole !== 'admin') {
          throw new Error('Only admin can mark bookings as returned');
        }

        // Check if booking is active
        if (booking.status !== 'active') {
          throw new Error('Only active bookings can be marked as returned');
        }

        // Mark as returned
        await client.query(
          `UPDATE bookings SET status = 'returned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [bookingId]
        );

        // Update vehicle status to available
        await client.query(
          `UPDATE vehicles SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [booking.vehicle_id]
        );
      }

      await client.query('COMMIT');

      // Fetch updated booking with vehicle info
      const updatedBookingResult = await pool.query(
        `SELECT 
          b.*,
          v.availability_status as vehicle_availability_status
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.id = $1`,
        [bookingId]
      );

      const result = updatedBookingResult.rows[0];

      // Format response based on action
      if (action === 'return') {
        return {
          id: result.id,
          customer_id: result.customer_id,
          vehicle_id: result.vehicle_id,
          rent_start_date: result.rent_start_date,
          rent_end_date: result.rent_end_date,
          total_price: parseFloat(result.total_price),
          status: result.status,
          vehicle: {
            availability_status: result.vehicle_availability_status
          }
        };
      } else {
        // For cancel action, return without vehicle info
        return {
          id: result.id,
          customer_id: result.customer_id,
          vehicle_id: result.vehicle_id,
          rent_start_date: result.rent_start_date,
          rent_end_date: result.rent_end_date,
          total_price: parseFloat(result.total_price),
          status: result.status
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async autoReturnExpiredBookings() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active bookings that have ended
      const expiredBookings = await client.query(
        `SELECT id, vehicle_id FROM bookings 
         WHERE status = 'active' AND rent_end_date < $1`,
        [today.toISOString().split('T')[0]]
      );

      for (const booking of expiredBookings.rows) {
        // Mark as returned
        await client.query(
          `UPDATE bookings SET status = 'returned', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [booking.id]
        );

        // Update vehicle status to available
        await client.query(
          `UPDATE vehicles SET availability_status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [booking.vehicle_id]
        );
      }

      await client.query('COMMIT');

      return {
        message: `Auto-returned ${expiredBookings.rows.length} expired bookings`,
        count: expiredBookings.rows.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

import app from './app';
import pool from './config/database';
import { createTables } from './config/schema';
import { BookingService } from './modules/bookings/booking.service';

const PORT = process.env.PORT || 5000;

const bookingService = new BookingService();

// Auto-return expired bookings every hour
setInterval(async () => {
  try {
    await bookingService.autoReturnExpiredBookings();
  } catch (error) {
    console.error('Error auto-returning expired bookings:', error);
  }
}, 60 * 60 * 1000); // Run every hour

const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');

    // Create tables if they don't exist
    await createTables();
    console.log('Database tables verified');

    // Auto-return expired bookings on startup
    const result = await bookingService.autoReturnExpiredBookings();
    console.log(result.message);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();

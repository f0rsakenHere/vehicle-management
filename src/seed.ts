import pool from './config/database';
import bcrypt from 'bcrypt';

export const seedDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if data already exists
    const existingUsers = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('Database already seeded. Skipping...');
      return;
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      ['Admin User', 'admin@rental.com', adminPassword, '+1234567890', 'admin']
    );

    // Create customer user
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      ['John Customer', 'customer@rental.com', customerPassword, '+9876543210', 'customer']
    );

    // Create sample vehicles
    const vehicles = [
      {
        name: 'Toyota Camry 2023',
        type: 'car',
        registration: 'ABC-1234',
        price: 50.00
      },
      {
        name: 'Honda Civic 2023',
        type: 'car',
        registration: 'XYZ-5678',
        price: 45.00
      },
      {
        name: 'Yamaha R15',
        type: 'bike',
        registration: 'BIKE-001',
        price: 20.00
      },
      {
        name: 'Ford Transit Van',
        type: 'van',
        registration: 'VAN-2023',
        price: 80.00
      },
      {
        name: 'Toyota Fortuner',
        type: 'SUV',
        registration: 'SUV-9999',
        price: 100.00
      }
    ];

    for (const vehicle of vehicles) {
      await client.query(
        `INSERT INTO vehicles (vehicle_name, type, registration_number, daily_rent_price, availability_status) 
         VALUES ($1, $2, $3, $4, 'available')`,
        [vehicle.name, vehicle.type, vehicle.registration, vehicle.price]
      );
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully');
    console.log('Admin: admin@rental.com / admin123');
    console.log('Customer: customer@rental.com / customer123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

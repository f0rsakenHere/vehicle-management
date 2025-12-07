import pool from '../../config/database';
import { Vehicle } from '../../types';

export class VehicleService {
  async createVehicle(vehicleName: string, type: string, registrationNumber: string, dailyRentPrice: number, availabilityStatus: string = 'available') {
    // Validate type
    const validTypes = ['car', 'bike', 'van', 'SUV'];
    if (!validTypes.includes(type)) {
      throw new Error('Invalid vehicle type. Must be car, bike, van, or SUV');
    }

    // Validate availability status
    const validStatuses = ['available', 'booked'];
    if (!validStatuses.includes(availabilityStatus)) {
      throw new Error('Invalid availability status. Must be available or booked');
    }

    // Validate daily rent price
    if (dailyRentPrice <= 0) {
      throw new Error('Daily rent price must be positive');
    }

    // Check if registration number already exists
    const existing = await pool.query(
      'SELECT id FROM vehicles WHERE registration_number = $1',
      [registrationNumber]
    );

    if (existing.rows.length > 0) {
      throw new Error('Vehicle with this registration number already exists');
    }

    // Insert new vehicle
    const result = await pool.query(
      `INSERT INTO vehicles (vehicle_name, type, registration_number, daily_rent_price, availability_status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, vehicle_name, type, registration_number, daily_rent_price, availability_status`,
      [vehicleName, type, registrationNumber, dailyRentPrice, availabilityStatus]
    );

    const vehicle = result.rows[0];
    return {
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name,
      type: vehicle.type,
      registration_number: vehicle.registration_number,
      daily_rent_price: parseFloat(vehicle.daily_rent_price),
      availability_status: vehicle.availability_status
    };
  }

  async getAllVehicles() {
    const result = await pool.query(
      'SELECT id, vehicle_name, type, registration_number, daily_rent_price, availability_status FROM vehicles ORDER BY id ASC'
    );
    return result.rows.map(vehicle => ({
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name,
      type: vehicle.type,
      registration_number: vehicle.registration_number,
      daily_rent_price: parseFloat(vehicle.daily_rent_price),
      availability_status: vehicle.availability_status
    }));
  }

  async getVehicleById(vehicleId: number) {
    const result = await pool.query(
      'SELECT id, vehicle_name, type, registration_number, daily_rent_price, availability_status FROM vehicles WHERE id = $1',
      [vehicleId]
    );

    if (result.rows.length === 0) {
      throw new Error('Vehicle not found');
    }

    const vehicle = result.rows[0];
    return {
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name,
      type: vehicle.type,
      registration_number: vehicle.registration_number,
      daily_rent_price: parseFloat(vehicle.daily_rent_price),
      availability_status: vehicle.availability_status
    };
  }

  async updateVehicle(vehicleId: number, updateData: Partial<Vehicle>) {
    // First check if vehicle exists
    await this.getVehicleById(vehicleId);

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.vehicle_name !== undefined) {
      updateFields.push(`vehicle_name = $${paramCount++}`);
      values.push(updateData.vehicle_name);
    }

    if (updateData.type !== undefined) {
      const validTypes = ['car', 'bike', 'van', 'SUV'];
      if (!validTypes.includes(updateData.type)) {
        throw new Error('Invalid vehicle type. Must be car, bike, van, or SUV');
      }
      updateFields.push(`type = $${paramCount++}`);
      values.push(updateData.type);
    }

    if (updateData.registration_number !== undefined) {
      // Check if new registration number already exists for different vehicle
      const existing = await pool.query(
        'SELECT id FROM vehicles WHERE registration_number = $1 AND id != $2',
        [updateData.registration_number, vehicleId]
      );
      if (existing.rows.length > 0) {
        throw new Error('Vehicle with this registration number already exists');
      }
      updateFields.push(`registration_number = $${paramCount++}`);
      values.push(updateData.registration_number);
    }

    if (updateData.daily_rent_price !== undefined) {
      if (updateData.daily_rent_price <= 0) {
        throw new Error('Daily rent price must be positive');
      }
      updateFields.push(`daily_rent_price = $${paramCount++}`);
      values.push(updateData.daily_rent_price);
    }

    if (updateData.availability_status !== undefined) {
      const validStatuses = ['available', 'booked'];
      if (!validStatuses.includes(updateData.availability_status)) {
        throw new Error('Invalid availability status. Must be available or booked');
      }
      updateFields.push(`availability_status = $${paramCount++}`);
      values.push(updateData.availability_status);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(vehicleId);

    const query = `
      UPDATE vehicles 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, vehicle_name, type, registration_number, daily_rent_price, availability_status
    `;

    const result = await pool.query(query, values);
    const vehicle = result.rows[0];
    return {
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name,
      type: vehicle.type,
      registration_number: vehicle.registration_number,
      daily_rent_price: parseFloat(vehicle.daily_rent_price),
      availability_status: vehicle.availability_status
    };
  }

  async deleteVehicle(vehicleId: number) {
    // First check if vehicle exists
    await this.getVehicleById(vehicleId);

    // Check if vehicle has active bookings
    const activeBookings = await pool.query(
      `SELECT id FROM bookings 
       WHERE vehicle_id = $1 AND status = 'active'`,
      [vehicleId]
    );

    if (activeBookings.rows.length > 0) {
      throw new Error('Cannot delete vehicle with active bookings');
    }

    await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
    return { message: 'Vehicle deleted successfully' };
  }
}

import pool from '../../config/database';
import { User } from '../../types';
import bcrypt from 'bcrypt';

export class UserService {
  async getAllUsers() {
    const result = await pool.query(
      'SELECT id, name, email, phone, role FROM users ORDER BY id ASC'
    );
    return result.rows;
  }

  async getUserById(userId: number) {
    const result = await pool.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  async updateUser(userId: number, updateData: Partial<User>, requestingUserId: number, requestingUserRole: string) {
    // First check if user exists
    await this.getUserById(userId);

    // Check permissions: Admin can update anyone, customer can only update themselves
    if (requestingUserRole !== 'admin' && requestingUserId !== userId) {
      throw new Error('You can only update your own profile');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }

    if (updateData.email !== undefined) {
      const lowerEmail = updateData.email.toLowerCase();
      // Check if new email already exists for different user
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [lowerEmail, userId]
      );
      if (existing.rows.length > 0) {
        throw new Error('User with this email already exists');
      }
      updateFields.push(`email = $${paramCount++}`);
      values.push(lowerEmail);
    }

    if (updateData.password !== undefined) {
      if (updateData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      updateFields.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updateData.phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      values.push(updateData.phone);
    }

    // Only admin can change role
    if (updateData.role !== undefined) {
      if (requestingUserRole !== 'admin') {
        throw new Error('Only admin can change user roles');
      }
      const validRoles = ['admin', 'customer'];
      if (!validRoles.includes(updateData.role)) {
        throw new Error('Invalid role. Must be admin or customer');
      }
      updateFields.push(`role = $${paramCount++}`);
      values.push(updateData.role);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, name, email, phone, role
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteUser(userId: number) {
    // First check if user exists
    await this.getUserById(userId);

    // Check if user has active bookings
    const activeBookings = await pool.query(
      `SELECT id FROM bookings 
       WHERE customer_id = $1 AND status = 'active'`,
      [userId]
    );

    if (activeBookings.rows.length > 0) {
      throw new Error('Cannot delete user with active bookings');
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return { message: 'User deleted successfully' };
  }
}

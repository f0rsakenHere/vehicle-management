import pool from '../../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

export class AuthService {
  async signup(name: string, email: string, password: string, phone: string, role: 'admin' | 'customer' = 'customer') {
    // Validate password length
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Convert email to lowercase
    const lowerEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [lowerEmail]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, phone, role, created_at`,
      [name, lowerEmail, hashedPassword, phone, role]
    );

    const user = result.rows[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };
  }

  async signin(email: string, password: string) {
    const lowerEmail = email.toLowerCase();

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [lowerEmail]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user: User = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    };
  }
}

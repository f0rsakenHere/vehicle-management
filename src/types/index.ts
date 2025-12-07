export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'admin' | 'customer';
  created_at?: Date;
  updated_at?: Date;
}

export interface Vehicle {
  id: number;
  vehicle_name: string;
  type: 'car' | 'bike' | 'van' | 'SUV';
  registration_number: string;
  daily_rent_price: number;
  availability_status: 'available' | 'booked';
  created_at?: Date;
  updated_at?: Date;
}

export interface Booking {
  id: number;
  customer_id: number;
  vehicle_id: number;
  rent_start_date: Date;
  rent_end_date: Date;
  total_price: number;
  status: 'active' | 'cancelled' | 'returned';
  created_at?: Date;
  updated_at?: Date;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'admin' | 'customer';
}

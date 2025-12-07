# Vehicle Rental System API

**Live URL:** `https://your-deployment-url.com` *(Update after deployment)*

A professional backend API for managing vehicle rentals with secure authentication and role-based access control. Built with Node.js, TypeScript, Express, and PostgreSQL.

## Features

### Core Features
- **User Authentication & Authorization** - Secure JWT-based authentication with role-based access control
- **Vehicle Management** - Complete CRUD operations for vehicle inventory (cars, bikes, vans, SUVs)
- **Booking System** - Real-time booking with availability tracking and conflict prevention
- **User Management** - Admin dashboard for managing users and permissions
- **Real-time Updates** - Database-driven role verification ensures immediate effect of permission changes

### Business Features
- Automatic price calculation based on rental duration
- Date validation and overlapping booking prevention
- Vehicle availability status management
- Booking cancellation and return workflows
- Protected deletion for active bookings

## Technology Stack

### Backend Framework
- **Node.js** (v21+) - Runtime environment
- **TypeScript** (v5.9+) - Type-safe development
- **Express.js** (v4.18+) - Web application framework

### Database
- **PostgreSQL** - Relational database
- **Neon DB** - Serverless PostgreSQL hosting
- **pg** (v8.11+) - Native PostgreSQL driver (no ORM)

### Security & Authentication
- **bcrypt** (v5.1+) - Password hashing
- **jsonwebtoken** (v9.0+) - JWT token generation and verification
- **CORS** - Cross-origin resource sharing

### Development Tools
- **ts-node** - TypeScript execution
- **nodemon** - Auto-restart on file changes
- **dotenv** - Environment variable management

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (local or cloud-hosted)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository:**
```bash
git clone <repository-url>
cd vehicle-rental-system
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
JWT_SECRET=your_secure_jwt_secret_key_minimum_32_characters
PORT=3000
NODE_ENV=development
```

4. **Initialize database:**

Database tables will be created automatically on first run. The schema includes:
- `users` - User accounts with roles
- `vehicles` - Vehicle inventory
- `bookings` - Rental bookings

### Running the Application

**Development mode with auto-reload:**
```bash
npm run dev
```

**Production build and start:**
```bash
npm run build
npm start
```

**Server will start on:** `http://localhost:3000`

## Usage Instructions

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/signin` - Login and get JWT token

### Vehicles
- `GET /api/v1/vehicles` - Get all vehicles (Public)
- `GET /api/v1/vehicles/:vehicleId` - Get vehicle by ID (Public)
- `POST /api/v1/vehicles` - Create vehicle (Admin only)
- `PUT /api/v1/vehicles/:vehicleId` - Update vehicle (Admin only)
- `DELETE /api/v1/vehicles/:vehicleId` - Delete vehicle (Admin only)

### Users
- `GET /api/v1/users` - Get all users (Admin only)
- `PUT /api/v1/users/:userId` - Update user (Admin or Own)
- `DELETE /api/v1/users/:userId` - Delete user (Admin only)

### Bookings
- `POST /api/v1/bookings` - Create booking (Authenticated)
- `GET /api/v1/bookings` - Get bookings (Admin: all, Customer: own)
- `PUT /api/v1/bookings/:bookingId` - Update booking status (Authenticated)

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Example Requests

### Register User
```json
POST /api/v1/auth/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "customer"
}
```

### Create Vehicle (Admin)
```json
POST /api/v1/vehicles
Authorization: Bearer <admin_token>
{
  "vehicle_name": "Toyota Camry",
  "type": "car",
  "registration_number": "ABC-1234",
  "daily_rent_price": 50.00,
  "availability_status": "available"
}
```

### Create Booking
```json
POST /api/v1/bookings
Authorization: Bearer <token>
{
  "customer_id": 1,
  "vehicle_id": 2,
  "rent_start_date": "2024-12-10",
  "rent_end_date": "2024-12-15"
}
```

### Cancel Booking (Customer)
```json
PUT /api/v1/bookings/1
Authorization: Bearer <customer_token>
{
  "status": "cancelled"
}
```

### Mark as Returned (Admin)
```json
PUT /api/v1/bookings/1
Authorization: Bearer <admin_token>
{
  "status": "returned"
}
```

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's full name
- `email` - Unique email (lowercase)
- `password` - Hashed password
- `phone` - Contact number
- `role` - 'admin' or 'customer'

### Vehicles Table
- `id` - Primary key
- `vehicle_name` - Name of vehicle
- `type` - 'car', 'bike', 'van', or 'SUV'
- `registration_number` - Unique registration
- `daily_rent_price` - Daily rental price
- `availability_status` - 'available' or 'booked'

### Bookings Table
- `id` - Primary key
- `customer_id` - Foreign key to users
- `vehicle_id` - Foreign key to vehicles
- `rent_start_date` - Start date
- `rent_end_date` - End date
- `total_price` - Total rental cost
- `status` - 'active', 'cancelled', or 'returned'

## API Testing

A complete Postman collection is included: `PH-Vehicle-Rental-API.postman_collection.json`

**Import into Postman:**
1. Open Postman
2. Click Import → Upload Files
3. Select the collection file
4. Collection includes pre-configured requests for all endpoints

## Business Logic

### Authentication & Authorization
- JWT tokens store only user ID
- User data (including role) is fetched from database on each request
- Role changes take effect immediately without requiring re-login
- Customers can only create bookings for themselves
- Admins can create bookings for any customer

### Booking Creation
- Validates vehicle availability
- Checks for date conflicts with existing bookings
- Calculates total price based on daily rate and rental duration
- Updates vehicle status to "booked"
- Customers must provide their own customer_id (verified against token)

### Booking Cancellation
- Customers can only cancel their own bookings
- Can only cancel active bookings
- Returns vehicle to "available" status

### Booking Return
- Only admins can mark bookings as returned
- Returns vehicle to "available" status
- Updates booking status to "returned"

### Delete Protection
- Users with active bookings cannot be deleted
- Vehicles with active bookings cannot be deleted

## Project Structure

```
src/
├── config/
│   ├── database.ts       # Database connection
│   └── schema.ts         # Database schema
├── middlewares/
│   ├── auth.middleware.ts    # Authentication & authorization
│   └── error.middleware.ts   # Error handling
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.routes.ts
│   ├── vehicles/
│   │   ├── vehicle.controller.ts
│   │   ├── vehicle.service.ts
│   │   └── vehicle.routes.ts
│   ├── users/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.routes.ts
│   └── bookings/
│       ├── booking.controller.ts
│       ├── booking.service.ts
│       └── booking.routes.ts
├── types/
│   ├── index.ts          # Type definitions
│   └── express.ts        # Express type extensions
├── app.ts                # Express app setup
└── server.ts             # Server entry point
```

## Security Features

- **Password Hashing** - bcrypt with salt rounds for secure password storage
- **JWT Authentication** - Stateless token-based authentication with 7-day expiration
- **Real-time Authorization** - Database-driven role verification on every request
- **SQL Injection Protection** - Parameterized queries throughout the application
- **Input Validation** - Request body validation for all endpoints
- **Error Handling** - Centralized error middleware with proper status codes
- **Role-Based Access Control** - Fine-grained permissions for admin and customer roles

## Contributing

This project uses TypeScript with strict type checking and follows Node.js best practices.

## License

This project is licensed under the ISC License.

## Author

**Mehedi**

## Support

For issues or questions, please open an issue in the repository.

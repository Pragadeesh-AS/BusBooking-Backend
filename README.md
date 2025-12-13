# Travel Booking Backend API

A comprehensive Node.js backend for a travel booking web application with user and admin modules.

## 🚀 Features

### User Module

- User registration and login with JWT authentication
- Search buses by source, destination, and date
- View bus details and seat layouts
- Select and book seats
- View booking history
- Cancel bookings with automatic refund calculation
- Payment processing (placeholder for gateway integration)

### Admin Module

- Admin authentication
- Add, update, and delete buses
- Manage routes and timings
- Create and manage seat layouts
- View all bookings with filters
- View statistics (revenue, bookings, users)
- Manage user accounts

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository or navigate to backend folder**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   - Copy `.env.example` to `.env`

   ```bash
   cp .env.example .env
   ```

   - Update the `.env` file with your configuration:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: A secret key for JWT tokens
     - `PORT`: Server port (default: 5000)

4. **Start MongoDB**
   - If using local MongoDB:
     ```bash
     mongod
     ```
   - Or use MongoDB Atlas cloud database

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User

- **POST** `/auth/register`
- Body: `{ name, email, password, phone }`

#### User Login

- **POST** `/auth/login`
- Body: `{ email, password }`

#### Admin Login

- **POST** `/auth/admin-login`
- Body: `{ email, password }`

#### Get User Profile

- **GET** `/auth/me`
- Headers: `Authorization: Bearer <token>`

### Bus Endpoints

#### Search Buses

- **GET** `/buses/search?source=Mumbai&destination=Pune&date=2025-12-20`

#### Get Bus Details

- **GET** `/buses/:id`

#### Get Seat Layout

- **GET** `/buses/:busId/seats?routeId=xxx&date=2025-12-20`

### Booking Endpoints (Protected)

#### Create Booking

- **POST** `/bookings`
- Headers: `Authorization: Bearer <token>`
- Body: `{ busId, routeId, journeyDate, seats, boardingPoint, droppingPoint }`

#### Get User Bookings

- **GET** `/bookings/user/:userId`
- Headers: `Authorization: Bearer <token>`

#### Get Single Booking

- **GET** `/bookings/:id`
- Headers: `Authorization: Bearer <token>`

#### Cancel Booking

- **PUT** `/bookings/:id/cancel`
- Headers: `Authorization: Bearer <token>`
- Body: `{ reason }`

#### Process Payment

- **POST** `/bookings/:id/payment`
- Headers: `Authorization: Bearer <token>`
- Body: `{ paymentMethod, transactionId }`

### Admin Endpoints (Admin Only)

#### Bus Management

- **GET** `/admin/buses` - Get all buses
- **POST** `/admin/buses` - Add new bus
- **PUT** `/admin/buses/:id` - Update bus
- **DELETE** `/admin/buses/:id` - Delete bus

#### Route Management

- **GET** `/admin/routes` - Get all routes
- **POST** `/admin/routes` - Add new route
- **PUT** `/admin/routes/:id` - Update route
- **DELETE** `/admin/routes/:id` - Delete route

#### Seat Layout Management

- **POST** `/admin/seat-layouts` - Create seat layout
- **PUT** `/admin/seat-layouts/:busId` - Update seat layout

#### Booking Management

- **GET** `/admin/bookings?status=confirmed&date=2025-12-20&busId=xxx` - Get all bookings

#### Statistics

- **GET** `/admin/stats` - Get dashboard statistics

#### User Management

- **GET** `/admin/users` - Get all users
- **PUT** `/admin/users/:id` - Update user status

## 🗂️ Project Structure

```
backend/
├── config/
│   └── db.js               # Database configuration
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── busController.js    # Bus operations
│   ├── bookingController.js # Booking operations
│   └── adminController.js  # Admin operations
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── errorHandler.js    # Error handling
├── models/
│   ├── User.js            # User schema
│   ├── Bus.js             # Bus schema
│   ├── Route.js           # Route schema
│   ├── Booking.js         # Booking schema
│   └── SeatLayout.js      # Seat layout schema
├── routes/
│   ├── auth.js            # Auth routes
│   ├── buses.js           # Bus routes
│   ├── bookings.js        # Booking routes
│   └── admin.js           # Admin routes
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore file
├── package.json          # Dependencies
├── server.js             # Express server
└── README.md             # Documentation
```

## 🔐 Default Admin Credentials

Create an admin user manually in MongoDB or use registration endpoint with role set to 'admin'.

## 🧪 Testing

### Using Postman

1. Import the API endpoints into Postman
2. Test authentication first to get JWT token
3. Add token to Authorization header for protected routes
4. Test user and admin flows

### Sample Request Bodies

**Register:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

**Create Booking:**

```json
{
  "busId": "bus_id_here",
  "routeId": "route_id_here",
  "journeyDate": "2025-12-20",
  "seats": [
    {
      "seatNumber": "A1",
      "passengerName": "John Doe",
      "passengerAge": 30,
      "passengerGender": "Male"
    }
  ],
  "boardingPoint": {
    "location": "Main Station",
    "time": "10:00"
  },
  "droppingPoint": {
    "location": "Central Bus Stand",
    "time": "15:00"
  }
}
```

## 🛡️ Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Protected routes with middleware
- Role-based access control (User/Admin)
- Input validation
- Error handling

## 📝 Notes

- Payment gateway integration is currently a placeholder
- Refund calculation is simplified (can be enhanced)
- Add more validation as needed
- Consider rate limiting for production
- Setup proper logging for production

## 👥 Team

Built with ❤️ by your 6-member team

## 📄 License

ISC

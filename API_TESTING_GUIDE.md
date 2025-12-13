# API Testing Guide

This guide provides step-by-step instructions for testing all backend APIs using tools like Postman, Thunder Client, or curl.

## Setup

1. **Start MongoDB**

   ```bash
   mongod
   ```

2. **Start the backend server**

   ```bash
   cd backend
   npm run dev
   ```

3. **Server should be running on:** `http://localhost:5000`

## Testing Flow

### 1. Health Check

**Endpoint:** `GET /api/health`

```bash
curl http://localhost:5000/api/health
```

Expected Response:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-12-13T..."
}
```

---

## Authentication Tests

### 2. Register New User

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "9876543210"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token** for authenticated requests!

### 3. User Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### 4. Create Admin User

First, connect to MongoDB and create admin manually:

```javascript
// In MongoDB shell or Compass
use travel_booking

db.users.insertOne({
  name: "Admin User",
  email: "admin@travelbooking.com",
  password: "$2a$10$YourHashedPasswordHere", // Use bcrypt to hash "Admin@123"
  phone: "0000000000",
  role: "admin",
  isActive: true,
  createdAt: new Date()
})
```

Or register normally and update role in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@travelbooking.com" },
  { $set: { role: "admin" } }
);
```

### 5. Admin Login

**Endpoint:** `POST /api/auth/admin-login`

**Request Body:**

```json
{
  "email": "admin@travelbooking.com",
  "password": "Admin@123"
}
```

---

## Admin Module Tests

**Important:** Add the admin token to Authorization header:

```
Authorization: Bearer <admin_token>
```

### 6. Add New Bus

**Endpoint:** `POST /api/admin/buses`

**Request Body:**

```json
{
  "name": "Volvo Multi-Axle",
  "busNumber": "MH12AB1234",
  "busType": "Volvo",
  "totalSeats": 40,
  "amenities": ["WiFi", "Charging Point", "Water Bottle", "Reading Light"],
  "operator": "RedBus Travels"
}
```

**Save the bus ID** from response!

### 7. Add Route

**Endpoint:** `POST /api/admin/routes`

**Request Body:**

```json
{
  "bus": "<bus_id_from_step_6>",
  "source": "Mumbai",
  "destination": "Pune",
  "departureTime": "10:00",
  "arrivalTime": "14:00",
  "duration": "4 hours",
  "distance": 150,
  "price": 500,
  "days": [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ],
  "boardingPoints": [
    { "location": "Dadar", "time": "10:00" },
    { "location": "Kalyan", "time": "10:45" }
  ],
  "droppingPoints": [
    { "location": "Pimpri", "time": "13:30" },
    { "location": "Pune Station", "time": "14:00" }
  ]
}
```

**Save the route ID** from response!

### 8. Create Seat Layout

**Endpoint:** `POST /api/admin/seat-layouts`

**Request Body:**

```json
{
  "busId": "<bus_id_from_step_6>",
  "layout": "2x2",
  "seats": [
    {
      "seatNumber": "A1",
      "row": 1,
      "column": 1,
      "type": "seater",
      "position": "window",
      "deck": "lower"
    },
    {
      "seatNumber": "A2",
      "row": 1,
      "column": 2,
      "type": "seater",
      "position": "aisle",
      "deck": "lower"
    },
    {
      "seatNumber": "A3",
      "row": 1,
      "column": 3,
      "type": "seater",
      "position": "aisle",
      "deck": "lower"
    },
    {
      "seatNumber": "A4",
      "row": 1,
      "column": 4,
      "type": "seater",
      "position": "window",
      "deck": "lower"
    },
    {
      "seatNumber": "B1",
      "row": 2,
      "column": 1,
      "type": "seater",
      "position": "window",
      "deck": "lower"
    },
    {
      "seatNumber": "B2",
      "row": 2,
      "column": 2,
      "type": "seater",
      "position": "aisle",
      "deck": "lower"
    },
    {
      "seatNumber": "B3",
      "row": 2,
      "column": 3,
      "type": "seater",
      "position": "aisle",
      "deck": "lower"
    },
    {
      "seatNumber": "B4",
      "row": 2,
      "column": 4,
      "type": "seater",
      "position": "window",
      "deck": "lower"
    }
  ]
}
```

_Note: Add more seats to match totalSeats (40 in this example)_

### 9. View All Buses (Admin)

**Endpoint:** `GET /api/admin/buses`

### 10. View All Routes (Admin)

**Endpoint:** `GET /api/admin/routes`

---

## User Module Tests

**Use user token** for these requests:

```
Authorization: Bearer <user_token>
```

### 11. Search Buses (Public - No Auth Required)

**Endpoint:** `GET /api/buses/search?source=Mumbai&destination=Pune&date=2025-12-20`

**Query Parameters:**

- source: Mumbai
- destination: Pune
- date: 2025-12-20

### 12. Get Bus Details (Public)

**Endpoint:** `GET /api/buses/<bus_id>`

### 13. Get Seat Layout (Public)

**Endpoint:** `GET /api/buses/<bus_id>/seats?routeId=<route_id>&date=2025-12-20`

### 14. Create Booking (Authenticated)

**Endpoint:** `POST /api/bookings`

**Request Body:**

```json
{
  "busId": "<bus_id>",
  "routeId": "<route_id>",
  "journeyDate": "2025-12-20",
  "seats": [
    {
      "seatNumber": "A1",
      "passengerName": "John Doe",
      "passengerAge": 30,
      "passengerGender": "Male"
    },
    {
      "seatNumber": "A2",
      "passengerName": "Jane Doe",
      "passengerAge": 28,
      "passengerGender": "Female"
    }
  ],
  "boardingPoint": {
    "location": "Dadar",
    "time": "10:00"
  },
  "droppingPoint": {
    "location": "Pune Station",
    "time": "14:00"
  }
}
```

**Save the booking ID** from response!

### 15. Process Payment

**Endpoint:** `POST /api/bookings/<booking_id>/payment`

**Request Body:**

```json
{
  "paymentMethod": "upi",
  "transactionId": "TXN123456789"
}
```

### 16. Get User Bookings

**Endpoint:** `GET /api/bookings/user/<user_id>`

### 17. Cancel Booking

**Endpoint:** `PUT /api/bookings/<booking_id>/cancel`

**Request Body:**

```json
{
  "reason": "Change of plans"
}
```

---

## Admin Viewing & Management

### 18. View All Bookings (Admin)

**Endpoint:** `GET /api/admin/bookings`

**With Filters:**

- `GET /api/admin/bookings?status=confirmed`
- `GET /api/admin/bookings?date=2025-12-20`
- `GET /api/admin/bookings?busId=<bus_id>`

### 19. View Statistics (Admin)

**Endpoint:** `GET /api/admin/stats`

### 20. View All Users (Admin)

**Endpoint:** `GET /api/admin/users`

### 21. Deactivate User (Admin)

**Endpoint:** `PUT /api/admin/users/<user_id>`

**Request Body:**

```json
{
  "isActive": false
}
```

---

## Common Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Please provide all required fields"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Access denied. Admin only."
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Resource not found"
}
```

---

## Testing Checklist

- [ ] Server health check
- [ ] User registration
- [ ] User login
- [ ] Admin login
- [ ] Add bus (admin)
- [ ] Add route (admin)
- [ ] Create seat layout (admin)
- [ ] Search buses
- [ ] View seat availability
- [ ] Create booking
- [ ] Process payment
- [ ] View user bookings
- [ ] Cancel booking
- [ ] View all bookings (admin)
- [ ] View statistics (admin)
- [ ] Manage users (admin)

---

## Tips

1. **Save tokens:** After login, copy the JWT token and add it to all authenticated requests
2. **Save IDs:** Keep track of bus IDs, route IDs, and booking IDs for testing
3. **Check MongoDB:** Use MongoDB Compass to verify data is being saved correctly
4. **Error messages:** Read error messages carefully - they guide you on what's missing
5. **Date format:** Use YYYY-MM-DD format for dates

## Next Steps

1. Test all endpoints systematically
2. Note any bugs or issues
3. Enhance validation as needed
4. Integrate payment gateway later
5. Add more features based on requirements

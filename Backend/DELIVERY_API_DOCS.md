# Delivery Person API Documentation

## Overview
This documentation covers the API endpoints for delivery person registration, authentication, and management in the food delivery system.

## Database Model
Delivery persons are stored in a separate `DeliveryPerson` collection with the following fields:

### Required Fields
- `firstName`: String, required
- `lastName`: String, required  
- `universityId`: String, required, unique
- `phone`: String, required (10-15 digits)
- `email`: String, required, unique, validated
- `password`: String, required (min 6 characters, hashed)
- `vehicleType`: String, required, enum: ['bicycle', 'motorcycle', 'car', 'scooter']

### Optional Fields
- `vehicleNumber`: String, default: ''
- `deliveryArea`: String, default: ''
- `profilePic`: String, default: ''
- `isActive`: Boolean, default: true
- `isVerified`: Boolean, default: false
- `rating`: Number, default: 0 (0-5)
- `totalDeliveries`: Number, default: 0
- `currentStatus`: String, enum: ['available', 'busy', 'offline'], default: 'offline'
- `emergencyContact`: Object with name, phone, relationship
- `documents`: Object with idCard, drivingLicense, vehicleRegistration

## Authentication Endpoints

### 1. Delivery Person Registration
**POST** `/api/auth/delivery-signup`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "universityId": "UNI12345",
  "phone": "1234567890",
  "email": "john.delivery@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "vehicleType": "bicycle",
  "vehicleNumber": "BK123", // optional
  "deliveryArea": "Campus Area" // optional
}
```

**Response (Success - 201):**
```json
{
  "message": "Delivery person registered successfully",
  "deliveryPersonId": "64f7b8c9e1234567890abcde",
  "email": "john.delivery@example.com"
}
```

**Response (Error - 400/500):**
```json
{
  "message": "Error description"
}
```

### 2. Delivery Person Login
**POST** `/api/auth/delivery-login`

**Request Body:**
```json
{
  "email": "john.delivery@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "message": "Delivery login successful",
  "userId": "64f7b8c9e1234567890abcde",
  "email": "john.delivery@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

Sets `deliveryToken` cookie with JWT containing:
- `userId`: Delivery person ID
- `email`: Delivery person email
- `userType`: "delivery"

## Delivery Management Endpoints
*All endpoints require delivery authentication*

### 3. Get Delivery Profile
**GET** `/api/delivery/profile`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f7b8c9e1234567890abcde",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.delivery@example.com",
    "vehicleType": "bicycle",
    "currentStatus": "available",
    "rating": 4.5,
    "totalDeliveries": 25
    // ... other fields
  }
}
```

### 4. Update Delivery Profile
**PUT** `/api/delivery/profile`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "9876543210",
  "vehicleType": "motorcycle",
  "vehicleNumber": "MK456",
  "deliveryArea": "Downtown",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "1234567890",
    "relationship": "Spouse"
  }
}
```

### 5. Update Delivery Status
**PUT** `/api/delivery/status`

**Request Body:**
```json
{
  "status": "available" // "available", "busy", "offline"
}
```

### 6. Get Delivery Statistics
**GET** `/api/delivery/statistics`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalDeliveries": 25,
    "rating": 4.5,
    "currentStatus": "available",
    "isVerified": true
  }
}
```

### 7. Get Pending Orders for Delivery
**GET** `/api/delivery/pending-orders`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f7b8c9e1234567890abcde",
      "userId": "64f7b8c9e1234567890abcdf",
      "itemId": "64f7b8c9e1234567890abce0",
      "itemName": "Margherita Pizza",
      "quantity": 2,
      "method": "delivery",
      "address": "123 Main St, City",
      "status": "pending",
      "price": 299,
      "img": "product-images/pizza.jpg",
      "expiresAt": "2024-01-15T14:30:00.000Z",
      "createdAt": "2024-01-15T14:25:00.000Z"
    }
  ]
}
```

### 8. Accept Order
**POST** `/api/delivery/accept-order/:orderId`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "orderId": "64f7b8c9e1234567890abcde",
    "estimatedDeliveryTime": "2024-01-15T15:00:00.000Z"
  }
}
```

### 9. Decline Order
**POST** `/api/delivery/decline-order/:orderId`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order declined"
}
```

### 10. Get My Assigned Orders
**GET** `/api/delivery/my-orders`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f7b8c9e1234567890abcde",
      "itemName": "Margherita Pizza",
      "status": "assigned",
      "deliveryPersonId": "64f7b8c9e1234567890abcdf",
      "assignedAt": "2024-01-15T14:25:00.000Z",
      "estimatedDeliveryTime": "2024-01-15T15:00:00.000Z",
      "address": "123 Main St, City"
    }
  ]
}
```

### 11. Update Order Status
**PUT** `/api/delivery/update-order-status/:orderId`

**Headers:**
```
Cookie: deliveryToken=<jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "out_for_delivery" // "pending", "assigned", "out_for_delivery", "delivered"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "64f7b8c9e1234567890abcde",
    "status": "in_progress",
    "deliveredAt": "2024-01-15T15:30:00.000Z" // only if status is 'delivered'
  }
}
```

## Error Handling

### Common Error Responses:
- **400 Bad Request**: Validation errors, missing fields
- **401 Unauthorized**: Invalid or missing token
- **403 Forbidden**: Account not verified/deactivated
- **404 Not Found**: Delivery person not found
- **500 Internal Server Error**: Server errors

### Validation Rules:
- Email must be unique across both users and delivery persons
- University ID must be unique among delivery persons
- Phone number: 10-15 digits only
- Password: minimum 6 characters
- Vehicle type: must be one of allowed values

## Authentication Middleware

The system includes specialized middleware for delivery person authentication:

1. **verifyDeliveryAuth**: Validates delivery token and loads delivery person data
2. **verifyDeliveryVerified**: Ensures delivery person account is verified
3. **checkDeliveryStatus**: Validates delivery person status for specific actions

## Security Features

- Passwords are hashed using bcrypt (salt rounds: 12)
- JWT tokens expire after 24 hours
- Separate token namespace for delivery persons
- Input validation and sanitization
- Database indexes for performance
- CORS protection
- HTTP-only cookies for token storage

## Integration Notes

- Frontend should handle loading states during API calls
- Success redirects should go to `/delivery-signin` after registration
- Error messages should be displayed to users
- Token expiration should redirect to login page
- All delivery-specific routes are prefixed with `/api/delivery/`
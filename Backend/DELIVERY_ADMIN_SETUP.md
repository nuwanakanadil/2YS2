# Delivery Admin System

## Setup Instructions

### 1. Create Delivery Admin Account

Run the following command in the Backend directory to create a delivery admin account:

```bash
npm run create-admin
```

This will create an admin account with these credentials:
- **Email**: `admin@gmail.com`
- **Password**: `admin123`

### 2. Admin Login

1. Go to the delivery login page: `/delivery-signin`
2. Use the admin credentials above
3. You will be automatically redirected to the admin dashboard: `/delivery-admin-dashboard`

### 3. Admin Features

The delivery admin dashboard provides:

- **Statistics Overview**: View total delivery persons, active delivery persons, total orders, and completed orders
- **Delivery Persons Management**: View all delivery persons in a table format
- **Delete Delivery Persons**: Remove delivery persons from the system (with safety checks)

### 4. Admin Permissions

- Only users with `role: 'delivery_admin'` can access admin routes
- Admin cannot delete other admin accounts
- Admin cannot delete delivery persons with active orders
- All admin actions are logged and secured

### 5. Safety Features

- Active order check before deletion
- Confirmation dialog for deletions
- Automatic cleanup of order references when deleting delivery persons
- Role-based access control

## API Endpoints

### Admin Routes (Require Admin Authentication)

- `GET /api/delivery/admin/delivery-persons` - Get all delivery persons
- `DELETE /api/delivery/admin/delivery-person/:id` - Delete a delivery person
- `GET /api/delivery/admin/statistics` - Get admin statistics

### Authentication Flow

1. Admin logs in through the same delivery login endpoint
2. Backend checks role and includes it in JWT token
3. Frontend redirects based on role (admin vs regular delivery person)
4. Admin routes are protected by `verifyDeliveryAdmin` middleware

## Database Changes

### DeliveryPerson Model Updates

Added new field:
```javascript
role: {
  type: String,
  enum: ['delivery_person', 'delivery_admin'],
  default: 'delivery_person',
}
```

This allows the system to distinguish between regular delivery persons and admins using the same authentication system.
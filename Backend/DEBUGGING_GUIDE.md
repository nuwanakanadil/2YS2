## Manual Testing Steps for Delivery Admin Dashboard

### Step 1: Start the Backend Server

1. Open terminal/command prompt
2. Navigate to Backend directory:
   ```
   cd "c:\Users\Kavindu Shalinda\OneDrive\Desktop\ammatasiri testing two\2YS2\Backend"
   ```
3. Start the server:
   ```
   npm start
   ```
   or 
   ```
   node server.js
   ```

### Step 2: Test Database Connection

Open a browser and go to: `http://localhost:5000`
You should see the server running.

### Step 3: Create Admin Account (Manual Method)

If you have MongoDB Compass or access to your MongoDB Atlas database:

1. Go to your `MealMatrix` database
2. Find the `deliverypersons` collection
3. Add this document manually:

```json
{
  "firstName": "Delivery",
  "lastName": "Admin",
  "universityId": "ADMIN001",
  "phone": "1234567890",
  "email": "admin@gmail.com",
  "password": "$2a$12$8B8gOT7Z6X8Z8Z8Z8Z8Z8uK8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8",
  "role": "delivery_admin",
  "vehicleType": "car",
  "vehicleNumber": "ADMIN-001",
  "deliveryArea": "All Areas",
  "isActive": true,
  "isVerified": true,
  "currentStatus": "available",
  "rating": 5,
  "totalDeliveries": 0,
  "emergencyContact": {
    "name": "",
    "phone": "",
    "relationship": ""
  },
  "documents": {
    "idCard": "",
    "drivingLicense": "",
    "vehicleRegistration": ""
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Password**: The hashed password above is for `admin123`

### Step 4: Add Test Delivery Persons

Add these documents to the same collection:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "universityId": "DEL001",
  "phone": "1234567891",
  "email": "john.doe@test.com",
  "password": "$2a$12$8B8gOT7Z6X8Z8Z8Z8Z8Z8uK8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8",
  "role": "delivery_person",
  "vehicleType": "motorcycle",
  "vehicleNumber": "MOT-001",
  "deliveryArea": "Area 1",
  "isActive": true,
  "isVerified": true,
  "currentStatus": "available",
  "rating": 4.5,
  "totalDeliveries": 15,
  "emergencyContact": {
    "name": "",
    "phone": "",
    "relationship": ""
  },
  "documents": {
    "idCard": "",
    "drivingLicense": "",
    "vehicleRegistration": ""
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Step 5: Test the Admin Dashboard

1. Go to: `http://localhost:3000/delivery-signin`
2. Login with:
   - Email: `admin@gmail.com`
   - Password: `admin123`
3. You should be redirected to `/delivery-admin-dashboard`
4. Check browser console for any errors

### Step 6: Debug API Calls

If the dashboard shows loading but no data:

1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Refresh the admin dashboard page
4. Look for these API calls:
   - `GET /api/delivery/profile` - Should return admin info
   - `GET /api/delivery/admin/delivery-persons` - Should return delivery persons list
   - `GET /api/delivery/admin/statistics` - Should return statistics

### Step 7: Check Server Logs

Look at the terminal where your backend server is running. You should see debug logs like:
- "Admin request - User ID: ..."
- "Found delivery persons: ..."
- "Statistics: ..."

### Alternative: Use Postman/Insomnia

Test the API endpoints directly:

1. **Login first** (POST): `http://localhost:5000/api/auth/delivery-login`
   Body:
   ```json
   {
     "email": "admin@gmail.com",
     "password": "admin123"
   }
   ```

2. **Get delivery persons** (GET): `http://localhost:5000/api/delivery/admin/delivery-persons`
   (Make sure to include cookies from login response)

3. **Get statistics** (GET): `http://localhost:5000/api/delivery/admin/statistics`

## Quick Fix - Frontend Only

If you just want to see the dashboard working, modify the frontend to use mock data temporarily:

In `DeliveryAdminDashboard.js`, comment out the API calls and use:

```javascript
// Mock data for testing
useEffect(() => {
  setDeliveryPersons([
    {
      _id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      phone: '123456789',
      vehicleType: 'motorcycle',
      vehicleNumber: 'MOT-001',
      currentStatus: 'available',
      totalDeliveries: 15,
      rating: 4.5,
      createdAt: new Date()
    }
  ]);
  
  setStatistics({
    totalDeliveryPersons: 3,
    activeDeliveryPersons: 2,
    totalOrders: 50,
    completedOrders: 45
  });
  
  setLoading(false);
}, []);
```
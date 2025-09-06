const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the DeliveryPerson model
const DeliveryPerson = require('./models/DeliveryPerson');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// Create delivery admin
const createDeliveryAdmin = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await DeliveryPerson.findOne({ role: 'delivery_admin' });
    
    if (existingAdmin) {
      console.log('Delivery admin already exists:');
      console.log('Email:', existingAdmin.email);
      console.log('You can use these credentials to login as admin');
      process.exit(0);
    }

    // Admin credentials
    const adminData = {
      firstName: 'Delivery',
      lastName: 'Admin',
      universityId: 'ADMIN001',
      phone: '1234567890',
      email: 'admin@gmail.com',
      password: 'admin123', // This will be hashed
      role: 'delivery_admin',
      vehicleType: 'car',
      vehicleNumber: 'ADMIN-001',
      deliveryArea: 'All Areas',
      isActive: true,
      isVerified: true,
      currentStatus: 'available'
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);
    adminData.password = hashedPassword;

    // Create admin
    const admin = new DeliveryPerson(adminData);
    await admin.save();

    console.log('✅ Delivery Admin created successfully!');
    console.log('');
    console.log('🔑 Admin Login Credentials:');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');
    console.log('');
    console.log('📝 Instructions:');
    console.log('1. Go to the delivery login page (/delivery-signin)');
    console.log('2. Use the above credentials to login');
    console.log('3. You will be redirected to the admin dashboard');
    console.log('4. From there you can manage all delivery persons');
    console.log('');
    console.log('⚠️  Important: Change the admin password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating delivery admin:', error);
    process.exit(1);
  }
};

// Run the script
createDeliveryAdmin();
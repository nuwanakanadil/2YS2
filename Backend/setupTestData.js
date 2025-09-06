const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
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

// Check database and create test data
const checkAndCreateTestData = async () => {
  try {
    await connectDB();

    console.log('🔍 Checking database...\n');

    // Check for admin
    const adminExists = await DeliveryPerson.findOne({ role: 'delivery_admin' });
    console.log('Admin exists:', adminExists ? 'YES' : 'NO');
    if (adminExists) {
      console.log('Admin email:', adminExists.email);
    }

    // Check for delivery persons
    const deliveryPersons = await DeliveryPerson.find({ role: 'delivery_person' });
    console.log('Delivery persons count:', deliveryPersons.length);

    // Check all delivery persons (including admin)
    const allDeliveryPersons = await DeliveryPerson.find({});
    console.log('Total records in DeliveryPerson collection:', allDeliveryPersons.length);
    
    console.log('\n📋 All Delivery Persons:');
    allDeliveryPersons.forEach((person, index) => {
      console.log(`${index + 1}. ${person.firstName} ${person.lastName} (${person.email}) - Role: ${person.role}`);
    });

    // Create admin if doesn't exist
    if (!adminExists) {
      console.log('\n🔧 Creating admin...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const admin = new DeliveryPerson({
        firstName: 'Delivery',
        lastName: 'Admin',
        universityId: 'ADMIN001',
        phone: '1234567890',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'delivery_admin',
        vehicleType: 'car',
        vehicleNumber: 'ADMIN-001',
        deliveryArea: 'All Areas',
        isActive: true,
        isVerified: true,
        currentStatus: 'available'
      });

      await admin.save();
      console.log('✅ Admin created successfully!');
    }

    // Create test delivery persons if none exist
    if (deliveryPersons.length === 0) {
      console.log('\n🔧 Creating test delivery persons...');
      
      const testPersons = [
        {
          firstName: 'John',
          lastName: 'Doe',
          universityId: 'DEL001',
          phone: '1234567891',
          email: 'john.doe@test.com',
          password: await bcrypt.hash('password123', 12),
          role: 'delivery_person',
          vehicleType: 'motorcycle',
          vehicleNumber: 'MOT-001',
          deliveryArea: 'Area 1',
          isActive: true,
          isVerified: true,
          currentStatus: 'available',
          totalDeliveries: 15,
          rating: 4.5
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          universityId: 'DEL002',
          phone: '1234567892',
          email: 'jane.smith@test.com',
          password: await bcrypt.hash('password123', 12),
          role: 'delivery_person',
          vehicleType: 'bicycle',
          vehicleNumber: 'BIC-001',
          deliveryArea: 'Area 2',
          isActive: true,
          isVerified: true,
          currentStatus: 'offline',
          totalDeliveries: 23,
          rating: 4.8
        },
        {
          firstName: 'Mike',
          lastName: 'Johnson',
          universityId: 'DEL003',
          phone: '1234567893',
          email: 'mike.johnson@test.com',
          password: await bcrypt.hash('password123', 12),
          role: 'delivery_person',
          vehicleType: 'scooter',
          vehicleNumber: 'SCO-001',
          deliveryArea: 'Area 3',
          isActive: true,
          isVerified: true,
          currentStatus: 'busy',
          totalDeliveries: 8,
          rating: 4.2
        }
      ];

      for (const personData of testPersons) {
        const person = new DeliveryPerson(personData);
        await person.save();
        console.log(`✅ Created: ${personData.firstName} ${personData.lastName}`);
      }
    }

    // Final count
    const finalCount = await DeliveryPerson.countDocuments({ role: 'delivery_person' });
    console.log(`\n🎉 Database setup complete! Found ${finalCount} delivery persons.`);
    
    console.log('\n🔑 Login credentials:');
    console.log('Admin: admin@gmail.com / admin123');
    console.log('Test delivery person: john.doe@test.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the script
checkAndCreateTestData();
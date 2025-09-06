const mongoose = require('mongoose');
const Order = require('./models/Order');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for test data insertion');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Test orders data
const testOrders = [
  {
    userId: "user123",
    itemId: "item001",
    itemName: "Margherita Pizza",
    quantity: 2,
    method: "delivery",
    address: "123 Main Street, Downtown Area, City - 12345",
    status: "pending",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    price: 299,
    img: "product-images/pizza.jpg",
    deliveryPersonId: null,
    deliveryNotes: ""
  },
  {
    userId: "user456", 
    itemId: "item002",
    itemName: "Chicken Burger Combo",
    quantity: 1,
    method: "delivery",
    address: "456 Oak Avenue, University Campus, City - 67890",
    status: "pending",
    expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
    price: 450,
    img: "product-images/burger.jpg",
    deliveryPersonId: null,
    deliveryNotes: ""
  },
  {
    userId: "user789",
    itemId: "item003", 
    itemName: "Vegetable Fried Rice",
    quantity: 3,
    method: "delivery",
    address: "789 Pine Road, Residential Complex, City - 54321",
    status: "pending",
    expiresAt: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes from now
    price: 180,
    img: "product-images/fried-rice.jpg",
    deliveryPersonId: null,
    deliveryNotes: ""
  }
];

// Function to insert test orders
const insertTestOrders = async () => {
  try {
    await connectDB();
    
    // Clear any existing test orders (optional)
    console.log('Checking for existing test orders...');
    const existingOrders = await Order.find({
      userId: { $in: ["user123", "user456", "user789"] }
    });
    
    if (existingOrders.length > 0) {
      console.log(`Found ${existingOrders.length} existing test orders. Removing them...`);
      await Order.deleteMany({
        userId: { $in: ["user123", "user456", "user789"] }
      });
      console.log('Existing test orders removed.');
    }
    
    // Insert new test orders
    console.log('Inserting new test orders...');
    const insertedOrders = await Order.insertMany(testOrders);
    
    console.log('✅ Successfully inserted test orders:');
    insertedOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.itemName} - Quantity: ${order.quantity} - Total: ₹${order.price * order.quantity}`);
      console.log(`   Address: ${order.address}`);
      console.log(`   Expires at: ${order.expiresAt.toLocaleString()}`);
      console.log(`   Order ID: ${order._id}`);
      console.log('');
    });
    
    console.log(`🎉 Total ${insertedOrders.length} test orders added to the database!`);
    console.log('');
    console.log('📋 These orders will now appear in:');
    console.log('   • Delivery Dashboard (/deliveryDashboard) - for delivery persons to accept');
    console.log('   • User Orders (/Orders) - when viewed by respective users');
    console.log('');
    console.log('🚀 You can now test the delivery system by:');
    console.log('   1. Login as a delivery person (/delivery-signin)');
    console.log('   2. View available orders on the dashboard');
    console.log('   3. Accept an order to test the workflow');
    
  } catch (error) {
    console.error('❌ Error inserting test orders:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

// Run the script
insertTestOrders();
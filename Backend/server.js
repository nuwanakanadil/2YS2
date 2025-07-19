const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./route/auth');
const profileRoutes = require('./route/getUserDetailsRoute');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const uploadRoutes = require('./route/userProfileImg')
const updateprfileRoutes = require('./route/updateUser')
const reviewRoutes = require('./route/reviews');


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true,               // allow cookies/session
}));
app.use(express.json()); // Parse incoming JSON

app.use(cookieParser()); // Needed for reading cookies

// Static file serving
// app.use('/User profile images', express.static('User profile images')); // <-- Serve uploads
app.use('/profile-images', express.static('profile-images')); // <-- Serve profile images

// Routes
app.use('/api/auth', authRoutes); // Signup/Login endpoint base
app.use('/api/auth', profileRoutes); // Profile endpoint base
app.use('/api', uploadRoutes); // <-- Use upload route
app.use('/api',updateprfileRoutes); // <-- Use update profile route);
app.use('/api/reviews', reviewRoutes); // Reviews endpoint base

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const DeliveryPerson = require('../models/DeliveryPerson');
const jwt = require('jsonwebtoken');



const router = express.Router();

router.post('/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    universityId,
    phone,
    email,
    password,
    confirmPassword,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !universityId ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      universityId,
      phone,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /api/auth/login  - user login

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password or Email' });

    const payload = {
      userId: user._id,
      email: user.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      
      .status(200)
      .json({ message: 'Login successful', userId: user._id, email: user.email });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// route/auth.js
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// POST /api/auth/delivery-signup - delivery person signup
router.post('/delivery-signup', async (req, res) => {
  const {
    firstName,
    lastName,
    universityId,
    phone,
    email,
    password,
    confirmPassword,
    vehicleType,
    vehicleNumber,
    deliveryArea,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !universityId ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }

  // Validate password match
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // Validate phone number
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Phone number must be 10-15 digits' });
  }

  // Validate vehicle type
  const validVehicleTypes = ['bicycle', 'motorcycle', 'car', 'scooter'];
  if (vehicleType && !validVehicleTypes.includes(vehicleType)) {
    return res.status(400).json({ message: 'Invalid vehicle type' });
  }

  try {
    // Check if email already exists in regular users
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already exists in user records' });
    }

    // Check if email already exists in delivery persons
    const deliveryPersonExists = await DeliveryPerson.findOne({ email });
    if (deliveryPersonExists) {
      return res.status(400).json({ message: 'Email already exists in delivery records' });
    }

    // Check if university ID already exists in delivery persons
    const universityIdExists = await DeliveryPerson.findOne({ universityId });
    if (universityIdExists) {
      return res.status(400).json({ message: 'University ID already registered as delivery person' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new delivery person
    const newDeliveryPerson = new DeliveryPerson({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      universityId: universityId.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      vehicleType: vehicleType || 'bicycle',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim() : '',
      deliveryArea: deliveryArea ? deliveryArea.trim() : '',
    });

    await newDeliveryPerson.save();
    
    // Log successful registration
    console.log(`New delivery person registered: ${email}`);
    
    res.status(201).json({ 
      message: 'Delivery person registered successfully',
      deliveryPersonId: newDeliveryPerson._id,
      email: newDeliveryPerson.email
    });

  } catch (err) {
    console.error('Delivery signup error:', err);
    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/delivery-login - delivery person login
router.post('/delivery-login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const deliveryPerson = await DeliveryPerson.findOne({ email });

    if (!deliveryPerson)
      return res.status(404).json({ message: 'Delivery person not found' });

    const isMatch = await bcrypt.compare(password, deliveryPerson.password);

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password or Email' });

    // Update delivery person status to available when they log in
    await DeliveryPerson.findByIdAndUpdate(deliveryPerson._id, {
      currentStatus: 'available'
    });

    const payload = {
      userId: deliveryPerson._id,
      email: deliveryPerson.email,
      userType: 'delivery',
      role: deliveryPerson.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res
      .cookie('deliveryToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      
      .status(200)
      .json({ 
        message: 'Delivery login successful', 
        userId: deliveryPerson._id, 
        email: deliveryPerson.email,
        firstName: deliveryPerson.firstName,
        lastName: deliveryPerson.lastName,
        role: deliveryPerson.role
      });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/delivery-logout - delivery person logout
router.post('/delivery-logout', async (req, res) => {
  try {
    // Get delivery person ID from cookie if available
    const token = req.cookies.deliveryToken;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userType === 'delivery') {
          // Update delivery person status to offline when they log out
          await DeliveryPerson.findByIdAndUpdate(decoded.userId, {
            currentStatus: 'offline'
          });
        }
      } catch (tokenError) {
        // Token might be invalid, but we still want to clear the cookie
        console.log('Invalid token during logout:', tokenError.message);
      }
    }
    
    res.clearCookie('deliveryToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });
    
    res.status(200).json({ message: 'Delivery person logged out successfully' });
  } catch (err) {
    console.error('Delivery logout error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
});


module.exports = router;

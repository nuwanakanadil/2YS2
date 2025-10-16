// route/auth.js
const mongoose = require('mongoose');


const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Manager = require('../models/Manager');
const Canteen = require('../models/Canteen');
const DeliveryPerson = require('../models/DeliveryPerson');
const authMiddleware = require('../middleware/authMiddleware');


const router = express.Router();

/* ==================== constants ==================== */
const SELF_SIGNUP_ROLES = ['CUSTOMER', 'DELIVERY']; // only these can register themselves
const STAFF_ROLES = ['MANAGER', 'INVENTORY_CLERK', 'PROMO_OFFICER']; // created by admin only

/* ==================== helpers ==================== */
function signToken(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role || 'CUSTOMER',
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
}

// Auth reads cookie OR bearer header and sets req.userId / req.userRole
function auth(req, res, next) {
  let token = req.cookies?.token;
  const authz = req.headers.authorization;
  if (!token && authz?.startsWith('Bearer ')) token = authz.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.userRole || !allowed.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

/* ==================== validation ==================== */
function validateSelfSignup(body) {
  const {
    firstName, lastName, universityId, phone, email, password, confirmPassword, role,
  } = body;

  if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
    return 'All fields are required';
  }
  if (password !== confirmPassword) return 'Passwords do not match';

  const roleUpper = (role || '').toUpperCase();
  if (!SELF_SIGNUP_ROLES.includes(roleUpper)) {
    return 'Selected role is not allowed for self-registration';
  }

  if (!universityId) return 'universityId is required';
  if (!/^[0-9]{10}$/.test(phone)) return 'Phone number must be 10 digits';

  return null;
}

function validateAdminCreateUser(body) {
  const { firstName, lastName, email, role, phone, universityId } = body;

  if (!firstName || !lastName || !email || !role) {
    return 'Missing required fields';
  }
  const roleUpper = role.toUpperCase();

  // Allowed roles you already use
  const ALLOWED = ['MANAGER', 'INVENTORY_CLERK', 'PROMO_OFFICER', 'DELIVERY', 'CUSTOMER'];
  if (!ALLOWED.includes(roleUpper)) return 'Invalid role';

  // For CUSTOMER and DELIVERY, your schema requires these:
  if (['CUSTOMER', 'DELIVERY'].includes(roleUpper)) {
    if (!universityId) return 'universityId is required for this role';
    if (!phone) return 'phone is required for this role';
    if (!/^[0-9]{10}$/.test(phone)) return 'Phone number must be 10 digits';
  }

  // For other staff roles, phone is typically useful but optional at schema level
  // (Your schema requires phone for all except ADMIN; ADMIN creation is blocked below)
  return null;
}

function generateTempPassword() {
  // 12 chars: upper, lower, numbers, symbols
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}


/* ==================== SELF SIGNUP (customer, delivery) ==================== */
// POST /api/auth/user/signup
router.post('/user/signup', async (req, res) => {
  try {
    const {
      firstName, lastName, universityId, phone, email, password, role,
      confirmPassword
    } = req.body;

    // basic validations (keep your existing validateSelfSignup if you want)
    if (!firstName || !lastName || !universityId || !phone || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const emailLower = email.toLowerCase().trim();
    const roleUpper = (role || 'CUSTOMER').toUpperCase(); // default -> CUSTOMER

    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    // DO NOT HASH HERE — pre('save') in User model will hash once
    const user = await User.create({
      firstName,
      lastName,
      universityId,
      phone,
      email: emailLower,
      password,              // plain; model hook will hash
      role: roleUpper,
      status: 'ACTIVE',
    });

    return res.status(201).json({
      message: 'User registered successfully',
      userId: user._id,
      role: user.role,
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});



/* ==================== LOGIN (all actors) ==================== */
// POST /api/auth/user/login
router.post('/user/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    if (!email || !password) return res.status(400).json({ message: 'All fields are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid password or Email' });

    if (user.status === 'DISABLED') {
      return res.status(403).json({ message: 'Account disabled. Contact support.' });
    }

    const token = signToken(user);

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax', // capital L is fine; node parses case-insensitive
        path: '/',       // set at root so all routes can see it
        maxAge: 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: 'Login successful',
        userId: user._id,
        email: user.email,
        role: user.role,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
      });

    // NOTE: Do NOT redirect here. Let the FRONTEND decide based on { role }.
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


/* ==================== LOGOUT ==================== */
// POST /api/auth/user/logout
router.post('/user/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/', // MUST match the set path to actually clear it
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/', // MUST match the set path to actually clear it
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});



/* ==================== PROFILE (self) ==================== */
// GET /api/auth/user/profile
router.get('/user/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('profile error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/user/updateUser
router.put('/user/updateUser', auth, async (req, res) => {
  try {
    const allowed = [
      'firstName', 'lastName', 'phone', 'country', 'language', 'timezone', 'nickName', 'universityId',
    ];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    if ('universityId' in updates && !updates.universityId) updates.universityId = undefined;

    const updated = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    return res.json(updated);
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ==================== ADMIN: create staff/others ==================== */
// POST /api/auth/admin/create-user
router.post('/admin/create-user', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const errMsg = validateAdminCreateUser(req.body);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const { firstName, lastName, email, phone, universityId, role } = req.body;
    const roleUpper = role.toUpperCase();

    // Optional: prevent creating another ADMIN from API
    if (roleUpper === 'ADMIN') {
      return res.status(403).json({ message: 'Creating ADMIN via API is disabled' });
    }

    // Email uniqueness
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already exists' });

    // Auto-generate a secure temp password
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || undefined,
      universityId: universityId || undefined,
      password: hash,
      role: roleUpper,
      status: 'ACTIVE',
    });

    // Send email with credentials (best-effort; do not block success entirely)
    try {
      const { sendNewUserEmail } = require('../utils/brevoMailer');
      await sendNewUserEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        tempPassword,
      });
    } catch (mailErr) {
      console.error('[Brevo] new user email failed:', mailErr?.message);
      return res.status(201).json({
        message: 'User created, but failed to send email',
        userId: user._id,
        role: user.role,
        emailSent: false,
      });
    }

    return res.status(201).json({
      message: 'User created and email sent',
      userId: user._id,
      role: user.role,
      emailSent: true,
    });
  } catch (err) {
    console.error('admin create-user error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/admin/users/:id
router.put('/admin/users/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const allowed = [
      'firstName', 'lastName', 'email', 'phone', 'universityId',
      'country', 'language', 'timezone', 'status', 'profilePic', 'role'
    ];

    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Optional: prevent elevating to ADMIN
    if (updates.role && updates.role.toUpperCase() === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot set role ADMIN via API' });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-password');
    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json(updated);
  } catch (err) {
    console.error('PUT /admin/users/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/auth/admin/users/:id
router.delete('/admin/users/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});






// GET /api/auth/whoami  -> returns the user identity from the JWT
router.get('/whoami', authMiddleware, (req, res) => {
  // req.user was set by authMiddleware
  const { userId, email, role, managerId } = req.user || {};
  res.json({ userId, email, role, managerId: managerId || null });
});

// GET /api/auth/customers?search=&page=&limit=
router.get('/customers', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = (req.query.search || '').trim();

    const filter = { role: 'CUSTOMER' };
    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [
        { profilePic: rx },
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { phone: rx },
        { universityId: rx },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('fetch customers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/admin/users?role=&search=&page=&limit=
router.get('/admin/users', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = (req.query.search || '').trim();
    const role   = (req.query.role || '').toUpperCase(); // e.g. CUSTOMER, DELIVERY, INVENTORY_CLERK, MANAGER

    const filter = {};
    if (role) filter.role = role;

    if (search) {
      const rx = new RegExp(search, 'i');
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { phone: rx },
        { universityId: rx },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// manager Login


// routes/managerLogin.js

// auth.js

router.post('/managerlogin', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // ❗ DO NOT shadow the imported Manager model
    const manager = await Manager.findOne({ email });

    if (!manager)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password or Email' });

     const payload = { 
      managerId: manager._id,
       email: manager.email,
        role: 'manager'
       };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000
      })
      .status(200)
      .json({ message: 'Login successful', managerId: manager._id, email: manager.email, role: 'manager' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// manager signup route (create in Manager + User)
router.post('/managersignup', async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    password,
    confirmPassword,
    profilePic, // optional
  } = req.body;

  // ---- basic validation ----
  if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ message: 'Phone number must be 10 digits' });
  }

  const emailLower = String(email).toLowerCase().trim();

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // ---- duplicate checks across BOTH collections ----
    const [userExists, managerExists] = await Promise.all([
      User.findOne({ email: emailLower }).session(session),
      Manager.findOne({ email: emailLower }).session(session),
    ]);
    if (userExists || managerExists) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Email already exists' });
    }

    // ---- hash for Manager (User will hash in its pre-save) ----
    const hashedPassword = await bcrypt.hash(password, 10);

    // ---- create Manager doc ----
    const managerDoc = await Manager.create([{
      firstName,
      lastName,
      phone,
      email: emailLower,
      password: hashedPassword,
      profilePic: profilePic || '',
    }], { session });
    const manager = managerDoc[0];

    // ---- create User doc with role: MANAGER ----
    // universityId is NOT required for MANAGER per your schema
    const userDoc = await User.create([{
      firstName,
      lastName,
      email: emailLower,
      phone,
      password,          // plain; User pre('save') will hash
      role: 'MANAGER',
      status: 'ACTIVE',
      profilePic: profilePic || '',
      language: 'English',
      timezone: 'Asia/Colombo',
    }], { session });
    const user = userDoc[0];

    await session.commitTransaction();

    return res.status(201).json({
      message: 'Manager registered successfully',
      managerId: manager._id,
      userId: user._id,
      email: emailLower,
      role: 'MANAGER',
    });

  } catch (err) {
    try { await session.abortTransaction(); } catch {}
    console.error('managersignup error:', err);

    // handle unique index errors gracefully
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Duplicate key: email already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
  }
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

//delete account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // find the authenticated user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found or already deleted' });
    }

    // verify password matches
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // delete the user
    await User.deleteOne({ _id: user._id });

    // clear auth cookie (invalidate session)
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;

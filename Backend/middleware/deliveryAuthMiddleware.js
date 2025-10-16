const jwt = require('jsonwebtoken');
const DeliveryPerson = require('../models/DeliveryPerson');

// Middleware to verify delivery person authentication
const verifyDeliveryAuth = async (req, res, next) => {
  try {
    // Check for token in cookies or Authorization header
    let token = req.cookies.deliveryToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No delivery token provided.' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the user type is delivery
    if (decoded.userType !== 'delivery') {
      return res.status(403).json({ 
        message: 'Access denied. Invalid user type.' 
      });
    }

    // Find the delivery person
    const deliveryPerson = await DeliveryPerson.findById(decoded.userId).select('-password');
    
    if (!deliveryPerson) {
      return res.status(404).json({ 
        message: 'Delivery person not found.' 
      });
    }

    // Check if delivery person is active
    if (!deliveryPerson.isActive) {
      return res.status(403).json({ 
        message: 'Account is deactivated. Please contact support.' 
      });
    }

    // Attach delivery person info to request
    req.deliveryPerson = deliveryPerson;
    req.userId = deliveryPerson._id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please login again.' 
      });
    }

    console.error('Delivery auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error during authentication.' 
    });
  }
};

// Middleware to verify delivery person is verified
const verifyDeliveryVerified = (req, res, next) => {
  if (!req.deliveryPerson.isVerified) {
    return res.status(403).json({ 
      message: 'Account not verified. Please complete verification process.' 
    });
  }
  next();
};

// Middleware to check delivery person status
const checkDeliveryStatus = (allowedStatuses = ['available', 'busy', 'offline']) => {
  return (req, res, next) => {
    if (!allowedStatuses.includes(req.deliveryPerson.currentStatus)) {
      return res.status(403).json({ 
        message: `Action not allowed. Current status: ${req.deliveryPerson.currentStatus}` 
      });
    }
    next();
  };
};

// Middleware to verify delivery admin role
const verifyDeliveryAdmin = (req, res, next) => {
  if (!req.deliveryPerson || req.deliveryPerson.role !== 'delivery_admin') {
    return res.status(403).json({ 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

module.exports = {
  verifyDeliveryAuth,
  verifyDeliveryVerified,
  checkDeliveryStatus,
  verifyDeliveryAdmin
};
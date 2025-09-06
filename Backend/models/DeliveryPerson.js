const mongoose = require('mongoose');
const validator = require('validator');

const deliveryPersonSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  universityId: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^[0-9]{10,15}$/.test(value),
      message: 'Phone number must be 10-15 digits',
    },
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  profilePic: {
    type: String,
    default: '',
  },
  // Delivery-specific fields
  vehicleType: {
    type: String,
    enum: ['bicycle', 'motorcycle', 'car', 'scooter'],
    required: true,
    default: 'bicycle',
  },
  vehicleNumber: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  deliveryArea: {
    type: String,
    default: '',
    trim: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalDeliveries: {
    type: Number,
    default: 0,
  },
  currentStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline',
  },
  // Admin role field
  role: {
    type: String,
    enum: ['delivery_person', 'delivery_admin'],
    default: 'delivery_person',
  },
  // Additional fields for comprehensive delivery person profile
  emergencyContact: {
    name: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    relationship: {
      type: String,
      default: '',
    },
  },
  documents: {
    idCard: {
      type: String,
      default: '',
    },
    drivingLicense: {
      type: String,
      default: '',
    },
    vehicleRegistration: {
      type: String,
      default: '',
    },
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for full name
deliveryPersonSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Add indexes for performance
deliveryPersonSchema.index({ email: 1, universityId: 1 });
deliveryPersonSchema.index({ deliveryArea: 1, isActive: 1 });
deliveryPersonSchema.index({ currentStatus: 1, isActive: 1 });

module.exports = mongoose.model('DeliveryPerson', deliveryPersonSchema);
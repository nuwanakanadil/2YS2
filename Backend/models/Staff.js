// models/Staff.js
const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    canteenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canteen',
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email:    { type: String, trim: true, lowercase: true, default: '' },
    phone:    { type: String, trim: true, default: '' },

    role: {
      type: String,
      enum: ['CASHIER', 'COOK', 'SERVER', 'ASSISTANT_MANAGER', 'OTHER'],
      default: 'OTHER',
      index: true,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },

    // Optional: if you later want to allow staff logins via PIN or similar
    pinCode: { type: String, select: false },
  },
  { timestamps: true }
);

// Prevent duplicates within the SAME canteen
staffSchema.index({ canteenId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
staffSchema.index({ canteenId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

module.exports = mongoose.model('Staff', staffSchema);

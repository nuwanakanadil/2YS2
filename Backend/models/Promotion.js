// models/Promotion.js
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  discountType: { type: String, enum: ['percentage','fixed','bogo','free'], required: true },
  discountValue:{ type: Number, default: 0 }, // ignored for bogo/free

  target: { type: String, enum: ['all','new','loyalty','students','seniors'], default: 'all' },
  minPurchase: { type: Number, default: 0 },
  maxRedemptions: { type: Number, default: 0 }, // 0 = unlimited
  termsConditions: { type: String, default: '' },

  imageUrl: { type: String, default: '' },

  // NEW: extend lifecycle to include approval states
  status: {
    type: String,
    enum: ['pending_approval','scheduled','active','paused','ended','rejected'],
    default: 'pending_approval',
    index: true
  },

  promo_code: { type: String, required: true, unique: true, index: true },

  // counters
  views: { type: Number, default: 0 },
  redemptions: { type: Number, default: 0 },

  // traceability / scoping
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // NEW: approval metadata
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  approvalNote: { type: String, default: '' },
}, { timestamps: true });

promotionSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Promotion', promotionSchema);

const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    enum: [
      'Baked Goods & Pastries',
      'Breakfast & Brunch Items',
      'Sandwiches & Savory Meals',
      'Healthy & Dietary-Specific Options'
    ],
    default: 'Baked Goods & Pastries'
  },
  image: { type: String }, // store image filename or URL
  // New fields for stock monitoring
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  expirationDate: { type: Date },
  unit: { type: String, default: 'pieces' }, // pieces, kg, liters, etc.
  supplier: { type: String },
  batchNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

InventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual properties for stock status
InventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.lowStockThreshold;
});

InventorySchema.virtual('isExpired').get(function() {
  return this.expirationDate && new Date() > this.expirationDate;
});

InventorySchema.virtual('isExpiringSoon').get(function() {
  if (!this.expirationDate) return false;
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return this.expirationDate <= threeDaysFromNow && !this.isExpired;
});

InventorySchema.virtual('stockStatus').get(function() {
  if (this.isExpired) return 'expired';
  if (this.isExpiringSoon) return 'expiring-soon';
  if (this.isLowStock) return 'low-stock';
  if (this.quantity === 0) return 'out-of-stock';
  return 'in-stock';
});

InventorySchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expirationDate) return null;
  const today = new Date();
  const timeDiff = this.expirationDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Ensure virtual fields are included in JSON output
InventorySchema.set('toJSON', { virtuals: true });
InventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', InventorySchema);

// export allowed categories for clients
module.exports.CATEGORIES = [
  'Baked Goods & Pastries',
  'Breakfast & Brunch Items',
  'Sandwiches & Savory Meals',
  'Healthy & Dietary-Specific Options'
];

// export stock status options
module.exports.STOCK_STATUSES = [
  'in-stock',
  'low-stock',
  'out-of-stock',
  'expiring-soon',
  'expired'
];

// export unit options
module.exports.UNITS = [
  'pieces',
  'kg',
  'grams',
  'liters',
  'ml',
  'boxes',
  'packages'
];

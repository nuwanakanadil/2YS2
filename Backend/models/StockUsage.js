const mongoose = require('mongoose');

const StockUsageSchema = new mongoose.Schema({
  inventoryItem: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory', 
    required: true 
  },
  itemName: { type: String, required: true }, // denormalized for reporting
  category: { type: String }, // denormalized for reporting
  changeType: {
    type: String,
    enum: ['STOCK_IN', 'STOCK_OUT', 'EXPIRED', 'DAMAGED', 'SOLD', 'ADJUSTMENT'],
    required: true
  },
  quantityChanged: { type: Number, required: true }, // positive for IN, negative for OUT
  previousQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 }, // quantityChanged * unitPrice
  reason: { type: String }, // optional reason for the change
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // if related to order
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who made the change
  timestamp: { type: Date, default: Date.now },
  notes: { type: String }
});

// Indexes for efficient reporting queries
StockUsageSchema.index({ timestamp: -1 });
StockUsageSchema.index({ inventoryItem: 1, timestamp: -1 });
StockUsageSchema.index({ changeType: 1, timestamp: -1 });
StockUsageSchema.index({ category: 1, timestamp: -1 });

// Virtual for value impact (positive = gain, negative = loss)
StockUsageSchema.virtual('valueImpact').get(function() {
  return this.totalValue;
});

// Static method to log stock changes
StockUsageSchema.statics.logStockChange = async function(data) {
  const usage = new this({
    inventoryItem: data.inventoryItem,
    itemName: data.itemName,
    category: data.category,
    changeType: data.changeType,
    quantityChanged: data.quantityChanged,
    previousQuantity: data.previousQuantity,
    newQuantity: data.newQuantity,
    unitPrice: data.unitPrice || 0,
    totalValue: (data.quantityChanged || 0) * (data.unitPrice || 0),
    reason: data.reason,
    orderId: data.orderId,
    userId: data.userId,
    notes: data.notes
  });
  
  return await usage.save();
};

StockUsageSchema.set('toJSON', { virtuals: true });
StockUsageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StockUsage', StockUsageSchema);

// Export change types for reference
module.exports.CHANGE_TYPES = [
  'STOCK_IN',
  'STOCK_OUT', 
  'EXPIRED',
  'DAMAGED',
  'SOLD',
  'ADJUSTMENT'
];

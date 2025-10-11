const mongoose = require('mongoose');
const reportSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true, index: true },
  type: { type: String, enum: ['TRENDING', 'INCOME', 'EXPENSES'], required: true, index: true },
  params: { type: Object, default: {} }, // date range, limits, etc.
  filePath: { type: String, required: true }, // e.g., reports/abc.pdf
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);

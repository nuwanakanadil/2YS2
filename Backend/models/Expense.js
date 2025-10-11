const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true, index: true },
  category: { type: String, trim: true, default: 'GENERAL' }, // e.g., INGREDIENTS, SALARIES, UTILITIES
  note: { type: String, trim: true, default: '' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
}, { timestamps: true });

expenseSchema.index({ canteenId: 1, date: 1 });

module.exports = mongoose.model('Expense', expenseSchema);

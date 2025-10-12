// models/SalesOfficerReport.js
const mongoose = require('mongoose');

const SalesOfficerReportSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },

  // time range the report covers
  from: { type: Date, required: true },
  to:   { type: Date, required: true },

  // file info
  type:     { type: String, enum: ['pdf','excel','csv'], required: true }, // ⬅️ lowercase
  filePath: { type: String, required: true }, // where the file is served from (e.g. /reports/xxx.pdf)
  status:   { type: String, enum: ['Processing','Completed','Failed'], default: 'Processing' },

  // who created it
  createdBy:   { type: String, required: true }, // req.userId (string okay, ObjectId also fine)
  createdByRole: { type: String, enum: ['ADMIN','MANAGER','PROMO_OFFICER'], required: true },

  // scope
  canteenId: { type: String, default: null }, // ⬅️ optional for PROMO_OFFICER / ADMIN

  // quick preview
  preview: {
    totalSales:  { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    topProducts: [{ name: String, qty: Number, revenue: Number }],
  },
}, { timestamps: true });

module.exports = mongoose.model('SalesOfficerReport', SalesOfficerReportSchema);

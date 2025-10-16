// models/ManagerRegistration.js
const mongoose = require('mongoose');

const operatingHoursSchema = new mongoose.Schema({
  day: String,
  openTime: String,
  closeTime: String,
  closed: Boolean,
}, { _id: false });

const pendingManagerRegistrationSchema = new mongoose.Schema({
  // who submitted
  email: { type: String, required: true, lowercase: true, index: true },
  // store password as hash, never plaintext
  passwordHash: { type: String, required: true },

  // manager details
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  phone:     { type: String, required: false },
  role:      { type: String, default: 'MANAGER' },

  // canteen details
  canteen: {
    name:         { type: String, required: true, trim: true },
    description:  { type: String, default: '' },
    address: {
      street:       String,
      city:         String,
      stateProvince:String,
      postalCode:   String,
      country:      String,
    },
    buildingCampus: String,
    floorWing:      String,
    capacity:       Number,
    operatingHours: [operatingHoursSchema],
    contactEmail:   String,
    contactPhone:   String,
    website:        String,
    cuisineTypes:   [String],
    paymentMethods: [String],
    // Collect these in your form (simple numeric inputs or a map)
    lng: { type: Number, required: true },
    lat: { type: Number, required: true },
    // optional assets
    logoUrl: String,
  },

  // workflow
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  decision: {
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    reason: String, // rejection reason
  },
}, { timestamps: true });

module.exports = mongoose.model('ManagerRegistration', pendingManagerRegistrationSchema);

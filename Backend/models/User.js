const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const ROLES = ['CUSTOMER','ADMIN','MANAGER','INVENTORY_CLERK','DELIVERY','PROMO_OFFICER'];

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },

  role: { type: String, enum: ROLES, default: 'CUSTOMER', index: true },

  universityId: {
    type: String,
    required: function () { return ['CUSTOMER','DELIVERY'].includes(this.role); },
  },

  phone: {
    type: String,
    required: function () { return !['ADMIN', 'PROMO_OFFICER'].includes(this.role); },
    validate: { validator: v => !v || /^[0-9]{10}$/.test(v), message: 'Phone number must be 10 digits' },
  },

  email: {
    type: String, required: true, unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email'],
    set: v => v?.toLowerCase().trim(),
  },

  password: { type: String, required: true, minlength: 6 },

  profilePic: { type: String, default: '' },
  country:    { type: String },
  language:   { type: String, default: 'English' },
  timezone:   { type: String, default: 'Asia/Colombo' },

  status: { type: String, enum: ['ACTIVE','DISABLED'], default: 'ACTIVE' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isAdmin = function() { return this.role === 'ADMIN'; };
userSchema.methods.isManager = function() { return this.role === 'MANAGER'; };

userSchema.methods.safeJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index(
  { universityId: 1 },
  { unique: true, partialFilterExpression: { universityId: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;

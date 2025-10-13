// In your auth.js (or a dedicated router where authMiddleware is available)
const express = require('express');
// ... existing requires:
const Manager = require('../models/Manager');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const router = express.Router();

/**
 * PUT /api/auth/manager/update-profile
 * Body: { firstName, lastName, email, phone }
 * Requires a manager JWT (authMiddleware populates req.user.managerId)
 */
router.put('/manager/update-profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body || {};

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: 'Required fields missing' });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
    }

    const managerId = req.user?.managerId || req.body.managerId; // fallback if needed
    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized: manager ID missing' });
    }

    // Keep the old manager (to find paired User by previous email if needed)
    const oldManager = await Manager.findById(managerId);
    if (!oldManager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    // Enforce unique email across managers
    const emailLower = String(email).toLowerCase().trim();
    const duplicate = await Manager.findOne({ _id: { $ne: managerId }, email: emailLower });
    if (duplicate) {
      return res.status(400).json({ message: 'Email already in use by another manager' });
    }

    // Update Manager doc
    const updatedManager = await Manager.findByIdAndUpdate(
      managerId,
      { firstName, lastName, email: emailLower, phone },
      { new: true }
    );

    // OPTIONAL: sync paired User (created at managersignup with role MANAGER)
    try {
      const userFilter = oldManager?.email
        ? { email: oldManager.email.toLowerCase(), role: 'MANAGER' }
        : { _id: req.user?.userId, role: 'MANAGER' };

      const maybeUser = await User.findOne(userFilter);
      if (maybeUser) {
        maybeUser.firstName = firstName;
        maybeUser.lastName = lastName;
        maybeUser.email = emailLower;
        maybeUser.phone = phone;
        await maybeUser.save();
      }
    } catch (syncErr) {
      console.warn('Manager→User sync failed (non-fatal):', syncErr?.message);
      // do not fail the main request — manager update succeeded
    }

    return res.status(200).json({ message: 'Profile updated', updatedManager });
  } catch (err) {
    console.error('Manager update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;

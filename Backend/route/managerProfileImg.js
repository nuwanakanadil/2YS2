// route/managerProfileImg.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const Manager = require('../models/Manager');
// (Optional) If you want to keep User (role MANAGER) in sync:
// const User = require('../models/User');

const router = express.Router();

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'manager-images');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext.toLowerCase();
    const managerId = req.user?.managerId || 'unknown';
    cb(null, `${managerId}-${Date.now()}${safeExt}`);
  },
});

// Only images, max ~5MB
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/auth/manager/upload-profile-pic
 * form-data: profilePic (file)
 */
router.post(
  '/manager/upload-profile-pic',
  authMiddleware,
  upload.single('profilePic'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const managerId = req.user?.managerId;
      if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

      // Save relative path (so FE can build URL: http://localhost:5000/<relativePath>)
      const relativePath = path.posix.join('manager-images', req.file.filename);

      const updated = await Manager.findByIdAndUpdate(
        managerId,
        { profilePic: relativePath },
        { new: true }
      );

      if (!updated) {
        // cleanup file if manager not found
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(404).json({ message: 'Manager not found' });
      }

      // (Optional) Keep paired User (role MANAGER) in sync by email:
      // try {
      //   const user = await User.findOne({ email: updated.email.toLowerCase(), role: 'MANAGER' });
      //   if (user) { user.profilePic = relativePath; await user.save(); }
      // } catch (e) { console.warn('Manager→User pic sync failed (non-fatal):', e.message); }

      return res.status(200).json({
        message: 'Profile picture updated',
        profilePic: relativePath,
        manager: updated,
      });
    } catch (err) {
      console.error('Upload manager pic error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

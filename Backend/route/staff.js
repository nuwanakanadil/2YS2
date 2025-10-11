// route/staff.js
const express = require('express');
const Staff = require('../models/Staff');
const Canteen = require('../models/Canteen');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// helper: find manager's canteen _id
async function getManagerCanteenId(managerId) {
  const c = await Canteen.findOne({ managerId }).select('_id');
  return c?._id || null;
}

// GET /api/staff  -> list staff for this manager's canteen
router.get('/', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const staff = await Staff.find({ canteenId }).sort({ createdAt: -1 });
    res.json({ staff });
  } catch (e) {
    console.error('GET /staff error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff  -> create staff
router.post('/', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { fullName, email = '', phone = '', role = 'OTHER' } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: 'fullName is required' });

    const staff = await Staff.create({ canteenId, fullName: fullName.trim(), email, phone, role });
    res.status(201).json({ message: 'Staff created', staff });
  } catch (e) {
    console.error('POST /staff error:', e);
    // handle duplicate nicely
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Email/phone already exists for this canteen' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/:id  -> update staff
router.put('/:id', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { fullName, email, phone, role } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, canteenId });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    if (fullName !== undefined) staff.fullName = fullName.trim();
    if (email !== undefined)    staff.email = email;
    if (phone !== undefined)    staff.phone = phone;
    if (role !== undefined)     staff.role = role;

    await staff.save();
    res.json({ message: 'Staff updated', staff });
  } catch (e) {
    console.error('PUT /staff/:id error:', e);
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Email/phone already exists for this canteen' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/staff/:id/status  -> toggle/assign status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, canteenId },
      { $set: { status } },
      { new: true }
    );
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    res.json({ message: 'Status updated', staff });
  } catch (e) {
    console.error('PATCH /staff/:id/status error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/staff/:id  -> remove staff (hard delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const result = await Staff.deleteOne({ _id: req.params.id, canteenId });
    if (!result.deletedCount) return res.status(404).json({ message: 'Staff not found' });

    res.json({ message: 'Staff deleted' });
  } catch (e) {
    console.error('DELETE /staff/:id error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

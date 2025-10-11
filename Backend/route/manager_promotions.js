// route/manager_promotions.js
const express = require('express');
const dayjs = require('dayjs');
const mongoose = require('mongoose');

const auth = require('../middleware/authMiddleware');
const Promotion = require('../models/Promotion');
const Canteen = require('../models/Canteen');

const router = express.Router();

function currentStatus(start, end) {
  const now = dayjs();
  if (now.isBefore(dayjs(start))) return 'scheduled';
  if (now.isAfter(dayjs(end))) return 'ended';
  return 'active';
}

// GET /api/manager/promotions/pending
// Manager sees all pending_approval promos for their canteen
router.get('/pending', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const myCanteen = await Canteen.findOne({ managerId: req.user.managerId })
      .select('_id name')
      .lean();
    if (!myCanteen) return res.status(404).json({ message: 'Canteen not found for this manager' });

    const items = await Promotion.find({
      canteenId: myCanteen._id,
      status: 'pending_approval',
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ canteen: myCanteen, items });
  } catch (e) {
    console.error('GET /manager/promotions/pending', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/manager/promotions/:id/approve
// body: { note? }
router.post('/:id/approve', auth, async (req, res) => {
  try {
   const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid promotion id' });
    }

    const promo = await Promotion.findById(id);
    if (!promo) return res.status(404).json({ message: 'Not found' });
    if (promo.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Only pending promotions can be approved' });
    }

    // Ensure this manager owns the canteen of the promo
    const owns = await Canteen.findOne({
      _id: promo.canteenId,
      managerId: req.user.managerId,
    })
      .select('_id')
      .lean();
    if (!owns) return res.status(403).json({ message: 'Not your canteen' });

    const finalStatus = currentStatus(promo.startDate, promo.endDate); // scheduled/active/ended
    promo.status = finalStatus;
    promo.approvedBy = req.user._id;
    promo.approvedAt = new Date();
    promo.approvalNote = req.body?.note || '';
    await promo.save();

    res.json({ message: 'Promotion approved', promotion: promo });
  } catch (e) {
    console.error('POST /manager/promotions/:id/approve', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/manager/promotions/:id/reject
// body: { note? }
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid promotion id' });
    }

    const promo = await Promotion.findById(id);
    if (!promo) return res.status(404).json({ message: 'Not found' });
    if (promo.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Only pending promotions can be rejected' });
    }

    const owns = await Canteen.findOne({
      _id: promo.canteenId,
      managerId: req.user.managerId,
    })
      .select('_id')
      .lean();
    if (!owns) return res.status(403).json({ message: 'Not your canteen' });

    promo.status = 'rejected';
    promo.approvedBy = req.user._id;
    promo.approvedAt = new Date();
    promo.approvalNote = req.body?.note || '';
    await promo.save();

    res.json({ message: 'Promotion rejected', promotion: promo });
  } catch (e) {
    console.error('POST /manager/promotions/:id/reject', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

// route/adminStats.js
const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const User = require('../models/User');
const Manager = require('../models/Manager');
const Canteen = require('../models/Canteen');
const Delivery = require('../models/DeliveryPerson');

router.get('/stats/counts', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const [customers, deliveries, managers, shops] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      Delivery.countDocuments({}),
      Manager.countDocuments({}),           // managers you create at approval
      Canteen.countDocuments({}),           // treat canteens as “shops”
    ]);

    res.json({ customers, deliveries, managers, shops });
  } catch (e) {
    console.error('GET /api/admin/stats/counts error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

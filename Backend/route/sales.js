// route/salesDashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

const Promotion = require('../models/Promotion');
const Order = require('../models/Order');       // assume you have it from your cart/orderPlacement flow
const User = require('../models/User');

// Helpers
function atStartOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

// GET /api/sales/dashboard/summary
router.get('/dashboard/summary', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req, res) => {
  try {
    const todayStart = atStartOfDay();
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Daily sales (today)
    const [salesAgg] = await Order.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lt: tomorrowStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]);
    const dailySales = salesAgg?.total || 0;

    // Active promotions
    const activePromotions = await Promotion.countDocuments({ status: 'active' });

    // New customers (last 24h)
    const last24h = new Date(Date.now() - 24*60*60*1000);
    const newCustomers = await User.countDocuments({ role: 'CUSTOMER', createdAt: { $gte: last24h } });

    // Pending approvals (here we consider promotions in 'scheduled' as needing approval; tweak if you have a 'pending' status)
    const pendingApprovals = await Promotion.countDocuments({ status: { $in: ['scheduled'] } });

    res.json({ dailySales, activePromotions, newCustomers, pendingApprovals });
  } catch (e) {
    console.error('summary error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales/dashboard/sales-trend?days=7
router.get('/dashboard/sales-trend', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req, res) => {
  try {
    const days = Math.max(parseInt(req.query.days || '7', 10), 1);
    const since = atStartOfDay(new Date(Date.now() - (days - 1) * 86400000));

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" },
          customers: { $addToSet: "$userId" }, // unique per day
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sales: 1,
          customers: { $size: "$customers" }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // ensure all days exist
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since); d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0,10);
      const found = rows.find(r => r.date === key);
      out.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon/Tue…
        sales: found?.sales || 0,
        customers: found?.customers || 0
      });
    }

    res.json(out);
  } catch (e) {
    console.error('trend error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales/dashboard/recent-promotions
router.get('/dashboard/recent-promotions', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req, res) => {
  try {
    const items = await Promotion.find({}, 'name status startDate endDate redemptions')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const data = items.map(p => ({
      id: String(p._id),
      title: p.name,
      status: p.status,
      date: `${new Date(p.startDate).toLocaleDateString('en-US', { month:'short', day:'numeric' })} - ${new Date(p.endDate).toLocaleDateString('en-US', { month:'short', day:'numeric' })}`,
      redemptions: p.redemptions || 0,
    }));
    res.json(data);
  } catch (e) {
    console.error('recent promotions error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sales/dashboard/pending-approvals
router.get('/dashboard/pending-approvals', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req, res) => {
  try {
    // define what "pending approval" means for you; here we use 'scheduled'
    const items = await Promotion.find({ status: 'scheduled' })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const data = items.map(p => ({
      id: String(p._id),
      title: p.name,
      requester: 'Promo Officer',              // If you store creator name, pull it via populate createdBy
      type: 'Promotion',
      date: new Date(p.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }),
    }));
    res.json(data);
  } catch (e) {
    console.error('pending approvals error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

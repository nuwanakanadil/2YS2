// route/customersEngagement.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');

// If you have an Order model already (you do have /api/orders routes)
let Order;
try { Order = require('../models/Order'); } catch { /* fallback later */ }

/** Map last activity date -> bucket label */
function statusFromLastDate(dt) {
  if (!dt) return 'Dormant';
  const now = new Date();
  const days = (now - dt) / 86400000;
  if (days <= 7) return 'New';
  if (days <= 30) return 'Active';
  return 'Dormant';
}

/**
 * GET /api/customers-engagement/list?search=&status=all|active|new|dormant&page=1&limit=25
 * Returns { items:[{_id,name,email,status,lastEngagement}], total, page, limit }
 */
// GET /api/customers-engagement/list
router.get(
  '/list',
  auth,
  requireRole('ADMIN', 'PROMO_OFFICER'),
  async (req, res) => {
    try {
      const page  = Math.max(parseInt(req.query.page)  || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 25, 100);
      const search = (req.query.search || '').trim();
      const status = (req.query.status || 'all').toLowerCase();

      const userMatch = { role: 'CUSTOMER', status: 'ACTIVE' };
      if (search) {
        const rx = new RegExp(search, 'i');
        userMatch.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
      }

      const [users, total] = await Promise.all([
        User.find(userMatch)
          .select('firstName lastName email createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(userMatch),
      ]);

      // Map user _id (ObjectId) -> string to match Order.userId (string)
      const idStrs = users.map(u => String(u._id));

      // Build last activity map from Orders using string userId
      let lastMap = new Map();
      if (Order) {
        const agg = await Order.aggregate([
          { $match: { userId: { $in: idStrs } } },
          { $group: { _id: '$userId', last: { $max: '$createdAt' } } },
        ]);
        lastMap = new Map(agg.map(a => [String(a._id), a.last]));
      }

      const itemsRaw = users.map(u => {
        const key = String(u._id);
        const last = lastMap.get(key) || u.updatedAt || u.createdAt;
        return {
          _id: u._id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email,
          lastEngagement: last,
          status: statusFromLastDate(last),
        };
      });

      const items =
        status === 'all'
          ? itemsRaw
          : itemsRaw.filter(i => i.status.toLowerCase() === status);

      res.json({ items, total, page, limit });
    } catch (e) {
      console.error('customers-engagement/list error:', e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


/**
 * GET /api/customers-engagement/:id/engagement
 * Returns [{ promotion, clicks, purchases, lastActive }]
 * - If your Order schema has a "promoCode" or "promotionId", we group on it.
 * - Otherwise, we aggregate by "product" names as a rough engagement proxy.
 */
// GET /api/customers-engagement/:id/engagement
router.get(
  '/:id/engagement',
  auth,
  requireRole('ADMIN', 'PROMO_OFFICER'),
  async (req, res) => {
    try {
      if (!Order) return res.json([]);

      const userIdStr = String(req.params.id);

      // Do we even have orders for this user?
      const sample = await Order.findOne({ userId: userIdStr }).lean();
      if (!sample) return res.json([]);

      // If promoCode field is present in this schema/usecase, prefer grouping by it
      if (Object.prototype.hasOwnProperty.call(sample, 'promoCode')) {
        const rows = await Order.aggregate([
          { $match: { userId: userIdStr } },
          {
            $group: {
              _id: '$promoCode',               // can be null -> "General"
              purchases: { $sum: '$quantity' },// total qty per promo
              lastActive: { $max: '$createdAt' },
            }
          },
          { $sort: { lastActive: -1 } },
          { $limit: 50 },
        ]);

        return res.json(rows.map(r => ({
          promotion: r._id || 'General',
          clicks: 0,                          // not tracked in orders
          purchases: r.purchases || 0,
          lastActive: r.lastActive,
        })));
      }

      // Otherwise, group by itemName (your schema has itemName, quantity)
      const rows = await Order.aggregate([
        { $match: { userId: userIdStr } },
        {
          $group: {
            _id: '$itemName',
            purchases: { $sum: '$quantity' },
            lastActive: { $max: '$createdAt' },
          }
        },
        { $sort: { lastActive: -1 } },
        { $limit: 50 },
      ]);

      return res.json(rows.map(r => ({
        promotion: r._id || 'Product',
        clicks: 0,
        purchases: r.purchases || 0,
        lastActive: r.lastActive,
      })));
    } catch (e) {
      console.error('customers-engagement/:id/engagement error:', e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


module.exports = router;

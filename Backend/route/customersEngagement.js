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

      // Base query: page the customers first (fast), then enrich with last activity
      const [users, total] = await Promise.all([
        User.find(userMatch)
          .select('firstName lastName email createdAt')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(userMatch),
      ]);

      // Build a map of last activity using Orders if available, else fall back to user.updatedAt/createdAt
      let lastMap = new Map();
      if (Order) {
        const ids = users.map(u => u._id);
        const agg = await Order.aggregate([
          { $match: { user: { $in: ids } } }, // your Order schema should have "user" ObjectId
          { $group: { _id: '$user', last: { $max: '$createdAt' } } }
        ]);
        lastMap = new Map(agg.map(a => [String(a._id), a.last]));
      }

      const itemsRaw = users.map(u => {
        const last = lastMap.get(String(u._id)) || u.updatedAt || u.createdAt;
        return {
          _id: u._id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email,
          lastEngagement: last,
          status: statusFromLastDate(last),
        };
      });

      // Optional status filter after enrichment
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
router.get(
  '/:id/engagement',
  auth,
  requireRole('ADMIN', 'PROMO_OFFICER'),
  async (req, res) => {
    try {
      if (!Order) {
        // No Order model available — return empty data rather than 500
        return res.json([]);
      }

      // Try to group by "promoCode" if it exists; fallback to product titles
      const userId = req.params.id;

      // First, detect field availability by peeking one order
      const sample = await Order.findOne({ user: userId }).lean();
      if (!sample) return res.json([]);

      const groupByPromo = Object.prototype.hasOwnProperty.call(sample, 'promoCode') ||
                           Object.prototype.hasOwnProperty.call(sample, 'promotionId');

      if (groupByPromo) {
        // Group by promoCode or promotionId
        const key = Object.prototype.hasOwnProperty.call(sample, 'promoCode') ? '$promoCode' : '$promotionId';
        const rows = await Order.aggregate([
          { $match: { user: sample.user } },
          {
            $group: {
              _id: key,
              purchases: { $sum: 1 },
              lastActive: { $max: '$createdAt' },
            }
          },
          { $sort: { lastActive: -1 } },
          { $limit: 50 },
        ]);

        // clicks aren’t tracked in orders; set to purchases*some factor or 0
        return res.json(rows.map(r => ({
          promotion: r._id || 'General',
          clicks: 0,
          purchases: r.purchases || 0,
          lastActive: r.lastActive,
        })));
      }

      // Fallback: group by product name in order items
      const rows = await Order.aggregate([
        { $match: { user: sample.user } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName', // adjust if your item has different field
            purchases: { $sum: '$items.qty' },
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

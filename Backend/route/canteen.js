// route/canteen.js
const express = require('express');
const router = express.Router();
const Canteen = require('../models/Canteen');
const authMiddleware = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Manager = require('../models/Manager');
const requireRole = require('../middleware/requireRole');

// Create or Update canteen for the logged-in manager
// POST /api/canteen
router.post('/createCanteen', authMiddleware, async (req, res) => {
  try {
    // Your manager JWT should contain { managerId, ... }
    const { managerId} = req.user || {};

    // (Optional) enforce role
    // if (role !== 'manager') return res.status(403).json({ message: 'Forbidden' });

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized: managerId missing in token' });
    }

    const { name, lng, lat } = req.body;

    if (!name || typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ message: 'name, lng, lat are required' });
    }

    const update = {
      name,
      location: { type: 'Point', coordinates: [lng, lat] },
      managerId,
    };

    // Upsert canteen by managerId (create if not exists, else update)
    const canteen = await Canteen.findOneAndUpdate(
      { managerId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Canteen saved successfully', canteen });
  } catch (err) {
    console.error(err);
    // Duplicate managerId unique error
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Canteen already exists for this manager' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('-__v');
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    // Return the canteen if needed (useful for dashboard prefill)
    return res.status(200).json({ canteen });
  } catch (err) {
    console.error('GET /canteen/mine error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    // get canteen (name + id)
    const canteen = await Canteen.findOne({ managerId }).select('_id name').lean();
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    // products of this canteen
    const products = await Product.find({ canteenId: canteen._id }).select('_id').lean();
    const productIds = products.map(p => String(p._id));
    const productCount = products.length;

    // if no products, quick return
    if (productIds.length === 0) {
      return res.json({
        name: canteen.name,
        productCount: 0,
        totalReviews: 0,
        overallRating: 0,
      });
    }

    // total reviews & average rating across all those products
    // NOTE: your Review schema has productId as String, so we match strings
    const agg = await Review.aggregate([
      { $match: { productId: { $in: productIds } } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          sumRatings: { $sum: '$rating' },
        }
      }
    ]);

    const totalReviews = agg.length ? agg[0].totalReviews : 0;
    const overallRating = totalReviews > 0 ? Number((agg[0].sumRatings / totalReviews).toFixed(1)) : 0;

    return res.json({
      name: canteen.name,
      productCount,
      totalReviews,
      overallRating,
    });
  } catch (err) {
    console.error('GET /canteen/summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


router.get('/order-stats', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id').lean();
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    const [ongoing, completed] = await Promise.all([
      Order.countDocuments({ canteenId: canteen._id, status: { $in: ['placed', 'preparing'] } }),
      Order.countDocuments({ canteenId: canteen._id, status: 'completed' }),
    ]);

    return res.json({ ongoing, completed });
  } catch (err) {
    console.error('GET /canteen/order-stats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;

    const q = search.trim()
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            // allow search by manager name/email if you store them in Manager
          ],
        }
      : {};

    const skip = (Number(page) - 1) * Number(limit);

    // populate manager basic fields if you want to show them in the table
    const [items, total] = await Promise.all([
      Canteen.find(q)
        .populate('managerId', 'firstName lastName email') // tweak to your Manager schema
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Canteen.countDocuments(q),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (err) {
    console.error('GET /api/canteen error:', err);
    return res.status(500).json({
    message: err?.message || 'Server error',
    stack: err?.stack || 'no stack',
  });
  }
});

// GET /api/canteen/:id  (ADMIN only)
// Returns canteen details + manager info + quick stats (product count, orders)
// router.get('/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Pipeline with safe $lookup (works even if populate ref mismatched)
//     const pipeline = [
//       { $match: { _id: new (require('mongoose')).Types.ObjectId(id) } },
//       { $lookup: {
//           from: 'managers', // if managers actually live in `users`, change to 'users'
//           localField: 'managerId',
//           foreignField: '_id',
//           as: 'manager'
//       }},
//       { $unwind: { path: '$manager', preserveNullAndEmptyArrays: true } },
//       // Attach product count
//       { $lookup: {
//           from: 'products',
//           let: { canteenId: '$_id' },
//           pipeline: [
//             { $match: { $expr: { $eq: ['$canteenId', '$$canteenId'] } } },
//             { $count: 'count' }
//           ],
//           as: 'productsAgg'
//       }},
//       { $addFields: {
//           productCount: { $ifNull: [{ $arrayElemAt: ['$productsAgg.count', 0] }, 0] }
//       }},
//       // Attach order stats
//       { $lookup: {
//           from: 'orders',
//           let: { canteenId: '$_id' },
//           pipeline: [
//             { $match: { $expr: { $eq: ['$canteenId', '$$canteenId'] } } },
//             { $group: {
//                 _id: '$status',
//                 n: { $sum: 1 },
//                 // If you have order totals: totalSales: { $sum: '$total' }
//               }
//             }
//           ],
//           as: 'ordersAgg'
//       }},
//       { $addFields: {
//           ongoingOrders: {
//             $ifNull: [
//               {
//                 $sum: {
//                   $map: {
//                     input: '$ordersAgg',
//                     as: 'o',
//                     in: { $cond: [{ $in: ['$$o._id', ['placed','preparing']] }, '$$o.n', 0] }
//                   }
//                 }
//               },
//               0
//             ]
//           },
//           completedOrders: {
//             $ifNull: [
//               {
//                 $sum: {
//                   $map: {
//                     input: '$ordersAgg',
//                     as: 'o',
//                     in: { $cond: [{ $eq: ['$$o._id', 'completed'] }, '$$o.n', 0] }
//                   }
//                 }
//               },
//               0
//             ]
//           }
//       }},
//       { $project: {
//           __v: 0,
//           productsAgg: 0,
//           ordersAgg: 0,
//           // Only expose what you need from manager:
//           'manager.password': 0,
//           'manager.__v': 0,
//       }},
//       { $limit: 1 }
//     ];

//     const docs = await Canteen.aggregate(pipeline);
//     if (!docs.length) return res.status(404).json({ message: 'Canteen not found' });

//     // Normalize shape a bit for the frontend (keep manager object under `managerId` like list page used)
//     const canteen = docs[0];
//     canteen.managerId = canteen.manager || null;
//     delete canteen.manager;

//     return res.json(canteen);
//   } catch (err) {
//     console.error('GET /api/canteen/:id error:', err);
//     return res.status(500).json({
//       message: err?.message || 'Server error',
//       stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack
//     });
//   }
// });

module.exports = router;

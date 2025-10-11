const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const Promotion = require('../models/Promotion');
const Canteen = require('../models/Canteen');
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

/* utils */
function normalizeCode(c) {
  return String(c || '').trim().toUpperCase().replace(/\s+/g, '');
}
function currentStatus(start, end) {
  const now = dayjs();
  if (now.isBefore(dayjs(start))) return 'scheduled';
  if (now.isAfter(dayjs(end))) return 'ended';
  return 'active';
}
const isRole = (req, role) => String(req.user?.role || '').toUpperCase() === role;

/* --------- FIXED ROUTES FIRST ---------- */

/** GET /api/promotions/canteens
 * PROMO_OFFICER & ADMIN → all canteens
 */
router.get('/canteens', auth, async (req, res) => {
  try {
    if (isRole(req, 'PROMO_OFFICER') || isRole(req, 'ADMIN')) {
      const canteens = await Canteen.find({}).select('_id name').lean();
      return res.json({ canteens });
    }
    return res.status(403).json({ message: 'Forbidden' });
  } catch (e) {
    console.error('GET /promotions/canteens', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/promotions/products?canteenId=... 
 * PROMO_OFFICER & ADMIN → any canteen’s products
 */
router.get('/products', auth, async (req, res) => {
  try {
    const { canteenId } = req.query;
    if (!canteenId) return res.status(400).json({ message: 'canteenId is required' });

    if (!(isRole(req, 'PROMO_OFFICER') || isRole(req, 'ADMIN'))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const products = await Product.find({ canteenId }).select('_id name price image').lean();
    res.json({ products });
  } catch (e) {
    console.error('GET /promotions/products', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/promotions
 * body: { name, description, startDate, endDate, discountType, discountValue, target, minPurchase, maxRedemptions, termsConditions, promo_code, canteenId, productIds[] }
 * PROMO_OFFICER & ADMIN → can create for any canteen
 */
router.post('/', auth, async (req, res) => {
  try {
    if (!(isRole(req, 'PROMO_OFFICER') || isRole(req, 'ADMIN'))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const {
      name, description, startDate, endDate,
      discountType, discountValue, target, minPurchase, maxRedemptions,
      termsConditions, promo_code, canteenId, productIds
    } = req.body || {};

    if (!name || !startDate || !endDate || !discountType || !promo_code || !canteenId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const code = normalizeCode(promo_code);
    const exists = await Promotion.findOne({ promo_code: code });
    if (exists) return res.status(409).json({ message: 'Promo code already exists' });

    // ensure canteen exists
    const c = await Canteen.findById(canteenId).select('_id').lean();
    if (!c) return res.status(400).json({ message: 'Invalid canteenId' });

    const promo = await Promotion.create({
      name,
      description: description || '',
      startDate,
      endDate,
      discountType,
      discountValue: Number(discountValue || 0),
      target: target || 'all',
      minPurchase: Number(minPurchase || 0),
      maxRedemptions: Number(maxRedemptions || 0),
      termsConditions: termsConditions || '',
      promo_code: code,
      canteenId,
      productIds: Array.isArray(productIds) ? productIds : [],
      status: 'pending_approval',
      createdBy: req.user?._id || null,
      approvedBy: null,
      approvedAt: null,
      approvalNote: ''
    });

    res.status(201).json({ message: 'Promotion submitted for manager approval', promotion: promo });
  } catch (e) {
    console.error('POST /promotions', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/promotions/validate
 * body: { code, canteenId, items: [{ productId, qty, price }] }
 * public (no auth): used by checkout to apply discount
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, canteenId, items, customer = {} } = req.body || {};
    if (!code || !canteenId || !Array.isArray(items)) {
      return res.status(400).json({ message: 'code, canteenId and items[] are required' });
    }

    const now = new Date();
    const promo = await Promotion.findOne({
      promo_code: normalizeCode(code),
      canteenId
    }).lean();

    if (!promo) return res.json({ valid: false, reason: 'NOT_FOUND' });

    // ---- status window / paused ----
    if (promo.status === 'paused') return res.json({ valid: false, reason: 'PAUSED' });
    if (now < new Date(promo.startDate)) return res.json({ valid: false, reason: 'NOT_STARTED' });
    if (now > new Date(promo.endDate)) return res.json({ valid: false, reason: 'EXPIRED' });

    // ---- max redemptions (global) ----
    if (Number(promo.maxRedemptions || 0) > 0 && Number(promo.redemptions || 0) >= Number(promo.maxRedemptions)) {
      return res.json({ valid: false, reason: 'MAX_REDEMPTIONS_REACHED' });
    }

    // ---- target audience check ----
    const tgt = String(promo.target || 'all').toLowerCase();
    const okByTarget =
      tgt === 'all' ||
      (tgt === 'new'      && (customer.isNew === true || customer.orderCount === 0)) ||
      (tgt === 'loyalty'  && customer.isLoyalty === true) ||
      (tgt === 'students' && customer.isStudent === true) ||
      (tgt === 'seniors'  && Number(customer.age || 0) >= 60);

    if (!okByTarget) {
      return res.json({ valid: false, reason: 'NOT_ELIGIBLE_TARGET' });
    }

    // ---- cart math ----
    const subtotal = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
    if (subtotal < Number(promo.minPurchase || 0)) {
      return res.json({ valid: false, reason: 'MIN_PURCHASE' });
    }

    // filter items promo applies to
    const applicable = (promo.productIds && promo.productIds.length)
      ? items.filter(it => promo.productIds.some(id => String(id) === String(it.productId)))
      : items.slice();

    if (!applicable.length) {
      return res.json({ valid: false, reason: 'NO_MATCHING_PRODUCTS' });
    }

    let discount = 0;
    const lineOut = [];

    if (promo.discountType === 'percentage') {
      applicable.forEach(it => {
        const line = Number(it.price) * Number(it.qty);
        const d = round2(line * (Number(promo.discountValue || 0) / 100));
        discount += d;
        lineOut.push({ productId: it.productId, applied: true, discounted: d });
      });
    } else if (promo.discountType === 'fixed') {
      const appSubtotal = applicable.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
      const cap = Math.min(Number(promo.discountValue || 0), appSubtotal);
      let allocated = 0;
      applicable.forEach((it, idx) => {
        const line = Number(it.price) * Number(it.qty);
        const share = (idx < applicable.length - 1)
          ? round2((line / appSubtotal) * cap)
          : round2(cap - allocated);
        allocated += share;
        discount += share;
        lineOut.push({ productId: it.productId, applied: true, discounted: share });
      });
    } else if (promo.discountType === 'bogo') {
      applicable.forEach(it => {
        const freeUnits = Math.floor(Number(it.qty) / 2);
        const d = round2(freeUnits * Number(it.price));
        discount += d;
        lineOut.push({ productId: it.productId, applied: true, discounted: d });
      });
    } else if (promo.discountType === 'free') {
      // cheapest applicable item (1 unit) free
      const cheapest = applicable.reduce((m, it) => (Number(it.price) < Number(m.price) ? it : m), applicable[0]);
      const d = round2(Number(cheapest.price));
      discount += d;
      lineOut.push({ productId: cheapest.productId, applied: true, discounted: d });
    }

    const newTotal = Math.max(0, round2(subtotal - discount));
    return res.json({
      valid: true,
      discount,
      newTotal,
      lines: lineOut,
      // optional echo for client UI
      target: promo.target,
      maxRedemptions: promo.maxRedemptions || 0,
      redemptions: promo.redemptions || 0
    });
  } catch (e) {
    console.error('POST /promotions/validate', e);
    res.status(500).json({ message: 'Server error' });
  }

  function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }
});


/* -------------------- LIST -------------------- */
router.get('/', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  try {
    const { page=1, limit=10, q='', status='' } = req.query;
    const find = {};
    if (q) find.$text = { $search: q };
    if (status) find.status = status;

    const skip = (Number(page)-1)*Number(limit);
    const [items, total] = await Promise.all([
      Promotion.find(find).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Promotion.countDocuments(find)
    ]);
    res.json({ items, total, page: Number(page), pages: Math.max(1, Math.ceil(total/Number(limit))) });
  } catch (e) {
    console.error('List promos error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* -------------------- STATS (place BEFORE '/:id') -------------------- */
router.get('/_stats/summary', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const items = await Promotion.find({}, 'name views redemptions').sort({ createdAt:-1 }).limit(20).lean();
  res.json(items.map(i => ({ name: i.name, views: i.views||0, redemptions: i.redemptions||0 })));
});

/* -------------------- GET ONE -------------------- */
router.get('/:id', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const doc = await Promotion.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

/* -------------------- UPDATE (shared handler) -------------------- */
async function updatePromotion(req, res) {
  if (req.body.startDate || req.body.endDate || req.body.discountType || req.body.name) {
    const err = validateBody({
      name: req.body.name ?? 'x',
      startDate: req.body.startDate ?? new Date().toISOString(),
      endDate: req.body.endDate ?? new Date().toISOString(),
      discountType: req.body.discountType ?? 'percentage',
      discountValue: req.body.discountValue
    });
    if (err) return res.status(400).json({ message: err });
  }

  const doc = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ message: 'Not found' });

  // ✅ send success message
  res.json({
    message: 'Promotion updated successfully',
    promotion: doc
  });
}

/* -------------------- DELETE -------------------- */
router.delete('/:id', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const del = await Promotion.findByIdAndDelete(req.params.id);
  if (!del) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

/* -------------------- STATE TRANSITIONS -------------------- */
router.post('/:id/publish', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const doc = await Promotion.findByIdAndUpdate(req.params.id, { status:'active' }, { new:true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

router.post('/:id/pause', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const doc = await Promotion.findByIdAndUpdate(req.params.id, { status:'paused' }, { new:true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

router.post('/:id/end', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  const doc = await Promotion.findByIdAndUpdate(req.params.id, { status:'ended' }, { new:true });
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});


module.exports = router;

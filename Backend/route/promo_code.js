// route/promo_code.js
const express = require('express');
const dayjs = require('dayjs');
const Promotion = require('../models/Promotion');

const router = express.Router();

/* ------------ helpers ------------ */
function normalizeCode(c) {
  return String(c || '').trim().toUpperCase().replace(/\s+/g, '');
}
function round2(n){ return Math.round(Number(n||0)*100)/100; }
function withinWindow(promo) {
  const now = new Date();
  if (promo.status === 'paused') return { ok:false, reason:'PAUSED' };
  if (now < new Date(promo.startDate)) return { ok:false, reason:'NOT_STARTED' };
  if (now > new Date(promo.endDate)) return { ok:false, reason:'EXPIRED' };
  if (Number(promo.maxRedemptions || 0) > 0 &&
      Number(promo.redemptions || 0) >= Number(promo.maxRedemptions)) {
    return { ok:false, reason:'MAX_REDEMPTIONS_REACHED' };
  }
  return { ok:true };
}
function passesTarget(promo, customer) {
  const tgt = String(promo.target || 'all').toLowerCase();
  if (tgt === 'all') return true;
  if (tgt === 'new')      return (customer?.isNew === true || Number(customer?.orderCount || 0) === 0);
  if (tgt === 'loyalty')  return customer?.isLoyalty === true;
  if (tgt === 'students') return customer?.isStudent === true;
  if (tgt === 'seniors')  return Number(customer?.age || 0) >= 60;
  return false;
}
function calcDiscount(promo, items) {
  const applicable = (promo.productIds && promo.productIds.length)
    ? items.filter(it => promo.productIds.some(id => String(id) === String(it.productId)))
    : items.slice();

  if (!applicable.length) return { ok:false, reason:'NO_MATCHING_PRODUCTS' };

  const subtotal = items.reduce((s, it) => s + Number(it.price||0)*Number(it.qty||0), 0);
  if (subtotal < Number(promo.minPurchase || 0)) {
    return { ok:false, reason:'MIN_PURCHASE' };
  }

  let discount = 0;
  const lines = [];

  if (promo.discountType === 'percentage') {
    applicable.forEach(it => {
      const line = Number(it.price) * Number(it.qty);
      const d = round2(line * (Number(promo.discountValue || 0) / 100));
      discount += d;
      lines.push({ productId: it.productId, applied: true, discounted: d });
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
      lines.push({ productId: it.productId, applied: true, discounted: share });
    });
  } else if (promo.discountType === 'bogo') {
    applicable.forEach(it => {
      const freeUnits = Math.floor(Number(it.qty) / 2);
      const d = round2(freeUnits * Number(it.price));
      discount += d;
      lines.push({ productId: it.productId, applied: true, discounted: d });
    });
  } else if (promo.discountType === 'free') {
    const cheapest = applicable.reduce((m, it) =>
      Number(it.price) < Number(m.price) ? it : m, applicable[0]);
    const d = round2(Number(cheapest?.price || 0));
    discount += d;
    lines.push({ productId: cheapest.productId, applied: true, discounted: d });
  }

  const newTotal = Math.max(0, round2(subtotal - discount));
  return { ok:true, discount, newTotal, lines, subtotal };
}

/* ------------ VALIDATE a specific code ------------ */
/**
 * POST /api/promocode/validate
 * body: { code, canteenId, items:[{productId, qty, price}], customer? }
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, canteenId, items, customer = {} } = req.body || {};
    if (!code || !canteenId || !Array.isArray(items)) {
      return res.status(400).json({ message: 'code, canteenId and items[] are required' });
    }

    const promo = await Promotion.findOne({
      promo_code: normalizeCode(code),
      canteenId
    }).lean();

    if (!promo) return res.json({ valid:false, reason:'NOT_FOUND' });

    const windowRes = withinWindow(promo);
    if (!windowRes.ok) return res.json({ valid:false, reason: windowRes.reason });

    if (!passesTarget(promo, customer)) {
      return res.json({ valid:false, reason:'NOT_ELIGIBLE_TARGET' });
    }

    const d = calcDiscount(promo, items);
    if (!d.ok) return res.json({ valid:false, reason:d.reason });

    return res.json({
      valid: true,
      discount: d.discount,
      newTotal: d.newTotal,
      lines: d.lines,
      target: promo.target,
      maxRedemptions: promo.maxRedemptions || 0,
      redemptions: promo.redemptions || 0
    });
  } catch (e) {
    console.error('POST /promocode/validate', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------ BEST promo for cart ------------ */
/**
 * POST /api/promocode/best
 * body: { canteenId, items:[...], customer? }
 */
router.post('/best', async (req, res) => {
  try {
    const { canteenId, items, customer = {} } = req.body || {};
    if (!canteenId || !Array.isArray(items)) {
      return res.status(400).json({ message: 'canteenId and items[] are required' });
    }

    const now = dayjs();
    // consider promos that are scheduled/active and within dates
    const promos = await Promotion.find({
      canteenId,
      status: { $in: ['scheduled','active'] },
      startDate: { $lte: now.toDate() },
      endDate:   { $gte: now.toDate() },
    }).lean();

    let best = null;
    for (const p of promos) {
      const w = withinWindow(p);
      if (!w.ok) continue;
      if (!passesTarget(p, customer)) continue;

      const d = calcDiscount(p, items);
      if (!d.ok) continue;

      if (!best || d.discount > best.discount) {
        best = {
          promotionId: String(p._id),
          code: p.promo_code,
          discount: d.discount,
          newTotal: d.newTotal
        };
      }
    }

    if (!best) return res.json({ found:false });
    return res.json({ found:true, ...best });
  } catch (e) {
    console.error('POST /promocode/best', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ------------ RECOMMEND promos (with reasons) ------------ */
/**
 * POST /api/promocode/recommend
 * body: { canteenId, items:[{productId, qty, price}], customer? }
 * returns: { subtotal, recommendations:[{ code, estDiscount, newTotal, reason, ...}] }
 */
router.post('/recommend', async (req, res) => {
  try {
    const { canteenId, items = [], customer = {} } = req.body || {};
    if (!canteenId || !items.length) {
      return res.status(400).json({ message: 'canteenId and items[] are required' });
    }

    const now = dayjs();
    const promos = await Promotion.find({
      canteenId,
      status: { $in: ['active','scheduled'] },
      startDate: { $lte: now.toDate() },
      endDate:   { $gte: now.toDate() },
    }).lean();

    const subtotal = items.reduce((s, it) => s + Number(it.price||0)*Number(it.qty||0), 0);

    const out = [];
    for (const p of promos) {
      const w = withinWindow(p);
      if (!w.ok) {
        out.push({
          promoId: String(p._id),
          code: p.promo_code, name: p.name, target: p.target, expiresAt: p.endDate,
          minPurchase: Number(p.minPurchase||0),
          estDiscount: 0, newTotal: subtotal,
          reason: w.reason === 'PAUSED' ? 'Paused' :
                  w.reason === 'EXPIRED' ? 'Expired' :
                  w.reason === 'NOT_STARTED' ? 'Not started yet' :
                  'Unavailable',
          appliesTo: (p.productIds && p.productIds.length) ? 'Selected items' : 'All items'
        });
        continue;
      }

      if (!passesTarget(p, customer)) {
        out.push({
          promoId: String(p._id),
          code: p.promo_code, name: p.name, target: p.target, expiresAt: p.endDate,
          minPurchase: Number(p.minPurchase||0),
          estDiscount: 0, newTotal: subtotal,
          reason: 'Not eligible for this audience',
          appliesTo: (p.productIds && p.productIds.length) ? 'Selected items' : 'All items'
        });
        continue;
      }

      const d = calcDiscount(p, items);
      if (!d.ok) {
        out.push({
          promoId: String(p._id),
          code: p.promo_code, name: p.name, target: p.target, expiresAt: p.endDate,
          minPurchase: Number(p.minPurchase||0),
          estDiscount: 0, newTotal: subtotal,
          reason: d.reason === 'MIN_PURCHASE' ? `Spend Rs. ${Number(p.minPurchase||0).toLocaleString('en-LK')} to use this`
                : d.reason === 'NO_MATCHING_PRODUCTS' ? 'No matching items in cart'
                : 'Not applicable',
          appliesTo: (p.productIds && p.productIds.length) ? 'Selected items' : 'All items'
        });
        continue;
      }

      out.push({
        promoId: String(p._id),
        code: p.promo_code, name: p.name, target: p.target, expiresAt: p.endDate,
        minPurchase: Number(p.minPurchase||0),
        estDiscount: d.discount, newTotal: d.newTotal,
        reason: d.discount > 0 ? 'Eligible' : 'No savings for this cart',
        appliesTo: (p.productIds && p.productIds.length) ? 'Selected items' : 'All items'
      });
    }

    out.sort((a,b) => b.estDiscount - a.estDiscount);
    res.json({ subtotal: round2(subtotal), recommendations: out });
  } catch (e) {
    console.error('POST /promocode/recommend', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

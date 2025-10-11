const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const Report = require('../models/Report');

// LIST: /api/sales/reports?type=&q=&from=&to=&page=&limit=
router.get('/', auth, requireRole('ADMIN','PROMO_OFFICER','MANAGER'), async (req, res) => {
  try {
    const {
      type = '', q = '', from = '', to = '',
      page = 1, limit = 20,
    } = req.query;

    const find = {};
    if (type) find.type = type.toUpperCase();
    if (q) find.name = new RegExp(q.trim(), 'i');
    if (from || to) {
      find.$and = [];
      if (from) find.$and.push({ from: { $gte: new Date(from) } });
      if (to)   find.$and.push({ to:   { $lte: new Date(to)   } });
      if (!find.$and.length) delete find.$and;
    }

    // Managers can only see their own; Promo Officer/Admin see all
    if (req.userRole === 'MANAGER') {
      find.createdBy = req.userId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Report.find(find)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(find),
    ]);

    res.json({ items, total, page: Number(page) });
  } catch (e) {
    console.error('reports list error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DETAILS: /api/sales/reports/:id
router.get('/:id', auth, requireRole('ADMIN','PROMO_OFFICER','MANAGER'), async (req, res) => {
  try {
    const doc = await Report.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (req.userRole === 'MANAGER' && String(doc.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(doc);
  } catch (e) {
    console.error('report details error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sales/reports/generate
router.post('/reports/generate', auth, requireRole('ADMIN','MANAGER','PROMO_OFFICER'), async (req, res) => {
  try {
    const { reportType, dateRange, startDate, endDate, format, includeCharts } = req.body || {};
    if (!reportType || !format) {
      return res.status(400).json({ message: 'reportType and format are required' });
    }

    // resolve period
    const now = new Date();
    let from, to;
    if (dateRange === 'custom') {
      if (!startDate || !endDate) return res.status(400).json({ message: 'Start/End dates required' });
      from = new Date(startDate); to = new Date(endDate);
    } else {
      // quick ranges
      to = now;
      const d = new Date(now);
      if (dateRange === 'week')    d.setDate(d.getDate() - 7);
      else if (dateRange === 'month')  d.setDate(d.getDate() - 30);
      else if (dateRange === 'quarter') d.setDate(d.getDate() - 90);
      else d.setDate(d.getDate() - 7);
      from = d;
    }
    if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    // create a placeholder first (Processing)
    const typeMap = { pdf: 'PDF', excel: 'Excel', csv: 'CSV' };
    const niceType = typeMap[(format || '').toLowerCase()] || 'PDF';

    const name = `${reportType[0].toUpperCase()+reportType.slice(1)} Report`;
    const doc = await Report.create({
      name,
      description: `Auto-generated ${reportType} report`,
      from, to,
      type: niceType,
      status: 'Processing',
      downloadUrl: '/reports/placeholder.txt', // temporary; will update
      createdBy: req.userId,
      createdByRole: req.userRole,
      preview: { totalSales: 0, ordersCount: 0, topProducts: [] },
    });

    // TODO: real aggregation here — for demo we just mark as completed quickly
    // Simulate some computed preview + file path:
    const fakePreview = {
      totalSales: 125000,
      ordersCount: 342,
      topProducts: [
        { name: 'Chicken Sub', qty: 78, revenue: 39000 },
        { name: 'Iced Coffee', qty: 210, revenue: 31500 },
      ],
    };
    const fileName = `/reports/${doc._id}-${reportType}-${niceType}.${niceType === 'PDF' ? 'pdf' : niceType === 'Excel' ? 'xlsx' : 'csv'}`;

    await Report.findByIdAndUpdate(doc._id, {
      status: 'Completed',
      preview: fakePreview,
      downloadUrl: fileName,
    });

    return res.status(201).json({ message: 'Report generated', id: doc._id });
  } catch (e) {
    console.error('generate report error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;

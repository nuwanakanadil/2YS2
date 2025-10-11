// route/reports.js
const express = require('express');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const auth = require('../middleware/authMiddleware');
const Canteen = require('../models/Canteen');
const Order = require('../models/Order'); // line-item style model

const router = express.Router();

/** helper: manager -> their canteenId (ObjectId) */
async function getManagerCanteenId(managerId) {
  const c = await Canteen.findOne({ managerId }).select('_id');
  return c?._id || null;
}

/** helper: parse date range */
function range(q) {
  const from = q.from ? dayjs(q.from).startOf('day').toDate() : dayjs().startOf('month').toDate();
  const to   = q.to   ? dayjs(q.to).endOf('day').toDate()     : dayjs().endOf('day').toDate();
  return { from, to };
}

/** helper: match orders for this canteen and range
 * NOTE: your Order.canteenId is a STRING. We'll compare to canteenId.toString().
 * We also only count placed rows (status === 'placed').
 */
function matchStage(canteenIdStr, from, to) {
  return {
    $match: {
      canteenId: canteenIdStr,
      status: 'placed',
      createdAt: { $gte: from, $lte: to },
    }
  };
}

/* ============ TRENDING FOODS ============ */
/** GET /api/reports/trending?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10 */
router.get('/trending', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
    const canteenIdStr = String(canteenId);

    const rows = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: { itemId: '$itemId', name: '$itemName' },
          totalQty: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          itemId: '$_id.itemId',
          name: '$_id.name',
          totalQty: 1,
          totalRevenue: 1,
        }
      }
    ]);

    res.json({ rows, range: { from, to } });
  } catch (e) {
    console.error('GET /reports/trending error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ INCOME (TOTAL REVENUE) ============ */
/** GET /api/reports/income?from=&to= */
router.get('/income', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const canteenIdStr = String(canteenId);

    const agg = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: { day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } } },
          total: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
          lines: { $sum: 1 }, // number of line items
          items: { $sum: '$quantity' }, // total items sold
        }
      },
      { $sort: { '_id.day': 1 } }
    ]);

    const totalRevenue = agg.reduce((s, r) => s + r.total, 0);

    res.json({
      totalRevenue,
      daily: agg.map(r => ({ day: r._id.day, total: r.total, lines: r.lines, items: r.items })), // matches UI
      range: { from, to }
    });
  } catch (e) {
    console.error('GET /reports/income error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ SALES SUMMARY (GROUP BY DAY/WEEK/MONTH) ============ */
/** GET /api/reports/sales-summary?from=&to=&groupBy=day|week|month */
router.get('/sales-summary', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const canteenIdStr = String(canteenId);
    const groupBy = (req.query.groupBy || 'day').toLowerCase();

    const fmt =
      groupBy === 'month' ? '%Y-%m' :
      groupBy === 'week'  ? '%G-W%V' : // ISO week
                            '%Y-%m-%d';

    const rows = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: { p: { $dateToString: { date: '$createdAt', format: fmt } } },
          lines: { $sum: 1 },
          items: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
        }
      },
      {
        $project: {
          _id: 0,
          period: '$_id.p',
          lines: 1,
          items: 1,
          revenue: 1,
          avgLineValue: { $cond: [{ $gt: ['$lines', 0] }, { $divide: ['$revenue', '$lines'] }, 0] },
          avgItemPrice: { $cond: [{ $gt: ['$items', 0] }, { $divide: ['$revenue', '$items'] }, 0] },
        }
      },
      { $sort: { period: 1 } }
    ]);

    res.json({ rows, range: { from, to }, groupBy });
  } catch (e) {
    console.error('GET /reports/sales-summary error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ PEAK HOURS ============ */
/** GET /api/reports/peak-hours?from=&to= */
router.get('/peak-hours', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const canteenIdStr = String(canteenId);

    const rows = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: { hour: { $hour: '$createdAt' } },
          lines: { $sum: 1 },
          items: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
        }
      },
      { $project: { _id: 0, hour: '$_id.hour', lines: 1, items: 1, revenue: 1 } },
      { $sort: { hour: 1 } }
    ]);

    res.json({ rows, range: { from, to } });
  } catch (e) {
    console.error('GET /reports/peak-hours error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ CHANNEL MIX (DELIVERY vs PICKUP) ============ */
/** GET /api/reports/channel-mix?from=&to= */
router.get('/channel-mix', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const canteenIdStr = String(canteenId);

    const rows = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: '$method',
          lines: { $sum: 1 },
          items: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
        }
      },
      { $project: { _id: 0, method: '$_id', lines: 1, items: 1, revenue: 1 } },
      { $sort: { method: 1 } }
    ]);

    const totals = rows.reduce((acc, r) => {
      acc.lines += r.lines; acc.items += r.items; acc.revenue += r.revenue; return acc;
    }, { lines: 0, items: 0, revenue: 0 });

    const withShare = rows.map(r => ({
      ...r,
      shareRevenue: totals.revenue ? r.revenue / totals.revenue : 0,
      shareItems: totals.items ? r.items / totals.items : 0,
    }));

    res.json({ rows: withShare, totals, range: { from, to } });
  } catch (e) {
    console.error('GET /reports/channel-mix error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ LOW PERFORMING ============ */
/** GET /api/reports/low-performing?from=&to=&limit=10&metric=qty|revenue */
router.get('/low-performing', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { from, to } = range(req.query);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
    const metric = (req.query.metric || 'qty').toLowerCase(); // qty|revenue
    const canteenIdStr = String(canteenId);

    const sortStage = metric === 'revenue' ? { totalRevenue: 1 } : { totalQty: 1 };

    const rows = await Order.aggregate([
      matchStage(canteenIdStr, from, to),
      {
        $group: {
          _id: { itemId: '$itemId', name: '$itemName' },
          totalQty: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
        }
      },
      { $sort: sortStage },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          itemId: '$_id.itemId',
          name: '$_id.name',
          totalQty: 1,
          totalRevenue: 1,
        }
      }
    ]);

    res.json({ rows, range: { from, to } });
  } catch (e) {
    console.error('GET /reports/low-performing error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ============ PDF GENERATION (ONE-PAGE FIT) ============ */
/** POST /api/reports/generate
 *  body: { type: 'TRENDING'|'INCOME'|'SALES_SUMMARY'|'PEAK_HOURS'|'CHANNEL_MIX'|'LOW_PERFORMING',
 *          from, to, limit?, groupBy?, metric?, onePage?: boolean }
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteenId = await getManagerCanteenId(managerId);
    if (!canteenId) return res.status(404).json({ message: 'No canteen for this manager' });

    const { type } = req.body || {};
    const valid = ['TRENDING','INCOME','SALES_SUMMARY','PEAK_HOURS','CHANNEL_MIX','LOW_PERFORMING'];
    if (!valid.includes(type)) return res.status(400).json({ message: 'Invalid report type' });

    const { from, to } = range(req.body);
    const canteenIdStr = String(canteenId);

    // --- build table (headers + rows) ---
    let table = { headers: [], rows: [] };
    if (type === 'TRENDING' || type === 'LOW_PERFORMING') {
      const limit = Math.max(1, Math.min(100, Number(req.body.limit || 10)));
      const metric = (req.body.metric || (type === 'LOW_PERFORMING' ? 'qty' : 'qty')).toLowerCase();
      const sortStage = metric === 'revenue'
        ? { totalRevenue: type === 'LOW_PERFORMING' ? 1 : -1 }
        : { totalQty: type === 'LOW_PERFORMING' ? 1 : -1 };

      const data = await Order.aggregate([
        matchStage(canteenIdStr, from, to),
        { $group: {
            _id: { itemId: '$itemId', name: '$itemName' },
            totalQty: { $sum: '$quantity' },
            totalRevenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
          }},
        { $sort: sortStage },
        { $limit: limit },
        { $project: { _id: 0, name: '$_id.name', totalQty: 1, totalRevenue: 1 } }
      ]);
      table.headers = ['#', 'Item', 'Qty', 'Revenue (Rs.)'];
      table.rows = data.map((d, i) => [i + 1, d.name, d.totalQty, d.totalRevenue || 0]);
    }

    if (type === 'INCOME') {
      const data = await Order.aggregate([
        matchStage(canteenIdStr, from, to),
        { $group: {
            _id: { day: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } } },
            total: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
            lines: { $sum: 1 }, items: { $sum: '$quantity' },
          }},
        { $sort: { '_id.day': 1 } }
      ]);
      table.headers = ['Day', 'Lines', 'Items', 'Revenue (Rs.)'];
      table.rows = data.map(d => [d._id.day, d.lines, d.items, d.total || 0]);
    }

    if (type === 'SALES_SUMMARY') {
      const groupBy = (req.body.groupBy || 'day').toLowerCase();
      const fmt =
        groupBy === 'month' ? '%Y-%m' :
        groupBy === 'week'  ? '%G-W%V' : '%Y-%m-%d';
      const data = await Order.aggregate([
        matchStage(canteenIdStr, from, to),
        { $group: {
            _id: { p: { $dateToString: { date: '$createdAt', format: fmt } } },
            lines: { $sum: 1 },
            items: { $sum: '$quantity' },
            revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
          }},
        { $project: {
            _id: 0, period: '$_id.p', lines: 1, items: 1, revenue: 1,
            avgLineValue: { $cond: [{ $gt: ['$lines', 0] }, { $divide: ['$revenue', '$lines'] }, 0] },
            avgItemPrice: { $cond: [{ $gt: ['$items', 0] }, { $divide: ['$revenue', '$items'] }, 0] },
          }},
        { $sort: { period: 1 } }
      ]);
      table.headers = ['Period', 'Lines', 'Items', 'Revenue (Rs.)', 'Avg Line', 'Avg Item'];
      table.rows = data.map(d => [d.period, d.lines, d.items, d.revenue || 0, d.avgLineValue || 0, d.avgItemPrice || 0]);
    }

    if (type === 'PEAK_HOURS') {
      const data = await Order.aggregate([
        matchStage(canteenIdStr, from, to),
        { $group: {
            _id: { hour: { $hour: '$createdAt' } },
            lines: { $sum: 1 }, items: { $sum: '$quantity' },
            revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
          }},
        { $project: { _id: 0, hour: '$_id.hour', lines: 1, items: 1, revenue: 1 } },
        { $sort: { hour: 1 } }
      ]);
      table.headers = ['Hour', 'Lines', 'Items', 'Revenue (Rs.)'];
      table.rows = data.map(d => [`${d.hour}:00`, d.lines, d.items, d.revenue || 0]);
    }

    if (type === 'CHANNEL_MIX') {
      const data = await Order.aggregate([
        matchStage(canteenIdStr, from, to),
        { $group: {
            _id: '$method',
            lines: { $sum: 1 }, items: { $sum: '$quantity' },
            revenue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$price', 0] }] } },
          }},
        { $project: { _id: 0, method: '$_id', lines: 1, items: 1, revenue: 1 } },
        { $sort: { method: 1 } }
      ]);
      const totals = data.reduce((a, r) => {
        a.lines += r.lines; a.items += r.items; a.revenue += r.revenue; return a;
      }, {lines:0, items:0, revenue:0});
      table.headers = ['Method', 'Lines', 'Items', 'Revenue (Rs.)', 'Share (Revenue)', 'Share (Items)'];
      table.rows = data.map(d => [
        d.method, d.lines, d.items, d.revenue || 0,
        totals.revenue ? (d.revenue / totals.revenue) : 0,
        totals.items ? (d.items / totals.items) : 0,
      ]);
      // add totals row
      table.rows.push(['TOTAL', totals.lines, totals.items, totals.revenue, 1, 1]);
    }

    // === styled PDF + ONE-PAGE FIT ===
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    const niceName = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const stamp = dayjs().format('YYYYMMDD_HHmm');
    const fname = `${type}_${stamp}.pdf`;
    const filePath = path.join(reportsDir, fname);

    const ONE_PAGE = Boolean(req.body.onePage);

    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      layout: (ONE_PAGE || type === 'SALES_SUMMARY') ? 'landscape' : 'portrait',
    });

    const THEME = {
      primary: '#FF4081',
      border: '#e5e7eb',
      zebra: '#fafafa',
      text: '#111827',
      subtext: '#6b7280'
    };

    const fmtMoney = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n||0));
    const fmtPct = (n) => `${(Number(n||0) * 100).toFixed(1)}%`;

    function header() {
      doc
        .fillColor(THEME.text)
        .fontSize(18)
        .text(`Canteen Report — ${niceName(type)}`, 50, 50, { align: 'left' })
        .moveDown(0.4);
      doc
        .fontSize(10)
        .fillColor(THEME.subtext)
        .text(`Canteen: ${String(canteenId)}`)
        .text(`Range: ${dayjs(from).format('YYYY-MM-DD')} → ${dayjs(to).format('YYYY-MM-DD')}`)
        .moveDown(1);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(THEME.primary).stroke();
      doc.moveDown(0.6);
    }

    function footer() {
      const bottom = doc.page.height - 40;
      const leftX = 50;
      const width = (doc.page.width - 50) - 50;

      doc
        .fontSize(9)
        .fillColor(THEME.subtext)
        .text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, leftX, bottom, {
          width: width / 2,
          align: 'left',
          lineBreak: false,
        });

      doc
        .text(`Page ${doc.page.number}`, leftX + width / 2, bottom, {
          width: width / 2,
          align: 'right',
          lineBreak: false,
        });
    }

    function drawTableOnePage({ headers, rows, colAlign = [] }) {
      const MARGIN = 50;
      const FOOTER_H = 26;

      const startX = 50;
      let y = doc.y + 6;

      const contentTop = y;
      const contentBottom = doc.page.height - MARGIN - FOOTER_H;
      const availableHeight = contentBottom - contentTop;

      const totalWidth = (doc.page.width - MARGIN) - startX;
      const count = headers.length;

      const baseWidths = Array(count).fill(Math.floor(totalWidth / count));
      if (count >= 4) { baseWidths[0] += 30; baseWidths[count - 1] -= 15; }

      const SIZE_STEPS = [
        { headFs: 11, bodyFs: 10, headerH: 24, rowMinH: 20, lineGap: 2 },
        { headFs: 10, bodyFs: 9,  headerH: 22, rowMinH: 18, lineGap: 1.8 },
        { headFs: 9,  bodyFs: 8,  headerH: 20, rowMinH: 16, lineGap: 1.6 },
        { headFs: 8,  bodyFs: 7,  headerH: 18, rowMinH: 14, lineGap: 1.4 },
        { headFs: 7,  bodyFs: 6,  headerH: 16, rowMinH: 12, lineGap: 1.2 },
      ];

      const formatCell = (v) => {
        if (typeof v === 'number') return fmtMoney(v);
        if (typeof v === 'string' && v.endsWith('%AUTO_PCT')) return fmtPct(Number(v.replace('%AUTO_PCT','')));
        return String(v ?? '');
      };
      const sum = (arr) => arr.reduce((a,b)=>a+b,0);

      const measureTotalHeight = (conf, maxRows = rows.length) => {
        const { bodyFs, headerH, rowMinH, lineGap } = conf;
        let total = 0;
        total += headerH;
        for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
          const r = rows[i];
          let rowH = rowMinH;
          for (let c = 0; c < r.length; c++) {
            const w = Math.max(20, baseWidths[c] - 16);
            const txt = formatCell(r[c]);
            doc.fontSize(bodyFs);
            const h = doc.heightOfString(String(txt), { width: w, align: 'left', lineGap });
            rowH = Math.max(rowH, Math.ceil(h) + 4);
          }
          total += rowH;
        }
        return total;
      };

      let chosen = SIZE_STEPS[0];
      let fitsCompletely = false;
      let rowsToDraw = rows.length;

      for (const conf of SIZE_STEPS) {
        const fullH = measureTotalHeight(conf, rows.length);
        if (fullH <= availableHeight) { chosen = conf; fitsCompletely = true; break; }
        chosen = conf; // fallback to smallest if none fit
      }

      if (!fitsCompletely) {
        let lo = 1, hi = rows.length, best = 1;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const h = measureTotalHeight(chosen, mid + 1); // +1 for summary line
          if (h <= availableHeight) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        rowsToDraw = Math.max(1, best);
      }

      const { headFs, bodyFs, headerH, rowMinH, lineGap } = chosen;

      const drawRow = (cells, yPos, isHeader, zebra) => {
        const bandH = isHeader ? headerH : rowMinH;

        if (isHeader) {
          doc.rect(startX, yPos - 6, sum(baseWidths), bandH + 2).fillOpacity(1).fill(THEME.primary).fillOpacity(1);
        } else if (zebra) {
          doc.rect(startX, yPos - 6, sum(baseWidths), bandH + 2).fillOpacity(1).fill(THEME.zebra).fillOpacity(1);
        }

        let accX = startX;
        for (let i = 0; i < cells.length; i++) {
          const w = baseWidths[i];
          const val = cells[i];
          const align = colAlign[i] || (typeof val === 'number' ? 'right' : 'left');

          doc
            .fontSize(isHeader ? headFs : bodyFs)
            .fillColor(isHeader ? '#fff' : THEME.text)
            .text(formatCell(val), accX + 8, yPos - 2, { width: w - 16, align, lineGap });

          doc.strokeColor(THEME.border)
            .moveTo(accX, yPos - 6)
            .lineTo(accX, yPos + bandH + 2)
            .stroke();

          accX += w;
        }

        doc.moveTo(startX + sum(baseWidths), yPos - 6).lineTo(startX + sum(baseWidths), yPos + bandH + 2).strokeColor(THEME.border).stroke();
        doc.moveTo(startX, yPos + bandH + 2).lineTo(startX + sum(baseWidths), yPos + bandH + 2).strokeColor(THEME.border).stroke();

        let maxH = bandH;
        if (!isHeader) {
          for (let i = 0; i < cells.length; i++) {
            const w = Math.max(20, baseWidths[i] - 16);
            doc.fontSize(bodyFs);
            const h = doc.heightOfString(String(formatCell(cells[i])), { width: w, align: 'left', lineGap });
            maxH = Math.max(maxH, Math.ceil(h) + 4);
          }
        }
        return maxH;
      };

      // header
      drawRow(table.headers, y, true, false);
      y += headerH;

      // rows
      for (let i = 0; i < rowsToDraw; i++) {
        const zebra = i % 2 === 0;
        const inc = drawRow(rows[i], y, false, zebra);
        y += inc;
      }

      // truncated note
      const hidden = rows.length - rowsToDraw;
      if (hidden > 0) {
        const info = Array(table.headers.length).fill('');
        info[0] = `+ ${hidden} more not shown`;
        doc.fillColor(THEME.subtext);
        drawRow(info, y, false, false);
      }
    }

    // write
    doc.pipe(fs.createWriteStream(filePath));
    header();
    footer();

    // numeric alignments per report
    let colAlign = [];
    if (['TRENDING','LOW_PERFORMING'].includes(type)) colAlign = ['left','left','right','right'];
    if (type === 'INCOME') colAlign = ['left','right','right','right'];
    if (type === 'SALES_SUMMARY') colAlign = ['left','right','right','right','right','right'];
    if (type === 'PEAK_HOURS') colAlign = ['left','right','right','right'];
    if (type === 'CHANNEL_MIX') colAlign = ['left','right','right','right','right','right'];

    if (!table.rows.length) {
      doc
        .fillColor('#6b7280')
        .fontSize(12)
        .text('No data for the selected range.', { align: 'left' });
    } else {
      drawTableOnePage({ headers: table.headers, rows: table.rows, colAlign });
    }

    doc.end();

    const url = `http://localhost:5000/reports/${fname}`;
    return res.status(201).json({ message: 'Report generated', url, filePath: `reports/${fname}` });
  } catch (e) {
    console.error('POST /reports/generate error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

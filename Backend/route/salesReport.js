// route/salesReport.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const SalesOfficerReport = require('../models/SalesReport');
const Canteen = require('../models/Canteen');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// POST /api/sales/reports/generate
// POST /api/sales/reports/generate
router.post(
  '/generate',
  auth,
  requireRole('ADMIN', 'PROMO_OFFICER'),
  async (req, res) => {
    try {
      const { reportType, dateRange, startDate, endDate, format } = req.body || {};
      if (!reportType || !format) {
        return res.status(400).json({ message: 'reportType and format are required' });
      }

      // ---- resolve period ----
      const now = new Date();
      let from, to;
      if (dateRange === 'custom') {
        if (!startDate || !endDate) {
          return res.status(400).json({ message: 'Start/End dates required for custom range' });
        }
        from = new Date(startDate);
        to   = new Date(endDate);
      } else {
        to = now;
        const d = new Date(now);
        if (dateRange === 'week') d.setDate(d.getDate() - 7);
        else if (dateRange === 'month') d.setDate(d.getDate() - 30);
        else if (dateRange === 'quarter') d.setDate(d.getDate() - 90);
        else d.setDate(d.getDate() - 7);
        from = d;
      }
      if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) {
        return res.status(400).json({ message: 'Invalid date range' });
      }

      // ---- who / role ----
      const userId   = req.userId || req.user?.userId || req.user?._id;
      const userRole = req.userRole || req.user?.role;
      if (!userId || !userRole) {
        return res.status(401).json({ message: 'Unauthorized (missing user identity)' });
      }

      const type = String(format || '').toLowerCase(); // 'pdf' | 'excel' | 'csv'
      const name = `${reportType[0].toUpperCase() + reportType.slice(1)} Report`;

      // Create doc with a temporary filePath so model requirements are satisfied
      const doc = await SalesOfficerReport.create({
        name,
        description: `Auto-generated ${reportType} report`,
        from,
        to,
        type,                               // lowercase to match enum
        filePath: '/reports/processing.txt',// temp placeholder
        status: 'Processing',
        createdBy: String(userId),
        createdByRole: userRole,
        canteenId: null,                    // global report for promo/admin
        preview: { totalSales: 0, ordersCount: 0, topProducts: [] },
      });

      // ---- actually write a file into /reports ----
      const ext = type === 'pdf' ? 'pdf' : type === 'excel' ? 'xlsx' : 'csv';
      const publicDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

      const finalPath = `/reports/${doc._id}-${reportType}.${ext}`;
      const absPath   = path.join(process.cwd(), finalPath.replace(/^\//, ''));

      if (type === 'pdf') {
        // small PDF via pdfkit
        const PDFDocument = require('pdfkit');
        await new Promise((resolve, reject) => {
          const out = fs.createWriteStream(absPath);
          const pdf = new PDFDocument({ margin: 40 });

          pdf.pipe(out);
          pdf.fontSize(18).text(name, { align: 'center' });
          pdf.moveDown();
          pdf.fontSize(12).text(`Report Type: ${reportType}`);
          pdf.text(`From: ${from.toISOString()}`);
          pdf.text(`To:   ${to.toISOString()}`);
          pdf.text(`Generated: ${new Date().toISOString()}`);
          pdf.end();

          out.on('finish', resolve);
          out.on('error', reject);
        });
      } else {
        // write a simple CSV (Excel will open it fine)
        const csv = [
          'Metric,Value',
          `Report Type,${reportType}`,
          `From,${from.toISOString()}`,
          `To,${to.toISOString()}`,
          `Generated,${new Date().toISOString()}`
        ].join('\n');
        fs.writeFileSync(absPath, csv);
      }

      // simple preview (replace with real aggregation later)
      const fakePreview = {
        totalSales: 125000,
        ordersCount: 342,
        topProducts: [
          { name: 'Chicken Sub', qty: 78, revenue: 39000 },
          { name: 'Iced Coffee', qty: 210, revenue: 31500 },
        ],
      };

      await SalesOfficerReport.findByIdAndUpdate(doc._id, {
        status: 'Completed',
        filePath: finalPath,
        preview: fakePreview,
      });

      return res.status(201).json({ message: 'Report generated', id: doc._id });
    } catch (e) {
      console.error('generate report error:', e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);


// GET /api/sales/reports/:id  (used by the frontend poller)
router.get('/:id',
  auth,
  requireRole('ADMIN','PROMO_OFFICER'),
  async (req, res) => {
    try {
      const doc = await SalesOfficerReport.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });

      // Promo officer can only see their own
      if (req.userRole === 'PROMO_OFFICER' && String(doc.createdBy) !== String(req.userId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // return enough for the poller
      res.json({
        _id: doc._id,
        status: doc.status,
        filePath: doc.filePath,
        type: doc.type,
        name: doc.name,
        from: doc.from,
        to: doc.to,
      });
    } catch (e) {
      console.error('report details error:', e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);



// GET /api/sales/reports/:id/download
router.get('/:id/download', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req, res) => {
  try {
    const doc = await SalesOfficerReport.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // scope: manager can only download their own reports
    if (req.userRole === 'PROMO_OFFICER' && String(doc.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (doc.status !== 'Completed' || !doc.filePath) {
      return res.status(409).json({ message: 'Report not ready yet' });
    }

    const absPath = path.join(process.cwd(), doc.filePath.replace(/^\//, ''));
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const suggested =
      `${doc.name || 'report'}-${doc._id}.${doc.type === 'excel' ? 'xlsx' : (doc.type || 'pdf')}`;
    return res.download(absPath, suggested);
  } catch (e) {
    console.error('download report error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/generate-download',
  auth,
  requireRole('ADMIN', 'PROMO_OFFICER'),
  async (req, res) => {
    try {
      const { reportType = 'sales', dateRange = 'week', startDate, endDate, format = 'pdf' } = req.body || {};

      // Resolve period
      const now = new Date();
      let from, to;
      if (dateRange === 'custom') {
        if (!startDate || !endDate) return res.status(400).send('Start/End dates required');
        from = new Date(startDate);
        to   = new Date(endDate);
      } else {
        to = now;
        const d = new Date(now);
        if (dateRange === 'week') d.setDate(d.getDate() - 7);
        else if (dateRange === 'month') d.setDate(d.getDate() - 30);
        else if (dateRange === 'quarter') d.setDate(d.getDate() - 90);
        else d.setDate(d.getDate() - 7);
        from = d;
      }
      if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) {
        return res.status(400).send('Invalid date range');
      }

      // Nice filename
      const baseName = `${reportType[0].toUpperCase() + reportType.slice(1)}-Report_${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}`;

      // Format: stream a PDF or CSV (Excel can open CSV). If you really want true XLSX, use 'xlsx' lib.
      const fmt = String(format).toLowerCase();

      if (fmt === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        doc.fontSize(18).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Period: ${from.toISOString()}  →  ${to.toISOString()}`);
        doc.text(`Generated: ${new Date().toISOString()}`);
        doc.moveDown();

        // Example content (replace with real aggregates)
        doc.text('Summary');
        doc.moveDown(0.5);
        doc.text('• Total Sales: Rs. 125,000');
        doc.text('• Orders Count: 342');
        doc.moveDown();
        doc.text('Top Products');
        doc.text('1) Chicken Sub — qty 78 — Rs. 39,000');
        doc.text('2) Iced Coffee — qty 210 — Rs. 31,500');

        doc.end();
        return; // stream ends the response
      }

      // default/CSV (also for "excel" fallback)
      const rows = [
        ['Metric','Value'],
        ['Report Type', reportType],
        ['From', from.toISOString()],
        ['To', to.toISOString()],
        ['Generated', new Date().toISOString()],
        ['Total Sales', 125000],
        ['Orders Count', 342],
      ];
      const csv = rows.map(r => r.map(String).map(s => /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s).join(',')).join('\n');

      const isExcel = fmt === 'excel';
      res.setHeader('Content-Type', isExcel ? 'text/csv' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.${isExcel ? 'csv' : 'csv'}"`);
      return res.status(200).send(csv);
    } catch (e) {
      console.error('generate-download error:', e);
      return res.status(500).send('Server error');
    }
  }
);


module.exports = router;

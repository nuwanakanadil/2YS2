const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/analyticsService');
const ExportService = require('../services/exportService');

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const analytics = await AnalyticsService.getDashboardAnalytics(period);
    res.json(analytics);
  } catch (err) {
    console.error('Error fetching dashboard analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get stock usage report
router.get('/stock-usage', async (req, res) => {
  try {
    const { period = 'weekly', category, itemId } = req.query;
    const report = await AnalyticsService.generateStockUsageReport(period, category, itemId);
    res.json(report);
  } catch (err) {
    console.error('Error generating stock usage report:', err);
    res.status(500).json({ error: 'Failed to generate stock usage report' });
  }
});

// Get top selling items
router.get('/top-selling', async (req, res) => {
  try {
    const { period = 'weekly', limit = 10 } = req.query;
    const topSelling = await AnalyticsService.getTopSellingItems(period, parseInt(limit));
    res.json(topSelling);
  } catch (err) {
    console.error('Error fetching top selling items:', err);
    res.status(500).json({ error: 'Failed to fetch top selling items' });
  }
});

// Get least used items
router.get('/least-used', async (req, res) => {
  try {
    const { period = 'monthly', limit = 10 } = req.query;
    const leastUsed = await AnalyticsService.getLeastUsedItems(period, parseInt(limit));
    res.json(leastUsed);
  } catch (err) {
    console.error('Error fetching least used items:', err);
    res.status(500).json({ error: 'Failed to fetch least used items' });
  }
});

// Get waste analysis
router.get('/waste-analysis', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const wasteData = await AnalyticsService.analyzeWaste(period);
    res.json(wasteData);
  } catch (err) {
    console.error('Error analyzing waste:', err);
    res.status(500).json({ error: 'Failed to analyze waste data' });
  }
});

// Get time series data for charts
router.get('/time-series', async (req, res) => {
  try {
    const { period = 'weekly', groupBy = 'day' } = req.query;
    const timeSeriesData = await AnalyticsService.getTimeSeriesData(period, groupBy);
    res.json(timeSeriesData);
  } catch (err) {
    console.error('Error fetching time series data:', err);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

// Export stock usage report as PDF
router.get('/export/stock-usage/pdf', async (req, res) => {
  try {
    const { period = 'weekly', category, itemId } = req.query;
    const reportData = await AnalyticsService.generateStockUsageReport(period, category, itemId);
    const pdfBuffer = await ExportService.generatePDF(reportData, 'Stock Usage Report');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="stock-usage-${period}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting stock usage PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export stock usage report as Excel
router.get('/export/stock-usage/excel', async (req, res) => {
  try {
    const { period = 'weekly', category, itemId } = req.query;
    const reportData = await AnalyticsService.generateStockUsageReport(period, category, itemId);
    const excelBuffer = await ExportService.generateExcel(reportData, 'Stock Usage Report');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="stock-usage-${period}-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting stock usage Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// Export top selling items as PDF
router.get('/export/top-selling/pdf', async (req, res) => {
  try {
    const { period = 'weekly', limit = 10 } = req.query;
    const reportData = await AnalyticsService.getTopSellingItems(period, parseInt(limit));
    const pdfBuffer = await ExportService.generatePDF(reportData, 'Top Selling Items');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="top-selling-${period}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting top selling PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export top selling items as Excel
router.get('/export/top-selling/excel', async (req, res) => {
  try {
    const { period = 'weekly', limit = 10 } = req.query;
    const reportData = await AnalyticsService.getTopSellingItems(period, parseInt(limit));
    const excelBuffer = await ExportService.generateExcel(reportData, 'Top Selling Items');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="top-selling-${period}-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting top selling Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// Export least used items as PDF
router.get('/export/least-used/pdf', async (req, res) => {
  try {
    const { period = 'monthly', limit = 10 } = req.query;
    const reportData = await AnalyticsService.getLeastUsedItems(period, parseInt(limit));
    const pdfBuffer = await ExportService.generatePDF(reportData, 'Least Used Items');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="least-used-${period}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting least used PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export least used items as Excel
router.get('/export/least-used/excel', async (req, res) => {
  try {
    const { period = 'monthly', limit = 10 } = req.query;
    const reportData = await AnalyticsService.getLeastUsedItems(period, parseInt(limit));
    const excelBuffer = await ExportService.generateExcel(reportData, 'Least Used Items');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="least-used-${period}-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting least used Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// Export waste analysis as PDF
router.get('/export/waste-analysis/pdf', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const reportData = await AnalyticsService.analyzeWaste(period);
    const pdfBuffer = await ExportService.generatePDF(reportData, 'Waste Analysis');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="waste-analysis-${period}-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting waste analysis PDF:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export waste analysis as Excel
router.get('/export/waste-analysis/excel', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const reportData = await AnalyticsService.analyzeWaste(period);
    const excelBuffer = await ExportService.generateExcel(reportData, 'Waste Analysis');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="waste-analysis-${period}-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting waste analysis Excel:', err);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

module.exports = router;

const ExportService = require('../services/exportService');

(async () => {
  try {
    const sample = {
      period: 'weekly',
      dateRange: { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
      summary: { totalValueImpact: 12345.67, totalWasteValue: 234.5 },
      items: [
        { _id: { itemName: 'Test Item A', category: 'Cat A' }, totalMovement: 10, netQuantityChange: 2, totalValueImpact: 500, totalValue: 500 },
      ],
      categoryBreakdown: [ { _id: 'Cat A', totalExpired: 5, totalWasteValue: 100, uniqueItemCount: 2 } ]
    };

    const buf = await ExportService.generateExcel(sample, 'Test Report');
    console.log('Excel buffer length:', buf.length);

    const pdfBuf = await ExportService.generatePDF(sample, 'Test Report');
    console.log('PDF buffer length:', pdfBuf.length);
  } catch (e) {
    console.error('Export test failed:', e);
    process.exit(1);
  }
})();

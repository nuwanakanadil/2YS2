const fs = require('fs');
const path = require('path');
const ExportService = require('../services/exportService');

(async () => {
  try {
    const sampleWaste = {
      period: 'weekly',
      dateRange: { startDate: '2025-09-03T00:00:00.000Z', endDate: '2025-09-10T00:00:00.000Z' },
      summary: { totalItems: 7, totalExpiredQuantity: 265, totalWasteValue: 63150, totalExpirationEvents: 23 },
      items: [
        { _id: { itemName: 'Grilled Chicken Caesar Salad', category: 'Breakfast & Brunch Items' }, totalExpired: 95, totalWasteValue: 26125, expirationEvents: 7, wastePercentage: 55.88 },
        { _id: { itemName: 'Breakfast Burrito', category: 'Breakfast & Brunch Items' }, totalExpired: 42, totalWasteValue: 16800, expirationEvents: 3, wastePercentage: 47.19 },
        { _id: { itemName: 'Turkey & Swiss', category: 'Breakfast & Brunch Items' }, totalExpired: 34, totalWasteValue: 6800, expirationEvents: 4, wastePercentage: 89.47 },
        { _id: { itemName: 'Glazed Donut', category: 'Baked Goods & Pastries' }, totalExpired: 45, totalWasteValue: 6750, expirationEvents: 3, wastePercentage: 25.28 },
        { _id: { itemName: 'Plain Croissant', category: 'Baked Goods & Pastries' }, totalExpired: 16, totalWasteValue: 2250, expirationEvents: 2, wastePercentage: 12.5 }
      ],
      categoryBreakdown: [ { _id: 'Breakfast & Brunch Items', totalExpired: 171, totalWasteValue: 49925, uniqueItemCount: 3 }, { _id: 'Baked Goods & Pastries', totalExpired: 61, totalWasteValue: 9000, uniqueItemCount: 2 } ]
    };

    const sampleTop = [
      { _id: { itemName: 'Chicken Roll', category: 'Sandwiches & Savory Meals' }, totalSold: 120, totalRevenue: 24000, salesCount: 60, avgSaleSize: 2 },
      { _id: { itemName: 'Pasta Carbonara', category: 'Pasta' }, totalSold: 95, totalRevenue: 19000, salesCount: 50, avgSaleSize: 1.9 }
    ];

    const outDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const pdf1 = await ExportService.generatePDF(sampleWaste, 'Waste Analysis');
    fs.writeFileSync(path.join(outDir, 'waste-analysis-styled.pdf'), pdf1);
    console.log('Wrote waste-analysis-styled.pdf');

    const pdf2 = await ExportService.generatePDF(sampleTop, 'Top Selling Items');
    fs.writeFileSync(path.join(outDir, 'top-selling-styled.pdf'), pdf2);
    console.log('Wrote top-selling-styled.pdf');

    const xlsx1 = await ExportService.generateExcel(sampleWaste, 'Waste Analysis');
    fs.writeFileSync(path.join(outDir, 'waste-analysis-styled.xlsx'), xlsx1);
    console.log('Wrote waste-analysis-styled.xlsx');

    const xlsx2 = await ExportService.generateExcel({ summary: { totalRevenue: 43000 } , data: sampleTop }, 'Top Selling Items');
    fs.writeFileSync(path.join(outDir, 'top-selling-styled.xlsx'), xlsx2);
    console.log('Wrote top-selling-styled.xlsx');

    console.log('All styled reports written to', outDir);
  } catch (e) {
    console.error('Failed to write styled reports:', e);
    process.exit(1);
  }
})();

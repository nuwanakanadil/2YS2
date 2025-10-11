const fs = require('fs');
const path = require('path');
const ExportService = require('../services/exportService');

(async ()=>{
  try {
    const outDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const sampleWaste = {
      summary: { totalExpiredQuantity: 265, totalWasteValue: 63150, totalExpirationEvents: 23 },
      items: [
        { _id: { itemName: 'Grilled Chicken Caesar Salad', category: 'Breakfast & Brunch Items' }, totalExpired: 95, totalWasteValue: 26125, expirationEvents: 7, wastePercentage: 55.88 },
        { _id: { itemName: 'Breakfast Burrito', category: 'Breakfast & Brunch Items' }, totalExpired: 42, totalWasteValue: 16800, expirationEvents: 3, wastePercentage: 47.19 },
        { _id: { itemName: 'Turkey & Swiss', category: 'Breakfast & Brunch Items' }, totalExpired: 34, totalWasteValue: 6800, expirationEvents: 4, wastePercentage: 89.47 }
      ]
    };

    const topSelling = [
      { _id: { itemName: 'Chicken Roll', category: 'Sandwiches & Savory Meals' }, totalSold: 120, totalRevenue: 24000, avgSaleSize: 2 },
      { _id: { itemName: 'Pasta Carbonara', category: 'Pasta' }, totalSold: 95, totalRevenue: 19000, avgSaleSize: 1.9 }
    ];

    const leastUsed = [
      { _id: { itemName: 'Veg Kottu', category: 'Sri Lankan' }, currentStock: 5, currentValue: 450, totalUsage: 10, lastUsed: null },
    ];

    const pdf1 = await ExportService.generatePDF(sampleWaste, 'Waste Analysis');
    fs.writeFileSync(path.join(outDir, 'waste-analysis-html.pdf'), pdf1);
    console.log('Wrote waste-analysis-html.pdf', pdf1.length);

    const pdf2 = await ExportService.generatePDF(topSelling, 'Top Selling Items');
    fs.writeFileSync(path.join(outDir, 'top-selling-html.pdf'), pdf2);
    console.log('Wrote top-selling-html.pdf', pdf2.length);

    const pdf3 = await ExportService.generatePDF(leastUsed, 'Least Used Items');
    fs.writeFileSync(path.join(outDir, 'least-used-html.pdf'), pdf3);
    console.log('Wrote least-used-html.pdf', pdf3.length);

    console.log('All HTML-based PDFs generated in', outDir);
  } catch (e) {
    console.error('Failed to generate HTML reports:', e);
    process.exit(1);
  }
})();

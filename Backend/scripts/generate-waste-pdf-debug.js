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

    console.log('Generating waste PDF...');
    const pdf = await ExportService.generatePDF(sampleWaste, 'Waste Analysis');
    const out = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
    const fn = path.join(out, 'debug-waste.pdf');
    fs.writeFileSync(fn, pdf);
    console.log('Wrote', fn, 'size', pdf.length);
  } catch (e) {
    console.error('Error generating waste PDF debug:', e);
    process.exit(1);
  }
})();

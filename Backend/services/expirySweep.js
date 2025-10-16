const cron = require('node-cron');
const Inventory = require('../models/Inventory');
const StockUsage = require('../models/StockUsage');

// Normalize a date string (YYYY-MM-DD) to end-of-day UTC Date object
function normalizeDateToEndOfDayUTC(dateStr) {
  // dateStr expected format YYYY-MM-DD
  const d = new Date(dateStr + 'T23:59:59.999Z');
  if (isNaN(d.getTime())) return null;
  return d;
}

async function runExpirySweep({ notify = false, logger = console } = {}) {
  logger.log('Running expiry sweep...');
  try {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find expired
    const expired = await Inventory.find({ expirationDate: { $lte: now } });
    // Find expiring soon (within 3 days, but not expired)
    const expiringSoon = await Inventory.find({ expirationDate: { $gt: now, $lte: threeDaysFromNow } });

    // For now we just log counts — this is where you could send emails, push notifications, or create DB alerts
    logger.log(`Expiry sweep results: expired=${expired.length}, expiringSoon=${expiringSoon.length}`);

    const alerts = [];
    expired.forEach(item => {
      alerts.push({ type: 'expired', itemId: item._id, itemName: item.name, expiredOn: item.expirationDate });
    });
    expiringSoon.forEach(item => {
      alerts.push({ type: 'expiring-soon', itemId: item._id, itemName: item.name, expiresOn: item.expirationDate });
    });

    // Log expired items as stock usage
    for (const item of expired) {
      if (item.quantity > 0) {
        await StockUsage.logStockChange({
          inventoryItem: item._id,
          itemName: item.name,
          category: item.category,
          changeType: 'EXPIRED',
          quantityChanged: -item.quantity,
          previousQuantity: item.quantity,
          newQuantity: 0,
          unitPrice: item.price,
          reason: `Expired on ${item.expirationDate.toDateString()}`
        });
        
        // Set expired items quantity to 0
        await Inventory.findByIdAndUpdate(item._id, { quantity: 0 });
      }
    }

    if (notify && alerts.length) {
      // Placeholder: integrate with email/SMS/push provider here
      logger.log('Notify: sending alerts (placeholder)', alerts.slice(0, 10));
    }

    return { expiredCount: expired.length, expiringSoonCount: expiringSoon.length, alerts };
  } catch (err) {
    logger.error('Error running expiry sweep', err);
    throw err;
  }
}

// Schedule a cron job to run once daily at 02:00 UTC (adjust as needed)
function scheduleDailySweep() {
  // cron schedule: minute hour dayOfMonth month dayOfWeek
  // run daily at 02:00
  cron.schedule('0 2 * * *', async () => {
    try {
      await runExpirySweep({ notify: true });
    } catch (err) {
      console.error('Scheduled expiry sweep failed', err);
    }
  }, { timezone: 'UTC' });
}

module.exports = { normalizeDateToEndOfDayUTC, runExpirySweep, scheduleDailySweep };

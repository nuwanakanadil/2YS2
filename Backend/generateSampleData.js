const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Simple CLI arg parsing (no external deps)
const argv = process.argv.slice(2).reduce((acc, cur) => {
  const [k, v] = cur.split('=');
  const key = k.replace(/^--/, '');
  acc[key] = v === undefined ? true : v;
  return acc;
}, {});

const opt = {
  count: Number(argv.count || argv.c || 100),
  expiredCount: Number(argv.expiredCount || argv.e || 10),
  itemsLimit: Number(argv.itemsLimit || argv.items || 10),
  // startDate and endDate may be ISO strings; fallback to last N days
  startDate: argv.startDate || argv.s || null,
  endDate: argv.endDate || argv.end || argv.en || null,
  syncInventory: argv.syncInventory === 'true' || argv.sync === 'true' || argv.sync === true || false,
  dryRun: argv.dryRun === 'true' || argv.dry === 'true' || argv.dry === true || false,
};

if (opt.dryRun) console.log('Running in dry-run mode: no DB writes will be performed');
if (opt.syncInventory) console.log('Inventory sync enabled: inventory quantities will be updated for STOCK_IN/STOCK_OUT events');

// If running dry-run and no MONGODB_URI is provided, we'll operate in mock mode
const mockMode = opt.dryRun && !process.env.MONGODB_URI;
if (mockMode) {
  console.log('Dry-run + no MONGODB_URI detected — running in mock mode (no DB access).');
  if (opt.syncInventory) console.log('Note: --syncInventory requested but will be ignored in mock mode.');
}

// Import models
require('./models/Inventory');
require('./models/StockUsage');
const Inventory = require('./models/Inventory');
const StockUsage = require('./models/StockUsage');

// Connect to MongoDB (no-op in mockMode)
const connectDB = async () => {
  if (mockMode) return;
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for testing');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Generate sample stock usage data
const generateSampleData = async () => {
  try {
    console.log('Starting to generate sample stock usage data...');
    console.log('Options:', opt);

    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      console.log(`Usage: node generateSampleData.js [--count=NUM] [--expiredCount=NUM] [--itemsLimit=NUM] [--startDate=ISO] [--endDate=ISO] [--syncInventory=true|false] [--dryRun=true|false]`);
      return;
    }

    // Get existing inventory items (limit configurable)
    let items;
    if (mockMode) {
      // Create mock items for dry-run without DB
      items = Array.from({ length: opt.itemsLimit }).map(() => ({
        _id: new mongoose.Types.ObjectId(),
        name: `Sample Item ${Math.random().toString(36).slice(2, 7)}`,
        category: 'Mock Category',
        quantity: Math.floor(Math.random() * 100) + 10,
        price: Math.floor(Math.random() * 500) + 50,
      }));
      console.log(`Mock mode: generated ${items.length} fake inventory items (limit ${opt.itemsLimit})`);
    } else {
      items = await Inventory.find({}).limit(opt.itemsLimit);
      console.log(`Found ${items.length} inventory items (limit ${opt.itemsLimit})`);

      if (items.length === 0) {
        console.log('No inventory items found. Please add some inventory items first.');
        return;
      }
    }

    const changeTypes = ['STOCK_IN', 'STOCK_OUT', 'SOLD', 'EXPIRED', 'DAMAGED'];
    const reasons = ['Restock', 'Order fulfillment', 'Customer purchase', 'Expiry removal', 'Damaged goods', 'Adjustment'];

    // Determine date range
    const now = new Date();
    const endDate = opt.endDate ? new Date(opt.endDate) : now;
    const startDate = opt.startDate ? new Date(opt.startDate) : new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    const usageEntries = [];

    for (let i = 0; i < opt.count; i++) {
      const item = items[Math.floor(Math.random() * items.length)];
      const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
      const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

      // Generate realistic quantity changes
      let quantityChanged;
      switch (changeType) {
        case 'STOCK_IN':
          quantityChanged = Math.floor(Math.random() * 50) + 10; // 10-60
          break;
        case 'STOCK_OUT':
        case 'SOLD':
          quantityChanged = -(Math.floor(Math.random() * 20) + 1); // -1 to -20
          break;
        case 'EXPIRED':
        case 'DAMAGED':
          quantityChanged = -(Math.floor(Math.random() * 10) + 1); // -1 to -10
          break;
        default:
          quantityChanged = Math.floor(Math.random() * 20) - 10; // -10 to +10
      }

      // Use actual current inventory quantity if available
      const prevQtyFromDB = item.quantity !== undefined && item.quantity !== null ? Number(item.quantity) : Math.max(0, Math.floor(Math.random() * 100) + 10);
      const previousQuantity = prevQtyFromDB;
      const newQuantity = Math.max(0, previousQuantity + quantityChanged);

      usageEntries.push({
        inventoryItem: item._id,
        itemName: item.name,
        category: item.category,
        changeType: changeType,
        quantityChanged: quantityChanged,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        unitPrice: item.price,
        totalValue: quantityChanged * item.price,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        timestamp: randomDate,
        notes: `Sample data for ${changeType.toLowerCase()}`
      });

      // If syncInventory enabled, update the Inventory.quantity for STOCK_IN/STOCK_OUT
      if (opt.syncInventory && !opt.dryRun && (changeType === 'STOCK_IN' || changeType === 'STOCK_OUT' || changeType === 'SOLD')) {
        try {
          const delta = quantityChanged;
          // Update inventory atomically
          await Inventory.updateOne({ _id: item._id }, { $inc: { quantity: delta } });
        } catch (err) {
          console.error('Failed to update inventory quantity for item', item._id, err);
        }
      }
    }

    // Insert all usage entries (skip on dryRun)
    if (opt.dryRun) {
      console.log(`Dry-run: would generate ${usageEntries.length} sample stock usage entries`);
    } else {
      await StockUsage.insertMany(usageEntries);
      console.log(`Generated ${usageEntries.length} sample stock usage entries`);
    }

    // Generate some specific expired items data (count configurable)
    const expiredEntries = [];
    for (let i = 0; i < opt.expiredCount; i++) {
      const item = items[Math.floor(Math.random() * items.length)];
      // Pick an expired timestamp — prefer within provided start/end range if available, else within last 10 days
      let expiredDate;
      if (opt.startDate && opt.endDate) {
        expiredDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      } else {
        expiredDate = new Date(now.getTime() - Math.random() * (10 * 24 * 60 * 60 * 1000)); // Last 10 days
      }

      const qtyRemoved = -(Math.floor(Math.random() * 15) + 5); // -5 to -20

      expiredEntries.push({
        inventoryItem: item._id,
        itemName: item.name,
        category: item.category,
        changeType: 'EXPIRED',
        quantityChanged: qtyRemoved,
        previousQuantity: Math.max(0, item.quantity || Math.floor(Math.random() * 30) + 10),
        newQuantity: Math.max(0, (item.quantity || 0) + qtyRemoved),
        unitPrice: item.price,
        totalValue: qtyRemoved * item.price,
        reason: 'Expired - removed from inventory',
        timestamp: expiredDate,
        notes: 'Automatically generated expired item removal'
      });

      if (opt.syncInventory && !opt.dryRun) {
        try {
          // Decrease inventory to reflect expiry removal
          await Inventory.updateOne({ _id: item._id }, { $inc: { quantity: qtyRemoved } });
        } catch (err) {
          console.error('Failed to update inventory for expired item', item._id, err);
        }
      }
    }

    if (opt.dryRun) {
      console.log(`Dry-run: would generate ${expiredEntries.length} expired item entries`);
    } else {
      await StockUsage.insertMany(expiredEntries);
      console.log(`Generated ${expiredEntries.length} expired item entries`);
    }

    console.log('Sample data generation completed!');

  } catch (error) {
    console.error('Error generating sample data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await generateSampleData();
  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
};

// Run the script
main().catch(console.error);

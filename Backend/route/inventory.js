const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockUsage = require('../models/StockUsage');
const upload = require('../middleware/inventoryImageUpload');

// Add inventory item with image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
  // Debugging: log incoming content-type, body and file info
  console.log('POST /api/inventory content-type:', req.headers['content-type']);
  console.log('POST /api/inventory body:', req.body);
  console.log('POST /api/inventory file:', req.file && { originalname: req.file.originalname, filename: req.file.filename, size: req.file.size });

  const { name, description } = req.body;
  let { quantity, price, category, lowStockThreshold, expirationDate, unit, supplier, batchNumber } = req.body;
  // Basic validation with clearer messages to help client debugging
  if (!name) return res.status(400).json({ error: 'Missing required field: name' });
  if (quantity === undefined || quantity === null || quantity === '') return res.status(400).json({ error: 'Missing required field: quantity' });
  if (price === undefined || price === null || price === '') return res.status(400).json({ error: 'Missing required field: price' });

  // normalize numeric fields
  quantity = Number(quantity);
  price = Number(price);
  lowStockThreshold = lowStockThreshold !== undefined ? Number(lowStockThreshold) : 10;

  const image = req.file ? `/inventory-images/${req.file.filename}` : '';

  // Normalize expiration date to end-of-day UTC to make comparisons inclusive
  let normalizedExp;
  if (expirationDate) {
    const { normalizeDateToEndOfDayUTC } = require('../services/expirySweep');
    normalizedExp = normalizeDateToEndOfDayUTC(expirationDate);
    if (!normalizedExp) return res.status(400).json({ error: 'Invalid expirationDate format, expected YYYY-MM-DD' });
  }

  const item = new Inventory({ 
    name, 
    description, 
    quantity, 
    price, 
    image, 
    category,
    lowStockThreshold: isNaN(lowStockThreshold) ? 10 : lowStockThreshold,
    expirationDate: normalizedExp,
    unit: unit || 'pieces',
    supplier,
    batchNumber
  });
  await item.save();
  
  // Log initial stock entry
  await StockUsage.logStockChange({
    inventoryItem: item._id,
    itemName: item.name,
    category: item.category,
    changeType: 'STOCK_IN',
    quantityChanged: item.quantity,
    previousQuantity: 0,
    newQuantity: item.quantity,
    unitPrice: item.price,
    reason: 'Initial stock entry',
    userId: req.user?._id // if authentication is available
  });
  
  res.status(201).json(item);
  } catch (err) {
  console.error('Error in POST /api/inventory:', err);
  res.status(400).json({ error: err.message });
  }
});

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    
    let items = await Inventory.find(filter);
    
    // Filter by stock status if provided
    if (req.query.stockStatus) {
      const statusFilter = req.query.stockStatus;
      items = items.filter(item => {
        switch (statusFilter) {
          case 'low-stock':
            return item.isLowStock && !item.isExpired;
          case 'out-of-stock':
            return item.quantity === 0;
          case 'expired':
            return item.isExpired;
          case 'expiring-soon':
            return item.isExpiringSoon;
          case 'in-stock':
            return !item.isLowStock && !item.isExpired && item.quantity > 0;
          default:
            return true;
        }
      });
    }
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single inventory item
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const oldItem = await Inventory.findById(itemId);
    if (!oldItem) return res.status(404).json({ error: 'Item not found' });
    
    const updates = { ...req.body };

    // numeric normalization
    if (updates.quantity !== undefined) updates.quantity = Number(updates.quantity);
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.lowStockThreshold !== undefined) updates.lowStockThreshold = Number(updates.lowStockThreshold);

    // Handle date conversion for expirationDate and normalize to end-of-day UTC
    if (updates.expirationDate) {
      const { normalizeDateToEndOfDayUTC } = require('../services/expirySweep');
      const d = normalizeDateToEndOfDayUTC(updates.expirationDate);
      if (!d) return res.status(400).json({ error: 'Invalid expirationDate format, expected YYYY-MM-DD' });
      updates.expirationDate = d;
    }

    const item = await Inventory.findByIdAndUpdate(itemId, updates, { new: true });
    
    // Log stock change if quantity was updated
    if (updates.quantity !== undefined && updates.quantity !== oldItem.quantity) {
      const quantityChange = updates.quantity - oldItem.quantity;
      const changeType = quantityChange > 0 ? 'STOCK_IN' : 'STOCK_OUT';
      
      await StockUsage.logStockChange({
        inventoryItem: item._id,
        itemName: item.name,
        category: item.category,
        changeType: changeType,
        quantityChanged: quantityChange,
        previousQuantity: oldItem.quantity,
        newQuantity: item.quantity,
        unitPrice: item.price,
        reason: 'Manual adjustment',
        userId: req.user?._id
      });
    }
    
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET allowed inventory categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = Inventory.CATEGORIES || [];
    res.json({ categories });
  } catch (err) {
    console.error('Error fetching inventory categories', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET stock status options
router.get('/statuses/list', (req, res) => {
  try {
    const statuses = Inventory.STOCK_STATUSES || [];
    res.json({ statuses });
  } catch (err) {
    console.error('Error fetching stock statuses', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET unit options
router.get('/units/list', (req, res) => {
  try {
    const units = Inventory.UNITS || [];
    res.json({ units });
  } catch (err) {
    console.error('Error fetching units', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET stock monitoring dashboard data
router.get('/monitoring/dashboard', async (req, res) => {
  try {
    const items = await Inventory.find({});
    
    const stats = {
      totalItems: items.length,
      lowStockItems: items.filter(item => item.isLowStock && !item.isExpired).length,
      outOfStockItems: items.filter(item => item.quantity === 0).length,
      expiredItems: items.filter(item => item.isExpired).length,
      expiringSoonItems: items.filter(item => item.isExpiringSoon).length,
      inStockItems: items.filter(item => !item.isLowStock && !item.isExpired && item.quantity > 0).length,
      totalValue: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
    
    const alerts = [];
    
    // Add low stock alerts
    items.filter(item => item.isLowStock && !item.isExpired).forEach(item => {
      alerts.push({
        type: 'low-stock',
        severity: 'warning',
        itemId: item._id,
        itemName: item.name,
        message: `${item.name} is running low (${item.quantity} ${item.unit} remaining)`,
        quantity: item.quantity,
        threshold: item.lowStockThreshold
      });
    });
    
    // Add expiration alerts
    items.filter(item => item.isExpired).forEach(item => {
      alerts.push({
        type: 'expired',
        severity: 'critical',
        itemId: item._id,
        itemName: item.name,
        message: `${item.name} has expired (expired ${Math.abs(item.daysUntilExpiry)} days ago)`,
        expirationDate: item.expirationDate,
        daysOverdue: Math.abs(item.daysUntilExpiry)
      });
    });
    
    // Add expiring soon alerts
    items.filter(item => item.isExpiringSoon).forEach(item => {
      alerts.push({
        type: 'expiring-soon',
        severity: 'warning',
        itemId: item._id,
        itemName: item.name,
        message: `${item.name} expires in ${item.daysUntilExpiry} days`,
        expirationDate: item.expirationDate,
        daysUntilExpiry: item.daysUntilExpiry
      });
    });
    
    // Add out of stock alerts
    items.filter(item => item.quantity === 0).forEach(item => {
      alerts.push({
        type: 'out-of-stock',
        severity: 'critical',
        itemId: item._id,
        itemName: item.name,
        message: `${item.name} is out of stock`
      });
    });
    
    // Sort alerts by severity (critical first)
    alerts.sort((a, b) => {
      const severityOrder = { 'critical': 0, 'warning': 1, 'info': 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    res.json({ stats, alerts });
  } catch (err) {
    console.error('Error fetching monitoring data', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST trigger for manual expiry sweep (admin use)
router.post('/monitoring/sweep', async (req, res) => {
  try {
    // Lazy-load service to avoid circular deps
    const { runExpirySweep } = require('../services/expirySweep');
    const result = await runExpirySweep({ notify: req.body.notify === true });
    res.json({ message: 'Sweep completed', result });
  } catch (err) {
    console.error('Error running manual expiry sweep', err);
    res.status(500).json({ error: 'Sweep failed' });
  }
});

// GET items by specific alert type
router.get('/monitoring/alerts/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let items = await Inventory.find({});
    
    switch (type) {
      case 'low-stock':
        items = items.filter(item => item.isLowStock && !item.isExpired);
        break;
      case 'out-of-stock':
        items = items.filter(item => item.quantity === 0);
        break;
      case 'expired':
        items = items.filter(item => item.isExpired);
        break;
      case 'expiring-soon':
        items = items.filter(item => item.isExpiringSoon);
        break;
      default:
        return res.status(400).json({ error: 'Invalid alert type' });
    }
    
    res.json(items);
  } catch (err) {
    console.error('Error fetching alert items', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

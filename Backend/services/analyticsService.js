const StockUsage = require('../models/StockUsage');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');

class AnalyticsService {
  // Get date range based on period
  static getDateRange(period) {
    const now = new Date();
    let startDate, endDate = now;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    return { startDate, endDate };
  }

  // Generate stock usage report
  static async generateStockUsageReport(period = 'weekly', category = null, itemId = null) {
    const { startDate, endDate } = this.getDateRange(period);
    
    const matchConditions = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    if (category) matchConditions.category = category;
    if (itemId) matchConditions.inventoryItem = new mongoose.Types.ObjectId(itemId);

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: {
            itemId: '$inventoryItem',
            itemName: '$itemName',
            category: '$category',
            changeType: '$changeType'
          },
          totalQuantity: { $sum: '$quantityChanged' },
          totalValue: { $sum: '$totalValue' },
          occurrences: { $sum: 1 },
          avgQuantityPerChange: { $avg: '$quantityChanged' }
        }
      },
      {
        $group: {
          _id: {
            itemId: '$_id.itemId',
            itemName: '$_id.itemName',
            category: '$_id.category'
          },
          changes: {
            $push: {
              changeType: '$_id.changeType',
              totalQuantity: '$totalQuantity',
              totalValue: '$totalValue',
              occurrences: '$occurrences',
              avgQuantityPerChange: '$avgQuantityPerChange'
            }
          },
          totalMovement: { $sum: { $abs: '$totalQuantity' } },
          netQuantityChange: { $sum: '$totalQuantity' },
          totalValueImpact: { $sum: '$totalValue' }
        }
      },
      { $sort: { totalMovement: -1 } }
    ];

    const results = await StockUsage.aggregate(pipeline);
    
    return {
      period,
      dateRange: { startDate, endDate },
      category,
      itemId,
      items: results,
      summary: {
        totalItems: results.length,
        totalMovement: results.reduce((sum, item) => sum + item.totalMovement, 0),
        totalValueImpact: results.reduce((sum, item) => sum + item.totalValueImpact, 0)
      }
    };
  }

  // Get top selling items
  static async getTopSellingItems(period = 'weekly', limit = 10) {
    const { startDate, endDate } = this.getDateRange(period);

    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          changeType: { $in: ['SOLD', 'STOCK_OUT'] }
        }
      },
      {
        $group: {
          _id: {
            itemId: '$inventoryItem',
            itemName: '$itemName',
            category: '$category'
          },
          totalSold: { $sum: { $abs: '$quantityChanged' } },
          totalRevenue: { $sum: { $abs: '$totalValue' } },
          salesCount: { $sum: 1 },
          avgSaleSize: { $avg: { $abs: '$quantityChanged' } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ];

    return await StockUsage.aggregate(pipeline);
  }

  // Get least used items
  static async getLeastUsedItems(period = 'monthly', limit = 10) {
    const { startDate, endDate } = this.getDateRange(period);

    // Get all inventory items
    const allItems = await Inventory.find({}, { _id: 1, name: 1, category: 1, quantity: 1, price: 1 });
    
    // Get usage data for the period
    const usageData = await StockUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$inventoryItem',
          totalUsage: { $sum: { $abs: '$quantityChanged' } },
          lastUsed: { $max: '$timestamp' }
        }
      }
    ]);

    // Create usage map
    const usageMap = {};
    usageData.forEach(usage => {
      usageMap[usage._id.toString()] = usage;
    });

    // Combine with all items and find least used
    const itemsWithUsage = allItems.map(item => {
      const usage = usageMap[item._id.toString()];
      return {
        _id: { itemId: item._id, itemName: item.name, category: item.category },
        currentStock: item.quantity,
        currentValue: item.quantity * item.price,
        totalUsage: usage ? usage.totalUsage : 0,
        lastUsed: usage ? usage.lastUsed : null,
        daysSinceLastUse: usage && usage.lastUsed 
          ? Math.floor((new Date() - usage.lastUsed) / (1000 * 60 * 60 * 24))
          : null
      };
    });

    return itemsWithUsage
      .sort((a, b) => a.totalUsage - b.totalUsage)
      .slice(0, limit);
  }

  // Analyze waste due to expired products
  static async analyzeWaste(period = 'monthly') {
    const { startDate, endDate } = this.getDateRange(period);

    const wasteAnalysis = await StockUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          changeType: 'EXPIRED'
        }
      },
      {
        $group: {
          _id: {
            itemId: '$inventoryItem',
            itemName: '$itemName',
            category: '$category'
          },
          totalExpired: { $sum: { $abs: '$quantityChanged' } },
          totalWasteValue: { $sum: { $abs: '$totalValue' } },
          expirationEvents: { $sum: 1 },
          avgExpiredPerEvent: { $avg: { $abs: '$quantityChanged' } }
        }
      },
      {
        $lookup: {
          from: 'inventories',
          localField: '_id.itemId',
          foreignField: '_id',
          as: 'currentInventory'
        }
      },
      {
        $addFields: {
          currentStock: { $arrayElemAt: ['$currentInventory.quantity', 0] },
          wastePercentage: {
            $multiply: [
              { $divide: ['$totalExpired', { $add: ['$totalExpired', { $arrayElemAt: ['$currentInventory.quantity', 0] }] }] },
              100
            ]
          }
        }
      },
      { $sort: { totalWasteValue: -1 } }
    ]);

    const summary = wasteAnalysis.reduce((acc, item) => ({
      totalItems: acc.totalItems + 1,
      totalExpiredQuantity: acc.totalExpiredQuantity + item.totalExpired,
      totalWasteValue: acc.totalWasteValue + item.totalWasteValue,
      totalExpirationEvents: acc.totalExpirationEvents + item.expirationEvents
    }), { totalItems: 0, totalExpiredQuantity: 0, totalWasteValue: 0, totalExpirationEvents: 0 });

    // Get category-wise waste analysis
    const categoryWaste = await StockUsage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          changeType: 'EXPIRED'
        }
      },
      {
        $group: {
          _id: '$category',
          totalExpired: { $sum: { $abs: '$quantityChanged' } },
          totalWasteValue: { $sum: { $abs: '$totalValue' } },
          itemCount: { $addToSet: '$inventoryItem' }
        }
      },
      {
        $addFields: {
          uniqueItemCount: { $size: '$itemCount' }
        }
      },
      { $sort: { totalWasteValue: -1 } }
    ]);

    return {
      period,
      dateRange: { startDate, endDate },
      items: wasteAnalysis,
      categoryBreakdown: categoryWaste,
      summary: {
        ...summary,
        avgWasteValuePerItem: summary.totalItems > 0 ? summary.totalWasteValue / summary.totalItems : 0,
        avgExpiredPerEvent: summary.totalExpirationEvents > 0 ? summary.totalExpiredQuantity / summary.totalExpirationEvents : 0
      }
    };
  }

  // Get comprehensive dashboard data
  static async getDashboardAnalytics(period = 'weekly') {
    const [stockUsage, topSelling, leastUsed, wasteAnalysis] = await Promise.all([
      this.generateStockUsageReport(period),
      this.getTopSellingItems(period, 5),
      this.getLeastUsedItems(period, 5),
      this.analyzeWaste(period)
    ]);

    return {
      period,
      stockUsage,
      topSelling,
      leastUsed,
      wasteAnalysis,
      generatedAt: new Date()
    };
  }

  // Get time series data for charts
  static async getTimeSeriesData(period = 'weekly', groupBy = 'day') {
    const { startDate, endDate } = this.getDateRange(period);

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'day':
        dateFormat = { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
        break;
      case 'week':
        dateFormat = { 
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
        break;
      case 'month':
        dateFormat = { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        };
        break;
      default:
        dateFormat = { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
    }

    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: dateFormat,
            changeType: '$changeType'
          },
          totalQuantity: { $sum: { $abs: '$quantityChanged' } },
          totalValue: { $sum: { $abs: '$totalValue' } },
          occurrences: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          changes: {
            $push: {
              changeType: '$_id.changeType',
              totalQuantity: '$totalQuantity',
              totalValue: '$totalValue',
              occurrences: '$occurrences'
            }
          },
          totalActivity: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return await StockUsage.aggregate(pipeline);
  }
}

module.exports = AnalyticsService;

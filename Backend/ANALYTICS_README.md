# Inventory Analytics & Reporting System

## Overview

A comprehensive analytics and reporting system for inventory management with real-time tracking, usage analysis, and waste monitoring.

## Features Implemented

### 📊 Analytics Dashboard
- **Daily/Weekly/Monthly/Yearly** reporting periods
- **Real-time data** with auto-refresh capability
- **Comprehensive overview** with key metrics and trends

### 📈 Stock Usage Reports
- Track all inventory movements (IN, OUT, SOLD, EXPIRED, etc.)
- View detailed usage patterns by item and category
- Analyze quantity changes and value impacts
- Time-series data for trend analysis

### 🏆 Top Selling Items Analysis
- Identify best-performing products
- Track sales volume and revenue
- Calculate average sale sizes
- Compare performance across categories

### 📉 Least Used Items Identification
- Find slow-moving inventory
- Calculate days since last usage
- Assess tied-up capital in unused stock
- Optimize inventory levels

### ⚠️ Waste Analysis & Monitoring
- Track expired products and waste value
- Analyze waste patterns by category
- Calculate waste percentages
- Monitor expiration events

### 📄 Export Capabilities
- **PDF Reports**: Professional formatted reports
- **Excel Exports**: Detailed spreadsheets for analysis
- Available for all report types
- Automatic file naming with timestamps

## API Endpoints

### Analytics Endpoints

```
GET /api/analytics/dashboard?period=weekly
GET /api/analytics/stock-usage?period=weekly&category=category&itemId=id
GET /api/analytics/top-selling?period=weekly&limit=10
GET /api/analytics/least-used?period=monthly&limit=10
GET /api/analytics/waste-analysis?period=monthly
GET /api/analytics/time-series?period=weekly&groupBy=day
```

### Export Endpoints

```
GET /api/analytics/export/stock-usage/pdf?period=weekly
GET /api/analytics/export/stock-usage/excel?period=weekly
GET /api/analytics/export/top-selling/pdf?period=weekly
GET /api/analytics/export/top-selling/excel?period=weekly
GET /api/analytics/export/least-used/pdf?period=monthly
GET /api/analytics/export/least-used/excel?period=monthly
GET /api/analytics/export/waste-analysis/pdf?period=monthly
GET /api/analytics/export/waste-analysis/excel?period=monthly
```

## Database Models

### StockUsage Model
Tracks all inventory movements with detailed logging:

```javascript
{
  inventoryItem: ObjectId,    // Reference to inventory item
  itemName: String,           // Denormalized for reporting
  category: String,           // Denormalized for reporting
  changeType: String,         // STOCK_IN, STOCK_OUT, SOLD, EXPIRED, etc.
  quantityChanged: Number,    // Positive for IN, negative for OUT
  previousQuantity: Number,   // Stock before change
  newQuantity: Number,        // Stock after change
  unitPrice: Number,          // Price per unit
  totalValue: Number,         // quantityChanged * unitPrice
  reason: String,             // Optional reason
  orderId: ObjectId,          // Reference to order if applicable
  userId: ObjectId,           // User who made the change
  timestamp: Date,            // When the change occurred
  notes: String               // Additional notes
}
```

## Services

### AnalyticsService
Core analytics engine with methods for:
- `generateStockUsageReport()` - Comprehensive usage analysis
- `getTopSellingItems()` - Best performers identification
- `getLeastUsedItems()` - Slow movers analysis
- `analyzeWaste()` - Waste pattern analysis
- `getDashboardAnalytics()` - Combined dashboard data
- `getTimeSeriesData()` - Chart data generation

### ExportService
Report generation service with:
- `generatePDF()` - Professional PDF reports
- `generateExcel()` - Detailed Excel spreadsheets
- Customizable formatting and styling
- Automatic header and summary generation

## Frontend Components

### Analytics Dashboard (`/admin/analytics`)
- Interactive period selection (daily/weekly/monthly/yearly)
- Real-time data refresh
- Comprehensive stat cards
- Detailed tables for each report type
- Export buttons for PDF and Excel
- Responsive design

### Features:
- **Period Selection**: Switch between different time ranges
- **Export Integration**: Direct download links for reports
- **Data Visualization**: Clear tables and statistics
- **Real-time Updates**: Automatic data refresh
- **Responsive Design**: Works on all devices

## Usage Instructions

### 1. Access Analytics
Navigate to the admin panel and select "Analytics" from the menu.

### 2. Select Time Period
Choose from Daily, Weekly, Monthly, or Yearly reporting periods.

### 3. View Reports
Browse through different sections:
- Overview statistics
- Top selling items
- Least used items
- Waste analysis

### 4. Export Reports
Click "Export PDF" or "Export Excel" buttons to download formatted reports.

### 5. Generate Sample Data (For Testing)
Run the sample data generator to populate analytics:

```bash
cd Backend
node generateSampleData.js
```

## Technical Implementation

### Automatic Stock Tracking
The system automatically logs stock changes when:
- New items are added to inventory
- Item quantities are updated
- Items expire (via scheduled sweep)
- Manual adjustments are made

### Performance Optimization
- **Indexing**: Optimized database indexes for fast queries
- **Aggregation**: MongoDB aggregation pipelines for complex analytics
- **Denormalization**: Item names and categories stored for fast reporting
- **Caching**: Efficient data retrieval patterns

### Error Handling
- Comprehensive error handling in all API endpoints
- Graceful fallbacks for missing data
- User-friendly error messages
- Logging for debugging

## Dependencies Added

### Backend
- `pdfkit`: PDF generation
- `exceljs`: Excel file generation
- `node-cron`: Scheduled tasks (existing)

### Frontend
- React hooks for state management
- Responsive design components
- Export functionality integration

## Testing

### 1. Generate Sample Data
```bash
cd Backend
node generateSampleData.js
```

### 2. Test API Endpoints
Use tools like Postman or curl to test:
```bash
curl http://localhost:5000/api/analytics/dashboard?period=weekly
```

### 3. Test Exports
Visit export URLs in browser to download files:
```
http://localhost:5000/api/analytics/export/stock-usage/pdf?period=weekly
```

## Future Enhancements

### Potential Improvements
- **Charts & Graphs**: Add visual charts using Chart.js or Recharts
- **Email Reports**: Scheduled email delivery of reports
- **Custom Date Ranges**: Allow custom from/to date selection
- **Advanced Filters**: More granular filtering options
- **Predictive Analytics**: Forecast demand and optimal stock levels
- **Mobile App**: Dedicated mobile interface
- **API Rate Limiting**: Implement rate limiting for export endpoints

### Integration Possibilities
- **External Systems**: Connect with ERP or accounting systems
- **Business Intelligence**: Export to BI tools like Tableau
- **Notifications**: Push notifications for critical insights
- **Machine Learning**: Implement ML-based recommendations

## Support

For questions or issues with the analytics system:
1. Check the console for error messages
2. Verify database connection and data availability
3. Ensure all dependencies are installed
4. Review API endpoint responses for debugging

## Security Notes

- All analytics endpoints should be protected with admin authentication
- Export functionality generates temporary files - consider cleanup
- Sensitive data should be sanitized in reports
- Rate limiting recommended for export endpoints

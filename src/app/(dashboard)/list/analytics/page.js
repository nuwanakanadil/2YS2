"use client";
import React, { useEffect, useState } from 'react';
import formatCurrency from '@/lib/currency';

const API_URL = 'http://localhost:5000/api/analytics';

const StatCard = ({ title, value, subtitle, trend, color = 'amber', icon }) => {
  const colorClasses = {
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 text-amber-800',
    green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800',
    red: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-800',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-800',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800',
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800'
  };

  return (
    <div className={`p-8 rounded-2xl border-2 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 ${colorClasses[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          {icon && <div className="text-4xl opacity-70">{icon}</div>}
          <div>
            <p className="text-lg font-semibold opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtitle && <p className="text-sm mt-2 opacity-70">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`text-sm px-3 py-2 rounded-full font-semibold ${trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );
};

const ReportSection = ({ title, children, onExport, icon }) => (
  <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
    <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {icon && <div className="text-3xl text-white opacity-80">{icon}</div>}
          <h3 className="text-2xl font-bold text-white">{title}</h3>
        </div>
        {onExport && (
          <div className="flex gap-3">
            <button
              onClick={() => onExport('pdf')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => onExport('excel')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 11-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Excel
            </button>
          </div>
        )}
      </div>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [analytics, setAnalytics] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/dashboard?period=${period}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const handleExport = (reportType, format) => {
    const url = `${API_URL}/export/${reportType}/${format}?period=${period}`;
    window.open(url, '_blank');
  };

  // use shared LKR formatter

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
            <p className="mt-4 text-xl text-amber-700 font-medium">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="text-red-800 text-lg font-medium">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-amber-700 mt-2 text-lg">Comprehensive inventory analysis and reporting</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border-2 border-amber-200 rounded-xl px-4 py-3 bg-white focus:border-amber-500 focus:outline-none text-amber-800 font-medium"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {analytics?.stockUsage?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Items Tracked"
              value={analytics.stockUsage.summary.totalItems}
              color="blue"
              icon="📦"
            />
            <StatCard
              title="Total Movement"
              value={analytics.stockUsage.summary.totalMovement}
              subtitle="units"
              color="purple"
              icon="📊"
            />
            <StatCard
              title="Value Impact"
              value={formatCurrency(analytics.stockUsage.summary.totalValueImpact)}
              color="green"
              icon="💰"
            />
            <StatCard
              title="Waste Value"
              value={formatCurrency(analytics.wasteAnalysis.summary.totalWasteValue)}
              subtitle={`${analytics.wasteAnalysis.summary.totalExpiredQuantity} units expired`}
              color="red"
              icon="⚠️"
            />
          </div>
        )}

        {/* Top Selling Items */}
        <ReportSection 
          title="Top Selling Items" 
          icon="🏆"
          onExport={(format) => handleExport('top-selling', format)}
        >
          {analytics?.topSelling?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                    <th className="text-left py-4 px-6 font-bold text-amber-800">Rank</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-800">Item</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-800">Category</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Units Sold</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Revenue</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Avg Sale Size</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topSelling.slice(0, 10).map((item, index) => (
                    <tr key={index} className="border-b border-amber-100 hover:bg-amber-50 transition-colors duration-150">
                      <td className="py-4 px-6 font-semibold text-amber-700">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-900">{item._id.itemName}</td>
                      <td className="py-4 px-6 text-gray-700">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                          {item._id.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-gray-900">{item.totalSold}</td>
                      <td className="py-4 px-6 text-right font-semibold text-green-700">{formatCurrency(item.totalRevenue)}</td>
                      <td className="py-4 px-6 text-right text-gray-700">{item.avgSaleSize.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-amber-600 text-xl font-medium">No sales data available for the selected period</p>
            </div>
          )}
        </ReportSection>

        {/* Least Used Items */}
        <ReportSection 
          title="Least Used Items" 
          icon="📉"
          onExport={(format) => handleExport('least-used', format)}
        >
          {analytics?.leastUsed?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                    <th className="text-left py-4 px-6 font-bold text-amber-800">Item</th>
                    <th className="text-left py-4 px-6 font-bold text-amber-800">Category</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Current Stock</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Current Value</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Usage</th>
                    <th className="text-right py-4 px-6 font-bold text-amber-800">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.leastUsed.slice(0, 10).map((item, index) => (
                    <tr key={index} className="border-b border-amber-100 hover:bg-amber-50 transition-colors duration-150">
                      <td className="py-4 px-6 font-medium text-gray-900">{item._id.itemName}</td>
                      <td className="py-4 px-6 text-gray-700">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                          {item._id.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-gray-900">{item.currentStock}</td>
                      <td className="py-4 px-6 text-right font-semibold text-green-700">{formatCurrency(item.currentValue)}</td>
                      <td className="py-4 px-6 text-right text-gray-700">{item.totalUsage}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-gray-900 font-medium">
                          {item.lastUsed ? formatDate(item.lastUsed) : 'Never'}
                        </div>
                        {item.daysSinceLastUse && (
                          <div className="text-sm text-orange-600 font-medium">
                            ({item.daysSinceLastUse} days ago)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-amber-600 text-xl font-medium">No usage data available</p>
            </div>
          )}
        </ReportSection>

        {/* Waste Analysis */}
        <ReportSection 
          title="Waste Analysis" 
          icon="🗑️"
          onExport={(format) => handleExport('waste-analysis', format)}
        >
          {analytics?.wasteAnalysis?.items?.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title="Total Expired Items"
                  value={analytics.wasteAnalysis.summary.totalExpiredQuantity}
                  subtitle="units"
                  color="red"
                  icon="⚠️"
                />
                <StatCard
                  title="Total Waste Value"
                  value={formatCurrency(analytics.wasteAnalysis.summary.totalWasteValue)}
                  color="red"
                  icon="💸"
                />
                <StatCard
                  title="Avg Days to Expiry"
                  value={analytics.wasteAnalysis.summary.averageDaysToExpiry || 0}
                  subtitle="days"
                  color="orange"
                  icon="📅"
                />
              <StatCard
                title="Expiration Events"
                value={analytics.wasteAnalysis.summary.totalExpirationEvents}
                subtitle="occurrences"
                color="yellow"
              />
              </div>
            
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                      <th className="text-left py-4 px-6 font-bold text-amber-800">Item</th>
                      <th className="text-left py-4 px-6 font-bold text-amber-800">Category</th>
                      <th className="text-right py-4 px-6 font-bold text-amber-800">Expired Units</th>
                      <th className="text-right py-4 px-6 font-bold text-amber-800">Waste Value</th>
                      <th className="text-right py-4 px-6 font-bold text-amber-800">Events</th>
                      <th className="text-right py-4 px-6 font-bold text-amber-800">Waste %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.wasteAnalysis.items.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b border-amber-100 hover:bg-amber-50 transition-colors duration-150">
                        <td className="py-4 px-6 font-medium text-gray-900">{item._id.itemName}</td>
                        <td className="py-4 px-6 text-gray-700">
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                            {item._id.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-red-600">{item.totalExpired}</td>
                        <td className="py-4 px-6 text-right font-semibold text-red-700">{formatCurrency(item.totalWasteValue)}</td>
                        <td className="py-4 px-6 text-right text-gray-700">{item.expirationEvents}</td>
                        <td className="py-4 px-6 text-right">
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-bold">
                            {item.wastePercentage ? `${item.wastePercentage.toFixed(1)}%` : '0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗑️</div>
              <p className="text-amber-600 text-xl font-medium">No waste data available for the selected period</p>
            </div>
          )}
        </ReportSection>

        {/* Category Waste Breakdown */}
        {analytics?.wasteAnalysis?.categoryBreakdown?.length > 0 && (
          <ReportSection title="Waste by Category" icon="📊">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analytics.wasteAnalysis.categoryBreakdown.map((category, index) => (
                <div key={index} className="p-6 border-2 border-amber-100 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-all duration-200">
                  <h4 className="font-bold text-xl text-amber-800 mb-4">{category._id || 'Uncategorized'}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Expired:</span>
                      <span className="text-red-600 font-bold">{category.totalExpired} units</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Value:</span>
                      <span className="text-red-700 font-bold">{formatCurrency(category.totalWasteValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Items:</span>
                      <span className="text-amber-800 font-bold">{category.uniqueItemCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ReportSection>
        )}
      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";

const API_URL = "http://localhost:5000/api/inventory";

const AlertBadge = ({ severity, children }) => {
  const severityColors = {
    critical: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${severityColors[severity]}`}
    >
      {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const statusColors = {
    "in-stock": "bg-green-100 text-green-800",
    "low-stock": "bg-yellow-100 text-yellow-800",
    "out-of-stock": "bg-red-100 text-red-800",
    "expiring-soon": "bg-orange-100 text-orange-800",
    expired: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
    "expiring-soon": "Expiring Soon",
    expired: "Expired",
  };

  if (!status) return <span className="text-amber-500">—</span>;

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || "bg-amber-100 text-amber-800"}`}
    >
      {statusLabels[status] || status}
    </span>
  );
};

const StatsCard = ({ title, value, subtitle, color = "blue", icon }) => {
  const colorClasses = {
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800",
    green:
      "bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800",
    yellow:
      "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800",
    red: "bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-800",
    orange:
      "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800",
    amber:
      "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 text-amber-800",
  };

  return (
    <div
      className={`p-8 rounded-2xl border-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-4xl font-bold">{value ?? 0}</div>
        {icon && <div className="text-3xl opacity-60">{icon}</div>}
      </div>
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="text-sm mt-2 opacity-80">{subtitle}</div>}
    </div>
  );
};

export default function InventoryMonitoring() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    stockStatus: "",
    search: "",
  });

  // --- helpers to coerce API data safely ---
  const toArray = (data, key) => {
    if (Array.isArray(data)) return data;
    if (key && Array.isArray(data?.[key])) return data[key];
    return [];
  };

  const defaultStats = (s) => ({
    totalItems: s?.totalItems ?? 0,
    inStockItems: s?.inStockItems ?? 0,
    lowStockItems: s?.lowStockItems ?? 0,
    expiredItems: s?.expiredItems ?? 0,
    outOfStockItems: s?.outOfStockItems ?? 0,
    expiringSoonItems: s?.expiringSoonItems ?? 0,
    totalValue: s?.totalValue ?? 0,
  });

  // Fetch monitoring data
  const fetchMonitoringData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, itemsRes, categoriesRes, statusesRes] =
        await Promise.all([
          fetch(`${API_URL}/monitoring/dashboard`),
          fetch(`${API_URL}?${new URLSearchParams(filters).toString()}`),
          fetch(`${API_URL}/categories/list`),
          fetch(`${API_URL}/statuses/list`),
        ]);

      const [dashboardData, itemsData, categoriesData, statusesData] =
        await Promise.all([
          dashboardRes.json(),
          itemsRes.json(),
          categoriesRes.json(),
          statusesRes.json(),
        ]);

      setStats(defaultStats(dashboardData?.stats));
      setAlerts(toArray(dashboardData, "alerts"));

      // items might be an array or { items: [...] }
      setItems(toArray(itemsData, "items"));

      // lists might be arrays or wrapped
      setCategories(toArray(categoriesData, "categories"));
      setStatuses(toArray(statusesData, "statuses"));

      setError("");
    } catch (err) {
      console.error("Error fetching monitoring data:", err);
      setError("Failed to fetch monitoring data");
      // keep UI stable
      setStats(defaultStats({}));
      setAlerts([]);
      setItems([]);
      setCategories([]);
      setStatuses([]);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // --- SAFE ARRAYS for rendering ---
  const safeItems = Array.isArray(items) ? items : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeStatuses = Array.isArray(statuses) ? statuses : [];

  // Apply client-side search filter safely
  const filteredItems = safeItems.filter((item) => {
    const matchesSearch =
      !filters.search ||
      item?.name?.toLowerCase?.().includes(filters.search.toLowerCase()) ||
      item?.description?.toLowerCase?.().includes(filters.search.toLowerCase());

    const matchesCategory =
      !filters.category || item?.category === filters.category;

    const matchesStatus =
      !filters.stockStatus || item?.stockStatus === filters.stockStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600"></div>
          <p className="mt-6 text-amber-700 text-xl font-semibold">
            Loading inventory monitoring data...
          </p>
          <p className="text-amber-600 text-sm mt-2">
            Fetching real-time inventory insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
          <div>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Inventory Stock Monitoring
            </h1>
            <p className="text-amber-700 text-lg">
              Real-time inventory tracking and intelligent alerts
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-amber-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>System monitoring active</span>
            </div>
          </div>
          <button
            onClick={fetchMonitoringData}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="font-semibold">Refresh Data</span>
          </button>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-xl p-6 shadow-lg">
            <div className="flex">
              <svg
                className="w-6 h-6 text-red-500 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-red-800 font-semibold">{error}</div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Total Items" value={stats.totalItems} color="amber" icon="📦" />
          <StatsCard title="In Stock" value={stats.inStockItems} color="green" icon="✅" />
          <StatsCard title="Low Stock" value={stats.lowStockItems} color="yellow" icon="⚠️" />
          <StatsCard
            title="Critical Issues"
            value={(stats.expiredItems ?? 0) + (stats.outOfStockItems ?? 0)}
            subtitle={`${stats.expiredItems ?? 0} expired, ${stats.outOfStockItems ?? 0} out of stock`}
            color="red"
            icon="🚨"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Expiring Soon"
            value={stats.expiringSoonItems}
            subtitle="Next 3 days"
            color="orange"
            icon="⏰"
          />
          <StatsCard
            title="Total Value"
            value={formatCurrency(stats.totalValue)}
            subtitle="Current inventory value"
            color="green"
            icon="💰"
          />
          <StatsCard
            title="Active Alerts"
            value={safeAlerts.length}
            subtitle={`${safeAlerts.filter((a) => a?.severity === "critical").length} critical`}
            color={safeAlerts.length > 0 ? "red" : "green"}
            icon="🔔"
          />
        </div>

        {/* Alerts Section */}
        {safeAlerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Active Alerts
              </h2>
              <p className="text-red-100 text-sm">{safeAlerts.length} items require attention</p>
            </div>
            <div className="p-8 space-y-4">
              {safeAlerts.slice(0, 10).map((alert, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <AlertBadge severity={alert?.severity || "info"}>
                      {(alert?.type || "").replace("-", " ")}
                    </AlertBadge>
                    <span className="text-amber-900 font-medium text-lg">{alert?.message}</span>
                  </div>
                  <div className="text-amber-600 font-semibold bg-white px-4 py-2 rounded-lg">
                    {alert?.itemName}
                  </div>
                </div>
              ))}
              {safeAlerts.length > 10 && (
                <div className="text-center text-amber-600 pt-4">
                  <div className="bg-amber-100 rounded-lg px-6 py-3 inline-block">
                    <span className="font-semibold">
                      And {safeAlerts.length - 10} more alerts...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          <h2 className="text-2xl font-bold text-amber-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                clipRule="evenodd"
              />
            </svg>
            Filter Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-lg font-semibold text-amber-800 mb-3">
                Search Items
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search by name or description..."
                className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-amber-800 mb-3">
                Category Filter
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-amber-200 transition-all"
              >
                <option value="">All Categories</option>
                {safeCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-lg font-semibold text-amber-800 mb-3">
                Stock Status
              </label>
              <select
                value={filters.stockStatus}
                onChange={(e) => handleFilterChange("stockStatus", e.target.value)}
                className="w-full border-2 border-amber-200 focus:border-amber-500 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-amber-200 transition-all"
              >
                <option value="">All Statuses</option>
                {safeStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">
              Inventory Items ({filteredItems.length})
            </h2>
            <p className="text-amber-100 text-sm">Comprehensive inventory overview</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-amber-200">
              <thead className="bg-gradient-to-r from-amber-50 to-orange-50">
                <tr>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-amber-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item?._id}
                    className={`hover:bg-amber-50 transition-colors ${
                      item?.isExpired ? "bg-red-50" : item?.isLowStock ? "bg-yellow-50" : ""
                    }`}
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        {item?.image ? (
                          <img
                            src={
                              item.image.startsWith("http")
                                ? item.image
                                : `http://localhost:5000${item.image}`
                            }
                            alt={item?.name}
                            className="h-16 w-16 rounded-2xl object-cover mr-4 shadow-md border-2 border-white"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mr-4 border-2 border-amber-200">
                            <svg
                              className="w-8 h-8 text-amber-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="text-lg font-bold text-amber-900">{item?.name}</div>
                          <div className="text-amber-600">{item?.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className="inline-flex px-3 py-2 text-sm font-semibold bg-amber-100 text-amber-800 rounded-lg">
                        {item?.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-amber-900">
                        <div className="text-2xl font-bold">{item?.quantity}</div>
                        <div className="text-sm text-amber-600">{item?.unit}</div>
                        {item?.lowStockThreshold && (
                          <div className="text-xs text-amber-500 bg-amber-50 px-2 py-1 rounded mt-1">
                            Threshold: {item.lowStockThreshold}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <StatusBadge status={item?.stockStatus} />
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-amber-900">
                      {item?.expirationDate ? (
                        <div>
                          <div className="font-semibold">{formatDate(item.expirationDate)}</div>
                          {item?.daysUntilExpiry !== null &&
                            item?.daysUntilExpiry !== undefined && (
                              <div
                                className={`text-xs mt-1 px-3 py-1 rounded-full font-medium ${
                                  item.daysUntilExpiry < 0
                                    ? "text-red-700 bg-red-100"
                                    : item.daysUntilExpiry <= 3
                                    ? "text-orange-700 bg-orange-100"
                                    : "text-amber-700 bg-amber-100"
                                }`}
                              >
                                {item.daysUntilExpiry < 0
                                  ? `${Math.abs(item.daysUntilExpiry)} days overdue`
                                  : `${item.daysUntilExpiry} days left`}
                              </div>
                            )}
                        </div>
                      ) : (
                        <span className="text-amber-400 italic">No expiry date</span>
                      )}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-amber-900">
                      <div className="text-xl font-bold text-green-700">
                        {formatCurrency((item?.price ?? 0) * (item?.quantity ?? 0))}
                      </div>
                      <div className="text-sm text-amber-600">
                        @ {formatCurrency(item?.price ?? 0)} each
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-amber-600">
                      {formatDate(item?.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <svg
                  className="w-20 h-20 text-amber-300 mx-auto mb-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-amber-700 text-xl font-semibold">
                  No items match the current filters
                </div>
                <div className="text-amber-600 text-sm mt-2">
                  Try adjusting your search criteria
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

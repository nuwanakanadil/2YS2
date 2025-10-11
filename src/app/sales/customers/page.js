"use client";

import React, { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [engagement, setEngagement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEng, setLoadingEng] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        search,
        status: filterStatus,
      });
      const res = await fetch(`${API_BASE}/api/customers-engagement/list?` + params.toString(), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCustomers(json.items || []);
    } catch (e) {
      console.error("load customers failed:", e);
      setErr("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  // Allow search with a small debounce (optional: press Enter to search)
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openEngagement = async (cust) => {
    setSelectedCustomer(cust);
    setEngagement([]);
    setLoadingEng(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers-engagement/${cust._id}/engagement`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setEngagement(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error("load engagement failed:", e);
      setEngagement([]);
    } finally {
      setLoadingEng(false);
    }
  };

  const filteredCustomers = customers; // server already filters; keep for future client-only filters

  const handleModalClose = (e) => {
    if (e.target.id === "modal-background") {
      setSelectedCustomer(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customer Engagement</h1>
        <p className="text-gray-500 mt-1">
          View student and staff engagement with campus promotions and events
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg shadow text-center">
          <p className="text-lg font-semibold text-green-700">{customers.length}</p>
          <p className="text-sm text-green-700">Total Users (page)</p>
        </div>
        <div className="bg-green-200 p-4 rounded-lg shadow text-center">
          <p className="text-lg font-semibold text-green-800">
            {customers.filter((c) => c.status === "Active").length}
          </p>
          <p className="text-sm text-green-800">Active</p>
        </div>
        <div className="bg-orange-100 p-4 rounded-lg shadow text-center">
          <p className="text-lg font-semibold text-orange-700">
            {customers.filter((c) => c.status === "New").length}
          </p>
          <p className="text-sm text-orange-700">New</p>
        </div>
        <div className="bg-orange-200 p-4 rounded-lg shadow text-center">
          <p className="text-lg font-semibold text-orange-800">
            {customers.filter((c) => c.status === "Dormant").length}
          </p>
          <p className="text-sm text-orange-800">Dormant</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-md w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="new">New</option>
          <option value="dormant">Dormant</option>
        </select>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
        {loading ? (
          <p className="p-6 text-gray-500 text-center">Loading…</p>
        ) : err ? (
          <p className="p-6 text-red-600 text-center">{err}</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">No users found.</p>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer._id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{customer.name}</h3>
                <p className="text-sm text-gray-500">{customer.email}</p>
                <p className="text-xs text-gray-400">
                  Last Engagement:{" "}
                  {customer.lastEngagement
                    ? new Date(customer.lastEngagement).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="text-sm">
                <span
                  className={`px-3 py-1 rounded-full font-medium ${
                    customer.status === "Active"
                      ? "bg-green-200 text-green-800"
                      : customer.status === "New"
                      ? "bg-orange-200 text-orange-800"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {customer.status}
                </span>
              </div>
              <div>
                <button
                  onClick={() => openEngagement(customer)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  View Engagement
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedCustomer && (
        <div
          id="modal-background"
          onClick={handleModalClose}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              aria-label="Close modal"
            >
              &#x2715;
            </button>
            <h2 className="text-xl font-bold mb-4">
              Engagement for {selectedCustomer.name}
            </h2>

            {loadingEng ? (
              <p className="text-gray-500">Loading…</p>
            ) : (engagement || []).length === 0 ? (
              <p className="text-gray-500">No engagement data available.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <table className="w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-green-100 text-green-800">
                      <th className="border border-gray-300 px-4 py-2 text-left">
                        Promotion / Group
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Clicks</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Purchases</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagement.map((row, idx) => (
                      <tr key={idx} className="hover:bg-green-50">
                        <td className="border border-gray-300 px-4 py-2">{row.promotion}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {row.clicks || 0}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          {row.purchases || 0}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {row.lastActive ? new Date(row.lastActive).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

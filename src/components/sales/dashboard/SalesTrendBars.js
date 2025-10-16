"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function SalesTrendBars({ title = "Sales Trends" }) {
  const [range, setRange] = useState("week");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    const days = range === "week" ? 7 : range === "month" ? 30 : 365;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/api/sales/dashboard/sales-trend?days=${days}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setRows(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("trend fetch failed:", e);
        if (alive) setErr("Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [range]);

  // compute max for scaling
  const maxSales = Math.max(1, ...rows.map(r => Number(r.sales || 0)));
  const maxCustomers = Math.max(1, ...rows.map(r => Number(r.customers || 0)));

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 bg-gray-50"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">Loading…</div>
      ) : err ? (
        <div className="h-64 flex items-center justify-center text-red-600">{err}</div>
      ) : rows.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">No data</div>
      ) : (
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
              Sales
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500 inline-block" />
              Customers
            </div>
          </div>

          {/* Bars */}
          <div className="space-y-2">
            {rows.map((r, i) => {
              const salesPct = Math.max(2, Math.round((Number(r.sales || 0) / maxSales) * 100));
              const custPct = Math.max(2, Math.round((Number(r.customers || 0) / maxCustomers) * 100));

              return (
                <div key={i} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-2 text-sm text-gray-600">{r.date}</div>
                  <div className="col-span-5">
                    <div className="h-3 bg-orange-100 rounded">
                      <div className="h-3 bg-orange-500 rounded" style={{ width: `${salesPct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Rs. {Number(r.sales || 0).toLocaleString()}</div>
                  </div>
                  <div className="col-span-5">
                    <div className="h-3 bg-green-100 rounded">
                      <div className="h-3 bg-green-500 rounded" style={{ width: `${custPct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{Number(r.customers || 0)} customers</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

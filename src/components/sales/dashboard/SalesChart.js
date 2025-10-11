"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// dynamic import recharts for client-only rendering
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

export default function SalesChart({ title }) {
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

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Loading…</div>
        ) : err ? (
          <div className="h-full flex items-center justify-center text-red-600">{err}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="customers" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

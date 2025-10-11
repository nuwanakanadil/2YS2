"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

// Dynamic import: client-only
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

export default function PromotionStats() {
  const [range, setRange] = useState("week");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // measure container
  const wrapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setReady(w > 0 && h > 0);
    });
    ro.observe(el);
    // initial check
    setReady(el.clientWidth > 0 && el.clientHeight > 0);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/api/promotions/_stats/summary`, {
          credentials: "include",
          cache: "no-store",           
          headers: { Accept: "application/json" },
      });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
        }
        const json = await res.json();
        const arr = Array.isArray(json) ? json : [];
        const cleaned = arr.map(d => ({
          name: String(d?.name ?? ""),
          views: Number(d?.views ?? 0),
          redemptions: Number(d?.redemptions ?? 0),
        }));
        console.log("stats data:", cleaned);
        if (alive) setData(cleaned);
      } catch (e) {
        console.error("stats fetch failed:", e);
        if (alive) setErr("Failed to load stats");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const empty = !loading && !err && (data.length === 0 || data.every(d => (d.views || 0) === 0 && (d.redemptions || 0) === 0));

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Promotion Performance</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 bg-gray-50"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div ref={wrapRef} className="h-72 w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Loading…</div>
        ) : err ? (
          <div className="h-full flex items-center justify-center text-red-600">{err}</div>
        ) : empty ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No data yet. Create a promotion or wait for some views/redemptions.
          </div>
        ) : !ready ? (
          <div className="h-full flex items-center justify-center text-gray-500">Preparing chart…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" name="Views" />
              <Bar dataKey="redemptions" name="Redemptions" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function PromotionStatsLite() {
  const [range, setRange] = useState("week"); // not used server-side now, but we keep for UI
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setData(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("promo stats failed:", e);
        if (alive) setErr("Failed to load stats");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const maxViews = Math.max(1, ...data.map(d => Number(d.views || 0)));
  const maxRedeem = Math.max(1, ...data.map(d => Number(d.redemptions || 0)));

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

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">Loading…</div>
      ) : err ? (
        <div className="h-64 flex items-center justify-center text-red-600">{err}</div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">No promotions yet.</div>
      ) : (
        <div className="space-y-4">
          {data.map((p, i) => {
            const vPct = Math.max(2, Math.round((Number(p.views || 0) / maxViews) * 100));
            const rPct = Math.max(2, Math.round((Number(p.redemptions || 0) / maxRedeem) * 100));
            return (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800">{p.name}</div>
                  <div className="text-sm text-gray-500">
                    Views: {Number(p.views || 0).toLocaleString()} • Redemptions: {Number(p.redemptions || 0).toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="h-2 bg-orange-100 rounded">
                      <div className="h-2 bg-orange-500 rounded" style={{ width: `${vPct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Views</div>
                  </div>
                  <div>
                    <div className="h-2 bg-green-100 rounded">
                      <div className="h-2 bg-green-500 rounded" style={{ width: `${rPct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Redemptions</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

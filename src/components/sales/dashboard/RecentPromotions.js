"use client";
import React, { useEffect, useState } from "react";
import { TagIcon, ClockIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function RecentPromotions() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/sales/dashboard/recent-promotions`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setItems(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("recent promotions fetch failed:", e);
        if (alive) setErr("Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Recent Promotions</h2>
        <a href="/sales" className="text-green-600 text-sm font-medium hover:text-green-800">View All</a>
      </div>
      <div className="overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-gray-500">Loading…</div>
        ) : err ? (
          <div className="px-5 py-8 text-center text-red-600">{err}</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500">No promotions yet.</div>
        ) : (
          items.map((promo) => (
            <div key={promo.id} className="px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="flex items-start">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <TagIcon size={18} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-800">{promo.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      promo.status === "active"
                        ? "bg-green-100 text-green-800"
                        : promo.status === "scheduled"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <ClockIcon size={14} className="mr-1" />
                    <span>{promo.date}</span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-sm text-gray-500">Redemptions: {promo.redemptions}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// components/sales/dashboard/useDashboardSummary.js
"use client";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function useDashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/api/sales/dashboard/summary`, {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (alive) setData(json);
      } catch (e) {
        console.error("summary fetch failed:", e);
        if (alive) setErr("Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { data, loading, err };
}

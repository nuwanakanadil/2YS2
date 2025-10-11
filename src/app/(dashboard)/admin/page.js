"use client";

import Announcements from "@/components/admin/Announcements";
import EventCalendar from "@/components/admin/EventCalendar";
import UserCard from "@/components/admin/UserCard";
import dynamics from "next/dynamic";

const AttendanceChart = dynamics(
  () => import("@/components/admin/AttendanceChart"),
  { ssr: false }
);

const CountChart = dynamics(
  () => import("@/components/admin/CountChart"),
  { ssr: false }
);

const FinanceChart = dynamics(
  () => import("@/components/admin/FinanceChart"),
  { ssr: false }
);

// AdminPage.jsx (same file as above)
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:5000";

const AdminPage = () => {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // If you have a Next.js rewrite set up, you can fetch('/api/admin/stats/counts', { credentials: 'include' })
        const r = await fetch(`${API.replace(/\/+$/,'')}/api/admin/stats/counts`, {
          credentials: "include",
        });
        const j = await r.json();
        if (!alive) return;
        setCounts(j);
      } catch (e) {
        console.error("load counts failed:", e);
        if (alive) setCounts(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* USER CARDS */}
        <div className="flex gap-4 justify-between flex-wrap">
          <UserCard type="customer"       value={counts?.customers} loading={loading} />
          <UserCard type="shop"           value={counts?.shops}     loading={loading} />
          <UserCard type="delivery staff" value={counts?.deliveries} loading={loading} />
          <UserCard type="manager"        value={counts?.managers}  loading={loading} />
        </div>

        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChart />
          </div>
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChart />
          </div>
        </div>

        <div className="w-full h-[500px]">
          <FinanceChart />
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;


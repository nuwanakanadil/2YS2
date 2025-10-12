"use client";

import React from "react";
import { useRouter } from "next/navigation";
import MetricCard from "@/components/sales/dashboard/MetricCard";
import SalesChart from "@/components/sales/dashboard/SalesTrendBars";
import RecentPromotions from "@/components/sales/dashboard/RecentPromotions";
import PendingApprovals from "@/components/sales/dashboard/PendingApprovals";
import useDashboardSummary from "@/components/sales/dashboard/useDashboardSummary";
import {
  DollarSignIcon,
  UsersIcon,
  TagIcon,
  CheckSquareIcon,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { data: sum, loading } = useDashboardSummary();

  const fmtMoney = (n) =>
    `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, here’s what’s happening today.
        </p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <MetricCard
          title="Daily Sales"
          value={loading ? "…" : fmtMoney(sum?.dailySales || 0)}
          change={{ value: "—", isPositive: true }}
          icon={<DollarSignIcon size={20} className="text-green-600" />}
          color="bg-green-100"
        />
        <MetricCard
          title="Active Promotions"
          value={loading ? "…" : String(sum?.activePromotions ?? 0)}
          change={{ value: "—", isPositive: true }}
          icon={<TagIcon size={20} className="text-orange-600" />}
          color="bg-orange-100"
        />
        <MetricCard
          title="New Customers"
          value={loading ? "…" : String(sum?.newCustomers ?? 0)}
          change={{ value: "—", isPositive: true }}
          icon={<UsersIcon size={20} className="text-green-600" />}
          color="bg-green-100"
        />
        <MetricCard
          title="Pending Approvals"
          value={loading ? "…" : String(sum?.pendingApprovals ?? 0)}
          change={{ value: "—", isPositive: false }}
          icon={<CheckSquareIcon size={20} className="text-orange-600" />}
          color="bg-orange-100"
        />
      </div>

      {/* Chart + approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 min-w-0">
          <SalesChart title="Sales Trends" />
        </div>
        <div>
          <PendingApprovals />
        </div>
      </div>

      {/* Recent promotions + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentPromotions />
        </div>
        <div>
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/sales/createpromotions")}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create New Promotion
              </button>
              <button
                onClick={() => router.push("/sales/generatereports")}
                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Generate Sales Report
              </button>
              <button
                onClick={() => router.push("/sales/message")}
                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Send Customer Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

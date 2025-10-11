"use client";

import React from "react";
import dynamic from "next/dynamic";
import PromotionsList from "@/components/sales/promotions/PromotionsList";

// ⬇️ client-only load for the chart
const PromotionStats = dynamic(
  () => import("@/components/sales/promotions/PromotionStats"),
  { ssr: false }
);

const API = `${process.env.NEXT_PUBLIC_API_ORIGIN}/api/promotions`;

export default function PromotionsPage() {
  return (
    <div>
      {/* header + create button stays identical */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promotions</h1>
          <p className="text-gray-500 mt-1">Manage and track your promotional campaigns</p>
        </div>

        {/* Link to the create page (client-side route) */}
        <div className="mt-4 md:mt-0">
          <a
            href="/sales/createpromotions"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <span className="mr-1">＋</span>
            <span>Create Promotion</span>
          </a>
        </div>
      </div>

      <div className="mb-6">
        <PromotionStats />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">All Promotions</h2>
        <div className="mt-3 md:mt-0 flex space-x-3">
          {/* Filters are inside PromotionsList now, so these are placeholders for spacing parity */}
          <button className="px-3 py-2 border border-gray-300 rounded-md flex items-center text-gray-700 cursor-default">
            Filter
          </button>
          <button className="px-3 py-2 border border-green-500 rounded-md flex items-center text-green-700 cursor-default">
            Export
          </button>
        </div>
      </div>

      <PromotionsList />
    </div>
  );
}

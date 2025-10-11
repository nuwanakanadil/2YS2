"use client";

import React from "react";

export default function MetricCard({ title, value, change, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-center">
      <div className={`rounded-full p-3 mr-4 ${color}`}>{icon}</div>
      <div>
        <h3 className="text-sm text-gray-500 font-medium">{title}</h3>
        <div className="flex items-center mt-1">
          <span className="text-2xl font-bold">{value}</span>
          {change && (
            <span
              className={`ml-2 text-sm font-medium ${
                change.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {change.isPositive ? "+" : ""}
              {change.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

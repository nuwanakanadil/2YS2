"use client";

import React, { useMemo } from "react";

export function ProfileForm({ user }) {
  // derive display values safely
  const display = useMemo(() => {
    const fullName =
      user?.fullName ||
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      "";
    return {
      fullName: fullName || "—",
      country: user?.country || "—",
      language: user?.language || "—",
      timezone: user?.timezone || "—",
    };
  }, [user]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: "Full Name", value: display.fullName },
          { label: "Country", value: display.country },
          { label: "Language", value: display.language },
          { label: "Time Zone", value: display.timezone },
        ].map((field) => (
          <div key={field.label} className="min-h-[68px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {field.value}
            </div>
          </div>
        ))}
      </div>
      {/* tip: keep the "Edit" action in your ProfileCard popup button only */}
    </div>
  );
}

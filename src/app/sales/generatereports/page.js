"use client";

import React, { useState } from "react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  DownloadIcon,
  BarChart2Icon,
  FileTextIcon,
  TagIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function GenerateReport() {
  const router = useRouter();
  const [reportType, setReportType] = useState("sales"); // "sales" | "products" | "promotions"
  const [dateRange, setDateRange] = useState("week");    // "week" | "month" | "quarter" | "custom"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [format, setFormat]       = useState("pdf");     // "pdf" | "excel" | "csv"
  const [includeCharts, setIncludeCharts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales/reports/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          reportType,
          dateRange,
          startDate,
          endDate,
          format,
          includeCharts,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to generate report");
      alert("Report generated successfully!");
      router.push("/sales/reports");
    } catch (err) {
      console.error("generate report error:", err);
      alert(`Generate failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-2 mr-2 rounded-full hover:bg-gray-100"
          type="button"
        >
          <ArrowLeftIcon size={20} className="text-gray-500" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Generate Sales Report</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report Type */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div
                onClick={() => setReportType("sales")}
                className={`cursor-pointer border rounded-lg p-4 flex items-center ${
                  reportType === "sales"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="rounded-full bg-green-100 p-2 mr-3">
                  <BarChart2Icon size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Sales Summary</h3>
                  <p className="text-xs text-gray-500">
                    Revenue, transactions, average order
                  </p>
                </div>
              </div>

              <div
                onClick={() => setReportType("products")}
                className={`cursor-pointer border rounded-lg p-4 flex items-center ${
                  reportType === "products"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="rounded-full bg-orange-100 p-2 mr-3">
                  <FileTextIcon size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium">Product Performance</h3>
                  <p className="text-xs text-gray-500">
                    Top products, categories, trends
                  </p>
                </div>
              </div>

              <div
                onClick={() => setReportType("promotions")}
                className={`cursor-pointer border rounded-lg p-4 flex items-center ${
                  reportType === "promotions"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                <div className="rounded-full bg-green-100 p-2 mr-3">
                  <TagIcon size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Promotions Report</h3>
                  <p className="text-xs text-gray-500">
                    Promotion performance and ROI
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Period */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Period
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {["week", "month", "quarter", "custom"].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={`py-2 px-4 text-sm rounded-md ${
                    dateRange === range
                      ? "bg-green-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {range === "week"
                    ? "Last 7 Days"
                    : range === "month"
                    ? "Last 30 Days"
                    : range === "quarter"
                    ? "Last Quarter"
                    : "Custom Range"}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Dates */}
          {dateRange === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required={dateRange === "custom"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required={dateRange === "custom"}
                  />
                </div>
              </div>
            </>
          )}

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="pdf">PDF Document</option>
              <option value="excel">Excel Spreadsheet</option>
              <option value="csv">CSV File</option>
            </select>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Options
            </label>
            <div className="mt-1">
              <div className="flex items-center">
                <input
                  id="include-charts"
                  type="checkbox"
                  checked={includeCharts}
                  onChange={() => setIncludeCharts(!includeCharts)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="include-charts"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Include charts and graphs
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Report Preview</h3>
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50 h-56 flex items-center justify-center">
            {reportType === "sales" && (
              <div className="text-center">
                <BarChart2Icon size={48} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-500">Sales Summary Report Preview</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dateRange === "custom"
                    ? startDate && endDate
                      ? `${startDate} to ${endDate}`
                      : "Custom date range"
                    : dateRange === "week"
                    ? "Last 7 days"
                    : dateRange === "month"
                    ? "Last 30 days"
                    : "Last quarter"}
                </p>
              </div>
            )}
            {reportType === "products" && (
              <div className="text-center">
                <FileTextIcon size={48} className="mx-auto text-orange-500 mb-2" />
                <p className="text-sm text-gray-500">Product Performance Report Preview</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dateRange === "custom"
                    ? startDate && endDate
                      ? `${startDate} to ${endDate}`
                      : "Custom date range"
                    : dateRange === "week"
                    ? "Last 7 days"
                    : dateRange === "month"
                    ? "Last 30 days"
                    : "Last quarter"}
                </p>
              </div>
            )}
            {reportType === "promotions" && (
              <div className="text-center">
                <TagIcon size={48} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-500">Promotions Report Preview</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dateRange === "custom"
                    ? startDate && endDate
                      ? `${startDate} to ${endDate}`
                      : "Custom date range"
                    : dateRange === "week"
                    ? "Last 7 days"
                    : dateRange === "month"
                    ? "Last 30 days"
                    : "Last quarter"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center disabled:opacity-50"
            disabled={submitting}
          >
            <DownloadIcon size={18} className="mr-1" />
            {submitting ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </form>
    </div>
  );
}

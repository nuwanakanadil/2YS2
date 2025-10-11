"use client";
import React from "react";
import Image from "next/image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const orderData = [
  { name: "Main Canteen", orders: 36 },
  { name: "Science Block", orders: 24 },
  { name: "Tech Cafe", orders: 18 },
  { name: "Business Hub", orders: 12 },
  { name: "Arts Corner", orders: 10 },
  { name: "Library Cafe", orders: 14 },
  { name: "East Wing", orders: 22 },
  { name: "West Wing", orders: 16 },
  { name: "South Plaza", orders: 20 },
  // add more...
];

const CustomizedAxisTick = ({ x, y, payload }) => {
  const words = payload.value.split(" ");
  return (
    <g transform={`translate(${x},${y + 10})`}>
      {words.length > 1 ? (
        <>
          <text
            x={0}
            y={0}
            textAnchor="middle"
            fill="#d1d5db"
            fontSize={12}
          >
            {words[0]}
          </text>
          <text
            x={0}
            y={14}
            textAnchor="middle"
            fill="#d1d5db"
            fontSize={12}
          >
            {words.slice(1).join(" ")}
          </text>
        </>
      ) : (
        <text x={0} y={0} textAnchor="middle" fill="#d1d5db" fontSize={12}>
          {payload.value}
        </text>
      )}
    </g>
  );
};

const OrdersChart = () => {
  return (
    <div className="bg-white rounded-lg p-4 h-full">
      {/* Title and more icon */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Active Orders by Canteen</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {/* Scroll wrapper */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <ResponsiveContainer width={orderData.length * 60} height={300}>
          <BarChart
            data={orderData}
            barSize={15}
            barCategoryGap="20%"
            margin={{ bottom: 60, left: 20, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={<CustomizedAxisTick />}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#d1d5db" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }} />
            <Legend
              align="left"
              verticalAlign="top"
              wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
            />
            <Bar
              dataKey="orders"
              fill="#D2B48C" // light brown color for bars
              legendType="circle"
              radius={[10, 10, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom stats */}
      <div className="flex justify-center gap-16 mt-2">
        <div className="flex flex-col gap-1 items-center">
          <div
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: "#CBB67C" }} // light brown circle
          />
          <h1 className="font-bold">90</h1>
          <h2 className="text-xs text-gray-300">Total Active Orders</h2>
        </div>
        <div className="flex flex-col gap-1 items-center">
          <div className="w-5 h-5 bg-gray-400 rounded-full" />
          <h1 className="font-bold">36</h1>
          <h2 className="text-xs text-gray-300">Top: Main Canteen</h2>
        </div>
      </div>
    </div>
  );
};

export default OrdersChart;

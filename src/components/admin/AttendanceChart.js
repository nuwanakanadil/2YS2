"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from "recharts";

const lastWeekOrderData = [
  { name: "Main Canteen", orders: 30 },
  { name: "Science Block", orders: 20 },
  { name: "Tech Cafe", orders: 15 },
  { name: "Business Hub", orders: 10 },
  { name: "Arts Corner", orders: 12 },
  { name: "Library Cafe", orders: 18 },
  { name: "East Wing", orders: 22 },
  { name: "West Wing", orders: 16 },
  { name: "South Plaza", orders: 20 },
  { name: "North Hall", orders: 14 },
  { name: "Cafeteria East", orders: 11 },
  { name: "Garden View", orders: 19 },
  { name: "Student Lounge", orders: 17 },
  { name: "Sports Cafe", orders: 13 },
  { name: "Tech Park", orders: 25 },
];

const totalLastWeekOrders = lastWeekOrderData.reduce((acc, i) => acc + i.orders, 0);
const top = lastWeekOrderData.reduce((a, b) => (a.orders > b.orders ? a : b));
const topCanteen = top.name;
const topOrders = top.orders;

const CustomizedAxisTick = ({ x, y, payload }) => {
  const words = String(payload.value).split(" ");
  return (
    <g transform={`translate(${x},${y + 10})`}>
      {words.length > 1 ? (
        <>
          <text x={0} y={0} textAnchor="middle" fill="#6b7280" fontSize={12} fontWeight="500">
            {words[0]}
          </text>
          <text x={0} y={14} textAnchor="middle" fill="#6b7280" fontSize={12} fontWeight="500">
            {words.slice(1).join(" ")}
          </text>
        </>
      ) : (
        <text x={0} y={0} textAnchor="middle" fill="#6b7280" fontSize={12} fontWeight="500">
          {payload.value}
        </text>
      )}
    </g>
  );
};

export default function OrdersChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null; // avoid SSR/hydration glitches

  return (
    <div className="bg-white rounded-lg p-4 h-full w-full">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-semibold">Last Week Orders of Canteens</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {/* Parent needs explicit height for ResponsiveContainer */}
      <div className="w-full h-80 overflow-x-auto">
        {/* To support many labels, we can give a min width so it scrolls */}
        <div className="w-full min-w-[900px] h-full">
          <ResponsiveContainer>
            <AreaChart
              data={lastWeekOrderData}
              margin={{ bottom: 40, left: 20, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={<CustomizedAxisTick />}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#6b7280" }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }} />
              <Legend
                align="left"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "8px", paddingBottom: "28px" }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#34D399"
                fill="#BBF7D0"
                fillOpacity={0.7}
                strokeWidth={3}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-center gap-16 mt-4">
        <div className="flex flex-col gap-1 items-center">
          <div className="w-5 h-5 bg-emerald-400 rounded-full" />
          <h1 className="font-bold">{totalLastWeekOrders}</h1>
          <h2 className="text-xs text-gray-500">Total Last Week Orders</h2>
        </div>
        <div className="flex flex-col gap-1 items-center">
          <div className="w-5 h-5 bg-gray-400 rounded-full" />
          <h1 className="font-bold">{topOrders}</h1>
          <h2 className="text-xs text-gray-500">Top: {topCanteen}</h2>
        </div>
      </div>
    </div>
  );
}

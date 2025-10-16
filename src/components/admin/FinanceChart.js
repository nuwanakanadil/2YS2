"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Jan",
    Main: 4000,
    Tech: 3000,
    Library: 2400,
  },
  {
    name: "Feb",
    Main: 3800,
    Tech: 3200,
    Library: 2600,
  },
  {
    name: "Mar",
    Main: 4200,
    Tech: 3100,
    Library: 2700,
  },
  {
    name: "Apr",
    Main: 4500,
    Tech: 3300,
    Library: 2900,
  },
  {
    name: "May",
    Main: 4700,
    Tech: 3400,
    Library: 3000,
  },
  {
    name: "Jun",
    Main: 4900,
    Tech: 3500,
    Library: 3100,
  },
  {
    name: "Jul",
    Main: 5100,
    Tech: 3600,
    Library: 3200,
  },
  {
    name: "Aug",
    Main: 5200,
    Tech: 3700,
    Library: 3300,
  },
  {
    name: "Sep",
    Main: 5300,
    Tech: 3800,
    Library: 3400,
  },
  {
    name: "Oct",
    Main: 5400,
    Tech: 3900,
    Library: 3500,
  },
  {
    name: "Nov",
    Main: 5500,
    Tech: 4000,
    Library: 3600,
  },
  {
    name: "Dec",
    Main: 5600,
    Tech: 4100,
    Library: 3700,
  },
];

const FinanceChart = () => {
  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Monthly Income by Canteen</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={20}
          />
          <Tooltip />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />

          <Line type="monotone" dataKey="Main" stroke="#10B981" strokeWidth={3} />      {/* emerald */}
          <Line type="monotone" dataKey="Tech" stroke="#3B82F6" strokeWidth={3} />      {/* blue */}
          <Line type="monotone" dataKey="Library" stroke="#F59E0B" strokeWidth={3} />   {/* amber */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;

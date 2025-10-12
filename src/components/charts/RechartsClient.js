'use client';

// Import once on the client, then re-export.
// This avoids dynamic() + named-export weirdness.
export {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

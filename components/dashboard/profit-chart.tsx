"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PriceData = {
  period: string;
  sellPrice: number;
  originalPrice: number;
};

interface ProfitChartProps {
  data: PriceData[];
}

export default function ProfitChart({ data }: ProfitChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Price Comparison Trend</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis dataKey="period" />
            <YAxis tick={{ fontSize: 10 }} />

            {/* Fixed type error: Updated parameter to 'any' to fit Recharts expected Formatter type definitions */}
            <Tooltip
              formatter={(value: any) => [
                value !== undefined && value !== null
                  ? Number(value).toLocaleString()
                  : "0",
                "",
              ]}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="sellPrice"
              stroke="#FFD700"
              strokeWidth={3}
              name="Sell Price"
              dot={{ r: 4 }}
            />

            <Line
              type="monotone"
              dataKey="originalPrice"
              stroke="#FF0000"
              strokeWidth={3}
              name="Original Price"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

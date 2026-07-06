"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TopProduct = {
  name: string;
  sold: number;
};

interface TopProductsChartProps {
  data: TopProduct[];
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 5,
              right: 0,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />

            <XAxis type="number" />

            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fontSize: 11 }}
            />

            {/* Fixed type error: Updated parameter to 'any' to fit Recharts expected Formatter type definitions */}
            <Tooltip
              formatter={(value: any) => [`${value} sold`, "Quantity"]}
            />

            <Bar dataKey="sold" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => {
                const max = Math.max(...data.map((d) => d.sold));

                // opacity from 0.35 to 1
                const opacity = 0.35 + (entry.sold / max) * 0.65;

                return (
                  <Cell key={index} fill={`rgba(248, 90, 67, ${opacity})`} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

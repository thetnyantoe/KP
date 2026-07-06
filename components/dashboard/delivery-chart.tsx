"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DeliveryData = {
  name: string;
  value: number;
};

interface DeliveryChartProps {
  data: DeliveryData[];
}

const COLORS = [
  "hsl(var(--chart-3))", // Not Picked Up
  "hsl(var(--chart-4))", // Picked Up
  "hsl(var(--primary))", // Delivered
  "hsl(var(--chart-2))", // Money Received
];

export default function DeliveryChart({ data }: DeliveryChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Delivery Status</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={4}
              strokeWidth={2}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            {/* Fixed type error: Using 'any' type on parameter to match Recharts expectations */}
            <Tooltip formatter={(value: any) => [`${value} Orders`, "Count"]} />

            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
  "#94A3B8", // Not Picked Up - gray
  "#F59E0B", // Picked Up - amber
  "#3B82F6", // Delivered - blue
  "#22C55E", // Complete - green
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

            <Tooltip formatter={(value: any) => [`${value} Orders`, "Count"]} />

            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) =>
                value.charAt(0).toUpperCase() + value.slice(1)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

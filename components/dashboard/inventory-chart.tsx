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

type InventoryData = {
  name: string;
  value: number;
};

interface InventoryChartProps {
  data: InventoryData[];
}

const INVENTORY_COLORS: Record<string, string> = {
  "strong stock": "#2ECC71",
  "medium stock": "#3498DB",
  "low stock": "#F1C40F",
  "out of stock": "#E74C3C",
};

export default function InventoryChart({ data }: InventoryChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={120}
              paddingAngle={0} // Changed from 4 to 0 to remove angular gaps
              stroke="none" // Removed the outer border entirely
            >
              {data.map((entry, index) => {
                const normalizedName = entry.name.toLowerCase().trim();
                const sliceColor =
                  INVENTORY_COLORS[normalizedName] ||
                  `hsl(var(--chart-${(index % 5) + 1}))`;

                return <Cell key={`cell-${index}`} fill={sliceColor} />;
              })}
            </Pie>

            <Tooltip
              formatter={(value: any) => [`${value} Products`, "Count"]}
            />

            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

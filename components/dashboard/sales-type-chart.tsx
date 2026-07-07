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

type SalesTypeData = {
  name: string;
  value: number;
};

interface SalesTypeChartProps {
  data: SalesTypeData[];
}

// Fallback colors just in case a name doesn't match perfectly
const COLOR_MAP: Record<string, string> = {
  delivery: "#F85A43",
  "in person": "#3F908A",
  "in-person": "#3F908A", // handles hyphenated variant
};

export default function SalesTypeChart({ data }: SalesTypeChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sales Type</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={75}
              outerRadius={110}
              paddingAngle={4}
              strokeWidth={2}
            >
              {data.map((entry, index) => {
                // Normalize name string to match our color map keys safely
                const normalizedName = entry.name.toLowerCase().trim();
                const sliceColor =
                  COLOR_MAP[normalizedName] ||
                  `hsl(var(--chart-${(index % 5) + 1}))`;

                return <Cell key={`cell-${index}`} fill={sliceColor} />;
              })}
            </Pie>

            <Tooltip
              formatter={(value: any) => [
                value !== undefined && value !== null
                  ? Number(value).toLocaleString()
                  : "0",
                "Orders",
              ]}
            />

            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueData {
  label: string;
  revenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Revenue Trend</CardTitle>
      </CardHeader>

      <CardContent className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                {/* Top of the gradient: full your color at 40% opacity */}
                <stop offset="5%" stopColor="rgba(248, 90, 67, 0.4)" />
                {/* Bottom of the gradient: fades out to transparent */}
                <stop offset="95%" stopColor="rgba(248, 90, 67, 0)" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis dataKey="label" />

            <YAxis tick={{ fontSize: 11 }} />

            <Tooltip />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="rgba(248, 90, 67, 1)"
              fill="url(#revenueGradient)"
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

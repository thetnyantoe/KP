"use client";

import { Button } from "@/components/ui/button";

type Period = "daily" | "monthly" | "yearly";

interface DashboardHeaderProps {
  period: Period;
  setPeriod: (period: Period) => void;
}

export default function DashboardHeader({
  period,
  setPeriod,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <p className="text-muted-foreground mt-1">
          Overview of your ERP performance.
        </p>
      </div>

      <div className="flex rounded-lg border p-1 bg-muted w-fit">
        <Button
          variant={period === "daily" ? "default" : "ghost"}
          onClick={() => setPeriod("daily")}
        >
          Daily
        </Button>

        <Button
          variant={period === "monthly" ? "default" : "ghost"}
          onClick={() => setPeriod("monthly")}
        >
          Monthly
        </Button>

        <Button
          variant={period === "yearly" ? "default" : "ghost"}
          onClick={() => setPeriod("yearly")}
        >
          Yearly
        </Button>
      </div>
    </div>
  );
}

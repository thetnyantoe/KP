"use client";

import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  revenue: number;
  orders: number;
  products: number;
  profit: number; // Replaced lowStock with profit
}

export default function StatsCards({
  revenue,
  profit,
  orders,
  products,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Revenue",
      value: `${revenue.toLocaleString()} MMK`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      badge: "+12.5%",
      badgeColor: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Profit",
      value: `${profit.toLocaleString()} MMK`,
      icon: TrendingUp,
      color: "text-teal-600",
      bg: "bg-teal-100",
      badge: profit > 0 ? "Profitable" : "Breakeven",
      badgeColor:
        profit > 0 ? "text-teal-600 bg-teal-50" : "text-amber-600 bg-amber-50",
    },
    {
      title: "Orders",
      value: orders.toLocaleString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-100",
      badge: "Active",
      badgeColor: "text-blue-600 bg-blue-50",
    },
    {
      title: "Products",
      value: products.toLocaleString(),
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-100",
      badge: "Inventory",
      badgeColor: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="
              border-none
              shadow-sm
              hover:shadow-xl
              transition-all
              duration-300
              hover:-translate-y-1
              bg-gradient-to-br
              from-white
              to-slate-50
            "
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                {/* Text */}
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>

                  <h2 className="text-3xl font-bold tracking-tight mt-2">
                    {card.value}
                  </h2>
                </div>

                {/* Icon */}
                <div
                  className={`
                    rounded-2xl
                    p-4
                    ${card.bg}
                  `}
                >
                  <Icon
                    className={`
                      w-7
                      h-7
                      ${card.color}
                    `}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

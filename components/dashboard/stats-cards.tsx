"use client";

import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  revenue: number;
  orders: number;
  products: number;
  lowStock: number;
}

export default function StatsCards({
  revenue,
  orders,
  products,
  lowStock,
}: StatsCardsProps) {
  const cards = [
    {
      title: "Revenue",
      value: `${revenue.toLocaleString()} MMK`,
      icon: DollarSign,
    },
    {
      title: "Orders",
      value: orders.toLocaleString(),
      icon: ShoppingCart,
    },
    {
      title: "Products",
      value: products.toLocaleString(),
      icon: Package,
    },
    {
      title: "Low Stock",
      value: lowStock.toLocaleString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <CardContent className="flex justify-between items-center p-6">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>

                <h2 className="text-3xl font-bold mt-2">{card.value}</h2>
              </div>

              <div className="rounded-full bg-primary/10 p-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

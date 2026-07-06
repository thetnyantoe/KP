"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

import DashboardHeader from "@/components/dashboard/dashboard-header";
import StatsCards from "@/components/dashboard/stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import SalesTypeChart from "@/components/dashboard/sales-type-chart";
import TopProductsChart from "@/components/dashboard/top-products-chart";
import ProfitChart from "@/components/dashboard/profit-chart";
import InventoryChart from "@/components/dashboard/inventory-chart";
import DeliveryChart from "@/components/dashboard/delivery-chart";
import RecentSalesTable from "@/components/dashboard/recent-sales-table";

type Period = "daily" | "monthly" | "yearly";

export default function Admin() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [loading, setLoading] = useState(true);

  // Dynamic States
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    lowStock: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [salesTypeData, setSalesTypeData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 1. Fetch raw datasets from database
        const { data: sales, error: salesErr } = await supabase
          .from("sales")
          .select(
            "*, delivery(id, pickup_time, delivered_time, money_received_time)",
          );

        const { data: products, error: prodErr } = await supabase
          .from("products")
          .select("*");

        const { data: saleItems, error: itemsErr } = await supabase
          .from("sale_items")
          .select("*, products(name, original_price)");

        if (salesErr || prodErr || itemsErr) {
          console.error("Error fetching data:", {
            salesErr,
            prodErr,
            itemsErr,
          });
          return;
        }

        const safeSales = sales || [];
        const safeProducts = products || [];
        const safeSaleItems = saleItems || [];

        // --- 2. Calculate KPI Stats ---
        const totalRevenue = safeSales
          .filter((s) => s.status !== "Cancelled")
          .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

        const lowStockCount = safeProducts.filter(
          (p) => p.quantity > 0 && p.quantity <= 10,
        ).length;

        setStats({
          revenue: totalRevenue,
          orders: safeSales.length,
          products: safeProducts.length,
          lowStock: lowStockCount,
        });

        // --- 3. Dynamic Period Aggregations (Revenue and Profit Trends) ---
        const trendMap: Record<
          string,
          { revenue: number; sellPrice: number; originalPrice: number }
        > = {};

        safeSaleItems.forEach((item) => {
          const dateObj = new Date(item.created_at);
          let label = "";

          if (period === "daily") {
            label = dateObj.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
          } else if (period === "yearly") {
            label = dateObj.getFullYear().toString();
          } else {
            // Default to monthly label layout
            label = dateObj.toLocaleDateString(undefined, { month: "short" });
          }

          if (!trendMap[label]) {
            trendMap[label] = { revenue: 0, sellPrice: 0, originalPrice: 0 };
          }

          const qty = item.quantity || 1;
          const subtotal = Number(item.subtotal || 0);
          const origPrice =
            Number((item.products as any)?.original_price || 0) * qty;

          trendMap[label].revenue += subtotal;
          trendMap[label].sellPrice += subtotal;
          trendMap[label].originalPrice += origPrice;
        });

        // Format chart arrays
        const formattedRevenue = Object.entries(trendMap).map(([label, v]) => ({
          label,
          revenue: v.revenue,
        }));
        const formattedProfit = Object.entries(trendMap).map(([label, v]) => ({
          period: label,
          sellPrice: v.sellPrice,
          originalPrice: v.originalPrice,
        }));

        setRevenueData(formattedRevenue);
        setPriceData(formattedProfit);

        // --- 4. Sales Type Data ---
        let inPersonCount = 0;
        let deliveryCount = 0;

        safeSales.forEach((sale) => {
          if (sale.delivery && (sale.delivery as any).id) {
            deliveryCount++;
          } else {
            inPersonCount++;
          }
        });

        setSalesTypeData([
          { name: "In Person", value: inPersonCount },
          { name: "Delivery", value: deliveryCount },
        ]);

        // --- 5. Top Products Chart ---
        const productMap: Record<string, number> = {};
        safeSaleItems.forEach((item) => {
          const pName = (item.products as any)?.name || "Unknown Product";
          productMap[pName] = (productMap[pName] || 0) + (item.quantity || 1);
        });

        const sortedTopProducts = Object.entries(productMap)
          .map(([name, sold]) => ({ name, sold }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5);

        setTopProducts(sortedTopProducts);

        // --- 6. Inventory Distribution Data ---
        let strongStock = 0;
        let mediumStock = 0;
        let lowStock = 0;

        safeProducts.forEach((p) => {
          if (p.quantity <= 10) lowStock++;
          else if (p.quantity <= 30) mediumStock++;
          else strongStock++;
        });

        setInventoryData([
          { name: "Strong Stock", value: strongStock },
          { name: "Medium Stock", value: mediumStock },
          { name: "Low Stock", value: lowStock },
        ]);

        // --- 7. Delivery Status Distribution Data ---
        let notPickedUp = 0;
        let pickedUp = 0;
        let delivered = 0;
        let moneyReceived = 0;

        safeSales.forEach((sale) => {
          const del = sale.delivery as any;
          if (del && del.id) {
            if (del.money_received_time) moneyReceived++;
            else if (del.delivered_time) delivered++;
            else if (del.pickup_time) pickedUp++;
            else notPickedUp++;
          }
        });

        setDeliveryData([
          { name: "Not Picked Up", value: notPickedUp },
          { name: "Picked Up", value: pickedUp },
          { name: "Delivered", value: delivered },
          { name: "Money Received", value: moneyReceived },
        ]);

        // --- 8. Recent Sales Transformer ---
        const transformedRecent = safeSales.slice(0, 5).map((sale) => ({
          id: sale.id,
          customer_name: sale.customer_name,
          sale_type:
            sale.delivery && (sale.delivery as any).id
              ? ("Delivery" as const)
              : ("In Person" as const),
          total_amount: Number(sale.total_amount || 0),
          status: sale.status || "Pending",
          sale_date:
            sale.sale_date ||
            new Date(sale.created_at).toISOString().split("T")[0],
          created_at: sale.created_at,
        }));

        setRecentSales(transformedRecent);
      } catch (err) {
        console.error("Dashboard engine failure:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">
        Syncing real-time database calculations...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <DashboardHeader period={period} setPeriod={setPeriod} />

      {/* KPI Cards */}
      <StatsCards
        revenue={stats.revenue}
        orders={stats.orders}
        products={stats.products}
        lowStock={stats.lowStock}
      />

      {/* Revenue + Sales Type */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart data={revenueData} />
        </div>
        <SalesTypeChart data={salesTypeData} />
      </div>

      {/* Top Products + Profit Margin Trends */}
      <div className="grid gap-6 xl:grid-cols-2">
        <TopProductsChart data={topProducts} />
        <ProfitChart data={priceData} />
      </div>

      {/* Inventory Health + Delivery Lifecycles */}
      <div className="grid gap-6 xl:grid-cols-2">
        <InventoryChart data={inventoryData} />
        <DeliveryChart data={deliveryData} />
      </div>

      {/* Recent Sales Ledger */}
      <RecentSalesTable data={recentSales} />
    </div>
  );
}

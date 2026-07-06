"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-toastify";

export default function SalesDetails() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);

    // 1. fetch sales
    const { data: sales, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      setLoading(false);
      return;
    }

    // 2. fetch sale_items + products
    const { data: items } = await supabase.from("sale_items").select(`
        *,
        products (
          name
        )
      `);

    // 3. group items under sales
    const grouped = sales.map((sale) => {
      const saleItems = (items || []).filter((i) => i.sale_id === sale.id);

      return {
        id: sale.id,
        customer: sale.customer_name,
        date: sale.sale_date,
        status: sale.status,
        saleType: sale.sale_type,
        items: saleItems.map((i) => ({
          product: i.products?.name || "Unknown",
          qty: i.quantity,
          price: i.price,
          discount: i.discount,
          subtotal: i.subtotal,
        })),
      };
    });

    setOrders(grouped);
    setLoading(false);
  };

  // =========================
  // UI
  // =========================
  if (loading) {
    return <p className="p-5">Loading sales...</p>;
  }
  const handleRemoveSale = async (saleId: string) => {
    const { error: itemError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", saleId);

    if (itemError) {
      console.error(itemError);
      toast.error("Failed to remove sale items.");
      return;
    }

    const { error: saleError } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId);

    if (saleError) {
      console.error(saleError);
      toast.error("Failed to remove sale.");
      return;
    }

    // Remove from UI without reloading
    setOrders((prev) => prev.filter((order) => order.id !== saleId));

    toast.success("Sale removed successfully.");
  };
  return (
    <div className="mx-[20px]">
      <h1 className="text-2xl font-bold mb-5">Sales</h1>

      {orders.map((order) => {
        const total = order.items.reduce((sum, item) => {
          return sum + item.subtotal;
        }, 0);

        return (
          <div key={order.id} className="border rounded-lg p-4 shadow-sm mb-4">
            {/* HEADER */}
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg">#{order.id.slice(0, 8)}</h2>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-gray-500">
                    {order.customer} •{" "}
                    {new Date(order.date).toLocaleDateString()}
                  </p>
                  <p
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      order.saleType === "DELIVERY"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {order.saleType === "DELIVERY" ? "DELIVERY" : "IN PERSON"}
                  </p>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {order.items.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.product}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{item.price} MMK</TableCell>
                    <TableCell>{item.discount}%</TableCell>
                    <TableCell className="text-right">
                      {item.subtotal.toFixed(1)} MMK
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* FOOTER */}
            <div className="flex justify-between mt-4">
              <div className="font-bold">Total: {total.toFixed(1)} MMK</div>

              <div className="flex gap-3">
                <button className="text-blue-500 cursor-pointer hover:underline">
                  PDF Receipt
                </button>

                <button
                  onClick={() => handleRemoveSale(order.id)}
                  className="text-red-500 cursor-pointer hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

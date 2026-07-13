"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import { toast } from "react-toastify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

type Delivery = {
  id: string;
  sale_id: string;
  pickup_time: string | null;
  delivered_time: string | null;
  money_received_time: string | null;
  delivery_address: string | null;
  status: "notpickedup" | "pickedup" | "delivered" | "complete";

  sales: {
    customer_name: string;
    sale_date: string;
    total_amount: number;
  };
};

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [timeValues, setTimeValues] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDeliveries();
  }, []);

  // =========================
  // FORMAT (NULL = EMPTY)
  // =========================
  const formatDateTimeLocal = (date?: string | null) => {
    if (!date) return "";

    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);

    return local.toISOString().slice(0, 16);
  };

  // =========================
  // FETCH DATA
  // =========================
  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from("delivery")
      .select(
        `
        *,
        sales (
          customer_name,
          sale_date,
          total_amount
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setDeliveries(data || []);

    // preload inputs (EMPTY if NULL)
    const initial: Record<string, string> = {};

    (data || []).forEach((d) => {
      initial[`${d.id}_pickup`] = formatDateTimeLocal(d.pickup_time);
      initial[`${d.id}_delivered`] = formatDateTimeLocal(d.delivered_time);
      initial[`${d.id}_money`] = formatDateTimeLocal(d.money_received_time);
    });

    setTimeValues(initial);
  };

  // =========================
  // UPDATE ALL FIELDS TOGETHER
  // =========================
  const updateDelivery = async (delivery: Delivery) => {
    const pickup = timeValues[`${delivery.id}_pickup`];
    const delivered = timeValues[`${delivery.id}_delivered`];
    const money = timeValues[`${delivery.id}_money`];

    let currentStatus: Delivery["status"] = "notpickedup";
    if (money) {
      currentStatus = "complete";
    } else if (delivered) {
      currentStatus = "delivered";
    } else if (pickup) {
      currentStatus = "pickedup";
    }

    const { error } = await supabase
      .from("delivery")
      .update({
        pickup_time: pickup ? new Date(pickup).toISOString() : null,
        delivered_time: delivered ? new Date(delivered).toISOString() : null,
        money_received_time: money ? new Date(money).toISOString() : null,
        status: currentStatus,
      })
      .eq("id", delivery.id);

    if (error) {
      console.log(error);
      toast.error("Failed to update delivery.");
      return;
    }

    toast.success("Delivery updated successfully.");
    fetchDeliveries();
  };

  // =========================
  // COMPUTED STATS & PAGINATION
  // =========================
  const statusStats = useMemo(() => {
    return deliveries.reduce(
      (acc, d) => {
        if (d.status === "notpickedup") acc.notPickedUp += 1;
        else if (d.status === "pickedup") acc.pickedUp += 1;
        else if (d.status === "delivered") acc.delivered += 1;
        else if (d.status === "complete") acc.complete += 1;
        return acc;
      },
      { notPickedUp: 0, pickedUp: 0, delivered: 0, complete: 0 },
    );
  }, [deliveries]);

  const totalPages = Math.ceil(deliveries.length / itemsPerPage);

  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return deliveries.slice(start, start + itemsPerPage);
  }, [deliveries, currentPage]);

  return (
    <div className="p-6 w-full flex flex-col gap-5">
      <h1 className="text-2xl font-bold mb-2">Delivery Orders</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Delivery Address</TableHead>
            <TableHead>Pickup Time</TableHead>
            <TableHead>Delivered Time</TableHead>
            <TableHead>Complete Time</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedDeliveries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-slate-400"
              >
                No delivery orders found.
              </TableCell>
            </TableRow>
          ) : (
            paginatedDeliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                {/* CUSTOMER */}
                <TableCell className="font-medium">
                  {delivery.sales?.customer_name || "Unknown Customer"}
                </TableCell>

                {/* ADDRESS */}
                <TableCell className="max-w-[200px] truncate">
                  {delivery.delivery_address || "-"}
                </TableCell>

                {/* PICKUP */}
                <TableCell>
                  <Input
                    type="datetime-local"
                    value={timeValues[`${delivery.id}_pickup`] ?? ""}
                    onChange={(e) =>
                      setTimeValues({
                        ...timeValues,
                        [`${delivery.id}_pickup`]: e.target.value,
                      })
                    }
                    className="max-w-[180px]"
                  />
                </TableCell>

                {/* DELIVERED */}
                <TableCell>
                  <Input
                    type="datetime-local"
                    value={timeValues[`${delivery.id}_delivered`] ?? ""}
                    onChange={(e) =>
                      setTimeValues({
                        ...timeValues,
                        [`${delivery.id}_delivered`]: e.target.value,
                      })
                    }
                    className="max-w-[180px]"
                  />
                </TableCell>

                {/* MONEY */}
                <TableCell>
                  <Input
                    type="datetime-local"
                    value={timeValues[`${delivery.id}_money`] ?? ""}
                    onChange={(e) =>
                      setTimeValues({
                        ...timeValues,
                        [`${delivery.id}_money`]: e.target.value,
                      })
                    }
                    className="max-w-[180px]"
                  />
                </TableCell>

                {/* ACTION */}
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => updateDelivery(delivery)}>
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-2">
          <span className="text-sm text-slate-500">
            Showing Page <strong>{currentPage}</strong> of {totalPages} (
            {deliveries.length} total orders)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-md mt-4">
        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-sm font-medium text-slate-500">
                    Delivery Status
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-orange-600 bg-orange-50">
                    Real-time
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-xl font-bold text-slate-700">
                      {statusStats.notPickedUp}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                      Pending
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-500">
                      {statusStats.pickedUp}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                      Picked
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-500">
                      {statusStats.delivered}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                      Deliv
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-500">
                      {statusStats.complete}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                      Done
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-4 bg-orange-100 shrink-0">
                <Truck className="w-7 h-7 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

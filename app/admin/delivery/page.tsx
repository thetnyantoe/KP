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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Delivery = {
  id: string;
  sale_id: string;
  pickup_time: string | null;
  delivered_time: string | null;
  money_received_time: string | null;
  delivery_address: string | null;

  sales: {
    customer_name: string;
    sale_date: string;
    total_amount: number;
  };
};

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [timeValues, setTimeValues] = useState<Record<string, string>>({});

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

    const { error } = await supabase
      .from("delivery")
      .update({
        pickup_time: pickup ? new Date(pickup).toISOString() : null,
        delivered_time: delivered ? new Date(delivered).toISOString() : null,
        money_received_time: money ? new Date(money).toISOString() : null,
      })
      .eq("id", delivery.id);

    if (error) {
      console.log(error);
      return;
    }

    fetchDeliveries();
  };

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-bold mb-6">Delivery Orders</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Pickup Time</TableHead>
            <TableHead>Delivered Time</TableHead>
            <TableHead>Complete Time</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              {/* CUSTOMER */}
              <TableCell>{delivery.sales.customer_name}</TableCell>

              {/* ADDRESS */}
              <TableCell>{delivery.delivery_address || "-"}</TableCell>

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
                />
              </TableCell>

              {/* ACTION */}
              <TableCell>
                <Button size="sm" onClick={() => updateDelivery(delivery)}>
                  Update
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

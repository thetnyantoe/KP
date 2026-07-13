"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Sale = {
  id: string;
  customer_name: string;
  sale_date: string;
  total_amount: number;
  status: string;
  sale_type?: "In Person" | "Delivery";
  created_at: string;
};

interface RecentSalesTableProps {
  data: Sale[];
}

export default function RecentSalesTable({ data }: RecentSalesTableProps) {
  // ✅ Create a new sorted array copy descending by timestamp (latest first)
  const sortedData = [...data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    No recent sales
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((sale) => (
                  <TableRow key={sale.id}>
                    {/* Customer */}
                    <TableCell className="font-medium">
                      {sale.customer_name}
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge
                        variant={
                          sale.sale_type === "Delivery"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {sale.sale_type || "In Person"}
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-semibold">
                      {Number(sale.total_amount).toLocaleString()} MMK
                    </TableCell>

                    {/* Date */}
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString()}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "Pending"
                            ? "secondary"
                            : sale.status === "Completed"
                              ? "default"
                              : "outline"
                        }
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

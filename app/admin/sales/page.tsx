"use client";

import { useEffect, useState, useMemo } from "react";
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
import { toast } from "react-toastify";

// Import libraries for PDF Generation
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Sale = {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  sale_type: "IN_PERSON" | "DELIVERY";
  sale_date: string;
};

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // --- Filter and Sort States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState<
    "ALL" | "IN_PERSON" | "DELIVERY"
  >("ALL");
  const [amountSort, setAmountSort] = useState<"NONE" | "ASC" | "DESC">("NONE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log(error);
    } else {
      setSales(data || []);
    }

    setLoading(false);
  };

  // --- Reset All Filters ---
  const handleResetFilters = () => {
    setSearchQuery("");
    setSaleTypeFilter("ALL");
    setAmountSort("NONE");
    setStartDate("");
    setEndDate("");
  };

  // --- Computed Processed Sales Array ---
  const processedSales = useMemo(() => {
    let result = [...sales];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sale) =>
          sale.customer_name?.toLowerCase().includes(query) ||
          sale.id?.toLowerCase().includes(query),
      );
    }

    if (saleTypeFilter !== "ALL") {
      result = result.filter((sale) => sale.sale_type === saleTypeFilter);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((sale) => new Date(sale.sale_date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((sale) => new Date(sale.sale_date) <= end);
    }

    if (amountSort !== "NONE") {
      result.sort((a, b) => {
        return amountSort === "ASC"
          ? a.total_amount - b.total_amount
          : b.total_amount - a.total_amount;
      });
    }

    return result;
  }, [sales, searchQuery, saleTypeFilter, startDate, endDate, amountSort]);

  const handleRemoveSale = async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Failed to remove sale.");
      return;
    }

    setSales((prev) => prev.filter((sale) => sale.id !== id));
    toast.success("Sale removed successfully.");
  };

  // --- PDF Generator Engine ---
  const handleGeneratePDF = async (sale: Sale) => {
    setPdfLoadingId(sale.id);
    try {
      // 1. Fetch line items for this specific sale from database
      const { data: items, error } = await supabase
        .from("sale_items")
        .select("quantity, price, discount, subtotal, products(name)")
        .eq("sale_id", sale.id);

      if (error) throw error;
      if (!items || items.length === 0) {
        toast.error("No items found registered to this transaction record.");
        return;
      }

      // 2. Initialize jsPDF context
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Typography Setup & Brand Header Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("INVOICE RECEIPT", 14, 20);

      doc.setFontSize(10);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Invoice ID: #INV-${sale.id.toUpperCase().slice(0, 8)}`, 14, 26);
      doc.text(
        `Date Issued: ${new Date(sale.sale_date).toLocaleDateString()}`,
        14,
        31,
      );

      // Metadata Divider Line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(14, 36, 196, 36);

      // Customer & Fulfillment Details section
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("BILLED TO:", 14, 44);
      doc.text("FULFILLMENT TYPE:", 120, 44);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(sale.customer_name, 14, 50);
      doc.text(
        sale.sale_type === "DELIVERY" ? "Delivery Order" : "In-Person Checkout",
        120,
        50,
      );

      // 3. Assemble Line Items Table matrix
      const tableRows = items.map((item: any) => [
        item.products?.name || "Unknown Item",
        item.quantity.toString(),
        `${Number(item.price).toLocaleString()} MMK`,
        item.discount > 0 ? `${item.discount}%` : "-",
        `${Number(item.subtotal).toLocaleString()} MMK`,
      ]);

      // Render Autotable structure
      autoTable(doc, {
        startY: 58,
        head: [["Product Item", "Qty", "Unit Price", "Discount", "Subtotal"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [79, 70, 229],
          fontSize: 10,
          fontStyle: "bold",
        }, // Indigo accent color
        bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "center" },
          4: { halign: "right" },
        },
      });

      // 4. Summary Total Calculations Blocks
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Grand Total:`, 120, finalY);

      doc.setTextColor(22, 163, 74); // Green accent for financial total
      doc.text(
        `${Number(sale.total_amount).toLocaleString()} MMK`,
        150,
        finalY,
      );

      // Footer disclaimer note
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Thank you for your business!", 14, finalY + 20);

      // 5. Build Object URL and pipe to a modern browser tab window
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");

      toast.success("Receipt preview opened in a new tab.");
    } catch (err) {
      console.error(err);
      toast.error("Error building PDF data preview.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <div className="mx-[20px] my-[20px]">
      <h1 className="text-2xl font-bold mb-[20px]">Sales</h1>

      {/* --- Filters Control Panel --- */}
      <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
        <div className="flex flex-col gap-1 min-w-[220px] flex-1">
          <label className="text-xs font-semibold text-slate-500">Search</label>
          <input
            type="text"
            placeholder="Customer name or sale ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-semibold text-slate-500">
            Sale Type
          </label>
          <select
            value={saleTypeFilter}
            onChange={(e) => setSaleTypeFilter(e.target.value as any)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="IN_PERSON">In Person</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-semibold text-slate-500">
            Sort Amount
          </label>
          <select
            value={amountSort}
            onChange={(e) => setAmountSort(e.target.value as any)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="NONE">Default (Date)</option>
            <option value="ASC">Low to High</option>
            <option value="DESC">High to Low</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs font-semibold text-slate-500">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs font-semibold text-slate-500">
            To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            type="button"
          >
            Reset Filters
          </Button>
        </div>
      </div>

      {/* --- Sales Data Table --- */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sale ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Sale Type</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Sale Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {processedSales.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-slate-400"
              >
                No sales records found matching the criteria.
              </TableCell>
            </TableRow>
          ) : (
            processedSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">
                  {sale.id.slice(0, 8)}
                </TableCell>

                <TableCell>{sale.customer_name}</TableCell>

                <TableCell>
                  {sale.sale_type === "DELIVERY" ? (
                    <span className="text-orange-500 font-semibold">
                      DELIVERY
                    </span>
                  ) : (
                    <span className="text-green-600 font-semibold">
                      IN PERSON
                    </span>
                  )}
                </TableCell>

                <TableCell className="font-semibold">
                  {Number(sale.total_amount).toFixed(2)} MMK
                </TableCell>

                <TableCell>
                  {new Date(sale.sale_date).toLocaleDateString()}
                </TableCell>

                <TableCell className="text-right">
                  <button className="text-blue-500 mr-3 cursor-pointer hover:underline">
                    Details
                  </button>

                  <button
                    disabled={pdfLoadingId !== null}
                    onClick={() => handleGeneratePDF(sale)}
                    className="text-blue-500 mr-3 cursor-pointer hover:underline disabled:text-slate-300"
                  >
                    {pdfLoadingId === sale.id ? "Preparing..." : "PDF Receipt"}
                  </button>

                  <button
                    onClick={() => handleRemoveSale(sale.id)}
                    className="text-red-500 cursor-pointer hover:underline"
                  >
                    Remove
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

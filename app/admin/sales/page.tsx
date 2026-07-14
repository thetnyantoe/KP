"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";
import html2canvas from "html2canvas";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  Trash2,
  X,
  Eye,
  FileDown,
} from "lucide-react";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Sale = {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  sale_type: "IN_PERSON" | "DELIVERY";
  sale_date: string;
  customer_email?: string;
  street_address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  tax_amount?: number;
  discount_amount?: number;
  paid_amount?: number;
};

type SaleItemDetail = {
  product_code: string; // Added code property
  product_name: string;
  image_url?: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
};

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // 🛡️ Safe tracking states for the custom inline row elimination overlay
  const [removingSaleId, setRemovingSaleId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // --- Modal State Engine ---
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItemDetail[]>(
    [],
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  // --- Filter and Sort States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState<
    "ALL" | "IN_PERSON" | "DELIVERY"
  >("ALL");
  const [amountSort, setAmountSort] = useState<"NONE" | "ASC" | "DESC">("NONE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  const handleOpenDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsLoading(true);
    setSelectedSaleItems([]);

    try {
      // Included product_code in query select
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "quantity, price, discount, subtotal, products(name, image, product_code)",
        )
        .eq("sale_id", sale.id);

      if (error) throw error;

      const formattedItems: SaleItemDetail[] = (data || []).map(
        (item: any) => ({
          product_code: item.products?.product_code || "-",
          product_name: item.products?.name || "Unknown Product",
          image_url: item.products?.image || undefined,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        }),
      );

      setSelectedSaleItems(formattedItems);
    } catch (err) {
      console.error("Error fetching sale item details:", err);
      toast.error("Failed to fetch detailed product items.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedSale(null);
    setSelectedSaleItems([]);
  };

  // --- Reset All Filters ---
  const handleResetFilters = () => {
    setSearchQuery("");
    setSaleTypeFilter("ALL");
    setAmountSort("NONE");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
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

  // --- Filter-Responsive Card Component Metrics ---
  const statsMetrics = useMemo(() => {
    const revenueSum = processedSales.reduce(
      (acc, current) => acc + current.total_amount,
      0,
    );
    return {
      revenue: revenueSum,
      ordersCount: processedSales.length,
    };
  }, [processedSales]);

  // --- Pagination Partition Slices ---
  const totalPages = Math.ceil(processedSales.length / itemsPerPage);

  const paginatedSales = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return processedSales.slice(offset, offset + itemsPerPage);
  }, [processedSales, currentPage]);

  useEffect(() => {
    if (currentPage > 1 && paginatedSales.length === 0) {
      setCurrentPage(1);
    }
  }, [paginatedSales, currentPage]);

  // 🚀 EXECUTED ONLY AFTER CUSTOMER APPRIVES FROM INLINE OVERLAY UI
  const executeRemoveSale = async (id: string) => {
    setIsRemoving(true);

    try {
      const { error: itemError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", id);

      if (itemError) {
        throw itemError;
      }

      const { error } = await supabase.from("sales").delete().eq("id", id);

      if (error) {
        throw error;
      }

      setSales((prev) => prev.filter((sale) => sale.id !== id));
      if (selectedSale?.id === id) {
        handleCloseDetails();
      }
      toast.success("Transaction row removed successfully.");
      setRemovingSaleId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to safely purge sale items.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleGeneratePDF = async (sale: Sale) => {
    setPdfLoadingId(sale.id);
    try {
      const shopMeta = {
        name: "ကြည်ဖြူ Electric Market",
        address:
          "အင်းစိန်မြို့န​ယ် ၊​ ပြည်လမ်း ဆယ်မိုင်ကုန်း မှတ်တိုင်အနီး (ကြည်ဖြူ ကုန်ပေဒသာဆိုင်)",
        phone: "09420580865 / 09455166228 / 09420580866",
        qrUrl: "/qr.png",
      };

      // Included product_code in query select for layout parsing
      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(
          "quantity, price, discount, subtotal, product_id, products(name, image, product_code)",
        )
        .eq("sale_id", sale.id);

      if (itemsError) throw itemsError;

      const { data: deliveryData } = await supabase
        .from("delivery")
        .select("delivery_address, delivered_time")
        .eq("sale_id", sale.id)
        .maybeSingle();

      if (!items || items.length === 0) {
        toast.error("No product line items found for this sale record.");
        return;
      }

      const computedSubtotal = items.reduce(
        (acc, i) => acc + Number(i.price) * Number(i.quantity),
        0,
      );
      const totalDiscount = items.reduce(
        (acc, i) =>
          acc +
          Number(i.price) *
            Number(i.quantity) *
            (Number(i.discount || 0) / 100),
        0,
      );

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error("Could not access iframe context frame.");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @font-face {
              font-family: 'Pyidaungsu';
              src: url('/fonts/pyidaungsu.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
            }
            @page {
              size: A4;
              margin: 0;
            }
            body {
              font-family: 'Pyidaungsu', sans-serif;
              color: #1E293B;
              background-color: #ffffff;
              margin: 0;
              padding: 20mm; 
              font-size: 11px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
            .shop-info { display: flex; gap: 14px; }
            .shop-text-logo { font-size: 38px; font-weight: 900; margin: 0; color: #eb7d2d; line-height: 1; }
            .shop-name { font-size: 16px; font-weight: bold; margin: 0 0 4px 0; color: #1E293B; }
            .meta-box { display: flex; background-color: #F8FAFC; padding: 12px; border-radius: 6px; justify-content: space-between; margin-bottom: 20px; }
            .meta-title { font-size: 9px; font-weight: bold; color: #64748B; margin-bottom: 3px; letter-spacing: 0.5px; }
            .meta-value { font-weight: 500; font-size: 11px; }
            .delivery-box { margin-bottom: 20px; background-color: #F8FAFC; padding: 12px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background-color: #F2A974 !important; color: #ffffff !important; padding: 8px 10px; font-size: 10px; text-align: left; }
            td { padding: 6px 10px; border-bottom: 1px solid #E2E8F0; font-size: 11px; vertical-align: middle; }
            .prod-img { width: 26px; height: 26px; border-radius: 4px; object-fit: cover; }
            .prod-img-placeholder { width: 26px; height: 26px; background: #E2E8F0; border-radius: 4px; }
            .qr-logo { width: 55px; height: 55px; object-fit: contain; }
            .summary-container { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; margin-bottom: 30px; }
            .summary-row { width: 250px; display: flex; justify-content: space-between; color: #64748B; font-size: 11px; }
            .summary-total { width: 250px; border-top: 1px solid #E2E8F0; margin-top: 4px; padding-top: 6px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; color: #F2A974; }
            .footer { margin-top: 40px; border-top: 1px solid #F1F5F9; padding-top: 12px; text-align: center; font-style: italic; color: #64748B; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="shop-info">
              <p class="shop-text-logo">KP</p>
              <div>
                <h1 class="shop-name">${shopMeta.name}</h1>
                <p style="margin: 0 0 4px 0; max-width: 440px;">${shopMeta.address}</p>
                <p style="margin: 0;"><strong>Phone:</strong> ${shopMeta.phone}</p>
              </div>
            </div>
            <img src="${shopMeta.qrUrl}" class="qr-logo" />
          </div>

          <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />

          <div class="meta-box">
            <div>
              <div class="meta-title">CUSTOMER Name</div>
              <div class="meta-value">${sale.customer_name || "Walk-in Customer"}</div>
            </div>
            <div>
              <div class="meta-title">INVOICE ID</div>
              <div class="meta-value" style="font-family: monospace;">#${sale.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div>
              <div class="meta-title">DATE</div>
              <div class="meta-value">${sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "N/A"}</div>
            </div>
          </div>

          ${
            deliveryData?.delivery_address
              ? `
            <div class="delivery-box">
              <div class="meta-title">Delivery Service</div>
              <div class="meta-value" style="color: #1E293B;">${deliveryData.delivery_address}</div>
            </div>
          `
              : ""
          }

          <table>
            <thead>
              <tr>
                <th style="border-top-left-radius: 4px; border-bottom-left-radius: 4px; width: 40px;">Img</th>
                <th style="width: 80px;">Code</th>
                <th>Product Item</th>
                <th style="text-align: center; width: 40px;">Qty</th>
                <th style="text-align: right; width: 90px;">Unit Price</th>
                <th style="text-align: center; width: 50px;">Disc.</th>
                <th style="text-align: right; border-top-right-radius: 4px; border-bottom-right-radius: 4px; width: 100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item: any, idx: number) => `
                <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#F8FAFC"}">
                  <td>
                    ${item.products?.image ? `<img src="${item.products.image}" class="prod-img" />` : `<div class="prod-img-placeholder"></div>`}
                  </td>
                  <td style="font-family: monospace; color: #64748B; font-size: 10px;">${item.products?.product_code || "-"}</td>
                  <td style="font-weight: 500; color: #1E293B;">${item.products?.name || "Unreferenced Item"}</td>
                  <td style="text-align: center; color: #475569;">${item.quantity}</td>
                  <td style="text-align: right; color: #475569;">${Number(item.price).toLocaleString()} MMK</td>
                  <td style="text-align: center; color: #475569;">${item.discount > 0 ? `${item.discount}%` : "-"}</td>
                  <td style="text-align: right; font-weight: 500; color: #1E293B;">${Number(item.subtotal).toLocaleString()} MMK</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="summary-row">
              <span>Items total:</span>
              <span style="color: #1E293B; font-weight: 500;">${computedSubtotal.toLocaleString()} MMK</span>
            </div>
            ${
              totalDiscount > 0
                ? `
              <div class="summary-row">
                <span>Discounts Applied:</span>
                <span style="color: #EF4444; font-weight: 500;">-${totalDiscount.toLocaleString()} MMK</span>
              </div>
            `
                : ""
            }
            <div class="summary-total">
              <span>Grand Total Due:</span>
              <span>${Number(sale.total_amount).toLocaleString()} MMK</span>
            </div>
          </div>

          <div class="footer">
            For every home & every need
          </div>
        </body>
        </html>
      `;

      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
    } catch (err) {
      console.error("Critical Print Framework Engine Failure:", err);
      toast.error("Failed to parse native receipt text shaping elements.");
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-xs font-semibold text-slate-500">
            Sale Type
          </label>
          <select
            value={saleTypeFilter}
            onChange={(e) => {
              setSaleTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
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
            onChange={(e) => {
              setAmountSort(e.target.value as any);
              setCurrentPage(1);
            }}
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
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
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
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
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
      {loading ? (
        <p className="text-slate-400 text-sm">Loading records...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">No.</TableHead>
              <TableHead>Sale ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Sale Type</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Sale Date</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-slate-400"
                >
                  No sales records found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale, index) => {
                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                return (
                  <React.Fragment key={sale.id}>
                    <TableRow
                      className={
                        removingSaleId === sale.id ? "bg-red-50/20" : ""
                      }
                    >
                      <TableCell className="font-semibold text-slate-500 text-sm">
                        {rowNumber}
                      </TableCell>

                      <TableCell className="font-medium font-mono text-xs">
                        #{sale.id.slice(0, 8).toUpperCase()}
                      </TableCell>

                      <TableCell>{sale.customer_name}</TableCell>

                      <TableCell>
                        {sale.sale_type === "DELIVERY" ? (
                          <span className="text-orange-500 font-semibold text-xs">
                            DELIVERY
                          </span>
                        ) : (
                          <span className="text-green-600 font-semibold text-xs">
                            IN PERSON
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="font-semibold">
                        {Number(sale.total_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        MMK
                      </TableCell>

                      <TableCell>
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-4">
                          <button
                            onClick={() => {
                              setRemovingSaleId(null);
                              handleOpenDetails(sale);
                            }}
                            className="text-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>

                          <button
                            disabled={pdfLoadingId !== null}
                            onClick={() => handleGeneratePDF(sale)}
                            className="text-emerald-500 hover:text-emerald-700 cursor-pointer transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
                            title={
                              pdfLoadingId === sale.id
                                ? "Preparing PDF..."
                                : "Download PDF Receipt"
                            }
                          >
                            {pdfLoadingId === sale.id ? (
                              <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-400" />
                            ) : (
                              <FileDown className="w-4.5 h-4.5" />
                            )}
                          </button>

                          <button
                            onClick={() => setRemovingSaleId(sale.id)}
                            className="text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                            title="Remove Sale Record"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {removingSaleId === sale.id && (
                      <TableRow className="bg-red-50/40 border-t border-b border-red-200 hover:bg-red-50/40">
                        <TableCell colSpan={7} className="p-4">
                          <div className="bg-white p-4 rounded-md border border-red-200 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-full text-red-600 hidden sm:block">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                <h4 className="text-sm font-bold text-slate-800">
                                  Confirm Sale Deletion
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Delete invoice{" "}
                                  <span className="font-mono font-bold text-red-600">
                                    #{sale.id.slice(0, 8).toUpperCase()}
                                  </span>{" "}
                                  for customer{" "}
                                  <span className="font-semibold">
                                    "{sale.customer_name || "Walk-in"}"
                                  </span>
                                  ?
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isRemoving}
                                onClick={() => setRemovingSaleId(null)}
                                className="h-8 text-slate-600 border-slate-200"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={isRemoving}
                                onClick={() => executeRemoveSale(sale.id)}
                                className="h-8 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
                              >
                                {isRemoving ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                    Dropping...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Remove Sale
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      )}

      {/* --- Pagination Element Bar Layout --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
          <p className="text-xs font-medium text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-700">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* --- Filter-Affected Dynamic Summary Cards Panel --- */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 mt-8">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Revenue</p>
                <h2 className="text-3xl font-bold tracking-tight mt-2 text-slate-900">
                  {statsMetrics.revenue.toLocaleString()} MMK
                </h2>
              </div>
              <div className="rounded-2xl p-4 bg-emerald-100">
                <DollarSign className="w-7 h-7 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Orders</p>
                <h2 className="text-3xl font-bold tracking-tight mt-2 text-slate-900">
                  {statsMetrics.ordersCount.toLocaleString()}
                </h2>
              </div>
              <div className="rounded-2xl p-4 bg-blue-100">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Details Popup Dialog Overlay --- */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Sale Details
                  <span className="text-xs font-normal font-mono text-slate-400">
                    #{selectedSale.id}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer:{" "}
                  <span className="font-medium text-slate-700">
                    {selectedSale.customer_name}
                  </span>{" "}
                  • Date:{" "}
                  {new Date(selectedSale.sale_date).toLocaleDateString()}
                </p>
              </div>

              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedSale.sale_type === "DELIVERY"
                    ? "bg-orange-100 text-orange-600 border border-orange-200"
                    : "bg-green-100 text-green-600 border border-green-200"
                }`}
              >
                {selectedSale.sale_type === "DELIVERY"
                  ? "DELIVERY"
                  : "IN PERSON"}
              </span>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs">Fetching purchased items...</p>
                </div>
              ) : selectedSaleItems.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">
                  No registered items attached to this sale.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: "90px" }}>Code</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSaleItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {item.product_code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {item.product_name}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.price.toLocaleString()} MMK</TableCell>
                        <TableCell>
                          {item.discount > 0 ? `${item.discount}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">
                          {item.subtotal.toLocaleString()} MMK
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block uppercase font-medium">
                  Grand Total
                </span>
                <span className="text-lg font-extrabold text-green-600">
                  {Number(selectedSale.total_amount).toLocaleString()} MMK
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGeneratePDF(selectedSale)}
                  disabled={pdfLoadingId === selectedSale.id}
                >
                  {pdfLoadingId === selectedSale.id
                    ? "Building PDF..."
                    : "PDF Receipt"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCloseDetails}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

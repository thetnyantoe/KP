"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export default function SalesDetails() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  // 🛡️ Safe tracking states for the custom inline row elimination overlay
  const [removingSaleId, setRemovingSaleId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "IN_PERSON" | "DELIVERY"
  >("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

    // 2. fetch sale_items + products (including product_code)
    const { data: items } = await supabase.from("sale_items").select(`
        *,
        products (
          name,
          image,
          product_code
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
        totalAmount: sale.total_amount,
        items: saleItems.map((i) => ({
          productCode: i.products?.product_code || "-",
          product: i.products?.name || "Unknown",
          image: i.products?.image || null,
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

  // 🚀 EXECUTED ONLY AFTER CUSTOMER APPROVES FROM INLINE OVERLAY UI
  const executeRemoveSale = async (saleId: string) => {
    setIsRemoving(true); // 🔒 Lock double clicks

    try {
      const { error: itemError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleId);

      if (itemError) {
        throw itemError;
      }

      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleId);

      if (saleError) {
        throw saleError;
      }

      setOrders((prev) => prev.filter((order) => order.id !== saleId));
      toast.success("Sale removed successfully.");
      setRemovingSaleId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to safely remove sale elements.");
    } finally {
      setIsRemoving(false); // 🔓 Unlock interface
    }
  };

  const handleGeneratePDF = async (order: any) => {
    setPdfLoadingId(order.id);
    try {
      const shopMeta = {
        name: "ကြည်ဖြူ Electric Market",
        address:
          "အင်းစိန်မြို့န​ယ် ၊​ ပြည်လမ်း ဆယ်မိုင်ကုန်း မှတ်တိုင်အနီး (ကြည်ဖြူ ကုန်ပဒေသာဆိုင်)",
        phone: "09420580865 / 09455166228 / 09420580866",
        qrUrl: "/qr.png",
      };

      const { data: deliveryData } = await supabase
        .from("delivery")
        .select("delivery_address")
        .eq("sale_id", order.id)
        .maybeSingle();

      const computedSubtotal = order.items.reduce(
        (acc: number, i: any) => acc + Number(i.price) * Number(i.qty),
        0,
      );
      const totalDiscount = order.items.reduce(
        (acc: number, i: any) =>
          acc +
          Number(i.price) * Number(i.qty) * (Number(i.discount || 0) / 100),
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
            @page { size: A4; margin: 0; }
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
              <div class="meta-value">${order.customer || "Walk-in Customer"}</div>
            </div>
            <div>
              <div class="meta-title">INVOICE ID</div>
              <div class="meta-value" style="font-family: monospace;">#${order.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div>
              <div class="meta-title">DATE</div>
              <div class="meta-value">${order.date ? new Date(order.date).toLocaleDateString() : "N/A"}</div>
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
              ${order.items
                .map(
                  (item: any, idx: number) => `
                <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#F8FAFC"}">
                  <td>
                    ${item.image ? `<img src="${item.image}" class="prod-img" />` : `<div class="prod-img-placeholder"></div>`}
                  </td>
                  <td style="font-family: monospace; color: #64748B; font-size: 10px;">${item.productCode}</td>
                  <td style="font-weight: 500; color: #1E293B;">${item.product}</td>
                  <td style="text-align: center; color: #475569;">${item.qty}</td>
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
              <span>${Number(order.totalAmount).toLocaleString()} MMK</span>
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
      console.error("Critical Print Framework Failure:", err);
      toast.error("Failed to parse native receipt text shaping elements.");
    } finally {
      setPdfLoadingId(null);
    }
  };

  // --- Reset Filters Helper ---
  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setCurrentPage(1);
  };

  // --- Dynamic Filtering Logic ---
  const filteredOrders = useMemo(() => {
    let checked = [...orders];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      checked = checked.filter(
        (order) =>
          order.customer?.toLowerCase().includes(query) ||
          order.id?.toLowerCase().includes(query),
      );
    }

    if (typeFilter !== "ALL") {
      checked = checked.filter((order) => order.saleType === typeFilter);
    }

    return checked;
  }, [orders, searchQuery, typeFilter]);

  // --- Pagination Index Slicing Math ---
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const paginatedOrders = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(offset, offset + itemsPerPage);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    if (currentPage > 1 && paginatedOrders.length === 0) {
      setCurrentPage(1);
    }
  }, [paginatedOrders, currentPage]);

  if (loading) {
    return <p className="p-5">Loading sales...</p>;
  }

  return (
    <div className="mx-[20px] my-[20px]">
      <h1 className="text-2xl font-bold mb-5">Sales Details</h1>

      {/* --- Filter Controls Panel Component UI --- */}
      <div className="flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
        <div className="flex flex-col gap-1 min-w-[240px] flex-1">
          <label className="text-xs font-semibold text-slate-500">
            Search Orders
          </label>
          <input
            type="text"
            placeholder="Search customer name or order ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm outline-none bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs font-semibold text-slate-500">
            Order Channel
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="IN_PERSON">In Person</option>
            <option value="DELIVERY">Delivery</option>
          </select>
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

      {/* --- Orders View Body Loops --- */}
      {paginatedOrders.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg text-slate-400">
          No matching transaction records discovered.
        </div>
      ) : (
        paginatedOrders.map((order) => {
          const total = order.items.reduce((sum: number, item: any) => {
            return sum + item.subtotal;
          }, 0);

          return (
            <div
              key={order.id}
              className={`border rounded-lg p-4 shadow-sm mb-4 transition-colors duration-200 ${
                removingSaleId === order.id
                  ? "border-red-300 bg-red-50/10"
                  : "border-[#f7d8c1] bg-white"
              }`}
            >
              {/* HEADER */}
              <div className="flex justify-between mb-4 ">
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
                    <TableHead style={{ width: "90px" }}>Code</TableHead>
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
                      <TableCell className="font-mono text-xs text-slate-500">
                        {item.productCode}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.product}
                      </TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>
                        {Number(item.price).toLocaleString()} MMK
                      </TableCell>
                      <TableCell>{item.discount}%</TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(item.subtotal).toLocaleString()} MMK
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* FOOTER */}
              <div className="flex justify-between items-center mt-4 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-800">
                  <span className=" font-normal">Total:</span>{" "}
                  <span className="text-green-600">
                    {total.toLocaleString()} MMK
                  </span>
                </div>

                <div className="flex gap-3 text-sm">
                  <button
                    disabled={pdfLoadingId !== null}
                    onClick={() => handleGeneratePDF(order)}
                    className="text-blue-500 cursor-pointer hover:underline disabled:text-slate-300"
                  >
                    {pdfLoadingId === order.id ? "Preparing..." : "PDF Receipt"}
                  </button>
                  <button
                    onClick={() => setRemovingSaleId(order.id)} // 🎯 Active custom confirm drawer state toggle
                    className="text-red-500 cursor-pointer hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* 🔥 COOL INLINE CARD DRAWER OVERLAY */}
              {removingSaleId === order.id && (
                <div className="mt-4 p-4 rounded-md border border-red-200 bg-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-full text-red-600 hidden sm:block">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-slate-800">
                        Confirm Sale Delete
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Drop sale{" "}
                        <span className="font-mono font-bold text-red-600">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>{" "}
                        for customer{" "}
                        <span className="font-semibold">
                          "{order.customer || "Walk-in"}"
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
                      onClick={() => executeRemoveSale(order.id)}
                      className="h-8 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
                    >
                      {isRemoving ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                          Deleting sale...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Confirm Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
          <p className="text-xs font-medium text-slate-500">
            Showing Page{" "}
            <span className="font-semibold text-slate-700">{currentPage}</span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span>{" "}
            (\
            {filteredOrders.length} total entries)
          </p>
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
    </div>
  );
}

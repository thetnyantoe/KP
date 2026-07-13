"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "react-toastify";
import { Package, Wallet } from "lucide-react";

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Filter and Sort States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("all");
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const deleteProduct = async (product: any) => {
    try {
      let fileName = null;

      if (product.image) {
        const url = new URL(product.image);
        const fullPath = url.pathname;
        fileName = fullPath.split("/product-images/")[1];
        fileName = decodeURIComponent(fileName);
      }

      if (fileName) {
        await supabase.storage.from("product-images").remove([fileName]);
      }

      // 💥 Step A: Clear out dependent order references to satisfy foreign keys
      const { error: cascadeError } = await supabase
        .from("sale_items")
        .delete()
        .eq("product_id", product.id); // Checks matching column connection name in your table schema

      if (cascadeError) {
        console.log("Sale items clearance failed:", cascadeError);
      }

      // 💥 Step B: Execute the final root product deletion safely
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.log("DB delete error:", error);
        toast.error(`DB Error: ${error.message}`);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product and linked items purged successfully.");
    } catch (err) {
      console.log("Delete execution failed:", err);
      toast.error("Delete failed");
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    if (!editForm) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: editForm.name,
          product_code: editForm.product_code?.trim() || null,
          original_price: Number(editForm.original_price || 0),
          sell_price: Number(editForm.sell_price || 0),
          quantity: Number(editForm.quantity || 0),
          warranty: editForm.warranty,
          description: editForm.description,
          status: editForm.status,
        })
        .eq("id", productId);

      if (error) {
        console.error("Database update failure:", error);
        if (error.code === "23505") {
          toast.error("Update failed: Product code must be completely unique.");
        } else {
          toast.error(`Update failed: ${error.message}`);
        }
        return;
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, ...editForm } : item,
        ),
      );

      toast.success("Product updated successfully.");
      setEditingProductId(null);
      setEditForm(null);
    } catch (err) {
      console.error("Update error context:", err);
      toast.error("An unexpected error occurred during update.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleEditRow = (product: any) => {
    if (editingProductId === product.id) {
      setEditingProductId(null);
      setEditForm(null);
    } else {
      setEditingProductId(product.id);
      setEditForm({
        name: product.name || "",
        product_code: product.product_code || "",
        original_price: product.original_price || 0,
        sell_price: product.sell_price || 0,
        quantity: product.quantity || 0,
        warranty: product.warranty || "",
        description: product.description || "",
        status: product.status || "Active",
      });
    }
  };

  const getQuantityBadge = (quantity: number) => {
    if (quantity === 0)
      return "bg-slate-200 text-slate-700 border border-slate-200";
    if (quantity <= 10) return "bg-red-200 text-red-700 border border-red-200";
    if (quantity <= 30)
      return "bg-yellow-200 text-yellow-700 border border-yellow-200";
    return "bg-green-200 text-green-700 border border-green-200";
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setQuantityFilter("all");
    setPriceSort("none");
    setDateSort("desc");
    setCurrentPage(1);
  };

  const processedProducts = useMemo(() => {
    let result = [...products];

    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.product_code?.toLowerCase().includes(query),
      );
    }

    if (quantityFilter !== "all") {
      result = result.filter((p) => {
        if (quantityFilter === "out") return p.quantity === 0;
        if (quantityFilter === "low") return p.quantity > 0 && p.quantity <= 10;
        if (quantityFilter === "medium")
          return p.quantity > 10 && p.quantity <= 30;
        if (quantityFilter === "high") return p.quantity > 30;
        return true;
      });
    }

    result.sort((a, b) => {
      if (priceSort !== "none") {
        if (priceSort === "asc") return a.sell_price - b.sell_price;
        if (priceSort === "desc") return b.sell_price - a.sell_price;
      }

      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateSort === "asc") return dateA - dateB;
      return dateB - dateA;
    });

    return result;
  }, [products, searchTerm, quantityFilter, priceSort, dateSort]);

  const totalStats = useMemo(() => {
    return processedProducts.reduce(
      (acc, product) => {
        const qty = Number(product.quantity || 0);
        const originalPrice = Number(product.original_price || 0);

        acc.totalCount += qty;
        acc.totalInvestment += originalPrice * qty;

        if (qty === 0) acc.outOfStock += 1;
        else if (qty <= 10) acc.lowStock += 1;
        else if (qty <= 30) acc.mediumStock += 1;
        else acc.highStock += 1;

        return acc;
      },
      {
        totalCount: 0,
        totalInvestment: 0,
        outOfStock: 0,
        lowStock: 0,
        mediumStock: 0,
        highStock: 0,
      },
    );
  }, [processedProducts]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(start, start + itemsPerPage);
  }, [processedProducts, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => router.push("/admin/addproduct")}>
          + Add Product
        </Button>
      </div>

      {/* Filter Controls Panel */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500">
            Search Product
          </label>
          <input
            type="text"
            placeholder="Search name or product code..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs font-semibold text-slate-500">
            Qty Status
          </label>
          <select
            value={quantityFilter}
            onChange={(e) => {
              setQuantityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Quantities</option>
            <option value="out">Out of Stock (0)</option>
            <option value="low">Low (1 - 10)</option>
            <option value="medium">Medium (11 - 30)</option>
            <option value="high">High (&gt; 30)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-semibold text-slate-500">
            Sort Price
          </label>
          <select
            value={priceSort}
            onChange={(e) => {
              setPriceSort(e.target.value as any);
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="none">Default</option>
            <option value="asc">Low to High</option>
            <option value="desc">High to Low</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="text-xs font-semibold text-slate-500">
            Sort Date
          </label>
          <select
            value={dateSort}
            onChange={(e) => {
              setDateSort(e.target.value as any);
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        <div className="flex items-end h-full pt-5">
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Code</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Original Price</TableHead>
                <TableHead>Sell Price</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-slate-400"
                  >
                    No products found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((p) => (
                  <React.Fragment key={p.id}>
                    <TableRow
                      className={
                        editingProductId === p.id ? "bg-slate-50/80" : ""
                      }
                    >
                      <TableCell className="font-semibold text-slate-700 font-mono">
                        {p.product_code || "N/A"}
                      </TableCell>

                      <TableCell>
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                      </TableCell>

                      <TableCell>{p.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {p.description}
                      </TableCell>
                      <TableCell>
                        {Number(p.original_price || 0).toLocaleString()} MMK
                      </TableCell>
                      <TableCell className="text-green-600">
                        {Number(p.sell_price || 0).toLocaleString()} MMK
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex min-w-[40px] justify-center rounded-full py-1 text-sm font-semibold ${getQuantityBadge(p.quantity)}`}
                        >
                          {p.quantity}
                        </span>
                      </TableCell>

                      <TableCell>{p.warranty || "N/A"}</TableCell>
                      <TableCell>
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <button
                          onClick={() => toggleEditRow(p)}
                          className="text-blue-500 mr-3 hover:underline"
                        >
                          {editingProductId === p.id ? "Cancel" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteProduct(p)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Dropdown Edit Form Row */}
                    {editingProductId === p.id && editForm && (
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-t border-b border-blue-100">
                        <TableCell colSpan={10} className="p-4">
                          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                              <h3 className="font-semibold text-slate-700 text-sm">
                                Quick Edit Product:{" "}
                                <span className="text-blue-600">{p.name}</span>
                              </h3>
                              <span className="text-xs text-slate-400 font-mono">
                                Database ID: {p.id}
                              </span>
                            </div>

                            {/* Form Grid UI */}
                            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Product Code
                                </label>
                                <input
                                  type="text"
                                  value={editForm.product_code}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "product_code",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. ELEC-001"
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500 font-mono"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Product Name
                                </label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) =>
                                    handleInputChange("name", e.target.value)
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Original Price (MMK)
                                </label>
                                <input
                                  type="number"
                                  value={editForm.original_price}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "original_price",
                                      e.target.value,
                                    )
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Selling Price (MMK)
                                </label>
                                <input
                                  type="number"
                                  value={editForm.sell_price}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "sell_price",
                                      e.target.value,
                                    )
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Warranty
                                </label>
                                <input
                                  type="text"
                                  value={editForm.warranty}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "warranty",
                                      e.target.value,
                                    )
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1 md:col-span-2 xl:col-span-4">
                                <label className="text-xs font-medium text-slate-500">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={editForm.description}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  className="border rounded p-1.5 text-sm outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">
                                  Status
                                </label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) =>
                                    handleInputChange("status", e.target.value)
                                  }
                                  className="border rounded p-1.5 text-sm bg-white outline-none focus:border-blue-500"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                </select>
                              </div>
                              <div className="flex items-end justify-end gap-2 pt-2 md:pt-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isSaving}
                                  onClick={() => {
                                    setEditingProductId(null);
                                    setEditForm(null);
                                  }}
                                >
                                  Close
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleUpdateProduct(p.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 px-2">
              <span className="text-sm text-slate-500">
                Showing Page <strong>{currentPage}</strong> of {totalPages} (
                {processedProducts.length} filtered items)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
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

          {/* Summary Investment Stats Cards */}
          <div className="grid gap-5 grid-cols-1 md:grid-cols-3 mt-4">
            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-500">
                        Total Stock Count
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-purple-600 bg-purple-50">
                        Global Inventory
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mt-3">
                      {totalStats.totalCount.toLocaleString()} units
                    </h2>
                  </div>
                  <div className="rounded-2xl p-4 bg-purple-100">
                    <Package className="w-7 h-7 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-500">
                        Total Investment Value
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
                        Cost Basis
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mt-3">
                      {totalStats.totalInvestment.toLocaleString()} MMK
                    </h2>
                  </div>
                  <div className="rounded-2xl p-4 bg-emerald-100">
                    <Wallet className="w-7 h-7 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-sm font-medium text-slate-500">
                        Stock Status
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-blue-600 bg-blue-50">
                        Products
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div
                          className={`text-xl font-extrabold ${totalStats.outOfStock > 0 ? "text-red-500" : "text-slate-700"}`}
                        >
                          {totalStats.outOfStock}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                          Out
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-orange-500">
                          {totalStats.lowStock}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                          Low
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-amber-500">
                          {totalStats.mediumStock}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                          Med
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-emerald-500">
                          {totalStats.highStock}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">
                          High
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

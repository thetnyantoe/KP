"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabase";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { toast } from "react-toastify";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Filter and Sort States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [quantityFilter, setQuantityFilter] = useState("all"); // all, low, medium, high
  const [priceSort, setPriceSort] = useState<"none" | "asc" | "desc">("none");
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc"); // Default to newest first

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
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .remove([fileName]);

        if (storageError) {
          console.log("Storage delete error:", storageError);
        }
      }

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.log("DB delete error:", error);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted successfully.");
    } catch (err) {
      console.log("Delete failed:", err);
      toast.error("Delete failed");
    }
  };

  const getQuantityBadge = (quantity: number) => {
    if (quantity <= 10) {
      return "bg-red-200 text-red-700 border border-red-200";
    }
    if (quantity <= 30) {
      return "bg-yellow-200 text-yellow-700 border border-yellow-200";
    }
    return "bg-green-200 text-green-700 border border-green-200";
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setQuantityFilter("all");
    setPriceSort("none");
    setDateSort("desc");
  };

  // --- Computed Products Array (Filtering and Sorting) ---
  const processedProducts = useMemo(() => {
    let result = [...products];

    // 1. Text Search Filter
    if (searchTerm.trim() !== "") {
      result = result.filter((p) =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // 2. Quantity Status Filter
    if (quantityFilter !== "all") {
      result = result.filter((p) => {
        if (quantityFilter === "low") return p.quantity <= 10;
        if (quantityFilter === "medium")
          return p.quantity > 10 && p.quantity <= 30;
        if (quantityFilter === "high") return p.quantity > 30;
        return true;
      });
    }

    // 3. Price & Date Sorting
    result.sort((a, b) => {
      // Apply price sort if active
      if (priceSort !== "none") {
        if (priceSort === "asc") return a.sell_price - b.sell_price;
        if (priceSort === "desc") return b.sell_price - a.sell_price;
      }

      // Fallback or explicit date sorting
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateSort === "asc") return dateA - dateB;
      return dateB - dateA; // Default "desc"
    });

    return result;
  }, [products, searchTerm, quantityFilter, priceSort, dateSort]);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button>
          <Link href="/admin/addproduct">+ Add Product</Link>
        </Button>
      </div>

      {/* --- Filter Controls Panel --- */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500">
            Search Product
          </label>
          <input
            type="text"
            placeholder="Type to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs font-semibold text-slate-500">
            Qty Status
          </label>
          <select
            value={quantityFilter}
            onChange={(e) => setQuantityFilter(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Quantities</option>
            <option value="low">Low (≤ 10)</option>
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
            onChange={(e) => setPriceSort(e.target.value as any)}
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
            onChange={(e) => setDateSort(e.target.value as any)}
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Sell Price</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Warranty</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {processedProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-8 text-slate-400"
                >
                  No products found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              processedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.id.slice(0, 6)}
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

                  <TableCell>{p.original_price} MMK</TableCell>

                  <TableCell className="text-green-600">
                    {p.sell_price} MMK
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex min-w-[40px] justify-center rounded-full py-1 text-sm font-semibold ${getQuantityBadge(
                        p.quantity,
                      )}`}
                    >
                      {p.quantity}
                    </span>
                  </TableCell>

                  <TableCell>{p.warranty}</TableCell>

                  <TableCell>
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>

                  <TableCell>
                    <span
                      className={
                        p.status === "Active"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {p.status}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <button className="text-blue-500 mr-3">Edit</button>

                    <button
                      onClick={() => deleteProduct(p)}
                      className="text-red-500"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

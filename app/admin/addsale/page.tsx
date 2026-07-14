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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Loader2,
  Save,
  X,
  Search,
  ChevronDown,
} from "lucide-react";

type SaleItem = {
  product_id: string;
  product_name: string;
  qty: number | string;
  price: number | string;
  discount: number | string;
  subtotal: number;
};

export default function AddSale() {
  const today = new Date().toISOString().split("T")[0];

  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(today);
  const [products, setProducts] = useState<any[]>([]);
  const [saleType, setSaleType] = useState<"IN_PERSON" | "DELIVERY">(
    "IN_PERSON",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [items, setItems] = useState<SaleItem[]>([
    {
      product_id: "",
      product_name: "",
      qty: 1,
      price: 0,
      discount: 0,
      subtotal: 0,
    },
  ]);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownIndex(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // =========================
  // LOAD PRODUCTS
  // =========================
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, product_code, sell_price, quantity");

    setProducts(data || []);
  };

  // =========================
  // PRODUCT CHANGE
  // =========================
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const updated = [...items];

    const maxAvailable = product ? product.quantity : 0;
    let initialQty = 1;
    if (maxAvailable <= 0) {
      initialQty = 0;
    }

    updated[index].product_id = productId;
    updated[index].product_name = product?.name || "";
    updated[index].price = product?.sell_price || 0;
    updated[index].qty = initialQty;
    updated[index].discount = 0;

    // 💡 Convert both discount and price safely to numbers for the math calculation
    const numericDiscount = Number(updated[index].discount) || 0;
    const numericPrice = Number(updated[index].price) || 0;

    updated[index].subtotal =
      initialQty * numericPrice * (1 - numericDiscount / 100);

    setItems(updated);
    setActiveDropdownIndex(null);
    setSearchQuery("");
  };

  const handleChange = (
    index: number,
    field: "qty" | "price" | "discount",
    value: string,
  ) => {
    const updated = [...items];
    const targetProduct = products.find(
      (p) => p.id === updated[index].product_id,
    );

    // 💡 Allow the field to be genuinely blank while typing!
    if (value === "") {
      // Cast the dynamic assignment to allow writing string to these keys safely
      (updated[index] as any)[field] = "";
      updated[index].subtotal = 0; // Temporarily make subtotal 0
      setItems(updated);
      return;
    }

    let numericValue = Number(value);

    if (field === "qty" && targetProduct) {
      if (numericValue > targetProduct.quantity) {
        toast.warning(
          `Cannot exceed available stock (${targetProduct.quantity} units remaining)`,
        );
        numericValue = targetProduct.quantity;
      }
    }

    if (field === "discount") {
      if (numericValue > 100) numericValue = 100;
      if (numericValue < 0) numericValue = 0;
    }

    if (field === "qty" && numericValue < 0) numericValue = 0;

    // Cast the dynamic assignment to allow writing the number safely
    (updated[index] as any)[field] = numericValue;

    const item = updated[index];
    const itemQty = Number(item.qty) || 0;
    const itemPrice = Number(item.price) || 0;
    const itemDiscount = Number(item.discount) || 0;

    item.subtotal = itemQty * itemPrice * (1 - itemDiscount / 100);

    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        product_id: "",
        product_name: "",
        qty: 1,
        price: 0,
        discount: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  const handlePreSave = () => {
    const validItems = items.filter((item) => item.product_id !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product before saving.");
      return;
    }

    for (const item of validItems) {
      if (!item.qty || Number(item.qty) <= 0) {
        toast.error(
          `Please provide a valid quantity for item: ${item.product_name}`,
        );
        return;
      }
    }

    setShowConfirm(true);
  };

  const executeSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);

    try {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            customer_name: customer || "Walk-in Customer",
            sale_date: date,
            total_amount: total,
            status: "Pending",
            sale_type: saleType,
          },
        ])
        .select()
        .single();

      if (saleError) {
        throw saleError;
      }

      for (const item of items) {
        if (!item.product_id) continue;

        const finalQty = Number(item.qty) || 0;

        await supabase.from("sale_items").insert([
          {
            sale_id: sale.id,
            product_id: item.product_id,
            quantity: finalQty,
            price: item.price,
            discount: Number(item.discount) || 0,
            subtotal: item.subtotal,
          },
        ]);

        const product = products.find((p) => p.id === item.product_id);

        if (product) {
          await supabase
            .from("products")
            .update({
              quantity: product.quantity - finalQty,
            })
            .eq("id", item.product_id);
        }
      }

      if (saleType === "DELIVERY") {
        await supabase.from("delivery").insert([
          {
            sale_id: sale.id,
            delivery_address: deliveryAddress || null,
            pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
          },
        ]);
      }

      toast.success("Sale created successfully.");

      setCustomer("");
      setDate(today);
      setDeliveryAddress("");
      setPickupTime("");
      setItems([
        {
          product_id: "",
          product_name: "",
          qty: 1,
          price: 0,
          discount: 0,
          subtotal: 0,
        },
      ]);
      fetchProducts();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to commit sale data safely.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const codeMatch = p.product_code?.toLowerCase().includes(query);
    const nameMatch = p.name?.toLowerCase().includes(query);
    return codeMatch || nameMatch;
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <h1 className="text-3xl font-bold">Create Sale</h1>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Input
            placeholder="Customer Name"
            value={customer}
            disabled={isSaving}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <Input
            type="date"
            value={date}
            disabled={isSaving}
            onChange={(e) => setDate(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Delivery Checkbox Toggle */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              className="cursor-pointer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              type="checkbox"
              checked={saleType === "DELIVERY"}
              disabled={isSaving}
              onChange={(e) =>
                setSaleType(e.target.checked ? "DELIVERY" : "IN_PERSON")
              }
            />
            <span className="text-sm font-medium text-slate-700">
              Delivery Order
            </span>
          </label>
        </CardContent>
      </Card>

      {/* Delivery Information View */}
      {saleType === "DELIVERY" && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Service Name"
              value={deliveryAddress}
              disabled={isSaving}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={pickupTime}
              disabled={isSaving}
              onChange={(e) => setPickupTime(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* Table Item Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[200px]">
          <Table className="table-fixed w-full overflow-visible">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-[140px]">Qty</TableHead>
                <TableHead className="w-[130px]">Price</TableHead>
                <TableHead className="w-[140px]">Discount (%)</TableHead>
                <TableHead className="w-[140px]">Subtotal</TableHead>
                <TableHead className="w-[90px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const currentSelection = products.find(
                  (p) => p.id === item.product_id,
                );
                const isDropdownOpen = activeDropdownIndex === index;

                return (
                  <TableRow
                    key={index}
                    className={`overflow-visible transition-[height] duration-200 align-top ${
                      isDropdownOpen
                        ? "h-[180px] relative z-50 bg-slate-50/50"
                        : "h-16 relative z-10"
                    }`}
                  >
                    <TableCell className="relative overflow-visible pt-3">
                      <div
                        className="relative w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setActiveDropdownIndex(
                              activeDropdownIndex === index ? null : index,
                            );
                            setSearchQuery("");
                          }}
                          className="flex items-center justify-between border border-slate-200 p-2 rounded w-full bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 text-left h-10 shadow-sm"
                        >
                          <span className="truncate pr-2 block text-slate-800">
                            {currentSelection ? (
                              <>
                                <span className="font-mono font-bold text-blue-600 mr-1.5">
                                  {currentSelection.product_code
                                    ? `[${currentSelection.product_code}]`
                                    : ""}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {currentSelection.name}
                                </span>
                                <span className="text-xs text-slate-500 ml-1.5">
                                  (Stock: {currentSelection.quantity})
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">
                                Choose product...
                              </span>
                            )}
                          </span>
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-auto" />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-0 top-[105%] w-full min-w-[320px] bg-white border border-slate-200 shadow-xl rounded-md z-50 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="relative mb-2">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                autoFocus
                                placeholder="Search by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-slate-200 rounded pl-8 pr-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto space-y-0.5 custom-scrollbar">
                              {filteredProducts.length === 0 ? (
                                <div className="text-xs text-center text-slate-400 py-3">
                                  No matching items found.
                                </div>
                              ) : (
                                filteredProducts.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() =>
                                      handleProductChange(index, p.id)
                                    }
                                    className={`w-full text-left text-xs px-2.5 py-2 rounded transition-colors flex flex-col gap-0.5 ${
                                      item.product_id === p.id
                                        ? "bg-blue-50 text-blue-700 font-medium"
                                        : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-semibold text-slate-900 truncate max-w-[70%]">
                                        {p.product_code
                                          ? `[${p.product_code}] `
                                          : ""}
                                        {p.name}
                                      </span>
                                      <span className="text-[10px] bg-slate-100 font-medium px-1.5 py-0.5 rounded-full text-slate-600 shrink-0">
                                        Stock: {p.quantity}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      Price: {p.sell_price.toLocaleString()} MMK
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[140px] min-w-[140px] max-w-[140px] pt-3">
                      <Input
                        type="number"
                        min={1}
                        max={
                          currentSelection
                            ? currentSelection.quantity
                            : undefined
                        }
                        value={item.qty}
                        disabled={isSaving || !item.product_id}
                        onChange={(e) =>
                          handleChange(index, "qty", e.target.value)
                        }
                        className="w-full h-10 bg-white"
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-slate-600 font-medium truncate text-sm pt-5">
                      {item.price.toLocaleString()} MMK
                    </TableCell>

                    <TableCell className="w-[140px] min-w-[140px] max-w-[140px] pt-3">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount}
                        disabled={isSaving || !item.product_id}
                        onChange={(e) =>
                          handleChange(index, "discount", e.target.value)
                        }
                        className="w-full h-10 bg-white"
                      />
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-blue-600 font-semibold text-sm truncate pt-5">
                      {item.subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                      })}{" "}
                      MMK
                    </TableCell>

                    <TableCell className="w-[90px] min-w-[90px] max-w-[90px] pt-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1 || isSaving}
                        className="h-10 w-full"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button
            className="mt-4"
            variant="outline"
            onClick={addItem}
            disabled={isSaving}
          >
            + Add Product
          </Button>
        </CardContent>
      </Card>

      {/* Bottom Save Context UI Panel */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="font-bold text-slate-600">Total Order Amount</span>
            <span className="font-extrabold text-2xl text-slate-900">
              {total.toLocaleString(undefined, { minimumFractionDigits: 1 })}{" "}
              MMK
            </span>
          </div>

          {/* INLINE CONFIRMATION COMPONENT BOX */}
          {showConfirm && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600 hidden sm:block">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Confirm Ledger Insertion
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  className="h-8 text-slate-600 border-slate-200"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={executeSave}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Confirm
                </Button>
              </div>
            </div>
          )}

          {!showConfirm && (
            <Button
              className="w-full h-11 text-base font-semibold hover:bg-orange-500 text-white transition-all shadow-sm"
              onClick={handlePreSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Order...
                </>
              ) : (
                "Save Sale"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

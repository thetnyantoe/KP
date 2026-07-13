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

type SaleItem = {
  product_id: string;
  product_name: string;
  qty: number;
  price: number;
  discount: number;
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

    updated[index].product_id = productId;
    updated[index].product_name = product?.name || "";
    updated[index].price = product?.sell_price || 0;

    updated[index].subtotal =
      updated[index].qty *
      updated[index].price *
      (1 - updated[index].discount / 100);

    setItems(updated);
  };

  // =========================
  // FIELD CHANGE
  // =========================
  const handleChange = (
    index: number,
    field: "qty" | "price" | "discount",
    value: string,
  ) => {
    const updated = [...items];
    updated[index][field] = Number(value);

    const item = updated[index];
    item.subtotal = item.qty * item.price * (1 - item.discount / 100);

    setItems(updated);
  };

  // =========================
  // ADD / REMOVE ITEM
  // =========================
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

  // =========================
  // SAVE SALE
  // =========================
  const handleSave = async () => {
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          customer_name: customer,
          sale_date: date,
          total_amount: total,
          status: "Pending",
          sale_type: saleType,
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.log(saleError);
      return;
    }

    for (const item of items) {
      if (!item.product_id) continue;

      await supabase.from("sale_items").insert([
        {
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.qty,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        },
      ]);

      const product = products.find((p) => p.id === item.product_id);

      if (product) {
        await supabase
          .from("products")
          .update({
            quantity: product.quantity - item.qty,
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
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <h1 className="text-3xl font-bold">Create Sale</h1>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Input
            placeholder="Customer Name"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              className="cursor-pointer"
              type="checkbox"
              checked={saleType === "DELIVERY"}
              onChange={(e) =>
                setSaleType(e.target.checked ? "DELIVERY" : "IN_PERSON")
              }
            />
            <span>Delivery Order</span>
          </label>
        </CardContent>
      </Card>

      {saleType === "DELIVERY" && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Service Name"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <select
                      className="border p-2 rounded w-full bg-white text-sm"
                      value={item.product_id}
                      onChange={(e) =>
                        handleProductChange(index, e.target.value)
                      }
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.product_code ? `[${p.product_code}] ` : ""}
                          {p.name} (Stock: {p.quantity})
                        </option>
                      ))}
                    </select>
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        handleChange(index, "qty", e.target.value)
                      }
                    />
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {item.price} MMK
                  </TableCell>

                  <TableCell>
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) =>
                        handleChange(index, "discount", e.target.value)
                      }
                    />
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {item.subtotal.toFixed(1)} MMK
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button className="mt-4" variant="outline" onClick={addItem}>
            + Add Product
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold">{total.toFixed(1)} MMK</span>
          </div>
          <Button className="w-full" onClick={handleSave}>
            Save Sale
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

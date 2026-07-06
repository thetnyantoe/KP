"use client";

import { useState } from "react";

import { supabase } from "@/utils/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";

export default function AddProduct() {
  const [image, setImage] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    original_price: "",
    sell_price: "",
    quantity: "",
    warranty: "",
    status: "Active",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = "";

      // 1. UPLOAD IMAGE TO SUPABASE STORAGE
      if (image) {
        const fileName = `${Date.now()}-${image.name}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, image);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      // 2. INSERT INTO PRODUCTS TABLE
      const { error } = await supabase.from("products").insert({
        image: imageUrl,
        name: form.name,
        description: form.description,
        original_price: Number(form.original_price),
        sell_price: Number(form.sell_price),
        quantity: Number(form.quantity),
        warranty: form.warranty,
        status: form.status,
      });

      if (error) {
        throw error;
      }
      toast.success("Product created successfully.");

      setForm({
        name: "",
        description: "",
        original_price: "",
        sell_price: "",
        quantity: "",
        warranty: "",
        status: "Active",
      });

      setImage(null);
    } catch (err) {
      console.error(err);
      toast.error("Product creating failed.");
    }
  };

  return (
    <div className="p-6 w-full">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Product</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* IMAGE */}
            <div className="space-y-2">
              <Label>Product Image</Label>

              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* NAME */}
              <div className="space-y-2">
                <Label>Name</Label>

                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              {/* STATUS */}
              <div className="space-y-2">
                <Label>Status</Label>

                <Select
                  value={form.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>

                    <SelectItem value="Inactive">Inactive</SelectItem>

                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ORIGINAL PRICE */}
              <div className="space-y-2">
                <Label>Original Price</Label>

                <Input
                  type="number"
                  value={form.original_price}
                  onChange={(e) =>
                    handleChange("original_price", e.target.value)
                  }
                />
              </div>

              {/* SELL PRICE */}
              <div className="space-y-2">
                <Label>Sell Price</Label>

                <Input
                  type="number"
                  value={form.sell_price}
                  onChange={(e) => handleChange("sell_price", e.target.value)}
                />
              </div>

              {/* QUANTITY */}
              <div className="space-y-2">
                <Label>Quantity</Label>

                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                />
              </div>

              {/* WARRANTY */}
              <div className="space-y-2">
                <Label>Warranty</Label>

                <Input
                  value={form.warranty}
                  onChange={(e) => handleChange("warranty", e.target.value)}
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-2">
              <Label>Description</Label>

              <Textarea
                rows={5}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline">
                Cancel
              </Button>

              <Button type="submit">Save Product</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

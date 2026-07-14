"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { AlertTriangle, Loader2, Save, X } from "lucide-react";

export default function AddProduct() {
  const [image, setImage] = useState<File | null>(null);

  // 🛡️ Loading state to prevent simultaneous database row duplication
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🛡️ State tracking for showing/hiding the sleek confirmation prompt
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    product_code: "",
    name: "",
    description: "",
    original_price: "",
    sell_price: "",
    quantity: "",
    warranty: "",
  });

  const handleChange = (key: string, value: string | null) => {
    setForm((prev) => ({
      ...prev,
      [key]: value ?? "",
    }));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sell_price) {
      toast.error(
        "Please fill out at least the product name and selling price.",
      );
      return;
    }
    setShowConfirm(true);
  };

  // Step 2: Trigger actual upload and insert actions
  const executeSaveProduct = async () => {
    setShowConfirm(false); // Hide prompt immediately
    setIsSubmitting(true); // 🔒 Lock button down to prevent multiple clicks

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
        product_code: form.product_code?.trim() || null,
        name: form.name,
        description: form.description,
        original_price: Number(form.original_price),
        sell_price: Number(form.sell_price),
        quantity: Number(form.quantity),
        warranty: form.warranty,
      });

      if (error) {
        throw error;
      }
      toast.success("Product created successfully.");

      setForm({
        product_code: "",
        name: "",
        description: "",
        original_price: "",
        sell_price: "",
        quantity: "",
        warranty: "",
      });

      setImage(null);
    } catch (err: any) {
      console.error(err);
      if (err.code === "23505") {
        toast.error("Creation failed: Product code must be completely unique.");
      } else {
        toast.error("Product creation failed.");
      }
    } finally {
      setIsSubmitting(false); // 🔓 Unlock form interface for the next submission
    }
  };

  return (
    <div className="p-6 w-full">
      <Card className="max-w-4xl mx-auto shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Product</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePreSubmit} className="space-y-6">
            {/* IMAGE */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="cursor-pointer file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* PRODUCT CODE */}
              <div className="space-y-2">
                <Label>Product Code</Label>
                <Input
                  placeholder="e.g. ELEC-001"
                  value={form.product_code}
                  disabled={isSubmitting}
                  onChange={(e) => handleChange("product_code", e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* NAME */}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  disabled={isSubmitting}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              {/* ORIGINAL PRICE */}
              <div className="space-y-2">
                <Label>Original Price</Label>
                <Input
                  type="number"
                  value={form.original_price}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  onChange={(e) => handleChange("sell_price", e.target.value)}
                  required
                />
              </div>

              {/* QUANTITY */}
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  disabled={isSubmitting}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                />
              </div>

              {/* WARRANTY */}
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>Warranty</Label>
                <Input
                  value={form.warranty}
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            {showConfirm && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full text-blue-600 hidden sm:block">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Verify Product Upload
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ready to add{" "}
                      <span className="font-semibold text-blue-600">
                        "{form.name}"
                      </span>{" "}
                      into your stock collection?
                    </p>
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
                    onClick={executeSaveProduct}
                    className="h-8 bg-orange-500 hover:bg-orange-400 text-white font-semibold"
                  >
                    <Save className="w-3.5 h-3.5 mr-0.5" />
                    Confirm
                  </Button>
                </div>
              </div>
            )}

            {/* BUTTONS PANEL */}
            {!showConfirm && (
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="hover:bg-orange-500 text-white font-medium min-w-[130px] font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Product"
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

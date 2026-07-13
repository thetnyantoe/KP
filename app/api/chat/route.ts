import { groq } from "@ai-sdk/groq";
import { streamText, tool } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl || "", supabaseServiceKey || "");

// 🛡️ Content Guard: Strict blacklisted keywords
function isAllowedMessage(msg: string): boolean {
  const forbiddenKeywords = [
    "politics",
    "jokes",
    "sports",
    "weather",
    "movie",
    "gaming",
    "crypto",
  ];
  return forbiddenKeywords.every((word) => !msg.toLowerCase().includes(word));
}

// Standalone Zod Schemas
const CheckStockSchema = z.object({
  productCode: z
    .string()
    .describe("The unique product_code of the product, e.g., ELEC-001"),
});

const UpdateStockSchema = z.object({
  productCode: z.string(),
  newQuantity: z.number().describe("The absolute new total quantity number"),
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        '0:"I need a message sequence to process ERP data configurations."',
        { status: 400, headers: { "Content-Type": "text/plain" } },
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    if (!isAllowedMessage(lastUserMessage)) {
      return new Response(
        '0:"I am the ERP AI Assistant. I can only assist with inventory logs, product code tracking, and warehouse metrics. Please ask an ERP-related question."',
        {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: `You are an internal ERP AI Assistant. Your job is to answer ONLY questions related to inventory management, warehouse levels, stock updates, product records, or sales margins.

Strict Rules:
1. If the user asks about unrelated topics (e.g., general programming outside this codebase, creative writing, general knowledge, or personal chatter), you must politely refuse:
   "I am the ERP AI Assistant. I can only assist with inventory logs, product code tracking, and warehouse metrics. Please ask an ERP-related question."
2. Always prioritize looking up items via their exact 'product_code' string.
3. Keep answers highly professional, clean, concise, and focused on logistics data dataframes.`,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      tools: {
        checkStockByCode: tool({
          description:
            "Get the current quantity, price, and status of a product using its unique product code.",
          inputSchema: CheckStockSchema, // ✅ Swapped from 'parameters'
          execute: async ({ productCode }) => {
            const { data, error } = await supabaseAdmin
              .from("products")
              .select("name, quantity, sell_price, status")
              .eq("product_code", productCode.trim())
              .single();

            if (error || !data) {
              return `Error: Product code "${productCode}" was not found in the inventory registry.`;
            }

            return `Product Found: ${data.name} currently has ${data.quantity} units in stock priced at ${data.sell_price} MMK (Status: ${data.status}).`;
          },
        }),
        updateStockLevel: tool({
          description:
            "Updates or adjusts the physical quantity of a product code in stock.",
          inputSchema: UpdateStockSchema, // ✅ Swapped from 'parameters'
          execute: async ({ productCode, newQuantity }) => {
            const { data, error } = await supabaseAdmin
              .from("products")
              .update({ quantity: newQuantity })
              .eq("product_code", productCode.trim())
              .select("name, quantity")
              .single();

            if (error || !data) {
              return `Error updating stock: ${error?.message || "Product not found"}`;
            }

            return `Successfully updated ${data.name} stock level to ${data.quantity} units.`;
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error("Backend Stack Trace:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal Routing Error Encountered",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, User, Send, Sparkles, Loader2, ArrowRight } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function Aichat() {
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleChatSubmit(e?: React.FormEvent, customText?: string) {
    if (e) e.preventDefault();

    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: textToSend },
    ];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const updateAssistantBubble = (textChunk: string) => {
      setMessages((prev) => {
        const history = [...prev];
        const lastMessage = history[history.length - 1];
        if (lastMessage?.role === "assistant") {
          history[history.length - 1] = {
            role: "assistant",
            content: textChunk,
          };
        } else {
          history.push({ role: "assistant", content: textChunk });
        }
        return history;
      });
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        updateAssistantBubble(
          "The server encountered an error parsing this response.",
        );
        return;
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulator = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const cleanChunk = rawChunk
          .replace(/^[0-9]:"/, "")
          .replace(/"$/, "")
          .replace(/\\n/g, "\n");

        accumulator += cleanChunk;
        updateAssistantBubble(accumulator);
      }
    } catch (err) {
      updateAssistantBubble(
        "Failed to establish a streaming pipeline connection.",
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  const samplePrompts = [
    { text: "Check stock status for ELEC-001", label: "Inventory Check" },
    { text: "Which products are low on stock?", label: "Low Stock Alert" },
    {
      text: "Show total warehouse investment statistics",
      label: "ERP Analytics",
    },
  ];

  return (
    <div className="p-4 h-[calc(100vh-2rem)] flex flex-col gap-4 max-w-5xl mx-auto w-full">
      {/* Header section */}
      <div className="flex justify-between items-center border-b pb-2 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            KP AI Chat
          </h1>
        </div>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* Empty State / Prompt Suggestions */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="p-4 bg-blue-50 rounded-full text-blue-600 border border-blue-100 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="font-semibold text-slate-700 text-lg">
                  How can I help you manage the ERP today?
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  I can read product data codes directly, modify stocks via
                  database triggers, or pull general warehouse statistics.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl pt-2">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleChatSubmit(undefined, prompt.text)}
                    className="flex flex-col items-start p-3 bg-white border border-slate-200 rounded-lg text-left text-xs hover:border-blue-500 hover:shadow-sm transition-all group"
                  >
                    <span className="font-semibold text-blue-600 flex items-center gap-1 mb-1">
                      {prompt.label}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="text-slate-600 font-medium">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Active Streamed Messages */}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-100 ${m.role === "user" ? "bg-slate-800 text-white" : "bg-blue-600 text-white"}`}
              >
                {m.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === "user" ? "bg-slate-800 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"}`}
              >
                <span className="whitespace-pre-wrap font-medium">
                  {m.content}
                </span>
              </div>
            </div>
          ))}

          {/* Streaming API Status Spinner */}
          {isLoading && !messages.some((m) => m.role === "assistant") && (
            <div className="flex gap-3 mr-auto max-w-[85%] items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 animate-spin">
                <Loader2 className="w-4 h-4" />
              </div>
              <div className="p-3 bg-white border border-slate-100 text-slate-400 text-xs rounded-2xl rounded-tl-none italic font-medium shadow-sm">
                Thinking and compiling ERP structures...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Bottom Input Control Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
          <form onSubmit={handleChatSubmit} className="flex gap-2 items-center">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me"
              disabled={isLoading}
              className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 h-10 outline-none text-sm font-medium"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-10 flex gap-1.5 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

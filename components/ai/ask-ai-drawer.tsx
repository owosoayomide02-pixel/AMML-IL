"use client";

import { askAiAction } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export function AskAiDrawer() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Ask AI"
      >
        <Sparkles className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close Ask AI" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="font-semibold">Ask AI</p>
                <p className="text-xs text-slate-500">Answers from live stock, sales, and alerts. The model is used when the API key works.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500">Try “What is running low this week?” or “Which SKUs have thin margins?”</p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-xl bg-brand-600 px-3 py-2 text-sm text-white"
                        : "mr-8 rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                    }
                  >
                    {message.text}
                  </div>
                ))
              )}
            </div>
            <form
              className="border-t border-slate-200 p-4 dark:border-slate-800"
              onSubmit={async (event) => {
                event.preventDefault();
                const next = question.trim();
                if (!next) return;
                setQuestion("");
                setMessages((current) => [...current, { role: "user", text: next }]);
                setLoading(true);
                const result = await askAiAction(next);
                setLoading(false);
                setMessages((current) => [
                  ...current,
                  { role: "assistant", text: result.ok ? result.data : result.error },
                ]);
              }}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about stock, prices, or sales…"
                rows={3}
              />
              <Button className="mt-3 w-full" loading={loading}>
                Ask
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

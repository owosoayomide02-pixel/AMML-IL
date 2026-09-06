"use client";

import { askAiAction, getAskAiMetaAction } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; text: string };
type Meta = { configured: boolean; companyUsdNgnRate: number; liveUsdNgnRate: number | null; currency: string };

const STORAGE_KEY = "aaml-ask-ai-history";
const STARTERS = [
  "What is this month's revenue?",
  "What is the most scarce product in the real market?",
  "Look up Siemens 24V relay prices in Nigeria",
  "What is the dollar rate?",
];

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export function AskAiDrawer() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadHistory());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages, ready]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    void getAskAiMetaAction().then((result) => {
      if (result.ok) setMeta(result.data);
    });
  }, [open]);

  async function send(text: string) {
    const next = text.trim();
    if (!next || loading) return;
    setQuestion("");
    const prior = [...messages, { role: "user" as const, text: next }];
    setMessages(prior);
    setLoading(true);
    const result = await askAiAction(
      next,
      prior.slice(0, -1).map((message) => ({ role: message.role, content: message.text })),
    );
    setLoading(false);
    setMessages((current) => [
      ...current,
      { role: "assistant", text: result.ok ? result.data : result.error },
    ]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Ask AI"
        title="Ask AI"
      >
        <Sparkles className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close Ask AI" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="font-semibold">AAML assistant</p>
                <p className="text-xs text-slate-500">
                  {meta
                    ? `1 USD = ₦${meta.companyUsdNgnRate}${meta.liveUsdNgnRate ? ` · live ₦${meta.liveUsdNgnRate}` : ""}`
                    : "Stock, prices, and dollar rate"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="New chat"
                  onClick={() => {
                    setMessages([]);
                    window.localStorage.removeItem(STORAGE_KEY);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Ask the books or the public web: revenue, scarce SKUs, part lookups, Nigeria market notes. History stays on this device.</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        onClick={() => void send(starter)}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-8 whitespace-pre-wrap rounded-xl bg-brand-600 px-3 py-2 text-sm text-white"
                        : "mr-8 whitespace-pre-wrap rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                    }
                  >
                    {message.text}
                  </div>
                ))
              )}
              {loading ? <p className="mr-8 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:bg-slate-800">Thinking…</p> : null}
              <div ref={endRef} />
            </div>
            <form
              className="border-t border-slate-200 p-4 dark:border-slate-800"
              onSubmit={(event) => {
                event.preventDefault();
                void send(question);
              }}
            >
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(question);
                  }
                }}
                placeholder="Ask about revenue, scarce products, stock, or the dollar rate…"
                rows={3}
                disabled={loading}
              />
              <Button className="mt-3 w-full" type="submit" loading={loading}>
                Send
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

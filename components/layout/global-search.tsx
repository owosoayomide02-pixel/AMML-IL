"use client";

import { searchCatalogAction } from "@/app/actions/search";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

interface Hit {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const result = await searchCatalogAction(query);
        setHits(result);
        setOpen(true);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div ref={ref} className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products, SKU, barcode, invoices..."
        className="pl-9"
        onFocus={() => hits.length > 0 && setOpen(true)}
      />
      {open && hits.length > 0 ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {hits.map((hit) => (
            <Link
              key={`${hit.type}-${hit.id}`}
              href={hit.href}
              className="block px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              <p className="text-sm font-medium">{hit.title}</p>
              <p className="text-xs text-slate-500">
                {hit.type} · {hit.subtitle}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { deleteProductsAction } from "@/app/actions/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusVariant } from "@/lib/status";
import { STOCK_SHEET_LABELS, type StockSheetRow } from "@/lib/stock-sheet";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

const headCell = "px-2 py-1.5 text-[11px] font-medium leading-tight";
const cell = "px-2 py-1.5 align-top text-xs text-slate-700 dark:text-slate-200";

function SheetHead({
  selectable,
  allSelected,
  onToggleAll,
}: {
  selectable?: boolean;
  allSelected?: boolean;
  onToggleAll?: (checked: boolean) => void;
}) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <tr>
        {selectable ? (
          <th className={cn(headCell, "w-8")}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={allSelected}
              onChange={(event) => onToggleAll?.(event.target.checked)}
              aria-label="Select all spares"
            />
          </th>
        ) : null}
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.itemId}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.make}</th>
        <th className={cn(headCell, "min-w-[12rem]")}>{STOCK_SHEET_LABELS.description}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.condition}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.location}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.partNumber}</th>
        <th className={cn(headCell, "whitespace-nowrap text-right")}>{STOCK_SHEET_LABELS.unitPrice}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.rackNumber}</th>
        <th className={cn(headCell, "whitespace-nowrap text-right")}>{STOCK_SHEET_LABELS.stockLevel}</th>
        <th className={cn(headCell, "whitespace-nowrap text-right")}>{STOCK_SHEET_LABELS.reorderLevel}</th>
        <th className={cn(headCell, "whitespace-nowrap text-right")}>{STOCK_SHEET_LABELS.totalPrice}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.stockStatus}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.remarks}</th>
        <th className={cn(headCell, "whitespace-nowrap")}>{STOCK_SHEET_LABELS.orderStatus}</th>
        {selectable ? <th className={cn(headCell, "w-16")}></th> : null}
      </tr>
    </thead>
  );
}

export function StockSheetHead() {
  return <SheetHead />;
}

export function StockSheetTable({
  rows,
  currency,
  canDelete = false,
}: {
  rows: Array<StockSheetRow & { key: string }>;
  currency: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState<"selected" | "all" | string | null>(null);
  const productIds = useMemo(
    () => [...new Set(rows.map((row) => row.productId).filter((id): id is string => Boolean(id)))],
    [rows],
  );
  const allSelected = productIds.length > 0 && productIds.every((id) => selected.includes(id));

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  }

  async function remove(ids?: string[], all = false) {
    const message = all
      ? `Delete all ${productIds.length} spares? This cannot be undone.`
      : `Delete ${ids?.length ?? 0} spare${(ids?.length ?? 0) === 1 ? "" : "s"}? This cannot be undone.`;
    if (!window.confirm(message)) return;
    setLoading(all ? "all" : "selected");
    const result = await deleteProductsAction(all ? { all: true } : { ids });
    setLoading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.deleted === 1 ? "Spare deleted" : `${result.data.deleted} spares deleted`);
    setSelected([]);
    router.refresh();
  }

  return (
    <div>
      {canDelete && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <Button
            size="sm"
            variant="danger"
            disabled={selected.length === 0}
            loading={loading === "selected"}
            onClick={() => void remove(selected)}
          >
            Delete selected{selected.length ? ` (${selected.length})` : ""}
          </Button>
          <Button size="sm" variant="outline" loading={loading === "all"} onClick={() => void remove(undefined, true)}>
            Delete all
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <SheetHead
            selectable={canDelete}
            allSelected={allSelected}
            onToggleAll={(checked) => setSelected(checked ? productIds : [])}
          />
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {canDelete ? (
                  <td className={cell}>
                    {row.productId ? (
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5"
                        checked={selected.includes(row.productId)}
                        onChange={(event) => toggle(row.productId!, event.target.checked)}
                        aria-label={`Select ${row.description}`}
                      />
                    ) : null}
                  </td>
                ) : null}
                <td className={cn(cell, "whitespace-nowrap font-mono")}>{row.itemId}</td>
                <td className={cn(cell, "whitespace-nowrap font-medium uppercase")}>{row.make}</td>
                <td className={cn(cell, "max-w-[14rem]")}>
                  {row.productId ? (
                    <Link
                      href={`/products/${row.productId}`}
                      className="line-clamp-3 whitespace-normal break-words font-medium leading-snug text-brand-600 hover:underline"
                      title={row.description}
                    >
                      {row.description}
                    </Link>
                  ) : (
                    <span className="line-clamp-3 whitespace-normal break-words leading-snug" title={row.description}>
                      {row.description}
                    </span>
                  )}
                </td>
                <td className={cn(cell, "whitespace-nowrap uppercase")}>{row.condition}</td>
                <td className={cn(cell, "max-w-[8rem] whitespace-normal break-words uppercase leading-snug")}>
                  {row.location}
                </td>
                <td className={cn(cell, "whitespace-nowrap font-mono")}>{row.partNumber}</td>
                <td className={cn(cell, "whitespace-nowrap text-right")}>{formatCurrency(row.unitPrice, currency)}</td>
                <td className={cn(cell, "whitespace-nowrap")}>{row.rackNumber}</td>
                <td className={cn(cell, "whitespace-nowrap text-right")}>{formatNumber(row.stockLevel)}</td>
                <td className={cn(cell, "whitespace-nowrap text-right")}>{formatNumber(row.reorderLevel)}</td>
                <td className={cn(cell, "whitespace-nowrap text-right")}>{formatCurrency(row.totalPrice, currency)}</td>
                <td className={cn(cell, "whitespace-nowrap")}>
                  <Badge variant={statusVariant(row.stockStatus)}>{row.stockStatusLabel}</Badge>
                </td>
                <td className={cn(cell, "max-w-[8rem] whitespace-normal break-words leading-snug")}>{row.remarks}</td>
                <td className={cn(cell, "whitespace-nowrap")}>{row.orderStatus}</td>
                {canDelete ? (
                  <td className={cell}>
                    {row.productId ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-rose-600"
                        loading={loading === "selected" && selected.length === 1 && selected[0] === row.productId}
                        onClick={() => void remove([row.productId!])}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SpareIdentity({
  product,
}: {
  product?: { name?: string | null; sku?: string | null; brand?: string | null } | null;
}) {
  return (
    <div>
      {product?.brand ? <p className="text-xs font-medium uppercase text-slate-500">{product.brand}</p> : null}
      <p className="line-clamp-3 font-medium leading-snug">{product?.name ?? "—"}</p>
      {product?.sku ? <p className="font-mono text-xs text-slate-500">{product.sku}</p> : null}
    </div>
  );
}

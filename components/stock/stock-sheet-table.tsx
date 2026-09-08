import { Badge } from "@/components/ui/badge";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { statusVariant } from "@/lib/status";
import { STOCK_SHEET_LABELS, type StockSheetRow } from "@/lib/stock-sheet";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

export function StockSheetHead() {
  return (
    <THead>
      <tr>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.itemId}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.make}</Th>
        <Th>{STOCK_SHEET_LABELS.description}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.partNumber}</Th>
        <Th className="whitespace-nowrap text-right">{STOCK_SHEET_LABELS.unitPrice}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.condition}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.location}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.rackNumber}</Th>
        <Th className="whitespace-nowrap text-right">{STOCK_SHEET_LABELS.stockLevel}</Th>
        <Th className="whitespace-nowrap text-right">{STOCK_SHEET_LABELS.reorderLevel}</Th>
        <Th className="whitespace-nowrap text-right">{STOCK_SHEET_LABELS.totalPrice}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.stockStatus}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.remarks}</Th>
        <Th className="whitespace-nowrap">{STOCK_SHEET_LABELS.orderStatus}</Th>
      </tr>
    </THead>
  );
}

export function StockSheetTable({
  rows,
  currency,
}: {
  rows: Array<StockSheetRow & { key: string }>;
  currency: string;
}) {
  return (
    <Table>
      <StockSheetHead />
      <TBody>
        {rows.map((row) => (
          <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <Td className="whitespace-nowrap font-mono text-xs">{row.itemId}</Td>
            <Td className="whitespace-nowrap font-medium uppercase">{row.make}</Td>
            <Td className="min-w-[16rem]">
              {row.productId ? (
                <Link href={`/products/${row.productId}`} className="font-medium text-brand-600 hover:underline">
                  {row.description}
                </Link>
              ) : (
                row.description
              )}
            </Td>
            <Td className="whitespace-nowrap font-mono text-xs">{row.partNumber}</Td>
            <Td className="whitespace-nowrap text-right">{formatCurrency(row.unitPrice, currency)}</Td>
            <Td className="whitespace-nowrap uppercase">{row.condition}</Td>
            <Td className="whitespace-nowrap uppercase">{row.location}</Td>
            <Td className="whitespace-nowrap">{row.rackNumber}</Td>
            <Td className="whitespace-nowrap text-right">{formatNumber(row.stockLevel)}</Td>
            <Td className="whitespace-nowrap text-right">{formatNumber(row.reorderLevel)}</Td>
            <Td className="whitespace-nowrap text-right">{formatCurrency(row.totalPrice, currency)}</Td>
            <Td className="whitespace-nowrap">
              <Badge variant={statusVariant(row.stockStatus)}>{row.stockStatusLabel}</Badge>
            </Td>
            <Td className="min-w-[9rem]">{row.remarks}</Td>
            <Td className="whitespace-nowrap">{row.orderStatus}</Td>
          </tr>
        ))}
      </TBody>
    </Table>
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
      <p className="font-medium">{product?.name ?? "—"}</p>
      {product?.sku ? <p className="font-mono text-xs text-slate-500">{product.sku}</p> : null}
    </div>
  );
}

"use client";

import { approveCountAction, cancelCountAction, saveCountItemsAction } from "@/app/actions/counts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function CountForm({
  countId,
  status,
  canWrite,
  canApprove,
  items,
}: {
  countId: string;
  status: string;
  canWrite: boolean;
  canApprove: boolean;
  items: Array<{
    id: string;
    system_quantity: number;
    counted_quantity: number | null;
    variance: number | null;
    reason: string | null;
    products: { name: string; sku: string; unit: string } | null;
  }>;
}) {
  const router = useRouter();
  const locked = status === "approved" || status === "cancelled";
  const [rows, setRows] = useState(
    items.map((item) => ({
      itemId: item.id,
      countedQuantity: item.counted_quantity ?? Number(item.system_quantity),
      reason: item.reason ?? "",
    })),
  );
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Table>
        <THead>
          <tr>
            <Th>Product</Th>
            <Th className="text-right">System</Th>
            <Th className="text-right">Counted</Th>
            <Th>Reason</Th>
          </tr>
        </THead>
        <TBody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <Td>
                {item.products?.name}
                <p className="font-mono text-xs text-slate-500">{item.products?.sku}</p>
              </Td>
              <Td className="text-right">{formatNumber(item.system_quantity)}</Td>
              <Td>
                <Input
                  type="number"
                  step="0.01"
                  disabled={locked || !canWrite}
                  value={rows[index]?.countedQuantity ?? 0}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, countedQuantity: Number(event.target.value) } : row,
                      ),
                    )
                  }
                />
              </Td>
              <Td>
                <Input
                  disabled={locked || !canWrite}
                  value={rows[index]?.reason ?? ""}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((row, rowIndex) => (rowIndex === index ? { ...row, reason: event.target.value } : row)),
                    )
                  }
                />
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
      <div className="flex flex-wrap gap-2">
        {canWrite && !locked ? (
          <Button
            loading={loading === "save"}
            onClick={async () => {
              setLoading("save");
              const result = await saveCountItemsAction(countId, rows);
              setLoading(null);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Count submitted for approval");
                router.refresh();
              }
            }}
          >
            Submit for approval
          </Button>
        ) : null}
        {canApprove && status === "pending_approval" ? (
          <Button
            loading={loading === "approve"}
            onClick={async () => {
              setLoading("approve");
              const result = await approveCountAction(countId);
              setLoading(null);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Count approved");
                router.refresh();
              }
            }}
          >
            Approve adjustments
          </Button>
        ) : null}
        {canWrite && !locked ? (
          <Button
            variant="danger"
            loading={loading === "cancel"}
            onClick={async () => {
              setLoading("cancel");
              const result = await cancelCountAction(countId);
              setLoading(null);
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Count cancelled");
                router.refresh();
              }
            }}
          >
            Cancel count
          </Button>
        ) : null}
      </div>
    </div>
  );
}

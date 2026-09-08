"use client";

import { importBulkStockAction, sortBulkStockAction } from "@/app/actions/bulk-stock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DualPriceInput } from "@/components/ui/dual-price-input";
import type { BulkStockItem } from "@/lib/bulk-stock";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const emptyRow = (): BulkStockItem => ({
  name: "",
  sku: "",
  category: "",
  brand: "",
  quantity: 0,
  costPrice: 0,
  sellingPrice: 0,
  minimumStockLevel: 0,
  unit: "pcs",
});

export function BulkStockImport({ warehouses }: { warehouses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [items, setItems] = useState<BulkStockItem[]>([]);
  const [usedAi, setUsedAi] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateItem(index: number, key: keyof BulkStockItem, value: string) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === "quantity" || key === "costPrice" || key === "sellingPrice" || key === "minimumStockLevel"
                  ? Number(value) || 0
                  : value,
            }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paste or upload a list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            One spare per line, or upload the AAML inventory Excel/CSV with MAKE, SPARES DESCRIPTION, PART NUMBER, UNIT PRICE, STOCK LEVEL, RE-ORDER LEVEL.
          </p>
          <Textarea
            rows={8}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={"Siemens 24V relay, 50\nSchneider contactor LC1, 20\nOmron proximity sensor"}
          />
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>LOCATION for quantities</Label>
              <Select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Upload CSV or Excel</Label>
              <Input
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
                    setRaw(await file.text());
                    return;
                  }
                  const XLSX = await import("xlsx");
                  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  setRaw(XLSX.utils.sheet_to_csv(sheet));
                }}
              />
            </div>
            <Button
              loading={sorting}
              onClick={async () => {
                setSorting(true);
                const result = await sortBulkStockAction(raw);
                setSorting(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setItems(result.data.items);
                setUsedAi(result.data.usedAi);
                toast.success(result.data.usedAi ? "AI sorted the list" : "List sorted from your text");
              }}
            >
              Sort with AI
            </Button>
            <Button variant="secondary" onClick={() => setItems((current) => [...current, emptyRow()])}>
              Add blank row
            </Button>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Review {items.length} item{items.length === 1 ? "" : "s"}
              {usedAi ? " · AI sorted" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <Th>SPARES DESCRIPTION</Th>
                    <Th>PART NUMBER</Th>
                    <Th>Category</Th>
                    <Th>MAKE</Th>
                    <Th>STOCK LEVEL</Th>
                    <Th>UNIT PRICE</Th>
                    <Th>Selling</Th>
                    <Th>RE-ORDER LEVEL</Th>
                    <Th></Th>
                  </tr>
                </THead>
                <TBody>
                  {items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <Td>
                        <Input value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} />
                      </Td>
                      <Td>
                        <Input value={item.sku} onChange={(event) => updateItem(index, "sku", event.target.value)} />
                      </Td>
                      <Td>
                        <Input value={item.category} onChange={(event) => updateItem(index, "category", event.target.value)} />
                      </Td>
                      <Td>
                        <Input value={item.brand} onChange={(event) => updateItem(index, "brand", event.target.value)} />
                      </Td>
                      <Td>
                        <Input type="number" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} />
                      </Td>
                      <Td className="min-w-64">
                        <DualPriceInput
                          label="UNIT PRICE"
                          naira={item.costPrice}
                          onNairaChange={(value) => updateItem(index, "costPrice", String(value))}
                        />
                      </Td>
                      <Td className="min-w-64">
                        <DualPriceInput
                          label="Selling"
                          naira={item.sellingPrice}
                          onNairaChange={(value) => updateItem(index, "sellingPrice", String(value))}
                        />
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          value={item.minimumStockLevel}
                          onChange={(event) => updateItem(index, "minimumStockLevel", event.target.value)}
                        />
                      </Td>
                      <Td>
                        <button type="button" className="text-sm text-rose-600" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                          Remove
                        </button>
                      </Td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                const result = await importBulkStockAction({ warehouseId, items });
                setSaving(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  `Added ${result.data.created} new spares, restocked ${result.data.restocked}${result.data.failed ? `, ${result.data.failed} failed` : ""}.`,
                );
                router.push("/products");
                router.refresh();
              }}
            >
              Save all to inventory
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

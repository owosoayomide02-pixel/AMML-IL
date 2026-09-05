export type BulkStockItem = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  unit: string;
};

const HEADER_ALIASES: Record<string, keyof BulkStockItem> = {
  name: "name",
  product: "name",
  item: "name",
  description: "name",
  sku: "sku",
  code: "sku",
  category: "category",
  type: "category",
  brand: "brand",
  manufacturer: "brand",
  qty: "quantity",
  quantity: "quantity",
  stock: "quantity",
  onhand: "quantity",
  cost: "costPrice",
  costprice: "costPrice",
  selling: "sellingPrice",
  sellingprice: "sellingPrice",
  price: "sellingPrice",
  min: "minimumStockLevel",
  minimum: "minimumStockLevel",
  reorder: "minimumStockLevel",
  unit: "unit",
};

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t").map((part) => part.trim());
  if (line.includes("|")) return line.split("|").map((part) => part.trim());
  if (line.includes(",")) {
    return line.split(",").map((part) => part.replace(/^["']|["']$/g, "").trim());
  }
  return [line.trim()];
}

function asNumber(value: string | undefined) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function emptyItem(): BulkStockItem {
  return {
    name: "",
    sku: "",
    category: "",
    brand: "",
    quantity: 0,
    costPrice: 0,
    sellingPrice: 0,
    minimumStockLevel: 0,
    unit: "pcs",
  };
}

function looksLikeHeader(cells: string[]) {
  return cells.some((cell) => HEADER_ALIASES[cell.toLowerCase().replace(/[^a-z]/g, "")]);
}

export function parseBulkStockText(raw: string): BulkStockItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 200);
  if (lines.length === 0) return [];

  const first = splitLine(lines[0]);
  if (looksLikeHeader(first) && first.length > 1) {
    const map = first.map((cell) => HEADER_ALIASES[cell.toLowerCase().replace(/[^a-z]/g, "")] ?? null);
    return lines.slice(1).map((line) => {
      const cells = splitLine(line);
      const item = emptyItem();
      map.forEach((key, index) => {
        if (!key) return;
        const value = cells[index] ?? "";
        if (key === "quantity" || key === "costPrice" || key === "sellingPrice" || key === "minimumStockLevel") {
          item[key] = asNumber(value);
        } else {
          item[key] = value;
        }
      });
      return item;
    }).filter((item) => item.name);
  }

  return lines
    .map((line) => {
      const cells = splitLine(line);
      if (cells.length >= 2) {
        return {
          ...emptyItem(),
          name: cells[0],
          sku: cells[1] && /[a-z]/i.test(cells[1]) && !/^\d+(\.\d+)?$/.test(cells[1]) ? cells[1] : "",
          quantity: asNumber(cells.find((cell, index) => index > 0 && /^\d+(\.\d+)?$/.test(cell))),
          costPrice: asNumber(cells[cells.length - 2]),
          sellingPrice: asNumber(cells[cells.length - 1]),
          category: cells.length > 4 ? cells[2] : "",
        };
      }
      const qtyMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:pcs|units|qty)?\s*$/i);
      const name = qtyMatch ? line.slice(0, qtyMatch.index).replace(/[,-]+$/, "").trim() : line;
      return {
        ...emptyItem(),
        name,
        quantity: qtyMatch ? asNumber(qtyMatch[1]) : 0,
      };
    })
    .filter((item) => item.name);
}

export function guessCategory(name: string) {
  const n = name.toLowerCase();
  if (/relay|contactor|breaker|switch/.test(n)) return "Switchgear";
  if (/sensor|encoder|proximity/.test(n)) return "Sensors";
  if (/cable|wire|connector/.test(n)) return "Cables";
  if (/plc|hmi|module|vfd|inverter/.test(n)) return "Automation";
  if (/motor|gearbox|pump/.test(n)) return "Drives";
  if (/valve|fitting|pneumatic/.test(n)) return "Pneumatics";
  return "General";
}

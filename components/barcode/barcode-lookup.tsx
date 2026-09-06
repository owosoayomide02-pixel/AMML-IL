"use client";

import { lookupProductByBarcodeAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ScanBarcode } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

export type ScannedProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  selling_price: number;
  cost_price: number;
};

export function BarcodeLookup({
  onFound,
  onCode,
  compact = false,
  placeholder = "Enter or scan barcode",
}: {
  onFound?: (product: ScannedProduct) => void;
  onCode?: (code: string) => void;
  compact?: boolean;
  placeholder?: string;
}) {
  const reactId = useId().replace(/:/g, "");
  const readerId = `barcode-reader-${reactId}`;
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  async function stopCamera() {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* already stopped */
    }
    scannerRef.current = null;
    setScanning(false);
  }

  async function applyCode(value: string) {
    const next = value.trim();
    if (!next) {
      toast.error("Enter or scan a barcode first.");
      return;
    }
    if (onFound) {
      const product = await lookupProductByBarcodeAction(next);
      if (product) {
        onFound({
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          selling_price: Number(product.selling_price),
          cost_price: Number(product.cost_price),
        });
        toast.success(`Found ${product.name}`);
        setCode("");
        await stopCamera();
        setOpen(false);
        return;
      }
      if (!onCode) {
        toast.error("No product found for that barcode or SKU.");
        return;
      }
    }
    onCode?.(next);
    toast.success(`Barcode ${next}`);
    setCode("");
    await stopCamera();
    setOpen(false);
  }

  async function startCamera() {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        async (decoded) => {
          await applyCode(decoded);
        },
        () => undefined,
      );
    } catch {
      await stopCamera();
      toast.error("Camera scanning is not available on this device. Type the barcode instead.");
    }
  }

  return (
    <>
      <div className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
        {compact ? null : (
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void applyCode(code);
              }
            }}
          />
        )}
        {compact ? null : (
          <Button type="button" variant="secondary" onClick={() => void applyCode(code)}>
            Find
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          title="Scan barcode"
        >
          <ScanBarcode className="h-4 w-4" />
          {compact ? "Scan" : "Scan camera"}
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => {
          void stopCamera();
          setOpen(false);
        }}
        title="Scan barcode"
      >
        <p className="mb-4 text-sm text-slate-500">Point the camera at the barcode, or type it below.</p>
        <div id={readerId} className="mb-3 min-h-40 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void applyCode(code);
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={() => void applyCode(code)}>
            Find
          </Button>
        </div>
        <Button className="mt-3 w-full" type="button" onClick={() => void startCamera()} loading={scanning}>
          {scanning ? "Looking for a barcode…" : "Start camera"}
        </Button>
      </Modal>
    </>
  );
}

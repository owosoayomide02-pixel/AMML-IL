"use client";

import { lookupProductByBarcodeAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ScanBarcode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function BarcodeLookup({
  onFound,
}: {
  onFound: (product: { id: string; name: string; sku: string; selling_price: number; cost_price: number }) => void;
}) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function lookup(value: string) {
    const product = await lookupProductByBarcodeAction(value);
    if (!product) {
      toast.error("No product found for that barcode.");
      return;
    }
    onFound({
      id: product.id,
      name: product.name,
      sku: product.sku,
      selling_price: Number(product.selling_price),
      cost_price: Number(product.cost_price),
    });
    toast.success(`Found ${product.name}`);
    setCode("");
    setOpen(false);
  }

  async function startCamera() {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        async (decoded) => {
          await scanner.stop();
          setScanning(false);
          await lookup(decoded);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      toast.error("Camera scanning is not available on this device.");
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter or scan barcode"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void lookup(code);
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={() => void lookup(code)}>
          Find
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Scan barcode">
        <p className="mb-4 text-sm text-slate-500">Use a camera-enabled device to scan a product barcode.</p>
        <div id="barcode-reader" className="overflow-hidden rounded-xl" />
        <Button className="mt-4" type="button" onClick={() => void startCamera()} loading={scanning}>
          Start camera
        </Button>
      </Modal>
    </>
  );
}

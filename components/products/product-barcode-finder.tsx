"use client";

import { BarcodeLookup } from "@/components/barcode/barcode-lookup";
import { useRouter } from "next/navigation";

export function ProductBarcodeFinder() {
  const router = useRouter();
  return (
    <BarcodeLookup
      compact
      onFound={(product) => {
        router.push(`/products/${product.id}`);
      }}
    />
  );
}

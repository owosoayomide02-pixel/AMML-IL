"use client";

import { Input } from "@/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchField({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Input
      defaultValue={params.get("q") ?? ""}
      placeholder={placeholder}
      className={pending ? "opacity-70" : undefined}
      onChange={(event) => {
        const value = event.target.value;
        const next = new URLSearchParams(params.toString());
        if (value) next.set("q", value);
        else next.delete("q");
        startTransition(() => router.replace(`${pathname}?${next.toString()}`));
      }}
    />
  );
}

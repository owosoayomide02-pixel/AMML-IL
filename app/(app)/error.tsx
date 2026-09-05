"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <h2 className="text-lg font-semibold">This page could not be loaded</h2>
        <p className="mt-2 text-sm text-slate-500">Try again. If the problem continues, contact an administrator.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

import { deleteProductsAction, archiveProductAction, restoreProductAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function ProductActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"archive" | "delete" | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={archived ? "secondary" : "outline"}
        loading={loading === "archive"}
        onClick={async () => {
          setLoading("archive");
          const result = archived ? await restoreProductAction(id) : await archiveProductAction(id);
          setLoading(null);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(archived ? "Spare restored" : "Spare archived");
          router.refresh();
        }}
      >
        {archived ? "Restore" : "Archive"}
      </Button>
      <Button
        variant="danger"
        loading={loading === "delete"}
        onClick={async () => {
          if (!window.confirm("Delete this spare? This cannot be undone.")) return;
          setLoading("delete");
          const result = await deleteProductsAction({ ids: [id] });
          setLoading(null);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Spare deleted");
          router.push("/products");
          router.refresh();
        }}
      >
        Delete
      </Button>
    </div>
  );
}

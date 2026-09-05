"use client";

import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { categorySchema } from "@/schemas";
import type { Category } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function CategoryManager({ categories, canWrite }: { categories: Category[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  return (
    <div className="p-5">
      {canWrite ? (
        <form
          className="mb-6"
          onSubmit={form.handleSubmit(async (values) => {
            const result = editing
              ? await updateCategoryAction(editing, values)
              : await createCategoryAction(values);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(editing ? "Category updated" : "Category created");
            form.reset({ name: "", description: "" });
            setEditing(null);
            router.refresh();
          })}
        >
          <FormGrid>
            <div>
              <Label>Name</Label>
              <Input {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label>Description</Label>
              <Input {...form.register("description")} />
            </div>
          </FormGrid>
          <div className="mt-4 flex gap-2">
            <Button loading={form.formState.isSubmitting}>{editing ? "Save category" : "Add category"}</Button>
            {editing ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  form.reset({ name: "", description: "" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState title="No categories" description="Create a category such as Parts, Finished goods, or Consumables." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Description</Th>
              {canWrite ? <Th className="text-right">Actions</Th> : null}
            </tr>
          </THead>
          <TBody>
            {categories.map((category) => (
              <tr key={category.id}>
                <Td className="font-medium">{category.name}</Td>
                <Td>{category.description || "—"}</Td>
                {canWrite ? (
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(category.id);
                        form.reset({ name: category.name, description: category.description ?? "" });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const result = await deleteCategoryAction(category.id);
                        if (!result.ok) toast.error(result.error);
                        else {
                          toast.success("Category deleted");
                          router.refresh();
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </Td>
                ) : null}
              </tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

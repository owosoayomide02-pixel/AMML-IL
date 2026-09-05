"use client";

import { createWarehouseAction, updateWarehouseAction } from "@/app/actions/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { warehouseSchema } from "@/schemas";
import type { Warehouse } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function WarehouseManager({ warehouses, canWrite }: { warehouses: Warehouse[]; canWrite: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { name: "", code: "", address: "", description: "", status: "active" as const },
  });

  return (
    <div className="p-5">
      {canWrite ? (
        <form
          className="mb-6"
          onSubmit={form.handleSubmit(async (values) => {
            const result = editing ? await updateWarehouseAction(editing, values) : await createWarehouseAction(values);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(editing ? "Warehouse updated" : "Warehouse created");
            form.reset({ name: "", code: "", address: "", description: "", status: "active" });
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
              <Label>Code</Label>
              <Input {...form.register("code")} />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
            <div>
              <Label>Address</Label>
              <Input {...form.register("address")} />
            </div>
            <div>
              <Label>Status</Label>
              <Select {...form.register("status")}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input {...form.register("description")} />
            </div>
          </FormGrid>
          <div className="mt-4 flex gap-2">
            <Button loading={form.formState.isSubmitting}>{editing ? "Save warehouse" : "Add warehouse"}</Button>
            {editing ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  form.reset({ name: "", code: "", address: "", description: "", status: "active" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {warehouses.length === 0 ? (
        <EmptyState title="No warehouses" description="Add a warehouse or store location to hold inventory." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Address</Th>
              <Th>Status</Th>
              {canWrite ? <Th></Th> : null}
            </tr>
          </THead>
          <TBody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id}>
                <Td className="font-medium">{warehouse.name}</Td>
                <Td className="font-mono text-xs">{warehouse.code}</Td>
                <Td>{warehouse.address || "—"}</Td>
                <Td>
                  <Badge variant={statusVariant(warehouse.status)}>{humanizeStatus(warehouse.status)}</Badge>
                </Td>
                {canWrite ? (
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(warehouse.id);
                        form.reset({
                          name: warehouse.name,
                          code: warehouse.code,
                          address: warehouse.address ?? "",
                          description: warehouse.description ?? "",
                          status: warehouse.status,
                        });
                      }}
                    >
                      Edit
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

"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SupplierDTO } from "@/types";
import {
  supplierSchema,
  type SupplierInput,
} from "@/lib/validations/supplier";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/lib/hooks/useSuppliers";
import { formatDate, formatPhone } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchBar } from "@/components/shared/SearchBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const emptyDefaults: SupplierInput = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  taxId: "",
  paymentTerms: "",
  isActive: true,
  rating: 0,
  notes: "",
};

export default function SuppliersPage() {
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SupplierDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SupplierDTO | null>(
    null
  );

  const { data, isLoading } = useSuppliers({ search, limit: 100 });
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptyDefaults,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyDefaults);
    setDialogOpen(true);
  };

  const openEdit = (supplier: SupplierDTO) => {
    setEditing(supplier);
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      city: supplier.city ?? "",
      country: supplier.country ?? "",
      taxId: supplier.taxId ?? "",
      paymentTerms: supplier.paymentTerms ?? "",
      isActive: supplier.isActive,
      rating: supplier.rating ?? 0,
      notes: supplier.notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: values });
        toast.success("Supplier updated");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("Supplier created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save supplier"
      );
    }
  });

  const columns = React.useMemo<ColumnDef<SupplierDTO>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Supplier",
        cell: ({ row }) => (
          <Link
            href={`/suppliers/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "contactPerson",
        header: "Contact",
        cell: ({ row }) => row.original.contactPerson || "—",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => formatPhone(row.original.phone),
      },
      {
        accessorKey: "city",
        header: "City",
        cell: ({ row }) => row.original.city || "—",
      },
      {
        accessorKey: "paymentTerms",
        header: "Terms",
        cell: ({ row }) => row.original.paymentTerms || "—",
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => row.original.rating ?? "—",
      },
      {
        accessorKey: "createdAt",
        header: "Added",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href={`/suppliers/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteTarget(row.original)}
              disabled={!row.original.isActive}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage vendors, payment terms, and purchase history."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Suppliers" },
        ]}
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add supplier
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.suppliers ?? []}
        isLoading={isLoading}
        filename="suppliers.csv"
        emptyTitle="No suppliers yet"
        emptyDescription="Add suppliers to create purchase orders."
        emptyActionLabel="Add supplier"
        onEmptyAction={openCreate}
        toolbar={
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search suppliers..."
          />
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit supplier" : "Add supplier"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment terms</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Net 30"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (0-5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={field.value ?? 0}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editing
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate supplier?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be soft-deleted and hidden from active lists.`
            : undefined
        }
        confirmLabel="Deactivate"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toast.success("Supplier deactivated");
            setDeleteTarget(null);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to deactivate supplier"
            );
          }
        }}
      />
    </div>
  );
}

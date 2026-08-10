"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { batchSchema, type BatchInput } from "@/lib/validations/batch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = batchSchema.extend({
  expiryDate: z.string().min(1, "Expiry date is required"),
  receivedDate: z.string().optional(),
});

type BatchFormValues = z.infer<typeof formSchema>;

export interface MedicineOption {
  id: string;
  name: string;
  sku: string;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface BatchFormProps {
  defaultValues?: Partial<BatchFormValues>;
  medicines?: MedicineOption[];
  suppliers?: SupplierOption[];
  locations?: LocationOption[];
  lockMedicineId?: string;
  onSubmit: (values: BatchInput) => Promise<void> | void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

function toDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function BatchForm({
  defaultValues,
  medicines = [],
  suppliers = [],
  locations = [],
  lockMedicineId,
  onSubmit,
  submitLabel = "Save batch",
  isSubmitting,
}: BatchFormProps) {
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicineId: lockMedicineId || defaultValues?.medicineId || "",
      supplierId: defaultValues?.supplierId ?? "",
      batchNumber: defaultValues?.batchNumber ?? "",
      quantity: defaultValues?.quantity ?? 1,
      remainingQuantity: defaultValues?.remainingQuantity,
      unitCost: defaultValues?.unitCost ?? 0,
      sellingPrice: defaultValues?.sellingPrice ?? 0,
      expiryDate:
        toDateInput(defaultValues?.expiryDate as string | undefined) || "",
      receivedDate:
        toDateInput(defaultValues?.receivedDate as string | undefined) ||
        toDateInput(new Date()),
      locationId: defaultValues?.locationId ?? "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit({
            ...values,
            supplierId: values.supplierId || null,
            locationId: values.locationId || null,
            remainingQuantity:
              values.remainingQuantity === undefined ||
              values.remainingQuantity === null
                ? values.quantity
                : values.remainingQuantity,
            expiryDate: new Date(values.expiryDate),
            receivedDate: values.receivedDate
              ? new Date(values.receivedDate)
              : new Date(),
          });
        })}
        className="space-y-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="medicineId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Medicine *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={Boolean(lockMedicineId)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {medicines.map((medicine) => (
                      <SelectItem key={medicine.id} value={medicine.id}>
                        {medicine.name} ({medicine.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="batchNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch number *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. BN-2026-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="remainingQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remaining quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormDescription>Defaults to quantity if empty.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit cost (PKR) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling price (PKR) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receivedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="m-0">Active batch</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
            {(isSubmitting || form.formState.isSubmitting) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

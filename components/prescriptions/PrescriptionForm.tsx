"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CustomerDTO, MedicineDTO, PrescriptionDTO } from "@/types";
import {
  prescriptionSchema,
  type PrescriptionInput,
} from "@/lib/validations/prescription";
import {
  useCreatePrescription,
  useUpdatePrescription,
} from "@/lib/hooks/usePrescriptions";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function searchMedicines(search: string): Promise<MedicineDTO[]> {
  const query = new URLSearchParams({
    search,
    limit: "20",
    isActive: "true",
  });
  const res = await fetch(`/api/medicines?${query.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const body = await res.json();
  return (body?.data as MedicineDTO[]) ?? [];
}

export interface PrescriptionFormProps {
  prescription?: PrescriptionDTO | null;
  defaultCustomerId?: string;
  onSuccess?: (prescription: PrescriptionDTO) => void;
  onCancel?: () => void;
}

export function PrescriptionForm({
  prescription,
  defaultCustomerId,
  onSuccess,
  onCancel,
}: PrescriptionFormProps) {
  const isEdit = Boolean(prescription?.id);
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();
  const [medicineSearch, setMedicineSearch] = React.useState("");
  const [medicines, setMedicines] = React.useState<MedicineDTO[]>([]);
  const [customerSearch, setCustomerSearch] = React.useState("");

  const { data: customersData } = useCustomers({
    search: customerSearch,
    limit: 20,
    isActive: true,
  });

  const form = useForm<PrescriptionInput>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      customerId: prescription?.customerId ?? defaultCustomerId ?? "",
      doctorName: prescription?.doctorName ?? "",
      doctorLicense: prescription?.doctorLicense ?? "",
      hospitalClinic: prescription?.hospitalClinic ?? "",
      issuedDate: prescription?.issuedDate
        ? new Date(prescription.issuedDate)
        : new Date(),
      expiryDate: prescription?.expiryDate
        ? new Date(prescription.expiryDate)
        : undefined,
      status: prescription?.status ?? "PENDING",
      imageUrl: prescription?.imageUrl ?? "",
      notes: prescription?.notes ?? "",
      items: prescription?.items?.map((item) => ({
        medicineId: item.medicineId,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration ?? "",
        quantity: item.quantity,
        notes: item.notes ?? "",
      })) ?? [
        {
          medicineId: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: 1,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void searchMedicines(medicineSearch).then((results) => {
        if (active) setMedicines(results);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [medicineSearch]);

  const knownMedicines = React.useMemo(() => {
    const map = new Map<string, MedicineDTO>();
    medicines.forEach((m) => map.set(m.id, m));
    prescription?.items?.forEach((item) => {
      if (item.medicine) {
        map.set(item.medicine.id, item.medicine as MedicineDTO);
      }
    });
    return Array.from(map.values());
  }, [medicines, prescription?.items]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload: PrescriptionInput = {
        ...values,
        doctorLicense: values.doctorLicense || null,
        hospitalClinic: values.hospitalClinic || null,
        imageUrl: values.imageUrl || null,
        notes: values.notes || null,
        items: values.items.map((item) => ({
          ...item,
          duration: item.duration || null,
          notes: item.notes || null,
        })),
      };

      const result = isEdit
        ? await updateMutation.mutateAsync({
            id: prescription!.id,
            data: payload,
          })
        : await createMutation.mutateAsync(payload);

      toast.success(isEdit ? "Prescription updated" : "Prescription created");
      onSuccess?.(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save prescription"
      );
    }
  });

  const pending = createMutation.isPending || updateMutation.isPending;
  const customers: CustomerDTO[] = customersData?.customers ?? [];

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Patient</FormLabel>
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {prescription?.customer ? (
                      <SelectItem value={prescription.customer.id}>
                        {prescription.customer.name}
                      </SelectItem>
                    ) : null}
                    {customers
                      .filter((c) => c.id !== prescription?.customerId)
                      .map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.phone ? ` · ${customer.phone}` : ""}
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
            name="doctorName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor name</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="doctorLicense"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor license</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional"
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
            name="hospitalClinic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hospital / Clinic</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional"
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
            name="issuedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issued date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
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
                <FormLabel>Expiry date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null
                      )
                    }
                  />
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
                  <Textarea
                    rows={3}
                    placeholder="Optional notes"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Medicines</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  medicineId: "",
                  dosage: "",
                  frequency: "",
                  duration: "",
                  quantity: 1,
                  notes: "",
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>

          <Input
            placeholder="Search medicines to populate selectors..."
            value={medicineSearch}
            onChange={(e) => setMedicineSearch(e.target.value)}
          />

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-6"
            >
              <FormField
                control={form.control}
                name={`items.${index}.medicineId`}
                render={({ field: itemField }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Medicine</FormLabel>
                    <Select
                      value={itemField.value}
                      onValueChange={itemField.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medicine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {knownMedicines.map((medicine) => (
                          <SelectItem key={medicine.id} value={medicine.id}>
                            {medicine.name}
                            {medicine.strength ? ` (${medicine.strength})` : ""}
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
                name={`items.${index}.dosage`}
                render={({ field: itemField }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 500mg" {...itemField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.frequency`}
                render={({ field: itemField }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2x daily" {...itemField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field: itemField }) => (
                  <FormItem>
                    <FormLabel>Qty</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={itemField.value}
                        onChange={(e) =>
                          itemField.onChange(Number(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`items.${index}.duration`}
                render={({ field: itemField }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 5 days"
                        {...itemField}
                        value={itemField.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`items.${index}.notes`}
                render={({ field: itemField }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Item notes</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional"
                        {...itemField}
                        value={itemField.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving..."
              : isEdit
                ? "Update prescription"
                : "Create prescription"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

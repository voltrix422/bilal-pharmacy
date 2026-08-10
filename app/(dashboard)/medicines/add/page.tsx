"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { MedicineForm } from "@/components/inventory/MedicineForm";
import { useCreateMedicine } from "@/lib/hooks/useMedicines";

export default function AddMedicinePage() {
  const router = useRouter();
  const createMutation = useCreateMedicine();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Medicine"
        description="Add a product to the medicine catalog (DRAP or local)."
        breadcrumbs={[
          { label: "Home", href: "/dashboard" },
          { label: "Medicines", href: "/medicines" },
          { label: "Add" },
        ]}
      />

      <Card className="border-pharmacy-100/80 dark:border-pharmacy-900/40">
        <CardContent className="p-6">
          <MedicineForm
            isSubmitting={createMutation.isPending}
            submitLabel="Create medicine"
            onSubmit={async (values) => {
              try {
                const created = await createMutation.mutateAsync(values);
                toast.success("Medicine created");
                router.push(`/medicines/${created.id}`);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to create medicine"
                );
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

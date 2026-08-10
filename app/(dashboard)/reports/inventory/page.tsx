"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { InventoryReport } from "@/components/reports/InventoryReport";

export default function InventoryReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory report"
        description="Stock health, valuation, and category distribution."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports" },
          { label: "Inventory" },
        ]}
      />
      <InventoryReport />
    </div>
  );
}

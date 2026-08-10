"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SalesReport } from "@/components/reports/SalesReport";

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales report"
        description="Track revenue, tickets, and product performance."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports" },
          { label: "Sales" },
        ]}
      />
      <SalesReport />
    </div>
  );
}

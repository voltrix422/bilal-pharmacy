"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { FinancialReport } from "@/components/reports/FinancialReport";

export default function FinancialReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial report"
        description="Revenue, cost of goods, profit, and refund overview."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports", href: "/reports" },
          { label: "Financial" },
        ]}
      />
      <FinancialReport />
    </div>
  );
}

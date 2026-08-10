import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  type DocumentProps,
} from "@react-pdf/renderer";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface ReceiptData {
  saleNumber: string;
  createdAt: string | Date;
  cashierName?: string | null;
  customerName?: string | null;
  paymentMethod: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  loyaltyEarned?: number;
  loyaltyRedeemed?: number;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  header?: string;
  footer?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    marginBottom: 4,
  },
  muted: {
    color: "#64748b",
    marginBottom: 2,
  },
  section: {
    marginTop: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  colName: { width: "46%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "20%", textAlign: "right" },
  colTotal: { width: "22%", textAlign: "right" },
  itemRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  totals: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
  },
  totalStrong: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0f766e",
  },
  footer: {
    marginTop: 16,
    textAlign: "center",
    color: "#64748b",
    fontSize: 9,
  },
});

export function createReceiptDocument(
  data: ReceiptData
): React.ReactElement<DocumentProps> {
  const pharmacyName = data.pharmacyName || "Bilal Pharmacy";

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A5", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, pharmacyName),
        data.header
          ? React.createElement(Text, { style: styles.muted }, data.header)
          : null,
        data.pharmacyAddress
          ? React.createElement(Text, { style: styles.muted }, data.pharmacyAddress)
          : null,
        data.pharmacyPhone
          ? React.createElement(Text, { style: styles.muted }, data.pharmacyPhone)
          : null
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, "Sale #"),
          React.createElement(Text, null, data.saleNumber)
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, "Date"),
          React.createElement(Text, null, formatDateTime(data.createdAt))
        ),
        data.cashierName
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Cashier"),
              React.createElement(Text, null, data.cashierName)
            )
          : null,
        data.customerName
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Customer"),
              React.createElement(Text, null, data.customerName)
            )
          : null,
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, "Payment"),
          React.createElement(Text, null, data.paymentMethod.replace("_", " "))
        )
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colName }, "Item"),
          React.createElement(Text, { style: styles.colQty }, "Qty"),
          React.createElement(Text, { style: styles.colPrice }, "Price"),
          React.createElement(Text, { style: styles.colTotal }, "Total")
        ),
        ...data.items.map((item, index) =>
          React.createElement(
            View,
            { key: String(index), style: styles.itemRow },
            React.createElement(Text, { style: styles.colName }, item.name),
            React.createElement(
              Text,
              { style: styles.colQty },
              String(item.quantity)
            ),
            React.createElement(
              Text,
              { style: styles.colPrice },
              formatCurrency(item.unitPrice)
            ),
            React.createElement(
              Text,
              { style: styles.colTotal },
              formatCurrency(item.total)
            )
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.totals },
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, "Subtotal"),
          React.createElement(Text, null, formatCurrency(data.subtotal))
        ),
        data.discount > 0
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Discount"),
              React.createElement(Text, null, `-${formatCurrency(data.discount)}`)
            )
          : null,
        data.tax > 0
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Tax"),
              React.createElement(Text, null, formatCurrency(data.tax))
            )
          : null,
        (data.loyaltyRedeemed ?? 0) > 0
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Loyalty redeemed"),
              React.createElement(Text, null, `${data.loyaltyRedeemed} pts`)
            )
          : null,
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.totalStrong }, "Total"),
          React.createElement(
            Text,
            { style: styles.totalStrong },
            formatCurrency(data.total)
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, null, "Paid"),
          React.createElement(Text, null, formatCurrency(data.amountPaid))
        ),
        data.change > 0
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Change"),
              React.createElement(Text, null, formatCurrency(data.change))
            )
          : null,
        (data.loyaltyEarned ?? 0) > 0
          ? React.createElement(
              View,
              { style: styles.row },
              React.createElement(Text, null, "Loyalty earned"),
              React.createElement(Text, null, `${data.loyaltyEarned} pts`)
            )
          : null
      ),
      data.footer
        ? React.createElement(Text, { style: styles.footer }, data.footer)
        : React.createElement(
            Text,
            { style: styles.footer },
            "Thank you for choosing Bilal Pharmacy."
          )
    )
  ) as React.ReactElement<DocumentProps>;
}

export async function downloadReceiptPdf(
  data: ReceiptData,
  filename?: string
): Promise<void> {
  const blob = await pdf(createReceiptDocument(data)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `receipt-${data.saleNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Alias kept for ReceiptPrinter imports */
export const ReceiptDocument = createReceiptDocument;

export interface ReportColumn {
  key: string;
  header: string;
  width?: string | number;
}

export interface ReportTableData {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  pharmacyName?: string;
}

const reportStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    marginBottom: 4,
  },
  subtitle: {
    color: "#64748b",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3,
  },
  cell: {
    paddingRight: 4,
  },
  footer: {
    marginTop: 16,
    color: "#64748b",
    fontSize: 8,
  },
});

export function createReportDocument(
  data: ReportTableData
): React.ReactElement<DocumentProps> {
  const colCount = Math.max(data.columns.length, 1);
  const defaultWidth = `${Math.floor(100 / colCount)}%`;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: reportStyles.page },
      React.createElement(
        Text,
        { style: reportStyles.title },
        data.pharmacyName || "Bilal Pharmacy"
      ),
      React.createElement(Text, { style: reportStyles.title }, data.title),
      data.subtitle
        ? React.createElement(Text, { style: reportStyles.subtitle }, data.subtitle)
        : null,
      React.createElement(
        View,
        { style: reportStyles.headerRow },
        ...data.columns.map((col) =>
          React.createElement(
            Text,
            {
              key: col.key,
              style: [reportStyles.cell, { width: col.width ?? defaultWidth }],
            },
            col.header
          )
        )
      ),
      ...data.rows.map((row, index) =>
        React.createElement(
          View,
          { key: String(index), style: reportStyles.row },
          ...data.columns.map((col) =>
            React.createElement(
              Text,
              {
                key: col.key,
                style: [reportStyles.cell, { width: col.width ?? defaultWidth }],
              },
              row[col.key] == null ? "—" : String(row[col.key])
            )
          )
        )
      ),
      React.createElement(
        Text,
        { style: reportStyles.footer },
        `Generated ${formatDateTime(new Date())} · ${data.rows.length} rows`
      )
    )
  ) as React.ReactElement<DocumentProps>;
}

export async function downloadReportPdf(
  data: ReportTableData,
  filename?: string
): Promise<void> {
  const blob = await pdf(createReportDocument(data)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${data.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(
  columns: ReportColumn[],
  rows: Array<Record<string, string | number | null | undefined>>,
  filename = "export.csv"
): void {
  const headers = columns.map((c) => c.header);
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const str = value == null ? "" : String(value);
        if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

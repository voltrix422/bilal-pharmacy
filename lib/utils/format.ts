import { format, parseISO, isValid } from "date-fns";

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "PKR",
  locale = "en-PK"
): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  value: Date | string | number | null | undefined,
  pattern = "dd MMM yyyy"
): string {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, pattern);
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
  pattern = "dd MMM yyyy, hh:mm a"
): string {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, pattern);
}

export function formatNumber(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  locale = "en-PK"
): string {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, options).format(num);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  if (digits.length === 12 && digits.startsWith("92")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone.trim();
}

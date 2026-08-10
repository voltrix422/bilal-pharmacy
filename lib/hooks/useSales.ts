"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ApiResponse, PaginationMeta, SaleDTO } from "@/types";

export type SalesFilters = {
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  cashier?: string;
  paymentMethod?: string;
  status?: string;
  isHeld?: boolean | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export const salesKeys = {
  all: ["sales"] as const,
  lists: () => [...salesKeys.all, "list"] as const,
  list: (filters?: SalesFilters) =>
    [...salesKeys.lists(), filters ?? {}] as const,
  details: () => [...salesKeys.all, "detail"] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
};

export interface SalesListResult {
  sales: SaleDTO[];
  meta: PaginationMeta;
}

function toQueryString(filters?: SalesFilters) {
  const params = new URLSearchParams();
  if (!filters) return "";
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function fetchSales(filters?: SalesFilters): Promise<SalesListResult> {
  const res = await fetch(`/api/sales${toQueryString(filters)}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to load sales");
  }

  const body = (await res.json()) as ApiResponse<SaleDTO[]> & {
    meta?: PaginationMeta;
  };

  return {
    sales: body.data ?? [],
    meta: {
      page: body.meta?.page ?? filters?.page ?? 1,
      limit: body.meta?.limit ?? filters?.limit ?? 20,
      total: body.meta?.total ?? 0,
      totalPages: body.meta?.totalPages ?? 1,
    },
  };
}

async function fetchSale(id: string): Promise<SaleDTO> {
  const res = await fetch(`/api/sales/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to load sale");
  }

  const body = (await res.json()) as ApiResponse<SaleDTO>;
  if (!body.data) {
    throw new Error("Sale not found");
  }
  return body.data;
}

export type CheckoutPayload = {
  customerId?: string | null;
  prescriptionId?: string | null;
  paymentMethod: "CASH" | "CARD" | "INSURANCE" | "MOBILE_PAYMENT";
  discount?: number;
  tax?: number;
  amountPaid: number;
  notes?: string | null;
  loyaltyRedeemed?: number;
  isHeld?: boolean;
  insurancePolicyNumber?: string | null;
  items: Array<{
    medicineId: string;
    batchId?: string | null;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }>;
};

async function checkoutSale(payload: CheckoutPayload): Promise<SaleDTO> {
  const res = await fetch("/api/pos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Checkout failed");
  }

  const body = (await res.json()) as ApiResponse<SaleDTO>;
  if (!body.data) {
    throw new Error("Invalid checkout response");
  }
  return body.data;
}

export function useSales(
  filters?: SalesFilters,
  options?: Omit<
    UseQueryOptions<SalesListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: () => fetchSales(filters),
    ...options,
  });
}

export function useSale(
  id: string | undefined,
  options?: Omit<UseQueryOptions<SaleDTO, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: salesKeys.detail(id ?? ""),
    queryFn: () => fetchSale(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkoutSale,
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.setQueryData(salesKeys.detail(sale.id), sale);
    },
  });
}

export type PosProduct = {
  id: string;
  name: string;
  genericName?: string | null;
  brand?: string | null;
  sku: string;
  barcode?: string | null;
  category: string;
  unit: string;
  strength?: string | null;
  requiresPrescription: boolean;
  isControlled: boolean;
  imageUrl?: string | null;
  totalStock: number;
  sellingPrice: number;
  batchId?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | null;
  batches: Array<{
    id: string;
    batchNumber: string;
    remainingQuantity: number;
    sellingPrice: number;
    expiryDate: string;
  }>;
};

export const posKeys = {
  all: ["pos"] as const,
  products: (q?: string) => [...posKeys.all, "products", q ?? ""] as const,
  customers: (q?: string) => [...posKeys.all, "customers", q ?? ""] as const,
};

async function fetchPosProducts(q = ""): Promise<PosProduct[]> {
  const params = new URLSearchParams({ type: "products", limit: "48" });
  if (q) params.set("q", q);
  const res = await fetch(`/api/pos?${params}`, { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to load products");
  }
  const body = (await res.json()) as ApiResponse<PosProduct[]>;
  return body.data ?? [];
}

async function fetchPosCustomers(q = "") {
  const params = new URLSearchParams({ type: "customers", limit: "20" });
  if (q) params.set("q", q);
  const res = await fetch(`/api/pos?${params}`, { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to load customers");
  }
  const body = (await res.json()) as ApiResponse<
    import("@/types").CustomerDTO[]
  >;
  return body.data ?? [];
}

export function usePosProducts(q: string, enabled = true) {
  return useQuery({
    queryKey: posKeys.products(q),
    queryFn: () => fetchPosProducts(q),
    enabled,
    staleTime: 10_000,
  });
}

export function usePosCustomers(q: string, enabled = true) {
  return useQuery({
    queryKey: posKeys.customers(q),
    queryFn: () => fetchPosCustomers(q),
    enabled,
    staleTime: 15_000,
  });
}

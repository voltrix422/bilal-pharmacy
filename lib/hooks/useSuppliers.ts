"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ApiResponse,
  PaginationMeta,
  PurchaseOrderDTO,
  SupplierDTO,
} from "@/types";
import type { SupplierInput, SupplierUpdateInput } from "@/lib/validations/supplier";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...supplierKeys.lists(), params ?? {}] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
};

export interface SupplierListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

export interface SupplierDetail extends SupplierDTO {
  purchaseOrders?: PurchaseOrderDTO[];
  payables?: {
    totalOrdered: number;
    openOrders: number;
    openAmount: number;
    receivedOrders: number;
    paymentTerms?: string | null;
  };
  _count?: {
    purchaseOrders: number;
    batches: number;
  };
}

export interface SupplierListResult {
  suppliers: SupplierDTO[];
  meta: PaginationMeta;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Request failed");
  }
  if (body?.data === undefined) {
    throw new Error("Invalid response from server");
  }
  return body.data;
}

function toQuery(params?: SupplierListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.isActive !== undefined) {
    query.set("isActive", String(params.isActive));
  }
  return query;
}

async function fetchSuppliers(
  params?: SupplierListParams
): Promise<SupplierListResult> {
  const query = toQuery(params);
  const res = await fetch(`/api/suppliers?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<SupplierDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load suppliers");
  }

  return {
    suppliers: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function fetchSupplier(id: string): Promise<SupplierDetail> {
  const res = await fetch(`/api/suppliers/${id}`, { credentials: "include" });
  return parseResponse<SupplierDetail>(res);
}

async function createSupplier(input: SupplierInput): Promise<SupplierDTO> {
  const res = await fetch("/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseResponse<SupplierDTO>(res);
}

async function updateSupplier({
  id,
  data,
}: {
  id: string;
  data: SupplierUpdateInput;
}): Promise<SupplierDTO> {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return parseResponse<SupplierDTO>(res);
}

async function deleteSupplier(id: string): Promise<SupplierDTO> {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<SupplierDTO>(res);
}

export function useSuppliers(
  params?: SupplierListParams,
  options?: Omit<
    UseQueryOptions<SupplierListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: supplierKeys.list(
      params as Record<string, string | number | boolean | undefined>
    ),
    queryFn: () => fetchSuppliers(params),
    staleTime: 15_000,
    ...options,
  });
}

export function useSupplier(
  id: string,
  options?: Omit<
    UseQueryOptions<SupplierDetail, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => fetchSupplier(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    ...options,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(data.id) });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.detail(id) });
    },
  });
}

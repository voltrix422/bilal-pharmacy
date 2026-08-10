"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ApiResponse,
  BatchListItem,
  MedicineListItem,
  PaginationMeta,
} from "@/types";
import type {
  BatchInput,
  BatchUpdateInput,
} from "@/lib/validations/batch";
import type {
  MedicineInput,
  MedicineUpdateInput,
} from "@/lib/validations/medicine";

export type MedicinesQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  unit?: string;
  lowStock?: boolean;
  /** Only medicines with remaining store stock (active batches) */
  hasStock?: boolean;
  /** drap = DRAP catalog SKUs, local = non-DRAP */
  source?: "drap" | "local";
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  requiresPrescription?: boolean;
};

export type BatchesQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  medicineId?: string;
  supplierId?: string;
  locationId?: string;
  expiryStatus?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

type ListResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export const medicineKeys = {
  all: ["medicines"] as const,
  lists: () => [...medicineKeys.all, "list"] as const,
  list: (params?: MedicinesQueryParams) =>
    [...medicineKeys.lists(), params ?? {}] as const,
  details: () => [...medicineKeys.all, "detail"] as const,
  detail: (id: string) => [...medicineKeys.details(), id] as const,
  barcode: (code: string) => [...medicineKeys.all, "barcode", code] as const,
};

export const batchKeys = {
  all: ["batches"] as const,
  lists: () => [...batchKeys.all, "list"] as const,
  list: (params?: BatchesQueryParams) =>
    [...batchKeys.lists(), params ?? {}] as const,
  details: () => [...batchKeys.all, "detail"] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
};

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === null) return;
    search.set(key, String(value));
  });
  return search.toString();
}

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json().catch(() => ({
    success: false,
    error: { message: "Invalid server response" },
  }))) as ApiResponse<T>;
}

async function fetchMedicines(
  params: MedicinesQueryParams = {}
): Promise<ListResult<MedicineListItem>> {
  const qs = toQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    category: params.category,
    unit: params.unit,
    lowStock: params.lowStock,
    hasStock: params.hasStock,
    source: params.source,
    isActive: params.isActive,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    requiresPrescription: params.requiresPrescription,
  });

  const res = await fetch(`/api/medicines?${qs}`, { credentials: "include" });
  const body = await parseJson<MedicineListItem[]>(res);

  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? "Failed to load medicines");
  }

  const meta = body.meta as PaginationMeta | undefined;
  return {
    data: body.data ?? [],
    meta: {
      page: meta?.page ?? params.page ?? 1,
      limit: meta?.limit ?? params.limit ?? 20,
      total: meta?.total ?? body.data?.length ?? 0,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

async function fetchMedicine(id: string) {
  const res = await fetch(`/api/medicines/${id}`, { credentials: "include" });
  const body = await parseJson<Record<string, unknown>>(res);
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message ?? "Failed to load medicine");
  }
  return body.data;
}

async function createMedicine(input: MedicineInput) {
  const res = await fetch("/api/medicines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const body = await parseJson<MedicineListItem>(res);
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message ?? "Failed to create medicine");
  }
  return body.data;
}

async function updateMedicine({
  id,
  data,
}: {
  id: string;
  data: MedicineUpdateInput;
}) {
  const res = await fetch(`/api/medicines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const body = await parseJson(res);
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? "Failed to update medicine");
  }
  return body.data;
}

async function deleteMedicine(id: string) {
  const res = await fetch(`/api/medicines/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = await parseJson(res);
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? "Failed to deactivate medicine");
  }
  return body.data;
}

async function fetchBatches(
  params: BatchesQueryParams = {}
): Promise<ListResult<BatchListItem>> {
  const qs = toQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search,
    medicineId: params.medicineId,
    supplierId: params.supplierId,
    locationId: params.locationId,
    expiryStatus: params.expiryStatus,
    isActive: params.isActive,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  const res = await fetch(`/api/batches?${qs}`, { credentials: "include" });
  const body = await parseJson<BatchListItem[]>(res);

  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? "Failed to load batches");
  }

  const meta = body.meta as PaginationMeta | undefined;
  return {
    data: body.data ?? [],
    meta: {
      page: meta?.page ?? params.page ?? 1,
      limit: meta?.limit ?? params.limit ?? 20,
      total: meta?.total ?? body.data?.length ?? 0,
      totalPages: meta?.totalPages ?? 1,
    },
  };
}

async function createBatch(input: BatchInput) {
  const res = await fetch("/api/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const body = await parseJson<BatchListItem>(res);
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message ?? "Failed to create batch");
  }
  return body.data;
}

async function updateBatch({
  id,
  data,
}: {
  id: string;
  data: BatchUpdateInput & { reason?: string };
}) {
  const res = await fetch(`/api/batches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const body = await parseJson<BatchListItem>(res);
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error?.message ?? "Failed to update batch");
  }
  return body.data;
}

async function lookupBarcode(code: string) {
  const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`, {
    credentials: "include",
  });
  const body = await parseJson(res);
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? "Barcode lookup failed");
  }
  return body.data;
}

export function useMedicines(
  params: MedicinesQueryParams = {},
  options?: Omit<
    UseQueryOptions<ListResult<MedicineListItem>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: medicineKeys.list(params),
    queryFn: () => fetchMedicines(params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    ...options,
  });
}

export function useMedicine(
  id: string,
  options?: Omit<
    UseQueryOptions<Record<string, unknown>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: medicineKeys.detail(id),
    queryFn: () => fetchMedicine(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.all });
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMedicine,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.all });
      queryClient.invalidateQueries({ queryKey: medicineKeys.detail(vars.id) });
    },
  });
}

export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicineKeys.all });
    },
  });
}

export function useBatches(
  params: BatchesQueryParams = {},
  options?: Omit<
    UseQueryOptions<ListResult<BatchListItem>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: batchKeys.list(params),
    queryFn: () => fetchBatches(params),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    ...options,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: medicineKeys.all });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBatch,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(vars.id) });
      queryClient.invalidateQueries({ queryKey: medicineKeys.all });
    },
  });
}

export function useBarcodeLookup(
  code: string,
  options?: Omit<UseQueryOptions<unknown, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: medicineKeys.barcode(code),
    queryFn: () => lookupBarcode(code),
    enabled: Boolean(code?.trim()),
    ...options,
  });
}

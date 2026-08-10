"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ApiResponse,
  AuditLogDTO,
  PaginationMeta,
  Role,
  UserDTO,
} from "@/types";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validations/user";

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...userKeys.lists(), params ?? {}] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...auditKeys.lists(), params ?? {}] as const,
};

export interface UserListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: Role;
  isActive?: boolean;
}

export interface UserListResult {
  users: UserDTO[];
  meta: PaginationMeta;
}

export interface AuditLogListParams {
  userId?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuditLogWithUser extends AuditLogDTO {
  user?: Pick<UserDTO, "id" | "name" | "email" | "role"> | null;
}

export interface AuditLogListResult {
  logs: AuditLogWithUser[];
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

function toUserQuery(params?: UserListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.role) query.set("role", params.role);
  if (params.isActive !== undefined) {
    query.set("isActive", String(params.isActive));
  }
  return query;
}

function toAuditQuery(params?: AuditLogListParams) {
  const query = new URLSearchParams();
  if (!params) return query;
  if (params.userId) query.set("userId", params.userId);
  if (params.action) query.set("action", params.action);
  if (params.entity) query.set("entity", params.entity);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query;
}

async function fetchUsers(params?: UserListParams): Promise<UserListResult> {
  const query = toUserQuery(params);
  const res = await fetch(`/api/users?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<UserDTO[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load users");
  }

  return {
    users: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

async function fetchUser(id: string): Promise<UserDTO> {
  const res = await fetch(`/api/users/${id}`, { credentials: "include" });
  return parseResponse<UserDTO>(res);
}

async function createUser(input: CreateUserInput): Promise<UserDTO> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseResponse<UserDTO>(res);
}

async function updateUser({
  id,
  data,
}: {
  id: string;
  data: UpdateUserInput;
}): Promise<UserDTO> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return parseResponse<UserDTO>(res);
}

async function deactivateUser(id: string): Promise<UserDTO> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseResponse<UserDTO>(res);
}

async function fetchAuditLogs(
  params?: AuditLogListParams
): Promise<AuditLogListResult> {
  const query = toAuditQuery(params);
  const res = await fetch(`/api/audit?${query.toString()}`, {
    credentials: "include",
  });
  const body = (await res.json().catch(() => null)) as
    | (ApiResponse<AuditLogWithUser[]> & { meta?: PaginationMeta })
    | null;

  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Failed to load audit logs");
  }

  return {
    logs: body?.data ?? [],
    meta: {
      page: body?.meta?.page ?? params?.page ?? 1,
      limit: body?.meta?.limit ?? params?.limit ?? 20,
      total: body?.meta?.total ?? 0,
      totalPages: body?.meta?.totalPages ?? 1,
    },
  };
}

export function useUsers(
  params?: UserListParams,
  options?: Omit<
    UseQueryOptions<UserListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: userKeys.list(
      params as Record<string, string | number | boolean | undefined>
    ),
    queryFn: () => fetchUsers(params),
    staleTime: 15_000,
    ...options,
  });
}

export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<UserDTO, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => fetchUser(id),
    enabled: Boolean(id),
    staleTime: 15_000,
    ...options,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(data.id) });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: auditKeys.lists() });
    },
  });
}

export function useAuditLogs(
  params?: AuditLogListParams,
  options?: Omit<
    UseQueryOptions<AuditLogListResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: auditKeys.list(
      params as Record<string, string | number | boolean | undefined>
    ),
    queryFn: () => fetchAuditLogs(params),
    staleTime: 10_000,
    ...options,
  });
}

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ApiResponse, NotificationDTO } from "@/types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    [...notificationKeys.all, "list", params ?? {}] as const,
};

interface NotificationsResult {
  notifications: NotificationDTO[];
  unreadCount: number;
}

async function fetchNotifications(limit = 20): Promise<NotificationsResult> {
  const res = await fetch(`/api/notifications?limit=${limit}&page=1`, {
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to load notifications");
  }

  const body = (await res.json()) as ApiResponse<NotificationDTO[]> & {
    meta?: { unreadCount?: number; total?: number };
  };

  const notifications = body.data ?? [];
  const unreadCount =
    typeof body.meta?.unreadCount === "number"
      ? body.meta.unreadCount
      : notifications.filter((n) => !n.isRead).length;

  return { notifications, unreadCount };
}

async function markNotificationRead(id: string): Promise<NotificationDTO> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, isRead: true }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(body?.error?.message ?? "Failed to mark notification as read");
  }

  const body = (await res.json()) as ApiResponse<NotificationDTO>;
  if (!body.data) {
    throw new Error("Invalid response from server");
  }
  return body.data;
}

async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ markAll: true, isRead: true }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
    throw new Error(
      body?.error?.message ?? "Failed to mark all notifications as read"
    );
  }
}

export function useNotifications(
  limit = 20,
  options?: Omit<
    UseQueryOptions<NotificationsResult, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: notificationKeys.list({ limit }),
    queryFn: () => fetchNotifications(limit),
    refetchInterval: 60_000,
    staleTime: 15_000,
    ...options,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previous = queryClient.getQueriesData<NotificationsResult>({
        queryKey: notificationKeys.all,
      });

      queryClient.setQueriesData<NotificationsResult>(
        { queryKey: notificationKeys.all },
        (current) => {
          if (!current) return current;
          const notifications = current.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          );
          const unreadCount = notifications.filter((n) => !n.isRead).length;
          return { notifications, unreadCount };
        }
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previous = queryClient.getQueriesData<NotificationsResult>({
        queryKey: notificationKeys.all,
      });

      queryClient.setQueriesData<NotificationsResult>(
        { queryKey: notificationKeys.all },
        (current) => {
          if (!current) return current;
          return {
            notifications: current.notifications.map((n) => ({
              ...n,
              isRead: true,
            })),
            unreadCount: 0,
          };
        }
      );

      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

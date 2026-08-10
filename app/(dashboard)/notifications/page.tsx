"use client";

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock,
  Info,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import type { NotificationDTO, NotificationPriority } from "@/types";
import { formatDateTime } from "@/lib/utils/format";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function priorityStyles(priority: NotificationPriority) {
  switch (priority) {
    case "CRITICAL":
      return "border-l-red-500 bg-red-50/70 dark:bg-red-950/20";
    case "HIGH":
      return "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20";
    case "MEDIUM":
      return "border-l-pharmacy-500 bg-pharmacy-50/60 dark:bg-pharmacy-950/20";
    default:
      return "border-l-slate-400 bg-muted/30";
  }
}

function NotificationIcon({ type }: { type: NotificationDTO["type"] }) {
  switch (type) {
    case "LOW_STOCK":
      return <Package className="h-5 w-5 text-pharmacy-600" />;
    case "EXPIRY_WARNING":
    case "EXPIRY_CRITICAL":
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    case "PRESCRIPTION_PENDING":
    case "NEW_ORDER":
    case "PAYMENT_DUE":
      return <Clock className="h-5 w-5 text-pharmacy-600" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />;
  }
}

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useNotifications(100);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function handleMarkRead(notification: NotificationDTO) {
    if (notification.isRead) return;
    try {
      await markRead.mutateAsync(notification.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as read"
      );
    }
  }

  async function handleMarkAll() {
    if (unreadCount === 0) return;
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark all as read"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System alerts for stock, expiry, and pending prescriptions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Refresh
            </Button>
            <Button
              type="button"
              variant="primary"
              className="gap-1.5"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading notifications…
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Unable to load notifications.
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="No notifications right now. Cron jobs will create stock and expiry alerts automatically."
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => void handleMarkRead(notification)}
                className={cn(
                  "flex w-full gap-3 rounded-lg border border-l-4 p-4 text-left transition-colors hover:bg-muted/40",
                  priorityStyles(notification.priority),
                  !notification.isRead && "shadow-sm"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {notification.title}
                    </p>
                    {!notification.isRead ? (
                      <Badge className="h-5 px-1.5 text-[10px]">New</Badge>
                    ) : null}
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {notification.priority}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {notification.type.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                    {notification.userId == null ? " · System-wide" : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

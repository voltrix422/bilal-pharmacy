"use client";

import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function priorityStyles(priority: NotificationPriority) {
  switch (priority) {
    case "CRITICAL":
      return "border-l-red-500 bg-red-50/80 dark:bg-red-950/30";
    case "HIGH":
      return "border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/20";
    case "MEDIUM":
      return "border-l-pharmacy-500 bg-pharmacy-50/70 dark:bg-pharmacy-950/20";
    default:
      return "border-l-slate-400 bg-muted/40";
  }
}

function NotificationIcon({ type }: { type: NotificationDTO["type"] }) {
  switch (type) {
    case "LOW_STOCK":
      return <Package className="h-4 w-4 text-pharmacy-600" />;
    case "EXPIRY_WARNING":
    case "EXPIRY_CRITICAL":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case "PRESCRIPTION_PENDING":
    case "NEW_ORDER":
    case "PAYMENT_DUE":
      return <Clock className="h-4 w-4 text-pharmacy-600" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const { data, isLoading, isError } = useNotifications(12);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  async function handleMarkRead(id: string, isRead: boolean) {
    if (isRead) return;
    try {
      await markRead.mutateAsync(id);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px] p-0 sm:w-[400px]">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-base">
            Notifications
          </DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-pharmacy-700 hover:text-pharmacy-800 dark:text-pharmacy-300"
            onClick={handleMarkAll}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        </div>
        <Separator />

        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Unable to load notifications.
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 opacity-40" />
              You&apos;re all caught up
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() =>
                      handleMarkRead(notification.id, notification.isRead)
                    }
                    className={cn(
                      "flex w-full gap-3 border-l-4 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      priorityStyles(notification.priority),
                      !notification.isRead && "font-medium"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm text-foreground">
                          {notification.title}
                        </p>
                        {!notification.isRead ? (
                          <Badge
                            variant="default"
                            className="h-5 shrink-0 px-1.5 text-[10px]"
                          >
                            New
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[11px] font-normal text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <Button
            asChild
            variant="ghost"
            className="w-full text-pharmacy-700 hover:text-pharmacy-800 dark:text-pharmacy-300"
          >
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

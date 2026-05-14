import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/hooks/use-auth";
import type { Notification } from "@shared/schema";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// Rule keys (notifications.type values) that we treat as "info request" nags
// the user can permanently silence with a one-tap "Don't ask again" button.
const SILENCEABLE_RULE_KEYS = new Set<string>([
  "profileIncomplete",
]);

export function NotificationBell() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    },
  });

  const muteRuleMutation = useMutation({
    mutationFn: async (ruleKey: string) => {
      await apiRequest("POST", "/api/notifications/mute-rule", { ruleKey, muted: true });
    },
    onSuccess: (_d, ruleKey) => {
      toast({ title: "Silenced", description: `You won't get more "${ruleKey}" reminders. Manage in Settings → Notifications.` });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't silence", description: err.message, variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    },
  });

  const notifications = data?.notifications?.slice(0, 10) ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const hasTriggeredMarkAll = useRef(false);

  useEffect(() => {
    if (popoverOpen && unreadCount > 0 && !hasTriggeredMarkAll.current) {
      hasTriggeredMarkAll.current = true;
      markAllReadMutation.mutate();
    }
    if (!popoverOpen) {
      hasTriggeredMarkAll.current = false;
    }
  }, [popoverOpen]);

  if (!user) return null;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        data-testid="popover-notifications"
      >
        <div className="flex items-center justify-between gap-2 border-b p-3" data-testid="header-notifications">
          <h4 className="text-sm font-semibold" data-testid="text-notifications-title">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto" data-testid="list-notifications">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-loading">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => {
              const canSilence = SILENCEABLE_RULE_KEYS.has(notification.type);
              return (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left p-3 border-b last:border-b-0 hover-elevate cursor-pointer transition-colors flex items-start gap-2 ${
                    !notification.readAt ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleNotificationClick(notification); }}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span
                      className={`text-sm ${!notification.readAt ? "font-bold" : "font-medium"}`}
                      data-testid={`text-notification-title-${notification.id}`}
                    >
                      {notification.title}
                    </span>
                    <span
                      className="text-xs text-muted-foreground line-clamp-2"
                      data-testid={`text-notification-message-${notification.id}`}
                    >
                      {notification.message}
                    </span>
                    <span
                      className="text-xs text-muted-foreground/70"
                      data-testid={`text-notification-time-${notification.id}`}
                    >
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                    {canSilence && (
                      <button
                        type="button"
                        className="mt-1 self-start inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline decoration-dotted underline-offset-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (muteRuleMutation.isPending) return;
                          muteRuleMutation.mutate(notification.type);
                        }}
                        disabled={muteRuleMutation.isPending}
                        data-testid={`button-mute-rule-${notification.id}`}
                      >
                        <BellOff className="h-3 w-3" />
                        Don't ask again
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t p-2">
          <button
            className="w-full text-center text-sm text-primary font-medium py-1.5 rounded-md hover-elevate"
            onClick={() => setLocation("/notifications")}
            data-testid="link-view-all-notifications"
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  Loader2,
  Search,
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Notification } from "@shared/schema";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

type TabValue = "in_progress" | "completed" | "archived";

const statusConfig: Record<TabValue, { label: string; icon: typeof Clock; emptyText: string }> = {
  in_progress: { label: "In Progress", icon: Clock, emptyText: "No notifications in progress" },
  completed: { label: "Completed", icon: CheckCircle2, emptyText: "No completed notifications" },
  archived: { label: "Archived", icon: Archive, emptyText: "No archived notifications" },
};

function getNotificationTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "session_join":
    case "session":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "membership":
    case "membership_request":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "match":
    case "match_result":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "club":
    case "club_approval":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "payment":
    case "credit":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "admin":
    case "system":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function NotificationsPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabValue>("in_progress");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/notifications/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      await apiRequest("POST", "/api/notifications/bulk-status", { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setSelectedIds(new Set());
      toast({ title: "Notifications updated" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const allNotifications = data?.notifications ?? [];

  const groupedByStatus = useMemo(() => {
    const groups: Record<TabValue, Notification[]> = { in_progress: [], completed: [], archived: [] };
    allNotifications.forEach((n) => {
      const s = (n.status || "in_progress") as TabValue;
      if (groups[s]) groups[s].push(n);
    });
    return groups;
  }, [allNotifications]);

  const getFilteredForTab = (tab: TabValue) => {
    const tabItems = groupedByStatus[tab];
    if (!searchQuery.trim()) return tabItems;
    const q = searchQuery.toLowerCase();
    return tabItems.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
    );
  };

  const filteredNotifications = useMemo(() => getFilteredForTab(activeTab), [groupedByStatus, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    in_progress: groupedByStatus.in_progress.length,
    completed: groupedByStatus.completed.length,
    archived: groupedByStatus.archived.length,
  }), [groupedByStatus]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleBulkAction = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkStatusMutation.mutate({ ids, status });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.linkUrl) {
      setLocation(notification.linkUrl);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-notifications-title">Notifications</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-notifications-subtitle">
                {allNotifications.length} total notifications
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabValue); setSelectedIds(new Set()); setSearchQuery(""); }}>
          <TabsList className="w-full grid grid-cols-3" data-testid="tabs-notifications">
            <TabsTrigger value="in_progress" className="gap-2" data-testid="tab-in-progress">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">In Progress</span>
              <span className="sm:hidden">Active</span>
              {counts.in_progress > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.in_progress}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed</span>
              {counts.completed > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.completed}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2" data-testid="tab-archived">
              <Archive className="h-4 w-4" />
              <span>Archived</span>
              {counts.archived > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.archived}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-notifications"
              />
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                {activeTab !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("completed")}
                    disabled={bulkStatusMutation.isPending}
                    data-testid="button-bulk-complete"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                )}
                {activeTab !== "archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("archived")}
                    disabled={bulkStatusMutation.isPending}
                    data-testid="button-bulk-archive"
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                )}
                {activeTab !== "in_progress" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("in_progress")}
                    disabled={bulkStatusMutation.isPending}
                    data-testid="button-bulk-restore"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                )}
              </div>
            )}
          </div>

          {filteredNotifications.length > 0 && (
            <div className="mt-2 flex items-center gap-2 px-1">
              <Checkbox
                checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={selectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
          )}

          {(["in_progress", "completed", "archived"] as TabValue[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-3 space-y-3">
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-notifications" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center">
                      <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
                      <p className="text-lg font-medium text-muted-foreground" data-testid="text-empty-notifications">
                        {statusConfig[tab].emptyText}
                      </p>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`transition-all ${!notification.readAt ? "border-primary/30" : ""}`}
                    data-testid={`notification-card-${notification.id}`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={selectedIds.has(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                            data-testid={`checkbox-notification-${notification.id}`}
                          />
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                          data-testid={`notification-content-${notification.id}`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {!notification.readAt && (
                                <span className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" data-testid={`indicator-unread-${notification.id}`} />
                              )}
                              <h3
                                className={`text-base ${!notification.readAt ? "font-bold" : "font-medium"}`}
                                data-testid={`text-notification-title-${notification.id}`}
                              >
                                {notification.title}
                              </h3>
                              <Badge variant="secondary" className={`text-xs ${getNotificationTypeColor(notification.type)}`} data-testid={`badge-type-${notification.id}`}>
                                {notification.type.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0" data-testid={`text-notification-time-${notification.id}`}>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed" data-testid={`text-notification-message-${notification.id}`}>
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                            <span className="text-xs text-muted-foreground/70">
                              {format(new Date(notification.createdAt), "dd MMM yyyy, HH:mm")}
                            </span>

                            {notification.linkUrl && (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View details
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          {tab !== "completed" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ id: notification.id, status: "completed" });
                              }}
                              disabled={updateStatusMutation.isPending}
                              title="Mark completed"
                              data-testid={`button-complete-${notification.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {tab !== "archived" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ id: notification.id, status: "archived" });
                              }}
                              disabled={updateStatusMutation.isPending}
                              title="Archive"
                              data-testid={`button-archive-${notification.id}`}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {tab !== "in_progress" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ id: notification.id, status: "in_progress" });
                              }}
                              disabled={updateStatusMutation.isPending}
                              title="Move to In Progress"
                              data-testid={`button-restore-${notification.id}`}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

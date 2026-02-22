import { useState, useMemo, useEffect, useRef } from "react";
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
  ClipboardList,
  Gift,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Notification } from "@shared/schema";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

type TabValue = "pending_tasks" | "in_progress" | "completed" | "archived";

const statusConfig: Record<TabValue, { label: string; icon: typeof Clock; emptyText: string }> = {
  pending_tasks: { label: "Pending Tasks", icon: ClipboardList, emptyText: "No pending tasks" },
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
    case "reward_request":
    case "reward_approved":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

interface PendingTask {
  id: number;
  type: string;
  playerName: string;
  description: string;
  credits: number;
  gifts: string | null;
  freeSessions: number;
  clubName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotificationsPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";
  const [activeTab, setActiveTab] = useState<TabValue>("in_progress");
  const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);

  useEffect(() => {
    if (user && isAdminOrOwner && !hasSetDefaultTab) {
      setActiveTab("pending_tasks");
      setHasSetDefaultTab(true);
    }
  }, [user, isAdminOrOwner, hasSetDefaultTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: pendingRewardsData, isLoading: pendingRewardsLoading } = useQuery<{ rewards: PendingTask[] }>({
    queryKey: ["/api/admin/rewards/pending-tasks"],
    enabled: !!user && isAdminOrOwner,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/notifications/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
      await apiRequest("POST", "/api/notifications/bulk-status", { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      setSelectedIds(new Set());
      toast({ title: "Notifications updated" });
    },
  });

  const approveRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      await apiRequest("POST", `/api/admin/rewards/${rewardId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards/pending-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Reward Approved", description: "The reward has been approved and credits issued." });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
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

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badge-counts"] });
    },
  });

  const hasMarkedAll = useRef(false);
  useEffect(() => {
    if (data && (data.unreadCount ?? 0) > 0 && !hasMarkedAll.current) {
      hasMarkedAll.current = true;
      markAllReadMutation.mutate();
    }
  }, [data]);

  const allNotifications = data?.notifications ?? [];

  const pendingTasks = pendingRewardsData?.rewards || [];
  const filteredPendingTasks = useMemo(() => {
    if (!searchQuery.trim()) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter(t => t.playerName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.clubName.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<"in_progress" | "completed" | "archived", Notification[]> = { in_progress: [], completed: [], archived: [] };
    allNotifications.forEach((n) => {
      const s = (n.status || "in_progress") as "in_progress" | "completed" | "archived";
      if (groups[s]) groups[s].push(n);
    });
    return groups;
  }, [allNotifications]);

  const getFilteredForTab = (tab: TabValue) => {
    if (tab === "pending_tasks") return [];
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
    pending_tasks: pendingTasks.length,
    in_progress: groupedByStatus.in_progress.length,
    completed: groupedByStatus.completed.length,
    archived: groupedByStatus.archived.length,
  }), [groupedByStatus, pendingTasks]);

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
          <TabsList className={`w-full grid ${isAdminOrOwner ? "grid-cols-4" : "grid-cols-3"}`} data-testid="tabs-notifications">
            {isAdminOrOwner && (
              <TabsTrigger value="pending_tasks" className="gap-1" data-testid="tab-pending-tasks">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Pending</span>
                <span className="sm:hidden">Tasks</span>
                {counts.pending_tasks > 0 && (
                  <Badge variant="destructive" className="ml-1">{counts.pending_tasks}</Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="in_progress" className="gap-1" data-testid="tab-in-progress">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">In Progress</span>
              <span className="sm:hidden">Active</span>
              {counts.in_progress > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.in_progress}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1" data-testid="tab-completed">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">Done</span>
              {counts.completed > 0 && (
                <Badge variant="secondary" className="ml-1">{counts.completed}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1" data-testid="tab-archived">
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

          {isAdminOrOwner && (
            <TabsContent value="pending_tasks" className="mt-3 space-y-3">
              {activeTab === "pending_tasks" && (
                <div className="relative flex-1 w-full mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pending tasks..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-pending-tasks"
                  />
                </div>
              )}
              {pendingRewardsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-pending-tasks" />
                </div>
              ) : filteredPendingTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500/40" />
                      <p className="text-lg font-medium text-muted-foreground" data-testid="text-empty-pending-tasks">
                        All caught up! No pending tasks.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Reward requests will appear here when players claim rewards.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{filteredPendingTasks.length} pending reward request{filteredPendingTasks.length !== 1 ? "s" : ""}</p>
                  </div>
                  {filteredPendingTasks.map((task) => (
                    <Card key={task.id} className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10" data-testid={`pending-task-${task.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
                            <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold" data-testid={`text-task-player-${task.id}`}>{task.playerName}</h3>
                                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">Awaiting Approval</Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-task-description-${task.id}`}>{task.description}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {task.credits > 0 && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">£{(task.credits / 100).toFixed(2)}</span>}
                              {task.freeSessions > 0 && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{task.freeSessions} free session{task.freeSessions > 1 ? "s" : ""}</span>}
                              {task.gifts && <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{task.gifts}</span>}
                              <span className="text-xs text-muted-foreground">· {task.clubName}</span>
                              <span className="text-xs text-muted-foreground">· {task.type.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => approveRewardMutation.mutate(task.id)}
                              disabled={approveRewardMutation.isPending}
                              data-testid={`button-approve-task-${task.id}`}
                            >
                              {approveRewardMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setLocation("/admin/rewards")}
                              data-testid={`button-view-task-${task.id}`}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
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

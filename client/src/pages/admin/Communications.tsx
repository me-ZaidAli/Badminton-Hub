import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Bell, CreditCard, Clock, Mail, MessageSquare, Settings, Send,
  AlertTriangle, CheckCircle, XCircle, Ticket, Gift, Users, Building2, Loader2,
  Megaphone, Trophy, CalendarDays, Radio, Filter, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link } from "wouter";

interface NotificationSettings {
  clubId: number;
  paymentRemindersEnabled: boolean;
  paymentReminderDaysBefore: number;
  paymentReminderDailyAfter: boolean;
  membershipRemindersEnabled: boolean;
  referralRemindersEnabled: boolean;
  ticketNotificationsEnabled: boolean;
  messageNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  sessionAvailabilityEnabled: boolean;
  sessionReminderEnabled: boolean;
  sessionReminderHoursBefore: number;
  announcementNotificationsEnabled: boolean;
  chatNotificationsEnabled: boolean;
  tournamentNotificationsEnabled: boolean;
}

function SettingsSection({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/clubs", clubId, "notification-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/notification-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [localOverrides, setLocalOverrides] = useState<Partial<NotificationSettings>>({});

  const effective = useMemo(() => {
    const defaults: NotificationSettings = {
      clubId,
      paymentRemindersEnabled: true,
      paymentReminderDaysBefore: 2,
      paymentReminderDailyAfter: true,
      membershipRemindersEnabled: true,
      referralRemindersEnabled: true,
      ticketNotificationsEnabled: true,
      messageNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      sessionAvailabilityEnabled: true,
      sessionReminderEnabled: true,
      sessionReminderHoursBefore: 24,
      announcementNotificationsEnabled: true,
      chatNotificationsEnabled: true,
      tournamentNotificationsEnabled: true,
    };
    return { ...defaults, ...settings, ...localOverrides };
  }, [settings, localOverrides, clubId]);

  const setField = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setLocalOverrides(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(localOverrides).length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};
      payload.paymentRemindersEnabled = effective.paymentRemindersEnabled;
      payload.paymentReminderDaysBefore = effective.paymentReminderDaysBefore;
      payload.paymentReminderDailyAfter = effective.paymentReminderDailyAfter;
      payload.membershipRemindersEnabled = effective.membershipRemindersEnabled;
      payload.referralRemindersEnabled = effective.referralRemindersEnabled;
      payload.ticketNotificationsEnabled = effective.ticketNotificationsEnabled;
      payload.messageNotificationsEnabled = effective.messageNotificationsEnabled;
      payload.emailNotificationsEnabled = effective.emailNotificationsEnabled;
      payload.sessionAvailabilityEnabled = effective.sessionAvailabilityEnabled;
      payload.sessionReminderEnabled = effective.sessionReminderEnabled;
      payload.sessionReminderHoursBefore = effective.sessionReminderHoursBefore;
      payload.announcementNotificationsEnabled = effective.announcementNotificationsEnabled;
      payload.chatNotificationsEnabled = effective.chatNotificationsEnabled;
      payload.tournamentNotificationsEnabled = effective.tournamentNotificationsEnabled;
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/notification-settings`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "notification-settings"] });
      setLocalOverrides({});
      toast({ title: "Saved", description: `Communication settings updated for ${clubName}.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card data-testid="card-global-channel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4" /> Global Channels</CardTitle>
          <CardDescription>Master toggles for communication channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email notifications for all enabled types</p>
              </div>
            </div>
            <Switch
              data-testid="switch-email-enabled"
              checked={effective.emailNotificationsEnabled}
              onCheckedChange={(v) => setField("emailNotificationsEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <div>
                <Label className="text-sm font-medium">Chat Notifications</Label>
                <p className="text-xs text-muted-foreground">In-app chat message notifications</p>
              </div>
            </div>
            <Switch
              data-testid="switch-chat-enabled"
              checked={effective.chatNotificationsEnabled}
              onCheckedChange={(v) => setField("chatNotificationsEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <div>
                <Label className="text-sm font-medium">In-App Message Notifications</Label>
                <p className="text-xs text-muted-foreground">Send in-app notifications for chat messages</p>
              </div>
            </div>
            <Switch
              data-testid="switch-message-enabled"
              checked={effective.messageNotificationsEnabled}
              onCheckedChange={(v) => setField("messageNotificationsEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-session-notifications">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Session Notifications</CardTitle>
          <CardDescription>Control session-related notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Session Availability Alerts</Label>
                <p className="text-xs text-muted-foreground">Notify players when spaces open up</p>
              </div>
            </div>
            <Switch
              data-testid="switch-session-availability"
              checked={effective.sessionAvailabilityEnabled}
              onCheckedChange={(v) => setField("sessionAvailabilityEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <Label className="text-sm font-medium">Session Reminders</Label>
                <p className="text-xs text-muted-foreground">Remind players before their session</p>
              </div>
            </div>
            <Switch
              data-testid="switch-session-reminder"
              checked={effective.sessionReminderEnabled}
              onCheckedChange={(v) => setField("sessionReminderEnabled", v)}
            />
          </div>
          {effective.sessionReminderEnabled && (
            <div className="ml-6 flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Remind</Label>
              <Input
                data-testid="input-reminder-hours"
                type="number"
                min={1}
                max={72}
                className="w-20 h-8"
                value={effective.sessionReminderHoursBefore}
                onChange={(e) => setField("sessionReminderHoursBefore", parseInt(e.target.value) || 24)}
              />
              <Label className="text-sm whitespace-nowrap">hours before</Label>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              <div>
                <Label className="text-sm font-medium">Payment Reminders</Label>
                <p className="text-xs text-muted-foreground">Remind players about unpaid sessions</p>
              </div>
            </div>
            <Switch
              data-testid="switch-payment-reminders"
              checked={effective.paymentRemindersEnabled}
              onCheckedChange={(v) => setField("paymentRemindersEnabled", v)}
            />
          </div>
          {effective.paymentRemindersEnabled && (
            <div className="ml-6 space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Days before session</Label>
                <Input
                  data-testid="input-payment-days-before"
                  type="number"
                  min={1}
                  max={7}
                  className="w-20 h-8"
                  value={effective.paymentReminderDaysBefore}
                  onChange={(e) => setField("paymentReminderDaysBefore", parseInt(e.target.value) || 2)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Daily reminders after session</Label>
                <Switch
                  data-testid="switch-payment-daily-after"
                  checked={effective.paymentReminderDailyAfter}
                  onCheckedChange={(v) => setField("paymentReminderDailyAfter", v)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-club-notifications">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Club Notifications</CardTitle>
          <CardDescription>Membership, referral, and announcement settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <div>
                <Label className="text-sm font-medium">Membership Reminders</Label>
                <p className="text-xs text-muted-foreground">Expiry warnings and renewal reminders</p>
              </div>
            </div>
            <Switch
              data-testid="switch-membership-reminders"
              checked={effective.membershipRemindersEnabled}
              onCheckedChange={(v) => setField("membershipRemindersEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" />
              <div>
                <Label className="text-sm font-medium">Referral Reminders</Label>
                <p className="text-xs text-muted-foreground">Notify when referral codes are expiring</p>
              </div>
            </div>
            <Switch
              data-testid="switch-referral-reminders"
              checked={effective.referralRemindersEnabled}
              onCheckedChange={(v) => setField("referralRemindersEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-500" />
              <div>
                <Label className="text-sm font-medium">Announcement Notifications</Label>
                <p className="text-xs text-muted-foreground">Notify members of new announcements</p>
              </div>
            </div>
            <Switch
              data-testid="switch-announcement-notifications"
              checked={effective.announcementNotificationsEnabled}
              onCheckedChange={(v) => setField("announcementNotificationsEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-indigo-500" />
              <div>
                <Label className="text-sm font-medium">Ticket Notifications</Label>
                <p className="text-xs text-muted-foreground">Notify about helpdesk ticket updates</p>
              </div>
            </div>
            <Switch
              data-testid="switch-ticket-notifications"
              checked={effective.ticketNotificationsEnabled}
              onCheckedChange={(v) => setField("ticketNotificationsEnabled", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div>
                <Label className="text-sm font-medium">Tournament Notifications</Label>
                <p className="text-xs text-muted-foreground">Tournament updates and payment reminders</p>
              </div>
            </div>
            <Switch
              data-testid="switch-tournament-notifications"
              checked={effective.tournamentNotificationsEnabled}
              onCheckedChange={(v) => setField("tournamentNotificationsEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          data-testid="button-save-settings"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
          className="min-w-[120px]"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
          {hasChanges ? "Save Changes" : "No Changes"}
        </Button>
      </div>
    </div>
  );
}

interface LogEntry {
  id: number;
  recipientUserId: number;
  recipientName: string | null;
  clubId: number | null;
  entityType: string;
  entityId: number;
  scheduleKey: string;
  channel: string;
  status: string;
  templateName: string;
  messageContent: string | null;
  errorMessage: string | null;
  sentAt: string;
}

function LogsSection({ clubId }: { clubId: number }) {
  const [page, setPage] = useState(0);
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const limit = 20;

  const { data, isLoading, isFetching } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ["/api/admin/notification-logs", clubId, page, channelFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("clubId", String(clubId));
      params.set("limit", String(limit));
      params.set("offset", String(page * limit));
      const res = await fetch(`/api/admin/notification-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.filter(log => {
      if (channelFilter !== "ALL" && log.channel !== channelFilter) return false;
      if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
      return true;
    });
  }, [data?.logs, channelFilter, statusFilter]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const channelBadge = (channel: string) => {
    switch (channel) {
      case "EMAIL": return <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs"><Mail className="h-3 w-3 mr-1" />Email</Badge>;
      case "IN_APP": return <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs"><Bell className="h-3 w-3 mr-1" />In-App</Badge>;
      case "CHAT": return <Badge variant="outline" className="text-green-600 border-green-300 text-xs"><MessageSquare className="h-3 w-3 mr-1" />Chat</Badge>;
      default: return <Badge variant="outline" className="text-xs">{channel}</Badge>;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "SENT": return <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case "FAILED": return <Badge className="bg-red-100 text-red-700 text-xs"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "SKIPPED": return <Badge className="bg-gray-100 text-gray-600 text-xs">Skipped</Badge>;
      default: return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger data-testid="select-channel-filter" className="w-[130px] h-8">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Channels</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="IN_APP">In-App</SelectItem>
              <SelectItem value="CHAT">Chat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-status-filter" className="w-[120px] h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="SKIPPED">Skipped</SelectItem>
          </SelectContent>
        </Select>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto text-sm text-muted-foreground">
          {data ? `${data.total} total notifications` : ""}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Send className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No notification logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="overflow-hidden" data-testid={`log-entry-${log.id}`}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{log.recipientName || `User #${log.recipientUserId}`}</span>
                    {channelBadge(log.channel)}
                    {statusBadge(log.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {log.templateName.replace(/_/g, " ")} — {formatDate(log.sentAt)}
                  </p>
                </div>
                {expandedLog === log.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {expandedLog === log.id && (
                <div className="px-3 pb-3 border-t">
                  <div className="pt-3 space-y-2 text-sm">
                    {log.messageContent && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Message</Label>
                        <p className="text-sm mt-0.5">{log.messageContent}</p>
                      </div>
                    )}
                    {log.errorMessage && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded-md">
                        <Label className="text-xs text-red-600">Error</Label>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{log.errorMessage}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                      <span>Type: {log.entityType}</span>
                      <span>Key: {log.scheduleKey}</span>
                      <span>Entity: #{log.entityId}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Communications() {
  const { data: user } = useUser();
  const { data: adminClubs, isLoading: clubsLoading } = useMyAdminClubs(!!user);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("settings");

  const clubs = adminClubs || [];
  const currentClubId = selectedClubId || (clubs.length > 0 ? clubs[0].id : null);
  const currentClub = clubs.find(c => c.id === currentClubId);

  if (clubsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Communications</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-30" />
            <p>No clubs available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Communications</h1>
          <p className="text-sm text-muted-foreground">Manage notification settings and view delivery logs</p>
        </div>
      </div>

      {clubs.length > 1 && (
        <div className="mb-6">
          <Label className="text-sm text-muted-foreground mb-1 block">Select Club</Label>
          <Select
            value={String(currentClubId)}
            onValueChange={(v) => setSelectedClubId(Number(v))}
          >
            <SelectTrigger data-testid="select-club" className="w-full max-w-xs">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map(club => (
                <SelectItem key={club.id} value={String(club.id)}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {currentClubId && currentClub && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="settings" data-testid="tab-settings" className="gap-1.5">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs" className="gap-1.5">
              <Send className="h-4 w-4" /> Delivery Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <SettingsSection clubId={currentClubId} clubName={currentClub.name} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsSection clubId={currentClubId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

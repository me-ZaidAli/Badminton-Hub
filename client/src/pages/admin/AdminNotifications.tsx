import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bell, CreditCard, Clock, Mail, MessageSquare, Settings, Send, AlertTriangle, CheckCircle, XCircle, Ticket, Gift, Users, Building2, Loader2, Coins } from "lucide-react";
import { Link } from "wouter";

function NotificationSettingsPanel({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/clubs", clubId, "notification-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/notification-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [paymentEnabled, setPaymentEnabled] = useState<boolean | null>(null);
  const [daysBefore, setDaysBefore] = useState("");
  const [dailyAfter, setDailyAfter] = useState<boolean | null>(null);
  const [membershipEnabled, setMembershipEnabled] = useState<boolean | null>(null);
  const [referralEnabled, setReferralEnabled] = useState<boolean | null>(null);
  const [ticketEnabled, setTicketEnabled] = useState<boolean | null>(null);
  const [messageEnabled, setMessageEnabled] = useState<boolean | null>(null);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

  const effectivePayment = paymentEnabled ?? settings?.paymentRemindersEnabled ?? true;
  const effectiveDaysBefore = daysBefore || String(settings?.paymentReminderDaysBefore ?? 2);
  const effectiveDailyAfter = dailyAfter ?? settings?.paymentReminderDailyAfter ?? true;
  const effectiveMembership = membershipEnabled ?? settings?.membershipRemindersEnabled ?? true;
  const effectiveReferral = referralEnabled ?? settings?.referralRemindersEnabled ?? true;
  const effectiveTicket = ticketEnabled ?? settings?.ticketNotificationsEnabled ?? true;
  const effectiveMessage = messageEnabled ?? settings?.messageNotificationsEnabled ?? true;
  const effectiveEmail = emailEnabled ?? settings?.emailNotificationsEnabled ?? true;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const days = parseInt(effectiveDaysBefore);
      if (isNaN(days) || days < 1 || days > 7) throw new Error("Days before must be between 1 and 7");
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/notification-settings`, {
        paymentRemindersEnabled: effectivePayment,
        paymentReminderDaysBefore: days,
        paymentReminderDailyAfter: effectiveDailyAfter,
        membershipRemindersEnabled: effectiveMembership,
        referralRemindersEnabled: effectiveReferral,
        ticketNotificationsEnabled: effectiveTicket,
        messageNotificationsEnabled: effectiveMessage,
        emailNotificationsEnabled: effectiveEmail,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "notification-settings"] });
      setPaymentEnabled(null);
      setDaysBefore("");
      setDailyAfter(null);
      setMembershipEnabled(null);
      setReferralEnabled(null);
      setTicketEnabled(null);
      setMessageEnabled(null);
      setEmailEnabled(null);
      toast({ title: "Saved", description: `Notification settings updated for ${clubName}.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid={`card-payment-settings-${clubId}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Enabled</Label>
              <Switch checked={effectivePayment} onCheckedChange={(v) => setPaymentEnabled(v)} data-testid={`switch-payment-${clubId}`} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Days before session to send first reminder</Label>
              <Input type="number" min={1} max={7} value={effectiveDaysBefore} onChange={(e) => setDaysBefore(e.target.value)} data-testid={`input-days-before-${clubId}`} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Send daily reminders after session until paid</Label>
              <Switch checked={effectiveDailyAfter} onCheckedChange={(v) => setDailyAfter(v)} data-testid={`switch-daily-after-${clubId}`} />
            </div>
          </CardContent>
        </Card>

        <Card data-testid={`card-membership-settings-${clubId}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Membership Expiry Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Enabled</Label>
              <Switch checked={effectiveMembership} onCheckedChange={(v) => setMembershipEnabled(v)} data-testid={`switch-membership-${clubId}`} />
            </div>
            <p className="text-xs text-muted-foreground">Sends reminders at: 7 days before, 3 days before, on the day, 5 days after, and 7 days after expiry.</p>
          </CardContent>
        </Card>

        <Card data-testid={`card-referral-settings-${clubId}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Gift className="h-4 w-4" /> Referral Expiry Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Enabled</Label>
              <Switch checked={effectiveReferral} onCheckedChange={(v) => setReferralEnabled(v)} data-testid={`switch-referral-${clubId}`} />
            </div>
            <p className="text-xs text-muted-foreground">Sends reminders 2 days before and on the day of referral code expiry.</p>
          </CardContent>
        </Card>

        <Card data-testid={`card-ticket-settings-${clubId}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Ticket className="h-4 w-4" /> Ticket & Message Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Ticket Reply Notifications</Label>
              <Switch checked={effectiveTicket} onCheckedChange={(v) => setTicketEnabled(v)} data-testid={`switch-ticket-${clubId}`} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Message Notifications</Label>
              <Switch checked={effectiveMessage} onCheckedChange={(v) => setMessageEnabled(v)} data-testid={`switch-message-${clubId}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid={`card-email-settings-${clubId}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" /> Email Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-sm">Send notifications via email</Label>
              <p className="text-xs text-muted-foreground mt-1">When enabled, automated reminders will also be sent via email in addition to in-app and chat notifications.</p>
            </div>
            <Switch checked={effectiveEmail} onCheckedChange={(v) => setEmailEnabled(v)} data-testid={`switch-email-${clubId}`} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid={`button-save-settings-${clubId}`}>
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>
    </div>
  );
}

function BankDetailsPanel({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: bankDetails, isLoading } = useQuery({
    queryKey: ["/api/clubs", clubId, "bank-details"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/bank-details`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reference, setReference] = useState("");

  const effectiveBankName = bankName || bankDetails?.bankName || "";
  const effectiveAccountName = accountName || bankDetails?.bankAccountName || "";
  const effectiveSortCode = sortCode || bankDetails?.bankSortCode || "";
  const effectiveAccountNumber = accountNumber || bankDetails?.bankAccountNumber || "";
  const effectiveReference = reference || bankDetails?.bankReference || "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/bank-details`, {
        bankName: effectiveBankName,
        bankAccountName: effectiveAccountName,
        bankSortCode: effectiveSortCode,
        bankAccountNumber: effectiveAccountNumber,
        bankReference: effectiveReference,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "bank-details"] });
      setBankName(""); setAccountName(""); setSortCode(""); setAccountNumber(""); setReference("");
      toast({ title: "Saved", description: `Bank details updated for ${clubName}.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card data-testid={`card-bank-details-${clubId}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Details for Payment Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">These details will be included in automated payment reminder messages sent to players.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Bank Name</Label>
            <Input value={effectiveBankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Barclays" data-testid={`input-bank-name-${clubId}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account Name</Label>
            <Input value={effectiveAccountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. ABC Sports Club" data-testid={`input-account-name-${clubId}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sort Code</Label>
            <Input value={effectiveSortCode} onChange={(e) => setSortCode(e.target.value)} placeholder="e.g. 20-30-40" data-testid={`input-sort-code-${clubId}`} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account Number</Label>
            <Input value={effectiveAccountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 12345678" data-testid={`input-account-number-${clubId}`} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Payment Reference</Label>
            <Input value={effectiveReference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Your name + session date" data-testid={`input-reference-${clubId}`} />
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid={`button-save-bank-${clubId}`}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Bank Details
        </Button>
      </CardContent>
    </Card>
  );
}

function DeliveryLogsPanel({ clubId }: { clubId: number | null }) {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/notification-logs", clubId, entityFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubId) params.set("clubId", String(clubId));
      if (entityFilter !== "all") params.set("entityType", entityFilter);
      params.set("limit", String(limit));
      params.set("offset", String(page * limit));
      const res = await fetch(`/api/admin/notification-logs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const channelBadge = (channel: string) => {
    switch (channel) {
      case "IN_APP": return <Badge variant="secondary" data-testid="badge-channel-inapp"><Bell className="h-3 w-3 mr-1" /> In-App</Badge>;
      case "CHAT": return <Badge variant="secondary" data-testid="badge-channel-chat"><MessageSquare className="h-3 w-3 mr-1" /> Chat</Badge>;
      case "EMAIL": return <Badge variant="secondary" data-testid="badge-channel-email"><Mail className="h-3 w-3 mr-1" /> Email</Badge>;
      default: return <Badge variant="secondary">{channel}</Badge>;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "SENT": return <Badge variant="default" data-testid="badge-status-sent"><CheckCircle className="h-3 w-3 mr-1" /> Sent</Badge>;
      case "FAILED": return <Badge variant="destructive" data-testid="badge-status-failed"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "SKIPPED": return <Badge variant="outline" data-testid="badge-status-skipped"><AlertTriangle className="h-3 w-3 mr-1" /> Skipped</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48" data-testid="select-entity-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="SESSION_SIGNUP">Payment Reminders</SelectItem>
            <SelectItem value="CLUB_MEMBERSHIP">Membership Reminders</SelectItem>
            <SelectItem value="REFERRAL">Referral Reminders</SelectItem>
            <SelectItem value="TICKET_REPLY">Ticket Notifications</SelectItem>
            <SelectItem value="INTERNAL_MESSAGE">Message Notifications</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{total} total logs</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No notification logs found. Automated reminders will appear here as they are sent.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <Card key={log.id} data-testid={`card-log-${log.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {channelBadge(log.channel)}
                      {statusBadge(log.status)}
                      <Badge variant="outline">{log.templateName.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-sm font-medium truncate">{log.recipientName || `User #${log.recipientUserId}`}</p>
                    {log.messageContent && <p className="text-xs text-muted-foreground line-clamp-2">{log.messageContent}</p>}
                    {log.errorMessage && <p className="text-xs text-destructive">{log.errorMessage}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatsPanel({ clubId }: { clubId: number | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/notification-stats", clubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubId) params.set("clubId", String(clubId));
      const res = await fetch(`/api/admin/notification-stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const totalSent = data?.totalSent || 0;
  const totalFailed = data?.totalFailed || 0;
  const byChannel = data?.byChannel || [];

  const channelSent = (channel: string) => byChannel.filter((s: any) => s.channel === channel && s.status === "SENT").reduce((sum: number, s: any) => sum + s.count, 0);
  const templateSent = (template: string) => byChannel.filter((s: any) => s.templateName.startsWith(template) && s.status === "SENT").reduce((sum: number, s: any) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="card-stat-total-sent">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Total Sent</div>
            <div className="text-xl font-bold text-foreground">{totalSent}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-total-failed">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="text-xl font-bold text-destructive">{totalFailed}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-inapp">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">In-App</div>
            <div className="text-xl font-bold text-foreground">{channelSent("IN_APP")}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-email">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Emails</div>
            <div className="text-xl font-bold text-foreground">{channelSent("EMAIL")}</div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-stats-by-type">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">By Notification Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { key: "PAYMENT_REMINDER", label: "Payment Reminders", icon: CreditCard },
              { key: "MEMBERSHIP_EXPIRY", label: "Membership Expiry", icon: Users },
              { key: "REFERRAL_EXPIRY", label: "Referral Expiry", icon: Gift },
              { key: "TICKET_REPLY", label: "Ticket Replies", icon: Ticket },
              { key: "NEW_MESSAGE", label: "Message Notifications", icon: MessageSquare },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                </div>
                <Badge variant="secondary">{templateSent(key)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditSettingsPanel({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/clubs", clubId, "credit-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/credit-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [cancelWindow, setCancelWindow] = useState("");

  const effectiveAutoApprove = autoApprove ?? settings?.creditAutoApprove ?? false;
  const effectiveCancelWindow = cancelWindow || String(settings?.creditAutoCancelWindowHours ?? "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const windowHours = effectiveCancelWindow ? parseInt(effectiveCancelWindow) : null;
      if (windowHours !== null && (isNaN(windowHours) || windowHours < 1 || windowHours > 168)) {
        throw new Error("Cancel window must be between 1 and 168 hours");
      }
      const res = await fetch(`/api/clubs/${clubId}/credit-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ creditAutoApprove: effectiveAutoApprove, creditAutoCancelWindowHours: windowHours }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "credit-settings"] });
      toast({ title: "Reward settings saved" });
      setAutoApprove(null);
      setCancelWindow("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6" /></div>;

  return (
    <Card data-testid="card-credit-settings">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Coins className="h-4 w-4" /> Credit Automation Settings — {clubName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Auto-Approve Credit Requests</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically approve credit claims when a member cancels within the allowed cancellation window
            </p>
          </div>
          <Switch
            data-testid="switch-auto-approve"
            checked={effectiveAutoApprove}
            onCheckedChange={(v) => setAutoApprove(v)}
          />
        </div>

        {effectiveAutoApprove && (
          <div className="space-y-2">
            <Label htmlFor="cancelWindow" className="text-sm">Cancellation Window (hours)</Label>
            <p className="text-xs text-muted-foreground">
              Members who cancel within this many hours before session start will automatically receive a credit refund. Leave empty to require manual approval for all.
            </p>
            <Input
              id="cancelWindow"
              data-testid="input-cancel-window"
              type="number"
              min={1}
              max={168}
              placeholder="e.g., 24"
              value={effectiveCancelWindow}
              onChange={(e) => setCancelWindow(e.target.value)}
              className="w-32"
            />
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">How it works:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>When enabled, reward claims from cancellations within the window are auto-approved</li>
            <li>Rewards are automatically added to the member's wallet</li>
            <li>A ticket is created for audit purposes with resolution "APPROVED"</li>
            <li>Members receive a notification with their updated reward balance</li>
            <li>All automated actions are logged in the ticket timeline</li>
          </ul>
        </div>

        <Button
          data-testid="button-save-credit-settings"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="sm"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Save Credit Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminNotifications() {
  const { data: user } = useUser();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const isOwner = user?.role === "OWNER";
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const clubs = myAdminClubs || [];
  const effectiveClubId = selectedClubId ? Number(selectedClubId) : (clubs.length > 0 ? clubs[0].id : null);
  const effectiveClubName = clubs.find((c: any) => c.id === effectiveClubId)?.name || "Club";

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">Configure automated reminders, bank details, and view delivery logs</p>
        </div>
        {clubs.length > 1 && (
          <Select value={selectedClubId || String(effectiveClubId)} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-56" data-testid="select-club-filter">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!effectiveClubId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No clubs found. You need admin access to a club to manage notification settings.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="settings">
          <TabsList data-testid="tabs-notifications">
            <TabsTrigger value="settings" data-testid="tab-settings"><Settings className="h-4 w-4 mr-1" /> Settings</TabsTrigger>
            <TabsTrigger value="bank" data-testid="tab-bank"><Building2 className="h-4 w-4 mr-1" /> Bank Details</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs"><Clock className="h-4 w-4 mr-1" /> Delivery Logs</TabsTrigger>
            <TabsTrigger value="stats" data-testid="tab-stats"><Send className="h-4 w-4 mr-1" /> Stats</TabsTrigger>
            <TabsTrigger value="credits" data-testid="tab-credits"><Coins className="h-4 w-4 mr-1" /> Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <NotificationSettingsPanel clubId={effectiveClubId} clubName={effectiveClubName} />
          </TabsContent>

          <TabsContent value="bank">
            <BankDetailsPanel clubId={effectiveClubId} clubName={effectiveClubName} />
          </TabsContent>

          <TabsContent value="logs">
            <DeliveryLogsPanel clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="stats">
            <StatsPanel clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="credits">
            <CreditSettingsPanel clubId={effectiveClubId} clubName={effectiveClubName} />
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Schedule Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium text-foreground mb-1">Session Payment Reminders</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>Configurable days before session (default: 2 days)</li>
                <li>On the day of the session</li>
                <li>Next day after the session</li>
                <li>Daily until payment is marked as complete (optional)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Membership Expiration</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>1 week before expiry</li>
                <li>3 days before expiry</li>
                <li>On the day of expiry</li>
                <li>5 days after expiry (if unpaid)</li>
                <li>7 days after expiry (membership cancelled notice)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Referral Code Expiration</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>2 days before expiry</li>
                <li>On the day of expiry</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Tickets & Messages</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>Instant notification when a ticket receives a reply</li>
                <li>Instant notification when a new message is received</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

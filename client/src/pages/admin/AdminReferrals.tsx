import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import {
  Gift, Check, X, Clock, UserPlus, TrendingUp, Settings,
  Loader2, AlertCircle, Building2, Save, BarChart3
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AdminReferral {
  id: number;
  code: string;
  referrerId: number;
  referrerName: string;
  referrerEmail: string;
  referredName: string | null;
  referredEmail: string | null;
  referredUserId: number | null;
  referredUserName: string | null;
  clubId: number | null;
  clubName: string | null;
  status: string;
  creditAwarded: number | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
}

interface ClubAnalytics {
  clubId: number;
  clubName: string;
  settings: {
    isActive: boolean;
    creditAmountPence: number;
    premiumThresholdPence: number;
    championThresholdPence: number;
    codeExpiryDays: number;
  };
  stats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    approvalRate: number;
    totalCreditsIssued: number;
  };
}

function getStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", className: "bg-green-500 text-white no-default-hover-elevate" };
    case "PENDING":
      return { label: "Pending", className: "bg-amber-500 text-white no-default-hover-elevate" };
    case "APPROVED":
      return { label: "Approved", className: "bg-blue-500 text-white no-default-hover-elevate" };
    case "REJECTED":
      return { label: "Rejected", className: "bg-red-500 text-white no-default-hover-elevate" };
    case "EXPIRED":
      return { label: "Expired", className: "no-default-hover-elevate" };
    case "USED":
      return { label: "Used", className: "no-default-hover-elevate" };
    default:
      return { label: status, className: "no-default-hover-elevate" };
  }
}

function ClubSettingsPanel({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/clubs", clubId, "referral-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/referral-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [premiumThreshold, setPremiumThreshold] = useState("");
  const [championThreshold, setChampionThreshold] = useState("");
  const [expiryDays, setExpiryDays] = useState("");

  const effectiveActive = isActive !== null ? isActive : settings?.isActive ?? true;
  const effectiveCredit = creditAmount || (settings ? String(settings.creditAmountPence / 100) : "4");
  const effectivePremium = premiumThreshold || (settings ? String(settings.premiumThresholdPence / 100) : "8");
  const effectiveChampion = championThreshold || (settings ? String(settings.championThresholdPence / 100) : "16");
  const effectiveExpiry = expiryDays || (settings ? String(settings.codeExpiryDays) : "30");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const credit = parseFloat(effectiveCredit);
      const premium = parseFloat(effectivePremium);
      const champion = parseFloat(effectiveChampion);
      const expiry = parseInt(effectiveExpiry);
      if (isNaN(credit) || credit < 0) throw new Error("Credit amount must be a valid positive number");
      if (isNaN(premium) || premium < 0) throw new Error("Premium threshold must be a valid positive number");
      if (isNaN(champion) || champion < 0) throw new Error("Champion threshold must be a valid positive number");
      if (isNaN(expiry) || expiry < 1 || expiry > 365) throw new Error("Expiry days must be between 1 and 365");
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/referral-settings`, {
        isActive: effectiveActive,
        creditAmountPence: Math.round(credit * 100),
        premiumThresholdPence: Math.round(premium * 100),
        championThresholdPence: Math.round(champion * 100),
        codeExpiryDays: expiry,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "referral-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      setCreditAmount("");
      setPremiumThreshold("");
      setChampionThreshold("");
      setExpiryDays("");
      setIsActive(null);
      toast({ title: "Settings Saved", description: `Referral settings updated for ${clubName}.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card data-testid={`card-settings-${clubId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Referral Program Settings
        </CardTitle>
        <CardDescription>Configure the referral program for {clubName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Program Active</Label>
            <p className="text-xs text-muted-foreground">Enable or disable the referral program</p>
          </div>
          <Switch
            checked={effectiveActive}
            onCheckedChange={(v) => setIsActive(v)}
            data-testid={`switch-active-${clubId}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Credit Per Referral</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="0.50"
                min="0"
                value={effectiveCredit}
                onChange={(e) => setCreditAmount(e.target.value)}
                data-testid={`input-credit-${clubId}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Code Expiry (days)</Label>
            <Input
              type="number"
              min="1"
              max="365"
              value={effectiveExpiry}
              onChange={(e) => setExpiryDays(e.target.value)}
              data-testid={`input-expiry-${clubId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Premium Threshold</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="1"
                min="0"
                value={effectivePremium}
                onChange={(e) => setPremiumThreshold(e.target.value)}
                data-testid={`input-premium-${clubId}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Champion Threshold</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="1"
                min="0"
                value={effectiveChampion}
                onChange={(e) => setChampionThreshold(e.target.value)}
                data-testid={`input-champion-${clubId}`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid={`button-save-settings-${clubId}`}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReferrals() {
  const { data: user } = useUser();
  const { data: myAdminClubs = [] } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [clubFilter, setClubFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<AdminReferral | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("referrals");

  const clubFilterParam = clubFilter !== "all" ? Number(clubFilter) : undefined;

  const { data: referrals = [], isLoading } = useQuery<AdminReferral[]>({
    queryKey: ["/api/admin/referrals", statusFilter, clubFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (clubFilterParam) params.append("clubId", String(clubFilterParam));
      const res = await fetch(`/api/admin/referrals?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<ClubAnalytics[]>({
    queryKey: ["/api/admin/referrals/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      toast({ title: "Referral Approved", description: "The referrer has been awarded credit." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve referral.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Referral Rejected", description: "The referral has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject referral.", variant: "destructive" });
    },
  });

  const pendingCount = referrals.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Referrals"
        description="Review referrals, manage club settings, and view analytics"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="referrals" className="flex items-center gap-1.5" data-testid="tab-referrals">
            <Gift className="h-3.5 w-3.5" />
            Referrals
            {pendingCount > 0 && <Badge className="bg-amber-500 text-white no-default-hover-elevate ml-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5" data-testid="tab-analytics">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5" data-testid="tab-settings">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-referral-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
            {myAdminClubs.length > 1 && (
              <Select value={clubFilter} onValueChange={setClubFilter}>
                <SelectTrigger className="w-48" data-testid="select-referral-club-filter">
                  <SelectValue placeholder="Filter by club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {myAdminClubs.map((club: any) => (
                    <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {statusFilter === "PENDING" && pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white no-default-hover-elevate">{pendingCount} pending</Badge>
            )}
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No referrals found</p>
                <p className="text-sm mt-1">No referrals matching the selected filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => {
                const statusConfig = getStatusConfig(ref.status);
                return (
                  <Card key={ref.id} data-testid={`admin-referral-${ref.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono font-bold text-sm">{ref.code}</code>
                            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                            {ref.creditAwarded && ref.creditAwarded > 0 && (
                              <Badge variant="secondary" className="no-default-hover-elevate">+{"\u00A3"}{(ref.creditAwarded / 100).toFixed(2)}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Referrer:</span>
                              <span className="font-medium truncate">{ref.referrerName}</span>
                            </div>
                            {ref.referredName || ref.referredUserName ? (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Referred:</span>
                                <span className="font-medium truncate">{ref.referredUserName || ref.referredName}</span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs">Not yet used</div>
                            )}
                          </div>
                          {ref.clubName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {ref.clubName}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>Created {format(new Date(ref.createdAt), "dd MMM yyyy")}</span>
                            {ref.usedAt && (
                              <span>Used {formatDistanceToNow(new Date(ref.usedAt), { addSuffix: true })}</span>
                            )}
                          </div>
                          {ref.rejectionReason && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              Reason: {ref.rejectionReason}
                            </div>
                          )}
                        </div>
                        {ref.status === "PENDING" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(ref.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-referral-${ref.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectDialog(ref);
                                setRejectReason("");
                              }}
                              data-testid={`button-reject-referral-${ref.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : analytics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No analytics data</p>
                <p className="text-sm mt-1">Referral analytics will appear once clubs have referrals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {analytics.map((a) => (
                <Card key={a.clubId} data-testid={`analytics-club-${a.clubId}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {a.clubName}
                      {!a.settings.isActive && (
                        <Badge variant="secondary" className="no-default-hover-elevate">Program Paused</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {"\u00A3"}{(a.settings.creditAmountPence / 100).toFixed(2)} per referral | {a.settings.codeExpiryDays} day expiry
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-bold">{a.stats.total}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-lg font-bold text-green-600">{a.stats.approved}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Pending</div>
                        <div className="text-lg font-bold text-amber-500">{a.stats.pending}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <div className="text-lg font-bold text-red-500">{a.stats.rejected}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Approval Rate</div>
                        <div className="text-lg font-bold">{a.stats.approvalRate}%</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Credits Issued</div>
                        <div className="text-lg font-bold">{"\u00A3"}{(a.stats.totalCreditsIssued / 100).toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {myAdminClubs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No clubs to manage</p>
              </CardContent>
            </Card>
          ) : (
            myAdminClubs.map((club: any) => (
              <ClubSettingsPanel key={club.id} clubId={club.id} clubName={club.name} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Referral</DialogTitle>
            <DialogDescription>
              Rejecting referral code <code className="font-mono">{rejectDialog?.code}</code> from {rejectDialog?.referrerName}
              {rejectDialog?.clubName && <> for {rejectDialog.clubName}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-reject-cancel">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDialog) {
                  rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-confirm"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
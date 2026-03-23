import { useState, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClubs } from "@/hooks/use-clubs";
import {
  Gift, Copy, Check, Clock, UserPlus, TrendingUp, Award,
  Loader2, Share2, Link2, Plus, ChevronRight, Star, Building2
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

interface ReferralData {
  id: number;
  code: string;
  referredName: string | null;
  referredEmail: string | null;
  referredUserId: number | null;
  clubId: number | null;
  status: string;
  creditAwarded: number | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  clubName: string | null;
}

interface ClubSettings {
  creditAmountPence: number;
  premiumThresholdPence: number;
  championThresholdPence: number;
  codeExpiryDays: number;
  isActive: boolean;
}

interface PerClubStats {
  clubId: number;
  clubName: string;
  totalReferrals: number;
  approvedReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  premiumEligible: boolean;
  milestoneReached: boolean;
  settings: ClubSettings;
}

interface ReferralStats {
  totalReferrals: number;
  approvedReferrals: number;
  pendingReferrals: number;
  totalCreditsEarned: number;
  premiumEligible: boolean;
  milestoneReached: boolean;
}

interface ReferralResponse {
  referrals: ReferralData[];
  stats: ReferralStats;
  perClubStats: PerClubStats[];
}

function getStatusConfig(status: string, expiresAt: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", variant: "default" as const, className: "bg-green-500 text-white no-default-hover-elevate" };
    case "PENDING":
      return { label: "Pending Approval", variant: "default" as const, className: "bg-amber-500 text-white no-default-hover-elevate" };
    case "APPROVED":
      return { label: "Approved", variant: "default" as const, className: "bg-blue-500 text-white no-default-hover-elevate" };
    case "REJECTED":
      return { label: "Rejected", variant: "destructive" as const, className: "no-default-hover-elevate" };
    case "EXPIRED":
      return { label: "Expired", variant: "secondary" as const, className: "no-default-hover-elevate" };
    case "USED":
      return { label: "Used", variant: "secondary" as const, className: "no-default-hover-elevate" };
    default:
      return { label: status, variant: "secondary" as const, className: "no-default-hover-elevate" };
  }
}

function ClubReferralSection({ clubStats, referrals: clubReferrals, onCopyCode, onCopyLink, copiedCode, copiedLink }: {
  clubStats: PerClubStats;
  referrals: ReferralData[];
  onCopyCode: (code: string) => void;
  onCopyLink: (code: string) => void;
  copiedCode: string | null;
  copiedLink: string | null;
}) {
  const [premiumInfoOpen, setPremiumInfoOpen] = useState(false);
  const [championInfoOpen, setChampionInfoOpen] = useState(false);
  const settings = clubStats.settings;
  const creditDisplay = `\u00A3${(settings.creditAmountPence / 100).toFixed(2)}`;
  const creditsEarnedDisplay = `\u00A3${(clubStats.totalCreditsEarned / 100).toFixed(2)}`;
  const premiumProgress = Math.min((clubStats.approvedReferrals / 2) * 100, 100);
  const championProgress = Math.min((clubStats.approvedReferrals / 4) * 100, 100);

  const activeRefs = clubReferrals.filter(r => r.status === "ACTIVE");
  const pendingRefs = clubReferrals.filter(r => r.status === "PENDING");
  const completedRefs = clubReferrals.filter(r => r.status === "APPROVED" || r.status === "REJECTED");
  const expiredRefs = clubReferrals.filter(r => r.status === "EXPIRED");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid={`card-stat-total-${clubStats.clubId}`}>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-bold">{clubStats.totalReferrals}</div>
          </CardContent>
        </Card>
        <Card data-testid={`card-stat-approved-${clubStats.clubId}`}>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Approved</div>
            <div className="text-xl font-bold text-green-600">{clubStats.approvedReferrals}</div>
          </CardContent>
        </Card>
        <Card data-testid={`card-stat-pending-${clubStats.clubId}`}>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-xl font-bold text-amber-500">{clubStats.pendingReferrals}</div>
          </CardContent>
        </Card>
        <Card data-testid={`card-stat-credits-${clubStats.clubId}`}>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Earned</div>
            <div className="text-xl font-bold">{creditsEarnedDisplay}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={() => setPremiumInfoOpen(true)} data-testid={`card-milestone-premium-${clubStats.clubId}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">Premium Rate</span>
              </div>
              {clubStats.premiumEligible ? (
                <Badge className="bg-green-500 text-white no-default-hover-elevate">Unlocked</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{2 - clubStats.approvedReferrals} more referral{2 - clubStats.approvedReferrals !== 1 ? "s" : ""} to go</span>
              )}
            </div>
            <Progress value={premiumProgress} className="h-2" data-testid={`progress-premium-${clubStats.clubId}`} />
            <p className="text-xs text-muted-foreground">
              Get 2 approved referrals to unlock Premium rate for 2 months
            </p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setChampionInfoOpen(true)} data-testid={`card-milestone-champion-${clubStats.clubId}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-sm">Champion</span>
              </div>
              {clubStats.milestoneReached ? (
                <Badge className="bg-purple-500 text-white no-default-hover-elevate">Achieved</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{Math.max(4 - clubStats.approvedReferrals, 0)} more referral{Math.max(4 - clubStats.approvedReferrals, 0) !== 1 ? "s" : ""} to go</span>
              )}
            </div>
            <Progress value={championProgress} className="h-2" data-testid={`progress-champion-${clubStats.clubId}`} />
            <p className="text-xs text-muted-foreground">
              Get 4 approved referrals to earn 1 free session reward
            </p>
          </CardContent>
        </Card>
      </div>

      {activeRefs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-500" />
              Active Codes ({activeRefs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeRefs.map((ref) => {
                const daysLeft = differenceInDays(new Date(ref.expiresAt), new Date());
                const statusConfig = getStatusConfig(ref.status, ref.expiresAt);
                return (
                  <div key={ref.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border border-border/50 bg-muted/20" data-testid={`referral-active-${ref.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono font-bold text-sm" data-testid={`text-referral-code-${ref.id}`}>{ref.code}</code>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                      </div>
                      {ref.referredName && <p className="text-sm text-muted-foreground">For: {ref.referredName}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</span> : <span className="text-red-500">Expires today</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => onCopyCode(ref.code)} data-testid={`button-copy-code-${ref.id}`}>
                        {copiedCode === ref.code ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        Code
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onCopyLink(ref.code)} data-testid={`button-copy-link-${ref.id}`}>
                        {copiedLink === ref.code ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                        Link
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingRefs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending ({pendingRefs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRefs.map((ref) => {
                const statusConfig = getStatusConfig(ref.status, ref.expiresAt);
                return (
                  <div key={ref.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border border-border/50 bg-amber-500/5" data-testid={`referral-pending-${ref.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono font-bold text-sm">{ref.code}</code>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                      </div>
                      {ref.referredName && <p className="text-sm">Referred: <span className="font-medium">{ref.referredName}</span></p>}
                      {ref.usedAt && <p className="text-xs text-muted-foreground">Submitted {formatDistanceToNow(new Date(ref.usedAt), { addSuffix: true })}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedRefs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              History ({completedRefs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedRefs.map((ref) => {
                const statusConfig = getStatusConfig(ref.status, ref.expiresAt);
                return (
                  <div key={ref.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border border-border/50" data-testid={`referral-completed-${ref.id}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm">{ref.code}</code>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        {ref.creditAwarded && ref.creditAwarded > 0 && (
                          <Badge variant="secondary" className="no-default-hover-elevate">+{"\u00A3"}{(ref.creditAwarded / 100).toFixed(2)}</Badge>
                        )}
                      </div>
                      {ref.referredName && <p className="text-sm text-muted-foreground">{ref.referredName}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(ref.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {expiredRefs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Expired ({expiredRefs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiredRefs.map((ref) => (
                <div key={ref.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/30 opacity-60" data-testid={`referral-expired-${ref.id}`}>
                  <code className="font-mono text-sm">{ref.code}</code>
                  <Badge variant="secondary" className="no-default-hover-elevate">Expired</Badge>
                  {ref.referredName && <span className="text-xs text-muted-foreground">{ref.referredName}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(ref.expiresAt), "dd MMM yyyy")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={premiumInfoOpen} onOpenChange={setPremiumInfoOpen}>
        <DialogContent className="bg-background max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Premium Rate Eligibility - {clubStats.clubName}
            </DialogTitle>
            <DialogDescription>How to unlock the Premium membership rate through referrals at this club</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Your Progress</span>
                {clubStats.premiumEligible ? (
                  <Badge className="bg-green-500 text-white no-default-hover-elevate">Unlocked</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">{clubStats.approvedReferrals} / 2 referrals</span>
                )}
              </div>
              <Progress value={premiumProgress} className="h-3" />
            </div>
            <div className="p-4 rounded-md bg-muted/50 space-y-3">
              <h4 className="font-semibold text-sm">How Referrals Work at {clubStats.clubName}</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generate a Code</p>
                    <p className="text-xs text-muted-foreground">Create a unique referral code that expires after {settings.codeExpiryDays} days. Each code is single-use.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Share with a Friend</p>
                    <p className="text-xs text-muted-foreground">Send your code or link to a friend. They enter it when creating their account.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Admin Approval</p>
                    <p className="text-xs text-muted-foreground">Once your friend signs up, the referral goes to a {clubStats.clubName} admin for review.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Earn {creditDisplay} Reward</p>
                    <p className="text-xs text-muted-foreground">When approved, {creditDisplay} is added to your reward balance for {clubStats.clubName}.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-md bg-amber-500/10 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Premium Milestone (2 Referrals)
              </h4>
              <p className="text-sm text-muted-foreground">
                Get 2 approved referrals to unlock the Premium membership rate at {clubStats.clubName} for 2 months. After 2 months, you can revert to the standard rate or upgrade to a 1-year Premium membership.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={championInfoOpen} onOpenChange={setChampionInfoOpen}>
        <DialogContent className="bg-background max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              Referral Champion - {clubStats.clubName}
            </DialogTitle>
            <DialogDescription>The ultimate referral achievement at this club</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Your Progress</span>
                {clubStats.milestoneReached ? (
                  <Badge className="bg-purple-500 text-white no-default-hover-elevate">Achieved</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">{clubStats.approvedReferrals} / 4 referrals</span>
                )}
              </div>
              <Progress value={championProgress} className="h-3" />
            </div>
            <div className="p-4 rounded-md bg-muted/50 space-y-3">
              <h4 className="font-semibold text-sm">What is Referral Champion?</h4>
              <p className="text-sm text-muted-foreground">
                Referral Champion is the highest referral status at {clubStats.clubName}. It's awarded when you get 4 approved referrals. You'll earn 1 free session reward added directly to your account.
              </p>
            </div>
            <div className="p-4 rounded-md bg-purple-500/10 space-y-3">
              <h4 className="font-semibold text-sm">Milestones at a Glance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${clubStats.approvedReferrals >= 1 ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <span>1st Referral</span>
                  </div>
                  <span className="text-muted-foreground">{creditDisplay} reward</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${clubStats.premiumEligible ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                    <span>Premium Rate</span>
                  </div>
                  <span className="text-muted-foreground">2 referrals (2 months)</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${clubStats.milestoneReached ? 'bg-purple-500' : 'bg-muted-foreground/30'}`} />
                    <span className="font-medium">Champion</span>
                  </div>
                  <span className="text-muted-foreground">4 referrals (1 free session)</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Referrals() {
  const { data: user } = useUser();
  const { data: clubs = [] } = useClubs();
  const { toast } = useToast();
  const [generateDialog, setGenerateDialog] = useState(false);
  const [referredName, setReferredName] = useState("");
  const [referredEmail, setReferredEmail] = useState("");
  const [friendLevel, setFriendLevel] = useState("");
  const [friendExperience, setFriendExperience] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ReferralResponse>({
    queryKey: ["/api/my-referrals"],
    enabled: !!user,
  });

  const referrals = data?.referrals || [];
  const stats = data?.stats || { totalReferrals: 0, approvedReferrals: 0, pendingReferrals: 0, totalCreditsEarned: 0, premiumEligible: false, milestoneReached: false };
  const perClubStats = data?.perClubStats || [];

  const generateMutation = useMutation({
    mutationFn: async (data: { referredName: string; referredEmail: string; friendLevel: string; friendExperience: string; clubId: number }) => {
      const res = await apiRequest("POST", "/api/referrals/generate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-referrals"] });
      setGenerateDialog(false);
      setReferredName("");
      setReferredEmail("");
      setFriendLevel("");
      setFriendExperience("");
      setSelectedClubId("");
      toast({ title: "Referral Code Generated", description: "Your new referral code is ready to share." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate code.", variant: "destructive" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied!", description: "Referral code copied to clipboard." });
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/register?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
    toast({ title: "Link Copied!", description: "Referral link copied to clipboard." });
  };

  const selectedTab = perClubStats.length > 0 ? String(perClubStats[0].clubId) : "overview";

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Refer & Earn"
        description="Invite friends to join your club and earn rewards for every successful referral"
        action={
          <Button onClick={() => setGenerateDialog(true)} data-testid="button-generate-referral">
            <Plus className="h-4 w-4 mr-1" />
            New Referral Code
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Total Referrals</div>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            </div>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card data-testid="card-stat-approved">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Approved</div>
              <div className="text-2xl font-bold text-green-600">{stats.approvedReferrals}</div>
            </div>
            <Check className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold text-amber-500">{stats.pendingReferrals}</div>
            </div>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
        <Card data-testid="card-stat-credits">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Total Rewards</div>
              <div className="text-2xl font-bold">{"\u00A3"}{(stats.totalCreditsEarned / 100).toFixed(2)}</div>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {perClubStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No referrals yet</p>
            <p className="text-sm mt-1">Generate a code for one of your clubs to get started</p>
          </CardContent>
        </Card>
      ) : perClubStats.length === 1 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{perClubStats[0].clubName}</h2>
          </div>
          <ClubReferralSection
            clubStats={perClubStats[0]}
            referrals={referrals.filter(r => r.clubId === perClubStats[0].clubId)}
            onCopyCode={copyCode}
            onCopyLink={copyLink}
            copiedCode={copiedCode}
            copiedLink={copiedLink}
          />
        </div>
      ) : (
        <Tabs defaultValue={selectedTab} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            {perClubStats.map((cs) => (
              <TabsTrigger key={cs.clubId} value={String(cs.clubId)} className="flex items-center gap-1.5" data-testid={`tab-club-${cs.clubId}`}>
                <Building2 className="h-3.5 w-3.5" />
                {cs.clubName}
                {cs.pendingReferrals > 0 && (
                  <Badge variant="secondary" className="no-default-hover-elevate ml-1 text-xs">{cs.pendingReferrals}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {perClubStats.map((cs) => (
            <TabsContent key={cs.clubId} value={String(cs.clubId)}>
              <ClubReferralSection
                clubStats={cs}
                referrals={referrals.filter(r => r.clubId === cs.clubId)}
                onCopyCode={copyCode}
                onCopyLink={copyLink}
                copiedCode={copiedCode}
                copiedLink={copiedLink}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Generate Referral Code
            </DialogTitle>
            <DialogDescription>
              Select a club to generate a referral code for
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger data-testid="select-referral-club">
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club: any) => (
                    <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Each code is linked to a specific club's referral program</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referred-name">Friend's Name <span className="text-destructive">*</span></Label>
              <Input
                id="referred-name"
                placeholder="e.g. John Smith"
                value={referredName}
                onChange={(e) => setReferredName(e.target.value)}
                data-testid="input-referred-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referred-email">Friend's Email <span className="text-destructive">*</span></Label>
              <Input
                id="referred-email"
                type="email"
                placeholder="e.g. john@example.com"
                value={referredEmail}
                onChange={(e) => setReferredEmail(e.target.value)}
                data-testid="input-referred-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Friend's Playing Level <span className="text-destructive">*</span></Label>
              <Select value={friendLevel} onValueChange={setFriendLevel}>
                <SelectTrigger data-testid="select-friend-level">
                  <SelectValue placeholder="Select their level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>How Long Have They Been Playing? <span className="text-destructive">*</span></Label>
              <Select value={friendExperience} onValueChange={setFriendExperience}>
                <SelectTrigger data-testid="select-friend-experience">
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Less than 6 months">Less than 6 months</SelectItem>
                  <SelectItem value="6 months - 1 year">6 months - 1 year</SelectItem>
                  <SelectItem value="1 - 2 years">1 - 2 years</SelectItem>
                  <SelectItem value="2 - 5 years">2 - 5 years</SelectItem>
                  <SelectItem value="5+ years">5+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-md bg-muted/50 space-y-1">
              <p className="text-sm font-medium">How it works</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Select a club and share the generated code or link</li>
                <li>2. Your friend enters the code when signing up</li>
                <li>3. A club admin approves the referral</li>
                <li>4. You receive a reward in your account for that club</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)} data-testid="button-generate-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedClubId) {
                  toast({ title: "Club Required", description: "Please select a club for the referral code.", variant: "destructive" });
                  return;
                }
                if (!referredName.trim()) {
                  toast({ title: "Name Required", description: "Please enter your friend's name.", variant: "destructive" });
                  return;
                }
                if (!referredEmail.trim()) {
                  toast({ title: "Email Required", description: "Please enter your friend's email address.", variant: "destructive" });
                  return;
                }
                if (!friendLevel) {
                  toast({ title: "Level Required", description: "Please select your friend's playing level.", variant: "destructive" });
                  return;
                }
                if (!friendExperience) {
                  toast({ title: "Experience Required", description: "Please select how long your friend has been playing.", variant: "destructive" });
                  return;
                }
                generateMutation.mutate({
                  referredName: referredName.trim(),
                  referredEmail: referredEmail.trim(),
                  friendLevel,
                  friendExperience,
                  clubId: Number(selectedClubId),
                });
              }}
              disabled={generateMutation.isPending || !selectedClubId || !referredName.trim() || !referredEmail.trim() || !friendLevel || !friendExperience}
              data-testid="button-generate-confirm"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Generate Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
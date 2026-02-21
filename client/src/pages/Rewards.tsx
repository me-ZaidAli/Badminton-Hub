import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Gift, Star, Trophy, Zap, Award, ChevronRight, Info, Users, PoundSterling, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function CircularProgress({ percentage, size = 220, strokeWidth = 14, children }: { percentage: number; size?: number; strokeWidth?: number; children?: React.ReactNode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const tickCount = 48;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {Array.from({ length: tickCount }).map((_, i) => {
          const angle = (i / tickCount) * 360;
          const tickFilled = i / tickCount <= percentage / 100;
          const innerR = radius - 8;
          const outerR = radius - 2;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={size / 2 + innerR * Math.cos(rad)}
              y1={size / 2 + innerR * Math.sin(rad)}
              x2={size / 2 + outerR * Math.cos(rad)}
              y2={size / 2 + outerR * Math.sin(rad)}
              stroke={tickFilled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, hint, onClick }: { icon: any; label: string; value: string; hint?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 py-3.5 border-b border-border/30 last:border-0 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="p-1.5 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-bold">{value}</span>
      {hint && (
        <div className="p-0.5 rounded-full border border-border/50">
          <Info className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default function Rewards() {
  const { data: rewardsSummary } = useQuery<any>({ queryKey: ["/api/my-rewards/summary"] });
  const { data: rewards } = useQuery<any[]>({ queryKey: ["/api/my-rewards"] });
  const { data: referralData } = useQuery<any>({ queryKey: ["/api/my-referrals"] });
  const { data: anniversaryData } = useQuery<any[]>({ queryKey: ["/api/my-anniversary-info"] });
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const requestMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      await apiRequest("POST", `/api/rewards/${rewardId}/request`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards/summary"] });
      toast({ title: "Reward Requested", description: "Your reward request has been submitted for admin approval." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const stats = referralData?.stats;
  const approvedReferrals = stats?.approvedReferrals || 0;
  const nextMilestone = approvedReferrals < 2 ? 2 : approvedReferrals < 4 ? 4 : 4;
  const milestoneLabel = approvedReferrals < 2 ? "Premium Rate" : approvedReferrals < 4 ? "Champion" : "Champion";
  const progressPct = approvedReferrals >= 4 ? 100 : (approvedReferrals / nextMilestone) * 100;

  const totalAvailableCredits = rewardsSummary?.totalCredits || 0;
  const totalFreeSessions = rewardsSummary?.totalFreeSessions || 0;
  const totalGifts = rewardsSummary?.totalGifts || 0;
  const totalRewards = rewardsSummary?.totalRewards || 0;

  const availableRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "AVAILABLE"), [rewards]);
  const requestedRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "REQUESTED"), [rewards]);
  const usedRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "USED"), [rewards]);

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-emerald-500 text-white",
    REQUESTED: "bg-amber-500 text-white",
    USED: "bg-muted text-muted-foreground",
  };

  const typeLabels: Record<string, string> = {
    REFERRAL: "Referral",
    SESSION_ATTENDANCE: "Attendance",
    GIFT: "Gift",
    MANUAL: "Manual",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-rewards-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">My Rewards</h1>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          <div className="relative flex flex-col items-center">
            <CircularProgress percentage={progressPct} size={200} strokeWidth={10}>
              <p className="text-4xl font-black text-white">{approvedReferrals}</p>
              <Badge className="mt-1 bg-primary text-primary-foreground text-xs px-2">
                <Zap className="h-3 w-3 mr-1" />
                {approvedReferrals >= 4 ? "Champion" : approvedReferrals >= 2 ? "Premium" : "Active"}
              </Badge>
              <p className="text-xs text-slate-400 mt-1.5">
                {approvedReferrals >= 4 ? "All milestones reached!" : `${nextMilestone - approvedReferrals} more for ${milestoneLabel}`}
              </p>
            </CircularProgress>
          </div>

          <div className="relative mt-5 rounded-xl bg-slate-800/60 dark:bg-slate-800/40 border border-slate-700/50">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full bg-slate-700/40 rounded-t-xl rounded-b-none border-b border-slate-700/50 h-10">
                <TabsTrigger value="overview" className="flex-1 text-xs text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white">Overview</TabsTrigger>
                <TabsTrigger value="milestones" className="flex-1 text-xs text-slate-300 data-[state=active]:bg-slate-600/50 data-[state=active]:text-white">Milestones</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="px-4 pb-3 mt-0">
                <InfoRow icon={Gift} label="Available credits" value={`£${(totalAvailableCredits / 100).toFixed(2)}`} hint="info" />
                <InfoRow icon={CalendarDays} label="Free sessions" value={`${totalFreeSessions}`} hint="info" />
                <InfoRow icon={Users} label="Total referrals" value={`${stats?.totalReferrals || 0}`} hint="info" />
                <InfoRow icon={Star} label="Pending referrals" value={`${stats?.pendingReferrals || 0}`} />
              </TabsContent>
              <TabsContent value="milestones" className="px-4 pb-3 mt-0">
                <div className="py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 1 ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">1st Referral</p>
                      <p className="text-xs text-slate-400">Credit reward per referral</p>
                    </div>
                    {approvedReferrals >= 1 && <Badge className="bg-emerald-500 text-white text-[10px]">Earned</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 2 ? 'bg-amber-500' : 'bg-slate-600'}`}>
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">2 Referrals</p>
                      <p className="text-xs text-slate-400">Premium rate for 2 months</p>
                    </div>
                    {approvedReferrals >= 2 ? (
                      <Badge className="bg-amber-500 text-white text-[10px]">Unlocked</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">{approvedReferrals}/2</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 4 ? 'bg-purple-500' : 'bg-slate-600'}`}>
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">4 Referrals</p>
                      <p className="text-xs text-slate-400">1 free session credit</p>
                    </div>
                    {approvedReferrals >= 4 ? (
                      <Badge className="bg-purple-500 text-white text-[10px]">Champion</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">{approvedReferrals}/4</span>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {anniversaryData && anniversaryData.length > 0 && (
          <Card data-testid="card-rewards-anniversary">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold">Anniversary Countdown</span>
              </div>
              <style>{`
                @keyframes rewardShake {
                  0%, 100% { transform: rotate(0deg); }
                  10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
                  20%, 40%, 60%, 80% { transform: rotate(8deg); }
                }
              `}</style>
              {anniversaryData.map((info: any) => {
                const now = Date.now();
                const target = new Date(info.nextAnniversary).getTime();
                const diff = target - now;
                const isCelebration = info.progress >= 0.99 || diff <= 0;
                let countdownText = "";
                if (!isCelebration && diff > 0) {
                  const totalHours = Math.floor(diff / 3600000);
                  const totalDays = Math.floor(totalHours / 24);
                  const months = Math.floor(totalDays / 30);
                  const days = totalDays - months * 30;
                  const hours = totalHours % 24;
                  const parts: string[] = [];
                  if (months > 0) parts.push(`${months}mo`);
                  if (days > 0) parts.push(`${days}d`);
                  parts.push(`${hours}h`);
                  countdownText = parts.join(" ");
                }
                return (
                  <div key={info.clubId} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30">
                    <div className="p-1.5 rounded-md bg-amber-500/10">
                      <Gift className="h-4 w-4 text-amber-500" style={!isCelebration ? { animation: "rewardShake 1.5s ease-in-out infinite" } : undefined} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{info.clubName}</p>
                      <p className="text-sm font-medium">
                        {isCelebration
                          ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                          : countdownText
                        }
                      </p>
                    </div>
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.min(info.progress * 100, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {totalRewards > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold px-1">Your Rewards ({totalRewards})</h2>

            {availableRewards.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Available</p>
                {availableRewards.map((reward: any) => (
                  <Card key={reward.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedReward(reward)} data-testid={`reward-available-${reward.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Gift className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType]}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {reward.credits > 0 && <span>£{(reward.credits / 100).toFixed(2)}</span>}
                          {reward.freeSessions > 0 && <span>{reward.freeSessions} session{reward.freeSessions > 1 ? "s" : ""}</span>}
                          {reward.gifts && <span>{reward.gifts}</span>}
                          {reward.clubName && <span>· {reward.clubName}</span>}
                        </div>
                      </div>
                      <Badge className={`${statusColors.AVAILABLE} text-[10px] no-default-hover-elevate`}>Available</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {requestedRewards.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Pending Approval</p>
                {requestedRewards.map((reward: any) => (
                  <Card key={reward.id} className="opacity-80" data-testid={`reward-requested-${reward.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Gift className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{reward.clubName}</p>
                      </div>
                      <Badge className={`${statusColors.REQUESTED} text-[10px] no-default-hover-elevate`}>Requested</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {usedRewards.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Redeemed</p>
                {usedRewards.map((reward: any) => (
                  <Card key={reward.id} className="opacity-60" data-testid={`reward-used-${reward.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{reward.clubName}</p>
                      </div>
                      <Badge className={`${statusColors.USED} text-[10px] no-default-hover-elevate`}>Used</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {totalRewards === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Gift className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No rewards yet. Refer friends and attend sessions to start earning!</p>
              <Link href="/referrals">
                <Button size="sm" data-testid="button-start-referring">Start Referring</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedReward} onOpenChange={(open) => !open && setSelectedReward(null)}>
          <DialogContent className="bg-background max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-500" />
                Reward Details
              </DialogTitle>
              <DialogDescription>View and redeem your reward</DialogDescription>
            </DialogHeader>
            {selectedReward && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <p className="font-medium">{selectedReward.description || typeLabels[selectedReward.rewardType]}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedReward.credits > 0 && <p>Credit: £{(selectedReward.credits / 100).toFixed(2)}</p>}
                    {selectedReward.freeSessions > 0 && <p>Free sessions: {selectedReward.freeSessions}</p>}
                    {selectedReward.gifts && <p>Gift: {selectedReward.gifts}</p>}
                    {selectedReward.clubName && <p>Club: {selectedReward.clubName}</p>}
                  </div>
                </div>
                {selectedReward.status === "AVAILABLE" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      requestMutation.mutate(selectedReward.id);
                      setSelectedReward(null);
                    }}
                    disabled={requestMutation.isPending}
                    data-testid="button-redeem-reward"
                  >
                    Request Redemption
                  </Button>
                )}
                {selectedReward.status === "REQUESTED" && (
                  <p className="text-center text-sm text-amber-600 font-medium">Awaiting admin approval</p>
                )}
                {selectedReward.status === "USED" && (
                  <p className="text-center text-sm text-muted-foreground">This reward has been redeemed</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

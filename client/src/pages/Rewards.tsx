import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Gift, Star, Trophy, Zap, Award, ChevronRight, Info, Users, PoundSterling, CalendarDays, Target, TrendingUp, Clock } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function CircularProgress({ percentage, size = 220, strokeWidth = 14, color, children }: { percentage: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const tickCount = 48;
  const strokeColor = color || "hsl(var(--primary))";

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
              stroke={tickFilled ? strokeColor : "hsl(var(--muted-foreground) / 0.2)"}
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
          stroke={strokeColor}
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

function MiniProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Rewards() {
  const { data: rewardsSummary } = useQuery<any>({ queryKey: ["/api/my-rewards/summary"] });
  const { data: rewards } = useQuery<any[]>({ queryKey: ["/api/my-rewards"] });
  const { data: referralData } = useQuery<any>({ queryKey: ["/api/my-referrals"] });
  const { data: anniversaryData } = useQuery<any[]>({ queryKey: ["/api/my-anniversary-info"] });
  const { data: attendanceProgress } = useQuery<any[]>({ queryKey: ["/api/my-attendance-progress"] });
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("referrals");
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
  const nextReferralMilestone = approvedReferrals < 2 ? 2 : approvedReferrals < 4 ? 4 : 4;
  const referralLabel = approvedReferrals < 2 ? "Premium Rate" : approvedReferrals < 4 ? "Champion" : "Champion";
  const referralProgressPct = approvedReferrals >= 4 ? 100 : (approvedReferrals / nextReferralMilestone) * 100;

  const totalAvailableCredits = rewardsSummary?.totalCredits || 0;
  const totalFreeSessions = rewardsSummary?.totalFreeSessions || 0;
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
    ANNIVERSARY: "Anniversary",
    GIFT: "Gift",
    MANUAL: "Manual",
  };

  const bestAttendance = useMemo(() => {
    if (!attendanceProgress || attendanceProgress.length === 0) return null;
    let best: any = null;
    for (const club of attendanceProgress) {
      if (club.milestones && club.milestones.length > 0) {
        const closest = club.milestones.reduce((a: any, b: any) => a.sessionsUntilNext < b.sessionsUntilNext ? a : b);
        if (!best || closest.sessionsUntilNext < best.sessionsUntilNext) {
          best = { ...closest, clubName: club.clubName, totalAttended: club.totalAttended };
        }
      }
    }
    return best;
  }, [attendanceProgress]);

  const gaugeData = useMemo(() => {
    if (activeTab === "referrals") {
      return { pct: referralProgressPct, value: approvedReferrals, label: approvedReferrals >= 4 ? "Champion" : approvedReferrals >= 2 ? "Premium" : "Active", sub: approvedReferrals >= 4 ? "All milestones reached!" : `${nextReferralMilestone - approvedReferrals} more for ${referralLabel}`, color: "hsl(var(--primary))" };
    }
    if (activeTab === "attendance" && bestAttendance) {
      return { pct: bestAttendance.progressPercent, value: bestAttendance.currentCount, label: `${bestAttendance.sessionsUntilNext} to go`, sub: `Every ${bestAttendance.sessionsRequired} sessions = reward`, color: "#f59e0b" };
    }
    if (activeTab === "anniversary" && anniversaryData && anniversaryData.length > 0) {
      const first = anniversaryData[0] as any;
      const pct = Math.min((first.progress || 0) * 100, 100);
      return { pct, value: `${first.upcomingYear || 1}`, label: "Year", sub: first.clubName, color: "#a855f7" };
    }
    return { pct: 0, value: "0", label: "Active", sub: "Start earning rewards!", color: "hsl(var(--primary))" };
  }, [activeTab, referralProgressPct, approvedReferrals, bestAttendance, anniversaryData, nextReferralMilestone, referralLabel]);

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
            <CircularProgress percentage={gaugeData.pct} size={200} strokeWidth={10} color={gaugeData.color}>
              <p className="text-4xl font-black text-white">{gaugeData.value}</p>
              <Badge className="mt-1 text-xs px-2" style={{ backgroundColor: gaugeData.color, color: 'white' }}>
                <Zap className="h-3 w-3 mr-1" />
                {gaugeData.label}
              </Badge>
              <p className="text-xs text-slate-400 mt-1.5">{gaugeData.sub}</p>
            </CircularProgress>
          </div>

          <div className="relative mt-5">
            <div className="flex gap-2 justify-center mb-4">
              <button
                onClick={() => setActiveTab("referrals")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === "referrals" ? "bg-primary text-primary-foreground" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}
                data-testid="tab-referrals"
              >
                <Users className="h-3 w-3 inline mr-1" />
                Referrals
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === "attendance" ? "bg-amber-500 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}
                data-testid="tab-attendance"
              >
                <Target className="h-3 w-3 inline mr-1" />
                Attendance
              </button>
              <button
                onClick={() => setActiveTab("anniversary")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === "anniversary" ? "bg-purple-500 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}
                data-testid="tab-anniversary"
              >
                <CalendarDays className="h-3 w-3 inline mr-1" />
                Anniversary
              </button>
            </div>

            <div className="rounded-xl bg-slate-800/60 dark:bg-slate-800/40 border border-slate-700/50 p-4">
              {activeTab === "referrals" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 1 ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">1st Referral</p>
                      <p className="text-xs text-slate-400">Credit reward per referral</p>
                    </div>
                    {approvedReferrals >= 1 && <Badge className="bg-emerald-500 text-white text-[10px] no-default-hover-elevate">Earned</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 2 ? 'bg-amber-500' : 'bg-slate-600'}`}>
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">2 Referrals — Premium</p>
                      <p className="text-xs text-slate-400">Premium rate for 2 months</p>
                    </div>
                    {approvedReferrals >= 2 ? (
                      <Badge className="bg-amber-500 text-white text-[10px] no-default-hover-elevate">Unlocked</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">{approvedReferrals}/2</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${approvedReferrals >= 4 ? 'bg-purple-500' : 'bg-slate-600'}`}>
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">4 Referrals — Champion</p>
                      <p className="text-xs text-slate-400">1 free session credit</p>
                    </div>
                    {approvedReferrals >= 4 ? (
                      <Badge className="bg-purple-500 text-white text-[10px] no-default-hover-elevate">Champion</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">{approvedReferrals}/4</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{stats?.totalReferrals || 0}</p>
                        <p className="text-[10px] text-slate-400">Total</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">{approvedReferrals}</p>
                        <p className="text-[10px] text-slate-400">Approved</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-amber-400">{stats?.pendingReferrals || 0}</p>
                        <p className="text-[10px] text-slate-400">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="space-y-4">
                  {attendanceProgress && attendanceProgress.length > 0 ? (
                    attendanceProgress.map((club: any) => (
                      <div key={club.clubId} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{club.clubName}</p>
                          <Badge className="bg-slate-600 text-white text-[10px] no-default-hover-elevate">{club.totalAttended} sessions</Badge>
                        </div>
                        {club.milestones && club.milestones.length > 0 ? (
                          club.milestones.map((m: any, idx: number) => {
                            const config = m.rewardConfig || {};
                            const rewardDesc: string[] = [];
                            if (config.credits && config.credits > 0) rewardDesc.push(`£${(config.credits / 100).toFixed(2)} credit`);
                            if (config.freeSessions && config.freeSessions > 0) rewardDesc.push(`${config.freeSessions} free session${config.freeSessions > 1 ? 's' : ''}`);
                            if (config.gifts) rewardDesc.push(config.gifts);

                            return (
                              <div key={idx} className="rounded-lg bg-slate-700/30 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-amber-400" />
                                    <span className="text-xs font-medium text-white">Every {m.sessionsRequired} sessions</span>
                                  </div>
                                  <span className="text-xs text-slate-400">{m.milestonesCompleted}x earned</span>
                                </div>
                                <MiniProgress value={m.currentCount % m.sessionsRequired} max={m.sessionsRequired} color="bg-amber-500" />
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">
                                    {m.sessionsUntilNext} session{m.sessionsUntilNext !== 1 ? 's' : ''} until next reward
                                  </span>
                                  <span className="text-amber-400 font-medium">{Math.round(m.progressPercent)}%</span>
                                </div>
                                {rewardDesc.length > 0 && (
                                  <p className="text-[11px] text-emerald-400">
                                    <Gift className="h-3 w-3 inline mr-1" />
                                    {rewardDesc.join(" + ")}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-2">No attendance milestones set up for this club yet</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Target className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                      <p className="text-xs text-slate-400">Attend sessions to start tracking your progress</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "anniversary" && (
                <div className="space-y-3">
                  <style>{`
                    @keyframes rewardShake {
                      0%, 100% { transform: rotate(0deg); }
                      10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
                      20%, 40%, 60%, 80% { transform: rotate(8deg); }
                    }
                  `}</style>
                  {anniversaryData && anniversaryData.length > 0 ? (
                    anniversaryData.map((info: any) => {
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
                        <div key={info.clubId} className="rounded-lg bg-slate-700/30 p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-purple-500/20">
                              <Gift className="h-4 w-4 text-purple-400" style={!isCelebration ? { animation: "rewardShake 1.5s ease-in-out infinite" } : undefined} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">{info.clubName}</p>
                              <p className="text-sm font-medium text-white">
                                {isCelebration
                                  ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                                  : `Year ${info.upcomingYear} in ${countdownText}`
                                }
                              </p>
                            </div>
                          </div>
                          <MiniProgress value={info.progress * 100} max={100} color="bg-purple-500" />
                          <p className="text-[11px] text-slate-400">
                            {isCelebration
                              ? "Anniversary rewards have been issued!"
                              : `${Math.round(info.progress * 100)}% through year ${info.upcomingYear}`
                            }
                          </p>
                          {info.hasReward && (
                            <p className="text-[11px] text-purple-400">
                              <Award className="h-3 w-3 inline mr-1" />
                              {info.rewardCredits ? `£${(info.rewardCredits / 100).toFixed(2)} credit` : ""}
                              {info.rewardCredits && info.rewardGifts ? " + " : ""}
                              {info.rewardGifts || ""}
                              {info.rewardMessage ? ` — ${info.rewardMessage}` : ""}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <CalendarDays className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                      <p className="text-xs text-slate-400">Anniversary milestones will appear as you stay with your clubs</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Card data-testid="card-rewards-summary">
          <CardContent className="p-4">
            <h2 className="text-sm font-bold mb-3">Rewards Summary</h2>
            <InfoRow icon={PoundSterling} label="Available credits" value={`£${(totalAvailableCredits / 100).toFixed(2)}`} hint="info" />
            <InfoRow icon={CalendarDays} label="Free sessions" value={`${totalFreeSessions}`} hint="info" />
            <InfoRow icon={Users} label="Approved referrals" value={`${approvedReferrals}`} />
            {bestAttendance && (
              <InfoRow icon={Target} label="Sessions to next reward" value={`${bestAttendance.sessionsUntilNext}`} hint="info" />
            )}
            <InfoRow icon={Gift} label="Total rewards earned" value={`${totalRewards}`} />
          </CardContent>
        </Card>

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
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType] || "Reward"}</p>
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
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType] || "Reward"}</p>
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
                        <p className="text-sm font-medium truncate">{reward.description || typeLabels[reward.rewardType] || "Reward"}</p>
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
                  <p className="font-medium">{selectedReward.description || typeLabels[selectedReward.rewardType] || "Reward"}</p>
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

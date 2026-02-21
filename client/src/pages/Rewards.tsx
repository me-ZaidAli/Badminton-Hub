import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Gift, Star, Trophy, Zap, Award, ChevronRight, Info, Users, PoundSterling, CalendarDays, Target, TrendingUp, Lock, Check } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GaugeMilestone {
  position: number;
  label: string;
  reached: boolean;
  icon: "gift" | "star" | "trophy" | "target" | "award";
  color: string;
}

function MilestoneGauge({
  percentage,
  milestones,
  size = 220,
  strokeWidth = 12,
  accentColor,
  children,
}: {
  percentage: number;
  milestones: GaugeMilestone[];
  size?: number;
  strokeWidth?: number;
  accentColor: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clampedPct / 100) * circumference;
  const tickCount = 60;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size - 4) / 2;

  const iconMap: Record<string, string> = {
    gift: "🎁",
    star: "⭐",
    trophy: "🏆",
    target: "🎯",
    award: "🎖️",
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {Array.from({ length: tickCount }).map((_, i) => {
          const angle = (i / tickCount) * 360;
          const tickFilled = i / tickCount <= clampedPct / 100;
          const innerTR = radius - 6;
          const outerTR = radius - 1;
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + innerTR * Math.cos(rad)}
              y1={cy + innerTR * Math.sin(rad)}
              x2={cx + outerTR * Math.cos(rad)}
              y2={cy + outerTR * Math.sin(rad)}
              stroke={tickFilled ? accentColor : "rgba(148,163,184,0.15)"}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${accentColor}40)` }}
        />

        {milestones.map((ms, i) => {
          const angle = (ms.position / 100) * 360;
          const rad = (angle * Math.PI) / 180;
          const markerR = outerR - 2;
          const mx = cx + markerR * Math.cos(rad);
          const my = cy + markerR * Math.sin(rad);
          return (
            <g key={i}>
              <circle
                cx={mx}
                cy={my}
                r={10}
                fill={ms.reached ? ms.color : "#334155"}
                stroke={ms.reached ? ms.color : "#475569"}
                strokeWidth={2}
                className="transition-all duration-500"
              />
              {ms.reached ? (
                <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="white" className="rotate-90" style={{ transformOrigin: `${mx}px ${my}px` }}>✓</text>
              ) : (
                <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#94a3b8" className="rotate-90" style={{ transformOrigin: `${mx}px ${my}px` }}>
                  {iconMap[ms.icon] || "○"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {milestones.map((ms, i) => {
        const angle = ((ms.position / 100) * 360) - 90;
        const rad = (angle * Math.PI) / 180;
        const labelR = outerR + 14;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        return (
          <div
            key={`label-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${lx}px`,
              top: `${ly}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className={`text-[8px] font-bold whitespace-nowrap ${ms.reached ? 'text-white' : 'text-slate-500'}`}>
              {ms.label}
            </span>
          </div>
        );
      })}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
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

function InfoRow({ icon: Icon, label, value, hint, onClick }: { icon: any; label: string; value: string; hint?: string; onClick?: () => void }) {
  return (
    <div className={`flex items-center gap-3 py-3.5 border-b border-border/30 last:border-0 ${onClick ? 'cursor-pointer hover:bg-muted/20' : ''}`} onClick={onClick}>
      <div className="p-1.5 rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-bold">{value}</span>
      {hint && <div className="p-0.5 rounded-full border border-border/50"><Info className="h-3 w-3 text-muted-foreground" /></div>}
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
  const [showAttendanceInfo, setShowAttendanceInfo] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const requestMutation = useMutation({
    mutationFn: async (rewardId: number) => { await apiRequest("POST", `/api/rewards/${rewardId}/request`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-rewards/summary"] });
      toast({ title: "Reward Requested", description: "Your reward request has been submitted for admin approval." });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const stats = referralData?.stats;
  const approvedReferrals = stats?.approvedReferrals || 0;
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
  const typeLabels: Record<string, string> = { REFERRAL: "Referral", SESSION_ATTENDANCE: "Attendance", ANNIVERSARY: "Anniversary", GIFT: "Gift", MANUAL: "Manual" };

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

  const gaugeConfig = useMemo(() => {
    if (activeTab === "referrals") {
      const maxRefs = 4;
      const pct = Math.min((approvedReferrals / maxRefs) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { position: 25, label: "1st", reached: approvedReferrals >= 1, icon: "gift", color: "#10b981" },
        { position: 50, label: "Premium", reached: approvedReferrals >= 2, icon: "star", color: "#f59e0b" },
        { position: 100, label: "Champion", reached: approvedReferrals >= 4, icon: "trophy", color: "#a855f7" },
      ];
      const currentStage = approvedReferrals >= 4 ? "Champion" : approvedReferrals >= 2 ? "Premium" : approvedReferrals >= 1 ? "Active" : "Starter";
      const nextTarget = approvedReferrals < 1 ? 1 : approvedReferrals < 2 ? 2 : approvedReferrals < 4 ? 4 : 4;
      const remaining = Math.max(nextTarget - approvedReferrals, 0);
      const nextLabel = approvedReferrals < 1 ? "1st Referral" : approvedReferrals < 2 ? "Premium" : approvedReferrals < 4 ? "Champion" : "";
      return { pct, milestones, value: `${approvedReferrals}`, unit: "referrals", stage: currentStage, remaining, nextLabel, color: "#3b82f6" };
    }

    if (activeTab === "attendance") {
      if (!bestAttendance) {
        return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "sessions", stage: "New", remaining: 0, nextLabel: "", color: "#f59e0b" };
      }
      const sr = bestAttendance.sessionsRequired;
      const currentInCycle = bestAttendance.currentCount % sr;
      const pct = sr > 0 ? (currentInCycle / sr) * 100 : 0;
      const allClubMilestones: GaugeMilestone[] = [];
      if (attendanceProgress) {
        for (const club of attendanceProgress) {
          for (const m of (club.milestones || [])) {
            const pos = m.sessionsRequired > 0 ? 100 : 0;
            const inCycle = m.currentCount % m.sessionsRequired;
            allClubMilestones.push({
              position: pos,
              label: `${m.sessionsRequired}`,
              reached: inCycle === 0 && m.milestonesCompleted > 0,
              icon: "target",
              color: "#f59e0b",
            });
          }
        }
      }
      const milestones: GaugeMilestone[] = [
        { position: 100, label: `${sr} sessions`, reached: false, icon: "target", color: "#f59e0b" },
      ];
      if (sr >= 4) {
        milestones.unshift({ position: 25, label: `${Math.ceil(sr * 0.25)}`, reached: currentInCycle >= Math.ceil(sr * 0.25), icon: "gift", color: "#10b981" });
        milestones.splice(1, 0, { position: 50, label: `${Math.ceil(sr * 0.5)}`, reached: currentInCycle >= Math.ceil(sr * 0.5), icon: "star", color: "#f59e0b" });
        milestones.splice(2, 0, { position: 75, label: `${Math.ceil(sr * 0.75)}`, reached: currentInCycle >= Math.ceil(sr * 0.75), icon: "trophy", color: "#ef4444" });
      }
      return { pct, milestones, value: `${currentInCycle}`, unit: `of ${sr}`, stage: `${bestAttendance.milestonesCompleted}x earned`, remaining: bestAttendance.sessionsUntilNext, nextLabel: "next credit", color: "#f59e0b" };
    }

    if (activeTab === "anniversary") {
      if (!anniversaryData || anniversaryData.length === 0) {
        return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "years", stage: "New", remaining: 0, nextLabel: "", color: "#a855f7" };
      }
      const first = anniversaryData[0] as any;
      const pct = Math.min((first.progress || 0) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { position: 25, label: "Q1", reached: pct >= 25, icon: "gift", color: "#10b981" },
        { position: 50, label: "Q2", reached: pct >= 50, icon: "star", color: "#f59e0b" },
        { position: 75, label: "Q3", reached: pct >= 75, icon: "trophy", color: "#ef4444" },
        { position: 100, label: `Yr ${first.upcomingYear}`, reached: pct >= 99, icon: "award", color: "#a855f7" },
      ];
      const now = Date.now();
      const target = new Date(first.nextAnniversary).getTime();
      const diff = target - now;
      const daysLeft = Math.max(Math.floor(diff / 86400000), 0);
      return { pct, milestones, value: `${first.upcomingYear || 1}`, unit: daysLeft > 0 ? `${daysLeft}d left` : "Today!", stage: first.clubName, remaining: daysLeft, nextLabel: "anniversary", color: "#a855f7" };
    }

    return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "", stage: "Start", remaining: 0, nextLabel: "", color: "#3b82f6" };
  }, [activeTab, approvedReferrals, bestAttendance, attendanceProgress, anniversaryData]);

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
            backgroundImage: `radial-gradient(circle at 1px 1px, ${gaugeConfig.color} 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          <div className="relative flex flex-col items-center">
            <MilestoneGauge
              percentage={gaugeConfig.pct}
              milestones={gaugeConfig.milestones}
              size={240}
              strokeWidth={10}
              accentColor={gaugeConfig.color}
            >
              <p className="text-5xl font-black text-white leading-none">{gaugeConfig.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{gaugeConfig.unit}</p>
              <Badge className="mt-2 text-[10px] px-2.5 py-0.5" style={{ backgroundColor: gaugeConfig.color, color: 'white' }}>
                <Zap className="h-3 w-3 mr-1" />
                {gaugeConfig.stage}
              </Badge>
              {gaugeConfig.remaining > 0 && gaugeConfig.nextLabel && (
                <p className="text-[10px] text-slate-500 mt-1">
                  {gaugeConfig.remaining} more for {gaugeConfig.nextLabel}
                </p>
              )}
            </MilestoneGauge>
          </div>

          <div className="relative mt-5">
            <div className="flex gap-2 justify-center mb-4">
              {[
                { key: "referrals", label: "Referrals", icon: Users, activeColor: "bg-blue-500 text-white" },
                { key: "attendance", label: "Attendance", icon: Target, activeColor: "bg-amber-500 text-white" },
                { key: "anniversary", label: "Anniversary", icon: CalendarDays, activeColor: "bg-purple-500 text-white" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${activeTab === tab.key ? tab.activeColor : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}
                  data-testid={`tab-${tab.key}`}
                >
                  <tab.icon className="h-3 w-3 inline mr-1" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-800/60 dark:bg-slate-800/40 border border-slate-700/50 p-4 transition-all duration-300">
              {activeTab === "referrals" && (
                <div className="space-y-3">
                  {[
                    { target: 1, label: "1st Referral", desc: "Credit reward per referral", icon: Gift, color: "bg-emerald-500", badgeText: "Earned" },
                    { target: 2, label: "2 Referrals — Premium", desc: "Premium rate for 2 months", icon: Star, color: "bg-amber-500", badgeText: "Unlocked" },
                    { target: 4, label: "4 Referrals — Champion", desc: "1 free session credit", icon: Trophy, color: "bg-purple-500", badgeText: "Champion" },
                  ].map(ms => {
                    const reached = approvedReferrals >= ms.target;
                    return (
                      <div key={ms.target} className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${reached ? 'bg-slate-700/40' : 'bg-transparent'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${reached ? ms.color : 'bg-slate-600'}`}>
                          {reached ? <Check className="h-4 w-4 text-white" /> : <ms.icon className="h-4 w-4 text-white opacity-50" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${reached ? 'text-white' : 'text-slate-400'}`}>{ms.label}</p>
                          <p className="text-xs text-slate-500">{ms.desc}</p>
                        </div>
                        {reached ? (
                          <Badge className={`${ms.color} text-white text-[10px] no-default-hover-elevate`}>{ms.badgeText}</Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Lock className="h-3 w-3 text-slate-600" />
                            <span className="text-xs text-slate-500">{approvedReferrals}/{ms.target}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-lg font-bold text-white">{stats?.totalReferrals || 0}</p><p className="text-[10px] text-slate-400">Total</p></div>
                      <div><p className="text-lg font-bold text-emerald-400">{approvedReferrals}</p><p className="text-[10px] text-slate-400">Approved</p></div>
                      <div><p className="text-lg font-bold text-amber-400">{stats?.pendingReferrals || 0}</p><p className="text-[10px] text-slate-400">Pending</p></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "attendance" && (
                <div className="space-y-4">
                  <div className="text-center pb-1">
                    <p className="text-sm text-white font-medium">Attend sessions to earn credits towards your next session</p>
                    <button onClick={() => setShowAttendanceInfo(true)} className="mt-1.5 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors" data-testid="button-how-attendance-works">
                      How does it work?
                    </button>
                  </div>
                  {attendanceProgress && attendanceProgress.length > 0 ? (
                    attendanceProgress.map((club: any) => (
                      <div key={club.clubId} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{club.clubName}</p>
                          <Badge className="bg-slate-600 text-white text-[10px] no-default-hover-elevate">{club.totalAttended} attended</Badge>
                        </div>
                        {club.milestones && club.milestones.length > 0 ? (
                          club.milestones.map((m: any, idx: number) => {
                            const config = m.rewardConfig || {};
                            const rewardParts: string[] = [];
                            if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)} credit`);
                            if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free session${config.freeSessions > 1 ? 's' : ''}`);
                            if (config.gifts) rewardParts.push(config.gifts);
                            const currentInCycle = m.currentCount % m.sessionsRequired;

                            return (
                              <div key={idx} className="rounded-lg bg-slate-700/30 p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                      <Target className="h-3.5 w-3.5 text-amber-400" />
                                    </div>
                                    <span className="text-xs font-medium text-white">Every {m.sessionsRequired} sessions</span>
                                  </div>
                                  {m.milestonesCompleted > 0 && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] no-default-hover-elevate">{m.milestonesCompleted}x earned</Badge>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">{currentInCycle} of {m.sessionsRequired} sessions</span>
                                    <span className="text-amber-400 font-semibold">{Math.round(m.progressPercent)}%</span>
                                  </div>
                                  <MiniProgress value={currentInCycle} max={m.sessionsRequired} color="bg-amber-500" />
                                </div>
                                <p className="text-xs text-slate-300">
                                  <span className="text-amber-400 font-bold">{m.sessionsUntilNext}</span> more session{m.sessionsUntilNext !== 1 ? 's' : ''} until your next credit
                                </p>
                                {rewardParts.length > 0 && (
                                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-600/30">
                                    <Gift className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <p className="text-[11px] text-emerald-400 font-medium">{rewardParts.join(" + ")}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-2">No attendance rewards set up for this club yet</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Target className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                      <p className="text-xs text-slate-400">Start attending sessions to earn credits towards future sessions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "anniversary" && (
                <div className="space-y-3">
                  <style>{`@keyframes rewardShake { 0%, 100% { transform: rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); } 20%, 40%, 60%, 80% { transform: rotate(8deg); } }`}</style>
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
                                  : `Year ${info.upcomingYear} in ${countdownText}`}
                              </p>
                            </div>
                          </div>
                          <MiniProgress value={info.progress * 100} max={100} color="bg-purple-500" />
                          <p className="text-[11px] text-slate-400">
                            {isCelebration ? "Anniversary rewards have been issued!" : `${Math.round(info.progress * 100)}% through year ${info.upcomingYear}`}
                          </p>
                          {info.hasReward && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-600/30">
                              <Award className="h-3 w-3 text-purple-400 shrink-0" />
                              <p className="text-[11px] text-purple-400">
                                {info.rewardCredits ? `£${(info.rewardCredits / 100).toFixed(2)} credit` : ""}
                                {info.rewardCredits && info.rewardGifts ? " + " : ""}
                                {info.rewardGifts || ""}
                              </p>
                            </div>
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
            <InfoRow icon={Users} label="Approved referrals" value={`${approvedReferrals}`} onClick={() => setActiveTab("referrals")} />
            {bestAttendance && (
              <InfoRow icon={Target} label="Sessions to next reward" value={`${bestAttendance.sessionsUntilNext}`} hint="info" onClick={() => setActiveTab("attendance")} />
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
                      <div className="p-2 rounded-lg bg-emerald-500/10"><Gift className="h-4 w-4 text-emerald-500" /></div>
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
                      <div className="p-2 rounded-lg bg-amber-500/10"><Gift className="h-4 w-4 text-amber-500" /></div>
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
                      <div className="p-2 rounded-lg bg-muted"><Gift className="h-4 w-4 text-muted-foreground" /></div>
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
              <Link href="/referrals"><Button size="sm" data-testid="button-start-referring">Start Referring</Button></Link>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedReward} onOpenChange={(open) => !open && setSelectedReward(null)}>
          <DialogContent className="bg-background max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-emerald-500" />Reward Details</DialogTitle>
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
                  <Button className="w-full" onClick={() => { requestMutation.mutate(selectedReward.id); setSelectedReward(null); }} disabled={requestMutation.isPending} data-testid="button-redeem-reward">
                    Request Redemption
                  </Button>
                )}
                {selectedReward.status === "REQUESTED" && <p className="text-center text-sm text-amber-600 font-medium">Awaiting admin approval</p>}
                {selectedReward.status === "USED" && <p className="text-center text-sm text-muted-foreground">This reward has been redeemed</p>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAttendanceInfo} onOpenChange={setShowAttendanceInfo}>
          <DialogContent className="bg-background max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-amber-500" />How Session Credits Work</DialogTitle>
              <DialogDescription>Earn rewards just by playing</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { num: "1", title: "Attend sessions", desc: "Every time you attend a session and your attendance is marked, it counts towards your progress.", color: "bg-amber-500/10", textColor: "text-amber-500" },
                  { num: "2", title: "Reach a milestone", desc: "Each club sets a target number of sessions. When you hit the target, you automatically earn a reward.", color: "bg-amber-500/10", textColor: "text-amber-500" },
                  { num: "3", title: "Get credited", desc: "Credits are added to your account automatically. Use them to pay for future sessions, or receive gifts and free sessions.", color: "bg-amber-500/10", textColor: "text-amber-500" },
                ].map(step => (
                  <div key={step.num} className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-full ${step.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`text-xs font-bold ${step.textColor}`}>{step.num}</span>
                    </div>
                    <div><p className="text-sm font-medium">{step.title}</p><p className="text-xs text-muted-foreground">{step.desc}</p></div>
                  </div>
                ))}
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div><p className="text-sm font-medium">It repeats!</p><p className="text-xs text-muted-foreground">Milestones reset after each reward, so you keep earning the more you play. The counter never stops!</p></div>
                </div>
              </div>

              {attendanceProgress && attendanceProgress.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Your clubs' reward targets:</p>
                  {attendanceProgress.map((club: any) => (
                    <div key={club.clubId}>
                      {(club.milestones || []).map((m: any, idx: number) => {
                        const config = m.rewardConfig || {};
                        const parts: string[] = [];
                        if (config.credits > 0) parts.push(`£${(config.credits / 100).toFixed(2)}`);
                        if (config.freeSessions > 0) parts.push(`${config.freeSessions} free session${config.freeSessions > 1 ? 's' : ''}`);
                        if (config.gifts) parts.push(config.gifts);
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                            <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="text-xs flex-1">{club.clubName}: Every <strong>{m.sessionsRequired}</strong> sessions</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{parts.join(" + ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" onClick={() => setShowAttendanceInfo(false)} data-testid="button-close-attendance-info">Got it!</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

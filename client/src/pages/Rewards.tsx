import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Gift, Star, Trophy, Award, ChevronRight, Info, Users, PoundSterling, CalendarDays, Target, TrendingUp, Lock, Check } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GaugeMilestone {
  barIndex: number;
  label: string;
  reached: boolean;
}

function EVGauge({
  percentage,
  milestones,
  accentColor,
  glowColor,
  children,
}: {
  percentage: number;
  milestones: GaugeMilestone[];
  accentColor: string;
  glowColor: string;
  children?: React.ReactNode;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const barCount = 54;
  const radius = 110;
  const barWidth = 5;
  const normalHeight = 16;
  const milestoneHeight = 26;
  const gapAngle = 360 / barCount;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const filledBars = Math.round((clampedPct / 100) * barCount);

  const milestoneBarIndices = new Set(milestones.map(m => m.barIndex));

  const [animatedBars, setAnimatedBars] = useState(0);
  useEffect(() => {
    setAnimatedBars(0);
    const timer = setTimeout(() => setAnimatedBars(filledBars), 50);
    return () => clearTimeout(timer);
  }, [filledBars]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid="ev-gauge">
      <svg width={size} height={size}>
        <defs>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: barCount }).map((_, i) => {
          const angle = (i * gapAngle) - 90;
          const rad = (angle * Math.PI) / 180;
          const isMilestone = milestoneBarIndices.has(i);
          const h = isMilestone ? milestoneHeight : normalHeight;
          const innerR = radius - h / 2;
          const outerR = radius + h / 2;
          const isFilled = i < animatedBars;

          const x1 = cx + innerR * Math.cos(rad);
          const y1 = cy + innerR * Math.sin(rad);
          const x2 = cx + outerR * Math.cos(rad);
          const y2 = cy + outerR * Math.sin(rad);

          const inactiveColor = isMilestone ? "rgba(50,65,85,0.5)" : "rgba(40,55,70,0.35)";

          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={isFilled ? accentColor : inactiveColor}
              strokeWidth={barWidth}
              strokeLinecap="round"
              style={{
                transition: `stroke 0.08s ease ${i * 15}ms`,
                filter: isFilled ? 'url(#barGlow)' : 'none',
              }}
            />
          );
        })}

        <circle cx={cx} cy={cy} r={radius - normalHeight / 2 - 8} fill="none" stroke="rgba(50,65,85,0.12)" strokeWidth={0.5} />
        <circle cx={cx} cy={cy} r={radius + normalHeight / 2 + 8} fill="none" stroke="rgba(50,65,85,0.08)" strokeWidth={0.5} />
      </svg>

      {milestones.map((ms, i) => {
        const angle = (ms.barIndex * gapAngle) - 90;
        const rad = (angle * Math.PI) / 180;
        const labelR = radius + milestoneHeight / 2 + 18;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        return (
          <div key={`lbl-${i}`} className="absolute pointer-events-none" style={{ left: `${lx}px`, top: `${ly}px`, transform: 'translate(-50%, -50%)' }}>
            <span
              className="text-[9px] font-bold whitespace-nowrap tracking-widest uppercase"
              style={{
                color: ms.reached ? accentColor : 'rgba(100,116,139,0.4)',
                textShadow: ms.reached ? `0 0 8px ${glowColor}60` : 'none',
              }}
            >
              {ms.label}
            </span>
          </div>
        );
      })}

      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function MiniProgress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
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

  const statusColors: Record<string, string> = { AVAILABLE: "bg-emerald-500 text-white", REQUESTED: "bg-amber-500 text-white", USED: "bg-muted text-muted-foreground" };
  const typeLabels: Record<string, string> = { REFERRAL: "Referral", SESSION_ATTENDANCE: "Attendance", ANNIVERSARY: "Anniversary", GIFT: "Gift", MANUAL: "Manual" };

  const bestAttendance = useMemo(() => {
    if (!attendanceProgress || attendanceProgress.length === 0) return null;
    let best: any = null;
    for (const club of attendanceProgress) {
      if (club.milestones && club.milestones.length > 0) {
        const closest = club.milestones.reduce((a: any, b: any) => a.sessionsUntilNext < b.sessionsUntilNext ? a : b);
        if (!best || closest.sessionsUntilNext < best.sessionsUntilNext) best = { ...closest, clubName: club.clubName, totalAttended: club.totalAttended };
      }
    }
    return best;
  }, [attendanceProgress]);

  const tabThemes: Record<string, { accent: string; glow: string; inactiveBar: string }> = {
    referrals: { accent: "#00e5ff", glow: "#00b8d4", inactiveBar: "#1a3040" },
    attendance: { accent: "#76ff03", glow: "#64dd17", inactiveBar: "#1a3020" },
    anniversary: { accent: "#e040fb", glow: "#d500f9", inactiveBar: "#2a1040" },
  };

  const barCount = 54;

  const gaugeConfig = useMemo(() => {
    const theme = tabThemes[activeTab] || tabThemes.referrals;

    if (activeTab === "referrals") {
      const maxRefs = 4;
      const pct = Math.min((approvedReferrals / maxRefs) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { barIndex: Math.round(barCount * 0.25), label: "1st", reached: approvedReferrals >= 1 },
        { barIndex: Math.round(barCount * 0.50), label: "Premium", reached: approvedReferrals >= 2 },
        { barIndex: barCount - 1, label: "Champion", reached: approvedReferrals >= 4 },
      ];
      const stage = approvedReferrals >= 4 ? "All Milestones Reached" : approvedReferrals >= 2 ? "Premium Active" : approvedReferrals >= 1 ? "Progress Active" : "Not Started";
      const nextTarget = approvedReferrals < 1 ? 1 : approvedReferrals < 2 ? 2 : approvedReferrals < 4 ? 4 : 4;
      const remaining = Math.max(nextTarget - approvedReferrals, 0);
      const nextLabel = approvedReferrals < 1 ? "1st Referral" : approvedReferrals < 2 ? "Premium" : approvedReferrals < 4 ? "Champion" : "";
      return { pct, milestones, value: `${approvedReferrals}`, unit: "Referrals", stage, remaining, nextLabel, ...theme };
    }

    if (activeTab === "attendance") {
      if (!bestAttendance) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Sessions", stage: "Not Started", remaining: 0, nextLabel: "", ...theme };
      const sr = bestAttendance.sessionsRequired;
      const currentInCycle = bestAttendance.currentCount % sr;
      const pct = sr > 0 ? (currentInCycle / sr) * 100 : 0;
      const milestones: GaugeMilestone[] = [
        { barIndex: barCount - 1, label: `${sr}`, reached: false },
      ];
      if (sr >= 4) {
        milestones.unshift({ barIndex: Math.round(barCount * 0.25), label: `${Math.ceil(sr * 0.25)}`, reached: currentInCycle >= Math.ceil(sr * 0.25) });
        milestones.splice(1, 0, { barIndex: Math.round(barCount * 0.50), label: `${Math.ceil(sr * 0.5)}`, reached: currentInCycle >= Math.ceil(sr * 0.5) });
        milestones.splice(2, 0, { barIndex: Math.round(barCount * 0.75), label: `${Math.ceil(sr * 0.75)}`, reached: currentInCycle >= Math.ceil(sr * 0.75) });
      }
      const earned = bestAttendance.milestonesCompleted;
      return { pct, milestones, value: `${currentInCycle}`, unit: `of ${sr} Sessions`, stage: earned > 0 ? `${earned}x Milestone Earned` : "Progress Active", remaining: bestAttendance.sessionsUntilNext, nextLabel: "next credit", ...theme };
    }

    if (activeTab === "anniversary") {
      if (!anniversaryData || anniversaryData.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Years", stage: "Not Started", remaining: 0, nextLabel: "", ...theme };
      const first = anniversaryData[0] as any;
      const pct = Math.min((first.progress || 0) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { barIndex: Math.round(barCount * 0.25), label: "Q1", reached: pct >= 25 },
        { barIndex: Math.round(barCount * 0.50), label: "Q2", reached: pct >= 50 },
        { barIndex: Math.round(barCount * 0.75), label: "Q3", reached: pct >= 75 },
        { barIndex: barCount - 1, label: `Yr ${first.upcomingYear}`, reached: pct >= 99 },
      ];
      const diff = new Date(first.nextAnniversary).getTime() - Date.now();
      const daysLeft = Math.max(Math.floor(diff / 86400000), 0);
      return { pct, milestones, value: `${first.upcomingYear || 1}`, unit: daysLeft > 0 ? `${daysLeft} Days Left` : "Today!", stage: first.clubName, remaining: daysLeft, nextLabel: "anniversary", ...theme };
    }

    return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "", stage: "Not Started", remaining: 0, nextLabel: "", ...theme };
  }, [activeTab, approvedReferrals, bestAttendance, attendanceProgress, anniversaryData]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-rewards-back"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">My Rewards</h1>
        </div>

        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #060b14 0%, #0b1120 25%, #0d1424 50%, #0a0f1c 75%, #060b14 100%)' }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : '224,64,251'},0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : '224,64,251'},0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            transition: 'background-image 0.5s ease',
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(ellipse at 50% 40%, ${gaugeConfig.accent}08 0%, transparent 60%),
              radial-gradient(ellipse at 20% 80%, ${gaugeConfig.glow}05 0%, transparent 40%),
              radial-gradient(ellipse at 80% 20%, ${gaugeConfig.glow}05 0%, transparent 40%)
            `,
          }} />

          <div className="relative p-4 pb-5">
            <div className="flex flex-col items-center">
              <EVGauge
                percentage={gaugeConfig.pct}
                milestones={gaugeConfig.milestones}
                accentColor={gaugeConfig.accent}
                glowColor={gaugeConfig.glow}
              >
                <p className="text-6xl font-black text-white leading-none" style={{
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                  textShadow: `0 0 40px ${gaugeConfig.accent}30, 0 0 80px ${gaugeConfig.glow}15`,
                  letterSpacing: '-2px',
                }}>
                  {gaugeConfig.value}
                </p>
                <p className="text-[11px] mt-1 font-semibold tracking-[0.2em] uppercase" style={{ color: `${gaugeConfig.accent}90` }}>
                  {gaugeConfig.unit}
                </p>
                <div className="mt-3 px-4 py-1 rounded-full text-[10px] font-semibold tracking-[0.15em] uppercase" style={{
                  background: `${gaugeConfig.accent}0a`,
                  border: `1px solid ${gaugeConfig.accent}25`,
                  color: `${gaugeConfig.accent}cc`,
                }}>
                  {gaugeConfig.stage}
                </div>
                {gaugeConfig.remaining > 0 && gaugeConfig.nextLabel && (
                  <p className="text-[10px] mt-1.5 tracking-wide" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {gaugeConfig.remaining} more for {gaugeConfig.nextLabel}
                  </p>
                )}
              </EVGauge>
            </div>

            <div className="mt-3">
              <div className="flex gap-2 justify-center mb-4">
                {[
                  { key: "referrals", label: "Referrals", icon: Users },
                  { key: "attendance", label: "Attendance", icon: Target },
                  { key: "anniversary", label: "Anniversary", icon: CalendarDays },
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  const tc = tabThemes[tab.key];
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="px-4 py-2 rounded-lg text-[11px] font-semibold transition-all duration-300 tracking-wider uppercase"
                      style={isActive ? {
                        background: `${tc.accent}12`,
                        border: `1px solid ${tc.accent}30`,
                        color: tc.accent,
                        boxShadow: `0 0 20px ${tc.accent}10`,
                      } : {
                        background: 'rgba(20,30,45,0.6)',
                        border: '1px solid rgba(50,65,85,0.3)',
                        color: 'rgba(100,116,139,0.5)',
                      }}
                      data-testid={`tab-${tab.key}`}
                    >
                      <tab.icon className="h-3.5 w-3.5 inline mr-1.5" style={{ opacity: isActive ? 1 : 0.5 }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl p-4 transition-all duration-500" style={{
                background: 'rgba(10,16,28,0.7)',
                border: `1px solid ${gaugeConfig.accent}10`,
                backdropFilter: 'blur(10px)',
              }}>
                {activeTab === "referrals" && (
                  <div className="space-y-2">
                    {[
                      { target: 1, label: "1st Referral", desc: "Credit reward per referral", icon: Gift, badgeText: "Earned" },
                      { target: 2, label: "2 Referrals — Premium", desc: "Premium rate for 2 months", icon: Star, badgeText: "Unlocked" },
                      { target: 4, label: "4 Referrals — Champion", desc: "1 free session credit", icon: Trophy, badgeText: "Champion" },
                    ].map(ms => {
                      const reached = approvedReferrals >= ms.target;
                      return (
                        <div key={ms.target} className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300" style={{
                          background: reached ? `${gaugeConfig.accent}08` : 'rgba(20,30,45,0.3)',
                          border: `1px solid ${reached ? `${gaugeConfig.accent}20` : 'rgba(50,65,85,0.15)'}`,
                        }}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{
                            background: reached ? `${gaugeConfig.accent}15` : 'rgba(30,45,60,0.5)',
                            border: `1px solid ${reached ? `${gaugeConfig.accent}30` : 'rgba(50,65,85,0.2)'}`,
                          }}>
                            {reached ? <Check className="h-4 w-4" style={{ color: gaugeConfig.accent }} /> : <ms.icon className="h-4 w-4" style={{ color: 'rgba(100,116,139,0.3)' }} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: reached ? 'rgba(255,255,255,0.9)' : 'rgba(100,116,139,0.5)' }}>{ms.label}</p>
                            <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{ms.desc}</p>
                          </div>
                          {reached ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase" style={{
                              background: `${gaugeConfig.accent}12`,
                              color: gaugeConfig.accent,
                              border: `1px solid ${gaugeConfig.accent}25`,
                            }}>{ms.badgeText}</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3 w-3" style={{ color: 'rgba(50,65,85,0.6)' }} />
                              <span className="text-xs font-mono" style={{ color: 'rgba(100,116,139,0.4)' }}>{approvedReferrals}/{ms.target}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(50,65,85,0.2)' }}>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-black text-white font-mono">{stats?.totalReferrals || 0}</p>
                          <p className="text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-black font-mono" style={{ color: gaugeConfig.accent }}>{approvedReferrals}</p>
                          <p className="text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Approved</p>
                        </div>
                        <div>
                          <p className="text-lg font-black font-mono" style={{ color: '#ffaa00' }}>{stats?.pendingReferrals || 0}</p>
                          <p className="text-[9px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "attendance" && (
                  <div className="space-y-4">
                    <div className="text-center pb-1">
                      <p className="text-sm font-medium" style={{ color: `${gaugeConfig.accent}cc` }}>Attend sessions to earn credits towards your next session</p>
                      <button onClick={() => setShowAttendanceInfo(true)} className="mt-1.5 text-xs font-medium underline underline-offset-2 transition-colors" style={{ color: `${gaugeConfig.accent}80` }} data-testid="button-how-attendance-works">
                        How does it work?
                      </button>
                    </div>
                    {attendanceProgress && attendanceProgress.length > 0 ? (
                      attendanceProgress.map((club: any) => (
                        <div key={club.clubId} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">{club.clubName}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.totalAttended} attended</span>
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
                                <div key={idx} className="rounded-lg p-3 space-y-2.5" style={{ background: 'rgba(15,25,35,0.6)', border: `1px solid ${gaugeConfig.accent}10` }}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${gaugeConfig.accent}12` }}>
                                        <Target className="h-3.5 w-3.5" style={{ color: `${gaugeConfig.accent}cc` }} />
                                      </div>
                                      <span className="text-xs font-semibold text-white">Every {m.sessionsRequired} sessions</span>
                                    </div>
                                    {m.milestonesCompleted > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: gaugeConfig.accent, border: `1px solid ${gaugeConfig.accent}20` }}>{m.milestonesCompleted}x earned</span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                      <span style={{ color: 'rgba(100,116,139,0.5)' }}>{currentInCycle} of {m.sessionsRequired} sessions</span>
                                      <span className="font-bold font-mono" style={{ color: gaugeConfig.accent }}>{Math.round(m.progressPercent)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${gaugeConfig.accent}10` }}>
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.sessionsRequired > 0 ? (currentInCycle / m.sessionsRequired) * 100 : 0}%`, background: gaugeConfig.accent, boxShadow: `0 0 8px ${gaugeConfig.accent}50` }} />
                                    </div>
                                  </div>
                                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                                    <span className="font-bold font-mono" style={{ color: gaugeConfig.accent }}>{m.sessionsUntilNext}</span> more session{m.sessionsUntilNext !== 1 ? 's' : ''} until next credit
                                  </p>
                                  {rewardParts.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1.5" style={{ borderTop: `1px solid ${gaugeConfig.accent}08` }}>
                                      <Gift className="h-3 w-3 shrink-0" style={{ color: gaugeConfig.accent }} />
                                      <p className="text-[11px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-center py-2" style={{ color: 'rgba(100,116,139,0.4)' }}>No attendance rewards set up for this club yet</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Target className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(100,116,139,0.2)' }} />
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Start attending sessions to earn credits</p>
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
                          <div key={info.clubId} className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(15,25,35,0.6)', border: `1px solid ${gaugeConfig.accent}10` }}>
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md" style={{ background: `${gaugeConfig.accent}12` }}>
                                <Gift className="h-4 w-4" style={{ color: `${gaugeConfig.accent}cc`, ...(isCelebration ? {} : { animation: "rewardShake 1.5s ease-in-out infinite" }) }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{info.clubName}</p>
                                <p className="text-sm font-semibold text-white">
                                  {isCelebration
                                    ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                                    : `Year ${info.upcomingYear} in ${countdownText}`}
                                </p>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${gaugeConfig.accent}10` }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${info.progress * 100}%`, background: gaugeConfig.accent, boxShadow: `0 0 8px ${gaugeConfig.accent}50` }} />
                            </div>
                            <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                              {isCelebration ? "Anniversary rewards have been issued!" : `${Math.round(info.progress * 100)}% through year ${info.upcomingYear}`}
                            </p>
                            {info.hasReward && (
                              <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: `1px solid ${gaugeConfig.accent}08` }}>
                                <Award className="h-3 w-3 shrink-0" style={{ color: `${gaugeConfig.accent}cc` }} />
                                <p className="text-[11px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>
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
                        <CalendarDays className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(100,116,139,0.2)' }} />
                        <p className="text-xs" style={{ color: 'rgba(100,116,139,0.4)' }}>Anniversary milestones will appear as you stay with your clubs</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card data-testid="card-rewards-summary">
          <CardContent className="p-4">
            <h2 className="text-sm font-bold mb-3">Rewards Summary</h2>
            <InfoRow icon={PoundSterling} label="Available credits" value={`£${(totalAvailableCredits / 100).toFixed(2)}`} hint="info" />
            <InfoRow icon={CalendarDays} label="Free sessions" value={`${totalFreeSessions}`} hint="info" />
            <InfoRow icon={Users} label="Approved referrals" value={`${approvedReferrals}`} onClick={() => setActiveTab("referrals")} />
            {bestAttendance && <InfoRow icon={Target} label="Sessions to next reward" value={`${bestAttendance.sessionsUntilNext}`} hint="info" onClick={() => setActiveTab("attendance")} />}
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
                  <Button className="w-full" onClick={() => { requestMutation.mutate(selectedReward.id); setSelectedReward(null); }} disabled={requestMutation.isPending} data-testid="button-redeem-reward">Request Redemption</Button>
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
                  { num: "1", title: "Attend sessions", desc: "Every time you attend a session and your attendance is marked, it counts towards your progress." },
                  { num: "2", title: "Reach a milestone", desc: "Each club sets a target number of sessions. When you hit the target, you automatically earn a reward." },
                  { num: "3", title: "Get credited", desc: "Credits are added to your account automatically. Use them to pay for future sessions, or receive gifts and free sessions." },
                ].map(step => (
                  <div key={step.num} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-500">{step.num}</span>
                    </div>
                    <div><p className="text-sm font-medium">{step.title}</p><p className="text-xs text-muted-foreground">{step.desc}</p></div>
                  </div>
                ))}
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div><p className="text-sm font-medium">It repeats!</p><p className="text-xs text-muted-foreground">Milestones reset after each reward, so you keep earning the more you play.</p></div>
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

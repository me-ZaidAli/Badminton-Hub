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
  color: string;
}

function NeonGauge({
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
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const mainRadius = 100;
  const trackWidth = 8;
  const tickCount = 72;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const circumference = 2 * Math.PI * mainRadius;
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid="neon-gauge">
      <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 20px ${glowColor}30)` }}>
        <defs>
          <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="50%" stopColor={glowColor} />
            <stop offset="100%" stopColor={accentColor} />
          </linearGradient>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="milestoneGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: tickCount }).map((_, i) => {
          const angle = (i / tickCount) * 360;
          const tickFilled = i / tickCount <= clampedPct / 100;
          const innerR = mainRadius + trackWidth / 2 + 4;
          const outerR = mainRadius + trackWidth / 2 + (i % 6 === 0 ? 14 : 9);
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + innerR * Math.cos(rad)}
              y1={cy + innerR * Math.sin(rad)}
              x2={cx + outerR * Math.cos(rad)}
              y2={cy + outerR * Math.sin(rad)}
              stroke={tickFilled ? accentColor : "rgba(100,116,139,0.2)"}
              strokeWidth={i % 6 === 0 ? 2.5 : 1.5}
              strokeLinecap="round"
              style={tickFilled ? { filter: `drop-shadow(0 0 2px ${accentColor})` } : undefined}
            />
          );
        })}

        <circle cx={cx} cy={cy} r={mainRadius} fill="none" stroke="rgba(100,116,139,0.1)" strokeWidth={trackWidth} />

        <circle
          cx={cx} cy={cy} r={mainRadius}
          fill="none"
          stroke={accentColor}
          strokeWidth={trackWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${accentColor}) drop-shadow(0 0 16px ${glowColor}60)` }}
        />

        {clampedPct > 0 && clampedPct < 100 && (() => {
          const headAngle = (clampedPct / 100) * 360;
          const rad = (headAngle * Math.PI) / 180;
          const hx = cx + mainRadius * Math.cos(rad);
          const hy = cy + mainRadius * Math.sin(rad);
          return (
            <circle cx={hx} cy={hy} r={5} fill={accentColor} style={{ filter: `drop-shadow(0 0 8px ${accentColor}) drop-shadow(0 0 16px ${glowColor})` }} />
          );
        })()}

        <circle cx={cx} cy={cy} r={mainRadius - trackWidth / 2 - 6} fill="none" stroke="rgba(100,116,139,0.06)" strokeWidth={1} strokeDasharray="3 6" />

        {milestones.map((ms, i) => {
          const angle = (ms.position / 100) * 360;
          const rad = (angle * Math.PI) / 180;
          const markerR = mainRadius + trackWidth / 2 + 20;
          const mx = cx + markerR * Math.cos(rad);
          const my = cy + markerR * Math.sin(rad);
          const dotR = mainRadius;
          const dx = cx + dotR * Math.cos(rad);
          const dy = cy + dotR * Math.sin(rad);
          return (
            <g key={i}>
              <line
                x1={cx + (mainRadius + trackWidth / 2 + 2) * Math.cos(rad)}
                y1={cy + (mainRadius + trackWidth / 2 + 2) * Math.sin(rad)}
                x2={cx + (mainRadius + trackWidth / 2 + 16) * Math.cos(rad)}
                y2={cy + (mainRadius + trackWidth / 2 + 16) * Math.sin(rad)}
                stroke={ms.reached ? ms.color : "rgba(100,116,139,0.3)"}
                strokeWidth={2.5}
                strokeLinecap="round"
                style={ms.reached ? { filter: `drop-shadow(0 0 4px ${ms.color})` } : undefined}
              />
              <circle
                cx={mx} cy={my} r={12}
                fill={ms.reached ? ms.color : "rgba(30,41,59,0.9)"}
                stroke={ms.reached ? ms.color : "rgba(100,116,139,0.3)"}
                strokeWidth={2}
                style={ms.reached ? { filter: `drop-shadow(0 0 6px ${ms.color})` } : undefined}
              />
              {ms.reached ? (
                <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill="white" className="rotate-90" style={{ transformOrigin: `${mx}px ${my}px` }}>&#10003;</text>
              ) : (
                <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="rgba(148,163,184,0.6)" className="rotate-90" style={{ transformOrigin: `${mx}px ${my}px` }}>&#9679;</text>
              )}

              {ms.reached && (
                <circle cx={dx} cy={dy} r={3} fill={ms.color} style={{ filter: `drop-shadow(0 0 4px ${ms.color})` }} />
              )}
            </g>
          );
        })}
      </svg>

      {milestones.map((ms, i) => {
        const angle = ((ms.position / 100) * 360) - 90;
        const rad = (angle * Math.PI) / 180;
        const labelR = mainRadius + trackWidth / 2 + 38;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        return (
          <div key={`lbl-${i}`} className="absolute pointer-events-none" style={{ left: `${lx}px`, top: `${ly}px`, transform: 'translate(-50%, -50%)' }}>
            <span className={`text-[9px] font-bold whitespace-nowrap tracking-wide uppercase ${ms.reached ? 'text-white' : 'text-slate-600'}`} style={ms.reached ? { textShadow: `0 0 8px ${ms.color}` } : undefined}>
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

  const tabColors: Record<string, { accent: string; glow: string; bg: string }> = {
    referrals: { accent: "#00d4ff", glow: "#0099ff", bg: "from-[#00d4ff]/5 to-[#0099ff]/5" },
    attendance: { accent: "#ff6b2b", glow: "#ff9500", bg: "from-[#ff6b2b]/5 to-[#ff9500]/5" },
    anniversary: { accent: "#bf5af2", glow: "#da70ff", bg: "from-[#bf5af2]/5 to-[#da70ff]/5" },
  };

  const gaugeConfig = useMemo(() => {
    const colors = tabColors[activeTab] || tabColors.referrals;

    if (activeTab === "referrals") {
      const maxRefs = 4;
      const pct = Math.min((approvedReferrals / maxRefs) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { position: 25, label: "1st", reached: approvedReferrals >= 1, color: "#00ff88" },
        { position: 50, label: "Premium", reached: approvedReferrals >= 2, color: "#ffaa00" },
        { position: 100, label: "Champion", reached: approvedReferrals >= 4, color: "#bf5af2" },
      ];
      const stage = approvedReferrals >= 4 ? "Champion" : approvedReferrals >= 2 ? "Premium" : approvedReferrals >= 1 ? "Active" : "Starter";
      const nextTarget = approvedReferrals < 1 ? 1 : approvedReferrals < 2 ? 2 : approvedReferrals < 4 ? 4 : 4;
      const remaining = Math.max(nextTarget - approvedReferrals, 0);
      const nextLabel = approvedReferrals < 1 ? "1st Referral" : approvedReferrals < 2 ? "Premium" : approvedReferrals < 4 ? "Champion" : "";
      return { pct, milestones, value: `${approvedReferrals}`, unit: "referrals", stage, remaining, nextLabel, ...colors };
    }

    if (activeTab === "attendance") {
      if (!bestAttendance) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "sessions", stage: "New", remaining: 0, nextLabel: "", ...colors };
      const sr = bestAttendance.sessionsRequired;
      const currentInCycle = bestAttendance.currentCount % sr;
      const pct = sr > 0 ? (currentInCycle / sr) * 100 : 0;
      const milestones: GaugeMilestone[] = [{ position: 100, label: `${sr} sessions`, reached: false, color: "#ff6b2b" }];
      if (sr >= 4) {
        milestones.unshift({ position: 25, label: `${Math.ceil(sr * 0.25)}`, reached: currentInCycle >= Math.ceil(sr * 0.25), color: "#00ff88" });
        milestones.splice(1, 0, { position: 50, label: `${Math.ceil(sr * 0.5)}`, reached: currentInCycle >= Math.ceil(sr * 0.5), color: "#ffaa00" });
        milestones.splice(2, 0, { position: 75, label: `${Math.ceil(sr * 0.75)}`, reached: currentInCycle >= Math.ceil(sr * 0.75), color: "#ff4444" });
      }
      return { pct, milestones, value: `${currentInCycle}`, unit: `of ${sr}`, stage: `${bestAttendance.milestonesCompleted}x earned`, remaining: bestAttendance.sessionsUntilNext, nextLabel: "next credit", ...colors };
    }

    if (activeTab === "anniversary") {
      if (!anniversaryData || anniversaryData.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "years", stage: "New", remaining: 0, nextLabel: "", ...colors };
      const first = anniversaryData[0] as any;
      const pct = Math.min((first.progress || 0) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { position: 25, label: "Q1", reached: pct >= 25, color: "#00ff88" },
        { position: 50, label: "Q2", reached: pct >= 50, color: "#ffaa00" },
        { position: 75, label: "Q3", reached: pct >= 75, color: "#ff4444" },
        { position: 100, label: `Yr ${first.upcomingYear}`, reached: pct >= 99, color: "#bf5af2" },
      ];
      const diff = new Date(first.nextAnniversary).getTime() - Date.now();
      const daysLeft = Math.max(Math.floor(diff / 86400000), 0);
      return { pct, milestones, value: `${first.upcomingYear || 1}`, unit: daysLeft > 0 ? `${daysLeft}d left` : "Today!", stage: first.clubName, remaining: daysLeft, nextLabel: "anniversary", ...colors };
    }

    return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "", stage: "Start", remaining: 0, nextLabel: "", ...colors };
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

        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1321 30%, #111827 60%, #0a0e1a 100%)' }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, ${gaugeConfig.accent}15 1px, transparent 0),
              radial-gradient(circle at 50% 50%, ${gaugeConfig.glow}08 0%, transparent 70%)
            `,
            backgroundSize: '20px 20px, 100% 100%'
          }} />
          <div className="absolute inset-0" style={{
            background: `
              linear-gradient(0deg, transparent 49.5%, ${gaugeConfig.accent}06 50%, transparent 50.5%),
              linear-gradient(90deg, transparent 49.5%, ${gaugeConfig.accent}06 50%, transparent 50.5%)
            `,
            backgroundSize: '40px 40px'
          }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full" style={{
            background: `radial-gradient(ellipse, ${gaugeConfig.glow}12 0%, transparent 70%)`,
          }} />

          <div className="relative p-6 pt-4 pb-5">
            <div className="flex flex-col items-center">
              <NeonGauge
                percentage={gaugeConfig.pct}
                milestones={gaugeConfig.milestones}
                accentColor={gaugeConfig.accent}
                glowColor={gaugeConfig.glow}
              >
                <p className="text-5xl font-black text-white leading-none tracking-tight" style={{ textShadow: `0 0 30px ${gaugeConfig.accent}40, 0 0 60px ${gaugeConfig.glow}20` }}>
                  {gaugeConfig.value}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium tracking-widest uppercase">{gaugeConfig.unit}</p>
                <div className="mt-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase" style={{
                  borderColor: `${gaugeConfig.accent}60`,
                  background: `linear-gradient(135deg, ${gaugeConfig.accent}15, ${gaugeConfig.glow}10)`,
                  color: gaugeConfig.accent,
                  boxShadow: `0 0 12px ${gaugeConfig.accent}20, inset 0 0 12px ${gaugeConfig.accent}08`,
                  textShadow: `0 0 8px ${gaugeConfig.accent}60`,
                }}>
                  <Zap className="h-3 w-3 mr-1 inline" style={{ filter: `drop-shadow(0 0 3px ${gaugeConfig.accent})` }} />
                  {gaugeConfig.stage}
                </div>
                {gaugeConfig.remaining > 0 && gaugeConfig.nextLabel && (
                  <p className="text-[10px] mt-1.5 font-medium" style={{ color: `${gaugeConfig.accent}90` }}>
                    {gaugeConfig.remaining} more for {gaugeConfig.nextLabel}
                  </p>
                )}
              </NeonGauge>
            </div>

            <div className="mt-4">
              <div className="flex gap-2 justify-center mb-4">
                {[
                  { key: "referrals", label: "Referrals", icon: Users },
                  { key: "attendance", label: "Attendance", icon: Target },
                  { key: "anniversary", label: "Anniversary", icon: CalendarDays },
                ].map(tab => {
                  const isActive = activeTab === tab.key;
                  const tc = tabColors[tab.key];
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 tracking-wide"
                      style={isActive ? {
                        background: `linear-gradient(135deg, ${tc.accent}25, ${tc.glow}15)`,
                        border: `1px solid ${tc.accent}50`,
                        color: tc.accent,
                        boxShadow: `0 0 15px ${tc.accent}20, inset 0 0 15px ${tc.accent}08`,
                        textShadow: `0 0 6px ${tc.accent}40`,
                      } : {
                        background: 'rgba(30,41,59,0.4)',
                        border: '1px solid rgba(100,116,139,0.15)',
                        color: 'rgba(148,163,184,0.6)',
                      }}
                      data-testid={`tab-${tab.key}`}
                    >
                      <tab.icon className="h-3.5 w-3.5 inline mr-1.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl p-4 transition-all duration-300" style={{
                background: 'rgba(15,23,42,0.6)',
                border: `1px solid ${gaugeConfig.accent}15`,
                backdropFilter: 'blur(10px)',
              }}>
                {activeTab === "referrals" && (
                  <div className="space-y-2.5">
                    {[
                      { target: 1, label: "1st Referral", desc: "Credit reward per referral", icon: Gift, neonColor: "#00ff88", badgeText: "Earned" },
                      { target: 2, label: "2 Referrals — Premium", desc: "Premium rate for 2 months", icon: Star, neonColor: "#ffaa00", badgeText: "Unlocked" },
                      { target: 4, label: "4 Referrals — Champion", desc: "1 free session credit", icon: Trophy, neonColor: "#bf5af2", badgeText: "Champion" },
                    ].map(ms => {
                      const reached = approvedReferrals >= ms.target;
                      return (
                        <div key={ms.target} className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300" style={{
                          background: reached ? `linear-gradient(135deg, ${ms.neonColor}10, transparent)` : 'transparent',
                          border: reached ? `1px solid ${ms.neonColor}25` : '1px solid transparent',
                        }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all" style={{
                            background: reached ? ms.neonColor : 'rgba(51,65,85,0.6)',
                            boxShadow: reached ? `0 0 12px ${ms.neonColor}50` : 'none',
                          }}>
                            {reached ? <Check className="h-4 w-4 text-white" /> : <ms.icon className="h-4 w-4 text-slate-500" />}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${reached ? 'text-white' : 'text-slate-500'}`} style={reached ? { textShadow: `0 0 8px ${ms.neonColor}30` } : undefined}>{ms.label}</p>
                            <p className="text-[11px] text-slate-600">{ms.desc}</p>
                          </div>
                          {reached ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{
                              background: `${ms.neonColor}20`,
                              color: ms.neonColor,
                              border: `1px solid ${ms.neonColor}40`,
                              textShadow: `0 0 6px ${ms.neonColor}40`,
                            }}>{ms.badgeText}</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3 w-3 text-slate-700" />
                              <span className="text-xs text-slate-600 font-mono">{approvedReferrals}/{ms.target}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="pt-3 mt-1 border-t border-slate-700/30">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-black text-white">{stats?.totalReferrals || 0}</p>
                          <p className="text-[10px] text-slate-500 tracking-wider uppercase">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-black" style={{ color: '#00ff88', textShadow: '0 0 10px rgba(0,255,136,0.3)' }}>{approvedReferrals}</p>
                          <p className="text-[10px] text-slate-500 tracking-wider uppercase">Approved</p>
                        </div>
                        <div>
                          <p className="text-lg font-black" style={{ color: '#ffaa00', textShadow: '0 0 10px rgba(255,170,0,0.3)' }}>{stats?.pendingReferrals || 0}</p>
                          <p className="text-[10px] text-slate-500 tracking-wider uppercase">Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "attendance" && (
                  <div className="space-y-4">
                    <div className="text-center pb-1">
                      <p className="text-sm font-medium" style={{ color: '#ff9500', textShadow: '0 0 10px rgba(255,149,0,0.2)' }}>Attend sessions to earn credits towards your next session</p>
                      <button onClick={() => setShowAttendanceInfo(true)} className="mt-1.5 text-xs font-medium underline underline-offset-2 transition-colors" style={{ color: '#ff6b2b' }} data-testid="button-how-attendance-works">
                        How does it work?
                      </button>
                    </div>
                    {attendanceProgress && attendanceProgress.length > 0 ? (
                      attendanceProgress.map((club: any) => (
                        <div key={club.clubId} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">{club.clubName}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,43,0.15)', color: '#ff6b2b', border: '1px solid rgba(255,107,43,0.3)' }}>{club.totalAttended} attended</span>
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
                                <div key={idx} className="rounded-lg p-3 space-y-2.5" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,107,43,0.1)' }}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,107,43,0.15)' }}>
                                        <Target className="h-3.5 w-3.5" style={{ color: '#ff6b2b' }} />
                                      </div>
                                      <span className="text-xs font-semibold text-white">Every {m.sessionsRequired} sessions</span>
                                    </div>
                                    {m.milestonesCompleted > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}>{m.milestonesCompleted}x earned</span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-500">{currentInCycle} of {m.sessionsRequired} sessions</span>
                                      <span className="font-bold" style={{ color: '#ff6b2b' }}>{Math.round(m.progressPercent)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,107,43,0.1)' }}>
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.sessionsRequired > 0 ? (currentInCycle / m.sessionsRequired) * 100 : 0}%`, background: 'linear-gradient(90deg, #ff6b2b, #ff9500)', boxShadow: '0 0 8px rgba(255,107,43,0.5)' }} />
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-400">
                                    <span className="font-bold" style={{ color: '#ff9500', textShadow: '0 0 6px rgba(255,149,0,0.3)' }}>{m.sessionsUntilNext}</span> more session{m.sessionsUntilNext !== 1 ? 's' : ''} until your next credit
                                  </p>
                                  {rewardParts.length > 0 && (
                                    <div className="flex items-center gap-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(255,107,43,0.1)' }}>
                                      <Gift className="h-3 w-3 shrink-0" style={{ color: '#00ff88' }} />
                                      <p className="text-[11px] font-semibold" style={{ color: '#00ff88' }}>{rewardParts.join(" + ")}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-600 text-center py-2">No attendance rewards set up for this club yet</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Target className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(255,107,43,0.3)' }} />
                        <p className="text-xs text-slate-500">Start attending sessions to earn credits</p>
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
                          <div key={info.clubId} className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(191,90,242,0.1)' }}>
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md" style={{ background: 'rgba(191,90,242,0.15)' }}>
                                <Gift className="h-4 w-4" style={{ color: '#bf5af2', ...(isCelebration ? {} : { animation: "rewardShake 1.5s ease-in-out infinite" }) }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500">{info.clubName}</p>
                                <p className="text-sm font-semibold text-white" style={{ textShadow: '0 0 8px rgba(191,90,242,0.2)' }}>
                                  {isCelebration
                                    ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                                    : `Year ${info.upcomingYear} in ${countdownText}`}
                                </p>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(191,90,242,0.1)' }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${info.progress * 100}%`, background: 'linear-gradient(90deg, #bf5af2, #da70ff)', boxShadow: '0 0 8px rgba(191,90,242,0.5)' }} />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {isCelebration ? "Anniversary rewards have been issued!" : `${Math.round(info.progress * 100)}% through year ${info.upcomingYear}`}
                            </p>
                            {info.hasReward && (
                              <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(191,90,242,0.1)' }}>
                                <Award className="h-3 w-3 shrink-0" style={{ color: '#bf5af2' }} />
                                <p className="text-[11px] font-semibold" style={{ color: '#bf5af2' }}>
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
                        <CalendarDays className="h-8 w-8 mx-auto mb-2" style={{ color: 'rgba(191,90,242,0.3)' }} />
                        <p className="text-xs text-slate-500">Anniversary milestones will appear as you stay with your clubs</p>
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

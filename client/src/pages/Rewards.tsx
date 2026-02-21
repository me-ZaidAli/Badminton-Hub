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
  const viewBox = 280;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
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
    <div className="relative w-full flex items-center justify-center" data-testid="ev-gauge">
      <div className="relative w-full" style={{ maxWidth: '320px', aspectRatio: '1' }}>
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="w-full h-full">
          <defs>
            <filter id="barGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
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

          {milestones.map((ms, i) => {
            const angle = (ms.barIndex * gapAngle) - 90;
            const rad = (angle * Math.PI) / 180;
            const labelR = radius + milestoneHeight / 2 + 16;
            const lx = cx + labelR * Math.cos(rad);
            const ly = cy + labelR * Math.sin(rad);
            return (
              <text
                key={`lbl-${i}`}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fontWeight="700"
                letterSpacing="0.1em"
                fill={ms.reached ? accentColor : 'rgba(100,116,139,0.4)'}
                style={ms.reached ? { filter: `drop-shadow(0 0 4px ${glowColor})` } : undefined}
              >
                {ms.label}
              </text>
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">{children}</div>
      </div>
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
  const { data: pointsProgress } = useQuery<any[]>({ queryKey: ["/api/my-points-progress"] });
  const { data: gradeProgress } = useQuery<any[]>({ queryKey: ["/api/my-grade-progress"] });
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("referrals");
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [showAttendanceInfo, setShowAttendanceInfo] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedClubId(null);
  }, [activeTab]);

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
  const perClubStats = referralData?.perClubStats || [];
  const totalAvailableCredits = rewardsSummary?.totalCredits || 0;
  const totalFreeSessions = rewardsSummary?.totalFreeSessions || 0;
  const totalRewards = rewardsSummary?.totalRewards || 0;

  const availableRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "AVAILABLE"), [rewards]);
  const requestedRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "REQUESTED"), [rewards]);
  const usedRewards = useMemo(() => (rewards || []).filter((r: any) => r.status === "USED"), [rewards]);

  const statusColors: Record<string, string> = { AVAILABLE: "bg-emerald-500 text-white", REQUESTED: "bg-amber-500 text-white", USED: "bg-muted text-muted-foreground" };
  const typeLabels: Record<string, string> = { REFERRAL: "Referral", SESSION_ATTENDANCE: "Attendance", ANNIVERSARY: "Anniversary", GIFT: "Gift", MANUAL: "Manual", POINTS: "Points", GRADE: "Grade" };

  const tabThemes: Record<string, { accent: string; glow: string }> = {
    referrals: { accent: "#00e5ff", glow: "#00b8d4" },
    attendance: { accent: "#76ff03", glow: "#64dd17" },
    anniversary: { accent: "#e040fb", glow: "#d500f9" },
    points: { accent: "#ff9100", glow: "#ff6d00" },
    grades: { accent: "#7c4dff", glow: "#651fff" },
  };

  const barCount = 54;

  const clubList = useMemo(() => {
    if (activeTab === "referrals") {
      return perClubStats.map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    if (activeTab === "attendance") {
      return (attendanceProgress || []).map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    if (activeTab === "anniversary") {
      return (anniversaryData || []).map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    if (activeTab === "points") {
      return (pointsProgress || []).map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    if (activeTab === "grades") {
      return (gradeProgress || []).map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    return [];
  }, [activeTab, perClubStats, attendanceProgress, anniversaryData, pointsProgress, gradeProgress]);

  const gaugeConfig = useMemo(() => {
    const theme = tabThemes[activeTab] || tabThemes.referrals;

    if (activeTab === "referrals") {
      const clubData = selectedClubId
        ? perClubStats.find((c: any) => c.clubId === selectedClubId)
        : null;

      const approved = clubData ? clubData.approvedReferrals : (stats?.approvedReferrals || 0);
      const total = clubData ? clubData.totalReferrals : (stats?.totalReferrals || 0);
      const pending = clubData ? clubData.pendingReferrals : (stats?.pendingReferrals || 0);
      const clubName = clubData ? clubData.clubName : "All Clubs";

      const maxRefs = 4;
      const pct = Math.min((approved / maxRefs) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { barIndex: Math.round(barCount * 0.25), label: "1st", reached: approved >= 1 },
        { barIndex: Math.round(barCount * 0.50), label: "PREM", reached: approved >= 2 },
        { barIndex: barCount - 1, label: "CHAMP", reached: approved >= 4 },
      ];
      const stage = approved >= 4 ? "All Milestones" : approved >= 2 ? "Premium Active" : approved >= 1 ? "Progress Active" : "Not Started";
      const nextTarget = approved < 1 ? 1 : approved < 2 ? 2 : approved < 4 ? 4 : 4;
      const remaining = Math.max(nextTarget - approved, 0);
      const nextLabel = approved < 1 ? "1st Referral" : approved < 2 ? "Premium" : approved < 4 ? "Champion" : "";
      return { pct, milestones, value: `${approved}`, unit: "Referrals", stage, remaining, nextLabel, clubName, total, approved, pending, ...theme };
    }

    if (activeTab === "attendance") {
      const clubs = attendanceProgress || [];
      const clubData = selectedClubId ? clubs.find((c: any) => c.clubId === selectedClubId) : null;

      if (!clubData && selectedClubId) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Sessions", stage: "No Data", remaining: 0, nextLabel: "", clubName: "", ...theme };

      if (!clubData) {
        let best: any = null;
        for (const club of clubs) {
          if (club.milestones && club.milestones.length > 0) {
            const closest = club.milestones.reduce((a: any, b: any) => a.sessionsUntilNext < b.sessionsUntilNext ? a : b);
            if (!best || closest.sessionsUntilNext < best.sessionsUntilNext) best = { ...closest, clubName: club.clubName, totalAttended: club.totalAttended };
          }
        }
        if (!best) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Sessions", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "All Clubs", ...theme };
        const sr = best.sessionsRequired;
        const currentInCycle = best.currentCount % sr;
        const pct = sr > 0 ? (currentInCycle / sr) * 100 : 0;
        const milestones: GaugeMilestone[] = [{ barIndex: barCount - 1, label: `${sr}`, reached: false }];
        if (sr >= 4) {
          milestones.unshift({ barIndex: Math.round(barCount * 0.25), label: `${Math.ceil(sr * 0.25)}`, reached: currentInCycle >= Math.ceil(sr * 0.25) });
          milestones.splice(1, 0, { barIndex: Math.round(barCount * 0.50), label: `${Math.ceil(sr * 0.5)}`, reached: currentInCycle >= Math.ceil(sr * 0.5) });
          milestones.splice(2, 0, { barIndex: Math.round(barCount * 0.75), label: `${Math.ceil(sr * 0.75)}`, reached: currentInCycle >= Math.ceil(sr * 0.75) });
        }
        return { pct, milestones, value: `${currentInCycle}`, unit: `of ${sr}`, stage: best.milestonesCompleted > 0 ? `${best.milestonesCompleted}x Earned` : "Progress Active", remaining: best.sessionsUntilNext, nextLabel: "next credit", clubName: best.clubName, ...theme };
      }

      const firstMs = clubData.milestones?.[0];
      if (!firstMs) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Sessions", stage: "No Milestones", remaining: 0, nextLabel: "", clubName: clubData.clubName, ...theme };
      const sr = firstMs.sessionsRequired;
      const currentInCycle = firstMs.currentCount % sr;
      const pct = sr > 0 ? (currentInCycle / sr) * 100 : 0;
      const milestones: GaugeMilestone[] = [{ barIndex: barCount - 1, label: `${sr}`, reached: false }];
      if (sr >= 4) {
        milestones.unshift({ barIndex: Math.round(barCount * 0.25), label: `${Math.ceil(sr * 0.25)}`, reached: currentInCycle >= Math.ceil(sr * 0.25) });
        milestones.splice(1, 0, { barIndex: Math.round(barCount * 0.50), label: `${Math.ceil(sr * 0.5)}`, reached: currentInCycle >= Math.ceil(sr * 0.5) });
        milestones.splice(2, 0, { barIndex: Math.round(barCount * 0.75), label: `${Math.ceil(sr * 0.75)}`, reached: currentInCycle >= Math.ceil(sr * 0.75) });
      }
      return { pct, milestones, value: `${currentInCycle}`, unit: `of ${sr}`, stage: firstMs.milestonesCompleted > 0 ? `${firstMs.milestonesCompleted}x Earned` : "Progress Active", remaining: firstMs.sessionsUntilNext, nextLabel: "next credit", clubName: clubData.clubName, ...theme };
    }

    if (activeTab === "anniversary") {
      const allAnniv = anniversaryData || [];
      if (allAnniv.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Years", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const info: any = selectedClubId ? allAnniv.find((a: any) => a.clubId === selectedClubId) : allAnniv[0];
      if (!info) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Years", stage: "No Data", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const pct = Math.min((info.progress || 0) * 100, 100);
      const milestones: GaugeMilestone[] = [
        { barIndex: Math.round(barCount * 0.25), label: "Q1", reached: pct >= 25 },
        { barIndex: Math.round(barCount * 0.50), label: "Q2", reached: pct >= 50 },
        { barIndex: Math.round(barCount * 0.75), label: "Q3", reached: pct >= 75 },
        { barIndex: barCount - 1, label: `YR${info.upcomingYear}`, reached: pct >= 99 },
      ];
      const diff = new Date(info.nextAnniversary).getTime() - Date.now();
      const daysLeft = Math.max(Math.floor(diff / 86400000), 0);
      return { pct, milestones, value: `${info.upcomingYear || 1}`, unit: daysLeft > 0 ? `${daysLeft}d left` : "Today!", stage: info.clubName, remaining: daysLeft, nextLabel: "anniversary", clubName: info.clubName, ...theme };
    }

    if (activeTab === "points") {
      const allPoints = pointsProgress || [];
      if (allPoints.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Points", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const club: any = selectedClubId ? allPoints.find((c: any) => c.clubId === selectedClubId) : allPoints[0];
      if (!club) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Points", stage: "No Data", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const nextMs = club.nextMilestone;
      const maxPoints = nextMs ? nextMs.pointsRequired : (club.milestones.length > 0 ? club.milestones[club.milestones.length - 1].pointsRequired : 100);
      const pct = Math.min((club.currentPoints / maxPoints) * 100, 100);

      const msCount = club.milestones.length;
      const milestones: GaugeMilestone[] = club.milestones.map((m: any, idx: number) => ({
        barIndex: msCount > 1 ? Math.round(barCount * ((idx + 1) / msCount)) - 1 : barCount - 1,
        label: `${m.pointsRequired}`,
        reached: m.reached,
      }));

      const reached = club.milestones.filter((m: any) => m.reached).length;
      const remaining = nextMs ? nextMs.pointsUntil : 0;
      return { pct, milestones, value: `${club.currentPoints}`, unit: "Points", stage: reached > 0 ? `${reached} Unlocked` : "Progress Active", remaining, nextLabel: nextMs ? `${nextMs.pointsRequired} pts` : "", clubName: club.clubName, ...theme };
    }

    if (activeTab === "grades") {
      const GRADE_ORDER = ["D3", "D2", "D1", "C3", "C2", "C1", "B3", "B2", "B1"];
      const allGrades = gradeProgress || [];
      if (allGrades.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "—", unit: "Grade", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const club: any = selectedClubId ? allGrades.find((c: any) => c.clubId === selectedClubId) : allGrades[0];
      if (!club) return { pct: 0, milestones: [] as GaugeMilestone[], value: "—", unit: "Grade", stage: "No Data", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const pct = club.progressPercent || 0;
      const msCount = club.gradeRewards.length;
      const milestones: GaugeMilestone[] = club.gradeRewards.map((g: any, idx: number) => ({
        barIndex: msCount > 1 ? Math.round(barCount * ((idx + 1) / msCount)) - 1 : barCount - 1,
        label: g.grade,
        reached: g.reached,
      }));

      const nextG = club.nextTarget;
      const gradeRemaining = nextG && club.currentGradeIndex >= 0 ? Math.max(GRADE_ORDER.indexOf(nextG.grade) - club.currentGradeIndex, 0) : 0;
      return { pct, milestones, value: club.currentGrade || "—", unit: "Current Grade", stage: `${club.totalReached}/${club.totalConfigured} Achieved`, remaining: gradeRemaining, nextLabel: nextG ? nextG.grade : "", clubName: club.clubName, ...theme };
    }

    return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };
  }, [activeTab, selectedClubId, stats, perClubStats, attendanceProgress, anniversaryData, pointsProgress, gradeProgress]);

  const handleClubClick = (clubId: number) => {
    setSelectedClubId(prev => prev === clubId ? null : clubId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-rewards-back"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">My Rewards</h1>
        </div>

        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #060b14 0%, #0b1120 25%, #0d1424 50%, #0a0f1c 75%, #060b14 100%)' }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : activeTab === 'points' ? '255,145,0' : activeTab === 'grades' ? '124,77,255' : '224,64,251'},0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : activeTab === 'points' ? '255,145,0' : activeTab === 'grades' ? '124,77,255' : '224,64,251'},0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(ellipse at 50% 30%, ${gaugeConfig.accent}08 0%, transparent 60%)`,
          }} />

          <div className="relative px-3 pt-3 pb-4">
            <div className="flex gap-1.5 justify-center mb-2">
              {[
                { key: "referrals", label: "Referrals", icon: Users },
                { key: "attendance", label: "Attend", icon: Target },
                { key: "anniversary", label: "Anniv", icon: CalendarDays },
                { key: "points", label: "Points", icon: TrendingUp },
                { key: "grades", label: "Grades", icon: Award },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                const tc = tabThemes[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 py-2 rounded-lg text-[9px] sm:text-[10px] font-semibold transition-all duration-300 tracking-wider uppercase text-center"
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
                    <tab.icon className="h-3 w-3 inline mr-0.5" style={{ opacity: isActive ? 1 : 0.5 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {clubList.length > 1 && (
              <div className="flex gap-1.5 justify-center mb-1 flex-wrap">
                {clubList.map((club: any) => {
                  const isSelected = selectedClubId === club.id;
                  return (
                    <button
                      key={club.id}
                      onClick={() => handleClubClick(club.id)}
                      className="px-3 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 tracking-wide"
                      style={isSelected ? {
                        background: `${gaugeConfig.accent}18`,
                        border: `1px solid ${gaugeConfig.accent}40`,
                        color: gaugeConfig.accent,
                        boxShadow: `0 0 10px ${gaugeConfig.accent}15`,
                      } : {
                        background: 'rgba(15,25,40,0.5)',
                        border: '1px solid rgba(50,65,85,0.2)',
                        color: 'rgba(100,116,139,0.6)',
                      }}
                      data-testid={`club-filter-${club.id}`}
                    >
                      {club.name}
                    </button>
                  );
                })}
              </div>
            )}

            <EVGauge
              percentage={gaugeConfig.pct}
              milestones={gaugeConfig.milestones}
              accentColor={gaugeConfig.accent}
              glowColor={gaugeConfig.glow}
            >
              <p className="text-5xl sm:text-6xl font-black text-white leading-none" style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                textShadow: `0 0 40px ${gaugeConfig.accent}30, 0 0 80px ${gaugeConfig.glow}15`,
                letterSpacing: '-2px',
              }}>
                {gaugeConfig.value}
              </p>
              <p className="text-[10px] sm:text-[11px] mt-1 font-semibold tracking-[0.2em] uppercase" style={{ color: `${gaugeConfig.accent}90` }}>
                {gaugeConfig.unit}
              </p>
              <div className="mt-2 px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] uppercase" style={{
                background: `${gaugeConfig.accent}0a`,
                border: `1px solid ${gaugeConfig.accent}25`,
                color: `${gaugeConfig.accent}cc`,
              }}>
                {gaugeConfig.stage}
              </div>
              {gaugeConfig.remaining > 0 && gaugeConfig.nextLabel && (
                <p className="text-[9px] sm:text-[10px] mt-1 tracking-wide" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  {gaugeConfig.remaining} more for {gaugeConfig.nextLabel}
                </p>
              )}
            </EVGauge>

            <div className="mt-2 rounded-xl p-3 transition-all duration-500" style={{
              background: 'rgba(10,16,28,0.7)',
              border: `1px solid ${gaugeConfig.accent}10`,
              backdropFilter: 'blur(10px)',
            }}>
              {activeTab === "referrals" && (() => {
                const clubData = selectedClubId ? perClubStats.find((c: any) => c.clubId === selectedClubId) : null;
                const approved = clubData ? clubData.approvedReferrals : (stats?.approvedReferrals || 0);
                const total = clubData ? clubData.totalReferrals : (stats?.totalReferrals || 0);
                const pending = clubData ? clubData.pendingReferrals : (stats?.pendingReferrals || 0);

                return (
                  <div className="space-y-2">
                    {[
                      { target: 1, label: "1st Referral", desc: "Credit reward per referral", icon: Gift, badgeText: "Earned" },
                      { target: 2, label: "2 Referrals — Premium", desc: "Premium rate for 2 months", icon: Star, badgeText: "Unlocked" },
                      { target: 4, label: "4 Referrals — Champion", desc: "1 free session credit", icon: Trophy, badgeText: "Champion" },
                    ].map(ms => {
                      const reached = approved >= ms.target;
                      return (
                        <div key={ms.target} className="flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-300" style={{
                          background: reached ? `${gaugeConfig.accent}08` : 'rgba(20,30,45,0.3)',
                          border: `1px solid ${reached ? `${gaugeConfig.accent}20` : 'rgba(50,65,85,0.15)'}`,
                        }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                            background: reached ? `${gaugeConfig.accent}15` : 'rgba(30,45,60,0.5)',
                            border: `1px solid ${reached ? `${gaugeConfig.accent}30` : 'rgba(50,65,85,0.2)'}`,
                          }}>
                            {reached ? <Check className="h-3.5 w-3.5" style={{ color: gaugeConfig.accent }} /> : <ms.icon className="h-3.5 w-3.5" style={{ color: 'rgba(100,116,139,0.3)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: reached ? 'rgba(255,255,255,0.9)' : 'rgba(100,116,139,0.5)' }}>{ms.label}</p>
                            <p className="text-[10px] truncate" style={{ color: 'rgba(100,116,139,0.4)' }}>{ms.desc}</p>
                          </div>
                          {reached ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0" style={{
                              background: `${gaugeConfig.accent}12`,
                              color: gaugeConfig.accent,
                              border: `1px solid ${gaugeConfig.accent}25`,
                            }}>{ms.badgeText}</span>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <Lock className="h-3 w-3" style={{ color: 'rgba(50,65,85,0.6)' }} />
                              <span className="text-[11px] font-mono" style={{ color: 'rgba(100,116,139,0.4)' }}>{approved}/{ms.target}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {perClubStats.length > 0 && (
                      <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(50,65,85,0.2)' }}>
                        {perClubStats.map((club: any) => {
                          const isSelected = selectedClubId === club.clubId;
                          return (
                            <button
                              key={club.clubId}
                              onClick={() => handleClubClick(club.clubId)}
                              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 text-left"
                              style={{
                                background: isSelected ? `${gaugeConfig.accent}10` : 'rgba(15,25,35,0.4)',
                                border: `1px solid ${isSelected ? `${gaugeConfig.accent}30` : 'rgba(50,65,85,0.12)'}`,
                              }}
                              data-testid={`referral-club-${club.clubId}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: isSelected ? gaugeConfig.accent : 'rgba(200,210,220,0.8)' }}>{club.clubName}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-center">
                                  <p className="text-sm font-black font-mono" style={{ color: gaugeConfig.accent }}>{club.approvedReferrals}</p>
                                  <p className="text-[8px] tracking-wider uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>OK</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-black font-mono" style={{ color: '#ffaa00' }}>{club.pendingReferrals}</p>
                                  <p className="text-[8px] tracking-wider uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Wait</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-2" style={{ borderTop: '1px solid rgba(50,65,85,0.2)' }}>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-base font-black text-white font-mono">{total}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Total</p>
                        </div>
                        <div>
                          <p className="text-base font-black font-mono" style={{ color: gaugeConfig.accent }}>{approved}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Approved</p>
                        </div>
                        <div>
                          <p className="text-base font-black font-mono" style={{ color: '#ffaa00' }}>{pending}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: 'rgba(100,116,139,0.4)' }}>Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === "attendance" && (
                <div className="space-y-3">
                  <div className="text-center pb-1">
                    <p className="text-xs font-medium" style={{ color: `${gaugeConfig.accent}cc` }}>Attend sessions to earn credits</p>
                    <button onClick={() => setShowAttendanceInfo(true)} className="mt-1 text-[11px] font-medium underline underline-offset-2 transition-colors" style={{ color: `${gaugeConfig.accent}80` }} data-testid="button-how-attendance-works">
                      How does it work?
                    </button>
                  </div>
                  {attendanceProgress && attendanceProgress.length > 0 ? (
                    attendanceProgress.map((club: any) => {
                      const isSelected = selectedClubId === club.clubId;
                      return (
                        <button
                          key={club.clubId}
                          onClick={() => handleClubClick(club.clubId)}
                          className="w-full text-left rounded-lg p-3 space-y-2 transition-all duration-200"
                          style={{
                            background: isSelected ? `${gaugeConfig.accent}08` : 'rgba(15,25,35,0.5)',
                            border: `1px solid ${isSelected ? `${gaugeConfig.accent}25` : `${gaugeConfig.accent}08`}`,
                          }}
                          data-testid={`attendance-club-${club.clubId}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: isSelected ? gaugeConfig.accent : 'rgba(200,210,220,0.9)' }}>{club.clubName}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.totalAttended} attended</span>
                          </div>
                          {club.milestones && club.milestones.length > 0 ? (
                            club.milestones.map((m: any, idx: number) => {
                              const config = m.rewardConfig || {};
                              const rewardParts: string[] = [];
                              if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)}`);
                              if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free`);
                              if (config.gifts) rewardParts.push(config.gifts);
                              const currentInCycle = m.currentCount % m.sessionsRequired;
                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>Every {m.sessionsRequired} sessions</span>
                                    {m.milestonesCompleted > 0 && <span className="text-[9px] font-bold" style={{ color: gaugeConfig.accent }}>{m.milestonesCompleted}x earned</span>}
                                  </div>
                                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: `${gaugeConfig.accent}10` }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.sessionsRequired > 0 ? (currentInCycle / m.sessionsRequired) * 100 : 0}%`, background: gaugeConfig.accent, boxShadow: `0 0 6px ${gaugeConfig.accent}50` }} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{currentInCycle}/{m.sessionsRequired}</span>
                                    {rewardParts.length > 0 && <span className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")}</span>}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>No milestones set</p>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <Target className="h-6 w-6 mx-auto mb-1.5" style={{ color: 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Start attending to earn credits</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "anniversary" && (
                <div className="space-y-2">
                  <style>{`@keyframes rewardShake { 0%, 100% { transform: rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); } 20%, 40%, 60%, 80% { transform: rotate(8deg); } }`}</style>
                  {anniversaryData && anniversaryData.length > 0 ? (
                    anniversaryData.map((info: any) => {
                      const now = Date.now();
                      const target = new Date(info.nextAnniversary).getTime();
                      const diff = target - now;
                      const isCelebration = info.progress >= 0.99 || diff <= 0;
                      const isSelected = selectedClubId === info.clubId;
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
                        <button
                          key={info.clubId}
                          onClick={() => handleClubClick(info.clubId)}
                          className="w-full text-left rounded-lg p-3 space-y-2 transition-all duration-200"
                          style={{
                            background: isSelected ? `${gaugeConfig.accent}08` : 'rgba(15,25,35,0.5)',
                            border: `1px solid ${isSelected ? `${gaugeConfig.accent}25` : `${gaugeConfig.accent}08`}`,
                          }}
                          data-testid={`anniversary-club-${info.clubId}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md shrink-0" style={{ background: `${gaugeConfig.accent}12` }}>
                              <Gift className="h-3.5 w-3.5" style={{ color: `${gaugeConfig.accent}cc`, ...(isCelebration ? {} : { animation: "rewardShake 1.5s ease-in-out infinite" }) }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px]" style={{ color: isSelected ? `${gaugeConfig.accent}cc` : 'rgba(100,116,139,0.5)' }}>{info.clubName}</p>
                              <p className="text-xs font-semibold text-white truncate">
                                {isCelebration
                                  ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                                  : `Year ${info.upcomingYear} in ${countdownText}`}
                              </p>
                            </div>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: `${gaugeConfig.accent}10` }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${info.progress * 100}%`, background: gaugeConfig.accent, boxShadow: `0 0 6px ${gaugeConfig.accent}50` }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.5)' }}>
                              {isCelebration ? "Rewards issued!" : `${Math.round(info.progress * 100)}% through year ${info.upcomingYear}`}
                            </p>
                            {info.hasReward && (
                              <p className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>
                                {info.rewardCredits ? `£${(info.rewardCredits / 100).toFixed(2)}` : ""}
                                {info.rewardCredits && info.rewardGifts ? " + " : ""}
                                {info.rewardGifts || ""}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <CalendarDays className="h-6 w-6 mx-auto mb-1.5" style={{ color: 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Anniversary milestones will appear over time</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "points" && (
                <div className="space-y-2">
                  {pointsProgress && pointsProgress.length > 0 ? (
                    pointsProgress.map((club: any) => {
                      const isSelected = selectedClubId === club.clubId;
                      return (
                        <button
                          key={club.clubId}
                          onClick={() => handleClubClick(club.clubId)}
                          className="w-full text-left rounded-lg p-3 space-y-2 transition-all duration-200"
                          style={{
                            background: isSelected ? `${gaugeConfig.accent}08` : 'rgba(15,25,35,0.5)',
                            border: `1px solid ${isSelected ? `${gaugeConfig.accent}25` : `${gaugeConfig.accent}08`}`,
                          }}
                          data-testid={`points-club-${club.clubId}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: isSelected ? gaugeConfig.accent : 'rgba(200,210,220,0.9)' }}>{club.clubName}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.currentPoints} pts</span>
                          </div>
                          {club.milestones && club.milestones.length > 0 ? (
                            club.milestones.map((m: any, idx: number) => {
                              const config = m.rewardConfig || {};
                              const rewardParts: string[] = [];
                              if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)}`);
                              if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free`);
                              if (config.gifts) rewardParts.push(config.gifts);
                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px]" style={{ color: 'rgba(100,116,139,0.5)' }}>{m.pointsRequired} points</span>
                                    {m.reached ? (
                                      <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: gaugeConfig.accent }}><Check className="h-3 w-3" /> Reached</span>
                                    ) : (
                                      <span className="text-[9px]" style={{ color: 'rgba(100,116,139,0.4)' }}>{m.pointsUntil} pts to go</span>
                                    )}
                                  </div>
                                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: `${gaugeConfig.accent}10` }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((club.currentPoints / m.pointsRequired) * 100, 100)}%`, background: gaugeConfig.accent, boxShadow: `0 0 6px ${gaugeConfig.accent}50` }} />
                                  </div>
                                  {rewardParts.length > 0 && (
                                    <div className="flex justify-end">
                                      <span className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>No milestones set</p>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <TrendingUp className="h-6 w-6 mx-auto mb-1.5" style={{ color: 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Earn ranking points from matches to unlock rewards</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "grades" && (
                <div className="space-y-2">
                  {gradeProgress && gradeProgress.length > 0 ? (
                    gradeProgress.map((club: any) => {
                      const isSelected = selectedClubId === club.clubId;
                      return (
                        <button
                          key={club.clubId}
                          onClick={() => handleClubClick(club.clubId)}
                          className="w-full text-left rounded-lg p-3 space-y-2 transition-all duration-200"
                          style={{
                            background: isSelected ? `${gaugeConfig.accent}08` : 'rgba(15,25,35,0.5)',
                            border: `1px solid ${isSelected ? `${gaugeConfig.accent}25` : `${gaugeConfig.accent}08`}`,
                          }}
                          data-testid={`grades-club-${club.clubId}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: isSelected ? gaugeConfig.accent : 'rgba(200,210,220,0.9)' }}>{club.clubName}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.currentGrade || "Ungraded"}</span>
                          </div>
                          {club.gradeRewards && club.gradeRewards.length > 0 ? (
                            club.gradeRewards.map((g: any, idx: number) => {
                              const config = g.rewardConfig || {};
                              const rewardParts: string[] = [];
                              if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)}`);
                              if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free`);
                              if (config.gifts) rewardParts.push(config.gifts);
                              return (
                                <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: `${gaugeConfig.accent}08` }}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold w-6" style={{ color: g.reached ? gaugeConfig.accent : 'rgba(100,116,139,0.5)' }}>{g.grade}</span>
                                    {g.reached ? (
                                      <Check className="h-3 w-3" style={{ color: gaugeConfig.accent }} />
                                    ) : (
                                      <Lock className="h-3 w-3" style={{ color: 'rgba(100,116,139,0.3)' }} />
                                    )}
                                  </div>
                                  {rewardParts.length > 0 && (
                                    <span className="text-[10px] font-semibold" style={{ color: g.reached ? `${gaugeConfig.accent}cc` : 'rgba(100,116,139,0.4)' }}>{rewardParts.join(" + ")}</span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px]" style={{ color: 'rgba(100,116,139,0.4)' }}>No grade rewards set</p>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <Award className="h-6 w-6 mx-auto mb-1.5" style={{ color: 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: 'rgba(100,116,139,0.4)' }}>Grade achievement rewards will appear as you progress</p>
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
            <InfoRow icon={Users} label="Approved referrals" value={`${stats?.approvedReferrals || 0}`} onClick={() => setActiveTab("referrals")} />
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

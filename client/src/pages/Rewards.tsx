import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Gift, Star, Trophy, Award, ChevronRight, Info, Users, PoundSterling, CalendarDays, Target, TrendingUp, Lock, Check, Eye, Zap, Flame, Sparkles, Medal, Shield, Crown } from "lucide-react";
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
  isStandard,
  children,
}: {
  percentage: number;
  milestones: GaugeMilestone[];
  accentColor: string;
  glowColor: string;
  isStandard?: boolean;
  children?: React.ReactNode;
}) {
  const viewBox = 340;
  const cx = viewBox / 2;
  const cy = viewBox / 2;
  const barCount = 54;
  const radius = 120;
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
      <div className="relative w-full" style={{ maxWidth: '260px', aspectRatio: '1' }}>
        <svg viewBox={`0 0 ${viewBox} ${viewBox}`} className="w-full h-full">
          {!isStandard && (
            <defs>
              <filter id="barGlow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          )}

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

            const inactiveColor = isStandard
              ? (isMilestone ? "rgba(160,170,180,0.45)" : "rgba(180,190,200,0.3)")
              : (isMilestone ? "rgba(50,65,85,0.5)" : "rgba(40,55,70,0.35)");

            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isFilled ? accentColor : inactiveColor}
                strokeWidth={barWidth}
                strokeLinecap="round"
                style={{
                  transition: `stroke 0.08s ease ${i * 15}ms`,
                  filter: isFilled && !isStandard ? 'url(#barGlow)' : 'none',
                }}
              />
            );
          })}

          <circle cx={cx} cy={cy} r={radius - normalHeight / 2 - 8} fill="none" stroke={isStandard ? "rgba(160,170,180,0.2)" : "rgba(50,65,85,0.12)"} strokeWidth={0.5} />
          <circle cx={cx} cy={cy} r={radius + normalHeight / 2 + 8} fill="none" stroke={isStandard ? "rgba(160,170,180,0.15)" : "rgba(50,65,85,0.08)"} strokeWidth={0.5} />

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
                fill={ms.reached ? accentColor : (isStandard ? 'rgba(120,130,140,0.7)' : 'rgba(100,116,139,0.4)')}
                style={ms.reached && !isStandard ? { filter: `drop-shadow(0 0 4px ${glowColor})` } : undefined}
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
  const { data: badgeProgress } = useQuery<any[]>({ queryKey: ["/api/my-badge-progress"] });
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("referrals");
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [showAttendanceInfo, setShowAttendanceInfo] = useState(false);
  const [gaugeViewMode, setGaugeViewMode] = useState<'futuristic' | 'standard'>(() => {
    try { return (localStorage.getItem('rewards-view-mode') as any) || 'futuristic'; } catch { return 'futuristic'; }
  });
  const isStd = gaugeViewMode === 'standard';
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
  const typeLabels: Record<string, string> = { REFERRAL: "Referral", SESSION_ATTENDANCE: "Attendance", ANNIVERSARY: "Anniversary", GIFT: "Gift", MANUAL: "Manual", POINTS: "Points", GRADE: "Badge" };

  const tabThemesFuturistic: Record<string, { accent: string; glow: string }> = {
    referrals: { accent: "#00e5ff", glow: "#00b8d4" },
    attendance: { accent: "#76ff03", glow: "#64dd17" },
    anniversary: { accent: "#e040fb", glow: "#d500f9" },
    points: { accent: "#ff9100", glow: "#ff6d00" },
    badges: { accent: "#7c4dff", glow: "#651fff" },
  };
  const tabThemesStandard: Record<string, { accent: string; glow: string }> = {
    referrals: { accent: "#0891b2", glow: "#0891b2" },
    attendance: { accent: "#16a34a", glow: "#16a34a" },
    anniversary: { accent: "#9333ea", glow: "#9333ea" },
    points: { accent: "#ea580c", glow: "#ea580c" },
    badges: { accent: "#7c3aed", glow: "#7c3aed" },
  };
  const tabThemes = isStd ? tabThemesStandard : tabThemesFuturistic;

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
    if (activeTab === "badges") {
      return (badgeProgress || []).map((c: any) => ({ id: c.clubId, name: c.clubName }));
    }
    return [];
  }, [activeTab, perClubStats, attendanceProgress, anniversaryData, pointsProgress, badgeProgress]);

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
      const maxPoints = nextMs ? nextMs.nextThreshold || nextMs.pointsRequired : (club.milestones.length > 0 ? club.milestones[club.milestones.length - 1].pointsRequired : 100);
      const pct = Math.min((club.currentPoints / maxPoints) * 100, 100);

      const msCount = club.milestones.length;
      const milestones: GaugeMilestone[] = club.milestones.map((m: any, idx: number) => ({
        barIndex: msCount > 1 ? Math.round(barCount * ((idx + 1) / msCount)) - 1 : barCount - 1,
        label: m.isRepeating ? `${m.pointsRequired}x` : `${m.pointsRequired}`,
        reached: m.reached,
      }));

      const totalTimesEarned = club.milestones.reduce((sum: number, m: any) => sum + (m.timesEarned || 0), 0);
      const remaining = nextMs ? (nextMs.pointsUntilNext || nextMs.pointsUntil) : 0;
      return { pct, milestones, value: `${club.currentPoints}`, unit: "Points", stage: totalTimesEarned > 0 ? `${totalTimesEarned}x Earned` : "Progress Active", remaining, nextLabel: nextMs ? `${nextMs.nextThreshold || nextMs.pointsRequired} pts` : "", clubName: club.clubName, ...theme };
    }

    if (activeTab === "badges") {
      const allBadges = badgeProgress || [];
      if (allBadges.length === 0) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Badges", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const club: any = selectedClubId ? allBadges.find((c: any) => c.clubId === selectedClubId) : allBadges[0];
      if (!club) return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "Badges", stage: "No Data", remaining: 0, nextLabel: "", clubName: "", ...theme };

      const pct = club.totalBadges > 0 ? (club.earnedCount / club.totalBadges) * 100 : 0;
      const milestones: GaugeMilestone[] = club.badges.map((b: any, idx: number) => ({
        barIndex: Math.round(barCount * ((idx + 1) / club.totalBadges)) - 1,
        label: b.name.split(" ")[0].substring(0, 4).toUpperCase(),
        reached: b.earned,
      }));

      const nextBadge = club.badges.find((b: any) => !b.earned);
      return { pct, milestones, value: `${club.earnedCount}`, unit: `of ${club.totalBadges} Badges`, stage: club.earnedCount > 0 ? `${club.earnedCount} Earned` : "Collect Badges", remaining: nextBadge ? 1 : 0, nextLabel: nextBadge ? nextBadge.name : "", clubName: club.clubName, ...theme };
    }

    return { pct: 0, milestones: [] as GaugeMilestone[], value: "0", unit: "", stage: "Not Started", remaining: 0, nextLabel: "", clubName: "", ...theme };
  }, [activeTab, selectedClubId, stats, perClubStats, attendanceProgress, anniversaryData, pointsProgress, badgeProgress]);

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
          <h1 className="text-xl font-bold flex-1">My Rewards</h1>
          <button
            onClick={() => {
              const next = gaugeViewMode === 'futuristic' ? 'standard' : 'futuristic';
              setGaugeViewMode(next);
              try { localStorage.setItem('rewards-view-mode', next); } catch {}
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide transition-all border"
            style={isStd ? {
              background: 'hsl(var(--muted))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            } : {
              background: 'rgba(20,30,50,0.8)',
              borderColor: 'rgba(0,229,255,0.3)',
              color: '#00e5ff',
            }}
            data-testid="button-toggle-view-mode"
          >
            {isStd ? <Zap className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {isStd ? "Neon" : "Standard"}
          </button>
        </div>

        <div className="relative rounded-2xl" style={isStd ? {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        } : {
          background: 'linear-gradient(145deg, #060b14 0%, #0b1120 25%, #0d1424 50%, #0a0f1c 75%, #060b14 100%)',
        }}>
          {!isStd && (
            <>
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backgroundImage: `
                  linear-gradient(rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : activeTab === 'points' ? '255,145,0' : activeTab === 'badges' ? '124,77,255' : '224,64,251'},0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(${activeTab === 'referrals' ? '0,229,255' : activeTab === 'attendance' ? '118,255,3' : activeTab === 'points' ? '255,145,0' : activeTab === 'badges' ? '124,77,255' : '224,64,251'},0.03) 1px, transparent 1px)
                `,
                backgroundSize: '32px 32px',
              }} />
              <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                backgroundImage: `radial-gradient(ellipse at 50% 30%, ${gaugeConfig.accent}08 0%, transparent 60%)`,
              }} />
            </>
          )}

          <div className="relative px-3 pt-3 pb-4">
            <div className="flex gap-1.5 justify-center mb-2">
              {[
                { key: "referrals", label: "Referrals", icon: Users },
                { key: "attendance", label: "Attend", icon: Target },
                { key: "anniversary", label: "Anniv", icon: CalendarDays },
                { key: "points", label: "Points", icon: TrendingUp },
                { key: "badges", label: "Badges", icon: Award },
              ].map(tab => {
                const isActive = activeTab === tab.key;
                const tc = tabThemes[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 py-2 rounded-lg text-[9px] sm:text-[10px] font-semibold transition-all duration-300 tracking-wider uppercase text-center"
                    style={isActive ? (isStd ? {
                      background: tc.accent,
                      border: `1px solid ${tc.accent}`,
                      color: '#ffffff',
                    } : {
                      background: `${tc.accent}12`,
                      border: `1px solid ${tc.accent}30`,
                      color: tc.accent,
                      boxShadow: `0 0 20px ${tc.accent}10`,
                    }) : (isStd ? {
                      background: 'hsl(var(--muted))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    } : {
                      background: 'rgba(20,30,45,0.6)',
                      border: '1px solid rgba(50,65,85,0.3)',
                      color: 'rgba(100,116,139,0.5)',
                    })}
                    data-testid={`tab-${tab.key}`}
                  >
                    <tab.icon className="h-3 w-3 inline mr-0.5" style={{ opacity: isActive ? 1 : (isStd ? 0.7 : 0.5) }} />
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
                      style={isSelected ? (isStd ? {
                        background: `${gaugeConfig.accent}20`,
                        border: `1px solid ${gaugeConfig.accent}`,
                        color: gaugeConfig.accent,
                      } : {
                        background: `${gaugeConfig.accent}18`,
                        border: `1px solid ${gaugeConfig.accent}40`,
                        color: gaugeConfig.accent,
                        boxShadow: `0 0 10px ${gaugeConfig.accent}15`,
                      }) : (isStd ? {
                        background: 'hsl(var(--muted))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--muted-foreground))',
                      } : {
                        background: 'rgba(15,25,40,0.5)',
                        border: '1px solid rgba(50,65,85,0.2)',
                        color: 'rgba(100,116,139,0.6)',
                      })}
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
              isStandard={isStd}
            >
              <p className="text-5xl sm:text-6xl font-black leading-none" style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                color: isStd ? 'hsl(var(--foreground))' : '#ffffff',
                textShadow: isStd ? 'none' : `0 0 40px ${gaugeConfig.accent}30, 0 0 80px ${gaugeConfig.glow}15`,
                letterSpacing: '-2px',
              }}>
                {gaugeConfig.value}
              </p>
              <p className="text-[10px] sm:text-[11px] mt-1 font-semibold tracking-[0.2em] uppercase" style={{ color: isStd ? gaugeConfig.accent : `${gaugeConfig.accent}90` }}>
                {gaugeConfig.unit}
              </p>
              <div className="mt-2 px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-[0.12em] uppercase" style={isStd ? {
                background: `${gaugeConfig.accent}15`,
                border: `1px solid ${gaugeConfig.accent}40`,
                color: gaugeConfig.accent,
              } : {
                background: `${gaugeConfig.accent}0a`,
                border: `1px solid ${gaugeConfig.accent}25`,
                color: `${gaugeConfig.accent}cc`,
              }}>
                {gaugeConfig.stage}
              </div>
              {gaugeConfig.remaining > 0 && gaugeConfig.nextLabel && (
                <p className="text-[9px] sm:text-[10px] mt-1 tracking-wide" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(148,163,184,0.5)' }}>
                  {gaugeConfig.remaining} more for {gaugeConfig.nextLabel}
                </p>
              )}
            </EVGauge>
          </div>
        </div>

        <div className="rounded-2xl p-3 transition-all duration-500" style={isStd ? {
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        } : {
          background: 'linear-gradient(145deg, #060b14 0%, #0b1120 50%, #060b14 100%)',
          border: `1px solid ${gaugeConfig.accent}15`,
        }}>
          <div className="rounded-xl p-3 transition-all duration-500" style={isStd ? {
            background: 'hsl(var(--muted) / 0.5)',
            border: '1px solid hsl(var(--border))',
          } : {
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
                          background: reached ? `${gaugeConfig.accent}${isStd ? '12' : '08'}` : (isStd ? 'hsl(var(--muted) / 0.5)' : 'rgba(20,30,45,0.3)'),
                          border: `1px solid ${reached ? `${gaugeConfig.accent}${isStd ? '40' : '20'}` : (isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.15)')}`,
                        }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                            background: reached ? `${gaugeConfig.accent}15` : (isStd ? 'hsl(var(--muted))' : 'rgba(30,45,60,0.5)'),
                            border: `1px solid ${reached ? `${gaugeConfig.accent}30` : (isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.2)')}`,
                          }}>
                            {reached ? <Check className="h-3.5 w-3.5" style={{ color: gaugeConfig.accent }} /> : <ms.icon className="h-3.5 w-3.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.3)' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: reached ? (isStd ? 'hsl(var(--foreground))' : 'rgba(255,255,255,0.9)') : (isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)') }}>{ms.label}</p>
                            <p className="text-[10px] truncate" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{ms.desc}</p>
                          </div>
                          {reached ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0" style={{
                              background: `${gaugeConfig.accent}${isStd ? '18' : '12'}`,
                              color: gaugeConfig.accent,
                              border: `1px solid ${gaugeConfig.accent}${isStd ? '50' : '25'}`,
                            }}>{ms.badgeText}</span>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <Lock className="h-3 w-3" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(50,65,85,0.6)' }} />
                              <span className="text-[11px] font-mono" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{approved}/{ms.target}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {perClubStats.length > 0 && (
                      <div className="space-y-1.5 pt-2" style={{ borderTop: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.2)' }}>
                        {perClubStats.map((club: any) => {
                          const isSelected = selectedClubId === club.clubId;
                          return (
                            <button
                              key={club.clubId}
                              onClick={() => handleClubClick(club.clubId)}
                              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 text-left"
                              style={{
                                background: isSelected ? `${gaugeConfig.accent}${isStd ? '15' : '10'}` : (isStd ? 'hsl(var(--muted) / 0.3)' : 'rgba(15,25,35,0.4)'),
                                border: `1px solid ${isSelected ? `${gaugeConfig.accent}${isStd ? '50' : '30'}` : (isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.12)')}`,
                              }}
                              data-testid={`referral-club-${club.clubId}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: isSelected ? gaugeConfig.accent : (isStd ? 'hsl(var(--foreground))' : 'rgba(200,210,220,0.8)') }}>{club.clubName}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-center">
                                  <p className="text-sm font-black font-mono" style={{ color: gaugeConfig.accent }}>{club.approvedReferrals}</p>
                                  <p className="text-[8px] tracking-wider uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>OK</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-black font-mono" style={{ color: isStd ? '#b45309' : '#ffaa00' }}>{club.pendingReferrals}</p>
                                  <p className="text-[8px] tracking-wider uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Wait</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-2" style={{ borderTop: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.2)' }}>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-base font-black font-mono" style={{ color: isStd ? 'hsl(var(--foreground))' : '#ffffff' }}>{total}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Total</p>
                        </div>
                        <div>
                          <p className="text-base font-black font-mono" style={{ color: gaugeConfig.accent }}>{approved}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Approved</p>
                        </div>
                        <div>
                          <p className="text-base font-black font-mono" style={{ color: isStd ? '#b45309' : '#ffaa00' }}>{pending}</p>
                          <p className="text-[8px] tracking-[0.15em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === "attendance" && (
                <div className="space-y-3">
                  {attendanceProgress && attendanceProgress.length > 0 && (() => {
                    const clubs = selectedClubId ? attendanceProgress.filter((c: any) => c.clubId === selectedClubId) : attendanceProgress;
                    const totalSessions = clubs.reduce((sum: number, c: any) => sum + (c.totalAttended || 0), 0);
                    const totalMilestonesEarned = clubs.reduce((sum: number, c: any) => {
                      return sum + (c.milestones || []).reduce((ms: number, m: any) => ms + (m.milestonesCompleted || 0), 0);
                    }, 0);
                    const totalCreditsEarned = clubs.reduce((sum: number, c: any) => {
                      return sum + (c.milestones || []).reduce((ms: number, m: any) => {
                        const config = m.rewardConfig || {};
                        return ms + ((m.milestonesCompleted || 0) * ((config.credits || 0)));
                      }, 0);
                    }, 0);
                    return (
                      <div className="grid grid-cols-3 gap-2 text-center pb-2" style={{ borderBottom: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.2)' }}>
                        <div>
                          <p className="text-lg font-black font-mono" style={{ color: gaugeConfig.accent }}>{totalSessions}</p>
                          <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Sessions</p>
                        </div>
                        <div>
                          <p className="text-lg font-black font-mono" style={{ color: isStd ? 'hsl(var(--foreground))' : '#ffffff' }}>{totalMilestonesEarned}</p>
                          <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Milestones</p>
                        </div>
                        <div>
                          <p className="text-lg font-black font-mono" style={{ color: gaugeConfig.accent }}>£{(totalCreditsEarned / 100).toFixed(0)}</p>
                          <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Earned</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium" style={{ color: isStd ? 'hsl(var(--foreground))' : `${gaugeConfig.accent}cc` }}>Attend sessions to earn credits</p>
                    <button onClick={() => setShowAttendanceInfo(true)} className="text-[10px] font-medium underline underline-offset-2 transition-colors" style={{ color: `${gaugeConfig.accent}` }} data-testid="button-how-attendance-works">
                      How?
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
                            background: isSelected ? `${gaugeConfig.accent}${isStd ? '12' : '08'}` : (isStd ? 'hsl(var(--muted) / 0.5)' : 'rgba(15,25,35,0.5)'),
                            border: `1px solid ${isSelected ? (isStd ? gaugeConfig.accent : `${gaugeConfig.accent}25`) : (isStd ? 'hsl(var(--border))' : `${gaugeConfig.accent}08`)}`,
                          }}
                          data-testid={`attendance-club-${club.clubId}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: isSelected ? gaugeConfig.accent : (isStd ? 'hsl(var(--foreground))' : 'rgba(200,210,220,0.9)') }}>{club.clubName}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.totalAttended} sessions</span>
                              {(club.milestones || []).reduce((s: number, m: any) => s + (m.milestonesCompleted || 0), 0) > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: isStd ? 'hsl(var(--muted))' : 'rgba(30,45,60,0.5)', color: isStd ? 'hsl(var(--foreground))' : '#ffffff', border: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.3)' }}>
                                  {(club.milestones || []).reduce((s: number, m: any) => s + (m.milestonesCompleted || 0), 0)}x earned
                                </span>
                              )}
                            </div>
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
                                    <span className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Every {m.sessionsRequired} sessions</span>
                                    {m.milestonesCompleted > 0 && <span className="text-[9px] font-bold" style={{ color: gaugeConfig.accent }}>{m.milestonesCompleted}x earned</span>}
                                  </div>
                                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isStd ? 'hsl(var(--muted))' : `${gaugeConfig.accent}10` }}>
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.sessionsRequired > 0 ? (currentInCycle / m.sessionsRequired) * 100 : 0}%`, background: gaugeConfig.accent, boxShadow: isStd ? 'none' : `0 0 6px ${gaugeConfig.accent}50` }} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{currentInCycle}/{m.sessionsRequired}</span>
                                    {rewardParts.length > 0 && <span className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")}</span>}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>No milestones set</p>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <Target className="h-6 w-6 mx-auto mb-1.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Start attending to earn credits</p>
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
                            background: isSelected ? `${gaugeConfig.accent}${isStd ? '12' : '08'}` : (isStd ? 'hsl(var(--muted) / 0.5)' : 'rgba(15,25,35,0.5)'),
                            border: `1px solid ${isSelected ? (isStd ? gaugeConfig.accent : `${gaugeConfig.accent}25`) : (isStd ? 'hsl(var(--border))' : `${gaugeConfig.accent}08`)}`,
                          }}
                          data-testid={`anniversary-club-${info.clubId}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md shrink-0" style={{ background: `${gaugeConfig.accent}12` }}>
                              <Gift className="h-3.5 w-3.5" style={{ color: `${gaugeConfig.accent}cc`, ...(isCelebration ? {} : { animation: "rewardShake 1.5s ease-in-out infinite" }) }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px]" style={{ color: isSelected ? `${gaugeConfig.accent}cc` : (isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)') }}>{info.clubName}</p>
                              <p className="text-xs font-semibold truncate" style={{ color: isStd ? 'hsl(var(--foreground))' : '#ffffff' }}>
                                {isCelebration
                                  ? `Happy ${info.upcomingYear}${info.upcomingYear === 1 ? "st" : info.upcomingYear === 2 ? "nd" : info.upcomingYear === 3 ? "rd" : "th"} Anniversary!`
                                  : `Year ${info.upcomingYear} in ${countdownText}`}
                              </p>
                            </div>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isStd ? 'hsl(var(--muted))' : `${gaugeConfig.accent}10` }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${info.progress * 100}%`, background: gaugeConfig.accent, boxShadow: isStd ? 'none' : `0 0 6px ${gaugeConfig.accent}50` }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>
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
                      <CalendarDays className="h-6 w-6 mx-auto mb-1.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Anniversary milestones will appear over time</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "points" && (
                <div className="space-y-2">
                  {pointsProgress && pointsProgress.length > 0 ? (
                    pointsProgress.map((club: any) => {
                      const isSelected = selectedClubId === club.clubId;
                      const standardMs = (club.milestones || []).filter((m: any) => (m.milestoneType || "STANDARD") === "STANDARD");
                      const specialMs = (club.milestones || []).filter((m: any) => m.milestoneType === "SPECIAL");
                      return (
                        <button
                          key={club.clubId}
                          onClick={() => handleClubClick(club.clubId)}
                          className="w-full text-left rounded-lg p-3 space-y-2 transition-all duration-200"
                          style={{
                            background: isSelected ? `${gaugeConfig.accent}${isStd ? '12' : '08'}` : (isStd ? 'hsl(var(--muted) / 0.5)' : 'rgba(15,25,35,0.5)'),
                            border: `1px solid ${isSelected ? (isStd ? gaugeConfig.accent : `${gaugeConfig.accent}25`) : (isStd ? 'hsl(var(--border))' : `${gaugeConfig.accent}08`)}`,
                          }}
                          data-testid={`points-club-${club.clubId}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: isSelected ? gaugeConfig.accent : (isStd ? 'hsl(var(--foreground))' : 'rgba(200,210,220,0.9)') }}>{club.clubName}</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${gaugeConfig.accent}10`, color: `${gaugeConfig.accent}cc`, border: `1px solid ${gaugeConfig.accent}20` }}>{club.currentPoints} pts</span>
                          </div>

                          {standardMs.length > 0 && standardMs.map((m: any, idx: number) => {
                            const config = m.rewardConfig || {};
                            const rewardParts: string[] = [];
                            if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)}`);
                            if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free`);
                            if (config.gifts) rewardParts.push(config.gifts);
                            const timesEarned = m.timesEarned || 0;
                            return (
                              <div key={`std-${idx}`} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Every {m.pointsRequired} pts</span>
                                    {timesEarned > 0 && (
                                      <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: `${gaugeConfig.accent}15`, color: gaugeConfig.accent }}>{timesEarned}x earned</span>
                                    )}
                                  </div>
                                  <span className="text-[9px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{m.pointsUntilNext} pts to next</span>
                                </div>
                                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isStd ? 'hsl(var(--muted))' : `${gaugeConfig.accent}10` }}>
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.progressPercent || 0}%`, background: gaugeConfig.accent, boxShadow: isStd ? 'none' : `0 0 6px ${gaugeConfig.accent}50` }} />
                                </div>
                                {rewardParts.length > 0 && (
                                  <div className="flex justify-end">
                                    <span className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")} each time</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {specialMs.length > 0 && (
                            <div className="pt-1.5 mt-1.5" style={{ borderTop: `1px solid ${isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.2)'}` }}>
                              <p className="text-[9px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Special Milestones</p>
                              {specialMs.map((m: any, idx: number) => {
                                const config = m.rewardConfig || {};
                                const rewardParts: string[] = [];
                                if (config.credits && config.credits > 0) rewardParts.push(`£${(config.credits / 100).toFixed(2)}`);
                                if (config.freeSessions && config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free`);
                                if (config.gifts) rewardParts.push(config.gifts);
                                return (
                                  <div key={`special-${idx}`} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>{m.pointsRequired} pts</span>
                                        <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: isStd ? 'hsl(var(--muted))' : 'rgba(255,193,7,0.1)', color: isStd ? 'hsl(var(--muted-foreground))' : '#ffc107', border: `1px solid ${isStd ? 'hsl(var(--border))' : 'rgba(255,193,7,0.2)'}` }}>Special</span>
                                      </div>
                                      {m.reached ? (
                                        <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: gaugeConfig.accent }}><Check className="h-3 w-3" /> Claimed</span>
                                      ) : (
                                        <span className="text-[9px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{m.pointsUntil} pts to go</span>
                                      )}
                                    </div>
                                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isStd ? 'hsl(var(--muted))' : `${gaugeConfig.accent}10` }}>
                                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${m.progressPercent || 0}%`, background: gaugeConfig.accent, boxShadow: isStd ? 'none' : `0 0 6px ${gaugeConfig.accent}50` }} />
                                    </div>
                                    {rewardParts.length > 0 && (
                                      <div className="flex justify-end">
                                        <span className="text-[10px] font-semibold" style={{ color: `${gaugeConfig.accent}cc` }}>{rewardParts.join(" + ")}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {standardMs.length === 0 && specialMs.length === 0 && (
                            <p className="text-[10px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>No milestones set</p>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <TrendingUp className="h-6 w-6 mx-auto mb-1.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Earn ranking points from matches to unlock rewards</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "badges" && (() => {
                const BADGE_ICONS: Record<string, any> = {
                  zap: Zap, flame: Flame, star: Star, sparkles: Sparkles,
                  medal: Medal, trophy: Trophy, shield: Shield, crown: Crown,
                };
                const clubs = badgeProgress || [];
                const club: any = selectedClubId
                  ? clubs.find((c: any) => c.clubId === selectedClubId)
                  : clubs[0];

                if (!club || clubs.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <Award className="h-6 w-6 mx-auto mb-1.5" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.2)' }} />
                      <p className="text-[11px]" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>Play matches to start earning badges</p>
                    </div>
                  );
                }

                const badges = club.badges || [];
                const earnedBadges = badges.filter((b: any) => b.earned);
                const highestIdx = club.highestEarnedIndex;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center pb-2" style={{ borderBottom: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.2)' }}>
                      <div>
                        <p className="text-lg font-black font-mono" style={{ color: gaugeConfig.accent }}>{club.matchesPlayed}</p>
                        <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Matches</p>
                      </div>
                      <div>
                        <p className="text-lg font-black font-mono" style={{ color: isStd ? 'hsl(var(--foreground))' : '#ffffff' }}>{club.matchesWon}</p>
                        <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Won</p>
                      </div>
                      <div>
                        <p className="text-lg font-black font-mono" style={{ color: gaugeConfig.accent }}>{club.winRate}%</p>
                        <p className="text-[8px] tracking-[0.12em] uppercase" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)' }}>Win Rate</p>
                      </div>
                    </div>

                    <div className="relative flex justify-center" data-testid="badge-speedometer">
                      <svg viewBox="0 0 280 160" className="w-full" style={{ maxWidth: '320px' }}>
                        <path
                          d="M 30 140 A 110 110 0 0 1 250 140"
                          fill="none"
                          stroke={isStd ? 'hsl(var(--muted))' : 'rgba(50,65,85,0.3)'}
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        {badges.map((b: any, idx: number) => {
                          const angle = -180 + ((idx + 1) / badges.length) * 180;
                          const rad = (angle * Math.PI) / 180;
                          const tickR1 = 100;
                          const tickR2 = 112;
                          const cx = 140 + tickR1 * Math.cos(rad);
                          const cy = 140 + tickR1 * Math.sin(rad);
                          const cx2 = 140 + tickR2 * Math.cos(rad);
                          const cy2 = 140 + tickR2 * Math.sin(rad);
                          const labelR = 125;
                          const lx = 140 + labelR * Math.cos(rad);
                          const ly = 140 + labelR * Math.sin(rad);
                          return (
                            <g key={b.id}>
                              <line x1={cx} y1={cy} x2={cx2} y2={cy2}
                                stroke={b.earned ? b.color : (isStd ? 'rgba(160,170,180,0.4)' : 'rgba(50,65,85,0.4)')}
                                strokeWidth="3" strokeLinecap="round" />
                              <circle cx={cx2} cy={cy2} r="10"
                                fill={b.earned ? `${b.color}25` : (isStd ? 'hsl(var(--muted))' : 'rgba(30,40,55,0.6)')}
                                stroke={b.earned ? b.color : (isStd ? 'rgba(160,170,180,0.3)' : 'rgba(50,65,85,0.3)')}
                                strokeWidth="1.5" />
                              <text x={cx2} y={cy2 + 1} textAnchor="middle" dominantBaseline="central"
                                fontSize="8" fontWeight="800" fill={b.earned ? b.color : (isStd ? 'rgba(120,130,140,0.5)' : 'rgba(100,116,139,0.3)')}>
                                {idx + 1}
                              </text>
                              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
                                fontSize="5" fontWeight="600" letterSpacing="0.03em"
                                fill={b.earned ? b.color : (isStd ? 'rgba(120,130,140,0.5)' : 'rgba(100,116,139,0.3)')}>
                                {b.name.length > 8 ? b.name.substring(0, 7) + '…' : b.name}
                              </text>
                            </g>
                          );
                        })}

                        {(() => {
                          const pAngle = highestIdx >= 0
                            ? -180 + ((highestIdx + 1) / badges.length) * 180
                            : -180;
                          const pRad = (pAngle * Math.PI) / 180;
                          const needleLen = 72;
                          const nx = 140 + needleLen * Math.cos(pRad);
                          const ny = 140 + needleLen * Math.sin(pRad);
                          const activeColor = highestIdx >= 0 ? gaugeConfig.accent : (isStd ? 'rgba(160,170,180,0.5)' : 'rgba(100,116,139,0.3)');
                          const tipR = 8;
                          const tipX = 140 + (needleLen + tipR + 2) * Math.cos(pRad);
                          const tipY = 140 + (needleLen + tipR + 2) * Math.sin(pRad);
                          return (
                            <g>
                              <line x1={140} y1={140} x2={nx} y2={ny}
                                stroke={activeColor} strokeWidth="3" strokeLinecap="round"
                                style={{ filter: highestIdx >= 0 && !isStd ? `drop-shadow(0 0 4px ${gaugeConfig.glow})` : 'none',
                                  transition: 'all 0.5s ease' }} />
                              <circle cx={tipX} cy={tipY} r={tipR}
                                fill={highestIdx >= 0 ? `${gaugeConfig.accent}30` : (isStd ? 'hsl(var(--muted))' : 'rgba(30,40,55,0.5)')}
                                stroke={activeColor} strokeWidth="1.5" />
                              <ellipse cx={tipX} cy={tipY - 1} rx="3" ry="5"
                                fill="none" stroke={activeColor} strokeWidth="1.2"
                                transform={`rotate(${pAngle + 90}, ${tipX}, ${tipY - 1})`} />
                              <line x1={tipX} y1={tipY + 3} x2={tipX} y2={tipY + 7}
                                stroke={activeColor} strokeWidth="1.2" strokeLinecap="round"
                                transform={`rotate(${pAngle + 90}, ${tipX}, ${tipY + 5})`} />
                              <circle cx={140} cy={140} r="6"
                                fill={activeColor} stroke={isStd ? 'hsl(var(--card))' : '#0a0f1c'} strokeWidth="2" />
                            </g>
                          );
                        })()}
                      </svg>
                    </div>

                    <div className="pt-1" style={{ borderTop: isStd ? '1px solid hsl(var(--border))' : '1px solid rgba(50,65,85,0.2)' }}>
                      <p className="text-[10px] font-semibold mb-2 tracking-wider uppercase" style={{ color: isStd ? 'hsl(var(--foreground))' : 'rgba(200,210,220,0.8)' }}>
                        All Badges ({earnedBadges.length}/{badges.length})
                      </p>
                      <div className="space-y-1.5">
                        {badges.map((b: any) => {
                          const IconComp = BADGE_ICONS[b.icon] || Award;
                          return (
                            <div key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg transition-all" style={{
                              background: b.earned ? `${b.color}${isStd ? '12' : '08'}` : (isStd ? 'hsl(var(--muted) / 0.3)' : 'rgba(20,30,45,0.3)'),
                              border: `1px solid ${b.earned ? `${b.color}${isStd ? '40' : '20'}` : (isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.15)')}`,
                            }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{
                                background: b.earned ? `${b.color}20` : (isStd ? 'hsl(var(--muted))' : 'rgba(30,45,60,0.5)'),
                                border: `1.5px solid ${b.earned ? b.color : (isStd ? 'hsl(var(--border))' : 'rgba(50,65,85,0.3)')}`,
                              }}>
                                <IconComp className="h-3.5 w-3.5" style={{ color: b.earned ? b.color : (isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.3)') }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: b.earned ? (isStd ? 'hsl(var(--foreground))' : '#ffffff') : (isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.5)') }}>{b.name}</p>
                                <p className="text-[10px] truncate" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(100,116,139,0.4)' }}>{b.criteria}</p>
                              </div>
                              {b.earned ? (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0" style={{
                                  background: `${b.color}${isStd ? '18' : '12'}`,
                                  color: b.color,
                                  border: `1px solid ${b.color}${isStd ? '50' : '25'}`,
                                }}>Earned</span>
                              ) : (
                                <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: isStd ? 'hsl(var(--muted-foreground))' : 'rgba(50,65,85,0.6)' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
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

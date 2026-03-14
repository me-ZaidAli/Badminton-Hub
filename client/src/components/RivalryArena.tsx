import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Sparkles, Brain, Loader2, Trophy, Target,
  TrendingUp, Calendar, Zap, BarChart3, Flame, Award,
  Shield, Activity, Crosshair, Clock
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell
} from "recharts";
const COLOR1 = "#818cf8";
const COLOR2 = "#c084fc";
const CARD_BG = "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)";

function AnimatedNumber({ value, duration = 1200, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <span>{decimals > 0 ? display.toFixed(decimals) : Math.round(display)}</span>;
}

function CourtBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
      <rect x="20" y="10" width="360" height="180" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="200" y1="10" x2="200" y2="190" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="55" width="60" height="90" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="320" y="55" width="60" height="90" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}

function ScoreRing({ percentage, color, size = 80, label }: {
  percentage: number; color: string; size?: number; label?: string;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(percentage), 150);
    return () => clearTimeout(timer);
  }, [percentage]);
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animated / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base sm:text-lg font-black text-white">{Math.round(animated)}%</span>
        {label && <span className="text-[7px] text-slate-500 uppercase tracking-widest font-semibold">{label}</span>}
      </div>
    </div>
  );
}

function ComparisonBar({ label, v1, v2, color1, color2, icon, formatFn, lowerIsBetter }: {
  label: string; v1: number; v2: number; color1: string; color2: string; icon?: any; formatFn?: (n: number) => string; lowerIsBetter?: boolean;
}) {
  const total = v1 + v2;
  const p1Pct = total > 0 ? (v1 / total) * 100 : 50;
  const Icon = icon;
  const fmt = formatFn || ((n: number) => String(n));
  const p1Better = lowerIsBetter ? v1 <= v2 : v1 >= v2;
  const p2Better = lowerIsBetter ? v2 <= v1 : v2 >= v1;
  return (
    <div className="space-y-1.5" data-testid={`comparison-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold tabular-nums" style={{ color: p1Better ? color1 : "rgba(148,163,184,0.5)" }}>{fmt(v1)}</span>
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3 w-3 text-slate-500" />}
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: p2Better ? color2 : "rgba(148,163,184,0.5)" }}>{fmt(v2)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="h-full rounded-l-full transition-all duration-1000 ease-out" style={{ width: `${p1Pct}%`, background: `linear-gradient(90deg, ${color1}44, ${color1})` }} />
        <div className="h-full rounded-r-full transition-all duration-1000 ease-out" style={{ width: `${100 - p1Pct}%`, background: `linear-gradient(90deg, ${color2}, ${color2}44)` }} />
      </div>
    </div>
  );
}

function deriveRivalryStats(results: any[]) {
  if (!results || results.length === 0) return null;
  let p1Total = 0, p2Total = 0;
  const margins: number[] = [];
  let biggestWin: any = null;
  let closestMatch: any = null;
  let maxMargin = -1, minMargin = Infinity;
  let p1Streak = 0, p2Streak = 0, p1MaxStreak = 0, p2MaxStreak = 0;

  const chronological = [...results].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });

  chronological.forEach((r) => {
    const s1 = r.player1Score ?? 0;
    const s2 = r.player2Score ?? 0;
    p1Total += s1;
    p2Total += s2;
    const margin = Math.abs(s1 - s2);
    margins.push(margin);

    if (margin > maxMargin) {
      maxMargin = margin;
      biggestWin = { ...r, margin };
    }
    if (margin < minMargin) {
      minMargin = margin;
      closestMatch = { ...r, margin };
    }

    if (s1 > s2) {
      p1Streak++;
      p2Streak = 0;
      if (p1Streak > p1MaxStreak) p1MaxStreak = p1Streak;
    } else {
      p2Streak++;
      p1Streak = 0;
      if (p2Streak > p2MaxStreak) p2MaxStreak = p2Streak;
    }
  });

  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const matchCount = results.length;

  let rivalryIntensity: string;
  let intensityColor: string;
  if (avgMargin < 3) { rivalryIntensity = "Epic Rivalry"; intensityColor = "#22c55e"; }
  else if (avgMargin <= 6) { rivalryIntensity = "Competitive Rivalry"; intensityColor = "#f59e0b"; }
  else { rivalryIntensity = "Dominant Rivalry"; intensityColor = "#ef4444"; }

  const last3 = chronological.slice(-3);

  return {
    p1Total, p2Total,
    p1Avg: matchCount > 0 ? (p1Total / matchCount) : 0,
    p2Avg: matchCount > 0 ? (p2Total / matchCount) : 0,
    avgMargin, rivalryIntensity, intensityColor,
    biggestWin, closestMatch,
    p1MaxStreak, p2MaxStreak,
    last3,
  };
}

/* ─── SECTION 1: Rivalry Header ─── */
function RivalryHeader({ player1, player2, p1Wins, p2Wins, totalMatches }: {
  player1: any; player2: any; p1Wins: number; p2Wins: number; totalMatches: number;
}) {
  const p1Grade = player1.playerProfiles?.[0]?.grade || player1.playerProfiles?.[0]?.category;
  const p2Grade = player2.playerProfiles?.[0]?.grade || player2.playerProfiles?.[0]?.category;
  const p1Leading = p1Wins > p2Wins;
  const p2Leading = p2Wins > p1Wins;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]"
      style={{ background: "linear-gradient(180deg, #0c1425 0%, #070d1a 100%)" }} data-testid="rivalry-header">
      <CourtBackground />
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/[0.06] via-transparent to-purple-600/[0.06]" />

      <div className="relative z-10 px-4 pt-4 pb-5 sm:pt-5 sm:pb-6">
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full animate-pulse opacity-20" style={{ boxShadow: `0 0 25px 8px ${COLOR1}` }} />
              <div className="rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${COLOR1}, ${COLOR1}66)`, boxShadow: `0 0 15px 3px ${COLOR1}30` }}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0c1322] flex items-center justify-center overflow-hidden">
                  <span className="text-2xl sm:text-3xl font-black text-white/80">{player1.fullName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide leading-tight">{player1.fullName}</h3>
              {p1Grade && <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1" style={{ background: `${COLOR1}20`, color: COLOR1 }}>{p1Grade}</span>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border border-white/[0.08]"
              style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
              <span className="text-sm sm:text-base font-black text-amber-400/80 tracking-wider">VS</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full animate-pulse opacity-20" style={{ boxShadow: `0 0 25px 8px ${COLOR2}` }} />
              <div className="rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${COLOR2}, ${COLOR2}66)`, boxShadow: `0 0 15px 3px ${COLOR2}30` }}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0c1322] flex items-center justify-center overflow-hidden">
                  <span className="text-2xl sm:text-3xl font-black text-white/80">{player2.fullName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide leading-tight">{player2.fullName}</h3>
              {p2Grade && <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-1" style={{ background: `${COLOR2}20`, color: COLOR2 }}>{p2Grade}</span>}
            </div>
          </div>
        </div>

        {totalMatches > 0 && (
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-4">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black tabular-nums" style={{ color: COLOR1, textShadow: p1Leading ? `0 0 20px ${COLOR1}60` : "none" }}>
                <AnimatedNumber value={p1Wins} />
              </p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-lg sm:text-xl font-black text-slate-600 tabular-nums"><AnimatedNumber value={totalMatches} /></p>
              <p className="text-[8px] text-slate-600 uppercase tracking-wider font-medium">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black tabular-nums" style={{ color: COLOR2, textShadow: p2Leading ? `0 0 20px ${COLOR2}60` : "none" }}>
                <AnimatedNumber value={p2Wins} />
              </p>
            </div>
          </div>
        )}

        {totalMatches === 0 && (
          <div className="text-center mt-4">
            <p className="text-xs text-slate-500">No head-to-head matches yet</p>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${COLOR1}, transparent 45%, transparent 55%, ${COLOR2})` }} />
    </div>
  );
}

/* ─── SECTION 2: Overall Stats Comparison (ALWAYS VISIBLE) ─── */
function OverallStatsComparison({ s1, s2, player1Name, player2Name }: {
  s1: any; s2: any; player1Name: string; player2Name: string;
}) {
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  const p1WinRate = s1?.winRate || 0;
  const p2WinRate = s2?.winRate || 0;
  const p1Matches = s1?.matchesPlayed || 0;
  const p2Matches = s2?.matchesPlayed || 0;
  const p1Wins = s1?.matchesWon || 0;
  const p2Wins = s2?.matchesWon || 0;
  const p1Points = s1?.pointsScored || 0;
  const p2Points = s2?.pointsScored || 0;
  const p1Sessions = s1?.sessionsAttended || 0;
  const p2Sessions = s2?.sessionsAttended || 0;
  const p1Hours = s1?.totalHoursPlayed || 0;
  const p2Hours = s2?.totalHoursPlayed || 0;
  const p1Sets = s1?.setsWon || 0;
  const p2Sets = s2?.setsWon || 0;
  const p1Conceded = s1?.pointsConceded || 0;
  const p2Conceded = s2?.pointsConceded || 0;

  const radarData = [
    { stat: "Win %", p1: p1WinRate, p2: p2WinRate },
    { stat: "Matches", p1: Math.min(p1Matches * 10, 100), p2: Math.min(p2Matches * 10, 100) },
    { stat: "Points", p1: Math.min(p1Points, 100), p2: Math.min(p2Points, 100) },
    { stat: "Sessions", p1: Math.min(p1Sessions * 10, 100), p2: Math.min(p2Sessions * 10, 100) },
    { stat: "Sets", p1: Math.min(p1Sets * 15, 100), p2: Math.min(p2Sets * 15, 100) },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="overall-stats-comparison">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
        Player Comparison
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex flex-col items-center">
          <ScoreRing percentage={p1WinRate} color={COLOR1} size={80} label="Win Rate" />
          <span className="text-[10px] text-slate-400 font-medium mt-1">{p1First}</span>
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing percentage={p2WinRate} color={COLOR2} size={80} label="Win Rate" />
          <span className="text-[10px] text-slate-400 font-medium mt-1">{p2First}</span>
        </div>
      </div>

      <div className="h-48 sm:h-56 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: "#64748b", fontSize: 9 }} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar name={p1First} dataKey="p1" stroke={COLOR1} fill={COLOR1} fillOpacity={0.15} strokeWidth={2} />
            <Radar name={p2First} dataKey="p2" stroke={COLOR2} fill={COLOR2} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <ComparisonBar label="Matches Played" v1={p1Matches} v2={p2Matches} color1={COLOR1} color2={COLOR2} icon={Activity} />
        <ComparisonBar label="Matches Won" v1={p1Wins} v2={p2Wins} color1={COLOR1} color2={COLOR2} icon={Trophy} />
        <ComparisonBar label="Points Scored" v1={p1Points} v2={p2Points} color1={COLOR1} color2={COLOR2} icon={Target} />
        <ComparisonBar label="Points Conceded" v1={p1Conceded} v2={p2Conceded} color1={COLOR1} color2={COLOR2} icon={Shield} lowerIsBetter />
        <ComparisonBar label="Sets Won" v1={p1Sets} v2={p2Sets} color1={COLOR1} color2={COLOR2} icon={Award} />
        <ComparisonBar label="Sessions" v1={p1Sessions} v2={p2Sessions} color1={COLOR1} color2={COLOR2} icon={Calendar} />
        <ComparisonBar label="Hours Played" v1={p1Hours} v2={p2Hours} color1={COLOR1} color2={COLOR2} icon={Clock} formatFn={(n) => `${n}h`} />
      </div>
    </div>
  );
}

/* ─── SECTION 3: Points Efficiency (ALWAYS VISIBLE) ─── */
function PointsEfficiency({ s1, s2, player1Name, player2Name }: {
  s1: any; s2: any; player1Name: string; player2Name: string;
}) {
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  const p1Matches = s1?.matchesPlayed || 0;
  const p2Matches = s2?.matchesPlayed || 0;
  const p1AvgScored = p1Matches > 0 ? ((s1?.pointsScored || 0) / p1Matches) : 0;
  const p2AvgScored = p2Matches > 0 ? ((s2?.pointsScored || 0) / p2Matches) : 0;
  const p1AvgConceded = p1Matches > 0 ? ((s1?.pointsConceded || 0) / p1Matches) : 0;
  const p2AvgConceded = p2Matches > 0 ? ((s2?.pointsConceded || 0) / p2Matches) : 0;
  const p1Margin = p1AvgScored - p1AvgConceded;
  const p2Margin = p2AvgScored - p2AvgConceded;

  const efficiencyData = [
    { name: p1First, scored: parseFloat(p1AvgScored.toFixed(1)), conceded: parseFloat(p1AvgConceded.toFixed(1)) },
    { name: p2First, scored: parseFloat(p2AvgScored.toFixed(1)), conceded: parseFloat(p2AvgConceded.toFixed(1)) },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="points-efficiency">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Crosshair className="h-3.5 w-3.5 text-slate-500" />
        Scoring Efficiency
      </h4>

      <div className="h-36 sm:h-40 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={efficiencyData} barGap={4} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#0f1729", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px" }}
              labelStyle={{ color: "#94a3b8" }} />
            <Bar dataKey="scored" name="Avg Scored" radius={[4, 4, 0, 0]} barSize={20}>
              {efficiencyData.map((_, i) => <Cell key={i} fill={i === 0 ? COLOR1 : COLOR2} />)}
            </Bar>
            <Bar dataKey="conceded" name="Avg Conceded" radius={[4, 4, 0, 0]} barSize={20} fillOpacity={0.4}>
              {efficiencyData.map((_, i) => <Cell key={i} fill={i === 0 ? `${COLOR1}66` : `${COLOR2}66`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[{ name: p1First, margin: p1Margin, color: COLOR1, avgS: p1AvgScored, avgC: p1AvgConceded },
          { name: p2First, margin: p2Margin, color: COLOR2, avgS: p2AvgScored, avgC: p2AvgConceded }].map(p => (
          <div key={p.name} className="rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium mb-1">{p.name}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black tabular-nums" style={{ color: p.margin >= 0 ? "#22c55e" : "#ef4444" }}>
                {p.margin >= 0 ? "+" : ""}{p.margin.toFixed(1)}
              </span>
              <span className="text-[9px] text-slate-500">avg margin</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-0.5 tabular-nums">{p.avgS.toFixed(1)} scored / {p.avgC.toFixed(1)} conceded</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SECTION 4: H2H Rivalry Analytics (when h2h data exists) ─── */
function RivalryAnalytics({ stats, player1Name, player2Name }: {
  stats: ReturnType<typeof deriveRivalryStats>; player1Name: string; player2Name: string;
}) {
  if (!stats) return null;
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="rivalry-analytics">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Swords className="h-3.5 w-3.5 text-slate-500" />
        Head-to-Head Analytics
      </h4>

      <div className="space-y-3">
        <ComparisonBar label="H2H Points" v1={stats.p1Total} v2={stats.p2Total} color1={COLOR1} color2={COLOR2} icon={Target} />
        <ComparisonBar label="Avg Points" v1={parseFloat(stats.p1Avg.toFixed(1))} v2={parseFloat(stats.p2Avg.toFixed(1))} color1={COLOR1} color2={COLOR2} />
      </div>

      <div className="mt-4 rounded-xl px-3 py-3 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5" style={{ color: stats.intensityColor }} />
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Rivalry Strength</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${stats.intensityColor}20`, color: stats.intensityColor }}>
            {stats.rivalryIntensity}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min(100, Math.max(20, 100 - stats.avgMargin * 8))}%`,
              background: `linear-gradient(90deg, ${stats.intensityColor}88, ${stats.intensityColor})`,
            }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px] text-slate-600">One-sided</span>
          <span className="text-[9px] text-slate-400 font-medium tabular-nums">Avg margin: {stats.avgMargin.toFixed(1)} pts</span>
          <span className="text-[8px] text-slate-600">Epic</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {stats.biggestWin && (
          <div className="rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }} data-testid="biggest-win">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium mb-1">Biggest Win</p>
            <p className="text-sm font-black text-white tabular-nums">{stats.biggestWin.player1Score}–{stats.biggestWin.player2Score}</p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: stats.biggestWin.player1Score > stats.biggestWin.player2Score ? COLOR1 : COLOR2 }}>
              {stats.biggestWin.player1Score > stats.biggestWin.player2Score ? p1First : p2First}
            </p>
          </div>
        )}
        {stats.closestMatch && (
          <div className="rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }} data-testid="closest-match">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium mb-1">Closest Match</p>
            <p className="text-sm font-black text-white tabular-nums">{stats.closestMatch.player1Score}–{stats.closestMatch.player2Score}</p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: stats.closestMatch.player1Score > stats.closestMatch.player2Score ? COLOR1 : COLOR2 }}>
              {stats.closestMatch.player1Score > stats.closestMatch.player2Score ? p1First : p2First}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SECTION 5: Momentum Timeline ─── */
function MomentumTimeline({ results, player1Name, player2Name }: {
  results: any[]; player1Name: string; player2Name: string;
}) {
  if (!results || results.length === 0) return null;
  const chronological = [...results].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="momentum-timeline">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Calendar className="h-3.5 w-3.5 text-slate-500" />
        Match Timeline
      </h4>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {chronological.map((r: any, i: number) => {
          const p1Won = (r.player1Score ?? 0) > (r.player2Score ?? 0);
          const color = p1Won ? COLOR1 : COLOR2;
          const matchDate = r.date ? new Date(r.date) : null;
          return (
            <div key={i} className="flex flex-col items-center shrink-0 group relative transition-all duration-500 ease-out"
              style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-20px)", transitionDelay: `${i * 100}ms` }}
              data-testid={`timeline-node-${i}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110 active:scale-95"
                style={{ borderColor: color, background: `${color}15` }}>
                <span className="text-[9px] sm:text-[10px] font-black text-white tabular-nums">{r.player1Score ?? "?"}–{r.player2Score ?? "?"}</span>
              </div>
              {matchDate && <span className="text-[7px] text-slate-600 mt-1 tabular-nums">{matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 pointer-events-none">
                <div className="rounded-lg px-2.5 py-1.5 text-[9px] whitespace-nowrap border border-white/[0.08]" style={{ background: "#0f1729" }}>
                  <p className="font-bold text-white">{r.player1Score ?? "?"}–{r.player2Score ?? "?"}</p>
                  <p style={{ color }}>{p1Won ? p1First : p2First} won</p>
                </div>
              </div>
              {i < chronological.length - 1 && <div className="hidden sm:block absolute top-5 left-full w-1.5 h-0.5 bg-slate-700/50" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SECTION 6: Momentum Indicator ─── */
function MomentumIndicator({ stats, player1Name, player2Name }: {
  stats: ReturnType<typeof deriveRivalryStats>; player1Name: string; player2Name: string;
}) {
  if (!stats || stats.last3.length === 0) return null;
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];
  const last3Wins = stats.last3.map(r => (r.player1Score ?? 0) > (r.player2Score ?? 0));
  const p1Recent = last3Wins.filter(Boolean).length;
  const p2Recent = stats.last3.length - p1Recent;
  const momentumHolder = p1Recent > p2Recent ? p1First : p2Recent > p1Recent ? p2First : null;
  const momentumWins = Math.max(p1Recent, p2Recent);

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="momentum-indicator">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Flame className="h-3.5 w-3.5 text-orange-400" />
        Current Momentum
      </h4>
      <div className="flex items-center justify-center gap-2 mb-3">
        {stats.last3.map((r, i) => {
          const p1Won = (r.player1Score ?? 0) > (r.player2Score ?? 0);
          return (
            <div key={i} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center"
              style={{ background: p1Won ? `${COLOR1}25` : `${COLOR2}25`, border: `2px solid ${p1Won ? COLOR1 : COLOR2}` }}>
              <span className="text-[8px] font-bold" style={{ color: p1Won ? COLOR1 : COLOR2 }}>
                {p1Won ? p1First.charAt(0) : p2First.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
      {momentumHolder && (
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          <span className="font-semibold text-white">{momentumHolder}</span> currently holds momentum with{" "}
          <span className="font-semibold text-white">{momentumWins} wins</span> in the last {stats.last3.length} matches.
        </p>
      )}
    </div>
  );
}

/* ─── SECTION 7: Win Streaks ─── */
function WinStreaks({ stats, player1Name, player2Name }: {
  stats: ReturnType<typeof deriveRivalryStats>; player1Name: string; player2Name: string;
}) {
  if (!stats) return null;
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];
  const maxStreak = Math.max(stats.p1MaxStreak, stats.p2MaxStreak, 1);

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="win-streaks">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-yellow-400" />
        Longest Win Streak
      </h4>
      <div className="space-y-2.5">
        {[{ name: p1First, streak: stats.p1MaxStreak, color: COLOR1 }, { name: p2First, streak: stats.p2MaxStreak, color: COLOR2 }].map(p => (
          <div key={p.name} className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-medium w-14 shrink-0 truncate">{p.name}</span>
            <div className="flex-1 h-3 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-1.5"
                style={{ width: `${(p.streak / maxStreak) * 100}%`, background: `linear-gradient(90deg, ${p.color}44, ${p.color})`, minWidth: p.streak > 0 ? "28px" : "0" }}>
                {p.streak > 0 && <span className="text-[9px] font-bold text-white">{p.streak}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── SECTION 8: Momentum Graph with enhanced tooltip ─── */
function MomentumGraphTooltip({ active, payload, p1Label, p2Label }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  const winner = entry.winner;
  const winnerColor = entry.p1Won ? COLOR1 : COLOR2;
  return (
    <div className="rounded-xl px-3 py-2.5 border border-white/[0.08] text-[10px]" style={{ background: "#0f1729" }}>
      <p className="text-slate-400 font-medium mb-1">{entry.matchLabel}</p>
      <p className="font-black text-white tabular-nums">{entry.score}</p>
      <p className="font-semibold mt-0.5" style={{ color: winnerColor }}>{winner} won</p>
      <p className="text-slate-500 mt-1">Rivalry: <span className="text-white font-bold">{entry.p1Wins}–{entry.p2Wins}</span></p>
      {entry.streakLabel && (
        <p className="mt-1 font-semibold" style={{ color: winnerColor }}>🔥 {entry.streakLabel}</p>
      )}
    </div>
  );
}

function MomentumGraph({ results, player1Name, player2Name }: {
  results: any[]; player1Name: string; player2Name: string;
}) {
  if (!results || results.length < 2) return null;
  const p1Label = player1Name.split(" ")[0];
  const p2Label = player2Name.split(" ")[0];

  const data = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    let p1C = 0, p2C = 0, p1Consec = 0, p2Consec = 0;
    return sorted.map((r, i) => {
      const p1Won = (r.player1Score ?? 0) > (r.player2Score ?? 0);
      if (p1Won) { p1C++; p1Consec++; p2Consec = 0; }
      else { p2C++; p2Consec++; p1Consec = 0; }
      const d = r.date ? new Date(r.date) : null;
      const winner = p1Won ? p1Label : p2Label;
      const streak = p1Won ? p1Consec : p2Consec;
      return {
        label: d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `M${i+1}`,
        matchLabel: `Match ${i + 1}`,
        p1Wins: p1C, p2Wins: p2C, p1Won,
        score: `${r.player1Score ?? "?"}–${r.player2Score ?? "?"}`,
        winner,
        streakLabel: streak >= 2 ? `${winner} streak ×${streak}` : null,
        hasStreak: streak >= 2,
      };
    });
  }, [results]);

  const streakSegments = useMemo(() => {
    const segments: Array<{ player: string; start: number; end: number }> = [];
    let currentPlayer = "";
    let startIdx = 0;
    let count = 0;
    data.forEach((d, i) => {
      const w = d.p1Won ? "p1" : "p2";
      if (w === currentPlayer) { count++; }
      else {
        if (count >= 2) segments.push({ player: currentPlayer, start: startIdx, end: i - 1 });
        currentPlayer = w;
        startIdx = i;
        count = 1;
      }
    });
    if (count >= 2) segments.push({ player: currentPlayer, start: startIdx, end: data.length - 1 });
    return segments;
  }, [data]);

  const hasStreaks = streakSegments.length > 0;

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="momentum-graph">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
        <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
        Rivalry Momentum Graph
      </h4>
      <p className="text-[10px] text-slate-600 mb-4">Cumulative wins over time — see how the rivalry evolved</p>
      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <defs>
              <filter id="glowP1" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={COLOR1} floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glowP2" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor={COLOR2} floodOpacity="0.4" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<MomentumGraphTooltip p1Label={p1Label} p2Label={p2Label} />} />
            <Line type="monotone" dataKey="p1Wins" name={p1Label} stroke={COLOR1} strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isStreak = payload?.hasStreak && payload?.p1Won;
                return <circle key={`p1-${props.index}`} cx={cx} cy={cy} r={isStreak ? 5 : 3} fill={COLOR1} stroke={isStreak ? COLOR1 : "none"} strokeWidth={isStreak ? 2 : 0}
                  filter={isStreak ? "url(#glowP1)" : undefined} style={{ opacity: isStreak ? 1 : 0.8 }} />;
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: COLOR1 }} />
            <Line type="monotone" dataKey="p2Wins" name={p2Label} stroke={COLOR2} strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isStreak = payload?.hasStreak && !payload?.p1Won;
                return <circle key={`p2-${props.index}`} cx={cx} cy={cy} r={isStreak ? 5 : 3} fill={COLOR2} stroke={isStreak ? COLOR2 : "none"} strokeWidth={isStreak ? 2 : 0}
                  filter={isStreak ? "url(#glowP2)" : undefined} style={{ opacity: isStreak ? 1 : 0.8 }} />;
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: COLOR2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: COLOR1 }} /><span className="text-[10px] text-slate-400">{p1Label}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: COLOR2 }} /><span className="text-[10px] text-slate-400">{p2Label}</span></div>
      </div>
      {hasStreaks && (
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {streakSegments.map((seg, i) => {
            const c = seg.player === "p1" ? COLOR1 : COLOR2;
            const name = seg.player === "p1" ? p1Label : p2Label;
            const len = seg.end - seg.start + 1;
            return (
              <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
                🔥 {name} streak ×{len}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── SECTION 9: H2H Match History List ─── */
function MatchHistory({ results, player1Name, player2Name }: {
  results: any[]; player1Name: string; player2Name: string;
}) {
  if (!results || results.length === 0) return null;
  const chronological = [...results].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="match-history">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Activity className="h-3.5 w-3.5 text-slate-500" />
        Match History
      </h4>
      <div className="space-y-2">
        {chronological.map((r: any, i: number) => {
          const p1Won = (r.player1Score ?? 0) > (r.player2Score ?? 0);
          const winColor = p1Won ? COLOR1 : COLOR2;
          const matchDate = r.date ? new Date(r.date) : null;
          return (
            <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }} data-testid={`match-history-${i}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-6 rounded-full shrink-0" style={{ background: winColor }} />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black tabular-nums" style={{ color: p1Won ? COLOR1 : "rgba(148,163,184,0.5)" }}>{r.player1Score ?? "?"}</span>
                  <span className="text-[10px] text-slate-600 font-medium">—</span>
                  <span className="text-base font-black tabular-nums" style={{ color: !p1Won ? COLOR2 : "rgba(148,163,184,0.5)" }}>{r.player2Score ?? "?"}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {matchDate && <p className="text-[10px] text-slate-500 tabular-nums">{matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>}
                <p className="text-[9px] font-semibold" style={{ color: winColor }}>{p1Won ? p1First : p2First}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN EXPORT ─── */
type PlayerData = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  profilePictureUrl?: string | null;
  selectedAvatar?: string | null;
  playerProfiles: Array<{
    id: number; clubId: number; gender: string | null; category: string | null;
    grade?: string | null; rankingPoints: number; matchesPlayed: number; matchesWon: number;
  }>;
};

export function RivalryArenaView({ player1, player2, compareData, h2h, clubs }: {
  player1: PlayerData; player2: PlayerData; compareData: any; h2h: any; clubs: any[];
}) {
  const { toast } = useToast();
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const lastCompareKey = useRef<string>("");

  const generateAiReview = async () => {
    const p1Id = player1.playerProfiles?.[0]?.id;
    const p2Id = player2.playerProfiles?.[0]?.id;
    if (!p1Id || !p2Id) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/players/analytics/ai-comparison/${p1Id}/${p2Id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate review");
      const data = await res.json();
      setAiReview(data.review);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate AI review", variant: "destructive" });
      setAiReview("Unable to generate AI comparison at this time. Please try again later.");
    } finally { setAiLoading(false); }
  };

  useEffect(() => {
    const p1Id = player1.playerProfiles?.[0]?.id;
    const p2Id = player2.playerProfiles?.[0]?.id;
    const key = `${p1Id}-${p2Id}`;
    if (p1Id && p2Id && key !== lastCompareKey.current) {
      lastCompareKey.current = key;
      setAiReview(null);
      generateAiReview();
    }
  }, [player1.id, player2.id]);

  const s1 = compareData?.player1?.stats;
  const s2 = compareData?.player2?.stats;
  const p1Wins = h2h?.player1Wins || 0;
  const p2Wins = h2h?.player2Wins || 0;
  const totalMatches = h2h?.totalMatches || 0;
  const results = h2h?.recentResults || [];
  const rivalryStats = useMemo(() => deriveRivalryStats(results), [results]);
  const hasH2H = results.length > 0;

  return (
    <div className="space-y-3 sm:space-y-4" data-testid="rivalry-arena">
      {/* 1. Rivalry Header with avatars, VS, scoreboard */}
      <RivalryHeader player1={player1} player2={player2} p1Wins={p1Wins} p2Wins={p2Wins} totalMatches={totalMatches} />

      {/* 2. Overall Stats Comparison — ALWAYS VISIBLE (radar chart + bars) */}
      <OverallStatsComparison s1={s1} s2={s2} player1Name={player1.fullName} player2Name={player2.fullName} />

      {/* 3. Points Efficiency — ALWAYS VISIBLE (bar chart + margin cards) */}
      <PointsEfficiency s1={s1} s2={s2} player1Name={player1.fullName} player2Name={player2.fullName} />

      {/* 4. H2H Analytics — only when h2h data exists */}
      {hasH2H && (
        <RivalryAnalytics stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {/* 5. Momentum Timeline — only when h2h data exists */}
      {hasH2H && (
        <MomentumTimeline results={results} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {/* 6 & 7. Momentum Indicator + Win Streaks */}
      {rivalryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <MomentumIndicator stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
          <WinStreaks stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
        </div>
      )}

      {/* 8. Momentum Graph — only with 2+ h2h matches */}
      {results.length >= 2 && (
        <MomentumGraph results={results} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {/* 9. Match History List — only when h2h data exists */}
      {hasH2H && (
        <MatchHistory results={results} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {/* 10. AI Rivalry Analysis — ALWAYS VISIBLE */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: CARD_BG }}>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400/70" />
              AI Rivalry Analysis
            </h4>
            {aiReview && !aiLoading && (
              <Button size="sm" variant="ghost" onClick={generateAiReview} disabled={aiLoading}
                className="text-[10px] h-7 px-2 text-slate-400 hover:text-white" data-testid="button-generate-ai-review">
                <Brain className="h-3 w-3 mr-1" />Regenerate
              </Button>
            )}
          </div>
          {aiLoading && (
            <div className="text-center py-8 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500 mx-auto" />
              <p className="text-xs text-slate-500">Analyzing rivalry patterns...</p>
            </div>
          )}
          {aiReview && !aiLoading && (
            <div className="space-y-1" data-testid="text-ai-review">
              {aiReview.split("\n").filter(line => line.trim()).map((paragraph, i) => {
                const cleaned = paragraph.replace(/\*\*/g, "").replace(/^#+\s*/, "");
                const isNumberedHeading = cleaned.match(/^(\d+)\.\s+(.+)/);
                const isSectionHeader = cleaned.match(/^[A-Z][A-Za-z\s&]+[:—]\s*$/) || cleaned.match(/^#{1,3}\s/);

                if (isNumberedHeading) {
                  return (
                    <div key={i} className="mt-4 first:mt-0 flex items-start gap-2.5">
                      <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black mt-0.5"
                        style={{ background: `linear-gradient(135deg, ${COLOR1}30, ${COLOR2}30)`, color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {isNumberedHeading[1]}
                      </span>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-white leading-snug">{isNumberedHeading[2]}</h5>
                      </div>
                    </div>
                  );
                }

                if (isSectionHeader) {
                  return (
                    <div key={i} className="mt-4 first:mt-0 pt-3 border-t border-white/[0.06] first:border-0 first:pt-0">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">{cleaned.replace(/[:—]\s*$/, "")}</h5>
                    </div>
                  );
                }

                return (
                  <p key={i} className="text-[13px] leading-relaxed text-slate-300 pl-8">
                    {cleaned}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getAvatarUrl } from "@/components/AvatarPicker";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Sparkles, Brain, Loader2, Trophy, Target,
  TrendingUp, Calendar, Zap, BarChart3, Flame, Award
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import maleSilhouetteSrc from "@assets/male_badminton_silhouette.png";
import femaleSilhouetteSrc from "@assets/female_badminton_silhouette.png";

const COLOR1 = "#818cf8";
const COLOR2 = "#c084fc";
const CARD_BG = "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)";

function getPlayerImage(player: any) {
  return player.profilePictureUrl || getAvatarUrl(player.selectedAvatar) || null;
}

function getGenderSilhouette(gender?: string | null) {
  const isFemale = gender?.toUpperCase() === "FEMALE" || gender?.toUpperCase() === "F";
  return isFemale ? femaleSilhouetteSrc : maleSilhouetteSrc;
}

function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <span>{display}</span>;
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

function ScoreRing({ percentage, color, size = 90, label }: {
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
        <span className="text-lg sm:text-xl font-black text-white">{Math.round(animated)}%</span>
        {label && <span className="text-[7px] text-slate-500 uppercase tracking-widest font-semibold">{label}</span>}
      </div>
    </div>
  );
}

function ComparisonBar({ label, v1, v2, color1, color2, icon }: {
  label: string; v1: number; v2: number; color1: string; color2: string; icon?: any;
}) {
  const total = v1 + v2;
  const p1Pct = total > 0 ? (v1 / total) * 100 : 50;
  const Icon = icon;
  return (
    <div className="space-y-1.5" data-testid={`comparison-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold tabular-nums" style={{ color: v1 >= v2 ? color1 : "rgba(148,163,184,0.6)" }}>{v1}</span>
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3 w-3 text-slate-500" />}
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: v2 >= v1 ? color2 : "rgba(148,163,184,0.6)" }}>{v2}</span>
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

function RivalryHeader({ player1, player2, p1Wins, p2Wins, totalMatches }: {
  player1: any; player2: any; p1Wins: number; p2Wins: number; totalMatches: number;
}) {
  const p1Img = getPlayerImage(player1);
  const p2Img = getPlayerImage(player2);
  const p1Gender = player1.playerProfiles?.[0]?.gender;
  const p2Gender = player2.playerProfiles?.[0]?.gender;
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
                  {p1Img ? (
                    <img src={p1Img} alt={player1.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <img src={getGenderSilhouette(p1Gender)} alt="Player" className="h-14 sm:h-16 object-contain"
                      style={{ filter: "invert(1) brightness(0.55) sepia(1) hue-rotate(200deg) saturate(2)" }} />
                  )}
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
                  {p2Img ? (
                    <img src={p2Img} alt={player2.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <img src={getGenderSilhouette(p2Gender)} alt="Player" className="h-14 sm:h-16 object-contain"
                      style={{ filter: "invert(1) brightness(0.55) sepia(1) hue-rotate(240deg) saturate(2)" }} />
                  )}
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
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${COLOR1}, transparent 45%, transparent 55%, ${COLOR2})` }} />
    </div>
  );
}

function RivalryAnalytics({ stats, player1Name, player2Name }: {
  stats: ReturnType<typeof deriveRivalryStats>; player1Name: string; player2Name: string;
}) {
  if (!stats) return null;
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="rivalry-analytics">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
        Rivalry Analytics
      </h4>

      <div className="space-y-3">
        <ComparisonBar label="Total Points" v1={stats.p1Total} v2={stats.p2Total} color1={COLOR1} color2={COLOR2} icon={Target} />
        <ComparisonBar label="Avg Points" v1={parseFloat(stats.p1Avg.toFixed(1))} v2={parseFloat(stats.p2Avg.toFixed(1))} color1={COLOR1} color2={COLOR2} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Avg Margin</p>
          <p className="text-lg font-black text-white tabular-nums">{stats.avgMargin.toFixed(1)}</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${stats.intensityColor}20`, color: stats.intensityColor }}>
          {stats.rivalryIntensity}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {stats.biggestWin && (
          <div className="rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }} data-testid="biggest-win">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium mb-1">Biggest Win</p>
            <p className="text-sm font-black text-white tabular-nums">
              {stats.biggestWin.player1Score}–{stats.biggestWin.player2Score}
            </p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: stats.biggestWin.player1Score > stats.biggestWin.player2Score ? COLOR1 : COLOR2 }}>
              {stats.biggestWin.player1Score > stats.biggestWin.player2Score ? p1First : p2First}
            </p>
          </div>
        )}
        {stats.closestMatch && (
          <div className="rounded-xl px-3 py-2.5 border border-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }} data-testid="closest-match">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium mb-1">Closest Match</p>
            <p className="text-sm font-black text-white tabular-nums">
              {stats.closestMatch.player1Score}–{stats.closestMatch.player2Score}
            </p>
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: stats.closestMatch.player1Score > stats.closestMatch.player2Score ? COLOR1 : COLOR2 }}>
              {stats.closestMatch.player1Score > stats.closestMatch.player2Score ? p1First : p2First}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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

function MomentumIndicator({ stats, player1Name, player2Name }: {
  stats: ReturnType<typeof deriveRivalryStats>; player1Name: string; player2Name: string;
}) {
  if (!stats || stats.last3.length === 0) return null;
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];

  const last3Wins = stats.last3.map(r => r.player1Score > r.player2Score);
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
          const p1Won = r.player1Score > r.player2Score;
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

function ExperienceComparison({ s1, s2, player1Name, player2Name }: {
  s1: any; s2: any; player1Name: string; player2Name: string;
}) {
  const p1First = player1Name.split(" ")[0];
  const p2First = player2Name.split(" ")[0];
  const p1Sessions = s1?.sessionsAttended || 0;
  const p2Sessions = s2?.sessionsAttended || 0;
  const p1Matches = s1?.matchesPlayed || 0;
  const p2Matches = s2?.matchesPlayed || 0;
  const p1WinRate = s1?.winRate || 0;
  const p2WinRate = s2?.winRate || 0;

  const moreExp = p1Sessions > p2Sessions ? p1First : p2Sessions > p1Sessions ? p2First : null;

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="experience-comparison">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Award className="h-3.5 w-3.5 text-emerald-400" />
        Player Experience
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col items-center">
          <ScoreRing percentage={p1WinRate} color={COLOR1} size={80} label="Win Rate" />
          <span className="text-[10px] text-slate-400 font-medium mt-1">{p1First}</span>
        </div>
        <div className="flex flex-col items-center">
          <ScoreRing percentage={p2WinRate} color={COLOR2} size={80} label="Win Rate" />
          <span className="text-[10px] text-slate-400 font-medium mt-1">{p2First}</span>
        </div>
      </div>

      <div className="space-y-3">
        <ComparisonBar label="Sessions" v1={p1Sessions} v2={p2Sessions} color1={COLOR1} color2={COLOR2} />
        <ComparisonBar label="Matches" v1={p1Matches} v2={p2Matches} color1={COLOR1} color2={COLOR2} />
      </div>

      {moreExp && (
        <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
          <span className="text-slate-300 font-medium">{moreExp}</span> has participated in more sessions, which may contribute to an experience advantage.
        </p>
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
    let p1C = 0, p2C = 0;
    return sorted.map((r, i) => {
      if (r.player1Score > r.player2Score) p1C++; else p2C++;
      const d = r.date ? new Date(r.date) : null;
      return { label: d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `M${i+1}`, p1Wins: p1C, p2Wins: p2C };
    });
  }, [results]);

  return (
    <div className="rounded-2xl border border-white/[0.06] p-4 sm:p-5" style={{ background: CARD_BG }} data-testid="momentum-graph">
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
        Cumulative Wins
      </h4>
      <div className="h-36 sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0f1729", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px" }}
              labelStyle={{ color: "#94a3b8" }} formatter={(value: number, name: string) => [value, name === "p1Wins" ? p1Label : p2Label]} />
            <Line type="monotone" dataKey="p1Wins" name={p1Label} stroke={COLOR1} strokeWidth={2.5} dot={{ fill: COLOR1, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="p2Wins" name={p2Label} stroke={COLOR2} strokeWidth={2.5} dot={{ fill: COLOR2, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: COLOR1 }} /><span className="text-[10px] text-slate-400">{p1Label}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full" style={{ background: COLOR2 }} /><span className="text-[10px] text-slate-400">{p2Label}</span></div>
      </div>
    </div>
  );
}

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

  return (
    <div className="space-y-3 sm:space-y-4" data-testid="rivalry-arena">
      <RivalryHeader player1={player1} player2={player2} p1Wins={p1Wins} p2Wins={p2Wins} totalMatches={totalMatches} />

      {results.length > 0 && (
        <RivalryAnalytics stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {results.length > 0 && (
        <MomentumTimeline results={results} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      {rivalryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <MomentumIndicator stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
          <WinStreaks stats={rivalryStats} player1Name={player1.fullName} player2Name={player2.fullName} />
        </div>
      )}

      {results.length >= 2 && (
        <MomentumGraph results={results} player1Name={player1.fullName} player2Name={player2.fullName} />
      )}

      <ExperienceComparison s1={s1} s2={s2} player1Name={player1.fullName} player2Name={player2.fullName} />

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
            <div className="space-y-2.5" data-testid="text-ai-review">
              {aiReview.split("\n").filter(line => line.trim()).map((paragraph, i) => {
                const cleaned = paragraph.replace(/\*\*/g, "");
                const isHeading = cleaned.match(/^(\d+\.\s*)?[A-Z].*[:—-]\s*/);
                if (isHeading) {
                  const parts = cleaned.split(/[:—-]\s*/);
                  return (
                    <div key={i} className="mt-3 first:mt-0">
                      <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">{parts[0]}</h5>
                      {parts.slice(1).join(": ") && <p className="text-xs leading-relaxed text-slate-400">{parts.slice(1).join(": ")}</p>}
                    </div>
                  );
                }
                const isBold = paragraph.startsWith("**") || paragraph.match(/^\d+\.\s*\*\*/);
                return <p key={i} className={`text-xs leading-relaxed ${isBold ? "text-slate-300 font-medium" : "text-slate-500"}`}>{cleaned}</p>;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
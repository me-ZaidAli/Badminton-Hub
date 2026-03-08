import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/components/AvatarPicker";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Sparkles, Brain, Loader2, Trophy, Flame,
  TrendingUp, TrendingDown, Calendar, ChevronRight
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const GRADE_COLORS: Record<string, string> = {
  A1: "from-yellow-500 to-amber-600", A2: "from-yellow-400 to-amber-500", A3: "from-yellow-300 to-amber-400",
  B1: "from-blue-500 to-indigo-600", B2: "from-blue-400 to-indigo-500", B3: "from-blue-300 to-indigo-400",
  C1: "from-green-500 to-emerald-600", C2: "from-green-400 to-emerald-500", C3: "from-green-300 to-emerald-400",
};

function MaleSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 96" fill="currentColor">
      <ellipse cx="32" cy="14" rx="10" ry="12" />
      <path d="M20 28 C16 30 12 38 14 52 L16 52 L18 42 L22 56 L18 90 L26 90 L30 62 L34 62 L38 90 L46 90 L42 56 L46 42 L48 52 L50 52 C52 38 48 30 44 28 Z" />
      <path d="M14 52 L6 46 L4 50 L14 56 Z" opacity="0.8" />
      <path d="M50 52 L58 46 L60 50 L50 56 Z" opacity="0.8" />
    </svg>
  );
}

function FemaleSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 96" fill="currentColor">
      <ellipse cx="32" cy="13" rx="9" ry="11" />
      <path d="M36 6 C42 4 46 10 44 18 L40 14" opacity="0.7" />
      <path d="M22 26 C18 28 16 34 17 42 L20 42 L22 36 L24 48 L18 68 L20 70 L28 52 L30 62 L24 90 L30 90 L32 68 L34 68 L36 90 L42 90 L36 62 L38 52 L46 70 L48 68 L42 48 L44 36 L46 42 L49 42 C50 34 48 28 44 26 Z" />
      <path d="M17 42 L8 38 L6 42 L17 46 Z" opacity="0.8" />
      <path d="M49 42 L58 38 L60 42 L49 46 Z" opacity="0.8" />
    </svg>
  );
}

function RivalryAvatar({ name, profilePictureUrl, selectedAvatar, gender, grade, color, side }: {
  name: string; profilePictureUrl?: string | null; selectedAvatar?: string | null;
  gender?: string | null; grade?: string | null; color: "cyan" | "purple"; side: "left" | "right";
}) {
  const avatarSrc = profilePictureUrl || getAvatarUrl(selectedAvatar) || null;
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const isFemale = gender?.toUpperCase() === "FEMALE" || gender?.toUpperCase() === "F";
  const SilhouetteIcon = isFemale ? FemaleSilhouette : MaleSilhouette;

  const gradeGradient = grade && GRADE_COLORS[grade] ? GRADE_COLORS[grade] : (color === "cyan" ? "from-cyan-400 to-cyan-600" : "from-purple-400 to-purple-600");
  const glowColor = color === "cyan" ? "rgba(34,211,238,0.3)" : "rgba(168,85,247,0.3)";
  const shadowColor = color === "cyan" ? "rgba(34,211,238,0.15)" : "rgba(168,85,247,0.15)";

  return (
    <div className="relative flex flex-col items-center rivalry-avatar" data-testid={`rivalry-avatar-${side}`}>
      <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: `radial-gradient(circle, ${shadowColor} 0%, transparent 70%)`, transform: "scale(1.5)" }} />
      <div className="relative">
        <div className="absolute inset-0 rounded-full animate-pulse opacity-30" style={{ boxShadow: `0 0 30px 10px ${glowColor}`, borderRadius: "50%" }} />
        <div className={`rounded-full bg-gradient-to-br ${gradeGradient} p-[3px] shadow-xl`} style={{ boxShadow: `0 0 20px 4px ${shadowColor}` }}>
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-background">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-900">
              {avatarSrc ? (
                <span className="text-xl sm:text-2xl font-bold text-slate-300">{initials}</span>
              ) : (
                <div className="relative">
                  <SilhouetteIcon className="h-12 w-12 sm:h-14 sm:w-14 text-slate-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 blur-sm opacity-50 scale-105" />
                  <SilhouetteIcon className="h-12 w-12 sm:h-14 sm:w-14 text-slate-400 relative" />
                </div>
              )}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <p className="font-bold text-sm text-slate-200 mt-2 text-center max-w-[100px] truncate">{name}</p>
      {grade && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${color === "cyan" ? "bg-cyan-500/15 text-cyan-300" : "bg-purple-500/15 text-purple-300"}`}>
          {grade}
        </span>
      )}
    </div>
  );
}

function CourtBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
      <rect x="20" y="10" width="360" height="180" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="200" y1="10" x2="200" y2="190" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="55" width="60" height="90" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="320" y="55" width="60" height="90" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
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

function WinRatioRing({ percentage, color, label, wins, total }: {
  percentage: number; color: "cyan" | "purple"; label: string; wins: number; total: number;
}) {
  const [animated, setAnimated] = useState(0);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (animated / 100) * circumference;
  const strokeColor = color === "cyan" ? "#22d3ee" : "#a855f7";
  const bgColor = color === "cyan" ? "rgba(34,211,238,0.1)" : "rgba(168,85,247,0.1)";

  return (
    <div className="flex flex-col items-center" ref={ringRef} data-testid={`win-ring-${color}`}>
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke={bgColor} strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl sm:text-2xl font-black ${color === "cyan" ? "text-cyan-400" : "text-purple-400"}`}>
            {Math.round(animated)}%
          </span>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Win Rate</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 font-medium">{label}</p>
      <p className="text-[10px] text-slate-500">{wins}W / {total - wins}L</p>
    </div>
  );
}

function RivalryStrengthMeter({ p1Wins, p2Wins, totalMatches }: {
  p1Wins: number; p2Wins: number; totalMatches: number;
}) {
  if (totalMatches === 0) return null;

  const winDiff = Math.abs(p1Wins - p2Wins);
  const ratio = totalMatches > 0 ? winDiff / totalMatches : 0;

  let classification: string;
  let classColor: string;
  let position: number;

  if (ratio >= 0.6) {
    classification = "Dominant Rivalry";
    classColor = "text-red-400";
    position = 15;
  } else if (ratio >= 0.3) {
    classification = "Competitive Rivalry";
    classColor = "text-amber-400";
    position = 50;
  } else {
    classification = "Close Rivalry";
    classColor = "text-emerald-400";
    position = 85;
  }

  return (
    <div className="bg-[#0c1322]/60 rounded-xl p-4 border border-[#1e293b]" data-testid="rivalry-strength">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rivalry Intensity</h4>
        <span className={`text-xs font-bold ${classColor}`}>{classification}</span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-white/20 transition-all duration-1000 ease-out border-2 border-slate-700"
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-red-400/60">Dominant</span>
        <span className="text-[9px] text-amber-400/60">Competitive</span>
        <span className="text-[9px] text-emerald-400/60">Close</span>
      </div>
    </div>
  );
}

function MatchTimeline({ results, player1Name, player2Name }: {
  results: any[]; player1Name: string; player2Name: string;
}) {
  if (!results || results.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="match-timeline">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5" />
        Match Timeline
      </h4>
      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/30 via-slate-700/50 to-purple-500/30" />
        <div className="space-y-2">
          {results.map((r: any, i: number) => {
            const p1Won = r.player1Score > r.player2Score;
            const matchDate = r.date ? new Date(r.date) : null;
            const delay = i * 100;

            return (
              <div
                key={i}
                className="relative pl-10 animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
                data-testid={`timeline-match-${i}`}
              >
                <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 ${
                  p1Won ? "bg-cyan-400 border-cyan-400/50" : "bg-purple-400 border-purple-400/50"
                }`} />
                <div className={`rounded-xl p-3 border transition-all duration-300 hover:scale-[1.01] ${
                  p1Won
                    ? "bg-gradient-to-r from-cyan-500/5 to-transparent border-cyan-500/20"
                    : "bg-gradient-to-r from-purple-500/5 to-transparent border-purple-500/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-black ${p1Won ? "text-cyan-400" : "text-slate-400"}`}>
                        {r.player1Score ?? "?"}
                      </span>
                      <span className="text-[10px] text-slate-600">-</span>
                      <span className={`text-lg font-black ${!p1Won ? "text-purple-400" : "text-slate-400"}`}>
                        {r.player2Score ?? "?"}
                      </span>
                    </div>
                    <div className="text-right">
                      {matchDate && (
                        <p className="text-[10px] text-slate-500">
                          {matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                        </p>
                      )}
                      <p className={`text-[10px] font-semibold ${p1Won ? "text-cyan-300" : "text-purple-300"}`}>
                        {p1Won ? player1Name.split(" ")[0] : player2Name.split(" ")[0]} won
                      </p>
                    </div>
                  </div>
                  {r.sessionTitle && (
                    <p className="text-[9px] text-slate-600 mt-1 truncate">{r.sessionTitle}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MomentumGraph({ results, player1Name, player2Name }: {
  results: any[]; player1Name: string; player2Name: string;
}) {
  if (!results || results.length < 2) return null;

  const p1Label = player1Name.split(" ")[0];
  const p2Label = player2Name.split(" ")[0];
  const p1Key = "p1Wins";
  const p2Key = "p2Wins";

  const data = useMemo(() => {
    const reversed = [...results].reverse();
    let p1Cumulative = 0;
    let p2Cumulative = 0;
    return reversed.map((r, i) => {
      if (r.player1Score > r.player2Score) p1Cumulative++;
      else p2Cumulative++;
      const matchDate = r.date ? new Date(r.date) : null;
      return {
        match: `M${i + 1}`,
        label: matchDate ? matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `Match ${i + 1}`,
        [p1Key]: p1Cumulative,
        [p2Key]: p2Cumulative,
      };
    });
  }, [results]);

  return (
    <div className="bg-[#0c1322]/60 rounded-xl p-4 border border-[#1e293b]" data-testid="momentum-graph">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <TrendingUp className="h-3.5 w-3.5" />
        Rivalry Momentum
      </h4>
      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#0f1729", border: "1px solid #1e293b", borderRadius: "12px", fontSize: "11px" }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, name: string) => [value, name === p1Key ? p1Label : p2Label]}
            />
            <Line type="monotone" dataKey={p1Key} name={p1Label} stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: "#22d3ee", r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey={p2Key} name={p2Label} stroke="#a855f7" strokeWidth={2.5} dot={{ fill: "#a855f7", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-cyan-400" />
          <span className="text-[10px] text-slate-400">{p1Label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-purple-400" />
          <span className="text-[10px] text-slate-400">{p2Label}</span>
        </div>
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
    id: number;
    clubId: number;
    gender: string | null;
    category: string | null;
    grade?: string | null;
    rankingPoints: number;
    matchesPlayed: number;
    matchesWon: number;
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
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate review");
      const data = await res.json();
      setAiReview(data.review);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate AI review", variant: "destructive" });
      setAiReview("Unable to generate AI comparison at this time. Please try again later.");
    } finally {
      setAiLoading(false);
    }
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

  const compMetrics = [
    { label: "Win Rate", v1: `${s1?.winRate || 0}%`, v2: `${s2?.winRate || 0}%`, n1: s1?.winRate || 0, n2: s2?.winRate || 0 },
    { label: "Matches Played", v1: s1?.matchesPlayed || 0, v2: s2?.matchesPlayed || 0, n1: s1?.matchesPlayed || 0, n2: s2?.matchesPlayed || 0 },
    { label: "Points Scored", v1: s1?.pointsScored || 0, v2: s2?.pointsScored || 0, n1: s1?.pointsScored || 0, n2: s2?.pointsScored || 0 },
    { label: "Sessions", v1: s1?.sessionsAttended || 0, v2: s2?.sessionsAttended || 0, n1: s1?.sessionsAttended || 0, n2: s2?.sessionsAttended || 0 },
    { label: "Hours Played", v1: s1?.totalHoursPlayed?.toFixed(1) || "0", v2: s2?.totalHoursPlayed?.toFixed(1) || "0", n1: s1?.totalHoursPlayed || 0, n2: s2?.totalHoursPlayed || 0 },
  ];

  const p1Wins = h2h?.player1Wins || 0;
  const p2Wins = h2h?.player2Wins || 0;
  const totalMatches = h2h?.totalMatches || 0;
  const p1WinRate = totalMatches > 0 ? Math.round((p1Wins / totalMatches) * 100) : 0;
  const p2WinRate = totalMatches > 0 ? Math.round((p2Wins / totalMatches) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="rivalry-arena">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0f1e] via-[#0f1729] to-[#0a0f1e] border border-[#1e293b] p-6 sm:p-8">
        <CourtBackground />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="flex items-center justify-center gap-4 sm:gap-8 relative z-10">
          <RivalryAvatar
            name={player1.fullName}
            profilePictureUrl={player1.profilePictureUrl}
            selectedAvatar={player1.selectedAvatar}
            gender={player1.playerProfiles[0]?.gender}
            grade={player1.playerProfiles[0]?.grade || player1.playerProfiles[0]?.category}
            color="cyan" side="left"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-xl animate-pulse" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#1a2744] to-[#0f1729] flex items-center justify-center border border-slate-600/50 shadow-2xl">
                <Swords className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
              </div>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Rivalry</span>
          </div>

          <RivalryAvatar
            name={player2.fullName}
            profilePictureUrl={player2.profilePictureUrl}
            selectedAvatar={player2.selectedAvatar}
            gender={player2.playerProfiles[0]?.gender}
            grade={player2.playerProfiles[0]?.grade || player2.playerProfiles[0]?.category}
            color="purple" side="right"
          />
        </div>

        {totalMatches > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-6 relative z-10">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-cyan-400 tabular-nums">
                <AnimatedNumber value={p1Wins} />
              </p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Wins</p>
            </div>
            <div className="text-center">
              <div className="w-px h-8 bg-slate-700 mx-auto mb-1" />
              <p className="text-xl sm:text-2xl font-black text-slate-600 tabular-nums">
                <AnimatedNumber value={totalMatches} />
              </p>
              <p className="text-[9px] text-slate-600 font-medium uppercase tracking-wider mt-1">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-purple-400 tabular-nums">
                <AnimatedNumber value={p2Wins} />
              </p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Wins</p>
            </div>
          </div>
        )}
      </div>

      <RivalryStrengthMeter p1Wins={p1Wins} p2Wins={p2Wins} totalMatches={totalMatches} />

      {totalMatches > 0 && (
        <div className="flex justify-center gap-6 sm:gap-10 py-2">
          <WinRatioRing
            percentage={p1WinRate}
            color="cyan"
            label={player1.fullName.split(" ")[0]}
            wins={p1Wins}
            total={totalMatches}
          />
          <WinRatioRing
            percentage={p2WinRate}
            color="purple"
            label={player2.fullName.split(" ")[0]}
            wins={p2Wins}
            total={totalMatches}
          />
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Swords className="h-3.5 w-3.5 text-cyan-400" />
          Stats Comparison
        </h4>
        {compMetrics.map((m) => {
          const p1Better = m.n1 > m.n2;
          const equal = m.n1 === m.n2;
          const total = m.n1 + m.n2;
          const p1Pct = total > 0 ? (m.n1 / total) * 100 : 50;
          return (
            <div key={m.label} className="space-y-1.5 bg-[#0c1322]/60 rounded-xl p-3 border border-[#1e293b] hover:border-slate-600/50 transition-colors">
              <div className="flex justify-between text-sm">
                <span className={p1Better && !equal ? "font-bold text-cyan-300" : "text-slate-300"}>{m.v1}</span>
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{m.label}</span>
                <span className={!p1Better && !equal ? "font-bold text-purple-400" : "text-slate-300"}>{m.v2}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-800/50">
                <div className="bg-gradient-to-r from-cyan-400 to-cyan-500/70 rounded-l-full transition-all duration-700 ease-out" style={{ width: `${p1Pct}%` }} />
                <div className="bg-gradient-to-l from-purple-400 to-purple-500/70 rounded-r-full transition-all duration-700 ease-out" style={{ width: `${100 - p1Pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {h2h?.recentResults && h2h.recentResults.length > 0 && (
        <MatchTimeline
          results={h2h.recentResults}
          player1Name={player1.fullName}
          player2Name={player2.fullName}
        />
      )}

      {h2h?.recentResults && h2h.recentResults.length >= 2 && (
        <MomentumGraph
          results={h2h.recentResults}
          player1Name={player1.fullName}
          player2Name={player2.fullName}
        />
      )}

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#0c1322] border border-[#1e293b]">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        <div className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              AI Rivalry Analysis
            </h4>
            {aiReview && !aiLoading && (
              <Button
                size="sm" variant="outline"
                onClick={generateAiReview}
                disabled={aiLoading}
                className="text-xs bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30 hover:border-purple-500/50 text-slate-300 hover:text-white"
                data-testid="button-generate-ai-review"
              >
                <Brain className="h-3 w-3 mr-1.5" />
                Regenerate
              </Button>
            )}
          </div>

          {aiLoading && (
            <div className="text-center py-10 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
              <p className="text-sm text-slate-400 animate-pulse">Analyzing rivalry patterns...</p>
            </div>
          )}

          {aiReview && !aiLoading && (
            <div className="space-y-3" data-testid="text-ai-review">
              {aiReview.split("\n").filter(line => line.trim()).map((paragraph, i) => {
                const isBold = paragraph.startsWith("**") || paragraph.match(/^\d+\.\s*\*\*/);
                const cleaned = paragraph.replace(/\*\*/g, "");
                const isHeading = cleaned.match(/^(\d+\.\s*)?[A-Z].*[:—-]\s*/);

                if (isHeading) {
                  const parts = cleaned.split(/[:—-]\s*/);
                  const heading = parts[0];
                  const rest = parts.slice(1).join(": ");
                  return (
                    <div key={i} className="mt-4 first:mt-0">
                      <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-1.5">{heading}</h5>
                      {rest && <p className="text-[13px] leading-relaxed text-slate-300">{rest}</p>}
                    </div>
                  );
                }
                return (
                  <p key={i} className={`text-[13px] leading-relaxed ${isBold ? "text-slate-200 font-medium" : "text-slate-400"}`}>
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
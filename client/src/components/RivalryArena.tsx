import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/components/AvatarPicker";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Sparkles, Brain, Loader2, Trophy,
  TrendingUp, TrendingDown, Calendar
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import maleSilhouetteSrc from "@assets/image_1773003848338.png";

function MaleSilhouette({ className = "" }: { className?: string }) {
  return (
    <img src={maleSilhouetteSrc} alt="Player silhouette" className={`${className} object-contain`} style={{ filter: "brightness(0) invert(0.45)" }} />
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

function ScoreRing({ percentage, color, size = 120 }: {
  percentage: number; color: string; size?: number;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(percentage), 150);
    return () => clearTimeout(timer);
  }, [percentage]);

  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animated / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-black text-white">{Math.round(animated)}%</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Win Rate</span>
      </div>
    </div>
  );
}

function StatBar({ label, value, maxValue, color }: {
  label: string; value: number; maxValue: number; color: string;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(maxValue > 0 ? (value / maxValue) * 100 : 0), 200);
    return () => clearTimeout(timer);
  }, [value, maxValue]);

  return (
    <div className="flex items-center gap-3" data-testid={`stat-bar-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${animated}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

function PlayerCard({ player, stats, h2hWins, h2hTotal, color, accentColor, side }: {
  player: any; stats: any; h2hWins: number; h2hTotal: number;
  color: string; accentColor: string; side: "left" | "right";
}) {
  const avatarSrc = player.profilePictureUrl || getAvatarUrl(player.selectedAvatar) || null;
  const gender = player.playerProfiles?.[0]?.gender;
  const grade = player.playerProfiles?.[0]?.grade || player.playerProfiles?.[0]?.category;
  const isFemale = gender?.toUpperCase() === "FEMALE" || gender?.toUpperCase() === "F";
  const SilhouetteIcon = isFemale ? FemaleSilhouette : MaleSilhouette;
  const winRate = stats?.winRate || 0;

  const statItems = [
    { label: "Matches", value: stats?.matchesPlayed || 0 },
    { label: "Wins", value: stats?.matchesWon || 0 },
    { label: "Points", value: stats?.pointsScored || 0 },
    { label: "Sessions", value: stats?.sessionsAttended || 0 },
  ];

  const maxVal = Math.max(...statItems.map(s => s.value), 1);

  return (
    <div
      className="flex-1 rounded-2xl border border-white/[0.06] p-4 sm:p-5 flex flex-col items-center gap-4"
      style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)" }}
      data-testid={`player-card-${side}`}
    >
      <div className="w-full h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <div
            className="rounded-full p-[2.5px]"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}44)` }}
          >
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-[#0a0f1e]">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={player.fullName} className="object-cover" />}
              <AvatarFallback className="bg-[#0c1322]">
                <SilhouetteIcon className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white text-center leading-tight mt-1">{player.fullName}</h3>
        {grade && (
          <span
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-md"
            style={{ background: `${color}18`, color: color, border: `1px solid ${color}30` }}
          >
            {grade}
          </span>
        )}
      </div>

      <ScoreRing percentage={winRate} color={color} size={110} />

      <div className="w-full space-y-2.5 pt-1">
        {statItems.map(s => (
          <StatBar key={s.label} label={s.label} value={s.value} maxValue={maxVal} color={color} />
        ))}
      </div>

      {h2hTotal > 0 && (
        <div className="w-full pt-2 border-t border-white/[0.05]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">H2H Wins</span>
            <span className="text-lg font-black" style={{ color }}>{h2hWins}<span className="text-slate-600 text-xs font-medium">/{h2hTotal}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchTimeline({ results, player1Name, player2Name, color1, color2 }: {
  results: any[]; player1Name: string; player2Name: string; color1: string; color2: string;
}) {
  if (!results || results.length === 0) return null;
  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-4 sm:p-5"
      style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)" }}
      data-testid="match-timeline"
    >
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Calendar className="h-3.5 w-3.5 text-slate-500" />
        Recent Head-to-Head
      </h4>
      <div className="space-y-2">
        {results.slice(0, 6).map((r: any, i: number) => {
          const p1Won = r.player1Score > r.player2Score;
          const matchDate = r.date ? new Date(r.date) : null;
          const winColor = p1Won ? color1 : color2;
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              style={{ background: "rgba(255,255,255,0.02)" }}
              data-testid={`timeline-match-${i}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-6 rounded-full shrink-0" style={{ background: winColor }} />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black tabular-nums" style={{ color: p1Won ? color1 : "rgba(148,163,184,0.5)" }}>
                    {r.player1Score ?? "?"}
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">—</span>
                  <span className="text-base font-black tabular-nums" style={{ color: !p1Won ? color2 : "rgba(148,163,184,0.5)" }}>
                    {r.player2Score ?? "?"}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {matchDate && (
                  <p className="text-[10px] text-slate-500 tabular-nums">
                    {matchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                )}
                <p className="text-[9px] font-semibold" style={{ color: winColor }}>
                  {p1Won ? player1Name.split(" ")[0] : player2Name.split(" ")[0]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MomentumGraph({ results, player1Name, player2Name, color1, color2 }: {
  results: any[]; player1Name: string; player2Name: string; color1: string; color2: string;
}) {
  if (!results || results.length < 2) return null;

  const p1Label = player1Name.split(" ")[0];
  const p2Label = player2Name.split(" ")[0];

  const data = useMemo(() => {
    const reversed = [...results].reverse();
    let p1C = 0, p2C = 0;
    return reversed.map((r, i) => {
      if (r.player1Score > r.player2Score) p1C++; else p2C++;
      const d = r.date ? new Date(r.date) : null;
      return {
        label: d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : `M${i+1}`,
        p1Wins: p1C, p2Wins: p2C,
      };
    });
  }, [results]);

  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-4 sm:p-5"
      style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)" }}
      data-testid="momentum-graph"
    >
      <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
        <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
        Momentum
      </h4>
      <div className="h-36 sm:h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#0f1729", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px" }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, name: string) => [value, name === "p1Wins" ? p1Label : p2Label]}
            />
            <Line type="monotone" dataKey="p1Wins" name={p1Label} stroke={color1} strokeWidth={2.5} dot={{ fill: color1, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="p2Wins" name={p2Label} stroke={color2} strokeWidth={2.5} dot={{ fill: color2, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded-full" style={{ background: color1 }} />
          <span className="text-[10px] text-slate-400">{p1Label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded-full" style={{ background: color2 }} />
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

  const COLOR1 = "#818cf8";
  const COLOR2 = "#c084fc";

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
  const p1Wins = h2h?.player1Wins || 0;
  const p2Wins = h2h?.player2Wins || 0;
  const totalMatches = h2h?.totalMatches || 0;

  return (
    <div className="space-y-4" data-testid="rivalry-arena">
      <div className="text-center mb-2">
        <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">Player Performance Comparison</h2>
        <div className="w-full h-[2px] rounded-full mt-2" style={{ background: `linear-gradient(90deg, ${COLOR1}, transparent 40%, transparent 60%, ${COLOR2})` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 relative">
        <PlayerCard
          player={player1}
          stats={s1}
          h2hWins={p1Wins}
          h2hTotal={totalMatches}
          color={COLOR1}
          accentColor={COLOR1}
          side="left"
        />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-[#0a0f1e] shadow-xl"
            style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}
          >
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase">Vs</span>
          </div>
        </div>

        <PlayerCard
          player={player2}
          stats={s2}
          h2hWins={p2Wins}
          h2hTotal={totalMatches}
          color={COLOR2}
          accentColor={COLOR2}
          side="right"
        />
      </div>

      {h2h?.recentResults && h2h.recentResults.length > 0 && (
        <MatchTimeline
          results={h2h.recentResults}
          player1Name={player1.fullName}
          player2Name={player2.fullName}
          color1={COLOR1}
          color2={COLOR2}
        />
      )}

      {h2h?.recentResults && h2h.recentResults.length >= 2 && (
        <MomentumGraph
          results={h2h.recentResults}
          player1Name={player1.fullName}
          player2Name={player2.fullName}
          color1={COLOR1}
          color2={COLOR2}
        />
      )}

      <div
        className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)" }}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400/70" />
              AI Rivalry Analysis
            </h4>
            {aiReview && !aiLoading && (
              <Button
                size="sm" variant="ghost"
                onClick={generateAiReview}
                disabled={aiLoading}
                className="text-[10px] h-7 px-2 text-slate-400 hover:text-white"
                data-testid="button-generate-ai-review"
              >
                <Brain className="h-3 w-3 mr-1" />
                Regenerate
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
                const isBold = paragraph.startsWith("**") || paragraph.match(/^\d+\.\s*\*\*/);
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
                return (
                  <p key={i} className={`text-xs leading-relaxed ${isBold ? "text-slate-300 font-medium" : "text-slate-500"}`}>
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
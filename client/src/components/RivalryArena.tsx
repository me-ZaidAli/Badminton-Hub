import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/components/AvatarPicker";
import { useToast } from "@/hooks/use-toast";
import {
  Swords, Sparkles, Brain, Loader2, Trophy,
  TrendingUp, Calendar
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import maleSilhouetteSrc from "@assets/male_badminton_silhouette.png";
import femaleSilhouetteSrc from "@assets/female_badminton_silhouette.png";

function getPlayerImage(player: any) {
  return player.profilePictureUrl || getAvatarUrl(player.selectedAvatar) || null;
}

function getGenderSilhouette(gender?: string | null) {
  const isFemale = gender?.toUpperCase() === "FEMALE" || gender?.toUpperCase() === "F";
  return isFemale ? femaleSilhouetteSrc : maleSilhouetteSrc;
}

function ScoreRing({ percentage, color, size = 100 }: {
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
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl sm:text-2xl font-black text-white">{Math.round(animated)}%</span>
        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold">Win Rate</span>
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
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${animated}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

function HeroBanner({ player1, player2, p1Wins, p2Wins, totalMatches, color1, color2 }: {
  player1: any; player2: any; p1Wins: number; p2Wins: number; totalMatches: number;
  color1: string; color2: string;
}) {
  const p1Img = getPlayerImage(player1);
  const p2Img = getPlayerImage(player2);
  const p1Gender = player1.playerProfiles?.[0]?.gender;
  const p2Gender = player2.playerProfiles?.[0]?.gender;
  const p1Grade = player1.playerProfiles?.[0]?.grade || player1.playerProfiles?.[0]?.category;
  const p2Grade = player2.playerProfiles?.[0]?.grade || player2.playerProfiles?.[0]?.category;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.06]"
      style={{ background: "linear-gradient(180deg, #0c1425 0%, #070d1a 100%)" }}
      data-testid="hero-banner"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/[0.06] via-transparent to-purple-600/[0.06]" />
      <div className="absolute top-0 left-1/4 w-40 h-40 bg-indigo-500/[0.04] rounded-full blur-3xl" />
      <div className="absolute top-0 right-1/4 w-40 h-40 bg-purple-500/[0.04] rounded-full blur-3xl" />

      <div className="text-center pt-4 sm:pt-5 relative z-10">
        <h2 className="text-base sm:text-lg font-black text-amber-400/90 uppercase tracking-[0.2em] leading-tight">
          Head<br/>
          <span className="text-[10px] sm:text-xs text-slate-500 tracking-[0.3em]">to</span><br/>
          Head
        </h2>
      </div>

      <div className="flex items-end justify-center relative z-10 mt-2">
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-[180px] sm:max-w-[220px]">
            {p1Img ? (
              <img
                src={p1Img}
                alt={player1.fullName}
                className="w-full h-44 sm:h-56 object-cover object-top rounded-t-xl"
                style={{ maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)" }}
              />
            ) : (
              <div className="w-full h-44 sm:h-56 flex items-end justify-center pb-2">
                <img
                  src={getGenderSilhouette(p1Gender)}
                  alt="Player silhouette"
                  className="h-36 sm:h-48 object-contain drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]"
                  style={{ filter: "invert(1) brightness(0.6) sepia(1) hue-rotate(200deg) saturate(2)" }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="absolute left-1/2 bottom-20 sm:bottom-24 -translate-x-1/2 z-20">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 shadow-2xl"
            style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <Swords className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-[180px] sm:max-w-[220px]">
            {p2Img ? (
              <img
                src={p2Img}
                alt={player2.fullName}
                className="w-full h-44 sm:h-56 object-cover object-top rounded-t-xl"
                style={{ maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)" }}
              />
            ) : (
              <div className="w-full h-44 sm:h-56 flex items-end justify-center pb-2">
                <img
                  src={getGenderSilhouette(p2Gender)}
                  alt="Player silhouette"
                  className="h-36 sm:h-48 object-contain drop-shadow-[0_0_15px_rgba(192,132,252,0.3)]"
                  style={{ filter: "invert(1) brightness(0.6) sepia(1) hue-rotate(240deg) saturate(2)" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-4 sm:pb-5">
        <div className="flex items-start justify-center gap-4 sm:gap-8 px-4">
          <div className="flex-1 text-center">
            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-wide leading-tight">{player1.fullName}</h3>
            {p1Grade && (
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1"
                style={{ background: `${color1}20`, color: color1 }}
              >
                {p1Grade}
              </span>
            )}
          </div>
          <div className="flex-1 text-center">
            <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-wide leading-tight">{player2.fullName}</h3>
            {p2Grade && (
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1"
                style={{ background: `${color2}20`, color: color2 }}
              >
                {p2Grade}
              </span>
            )}
          </div>
        </div>

        {totalMatches > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-4 px-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: color1 }}>{p1Wins}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Wins</p>
            </div>
            <div className="text-center">
              <div className="w-px h-6 bg-slate-700 mx-auto mb-1" />
              <p className="text-lg sm:text-xl font-black text-slate-600 tabular-nums">{totalMatches}</p>
              <p className="text-[8px] text-slate-600 uppercase tracking-wider font-medium">Played</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black tabular-nums" style={{ color: color2 }}>{p2Wins}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Wins</p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${color1}, transparent 45%, transparent 55%, ${color2})` }} />
    </div>
  );
}

function StatsCard({ player, stats, h2hWins, h2hTotal, color, side }: {
  player: any; stats: any; h2hWins: number; h2hTotal: number;
  color: string; side: "left" | "right";
}) {
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
      className="flex-1 rounded-2xl border border-white/[0.06] p-3 sm:p-4 flex flex-col items-center gap-3"
      style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,0.98) 100%)" }}
      data-testid={`stats-card-${side}`}
    >
      <ScoreRing percentage={winRate} color={color} size={100} />

      <div className="w-full space-y-2">
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
      <HeroBanner
        player1={player1}
        player2={player2}
        p1Wins={p1Wins}
        p2Wins={p2Wins}
        totalMatches={totalMatches}
        color1={COLOR1}
        color2={COLOR2}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatsCard
          player={player1}
          stats={s1}
          h2hWins={p1Wins}
          h2hTotal={totalMatches}
          color={COLOR1}
          side="left"
        />
        <StatsCard
          player={player2}
          stats={s2}
          h2hWins={p2Wins}
          h2hTotal={totalMatches}
          color={COLOR2}
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
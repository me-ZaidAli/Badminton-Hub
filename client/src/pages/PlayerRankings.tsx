import { useState, useMemo } from "react";
import { useClubs, useFilteredLeaderboard, type LeaderboardFilters, type LeaderboardPlayer } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  Trophy, Search, Star, Flame, Target, Zap, Award, Medal, Loader2, TrendingUp, Percent, Swords, Info,
  Crown, Shield, Sparkles, MoreVertical, ChevronLeft, User as UserIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import heroMalePlayer from "@assets/hero_male_player.png";
import heroFemalePlayer from "@assets/hero_female_player.png";

type Membership = {
  clubId: number;
  clubName: string;
  membershipStatus: string;
  profileId: number;
};

function getTimePeriodDates(period: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (period === "all") return {};
  if (period === "last30") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { dateFrom: d.toISOString() };
  }
  if (period === "thisMonth") {
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (period === "thisSeason") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    const startMonth = (q - 1) * 3;
    return {
      dateFrom: new Date(now.getFullYear(), startMonth, 1).toISOString(),
      dateTo: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59).toISOString(),
    };
  }
  return {};
}

function getAchievements(player: LeaderboardPlayer): { icon: any; label: string; color: string }[] {
  const badges: { icon: any; label: string; color: string }[] = [];
  if (player.matchesWon >= 5) badges.push({ icon: Flame, label: "5+ Wins", color: "text-orange-400" });
  if (player.matchesPlayed >= 10) badges.push({ icon: Star, label: "10+ Matches", color: "text-amber-400" });
  if (player.winPercentage >= 75 && player.matchesPlayed >= 4) badges.push({ icon: Award, label: "Top Performer", color: "text-violet-300" });
  if (player.matchesWon >= 1 && player.matchesPlayed <= 3) badges.push({ icon: Zap, label: "First Win", color: "text-emerald-400" });
  if ((player as any).winStreak >= 10) badges.push({ icon: Medal, label: "Undefeated", color: "text-yellow-400" });
  return badges;
}

interface BadgeHolder {
  id: number;
  icon: any;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  holderName: string;
}

function getBadgeHolders(players: any[]): BadgeHolder[] {
  const holders: BadgeHolder[] = [];
  const usedIds = new Set<number>();
  if (players.length === 0) return holders;

  const maxWins = Math.max(...players.map(p => p.matchesWon));
  if (maxWins > 0) {
    const champion = players.find(p => p.matchesWon === maxWins);
    if (champion) {
      const id = champion.id || champion.profileId;
      usedIds.add(id);
      holders.push({ id, icon: Crown, label: "Champion", description: "Most wins overall", color: "text-amber-400", bgColor: "bg-amber-500/15", holderName: champion.displayName || champion.fullName || "Unknown" });
    }
  }

  const eligible = players.filter(p => p.matchesPlayed >= 5);
  if (eligible.length > 0) {
    const maxPct = Math.max(...eligible.map(p => p.winPercentage));
    if (maxPct > 0) {
      const sharpshooter = eligible.find(p => p.winPercentage === maxPct);
      if (sharpshooter) {
        const id = sharpshooter.id || sharpshooter.profileId;
        if (!usedIds.has(id)) {
          usedIds.add(id);
          holders.push({ id, icon: Target, label: "Sharpshooter", description: "Highest win rate (min 5 matches)", color: "text-rose-400", bgColor: "bg-rose-500/15", holderName: sharpshooter.displayName || sharpshooter.fullName || "Unknown" });
        }
      }
    }
  }

  const maxMatches = Math.max(...players.map(p => p.matchesPlayed));
  if (maxMatches > 0) {
    const ironman = players.find(p => p.matchesPlayed === maxMatches);
    if (ironman) {
      const id = ironman.id || ironman.profileId;
      if (!usedIds.has(id)) {
        usedIds.add(id);
        holders.push({ id, icon: Shield, label: ironman.gender === "FEMALE" ? "Iron Woman" : "Iron Man", description: "Most matches played", color: "text-sky-400", bgColor: "bg-sky-500/15", holderName: ironman.displayName || ironman.fullName || "Unknown" });
      }
    }
  }

  const newcomers = players.filter(p => p.matchesPlayed >= 3 && p.matchesPlayed <= 10);
  if (newcomers.length > 0) {
    const maxNewPct = Math.max(...newcomers.map(p => p.winPercentage));
    if (maxNewPct > 0) {
      const star = newcomers.find(p => p.winPercentage === maxNewPct);
      if (star) {
        const id = star.id || star.profileId;
        if (!usedIds.has(id)) {
          usedIds.add(id);
          holders.push({ id, icon: Sparkles, label: "Rising Star", description: "Best newcomer (3-10 matches)", color: "text-pink-400", bgColor: "bg-pink-500/15", holderName: star.displayName || star.fullName || "Unknown" });
        }
      }
    }
  }

  return holders;
}

function getUniqueBadges(players: any[]): Map<number, { icon: any; label: string; color: string; bgColor: string }> {
  const holders = getBadgeHolders(players);
  const badges = new Map<number, { icon: any; label: string; color: string; bgColor: string }>();
  holders.forEach(h => badges.set(h.id, { icon: h.icon, label: h.label, color: h.color, bgColor: h.bgColor }));
  return badges;
}

const PLACE_META: Record<1 | 2 | 3, { label: string; ringFrom: string; ringTo: string; chip: string }> = {
  1: { label: "1st", ringFrom: "from-amber-300", ringTo: "to-yellow-500", chip: "bg-amber-400/20 text-amber-200 border-amber-300/30" },
  2: { label: "2nd", ringFrom: "from-slate-200", ringTo: "to-slate-400", chip: "bg-slate-300/15 text-slate-100 border-slate-200/30" },
  3: { label: "3rd", ringFrom: "from-orange-400", ringTo: "to-amber-700", chip: "bg-orange-500/15 text-orange-200 border-orange-400/30" },
};

function HeroPlayerCard({
  player,
  place,
  computePoints,
  isMe,
  uniqueBadge,
  onClick,
}: {
  player: any;
  place: 1 | 2 | 3;
  computePoints: (p: LeaderboardPlayer) => number;
  isMe: boolean;
  uniqueBadge?: { icon: any; label: string; color: string; bgColor: string };
  onClick: () => void;
}) {
  const meta = PLACE_META[place];
  const heroImg = player.gender === "FEMALE" ? heroFemalePlayer : heroMalePlayer;
  const points = computePoints(player);
  const winRate = player.winPercentage;
  const heatPct = Math.min(100, Math.round(winRate));
  const initials = (player.displayName || player.fullName || "?").substring(0, 2).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      data-testid={`hero-player-${place}`}
      className="group relative w-full text-left rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer"
      style={{
        background:
          "linear-gradient(155deg, hsl(var(--card) / 0.85) 0%, hsl(var(--card) / 0.55) 60%, hsl(232 50% 14% / 0.7) 100%)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        border: "1px solid hsl(0 0% 100% / 0.08)",
        boxShadow:
          "inset 0 1px 0 hsl(0 0% 100% / 0.08), 0 24px 60px -20px hsl(0 0% 0% / 0.55), 0 0 0 1px hsl(252 90% 68% / 0.08)",
      }}
    >
      {/* Atmospheric violet wash */}
      <div className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, hsl(252 90% 60% / 0.28) 0%, transparent 55%), radial-gradient(80% 60% at 0% 100%, hsl(217 90% 50% / 0.22) 0%, transparent 60%)",
        }}
      />

      {/* Hero photo bleed */}
      <div
        className="pointer-events-none absolute right-[-30px] bottom-0 w-[78%] h-full opacity-90 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          maskImage: "linear-gradient(to left, black 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col min-h-[320px]">
        {/* Top bar — place chip + kebab */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}>
            <Crown className="h-3 w-3" />
            {meta.label}
          </div>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 rounded-full grid place-items-center bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            data-testid={`hero-kebab-${place}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar with violet glow ring */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative">
            <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${meta.ringFrom} ${meta.ringTo} opacity-60 blur-md`} />
            <Avatar className="relative h-16 w-16 ring-2 ring-white/20">
              <AvatarImage src={(player as any).profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
              <AvatarFallback className="bg-violet-500/20 text-white text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
              {player.displayName || player.fullName}
              {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground border border-accent/30">You</span>}
            </div>
            {player.clubName && (
              <div className="text-[11px] text-white/60 truncate">{player.clubName}</div>
            )}
            {uniqueBadge && (
              <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${uniqueBadge.bgColor} ${uniqueBadge.color}`}>
                <uniqueBadge.icon className="h-3 w-3" />
                {uniqueBadge.label}
              </div>
            )}
          </div>
        </div>

        {/* Stat strip overlay */}
        <div
          className="mt-auto rounded-2xl px-4 py-3 grid grid-cols-3 gap-2"
          style={{
            background: "linear-gradient(180deg, hsl(232 40% 8% / 0.55), hsl(232 40% 6% / 0.7))",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid hsl(0 0% 100% / 0.06)",
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Win %</div>
            <div className="text-lg font-black text-white tabular-nums">{Number.isInteger(winRate) ? winRate : winRate.toFixed(1)}<span className="text-xs text-white/50">%</span></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">W / L</div>
            <div className="text-lg font-black tabular-nums">
              <span className="text-emerald-300">{player.matchesWon}</span>
              <span className="text-white/30 mx-0.5">/</span>
              <span className="text-rose-300">{player.matchesLost}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Pts</div>
            <div className="text-lg font-black text-white tabular-nums">{points}</div>
          </div>
        </div>

        {/* Heat-index progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-white/55 mb-1">
            <span className="uppercase tracking-wider font-semibold">Win Index</span>
            <span className="tabular-nums font-bold text-white/85">{heatPct}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${heatPct}%`,
                background:
                  "linear-gradient(90deg, hsl(252 90% 68%) 0%, hsl(217 90% 60%) 60%, hsl(160 80% 55%) 100%)",
                boxShadow: "0 0 10px hsl(252 90% 68% / 0.5)",
              }}
            />
          </div>
        </div>

        {/* Bottom action chip row */}
        <div className="mt-4 flex items-center gap-2">
          <Chip>
            <Swords className="h-3 w-3" />
            <span className="tabular-nums">{player.matchesPlayed}</span>
          </Chip>
          {(player as any).grade && (
            <Chip>
              <span className="font-mono">{(player as any).grade}</span>
            </Chip>
          )}
          <ChipPrimary>
            <UserIcon className="h-3 w-3" />
            <span>Profile</span>
          </ChipPrimary>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/85 bg-white/5 border border-white/10 backdrop-blur"
    >
      {children}
    </span>
  );
}

function ChipPrimary({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30"
    >
      {children}
    </span>
  );
}

function CompactPlayerCard({
  player,
  isMe,
  uniqueBadge,
  achievements,
  onClick,
}: {
  player: any;
  isMe: boolean;
  uniqueBadge?: { icon: any; label: string; color: string; bgColor: string };
  achievements: { icon: any; label: string; color: string }[];
  onClick: () => void;
}) {
  const heatPct = Math.min(100, Math.round(player.winPercentage));
  const initials = (player.displayName || player.fullName || "?").substring(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`compact-player-${player.id}`}
      className="group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--card) / 0.7) 0%, hsl(var(--card) / 0.5) 100%)",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: `1px solid ${isMe ? "hsl(252 90% 68% / 0.45)" : "hsl(0 0% 100% / 0.07)"}`,
        boxShadow:
          isMe
            ? "0 10px 30px -16px hsl(252 90% 68% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.06)"
            : "0 8px 22px -16px hsl(0 0% 0% / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "radial-gradient(60% 80% at 100% 50%, hsl(252 90% 68% / 0.12) 0%, transparent 60%)" }}
      />
      <div className="relative z-10 flex items-center gap-3 px-3 py-3 sm:px-4">
        {/* Rank pill */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-white/5 border border-white/10">
          <span className="text-sm font-black text-white/90 tabular-nums">
            {player.isTied ? `=${player.rank}` : player.rank}
          </span>
        </div>

        {/* Avatar with optional badge */}
        <div className="relative flex-shrink-0">
          {uniqueBadge && (
            <div className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full grid place-items-center ${uniqueBadge.bgColor} border border-background`} title={uniqueBadge.label}>
              <uniqueBadge.icon className={`w-3 h-3 ${uniqueBadge.color}`} />
            </div>
          )}
          <Avatar className="h-10 w-10 ring-2 ring-white/10">
            <AvatarImage src={(player as any).profilePhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
            <AvatarFallback className="bg-violet-500/20 text-white text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
            {player.displayName || player.fullName}
            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/25 text-white border border-accent/40 font-bold">You</span>}
            {player.matchesPlayed <= 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold">New</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {(player as any).grade && (
              <span className="text-[10px] font-mono font-bold text-white/85 px-1.5 py-0.5 rounded bg-white/10 border border-white/10">
                {(player as any).grade}
              </span>
            )}
            {player.clubName && (
              <span className="text-[11px] text-white/55 truncate">{player.clubName}</span>
            )}
          </div>
          {/* Heat bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden max-w-[140px]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${heatPct}%`,
                  background: "linear-gradient(90deg, hsl(252 90% 68%), hsl(217 90% 60%) 60%, hsl(160 80% 55%))",
                }}
              />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-white/75">{heatPct}%</span>
          </div>
        </div>

        {/* Right stat strip */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 pl-2">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">W / L</div>
          <div className="text-sm font-black tabular-nums">
            <span className="text-emerald-300">{player.matchesWon}</span>
            <span className="text-white/25 mx-0.5">/</span>
            <span className="text-rose-300">{player.matchesLost}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 pl-2 min-w-[52px]">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Pts</div>
          <div className="text-base font-black text-white tabular-nums" data-testid={`text-points-${player.id}`}>
            {player.totalPoints}
          </div>
        </div>

        {/* Achievement icons */}
        {achievements.length > 0 && (
          <div className="hidden md:flex items-center gap-1 pl-2">
            {achievements.slice(0, 3).map((a, i) => (
              <div key={i} title={a.label} className="w-6 h-6 rounded-md grid place-items-center bg-white/5 border border-white/10">
                <a.icon className={`w-3 h-3 ${a.color}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function StatTile({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  accent: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card) / 0.7), hsl(var(--card) / 0.45))",
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
        border: "1px solid hsl(0 0% 100% / 0.07)",
        boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.05), 0 8px 22px -16px hsl(0 0% 0% / 0.5)",
      }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div className="relative z-10 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: accent }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">{label}</p>
          <p className="text-xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function PlayerRankings() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const [clubScope, setClubScope] = useState<"my" | "all">("my");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [matchType, setMatchType] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const { data: memberships } = useQuery<Membership[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const myClubIds = useMemo(() => {
    if (!memberships) return new Set<number>();
    return new Set(memberships.filter(m => m.membershipStatus === "APPROVED").map(m => m.clubId));
  }, [memberships]);

  const myClubs = useMemo(() => {
    if (!clubs) return [];
    return clubs.filter(c => myClubIds.has(c.id));
  }, [clubs, myClubIds]);

  const displayClubs = clubScope === "my" ? myClubs : (clubs || []);

  const timeDates = useMemo(() => getTimePeriodDates(timePeriod), [timePeriod]);

  const filters: LeaderboardFilters = useMemo(() => {
    const f: LeaderboardFilters = {};
    if (selectedClubId !== "all") {
      f.clubId = Number(selectedClubId);
    }
    if (category !== "all") f.category = category;
    if (gender !== "all") f.gender = gender;
    if (matchType !== "all") f.matchType = matchType;
    if (timeDates.dateFrom) f.dateFrom = timeDates.dateFrom;
    if (timeDates.dateTo) f.dateTo = timeDates.dateTo;
    return f;
  }, [selectedClubId, category, gender, matchType, timeDates]);

  const { data: leaderboard, isLoading } = useFilteredLeaderboard(filters);

  const gradeRank = (grade: string | null | undefined): number => {
    const order = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
    const idx = order.indexOf(grade || "");
    return idx >= 0 ? idx : -1;
  };

  const computePoints = (player: LeaderboardPlayer): number => {
    return (player.matchesWon * 3) + (player.matchesLost * 1);
  };

  const scopedLeaderboard = useMemo(() => {
    if (!leaderboard) return [];
    if (clubScope === "my" && selectedClubId === "all") {
      return leaderboard.filter(p => p.clubId && myClubIds.has(p.clubId));
    }
    return leaderboard;
  }, [leaderboard, clubScope, selectedClubId, myClubIds]);

  const sortedLeaderboard = useMemo(() => {
    const result = [...scopedLeaderboard];
    if (sortBy === "grade") {
      result.sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade));
    } else if (sortBy === "winpct") {
      result.sort((a, b) => b.winPercentage - a.winPercentage || b.matchesWon - a.matchesWon);
    } else if (sortBy === "matches") {
      result.sort((a, b) => b.matchesPlayed - a.matchesPlayed || b.matchesWon - a.matchesWon);
    } else if (sortBy === "points") {
      result.sort((a, b) => computePoints(b) - computePoints(a) || b.matchesWon - a.matchesWon);
    } else {
      result.sort((a, b) => b.matchesWon - a.matchesWon || b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed);
    }
    return result;
  }, [scopedLeaderboard, sortBy]);

  const fullRankedLeaderboard = useMemo(() => {
    let currentRank = 0;
    let lastWins = -1;
    let lastPct = -1;
    return sortedLeaderboard.map((player, index) => {
      const isTied = player.matchesWon === lastWins && player.winPercentage === lastPct;
      if (!isTied) currentRank = index + 1;
      lastWins = player.matchesWon;
      lastPct = player.winPercentage;
      return { ...player, rank: currentRank, isTied, totalPoints: computePoints(player) };
    });
  }, [sortedLeaderboard]);

  const rankedLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return fullRankedLeaderboard;
    const q = searchQuery.toLowerCase();
    return fullRankedLeaderboard.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      (p.clubName && p.clubName.toLowerCase().includes(q))
    );
  }, [fullRankedLeaderboard, searchQuery]);

  const myProfile = user?.playerProfile;
  const myStats = useMemo(() => {
    if (!myProfile || !scopedLeaderboard) return null;
    return scopedLeaderboard.find(p => p.id === myProfile.id) || null;
  }, [myProfile, scopedLeaderboard]);

  const myRank = useMemo(() => {
    if (!myProfile) return null;
    const idx = rankedLeaderboard.findIndex(p => p.id === myProfile.id);
    return idx >= 0 ? rankedLeaderboard[idx].rank : null;
  }, [myProfile, rankedLeaderboard]);

  const uniqueBadgesMap = useMemo(() => getUniqueBadges(rankedLeaderboard), [rankedLeaderboard]);
  const badgeHolders = useMemo(() => getBadgeHolders(rankedLeaderboard), [rankedLeaderboard]);

  const hasActiveFilters = selectedClubId !== "all" || category !== "all" || gender !== "all" || matchType !== "all" || timePeriod !== "all" || searchQuery.trim();

  const top3 = rankedLeaderboard.slice(0, 3);
  const remaining = rankedLeaderboard.slice(3);

  // Reorder for visual podium: 2nd, 1st, 3rd on md+
  const podiumOrder = useMemo(() => {
    if (top3.length === 3) return [top3[1], top3[0], top3[2]] as const;
    return top3;
  }, [top3]);

  const FilterPill = ({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) => (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
        active
          ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white border-transparent shadow-lg shadow-violet-500/30"
          : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <PageHeader
          title="Rankings"
          description="See how players rank across clubs based on match performance."
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-ranking-info">
              <Info className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm space-y-3" align="start">
            <h4 className="font-semibold text-base">How Rankings Work</h4>
            <div className="space-y-2 text-muted-foreground">
              <p><span className="font-medium text-foreground">Points System:</span> Players earn 3 points for each win and 1 point for each loss.</p>
              <p><span className="font-medium text-foreground">Default Ranking:</span> Players are ranked first by total wins, then by win percentage as a tiebreaker.</p>
              <p><span className="font-medium text-foreground">Grade:</span> Players have a skill grade from C3 (beginner) to A1 (advanced).</p>
              <p><span className="font-medium text-foreground">Auto-Grading:</span> Rolling window of last 5 sessions; needs 10+ games across 3 sessions; over 55% promotes, under 40% demotes.</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {myStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Your Rank" value={myRank ? `#${myRank}` : "-"} icon={Trophy} accent="hsl(43 95% 55% / 0.35)" />
          <StatTile
            label="Wins / Losses"
            value={
              <>
                <span className="text-emerald-300">{myStats.matchesWon}</span>
                <span className="text-white/30"> / </span>
                <span className="text-rose-300">{myStats.matchesLost}</span>
              </>
            }
            icon={TrendingUp}
            accent="hsl(160 80% 50% / 0.3)"
          />
          <StatTile label="Win Rate" value={`${myStats.winPercentage}%`} icon={Percent} accent="hsl(217 90% 60% / 0.3)" />
          <StatTile label="Matches" value={myStats.matchesPlayed} icon={Swords} accent="hsl(252 90% 68% / 0.35)" />
        </div>
      )}

      {/* Filter bar — glass with violet pills */}
      <div
        className="relative overflow-hidden rounded-2xl p-3 sm:p-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card) / 0.65), hsl(var(--card) / 0.4))",
          backdropFilter: "blur(14px) saturate(150%)",
          WebkitBackdropFilter: "blur(14px) saturate(150%)",
          border: "1px solid hsl(0 0% 100% / 0.07)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <FilterPill active={clubScope === "my"} onClick={() => { setClubScope("my"); setSelectedClubId("all"); }} testId="button-scope-my-clubs">My Clubs</FilterPill>
            <FilterPill active={clubScope === "all"} onClick={() => { setClubScope("all"); setSelectedClubId("all"); }} testId="button-scope-all-clubs">All Clubs</FilterPill>
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search players or clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/35 focus-visible:ring-violet-500/50"
              data-testid="input-search-rankings"
            />
          </div>
          {displayClubs.length > 0 && (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white" data-testid="select-club-filter-rankings">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {displayClubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white" data-testid="select-category-filter-rankings">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white" data-testid="select-gender-filter-rankings">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={matchType} onValueChange={setMatchType}>
            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white" data-testid="select-match-type-filter-rankings">
              <SelectValue placeholder="Any Match" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Match Types</SelectItem>
              <SelectItem value="SINGLES">Singles</SelectItem>
              <SelectItem value="DOUBLES">Doubles</SelectItem>
              <SelectItem value="MIXED">Mixed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white" data-testid="select-period-filter-rankings">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="thisSeason">This Season</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] bg-white/5 border-white/10 text-white" data-testid="select-sort-rankings">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="winpct">Win %</SelectItem>
              <SelectItem value="matches">Matches</SelectItem>
              <SelectItem value="points">Points</SelectItem>
              <SelectItem value="grade">Grade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="mt-2 text-[11px] text-white/50">Active filters applied — clear individual selectors to broaden results.</div>
        )}
      </div>

      {/* Badge guide — collapsed line */}
      {badgeHolders.length > 0 && (
        <div
          className="relative overflow-hidden rounded-2xl p-3 sm:p-4"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.4))",
            border: "1px solid hsl(0 0% 100% / 0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h4 className="text-sm font-semibold text-white">Badge Holders</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {badgeHolders.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-white/8" data-testid={`badge-holder-${badge.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className={`w-8 h-8 rounded-full grid place-items-center ${badge.bgColor} shrink-0`}>
                  <badge.icon className={`w-4 h-4 ${badge.color}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{badge.label}</div>
                  <div className="text-[11px] text-white/55 truncate">{badge.holderName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
        </div>
      ) : rankedLeaderboard.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.55), hsl(var(--card) / 0.35))",
            border: "1px solid hsl(0 0% 100% / 0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <Target className="w-10 h-10 mx-auto mb-3 text-white/30" />
          <p className="font-semibold text-white">No players found</p>
          <p className="text-sm mt-1 text-white/55">
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : clubScope === "my" && myClubs.length === 0
                ? "Join a club to see rankings here."
                : "Complete some matches to appear on the leaderboard."}
          </p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {podiumOrder.map((player, idx) => {
                const place: 1 | 2 | 3 = top3.length === 3 ? (idx === 0 ? 2 : idx === 1 ? 1 : 3) : ((idx + 1) as 1 | 2 | 3);
                return (
                  <div key={player.id} className={place === 1 ? "md:-translate-y-2" : ""}>
                    <HeroPlayerCard
                      player={player}
                      place={place}
                      computePoints={computePoints}
                      isMe={myProfile?.id === player.id}
                      uniqueBadge={uniqueBadgesMap.get(player.id)}
                      onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {remaining.length > 0 && (
            <div className="space-y-2.5">
              {remaining.map((player) => (
                <CompactPlayerCard
                  key={player.id}
                  player={player}
                  isMe={myProfile?.id === player.id}
                  uniqueBadge={uniqueBadgesMap.get(player.id)}
                  achievements={getAchievements(player)}
                  onClick={() => { setStatsPlayerId(player.id); setStatsOpen(true); }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {rankedLeaderboard.length > 0 && (
        <div className="text-sm text-white/50 text-center">
          Showing {rankedLeaderboard.length} player{rankedLeaderboard.length !== 1 ? 's' : ''}
        </div>
      )}

      <PlayerStatsDialog
        profileId={statsPlayerId}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </div>
  );
}

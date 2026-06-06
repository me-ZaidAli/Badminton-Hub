import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, Award, ChevronRight, Crown, Flame, Shield, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { BSL } from "./BSLPalette";

type ClubRow = {
  clubId: number; clubName: string; clubLogo: string | null; division: string;
  played: number; won: number; lost: number;
  setsFor: number; setsAgainst: number; points: number; pointsAgainst: number;
  winRate: number; playerCount: number; position: number;
};

type PlayerRow = {
  playerId: number; fullName: string; clubId: number | null;
  matchesPlayed: number; won: number; lost: number; winRate: number; points: number; position: number;
};

type TeamRow = { id: number; name: string; category?: string | null; playerNames?: string[] };

function StatChip({ label, value, sub, icon, tone = "cyan" }: {
  label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; tone?: "gold" | "cyan";
}) {
  const accent = tone === "gold" ? BSL.gold : BSL.cyan;
  return (
    <div
      className="relative overflow-hidden rounded-xl px-3 py-3"
      style={{ background: "hsla(222,40%,16%,0.6)", border: `1px solid ${accent}33` }}
      data-testid={`clubstat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-20 w-20 rounded-full opacity-25 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: BSL.muted }}>{label}</span>
        {icon && <span style={{ color: accent }} className="opacity-80">{icon}</span>}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums" style={{ color: BSL.text }}>{value}</div>
      {sub && <div className="text-[10px]" style={{ color: BSL.muted }}>{sub}</div>}
    </div>
  );
}

export function ClubStatsDialog({
  open, onOpenChange, club, onPlayerClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  club: { id: number; name: string; division?: string | null; logoUrl?: string | null } | null;
  onPlayerClick?: (playerId: number, name: string) => void;
}) {
  const clubId = club?.id ?? null;

  const { data: clubLeaderboard = [], isLoading: lbLoading } = useQuery<ClubRow[]>({
    queryKey: ["/api/bsl/club-leaderboard"],
    enabled: open && clubId != null,
  });
  const { data: playerLeaderboard = [] } = useQuery<PlayerRow[]>({
    queryKey: ["/api/bsl/player-leaderboard"],
    enabled: open && clubId != null,
  });
  const { data: teams = [] } = useQuery<TeamRow[]>({
    queryKey: ["/api/bsl/clubs", clubId, "teams"],
    enabled: open && clubId != null,
    queryFn: async () => {
      const r = await fetch(`/api/bsl/clubs/${clubId}/teams`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const row = useMemo(() => clubLeaderboard.find(c => c.clubId === clubId) || null, [clubLeaderboard, clubId]);
  const clubPlayers = useMemo(
    () => playerLeaderboard.filter(p => p.clubId === clubId).sort((a, b) => b.points - a.points).slice(0, 6),
    [playerLeaderboard, clubId],
  );

  const name = club?.name || row?.clubName || "Club";
  const initials = name.slice(0, 2).toUpperCase();
  const division = club?.division || row?.division;
  const logo = club?.logoUrl || row?.clubLogo || null;
  const pointDiff = row ? row.points - row.pointsAgainst : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden border-0 gap-0 max-h-[88vh] overflow-y-auto"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, hsla(195,80%,16%,0.45), transparent 55%), radial-gradient(120% 90% at 100% 0%, hsla(42,80%,18%,0.4), transparent 60%), linear-gradient(160deg, hsla(222,55%,9%,0.98), hsla(222,60%,4%,0.99))",
          border: `1px solid ${BSL.cyan}55`,
          boxShadow: `0 24px 70px hsla(0,0%,0%,0.6), 0 0 40px ${BSL.cyan}22`,
        }}
        data-testid="dialog-club-stats"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{name} — Club Stats</DialogTitle>
          <DialogDescription>BSL club statistics overview</DialogDescription>
        </DialogHeader>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: `linear-gradient(90deg, ${BSL.cyan}d9, ${BSL.cyan}55 60%, transparent)`, borderBottom: `1px solid ${BSL.cyan}55` }}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-black text-black/85">
            <Shield className="h-3.5 w-3.5" /> Club Stats
          </span>
          {row && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-black/80 tabular-nums">
              <Crown className="h-3.5 w-3.5" /> #{row.position} in league
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
            className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-black"
            style={{
              background: `linear-gradient(135deg, ${BSL.cyan}33, ${BSL.gold}22)`,
              border: `2px solid ${BSL.cyan}88`,
              boxShadow: `0 0 26px ${BSL.cyan}55, inset 0 0 14px ${BSL.gold}22`,
              color: BSL.cyan,
            }}
          >
            {logo ? <img src={logo} alt={name} className="h-full w-full object-cover" /> : initials}
          </motion.div>
          <div className="min-w-0">
            <div className="text-lg font-black leading-tight break-words" style={{ color: BSL.text, textShadow: `0 0 14px ${BSL.cyan}44` }} data-testid="clubstats-name">
              {name}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {division && division !== "—" && (
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${BSL.gold}1f`, color: BSL.gold, border: `1px solid ${BSL.gold}44` }}>
                  {division}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: BSL.muted }}>
                <Users className="h-3 w-3" /> {row?.playerCount ?? 0} players
              </span>
            </div>
          </div>
        </div>

        {lbLoading ? (
          <div className="px-5 pb-6 pt-2 text-center text-sm" style={{ color: BSL.muted }}>Loading stats…</div>
        ) : !row ? (
          <div className="px-5 pb-6 pt-2 text-center text-sm" style={{ color: BSL.muted }} data-testid="clubstats-empty">
            No match stats yet — this club's record fills up once they've played a league day.
          </div>
        ) : (
          <>
            {/* Win-rate hero bar */}
            <div className="px-5 pb-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-1" style={{ color: BSL.muted }}>
                <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> Win Rate</span>
                <span className="font-black tabular-nums" style={{ color: BSL.gold }}>{row.winRate}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "hsla(0,0%,100%,0.08)" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${row.winRate}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${BSL.cyan}, ${BSL.gold})`, boxShadow: `0 0 14px ${BSL.gold}66` }}
                />
              </div>
            </div>

            {/* Stat grid */}
            <div className="px-5 pt-3 pb-4 grid grid-cols-3 gap-2.5">
              <StatChip label="Points" value={row.points} sub={`${pointDiff >= 0 ? "+" : ""}${pointDiff} diff`} icon={<Flame className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Played" value={row.played} icon={<Activity className="h-3.5 w-3.5" />} tone="cyan" />
              <StatChip label="Won" value={row.won} icon={<Trophy className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Lost" value={row.lost} icon={<Shield className="h-3.5 w-3.5" />} tone="cyan" />
              <StatChip label="Sets" value={`${row.setsFor}-${row.setsAgainst}`} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Rank" value={`#${row.position}`} icon={<Award className="h-3.5 w-3.5" />} tone="cyan" />
            </div>
          </>
        )}

        {/* Top players in this club */}
        {clubPlayers.length > 0 && (
          <div className="px-5 pb-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-black mb-2" style={{ color: BSL.cyan }}>Top Players</div>
            <div className="space-y-1.5">
              {clubPlayers.map((p, i) => (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => onPlayerClick?.(p.playerId, p.fullName)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition hover:scale-[1.01]"
                  style={{ background: i === 0 ? `${BSL.gold}12` : "hsla(0,0%,100%,0.03)", border: `1px solid hsla(0,0%,100%,0.06)` }}
                  data-testid={`clubstats-player-${p.playerId}`}
                >
                  <span className="text-sm font-black w-5 text-center" style={{ color: i === 0 ? BSL.gold : BSL.muted }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: BSL.text }}>{p.fullName}</div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>{p.won}W · {p.matchesPlayed}P · {p.winRate}%</div>
                  </div>
                  <span className="text-sm font-black tabular-nums" style={{ color: BSL.gold }}>{p.points}</span>
                  <ChevronRight className="h-3.5 w-3.5" style={{ color: BSL.muted }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Teams / roster */}
        {teams.length > 0 && (
          <div className="px-5 pb-5">
            <div className="text-[10px] uppercase tracking-[0.22em] font-black mb-2" style={{ color: BSL.gold }}>Teams</div>
            <div className="space-y-1.5">
              {teams.map(t => (
                <div
                  key={t.id}
                  className="px-2.5 py-2 rounded-lg"
                  style={{ background: "hsla(0,0%,100%,0.03)", border: `1px solid hsla(0,0%,100%,0.06)` }}
                  data-testid={`clubstats-team-${t.id}`}
                >
                  <div className="text-sm font-semibold truncate" style={{ color: BSL.text }}>{t.name}</div>
                  {t.playerNames && t.playerNames.length > 0 && (
                    <div className="text-[11px] mt-0.5" style={{ color: BSL.muted }}>{t.playerNames.join(" · ")}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

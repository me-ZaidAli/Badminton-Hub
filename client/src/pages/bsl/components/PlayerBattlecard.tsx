import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Activity, Award, Crown, Flame, Shield, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { BSL } from "./BSLPalette";

type PlayerRow = {
  playerId: number;
  fullName: string;
  clubId: number | null;
  clubName: string;
  clubLogo: string | null;
  division: string;
  matchesPlayed: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  winRate: number;
  points: number;
  position: number;
};

function StatChip({ label, value, sub, icon, tone = "cyan" }: {
  label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; tone?: "gold" | "cyan";
}) {
  const accent = tone === "gold" ? BSL.gold : BSL.cyan;
  return (
    <div
      className="relative overflow-hidden rounded-xl px-3 py-3"
      style={{ background: "hsla(222,40%,16%,0.6)", border: `1px solid ${accent}33` }}
      data-testid={`battlecard-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
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

export function PlayerBattlecard({
  open, onOpenChange, playerId, fallbackName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playerId: number | null;
  fallbackName?: string;
}) {
  const { data: leaderboard = [], isLoading } = useQuery<PlayerRow[]>({
    queryKey: ["/api/bsl/player-leaderboard"],
    enabled: open && playerId != null,
  });

  const player = useMemo(
    () => leaderboard.find(p => p.playerId === playerId) || null,
    [leaderboard, playerId],
  );

  const name = player?.fullName || fallbackName || "Player";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "P";
  const setDiff = player ? player.setsFor - player.setsAgainst : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 gap-0"
        style={{
          background:
            "radial-gradient(120% 90% at 0% 0%, hsla(195,80%,16%,0.45), transparent 55%), radial-gradient(120% 90% at 100% 0%, hsla(42,80%,18%,0.4), transparent 60%), linear-gradient(160deg, hsla(222,55%,9%,0.98), hsla(222,60%,4%,0.99))",
          border: `1px solid ${BSL.gold}55`,
          boxShadow: `0 24px 70px hsla(0,0%,0%,0.6), 0 0 40px ${BSL.gold}22`,
        }}
        data-testid="dialog-player-battlecard"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{name} — Player Battlecard</DialogTitle>
          <DialogDescription>BSL player statistics card</DialogDescription>
        </DialogHeader>

        {/* Gold status bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: `linear-gradient(90deg, ${BSL.gold}d9, ${BSL.gold}55 60%, transparent)`, borderBottom: `1px solid ${BSL.gold}55` }}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] font-black text-black/85">
            <Swords className="h-3.5 w-3.5" /> Player Battlecard
          </span>
          {player && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-black/80 tabular-nums">
              <Crown className="h-3.5 w-3.5" /> Rank #{player.position}
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
            className="relative h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center text-xl font-black"
            style={{
              background: `linear-gradient(135deg, ${BSL.cyan}33, ${BSL.gold}22)`,
              border: `2px solid ${BSL.gold}88`,
              boxShadow: `0 0 26px ${BSL.gold}55, inset 0 0 14px ${BSL.cyan}22`,
              color: BSL.gold,
            }}
          >
            {initials}
          </motion.div>
          <div className="min-w-0">
            <div className="text-lg font-black leading-tight break-words" style={{ color: BSL.text, textShadow: `0 0 14px ${BSL.gold}44` }} data-testid="battlecard-player-name">
              {name}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {player?.clubLogo ? (
                <img src={player.clubLogo} alt="" className="h-4 w-4 rounded object-cover" />
              ) : (
                <Shield className="h-3.5 w-3.5" style={{ color: BSL.cyan }} />
              )}
              <span className="text-[12px] font-semibold" style={{ color: BSL.text }}>{player?.clubName || "—"}</span>
              {player?.division && player.division !== "—" && (
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${BSL.cyan}1f`, color: BSL.cyan, border: `1px solid ${BSL.cyan}44` }}>
                  {player.division}
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-5 pb-6 pt-2 text-center text-sm" style={{ color: BSL.muted }}>Loading stats…</div>
        ) : !player ? (
          <div className="px-5 pb-6 pt-2 text-center text-sm" style={{ color: BSL.muted }} data-testid="battlecard-empty">
            No match stats yet — this player's card fills up once they've played a rubber.
          </div>
        ) : (
          <>
            {/* Win-rate hero bar */}
            <div className="px-5 pb-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-1" style={{ color: BSL.muted }}>
                <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> Win Rate</span>
                <span className="font-black tabular-nums" style={{ color: BSL.gold }}>{player.winRate}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: "hsla(0,0%,100%,0.08)" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${player.winRate}%` }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${BSL.cyan}, ${BSL.gold})`, boxShadow: `0 0 14px ${BSL.gold}66` }}
                />
              </div>
            </div>

            {/* Stat grid */}
            <div className="px-5 pt-3 pb-5 grid grid-cols-3 gap-2.5">
              <StatChip label="Points" value={player.points} icon={<Flame className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Played" value={player.matchesPlayed} icon={<Activity className="h-3.5 w-3.5" />} tone="cyan" />
              <StatChip label="Won" value={player.won} icon={<Trophy className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Lost" value={player.lost} icon={<Shield className="h-3.5 w-3.5" />} tone="cyan" />
              <StatChip label="Sets" value={`${player.setsFor}-${player.setsAgainst}`} sub={`${setDiff >= 0 ? "+" : ""}${setDiff} diff`} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="gold" />
              <StatChip label="Rank" value={`#${player.position}`} icon={<Award className="h-3.5 w-3.5" />} tone="cyan" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

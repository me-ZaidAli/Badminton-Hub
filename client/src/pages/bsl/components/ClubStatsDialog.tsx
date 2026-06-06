import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Award, ChevronDown, ChevronRight, Crown, Loader2, Shield, Target, TrendingUp, Trophy, Users } from "lucide-react";
import { DASH } from "./StatsPalette";

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
type TeamRow = { id: number; name: string; category?: string | null; division?: string | null; playerNames?: string[] };
type Fixture = {
  id: number; status: string; startTime: string | null;
  homeClubId: number | null; awayClubId: number | null;
  homeClubName: string | null; awayClubName: string | null;
  homeClubLogo: string | null; awayClubLogo: string | null;
  homePoints: number; awayPoints: number; homeSets: number; awaySets: number;
  category?: string | null;
};
type MatchRow = {
  id: number; date: string | null; opponent: string; opponentLogo: string | null;
  home: boolean;
  myPoints: number; oppPoints: number; mySets: number; oppSets: number;
  result: "W" | "L" | "D"; status: string; category: string | null;
};
type RubberDetail = {
  id: number; rubberNumber: number; rubberType: string;
  homeScore: number; awayScore: number;
  setScores?: Array<{ h: number; a: number }> | null;
};
type FixtureDetail = { id: number; rubbers: RubberDetail[] };

// Expandable per-match set breakdown. Lazy-fetches the fixture detail (which
// carries every rubber's setScores) only when a match row is opened. Scores
// are oriented to the viewing club's perspective (mine-opp) using `home`.
function MatchSetBreakdown({ fixtureId, home }: { fixtureId: number; home: boolean }) {
  const { data, isLoading, isError } = useQuery<FixtureDetail>({
    queryKey: ["/api/bsl/fixtures", fixtureId],
    queryFn: async () => {
      const r = await fetch(`/api/bsl/fixtures/${fixtureId}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });
  if (isLoading) {
    return (
      <div className="px-3 py-2 text-[11px] flex items-center gap-1.5" style={{ color: DASH.muted }}>
        <Loader2 className="h-3 w-3 animate-spin" /> Loading set scores…
      </div>
    );
  }
  if (isError) {
    return <div className="px-3 py-2 text-[11px]" style={{ color: DASH.loss }}>Couldn't load set scores — try again.</div>;
  }
  const rubbers = data?.rubbers || [];
  if (!rubbers.length) {
    return <div className="px-3 py-2 text-[11px]" style={{ color: DASH.muted }}>No set-by-set detail recorded for this match.</div>;
  }
  return (
    <div className="mt-1 mb-1 mx-2 rounded-lg p-2 space-y-1" style={{ background: DASH.bgAlt, border: `1px solid ${DASH.border}` }}>
      {rubbers.map(rb => {
        const sets = Array.isArray(rb.setScores) && rb.setScores.length
          ? rb.setScores
          : ((rb.homeScore || 0) > 0 || (rb.awayScore || 0) > 0)
            ? [{ h: rb.homeScore, a: rb.awayScore }]
            : [];
        let myPts = 0, oppPts = 0;
        sets.forEach(s => { myPts += home ? s.h : s.a; oppPts += home ? s.a : s.h; });
        return (
          <div key={rb.id} className="flex items-center gap-2 text-[11px]" data-testid={`clubstats-rubber-${rb.id}`}>
            <span className="font-semibold w-16 shrink-0" style={{ color: DASH.textDim }}>R{rb.rubberNumber} · {rb.rubberType}</span>
            <div className="flex-1 flex items-center gap-1.5 flex-wrap">
              {sets.length ? sets.map((s, i) => {
                const mine = home ? s.h : s.a;
                const opp = home ? s.a : s.h;
                const won = mine > opp;
                return (
                  <span key={i} className="tabular-nums px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: DASH.card, color: won ? DASH.win : DASH.neutral, border: `1px solid ${won ? DASH.win : DASH.border}55` }}
                    data-testid={`clubstats-set-${rb.id}-${i}`}>
                    {mine}-{opp}
                  </span>
                );
              }) : <span style={{ color: DASH.muted }}>not played</span>}
            </div>
            <span className="tabular-nums font-bold shrink-0" style={{ color: DASH.accent }}>{myPts}-{oppPts}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatChip({ label, value, sub, icon, tone = "accent" }: {
  label: string; value: React.ReactNode; sub?: string; icon?: React.ReactNode; tone?: "accent" | "win" | "loss" | "neutral";
}) {
  const accent = tone === "win" ? DASH.win : tone === "loss" ? DASH.loss : tone === "neutral" ? DASH.neutral : DASH.accent;
  return (
    <div className="relative overflow-hidden rounded-xl px-3 py-2.5" style={{ background: DASH.card, border: `1px solid ${DASH.border}` }} data-testid={`clubstat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: DASH.muted }}>{label}</span>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: DASH.text }}>{value}</div>
      {sub && <div className="text-[10px]" style={{ color: DASH.muted }}>{sub}</div>}
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
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  const { data: clubLeaderboard = [], isLoading: lbLoading } = useQuery<ClubRow[]>({ queryKey: ["/api/bsl/club-leaderboard"], enabled: open && clubId != null });
  const { data: playerLeaderboard = [] } = useQuery<PlayerRow[]>({ queryKey: ["/api/bsl/player-leaderboard"], enabled: open && clubId != null });
  const { data: allFixtures = [] } = useQuery<Fixture[]>({ queryKey: ["/api/bsl/fixtures"], enabled: open && clubId != null });
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

  const matches = useMemo<MatchRow[]>(() => {
    if (clubId == null) return [];
    return allFixtures
      .filter(f => f.homeClubId === clubId || f.awayClubId === clubId)
      .map(f => {
        const home = f.homeClubId === clubId;
        const myPoints = home ? f.homePoints : f.awayPoints;
        const oppPoints = home ? f.awayPoints : f.homePoints;
        const mySets = home ? f.homeSets : f.awaySets;
        const oppSets = home ? f.awaySets : f.homeSets;
        const result: "W" | "L" | "D" = myPoints > oppPoints ? "W" : myPoints < oppPoints ? "L" : "D";
        return {
          id: f.id, date: f.startTime, home,
          opponent: (home ? f.awayClubName : f.homeClubName) || "TBC",
          opponentLogo: home ? f.awayClubLogo : f.homeClubLogo,
          myPoints, oppPoints, mySets, oppSets, result, status: f.status, category: f.category || null,
        };
      })
      .sort((a, b) => (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0));
  }, [allFixtures, clubId]);

  const finished = useMemo(() => matches.filter(m => m.status === "FINISHED"), [matches]);
  const form = useMemo(() => finished.slice(-5), [finished]);
  const chartData = useMemo(() => {
    let cum = 0;
    return finished.map((m, i) => {
      cum += m.myPoints;
      return { name: `M${i + 1}`, points: cum, match: m.myPoints };
    });
  }, [finished]);

  const name = club?.name || row?.clubName || "Club";
  const initials = name.slice(0, 2).toUpperCase();
  const division = club?.division || row?.division;
  const logo = club?.logoUrl || row?.clubLogo || null;
  const setRatio = row && row.setsAgainst > 0 ? (row.setsFor / row.setsAgainst).toFixed(2) : row && row.setsFor > 0 ? "∞" : "—";
  const pointDiff = row ? row.points - row.pointsAgainst : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden border-0 gap-0 max-h-[90vh] overflow-y-auto"
        style={{ background: DASH.bg, border: `1px solid ${DASH.borderStrong}`, boxShadow: "0 24px 70px rgba(0,0,0,0.6)" }}
        data-testid="dialog-club-stats"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{name} — Club Dashboard</DialogTitle>
          <DialogDescription>BSL club statistics dashboard</DialogDescription>
        </DialogHeader>

        {/* HEADER */}
        <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${DASH.panel}, ${DASH.bgAlt})`, borderBottom: `1px solid ${DASH.border}` }}>
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}
              className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-bold"
              style={{ background: DASH.card, border: `1px solid ${DASH.borderStrong}`, color: DASH.accent }}
            >
              {logo ? <img src={logo} alt={name} className="h-full w-full object-cover" /> : initials}
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold leading-tight break-words" style={{ color: DASH.text }} data-testid="clubstats-name">{name}</div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {division && division !== "—" && (
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md font-semibold" style={{ background: `${DASH.accentStrong}22`, color: DASH.accent, border: `1px solid ${DASH.accent}44` }}>{division}</span>
                )}
                {row && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: DASH.textDim }}><Crown className="h-3.5 w-3.5" style={{ color: DASH.accent }} /> Rank #{row.position}</span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: DASH.muted }}><Users className="h-3 w-3" /> {row?.playerCount ?? 0} players</span>
              </div>
            </div>
            {row && (
              <div className="text-right shrink-0">
                <div className="text-3xl font-bold tabular-nums" style={{ color: DASH.text }}>{row.points}</div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: DASH.muted }}>Points</div>
              </div>
            )}
          </div>
        </div>

        {lbLoading ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: DASH.muted }}>Loading dashboard…</div>
        ) : !row ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: DASH.muted }} data-testid="clubstats-empty">
            No match stats yet — this club's dashboard fills up once they've played a league day.
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* SEASON STATS */}
            <section>
              <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: DASH.muted }}>Season Stats</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                <StatChip label="Played" value={row.played} icon={<Activity className="h-3.5 w-3.5" />} tone="accent" />
                <StatChip label="Won" value={row.won} icon={<Trophy className="h-3.5 w-3.5" />} tone="win" />
                <StatChip label="Lost" value={row.lost} icon={<Shield className="h-3.5 w-3.5" />} tone="loss" />
                <StatChip label="Win %" value={`${row.winRate}%`} icon={<Target className="h-3.5 w-3.5" />} tone="accent" />
                <StatChip label="Set Ratio" value={setRatio} sub={`${row.setsFor}-${row.setsAgainst}`} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="neutral" />
                <StatChip label="Pts Diff" value={`${pointDiff >= 0 ? "+" : ""}${pointDiff}`} icon={<Award className="h-3.5 w-3.5" />} tone={pointDiff >= 0 ? "win" : "loss"} />
              </div>
            </section>

            {/* PERFORMANCE GRAPH */}
            {chartData.length >= 2 && (
              <section className="rounded-xl p-4" style={{ background: DASH.panel, border: `1px solid ${DASH.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: DASH.muted }}>Performance — Cumulative Points</div>
                  <div className="text-sm font-bold tabular-nums" style={{ color: DASH.accent }}>{row.points}</div>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="clubPointsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={DASH.accent} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={DASH.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fill: DASH.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: DASH.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ background: DASH.card, border: `1px solid ${DASH.borderStrong}`, borderRadius: 10, color: DASH.text, fontSize: 12 }}
                        labelStyle={{ color: DASH.muted }}
                        formatter={(v: any, _n: any, p: any) => [`${v} pts (this match +${p?.payload?.match})`, "Total"]}
                      />
                      <Area type="monotone" dataKey="points" stroke={DASH.accent} strokeWidth={2.5} fill="url(#clubPointsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* FORM GUIDE */}
            {form.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: DASH.muted }}>Form Guide — Last {form.length}</div>
                <div className="flex items-center gap-2">
                  {form.map(m => (
                    <div key={m.id} className="flex flex-col items-center gap-1" title={`vs ${m.opponent}: ${m.myPoints}-${m.oppPoints}`} data-testid={`clubstats-form-${m.id}`}>
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: m.result === "W" ? `${DASH.win}22` : m.result === "L" ? `${DASH.loss}22` : `${DASH.neutral}22`, color: m.result === "W" ? DASH.win : m.result === "L" ? DASH.loss : DASH.neutral, border: `1px solid ${m.result === "W" ? DASH.win : m.result === "L" ? DASH.loss : DASH.neutral}55` }}>{m.result}</span>
                      <span className="text-[9px] tabular-nums" style={{ color: DASH.muted }}>{m.myPoints}-{m.oppPoints}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* MATCH HISTORY */}
            {matches.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: DASH.muted }}>Match History</div>
                <div className="space-y-1.5">
                  {matches.slice().reverse().slice(0, 8).map(m => {
                    const played = m.status === "FINISHED";
                    const c = m.result === "W" ? DASH.win : m.result === "L" ? DASH.loss : DASH.neutral;
                    const isOpen = expandedMatch === m.id;
                    return (
                      <div key={m.id} className="rounded-lg overflow-hidden" style={{ background: DASH.card, border: `1px solid ${isOpen ? DASH.borderStrong : DASH.border}` }} data-testid={`clubstats-match-${m.id}`}>
                        <button
                          type="button"
                          onClick={() => played && setExpandedMatch(isOpen ? null : m.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left ${played ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
                          data-testid={`clubstats-match-toggle-${m.id}`}
                        >
                          <div className="h-7 w-7 rounded-md overflow-hidden flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: DASH.cardAlt, color: DASH.textDim }}>
                            {m.opponentLogo ? <img src={m.opponentLogo} alt="" className="h-full w-full object-cover" /> : m.opponent.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: DASH.text }}>vs {m.opponent}</div>
                            <div className="text-[10px]" style={{ color: DASH.muted }}>
                              {m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "TBC"}
                              {m.category ? ` · ${m.category}` : ""}
                              {played ? ` · ${m.mySets}-${m.oppSets} sets` : ""}
                            </div>
                          </div>
                          {played ? (
                            <>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold tabular-nums leading-none" style={{ color: DASH.text }}>{m.myPoints}-{m.oppPoints}</div>
                                <div className="text-[9px] uppercase tracking-wider" style={{ color: DASH.muted }}>points</div>
                              </div>
                              <span className="h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>{m.result}</span>
                              {isOpen
                                ? <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: DASH.muted }} />
                                : <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: DASH.muted }} />}
                            </>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: DASH.accent }}>{m.status === "LIVE" ? "Live" : "Upcoming"}</span>
                          )}
                        </button>
                        {isOpen && played && <MatchSetBreakdown fixtureId={m.id} home={m.home} />}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TOP PLAYERS */}
            {clubPlayers.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: DASH.muted }}>Top Players</div>
                <div className="space-y-1.5">
                  {clubPlayers.map((p, i) => (
                    <button key={p.playerId} type="button" onClick={() => onPlayerClick?.(p.playerId, p.fullName)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition hover:brightness-125" style={{ background: DASH.card, border: `1px solid ${DASH.border}` }} data-testid={`clubstats-player-${p.playerId}`}>
                      <span className="text-sm font-bold w-5 text-center" style={{ color: i === 0 ? DASH.accent : DASH.muted }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: DASH.text }}>{p.fullName}</div>
                        <div className="text-[10px]" style={{ color: DASH.muted }}>{p.won}W · {p.matchesPlayed}P · {p.winRate}%</div>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: DASH.accent }}>{p.points}</span>
                      <ChevronRight className="h-3.5 w-3.5" style={{ color: DASH.muted }} />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* TEAMS / DIVISIONS */}
            {teams.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: DASH.muted }}>Teams &amp; Divisions</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {teams.map(t => (
                    <div key={t.id} className="px-3 py-2 rounded-lg" style={{ background: DASH.card, border: `1px solid ${DASH.border}` }} data-testid={`clubstats-team-${t.id}`}>
                      <div className="text-sm font-medium truncate" style={{ color: DASH.text }}>{t.name}</div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {(t.division || t.category) && (
                          <span className="text-[9px] uppercase tracking-widest" style={{ color: DASH.accent }}>{[t.division, t.category].filter(Boolean).join(" · ")}</span>
                        )}
                      </div>
                      {t.playerNames && t.playerNames.length > 0 && (
                        <div className="text-[11px] mt-0.5 truncate" style={{ color: DASH.muted }}>{t.playerNames.join(", ")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

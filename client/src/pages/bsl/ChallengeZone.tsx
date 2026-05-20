import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Swords, Trophy, Users, ChevronDown, ChevronUp, Search,
  Calendar, MapPin, Send, Check, X, Hourglass, CheckCircle2, AlertCircle, Crown,
} from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { GlowPanel } from "./components/GlowPanel";
import { ActionButton } from "./components/ActionButton";
import { BSL } from "./components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ClubRow = {
  id: number; name: string; logoUrl: string | null; division: string;
  additionalDivisions: string[]; managerUserId: number; adminUserIds: number[];
  rank: number | null; played: number; won: number; lost: number; drawn: number;
  points: number; rubberDiff: number; teamCount: number;
  teams: Array<{ id: number; name: string; division: string; category: string | null; pairNumber: number | null; members: Array<{ playerId: number; name: string }> }>;
};
type MatchDay = {
  id: number; date: string; state: string; status: string;
  venue: string | null; notes: string | null;
  division: string | null; category: string | null;
  maxMatches: number | null; slotsUsed: number; slotsRemaining: number | null;
};
type Challenge = {
  id: number; status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  challengerClubId: number; opponentClubId: number; leagueDayId: number;
  numMatches: number; message: string | null; createdAt: string;
  challengerClub: { id: number; name: string; logoUrl: string | null } | null;
  opponentClub: { id: number; name: string; logoUrl: string | null } | null;
  leagueDay: { id: number; date: string; venue: string | null } | null;
};

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function ChallengeZone() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"clubs" | "challenges">("clubs");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "teams">("rank");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<ClubRow | null>(null);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery<ClubRow[]>({
    queryKey: ["/api/bsl/challenge-zone/clubs"],
  });
  const { data: matchDays = [] } = useQuery<MatchDay[]>({
    queryKey: ["/api/bsl/challenge-zone/match-days"],
  });
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/bsl/challenges"],
  });

  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  // Clubs the current user can act on behalf of (manager or in adminUserIds).
  // Captain check is server-authoritative, so we still allow attempt; this just
  // governs the "challenger club" dropdown defaults.
  const myClubs = useMemo(() => {
    if (!user) return [] as ClubRow[];
    if (isPlatformAdmin) return clubs; // admin can act for any
    return clubs.filter(c =>
      c.managerUserId === (user as any).id ||
      (Array.isArray(c.adminUserIds) && c.adminUserIds.includes((user as any).id))
    );
  }, [clubs, user, isPlatformAdmin]);

  const canChallenge = myClubs.length > 0;

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clubs.filter(c => !q || c.name.toLowerCase().includes(q) || c.division.toLowerCase().includes(q));
    if (sortBy === "rank") rows = [...rows].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    else if (sortBy === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    else rows = [...rows].sort((a, b) => b.teamCount - a.teamCount);
    return rows;
  }, [clubs, search, sortBy]);

  const myChallengeIds = useMemo(
    () => new Set(myClubs.map(c => c.id)),
    [myClubs],
  );
  const incoming = challenges.filter(c => myChallengeIds.has(c.opponentClubId) && c.status === "PENDING");
  const outgoing = challenges.filter(c => myChallengeIds.has(c.challengerClubId));
  const otherChallenges = challenges.filter(c => !myChallengeIds.has(c.opponentClubId) && !myChallengeIds.has(c.challengerClubId));

  const respond = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) =>
      apiRequest("PATCH", `/api/bsl/challenges/${id}`, { action }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/challenges"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/challenge-zone/match-days"] });
      toast({ title: `Challenge ${vars.action}ed` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message || "Action failed", variant: "destructive" }),
  });

  return (
    <BSLBackground>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/bsl">
            <a className="inline-flex items-center gap-2 text-sm" style={{ color: BSL.muted }} data-testid="link-back-bsl">
              <ArrowLeft className="h-4 w-4" /> Back to BSL
            </a>
          </Link>
          {canChallenge && (
            <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-widest"
              style={{ background: `${BSL.cyan}22`, color: BSL.cyan, border: `1px solid ${BSL.cyan}55` }}>
              You can send challenges
            </span>
          )}
        </div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: `${BSL.cyan}1a`, border: `1px solid ${BSL.cyan}55`, boxShadow: `0 0 40px ${BSL.cyan}55` }}>
            <Swords className="h-8 w-8" style={{ color: BSL.cyan }} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight"
            style={{ color: BSL.text, textShadow: `0 0 30px ${BSL.cyan}99` }}>
            Challenge <span style={{ color: BSL.gold }}>Zone</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base" style={{ color: BSL.muted }}>
            See every club in the league, study their squads, then call them out on an official Match Day. May the best paddle win.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["clubs", "challenges"] as const).map(t => {
            const active = tab === t;
            const label = t === "clubs" ? `Clubs (${clubs.length})` : `Challenges (${challenges.length})`;
            return (
              <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
                className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition"
                style={{
                  background: active ? `${BSL.cyan}22` : `${BSL.card}`,
                  color: active ? BSL.cyan : BSL.muted,
                  border: `1px solid ${active ? BSL.cyan : BSL.border}`,
                  boxShadow: active ? `0 0 20px ${BSL.cyan}55` : "none",
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {tab === "clubs" ? (
          <>
            {/* Controls */}
            <GlowPanel className="mb-6 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: BSL.muted }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search clubs or divisions…" data-testid="input-search-clubs"
                    className="w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                    style={{ background: BSL.bgDeep, color: BSL.text, border: `1px solid ${BSL.border}` }} />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} data-testid="select-sort"
                  className="px-3 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: BSL.bgDeep, color: BSL.text, border: `1px solid ${BSL.border}` }}>
                  <option value="rank">Sort: League rank</option>
                  <option value="name">Sort: Name</option>
                  <option value="teams">Sort: Most teams</option>
                </select>
              </div>
            </GlowPanel>

            {/* Clubs grid */}
            {clubsLoading ? (
              <div className="text-center py-12" style={{ color: BSL.muted }}>Loading clubs…</div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-12" style={{ color: BSL.muted }}>No clubs match your search.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredClubs.map(c => (
                    <ClubCard key={c.id} club={c}
                      expanded={expanded === c.id}
                      onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                      onChallenge={() => setChallengeTarget(c)}
                      canChallenge={canChallenge && !myChallengeIds.has(c.id)}
                      isMine={myChallengeIds.has(c.id)} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <>
            {/* My challenges + global feed */}
            {!user ? (
              <div className="text-center py-12" style={{ color: BSL.muted }}>Sign in to see your challenges.</div>
            ) : (
              <div className="space-y-6">
                {(incoming.length > 0 || outgoing.length > 0) && (
                  <>
                    {incoming.length > 0 && (
                      <ChallengeList title="Incoming · waiting for your response" tone="cyan"
                        rows={incoming} canRespond user={user as any}
                        onAction={(id, action) => respond.mutate({ id, action })}
                        myClubIds={myChallengeIds} matchDays={matchDays} />
                    )}
                    {outgoing.length > 0 && (
                      <ChallengeList title="Sent by your clubs" tone="gold"
                        rows={outgoing} canRespond user={user as any}
                        onAction={(id, action) => respond.mutate({ id, action })}
                        myClubIds={myChallengeIds} matchDays={matchDays} />
                    )}
                  </>
                )}
                {otherChallenges.length > 0 && (
                  <ChallengeList title="League activity" tone="muted"
                    rows={otherChallenges} canRespond={false} user={user as any}
                    onAction={() => {}} myClubIds={myChallengeIds} matchDays={matchDays} />
                )}
                {challenges.length === 0 && (
                  <div className="text-center py-12" style={{ color: BSL.muted }}>No challenges yet. Head to the Clubs tab and pick a target.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {challengeTarget && (
          <ChallengeDialog target={challengeTarget} myClubs={myClubs} matchDays={matchDays}
            onClose={() => setChallengeTarget(null)} />
        )}
      </AnimatePresence>
    </BSLBackground>
  );
}

function ClubCard({ club, expanded, onToggle, onChallenge, canChallenge, isMine }: {
  club: ClubRow; expanded: boolean; onToggle: () => void; onChallenge: () => void;
  canChallenge: boolean; isMine: boolean;
}) {
  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${BSL.card} 0%, ${BSL.bgDeep} 100%)`,
        border: `1px solid ${BSL.border}`,
        boxShadow: `0 4px 30px ${BSL.bgDeep}aa`,
      }}
      data-testid={`card-club-${club.id}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: BSL.bgDeep, border: `1px solid ${BSL.border}` }}>
            {club.logoUrl ? (
              <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <Crown className="h-6 w-6" style={{ color: BSL.gold }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base truncate" style={{ color: BSL.text }} data-testid={`text-club-name-${club.id}`}>
                {club.name}
              </h3>
              {isMine && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
                  style={{ background: `${BSL.gold}22`, color: BSL.gold }}>Yours</span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: BSL.muted }}>{club.division}</div>
            {club.rank != null && (
              <div className="inline-flex items-center gap-1 text-xs mt-2 px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${BSL.cyan}1a`, color: BSL.cyan, border: `1px solid ${BSL.cyan}44` }}>
                <Trophy className="h-3 w-3" /> Rank #{club.rank}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <Stat label="Won" value={club.won} colour={BSL.success} />
          <Stat label="Lost" value={club.lost} colour={BSL.danger} />
          <Stat label="MP" value={club.played} colour={BSL.cyan} />
          <Stat label="Pts" value={club.points} colour={BSL.gold} />
        </div>

        <button onClick={onToggle} data-testid={`button-expand-${club.id}`}
          className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition"
          style={{ background: BSL.bgDeep, color: BSL.muted, border: `1px solid ${BSL.border}` }}>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{club.teams.length} teams</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="mt-3 space-y-2">
                {club.teams.length === 0 ? (
                  <div className="text-xs px-2 py-3 text-center" style={{ color: BSL.muted }}>No teams registered yet.</div>
                ) : club.teams.map(t => (
                  <div key={t.id} className="rounded-lg p-2.5" style={{ background: BSL.bgDeep, border: `1px solid ${BSL.border}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold truncate" style={{ color: BSL.text }}>{t.name}</span>
                      {t.category && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ background: `${BSL.cyan}22`, color: BSL.cyan }}>{t.category}</span>
                      )}
                    </div>
                    {t.members.length === 0 ? (
                      <div className="text-[10px]" style={{ color: BSL.faint }}>No players assigned</div>
                    ) : (
                      <div className="text-[11px] leading-snug" style={{ color: BSL.muted }}>
                        {t.members.map(m => m.name).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {canChallenge ? (
          <ActionButton onClick={onChallenge} className="w-full mt-4" data-testid={`button-challenge-${club.id}`}>
            <Swords className="h-4 w-4" /> Challenge
          </ActionButton>
        ) : isMine ? (
          <div className="mt-4 text-center text-[10px] uppercase tracking-widest font-bold py-2 rounded-lg"
            style={{ color: BSL.faint, background: BSL.bgDeep, border: `1px dashed ${BSL.border}` }}>
            Your club
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function Stat({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="text-center rounded-lg py-1.5" style={{ background: BSL.bgDeep, border: `1px solid ${BSL.border}` }}>
      <div className="text-base font-black tabular-nums" style={{ color: colour }}>{value}</div>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: BSL.faint }}>{label}</div>
    </div>
  );
}

function ChallengeDialog({ target, myClubs, matchDays, onClose }: {
  target: ClubRow; myClubs: ClubRow[]; matchDays: MatchDay[]; onClose: () => void;
}) {
  const { toast } = useToast();
  const [challengerId, setChallengerId] = useState<number | null>(myClubs[0]?.id ?? null);
  const [leagueDayId, setLeagueDayId] = useState<number | null>(null);
  const [numMatches, setNumMatches] = useState(1);
  const [message, setMessage] = useState("");

  const usableDays = matchDays.filter(d => d.slotsRemaining == null || d.slotsRemaining > 0);
  const selectedDay = matchDays.find(d => d.id === leagueDayId) || null;
  const maxAllowed = selectedDay?.slotsRemaining ?? 20;
  const sendable = challengerId != null && leagueDayId != null && numMatches > 0 && numMatches <= maxAllowed;

  const send = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/bsl/challenges", {
      challengerClubId: challengerId, opponentClubId: target.id, leagueDayId, numMatches,
      message: message.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/challenge-zone/match-days"] });
      toast({ title: "Challenge sent!", description: `${target.name} will be notified.` });
      onClose();
    },
    onError: (e: any) => toast({ title: "Could not send", description: e.message || "Try again", variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: BSL.card, border: `1px solid ${BSL.border}`,
          boxShadow: `0 0 60px ${BSL.cyan}55`,
        }}
        data-testid="dialog-send-challenge">
        <div className="p-5 border-b" style={{ borderColor: BSL.border }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest font-bold" style={{ color: BSL.cyan }}>Send Challenge</div>
              <h2 className="text-xl font-black mt-1" style={{ color: BSL.text }}>vs {target.name}</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5" data-testid="button-close-dialog">
              <X className="h-5 w-5" style={{ color: BSL.muted }} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Step 1: challenger */}
          <DialogField step="1" label="Your club">
            <select value={challengerId ?? ""} onChange={e => setChallengerId(Number(e.target.value))}
              data-testid="select-challenger-club"
              className="w-full px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: BSL.bgDeep, color: BSL.text, border: `1px solid ${BSL.border}` }}>
              {myClubs.length === 0 && <option value="">No clubs you can act for</option>}
              {myClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </DialogField>

          {/* Step 2: match day */}
          <DialogField step="2" label="Pick a Match Day"
            hint="Only official match days set by admin are available.">
            {usableDays.length === 0 ? (
              <div className="text-xs px-3 py-3 rounded-lg" style={{ color: BSL.faint, background: BSL.bgDeep, border: `1px dashed ${BSL.border}` }}>
                No upcoming match days have free slots. Try again later.
              </div>
            ) : (
              <div className="space-y-2">
                {usableDays.map(d => {
                  const active = leagueDayId === d.id;
                  const max = d.maxMatches;
                  const remaining = d.slotsRemaining;
                  return (
                    <button key={d.id} onClick={() => { setLeagueDayId(d.id); setNumMatches(Math.min(numMatches, remaining ?? 20)); }}
                      data-testid={`option-day-${d.id}`}
                      className="w-full text-left rounded-lg p-3 transition"
                      style={{
                        background: active ? `${BSL.cyan}1a` : BSL.bgDeep,
                        border: `1px solid ${active ? BSL.cyan : BSL.border}`,
                        boxShadow: active ? `0 0 20px ${BSL.cyan}55` : "none",
                      }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: BSL.text }}>
                          <Calendar className="h-4 w-4" style={{ color: BSL.cyan }} />
                          {fmtDate(d.date)}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
                          style={{
                            background: max == null ? `${BSL.success}22` : remaining! > 0 ? `${BSL.gold}22` : `${BSL.danger}22`,
                            color: max == null ? BSL.success : remaining! > 0 ? BSL.gold : BSL.danger,
                          }}>
                          {max == null ? "Unlimited" : `${remaining}/${max} slots`}
                        </span>
                      </div>
                      {d.venue && (
                        <div className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: BSL.muted }}>
                          <MapPin className="h-3 w-3" />{d.venue}
                        </div>
                      )}
                      {max != null && (
                        <div className="text-[11px] mt-1.5" style={{ color: BSL.faint }}>
                          {d.slotsUsed} match{d.slotsUsed === 1 ? "" : "es"} already booked
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </DialogField>

          {/* Step 3: number of matches */}
          <DialogField step="3" label="How many matches?"
            hint="1 match = 1 team from your club vs 1 team from theirs. Each match uses one slot on the day.">
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={Math.max(1, maxAllowed)} value={numMatches}
                onChange={e => setNumMatches(Math.max(1, Math.min(maxAllowed, Math.round(Number(e.target.value) || 1))))}
                data-testid="input-num-matches"
                className="w-24 px-3 py-2 rounded-lg text-sm font-bold tabular-nums text-center"
                style={{ background: BSL.bgDeep, color: BSL.text, border: `1px solid ${BSL.border}` }} />
              <span className="text-xs" style={{ color: BSL.muted }}>
                of {selectedDay?.slotsRemaining ?? "unlimited"} slot{selectedDay?.slotsRemaining === 1 ? "" : "s"} left
              </span>
            </div>
          </DialogField>

          {/* Step 4: message */}
          <DialogField step="4" label="Message (optional)">
            <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 500))}
              rows={3} placeholder="Say something fun, suggest a format, set the trash talk…"
              data-testid="input-message"
              className="w-full px-3 py-2 rounded-lg text-sm resize-y"
              style={{ background: BSL.bgDeep, color: BSL.text, border: `1px solid ${BSL.border}` }} />
            <div className="text-[10px] mt-1 text-right" style={{ color: BSL.faint }}>{message.length}/500</div>
          </DialogField>
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: BSL.border, background: BSL.bgDeep }}>
          <button onClick={onClose} data-testid="button-cancel-challenge"
            className="px-4 py-2 rounded-lg text-sm font-bold"
            style={{ color: BSL.muted, background: BSL.card, border: `1px solid ${BSL.border}` }}>
            Cancel
          </button>
          <ActionButton onClick={() => send.mutate()} disabled={!sendable || send.isPending}
            className="flex-1" data-testid="button-send-challenge">
            <Send className="h-4 w-4" /> {send.isPending ? "Sending…" : "Send Challenge"}
          </ActionButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DialogField({ step, label, hint, children }: { step: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
          style={{ background: BSL.cyan, color: BSL.bgDeep }}>{step}</span>
        <label className="text-sm font-bold" style={{ color: BSL.text }}>{label}</label>
      </div>
      {children}
      {hint && <div className="text-[10px] mt-1.5 leading-snug" style={{ color: BSL.faint }}>{hint}</div>}
    </div>
  );
}

function ChallengeList({ title, tone, rows, canRespond, onAction, myClubIds, user, matchDays }: {
  title: string; tone: "cyan" | "gold" | "muted"; rows: Challenge[];
  canRespond: boolean; onAction: (id: number, action: string) => void;
  myClubIds: Set<number>; user: { id: number; role: string }; matchDays: MatchDay[];
}) {
  const accent = tone === "cyan" ? BSL.cyan : tone === "gold" ? BSL.gold : BSL.muted;
  return (
    <GlowPanel className="p-4">
      <h2 className="text-xs uppercase tracking-widest font-black mb-3" style={{ color: accent }}>{title}</h2>
      <div className="space-y-2">
        {rows.map(c => {
          const isChallenger = myClubIds.has(c.challengerClubId);
          const isOpponent = myClubIds.has(c.opponentClubId);
          const isPlatformAdmin = user.role === "OWNER" || user.role === "ADMIN";
          return (
            <div key={c.id} className="rounded-xl p-3"
              style={{ background: BSL.bgDeep, border: `1px solid ${BSL.border}` }}
              data-testid={`row-challenge-${c.id}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm font-bold inline-flex items-center gap-2" style={{ color: BSL.text }}>
                  <span>{c.challengerClub?.name || "?"}</span>
                  <Swords className="h-3.5 w-3.5" style={{ color: BSL.cyan }} />
                  <span>{c.opponentClub?.name || "?"}</span>
                </div>
                <StatusPill status={c.status} />
              </div>
              <div className="text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: BSL.muted }}>
                {c.leagueDay && (
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(c.leagueDay.date)}</span>
                )}
                {c.leagueDay?.venue && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.leagueDay.venue}</span>
                )}
                <span>· {c.numMatches} match{c.numMatches === 1 ? "" : "es"}</span>
              </div>
              {c.message && (
                <div className="text-xs mt-2 italic px-2 py-1.5 rounded"
                  style={{ color: BSL.muted, background: `${BSL.card}80`, border: `1px solid ${BSL.border}` }}>
                  "{c.message}"
                </div>
              )}
              {canRespond && c.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  {isOpponent || isPlatformAdmin ? (
                    <>
                      <button onClick={() => onAction(c.id, "accept")} data-testid={`button-accept-${c.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest"
                        style={{ background: `${BSL.success}22`, color: BSL.success, border: `1px solid ${BSL.success}55` }}>
                        <Check className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button onClick={() => onAction(c.id, "decline")} data-testid={`button-decline-${c.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest"
                        style={{ background: `${BSL.danger}22`, color: BSL.danger, border: `1px solid ${BSL.danger}55` }}>
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </>
                  ) : isChallenger ? (
                    <button onClick={() => onAction(c.id, "cancel")} data-testid={`button-cancel-${c.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest"
                      style={{ background: `${BSL.muted}22`, color: BSL.text, border: `1px solid ${BSL.border}` }}>
                      Cancel challenge
                    </button>
                  ) : null}
                </div>
              )}
              {canRespond && c.status === "ACCEPTED" && (isChallenger || isOpponent || isPlatformAdmin) && (
                <button onClick={() => onAction(c.id, "complete")} data-testid={`button-complete-${c.id}`}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest"
                  style={{ background: `${BSL.gold}22`, color: BSL.gold, border: `1px solid ${BSL.gold}55` }}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark completed
                </button>
              )}
            </div>
          );
        })}
      </div>
    </GlowPanel>
  );
}

function StatusPill({ status }: { status: Challenge["status"] }) {
  const map: Record<Challenge["status"], { bg: string; fg: string; icon: any; label: string }> = {
    PENDING:   { bg: `${BSL.cyan}22`,    fg: BSL.cyan,    icon: Hourglass,    label: "Pending" },
    ACCEPTED:  { bg: `${BSL.success}22`, fg: BSL.success, icon: Check,        label: "Accepted" },
    DECLINED:  { bg: `${BSL.danger}22`,  fg: BSL.danger,  icon: X,            label: "Declined" },
    CANCELLED: { bg: `${BSL.muted}22`,   fg: BSL.muted,   icon: X,            label: "Cancelled" },
    COMPLETED: { bg: `${BSL.gold}22`,    fg: BSL.gold,    icon: CheckCircle2, label: "Completed" },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.fg }}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

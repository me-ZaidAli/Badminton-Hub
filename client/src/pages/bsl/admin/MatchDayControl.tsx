import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Radio, Play, Pause, Square, Clock, Move, AlertCircle, ExternalLink, X, Trophy, Trash2,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_TONE: any = {
  SCHEDULED: { c: BSL.muted, label: "Waiting" },
  WARMUP:    { c: BSL.gold,  label: "Warm-up" },
  LIVE:      { c: BSL.cyan,  label: "LIVE" },
  FINISHED:  { c: BSL.success, label: "Completed" },
};

export default function MatchDayControl() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const { data: fixtures } = useQuery<any[]>({ queryKey: ["/api/bsl/fixtures"], refetchInterval: 8000 });
  const { data: teams } = useQuery<any[]>({ queryKey: ["/api/bsl/admin/clubs"] });
  const courtCount = league?.courtCount || 6;
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [finishingId, setFinishingId] = useState<number | null>(null);

  const teamMap = useMemo(() => {
    const m = new Map<number, any>();
    (teams || []).forEach((c: any) => m.set(c.id, c));
    return m;
  }, [teams]);

  const updateFixture = useMutation({
    mutationFn: async (v: { id: number; data: any }) =>
      (await apiRequest("PATCH", `/api/bsl/fixtures/${v.id}`, v.data)).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] }),
  });
  const setStatus = useMutation({
    mutationFn: async (v: { id: number; status: string }) =>
      (await apiRequest("PATCH", `/api/bsl/admin/fixtures/${v.id}/status`, { status: v.status })).json(),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] }); toast({ title: `Match → ${v.status}` }); },
  });

  // END now opens the score-entry dialog instead of skipping straight to
  // FINISHED. The dialog itself flips status to FINISHED once scores are saved.
  const onEnd = (id: number) => setFinishingId(id);

  // Two-phase delete: try without force; if backend says force required (FINISHED
  // or any raw rubber score), reconfirm and retry. Backend is source of truth on
  // what counts as "scored" — aggregate fixture counters can lag raw rubber edits.
  const onDelete = async (f: any) => {
    const homeName = f.homeClubName || f.homeTeamName || `Team #${f.homeTeamId}`;
    const awayName = f.awayClubName || f.awayTeamName || `Team #${f.awayTeamId}`;
    if (!confirm(`Delete fixture: ${homeName} vs ${awayName}?`)) return;
    const tryDelete = async (force: boolean) => {
      const r = await fetch(`/api/bsl/admin/fixtures/${f.id}${force ? "?force=true" : ""}`, {
        method: "DELETE", credentials: "include",
      });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
    };
    let resp = await tryDelete(false);
    if (!resp.ok && resp.status === 400 && /force=true/i.test(resp.body?.message || "")) {
      if (!confirm(`${resp.body.message}\n\nDelete anyway?`)) return;
      resp = await tryDelete(true);
    }
    if (!resp.ok) {
      toast({ title: "Couldn't delete", description: (resp.body?.message || `HTTP ${resp.status}`).replace(/^\d+:\s*/, ""), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] });
    qc.invalidateQueries({ queryKey: ["/api/bsl/standings"] });
    toast({ title: "Fixture deleted" });
  };

  const unassigned = (fixtures || []).filter((f: any) => f.court == null && f.status !== "FINISHED");
  const courts = Array.from({ length: courtCount }, (_, i) => i + 1);

  const onDragStart = (id: number) => setDraggingId(id);
  const onDrop = (court: number | null) => {
    if (draggingId == null) return;
    updateFixture.mutate({ id: draggingId, data: { court } });
    setDraggingId(null);
  };

  return (
    <AdminLayout active="match-day">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Match Day <span style={{ color: BSL.cyan }}>Control</span></h1>
          <p className="text-sm mt-1" style={{ color: BSL.muted }}>Drag fixtures onto courts · start/pause/end live · scores via match detail</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {Object.entries(STATUS_TONE).map(([k, v]: any) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: v.c, boxShadow: `0 0 8px ${v.c}` }} />{v.label}</span>
          ))}
        </div>
      </div>

      {/* === COURT GRID === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {courts.map((court) => {
          const here = (fixtures || []).filter((f: any) => f.court === court);
          return (
            <div
              key={court}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(court)}
              className="rounded-2xl p-4 min-h-[180px] transition-all"
              style={{
                background: draggingId ? `linear-gradient(135deg, ${BSL.cyan}11, ${BSL.card})` : BSL.card,
                border: `1px solid ${draggingId ? BSL.cyan : BSL.border}`,
                boxShadow: draggingId ? `0 0 24px ${BSL.cyan}33` : `0 4px 16px hsla(222,60%,2%,0.4)`,
              }}
              data-testid={`court-${court}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>Court</span>
                <span className="text-2xl font-black" style={{ color: BSL.gold }}>#{court}</span>
              </div>
              <AnimatePresence>
                {here.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center text-xs border-2 border-dashed rounded-xl" style={{ borderColor: BSL.border, color: BSL.faint }}>
                    Drop a fixture here
                  </motion.div>
                )}
                {here.map((f: any) => <MatchTile key={f.id} f={f} teamMap={teamMap} onSetStatus={(s) => setStatus.mutate({ id: f.id, status: s })} onEnd={() => onEnd(f.id)} onDelete={() => onDelete(f)} onUnassign={() => updateFixture.mutate({ id: f.id, data: { court: null } })} onDragStart={() => onDragStart(f.id)} />)}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* === UNASSIGNED POOL === */}
      <GlowPanel title="Unassigned Fixtures" subtitle={`${unassigned.length} pending court allocation`} tone="cyan" icon={<Move className="h-4 w-4" />}>
        {unassigned.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>All fixtures assigned to courts. ⚡</div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(null)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {unassigned.map((f: any) => <MatchTile key={f.id} f={f} teamMap={teamMap} onSetStatus={(s) => setStatus.mutate({ id: f.id, status: s })} onEnd={() => onEnd(f.id)} onDelete={() => onDelete(f)} onUnassign={null} onDragStart={() => onDragStart(f.id)} />)}
          </div>
        )}
      </GlowPanel>

      <AnimatePresence>
        {finishingId != null && (
          <FinishMatchDialog
            fixtureId={finishingId}
            teamMap={teamMap}
            onClose={() => setFinishingId(null)}
            onFinished={() => {
              qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] });
              qc.invalidateQueries({ queryKey: ["/api/bsl/standings"] });
              setFinishingId(null);
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function MatchTile({ f, teamMap, onSetStatus, onEnd, onDelete, onUnassign, onDragStart }: any) {
  const home = { name: f.homeTeamName || teamMap.get(f.homeTeamId)?.name };
  const away = { name: f.awayTeamName || teamMap.get(f.awayTeamId)?.name };
  const tone = STATUS_TONE[f.status] || STATUS_TONE.SCHEDULED;
  return (
    <motion.div
      layout draggable onDragStart={onDragStart}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing select-none"
      style={{ background: BSL.cardSoft, border: `1px solid ${tone.c}55` }}
      data-testid={`tile-fixture-${f.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded" style={{ background: `${tone.c}22`, color: tone.c }}>
          {f.status === "LIVE" && <span className="inline-block h-1.5 w-1.5 rounded-full mr-1 animate-pulse" style={{ background: tone.c }} />}
          {tone.label}
        </span>
        <Link href={`/bsl/match/${f.id}`}><a className="p-1 rounded" style={{ color: BSL.muted }} data-testid={`button-open-fixture-${f.id}`}><ExternalLink className="h-3 w-3" /></a></Link>
      </div>
      <div className="flex items-center justify-between font-bold text-sm">
        <span className="truncate flex-1">{home?.name || `Team #${f.homeTeamId}`}</span>
        <span className="px-2 tabular-nums" style={{ color: BSL.gold }}>{f.homeRubbers} – {f.awayRubbers}</span>
        <span className="truncate flex-1 text-right">{away?.name || `Team #${f.awayTeamId}`}</span>
      </div>
      <div className="flex items-center gap-1 mt-3">
        <ActionButton variant="cyan" onClick={() => onSetStatus("WARMUP")} icon={<Clock className="h-3 w-3" />}>Warm-up</ActionButton>
        <ActionButton variant="gold" onClick={() => onSetStatus("LIVE")} icon={<Play className="h-3 w-3" />}>Start</ActionButton>
        <ActionButton variant="danger" onClick={() => onEnd ? onEnd() : onSetStatus("FINISHED")} icon={<Square className="h-3 w-3" />}>End</ActionButton>
        <div className="ml-auto flex items-center gap-1">
          {onUnassign && <button onClick={onUnassign} title="Unassign from court" className="p-1.5 rounded-md text-[10px]" style={{ background: `${BSL.muted}22`, color: BSL.muted }} data-testid={`button-unassign-${f.id}`}><AlertCircle className="h-3 w-3" /></button>}
          {onDelete && <button onClick={onDelete} title="Delete fixture" className="p-1.5 rounded-md" style={{ background: `${BSL.danger}22`, color: BSL.danger, border: `1px solid ${BSL.danger}55` }} data-testid={`button-delete-fixture-tile-${f.id}`}><Trash2 className="h-3 w-3" /></button>}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FINISH MATCH DIALOG — enter rubber scores, save all, mark fixture FINISHED.
// Backend recomputeStandings() then re-tallies the league table automatically.
// ---------------------------------------------------------------------------
function FinishMatchDialog({ fixtureId, teamMap, onClose, onFinished }: any) {
  const { toast } = useToast();
  const { data: fixture, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["/api/bsl/fixtures", fixtureId],
    queryFn: async () => {
      const r = await fetch(`/api/bsl/fixtures/${fixtureId}`, { credentials: "include" });
      if (!r.ok) throw new Error(`Failed to load fixture (${r.status})`);
      return r.json();
    },
    retry: false,
  });

  // Local edits keyed by rubber id → { home, away } as strings (allow blanks).
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fixture?.rubbers) return;
    const init: Record<number, { home: string; away: string }> = {};
    fixture.rubbers.forEach((r: any) => {
      init[r.id] = {
        home: r.homeScore != null ? String(r.homeScore) : "",
        away: r.awayScore != null ? String(r.awayScore) : "",
      };
    });
    setScores(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixture?.id, fixture?.rubbers?.length]);

  const homeName = fixture?.homeClub?.name || fixture?.homeTeamName || teamMap?.get(fixture?.homeTeamId)?.name || "Home";
  const awayName = fixture?.awayClub?.name || fixture?.awayTeamName || teamMap?.get(fixture?.awayTeamId)?.name || "Away";

  // Live preview of the rubber tally as the admin types.
  const tally = (fixture?.rubbers || []).reduce(
    (acc: any, r: any) => {
      const s = scores[r.id];
      if (!s) return acc;
      const h = Number(s.home); const a = Number(s.away);
      if (!Number.isFinite(h) || !Number.isFinite(a)) return acc;
      if (h > a) acc.home++; else if (a > h) acc.away++;
      return acc;
    },
    { home: 0, away: 0 },
  );

  async function handleSave() {
    if (isError) {
      toast({ title: "Match didn't load", description: "Try again or close the dialog.", variant: "destructive" });
      return;
    }
    setSaving(true);
    let savedAny = false;
    let savedFailed = false;
    try {
      // Save every rubber whose score actually has values. PATCH /api/bsl/rubbers/:id
      // is allowed while the league day is LIVE (lifecycle guard).
      for (const r of (fixture?.rubbers || [])) {
        const s = scores[r.id];
        if (!s) continue;
        const h = s.home === "" ? null : Number(s.home);
        const a = s.away === "" ? null : Number(s.away);
        if (h === null || a === null) continue;
        if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) {
          throw new Error(`Rubber ${r.rubberNumber}: scores must be 0 or higher.`);
        }
        // Skip API call if unchanged.
        if (r.homeScore === h && r.awayScore === a) continue;
        const resp = await apiRequest("PATCH", `/api/bsl/rubbers/${r.id}`, { homeScore: h, awayScore: a });
        if (!resp.ok) {
          const t = await resp.text();
          savedFailed = true;
          throw new Error(t || `Failed to save rubber ${r.rubberNumber}`);
        }
        savedAny = true;
      }
      // Mark the fixture FINISHED — backend triggers recomputeStandings().
      // Allowed even with zero rubbers (e.g. walkover or rubber-less fixtures).
      const finishResp = await apiRequest("PATCH", `/api/bsl/admin/fixtures/${fixtureId}/status`, { status: "FINISHED" });
      if (!finishResp.ok) {
        const t = await finishResp.text();
        throw new Error(t || "Failed to finish match");
      }
      toast({ title: "Match finished", description: `${homeName} ${tally.home} – ${tally.away} ${awayName} · standings updated` });
      onFinished();
    } catch (err: any) {
      const base = err?.message?.replace(/^\d+:\s*/, "") || "Unknown error";
      // If we got partway through saving rubbers but then hit a failure, let
      // the admin know the partial state — the fixture is NOT marked FINISHED.
      const desc = savedAny && savedFailed
        ? `${base} — some rubbers saved; match not finished. Fix the failing rubber and try again.`
        : base;
      toast({ title: "Could not save", description: desc, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "hsla(222,60%,2%,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      data-testid="dialog-finish-match"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: BSL.card, border: `1px solid ${BSL.cyan}55`, boxShadow: `0 24px 64px hsla(222,80%,2%,0.6), 0 0 0 1px ${BSL.cyan}22` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black uppercase tracking-tight inline-flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: BSL.gold }} />
            Finish match · <span style={{ color: BSL.cyan }}>enter scores</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded" style={{ background: BSL.cardSoft }} data-testid="button-close-finish"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }}>
          <div className="font-bold text-sm truncate flex-1">{homeName}</div>
          <div className="px-3 text-2xl font-black tabular-nums" style={{ color: BSL.gold }}>
            {tally.home} – {tally.away}
          </div>
          <div className="font-bold text-sm truncate flex-1 text-right">{awayName}</div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm" style={{ color: BSL.muted }}>Loading rubbers…</div>
        ) : isError ? (
          <div className="py-8 text-center space-y-3" data-testid="state-finish-load-error">
            <div className="text-sm" style={{ color: BSL.danger || BSL.muted }}>
              Couldn't load this match. {(error as any)?.message || ""}
            </div>
            <button onClick={() => refetch()} className="text-xs underline font-bold" style={{ color: BSL.cyan }} data-testid="button-retry-finish-load">Try again</button>
          </div>
        ) : !fixture?.rubbers?.length ? (
          <div className="py-8 text-center text-sm" style={{ color: BSL.muted }} data-testid="state-finish-no-rubbers">
            This match has no rubbers set up. Use <strong>Save scores + finish</strong> below to mark it complete without per-rubber scores (e.g. walkover).
          </div>
        ) : (
          <div className="space-y-2">
            {fixture.rubbers.map((r: any) => {
              const s = scores[r.id] || { home: "", away: "" };
              return (
                <div key={r.id} className="grid grid-cols-[40px_1fr_60px_20px_60px] items-center gap-2 rounded-lg p-2" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }} data-testid={`row-rubber-${r.id}`}>
                  <span className="text-xs font-black" style={{ color: BSL.gold }}>#{r.rubberNumber}</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BSL.muted }}>{r.rubberType}</span>
                  <input
                    type="number" min={0} inputMode="numeric"
                    value={s.home}
                    onChange={(e) => setScores((p) => ({ ...p, [r.id]: { ...p[r.id], home: e.target.value } }))}
                    className="w-full px-2 py-1.5 rounded-md text-center font-bold tabular-nums text-sm"
                    style={{ background: BSL.card, border: `1px solid ${BSL.border}`, color: "white" }}
                    data-testid={`input-home-${r.id}`}
                  />
                  <span className="text-center font-black" style={{ color: BSL.muted }}>–</span>
                  <input
                    type="number" min={0} inputMode="numeric"
                    value={s.away}
                    onChange={(e) => setScores((p) => ({ ...p, [r.id]: { ...p[r.id], away: e.target.value } }))}
                    className="w-full px-2 py-1.5 rounded-md text-center font-bold tabular-nums text-sm"
                    style={{ background: BSL.card, border: `1px solid ${BSL.border}`, color: "white" }}
                    data-testid={`input-away-${r.id}`}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[11px] mt-3" style={{ color: BSL.faint }}>
          Rubber wins count toward the match score. Saving updates standings on the main dashboard immediately.
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: BSL.cardSoft, color: BSL.muted }} data-testid="button-cancel-finish">Cancel</button>
          <ActionButton variant="danger" onClick={handleSave} disabled={saving || isLoading || isError} icon={<Trophy className="h-3 w-3" />} testid="button-confirm-finish">
            {saving ? "Saving…" : "Save scores + finish"}
          </ActionButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

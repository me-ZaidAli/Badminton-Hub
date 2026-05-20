import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Save, Loader2, ClipboardEdit, CheckCircle2, Plus } from "lucide-react";
import { BSLBackground } from "../components/BSLBackground";
import { BSL } from "../components/BSLPalette";
import { format } from "date-fns";

type Fixture = {
  id: number;
  startTime: string | null;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homeRubbers: number;
  awayRubbers: number;
  category?: string | null;
};
type Rubber = {
  id: number;
  bslFixtureId: number;
  rubberNumber: number;
  rubberType: string;
  category?: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number;
  awayScore: number;
  status: string;
};
type ClubInfo = { id: number; name: string } | null;
type FixtureDetail = Fixture & {
  rubbers: Rubber[];
  homeClub?: ClubInfo;
  awayClub?: ClubInfo;
};
type BslTeam = { id: number; bslClubId: number; name: string; category: string };
const RUBBER_TYPES = ["MS1", "MS2", "WS", "MD", "WD", "XD"] as const;

export default function BslAdminQuickResults() {
  const { toast } = useToast();
  const { data: fixtures = [] } = useQuery<Fixture[]>({ queryKey: ["/api/bsl/fixtures"] });

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Default to first non-finished fixture
  useEffect(() => {
    if (selectedId == null && fixtures.length) {
      const candidate = fixtures.find(f => f.status !== "FINISHED") || fixtures[0];
      setSelectedId(candidate.id);
    }
  }, [fixtures, selectedId]);

  const { data: detail, isLoading: detailLoading } = useQuery<FixtureDetail>({
    queryKey: ["/api/bsl/fixtures", selectedId],
    enabled: selectedId != null,
    queryFn: async () => {
      const r = await fetch(`/api/bsl/fixtures/${selectedId}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  // Pairs from each club so the admin can assign which pair played a rubber.
  // Club-vs-club fixtures (the only ones add-rubber supports) always have
  // homeClubId/awayClubId set; pair-vs-pair legacy fixtures fall back to
  // homeTeamId/awayTeamId on the fixture itself and aren't reassignable here.
  const homeClubId = detail?.homeClubId ?? detail?.homeClub?.id ?? null;
  const awayClubId = detail?.awayClubId ?? detail?.awayClub?.id ?? null;
  const { data: homePairs = [] } = useQuery<BslTeam[]>({
    queryKey: ["/api/bsl/clubs", homeClubId, "teams"],
    enabled: homeClubId != null,
    queryFn: async () => {
      const r = await fetch(`/api/bsl/clubs/${homeClubId}/teams`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });
  const { data: awayPairs = [] } = useQuery<BslTeam[]>({
    queryKey: ["/api/bsl/clubs", awayClubId, "teams"],
    enabled: awayClubId != null,
    queryFn: async () => {
      const r = await fetch(`/api/bsl/clubs/${awayClubId}/teams`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ rubberId, side, bslTeamId }: { rubberId: number; side: "home" | "away"; bslTeamId: number | null }) => {
      const r = await apiRequest("PATCH", `/api/bsl/admin/rubbers/${rubberId}/assign`, { side, bslTeamId });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/fixtures", selectedId] });
    },
    onError: (err: any) => toast({ title: "Pair assignment failed", description: err?.message || "Server rejected the change.", variant: "destructive" }),
  });

  const [newRubberType, setNewRubberType] = useState<typeof RUBBER_TYPES[number]>("MD");
  const addRubberMutation = useMutation({
    mutationFn: async (rubberType: string) => {
      const r = await apiRequest("POST", `/api/bsl/admin/fixtures/${selectedId}/add-rubber`, { rubberType });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Rubber added", description: `New ${newRubberType} rubber appended.` });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/fixtures", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] });
    },
    onError: (err: any) => toast({ title: "Could not add rubber", description: err?.message || "Server rejected the add.", variant: "destructive" }),
  });

  // Local editable scores keyed by rubber id
  const [scores, setScores] = useState<Record<number, { h: string; a: string }>>({});
  useEffect(() => {
    if (detail?.rubbers) {
      const next: Record<number, { h: string; a: string }> = {};
      detail.rubbers.forEach(r => { next[r.id] = { h: String(r.homeScore ?? 0), a: String(r.awayScore ?? 0) }; });
      setScores(next);
    }
  }, [detail?.id, detail?.rubbers?.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!detail) return { count: 0 };
      const tasks = detail.rubbers.map(r => {
        const v = scores[r.id];
        if (!v) return null;
        const h = Number(v.h);
        const a = Number(v.a);
        if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
        const homeChanged = h !== (r.homeScore ?? 0);
        const awayChanged = a !== (r.awayScore ?? 0);
        if (!homeChanged && !awayChanged) return null;
        return apiRequest("PATCH", `/api/bsl/rubbers/${r.id}`, {
          homeScore: h,
          awayScore: a,
          status: "FINISHED",
        });
      }).filter(Boolean) as Promise<any>[];
      if (tasks.length === 0) return { count: 0 };
      await Promise.all(tasks);
      return { count: tasks.length };
    },
    onSuccess: (res) => {
      if (!res || res.count === 0) {
        toast({ title: "No changes", description: "Nothing to save — scores match what's already stored." });
        return;
      }
      toast({ title: "Results saved", description: `${res.count} rubber${res.count === 1 ? "" : "s"} updated and standings refreshed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/fixtures", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bsl/standings"] });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message || "Could not save scores.", variant: "destructive" });
    },
  });

  const summary = useMemo(() => {
    if (!detail) return { h: 0, a: 0 };
    let h = 0, a = 0;
    detail.rubbers.forEach(r => {
      const v = scores[r.id];
      const hs = v ? Number(v.h) : r.homeScore;
      const as = v ? Number(v.a) : r.awayScore;
      if (hs > as) h++;
      else if (as > hs) a++;
    });
    return { h, a };
  }, [detail, scores]);

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/bsl/admin">
            <button className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white" data-testid="link-back-admin">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin
            </button>
          </Link>
        </div>

        <div
          className="rounded-2xl px-5 py-5 border"
          style={{ borderColor: `${BSL.cyan}33`, background: `linear-gradient(135deg, ${BSL.cyan}14, ${BSL.gold}10)` }}
          data-testid="quick-results-header"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${BSL.cyan}22`, border: `1px solid ${BSL.cyan}55` }}>
              <ClipboardEdit className="h-5 w-5" style={{ color: BSL.cyan }} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Quick Results Entry</h1>
              <p className="text-xs md:text-sm text-white/60">Pick a match, type every rubber score, hit save. That's it.</p>
            </div>
          </div>
        </div>

        {/* FIXTURE PICKER */}
        <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: `${BSL.cyan}33`, background: "hsla(222,55%,4%,0.55)" }}>
          <label className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Match</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full bg-black/40 border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2"
            style={{ borderColor: `${BSL.cyan}55` }}
            data-testid="select-fixture"
          >
            <option value="">— Select a match —</option>
            {fixtures.map(f => {
              const when = f.startTime ? format(new Date(f.startTime), "d MMM HH:mm") : "TBD";
              const isDone = f.status === "FINISHED";
              return (
                <option key={f.id} value={f.id}>
                  {when} · {f.homeTeamName} vs {f.awayTeamName}{f.category ? ` · ${f.category}` : ""}{isDone ? "  ✓" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {detailLoading && (
          <div className="text-center text-white/60 text-sm py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</div>
        )}

        {detail && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${BSL.cyan}33`, background: "hsla(222,55%,4%,0.55)" }} data-testid="rubbers-card">
            {/* Match header */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: `${BSL.cyan}22` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                  {detail.startTime ? format(new Date(detail.startTime), "EEE d MMM · HH:mm") : "No start time"}
                  {detail.category ? ` · ${detail.category}` : ""}
                </div>
                <div className="text-base font-extrabold truncate">
                  {detail.homeTeamName} <span className="text-white/40">vs</span> {detail.awayTeamName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Rubbers won</div>
                <div className="text-lg font-extrabold tabular-nums" style={{ color: BSL.gold }}>
                  {summary.h} <span className="text-white/40 font-medium">–</span> {summary.a}
                </div>
              </div>
            </div>

            {/* Rubbers table */}
            <div className="divide-y" style={{ borderColor: `${BSL.cyan}10` }}>
              {detail.rubbers.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-white/50">
                  No rubbers set up for this match yet. Open the match detail page to add categories first.
                </div>
              ) : (
                detail.rubbers.map(r => {
                  const v = scores[r.id] || { h: String(r.homeScore ?? 0), a: String(r.awayScore ?? 0) };
                  const hs = Number(v.h), as = Number(v.a);
                  const winner = hs > as ? "h" : as > hs ? "a" : null;
                  // Filter pair options by rubber type — doubles types lock to
                  // matching pair category (matches the server-side guard).
                  const isDoubles = ["MD", "WD", "XD"].includes(r.rubberType);
                  const homeOpts = isDoubles ? homePairs.filter(p => p.category === r.rubberType) : homePairs;
                  const awayOpts = isDoubles ? awayPairs.filter(p => p.category === r.rubberType) : awayPairs;
                  // Sibling-pair conflict for the dropdown options: hide pairs
                  // already used in another rubber of THIS fixture on the same
                  // side. Server enforces this too, but pre-filtering avoids
                  // useless 400s for the admin.
                  const homeUsedElsewhere = new Set(detail.rubbers.filter(x => x.id !== r.id && x.homeTeamId != null).map(x => x.homeTeamId as number));
                  const awayUsedElsewhere = new Set(detail.rubbers.filter(x => x.id !== r.id && x.awayTeamId != null).map(x => x.awayTeamId as number));
                  return (
                    <div key={r.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center" data-testid={`rubber-row-${r.id}`}>
                      <div className="col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">R{r.rubberNumber}</div>
                        <div className="text-xs font-bold text-white/80">{r.rubberType}</div>
                      </div>
                      <div className="col-span-4 flex flex-col gap-1.5">
                        <select
                          value={r.homeTeamId ?? ""}
                          disabled={assignMutation.isPending || homeClubId == null}
                          onChange={(e) => assignMutation.mutate({ rubberId: r.id, side: "home", bslTeamId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full bg-black/40 border rounded-lg px-2 py-1.5 text-xs font-bold truncate focus:outline-none focus:ring-2"
                          style={{ borderColor: `${BSL.cyan}33` }}
                          data-testid={`select-rubber-home-pair-${r.id}`}
                        >
                          <option value="">— Pick home pair —</option>
                          {homeOpts.map(p => (
                            <option key={p.id} value={p.id} disabled={homeUsedElsewhere.has(p.id)}>
                              {p.name}{homeUsedElsewhere.has(p.id) ? " (in another rubber)" : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={v.h}
                          onChange={(e) => setScores(prev => ({ ...prev, [r.id]: { ...v, h: e.target.value } }))}
                          className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-center text-lg font-extrabold tabular-nums focus:outline-none focus:ring-2 ${winner === "h" ? "ring-1" : ""}`}
                          style={{ borderColor: winner === "h" ? BSL.gold : `${BSL.cyan}33`, color: winner === "h" ? BSL.gold : "white" }}
                          data-testid={`input-rubber-home-${r.id}`}
                        />
                      </div>
                      <div className="col-span-2 text-center text-white/40 text-xs font-bold">vs</div>
                      <div className="col-span-4 flex flex-col gap-1.5">
                        <select
                          value={r.awayTeamId ?? ""}
                          disabled={assignMutation.isPending || awayClubId == null}
                          onChange={(e) => assignMutation.mutate({ rubberId: r.id, side: "away", bslTeamId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full bg-black/40 border rounded-lg px-2 py-1.5 text-xs font-bold truncate focus:outline-none focus:ring-2"
                          style={{ borderColor: `${BSL.cyan}33` }}
                          data-testid={`select-rubber-away-pair-${r.id}`}
                        >
                          <option value="">— Pick away pair —</option>
                          {awayOpts.map(p => (
                            <option key={p.id} value={p.id} disabled={awayUsedElsewhere.has(p.id)}>
                              {p.name}{awayUsedElsewhere.has(p.id) ? " (in another rubber)" : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={v.a}
                          onChange={(e) => setScores(prev => ({ ...prev, [r.id]: { ...v, a: e.target.value } }))}
                          className={`w-full bg-black/40 border rounded-lg px-3 py-2 text-center text-lg font-extrabold tabular-nums focus:outline-none focus:ring-2 ${winner === "a" ? "ring-1" : ""}`}
                          style={{ borderColor: winner === "a" ? BSL.gold : `${BSL.cyan}33`, color: winner === "a" ? BSL.gold : "white" }}
                          data-testid={`input-rubber-away-${r.id}`}
                        />
                      </div>
                      <div className="col-span-12 text-[10px] text-white/40 -mt-1">
                        {r.status === "FINISHED" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400/80"><CheckCircle2 className="h-3 w-3" /> Saved</span>
                        ) : (
                          <span>Will be marked finished on save</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: `${BSL.cyan}22` }}>
              {/* ADD RUBBER — only on club-vs-club fixtures that aren't FINISHED */}
              {homeClubId != null && awayClubId != null && detail.status !== "FINISHED" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={newRubberType}
                    onChange={(e) => setNewRubberType(e.target.value as typeof RUBBER_TYPES[number])}
                    className="bg-black/40 border rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-2"
                    style={{ borderColor: `${BSL.cyan}33` }}
                    data-testid="select-new-rubber-type"
                  >
                    {RUBBER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={addRubberMutation.isPending}
                    onClick={() => addRubberMutation.mutate(newRubberType)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs disabled:opacity-50"
                    style={{ background: `${BSL.cyan}22`, color: BSL.cyan, border: `1px solid ${BSL.cyan}55` }}
                    data-testid="button-add-rubber"
                  >
                    {addRubberMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add rubber
                  </button>
                </div>
              ) : <div />}
              {detail.rubbers.length > 0 && (
                <button
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                  style={{ background: BSL.gold, color: BSL.bgDeep }}
                  data-testid="button-save-all"
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save all scores
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

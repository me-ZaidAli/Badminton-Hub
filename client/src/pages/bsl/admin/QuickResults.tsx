import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Save, Loader2, ClipboardEdit, CheckCircle2 } from "lucide-react";
import { BSLBackground } from "../components/BSLBackground";
import { BSL } from "../components/BSLPalette";
import { format } from "date-fns";

type Fixture = {
  id: number;
  startTime: string | null;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  homeRubbers: number;
  awayRubbers: number;
  category?: string | null;
};
type Rubber = {
  id: number;
  bslFixtureId: number;
  rubberNumber: number;
  category: string;
  homeScore: number;
  awayScore: number;
  status: string;
};
type FixtureDetail = Fixture & { rubbers: Rubber[] };

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
                  return (
                    <div key={r.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center" data-testid={`rubber-row-${r.id}`}>
                      <div className="col-span-2">
                        <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">R{r.rubberNumber}</div>
                        <div className="text-xs font-bold text-white/80">{r.category}</div>
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
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
                      <div className="col-span-4 flex items-center gap-2">
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

            {detail.rubbers.length > 0 && (
              <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: `${BSL.cyan}22` }}>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

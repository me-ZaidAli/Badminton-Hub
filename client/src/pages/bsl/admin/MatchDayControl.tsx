import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Radio, Play, Pause, Square, Clock, Move, AlertCircle, ExternalLink,
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
                {here.map((f: any) => <MatchTile key={f.id} f={f} teamMap={teamMap} onSetStatus={(s) => setStatus.mutate({ id: f.id, status: s })} onUnassign={() => updateFixture.mutate({ id: f.id, data: { court: null } })} onDragStart={() => onDragStart(f.id)} />)}
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
            {unassigned.map((f: any) => <MatchTile key={f.id} f={f} teamMap={teamMap} onSetStatus={(s) => setStatus.mutate({ id: f.id, status: s })} onUnassign={null} onDragStart={() => onDragStart(f.id)} />)}
          </div>
        )}
      </GlowPanel>
    </AdminLayout>
  );
}

function MatchTile({ f, teamMap, onSetStatus, onUnassign, onDragStart }: any) {
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
        <ActionButton variant="danger" onClick={() => onSetStatus("FINISHED")} icon={<Square className="h-3 w-3" />}>End</ActionButton>
        {onUnassign && <button onClick={onUnassign} className="ml-auto p-1.5 rounded-md text-[10px]" style={{ background: `${BSL.muted}22`, color: BSL.muted }} data-testid={`button-unassign-${f.id}`}><AlertCircle className="h-3 w-3" /></button>}
      </div>
    </motion.div>
  );
}

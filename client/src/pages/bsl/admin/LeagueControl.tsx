import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Trophy, Plus, Trash2, Wand2, Sparkles } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function LeagueControl() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const { data: days } = useQuery<any[]>({ queryKey: ["/api/bsl/admin/league-days"] });
  const { data: clubs } = useQuery<any[]>({ queryKey: ["/api/bsl/admin/clubs"] });
  const [newDate, setNewDate] = useState("");
  const [genDivision, setGenDivision] = useState("");
  const [genDayId, setGenDayId] = useState<string>("");

  const divisions: string[] = league?.divisions || [];
  const teamCountByDiv: Record<string, number> = {};
  (clubs || []).filter((c: any) => c.status === "ACTIVE").forEach((c: any) => {
    teamCountByDiv[c.division] = (teamCountByDiv[c.division] || 0) + (c.teamCount || 1);
  });

  const updateDivisions = useMutation({
    mutationFn: async (divs: string[]) => (await apiRequest("PATCH", "/api/bsl/league", { divisions: divs })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/league"] }); toast({ title: "Divisions updated" }); },
  });
  const addDay = useMutation({
    mutationFn: async (date: string) => (await apiRequest("POST", "/api/bsl/admin/league-days", { date })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/league-days"] }); setNewDate(""); toast({ title: "League day added" }); },
  });
  const delDay = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/bsl/admin/league-days/${id}`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/league-days"] }); toast({ title: "Removed" }); },
  });
  const generate = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/bsl/admin/fixtures/generate", {
      division: genDivision, leagueDayId: genDayId ? Number(genDayId) : undefined,
    })).json(),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] }); toast({ title: `Generated ${d.created} fixtures` }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout active="league">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">League <span style={{ color: BSL.gold }}>Control</span></h1>
        <p className="text-sm mt-1" style={{ color: BSL.muted }}>Seasons · divisions · automated fixture generation · league days</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <GlowPanel title="Divisions" tone="gold" icon={<Trophy className="h-4 w-4" />}>
          <div className="space-y-2">
            {divisions.map((d, i) => (
              <div key={d + i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsla(0,0%,100%,0.03)" }} data-testid={`division-${i}`}>
                <input
                  defaultValue={d}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || v === d) return;
                    updateDivisions.mutate(divisions.map((x, j) => j === i ? v : x));
                  }}
                  className="flex-1 bg-transparent border-0 font-bold focus:outline-none"
                />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: BSL.cyan }}>{teamCountByDiv[d] || 0} teams</span>
                <button onClick={() => updateDivisions.mutate(divisions.filter((_, j) => j !== i))} className="p-1.5 rounded-md" style={{ background: `${BSL.danger}22`, color: BSL.danger }} data-testid={`button-remove-division-${i}`}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const name = prompt("New division name?");
                if (name?.trim()) updateDivisions.mutate([...divisions, name.trim()]);
              }}
              className="w-full p-3 rounded-lg text-sm font-bold border-2 border-dashed inline-flex items-center justify-center gap-2"
              style={{ borderColor: BSL.border, color: BSL.muted }}
              data-testid="button-add-division"
            >
              <Plus className="h-4 w-4" /> Add division
            </button>
          </div>
        </GlowPanel>

        <GlowPanel title="Automated Fixture Generation" tone="cyan" icon={<Wand2 className="h-4 w-4" />}>
          <div className="space-y-3">
            <p className="text-xs" style={{ color: BSL.muted }}>Round-robin algorithm — creates every team-vs-team fixture per division (with 6 rubbers seeded). Existing fixtures are kept.</p>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>Division</label>
              <select value={genDivision} onChange={e => setGenDivision(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-gen-division">
                <option value="">Select division…</option>
                {divisions.map(d => <option key={d} value={d}>{d} ({teamCountByDiv[d] || 0} teams)</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>Schedule into league day (optional)</label>
              <select value={genDayId} onChange={e => setGenDayId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-gen-day">
                <option value="">— Unassigned —</option>
                {(days || []).map(d => <option key={d.id} value={d.id}>{new Date(d.date).toLocaleDateString("en-GB")}</option>)}
              </select>
            </div>
            <ActionButton variant="cyan" onClick={() => generate.mutate()} disabled={!genDivision || generate.isPending} icon={<Sparkles className="h-3 w-3" />}>
              {generate.isPending ? "Generating…" : "Generate fixtures"}
            </ActionButton>
          </div>
        </GlowPanel>
      </div>

      <GlowPanel title="League Days" subtitle="Match-day schedule" tone="gold" icon={<Calendar className="h-4 w-4" />}>
        <div className="flex gap-2 mb-3">
          <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-new-day" />
          <ActionButton variant="gold" onClick={() => newDate && addDay.mutate(newDate)} disabled={!newDate || addDay.isPending} icon={<Plus className="h-3 w-3" />}>Add</ActionButton>
        </div>
        {!days?.length ? (
          <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>No league days scheduled.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {days.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-xl"
                style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }}
                data-testid={`day-${d.id}`}
              >
                <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.cyan }}>{d.status}</div>
                <div className="text-lg font-black mt-1">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                <div className="text-xs" style={{ color: BSL.muted }}>{new Date(d.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                <button onClick={() => confirm("Delete this league day?") && delDay.mutate(d.id)} className="mt-3 text-xs inline-flex items-center gap-1" style={{ color: BSL.danger }} data-testid={`button-delete-day-${d.id}`}>
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </GlowPanel>
    </AdminLayout>
  );
}

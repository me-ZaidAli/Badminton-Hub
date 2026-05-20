import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Trophy, Plus, Trash2, Wand2, Sparkles, Building2, Settings, ArrowRight } from "lucide-react";
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
  const { data: fixtures } = useQuery<any[]>({ queryKey: ["/api/bsl/fixtures"] });
  const [newDate, setNewDate] = useState("");
  const [newRubbers, setNewRubbers] = useState<string>("");
  const [genDivision, setGenDivision] = useState("");
  const [genDayId, setGenDayId] = useState<string>("");
  const [cvcHome, setCvcHome] = useState("");
  const [cvcAway, setCvcAway] = useState("");
  const [cvcDayId, setCvcDayId] = useState<string>("");

  const divisions: string[] = league?.divisions || [];
  // Count CLUBS per division (not summed teamCount). A club belongs to its
  // primary `division` plus any entry in `additionalDivisions` — multi-division
  // clubs count once for each division they participate in. Status is NOT
  // filtered to ACTIVE here because the user (super-admin) needs to see
  // pending/sleeping clubs too — those still occupy a division slot.
  const clubCountByDiv: Record<string, number> = {};
  (clubs || []).forEach((c: any) => {
    const divs = new Set<string>();
    if (c.division) divs.add(c.division);
    (Array.isArray(c.additionalDivisions) ? c.additionalDivisions : []).forEach((d: string) => divs.add(d));
    divs.forEach((d) => { clubCountByDiv[d] = (clubCountByDiv[d] || 0) + 1; });
  });
  // Backwards-compat alias retained so existing JSX references continue to work.
  const teamCountByDiv = clubCountByDiv;

  const updateDivisions = useMutation({
    mutationFn: async (divs: string[]) => (await apiRequest("PATCH", "/api/bsl/league", { divisions: divs })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/league"] }); toast({ title: "Divisions updated" }); },
  });
  const addDay = useMutation({
    mutationFn: async (payload: { date: string; rubbersPerFixture?: number | null }) =>
      (await apiRequest("POST", "/api/bsl/admin/league-days", payload)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/admin/league-days"] });
      setNewDate(""); setNewRubbers("");
      toast({ title: "League day added" });
    },
    onError: (e: any) => toast({ title: "Couldn't add day", description: (e?.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const editDay = useMutation({
    mutationFn: async ({ id, ...patch }: { id: number; date?: string; rubbersPerFixture?: number | null }) =>
      (await apiRequest("PATCH", `/api/bsl/admin/league-days/${id}`, patch)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/league-days"] }); toast({ title: "League day updated" }); },
    onError: (e: any) => toast({ title: "Couldn't update day", description: (e?.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const delDay = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/bsl/admin/league-days/${id}`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/league-days"] }); toast({ title: "Removed" }); },
    onError: (e: any) => toast({ title: "Couldn't delete", description: (e?.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });
  const generate = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/bsl/admin/fixtures/generate", {
      division: genDivision, leagueDayId: genDayId ? Number(genDayId) : undefined,
    })).json(),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] }); toast({ title: `Generated ${d.created} fixtures` }); },
    onError: (e: any) => toast({ title: "Failed", description: (e?.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });

  // Multi-division clubs need to appear once per division — value encodes
  // `${clubId}|${division}` so we know which division the fixture belongs to.
  function parseClubDiv(v: string): { clubId: number | null; division: string | null } {
    if (!v) return { clubId: null, division: null };
    const [c, d] = v.split("|");
    return { clubId: Number(c) || null, division: d || null };
  }
  const cvcHomeParsed = parseClubDiv(cvcHome);
  const cvcAwayParsed = parseClubDiv(cvcAway);

  const createClubFixture = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/bsl/admin/club-fixtures", {
      homeClubId: cvcHomeParsed.clubId, awayClubId: cvcAwayParsed.clubId,
      division: cvcHomeParsed.division || cvcAwayParsed.division || null,
      leagueDayId: cvcDayId ? Number(cvcDayId) : undefined,
    })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/fixtures"] });
      toast({ title: "Club-vs-club fixture created", description: "Open it to assign pairs to rubbers." });
      setCvcHome(""); setCvcAway("");
    },
    onError: (e: any) => toast({ title: "Couldn't create fixture", description: (e?.message || "").replace(/^\d{3}:\s*/, ""), variant: "destructive" }),
  });

  const activeClubs = (clubs || []).filter((c: any) => c.status === "ACTIVE");
  // Expand each active club into one option per division it participates in
  // (primary `division` + every `additionalDivisions` entry).
  type ClubDivOpt = { clubId: number; name: string; division: string; value: string };
  const clubDivOptions: ClubDivOpt[] = [];
  activeClubs.forEach((c: any) => {
    const divs = new Set<string>();
    if (c.division) divs.add(c.division);
    (Array.isArray(c.additionalDivisions) ? c.additionalDivisions : []).forEach((d: string) => { if (d) divs.add(d); });
    if (divs.size === 0) divs.add("—");
    divs.forEach((d) => clubDivOptions.push({ clubId: c.id, name: c.name, division: d, value: `${c.id}|${d}` }));
  });
  clubDivOptions.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  const clubFixtures = (fixtures || []).filter((f: any) => f.homeClubId != null && f.awayClubId != null);

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
                <span className="text-[10px] uppercase tracking-widest" style={{ color: BSL.cyan }}>{clubCountByDiv[d] || 0} {(clubCountByDiv[d] || 0) === 1 ? "club" : "clubs"}</span>
                <button
                  onClick={() => {
                    if (!confirm(`Delete division "${d}"? Clubs/teams in this division will keep their record but will no longer match any division filter.`)) return;
                    updateDivisions.mutate(divisions.filter((_, j) => j !== i));
                  }}
                  disabled={updateDivisions.isPending}
                  className="p-1.5 rounded-md disabled:opacity-50"
                  style={{ background: `${BSL.danger}22`, color: BSL.danger }}
                  data-testid={`button-remove-division-${i}`}
                >
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
                {divisions.map(d => <option key={d} value={d}>{d} ({clubCountByDiv[d] || 0} clubs)</option>)}
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

      {/* === Club-vs-Club fixtures === */}
      <GlowPanel title="Club-vs-Club Fixtures" subtitle="Allocate two clubs to a fixture, then assign pairs to each rubber" tone="cyan" icon={<Building2 className="h-4 w-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>Home club</label>
            <select value={cvcHome} onChange={e => setCvcHome(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-cvc-home">
              <option value="">Select home…</option>
              {clubDivOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.name} ({o.division})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>Away club</label>
            <select value={cvcAway} onChange={e => setCvcAway(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-cvc-away">
              <option value="">Select away…</option>
              {clubDivOptions
                .filter((o) => o.clubId !== cvcHomeParsed.clubId)
                .filter((o) => !cvcHomeParsed.division || o.division === cvcHomeParsed.division)
                .map((o) => (
                  <option key={o.value} value={o.value}>{o.name} ({o.division})</option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.muted }}>League day (optional)</label>
            <select value={cvcDayId} onChange={e => setCvcDayId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-cvc-day">
              <option value="">— Unassigned —</option>
              {(days || []).map(d => <option key={d.id} value={d.id}>{new Date(d.date).toLocaleDateString("en-GB")}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <ActionButton variant="cyan" onClick={() => createClubFixture.mutate()} disabled={!cvcHome || !cvcAway || createClubFixture.isPending} icon={<Plus className="h-3 w-3" />} data-testid="button-create-cvc">
              {createClubFixture.isPending ? "Creating…" : "Create fixture"}
            </ActionButton>
          </div>
        </div>
        {clubFixtures.length === 0 ? (
          <div className="text-xs py-3 text-center" style={{ color: BSL.muted }}>No club-vs-club fixtures yet. Create one above.</div>
        ) : (
          <div className="space-y-2">
            {clubFixtures.slice(0, 12).map((f: any) => {
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }} data-testid={`row-cvc-fixture-${f.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-black" style={{ background: `${BSL.gold}22`, color: BSL.gold }}>#{f.id}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{f.homeClubName || f.homeTeamName} <span style={{ color: BSL.gold }}>vs</span> {f.awayClubName || f.awayTeamName}</div>
                      <div className="text-[10px]" style={{ color: BSL.muted }}>
                        {f.status} · {f.startTime ? new Date(f.startTime).toLocaleString("en-GB") : "Unscheduled"}
                      </div>
                    </div>
                  </div>
                  <Link href={`/bsl/admin/fixtures/${f.id}/setup`}>
                    <a className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: `${BSL.cyan}22`, color: BSL.cyan }} data-testid={`link-setup-${f.id}`}>
                      <Settings className="h-3 w-3" /> Setup pairs <ArrowRight className="h-3 w-3" />
                    </a>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </GlowPanel>

      <div className="h-5" />

      <GlowPanel title="League Days" subtitle="Match-day schedule · set the rubbers count when you create the day, edit any time" tone="gold" icon={<Calendar className="h-4 w-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-3">
          <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-new-day" />
          <input
            type="number" min={1} max={60} placeholder="Rubbers"
            value={newRubbers}
            onChange={e => setNewRubbers(e.target.value)}
            className="w-full sm:w-28 px-3 py-2 rounded-lg text-sm tabular-nums"
            style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
            title="How many rubbers per fixture? Leave blank to use the per-category default."
            data-testid="input-new-day-rubbers"
          />
          <ActionButton variant="gold"
            onClick={() => newDate && addDay.mutate({
              date: newDate,
              rubbersPerFixture: newRubbers === "" ? null : Math.max(1, Math.min(60, Math.round(Number(newRubbers)))),
            })}
            disabled={!newDate || addDay.isPending}
            icon={<Plus className="h-3 w-3" />}
          >Add</ActionButton>
        </div>
        <div className="text-[10px] mb-3" style={{ color: BSL.faint }}>Tip: leave the rubbers field blank to fall back to whatever the category settings say. Set a number to override for this day.</div>
        {!days?.length ? (
          <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>No league days scheduled.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {days.map((d, i) => {
              // Pre-format date for the datetime-local input (UTC → local).
              const local = new Date(d.date);
              const pad = (n: number) => String(n).padStart(2, "0");
              const dtLocal = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl space-y-2"
                  style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }}
                  data-testid={`day-${d.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: BSL.cyan }}>{d.state || d.status}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded" style={{ background: `${BSL.gold}22`, color: BSL.gold }}>
                      {d.rubbersPerFixture ? `${d.rubbersPerFixture} rubbers` : "default"}
                    </div>
                  </div>
                  <div className="text-lg font-black">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                  <div className="text-xs" style={{ color: BSL.muted }}>{new Date(d.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>

                  <div className="pt-2 space-y-1.5 border-t" style={{ borderColor: BSL.border }}>
                    <label className="text-[10px] uppercase tracking-widest font-bold block" style={{ color: BSL.muted }}>Date / time</label>
                    <input
                      type="datetime-local"
                      defaultValue={dtLocal}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v && v !== dtLocal) editDay.mutate({ id: d.id, date: new Date(v).toISOString() });
                      }}
                      className="w-full px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: BSL.card, border: `1px solid ${BSL.border}`, color: "white" }}
                      data-testid={`input-edit-day-date-${d.id}`}
                    />
                    <label className="text-[10px] uppercase tracking-widest font-bold block pt-1" style={{ color: BSL.muted }}>Rubbers per fixture (override)</label>
                    <input
                      type="number" min={1} max={60} placeholder="default"
                      defaultValue={d.rubbersPerFixture ?? ""}
                      onBlur={(e) => {
                        const raw = e.target.value;
                        const next = raw === "" ? null : Math.max(1, Math.min(60, Math.round(Number(raw))));
                        if (next !== (d.rubbersPerFixture ?? null)) editDay.mutate({ id: d.id, rubbersPerFixture: next });
                      }}
                      className="w-full px-2 py-1.5 rounded-lg text-xs tabular-nums"
                      style={{ background: BSL.card, border: `1px solid ${BSL.border}`, color: "white" }}
                      data-testid={`input-edit-day-rubbers-${d.id}`}
                    />
                  </div>

                  <button onClick={() => confirm("Delete this league day?") && delDay.mutate(d.id)} className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: BSL.danger }} data-testid={`button-delete-day-${d.id}`}>
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlowPanel>
    </AdminLayout>
  );
}

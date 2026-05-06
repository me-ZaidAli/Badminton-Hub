import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Search, ShieldOff, AlertTriangle, X, Save, Wallet as WalletIcon } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_COLOR: any = {
  PENDING_PAYMENT: BSL.muted, PENDING_VERIFICATION: BSL.gold, ACTIVE: BSL.success, REJECTED: BSL.danger,
};

export default function PlayersAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const { data: clubs } = useQuery<any[]>({ queryKey: ["/api/bsl/admin/clubs"] });
  const { data: players } = useQuery<any[]>({
    queryKey: ["/api/bsl/admin/players", statusFilter, clubFilter, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (clubFilter) params.set("clubId", clubFilter);
      if (q) params.set("q", q);
      const r = await fetch(`/api/bsl/admin/players?${params.toString()}`, { credentials: "include" });
      return r.json();
    },
  });
  const editing = useMemo(() => (players || []).find((p: any) => p.id === editId), [players, editId]);

  const update = useMutation({
    mutationFn: async (v: { id: number; data: any }) => (await apiRequest("PATCH", `/api/bsl/admin/players/${v.id}`, v.data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/players"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/dashboard"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/pending"] }); toast({ title: "Saved" }); },
  });
  const approve = useMutation({
    mutationFn: async (id: number) => (await apiRequest("PATCH", `/api/bsl/players/${id}/approve`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/players"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/pending"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/dashboard"] }); toast({ title: "Player approved" }); },
  });

  return (
    <AdminLayout active="players">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Players <span style={{ color: BSL.cyan }}>Database</span></h1>
        <p className="text-sm mt-1" style={{ color: BSL.muted }}>Approve · assign teams · stats correction · disciplinary actions</p>
      </div>

      <GlowPanel title={`${players?.length ?? 0} players`} tone="cyan" icon={<Users className="h-4 w-4" />}>
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: BSL.muted }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…" className="w-full pl-8 pr-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-player-search" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-player-status">
            <option value="">All statuses</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={clubFilter} onChange={e => setClubFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-player-club">
            <option value="">All clubs</option>
            {(clubs || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!players?.length ? (
          <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>No players match those filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>
                  <th className="text-left px-2 py-2">Player</th>
                  <th className="text-left px-2 py-2">Club</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Wallet</th>
                  <th className="text-left px-2 py-2">P / W</th>
                  <th className="text-left px-2 py-2">Discipline</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p: any, i: number) => (
                  <motion.tr key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }} className="border-t" style={{ borderColor: BSL.border }} data-testid={`row-player-${p.id}`}>
                    <td className="px-2 py-3">
                      <div className="font-bold">{p.displayName}</div>
                      <div className="text-[10px]" style={{ color: BSL.faint }}>{p.email || `#${p.userId}`} · {p.paymentReference}</div>
                    </td>
                    <td className="px-2 py-3 text-xs">{(clubs || []).find((c: any) => c.id === p.bslClubId)?.name || <span style={{ color: BSL.faint }}>—</span>}</td>
                    <td className="px-2 py-3"><span className="text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded" style={{ background: `${STATUS_COLOR[p.status]}22`, color: STATUS_COLOR[p.status] }}>{p.status.replace("_"," ")}</span></td>
                    <td className="px-2 py-3 tabular-nums" style={{ color: BSL.gold }}>£{(p.walletBalance/100).toFixed(2)}</td>
                    <td className="px-2 py-3 tabular-nums">{p.matchesPlayed} / {p.matchesWon}</td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1.5 items-center">
                        {p.warnings > 0 && <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: BSL.gold }}><AlertTriangle className="h-3 w-3" />{p.warnings}</span>}
                        {p.matchBanCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ background: `${BSL.danger}22`, color: BSL.danger }}>BAN ×{p.matchBanCount}</span>}
                        {p.isSuspended && <ShieldOff className="h-3 w-3" style={{ color: BSL.danger }} />}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === "PENDING_VERIFICATION" && <ActionButton variant="cyan" onClick={() => approve.mutate(p.id)}>Approve</ActionButton>}
                        <ActionButton variant="gold" onClick={() => setEditId(p.id)}>Edit</ActionButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowPanel>

      {editing && <PlayerEditor player={editing} clubs={clubs || []} onClose={() => setEditId(null)} onSave={(data) => update.mutateAsync({ id: editing.id, data }).then(() => setEditId(null))} />}
    </AdminLayout>
  );
}

function PlayerEditor({ player, clubs, onClose, onSave }: any) {
  const [form, setForm] = useState({
    bslClubId: player.bslClubId || "",
    bslTeamId: player.bslTeamId || "",
    walletBalance: player.walletBalance,
    matchesPlayed: player.matchesPlayed,
    matchesWon: player.matchesWon,
    pointsScored: player.pointsScored,
    warnings: player.warnings,
    matchBanCount: player.matchBanCount,
    isSuspended: player.isSuspended,
    disciplineNotes: player.disciplineNotes || "",
  });
  const { data: teams } = useQuery<any[]>({
    queryKey: ["/api/bsl/clubs", form.bslClubId, "teams"],
    queryFn: async () => form.bslClubId ? (await fetch(`/api/bsl/clubs/${form.bslClubId}/teams`, { credentials: "include" })).json() : [],
    enabled: !!form.bslClubId,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsla(222,60%,2%,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ background: BSL.card, border: `1px solid ${BSL.cyan}55`, boxShadow: `0 24px 64px hsla(222,80%,2%,0.6), 0 0 0 1px ${BSL.cyan}22` }} onClick={e => e.stopPropagation()} data-testid="dialog-edit-player">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black uppercase tracking-tight">Edit · <span style={{ color: BSL.cyan }}>{player.displayName}</span></h3>
          <button onClick={onClose} className="p-1.5 rounded" style={{ background: BSL.cardSoft }} data-testid="button-close-player"><X className="h-4 w-4" /></button>
        </div>

        <Section title="Assignment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Club">
              <select value={form.bslClubId} onChange={e => setForm({ ...form, bslClubId: e.target.value ? Number(e.target.value) : "", bslTeamId: "" })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-edit-club">
                <option value="">— Unassigned —</option>
                {clubs.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Team">
              <select value={form.bslTeamId} onChange={e => setForm({ ...form, bslTeamId: e.target.value ? Number(e.target.value) : "" })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-edit-team">
                <option value="">— None —</option>
                {(teams || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Stats correction">
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Played" value={form.matchesPlayed} onChange={v => setForm({ ...form, matchesPlayed: v })} testid="input-played" />
            <NumField label="Won" value={form.matchesWon} onChange={v => setForm({ ...form, matchesWon: v })} testid="input-won" />
            <NumField label="Points" value={form.pointsScored} onChange={v => setForm({ ...form, pointsScored: v })} testid="input-points" />
          </div>
        </Section>

        <Section title="Wallet">
          <Field label="Balance (pence)">
            <div className="flex items-center gap-2">
              <WalletIcon className="h-4 w-4" style={{ color: BSL.gold }} />
              <input type="number" value={form.walletBalance} onChange={e => setForm({ ...form, walletBalance: Number(e.target.value) })} className="flex-1 px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-wallet" />
              <span className="text-xs" style={{ color: BSL.gold }}>= £{(form.walletBalance/100).toFixed(2)}</span>
            </div>
          </Field>
        </Section>

        <Section title="Discipline">
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Warnings" value={form.warnings} onChange={v => setForm({ ...form, warnings: v })} testid="input-warnings" />
            <NumField label="Match bans" value={form.matchBanCount} onChange={v => setForm({ ...form, matchBanCount: v })} testid="input-bans" />
          </div>
          <button onClick={() => setForm({ ...form, isSuspended: !form.isSuspended })} className="flex items-center justify-between p-3 rounded-lg text-sm font-bold w-full mt-3" style={{ background: form.isSuspended ? `${BSL.danger}22` : BSL.cardSoft, border: `1px solid ${form.isSuspended ? BSL.danger : BSL.border}`, color: form.isSuspended ? BSL.danger : BSL.muted }} data-testid="toggle-suspend-player">
            <span className="inline-flex items-center gap-2"><ShieldOff className="h-3.5 w-3.5" /> Suspended from league</span>
            {form.isSuspended ? "ON" : "OFF"}
          </button>
          <Field label="Discipline notes"><textarea value={form.disciplineNotes} onChange={e => setForm({ ...form, disciplineNotes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none mt-3" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="textarea-discipline" /></Field>
        </Section>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: BSL.cardSoft, color: BSL.muted }} data-testid="button-cancel-player">Cancel</button>
          <ActionButton variant="cyan" onClick={() => onSave(form)} icon={<Save className="h-3 w-3" />}>Save changes</ActionButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
function Section({ title, children }: any) {
  return <div className="mb-4"><div className="text-[10px] uppercase tracking-widest font-black mb-2" style={{ color: BSL.cyan }}>{title}</div>{children}</div>;
}
function Field({ label, children }: any) {
  return <div><label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: BSL.muted }}>{label}</label>{children}</div>;
}
function NumField({ label, value, onChange, testid }: any) {
  return <Field label={label}><input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid={testid} /></Field>;
}

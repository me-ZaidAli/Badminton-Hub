import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2, Search, Flag, ShieldOff, ShieldCheck, ExternalLink, X, Save, Copy, Check, BadgeCheck, CircleDollarSign,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const STATUS_COLOR: any = {
  PENDING_PAYMENT: BSL.muted, PENDING_VERIFICATION: BSL.gold, ACTIVE: BSL.success, REJECTED: BSL.danger,
};

export default function ClubsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [divFilter, setDivFilter] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/bsl/admin/clubs", statusFilter, divFilter, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (divFilter) params.set("division", divFilter);
      if (q) params.set("q", q);
      const r = await fetch(`/api/bsl/admin/clubs?${params.toString()}`, { credentials: "include" });
      return r.json();
    },
  });

  const editing = useMemo(() => (clubs || []).find((c: any) => c.id === editId), [clubs, editId]);
  const update = useMutation({
    mutationFn: async (v: { id: number; data: any }) => (await apiRequest("PATCH", `/api/bsl/admin/clubs/${v.id}`, v.data)).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/clubs"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/dashboard"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/pending"] }); toast({ title: "Saved" }); },
  });
  const approve = useMutation({
    mutationFn: async (id: number) => (await apiRequest("PATCH", `/api/bsl/clubs/${id}/approve`, {})).json(),
    onSuccess: (d: any) => { qc.invalidateQueries({ queryKey: ["/api/bsl/admin/clubs"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/pending"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/dashboard"] }); qc.invalidateQueries({ queryKey: ["/api/bsl/admin/audit"] }); toast({ title: "Approved", description: `Invite: ${d.inviteCode}` }); },
  });
  // Mark-paid / mark-pending — flips the club's registration payment status.
  // Marking pending hides the club from the public `/api/bsl/clubs` list.
  const setPaymentStatus = useMutation({
    mutationFn: async (v: { id: number; status: "ACTIVE" | "PENDING_PAYMENT" }) =>
      (await apiRequest("PATCH", `/api/bsl/admin/clubs/${v.id}/payment-status`, { status: v.status })).json(),
    onSuccess: (d: any, v) => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/admin/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/admin/pending"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/admin/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/admin/audit"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/clubs"] });
      toast({
        title: v.status === "ACTIVE" ? "Marked as paid" : "Marked pending payment",
        description: v.status === "ACTIVE" ? `Invite: ${d.inviteCode}` : "Club hidden from public list",
      });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout active="clubs">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Clubs <span style={{ color: BSL.gold }}>Registry</span></h1>
        <p className="text-sm mt-1" style={{ color: BSL.muted }}>Approve · suspend · flag · assign divisions · invite codes</p>
      </div>

      <GlowPanel title={`${clubs?.length ?? 0} clubs`} tone="gold" icon={<Building2 className="h-4 w-4" />}>
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: BSL.muted }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or reference…" className="w-full pl-8 pr-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-club-search" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-status-filter">
            <option value="">All statuses</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={divFilter} onChange={e => setDivFilter(e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-division-filter">
            <option value="">All divisions</option>
            {(league?.divisions || []).map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {!clubs?.length ? (
          <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>No clubs match those filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>
                  <th className="text-left px-2 py-2">Club</th>
                  <th className="text-left px-2 py-2">Division</th>
                  <th className="text-left px-2 py-2">Teams</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Invite</th>
                  <th className="text-left px-2 py-2">Flags</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((c: any, i: number) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-t" style={{ borderColor: BSL.border }} data-testid={`row-club-${c.id}`}
                  >
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-black overflow-hidden" style={{ background: `${BSL.gold}22`, color: BSL.gold }}>
                          {c.logoUrl ? <img src={c.logoUrl} className="h-full w-full object-cover" alt="" /> : c.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[10px]" style={{ color: BSL.faint }}>{c.paymentReference}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">{c.division}</td>
                    <td className="px-2 py-3 tabular-nums">{c.teamCount}</td>
                    <td className="px-2 py-3">
                      <span className="text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded" style={{ background: `${STATUS_COLOR[c.status]}22`, color: STATUS_COLOR[c.status] }}>{c.status.replace("_"," ")}</span>
                    </td>
                    <td className="px-2 py-3">
                      {c.inviteCode ? (
                        <button
                          onClick={() => { navigator.clipboard.writeText(c.inviteCode); setCopied(c.id); setTimeout(() => setCopied(null), 1500); }}
                          className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded"
                          style={{ background: `${BSL.cyan}22`, color: BSL.cyan }}
                          data-testid={`button-copy-invite-${c.id}`}
                        >
                          {copied === c.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {c.inviteCode}
                        </button>
                      ) : <span style={{ color: BSL.faint }}>—</span>}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        {c.isFlagged && <Flag className="h-3 w-3" style={{ color: BSL.gold }} />}
                        {c.isSuspended && <ShieldOff className="h-3 w-3" style={{ color: BSL.danger }} />}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {c.status === "PENDING_VERIFICATION" && (
                          <ActionButton variant="cyan" onClick={() => approve.mutate(c.id)}>Approve</ActionButton>
                        )}
                        {c.status !== "ACTIVE" && c.status !== "REJECTED" && (
                          <ActionButton
                            variant="cyan"
                            icon={<BadgeCheck className="h-3 w-3" />}
                            onClick={() => setPaymentStatus.mutate({ id: c.id, status: "ACTIVE" })}
                            disabled={setPaymentStatus.isPending}
                            testid={`button-mark-paid-${c.id}`}
                          >
                            Mark paid
                          </ActionButton>
                        )}
                        {c.status === "ACTIVE" && (
                          <ActionButton
                            variant="ghost"
                            icon={<CircleDollarSign className="h-3 w-3" />}
                            onClick={() => {
                              if (confirm(`Mark "${c.name}" as PENDING PAYMENT?\n\nThis will hide the club from the public list until payment is reconfirmed.`)) {
                                setPaymentStatus.mutate({ id: c.id, status: "PENDING_PAYMENT" });
                              }
                            }}
                            disabled={setPaymentStatus.isPending}
                            testid={`button-mark-pending-${c.id}`}
                          >
                            Mark unpaid
                          </ActionButton>
                        )}
                        <ActionButton variant="gold" onClick={() => setEditId(c.id)}>Edit</ActionButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowPanel>

      {editing && (
        <ClubEditor
          club={editing}
          divisions={league?.divisions || []}
          onClose={() => setEditId(null)}
          onSave={(data) => update.mutateAsync({ id: editing.id, data }).then(() => setEditId(null))}
        />
      )}
    </AdminLayout>
  );
}

function ClubEditor({ club, divisions, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: club.name, division: club.division, teamCount: club.teamCount,
    isFlagged: club.isFlagged, isSuspended: club.isSuspended, adminNotes: club.adminNotes || "",
  });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "hsla(222,60%,2%,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-lg rounded-2xl p-6" style={{ background: BSL.card, border: `1px solid ${BSL.gold}55`, boxShadow: `0 24px 64px hsla(222,80%,2%,0.6), 0 0 0 1px ${BSL.gold}22` }} onClick={e => e.stopPropagation()} data-testid="dialog-edit-club">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black uppercase tracking-tight">Edit · <span style={{ color: BSL.gold }}>{club.name}</span></h3>
          <button onClick={onClose} className="p-1.5 rounded" style={{ background: BSL.cardSoft }} data-testid="button-close"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-name" /></Field>
          <Field label="Division">
            <select value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="select-division">
              {divisions.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Team count"><input type="number" min={1} max={5} value={form.teamCount} onChange={e => setForm({ ...form, teamCount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="input-teamcount" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Toggle on={form.isFlagged} onChange={(v) => setForm({ ...form, isFlagged: v })} label="Flagged" icon={Flag} tone="gold" testid="toggle-flag" />
            <Toggle on={form.isSuspended} onChange={(v) => setForm({ ...form, isSuspended: v })} label="Suspended" icon={ShieldOff} tone="danger" testid="toggle-suspend" />
          </div>
          <Field label="Admin notes"><textarea value={form.adminNotes} onChange={e => setForm({ ...form, adminNotes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }} data-testid="textarea-notes" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: BSL.cardSoft, color: BSL.muted }} data-testid="button-cancel">Cancel</button>
            <ActionButton variant="gold" onClick={() => onSave(form)} icon={<Save className="h-3 w-3" />}>Save</ActionButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
function Field({ label, children }: any) {
  return <div><label className="text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: BSL.muted }}>{label}</label>{children}</div>;
}
function Toggle({ on, onChange, label, icon: Icon, tone, testid }: any) {
  const c = tone === "danger" ? BSL.danger : BSL.gold;
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between p-3 rounded-lg text-sm font-bold w-full" style={{ background: on ? `${c}22` : BSL.cardSoft, border: `1px solid ${on ? c : BSL.border}`, color: on ? c : BSL.muted }} data-testid={testid}>
      <span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" /> {label}</span>
      {on ? <ShieldCheck className="h-4 w-4" /> : <span className="text-[10px]">OFF</span>}
    </button>
  );
}

import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Layers, Users, Trophy, CheckCircle2, X, Trash2, Plus, UserMinus,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { GlowPanel } from "../components/GlowPanel";
import { ActionButton } from "../components/ActionButton";
import { BSL } from "../components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const CATS = ["MD", "WD", "XD"] as const;
type Cat = typeof CATS[number];

// Admin-only: roster + pair manager for any club. Reuses the manager endpoints
// (which already accept admin via loadClubForManager) — only the read endpoint
// (`/api/bsl/admin/clubs/:id/manager-view`) is admin-specific so super admins
// can step into any club without being its managerUserId.
export default function AdminClubManager() {
  const { id: idStr } = useParams<{ id: string }>();
  const clubId = Number(idStr);
  const qc = useQueryClient();
  const { toast } = useToast();

  const queryKey = ["/api/bsl/admin/clubs", clubId, "manager-view"];
  const { data, isLoading } = useQuery<any>({
    queryKey,
    queryFn: async () => (await fetch(`/api/bsl/admin/clubs/${clubId}/manager-view`, { credentials: "include" })).json(),
    enabled: Number.isFinite(clubId),
  });
  const inv = () => qc.invalidateQueries({ queryKey });

  const confirm = useMutation({
    mutationFn: async (playerId: number) => (await apiRequest("POST", `/api/bsl/clubs/${clubId}/players/${playerId}/confirm`, {})).json(),
    onSuccess: () => { inv(); toast({ title: "Player confirmed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (playerId: number) => (await apiRequest("DELETE", `/api/bsl/clubs/${clubId}/players/${playerId}`)).json(),
    onSuccess: () => { inv(); toast({ title: "Player removed" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const createPair = useMutation({
    mutationFn: async (cat: Cat) => (await apiRequest("POST", `/api/bsl/clubs/${clubId}/teams`, { category: cat })).json(),
    onSuccess: () => { inv(); toast({ title: "Pair created" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const deletePair = useMutation({
    mutationFn: async (teamId: number) => (await apiRequest("DELETE", `/api/bsl/teams/${teamId}/manage`)).json(),
    onSuccess: () => { inv(); toast({ title: "Pair deleted" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const addMember = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: number; playerId: number }) =>
      (await apiRequest("POST", `/api/bsl/teams/${teamId}/members`, { bslPlayerId: playerId })).json(),
    onSuccess: () => { inv(); toast({ title: "Added to pair" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const removeMember = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: number; playerId: number }) =>
      (await apiRequest("DELETE", `/api/bsl/teams/${teamId}/members/${playerId}`)).json(),
    onSuccess: () => { inv(); toast({ title: "Removed from pair" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const roster: any[] = data?.confirmed || [];
  const pending: any[] = data?.pending || [];
  const teams: any[] = data?.teams || [];
  const club = data?.club;

  if (isLoading) return <AdminLayout active="clubs"><div className="py-20 text-center text-sm" style={{ color: BSL.muted }}>Loading…</div></AdminLayout>;
  if (!club) return <AdminLayout active="clubs"><div className="py-20 text-center text-sm" style={{ color: BSL.muted }}>Club not found.</div></AdminLayout>;

  return (
    <AdminLayout active="clubs">
      <div className="mb-6">
        <Link href="/bsl/admin/clubs"><a className="inline-flex items-center gap-1 text-xs uppercase tracking-widest mb-2" style={{ color: BSL.muted }} data-testid="link-back-clubs">
          <ArrowLeft className="h-3 w-3" /> Back to clubs
        </a></Link>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Manage <span style={{ color: BSL.gold }}>{club.name}</span></h1>
        <p className="text-sm mt-1" style={{ color: BSL.muted }}>{club.division} · {data?.summary?.roster ?? 0} confirmed · {data?.summary?.pending ?? 0} pending · {data?.summary?.pairs ?? 0} pairs</p>
      </div>

      {pending.length > 0 && (
        <GlowPanel title={`${pending.length} pending join request${pending.length === 1 ? "" : "s"}`} tone="gold" icon={<Users className="h-4 w-4" />}>
          <div className="space-y-2">
            {pending.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }} data-testid={`row-pending-${p.id}`}>
                <div>
                  <div className="font-bold text-sm">{p.displayName || p.user?.name || `Player #${p.id}`}</div>
                  <div className="text-[10px]" style={{ color: BSL.faint }}>{p.user?.email || `user #${p.userId}`}</div>
                </div>
                <div className="flex gap-1">
                  <ActionButton variant="cyan" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => confirm.mutate(p.id)} disabled={confirm.isPending} testid={`button-confirm-${p.id}`}>Confirm</ActionButton>
                  <ActionButton variant="ghost" icon={<X className="h-3 w-3" />} onClick={() => { if (window.confirm("Remove this player from the club?")) remove.mutate(p.id); }} testid={`button-reject-${p.id}`}>Remove</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </GlowPanel>
      )}

      <GlowPanel title="Roster" tone="cyan" icon={<Users className="h-4 w-4" />}>
        {roster.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>No confirmed players yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>
                  <th className="text-left px-2 py-2">Player</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Categories</th>
                  <th className="text-left px-2 py-2">Wallet</th>
                  <th className="text-left px-2 py-2">P / W</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p: any) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: BSL.border }} data-testid={`roster-${p.id}`}>
                    <td className="px-2 py-3">
                      <div className="font-bold">{p.displayName || p.user?.name || `Player #${p.id}`}</div>
                      <div className="text-[10px]" style={{ color: BSL.faint }}>{p.user?.email || `user #${p.userId}`}</div>
                    </td>
                    <td className="px-2 py-3"><span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: p.status === "ACTIVE" ? `${BSL.success}22` : `${BSL.muted}22`, color: p.status === "ACTIVE" ? BSL.success : BSL.muted }}>{p.status.replace("_"," ")}</span></td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(p.categories || []).length === 0 ? <span className="text-[10px]" style={{ color: BSL.faint }}>—</span> :
                          (p.categories || []).map((c: string) => <span key={c} className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${BSL.cyan}22`, color: BSL.cyan }}>{c}</span>)}
                      </div>
                    </td>
                    <td className="px-2 py-3 tabular-nums" style={{ color: BSL.gold }}>£{(p.walletBalance/100).toFixed(2)}</td>
                    <td className="px-2 py-3 tabular-nums">{p.matchesPlayed} / {p.matchesWon}</td>
                    <td className="px-2 py-3 text-right">
                      <ActionButton variant="ghost" icon={<UserMinus className="h-3 w-3" />} onClick={() => { if (window.confirm("Remove this player from the club?")) remove.mutate(p.id); }} testid={`button-remove-roster-${p.id}`}>Remove</ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowPanel>

      <GlowPanel title="Pairs" tone="gold" icon={<Trophy className="h-4 w-4" />}>
        <div className="grid gap-4 md:grid-cols-3">
          {CATS.map(cat => (
            <CategoryColumn
              key={cat}
              cat={cat}
              teams={teams.filter((t: any) => t.category === cat)}
              roster={roster}
              onCreatePair={() => createPair.mutate(cat)}
              onDeletePair={(teamId: number) => { if (window.confirm("Delete this pair?")) deletePair.mutate(teamId); }}
              onAddMember={(teamId: number, playerId: number) => addMember.mutate({ teamId, playerId })}
              onRemoveMember={(teamId: number, playerId: number) => removeMember.mutate({ teamId, playerId })}
              busy={createPair.isPending || deletePair.isPending || addMember.isPending || removeMember.isPending}
            />
          ))}
        </div>
      </GlowPanel>
    </AdminLayout>
  );
}

function CategoryColumn({ cat, teams, roster, onCreatePair, onDeletePair, onAddMember, onRemoveMember, busy }: any) {
  // Players already placed in any pair *of this category* — used to dedupe the
  // dropdown so super-admin doesn't accidentally try to slot the same player
  // into two sibling pairs.
  const placed = useMemo(() => {
    const s = new Set<number>();
    for (const t of teams) for (const m of t.members || []) s.add(m);
    return s;
  }, [teams]);
  const eligible = roster.filter((p: any) => (p.categories || []).includes(cat));
  return (
    <div className="rounded-xl p-3" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }} data-testid={`column-${cat}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-black uppercase tracking-widest" style={{ color: BSL.cyan }}><Layers className="h-3 w-3 inline mr-1" />{cat}</div>
        <button onClick={onCreatePair} disabled={busy} className="text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50" style={{ background: `${BSL.gold}22`, color: BSL.gold, border: `1px solid ${BSL.gold}55` }} data-testid={`button-add-pair-${cat}`}>
          <Plus className="h-3 w-3" /> Pair
        </button>
      </div>
      {teams.length === 0 ? (
        <div className="py-4 text-center text-xs" style={{ color: BSL.faint }}>No pairs yet.</div>
      ) : (
        <div className="space-y-3">
          {teams.map((t: any) => {
            const members = (t.members || []).map((id: number) => roster.find((p: any) => p.id === id)).filter(Boolean);
            const candidates = eligible.filter((p: any) => !placed.has(p.id) || members.some((m: any) => m.id === p.id));
            const free = candidates.filter((p: any) => !members.some((m: any) => m.id === p.id));
            return (
              <div key={t.id} className="rounded-lg p-2" style={{ background: BSL.bg, border: `1px solid ${BSL.border}` }} data-testid={`pair-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold">{t.name}</div>
                  <button onClick={() => onDeletePair(t.id)} disabled={busy} className="p-1 rounded disabled:opacity-50" style={{ color: BSL.danger }} data-testid={`button-delete-pair-${t.id}`}><Trash2 className="h-3 w-3" /></button>
                </div>
                <div className="space-y-1.5">
                  {members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-1.5 rounded text-xs" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }}>
                      <span className="truncate">{m.displayName || m.user?.name || `#${m.id}`}</span>
                      <button onClick={() => onRemoveMember(t.id, m.id)} disabled={busy} className="p-0.5 disabled:opacity-50" style={{ color: BSL.danger }} data-testid={`button-remove-member-${t.id}-${m.id}`}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {(t.members || []).length < 2 && (
                    <select
                      value=""
                      onChange={e => { const v = Number(e.target.value); if (v) onAddMember(t.id, v); }}
                      disabled={busy || free.length === 0}
                      className="w-full px-2 py-1.5 rounded text-xs disabled:opacity-50"
                      style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                      data-testid={`select-add-member-${t.id}`}
                    >
                      <option value="">{free.length === 0 ? `No eligible ${cat} players` : `+ Add ${cat} player…`}</option>
                      {free.map((p: any) => <option key={p.id} value={p.id}>{p.displayName || p.user?.name || `#${p.id}`}</option>)}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

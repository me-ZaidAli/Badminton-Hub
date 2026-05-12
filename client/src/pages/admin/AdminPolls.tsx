import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Vote, Plus, Trash2, Eye, BarChart3, Users, Check, X, Loader2, Search, Power, ChevronLeft, Calendar, Pencil, RefreshCw, MessageSquare, UserPlus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

type Poll = {
  id: number;
  title: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
  audience: "ALL" | "SELECTED";
  targetClubIds: number[];
  targetUserIds: number[];
  sendAsMessage: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdById: number;
  totalResponses: number;
};

type ResultsBundle = {
  poll: Poll & { targetClubs: Array<{ id: number; name: string }> };
  totalResponses: number;
  perOption: number[];
  responses: Array<{
    id: number;
    userId: number;
    userName: string;
    userEmail: string;
    userPhotoUrl: string | null;
    optionIndices: number[];
    createdAt: string;
    updatedAt: string;
  }>;
};

export default function AdminPolls() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [resultsId, setResultsId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: polls = [], isLoading } = useQuery<Poll[]>({ queryKey: ["/api/admin/custom-polls"] });
  const { data: targetableData } = useQuery<{ canTargetAll: boolean; clubs: Array<{ id: number; name: string }> }>({
    queryKey: ["/api/custom-polls/targetable-clubs"],
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return polls;
    return polls.filter(p => p.title.toLowerCase().includes(q) || p.question.toLowerCase().includes(q));
  }, [polls, search]);

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/custom-polls/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-polls"] }),
  });
  const reopen = useMutation({
    mutationFn: async ({ id, days }: { id: number; days: number | null }) => {
      const body: any = { isActive: true };
      if (days === null) body.expiresAt = null;
      else body.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      return apiRequest("PATCH", `/api/admin/custom-polls/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-polls"] });
      toast({ title: "Poll reopened" });
    },
    onError: (e: any) => toast({ title: "Failed", description: String(e?.message || "").replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/custom-polls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-polls"] });
      toast({ title: "Poll deleted" });
    },
  });

  const [broadcastPoll, setBroadcastPoll] = useState<Poll | null>(null);

  const openCreate = () => { setEditingPoll(null); setFormOpen(true); };
  const openEdit = (p: Poll) => { setEditingPoll(p); setFormOpen(true); };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-700 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <Vote className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">Club Polls</h1>
            <p className="text-sm text-muted-foreground">Create, target & analyse member polls</p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white" data-testid="button-create-poll">
          <Plus className="w-4 h-4 mr-1" /> New poll
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total polls" value={polls.length} icon={<Vote className="w-4 h-4" />} color="from-fuchsia-500/15 to-violet-500/10" />
        <StatTile label="Active" value={polls.filter(p => p.isActive).length} icon={<Power className="w-4 h-4" />} color="from-emerald-500/15 to-teal-500/10" />
        <StatTile label="Total responses" value={polls.reduce((a, p) => a + p.totalResponses, 0)} icon={<Users className="w-4 h-4" />} color="from-cyan-500/15 to-sky-500/10" />
        <StatTile label="All-club polls" value={polls.filter(p => p.audience === "ALL").length} icon={<BarChart3 className="w-4 h-4" />} color="from-amber-500/15 to-orange-500/10" />
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search polls…" className="pl-9" data-testid="input-search-polls" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading polls…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Vote className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{polls.length === 0 ? "No polls yet — click 'New poll' to create one." : "No polls match your search."}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => {
            const isExpired = !!(p.expiresAt && new Date(p.expiresAt) < new Date());
            return (
              <Card key={p.id} className="overflow-hidden hover:border-fuchsia-300/40 transition" data-testid={`card-poll-${p.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold truncate">{p.title}</h3>
                        {p.audience === "ALL" ? (
                          <Badge className="bg-amber-500/20 text-amber-200 border-amber-300/40">All clubs</Badge>
                        ) : (
                          <Badge variant="secondary">{p.targetClubIds?.length || 0} {(p.targetClubIds?.length || 0) === 1 ? "club" : "clubs"}</Badge>
                        )}
                        {p.allowMultiple && <Badge variant="outline" className="text-[10px]">multi-select</Badge>}
                        {p.targetUserIds && p.targetUserIds.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]"><UserPlus className="w-3 h-3 mr-0.5" />{p.targetUserIds.length} user{p.targetUserIds.length === 1 ? "" : "s"}</Badge>
                        )}
                        {p.sendAsMessage && <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-300/40 text-[10px]"><MessageSquare className="w-3 h-3 mr-0.5" />Inbox</Badge>}
                        {!p.isActive && <Badge variant="destructive">Closed</Badge>}
                        {isExpired && <Badge variant="destructive">Expired</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.question}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{p.totalResponses} {p.totalResponses === 1 ? "response" : "responses"}</span>
                        <span>· {p.options.length} options</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(p.createdAt), "MMM d")}</span>
                        {p.expiresAt && <span>· {isExpired ? "Expired" : "Expires"} {format(new Date(p.expiresAt), "MMM d, HH:mm")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {(isExpired || !p.isActive) && (
                        <ReopenMenu onPick={(days) => reopen.mutate({ id: p.id, days })} pending={reopen.isPending} />
                      )}
                      {!isExpired && (
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={p.isActive}
                            onCheckedChange={(v) => toggleActive.mutate({ id: p.id, isActive: v })}
                            data-testid={`switch-active-${p.id}`}
                          />
                          <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Active</span>
                        </div>
                      )}
                      <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white" onClick={() => setBroadcastPoll(p)} data-testid={`button-broadcast-${p.id}`}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" /> Send to inbox
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setResultsId(p.id)} data-testid={`button-results-${p.id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Results
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this poll? Responses are also removed.")) remove.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <PollFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingPoll(null); }}
          targetable={targetableData || { canTargetAll: false, clubs: [] }}
          existing={editingPoll}
        />
      )}
      {resultsId !== null && (
        <ResultsDialog pollId={resultsId} onClose={() => setResultsId(null)} />
      )}
      {broadcastPoll && (
        <BroadcastDialog poll={broadcastPoll} clubs={targetableData?.clubs || []} onClose={() => setBroadcastPoll(null)} />
      )}
    </div>
  );
}

function BroadcastDialog({ poll, clubs, onClose }: { poll: Poll; clubs: Array<{ id: number; name: string }>; onClose: () => void }) {
  const { toast } = useToast();
  const [activeClubId, setActiveClubId] = useState<number | null>(clubs[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [selectedClubIds, setSelectedClubIds] = useState<Set<number>>(new Set());

  const { data: members = [], isLoading } = useQuery<Array<{ id: number; fullName: string; email: string; status: string }>>({
    queryKey: ["/api/custom-polls/clubs", activeClubId, "members"],
    enabled: activeClubId != null,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => m.fullName.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q));
  }, [members, search]);

  const toggleUser = (id: number) => setSelectedUserIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const wholeClubActive = activeClubId != null && selectedClubIds.has(activeClubId);
  const selectAllInClub = () => {
    if (activeClubId == null) return;
    setSelectedClubIds(s => { const n = new Set(s); n.add(activeClubId); return n; });
    // Tick every visible member too so the count is honest.
    setSelectedUserIds(s => { const n = new Set(s); members.forEach(m => n.add(m.id)); return n; });
  };
  const unselectAllInClub = () => {
    if (activeClubId == null) return;
    setSelectedClubIds(s => { const n = new Set(s); n.delete(activeClubId); return n; });
    setSelectedUserIds(s => { const n = new Set(s); members.forEach(m => n.delete(m.id)); return n; });
  };
  const removeWholeClub = (cid: number) => setSelectedClubIds(s => { const n = new Set(s); n.delete(cid); return n; });

  const send = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/custom-polls/${poll.id}/send-message`, {
        userIds: Array.from(selectedUserIds),
        clubIds: Array.from(selectedClubIds),
      }),
    onSuccess: async (res) => {
      const json = await res.json().catch(() => ({} as any));
      toast({ title: `Sent to ${json?.sent ?? "?"} ${json?.sent === 1 ? "person" : "people"}`, description: "They'll see it in their inbox now." });
      // Reset selection so they can fire another batch.
      setSelectedUserIds(new Set());
      setSelectedClubIds(new Set());
    },
    onError: (e: any) => toast({ title: "Send failed", description: String(e?.message || "").replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const totalSelected = selectedUserIds.size + (selectedClubIds.size > 0 ? selectedClubIds.size * 9999 : 0); // we don't know exact club totals client-side; show as "+ whole club"

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-500" /> Send poll to inbox
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">"{poll.title}" — pick recipients then hit Send. You can send this poll as many times as you like.</p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-3 gap-3">
          {/* Club tabs */}
          {clubs.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">No clubs available to broadcast from.</div>
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {clubs.map(c => {
                  const wholeClubChosen = selectedClubIds.has(c.id);
                  const isActive = activeClubId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveClubId(c.id)}
                      className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${isActive ? "bg-fuchsia-500 text-white border-fuchsia-400" : wholeClubChosen ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                      data-testid={`tab-club-${c.id}`}
                    >
                      {wholeClubChosen && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {c.name}
                      {wholeClubChosen && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-white">ALL</span>}
                    </button>
                  );
                })}
              </div>

              {/* Search + select all */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={wholeClubActive ? "Whole club selected — search disabled" : "Search members in this club…"} className="pl-9 h-9" disabled={wholeClubActive} data-testid="input-broadcast-search" />
                </div>
                {wholeClubActive ? (
                  <Button size="sm" variant="outline" onClick={unselectAllInClub} className="border-emerald-400 text-emerald-300 hover:bg-emerald-500/10" data-testid="button-unselect-all-club">
                    <X className="w-3.5 h-3.5 mr-1" /> Deselect all
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={selectAllInClub} disabled={activeClubId == null || isLoading || members.length === 0} data-testid="button-select-all-club">
                    <Users className="w-3.5 h-3.5 mr-1" /> Select all{members.length ? ` (${members.length})` : ""}
                  </Button>
                )}
              </div>

              {/* Member list */}
              <div className="flex-1 overflow-y-auto rounded-lg border min-h-[200px]">
                {isLoading ? (
                  <div className="p-6 text-sm text-muted-foreground flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading members…</div>
                ) : wholeClubActive ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center gap-3 bg-emerald-500/5 h-full">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-emerald-300">All {members.length} {members.length === 1 ? "member" : "members"} selected</div>
                      <div className="text-xs text-muted-foreground mt-1">Every person in <b>{clubs.find(c => c.id === activeClubId)?.name}</b> will receive this poll in their inbox.</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={unselectAllInClub} data-testid="button-clear-all-club">
                      <X className="w-3.5 h-3.5 mr-1" /> Clear selection
                    </Button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">No members match.</div>
                ) : (
                  filtered.map(m => {
                    const on = selectedUserIds.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleUser(m.id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b last:border-0 hover:bg-accent ${on ? "bg-fuchsia-500/10" : ""}`}
                        data-testid={`row-member-${m.id}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{m.fullName}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{m.email} {m.status && <span className="ml-1 uppercase tracking-wider opacity-70">· {m.status}</span>}</div>
                        </div>
                        {on ? <Check className="w-4 h-4 text-fuchsia-400 shrink-0" /> : <Plus className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selection summary */}
              {(selectedUserIds.size > 0 || selectedClubIds.size > 0) && (
                <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1.5">
                  {selectedUserIds.size > 0 && (
                    <div className="text-xs flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-fuchsia-400" /> <b>{selectedUserIds.size}</b> individual {selectedUserIds.size === 1 ? "user" : "users"} selected</div>
                  )}
                  {Array.from(selectedClubIds).map(cid => {
                    const c = clubs.find(x => x.id === cid);
                    return (
                      <div key={cid} className="text-xs flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-emerald-400" /> Whole club: <b>{c?.name || `#${cid}`}</b></span>
                        <button onClick={() => removeWholeClub(cid)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-3 border-t flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            onClick={() => send.mutate()}
            disabled={send.isPending || (selectedUserIds.size === 0 && selectedClubIds.size === 0)}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white"
            data-testid="button-send-broadcast"
          >
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />}
            Send now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenMenu({ onPick, pending }: { onPick: (days: number | null) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        className="bg-emerald-500 hover:bg-emerald-400 text-white"
        data-testid="button-reopen"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
        Reopen
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border bg-popover shadow-xl py-1">
            {[
              { label: "+ 1 day", days: 1 },
              { label: "+ 3 days", days: 3 },
              { label: "+ 7 days", days: 7 },
              { label: "+ 30 days", days: 30 },
              { label: "No expiry", days: null as number | null },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => { setOpen(false); onPick(opt.days); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                data-testid={`button-reopen-${opt.days ?? "forever"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${color} p-3`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-2xl font-extrabold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function PollFormDialog({ open, onClose, targetable, existing }: {
  open: boolean;
  onClose: () => void;
  targetable: { canTargetAll: boolean; clubs: Array<{ id: number; name: string }> };
  existing: Poll | null;
}) {
  const { toast } = useToast();
  const isEdit = !!existing;
  const [title, setTitle] = useState(existing?.title || "");
  const [question, setQuestion] = useState(existing?.question || "");
  const [options, setOptions] = useState<string[]>(existing?.options?.length ? [...existing.options] : ["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(!!existing?.allowMultiple);
  const [audience, setAudience] = useState<"ALL" | "SELECTED">(existing?.audience || (targetable.canTargetAll ? "ALL" : "SELECTED"));
  const [targetClubIds, setTargetClubIds] = useState<number[]>(existing?.targetClubIds || []);
  const [targetUserIds, setTargetUserIds] = useState<number[]>(existing?.targetUserIds || []);
  const [sendAsMessage, setSendAsMessage] = useState(!!existing?.sendAsMessage);
  const [expiresAt, setExpiresAt] = useState(toLocalDatetimeInput(existing?.expiresAt || null));
  const [isActive, setIsActive] = useState(existing ? existing.isActive : true);

  // Sync state when "existing" changes (dialog reuse)
  useEffect(() => {
    setTitle(existing?.title || "");
    setQuestion(existing?.question || "");
    setOptions(existing?.options?.length ? [...existing.options] : ["", ""]);
    setAllowMultiple(!!existing?.allowMultiple);
    setAudience(existing?.audience || (targetable.canTargetAll ? "ALL" : "SELECTED"));
    setTargetClubIds(existing?.targetClubIds || []);
    setTargetUserIds(existing?.targetUserIds || []);
    setSendAsMessage(!!existing?.sendAsMessage);
    setExpiresAt(toLocalDatetimeInput(existing?.expiresAt || null));
    setIsActive(existing ? existing.isActive : true);
  }, [existing?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: title.trim(),
        question: question.trim(),
        options: options.map(o => o.trim()).filter(Boolean),
        allowMultiple,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      payload.audience = audience;
      payload.targetClubIds = audience === "ALL" ? [] : targetClubIds;
      payload.targetUserIds = audience === "ALL" ? [] : targetUserIds;
      payload.sendAsMessage = sendAsMessage;
      if (isEdit) payload.isActive = isActive;
      if (isEdit) {
        return apiRequest("PATCH", `/api/admin/custom-polls/${existing!.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/custom-polls", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-polls"] });
      toast({ title: isEdit ? "Poll updated" : "Poll created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: String(e?.message || "").replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const validOptions = options.filter(o => o.trim()).length;
  const canSubmit = title.trim() && question.trim() && validOptions >= 2 && (audience === "ALL" || targetClubIds.length > 0 || targetUserIds.length > 0 || isEdit);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEdit ? "Edit poll" : "Create poll"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isEdit && existing!.totalResponses > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200">
              ⚠️ This poll already has <b>{existing!.totalResponses}</b> response{existing!.totalResponses === 1 ? "" : "s"}. Editing options may invalidate existing answers — only edit text wording, not meaning.
            </div>
          )}
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saturday social slot" maxLength={120} data-testid="input-poll-title" />
          </div>
          <div>
            <Label>Question</Label>
            <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What time works best for everyone?" rows={2} maxLength={500} data-testid="input-poll-question" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Options ({validOptions})</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOptions([...options, ""])} disabled={options.length >= 12}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6 tabular-nums">{i + 1}.</span>
                  <Input
                    value={opt}
                    onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next); }}
                    placeholder={`Option ${i + 1}`}
                    maxLength={100}
                    data-testid={`input-option-${i}`}
                  />
                  {options.length > 2 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} data-testid="switch-multi" />
            <Label className="cursor-pointer" onClick={() => setAllowMultiple(!allowMultiple)}>Allow multiple answers</Label>
          </div>

          {/* Audience picker — available on both create and edit */}
          <div className="rounded-lg border p-3 space-y-3">
            <Label className="block">Who can see this poll</Label>
            <div className="flex gap-2 flex-wrap">
              {targetable.canTargetAll && (
                <Button type="button" size="sm" variant={audience === "ALL" ? "default" : "outline"} onClick={() => setAudience("ALL")} data-testid="button-audience-all">
                  Everyone
                </Button>
              )}
              <Button type="button" size="sm" variant={audience === "SELECTED" ? "default" : "outline"} onClick={() => setAudience("SELECTED")} data-testid="button-audience-selected">
                Pick clubs / users
              </Button>
            </div>
            {audience === "SELECTED" && (
              <>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Clubs</p>
                  <ClubChips clubs={targetable.clubs} selected={targetClubIds} onChange={setTargetClubIds} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Specific users</p>
                  <UserPicker selected={targetUserIds} onChange={setTargetUserIds} />
                </div>
              </>
            )}
            {audience === "ALL" && (
              <p className="text-xs text-muted-foreground">Every member of every club will see this poll on their dashboard.</p>
            )}
          </div>

          {/* Send as in-app message */}
          <div className="rounded-lg border p-3 flex items-start gap-3">
            <Switch checked={sendAsMessage} onCheckedChange={setSendAsMessage} data-testid="switch-send-message" />
            <div className="flex-1">
              <Label className="cursor-pointer flex items-center gap-1.5" onClick={() => setSendAsMessage(!sendAsMessage)}>
                <MessageSquare className="w-4 h-4" /> Also send as in-app message
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drops a notification into every recipient's inbox immediately so they don't miss it. Useful when members can't see the dashboard tile (e.g. trial players or pending memberships).
              </p>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-edit-active" />
              <Label className="cursor-pointer" onClick={() => setIsActive(!isActive)}>Active (visible to members)</Label>
            </div>
          )}

          <div>
            <Label className="flex items-center justify-between">
              <span>Expires (optional)</span>
              {expiresAt && <button type="button" onClick={() => setExpiresAt("")} className="text-[11px] text-muted-foreground underline">Clear</button>}
            </Label>
            <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} data-testid="input-expires" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!canSubmit || save.isPending} className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white" data-testid="button-submit-form">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : isEdit ? <Check className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {isEdit ? "Save changes" : "Create poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserPicker({ selected, onChange }: { selected: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);

  const { data: results = [], isFetching } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/custom-polls/targetable-users", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/custom-polls/targetable-users?q=${encodeURIComponent(debounced)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: chosen = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/custom-polls/hydrate-users", selected.slice().sort().join(",")],
    enabled: selected.length > 0,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/custom-polls/hydrate-users", { ids: selected });
      return res.json();
    },
  });

  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9 h-9"
          data-testid="input-user-search"
        />
      </div>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u.id)}
              className="text-xs px-2.5 py-1 rounded-full border bg-fuchsia-500/20 border-fuchsia-300 text-foreground inline-flex items-center gap-1"
              data-testid={`chip-user-${u.id}`}
              title={u.email}
            >
              <Check className="w-3 h-3" />{u.fullName}
              <X className="w-3 h-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
      {debounced && (
        <div className="rounded-md border bg-popover max-h-48 overflow-y-auto">
          {isFetching ? (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">No users match.</div>
          ) : (
            results.map(u => {
              const on = selected.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-accent ${on ? "bg-fuchsia-500/10" : ""}`}
                  data-testid={`row-user-${u.id}`}
                >
                  <div className="min-w-0">
                    <div className="truncate">{u.fullName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  {on ? <Check className="w-4 h-4 text-fuchsia-400" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                </button>
              );
            })
          )}
        </div>
      )}
      {!debounced && chosen.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Start typing a name or email to add specific people.</p>
      )}
    </div>
  );
}

function ClubChips({ clubs, selected, onChange }: { clubs: Array<{ id: number; name: string }>; selected: number[]; onChange: (ids: number[]) => void }) {
  if (clubs.length === 0) return <p className="text-xs text-muted-foreground">No clubs available to target.</p>;
  return (
    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
      {clubs.map(c => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(on ? selected.filter(x => x !== c.id) : [...selected, c.id])}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? "bg-fuchsia-500/20 border-fuchsia-300 text-foreground" : "bg-muted border-border text-muted-foreground hover:bg-muted/70"}`}
            data-testid={`chip-club-${c.id}`}
          >
            {on && <Check className="w-3 h-3 inline mr-1" />}{c.name}
          </button>
        );
      })}
    </div>
  );
}

function ResultsDialog({ pollId, onClose }: { pollId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<ResultsBundle>({ queryKey: ["/api/admin/custom-polls", pollId, "results"], queryFn: async () => {
    const r = await fetch(`/api/admin/custom-polls/${pollId}/results`, { credentials: "include" });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  } });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={onClose} className="md:hidden"><ChevronLeft className="w-5 h-5" /></button>
            <BarChart3 className="w-5 h-5" /> Poll Results
          </DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading results…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header card */}
            <div className="rounded-xl border bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-4">
              <h3 className="text-lg font-extrabold" data-testid="text-results-title">{data.poll.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{data.poll.question}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {data.poll.audience === "ALL" ? (
                  <Badge className="bg-amber-500/20 text-amber-200 border-amber-300/40">All clubs</Badge>
                ) : data.poll.targetClubs.map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                <Badge variant="outline" className="ml-auto">
                  <Users className="w-3 h-3 mr-1" />{data.totalResponses} {data.totalResponses === 1 ? "respondent" : "respondents"}
                </Badge>
              </div>
            </div>

            {/* Tally bars */}
            <div>
              <h4 className="text-sm font-bold mb-2 uppercase tracking-wider text-muted-foreground">Vote breakdown</h4>
              <div className="space-y-2">
                {data.poll.options.map((opt, i) => {
                  const count = data.perOption[i] || 0;
                  const total = data.perOption.reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={i} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold truncate">{opt}</span>
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0 ml-2">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-respondent table */}
            <div>
              <h4 className="text-sm font-bold mb-2 uppercase tracking-wider text-muted-foreground">Who answered what</h4>
              {data.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No responses yet.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-xs uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">User</th>
                          <th className="text-left px-3 py-2">Answer{data.poll.allowMultiple ? "s" : ""}</th>
                          <th className="text-right px-3 py-2 hidden sm:table-cell">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.responses.map(r => (
                          <tr key={r.id} className="border-t hover:bg-muted/50" data-testid={`row-response-${r.id}`}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {r.userPhotoUrl ? (
                                  <img src={r.userPhotoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                    {(r.userName || "?").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{r.userName || "—"}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{r.userEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {r.optionIndices.map(idx => (
                                  <Badge key={idx} variant="outline" className="text-[10px]">{data.poll.options[idx] || `?#${idx}`}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
                              {format(new Date(r.updatedAt), "MMM d, HH:mm")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

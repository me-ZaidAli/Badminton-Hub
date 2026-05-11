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
import { Vote, Plus, Trash2, Eye, BarChart3, Users, Check, X, Loader2, Search, Power, ChevronLeft, Calendar, Pencil, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Poll = {
  id: number;
  title: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
  audience: "ALL" | "SELECTED";
  targetClubIds: number[];
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
    </div>
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
      if (!isEdit) {
        payload.audience = audience;
        payload.targetClubIds = audience === "ALL" ? [] : targetClubIds;
      } else {
        payload.isActive = isActive;
        if (existing!.audience === "SELECTED") payload.targetClubIds = targetClubIds;
      }
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
  const canSubmit = title.trim() && question.trim() && validOptions >= 2 && (audience === "ALL" || targetClubIds.length > 0 || isEdit);

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

          {/* Audience picker */}
          {!isEdit && (
            <div className="rounded-lg border p-3">
              <Label className="mb-2 block">Audience</Label>
              <div className="flex gap-2 mb-3">
                {targetable.canTargetAll && (
                  <Button type="button" size="sm" variant={audience === "ALL" ? "default" : "outline"} onClick={() => setAudience("ALL")} data-testid="button-audience-all">
                    All clubs
                  </Button>
                )}
                <Button type="button" size="sm" variant={audience === "SELECTED" ? "default" : "outline"} onClick={() => setAudience("SELECTED")} data-testid="button-audience-selected">
                  Pick clubs
                </Button>
              </div>
              {audience === "SELECTED" && (
                <ClubChips clubs={targetable.clubs} selected={targetClubIds} onChange={setTargetClubIds} />
              )}
            </div>
          )}
          {isEdit && existing!.audience === "SELECTED" && (
            <div className="rounded-lg border p-3">
              <Label className="mb-2 block">Target clubs</Label>
              <ClubChips clubs={targetable.clubs} selected={targetClubIds} onChange={setTargetClubIds} />
            </div>
          )}
          {isEdit && existing!.audience === "ALL" && (
            <div className="rounded-lg border p-3 bg-amber-500/5">
              <Label className="block">Audience</Label>
              <p className="text-xs text-muted-foreground mt-1">This poll targets <b>all clubs</b>. Audience type can't be changed after creation.</p>
            </div>
          )}

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

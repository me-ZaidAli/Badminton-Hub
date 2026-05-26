import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMyAdminClubs } from "@/hooks/use-clubs";

type Status = "PENDING" | "VERIFYING" | "CONFIRMED" | "REJECTED";

interface AdminReminder {
  id: number;
  userId: number;
  clubId: number | null;
  sessionsCount: number;
  amountPence: number;
  description: string;
  note: string | null;
  dueDate: string;
  status: Status;
  proofUrl: string | null;
  rejectionReason: string | null;
  userConfirmedAt: string | null;
  createdAt: string;
  recipient: { id: number; fullName: string; email: string } | null;
}

interface ClubLite { id: number; name: string }

function statusBadge(status: Status) {
  const map: Record<Status, { label: string; cls: string; Icon: any }> = {
    PENDING:    { label: "Pending User",    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",   Icon: AlertTriangle },
    VERIFYING:  { label: "Verifying",       cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",       Icon: Clock },
    CONFIRMED:  { label: "Confirmed",       cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", Icon: CheckCircle2 },
    REJECTED:   { label: "Rejected",        cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",       Icon: XCircle },
  };
  const m = map[status];
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`} data-testid={`badge-status-${status}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function fmtMoney(p: number) { return `£${(p / 100).toFixed(2)}`; }
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export default function SessionPaymentReminders() {
  const { toast } = useToast();
  const { data: myAdminClubs = [] } = useMyAdminClubs() as { data: ClubLite[] };
  const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
  const [q, setQ] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [rejecting, setRejecting] = useState<AdminReminder | null>(null);

  const { data: reminders = [], isLoading } = useQuery<AdminReminder[]>({
    queryKey: ["/api/admin/session-payment-reminders", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "ALL"
        ? "/api/admin/session-payment-reminders"
        : `/api/admin/session-payment-reminders?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return reminders;
    const needle = q.toLowerCase();
    return reminders.filter(r =>
      r.description.toLowerCase().includes(needle) ||
      (r.note?.toLowerCase().includes(needle)) ||
      (r.recipient?.fullName?.toLowerCase().includes(needle)) ||
      (r.recipient?.email?.toLowerCase().includes(needle))
    );
  }, [reminders, q]);

  const confirmMut = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/admin/session-payment-reminders/${id}`, { action: "CONFIRM" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session-payment-reminders"] });
      toast({ title: "Payment confirmed", description: "The user's reminder has been cleared." });
    },
    onError: (e: any) => toast({ title: "Could not confirm", description: e?.message || "", variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: async (vars: { id: number; reason: string }) =>
      apiRequest("PATCH", `/api/admin/session-payment-reminders/${vars.id}`, { action: "REJECT", reason: vars.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session-payment-reminders"] });
      toast({ title: "Payment rejected", description: "User will see your reason on their floating reminder." });
      setRejecting(null);
    },
    onError: (e: any) => toast({ title: "Could not reject", description: e?.message || "", variant: "destructive" }),
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="link-back-admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
          </Link>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Session Payment Reminders</h1>
        </div>
        <Button onClick={() => setShowIssue(true)} data-testid="button-new-reminder">
          <Plus className="h-4 w-4 mr-1" /> Issue Reminder
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Issue payment reminders for unpaid <strong>training and coaching sessions</strong>. The user will see
        a floating notification on every page until you confirm payment.
      </p>

      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by user, reason, or note…"
              className="pl-9" data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending user</SelectItem>
              <SelectItem value="VERIFYING">Awaiting verification</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground" data-testid="text-empty">
          No reminders {statusFilter !== "ALL" ? `with status ${statusFilter}` : "yet"}.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} data-testid={`card-reminder-${r.id}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold" data-testid={`text-recipient-${r.id}`}>
                      {r.recipient?.fullName || `User #${r.userId}`}
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 truncate" data-testid={`text-description-${r.id}`}>
                    {r.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                    <span><strong>{r.sessionsCount}</strong> sessions</span>
                    <span><strong>{fmtMoney(r.amountPence)}</strong> due</span>
                    <span>Due {fmtDate(r.dueDate)}</span>
                    {r.userConfirmedAt && <span>User confirmed {fmtDate(r.userConfirmedAt)}</span>}
                  </div>
                  {r.note && <div className="text-xs italic mt-1">"{r.note}"</div>}
                  {r.rejectionReason && (
                    <div className="text-xs mt-1 text-rose-600 dark:text-rose-300">
                      Rejected: {r.rejectionReason}
                    </div>
                  )}
                  {r.proofUrl && (
                    <a href={r.proofUrl} target="_blank" rel="noreferrer"
                       className="inline-flex items-center gap-1 text-xs mt-1 underline text-primary"
                       data-testid={`link-proof-${r.id}`}>
                      <Eye className="h-3 w-3" /> View payment proof <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {r.status === "VERIFYING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm" variant="outline" onClick={() => setRejecting(r)}
                      disabled={rejectMut.isPending}
                      data-testid={`button-reject-${r.id}`}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm" onClick={() => confirmMut.mutate(r.id)}
                      disabled={confirmMut.isPending}
                      data-testid={`button-confirm-${r.id}`}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm
                    </Button>
                  </div>
                )}
                {r.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm" variant="outline" onClick={() => confirmMut.mutate(r.id)}
                      disabled={confirmMut.isPending}
                      data-testid={`button-mark-paid-${r.id}`}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark paid
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showIssue && (
        <IssueReminderDialog
          clubs={myAdminClubs}
          onClose={() => setShowIssue(false)}
          onCreated={() => {
            setShowIssue(false);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/session-payment-reminders"] });
          }}
        />
      )}

      {rejecting && (
        <RejectDialog
          reminder={rejecting}
          onCancel={() => setRejecting(null)}
          onReject={(reason) => rejectMut.mutate({ id: rejecting.id, reason })}
          pending={rejectMut.isPending}
        />
      )}
    </div>
  );
}

// ---------- Reject dialog ----------
function RejectDialog({ reminder, onCancel, onReject, pending }: {
  reminder: AdminReminder; onCancel: () => void; onReject: (reason: string) => void; pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject payment confirmation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            User <strong>{reminder.recipient?.fullName || `#${reminder.userId}`}</strong> claimed they paid
            {' '}<strong>{fmtMoney(reminder.amountPence)}</strong>. Tell them why you're rejecting — they'll see
            this on their floating reminder.
          </p>
          <Textarea
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. No payment received yet / Proof unclear"
            rows={4}
            data-testid="textarea-rejection-reason"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending} data-testid="button-reject-cancel">Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => onReject(reason.trim())}
            disabled={pending || reason.trim().length < 2}
            data-testid="button-reject-confirm"
          >Reject payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Issue dialog ----------
function IssueReminderDialog({ clubs, onClose, onCreated }: {
  clubs: ClubLite[]; onClose: () => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"USERS" | "WHOLE_CLUB">("USERS");
  const [clubId, setClubId] = useState<string>(clubs[0] ? String(clubs[0].id) : "");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [sessionsCount, setSessionsCount] = useState(1);
  const [amount, setAmount] = useState(""); // pounds string
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // Member search (only when a club is selected + mode = USERS)
  const { data: members = [] } = useQuery<Array<{ id: number; fullName: string; email: string }>>({
    queryKey: ["/api/admin/club-members", clubId],
    enabled: !!clubId && mode === "USERS",
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      // tolerate either {members:[{user:{...}}]} or [{id,fullName,email}]
      return (Array.isArray(data) ? data : (data.members || data || [])).map((m: any) => ({
        id: m.user?.id ?? m.userId ?? m.id,
        fullName: m.user?.fullName ?? m.fullName ?? m.user?.email ?? `User #${m.userId ?? m.id}`,
        email: m.user?.email ?? m.email ?? "",
      })).filter((u: any) => u.id);
    },
  });
  const filteredMembers = useMemo(() => {
    if (!userQuery.trim()) return members.slice(0, 50);
    const n = userQuery.toLowerCase();
    return members.filter(m => m.fullName.toLowerCase().includes(n) || m.email.toLowerCase().includes(n)).slice(0, 50);
  }, [members, userQuery]);

  const createMut = useMutation({
    mutationFn: async () => {
      const pence = Math.round(parseFloat(amount || "0") * 100);
      const body: any = {
        sessionsCount,
        amountPence: pence,
        description: description.trim(),
        note: note.trim() || undefined,
        dueDate: new Date(dueDate).toISOString(),
      };
      if (mode === "WHOLE_CLUB") {
        body.allMembersOfClubId = parseInt(clubId, 10);
      } else {
        body.userIds = selectedUserIds;
        if (clubId) body.clubId = parseInt(clubId, 10);
      }
      return apiRequest("POST", "/api/admin/session-payment-reminders", body);
    },
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Reminder issued", description: `Sent to ${data.created} user${data.created === 1 ? "" : "s"}.` });
      onCreated();
    },
    onError: (e: any) => toast({ title: "Failed to issue", description: e?.message || "", variant: "destructive" }),
  });

  const canSubmit =
    description.trim().length >= 2 &&
    sessionsCount >= 1 &&
    parseFloat(amount || "0") > 0 &&
    !!dueDate &&
    (mode === "WHOLE_CLUB" ? !!clubId : selectedUserIds.length > 0);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue session payment reminder</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {/* Recipient mode */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "USERS" ? "default" : "outline"}
              size="sm" onClick={() => setMode("USERS")}
              data-testid="button-mode-users"
            >Specific users</Button>
            <Button
              variant={mode === "WHOLE_CLUB" ? "default" : "outline"}
              size="sm" onClick={() => setMode("WHOLE_CLUB")}
              data-testid="button-mode-club"
            >All members of a club</Button>
          </div>

          {clubs.length > 0 && (
            <div>
              <Label>Club</Label>
              <Select value={clubId} onValueChange={setClubId}>
                <SelectTrigger data-testid="select-club"><SelectValue placeholder="Pick a club…" /></SelectTrigger>
                <SelectContent>
                  {clubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "USERS" && clubId && (
            <div>
              <Label>Recipients</Label>
              <Input
                value={userQuery} onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search by name or email…"
                data-testid="input-user-search"
              />
              <div className="mt-2 border rounded-md max-h-48 overflow-y-auto divide-y">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No members found.</div>
                ) : filteredMembers.map(m => {
                  const checked = selectedUserIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/40"
                           data-testid={`row-member-${m.id}`}>
                      <input
                        type="checkbox" checked={checked}
                        onChange={(e) => setSelectedUserIds(prev =>
                          e.target.checked ? [...prev, m.id] : prev.filter(x => x !== m.id))}
                        data-testid={`checkbox-member-${m.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{m.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{selectedUserIds.length} selected</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Unpaid sessions</Label>
              <Input
                type="number" min={1} max={999} value={sessionsCount}
                onChange={(e) => setSessionsCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                data-testid="input-sessions-count"
              />
            </div>
            <div>
              <Label>Amount due (£)</Label>
              <Input
                type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 24.00"
                data-testid="input-amount"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "Unpaid training sessions — May"'
              data-testid="input-description"
            />
          </div>

          <div>
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due-date" />
          </div>

          <div>
            <Label>Optional note</Label>
            <Textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              rows={2} placeholder="e.g. Please settle before next session"
              data-testid="textarea-note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={createMut.isPending} data-testid="button-issue-cancel">Cancel</Button>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!canSubmit || createMut.isPending}
            data-testid="button-issue-submit"
          >Send reminder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

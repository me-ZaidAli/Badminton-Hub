import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search, Loader2, GraduationCap, ShieldCheck, Pencil, Trash2, Ban, CheckCircle2, XCircle, Plus, ArrowLeft,
  Sparkles, UserPlus, Mail, Phone, MapPin, BadgeCheck, Award, Crown, AlertTriangle,
} from "lucide-react";

type Coach = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  bio: string | null;
  profilePhoto: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  qualifications: string | null;
  yearsTraining: number | null;
  badmintonEnglandCert: boolean;
  firstAidCert: boolean;
  roleTitle: string | null;
  experience: string | null;
  coachingPhilosophy: string | null;
  sessionPrices: string | null;
  cancellationPolicy: string | null;
  achievements: string | null;
  languagesSpoken: string | null;
};

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

const STATUS_META: Record<Coach["status"], { label: string; classes: string }> = {
  PENDING:   { label: "Pending",   classes: "bg-amber-500/15  text-amber-700  dark:text-amber-300  border-amber-500/40" },
  APPROVED:  { label: "Approved",  classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
  REJECTED:  { label: "Rejected",  classes: "bg-rose-500/15    text-rose-700    dark:text-rose-300    border-rose-500/40" },
  SUSPENDED: { label: "Suspended", classes: "bg-slate-500/15   text-slate-700   dark:text-slate-300   border-slate-500/40" },
};

export default function SuperAdminCoaches() {
  const { data: user } = useUser();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [editing, setEditing] = useState<Coach | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Coach | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const { data: coaches = [], isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/admin/coaches"],
    enabled: user?.role === "OWNER",
  });

  const stats = useMemo(() => {
    const t = { total: coaches.length, pending: 0, approved: 0, suspended: 0, rejected: 0 };
    for (const c of coaches) {
      if (c.status === "PENDING") t.pending++;
      else if (c.status === "APPROVED") t.approved++;
      else if (c.status === "SUSPENDED") t.suspended++;
      else if (c.status === "REJECTED") t.rejected++;
    }
    return t;
  }, [coaches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coaches.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.fullName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.qualifications?.toLowerCase().includes(q)
      );
    });
  }, [coaches, search, statusFilter]);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Coach["status"] }) =>
      apiRequest("PATCH", `/api/admin/coaches/${id}`, { status }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      toast({ title: "Coach updated", description: `Status set to ${vars.status.toLowerCase()}.` });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateCoach = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Coach> }) =>
      apiRequest("PATCH", `/api/admin/coaches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setEditing(null);
      toast({ title: "Coach saved", description: "Profile updated." });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteCoach = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/coaches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setConfirmDelete(null);
      toast({ title: "Coach removed" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (user?.role !== "OWNER") {
    return (
      <div className="container mx-auto py-12 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Restricted to platform admins.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 space-y-6 max-w-7xl">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/15 to-indigo-700/25 p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-fuchsia-500/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/super-admin">
              <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back-super-admin">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-fuchsia-500/40 shrink-0">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300/90">Super Admin</span>
                <Crown className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Coach Control Center</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Approve, suspend, edit and remove every coach across the platform.</p>
            </div>
          </div>
          <Button onClick={() => setPromoteOpen(true)} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white shadow-lg shadow-fuchsia-500/30" data-testid="button-promote-coach">
            <UserPlus className="w-4 h-4 mr-2" />
            Promote user to coach
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total coaches" value={stats.total} icon={GraduationCap} accent="from-violet-500/30 to-fuchsia-500/20 text-violet-200" />
        <StatTile label="Awaiting review" value={stats.pending} icon={Sparkles} accent="from-amber-500/30 to-orange-500/20 text-amber-200" />
        <StatTile label="Approved" value={stats.approved} icon={BadgeCheck} accent="from-emerald-500/30 to-teal-500/20 text-emerald-200" />
        <StatTile label="Suspended / rejected" value={stats.suspended + stats.rejected} icon={Ban} accent="from-rose-500/30 to-red-500/20 text-rose-200" />
      </div>

      {/* TOOLBAR */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="ALL" data-testid="tab-status-all">All <span className="ml-1.5 text-[10px] opacity-70">({stats.total})</span></TabsTrigger>
              <TabsTrigger value="PENDING" data-testid="tab-status-pending">Pending <span className="ml-1.5 text-[10px] opacity-70">({stats.pending})</span></TabsTrigger>
              <TabsTrigger value="APPROVED" data-testid="tab-status-approved">Approved <span className="ml-1.5 text-[10px] opacity-70">({stats.approved})</span></TabsTrigger>
              <TabsTrigger value="SUSPENDED" data-testid="tab-status-suspended">Suspended <span className="ml-1.5 text-[10px] opacity-70">({stats.suspended})</span></TabsTrigger>
              <TabsTrigger value="REJECTED" data-testid="tab-status-rejected">Rejected <span className="ml-1.5 text-[10px] opacity-70">({stats.rejected})</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, city…"
              className="pl-9"
              data-testid="input-search-coaches"
            />
          </div>
        </CardContent>
      </Card>

      {/* COACH LIST */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
            <p className="font-semibold">No coaches match these filters.</p>
            <p className="text-sm text-muted-foreground mt-1">Try clearing the search or switching tab.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(c => (
            <CoachCard
              key={c.id}
              coach={c}
              onEdit={() => setEditing(c)}
              onDelete={() => setConfirmDelete(c)}
              onSetStatus={(s) => setStatus.mutate({ id: c.id, status: s })}
              isPending={setStatus.isPending && setStatus.variables?.id === c.id}
            />
          ))}
        </div>
      )}

      {/* EDIT */}
      {editing && (
        <EditCoachDialog
          coach={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateCoach.mutate({ id: editing.id, data })}
          isSaving={updateCoach.isPending}
        />
      )}

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Remove coach?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <span className="font-semibold">{confirmDelete?.fullName}</span> from the coach
              directory. Their user account is kept, but they'll lose all coach data and bookings. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500"
              onClick={() => confirmDelete && deleteCoach.mutate(confirmDelete.id)}
              data-testid="button-confirm-delete-coach"
            >
              {deleteCoach.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove coach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PROMOTE */}
      <PromoteUserDialog open={promoteOpen} onClose={() => setPromoteOpen(false)} />
    </div>
  );
}

function StatTile({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: string }) {
  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className={`p-4 bg-gradient-to-br ${accent} relative`}>
        <Icon className="absolute right-3 bottom-3 w-10 h-10 opacity-25" />
        <p className="text-[11px] uppercase tracking-wider font-bold opacity-80">{label}</p>
        <p className="text-3xl font-extrabold tabular-nums mt-1" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CoachCard({
  coach, onEdit, onDelete, onSetStatus, isPending,
}: {
  coach: Coach;
  onEdit: () => void;
  onDelete: () => void;
  onSetStatus: (s: Coach["status"]) => void;
  isPending: boolean;
}) {
  const meta = STATUS_META[coach.status];
  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/40 transition" data-testid={`card-coach-${coach.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-border shrink-0">
            {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 font-bold">
              {coach.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold truncate" data-testid={`text-coach-name-${coach.id}`}>{coach.fullName}</p>
              <Badge className={`${meta.classes} border text-[10px] px-1.5 py-0`}>{meta.label}</Badge>
              {coach.badmintonEnglandCert && (
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40 text-[10px] px-1.5 py-0">
                  <BadgeCheck className="w-3 h-3 mr-0.5" />BE
                </Badge>
              )}
            </div>
            {coach.roleTitle && <p className="text-xs text-muted-foreground mt-0.5">{coach.roleTitle}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{coach.email}</span>
              {coach.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{coach.phone}</span>}
              {coach.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{coach.city}</span>}
              {coach.yearsTraining != null && <span className="inline-flex items-center gap-1"><Award className="w-3 h-3" />{coach.yearsTraining}y</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
          {coach.status !== "APPROVED" && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onSetStatus("APPROVED")} className="text-emerald-600 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10" data-testid={`button-approve-${coach.id}`}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
            </Button>
          )}
          {coach.status !== "SUSPENDED" && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onSetStatus("SUSPENDED")} className="text-slate-600 dark:text-slate-300 border-slate-500/40 hover:bg-slate-500/10" data-testid={`button-suspend-${coach.id}`}>
              <Ban className="w-3.5 h-3.5 mr-1" />Suspend
            </Button>
          )}
          {coach.status !== "REJECTED" && (
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => onSetStatus("REJECTED")} className="text-rose-600 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/10" data-testid={`button-reject-${coach.id}`}>
              <XCircle className="w-3.5 h-3.5 mr-1" />Reject
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit} data-testid={`button-edit-${coach.id}`}>
            <Pencil className="w-3.5 h-3.5 mr-1" />Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 ml-auto" data-testid={`button-delete-${coach.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditCoachDialog({
  coach, open, onClose, onSave, isSaving,
}: {
  coach: Coach;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Coach>) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Partial<Coach>>(() => ({
    fullName: coach.fullName,
    email: coach.email,
    phone: coach.phone || "",
    city: coach.city || "",
    postcode: coach.postcode || "",
    bio: coach.bio || "",
    roleTitle: coach.roleTitle || "",
    qualifications: coach.qualifications || "",
    yearsTraining: coach.yearsTraining ?? null,
    badmintonEnglandCert: coach.badmintonEnglandCert,
    firstAidCert: coach.firstAidCert,
    experience: coach.experience || "",
    coachingPhilosophy: coach.coachingPhilosophy || "",
    sessionPrices: coach.sessionPrices || "",
    cancellationPolicy: coach.cancellationPolicy || "",
    achievements: coach.achievements || "",
    languagesSpoken: coach.languagesSpoken || "",
    status: coach.status,
  }));

  const set = <K extends keyof Coach>(k: K, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-edit-coach">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" />Edit Coach: {coach.fullName}</DialogTitle>
          <DialogDescription>Update profile, contact details, and credentials.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 space-y-5 py-2">
          <Section title="Status">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("status", s)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${
                    form.status === s
                      ? `${STATUS_META[s].classes} border-current shadow-md`
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid={`button-set-status-${s.toLowerCase()}`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Identity">
            <Field label="Full name"><Input value={form.fullName || ""} onChange={(e) => set("fullName", e.target.value)} data-testid="input-edit-coach-name" /></Field>
            <Field label="Role title (e.g. Head Coach)"><Input value={form.roleTitle || ""} onChange={(e) => set("roleTitle", e.target.value)} data-testid="input-edit-coach-role" /></Field>
            <Field label="Email"><Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} data-testid="input-edit-coach-email" /></Field>
            <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} data-testid="input-edit-coach-phone" /></Field>
            <Field label="City"><Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} data-testid="input-edit-coach-city" /></Field>
            <Field label="Postcode"><Input value={form.postcode || ""} onChange={(e) => set("postcode", e.target.value)} data-testid="input-edit-coach-postcode" /></Field>
          </Section>

          <Section title="Credentials">
            <Field label="Qualifications"><Input value={form.qualifications || ""} onChange={(e) => set("qualifications", e.target.value)} data-testid="input-edit-coach-quals" /></Field>
            <Field label="Years training">
              <Input
                type="number" min={0} max={80}
                value={form.yearsTraining ?? ""}
                onChange={(e) => set("yearsTraining", e.target.value === "" ? null : Number(e.target.value))}
                data-testid="input-edit-coach-years"
              />
            </Field>
            <Field label="Languages"><Input value={form.languagesSpoken || ""} onChange={(e) => set("languagesSpoken", e.target.value)} data-testid="input-edit-coach-languages" /></Field>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <ToggleRow label="Badminton England certified" checked={!!form.badmintonEnglandCert} onChange={(v) => set("badmintonEnglandCert", v)} testId="switch-edit-coach-be" />
              <ToggleRow label="First aid certified"          checked={!!form.firstAidCert}          onChange={(v) => set("firstAidCert", v)}          testId="switch-edit-coach-firstaid" />
            </div>
          </Section>

          <Section title="Profile">
            <FieldFull label="Short bio"><Textarea value={form.bio || ""} onChange={(e) => set("bio", e.target.value)} rows={3} data-testid="textarea-edit-coach-bio" /></FieldFull>
            <FieldFull label="Experience"><Textarea value={form.experience || ""} onChange={(e) => set("experience", e.target.value)} rows={2} data-testid="textarea-edit-coach-experience" /></FieldFull>
            <FieldFull label="Coaching philosophy"><Textarea value={form.coachingPhilosophy || ""} onChange={(e) => set("coachingPhilosophy", e.target.value)} rows={2} data-testid="textarea-edit-coach-philosophy" /></FieldFull>
            <FieldFull label="Achievements"><Textarea value={form.achievements || ""} onChange={(e) => set("achievements", e.target.value)} rows={2} data-testid="textarea-edit-coach-achievements" /></FieldFull>
          </Section>

          <Section title="Pricing & Policy">
            <FieldFull label="Session prices"><Textarea value={form.sessionPrices || ""} onChange={(e) => set("sessionPrices", e.target.value)} rows={2} data-testid="textarea-edit-coach-prices" /></FieldFull>
            <FieldFull label="Cancellation policy"><Textarea value={form.cancellationPolicy || ""} onChange={(e) => set("cancellationPolicy", e.target.value)} rows={2} data-testid="textarea-edit-coach-cancel" /></FieldFull>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit-coach">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white" data-testid="button-save-coach">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b pb-1.5 mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
function FieldFull({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="col-span-2"><Label className="text-xs">{label}</Label>{children}</div>;
}
function ToggleRow({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 cursor-pointer">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </label>
  );
}

function PromoteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: results = [] } = useQuery<Array<{ id: number; fullName: string; email: string; role: string; secondaryRoles?: string[] }>>({
    queryKey: ["/api/admin/users/search-for-coach", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const r = await fetch(`/api/admin/users/search-for-coach?q=${encodeURIComponent(search)}`, { credentials: "include" });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(msg || `Search failed (${r.status})`);
      }
      return r.json();
    },
    enabled: open && search.length >= 2,
  });

  const grant = useMutation({
    mutationFn: async (userId: number) => apiRequest("POST", `/api/admin/users/${userId}/grant-coach`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Coach access granted", description: "User can now manage their coach profile." });
      setSearch("");
      onClose();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-promote-user">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Promote a user to coach</DialogTitle>
          <DialogDescription>Find any registered user and grant them coach access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…" className="pl-9"
              data-testid="input-promote-search"
            />
          </div>
          <div className="max-h-[320px] overflow-y-auto space-y-1.5">
            {search.length < 2 && <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search.</p>}
            {search.length >= 2 && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No matches.</p>}
            {results.map(u => {
              const isCoach = u.role === "COACH" || (u.secondaryRoles ?? []).includes("COACH");
              return (
                <div key={u.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60" data-testid={`row-user-${u.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email} · {u.role}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={grant.isPending || isCoach}
                    onClick={() => grant.mutate(u.id)}
                    className={isCoach ? "" : "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white"}
                    data-testid={`button-grant-${u.id}`}
                  >
                    {isCoach ? "Already coach" : <><Plus className="w-3.5 h-3.5 mr-1" />Grant</>}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

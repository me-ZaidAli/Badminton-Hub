import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GraduationCap, Calendar, Clock, Image as ImageIcon, Settings, Plus, Trash2, Check, X,
  Loader2, Sparkles, Sun, AlertCircle, Camera, ExternalLink, User, MapPin, BellRing,
  Banknote, Info, PoundSterling, Users as UsersIcon, Wallet, Save, IdCard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoachSubNav } from "@/components/SubNav";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_TONE: Record<string, string> = {
  PENDING:   "from-amber-500/20 to-amber-700/10 border-amber-500/40 text-amber-300",
  ACCEPTED:  "from-emerald-500/20 to-emerald-700/10 border-emerald-500/40 text-emerald-300",
  APPROVED:  "from-emerald-500/20 to-emerald-700/10 border-emerald-500/40 text-emerald-300",
  DECLINED:  "from-rose-500/20 to-rose-700/10 border-rose-500/40 text-rose-300",
  REJECTED:  "from-rose-500/20 to-rose-700/10 border-rose-500/40 text-rose-300",
  CANCELLED: "from-zinc-500/20 to-zinc-700/10 border-zinc-500/40 text-zinc-300",
  COMPLETED: "from-violet-500/20 to-violet-700/10 border-violet-500/40 text-violet-300",
  NO_SHOW:   "from-orange-500/20 to-orange-700/10 border-orange-500/40 text-orange-300",
};
const PRETTY_STATUS: Record<string, string> = { ACCEPTED: "APPROVED", DECLINED: "REJECTED" };

function MoneyInput({
  pence, onChange, min = 0, testId,
}: { pence: number; onChange: (p: number) => void; min?: number; testId?: string }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(((pence || 0) / 100).toFixed(2));
  useEffect(() => {
    if (!focused) setDraft(((pence || 0) / 100).toFixed(2));
  }, [pence, focused]);
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || /^[0-9]*\.?[0-9]{0,2}$/.test(v)) setDraft(v);
      }}
      onBlur={() => {
        setFocused(false);
        const num = parseFloat(draft);
        const safe = Number.isFinite(num) ? Math.max(min, num) : 0;
        const p = Math.round(safe * 100);
        setDraft((p / 100).toFixed(2));
        onChange(p);
      }}
      data-testid={testId}
    />
  );
}

interface Coach {
  id: number; fullName: string; email: string; phone?: string; profilePhoto?: string;
  bio?: string; city?: string; postcode?: string; status: string;
  roleTitle?: string; location?: string; areaCoverage?: string; availability?: string;
  languagesSpoken?: string; qualifications?: string; coachingPhilosophy?: string;
  yearsTraining?: number; preferredGroupSize?: string; coachingCertifications?: string;
}
interface Rule { id: number; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; }
interface Override { id: number; date: string; isClosed: boolean; startTime?: string; endTime?: string; note?: string; }
interface PriceTier { id: string; label: string; pricePence: number; durationMinutes: number; maxParticipants: number; sortOrder: number; }
interface Settings {
  slotDurationMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number;
  advanceNoticeHours: number; maxAdvanceDays: number; holidayMode: boolean; holidayMessage?: string;
  defaultPricePence: number; autoApprove: boolean;
  priceTiers: PriceTier[];
}
interface PayoutInfo {
  platformFeePct: number; payoutSlaHours: number; payoutMessage: string; bankNote: string;
  clubBanks: Array<{ clubId: number; clubName: string; bankAccountName: string | null; bankSortCode: string | null; bankAccountNumber: string | null }>;
}
interface GalleryItem { id: number; imageUrl: string; caption?: string; sortOrder: number; }
interface Booking {
  id: number; status: string; preferredDate: string; preferredTime: string;
  durationMinutes: number; location?: string; playerMessage?: string; coachResponse?: string;
  agreedPrice?: number; lessonType: string;
  player: { id: number; fullName: string; email: string };
}

function GlassCard({ children, className = "" }: { children: any; className?: string }) {
  return (
    <Card className={`relative overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_60%)]" />
      <div className="relative">{children}</div>
    </Card>
  );
}

export default function CoachDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: coach, isLoading: coachLoading } = useQuery<Coach>({ queryKey: ["/api/coaches/me"] });
  const { data: rules } = useQuery<Rule[]>({ queryKey: ["/api/coach-bookings/availability/rules"], enabled: !!coach });
  const { data: overrides } = useQuery<Override[]>({ queryKey: ["/api/coach-bookings/availability/overrides"], enabled: !!coach });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/coach-bookings/settings"], enabled: !!coach });
  const { data: gallery } = useQuery<GalleryItem[]>({ queryKey: ["/api/coach-bookings/gallery/me"], enabled: !!coach });
  const { data: bookings } = useQuery<Booking[]>({ queryKey: ["/api/coach-bookings/coach"], enabled: !!coach });

  if (coachLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>;
  }
  if (!coach) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <GlassCard>
          <CardContent className="p-10 text-center space-y-3">
            <GraduationCap className="w-12 h-12 mx-auto text-violet-400" />
            <h2 className="text-xl font-bold">You're not a coach yet</h2>
            <p className="text-sm text-muted-foreground">Ask an admin to grant you the COACH role, or register on the Find a Coach page.</p>
            <Link href="/find-coach"><Button className="mt-2" data-testid="link-find-coach">Go to Find a Coach</Button></Link>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  const pendingCount = bookings?.filter((b) => b.status === "PENDING").length ?? 0;

  return (
    <div>
      <CoachSubNav />
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Coach Dashboard"
        description={`Manage your availability, gallery, pricing and incoming bookings — ${coach.fullName}`}
        icon={<GraduationCap className="w-7 h-7 text-violet-400" />}
      />

      {/* Hero strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Status", value: coach.status, icon: Sparkles, tone: "text-violet-300" },
          { label: "Pending", value: String(pendingCount), icon: BellRing, tone: "text-amber-300" },
          { label: "Bookings", value: String(bookings?.length ?? 0), icon: Calendar, tone: "text-emerald-300" },
          { label: "Photos", value: String(gallery?.length ?? 0), icon: Camera, tone: "text-cyan-300" },
        ].map((t) => (
          <GlassCard key={t.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <t.icon className={`w-6 h-6 ${t.tone}`} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
                <div className="text-lg font-bold">{t.value}</div>
              </div>
            </CardContent>
          </GlassCard>
        ))}
      </motion.div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto gap-1" data-testid="tabs-coach-dashboard">
          <TabsTrigger value="profile" className="flex-1" data-testid="tab-profile">Profile</TabsTrigger>
          <TabsTrigger value="bookings" className="flex-1" data-testid="tab-bookings">
            Bookings {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex-1" data-testid="tab-availability">Availability</TabsTrigger>
          <TabsTrigger value="overrides" className="flex-1" data-testid="tab-overrides">Date overrides</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="gallery" className="flex-1" data-testid="tab-gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4"><ProfileEditor coach={coach} /></TabsContent>
        <TabsContent value="bookings" className="mt-4"><BookingsList bookings={bookings ?? []} /></TabsContent>
        <TabsContent value="availability" className="mt-4"><AvailabilityRules rules={rules ?? []} /></TabsContent>
        <TabsContent value="overrides" className="mt-4"><OverridesList overrides={overrides ?? []} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsForm settings={settings} /></TabsContent>
        <TabsContent value="gallery" className="mt-4"><GalleryManager gallery={gallery ?? []} /></TabsContent>
      </Tabs>

      <div className="text-center pt-2">
        <Link href={`/coach/${coach.id}`}>
          <Button variant="outline" data-testid="link-public-profile"><ExternalLink className="w-4 h-4 mr-2" />View public profile</Button>
        </Link>
      </div>
      </div>
    </div>
  );
}

// ─── Bookings list with respond modal ────────────────────────────────────────
function BookingsList({ bookings }: { bookings: Booking[] }) {
  const [respond, setRespond] = useState<Booking | null>(null);
  const [response, setResponse] = useState("");
  const [price, setPrice] = useState("");
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/coach-bookings/${id}/status`, { status, coachResponse: response || undefined, agreedPrice: price ? Math.round(parseFloat(price) * 100) : undefined });
      return res.json();
    },
    onSuccess: (_d, v) => {
      toast({ title: `Booking ${v.status.toLowerCase()}` });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/coach"] });
      setRespond(null); setResponse(""); setPrice("");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (!bookings.length) {
    return <GlassCard><CardContent className="p-10 text-center text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" /><p>No bookings yet.</p></CardContent></GlassCard>;
  }

  return (
    <>
      <div className="space-y-3" data-testid="list-bookings-coach">
        {bookings.map((b) => (
          <GlassCard key={b.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold flex items-center gap-1" data-testid={`text-booking-player-${b.id}`}>
                      <User className="w-4 h-4 text-violet-300" /> {b.player.fullName}
                    </span>
                    <Badge className={`bg-gradient-to-br ${STATUS_TONE[b.status] || ""} border`} data-testid={`badge-booking-${b.id}`}>
                      {PRETTY_STATUS[b.status] || b.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{b.lessonType === "GROUP" ? "Group" : "1-to-1"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span><Calendar className="inline w-3.5 h-3.5 mr-1" />{b.preferredDate}</span>
                    <span><Clock className="inline w-3.5 h-3.5 mr-1" />{b.preferredTime} ({b.durationMinutes}m)</span>
                    {b.location && <span><MapPin className="inline w-3.5 h-3.5 mr-1" />{b.location}</span>}
                    {b.agreedPrice != null && <span>£{(b.agreedPrice / 100).toFixed(2)}</span>}
                  </div>
                  {b.playerMessage && <p className="text-sm mt-2 italic text-muted-foreground">"{b.playerMessage}"</p>}
                  {b.coachResponse && <p className="text-sm mt-1"><strong>You:</strong> {b.coachResponse}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.status === "PENDING" && (
                    <Button size="sm" onClick={() => { setRespond(b); setResponse(""); setPrice(""); }} data-testid={`button-respond-${b.id}`}>Respond</Button>
                  )}
                  {b.status === "ACCEPTED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: b.id, status: "COMPLETED" })} disabled={mut.isPending} data-testid={`button-complete-${b.id}`}>
                        <Check className="w-3.5 h-3.5 mr-1" />Complete
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-400" onClick={() => mut.mutate({ id: b.id, status: "NO_SHOW" })} disabled={mut.isPending} data-testid={`button-noshow-${b.id}`}>
                        No-show
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </GlassCard>
        ))}
      </div>

      <Dialog open={!!respond} onOpenChange={(v) => !v && setRespond(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-respond">
          <DialogHeader><DialogTitle>Respond to booking</DialogTitle></DialogHeader>
          {respond && (
            <div className="space-y-3 mt-2 text-sm">
              <p><strong>{respond.player.fullName}</strong> · {respond.preferredDate} at {respond.preferredTime}</p>
              <div>
                <Label>Message</Label>
                <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3} placeholder="Optional note for the player…" data-testid="input-response" />
              </div>
              <div>
                <Label>Agreed price (£) — optional</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00" data-testid="input-price" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => mut.mutate({ id: respond.id, status: "APPROVED" })} disabled={mut.isPending} data-testid="button-approve">
                  <Check className="w-4 h-4 mr-1" />Approve
                </Button>
                <Button className="flex-1" variant="destructive" onClick={() => mut.mutate({ id: respond.id, status: "REJECTED" })} disabled={mut.isPending} data-testid="button-reject">
                  <X className="w-4 h-4 mr-1" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Weekly availability rules ───────────────────────────────────────────────
function AvailabilityRules({ rules }: { rules: Rule[] }) {
  const [dow, setDow] = useState("1");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/coach-bookings/availability/rules", { dayOfWeek: Number(dow), startTime: start, endTime: end })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/availability/rules"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/coach-bookings/availability/rules/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/availability/rules"] }),
  });

  return (
    <div className="space-y-4">
      <GlassCard>
        <CardHeader><CardTitle className="text-base">Add weekly time slot</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Day</Label>
              <Select value={dow} onValueChange={setDow}>
                <SelectTrigger data-testid="select-dow"><SelectValue /></SelectTrigger>
                <SelectContent>{DOW.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} data-testid="input-rule-start" /></div>
            <div><Label>End</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="input-rule-end" /></div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} data-testid="button-add-rule"><Plus className="w-4 h-4 mr-1" />Add slot</Button>
        </CardContent>
      </GlassCard>

      <div className="space-y-2">
        {DOW.map((d, dayIdx) => {
          const list = rules.filter((r) => r.dayOfWeek === dayIdx);
          return (
            <GlassCard key={dayIdx}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm font-semibold">{d}</div>
                  <div className="flex flex-wrap gap-2">
                    {list.length === 0 && <span className="text-xs text-muted-foreground italic">Closed</span>}
                    {list.map((r) => (
                      <Badge key={r.id} variant="outline" className="gap-2 px-2 py-1" data-testid={`badge-rule-${r.id}`}>
                        {r.startTime} – {r.endTime}
                        <button onClick={() => del.mutate(r.id)} className="text-rose-300 hover:text-rose-200" data-testid={`button-remove-rule-${r.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date overrides (closed days / extra hours) ──────────────────────────────
function OverridesList({ overrides }: { overrides: Override[] }) {
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(true);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/coach-bookings/availability/overrides", { date, isClosed: closed, startTime: closed ? null : start, endTime: closed ? null : end, note: note || null })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/availability/overrides"] }); setDate(""); setNote(""); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/coach-bookings/availability/overrides/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/availability/overrides"] }),
  });

  return (
    <div className="space-y-4">
      <GlassCard>
        <CardHeader><CardTitle className="text-base">Block a date / add custom hours</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-override-date" /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={closed} onCheckedChange={setClosed} data-testid="switch-override-closed" />
              <Label>{closed ? "Closed all day" : "Custom hours"}</Label>
            </div>
          </div>
          {!closed && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} data-testid="input-override-start" /></div>
              <div><Label>End</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} data-testid="input-override-end" /></div>
            </div>
          )}
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-override-note" />
          <Button onClick={() => create.mutate()} disabled={!date || create.isPending} data-testid="button-add-override"><Plus className="w-4 h-4 mr-1" />Add override</Button>
        </CardContent>
      </GlassCard>

      <div className="space-y-2">
        {(!overrides || overrides.length === 0) && <p className="text-sm text-muted-foreground text-center">No overrides.</p>}
        {overrides.map((o) => (
          <GlassCard key={o.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-semibold">{o.date}</div>
                <div className="text-muted-foreground">
                  {o.isClosed ? <span className="text-rose-300">Closed</span> : `${o.startTime} – ${o.endTime}`}
                  {o.note && <> · {o.note}</>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(o.id)} data-testid={`button-remove-override-${o.id}`}><Trash2 className="w-4 h-4 text-rose-300" /></Button>
            </CardContent>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── Profile editor (photo + details) ────────────────────────────────────────
function ProfileEditor({ coach }: { coach: Coach }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    fullName: coach.fullName || "",
    email: coach.email || "",
    phone: coach.phone || "",
    profilePhoto: coach.profilePhoto || "",
    roleTitle: coach.roleTitle || "",
    bio: coach.bio || "",
    location: coach.location || "",
    city: coach.city || "",
    postcode: coach.postcode || "",
    areaCoverage: coach.areaCoverage || "",
    availability: coach.availability || "",
    languagesSpoken: coach.languagesSpoken || "",
    qualifications: coach.qualifications || "",
    coachingPhilosophy: coach.coachingPhilosophy || "",
    coachingCertifications: coach.coachingCertifications || "",
    preferredGroupSize: coach.preferredGroupSize || "",
    yearsTraining: coach.yearsTraining ?? 0,
  });
  useEffect(() => {
    setForm({
      fullName: coach.fullName || "", email: coach.email || "", phone: coach.phone || "",
      profilePhoto: coach.profilePhoto || "", roleTitle: coach.roleTitle || "",
      bio: coach.bio || "", location: coach.location || "", city: coach.city || "",
      postcode: coach.postcode || "", areaCoverage: coach.areaCoverage || "",
      availability: coach.availability || "", languagesSpoken: coach.languagesSpoken || "",
      qualifications: coach.qualifications || "", coachingPhilosophy: coach.coachingPhilosophy || "",
      coachingCertifications: coach.coachingCertifications || "",
      preferredGroupSize: coach.preferredGroupSize || "", yearsTraining: coach.yearsTraining ?? 0,
    });
  }, [coach.id]);

  const set = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const save = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", "/api/coaches/me", form)).json(),
    onSuccess: () => {
      toast({ title: "Profile saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const handlePhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const r = await fetch("/api/coaches/upload-photo", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      const { url } = await r.json();
      set("profilePhoto", url);
      // Persist immediately so the photo shows everywhere even before user clicks Save
      const res = await apiRequest("PATCH", "/api/coaches/me", { profilePhoto: url });
      await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({ title: "Photo updated" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    set("profilePhoto", "");
    try {
      await apiRequest("PATCH", "/api/coaches/me", { profilePhoto: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({ title: "Photo removed" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const initials = (form.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Photo */}
      <GlassCard>
        <CardContent className="p-5">
          <div className="flex items-center gap-5 flex-wrap">
            <Avatar className="h-24 w-24 border-2 border-violet-400/40 ring-4 ring-violet-500/20">
              {form.profilePhoto ? <AvatarImage src={form.profilePhoto} alt={form.fullName} className="object-cover" /> : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-2xl font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-[200px]">
              <h3 className="font-bold flex items-center gap-2"><Camera className="w-4 h-4 text-violet-300" />Profile photo</h3>
              <p className="text-xs text-muted-foreground mt-1">Used on your public profile and on every booking. JPG/PNG, square works best.</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }}
                  data-testid="input-coach-photo" />
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} data-testid="button-coach-upload-photo">
                  {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                  {uploading ? "Uploading…" : (form.profilePhoto ? "Change photo" : "Upload photo")}
                </Button>
                {form.profilePhoto && (
                  <Button size="sm" variant="outline" onClick={removePhoto} data-testid="button-coach-remove-photo">
                    <Trash2 className="w-4 h-4 mr-1" />Remove
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Or paste an image URL (Google Drive direct link, Imgur, etc.)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://example.com/photo.jpg"
                    defaultValue={form.profilePhoto || ""}
                    onBlur={async (e) => {
                      const url = e.target.value.trim();
                      if (url === (form.profilePhoto || "")) return;
                      set("profilePhoto", url);
                      try {
                        await apiRequest("PATCH", "/api/coaches/me", { profilePhoto: url });
                        qc.invalidateQueries({ queryKey: ["/api/coaches/me"] });
                        qc.invalidateQueries({ queryKey: ["/api/coaches"] });
                        toast({ title: url ? "Photo URL saved" : "Photo cleared" });
                      } catch (err: any) {
                        toast({ title: "Failed to save URL", description: err.message, variant: "destructive" });
                      }
                    }}
                    data-testid="input-coach-photo-url"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">For Google Drive: share the file as "Anyone with the link", then use the format <code>https://drive.google.com/uc?id=FILE_ID</code></p>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Core details */}
      <GlassCard>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><IdCard className="w-4 h-4 text-violet-300" />Core details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Full name</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-coach-fullname" />
            </div>
            <div>
              <Label>Role / title</Label>
              <Input value={form.roleTitle} onChange={(e) => set("roleTitle", e.target.value)} placeholder="e.g. Head Coach" data-testid="input-coach-role" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="input-coach-email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="input-coach-phone" />
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)}
              placeholder="A short intro shown at the top of your public profile."
              data-testid="textarea-coach-bio" />
          </div>
        </CardContent>
      </GlassCard>

      {/* Location */}
      <GlassCard>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-violet-300" />Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Town / City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} data-testid="input-coach-city" />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} data-testid="input-coach-postcode" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address / venue (optional)</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} data-testid="input-coach-location" />
            </div>
            <div className="sm:col-span-2">
              <Label>Areas covered</Label>
              <Input value={form.areaCoverage} onChange={(e) => set("areaCoverage", e.target.value)}
                placeholder="e.g. Birmingham, Solihull, Sutton Coldfield" data-testid="input-coach-area" />
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Coaching info */}
      <GlassCard>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-violet-300" />Coaching info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Years training/playing</Label>
              <Input type="number" min={0} value={form.yearsTraining}
                onChange={(e) => set("yearsTraining", Number(e.target.value) || 0)}
                data-testid="input-coach-years" />
            </div>
            <div>
              <Label>Preferred group size</Label>
              <Input value={form.preferredGroupSize} onChange={(e) => set("preferredGroupSize", e.target.value)}
                placeholder="e.g. 1-to-1, small groups (4-6)" data-testid="input-coach-group-size" />
            </div>
            <div className="sm:col-span-2">
              <Label>Languages spoken</Label>
              <Input value={form.languagesSpoken} onChange={(e) => set("languagesSpoken", e.target.value)}
                placeholder="e.g. English, Punjabi" data-testid="input-coach-languages" />
            </div>
            <div className="sm:col-span-2">
              <Label>Qualifications</Label>
              <Textarea rows={2} value={form.qualifications} onChange={(e) => set("qualifications", e.target.value)}
                placeholder="e.g. Badminton England Level 2, Safeguarding, First Aid"
                data-testid="textarea-coach-quals" />
            </div>
            <div className="sm:col-span-2">
              <Label>Certifications (free text)</Label>
              <Textarea rows={2} value={form.coachingCertifications} onChange={(e) => set("coachingCertifications", e.target.value)}
                data-testid="textarea-coach-certs" />
            </div>
            <div className="sm:col-span-2">
              <Label>Coaching philosophy</Label>
              <Textarea rows={3} value={form.coachingPhilosophy} onChange={(e) => set("coachingPhilosophy", e.target.value)}
                placeholder="What players can expect from working with you."
                data-testid="textarea-coach-philosophy" />
            </div>
            <div className="sm:col-span-2">
              <Label>General availability (free text)</Label>
              <Textarea rows={2} value={form.availability} onChange={(e) => set("availability", e.target.value)}
                placeholder="e.g. Weekday evenings + Saturday mornings"
                data-testid="textarea-coach-availability" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Need to edit specialisms, age groups or pricing? Use the <strong>Settings</strong> tab for booking rules &amp; packages.</p>
        </CardContent>
      </GlassCard>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} size="lg" data-testid="button-save-coach-profile">
          {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
function SettingsForm({ settings }: { settings?: Settings }) {
  const [s, setS] = useState<Settings | undefined>(settings);
  const { toast } = useToast();
  useEffect(() => { if (settings && !s) setS({ ...settings, priceTiers: settings.priceTiers || [] }); }, [settings]);
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/coach-bookings/settings", s)).json(),
    onSuccess: () => { toast({ title: "Saved" }); queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/settings"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  if (!s) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;
  const set = (k: keyof Settings, v: any) => setS({ ...s, [k]: v });
  const tiers = s.priceTiers || [];

  const addTier = (preset?: Partial<PriceTier>) => {
    const next: PriceTier = {
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: preset?.label || "New package",
      pricePence: preset?.pricePence ?? s.defaultPricePence ?? 2500,
      durationMinutes: preset?.durationMinutes ?? s.slotDurationMinutes ?? 60,
      maxParticipants: preset?.maxParticipants ?? 1,
      sortOrder: tiers.length,
    };
    set("priceTiers", [...tiers, next]);
  };
  const updateTier = (id: string, patch: Partial<PriceTier>) => {
    set("priceTiers", tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const removeTier = (id: string) => set("priceTiers", tiers.filter((t) => t.id !== id));

  return (
    <div className="space-y-4">
      {/* Lesson packages */}
      <GlassCard>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold flex items-center gap-2"><PoundSterling className="w-4 h-4 text-violet-300" /> Lesson packages</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Add as many lesson types as you like. Players pick one when booking; the price updates automatically.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => addTier({ label: "Private (1-to-1)", maxParticipants: 1 })} data-testid="button-add-tier-1to1">+ 1-to-1</Button>
              <Button size="sm" variant="outline" onClick={() => addTier({ label: "1-to-2", maxParticipants: 2 })} data-testid="button-add-tier-1to2">+ 1-to-2</Button>
              <Button size="sm" variant="outline" onClick={() => addTier({ label: "Group (up to 4)", maxParticipants: 4 })} data-testid="button-add-tier-group">+ Group</Button>
              <Button size="sm" onClick={() => addTier()} data-testid="button-add-tier-custom"><Plus className="w-3.5 h-3.5 mr-1" />Custom</Button>
            </div>
          </div>

          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-white/10 rounded-lg" data-testid="text-no-tiers">
              No packages yet. Add at least one so players can book lessons with you.
            </p>
          )}

          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg border border-white/10 bg-white/[0.02]" data-testid={`row-tier-${i}`}>
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Label</Label>
                  <Input value={t.label} onChange={(e) => updateTier(t.id, { label: e.target.value })} placeholder="e.g. Private 1-to-1" data-testid={`input-tier-label-${i}`} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs">Price (£)</Label>
                  <MoneyInput pence={t.pricePence} onChange={(p) => updateTier(t.id, { pricePence: p })} testId={`input-tier-price-${i}`} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs">Duration (min)</Label>
                  <Input type="number" min={15} step={15} value={t.durationMinutes} onChange={(e) => updateTier(t.id, { durationMinutes: Number(e.target.value) })} data-testid={`input-tier-duration-${i}`} />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label className="text-xs flex items-center gap-1"><UsersIcon className="w-3 h-3" />Max players</Label>
                  <Input type="number" min={1} max={64} value={t.maxParticipants} onChange={(e) => updateTier(t.id, { maxParticipants: Number(e.target.value) })} data-testid={`input-tier-max-${i}`} />
                </div>
                <div className="col-span-12 sm:col-span-2 flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => removeTier(t.id)} data-testid={`button-remove-tier-${i}`}>
                    <Trash2 className="w-4 h-4 text-rose-300" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </GlassCard>

      {/* Slot + booking rules */}
      <GlassCard>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-bold">Booking rules</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Default slot duration (min)</Label><Input type="number" value={s.slotDurationMinutes} onChange={(e) => set("slotDurationMinutes", Number(e.target.value))} data-testid="input-slot-duration" /></div>
            <div><Label>Default price (£) <span className="text-muted-foreground text-[10px]">— used if no package selected</span></Label><MoneyInput pence={s.defaultPricePence} onChange={(p) => set("defaultPricePence", p)} testId="input-default-price" /></div>
            <div><Label>Buffer before (min)</Label><Input type="number" value={s.bufferBeforeMinutes} onChange={(e) => set("bufferBeforeMinutes", Number(e.target.value))} data-testid="input-buffer-before" /></div>
            <div><Label>Buffer after (min)</Label><Input type="number" value={s.bufferAfterMinutes} onChange={(e) => set("bufferAfterMinutes", Number(e.target.value))} data-testid="input-buffer-after" /></div>
            <div><Label>Min advance notice (hours)</Label><Input type="number" value={s.advanceNoticeHours} onChange={(e) => set("advanceNoticeHours", Number(e.target.value))} data-testid="input-advance-notice" /></div>
            <div><Label>Max advance booking (days)</Label><Input type="number" value={s.maxAdvanceDays} onChange={(e) => set("maxAdvanceDays", Number(e.target.value))} data-testid="input-max-advance" /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={s.autoApprove} onCheckedChange={(v) => set("autoApprove", v)} data-testid="switch-auto-approve" />
            <Label>Auto-approve bookings (no manual confirm)</Label>
          </div>
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-amber-300" />
              <Switch checked={s.holidayMode} onCheckedChange={(v) => set("holidayMode", v)} data-testid="switch-holiday-mode" />
              <Label className="font-semibold text-amber-200">Holiday mode (hides all slots)</Label>
            </div>
            {s.holidayMode && (
              <Textarea placeholder="Optional message shown to bookers (e.g. 'Back on 1st June')" value={s.holidayMessage || ""} onChange={(e) => set("holidayMessage", e.target.value)} rows={2} data-testid="input-holiday-message" />
            )}
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-settings">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Settings className="w-4 h-4 mr-1" />}
            Save settings
          </Button>
        </CardContent>
      </GlassCard>

      <PayoutPanel />
    </div>
  );
}

// ─── Payout / fees / club bank (coach view, read-only on bank) ───────────────
function PayoutPanel() {
  const { data: info } = useQuery<PayoutInfo>({ queryKey: ["/api/coach-bookings/payout-info"] });
  return (
    <GlassCard>
      <CardContent className="p-4 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-300" /> Payouts &amp; fees</h3>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm space-y-1.5" data-testid="panel-platform-fee">
          <div className="flex items-center gap-2 font-semibold text-emerald-200">
            <Info className="w-4 h-4" />
            Platform fee: {info?.platformFeePct ?? 3}% per lesson
          </div>
          <p className="text-emerald-100/80 text-xs">
            {info?.payoutMessage || "Platform fee: 3% per lesson. Payouts are made within 48 hours after each lesson is completed, into your club's bank account."}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Banknote className="w-4 h-4 text-violet-300" />
            Club bank account <span className="text-xs font-normal text-muted-foreground">(read-only)</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-bank-note">
            {info?.bankNote || "Bank details are managed by your club admin (Super Admin). All player payments go through the club, then payouts are issued to coaches."}
          </p>
          {(info?.clubBanks?.length ?? 0) === 0 ? (
            <p className="text-sm text-amber-300 mt-2" data-testid="text-no-club-link">You're not linked to a club yet — ask your club admin to add bank details.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {info!.clubBanks.map((b) => (
                <div key={b.clubId} className="rounded-md border border-white/10 p-2.5 text-sm grid grid-cols-2 gap-2" data-testid={`bank-club-${b.clubId}`}>
                  <div className="col-span-2 font-semibold">{b.clubName}</div>
                  {b.bankAccountName ? (
                    <>
                      <div><span className="text-muted-foreground text-xs">Account name</span><div className="font-mono text-xs">{b.bankAccountName}</div></div>
                      <div><span className="text-muted-foreground text-xs">Sort code</span><div className="font-mono text-xs">{b.bankSortCode || "—"}</div></div>
                      <div className="col-span-2"><span className="text-muted-foreground text-xs">Account number</span><div className="font-mono text-xs">{b.bankAccountNumber || "—"}</div></div>
                    </>
                  ) : (
                    <p className="col-span-2 text-xs text-amber-300">No bank details set yet — ask your club admin to add them in Super Admin → Clubs.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </GlassCard>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
function GalleryManager({ gallery }: { gallery: GalleryItem[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("photo", file);
      const res = await fetch("/api/coach-bookings/gallery/upload", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/gallery/me"] });
      toast({ title: "Image added" });
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    finally { setBusy(false); e.target.value = ""; }
  };
  const del = useMutation({
    mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/coach-bookings/gallery/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/gallery/me"] }),
  });

  return (
    <GlassCard>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label htmlFor="gallery-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 hover:bg-violet-500/30">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {busy ? "Uploading…" : "Upload image"}
          </Label>
          <input id="gallery-upload" type="file" accept="image/*" hidden onChange={onUpload} data-testid="input-gallery-upload" />
        </div>
        {gallery.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No images yet — add a few coaching shots to bring your profile to life.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((g) => (
              <div key={g.id} className="group relative rounded-lg overflow-hidden border border-white/10 aspect-square">
                <img src={g.imageUrl} alt={g.caption || ""} className="w-full h-full object-cover" data-testid={`img-gallery-${g.id}`} />
                <button onClick={() => del.mutate(g.id)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition" data-testid={`button-remove-gallery-${g.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

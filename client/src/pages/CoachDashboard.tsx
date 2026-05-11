import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";

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

interface Coach {
  id: number; fullName: string; email: string; phone?: string; profilePhoto?: string;
  bio?: string; city?: string; postcode?: string; status: string;
}
interface Rule { id: number; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean; }
interface Override { id: number; date: string; isClosed: boolean; startTime?: string; endTime?: string; note?: string; }
interface Settings {
  slotDurationMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number;
  advanceNoticeHours: number; maxAdvanceDays: number; holidayMode: boolean; holidayMessage?: string;
  defaultPricePence: number; autoApprove: boolean;
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
  const { user } = useAuth();
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

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="w-full overflow-x-auto" data-testid="tabs-coach-dashboard">
          <TabsTrigger value="bookings" className="flex-1" data-testid="tab-bookings">
            Bookings {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex-1" data-testid="tab-availability">Availability</TabsTrigger>
          <TabsTrigger value="overrides" className="flex-1" data-testid="tab-overrides">Date overrides</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="gallery" className="flex-1" data-testid="tab-gallery">Gallery</TabsTrigger>
        </TabsList>

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

// ─── Settings ────────────────────────────────────────────────────────────────
function SettingsForm({ settings }: { settings?: Settings }) {
  const [s, setS] = useState<Settings | undefined>(settings);
  const { toast } = useToast();
  // Sync local form state when the query first loads (avoid render-side setState).
  useEffect(() => { if (settings && !s) setS(settings); }, [settings]);
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/coach-bookings/settings", s)).json(),
    onSuccess: () => { toast({ title: "Saved" }); queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/settings"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  if (!s) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;
  const set = (k: keyof Settings, v: any) => setS({ ...s, [k]: v });

  return (
    <GlassCard>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Slot duration (min)</Label><Input type="number" value={s.slotDurationMinutes} onChange={(e) => set("slotDurationMinutes", Number(e.target.value))} data-testid="input-slot-duration" /></div>
          <div><Label>Default price (£)</Label><Input type="number" step="0.01" value={(s.defaultPricePence / 100).toFixed(2)} onChange={(e) => set("defaultPricePence", Math.round(parseFloat(e.target.value || "0") * 100))} data-testid="input-default-price" /></div>
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

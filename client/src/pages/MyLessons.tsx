import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GraduationCap, Calendar, Clock, MapPin, User, MessageSquare, Check, X, Loader2, BookOpen,
  PoundSterling, Sparkles, ChevronLeft, ChevronRight, Trophy, AlarmClock,
} from "lucide-react";

interface LessonRequest {
  id: number;
  playerId: number;
  coachId: number;
  status: string;
  lessonType: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: number;
  location: string | null;
  playerMessage: string | null;
  coachResponse: string | null;
  agreedPrice: number | null;
  createdAt: string;
  updatedAt: string;
  coach?: { fullName: string; email: string; phone?: string; city?: string; sessionPrices?: string; profilePhoto?: string };
  player?: { id: number; fullName: string; email: string; profilePhoto?: string };
}

const STATUS_THEME: Record<string, { bg: string; ring: string; pill: string; label: string; glow: string }> = {
  PENDING:   { bg: "from-[#3a2a05] via-[#5a3f0a] to-[#3a2a05]", ring: "from-amber-400 to-orange-500",   pill: "bg-amber-400 text-black",      label: "AWAITING",  glow: "rgba(251,191,36,0.55)" },
  ACCEPTED:  { bg: "from-[#062a1c] via-[#0a4a32] to-[#062a1c]", ring: "from-emerald-400 to-cyan-400",   pill: "bg-emerald-400 text-black",    label: "CONFIRMED", glow: "rgba(52,211,153,0.55)" },
  COMPLETED: { bg: "from-[#0b1a3f] via-[#13235e] to-[#1a2c75]", ring: "from-violet-500 to-cyan-400",    pill: "bg-violet-500 text-white",     label: "VICTORY",   glow: "rgba(168,85,247,0.55)" },
  DECLINED:  { bg: "from-[#3a0a14] via-[#5a1020] to-[#3a0a14]", ring: "from-rose-500 to-pink-500",      pill: "bg-rose-500 text-white",       label: "DECLINED",  glow: "rgba(244,63,94,0.55)" },
  CANCELLED: { bg: "from-[#1f2937] via-[#374151] to-[#1f2937]", ring: "from-slate-400 to-slate-500",    pill: "bg-slate-400 text-black",      label: "CANCELLED", glow: "rgba(148,163,184,0.4)" },
  NO_SHOW:   { bg: "from-[#3a0a14] via-[#5a1020] to-[#3a0a14]", ring: "from-rose-500 to-pink-500",      pill: "bg-rose-500 text-white",       label: "NO-SHOW",   glow: "rgba(244,63,94,0.55)" },
};
const themeFor = (s: string) => STATUS_THEME[s] || STATUS_THEME.PENDING;

function StatusBadge({ status }: { status: string }) {
  const t = themeFor(status);
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${t.pill}`} data-testid={`badge-status-${status}`}>{t.label}</span>;
}

// ─── Dock tile with mac-dock magnify ────────────────────────────────────────
function DockTile({ req, mouseX, isSelected, onSelect, isCoachInbox }: {
  req: LessonRequest;
  mouseX: any;
  isSelected: boolean;
  onSelect: (r: LessonRequest) => void;
  isCoachInbox: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const distance = useTransform(mouseX, (val: number | null) => {
    if (val === null || !ref.current) return 9999;
    const r = ref.current.getBoundingClientRect();
    return val - (r.left + r.width / 2);
  });
  const sizeMv = useTransform(distance, [-180, 0, 180], [70, 120, 70]);
  const size = useSpring(sizeMv, { mass: 0.1, stiffness: 200, damping: 18 });
  const yMv = useTransform(distance, [-180, 0, 180], [0, -16, 0]);
  const y = useSpring(yMv, { mass: 0.1, stiffness: 200, damping: 18 });
  const t = themeFor(req.status);
  const subject = isCoachInbox ? req.player : req.coach;
  return (
    <motion.button
      ref={ref}
      style={{ width: size, height: size, y }}
      onClick={() => onSelect(req)}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-colors bg-gradient-to-br ${t.bg} ${
        isSelected ? "border-white" : "border-white/10 hover:border-white/40"
      }`}
      data-testid={`dock-lesson-${req.id}`}
    >
      {(subject as any)?.profilePhoto ? (
        <img src={(subject as any).profilePhoto} alt={subject?.fullName || ""} className="w-full h-full object-cover opacity-90" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/80 text-2xl font-bold">
          {(subject?.fullName || "?").charAt(0)}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="absolute bottom-1 inset-x-1 text-[9px] text-white truncate text-center font-bold uppercase tracking-wider">
        {req.preferredDate.slice(5)}
      </div>
      <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${t.pill.split(" ")[0]} shadow`} />
      {isSelected && <div className="absolute inset-0 ring-2 ring-white/80 rounded-2xl pointer-events-none" />}
    </motion.button>
  );
}

// ─── Generic Fortnite-style showcase used by both inbound + outbound ────────
function FortniteLessonShowcase({
  requests,
  isCoachInbox,
  emptyText,
  emptyIcon: EmptyIcon,
  onAction,
}: {
  requests: LessonRequest[];
  isCoachInbox: boolean;
  emptyText: { title: string; sub: string };
  emptyIcon: typeof BookOpen;
  onAction: (req: LessonRequest, action: "cancel" | "respond" | "complete") => void;
}) {
  const [selectedId, setSelectedId] = useState<number | undefined>(requests[0]?.id);
  useEffect(() => {
    if (requests.length && !requests.find((r) => r.id === selectedId)) setSelectedId(requests[0].id);
  }, [requests, selectedId]);
  const sel = requests.find((r) => r.id === selectedId) || requests[0];

  const mouseX = useMotionValue<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => dockRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  if (!requests.length) {
    return (
      <Card className="border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-800/40 backdrop-blur-xl">
        <CardContent className="py-16 text-center text-muted-foreground">
          <EmptyIcon className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="font-bold text-lg text-foreground">{emptyText.title}</p>
          <p className="text-sm mt-1">{emptyText.sub}</p>
        </CardContent>
      </Card>
    );
  }

  const t = themeFor(sel.status);
  const subject = isCoachInbox ? sel.player : sel.coach;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className={`relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br ${t.bg} shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]`}>
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-50" style={{ background: t.glow }} />
        <div className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full blur-3xl opacity-40" style={{ background: t.glow }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={sel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 p-6 lg:p-10"
          >
            {/* LEFT: details */}
            <div className="flex flex-col justify-center text-white">
              <div className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-bold tracking-wider uppercase mb-3 ${t.pill}`}>
                <Sparkles className="w-3 h-3" />
                {t.label}
              </div>
              <div className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase mb-1">
                {isCoachInbox ? "Player Booking" : "Your Lesson"}
              </div>
              <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none tracking-tight" data-testid={`hero-name-${sel.id}`}>
                {(subject?.fullName || "Unknown").split(" ").slice(0, -1).join(" ") || subject?.fullName}
              </h2>
              <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none tracking-tight text-cyan-200 mb-4">
                {(subject?.fullName || "?").split(" ").slice(-1)[0]}
              </h3>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="border-white/40 text-white">
                  <Calendar className="w-3 h-3 mr-1" />{sel.preferredDate}
                </Badge>
                <Badge variant="outline" className="border-white/40 text-white">
                  <Clock className="w-3 h-3 mr-1" />{sel.preferredTime} · {sel.durationMinutes}m
                </Badge>
                <Badge variant="outline" className="border-white/40 text-white">
                  {sel.lessonType === "ONE_TO_ONE" ? "Private" : "Group"}
                </Badge>
                {sel.location && (
                  <Badge variant="outline" className="border-white/40 text-white">
                    <MapPin className="w-3 h-3 mr-1" />{sel.location}
                  </Badge>
                )}
                {sel.agreedPrice != null && (
                  <Badge className="bg-amber-400 text-black hover:bg-amber-400 border-0">
                    <PoundSterling className="w-3 h-3 mr-1" />{(sel.agreedPrice / 100).toFixed(2)}
                  </Badge>
                )}
              </div>

              {sel.playerMessage && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-2 border border-white/15" data-testid={`hero-msg-${sel.id}`}>
                  <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />Player message
                  </p>
                  <p className="text-sm text-white/90">{sel.playerMessage}</p>
                </div>
              )}
              {sel.coachResponse && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-2 border border-white/15">
                  <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase mb-1">Coach reply</p>
                  <p className="text-sm text-white/90">{sel.coachResponse}</p>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {!isCoachInbox && sel.status === "PENDING" && (
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/40 text-white hover:bg-white/20 font-bold uppercase tracking-wider rounded-full px-6 h-11"
                    onClick={() => onAction(sel, "cancel")}
                    data-testid={`button-cancel-${sel.id}`}
                  >
                    <X className="w-4 h-4 mr-1" />Cancel request
                  </Button>
                )}
                {isCoachInbox && sel.status === "PENDING" && (
                  <Button
                    className="bg-white text-slate-900 hover:bg-white/90 font-bold uppercase tracking-wider rounded-full px-6 h-11 shadow-lg"
                    onClick={() => onAction(sel, "respond")}
                    data-testid={`button-respond-${sel.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />Respond
                  </Button>
                )}
                {isCoachInbox && sel.status === "ACCEPTED" && (
                  <Button
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 font-bold uppercase tracking-wider rounded-full px-6 h-11 border-0"
                    onClick={() => onAction(sel, "complete")}
                    data-testid={`button-complete-${sel.id}`}
                  >
                    <Trophy className="w-4 h-4 mr-1" />Mark complete
                  </Button>
                )}
              </div>
            </div>

            {/* RIGHT: avatar + countdown */}
            <div className="relative flex items-center justify-center min-h-[280px] lg:min-h-[380px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 lg:w-96 lg:h-96 rounded-full blur-2xl opacity-60" style={{ background: t.glow }} />
              </div>
              <motion.div
                key={`av-${sel.id}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 14 }}
                className={`relative w-56 h-56 lg:w-72 lg:h-72 rounded-full overflow-hidden border-4 border-white/30`}
                style={{ boxShadow: `0 0 60px ${t.glow}` }}
              >
                {(subject as any)?.profilePhoto ? (
                  <img src={(subject as any).profilePhoto} alt={subject?.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white text-7xl font-black">
                    {(subject?.fullName || "?").charAt(0)}
                  </div>
                )}
              </motion.div>
              <div className="absolute bottom-3 lg:bottom-6 inset-x-0 mx-auto w-fit bg-black/55 backdrop-blur-md border border-white/15 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <AlarmClock className="w-3 h-3" />
                {sel.preferredDate} @ {sel.preferredTime}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* DOCK */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">
            {isCoachInbox ? "Inbox" : "My bookings"} · {requests.length}
          </p>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => scroll(-1)} data-testid="button-dock-prev">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => scroll(1)} data-testid="button-dock-next">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div
          ref={dockRef}
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(null)}
          className="flex items-end gap-3 overflow-x-auto pt-6 pb-4 px-2 cursor-grab active:cursor-grabbing select-none scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}
          onPointerDown={(e) => {
            const el = dockRef.current; if (!el) return;
            const startX = e.clientX; const startScroll = el.scrollLeft;
            let dragged = false;
            const move = (ev: PointerEvent) => {
              const dx = ev.clientX - startX;
              if (Math.abs(dx) > 4) dragged = true;
              el.scrollLeft = startScroll - dx;
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
              if (dragged) el.dataset.dragged = "1";
              setTimeout(() => { delete el.dataset.dragged; }, 50);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
          data-testid="dock-lessons"
        >
          {requests.map((r) => (
            <DockTile
              key={r.id}
              req={r}
              mouseX={mouseX}
              isSelected={r.id === sel.id}
              isCoachInbox={isCoachInbox}
              onSelect={(req) => {
                if (dockRef.current?.dataset.dragged) return;
                setSelectedId(req.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Player view ─────────────────────────────────────────────────────────────
function PlayerLessonsView() {
  const { data: requests, isLoading } = useQuery<LessonRequest[]>({ queryKey: ["/api/lesson-requests/my"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("PATCH", `/api/lesson-requests/${id}/cancel`)).json(),
    onSuccess: () => {
      toast({ title: "Request cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/my"] });
    },
    onError: (err: any) => toast({ title: "Failed to cancel", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

  return (
    <FortniteLessonShowcase
      requests={requests || []}
      isCoachInbox={false}
      emptyText={{ title: "No lessons booked yet", sub: "Find a coach to book your first lesson." }}
      emptyIcon={BookOpen}
      onAction={(req, action) => {
        if (action === "cancel") cancelMutation.mutate(req.id);
      }}
    />
  );
}

// ─── Coach inbox view ────────────────────────────────────────────────────────
function CoachLessonsView() {
  const { data: requests, isLoading } = useQuery<LessonRequest[]>({ queryKey: ["/api/lesson-requests/coach"] });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [respondDialog, setRespondDialog] = useState<LessonRequest | null>(null);
  const [coachResponse, setCoachResponse] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => (await apiRequest("PATCH", `/api/lesson-requests/${id}/respond`, {
      status,
      coachResponse: coachResponse || null,
      agreedPrice: agreedPrice ? Math.round(parseFloat(agreedPrice) * 100) : null,
    })).json(),
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "ACCEPTED" ? "Lesson accepted" : "Lesson declined" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/coach"] });
      setRespondDialog(null); setCoachResponse(""); setAgreedPrice("");
    },
    onError: (err: any) => toast({ title: "Failed to respond", description: err.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => (await apiRequest("PATCH", `/api/lesson-requests/${id}/complete`)).json(),
    onSuccess: () => {
      toast({ title: "Lesson marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/coach"] });
    },
    onError: (err: any) => toast({ title: "Failed to complete", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

  return (
    <>
      <FortniteLessonShowcase
        requests={requests || []}
        isCoachInbox
        emptyText={{ title: "No lesson requests yet", sub: "When players book with you, they'll appear here." }}
        emptyIcon={BookOpen}
        onAction={(req, action) => {
          if (action === "respond") { setRespondDialog(req); setCoachResponse(""); setAgreedPrice(""); }
          else if (action === "complete") completeMutation.mutate(req.id);
        }}
      />

      <Dialog open={!!respondDialog} onOpenChange={(v) => { if (!v) setRespondDialog(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-respond-lesson">
          <DialogHeader><DialogTitle>Respond to Lesson Request</DialogTitle></DialogHeader>
          {respondDialog && (
            <div className="space-y-4 mt-2">
              <div className="text-sm space-y-1">
                <p><strong>Player:</strong> {respondDialog.player?.fullName}</p>
                <p><strong>When:</strong> {respondDialog.preferredDate} at {respondDialog.preferredTime} ({respondDialog.durationMinutes}m)</p>
                <p><strong>Type:</strong> {respondDialog.lessonType === "ONE_TO_ONE" ? "Private" : "Group"}</p>
                {respondDialog.location && <p><strong>Where:</strong> {respondDialog.location}</p>}
                {respondDialog.playerMessage && <p><strong>Message:</strong> {respondDialog.playerMessage}</p>}
              </div>
              <div>
                <Label>Your reply</Label>
                <Textarea placeholder="Add a message for the player…" value={coachResponse} onChange={(e) => setCoachResponse(e.target.value)} rows={3} data-testid="input-coach-response" />
              </div>
              <div>
                <Label>Agreed price (£)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 25.00" value={agreedPrice} onChange={(e) => setAgreedPrice(e.target.value)} data-testid="input-agreed-price" />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => respondMutation.mutate({ id: respondDialog.id, status: "ACCEPTED" })} disabled={respondMutation.isPending} data-testid="button-confirm-accept">
                  <Check className="w-4 h-4 mr-1" />Accept
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => respondMutation.mutate({ id: respondDialog.id, status: "DECLINED" })} disabled={respondMutation.isPending} data-testid="button-confirm-decline">
                  <X className="w-4 h-4 mr-1" />Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MyLessons() {
  const { data: coachRequests } = useQuery<LessonRequest[]>({ queryKey: ["/api/lesson-requests/coach"] });
  const pendingCount = coachRequests?.filter((r) => r.status === "PENDING").length || 0;

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="My Lessons"
        description="Track your bookings and respond to requests"
        icon={<GraduationCap className="w-7 h-7 text-primary" />}
      />

      <Tabs defaultValue="player" className="w-full">
        <TabsList className="w-full" data-testid="tabs-lessons">
          <TabsTrigger value="player" className="flex-1" data-testid="tab-my-requests">My Bookings</TabsTrigger>
          <TabsTrigger value="coach" className="flex-1" data-testid="tab-coach-requests">
            Coach Inbox
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] text-xs">{pendingCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="player" className="mt-6"><PlayerLessonsView /></TabsContent>
        <TabsContent value="coach" className="mt-6"><CoachLessonsView /></TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, MapPin, GraduationCap, Star, Award, Clock, Calendar, ChevronLeft, ChevronRight,
  Loader2, Sparkles, Sun, MessageSquare, PoundSterling, BadgeCheck, Trophy, Languages,
  Camera, ShieldCheck, Lock,
} from "lucide-react";
import ReviewSection from "@/components/ReviewSection";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Coach {
  id: number; fullName: string; profilePhoto?: string; roleTitle?: string; bio?: string;
  city?: string; postcode?: string; areaCoverage?: string; latitude?: string; longitude?: string;
  badmintonEnglandCert: boolean; firstAidCert?: boolean; yearsTraining?: number;
  qualifications?: string; coachingCertifications?: string; languagesSpoken?: string;
  specialism?: string[]; coachingFocus?: string[]; ageGroupsCoached?: string[];
  sessionPrices?: string; coachingPhilosophy?: string; achievements?: string;
  averageRating?: number | null; reviewCount?: number;
}
interface AvailabilitySummary {
  rules: { id: number; dayOfWeek: number; startTime: string; endTime: string }[];
  gallery: { id: number; imageUrl: string; caption?: string }[];
  settings: { slotDurationMinutes: number; advanceNoticeHours: number; maxAdvanceDays: number; holidayMode: boolean; holidayMessage?: string; defaultPricePence: number } | null;
}
interface Slot { time: string; available: boolean; reason?: string }

function GlassCard({ children, className = "" }: { children: any; className?: string }) {
  return (
    <Card className={`relative overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_60%)]" />
      <div className="relative">{children}</div>
    </Card>
  );
}

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

export default function CoachPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const coachId = Number(id);
  const { data: user } = useUser();
  const { toast } = useToast();

  const { data: coaches, isLoading: cLoading } = useQuery<Coach[]>({ queryKey: ["/api/coaches"] });
  const coach = useMemo(() => coaches?.find((c) => c.id === coachId), [coaches, coachId]);
  const { data: summary, isLoading: sLoading } = useQuery<AvailabilitySummary>({ queryKey: [`/api/coaches/${coachId}/availability-summary`], enabled: !!coachId });

  const [selectedDate, setSelectedDate] = useState<string>(fmtDate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState("60");
  const [lessonType, setLessonType] = useState("ONE_TO_ONE");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => { setSelectedSlot(null); }, [selectedDate]);

  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: Slot[] }>({
    queryKey: [`/api/coaches/${coachId}/availability-slots`, selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/${coachId}/availability-slots?date=${selectedDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load slots");
      return r.json();
    },
    enabled: !!coachId,
  });

  const book = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach-bookings", {
        coachId, date: selectedDate, time: selectedSlot, durationMinutes: Number(duration),
        lessonType, location: location || undefined, playerMessage: message || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking sent!", description: "The coach will confirm shortly." });
      queryClient.invalidateQueries({ queryKey: [`/api/coaches/${coachId}/availability-slots`, selectedDate] });
      setSelectedSlot(null); setMessage(""); setLocation("");
    },
    onError: (e: any) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
  });

  if (cLoading || sLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>;
  if (!coach) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-3">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">This coach profile is locked. Activate Find a Coach access to view full details.</p>
        <Link href="/find-coach"><Button data-testid="link-back-find-coach"><ArrowLeft className="w-4 h-4 mr-1" />Back to Find a Coach</Button></Link>
      </div>
    );
  }

  // Build a 14-day strip
  const dateStrip = useMemo(() => {
    const arr: { d: string; weekday: string; day: number }[] = [];
    const max = summary?.settings?.maxAdvanceDays ?? 60;
    for (let i = 0; i < Math.min(14, max + 1); i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      arr.push({ d: fmtDate(d), weekday: DAY_LABEL[d.getDay()], day: d.getDate() });
    }
    return arr;
  }, [summary]);

  const gallery = summary?.gallery ?? [];
  const slots = slotData?.slots ?? [];
  const holiday = summary?.settings?.holidayMode;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
        <Link href="/find-coach">
          <Button variant="ghost" size="sm" className="text-violet-300" data-testid="button-back"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>

        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-500/60 via-fuchsia-500/40 to-cyan-500/40 blur-md opacity-70" />
                  <Avatar className="relative h-28 w-28 border-2 border-white/20">
                    {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} /> : null}
                    <AvatarFallback className="text-3xl bg-violet-900/40">{coach.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" data-testid="text-coach-name">{coach.fullName}</h1>
                    {coach.badmintonEnglandCert && (
                      <Badge className="bg-gradient-to-br from-amber-400/30 to-amber-700/20 border border-amber-400/40 text-amber-200">
                        <BadgeCheck className="w-3 h-3 mr-1" />BE Certified
                      </Badge>
                    )}
                    {coach.firstAidCert && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">First Aid</Badge>}
                  </div>
                  {coach.roleTitle && <p className="text-sm text-violet-300" data-testid="text-coach-role">{coach.roleTitle}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                    {coach.city && <span><MapPin className="inline w-3.5 h-3.5 mr-1" />{[coach.city, coach.postcode].filter(Boolean).join(", ")}</span>}
                    {coach.yearsTraining != null && <span><Clock className="inline w-3.5 h-3.5 mr-1" />{coach.yearsTraining} yrs</span>}
                    {coach.languagesSpoken && <span><Languages className="inline w-3.5 h-3.5 mr-1" />{coach.languagesSpoken}</span>}
                    {coach.averageRating != null && (
                      <span className="text-amber-300"><Star className="inline w-3.5 h-3.5 mr-1 fill-amber-300" />{coach.averageRating.toFixed(1)} ({coach.reviewCount})</span>
                    )}
                  </div>
                  {coach.bio && <p className="text-sm text-zinc-300 leading-relaxed mt-2">{coach.bio}</p>}
                  {(coach.specialism?.length || coach.coachingFocus?.length) ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {coach.specialism?.map((s) => <Badge key={s} variant="outline" className="border-violet-400/30 text-violet-200">{s}</Badge>)}
                      {coach.coachingFocus?.map((f) => <Badge key={f} variant="secondary">{f}</Badge>)}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        {/* GALLERY */}
        {gallery.length > 0 && (
          <GlassCard>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4 text-cyan-300" />
                <h3 className="font-semibold">Gallery</h3>
              </div>
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black/30">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={gallery[galleryIdx].id}
                    src={gallery[galleryIdx].imageUrl}
                    alt={gallery[galleryIdx].caption || ""}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full object-cover"
                    data-testid={`img-gallery-${galleryIdx}`}
                  />
                </AnimatePresence>
                {gallery.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80" data-testid="button-gallery-prev">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80" data-testid="button-gallery-next">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="flex justify-center gap-1 mt-3">
                  {gallery.map((_, i) => (
                    <button key={i} onClick={() => setGalleryIdx(i)} className={`h-1.5 rounded-full transition-all ${i === galleryIdx ? "w-6 bg-violet-400" : "w-1.5 bg-white/20"}`} />
                  ))}
                </div>
              )}
            </CardContent>
          </GlassCard>
        )}

        {/* QUALIFICATIONS / DETAILS */}
        <div className="grid md:grid-cols-2 gap-4">
          {(coach.qualifications || coach.coachingCertifications) && (
            <GlassCard>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold flex items-center gap-1"><GraduationCap className="w-4 h-4 text-emerald-300" /> Qualifications</h3>
                {coach.coachingCertifications && <p className="text-sm text-zinc-300"><strong className="text-zinc-100">Certs:</strong> {coach.coachingCertifications}</p>}
                {coach.qualifications && <p className="text-sm text-zinc-300"><strong className="text-zinc-100">Other:</strong> {coach.qualifications}</p>}
              </CardContent>
            </GlassCard>
          )}
          {(coach.achievements || coach.coachingPhilosophy) && (
            <GlassCard>
              <CardContent className="p-4 space-y-2">
                {coach.achievements && (<><h3 className="font-semibold flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-300" /> Achievements</h3><p className="text-sm text-zinc-300 whitespace-pre-wrap">{coach.achievements}</p></>)}
                {coach.coachingPhilosophy && (<><h3 className="font-semibold flex items-center gap-1 mt-2"><Sparkles className="w-4 h-4 text-violet-300" /> Philosophy</h3><p className="text-sm text-zinc-300 whitespace-pre-wrap">{coach.coachingPhilosophy}</p></>)}
              </CardContent>
            </GlassCard>
          )}
        </div>

        {/* BOOKING */}
        <GlassCard>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-violet-300" />
              <h2 className="text-lg font-bold">Book a session</h2>
              {summary?.settings?.defaultPricePence != null && (
                <Badge className="ml-auto bg-violet-500/20 border border-violet-500/40 text-violet-200">
                  <PoundSterling className="w-3 h-3 mr-1" />from £{(summary.settings.defaultPricePence / 100).toFixed(2)}
                </Badge>
              )}
            </div>

            {holiday ? (
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm flex items-start gap-2">
                <Sun className="w-5 h-5 mt-0.5" />
                <div>
                  <strong>Holiday mode</strong>
                  <p>{summary?.settings?.holidayMessage || "This coach isn't taking new bookings right now."}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Date strip */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin">
                  {dateStrip.map((d) => (
                    <button
                      key={d.d}
                      onClick={() => setSelectedDate(d.d)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg border text-center min-w-[58px] transition ${
                        d.d === selectedDate
                          ? "bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 border-violet-400 text-white shadow-[0_0_18px_rgba(168,85,247,0.4)]"
                          : "border-white/10 hover:border-violet-400/40 text-zinc-300"
                      }`}
                      data-testid={`button-date-${d.d}`}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-70">{d.weekday}</div>
                      <div className="text-lg font-bold leading-none mt-0.5">{d.day}</div>
                    </button>
                  ))}
                </div>

                {/* Slot grid */}
                {slotsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
                ) : slots.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">No slots on this date.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setSelectedSlot(s.time)}
                        className={`relative px-2 py-2.5 rounded-lg border text-sm font-medium transition ${
                          !s.available
                            ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed line-through"
                            : selectedSlot === s.time
                              ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]"
                              : "border-white/10 hover:border-violet-400/50 text-zinc-200"
                        }`}
                        data-testid={`button-slot-${s.time}`}
                      >
                        {s.time}
                        {!s.available && s.reason && <div className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">{s.reason}</div>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Booking form */}
                <AnimatePresence>
                  {selectedSlot && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3 p-4 rounded-lg border border-violet-400/30 bg-violet-500/5">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-violet-300" />
                        {selectedDate} at {selectedSlot}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Duration</Label>
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger data-testid="select-duration"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[30, 45, 60, 90, 120].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select value={lessonType} onValueChange={setLessonType}>
                            <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ONE_TO_ONE">Private (1-to-1)</SelectItem>
                              <SelectItem value="GROUP">Group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Preferred location (optional)</Label>
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Local leisure centre" data-testid="input-location" />
                      </div>
                      <div>
                        <Label>Message to coach</Label>
                        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Tell the coach about your level, goals…" data-testid="input-message" />
                      </div>
                      <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600" onClick={() => book.mutate()} disabled={!user || book.isPending} data-testid="button-confirm-booking">
                        {book.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calendar className="w-4 h-4 mr-1" />}
                        {user ? "Confirm booking" : "Sign in to book"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </CardContent>
        </GlassCard>

        {/* Reviews */}
        <GlassCard>
          <CardContent className="p-4">
            <ReviewSection targetType="COACH" targetId={coach.id} />
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}

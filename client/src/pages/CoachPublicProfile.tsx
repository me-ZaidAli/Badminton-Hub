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
import { CoachSubNav } from "@/components/SubNav";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Coach {
  id: number; fullName: string; profilePhoto?: string; roleTitle?: string; bio?: string;
  city?: string; postcode?: string; areaCoverage?: string; latitude?: string; longitude?: string;
  badmintonEnglandCert: boolean; firstAidCert?: boolean; yearsTraining?: number;
  qualifications?: string; coachingCertifications?: string; languagesSpoken?: string;
  specialism?: string[]; coachingFocus?: string[]; ageGroupsCoached?: string[];
  sessionPrices?: string; coachingPhilosophy?: string; achievements?: string;
  averageRating?: number | null; reviewCount?: number;
  servicesDescription?: string; videoLinks?: string[]; websiteLinks?: string[];
  preferredVenueIds?: number[]; preferredAreas?: string[];
}
interface VenueOption { id: number; name: string; city: string | null; address: string; clubName: string | null }
interface PriceTier { id: string; label: string; pricePence: number; durationMinutes: number; maxParticipants: number; sortOrder: number }
interface AvailabilitySummary {
  rules: { id: number; dayOfWeek: number; startTime: string; endTime: string }[];
  gallery: { id: number; imageUrl: string; caption?: string }[];
  settings: { slotDurationMinutes: number; advanceNoticeHours: number; maxAdvanceDays: number; holidayMode: boolean; holidayMessage?: string; defaultPricePence: number; priceTiers?: PriceTier[] } | null;
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
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [venueSuggestion, setVenueSuggestion] = useState("");
  const [message, setMessage] = useState("");

  const { data: allVenues = [] } = useQuery<VenueOption[]>({ queryKey: ["/api/venues/all"], enabled: !!user });
  const allowedVenues = useMemo(() => {
    const ids = new Set(coach?.preferredVenueIds ?? []);
    return allVenues.filter((v) => ids.has(v.id));
  }, [allVenues, coach?.preferredVenueIds]);
  const selectedVenue = allowedVenues.find((v) => String(v.id) === selectedVenueId) || null;
  const composedLocation = (() => {
    const parts: string[] = [];
    if (selectedVenue) parts.push([selectedVenue.name, selectedVenue.city].filter(Boolean).join(", "));
    if (venueSuggestion.trim()) parts.push(`(Suggestion: ${venueSuggestion.trim()})`);
    return parts.join(" ").trim();
  })();
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

  const tiers = summary?.settings?.priceTiers ?? [];
  const selectedTier = tiers.find((t) => t.id === selectedTierId) || null;
  const dur = selectedTier?.durationMinutes ?? summary?.settings?.slotDurationMinutes ?? 60;
  const pricePence = selectedTier?.pricePence ?? summary?.settings?.defaultPricePence ?? 0;
  const lessonType = (selectedTier && selectedTier.maxParticipants > 1) ? "GROUP" : "ONE_TO_ONE";

  const book = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach-bookings", {
        coachId, date: selectedDate, time: selectedSlot, durationMinutes: dur,
        lessonType, priceTierId: selectedTier?.id ?? undefined,
        location: composedLocation || undefined, playerMessage: message || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking sent!", description: "The coach will confirm shortly." });
      queryClient.invalidateQueries({ queryKey: [`/api/coaches/${coachId}/availability-slots`, selectedDate] });
      setSelectedSlot(null); setMessage(""); setSelectedVenueId(""); setVenueSuggestion("");
    },
    onError: (e: any) => toast({ title: "Booking failed", description: e.message, variant: "destructive" }),
  });

  // Build a 14-day strip — must be declared before any early returns to satisfy rules of hooks.
  const dateStrip = useMemo(() => {
    const arr: { d: string; weekday: string; day: number }[] = [];
    const max = summary?.settings?.maxAdvanceDays ?? 60;
    for (let i = 0; i < Math.min(14, max + 1); i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      arr.push({ d: fmtDate(d), weekday: DAY_LABEL[d.getDay()], day: d.getDate() });
    }
    return arr;
  }, [summary]);

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

  const gallery = summary?.gallery ?? [];
  const slots = slotData?.slots ?? [];
  const holiday = summary?.settings?.holidayMode;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <CoachSubNav />
      <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
        <Link href="/find-coach">
          <Button variant="ghost" size="sm" className="text-violet-300" data-testid="button-back"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>

        {/* HERO — big centered portrait, descriptions flow below */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <CardContent className="p-0 overflow-hidden">
              <div className="relative">
                {/* Backdrop wash */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/25 via-fuchsia-500/10 to-cyan-500/20" />
                <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-violet-500/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />

                <div className="relative px-5 md:px-10 pt-10 pb-8 flex flex-col items-center text-center">
                  {/* BIG centered photo */}
                  <div className="relative mb-5" data-testid="hero-photo">
                    <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-violet-500/70 via-fuchsia-500/50 to-cyan-400/60 blur-xl opacity-90" />
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-violet-400 via-fuchsia-400 to-cyan-300 opacity-80" />
                    {coach.profilePhoto ? (
                      <img
                        src={coach.profilePhoto}
                        alt={coach.fullName}
                        className="relative w-44 h-44 md:w-56 md:h-56 rounded-full object-cover border-4 border-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                        data-testid="img-coach-photo"
                      />
                    ) : (
                      <div
                        className="relative w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-violet-900/80 to-fuchsia-900/60 border-4 border-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center text-6xl md:text-7xl font-extrabold text-violet-100"
                        data-testid="img-coach-photo-fallback"
                      >
                        {coach.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + cert badges */}
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-violet-100 to-cyan-100 bg-clip-text text-transparent" data-testid="text-coach-name">
                    {coach.fullName}
                  </h1>
                  {coach.roleTitle && (
                    <p className="text-sm md:text-base text-violet-300 mt-1" data-testid="text-coach-role">{coach.roleTitle}</p>
                  )}

                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {coach.badmintonEnglandCert && (
                      <Badge className="bg-gradient-to-br from-amber-400/30 to-amber-700/20 border border-amber-400/40 text-amber-200">
                        <BadgeCheck className="w-3 h-3 mr-1" />BE Certified
                      </Badge>
                    )}
                    {coach.firstAidCert && <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">First Aid</Badge>}
                    {coach.averageRating != null && (
                      <Badge variant="outline" className="border-amber-400/40 text-amber-200">
                        <Star className="w-3 h-3 mr-1 fill-amber-300 text-amber-300" />{coach.averageRating.toFixed(1)} · {coach.reviewCount}
                      </Badge>
                    )}
                  </div>

                  {/* Quick facts row */}
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-zinc-400 mt-4" data-testid="hero-facts">
                    {coach.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[coach.city, coach.postcode].filter(Boolean).join(", ")}</span>}
                    {coach.yearsTraining != null && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{coach.yearsTraining} yrs experience</span>}
                    {coach.languagesSpoken && <span className="inline-flex items-center gap-1"><Languages className="w-3.5 h-3.5" />{coach.languagesSpoken}</span>}
                  </div>
                </div>

                {/* Descriptions BELOW the photo */}
                {(coach.bio || coach.specialism?.length || coach.coachingFocus?.length) && (
                  <div className="relative border-t border-white/10 px-5 md:px-10 py-6 md:py-8 space-y-5">
                    {coach.bio && (
                      <div data-testid="hero-bio">
                        <h3 className="text-xs uppercase tracking-[0.18em] text-violet-300/80 mb-2">About</h3>
                        <p className="text-sm md:text-[15px] leading-relaxed text-zinc-200 whitespace-pre-wrap max-w-3xl mx-auto text-center md:text-left">{coach.bio}</p>
                      </div>
                    )}
                    {(coach.specialism?.length || coach.coachingFocus?.length) ? (
                      <div className="flex flex-wrap justify-center md:justify-start gap-1.5" data-testid="hero-tags">
                        {coach.specialism?.map((s) => (
                          <Badge key={`sp-${s}`} variant="outline" className="border-violet-400/40 text-violet-200 bg-violet-500/10">{s}</Badge>
                        ))}
                        {coach.coachingFocus?.map((f) => (
                          <Badge key={`fc-${f}`} className="bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">{f}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
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

        {(coach.servicesDescription || coach.preferredAreas?.length || coach.websiteLinks?.length || coach.videoLinks?.length) ? (
          <GlassCard>
            <CardContent className="p-4 md:p-6 space-y-4">
              {coach.servicesDescription && (
                <div>
                  <h3 className="font-semibold flex items-center gap-1 mb-1"><Sparkles className="w-4 h-4 text-violet-300" /> Services</h3>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap" data-testid="text-services-description">{coach.servicesDescription}</p>
                </div>
              )}
              {coach.preferredAreas?.length ? (
                <div>
                  <h3 className="font-semibold flex items-center gap-1 mb-1"><MapPin className="w-4 h-4 text-cyan-300" /> Preferred Areas</h3>
                  <div className="flex flex-wrap gap-1" data-testid="badges-preferred-areas">
                    {coach.preferredAreas.map((a) => <Badge key={a} variant="outline" className="border-cyan-400/30 text-cyan-200">{a}</Badge>)}
                  </div>
                </div>
              ) : null}
              {coach.websiteLinks?.length ? (
                <div>
                  <h3 className="font-semibold mb-1">Website / Social</h3>
                  <ul className="space-y-1" data-testid="list-website-links">
                    {coach.websiteLinks.map((u) => (<li key={u}><a href={u} target="_blank" rel="noreferrer" className="text-sm text-violet-300 underline break-all">{u}</a></li>))}
                  </ul>
                </div>
              ) : null}
              {coach.videoLinks?.length ? (
                <div>
                  <h3 className="font-semibold mb-1">Videos</h3>
                  <ul className="space-y-1" data-testid="list-video-links">
                    {coach.videoLinks.map((u) => (<li key={u}><a href={u} target="_blank" rel="noreferrer" className="text-sm text-violet-300 underline break-all">{u}</a></li>))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </GlassCard>
        ) : null}

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
                      <div>
                        <Label className="text-xs uppercase tracking-wider text-violet-200">Lesson package</Label>
                        {tiers.length === 0 ? (
                          <p className="text-xs text-zinc-400 mt-2" data-testid="text-no-packages">This coach hasn't published packages yet — booking will use their default rate ({dur} min{pricePence > 0 ? ` · £${(pricePence/100).toFixed(2)}` : ""}).</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" data-testid="grid-tiers">
                            {tiers.map((t) => {
                              const active = selectedTierId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setSelectedTierId(active ? null : t.id)}
                                  className={`flex flex-col items-start text-left px-3 py-2 rounded-lg border transition ${
                                    active
                                      ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]"
                                      : "border-white/10 hover:border-violet-400/40 text-zinc-200"
                                  }`}
                                  data-testid={`button-tier-${t.id}`}
                                >
                                  <span className="font-semibold text-sm truncate w-full">{t.label}</span>
                                  <span className="text-[11px] opacity-80 mt-0.5">£{(t.pricePence/100).toFixed(2)} · {t.durationMinutes} min{t.maxParticipants > 1 ? ` · up to ${t.maxParticipants}` : ""}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {pricePence > 0 && (
                          <div className="mt-2 text-xs text-violet-200" data-testid="text-price-summary">
                            Total <strong className="text-white">£{(pricePence/100).toFixed(2)}</strong> · {dur} min{selectedTier ? ` · ${selectedTier.label}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Venue</Label>
                        {allowedVenues.length === 0 ? (
                          <p className="text-xs text-amber-300/80" data-testid="text-no-venues">This coach hasn't selected any preferred venues yet — use the suggestion box below and they'll confirm.</p>
                        ) : (
                          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                            <SelectTrigger data-testid="select-venue"><SelectValue placeholder="Choose one of the coach's venues" /></SelectTrigger>
                            <SelectContent>
                              {allowedVenues.map((v) => (
                                <SelectItem key={v.id} value={String(v.id)} data-testid={`select-venue-option-${v.id}`}>
                                  {v.name}{v.city ? ` — ${v.city}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Label className="text-xs text-zinc-400 mt-1 block">Suggest a different venue (optional)</Label>
                        <Input value={venueSuggestion} onChange={(e) => setVenueSuggestion(e.target.value)} placeholder="e.g. Local leisure centre near me" data-testid="input-venue-suggestion" />
                        <p className="text-[11px] text-zinc-500">The coach decides the final venue — your suggestion will reach them with the booking.</p>
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

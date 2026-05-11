import { useState, useMemo, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Sparkles as SparklesIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, Award, GraduationCap, Shield, Search, Users, Clock, Briefcase, Target, Calendar, PoundSterling, Languages, HeartHandshake, Trophy, Star, SendHorizonal, User as UserIconLucide } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReviewSection from "@/components/ReviewSection";
import { CoachSubNav } from "@/components/SubNav";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Coach {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
  profilePhoto?: string;
  roleTitle?: string;
  bio?: string;
  city?: string;
  postcode?: string;
  areaCoverage?: string;
  availability?: string;
  coachingCertifications?: string;
  safeguardingDbs?: string;
  firstAidCert?: boolean;
  cpdTraining?: string;
  languagesSpoken?: string;
  qualifications?: string;
  badmintonEnglandCert: boolean;
  yearsTraining?: number;
  playingExperience?: string;
  specialism?: string[];
  coachingPhilosophy?: string;
  preferredGroupSize?: string;
  coachingFocus?: string[];
  sessionTypesOffered?: string[];
  sessionPrices?: string;
  ageGroupsCoached?: string[];
  equipmentProvided?: string;
  cancellationPolicy?: string;
  professionalCareer?: string;
  experience?: string;
  achievements?: string;
  playersDeveloped?: string;
  tournamentsWon?: string;
  teamsCoached?: string;
  testimonials?: string;
  latitude?: string;
  longitude?: string;
  googleMapsUrl?: string;
  averageRating?: number | null;
  reviewCount?: number;
  gender?: string | null;
}

interface Membership {
  id: number;
  userId: number;
  status: string;
  paidUntil?: string;
  createdAt: string;
}

function CoachMap({ coaches, className = "" }: { coaches: Coach[]; className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([53.0, -1.5], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) layer.remove();
    });

    const withCoords = coaches.filter((c) => c.latitude && c.longitude);
    withCoords.forEach((coach) => {
      const lat = parseFloat(coach.latitude!);
      const lng = parseFloat(coach.longitude!);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng]).addTo(mapInstanceRef.current!);
      const container = document.createElement("div");
      container.style.minWidth = "180px";

      const nameEl = document.createElement("strong");
      nameEl.textContent = coach.fullName;
      nameEl.style.fontSize = "14px";
      container.appendChild(nameEl);

      if (coach.roleTitle) {
        container.appendChild(document.createElement("br"));
        const roleEl = document.createElement("span");
        roleEl.style.color = "#666";
        roleEl.style.fontSize = "12px";
        roleEl.textContent = coach.roleTitle;
        container.appendChild(roleEl);
      }

      if (coach.areaCoverage) {
        container.appendChild(document.createElement("br"));
        const areaEl = document.createElement("span");
        areaEl.style.color = "#555";
        areaEl.style.fontSize = "12px";
        areaEl.textContent = coach.areaCoverage;
        container.appendChild(areaEl);
      }

      const locationParts = [coach.city, coach.postcode].filter(Boolean);
      if (locationParts.length > 0) {
        container.appendChild(document.createElement("br"));
        const locEl = document.createElement("span");
        locEl.style.color = "#777";
        locEl.style.fontSize = "12px";
        locEl.textContent = locationParts.join(", ");
        container.appendChild(locEl);
      }

      const gmapsUrl = coach.googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`;
      container.appendChild(document.createElement("br"));
      const linkEl = document.createElement("a");
      linkEl.href = gmapsUrl;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = "Open in Google Maps";
      linkEl.style.color = "#2563eb";
      linkEl.style.fontSize = "12px";
      linkEl.style.textDecoration = "underline";
      linkEl.style.display = "inline-block";
      linkEl.style.marginTop = "4px";
      container.appendChild(linkEl);

      marker.bindPopup(container);
    });

    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(
        withCoords.map((c) => [parseFloat(c.latitude!), parseFloat(c.longitude!)])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coaches]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full min-h-[300px] rounded-md ${className}`}
      data-testid="map-find-coaches"
    />
  );
}

type Slot = { time: string; available: boolean; reason?: string };
type AvailRule = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean };
type PriceTier = { id: string; label: string; pricePence: number; durationMinutes: number; maxParticipants: number; sortOrder: number };
type AvailSummary = { rules: AvailRule[]; settings: { slotDurationMinutes: number; advanceNoticeHours: number; maxAdvanceDays: number; holidayMode: boolean; holidayMessage?: string; defaultPricePence?: number; priceTiers?: PriceTier[] } | null };

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function RequestLessonDialog({ coach, open, onOpenChange }: { coach: Coach | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [playerMessage, setPlayerMessage] = useState("");

  const coachId = coach?.id ?? 0;
  const { data: summary } = useQuery<AvailSummary>({
    queryKey: [`/api/coaches/${coachId}/availability-summary`],
    enabled: open && !!coachId,
  });
  const { data: slotsData, isLoading: slotsLoading, refetch: refetchSlots } = useQuery<{ date: string; slots: Slot[] }>({
    queryKey: [`/api/coaches/${coachId}/availability-slots`, selectedDate],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/${coachId}/availability-slots?date=${selectedDate}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load slots");
      return r.json();
    },
    enabled: open && !!coachId && !!selectedDate,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/coach-bookings", data)).json(),
    onSuccess: () => {
      toast({ title: "Booking sent!", description: "The coach will confirm shortly." });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/my"] });
      onOpenChange(false);
      setSelectedDate(null); setSelectedTime(null); setSelectedTierId(null); setLocation(""); setPlayerMessage("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to book", description: err.message, variant: "destructive" });
      if (/slot/i.test(err.message)) refetchSlots();
    },
  });

  // Days that the coach has *some* recurring availability — used to dim unavailable days.
  const availableDows = useMemo(() => {
    if (!summary?.rules) return new Set<number>();
    return new Set(summary.rules.filter((r) => r.isActive).map((r) => r.dayOfWeek));
  }, [summary]);

  const monthDays = useMemo(() => {
    const first = new Date(monthCursor);
    first.setDate(1);
    const startDow = first.getDay();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < startDow; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(first.getFullYear(), first.getMonth(), d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [monthCursor]);

  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const maxDate = useMemo(() => {
    const max = new Date(today);
    max.setDate(max.getDate() + (summary?.settings?.maxAdvanceDays ?? 60));
    return max;
  }, [today, summary]);

  if (!coach) return null;
  const tiers = summary?.settings?.priceTiers ?? [];
  const selectedTier = tiers.find((t) => t.id === selectedTierId) || null;
  const dur = selectedTier?.durationMinutes ?? summary?.settings?.slotDurationMinutes ?? 60;
  const pricePence = selectedTier?.pricePence ?? summary?.settings?.defaultPricePence ?? 0;
  const lessonType = (selectedTier && selectedTier.maxParticipants > 1) ? "GROUP" : "ONE_TO_ONE";
  const holidayMode = summary?.settings?.holidayMode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-request-lesson">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SendHorizonal className="w-5 h-5 text-primary" />
            Book {coach.fullName}
          </DialogTitle>
        </DialogHeader>

        {holidayMode ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200" data-testid="text-holiday-mode">
            <p className="font-bold mb-1">Currently away</p>
            <p className="text-amber-200/80">{summary?.settings?.holidayMessage || "This coach isn't taking bookings right now."}</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* LEFT: calendar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() - 1); setMonthCursor(d); }} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center" data-testid="button-month-prev"><ChevronLeft className="w-4 h-4" /></button>
              <div className="font-bold text-sm tracking-wide" data-testid="text-month-label">
                {monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </div>
              <button type="button" onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + 1); setMonthCursor(d); }} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center" data-testid="button-month-next"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-muted-foreground font-bold uppercase tracking-wider">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((cell, i) => {
                if (!cell.date) return <div key={i} className="aspect-square" />;
                const dateStr = ymd(cell.date);
                const isPast = cell.date < today;
                const tooFar = cell.date > maxDate;
                const dowOk = availableDows.has(cell.date.getDay());
                const disabled = isPast || tooFar || !dowOk;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === ymd(today);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                    className={`aspect-square rounded-md text-xs font-semibold border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : disabled
                        ? "text-muted-foreground/30 border-transparent cursor-not-allowed"
                        : "border-border hover:bg-muted"
                    } ${isToday && !isSelected ? "ring-1 ring-primary/40" : ""}`}
                    data-testid={`button-day-${dateStr}`}
                  >
                    {cell.date.getDate()}
                    {!disabled && !isSelected && <div className="w-1 h-1 rounded-full bg-emerald-400 mx-auto mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Coach available · pick a day
            </p>
          </div>

          {/* RIGHT: time slots + booking form */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Available times</Label>
              {!selectedDate && <p className="text-sm text-muted-foreground mt-2" data-testid="text-pick-date">Pick a date on the left to see open slots.</p>}
              {selectedDate && slotsLoading && <p className="text-sm text-muted-foreground mt-2">Loading slots…</p>}
              {selectedDate && !slotsLoading && (slotsData?.slots?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground mt-2" data-testid="text-no-slots">No open slots on this day.</p>
              )}
              {selectedDate && !slotsLoading && (slotsData?.slots?.length ?? 0) > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mt-2 max-h-44 overflow-y-auto pr-1" data-testid="grid-slots">
                  {slotsData!.slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSelectedTime(s.time)}
                      className={`text-xs font-semibold py-2 rounded-md border transition-colors ${
                        selectedTime === s.time
                          ? "bg-primary text-primary-foreground border-primary"
                          : s.available
                          ? "border-border hover:bg-muted"
                          : "border-transparent text-muted-foreground/40 line-through cursor-not-allowed"
                      }`}
                      title={s.reason || ""}
                      data-testid={`button-slot-${s.time}`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider">Lesson package</Label>
              {tiers.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-no-packages">This coach hasn't published any packages yet — booking will use their default rate.</p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 mt-2" data-testid="grid-tiers">
                  {tiers.map((t) => {
                    const active = selectedTierId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTierId(active ? null : t.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors text-left ${
                          active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                        }`}
                        data-testid={`button-tier-${t.id}`}
                      >
                        <span className="font-semibold truncate mr-2">{t.label}</span>
                        <span className="shrink-0 text-xs opacity-90">£{(t.pricePence / 100).toFixed(2)} · {t.durationMinutes}m{t.maxParticipants > 1 ? ` · up to ${t.maxParticipants}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <Label>Preferred location <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="e.g. Local leisure centre" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="input-lesson-location" />
            </div>
            <div>
              <Label>Message to coach <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea placeholder="Tell the coach about your level, what you'd like to work on…" value={playerMessage} onChange={(e) => setPlayerMessage(e.target.value)} rows={3} data-testid="input-lesson-message" />
            </div>

            {selectedDate && selectedTime && (
              <div className="rounded-md bg-muted/50 border border-border p-2.5 text-xs" data-testid="text-summary">
                <p><strong>{new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</strong> · {selectedTime} · {dur} min{selectedTier ? ` · ${selectedTier.label}` : ""}</p>
                {pricePence > 0 && (
                  <p className="text-muted-foreground mt-0.5" data-testid="text-price-summary">Total £{(pricePence / 100).toFixed(2)}</p>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedDate || !selectedTime || createMutation.isPending}
              onClick={() => createMutation.mutate({
                coachId: coach.id,
                date: selectedDate,
                time: selectedTime,
                durationMinutes: dur,
                lessonType,
                priceTierId: selectedTier?.id ?? undefined,
                location: location || null,
                playerMessage: playerMessage || null,
              })}
              data-testid="button-submit-lesson-request"
            >
              {createMutation.isPending ? "Sending…" : "Confirm booking"}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CoachDetailDialog({ coach, open, onOpenChange, onRequestLesson }: { coach: Coach | null; open: boolean; onOpenChange: (v: boolean) => void; onRequestLesson?: (coach: Coach) => void }) {
  if (!coach) return null;

  const sections = [
    { label: "Bio", value: coach.bio, icon: <Briefcase className="w-4 h-4" /> },
    { label: "Coaching Philosophy", value: coach.coachingPhilosophy, icon: <HeartHandshake className="w-4 h-4" /> },
    { label: "Playing Experience", value: coach.playingExperience, icon: <Target className="w-4 h-4" /> },
    { label: "Professional Career", value: coach.professionalCareer, icon: <Briefcase className="w-4 h-4" /> },
    { label: "Achievements", value: coach.achievements, icon: <Trophy className="w-4 h-4" /> },
    { label: "Players Developed", value: coach.playersDeveloped, icon: <Users className="w-4 h-4" /> },
    { label: "Tournaments Won", value: coach.tournamentsWon, icon: <Trophy className="w-4 h-4" /> },
    { label: "Teams Coached", value: coach.teamsCoached, icon: <Users className="w-4 h-4" /> },
    { label: "Testimonials", value: coach.testimonials, icon: <Star className="w-4 h-4" /> },
    { label: "Experience Summary", value: coach.experience, icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const initials = coach.fullName.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const locText = [coach.city, coach.postcode].filter(Boolean).join(", ");
  const gmapsUrl = coach.googleMapsUrl || (coach.latitude && coach.longitude ? `https://www.google.com/maps?q=${coach.latitude},${coach.longitude}` : null);
  const rating = coach.averageRating ?? 0;
  const reviewCount = coach.reviewCount ?? 0;
  const genderLabel = coach.gender ? coach.gender.charAt(0).toUpperCase() + coach.gender.slice(1).toLowerCase() : null;

  const ChipGroup = ({ title, items, tone }: { title: string; items: string[]; tone: "violet" | "cyan" | "amber" | "emerald" }) => {
    if (!items?.length) return null;
    const tones = {
      violet: "bg-violet-500/10 border-violet-400/40 text-violet-100 hover:bg-violet-500/20 hover:border-violet-300/70 shadow-[0_0_12px_rgba(167,139,250,0.15)]",
      cyan:   "bg-cyan-500/10 border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.15)]",
      amber:  "bg-amber-500/10 border-amber-400/40 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/70 shadow-[0_0_12px_rgba(251,191,36,0.15)]",
      emerald:"bg-emerald-500/10 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/70 shadow-[0_0_12px_rgba(52,211,153,0.15)]",
    } as const;
    return (
      <div data-testid={`dialog-coach-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-2">{title}</h4>
        <div className="flex flex-wrap gap-1.5">
          {items.map(s => (
            <span key={s} className={`px-3 py-1 rounded-full border text-xs font-medium transition ${tones[tone]}`}>{s}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-violet-500/30 bg-zinc-950 text-zinc-100">
        {/* Hero */}
        <div className="relative px-6 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_20%_0%,rgba(139,92,246,0.35),transparent_60%),radial-gradient(60%_50%_at_100%_0%,rgba(34,211,238,0.18),transparent_60%),linear-gradient(180deg,#0b0a14_0%,#09080f_100%)]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl -z-10" />

          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-[conic-gradient(from_180deg,#a78bfa,#22d3ee,#a78bfa)] opacity-90 blur-[2px]" />
                <Avatar className="relative h-20 w-20 border-2 border-violet-300/40 ring-2 ring-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.45)]">
                  {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} /> : null}
                  <AvatarFallback className="text-xl bg-zinc-900 text-violet-200 font-bold">{initials}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl font-bold tracking-tight text-white" data-testid="dialog-coach-name">{coach.fullName}</DialogTitle>
                {coach.roleTitle && <p className="text-sm text-zinc-400 mt-0.5" data-testid="dialog-coach-role">{coach.roleTitle}</p>}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {coach.badmintonEnglandCert && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_14px_rgba(167,139,250,0.5)]" data-testid="dialog-badge-be">
                      <Award className="w-3 h-3" />BE Certified
                    </span>
                  )}
                  {coach.firstAidCert && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-400/50 text-emerald-200 bg-emerald-500/10" data-testid="dialog-badge-firstaid">First Aid</span>
                  )}
                  {coach.yearsTraining != null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-cyan-400/50 text-cyan-200 bg-cyan-500/10" data-testid="dialog-badge-years">
                      <Clock className="w-3 h-3" />{coach.yearsTraining} yrs
                    </span>
                  )}
                  {genderLabel && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-zinc-600 text-zinc-200 bg-zinc-800/60" data-testid="dialog-badge-gender">
                      <UserIconLucide className="w-3 h-3" />{genderLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <div className="rounded-xl border border-violet-400/20 bg-zinc-900/60 backdrop-blur px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Rating</div>
              <div className="text-lg font-bold text-amber-300 flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-300" />{rating ? rating.toFixed(1) : "—"}</div>
            </div>
            <div className="rounded-xl border border-violet-400/20 bg-zinc-900/60 backdrop-blur px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Reviews</div>
              <div className="text-lg font-bold text-white">{reviewCount}</div>
            </div>
            <div className="rounded-xl border border-violet-400/20 bg-zinc-900/60 backdrop-blur px-3 py-2.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Years</div>
              <div className="text-lg font-bold text-cyan-300">{coach.yearsTraining ?? "—"}</div>
            </div>
          </div>

          {/* Contact strip */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm">
            {coach.phone && (
              <a href={`tel:${coach.phone}`} className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-violet-300" data-testid="dialog-coach-phone">
                <Phone className="w-3.5 h-3.5 text-violet-400" /><span className="underline-offset-2 hover:underline">{coach.phone}</span>
              </a>
            )}
            {locText && (
              gmapsUrl ? (
                <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-violet-300" data-testid="dialog-coach-location">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" /><span className="underline-offset-2 hover:underline">{locText}</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-zinc-300" data-testid="dialog-coach-location">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />{locText}
                </span>
              )
            )}
            {coach.languagesSpoken && (
              <span className="inline-flex items-center gap-1.5 text-zinc-300" data-testid="dialog-coach-languages">
                <Languages className="w-3.5 h-3.5 text-violet-400" />{coach.languagesSpoken}
              </span>
            )}
          </div>

          {/* CTA */}
          {onRequestLesson && (
            <Button
              className="w-full mt-5 h-12 text-base font-bold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 hover:from-violet-400 hover:via-fuchsia-400 hover:to-violet-400 text-white shadow-[0_0_24px_rgba(167,139,250,0.55)] border-0"
              onClick={() => { onOpenChange(false); onRequestLesson(coach); }}
              data-testid="button-request-lesson-detail"
            >
              <SendHorizonal className="w-4 h-4 mr-2" /> Request a Lesson
            </Button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          <ChipGroup title="Specialism" items={coach.specialism ?? []} tone="violet" />
          <ChipGroup title="Coaching Focus" items={coach.coachingFocus ?? []} tone="cyan" />
          <ChipGroup title="Session Types" items={coach.sessionTypesOffered ?? []} tone="amber" />
          <ChipGroup title="Age Groups" items={coach.ageGroupsCoached ?? []} tone="emerald" />

          {(coach.coachingCertifications || coach.qualifications || coach.safeguardingDbs || coach.cpdTraining) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4" data-testid="dialog-coach-creds">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-violet-200"><GraduationCap className="w-4 h-4" /> Qualifications & Credentials</h4>
              <div className="space-y-1 text-sm text-zinc-300">
                {coach.coachingCertifications && <p><span className="font-medium text-white">Certifications:</span> {coach.coachingCertifications}</p>}
                {coach.qualifications && <p><span className="font-medium text-white">Other:</span> {coach.qualifications}</p>}
                {coach.safeguardingDbs && <p><span className="font-medium text-white">DBS:</span> {coach.safeguardingDbs}</p>}
                {coach.cpdTraining && <p><span className="font-medium text-white">CPD:</span> {coach.cpdTraining}</p>}
              </div>
            </div>
          )}

          {(coach.sessionPrices || coach.preferredGroupSize || coach.equipmentProvided || coach.cancellationPolicy) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4" data-testid="dialog-coach-practical">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-amber-200"><PoundSterling className="w-4 h-4" /> Practical Info</h4>
              <div className="space-y-1 text-sm text-zinc-300">
                {coach.preferredGroupSize && <p><span className="font-medium text-white">Group Size:</span> {coach.preferredGroupSize}</p>}
                {coach.sessionPrices && <p><span className="font-medium text-white">Prices:</span> {coach.sessionPrices}</p>}
                {coach.equipmentProvided && <p><span className="font-medium text-white">Equipment:</span> {coach.equipmentProvided}</p>}
                {coach.cancellationPolicy && <p><span className="font-medium text-white">Cancellation:</span> {coach.cancellationPolicy}</p>}
              </div>
            </div>
          )}

          {coach.availability && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4" data-testid="dialog-coach-availability">
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-cyan-200"><Calendar className="w-4 h-4" /> Availability</h4>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{coach.availability}</p>
            </div>
          )}

          {sections.filter(s => s.value).map(section => (
            <div key={section.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4" data-testid={`dialog-coach-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-violet-200">{section.icon} {section.label}</h4>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{section.value}</p>
            </div>
          ))}

          <CoachPlayerFeedback coachId={coach.id} />

          <div className="border-t border-zinc-800 pt-4 mt-2">
            <ReviewSection targetType="COACH" targetId={coach.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type CoachFeedbackItem = {
  kind: "evaluation" | "note";
  id: string;
  player: string;
  skill: string | null;
  rating: number | null;
  comment: string | null;
  at: string;
};

function CoachPlayerFeedback({ coachId }: { coachId: number }) {
  const { data, isLoading } = useQuery<{ items: CoachFeedbackItem[] }>({
    queryKey: ["/api/coaches", coachId, "feedback"],
    queryFn: async () => {
      const res = await fetch(`/api/coaches/${coachId}/feedback`, { credentials: "include" });
      if (!res.ok) return { items: [] };
      return res.json();
    },
  });
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-violet-400/20 bg-zinc-900/60 p-4 text-xs text-zinc-500" data-testid="dialog-coach-feedback-loading">
        Loading player feedback…
      </div>
    );
  }
  const items = data?.items ?? [];
  if (!items.length) return null;

  return (
    <div data-testid="dialog-coach-player-feedback">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">Player Feedback</h4>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-200 font-bold">{items.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((it) => {
          const isEval = it.kind === "evaluation";
          return (
            <div
              key={it.id}
              className={`relative rounded-2xl p-3 border overflow-hidden bg-gradient-to-br from-zinc-900/90 to-zinc-950 ${
                isEval ? "border-violet-400/30 shadow-[0_0_18px_rgba(167,139,250,0.18)]" : "border-cyan-400/30 shadow-[0_0_18px_rgba(34,211,238,0.15)]"
              }`}
              data-testid={`feedback-item-${it.id}`}
            >
              <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl ${isEval ? "bg-violet-500/25" : "bg-cyan-500/20"}`} />
              <div className="relative flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <UserIconLucide className={`w-3.5 h-3.5 shrink-0 ${isEval ? "text-violet-300" : "text-cyan-300"}`} />
                  <span className="text-xs font-bold text-white truncate">{it.player}</span>
                </div>
                {isEval && it.rating != null && (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />{it.rating}
                  </span>
                )}
              </div>
              {it.skill && (
                <div className="mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-violet-300/80 font-semibold">{it.skill}</span>
                </div>
              )}
              <p className="text-[12px] leading-snug text-zinc-300 line-clamp-4">{it.comment}</p>
              <div className="mt-2 text-[10px] text-zinc-500">
                {it.at ? new Date(it.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fortnite-style hero + mac-dock showcase ────────────────────────────────
function DockTile({ coach, mouseX, isSelected, onSelect }: {
  coach: Coach;
  mouseX: any;
  isSelected: boolean;
  onSelect: (c: Coach) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const distance = useTransform(mouseX, (val: number | null) => {
    if (val === null || !ref.current) return 9999;
    const rect = ref.current.getBoundingClientRect();
    return val - (rect.left + rect.width / 2);
  });
  const sizeMv = useTransform(distance, [-180, 0, 180], [70, 120, 70]);
  const size = useSpring(sizeMv, { mass: 0.1, stiffness: 200, damping: 18 });
  const yMv = useTransform(distance, [-180, 0, 180], [0, -16, 0]);
  const y = useSpring(yMv, { mass: 0.1, stiffness: 200, damping: 18 });
  return (
    <motion.button
      ref={ref}
      style={{ width: size, height: size, y }}
      onClick={() => onSelect(coach)}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-colors ${
        isSelected
          ? "border-violet-400 shadow-[0_0_28px_rgba(168,85,247,0.55)]"
          : "border-white/10 hover:border-violet-300/60"
      } bg-gradient-to-br from-slate-800 to-slate-900`}
      data-testid={`dock-coach-${coach.id}`}
    >
      {coach.profilePhoto ? (
        <img src={coach.profilePhoto} alt={coach.fullName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/70 text-2xl font-bold">
          {coach.fullName.charAt(0)}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-1 inset-x-1 text-[10px] text-white truncate text-center font-medium">
        {coach.fullName.split(" ")[0]}
      </div>
      {coach.badmintonEnglandCert && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
          <Award className="w-2.5 h-2.5 text-black" />
        </div>
      )}
    </motion.button>
  );
}

function FortniteCoachShowcase({ coaches, isActive, onLocked, onOpenDialog }: {
  coaches: Coach[];
  isActive: boolean;
  onLocked: () => void;
  onOpenDialog: (c: Coach) => void;
}) {
  const [selectedId, setSelectedId] = useState<number>(coaches[0]?.id);
  useEffect(() => {
    if (!coaches.find((c) => c.id === selectedId) && coaches[0]) setSelectedId(coaches[0].id);
  }, [coaches, selectedId]);
  const selected = coaches.find((c) => c.id === selectedId) || coaches[0];

  const mouseX = useMotionValue<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => {
    if (!dockRef.current) return;
    dockRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const handleHero = () => {
    if (!isActive) { onLocked(); return; }
    onOpenDialog(selected);
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0b1a3f] via-[#13235e] to-[#1a2c75] shadow-[0_30px_80px_-20px_rgba(99,102,241,0.45)]">
        {/* glow orbs */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

        <AnimatePresence mode="wait">
          <motion.div
            key={selected?.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 p-6 lg:p-10"
          >
            {/* LEFT: text */}
            <div className="flex flex-col justify-center text-white">
              {selected?.specialism?.[0] && (
                <div className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-400 px-2 py-1 text-xs font-bold tracking-wider text-black uppercase mb-3" data-testid="hero-coach-tag">
                  <SparklesIcon className="w-3 h-3" />
                  {selected.specialism[0]}
                </div>
              )}
              <div className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase mb-1">Featured Coach</div>
              <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none tracking-tight" data-testid="hero-coach-name">
                {selected?.fullName.split(" ").slice(0, -1).join(" ") || selected?.fullName}
              </h2>
              <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none tracking-tight text-cyan-300 mb-3" data-testid="hero-coach-surname">
                {selected?.fullName.split(" ").slice(-1)[0]}
              </h3>
              {selected?.roleTitle && (
                <p className="text-white/80 text-sm lg:text-base mb-4">{selected.roleTitle}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {selected?.badmintonEnglandCert && (
                  <Badge className="bg-amber-400 text-black hover:bg-amber-400 border-0"><Award className="w-3 h-3 mr-1" />BE Certified</Badge>
                )}
                {selected?.firstAidCert && (
                  <Badge variant="outline" className="border-white/40 text-white"><Shield className="w-3 h-3 mr-1" />First Aid</Badge>
                )}
                {selected?.yearsTraining != null && (
                  <Badge variant="outline" className="border-white/40 text-white"><Clock className="w-3 h-3 mr-1" />{selected.yearsTraining} years</Badge>
                )}
                {selected?.averageRating != null && selected.averageRating > 0 && (
                  <Badge className="bg-white/15 text-white border-0"><Star className="w-3 h-3 mr-1 fill-amber-300 text-amber-300" />{selected.averageRating.toFixed(1)} ({selected.reviewCount || 0})</Badge>
                )}
              </div>

              {selected?.bio && (
                <p className="text-white/85 text-sm lg:text-base leading-relaxed line-clamp-3 max-w-xl mb-5" data-testid="hero-coach-bio">
                  {selected.bio}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button
                  onClick={handleHero}
                  className="bg-white text-slate-900 hover:bg-white/90 font-bold uppercase tracking-wider rounded-full px-6 h-11 shadow-lg"
                  data-testid="button-hero-details"
                >
                  View Details
                </Button>
                {isActive ? (
                  <Link href={`/coach/${selected?.id}`}>
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-violet-500 text-white hover:opacity-90 font-bold uppercase tracking-wider rounded-full px-6 h-11 border-0 shadow-lg" data-testid="button-hero-book">
                      <Calendar className="w-4 h-4 mr-2" />Book Now
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={onLocked} className="bg-gradient-to-r from-cyan-400 to-violet-500 text-white hover:opacity-90 font-bold uppercase tracking-wider rounded-full px-6 h-11 border-0" data-testid="button-hero-unlock">
                    Unlock to Book
                  </Button>
                )}
              </div>
            </div>

            {/* RIGHT: avatar showcase */}
            <div className="relative flex items-center justify-center min-h-[280px] lg:min-h-[420px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-400/40 blur-2xl" />
              </div>
              <motion.div
                key={`av-${selected?.id}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 14 }}
                className="relative w-56 h-56 lg:w-80 lg:h-80 rounded-full overflow-hidden border-4 border-white/30 shadow-[0_0_60px_rgba(168,85,247,0.6)]"
              >
                {selected?.profilePhoto ? (
                  <img src={selected.profilePhoto} alt={selected.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white text-7xl font-black">
                    {selected?.fullName.charAt(0)}
                  </div>
                )}
              </motion.div>
              {/* corner stat chips */}
              {selected?.city && (
                <div className="absolute bottom-4 left-4 lg:bottom-6 lg:left-6 bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />{selected.city}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* DOCK */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">Roster · {coaches.length}</p>
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
          className="dock-strip flex items-end gap-3 overflow-x-auto pt-6 pb-4 px-2 cursor-grab active:cursor-grabbing select-none scroll-smooth"
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
          data-testid="dock-strip"
        >
          {coaches.map((c) => (
            <DockTile
              key={c.id}
              coach={c}
              mouseX={mouseX}
              isSelected={c.id === selected?.id}
              onSelect={(coach) => {
                if (dockRef.current?.dataset.dragged) return;
                setSelectedId(coach.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FindCoach() {
  const [locationSearch, setLocationSearch] = useState("");
  const [qualificationSearch, setQualificationSearch] = useState("");
  const [beCertOnly, setBeCertOnly] = useState(false);
  const [minYears, setMinYears] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [requestLessonCoach, setRequestLessonCoach] = useState<Coach | null>(null);

  const { data: membership, isLoading: membershipLoading } = useQuery<Membership | null>({
    queryKey: ["/api/coach-seeker/me"],
    queryFn: async () => {
      const res = await fetch("/api/coach-seeker/me", { credentials: "include" });
      if (res.status === 404 || res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch membership");
      return res.json();
    },
  });

  // Find-a-Coach is free for everyone — paywall fully removed.
  const isActive = true;

  const { data: coaches, isLoading: coachesLoading } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const filteredCoaches = useMemo(() => {
    if (!coaches) return [];
    return coaches.filter((coach) => {
      if (locationSearch.trim()) {
        const query = locationSearch.toLowerCase();
        const matchesLocation =
          coach.city?.toLowerCase().includes(query) ||
          coach.postcode?.toLowerCase().includes(query) ||
          coach.areaCoverage?.toLowerCase().includes(query);
        if (!matchesLocation) return false;
      }
      if (qualificationSearch.trim()) {
        const query = qualificationSearch.toLowerCase();
        const matchesCerts = coach.qualifications?.toLowerCase().includes(query) ||
          coach.coachingCertifications?.toLowerCase().includes(query);
        if (!matchesCerts) return false;
      }
      if (beCertOnly && !coach.badmintonEnglandCert) return false;
      if (minYears && coach.yearsTraining != null) {
        if (coach.yearsTraining < parseInt(minYears, 10)) return false;
      }
      return true;
    });
  }, [coaches, locationSearch, qualificationSearch, beCertOnly, minYears]);

  const coachesWithCoords = filteredCoaches.filter((c) => c.latitude && c.longitude);

  if (membershipLoading || coachesLoading) {
    return (
      <div className="flex justify-center py-20" data-testid="loading-find-coach">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div data-testid="section-find-coach">
      <CoachSubNav />
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <GraduationCap className="w-6 h-6 text-primary" />
          Find a Coach
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse qualified coaches and find the right one for you.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6" data-testid="section-filters">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="City, postcode, or area..." value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} className="pl-10" data-testid="input-search-location" />
          </div>
        </div>
        <div className="min-w-[180px]">
          <label className="text-sm font-medium mb-1 block">Qualifications</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Filter qualifications..." value={qualificationSearch} onChange={(e) => setQualificationSearch(e.target.value)} className="pl-10" data-testid="input-search-qualifications" />
          </div>
        </div>
        <div className="min-w-[120px]">
          <label className="text-sm font-medium mb-1 block">Min. Years Exp.</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="number" placeholder="0" min="0" value={minYears} onChange={(e) => setMinYears(e.target.value)} className="pl-10" data-testid="input-min-years" />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id="be-cert" checked={beCertOnly} onCheckedChange={(checked) => setBeCertOnly(checked === true)} data-testid="checkbox-be-cert" />
          <label htmlFor="be-cert" className="text-sm font-medium cursor-pointer flex items-center gap-1">
            <Award className="w-4 h-4 text-primary" />
            BE Certified Only
          </label>
        </div>
      </div>

      <div className="mb-2 text-sm text-muted-foreground" data-testid="text-results-count">
        <Users className="w-4 h-4 inline mr-1" />
        {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? "es" : ""} found
      </div>

      {coachesWithCoords.length > 0 && (
        <Card className="mb-6 overflow-visible" data-testid="section-coach-map">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Coach Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[350px] rounded-b-md overflow-hidden">
              <CoachMap coaches={filteredCoaches} />
            </div>
          </CardContent>
        </Card>
      )}

      {filteredCoaches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-results">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No coaches found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <FortniteCoachShowcase
          coaches={filteredCoaches}
          isActive={isActive}
          onLocked={() => setShowPaywall(true)}
          onOpenDialog={(c) => setSelectedCoach(c)}
        />
      )}

      {false && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="grid-coaches">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="hover-elevate cursor-pointer relative overflow-hidden border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:border-violet-400/40 transition-all" onClick={() => { if (isActive) { setSelectedCoach(coach); } else { setShowPaywall(true); } }} data-testid={`card-coach-${coach.id}`}>
              {isActive && (
                <Link href={`/coach/${coach.id}`}>
                  <Button size="sm" variant="outline" className="absolute top-3 right-3 z-10 h-7 px-2 text-xs border-violet-400/50 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20" onClick={(e) => e.stopPropagation()} data-testid={`button-book-${coach.id}`}>
                    <Calendar className="w-3 h-3 mr-1" />Book
                  </Button>
                </Link>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-border flex-shrink-0">
                    {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} /> : null}
                    <AvatarFallback>{coach.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg" data-testid={`text-coach-name-${coach.id}`}>
                      {coach.fullName}
                    </CardTitle>
                    {coach.roleTitle && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-coach-role-${coach.id}`}>{coach.roleTitle}</p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate" data-testid={`text-coach-location-${coach.id}`}>
                        {[coach.city, coach.postcode].filter(Boolean).join(", ") || "Location not specified"}
                      </span>
                    </div>
                    {coach.averageRating != null && coach.averageRating > 0 && (
                      <div className="flex items-center gap-1 mt-1" data-testid={`rating-coach-${coach.id}`}>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= Math.round(coach.averageRating!) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {coach.averageRating.toFixed(1)} ({coach.reviewCount || 0})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {coach.badmintonEnglandCert && (
                    <Badge data-testid={`badge-be-cert-${coach.id}`}><Award className="w-3 h-3 mr-1" />BE Certified</Badge>
                  )}
                  {coach.firstAidCert && <Badge variant="outline">First Aid</Badge>}
                  {coach.yearsTraining != null && (
                    <Badge variant="secondary" data-testid={`badge-years-${coach.id}`}><Clock className="w-3 h-3 mr-1" />{coach.yearsTraining} yrs</Badge>
                  )}
                </div>

                {coach.specialism && coach.specialism.length > 0 && (
                  <div className="flex flex-wrap gap-1" data-testid={`tags-specialism-${coach.id}`}>
                    {coach.specialism.slice(0, 4).map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                    {coach.specialism.length > 4 && <Badge variant="outline" className="text-xs">+{coach.specialism.length - 4}</Badge>}
                  </div>
                )}

                {coach.coachingFocus && coach.coachingFocus.length > 0 && (
                  <div className="flex flex-wrap gap-1" data-testid={`tags-focus-${coach.id}`}>
                    {coach.coachingFocus.slice(0, 3).map(f => <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>)}
                    {coach.coachingFocus.length > 3 && <Badge variant="secondary" className="text-xs">+{coach.coachingFocus.length - 3}</Badge>}
                  </div>
                )}

                {coach.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-coach-bio-${coach.id}`}>{coach.bio}</p>
                )}

                {isActive && (
                  <div className="flex items-center gap-4 text-sm pt-1 flex-wrap">
                    {coach.email && (
                      <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-coach-email-${coach.id}`}>
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{coach.email}</span>
                      </span>
                    )}
                    {coach.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-coach-phone-${coach.id}`}>
                        <Phone className="w-3 h-3" />{coach.phone}
                      </span>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full mt-2" data-testid={`button-view-profile-${coach.id}`}>
                  {isActive ? "View Full Profile" : "Unlock Full Profile"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CoachDetailDialog
        coach={selectedCoach}
        open={!!selectedCoach}
        onOpenChange={(v) => { if (!v) setSelectedCoach(null); }}
        onRequestLesson={(coach) => {
          setSelectedCoach(null);
          setTimeout(() => setRequestLessonCoach(coach), 150);
        }}
      />

      <RequestLessonDialog
        coach={requestLessonCoach}
        open={!!requestLessonCoach}
        onOpenChange={(v) => { if (!v) setRequestLessonCoach(null); }}
      />

      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-paywall">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Membership Required
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4 space-y-4">
            <p className="text-muted-foreground">
              Pay £10/month to unlock full coach details, including contact information, qualifications, reviews, and interactive profiles.
            </p>
            <Link href="/join-coach-seeker">
              <Button size="lg" className="w-full" data-testid="button-paywall-join">
                Join for £10/month
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setShowPaywall(false)} className="w-full" data-testid="button-paywall-dismiss">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

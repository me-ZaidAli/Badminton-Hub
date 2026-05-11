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
import { MapPin, Phone, Mail, Award, GraduationCap, Shield, Search, Users, Clock, Briefcase, Target, Calendar, PoundSterling, Languages, HeartHandshake, Trophy, Star, SendHorizonal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReviewSection from "@/components/ReviewSection";

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

function RequestLessonDialog({ coach, open, onOpenChange }: { coach: Coach | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [lessonType, setLessonType] = useState("ONE_TO_ONE");
  const [location, setLocation] = useState("");
  const [playerMessage, setPlayerMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/lesson-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson request sent!", description: "The coach will be notified and can accept or decline." });
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-requests/my"] });
      onOpenChange(false);
      setPreferredDate("");
      setPreferredTime("");
      setDurationMinutes("60");
      setLessonType("ONE_TO_ONE");
      setLocation("");
      setPlayerMessage("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to send request", description: err.message, variant: "destructive" });
    },
  });

  if (!coach) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-request-lesson">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SendHorizonal className="w-5 h-5 text-primary" />
            Request Lesson with {coach.fullName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preferred Date</Label>
              <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} data-testid="input-lesson-date" />
            </div>
            <div>
              <Label>Preferred Time</Label>
              <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} data-testid="input-lesson-time" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration</Label>
              <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                <SelectTrigger data-testid="select-lesson-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lesson Type</Label>
              <Select value={lessonType} onValueChange={setLessonType}>
                <SelectTrigger data-testid="select-lesson-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TO_ONE">Private (1-to-1)</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Preferred Location</Label>
            <Input placeholder="e.g. Local leisure centre" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="input-lesson-location" />
          </div>
          <div>
            <Label>Message to Coach</Label>
            <Textarea placeholder="Tell the coach about your skill level, what you'd like to work on..." value={playerMessage} onChange={(e) => setPlayerMessage(e.target.value)} rows={3} data-testid="input-lesson-message" />
          </div>
          <Button
            className="w-full"
            disabled={!preferredDate || !preferredTime || createMutation.isPending}
            onClick={() => createMutation.mutate({
              coachId: coach.id,
              lessonType,
              preferredDate,
              preferredTime,
              durationMinutes: parseInt(durationMinutes),
              location: location || null,
              playerMessage: playerMessage || null,
            })}
            data-testid="button-submit-lesson-request"
          >
            {createMutation.isPending ? "Sending..." : "Send Request"}
          </Button>
        </div>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-border">
              {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} /> : null}
              <AvatarFallback className="text-xl">{coach.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl" data-testid="dialog-coach-name">{coach.fullName}</DialogTitle>
              {coach.roleTitle && <p className="text-muted-foreground" data-testid="dialog-coach-role">{coach.roleTitle}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {coach.badmintonEnglandCert && <Badge data-testid="dialog-badge-be"><Award className="w-3 h-3 mr-1" />BE Certified</Badge>}
                {coach.firstAidCert && <Badge variant="outline" data-testid="dialog-badge-firstaid">First Aid</Badge>}
                {coach.yearsTraining != null && <Badge variant="secondary" data-testid="dialog-badge-years"><Clock className="w-3 h-3 mr-1" />{coach.yearsTraining} yrs</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coach.email && (
              <div className="flex items-center gap-2" data-testid="dialog-coach-email">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${coach.email}`} className="text-sm underline">{coach.email}</a>
              </div>
            )}
            {coach.phone && (
              <div className="flex items-center gap-2" data-testid="dialog-coach-phone">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${coach.phone}`} className="text-sm underline">{coach.phone}</a>
              </div>
            )}
            <div className="flex items-center gap-2" data-testid="dialog-coach-location">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {(() => {
                const loc = [coach.city, coach.postcode].filter(Boolean).join(", ") || "Not specified";
                const gmapsUrl = coach.googleMapsUrl || (coach.latitude && coach.longitude ? `https://www.google.com/maps?q=${coach.latitude},${coach.longitude}` : null);
                return gmapsUrl ? (
                  <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">{loc}</a>
                ) : (
                  <span className="text-sm">{loc}</span>
                );
              })()}
            </div>
            {coach.areaCoverage && (
              <div className="flex items-center gap-2" data-testid="dialog-coach-area">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Area: {coach.areaCoverage}</span>
              </div>
            )}
            {coach.languagesSpoken && (
              <div className="flex items-center gap-2" data-testid="dialog-coach-languages">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{coach.languagesSpoken}</span>
              </div>
            )}
          </div>

          {coach.availability && (
            <div data-testid="dialog-coach-availability">
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-1"><Calendar className="w-4 h-4" /> Availability</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{coach.availability}</p>
            </div>
          )}

          {(coach.coachingCertifications || coach.qualifications || coach.safeguardingDbs || coach.cpdTraining) && (
            <div data-testid="dialog-coach-creds">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Qualifications & Credentials</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {coach.coachingCertifications && <p><span className="font-medium text-foreground">Certifications:</span> {coach.coachingCertifications}</p>}
                {coach.qualifications && <p><span className="font-medium text-foreground">Other:</span> {coach.qualifications}</p>}
                {coach.safeguardingDbs && <p><span className="font-medium text-foreground">DBS:</span> {coach.safeguardingDbs}</p>}
                {coach.cpdTraining && <p><span className="font-medium text-foreground">CPD:</span> {coach.cpdTraining}</p>}
              </div>
            </div>
          )}

          {coach.specialism && coach.specialism.length > 0 && (
            <div data-testid="dialog-coach-specialism">
              <h4 className="text-sm font-semibold mb-2">Specialism</h4>
              <div className="flex flex-wrap gap-1">{coach.specialism.map(s => <Badge key={s} variant="outline">{s}</Badge>)}</div>
            </div>
          )}

          {coach.coachingFocus && coach.coachingFocus.length > 0 && (
            <div data-testid="dialog-coach-focus">
              <h4 className="text-sm font-semibold mb-2">Coaching Focus</h4>
              <div className="flex flex-wrap gap-1">{coach.coachingFocus.map(f => <Badge key={f} variant="secondary">{f}</Badge>)}</div>
            </div>
          )}

          {coach.sessionTypesOffered && coach.sessionTypesOffered.length > 0 && (
            <div data-testid="dialog-coach-sessions">
              <h4 className="text-sm font-semibold mb-2">Session Types</h4>
              <div className="flex flex-wrap gap-1">{coach.sessionTypesOffered.map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>
            </div>
          )}

          {coach.ageGroupsCoached && coach.ageGroupsCoached.length > 0 && (
            <div data-testid="dialog-coach-ages">
              <h4 className="text-sm font-semibold mb-2">Age Groups</h4>
              <div className="flex flex-wrap gap-1">{coach.ageGroupsCoached.map(a => <Badge key={a} variant="outline">{a}</Badge>)}</div>
            </div>
          )}

          {(coach.sessionPrices || coach.preferredGroupSize || coach.equipmentProvided || coach.cancellationPolicy) && (
            <div data-testid="dialog-coach-practical">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><PoundSterling className="w-4 h-4" /> Practical Info</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                {coach.preferredGroupSize && <p><span className="font-medium text-foreground">Group Size:</span> {coach.preferredGroupSize}</p>}
                {coach.sessionPrices && <p><span className="font-medium text-foreground">Prices:</span> {coach.sessionPrices}</p>}
                {coach.equipmentProvided && <p><span className="font-medium text-foreground">Equipment:</span> {coach.equipmentProvided}</p>}
                {coach.cancellationPolicy && <p><span className="font-medium text-foreground">Cancellation:</span> {coach.cancellationPolicy}</p>}
              </div>
            </div>
          )}

          {sections.filter(s => s.value).map(section => (
            <div key={section.label} data-testid={`dialog-coach-${section.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">{section.icon} {section.label}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.value}</p>
            </div>
          ))}

          <div className="border-t pt-4 mt-4">
            {onRequestLesson && (
              <Button
                className="w-full mb-4"
                onClick={() => {
                  onOpenChange(false);
                  onRequestLesson(coach);
                }}
                data-testid="button-request-lesson-detail"
              >
                <SendHorizonal className="w-4 h-4 mr-2" />
                Request a Lesson
              </Button>
            )}
            <ReviewSection targetType="COACH" targetId={coach.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

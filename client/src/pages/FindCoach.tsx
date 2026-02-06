import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Phone, Mail, Award, GraduationCap, Shield, Search, Users, Clock, Briefcase, Target, Calendar, DollarSign, Languages, HeartHandshake, Trophy, Star } from "lucide-react";
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

function CoachDetailDialog({ coach, open, onOpenChange }: { coach: Coach | null; open: boolean; onOpenChange: (v: boolean) => void }) {
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
              <span className="text-sm">{[coach.city, coach.postcode].filter(Boolean).join(", ") || "Not specified"}</span>
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
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><DollarSign className="w-4 h-4" /> Practical Info</h4>
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
            <ReviewSection targetType="COACH" targetId={coach.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FindCoach() {
  const [locationSearch, setLocationSearch] = useState("");
  const [qualificationSearch, setQualificationSearch] = useState("");
  const [beCertOnly, setBeCertOnly] = useState(false);
  const [minYears, setMinYears] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  const { data: membership, isLoading: membershipLoading } = useQuery<Membership | null>({
    queryKey: ["/api/coach-seeker/me"],
    queryFn: async () => {
      const res = await fetch("/api/coach-seeker/me", { credentials: "include" });
      if (res.status === 404 || res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch membership");
      return res.json();
    },
  });

  const isActive = membership?.status === "ACTIVE";

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

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center" data-testid="section-membership-required">
        <Card>
          <CardContent className="py-12">
            <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-3" data-testid="text-membership-title">
              Coach Seeker Membership Required
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto" data-testid="text-membership-description">
              To access the full coach directory with contact details, qualifications, and profiles, you need an active Coach Seeker membership at just £10/month.
            </p>
            <Link href="/join-coach-seeker">
              <Button size="lg" data-testid="button-join-coach-seeker">
                Join for £10/month
              </Button>
            </Link>
          </CardContent>
        </Card>
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
          Browse qualified badminton coaches and find the right one for you.
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="grid-coaches">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="hover-elevate cursor-pointer" onClick={() => setSelectedCoach(coach)} data-testid={`card-coach-${coach.id}`}>
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

                <Button variant="outline" size="sm" className="w-full mt-2" data-testid={`button-view-profile-${coach.id}`}>
                  View Full Profile
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CoachDetailDialog coach={selectedCoach} open={!!selectedCoach} onOpenChange={(v) => { if (!v) setSelectedCoach(null); }} />
    </div>
  );
}

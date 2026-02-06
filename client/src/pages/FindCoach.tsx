import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Phone, Mail, Award, GraduationCap, Shield, Search, Users, Clock } from "lucide-react";

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
  bio?: string;
  city?: string;
  postcode?: string;
  areaCoverage?: string;
  qualifications?: string;
  badmintonEnglandCert: boolean;
  yearsTraining?: number;
  experience?: string;
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
      container.style.minWidth = "160px";

      const nameEl = document.createElement("strong");
      nameEl.textContent = coach.fullName;
      nameEl.style.fontSize = "14px";
      container.appendChild(nameEl);

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

export default function FindCoach() {
  const [locationSearch, setLocationSearch] = useState("");
  const [qualificationSearch, setQualificationSearch] = useState("");
  const [beCertOnly, setBeCertOnly] = useState(false);
  const [minYears, setMinYears] = useState("");

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
        if (!coach.qualifications?.toLowerCase().includes(query)) return false;
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
            <Input
              placeholder="City, postcode, or area..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-location"
            />
          </div>
        </div>
        <div className="min-w-[180px]">
          <label className="text-sm font-medium mb-1 block">Qualifications</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter qualifications..."
              value={qualificationSearch}
              onChange={(e) => setQualificationSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-qualifications"
            />
          </div>
        </div>
        <div className="min-w-[120px]">
          <label className="text-sm font-medium mb-1 block">Min. Years Exp.</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="0"
              min="0"
              value={minYears}
              onChange={(e) => setMinYears(e.target.value)}
              className="pl-10"
              data-testid="input-min-years"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="be-cert"
            checked={beCertOnly}
            onCheckedChange={(checked) => setBeCertOnly(checked === true)}
            data-testid="checkbox-be-cert"
          />
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
            <Card key={coach.id} className="hover-elevate" data-testid={`card-coach-${coach.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="text-lg" data-testid={`text-coach-name-${coach.id}`}>
                      {coach.fullName}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate" data-testid={`text-coach-location-${coach.id}`}>
                        {[coach.city, coach.postcode].filter(Boolean).join(", ") || "Location not specified"}
                      </span>
                    </div>
                    {coach.areaCoverage && (
                      <div className="text-xs text-muted-foreground mt-0.5 ml-4" data-testid={`text-coach-area-${coach.id}`}>
                        Area: {coach.areaCoverage}
                      </div>
                    )}
                  </div>
                  {coach.badmintonEnglandCert && (
                    <Badge variant="default" className="flex-shrink-0" data-testid={`badge-be-cert-${coach.id}`}>
                      <Award className="w-3 h-3 mr-1" />
                      BE Certified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {coach.qualifications && (
                  <div className="flex items-start gap-2" data-testid={`text-coach-qualifications-${coach.id}`}>
                    <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{coach.qualifications}</span>
                  </div>
                )}

                {coach.yearsTraining != null && (
                  <div className="flex items-center gap-2" data-testid={`text-coach-years-${coach.id}`}>
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{coach.yearsTraining} year{coach.yearsTraining !== 1 ? "s" : ""} training experience</span>
                  </div>
                )}

                {coach.experience && (
                  <div data-testid={`text-coach-experience-${coach.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-2">{coach.experience}</p>
                  </div>
                )}

                {coach.email && (
                  <div className="flex items-center gap-2" data-testid={`text-coach-email-${coach.id}`}>
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${coach.email}`} className="text-sm underline truncate">{coach.email}</a>
                  </div>
                )}

                {coach.phone && (
                  <div className="flex items-center gap-2" data-testid={`text-coach-phone-${coach.id}`}>
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${coach.phone}`} className="text-sm underline">{coach.phone}</a>
                  </div>
                )}

                {coach.bio && (
                  <div data-testid={`text-coach-bio-${coach.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-3">{coach.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

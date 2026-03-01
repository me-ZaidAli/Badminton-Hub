import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Award, Search, Star, GraduationCap } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface CityData {
  count: number;
  latitude: string;
  longitude: string;
}

interface CoachCountsResponse {
  totalCoaches: number;
  byCityOrArea: Record<string, CityData>;
}

function CoachMap({
  cities,
  className = "",
}: {
  cities: { name: string; count: number; lat: number; lng: number }[];
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([53.0, -1.5], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    cities.forEach((city) => {
      if (!isNaN(city.lat) && !isNaN(city.lng)) {
        const marker = L.marker([city.lat, city.lng]).addTo(mapInstanceRef.current!);

        const container = document.createElement("div");
        container.style.minWidth = "140px";

        const nameEl = document.createElement("strong");
        nameEl.textContent = city.name;
        nameEl.style.fontSize = "14px";
        container.appendChild(nameEl);

        container.appendChild(document.createElement("br"));
        const countEl = document.createElement("span");
        countEl.style.color = "#555";
        countEl.style.fontSize = "12px";
        countEl.textContent = `${city.count} coach${city.count !== 1 ? "es" : ""} available`;
        container.appendChild(countEl);

        const gmapsUrl = `https://www.google.com/maps?q=${city.lat},${city.lng}`;
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
      }
    });

    if (cities.length > 0) {
      const validCities = cities.filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
      if (validCities.length > 0) {
        const bounds = L.latLngBounds(validCities.map((c) => [c.lat, c.lng]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [cities]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full min-h-[300px] rounded-md ${className}`}
      data-testid="map-coaches"
    />
  );
}

export default function ExploreCoaches() {
  const [locationSearch, setLocationSearch] = useState("");

  const { data, isLoading } = useQuery<CoachCountsResponse>({
    queryKey: ["/api/public/coach-counts"],
  });

  const cityEntries = useMemo(() => {
    if (!data?.byCityOrArea) return [];
    return Object.entries(data.byCityOrArea).map(([name, info]) => ({
      name,
      count: info.count,
      lat: parseFloat(info.latitude),
      lng: parseFloat(info.longitude),
    }));
  }, [data]);

  const filteredCities = useMemo(() => {
    if (!locationSearch.trim()) return cityEntries;
    const query = locationSearch.toLowerCase();
    return cityEntries.filter((city) => city.name.toLowerCase().includes(query));
  }, [cityEntries, locationSearch]);

  const totalCoaches = data?.totalCoaches ?? 0;

  return (
    <PublicLayout>
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5" data-testid="section-hero-coaches">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4" data-testid="text-hero-title">
            Find a Coach
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Browse qualified coaches in your area and take your game to the next level.
          </p>
          {!isLoading && (
            <Badge variant="secondary" className="text-sm" data-testid="badge-total-coaches">
              <Users className="w-4 h-4 mr-1" />
              {totalCoaches} coach{totalCoaches !== 1 ? "es" : ""} available
            </Badge>
          )}
        </div>
      </section>

      <section className="py-10" data-testid="section-search-coaches">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by city or area..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-coaches"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="grid lg:grid-cols-2 gap-6 mb-10">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Coaches by Area
                  </h2>
                  {filteredCities.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>{locationSearch ? "No areas found matching your search." : "No coach locations available yet."}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {filteredCities.map((city) => (
                        <Card key={city.name} className="hover-elevate" data-testid={`card-city-${city.name.toLowerCase().replace(/\s+/g, "-")}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-semibold truncate">{city.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {city.count} coach{city.count !== 1 ? "es" : ""}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" data-testid={`badge-count-${city.name.toLowerCase().replace(/\s+/g, "-")}`}>
                                <Users className="w-3 h-3 mr-1" />
                                {city.count}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Card className="overflow-visible">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Coach Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[400px] rounded-b-md overflow-hidden">
                      <CoachMap cities={filteredCities} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="section-cta-membership">
                <CardContent className="py-10 text-center">
                  <Award className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold mb-3">
                    Unlock Full Coach Profiles
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                    Sign up for a Club Master membership at just £10/month to view full coach details,
                    qualifications, availability, and contact information.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/register">
                      <Button size="lg" data-testid="button-signup-cta">
                        Sign Up Now
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline" size="lg" data-testid="button-signin-cta">
                        Already a member? Sign In
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

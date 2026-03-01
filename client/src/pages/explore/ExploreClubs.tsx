import { useState, useMemo } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClubMap } from "@/components/ui/club-map";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { ArrowRight, Users, MapPin, Search, List, Map as MapIcon, ExternalLink } from "lucide-react";

export default function ExploreClubs() {
  const { data: clubs, isLoading } = useClubs();
  const { data: user } = useUser();
  const [clubSearch, setClubSearch] = useState("");
  const [clubViewMode, setClubViewMode] = useState<"list" | "map">("list");

  const filteredClubs = useMemo(() => {
    if (!clubs) return [];
    const query = clubSearch.toLowerCase();
    return clubs.filter(club =>
      club.name.toLowerCase().includes(query) ||
      club.description?.toLowerCase().includes(query) ||
      club.city?.toLowerCase().includes(query) ||
      club.postcode?.toLowerCase().includes(query) ||
      club.address?.toLowerCase().includes(query)
    );
  }, [clubs, clubSearch]);

  const clubsWithLocation = filteredClubs.filter(c => c.latitude && c.longitude);

  return (
    <PublicLayout>
      <section className="py-12" data-testid="section-explore-clubs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Find a Club</h1>
            <p className="text-muted-foreground text-lg">Browse clubs near you</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by city, postcode, or club name..."
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-clubs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={clubViewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setClubViewMode("list")}
                data-testid="button-clubs-list-view"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={clubViewMode === "map" ? "default" : "outline"}
                size="icon"
                onClick={() => setClubViewMode("map")}
                data-testid="button-clubs-map-view"
              >
                <MapIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : clubViewMode === "map" ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredClubs.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No clubs found matching your search.
                    </CardContent>
                  </Card>
                ) : (
                  filteredClubs.map(club => (
                    <Card key={club.id} className="hover-elevate" data-testid={`club-card-${club.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{club.name}</h3>
                            {club.address && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{club.address}</span>
                              </div>
                            )}
                            {(club.city || club.postcode) && (
                              <div className="text-xs text-muted-foreground mt-0.5 ml-4">
                                {[club.city, club.postcode].filter(Boolean).join(", ")}
                              </div>
                            )}
                            {(club as any).sportTypes && (club as any).sportTypes.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {((club as any).sportTypes as string[]).map((sport: string) => {
                                  const labels: Record<string, string> = { badminton: "Badminton", tennis: "Tennis", padel: "Padel", squash: "Squash", table_tennis: "Table Tennis", other: "Other" };
                                  const colors: Record<string, string> = { badminton: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", tennis: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", padel: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", squash: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", table_tennis: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };
                                  return (
                                    <Badge key={sport} variant="secondary" className={`text-xs ${colors[sport] || ""} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-sport-${sport}`}>
                                      {labels[sport] || sport}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                            {(club.googleMapsUrl || (club.latitude && club.longitude)) && (
                              <a href={club.googleMapsUrl || `https://www.google.com/maps?q=${club.latitude},${club.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground underline mt-1" data-testid={`link-google-maps-map-${club.id}`}>
                                <ExternalLink className="w-3 h-3" />
                                Google Maps
                              </a>
                            )}
                          </div>
                          <Link href={user ? `/join-club/${club.id}` : "/login"}>
                            <Button size="sm" variant="outline" data-testid={`button-join-club-${club.id}`}>Join</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <ClubMap clubs={clubsWithLocation} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{clubSearch ? "No clubs found matching your search." : "No clubs available yet."}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredClubs.map(club => (
                  <Card key={club.id} className="hover-elevate" data-testid={`club-card-${club.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{club.name}</CardTitle>
                          <CardDescription className="mt-1 space-y-0.5">
                            {club.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{club.address}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs">
                              {!club.address && <MapPin className="w-3 h-3 flex-shrink-0" />}
                              <span className="truncate">
                                {club.city || club.postcode
                                  ? [club.city, club.postcode].filter(Boolean).join(", ")
                                  : "Location TBD"
                                }
                              </span>
                            </span>
                          </CardDescription>
                        </div>
                        {club.latitude && club.longitude && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            <MapPin className="w-3 h-3 mr-1" /> On Map
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(club as any).sportTypes && (club as any).sportTypes.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {((club as any).sportTypes as string[]).map((sport: string) => {
                            const labels: Record<string, string> = { badminton: "Badminton", tennis: "Tennis", padel: "Padel", squash: "Squash", table_tennis: "Table Tennis", other: "Other" };
                            const colors: Record<string, string> = { badminton: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", tennis: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", padel: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", squash: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", table_tennis: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };
                            return (
                              <Badge key={sport} variant="secondary" className={`text-xs ${colors[sport] || ""} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-sport-${sport}`}>
                                {labels[sport] || sport}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {club.description || "A great place to play and meet fellow players."}
                      </p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          {(club.googleMapsUrl || (club.latitude && club.longitude)) && (
                            <a href={club.googleMapsUrl || `https://www.google.com/maps?q=${club.latitude},${club.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground underline" data-testid={`link-google-maps-${club.id}`}>
                              <ExternalLink className="w-3 h-3" />
                              Google Maps
                            </a>
                          )}
                        </div>
                        <Link href={user ? `/join-club/${club.id}` : "/login"}>
                          <Button size="sm" variant="outline" data-testid={`button-join-club-${club.id}`}>
                            Join <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClubMap } from "@/components/ui/club-map";
import { Users, MapPin, Search, Plus, ArrowRight, List, Map } from "lucide-react";

export default function Clubs() {
  const { data: user } = useUser();
  const { data: clubs, isLoading } = useClubs();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const filteredClubs = clubs?.filter(club => {
    const query = searchQuery.toLowerCase();
    return (
      club.name.toLowerCase().includes(query) ||
      club.description?.toLowerCase().includes(query) ||
      club.city?.toLowerCase().includes(query) ||
      club.postcode?.toLowerCase().includes(query) ||
      club.address?.toLowerCase().includes(query)
    );
  }) || [];

  const clubsWithLocation = filteredClubs.filter(c => c.latitude && c.longitude);

  return (
    <div className="min-h-screen bg-background">
      {!user && (
        <header className="border-b bg-card px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">Badminton Management</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </header>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader 
          title="Browse Clubs" 
          description="Find a badminton club near you by searching city, postcode, or club name."
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by city, postcode, or club name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clubs"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "map" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {user && (
            <Link href="/create-club">
              <Button data-testid="button-create-club">
                <Plus className="w-4 h-4 mr-2" />
                Create Club
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No clubs found matching your search." : "No clubs available yet."}
              </p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different city, postcode, or club name.
                </p>
              )}
              {user && !searchQuery && (
                <Link href="/create-club">
                  <Button className="mt-4">Create the First Club</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "map" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {filteredClubs.length} Club{filteredClubs.length !== 1 ? 's' : ''} Found
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredClubs.map(club => (
                  <Card key={club.id} className="hover-elevate" data-testid={`club-card-${club.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{club.name}</h3>
                          {(club.city || club.postcode) && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {[club.city, club.postcode].filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}
                          {club.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{club.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {club.latitude && club.longitude ? (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              On Map
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              No Location
                            </Badge>
                          )}
                          {user ? (
                            <Link href={`/clubs/${club.id}/join`}>
                              <Button size="sm" data-testid={`button-join-club-${club.id}`}>
                                View
                              </Button>
                            </Link>
                          ) : (
                            <Link href="/register">
                              <Button size="sm">Register</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Club Locations
                  </CardTitle>
                  <CardDescription>
                    {clubsWithLocation.length} club{clubsWithLocation.length !== 1 ? 's' : ''} shown on map
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <ClubMap clubs={clubsWithLocation} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => (
              <Card key={club.id} className="hover-elevate transition-all" data-testid={`club-card-${club.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{club.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {club.city || club.postcode 
                            ? [club.city, club.postcode].filter(Boolean).join(", ")
                            : club.slug
                          }
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {club.description || "A great place to play badminton and meet fellow players."}
                  </p>
                  {club.address && (
                    <p className="text-xs text-muted-foreground truncate">{club.address}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Open for members</span>
                    </div>
                    {user ? (
                      <Link href={`/clubs/${club.id}/join`}>
                        <Button size="sm" variant="outline" data-testid={`button-join-club-${club.id}`}>
                          Join
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/register">
                        <Button size="sm" variant="outline">
                          Register to Join
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

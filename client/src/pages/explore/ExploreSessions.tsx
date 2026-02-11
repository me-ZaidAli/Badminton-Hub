import { useState, useMemo } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, Users, Play, CheckCircle, Activity, Loader2, Building2, ChevronsUpDown, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExploreSessions() {
  const [sessionFilter, setSessionFilter] = useState<"all" | "live" | "upcoming" | "past">("all");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [clubComboboxOpen, setClubComboboxOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const { data: allSessions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/all-sessions"],
    refetchInterval: 10000,
    staleTime: 0,
  });

  const clubs = useMemo(() => {
    if (!allSessions) return [];
    const clubMap = new Map<number, string>();
    allSessions.forEach(s => clubMap.set(s.clubId, s.clubName));
    return Array.from(clubMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSessions]);

  const selectedClubLabel = useMemo(() => {
    if (clubFilter === "all") return "All Clubs";
    const club = clubs.find(c => c.id.toString() === clubFilter);
    return club?.name || "All Clubs";
  }, [clubFilter, clubs]);

  const liveSessions = useMemo(() => {
    return allSessions?.filter(s => s.liveMatchCount > 0) || [];
  }, [allSessions]);

  const baseFiltered = useMemo(() => {
    if (!allSessions) return [];
    let result = allSessions;
    if (clubFilter !== "all") {
      result = result.filter(s => s.clubId === Number(clubFilter));
    }
    if (locationSearch.trim()) {
      const search = locationSearch.trim().toLowerCase();
      result = result.filter(s => {
        const city = (s.clubCity || "").toLowerCase();
        const postcode = (s.clubPostcode || "").toLowerCase();
        const address = (s.clubAddress || "").toLowerCase();
        return city.includes(search) || postcode.includes(search) || address.includes(search);
      });
    }
    return result;
  }, [allSessions, clubFilter, locationSearch]);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const liveFiltered = useMemo(() =>
    baseFiltered.filter(s => s.liveMatchCount > 0 || s.status === "ACTIVE"),
    [baseFiltered]
  );

  const upcomingFiltered = useMemo(() =>
    baseFiltered.filter(s => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= now && s.status !== "ACTIVE" && s.status !== "COMPLETED" && s.status !== "CANCELLED";
    }),
    [baseFiltered, now]
  );

  const pastFiltered = useMemo(() =>
    baseFiltered.filter(s => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return (sessionDate < now || s.status === "COMPLETED") && !liveFiltered.some(ls => ls.id === s.id);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [baseFiltered, now, liveFiltered]
  );

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "live") return liveFiltered;
    if (sessionFilter === "upcoming") return upcomingFiltered;
    if (sessionFilter === "past") return pastFiltered;
    return [...liveFiltered, ...upcomingFiltered];
  }, [sessionFilter, liveFiltered, upcomingFiltered, pastFiltered]);

  return (
    <PublicLayout>
      <section className="py-12" data-testid="section-explore-sessions">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Club Sessions</h1>
            <p className="text-muted-foreground text-lg">Browse sessions from all clubs</p>
          </div>

          {liveSessions.length > 0 && (
            <div className="mb-10 p-6 rounded-xl bg-green-500/5 border border-green-500/20" data-testid="live-banner">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-green-600 animate-pulse" />
                <span className="font-semibold text-green-700 dark:text-green-400">
                  {liveSessions.length} session{liveSessions.length !== 1 ? "s" : ""} live now
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {liveSessions.map(session => (
                  <Link key={session.id} href={`/public/session/${session.id}`}>
                    <Card className="hover-elevate cursor-pointer border-green-500/30" data-testid={`live-session-link-${session.id}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                          <Play className="w-3 h-3 mr-1" /> Live
                        </Badge>
                        <span className="font-medium text-sm">{session.title}</span>
                        <span className="text-xs text-muted-foreground">{session.clubName}</span>
                        <span className="text-xs text-muted-foreground">{session.liveMatchCount} match{session.liveMatchCount !== 1 ? "es" : ""}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Popover open={clubComboboxOpen} onOpenChange={setClubComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clubComboboxOpen}
                    className="w-[250px] justify-between"
                    data-testid="combobox-club-filter"
                  >
                    {selectedClubLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command>
                    <CommandInput placeholder="Search clubs..." data-testid="input-club-search" />
                    <CommandList>
                      <CommandEmpty>No clubs found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => { setClubFilter("all"); setClubComboboxOpen(false); }}
                          data-testid="combobox-item-all-clubs"
                        >
                          <Check className={cn("mr-2 h-4 w-4", clubFilter === "all" ? "opacity-100" : "opacity-0")} />
                          All Clubs
                        </CommandItem>
                        {clubs.map(club => (
                          <CommandItem
                            key={club.id}
                            onSelect={() => { setClubFilter(club.id.toString()); setClubComboboxOpen(false); }}
                            data-testid={`combobox-item-club-${club.id}`}
                          >
                            <Check className={cn("mr-2 h-4 w-4", clubFilter === club.id.toString() ? "opacity-100" : "opacity-0")} />
                            {club.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div className="relative">
                <Input
                  placeholder="Search by location..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-[250px]"
                  data-testid="input-location-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={sessionFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("all")}
                data-testid="button-filter-all"
              >
                All ({liveFiltered.length + upcomingFiltered.length})
              </Button>
              {liveFiltered.length > 0 && (
                <Button
                  variant={sessionFilter === "live" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSessionFilter("live")}
                  data-testid="button-filter-live"
                >
                  <Play className="w-3 h-3 mr-1" /> Live ({liveFiltered.length})
                </Button>
              )}
              <Button
                variant={sessionFilter === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("upcoming")}
                data-testid="button-filter-upcoming"
              >
                <Calendar className="w-3 h-3 mr-1" /> Upcoming ({upcomingFiltered.length})
              </Button>
              <Button
                variant={sessionFilter === "past" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("past")}
                data-testid="button-filter-past"
              >
                <CheckCircle className="w-3 h-3 mr-1" /> Past ({pastFiltered.length})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No sessions found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map(session => (
                <Link key={session.id} href={`/public/session/${session.id}`}>
                  <Card className="h-full hover-elevate cursor-pointer" data-testid={`session-card-${session.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base truncate">{session.title}</CardTitle>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {session.liveMatchCount > 0 && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                              <Play className="w-3 h-3 mr-1" /> Live
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{session.matchMode}</Badge>
                        </div>
                      </div>
                      <CardDescription>
                        <Badge variant="secondary" className="text-xs mr-2">{session.clubName}</Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(session.date), "EEE, MMM d")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {session.startTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          {session.signupCount} / {session.maxPlayers} players
                        </span>
                        <span className="text-muted-foreground">{session.courtsAvailable} courts</span>
                      </div>
                      {session.playerLevels && session.playerLevels.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1" data-testid={`player-levels-${session.id}`}>
                          {session.playerLevels.map((level: string) => (
                            <Badge key={level} variant="outline" className="text-xs" data-testid={`badge-level-${level.toLowerCase()}-${session.id}`}>
                              {level}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(session.completedMatchCount > 0 || session.queuedMatchCount > 0) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/30">
                          {session.completedMatchCount > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {session.completedMatchCount} completed
                            </span>
                          )}
                          {session.queuedMatchCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {session.queuedMatchCount} queued
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

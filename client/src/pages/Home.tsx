import { Link } from "wouter";
import logoPath from "@assets/image_1770381062912.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubMap } from "@/components/ui/club-map";
import { ArrowRight, Trophy, Users, Calendar, Clock, MapPin, Search, Play, CheckCircle, List, Map as MapIcon, Loader2, Activity } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useLeaderboard } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";

export default function Home() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [clubSearch, setClubSearch] = useState("");
  const [clubViewMode, setClubViewMode] = useState<"list" | "map">("list");
  const [sessionFilter, setSessionFilter] = useState<"all" | "live" | "upcoming">("all");

  useEffect(() => {
    if (clubs?.length && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);

  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(selectedClubId);
  const topPlayers = leaderboard?.slice(0, 10) || [];

  const { data: allSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/public/all-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/public/all-sessions");
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    refetchInterval: 15000,
  });

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

  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];
    if (sessionFilter === "live") return allSessions.filter(s => s.liveMatchCount > 0 || s.status === "LIVE");
    if (sessionFilter === "upcoming") return allSessions.filter(s => s.status === "UPCOMING");
    return allSessions;
  }, [allSessions, sessionFilter]);

  const liveSessions = useMemo(() => {
    return allSessions?.filter(s => s.liveMatchCount > 0) || [];
  }, [allSessions]);

  if (user) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="Club Master" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">Club Master</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#clubs" className="hover:text-foreground transition-colors" data-testid="nav-clubs">Clubs</a>
            <a href="#sessions" className="hover:text-foreground transition-colors" data-testid="nav-sessions">Sessions</a>
            <a href="#live" className="hover:text-foreground transition-colors" data-testid="nav-live">Live</a>
            <a href="#leaderboard" className="hover:text-foreground transition-colors" data-testid="nav-leaderboard">Leaderboard</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium" data-testid="button-sign-in">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="font-bold shadow-lg shadow-primary/20" data-testid="button-join">Join Club</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 lg:py-28 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Elevate Your <span className="text-gradient">Badminton</span> Game
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              Find clubs, watch live matches, track rankings, and join sessions - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/register">
                <Button size="lg" className="rounded-full" data-testid="button-get-started">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-primary" data-testid="stat-clubs">{clubs?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Active Clubs</div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-primary" data-testid="stat-sessions">{allSessions?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Sessions</div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-green-600" data-testid="stat-live">{liveSessions.length}</div>
                <div className="text-sm text-muted-foreground">Live Now</div>
              </div>
              <div className="p-4 rounded-xl bg-card border border-border/50">
                <div className="text-2xl font-bold text-primary" data-testid="stat-players">{topPlayers.length > 0 ? "100+" : "0"}</div>
                <div className="text-sm text-muted-foreground">Players</div>
              </div>
            </div>
          </div>
        </section>

        {/* Clubs Section */}
        <section id="clubs" className="py-16 bg-muted/30" data-testid="section-clubs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Find a Club</h2>
              <p className="text-muted-foreground text-lg">Browse badminton clubs near you</p>
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

            {clubViewMode === "map" ? (
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
                      <Card key={club.id} className="hover-elevate" data-testid={`home-club-card-${club.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{club.name}</h3>
                              {(club.city || club.postcode) && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{[club.city, club.postcode].filter(Boolean).join(", ")}</span>
                                </div>
                              )}
                              {club.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{club.description}</p>
                              )}
                            </div>
                            <Link href={`/clubs`}>
                              <Button size="sm" variant="outline" data-testid={`button-view-club-${club.id}`}>View</Button>
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
                    <Card key={club.id} className="hover-elevate" data-testid={`home-club-card-${club.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-lg truncate">{club.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {club.city || club.postcode
                                  ? [club.city, club.postcode].filter(Boolean).join(", ")
                                  : "Location TBD"
                                }
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
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {club.description || "A great place to play badminton and meet fellow players."}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>Open for members</span>
                          </div>
                          <Link href="/register">
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

        {/* Live Sessions Section */}
        {liveSessions.length > 0 && (
          <section id="live" className="py-16 bg-green-500/5 border-y border-green-500/10" data-testid="section-live">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-2 rounded-full mb-4">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-semibold">Live Now</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Matches in Progress</h2>
                <p className="text-muted-foreground text-lg">Watch who's playing right now</p>
              </div>

              <div className="space-y-8">
                {liveSessions.map(session => (
                  <div key={session.id} data-testid={`live-session-${session.id}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                        {session.clubName}
                      </Badge>
                      <Link href={`/public/session/${session.id}`}>
                        <span className="font-semibold hover:text-primary transition-colors cursor-pointer" data-testid={`link-live-session-${session.id}`}>
                          {session.title}
                        </span>
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {session.signupCount} players
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {session.liveMatches.map((match: any) => (
                        <Card key={match.id} className="overflow-hidden border-green-500/30" data-testid={`live-match-${match.id}`}>
                          <div className="bg-green-500/10 px-3 py-1.5 flex items-center justify-between">
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                              <Play className="w-3 h-3 mr-1" /> Court {match.courtNumber}
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm min-w-0 flex-1">
                                <p className="font-medium truncate">{match.teamAPlayer1?.fullName}</p>
                                {match.teamAPlayer2 && <p className="text-xs text-muted-foreground truncate">{match.teamAPlayer2?.fullName}</p>}
                              </div>
                              <div className="text-center px-3">
                                <div className="font-bold text-lg font-mono">
                                  {match.scoreA ?? 0} - {match.scoreB ?? 0}
                                </div>
                              </div>
                              <div className="text-sm min-w-0 flex-1 text-right">
                                <p className="font-medium truncate">{match.teamBPlayer1?.fullName}</p>
                                {match.teamBPlayer2 && <p className="text-xs text-muted-foreground truncate">{match.teamBPlayer2?.fullName}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Queued matches for this session */}
                    {session.queuedMatches.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Up Next
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {session.queuedMatches.map((match: any) => (
                            <div key={match.id} className="text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/50" data-testid={`queued-match-${match.id}`}>
                              <span className="font-medium">{match.teamAPlayer1?.fullName}</span>
                              {match.teamAPlayer2 && <span className="text-muted-foreground"> & {match.teamAPlayer2?.fullName}</span>}
                              <span className="mx-2 text-muted-foreground">vs</span>
                              <span className="font-medium">{match.teamBPlayer1?.fullName}</span>
                              {match.teamBPlayer2 && <span className="text-muted-foreground"> & {match.teamBPlayer2?.fullName}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent results for this session */}
                    {session.recentResults.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Recent Results
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {session.recentResults.map((match: any) => (
                            <div key={match.id} className="text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/50 flex items-center gap-2" data-testid={`result-match-${match.id}`}>
                              <span className="font-medium">{match.teamAPlayer1?.fullName}</span>
                              <Badge variant={(match.scoreA || 0) > (match.scoreB || 0) ? "default" : "secondary"} className="font-mono text-xs">
                                {match.scoreA} - {match.scoreB}
                              </Badge>
                              <span className="font-medium">{match.teamBPlayer1?.fullName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Sessions Section */}
        <section id="sessions" className="py-16" data-testid="section-sessions">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">All Sessions</h2>
              <p className="text-muted-foreground text-lg">Browse sessions from all clubs</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              <Button
                variant={sessionFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("all")}
                data-testid="button-filter-all"
              >
                All ({allSessions?.length || 0})
              </Button>
              <Button
                variant={sessionFilter === "live" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("live")}
                data-testid="button-filter-live"
              >
                <Play className="w-3 h-3 mr-1" /> Live ({liveSessions.length})
              </Button>
              <Button
                variant={sessionFilter === "upcoming" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("upcoming")}
                data-testid="button-filter-upcoming"
              >
                <Calendar className="w-3 h-3 mr-1" /> Upcoming
              </Button>
            </div>

            {sessionsLoading ? (
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

        {/* Leaderboard Section */}
        <section id="leaderboard" className="py-16 bg-muted/30" data-testid="section-leaderboard">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Club Leaderboard</h2>
              <p className="text-muted-foreground text-lg">See how players are ranked</p>
            </div>

            {clubs && clubs.length > 0 && (
              <div className="flex justify-center mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {clubs.map(club => (
                    <Button
                      key={club.id}
                      variant={selectedClubId === club.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedClubId(club.id)}
                      data-testid={`button-leaderboard-club-${club.id}`}
                    >
                      {club.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Card className="overflow-hidden border-border/50" data-testid="card-public-leaderboard">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Players
                </CardTitle>
                <CardDescription>Ranked by points earned through matches</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-green-600 p-6 min-h-[350px]">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[2px] h-full bg-white/30" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30 pointer-events-none" />
                  <div className="absolute top-2 bottom-2 left-2 right-2 border-2 border-white/40 pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center gap-2 py-4">
                    {leaderboardLoading ? (
                      <div className="text-white/80 text-sm py-8 flex items-center gap-2">
                        <Loader2 className="animate-spin w-4 h-4" /> Loading leaderboard...
                      </div>
                    ) : topPlayers.length > 0 ? (
                      topPlayers.map((player, index) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 bg-background/95 rounded-lg px-4 py-2 shadow-lg w-full max-w-md"
                          data-testid={`public-leaderboard-player-${player.id}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? "bg-amber-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                            index === 2 ? "bg-amber-700 text-white" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{player.fullName}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">{player.category || "D"}</Badge>
                              <span>{player.matchesWon}W / {player.matchesPlayed}P</span>
                            </div>
                          </div>
                          <div className="text-right font-bold text-primary">{player.rankingPoints}</div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-background/90 rounded-lg px-6 py-8 text-center">
                        <p className="text-muted-foreground">No players ranked yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Players start at 0 points and earn rankings through matches</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Why Club Master?</h2>
              <p className="text-muted-foreground text-lg">Everything you need for your badminton club</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={Calendar}
                title="Smart Scheduling"
                description="Book sessions, manage attendance, and automate court allocation effortlessly."
              />
              <FeatureCard
                icon={Trophy}
                title="Live Rankings"
                description="Track your performance with competitive rankings and detailed match statistics."
              />
              <FeatureCard
                icon={Users}
                title="Club Community"
                description="Connect with players, find partners, and manage membership across multiple clubs."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-display font-bold mb-4">Ready to Play?</h2>
            <p className="text-muted-foreground text-lg mb-8">Join Club Master and start tracking your badminton journey today.</p>
            <Link href="/register">
              <Button size="lg" className="rounded-full" data-testid="button-cta-register">
                Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border text-center text-muted-foreground text-sm">
        <p>Club Master - Badminton Club Management Platform</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="p-6">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

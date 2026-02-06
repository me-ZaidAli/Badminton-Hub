import { useState, useMemo } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, Users, Play, CheckCircle, Activity, Loader2, Building2 } from "lucide-react";

export default function ExploreSessions() {
  const [sessionFilter, setSessionFilter] = useState<"all" | "live" | "upcoming">("all");
  const [clubFilter, setClubFilter] = useState<string>("all");

  const { data: allSessions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/all-sessions"],
    refetchInterval: 15000,
  });

  const clubs = useMemo(() => {
    if (!allSessions) return [];
    const clubMap = new Map<number, string>();
    allSessions.forEach(s => clubMap.set(s.clubId, s.clubName));
    return Array.from(clubMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allSessions]);

  const liveSessions = useMemo(() => {
    return allSessions?.filter(s => s.liveMatchCount > 0) || [];
  }, [allSessions]);

  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];
    let result = allSessions;
    if (clubFilter !== "all") {
      result = result.filter(s => s.clubId === Number(clubFilter));
    }
    if (sessionFilter === "live") return result.filter(s => s.liveMatchCount > 0 || s.status === "LIVE");
    if (sessionFilter === "upcoming") return result.filter(s => s.status === "UPCOMING");
    return result;
  }, [allSessions, sessionFilter, clubFilter]);

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
              <Select value={clubFilter} onValueChange={setClubFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubs.map(club => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={sessionFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("all")}
                data-testid="button-filter-all"
              >
                All ({filteredSessions.length})
              </Button>
              <Button
                variant={sessionFilter === "live" ? "default" : "outline"}
                size="sm"
                onClick={() => setSessionFilter("live")}
                data-testid="button-filter-live"
              >
                <Play className="w-3 h-3 mr-1" /> Live
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

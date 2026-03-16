import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isAfter, startOfToday } from "date-fns";
import {
  MapPin, Clock, Users, Calendar, Filter, Search,
  ChevronRight, Loader2, Trophy, Zap, Building
} from "lucide-react";

interface PublicSession {
  id: number;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxPlayers: number;
  signupCount: number;
  allowedCategories: string[];
  status: string;
  sessionType: string;
  clubName: string;
  clubCity: string | null;
  clubPostcode: string | null;
  matchMode: string;
  hallName: string | null;
  courtNames: string[] | null;
}

const SKILL_LABELS: Record<string, string> = {
  A1: "Advanced 1",
  A2: "Advanced 2",
  A3: "Advanced 3",
  B1: "Intermediate 1",
  B2: "Intermediate 2",
  B3: "Intermediate 3",
  C1: "Improver 1",
  C2: "Improver 2",
  C3: "Improver 3",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getSkillColor(cat: string): string {
  if (cat.startsWith("A")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (cat.startsWith("B")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (cat.startsWith("C")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
}

function getHighestSkill(categories: string[]): string {
  const order = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
  for (const o of order) {
    if (categories.includes(o)) return o;
  }
  return categories[0] || "C3";
}

export default function PlaySessions() {
  const [cityFilter, setCityFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("all");
  const [spotsFilter, setSpotsFilter] = useState("all");

  const { data: sessions, isLoading } = useQuery<PublicSession[]>({
    queryKey: ["/api/public/play-sessions"],
    staleTime: 30000,
  });

  const cities = useMemo(() => {
    if (!sessions) return [];
    const citySet = new Set<string>();
    sessions.forEach(s => {
      if (s.clubCity) citySet.add(s.clubCity.trim());
    });
    return Array.from(citySet).sort();
  }, [sessions]);

  const skillCategories = useMemo(() => {
    if (!sessions) return [];
    const catSet = new Set<string>();
    sessions.forEach(s => {
      (s.allowedCategories || []).forEach(c => catSet.add(c));
    });
    const order = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
    return order.filter(o => catSet.has(o));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    let result = sessions;

    if (cityFilter !== "all") {
      result = result.filter(s => (s.clubCity || "").trim() === cityFilter);
    }

    if (dayFilter !== "all") {
      result = result.filter(s => {
        const d = parseISO(s.date);
        return d.getDay() === parseInt(dayFilter);
      });
    }

    if (skillFilter !== "all") {
      result = result.filter(s =>
        (s.allowedCategories || []).includes(skillFilter)
      );
    }

    if (spotsFilter === "available") {
      result = result.filter(s => s.maxPlayers - s.signupCount > 0);
    } else if (spotsFilter === "5plus") {
      result = result.filter(s => s.maxPlayers - s.signupCount >= 5);
    }

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, cityFilter, dayFilter, skillFilter, spotsFilter]);

  const activeFilters = [cityFilter, dayFilter, skillFilter, spotsFilter].filter(f => f !== "all").length;

  const seoCity = cityFilter !== "all" ? cityFilter : null;
  const pageTitle = seoCity
    ? `Badminton Sessions in ${seoCity} | Club Master`
    : "Find Badminton Sessions Near You | Club Master";
  const pageDescription = seoCity
    ? `Discover and join badminton sessions in ${seoCity}. Browse upcoming games, check skill levels, and find available spots.`
    : "Find badminton sessions near you. Browse clubs, filter by skill level, and join upcoming games today.";

  useEffect(() => {
    document.title = pageTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", pageDescription);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = pageDescription;
      document.head.appendChild(meta);
    }
  }, [pageTitle, pageDescription]);

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="bg-primary/5 border-b border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight" data-testid="text-play-heading">
                Find Your Next <span className="text-primary">Session</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground" data-testid="text-play-subtitle">
                {seoCity
                  ? `Browse badminton sessions in ${seoCity}. Filter by day, skill level, and availability.`
                  : "Discover badminton sessions near you. Filter by city, day, skill level, and available spots."}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card border border-border/60 rounded-xl p-4 sm:p-6 mb-8 shadow-sm" data-testid="filter-panel">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Filters</span>
              {activeFilters > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-active-filters">
                  {activeFilters} active
                </Badge>
              )}
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => {
                    setCityFilter("all");
                    setDayFilter("all");
                    setSkillFilter("all");
                    setSpotsFilter("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">City</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger data-testid="select-city-filter">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Day of Week</label>
                <Select value={dayFilter} onValueChange={setDayFilter}>
                  <SelectTrigger data-testid="select-day-filter">
                    <SelectValue placeholder="Any day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any day</SelectItem>
                    {DAY_NAMES.map((name, i) => (
                      <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Skill Level</label>
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger data-testid="select-skill-filter">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {skillCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {SKILL_LABELS[cat] || cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Available Spots</label>
                <Select value={spotsFilter} onValueChange={setSpotsFilter}>
                  <SelectTrigger data-testid="select-spots-filter">
                    <SelectValue placeholder="Any availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any availability</SelectItem>
                    <SelectItem value="available">Has spots available</SelectItem>
                    <SelectItem value="5plus">5+ spots available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20" data-testid="loading-sessions">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading sessions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20" data-testid="empty-sessions">
              <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more results.
              </p>
              {activeFilters > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCityFilter("all");
                    setDayFilter("all");
                    setSkillFilter("all");
                    setSpotsFilter("all");
                  }}
                  data-testid="button-clear-filters-empty"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground" data-testid="text-session-count">
                  {filtered.length} session{filtered.length !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="session-grid">
                {filtered.map(session => {
                  const sessionDate = parseISO(session.date);
                  const dayName = DAY_NAMES[sessionDate.getDay()];
                  const spotsLeft = Math.max(0, session.maxPlayers - session.signupCount);
                  const isFull = spotsLeft === 0;
                  const isUpcoming = isAfter(sessionDate, startOfToday());
                  const highest = getHighestSkill(session.allowedCategories || []);

                  return (
                    <Card
                      key={session.id}
                      className="group overflow-hidden hover:shadow-md transition-shadow border-border/60"
                      data-testid={`card-session-${session.id}`}
                    >
                      <CardContent className="p-0">
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base truncate" data-testid={`text-session-title-${session.id}`}>
                                {session.title}
                              </h3>
                              <p className="text-sm text-primary font-medium mt-0.5" data-testid={`text-club-name-${session.id}`}>
                                {session.clubName}
                              </p>
                            </div>
                            {session.matchMode === "COMPETITIVE" && (
                              <Badge variant="outline" className="shrink-0 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400 text-xs">
                                <Trophy className="w-3 h-3 mr-1" />
                                Competitive
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4 shrink-0" />
                              <span data-testid={`text-session-date-${session.id}`}>
                                {dayName}, {format(sessionDate, "d MMM yyyy")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span data-testid={`text-session-time-${session.id}`}>
                                {session.startTime} · {session.durationMinutes} mins
                              </span>
                            </div>
                            {(session.hallName || (session.courtNames && session.courtNames.length > 0)) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="w-4 h-4 shrink-0" />
                                <span data-testid={`text-session-venue-${session.id}`}>
                                  {[session.hallName, session.courtNames?.join(", ")].filter(Boolean).join(" · ")}
                                </span>
                              </div>
                            )}
                            {session.clubCity && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span data-testid={`text-session-city-${session.id}`}>
                                  {session.clubCity}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mb-4">
                            {(session.allowedCategories || []).filter(cat => !["A", "B", "C", "D"].includes(cat)).slice(0, 4).map(cat => (
                              <span
                                key={cat}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSkillColor(cat)}`}
                              >
                                {SKILL_LABELS[cat] || cat}
                              </span>
                            ))}
                            {(session.allowedCategories || []).length > 4 && (
                              <span className="text-xs text-muted-foreground">
                                +{(session.allowedCategories || []).length - 4} more
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span
                                className={`text-sm font-medium ${
                                  isFull
                                    ? "text-red-500"
                                    : spotsLeft <= 3
                                    ? "text-orange-500"
                                    : "text-green-600 dark:text-green-400"
                                }`}
                                data-testid={`text-spots-${session.id}`}
                              >
                                {isFull ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                              </span>
                            </div>

                            {isUpcoming && !isFull ? (
                              <Link href="/register">
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  data-testid={`button-join-${session.id}`}
                                >
                                  Join
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </Link>
                            ) : isUpcoming && isFull ? (
                              <Badge variant="secondary" className="text-xs">Full</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Completed</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-primary/5 border-t border-primary/10 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="text-2xl font-bold mb-3">Ready to Play?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Create a free account to join sessions, track your progress, and connect with other players.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-cta-register">
                <Zap className="w-4 h-4" />
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
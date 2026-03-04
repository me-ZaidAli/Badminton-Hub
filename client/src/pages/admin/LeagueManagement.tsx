import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Pencil, Trash2, Users, Trophy, Calendar, MapPin,
  Lock, Unlock, Shield, Search, ChevronDown, ChevronUp, Swords, BarChart3,
  Home, Building, Navigation, Star, ChevronLeft, ChevronRight, UserPlus, Check, X, HelpCircle,
  Send, ClipboardList
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  if (status === "LIVE") return <Badge className="bg-red-500 text-white">LIVE</Badge>;
  if (status === "COMPLETED") return <Badge variant="secondary">COMPLETED</Badge>;
  return <Badge variant="outline" className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">UPCOMING</Badge>;
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    MENS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    LADIES: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    MIXED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return <Badge className={colors[category] || ""}>{category}</Badge>;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "WIN") return <Badge className="bg-green-600 text-white text-xs">WIN</Badge>;
  if (outcome === "LOSS") return <Badge className="bg-red-600 text-white text-xs">LOSS</Badge>;
  return <Badge className="bg-yellow-600 text-white text-xs">DRAW</Badge>;
}

export default function LeagueManagement() {
  const { data: user } = useUser();
  const { data: adminClubs, isLoading: clubsLoading } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("fixtures");
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignMatchId, setAssignMatchId] = useState<number | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultMatchId, setResultMatchId] = useState<number | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [leagueDialogOpen, setLeagueDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<any>(null);
  const [filterLeagueId, setFilterLeagueId] = useState<string>("all");
  const [opponentDialogOpen, setOpponentDialogOpen] = useState(false);
  const [editingOpponent, setEditingOpponent] = useState<any>(null);

  const clubId = selectedClubId ? Number(selectedClubId) : (adminClubs?.[0]?.id || 0);

  const effectiveClubId = selectedClubId || String(adminClubs?.[0]?.id || "");

  const selectedClub = useMemo(() => {
    if (!adminClubs) return null;
    const id = Number(effectiveClubId);
    return adminClubs.find((c: any) => c.id === id) || null;
  }, [adminClubs, effectiveClubId]);

  const { data: allMatches, isLoading: matchesLoading } = useQuery<any[]>({
    queryKey: ["/api/league/matches", { clubId: effectiveClubId }],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/league/matches?clubId=${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: teams } = useQuery<any[]>({
    queryKey: ["/api/league/teams", { clubId: effectiveClubId }],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/league/teams?clubId=${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: leagues } = useQuery<any[]>({
    queryKey: ["/api/leagues", { clubId: effectiveClubId }],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/leagues?clubId=${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: clubMembers } = useQuery<any[]>({
    queryKey: ["/api/league/club-members", effectiveClubId],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/league/club-members/${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: squadPlayers } = useQuery<any[]>({
    queryKey: ["/api/league/squad", effectiveClubId],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/league/squad/${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: opponents } = useQuery<any[]>({
    queryKey: ["/api/league/opponents", { clubId: effectiveClubId }],
    queryFn: async () => {
      if (!effectiveClubId) return [];
      const res = await fetch(`/api/league/opponents?clubId=${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user && !!effectiveClubId,
  });

  const { data: homeVenues } = useQuery({
    queryKey: ["/api/club-home-venues", { clubId: effectiveClubId }],
    queryFn: async () => {
      const res = await fetch(`/api/club-home-venues?clubId=${effectiveClubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!effectiveClubId,
  });

  const filteredMatches = useMemo(() => {
    const raw = allMatches || [];
    if (filterLeagueId === "all") return raw;
    return raw.filter(m => m.leagueId === Number(filterLeagueId));
  }, [allMatches, filterLeagueId]);

  const matches = filteredMatches;
  const upcomingMatches = matches.filter(m => m.status !== "COMPLETED");
  const completedMatches = matches.filter(m => m.status === "COMPLETED");

  const stats = useMemo(() => {
    const wins = completedMatches.filter(m => m.result?.outcome === "WIN").length;
    const losses = completedMatches.filter(m => m.result?.outcome === "LOSS").length;
    const draws = completedMatches.filter(m => m.result?.outcome === "DRAW").length;
    return { total: matches.length, upcoming: upcomingMatches.length, wins, losses, draws, completed: completedMatches.length };
  }, [matches, upcomingMatches, completedMatches]);

  if (clubsLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-league-admin-title">League Management</h1>
          <p className="text-muted-foreground text-sm">Manage fixtures, teams, players, and results</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {adminClubs && adminClubs.length > 1 && (
            <Select value={effectiveClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-48" data-testid="select-admin-club">
                <SelectValue placeholder="Select Club" />
              </SelectTrigger>
              <SelectContent>
                {adminClubs.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterLeagueId} onValueChange={setFilterLeagueId}>
            <SelectTrigger className="w-44" data-testid="select-filter-league">
              <SelectValue placeholder="All Leagues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {(leagues || []).map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.name}{l.season ? ` (${l.season})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setEditingLeague(null); setLeagueDialogOpen(true); }} data-testid="button-add-league">
            <Plus className="h-4 w-4 mr-1" /> League
          </Button>
          <Button size="sm" onClick={() => { setEditingTeam(null); setTeamDialogOpen(true); }} data-testid="button-add-team">
            <Plus className="h-4 w-4 mr-1" /> Team
          </Button>
          <Button size="sm" onClick={() => { setEditingMatch(null); setMatchDialogOpen(true); }} data-testid="button-add-fixture">
            <Plus className="h-4 w-4 mr-1" /> Fixture
          </Button>
          <Button size="sm" onClick={() => { setEditingOpponent(null); setOpponentDialogOpen(true); }} data-testid="button-add-opponent">
            <Plus className="h-4 w-4 mr-1" /> Opponent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card data-testid="stat-total-fixtures">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-upcoming-fixtures">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-admin-wins">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-admin-losses">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
            <p className="text-xs text-muted-foreground">Losses</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-admin-draws">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.draws}</p>
            <p className="text-xs text-muted-foreground">Draws</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="relative flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => {
              const el = document.getElementById("league-tabs-scroll");
              if (el) el.scrollBy({ left: -150, behavior: "smooth" });
            }}
            data-testid="button-tabs-scroll-left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <TabsList id="league-tabs-scroll" className="flex flex-1 overflow-x-auto no-scrollbar scroll-smooth" data-testid="admin-league-tabs">
            <TabsTrigger value="fixtures" className="flex-shrink-0">Fixtures</TabsTrigger>
            <TabsTrigger value="results" className="flex-shrink-0">Results</TabsTrigger>
            <TabsTrigger value="squad" className="flex-shrink-0">Squad</TabsTrigger>
            <TabsTrigger value="teams" className="flex-shrink-0">Teams</TabsTrigger>
            <TabsTrigger value="leagues" className="flex-shrink-0">Leagues</TabsTrigger>
            <TabsTrigger value="opponents" className="flex-shrink-0">Opponents</TabsTrigger>
            <TabsTrigger value="homevenue" className="flex-shrink-0 whitespace-nowrap">Home Venue</TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => {
              const el = document.getElementById("league-tabs-scroll");
              if (el) el.scrollBy({ left: 150, behavior: "smooth" });
            }}
            data-testid="button-tabs-scroll-right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="fixtures" className="mt-4">
          <FixturesTable
            matches={upcomingMatches}
            loading={matchesLoading}
            onEdit={(m: any) => { setEditingMatch(m); setMatchDialogOpen(true); }}
            onAssign={(id: number) => { setAssignMatchId(id); setAssignDialogOpen(true); }}
            onResult={(id: number) => { setResultMatchId(id); setResultDialogOpen(true); }}
            onDelete={async (id: number) => {
              try {
                await apiRequest("DELETE", `/api/league/matches/${id}`);
                queryClient.invalidateQueries({ queryKey: ["/api/league/matches"] });
                toast({ title: "Fixture deleted" });
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <ResultsTable
            matches={completedMatches}
            loading={matchesLoading}
            onResult={(id: number) => { setResultMatchId(id); setResultDialogOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="squad" className="mt-4">
          <SquadTab
            clubId={Number(effectiveClubId)}
            squadPlayers={squadPlayers || []}
            clubMembers={clubMembers || []}
            matches={upcomingMatches}
          />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <TeamsTable
            teams={teams || []}
            onEdit={(t: any) => { setEditingTeam(t); setTeamDialogOpen(true); }}
            onDelete={async (id: number) => {
              try {
                await apiRequest("DELETE", `/api/league/teams/${id}`);
                queryClient.invalidateQueries({ queryKey: ["/api/league/teams"] });
                toast({ title: "Team deleted" });
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="leagues" className="mt-4">
          <LeaguesTable
            leagues={leagues || []}
            onEdit={(l: any) => { setEditingLeague(l); setLeagueDialogOpen(true); }}
            onDelete={async (id: number) => {
              try {
                await apiRequest("DELETE", `/api/leagues/${id}`);
                queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
                toast({ title: "League deleted" });
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="opponents" className="mt-4">
          <OpponentsTable
            opponents={opponents || []}
            onEdit={(o: any) => { setEditingOpponent(o); setOpponentDialogOpen(true); }}
            onDelete={async (id: number) => {
              try {
                await apiRequest("DELETE", `/api/league/opponents/${id}`);
                queryClient.invalidateQueries({ queryKey: ["/api/league/opponents", { clubId: effectiveClubId }] });
                toast({ title: "Opponent deleted" });
              } catch (err: any) {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="homevenue" className="mt-4">
          <HomeVenueSettings
            clubId={Number(effectiveClubId)}
            homeVenues={homeVenues || []}
          />
        </TabsContent>
      </Tabs>

      <MatchDialog
        open={matchDialogOpen}
        onOpenChange={setMatchDialogOpen}
        match={editingMatch}
        clubId={Number(effectiveClubId)}
        teams={teams || []}
        leagues={leagues || []}
        opponents={opponents || []}
        clubData={selectedClub}
        homeVenues={homeVenues || []}
      />

      <AssignPlayersDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        matchId={assignMatchId}
        members={clubMembers || []}
        matches={matches}
      />

      <ResultDialog
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        matchId={resultMatchId}
        matches={matches}
      />

      <TeamDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        team={editingTeam}
        clubId={Number(effectiveClubId)}
      />

      <LeagueDialog
        open={leagueDialogOpen}
        onOpenChange={setLeagueDialogOpen}
        league={editingLeague}
        clubId={Number(effectiveClubId)}
      />

      <OpponentDialog
        open={opponentDialogOpen}
        onOpenChange={setOpponentDialogOpen}
        opponent={editingOpponent}
        clubId={Number(effectiveClubId)}
      />
    </div>
  );
}

function FixturesTable({ matches, loading, onEdit, onAssign, onResult, onDelete }: {
  matches: any[];
  loading: boolean;
  onEdit: (m: any) => void;
  onAssign: (id: number) => void;
  onResult: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  if (loading) return <div className="flex justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground" data-testid="text-no-fixtures">No upcoming fixtures</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map(m => (
        <Card key={m.id} data-testid={`fixture-row-${m.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <StatusBadge status={m.status} />
                  <CategoryBadge category={m.category} />
                  {m.division && <Badge variant="outline" className="text-xs">{m.division}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{m.clubName}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span>{m.opponentClub}</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(m.matchDatetime), "dd MMM yyyy HH:mm")}
                  </span>
                  {m.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {m.venue}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {m.players?.length || 0} players
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => onAssign(m.id)} data-testid={`button-assign-${m.id}`}>
                  <Users className="h-3.5 w-3.5 mr-1" /> Assign
                </Button>
                <Button variant="outline" size="sm" onClick={() => onResult(m.id)} data-testid={`button-result-${m.id}`}>
                  <Trophy className="h-3.5 w-3.5 mr-1" /> Result
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(m)} data-testid={`button-edit-${m.id}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(m.id)} data-testid={`button-delete-${m.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {m.players && m.players.length > 0 && (() => {
              const pairGroups: Record<string, any[]> = {};
              const reserves: any[] = [];
              for (const p of m.players) {
                if (!p.position || p.position === "") {
                  // skip unassigned
                } else if (p.position === "Reserve") {
                  reserves.push(p);
                } else {
                  if (!pairGroups[p.position]) pairGroups[p.position] = [];
                  pairGroups[p.position].push(p);
                }
              }
              const sortedPairs = Object.entries(pairGroups).sort(([a], [b]) => a.localeCompare(b));
              if (sortedPairs.length === 0 && reserves.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-border/50" data-testid={`pairs-display-${m.id}`}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Selected Pairs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortedPairs.map(([label, players]) => (
                      <div key={label} className="bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs" data-testid={`pair-group-${label.replace(/\s/g, "-")}-${m.id}`}>
                        <span className="font-semibold text-primary">{label}:</span>{" "}
                        {players.map((p: any, i: number) => (
                          <span key={p.userId}>
                            {i > 0 && " & "}
                            <span className="text-foreground">{p.userName || "Unknown"}</span>
                          </span>
                        ))}
                      </div>
                    ))}
                    {reserves.length > 0 && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5 text-xs" data-testid={`pair-group-Reserve-${m.id}`}>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">Reserve:</span>{" "}
                        {reserves.map((p: any, i: number) => (
                          <span key={p.userId}>
                            {i > 0 && ", "}
                            <span className="text-foreground">{p.userName || "Unknown"}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResultsTable({ matches, loading, onResult }: { matches: any[]; loading: boolean; onResult: (id: number) => void }) {
  if (loading) return <div className="flex justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No results yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map(m => (
        <Card key={m.id} data-testid={`result-row-${m.id}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <CategoryBadge category={m.category} />
                  {m.division && <Badge variant="outline" className="text-xs">{m.division}</Badge>}
                  {m.result && <OutcomeBadge outcome={m.result.outcome} />}
                  {m.result?.locked && <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-0.5" /> Locked</Badge>}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold">{m.clubName}</span>
                  {m.result && (
                    <span className="font-bold text-lg tabular-nums">
                      {m.result.dragonScore} - {m.result.opponentScore}
                    </span>
                  )}
                  <span className="font-semibold">{m.opponentClub}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(m.matchDatetime), "dd MMM yyyy")} {m.venue ? `at ${m.venue}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onResult(m.id)} data-testid={`button-edit-result-${m.id}`}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TeamsTable({ teams, onEdit, onDelete }: { teams: any[]; onEdit: (t: any) => void; onDelete: (id: number) => void }) {
  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No teams created yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map(t => (
        <Card key={t.id} data-testid={`team-row-${t.id}`}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {t.division && `Division: ${t.division}`} {t.season && `| Season: ${t.season}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaguesTable({ leagues, onEdit, onDelete }: { leagues: any[]; onEdit: (l: any) => void; onDelete: (id: number) => void }) {
  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground" data-testid="text-no-leagues">No leagues created yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {leagues.map(l => (
        <Card key={l.id} data-testid={`league-row-${l.id}`}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm" data-testid={`text-league-name-${l.id}`}>{l.name}</p>
              <p className="text-xs text-muted-foreground" data-testid={`text-league-season-${l.id}`}>
                {l.season ? `Season: ${l.season}` : "No season specified"}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => onEdit(l)} data-testid={`button-edit-league-${l.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(l.id)} data-testid={`button-delete-league-${l.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OpponentsTable({ opponents, onEdit, onDelete }: { opponents: any[]; onEdit: (o: any) => void; onDelete: (id: number) => void }) {
  if (opponents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground" data-testid="text-no-opponents">No opponents added yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {opponents.map(o => (
        <Card key={o.id} data-testid={`opponent-row-${o.id}`}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" data-testid={`text-opponent-name-${o.id}`}>{o.name}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                {o.venueName && (
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    {o.venueName}
                  </span>
                )}
                {o.venueAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {o.venueAddress}
                  </span>
                )}
                {o.googleMapsUrl && (
                  <a href={o.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Navigation className="h-3 w-3" />
                    Map
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => onEdit(o)} data-testid={`button-edit-opponent-${o.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(o.id)} data-testid={`button-delete-opponent-${o.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HomeVenueDialog({ open, onOpenChange, venue, clubId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: any | null;
  clubId: number;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleOpen = () => {
    if (venue) {
      setName(venue.name || "");
      setAddress(venue.address || "");
      setGoogleMapsUrl(venue.googleMapsUrl || "");
      setIsDefault(!!venue.isDefault);
    } else {
      setName("");
      setAddress("");
      setGoogleMapsUrl("");
      setIsDefault(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (venue) {
        await apiRequest("PATCH", `/api/club-home-venues/${venue.id}`, {
          name, address, googleMapsUrl, isDefault,
        });
      } else {
        await apiRequest("POST", "/api/club-home-venues", {
          clubId, name, address, googleMapsUrl, isDefault,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/club-home-venues", { clubId }] });
      toast({ title: venue ? "Venue updated" : "Venue added" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle data-testid="text-home-venue-dialog-title">{venue ? "Edit Venue" : "Add Venue"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Venue Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Community Sports Centre" data-testid="input-home-venue-name" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" data-testid="input-home-venue-address" />
          </div>
          <div>
            <Label>Google Maps URL</Label>
            <Input value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." data-testid="input-home-google-maps-url" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-default-venue"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(!!checked)}
              data-testid="checkbox-default-venue"
            />
            <Label htmlFor="is-default-venue" className="cursor-pointer">Set as default venue</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name} data-testid="button-save-home-venue">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {venue ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HomeVenueSettings({ clubId, homeVenues }: { clubId: number; homeVenues: any[] }) {
  const { toast } = useToast();
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any>(null);

  const deleteMutation = useMutation({
    mutationFn: async (venueId: number) => {
      await apiRequest("DELETE", `/api/club-home-venues/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/club-home-venues", { clubId }] });
      toast({ title: "Venue deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-5 w-5" />
            Home Venues
          </CardTitle>
          <Button size="sm" onClick={() => { setEditingVenue(null); setVenueDialogOpen(true); }} data-testid="button-add-home-venue">
            <Plus className="h-4 w-4 mr-1" /> Add Venue
          </Button>
        </CardHeader>
        <CardContent>
          {homeVenues.length === 0 ? (
            <div className="py-8 text-center">
              <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-home-venues">No home venues added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {homeVenues.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 border rounded-md" data-testid={`home-venue-row-${v.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" data-testid={`text-home-venue-name-${v.id}`}>{v.name}</p>
                      {v.isDefault && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="h-3 w-3 mr-0.5" /> Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                      {v.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.address}
                        </span>
                      )}
                      {v.googleMapsUrl && (
                        <a href={v.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Navigation className="h-3 w-3" />
                          Map
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingVenue(v); setVenueDialogOpen(true); }} data-testid={`button-edit-home-venue-${v.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("Delete this venue?")) deleteMutation.mutate(v.id); }} data-testid={`button-delete-home-venue-${v.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <HomeVenueDialog
        open={venueDialogOpen}
        onOpenChange={setVenueDialogOpen}
        venue={editingVenue}
        clubId={clubId}
      />
    </>
  );
}

function OpponentDialog({ open, onOpenChange, opponent, clubId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opponent: any | null;
  clubId: number;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  const handleOpen = () => {
    if (opponent) {
      setName(opponent.name || "");
      setVenueName(opponent.venueName || "");
      setVenueAddress(opponent.venueAddress || "");
      setGoogleMapsUrl(opponent.googleMapsUrl || "");
    } else {
      setName("");
      setVenueName("");
      setVenueAddress("");
      setGoogleMapsUrl("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (opponent) {
        await apiRequest("PATCH", `/api/league/opponents/${opponent.id}`, {
          name,
          venueName,
          venueAddress,
          googleMapsUrl,
        });
      } else {
        await apiRequest("POST", "/api/league/opponents", {
          clubId,
          name,
          venueName,
          venueAddress,
          googleMapsUrl,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/opponents", { clubId }] });
      toast({ title: opponent ? "Opponent updated" : "Opponent created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle data-testid="text-opponent-dialog-title">{opponent ? "Edit Opponent" : "Add Opponent"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Opponent Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eagles BC" data-testid="input-opponent-name" />
          </div>
          <div>
            <Label>Venue Name</Label>
            <Input value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Sports Hall" data-testid="input-opponent-venue-name" />
          </div>
          <div>
            <Label>Venue Address</Label>
            <Input value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="Full address" data-testid="input-opponent-venue-address" />
          </div>
          <div>
            <Label>Google Maps URL</Label>
            <Input value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." data-testid="input-opponent-google-maps-url" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name} data-testid="button-save-opponent">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {opponent ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MatchDialog({ open, onOpenChange, match, clubId, teams, leagues, opponents, clubData, homeVenues }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any | null;
  clubId: number;
  teams: any[];
  leagues: any[];
  opponents: any[];
  clubData: any;
  homeVenues: any[];
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    division: "",
    category: "MENS" as string,
    venue: "",
    venueAddress: "",
    googleMapsUrl: "",
    location: "",
    matchDatetime: "",
    opponentClub: "",
    leagueTeamId: "",
    leagueId: "",
    pairsCount: "3",
    setsPerPair: "3",
    selectedOpponentId: "",
    selectedHomeVenueId: "",
  });

  const selectedOpponent = useMemo(() => {
    if (!formData.selectedOpponentId) return null;
    return opponents.find(o => String(o.id) === formData.selectedOpponentId) || null;
  }, [formData.selectedOpponentId, opponents]);

  const resetForm = () => {
    if (match) {
      const matchedOpponent = opponents.find(o => o.name === match.opponentClub);
      const matchedVenue = homeVenues.find((v: any) => v.name === match.venue);
      setFormData({
        division: match.division || "",
        category: match.category,
        venue: match.venue || "",
        venueAddress: match.venueAddress || "",
        googleMapsUrl: match.googleMapsUrl || "",
        location: match.location || "",
        matchDatetime: match.matchDatetime ? format(new Date(match.matchDatetime), "yyyy-MM-dd'T'HH:mm") : "",
        opponentClub: match.opponentClub,
        leagueTeamId: match.leagueTeamId ? String(match.leagueTeamId) : "",
        leagueId: match.leagueId ? String(match.leagueId) : "",
        pairsCount: String(match.pairsCount || 3),
        setsPerPair: String(match.setsPerPair || 3),
        selectedOpponentId: matchedOpponent ? String(matchedOpponent.id) : "",
        selectedHomeVenueId: matchedVenue ? String(matchedVenue.id) : "",
      });
    } else {
      setFormData({
        division: "",
        category: "MENS",
        venue: "",
        venueAddress: "",
        googleMapsUrl: "",
        location: "",
        matchDatetime: "",
        opponentClub: "",
        leagueTeamId: "",
        leagueId: "",
        pairsCount: "3",
        setsPerPair: "3",
        selectedOpponentId: "",
        selectedHomeVenueId: "",
      });
    }
  };

  const handleOpponentChange = (opponentId: string) => {
    const opp = opponents.find(o => String(o.id) === opponentId);
    if (opp) {
      const updates: any = {
        selectedOpponentId: opponentId,
        opponentClub: opp.name,
      };
      if (formData.location === "AWAY") {
        updates.venue = opp.venueName || "";
        updates.venueAddress = opp.venueAddress || "";
        updates.googleMapsUrl = opp.googleMapsUrl || "";
      }
      setFormData(f => ({ ...f, ...updates }));
    } else {
      setFormData(f => ({ ...f, selectedOpponentId: "", opponentClub: "" }));
    }
  };

  const handleLocationChange = (location: string) => {
    const updates: any = { location };
    if (location === "HOME") {
      const defaultVenue = homeVenues.find((v: any) => v.isDefault) || homeVenues[0];
      if (defaultVenue) {
        updates.selectedHomeVenueId = String(defaultVenue.id);
        updates.venue = defaultVenue.name || "";
        updates.venueAddress = defaultVenue.address || "";
        updates.googleMapsUrl = defaultVenue.googleMapsUrl || "";
      }
    } else if (location === "AWAY" && selectedOpponent) {
      updates.selectedHomeVenueId = "";
      updates.venue = selectedOpponent.venueName || "";
      updates.venueAddress = selectedOpponent.venueAddress || "";
      updates.googleMapsUrl = selectedOpponent.googleMapsUrl || "";
    } else {
      updates.selectedHomeVenueId = "";
    }
    setFormData(f => ({ ...f, ...updates }));
  };

  const handleHomeVenueChange = (venueId: string) => {
    const venue = homeVenues.find((v: any) => String(v.id) === venueId);
    if (venue) {
      setFormData(f => ({
        ...f,
        selectedHomeVenueId: venueId,
        venue: venue.name || "",
        venueAddress: venue.address || "",
        googleMapsUrl: venue.googleMapsUrl || "",
      }));
    }
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open, match]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...formData,
        clubId,
        venue: formData.venue || null,
        venueAddress: formData.venueAddress || null,
        googleMapsUrl: formData.googleMapsUrl || null,
        leagueTeamId: formData.leagueTeamId ? Number(formData.leagueTeamId) : null,
        leagueId: formData.leagueId ? Number(formData.leagueId) : null,
        pairsCount: Number(formData.pairsCount),
        setsPerPair: Number(formData.setsPerPair),
        selectedOpponentId: undefined,
        selectedHomeVenueId: undefined,
      };
      if (match) {
        await apiRequest("PATCH", `/api/league/matches/${match.id}`, body);
      } else {
        await apiRequest("POST", "/api/league/matches", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/matches"] });
      toast({ title: match ? "Fixture updated" : "Fixture created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{match ? "Edit Fixture" : "Add Fixture"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <Label>League</Label>
            <Select value={formData.leagueId || "none"} onValueChange={v => setFormData(f => ({ ...f, leagueId: v === "none" ? "" : v }))}>
              <SelectTrigger data-testid="select-match-league"><SelectValue placeholder="Select league" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No league</SelectItem>
                {leagues.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}{l.season ? ` (${l.season})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Team</Label>
            <Select value={formData.leagueTeamId || "none"} onValueChange={v => setFormData(f => ({ ...f, leagueTeamId: v === "none" ? "" : v }))}>
              <SelectTrigger data-testid="select-team"><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-match-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENS">Mens</SelectItem>
                  <SelectItem value="LADIES">Ladies</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Division</Label>
              <Input value={formData.division} onChange={e => setFormData(f => ({ ...f, division: e.target.value }))} placeholder="e.g. Division 1" data-testid="input-division" />
            </div>
          </div>
          <div>
            <Label>Opponent</Label>
            <Select value={formData.selectedOpponentId || "none"} onValueChange={v => handleOpponentChange(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-opponent"><SelectValue placeholder="Select opponent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select opponent...</SelectItem>
                {opponents.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Home / Away</Label>
            <Select value={formData.location || "none"} onValueChange={v => handleLocationChange(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-location"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select...</SelectItem>
                <SelectItem value="HOME">Home</SelectItem>
                <SelectItem value="AWAY">Away</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.location === "HOME" && homeVenues.length > 0 && (
            <div>
              <Label>Home Venue</Label>
              <Select value={formData.selectedHomeVenueId || "none"} onValueChange={v => handleHomeVenueChange(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-home-venue"><SelectValue placeholder="Select venue" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select venue...</SelectItem>
                  {homeVenues.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}{v.address ? ` - ${v.address}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Match Date & Time</Label>
            <Input type="datetime-local" value={formData.matchDatetime} onChange={e => setFormData(f => ({ ...f, matchDatetime: e.target.value }))} data-testid="input-match-datetime" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Number of Pairs</Label>
              <Select value={formData.pairsCount} onValueChange={v => setFormData(f => ({ ...f, pairsCount: v }))}>
                <SelectTrigger data-testid="select-pairs-count"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Pair</SelectItem>
                  <SelectItem value="2">2 Pairs</SelectItem>
                  <SelectItem value="3">3 Pairs</SelectItem>
                  <SelectItem value="4">4 Pairs</SelectItem>
                  <SelectItem value="5">5 Pairs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sets per Pair</Label>
              <Select value={formData.setsPerPair} onValueChange={v => setFormData(f => ({ ...f, setsPerPair: v }))}>
                <SelectTrigger data-testid="select-sets-per-pair"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Best of 1</SelectItem>
                  <SelectItem value="3">Best of 3</SelectItem>
                  <SelectItem value="5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !formData.opponentClub || !formData.matchDatetime} data-testid="button-save-fixture">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {match ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SquadTab({ clubId, squadPlayers, clubMembers, matches }: {
  clubId: number;
  squadPlayers: any[];
  clubMembers: any[];
  matches: any[];
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [availabilityMatchId, setAvailabilityMatchId] = useState<number | null>(null);

  const { data: availabilityData } = useQuery<any[]>({
    queryKey: ["/api/league/match-availability", availabilityMatchId],
    queryFn: async () => {
      if (!availabilityMatchId) return [];
      const res = await fetch(`/api/league/match-availability/${availabilityMatchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!availabilityMatchId,
  });

  const addToSquadMutation = useMutation({
    mutationFn: async ({ userId, formatPreference }: { userId: number; formatPreference: string }) => {
      await apiRequest("POST", "/api/league/squad", { clubId, userId, formatPreference });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/squad"] });
      toast({ title: "Player added to squad" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateFormatMutation = useMutation({
    mutationFn: async ({ id, formatPreference }: { id: number; formatPreference: string }) => {
      await apiRequest("PATCH", `/api/league/squad/${id}`, { formatPreference });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/squad"] });
      toast({ title: "Format updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeFromSquadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/league/squad/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/squad"] });
      toast({ title: "Player removed from squad" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendPollMutation = useMutation({
    mutationFn: async (matchId: number) => {
      return await apiRequest("POST", `/api/league/match-availability/${matchId}/send-poll`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/match-availability"] });
      toast({ title: "Availability poll sent to all squad players" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const squadIds = new Set(squadPlayers.map((p: any) => p.userId));
  const availableMembers = (clubMembers || []).filter((m: any) => !squadIds.has(m.userId));
  const filteredAvailableMembers = availableMembers.filter((m: any) => {
    if (!searchTerm) return true;
    return m.fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const malePlayers = squadPlayers.filter((p: any) => p.gender === "MALE");
  const femalePlayers = squadPlayers.filter((p: any) => p.gender === "FEMALE");
  const unknownGenderPlayers = squadPlayers.filter((p: any) => !p.gender);

  const displayedPlayers = genderFilter === "all" ? squadPlayers :
    genderFilter === "male" ? malePlayers :
    genderFilter === "female" ? femalePlayers :
    unknownGenderPlayers;

  const upcomingForPoll = matches.filter((m: any) => m.status === "UPCOMING" || m.status === "LIVE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            League Squad
          </h3>
          <Badge variant="outline">{squadPlayers.length} players</Badge>
        </div>
        <Button size="sm" onClick={() => { setAddDialogOpen(true); setSearchTerm(""); }} data-testid="button-add-squad-player">
          <UserPlus className="h-4 w-4 mr-1" /> Add Player
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          <Button variant={genderFilter === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setGenderFilter("all")} data-testid="filter-all-gender">
            All ({squadPlayers.length})
          </Button>
          <Button variant={genderFilter === "male" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setGenderFilter("male")} data-testid="filter-male">
            Male ({malePlayers.length})
          </Button>
          <Button variant={genderFilter === "female" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setGenderFilter("female")} data-testid="filter-female">
            Female ({femalePlayers.length})
          </Button>
          {unknownGenderPlayers.length > 0 && (
            <Button variant={genderFilter === "unknown" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setGenderFilter("unknown")} data-testid="filter-unknown-gender">
              Unset ({unknownGenderPlayers.length})
            </Button>
          )}
        </div>
      </div>

      {displayedPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No squad players found</p>
            <p className="text-xs mt-1">Add club members to your league squad to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayedPlayers.map((player: any) => (
            <Card key={player.id} data-testid={`squad-player-${player.userId}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{player.fullName}</span>
                    {player.gender && (
                      <Badge variant="outline" className={`text-[10px] ${player.gender === "MALE" ? "border-blue-300 text-blue-600 dark:text-blue-400" : "border-pink-300 text-pink-600 dark:text-pink-400"}`}>
                        {player.gender === "MALE" ? "M" : "F"}
                      </Badge>
                    )}
                    {player.grade && (
                      <Badge variant="outline" className="text-[10px]">{player.grade}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{player.email}</p>
                </div>
                <Select
                  value={player.formatPreference || "none"}
                  onValueChange={(v) => updateFormatMutation.mutate({ id: player.id, formatPreference: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="w-32 h-7 text-xs" data-testid={`select-format-${player.userId}`}>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Preference</SelectItem>
                    <SelectItem value="MENS_DOUBLES">Mens Doubles</SelectItem>
                    <SelectItem value="LADIES_DOUBLES">Ladies Doubles</SelectItem>
                    <SelectItem value="MIXED_DOUBLES">Mixed Doubles</SelectItem>
                    <SelectItem value="ANY">Any Format</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => removeFromSquadMutation.mutate(player.id)} data-testid={`button-remove-squad-${player.userId}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Match Availability Polls
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {upcomingForPoll.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No upcoming matches to poll for</p>
          ) : (
            upcomingForPoll.map((match: any) => (
              <div key={match.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3" data-testid={`poll-match-${match.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">vs {match.opponentClub}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(match.matchDatetime), "EEE, dd MMM yyyy HH:mm")} · {match.category}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => setAvailabilityMatchId(match.id === availabilityMatchId ? null : match.id)}
                  data-testid={`button-view-poll-${match.id}`}
                >
                  {availabilityMatchId === match.id ? "Hide" : "View"} Poll
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => sendPollMutation.mutate(match.id)}
                  disabled={sendPollMutation.isPending}
                  data-testid={`button-send-poll-${match.id}`}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send Poll
                </Button>
              </div>
            ))
          )}

          {availabilityMatchId && availabilityData && (
            <div className="mt-3 border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Responses</p>
              {availabilityData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No responses yet. Send the poll first.</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> {availabilityData.filter((a: any) => a.status === "AVAILABLE").length}</span>
                    <span className="flex items-center gap-1"><X className="h-3 w-3 text-red-500" /> {availabilityData.filter((a: any) => a.status === "UNAVAILABLE").length}</span>
                    <span className="flex items-center gap-1"><HelpCircle className="h-3 w-3 text-yellow-500" /> {availabilityData.filter((a: any) => a.status === "MAYBE").length}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">Pending: {availabilityData.filter((a: any) => a.status === "PENDING").length}</span>
                  </div>
                  {availabilityData.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      {a.status === "AVAILABLE" && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {a.status === "UNAVAILABLE" && <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {a.status === "MAYBE" && <HelpCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                      {a.status === "PENDING" && <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                      <span className="truncate flex-1">{a.fullName}</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        a.status === "AVAILABLE" ? "border-green-300 text-green-600 dark:text-green-400" :
                        a.status === "UNAVAILABLE" ? "border-red-300 text-red-600 dark:text-red-400" :
                        a.status === "MAYBE" ? "border-yellow-300 text-yellow-600 dark:text-yellow-400" :
                        ""
                      }`}>
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Player to League Squad</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search members..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" data-testid="input-search-squad-add" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 max-h-64 border rounded-md p-2">
            {filteredAvailableMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No available members</p>
            ) : (
              filteredAvailableMembers.map((m: any) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-2 p-2 rounded cursor-pointer text-sm hover:bg-muted/50"
                  data-testid={`add-squad-member-${m.userId}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{m.fullName}</span>
                    {m.grade && <Badge variant="outline" className="ml-1.5 text-[10px]">{m.grade}</Badge>}
                    {m.category && <Badge variant="outline" className="ml-1 text-[10px]">{m.category}</Badge>}
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => addToSquadMutation.mutate({ userId: m.userId, formatPreference: "" })}
                    disabled={addToSquadMutation.isPending}
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignPlayersDialog({ open, onOpenChange, matchId, members, matches }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: number | null;
  members: any[];
  matches: any[];
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<{ userId: number; position: string; userName: string }[]>([]);
  const [pairCount, setPairCount] = useState(4);

  const match = matches.find(m => m.id === matchId);

  const pairLabels = useMemo(() => {
    const labels: string[] = [];
    const letterLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    for (let i = 0; i < pairCount; i++) {
      labels.push(`Pair ${letterLabels[i] || String(i + 1)}`);
    }
    return labels;
  }, [pairCount]);

  const handleOpen = () => {
    if (match?.players) {
      const existing = match.players.map((p: any) => ({
        userId: p.userId,
        position: p.position || "",
        userName: p.userName || "Unknown",
      }));
      setSelectedPlayers(existing);
      const letterLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
      let maxIdx = 3;
      for (const p of existing) {
        if (p.position && p.position !== "Reserve") {
          const letter = p.position.replace("Pair ", "");
          const idx = letterLabels.indexOf(letter);
          if (idx >= 0 && idx > maxIdx) maxIdx = idx;
        }
      }
      setPairCount(maxIdx + 1);
    } else {
      setSelectedPlayers([]);
      setPairCount(match?.pairsCount || 4);
    }
    setSearchTerm("");
  };

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(m => m.fullName.toLowerCase().includes(term) || m.email.toLowerCase().includes(term));
  }, [members, searchTerm]);

  const addPlayer = (member: any) => {
    if (selectedPlayers.find(p => p.userId === member.userId)) return;
    setSelectedPlayers(prev => [...prev, { userId: member.userId, position: "", userName: member.fullName }]);
  };

  const removePlayer = (userId: number) => {
    setSelectedPlayers(prev => prev.filter(p => p.userId !== userId));
  };

  const updatePosition = (userId: number, position: string) => {
    const actualPosition = position === "none" ? "" : position;
    setSelectedPlayers(prev => prev.map(p => p.userId === userId ? { ...p, position: actualPosition } : p));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!matchId) return;
      await apiRequest("POST", `/api/league/matches/${matchId}/players`, {
        players: selectedPlayers.map(p => ({ userId: p.userId, position: p.position })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/league/my-selections"] });
      toast({ title: "Players assigned" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const playersByPair = useMemo(() => {
    const groups: Record<string, typeof selectedPlayers> = {};
    for (const label of pairLabels) {
      groups[label] = selectedPlayers.filter(p => p.position === label);
    }
    groups["Reserve"] = selectedPlayers.filter(p => p.position === "Reserve");
    groups["Unassigned"] = selectedPlayers.filter(p => !p.position);
    return groups;
  }, [selectedPlayers, pairLabels]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Assign Players & Create Pairs
            {match && <span className="text-sm font-normal text-muted-foreground block">vs {match.opponentClub} - {format(new Date(match.matchDatetime), "dd MMM yyyy HH:mm")}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Visible 2hrs before match
          </p>
          <div className="flex items-center gap-1">
            <Label className="text-xs">Pairs:</Label>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => {
              const newCount = Math.max(1, pairCount - 1);
              const letterLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
              const removedLabel = `Pair ${letterLabels[newCount]}`;
              setSelectedPlayers(prev => prev.map(p => p.position === removedLabel ? { ...p, position: "" } : p));
              setPairCount(newCount);
            }} data-testid="button-remove-pair">
              -
            </Button>
            <span className="text-sm font-bold w-5 text-center">{pairCount}</span>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => setPairCount(Math.min(8, pairCount + 1))} data-testid="button-add-pair">
              +
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {pairLabels.map(label => (
            <div key={label} className="bg-muted/30 border rounded-lg p-2.5">
              <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                {label}
                <Badge variant="outline" className="text-[9px] ml-auto">{playersByPair[label]?.length || 0}/2</Badge>
              </p>
              {(playersByPair[label] || []).map(p => (
                <div key={p.userId} className="flex items-center gap-2 bg-background/50 rounded-md p-1.5 mb-1">
                  <span className="text-sm flex-1 truncate">{p.userName}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removePlayer(p.userId)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {(playersByPair[label]?.length || 0) < 2 && (
                <p className="text-[10px] text-muted-foreground italic pl-1">
                  {2 - (playersByPair[label]?.length || 0)} slot{2 - (playersByPair[label]?.length || 0) > 1 ? "s" : ""} available
                </p>
              )}
            </div>
          ))}

          {(playersByPair["Reserve"]?.length > 0 || playersByPair["Unassigned"]?.length > 0) && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
              {playersByPair["Reserve"]?.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold mb-1 text-amber-600 dark:text-amber-400">Reserve</p>
                  {playersByPair["Reserve"].map(p => (
                    <div key={p.userId} className="flex items-center gap-2 bg-background/50 rounded-md p-1.5 mb-1">
                      <span className="text-sm flex-1 truncate">{p.userName}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removePlayer(p.userId)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {playersByPair["Unassigned"]?.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-1 text-muted-foreground">Unassigned</p>
                  {playersByPair["Unassigned"].map(p => (
                    <div key={p.userId} className="flex items-center gap-2 bg-background/50 rounded-md p-1.5 mb-1">
                      <span className="text-sm flex-1 truncate">{p.userName}</span>
                      <Select value="none" onValueChange={v => updatePosition(p.userId, v)}>
                        <SelectTrigger className="w-24 h-6 text-[10px]"><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {pairLabels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          <SelectItem value="Reserve">Reserve</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removePlayer(p.userId)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold">Add Players</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-players"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
              ) : (
                filteredMembers.map(m => {
                  const isSelected = selectedPlayers.some(p => p.userId === m.userId);
                  return (
                    <div
                      key={m.userId}
                      className={`flex items-center justify-between gap-2 p-2 rounded text-sm hover:bg-muted/50 ${isSelected ? "opacity-50" : "cursor-pointer"}`}
                      data-testid={`member-option-${m.userId}`}
                    >
                      <div>
                        <span className="font-medium">{m.fullName}</span>
                        {m.grade && <Badge variant="outline" className="ml-1.5 text-[10px]">{m.grade}</Badge>}
                      </div>
                      {isSelected ? (
                        <Badge variant="secondary" className="text-[10px]">Added</Badge>
                      ) : (
                        <Select onValueChange={v => {
                          addPlayer(m);
                          if (v !== "none") {
                            setTimeout(() => updatePosition(m.userId, v), 0);
                          }
                        }}>
                          <SelectTrigger className="w-24 h-6 text-[10px]"><SelectValue placeholder="Add to..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {pairLabels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                            <SelectItem value="Reserve">Reserve</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-players">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save ({selectedPlayers.length} players)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultDialog({ open, onOpenChange, matchId, matches }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: number | null;
  matches: any[];
}) {
  const { toast } = useToast();
  const match = matches.find(m => m.id === matchId);
  const [dragonScore, setDragonScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [outcome, setOutcome] = useState("WIN");
  const [locked, setLocked] = useState(false);

  const pairsCount = match?.pairsCount || 3;
  const setsPerPair = match?.setsPerPair || 3;

  type PairScore = { pairNumber: number; gameNumber: number; dragonPoints: number; opponentPoints: number };
  const [pairScores, setPairScores] = useState<PairScore[]>([]);

  const buildEmptyScores = () => {
    const scores: PairScore[] = [];
    for (let p = 1; p <= pairsCount; p++) {
      for (let s = 1; s <= setsPerPair; s++) {
        scores.push({ pairNumber: p, gameNumber: s, dragonPoints: 0, opponentPoints: 0 });
      }
    }
    return scores;
  };

  const handleOpen = () => {
    if (match?.result) {
      setDragonScore(match.result.dragonScore);
      setOpponentScore(match.result.opponentScore);
      setOutcome(match.result.outcome);
      setLocked(match.result.locked);
      if (match.result.gameScores?.length > 0) {
        const existing = match.result.gameScores.map((g: any) => ({
          pairNumber: g.pairNumber || 1,
          gameNumber: g.gameNumber,
          dragonPoints: g.dragonPoints,
          opponentPoints: g.opponentPoints,
        }));
        const empty = buildEmptyScores();
        const merged = empty.map(e => {
          const found = existing.find((x: PairScore) => x.pairNumber === e.pairNumber && x.gameNumber === e.gameNumber);
          return found || e;
        });
        setPairScores(merged);
      } else {
        setPairScores(buildEmptyScores());
      }
    } else {
      setDragonScore(0);
      setOpponentScore(0);
      setOutcome("WIN");
      setLocked(false);
      setPairScores(buildEmptyScores());
    }
  };

  const updatePairScore = (pairNum: number, gameNum: number, field: string, value: number) => {
    setPairScores(prev => prev.map(s =>
      s.pairNumber === pairNum && s.gameNumber === gameNum ? { ...s, [field]: value } : s
    ));
  };

  const autoCalculate = () => {
    let dTotal = 0;
    let oTotal = 0;
    const pairWins: Record<number, { d: number; o: number }> = {};
    for (const s of pairScores) {
      if (!pairWins[s.pairNumber]) pairWins[s.pairNumber] = { d: 0, o: 0 };
      if (s.dragonPoints > s.opponentPoints) pairWins[s.pairNumber].d++;
      else if (s.opponentPoints > s.dragonPoints) pairWins[s.pairNumber].o++;
    }
    for (const pw of Object.values(pairWins)) {
      if (pw.d > pw.o) dTotal++;
      else if (pw.o > pw.d) oTotal++;
    }
    setDragonScore(dTotal);
    setOpponentScore(oTotal);
    if (dTotal > oTotal) setOutcome("WIN");
    else if (oTotal > dTotal) setOutcome("LOSS");
    else setOutcome("DRAW");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!matchId) return;
      await apiRequest("POST", `/api/league/matches/${matchId}/result`, {
        dragonScore,
        opponentScore,
        outcome,
        gameScores: pairScores.filter(s => s.dragonPoints > 0 || s.opponentPoints > 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/matches"] });
      toast({ title: "Result saved" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!match?.result) return;
      await apiRequest("PATCH", `/api/league/results/${match.result.id}/lock`, { locked: !locked });
    },
    onSuccess: () => {
      setLocked(!locked);
      queryClient.invalidateQueries({ queryKey: ["/api/league/matches"] });
      toast({ title: locked ? "Result unlocked" : "Result locked" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pairGroups = useMemo(() => {
    const groups: Record<number, PairScore[]> = {};
    for (const s of pairScores) {
      if (!groups[s.pairNumber]) groups[s.pairNumber] = [];
      groups[s.pairNumber].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, [pairScores]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {match?.result ? "Edit Result" : "Enter Result"}
            {match && <span className="text-sm font-normal text-muted-foreground block">vs {match.opponentClub} - {match.category} {match.division}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Match Format</p>
            <p className="text-sm font-bold">{pairsCount} Pairs, Best of {setsPerPair} Sets</p>
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <Label className="text-xs">{match?.clubName || "Your Club"}</Label>
              <Input type="number" min={0} value={dragonScore} onChange={e => setDragonScore(Number(e.target.value))} data-testid="input-dragon-score" />
            </div>
            <div className="text-center pb-2">
              <Swords className="h-5 w-5 mx-auto text-muted-foreground" />
            </div>
            <div>
              <Label className="text-xs">{match?.opponentClub || "Opponent"}</Label>
              <Input type="number" min={0} value={opponentScore} onChange={e => setOpponentScore(Number(e.target.value))} data-testid="input-opponent-score" />
            </div>
          </div>

          <div>
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger data-testid="select-outcome"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WIN">Win</SelectItem>
                <SelectItem value="LOSS">Loss</SelectItem>
                <SelectItem value="DRAW">Draw</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <Label className="text-xs font-semibold">Pair & Set Scores</Label>
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={autoCalculate} data-testid="button-auto-calculate">
                Auto-Calculate
              </Button>
            </div>
            <div className="space-y-3">
              {pairGroups.map(([pairNum, sets]) => (
                <div key={pairNum} className="bg-muted/30 border rounded-lg p-3">
                  <p className="text-xs font-bold mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Pair {pairNum}
                  </p>
                  <div className="space-y-1.5">
                    {(sets as PairScore[]).sort((a, b) => a.gameNumber - b.gameNumber).map((s) => (
                      <div key={`${s.pairNumber}-${s.gameNumber}`} className="grid grid-cols-[50px_1fr_20px_1fr] gap-2 items-center">
                        <span className="text-[10px] text-muted-foreground font-medium">Set {s.gameNumber}</span>
                        <Input
                          type="number"
                          min={0}
                          value={s.dragonPoints}
                          onChange={e => updatePairScore(Number(pairNum), s.gameNumber, "dragonPoints", Number(e.target.value))}
                          className="h-7 text-sm text-center"
                          data-testid={`input-pair-${pairNum}-set-${s.gameNumber}-dragon`}
                        />
                        <span className="text-center text-muted-foreground text-xs">-</span>
                        <Input
                          type="number"
                          min={0}
                          value={s.opponentPoints}
                          onChange={e => updatePairScore(Number(pairNum), s.gameNumber, "opponentPoints", Number(e.target.value))}
                          className="h-7 text-sm text-center"
                          data-testid={`input-pair-${pairNum}-set-${s.gameNumber}-opponent`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t">
          {match?.result && (
            <Button variant="outline" size="sm" onClick={() => lockMutation.mutate()} className="mr-auto" data-testid="button-lock-result">
              {locked ? <Unlock className="h-3.5 w-3.5 mr-1" /> : <Lock className="h-3.5 w-3.5 mr-1" />}
              {locked ? "Unlock" : "Lock"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || locked} data-testid="button-save-result">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamDialog({ open, onOpenChange, team, clubId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any | null;
  clubId: number;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [division, setDivision] = useState("");

  const handleOpen = () => {
    if (team) {
      setName(team.name);
      setDivision(team.division || "");
    } else {
      setName("");
      setDivision("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { clubId, name, division };
      if (team) {
        await apiRequest("PATCH", `/api/league/teams/${team.id}`, body);
      } else {
        await apiRequest("POST", "/api/league/teams", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/league/teams"] });
      toast({ title: team ? "Team updated" : "Team created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Add Team"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Team Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dragon 1st Team" data-testid="input-team-name" />
          </div>
          <div>
            <Label>Division</Label>
            <Input value={division} onChange={e => setDivision(e.target.value)} placeholder="e.g. Division 1" data-testid="input-team-division" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name} data-testid="button-save-team">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {team ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeagueDialog({ open, onOpenChange, league, clubId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: any | null;
  clubId: number;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");

  const handleOpen = () => {
    if (league) {
      setName(league.name);
      setSeason(league.season || "");
    } else {
      setName("");
      setSeason("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { clubId, name, season };
      if (league) {
        await apiRequest("PATCH", `/api/leagues/${league.id}`, body);
      } else {
        await apiRequest("POST", "/api/leagues", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      toast({ title: league ? "League updated" : "League created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle data-testid="text-league-dialog-title">{league ? "Edit League" : "Add League"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>League Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. County League" data-testid="input-league-name" />
          </div>
          <div>
            <Label>Season (optional)</Label>
            <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2025/26" data-testid="input-league-season" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name} data-testid="button-save-league">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {league ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

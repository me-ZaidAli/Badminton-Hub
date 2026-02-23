import { useState, useMemo } from "react";
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
  Lock, Unlock, Shield, Search, ChevronDown, ChevronUp, Swords, BarChart3
} from "lucide-react";
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

  const clubId = selectedClubId ? Number(selectedClubId) : (adminClubs?.[0]?.id || 0);

  const effectiveClubId = selectedClubId || String(adminClubs?.[0]?.id || "");

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

  const matches = allMatches || [];
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
          <Button size="sm" onClick={() => { setEditingTeam(null); setTeamDialogOpen(true); }} data-testid="button-add-team">
            <Plus className="h-4 w-4 mr-1" /> Team
          </Button>
          <Button size="sm" onClick={() => { setEditingMatch(null); setMatchDialogOpen(true); }} data-testid="button-add-fixture">
            <Plus className="h-4 w-4 mr-1" /> Fixture
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
        <TabsList className="grid w-full grid-cols-3" data-testid="admin-league-tabs">
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

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
      </Tabs>

      <MatchDialog
        open={matchDialogOpen}
        onOpenChange={setMatchDialogOpen}
        match={editingMatch}
        clubId={Number(effectiveClubId)}
        teams={teams || []}
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

function MatchDialog({ open, onOpenChange, match, clubId, teams }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any | null;
  clubId: number;
  teams: any[];
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    division: "",
    category: "MENS" as string,
    venue: "",
    location: "",
    matchDatetime: "",
    opponentClub: "",
    leagueTeamId: "",
  });

  const resetForm = () => {
    if (match) {
      setFormData({
        division: match.division || "",
        category: match.category,
        venue: match.venue || "",
        location: match.location || "",
        matchDatetime: match.matchDatetime ? format(new Date(match.matchDatetime), "yyyy-MM-dd'T'HH:mm") : "",
        opponentClub: match.opponentClub,
        leagueTeamId: match.leagueTeamId ? String(match.leagueTeamId) : "",
      });
    } else {
      setFormData({
        division: "",
        category: "MENS",
        venue: "",
        location: "",
        matchDatetime: "",
        opponentClub: "",
        leagueTeamId: "",
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...formData,
        clubId,
        leagueTeamId: formData.leagueTeamId ? Number(formData.leagueTeamId) : null,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{match ? "Edit Fixture" : "Add Fixture"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Label>Opponent Club</Label>
            <Input value={formData.opponentClub} onChange={e => setFormData(f => ({ ...f, opponentClub: e.target.value }))} placeholder="Opponent club name" data-testid="input-opponent" />
          </div>
          <div>
            <Label>Match Date & Time</Label>
            <Input type="datetime-local" value={formData.matchDatetime} onChange={e => setFormData(f => ({ ...f, matchDatetime: e.target.value }))} data-testid="input-match-datetime" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Venue</Label>
              <Input value={formData.venue} onChange={e => setFormData(f => ({ ...f, venue: e.target.value }))} placeholder="Venue name" data-testid="input-venue" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} placeholder="City/area" data-testid="input-location" />
            </div>
          </div>
          {teams.length > 0 && (
            <div>
              <Label>Team (optional)</Label>
              <Select value={formData.leagueTeamId} onValueChange={v => setFormData(f => ({ ...f, leagueTeamId: v }))}>
                <SelectTrigger data-testid="select-team"><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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

  const match = matches.find(m => m.id === matchId);

  const handleOpen = () => {
    if (match?.players) {
      setSelectedPlayers(match.players.map((p: any) => ({
        userId: p.userId,
        position: p.position || "",
        userName: p.userName || "Unknown",
      })));
    } else {
      setSelectedPlayers([]);
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
    setSelectedPlayers(prev => prev.map(p => p.userId === userId ? { ...p, position } : p));
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
      toast({ title: "Players assigned" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Assign Players
            {match && <span className="text-sm font-normal text-muted-foreground block">vs {match.opponentClub} - {format(new Date(match.matchDatetime), "dd MMM yyyy HH:mm")}</span>}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Players will be visible to others 2 hours before match start
        </p>

        {selectedPlayers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Selected Players ({selectedPlayers.length})</Label>
            {selectedPlayers.map(p => (
              <div key={p.userId} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                <span className="text-sm flex-1 truncate">{p.userName}</span>
                <Select value={p.position} onValueChange={v => updatePosition(p.userId, v)}>
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue placeholder="Pair" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="Pair A">Pair A</SelectItem>
                    <SelectItem value="Pair B">Pair B</SelectItem>
                    <SelectItem value="Pair C">Pair C</SelectItem>
                    <SelectItem value="Reserve">Reserve</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removePlayer(p.userId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 space-y-2">
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
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No members found</p>
            ) : (
              filteredMembers.map(m => {
                const isSelected = selectedPlayers.some(p => p.userId === m.userId);
                return (
                  <div
                    key={m.userId}
                    className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer text-sm hover:bg-muted/50 ${isSelected ? "opacity-50" : ""}`}
                    onClick={() => !isSelected && addPlayer(m)}
                    data-testid={`member-option-${m.userId}`}
                  >
                    <div>
                      <span className="font-medium">{m.fullName}</span>
                      {m.grade && <Badge variant="outline" className="ml-1.5 text-[10px]">{m.grade}</Badge>}
                    </div>
                    {isSelected && <Badge variant="secondary" className="text-[10px]">Added</Badge>}
                  </div>
                );
              })
            )}
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
  const [gameScores, setGameScores] = useState<{ gameNumber: number; dragonPoints: number; opponentPoints: number }[]>([
    { gameNumber: 1, dragonPoints: 0, opponentPoints: 0 },
    { gameNumber: 2, dragonPoints: 0, opponentPoints: 0 },
    { gameNumber: 3, dragonPoints: 0, opponentPoints: 0 },
  ]);
  const [locked, setLocked] = useState(false);

  const handleOpen = () => {
    if (match?.result) {
      setDragonScore(match.result.dragonScore);
      setOpponentScore(match.result.opponentScore);
      setOutcome(match.result.outcome);
      setLocked(match.result.locked);
      if (match.result.gameScores?.length > 0) {
        setGameScores(match.result.gameScores.map((g: any) => ({
          gameNumber: g.gameNumber,
          dragonPoints: g.dragonPoints,
          opponentPoints: g.opponentPoints,
        })));
      }
    } else {
      setDragonScore(0);
      setOpponentScore(0);
      setOutcome("WIN");
      setLocked(false);
      setGameScores([
        { gameNumber: 1, dragonPoints: 0, opponentPoints: 0 },
        { gameNumber: 2, dragonPoints: 0, opponentPoints: 0 },
        { gameNumber: 3, dragonPoints: 0, opponentPoints: 0 },
      ]);
    }
  };

  const updateGameScore = (index: number, field: string, value: number) => {
    setGameScores(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!matchId) return;
      await apiRequest("POST", `/api/league/matches/${matchId}/result`, {
        dragonScore,
        opponentScore,
        outcome,
        gameScores: gameScores.filter(g => g.dragonPoints > 0 || g.opponentPoints > 0),
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) handleOpen(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {match?.result ? "Edit Result" : "Enter Result"}
            {match && <span className="text-sm font-normal text-muted-foreground block">vs {match.opponentClub}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label className="text-xs font-semibold">Game Scores (optional)</Label>
            <div className="space-y-2 mt-1">
              {gameScores.map((g, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_20px_1fr] gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Game {g.gameNumber}</span>
                  <Input type="number" min={0} value={g.dragonPoints} onChange={e => updateGameScore(i, "dragonPoints", Number(e.target.value))} className="h-8 text-sm" />
                  <span className="text-center text-muted-foreground">-</span>
                  <Input type="number" min={0} value={g.opponentPoints} onChange={e => updateGameScore(i, "opponentPoints", Number(e.target.value))} className="h-8 text-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
  const [season, setSeason] = useState("");

  const handleOpen = () => {
    if (team) {
      setName(team.name);
      setDivision(team.division || "");
      setSeason(team.season || "");
    } else {
      setName("");
      setDivision("");
      setSeason("");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body = { clubId, name, division, season };
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
          <div>
            <Label>Season</Label>
            <Input value={season} onChange={e => setSeason(e.target.value)} placeholder="e.g. 2025/26" data-testid="input-team-season" />
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
import { useRoute } from "wouter";
import { useState } from "react";
import {
  useTournament, useTournamentCategories, useTournamentTeams,
  useTournamentMatches, useTournamentStandings,
  useCreateCategory, useDeleteCategory, useRegisterTeam, useDeleteTeam,
  useGenerateMatches, useScoreMatch, useAdvanceWinners, useUpdateTournament,
} from "@/hooks/use-tournaments";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs } from "@/hooks/use-clubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, Plus, Trash2, Play, ArrowLeft, GitBranch, LayoutGrid, Settings } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { TournamentCategory, TournamentMatch } from "@shared/schema";

const categorySchema = z.object({
  name: z.string().min(1, "Name required"),
  format: z.enum(["ROUND_ROBIN", "KNOCKOUT", "GROUP_KNOCKOUT"]),
  playersPerSide: z.coerce.number().min(1).max(2),
  genderRestriction: z.enum(["MIXED", "MALE", "FEMALE"]).default("MIXED"),
  scoringFormat: z.enum(["BEST_OF_3", "BEST_OF_5", "SINGLE_GAME"]).default("BEST_OF_3"),
  groupCount: z.coerce.number().min(1).default(2),
  advancePerGroup: z.coerce.number().min(1).default(2),
  pointsPerWin: z.coerce.number().min(0).default(2),
  pointsPerLoss: z.coerce.number().min(0).default(0),
});

const formatLabels: Record<string, string> = {
  ROUND_ROBIN: "Round Robin",
  KNOCKOUT: "Knockout",
  GROUP_KNOCKOUT: "Group + Knockout",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ONGOING: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const matchStatusColors: Record<string, string> = {
  UPCOMING: "bg-muted text-muted-foreground",
  LIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FINISHED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export default function TournamentDetail() {
  const [, params] = useRoute("/tournaments/:id");
  const tournamentId = Number(params?.id);
  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: user } = useUser();
  const { data: sessionClubs } = useMySessionClubs(!!user);
  const { toast } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [scoreMatchId, setScoreMatchId] = useState<number | null>(null);

  const isSuperAdmin = user?.role === "OWNER";
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const canManage = tournament ? (isSuperAdmin || managedClubIds.has(tournament.clubId)) : false;

  const createCatMutation = useCreateCategory();
  const deleteCatMutation = useDeleteCategory();
  const generateMatchesMutation = useGenerateMatches();
  const advanceWinnersMutation = useAdvanceWinners();

  const categories = tournament?.categories || [];
  const activeCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : categories[0];

  const catForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      format: "KNOCKOUT",
      playersPerSide: 2,
      genderRestriction: "MIXED",
      scoringFormat: "BEST_OF_3",
      groupCount: 2,
      advancePerGroup: 2,
      pointsPerWin: 2,
      pointsPerLoss: 0,
    },
  });

  const watchFormat = catForm.watch("format");

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!tournament) {
    return <div className="text-center py-12 text-muted-foreground">Tournament not found</div>;
  }

  async function handleCreateCategory(values: z.infer<typeof categorySchema>) {
    try {
      await createCatMutation.mutateAsync({ tournamentId, ...values });
      toast({ title: "Category Created" });
      setAddCategoryOpen(false);
      catForm.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDeleteCategory(catId: number) {
    try {
      await deleteCatMutation.mutateAsync(catId);
      toast({ title: "Category Deleted" });
      if (selectedCategoryId === catId) setSelectedCategoryId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-tournament-title">{tournament.name}</h1>
            <Badge className={statusColors[tournament.status] || ""} data-testid="badge-tournament-status">{tournament.status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(tournament.startDate), "d MMM yyyy")} - {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
            {tournament.club && <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{tournament.club.name}</span>}
            {tournament.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tournament.venue.name}</span>}
          </div>
        </div>
      </div>

      {tournament.description && (
        <p className="text-sm text-muted-foreground">{tournament.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Categories:</span>
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={activeCategory?.id === cat.id ? "default" : "outline"}
            size="sm"
            data-testid={`button-category-${cat.id}`}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setAddCategoryOpen(true)} data-testid="button-add-category">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
          </Button>
        )}
      </div>

      {activeCategory ? (
        <CategoryView
          category={activeCategory}
          canManage={canManage}
          tournamentId={tournamentId}
          onDelete={() => handleDeleteCategory(activeCategory.id)}
          onGenerateMatches={async () => {
            try {
              await generateMatchesMutation.mutateAsync(activeCategory.id);
              toast({ title: "Matches Generated" });
            } catch (err: any) {
              toast({ title: "Error", description: err.message, variant: "destructive" });
            }
          }}
          onAdvanceWinners={async () => {
            try {
              const result = await advanceWinnersMutation.mutateAsync(activeCategory.id);
              if (result.message === "Tournament complete") {
                toast({ title: "Tournament Complete", description: "All rounds are finished." });
              } else {
                toast({ title: "Next Round Created" });
              }
            } catch (err: any) {
              toast({ title: "Error", description: err.message, variant: "destructive" });
            }
          }}
          isGenerating={generateMatchesMutation.isPending}
          isAdvancing={advanceWinnersMutation.isPending}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No categories yet. {canManage ? "Add a category to get started." : ""}</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new event category (e.g., Men's Doubles, Mixed Doubles).</DialogDescription>
          </DialogHeader>
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit(handleCreateCategory)} className="space-y-4">
              <FormField control={catForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl><Input data-testid="input-category-name" placeholder="Men's Doubles" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={catForm.control} name="format" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-category-format"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="KNOCKOUT">Knockout</SelectItem>
                        <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                        <SelectItem value="GROUP_KNOCKOUT">Group + Knockout</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={catForm.control} name="playersPerSide" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Players Per Side</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value.toString()}>
                      <FormControl><SelectTrigger data-testid="select-players-per-side"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">Singles (1v1)</SelectItem>
                        <SelectItem value="2">Doubles (2v2)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={catForm.control} name="genderRestriction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-gender"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                        <SelectItem value="MALE">Male Only</SelectItem>
                        <SelectItem value="FEMALE">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={catForm.control} name="scoringFormat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scoring</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger data-testid="select-scoring"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="BEST_OF_3">Best of 3</SelectItem>
                        <SelectItem value="BEST_OF_5">Best of 5</SelectItem>
                        <SelectItem value="SINGLE_GAME">Single Game</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {watchFormat === "GROUP_KNOCKOUT" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={catForm.control} name="groupCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Groups</FormLabel>
                      <FormControl><Input data-testid="input-group-count" type="number" min={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={catForm.control} name="advancePerGroup" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advance Per Group</FormLabel>
                      <FormControl><Input data-testid="input-advance-per-group" type="number" min={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {(watchFormat === "ROUND_ROBIN" || watchFormat === "GROUP_KNOCKOUT") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={catForm.control} name="pointsPerWin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points per Win</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={catForm.control} name="pointsPerLoss" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points per Loss</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" data-testid="button-submit-category" disabled={createCatMutation.isPending}>
                  {createCatMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryView({ category, canManage, tournamentId, onDelete, onGenerateMatches, onAdvanceWinners, isGenerating, isAdvancing }: {
  category: TournamentCategory;
  canManage: boolean;
  tournamentId: number;
  onDelete: () => void;
  onGenerateMatches: () => void;
  onAdvanceWinners: () => void;
  isGenerating: boolean;
  isAdvancing: boolean;
}) {
  const { data: teams, isLoading: teamsLoading } = useTournamentTeams(category.id);
  const { data: matches } = useTournamentMatches(category.id);
  const { data: standings } = useTournamentStandings(category.id);
  const [activeTab, setActiveTab] = useState("teams");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-lg">{category.name}</CardTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge>{formatLabels[category.format]}</Badge>
            <Badge variant="outline">{category.playersPerSide === 1 ? "Singles" : "Doubles"}</Badge>
            <Badge variant="outline">{category.genderRestriction || "Mixed"}</Badge>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={onGenerateMatches}
              disabled={isGenerating || !teams || teams.length < 2}
              data-testid="button-generate-matches"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Swords className="h-3.5 w-3.5 mr-1" />}
              Generate Matches
            </Button>
            {category.format === "KNOCKOUT" && matches && matches.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAdvanceWinners}
                disabled={isAdvancing}
                data-testid="button-advance-winners"
              >
                {isAdvancing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 mr-1" />}
                Advance Winners
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} data-testid="button-delete-category">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-category-view">
            <TabsTrigger value="teams" data-testid="tab-teams"><Users className="h-3.5 w-3.5 mr-1" /> Teams ({teams?.length || 0})</TabsTrigger>
            <TabsTrigger value="matches" data-testid="tab-matches"><Swords className="h-3.5 w-3.5 mr-1" /> Matches ({matches?.length || 0})</TabsTrigger>
            {(category.format === "ROUND_ROBIN" || category.format === "GROUP_KNOCKOUT") && (
              <TabsTrigger value="standings" data-testid="tab-standings"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Standings</TabsTrigger>
            )}
            {category.format === "KNOCKOUT" && (
              <TabsTrigger value="bracket" data-testid="tab-bracket"><GitBranch className="h-3.5 w-3.5 mr-1" /> Bracket</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="teams">
            <TeamsTab categoryId={category.id} teams={teams || []} canManage={canManage} isDoubles={category.playersPerSide === 2} />
          </TabsContent>

          <TabsContent value="matches">
            <MatchesTab matches={matches || []} teams={teams || []} canManage={canManage} categoryId={category.id} />
          </TabsContent>

          {(category.format === "ROUND_ROBIN" || category.format === "GROUP_KNOCKOUT") && (
            <TabsContent value="standings">
              <StandingsTab standings={standings || []} teams={teams || []} category={category} />
            </TabsContent>
          )}

          {category.format === "KNOCKOUT" && (
            <TabsContent value="bracket">
              <BracketView matches={matches || []} teams={teams || []} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TeamsTab({ categoryId, teams, canManage, isDoubles }: {
  categoryId: number;
  teams: any[];
  canManage: boolean;
  isDoubles: boolean;
}) {
  const registerMutation = useRegisterTeam();
  const deleteMutation = useDeleteTeam();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const teamForm = useForm({
    defaultValues: { player1Id: "", player2Id: "", seedNumber: "" },
  });

  async function handleAddTeam(values: any) {
    try {
      const data: any = {
        categoryId,
        player1Id: Number(values.player1Id),
        seedNumber: values.seedNumber ? Number(values.seedNumber) : null,
      };
      if (isDoubles && values.player2Id) {
        data.player2Id = Number(values.player2Id);
      }
      await registerMutation.mutateAsync(data);
      toast({ title: "Team Registered" });
      setAddOpen(false);
      teamForm.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function getTeamName(team: any) {
    const p1Name = team.player1?.user?.fullName || `Player #${team.player1Id}`;
    if (team.player2) {
      const p2Name = team.player2?.user?.fullName || `Player #${team.player2Id}`;
      return `${p1Name} & ${p2Name}`;
    }
    return p1Name;
  }

  return (
    <div className="space-y-3 mt-3">
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No teams registered yet.</p>
      ) : (
        <div className="space-y-2">
          {teams.map((team, idx) => (
            <div key={team.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50" data-testid={`team-row-${team.id}`}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono w-6">{team.seedNumber || idx + 1}</span>
                <span className="text-sm font-medium">{getTeamName(team)}</span>
                {team.groupNumber && <Badge variant="outline" className="text-xs">Group {team.groupNumber}</Badge>}
              </div>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive h-7 w-7"
                  data-testid={`button-remove-team-${team.id}`}
                  onClick={() => deleteMutation.mutate({ teamId: team.id, categoryId })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} data-testid="button-add-team">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Team
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Team</DialogTitle>
                <DialogDescription>Enter player profile IDs to register a team.</DialogDescription>
              </DialogHeader>
              <form onSubmit={teamForm.handleSubmit(handleAddTeam)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Player 1 ID</label>
                  <Input data-testid="input-player1-id" type="number" {...teamForm.register("player1Id")} placeholder="Player profile ID" />
                </div>
                {isDoubles && (
                  <div>
                    <label className="text-sm font-medium">Player 2 ID</label>
                    <Input data-testid="input-player2-id" type="number" {...teamForm.register("player2Id")} placeholder="Player profile ID" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Seed Number (optional)</label>
                  <Input data-testid="input-seed" type="number" {...teamForm.register("seedNumber")} placeholder="Seed ranking" />
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="button-submit-team" disabled={registerMutation.isPending}>
                    {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Register
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function MatchesTab({ matches, teams, canManage, categoryId }: {
  matches: TournamentMatch[];
  teams: any[];
  canManage: boolean;
  categoryId: number;
}) {
  const scoreMutation = useScoreMatch();
  const { toast } = useToast();
  const [scoreMatchData, setScoreMatchData] = useState<{ match: TournamentMatch; games: Array<{ scoreA: string; scoreB: string }> } | null>(null);

  function getTeamName(teamId: number | null) {
    if (!teamId) return "BYE";
    const team = teams.find(t => t.id === teamId);
    if (!team) return `Team #${teamId}`;
    const p1 = team.player1?.user?.fullName || `P${team.player1Id}`;
    if (team.player2) {
      const p2 = team.player2?.user?.fullName || `P${team.player2Id}`;
      return `${p1} / ${p2}`;
    }
    return p1;
  }

  const groupedByRound = matches.reduce((acc, m) => {
    const key = m.groupNumber ? `Group ${m.groupNumber}` : `Round ${m.round}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, TournamentMatch[]>);

  function openScoreDialog(match: TournamentMatch) {
    const existingScores = (match.scores as Array<{ scoreA: number; scoreB: number }>) || [];
    const games = existingScores.length > 0
      ? existingScores.map(s => ({ scoreA: s.scoreA.toString(), scoreB: s.scoreB.toString() }))
      : [{ scoreA: "", scoreB: "" }, { scoreA: "", scoreB: "" }, { scoreA: "", scoreB: "" }];
    setScoreMatchData({ match, games });
  }

  async function handleSubmitScore() {
    if (!scoreMatchData) return;
    const { match, games } = scoreMatchData;
    const validGames = games.filter(g => g.scoreA !== "" && g.scoreB !== "");
    const scores = validGames.map(g => ({ scoreA: Number(g.scoreA), scoreB: Number(g.scoreB) }));

    let teamAWins = 0, teamBWins = 0;
    scores.forEach(s => { if (s.scoreA > s.scoreB) teamAWins++; else teamBWins++; });
    const winnerId = teamAWins > teamBWins ? match.teamAId : match.teamBId;

    try {
      await scoreMutation.mutateAsync({
        matchId: match.id,
        scores,
        winnerId,
        status: "FINISHED",
      });
      toast({ title: "Score Recorded" });
      setScoreMatchData(null);
      import("@/lib/queryClient").then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "matches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "standings"] });
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6 mt-3">No matches generated yet. Register teams first, then generate matches.</p>;
  }

  return (
    <div className="space-y-4 mt-3">
      {Object.entries(groupedByRound).map(([label, roundMatches]) => (
        <div key={label}>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{label}</h4>
          <div className="space-y-2">
            {roundMatches.map(match => (
              <div key={match.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/50" data-testid={`match-row-${match.id}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={matchStatusColors[match.status] || ""} data-testid={`badge-match-status-${match.id}`}>
                    {match.isBye ? "BYE" : match.status}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                    <span className={`truncate ${match.winnerId === match.teamAId ? "font-bold" : ""}`}>
                      {getTeamName(match.teamAId)}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className={`truncate ${match.winnerId === match.teamBId ? "font-bold" : ""}`}>
                      {getTeamName(match.teamBId)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {match.scores && (match.scores as any[]).length > 0 && (
                    <span className="text-xs text-muted-foreground font-mono" data-testid={`text-score-${match.id}`}>
                      {(match.scores as Array<{ scoreA: number; scoreB: number }>).map((s, i) => `${s.scoreA}-${s.scoreB}`).join(", ")}
                    </span>
                  )}
                  {canManage && !match.isBye && match.status !== "FINISHED" && (
                    <Button size="sm" variant="outline" onClick={() => openScoreDialog(match)} data-testid={`button-score-${match.id}`}>
                      Score
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={scoreMatchData !== null} onOpenChange={() => setScoreMatchData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Scores</DialogTitle>
            <DialogDescription>
              {scoreMatchData && `${getTeamName(scoreMatchData.match.teamAId)} vs ${getTeamName(scoreMatchData.match.teamBId)}`}
            </DialogDescription>
          </DialogHeader>
          {scoreMatchData && (
            <div className="space-y-3">
              {scoreMatchData.games.map((game, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    value={game.scoreA}
                    data-testid={`input-score-a-${i}`}
                    onChange={e => {
                      const newGames = [...scoreMatchData.games];
                      newGames[i] = { ...newGames[i], scoreA: e.target.value };
                      setScoreMatchData({ ...scoreMatchData, games: newGames });
                    }}
                    placeholder={`Game ${i + 1}`}
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min={0}
                    value={game.scoreB}
                    data-testid={`input-score-b-${i}`}
                    onChange={e => {
                      const newGames = [...scoreMatchData.games];
                      newGames[i] = { ...newGames[i], scoreB: e.target.value };
                      setScoreMatchData({ ...scoreMatchData, games: newGames });
                    }}
                    placeholder={`Game ${i + 1}`}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setScoreMatchData({
                ...scoreMatchData,
                games: [...scoreMatchData.games, { scoreA: "", scoreB: "" }]
              })}>
                Add Game
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreMatchData(null)}>Cancel</Button>
            <Button
              onClick={handleSubmitScore}
              disabled={scoreMutation.isPending}
              data-testid="button-submit-score"
            >
              {scoreMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StandingsTab({ standings, teams, category }: {
  standings: any[];
  teams: any[];
  category: TournamentCategory;
}) {
  function getTeamName(teamId: number) {
    const team = teams.find(t => t.id === teamId);
    if (!team) return `Team #${teamId}`;
    const p1 = team.player1?.user?.fullName || `P${team.player1Id}`;
    if (team.player2) {
      const p2 = team.player2?.user?.fullName || `P${team.player2Id}`;
      return `${p1} / ${p2}`;
    }
    return p1;
  }

  const hasGroups = category.format === "GROUP_KNOCKOUT";
  const groups = hasGroups
    ? Array.from(new Set(standings.map(s => s.groupNumber))).sort((a, b) => a - b)
    : [1];

  return (
    <div className="space-y-4 mt-3">
      {groups.map(groupNum => {
        const groupStandings = standings.filter(s => !hasGroups || s.groupNumber === groupNum);
        return (
          <div key={groupNum}>
            {hasGroups && <h4 className="text-sm font-semibold mb-2">Group {groupNum}</h4>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid={`table-standings-group-${groupNum}`}>
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Team</th>
                    <th className="text-center py-2 px-1">P</th>
                    <th className="text-center py-2 px-1">W</th>
                    <th className="text-center py-2 px-1">L</th>
                    <th className="text-center py-2 px-1">GW</th>
                    <th className="text-center py-2 px-1">GL</th>
                    <th className="text-center py-2 px-1">PF</th>
                    <th className="text-center py-2 px-1">PA</th>
                    <th className="text-center py-2 px-1 font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStandings.map((s, idx) => (
                    <tr key={s.id || s.teamId} className="border-b border-border/50" data-testid={`standing-row-${s.teamId}`}>
                      <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{getTeamName(s.teamId)}</td>
                      <td className="text-center py-2 px-1">{s.matchesPlayed}</td>
                      <td className="text-center py-2 px-1">{s.matchesWon}</td>
                      <td className="text-center py-2 px-1">{s.matchesLost}</td>
                      <td className="text-center py-2 px-1">{s.gamesWon}</td>
                      <td className="text-center py-2 px-1">{s.gamesLost}</td>
                      <td className="text-center py-2 px-1">{s.pointsFor}</td>
                      <td className="text-center py-2 px-1">{s.pointsAgainst}</td>
                      <td className="text-center py-2 px-1 font-bold">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketView({ matches, teams }: { matches: TournamentMatch[]; teams: any[] }) {
  function getTeamName(teamId: number | null) {
    if (!teamId) return "TBD";
    const team = teams.find(t => t.id === teamId);
    if (!team) return `#${teamId}`;
    const p1 = team.player1?.user?.fullName || `P${team.player1Id}`;
    if (team.player2) {
      const p2 = team.player2?.user?.fullName || `P${team.player2Id}`;
      return `${p1} / ${p2}`;
    }
    return p1;
  }

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6 mt-3">No bracket matches generated yet.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto pb-4" data-testid="bracket-view">
      <div className="flex gap-8 min-w-fit">
        {rounds.map((round, roundIdx) => {
          const roundMatches = matches.filter(m => m.round === round).sort((a, b) => a.matchOrder - b.matchOrder);
          const roundLabel = roundMatches.length === 1 ? "Final" : roundMatches.length === 2 ? "Semi-Finals" : `Round ${round}`;
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[200px]">
              <h4 className="text-xs font-semibold text-muted-foreground text-center uppercase">{roundLabel}</h4>
              <div className="flex flex-col justify-around flex-1 gap-4" style={{ paddingTop: `${roundIdx * 24}px` }}>
                {roundMatches.map(match => (
                  <div
                    key={match.id}
                    className="border rounded-md overflow-hidden"
                    data-testid={`bracket-match-${match.id}`}
                  >
                    <div className={`flex items-center justify-between px-3 py-2 text-xs border-b ${match.winnerId === match.teamAId ? "bg-primary/10 font-semibold" : ""}`}>
                      <span className="truncate max-w-[140px]">{getTeamName(match.teamAId)}</span>
                      {match.scores && (match.scores as any[]).length > 0 && (
                        <span className="font-mono text-muted-foreground ml-1">
                          {(match.scores as Array<{ scoreA: number; scoreB: number }>).filter(s => s.scoreA > s.scoreB).length}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center justify-between px-3 py-2 text-xs ${match.winnerId === match.teamBId ? "bg-primary/10 font-semibold" : ""}`}>
                      <span className="truncate max-w-[140px]">{getTeamName(match.teamBId)}</span>
                      {match.scores && (match.scores as any[]).length > 0 && (
                        <span className="font-mono text-muted-foreground ml-1">
                          {(match.scores as Array<{ scoreA: number; scoreB: number }>).filter(s => s.scoreB > s.scoreA).length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

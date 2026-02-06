import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer, useUpdateSession, useDeleteSession } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs } from "@/hooks/use-clubs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionMatches, useStartMatch, useCompleteMatch, useSwapPlayer, useAutoGenerateMatches } from "@/hooks/use-matches";
import { BadmintonCourt, type CourtMatch } from "@/components/BadmintonCourt";
import { MatchQueue, CompletedMatches } from "@/components/MatchQueue";
import { PlayerStatsPopup } from "@/components/PlayerStatsPopup";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Trophy, UserPlus, X, Shuffle, Settings2, Plus, Minus, CheckCircle, Trash2 } from "lucide-react";

export default function SessionDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { data: session, isLoading: isLoadingSession } = useSession(id);
  const { data: signups, isLoading: isLoadingSignups } = useSessionSignups(id);
  const { data: allPlayers } = usePlayers();
  const { mutate: join, isPending: isJoining } = useJoinSession();
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdrawSession();
  const { mutate: adminAddPlayer, isPending: isAdding } = useAdminAddPlayer();
  const { mutate: adminRemovePlayer } = useAdminRemovePlayer();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editCourts, setEditCourts] = useState(0);
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();

  const CATEGORIES = [
    { value: "A", label: "Category A" },
    { value: "B", label: "Category B" },
    { value: "C", label: "Category C" },
    { value: "D", label: "Category D" },
  ];

  const { data: sessionClubs } = useMySessionClubs(!!user);
  
  const isSignedUp = signups?.some(s => s.playerId === user?.playerProfile?.id);
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const isOrganiser = session ? managedClubIds.has(session.clubId) : false;
  
  const signedUpPlayerIds = new Set(signups?.map(s => s.playerId) || []);
  // allPlayers returns users with playerProfile, filter those with profiles
  const availablePlayers = allPlayers
    ?.filter(u => u.playerProfile && !signedUpPlayerIds.has(u.playerProfile.id))
    .map(u => ({ 
      id: u.playerProfile!.id, 
      fullName: u.fullName, 
      gender: u.playerProfile!.gender, 
      category: u.playerProfile!.category 
    })) || [];

  const handleAddPlayer = () => {
    if (selectedPlayerId) {
      adminAddPlayer({ sessionId: id, playerId: Number(selectedPlayerId) }, {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedPlayerId("");
        }
      });
    }
  };

  if (isLoadingSession || isLoadingSignups) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">{session.matchMode}</Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{session.status}</Badge>
            {isOrganiser && (
              <Dialog open={settingsOpen} onOpenChange={(open) => {
                setSettingsOpen(open);
                if (open) {
                  setEditCourts(session.courtsAvailable);
                  setEditShuttleTubes(session.shuttleTubesUsed || 0);
                  setEditCategories(session.allowedCategories || ["A", "B", "C", "D"]);
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1" data-testid="button-session-settings">
                    <Settings2 className="w-4 h-4" /> Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Session Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Number of Courts (1-10)</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10}
                        value={editCourts}
                        onChange={(e) => setEditCourts(Math.min(10, Math.max(1, Number(e.target.value))))}
                        className="mt-2"
                        data-testid="input-edit-courts"
                      />
                    </div>
                    <div>
                      <Label>Shuttle Tubes Used</Label>
                      <Input 
                        type="number" 
                        min={0}
                        value={editShuttleTubes}
                        onChange={(e) => setEditShuttleTubes(Math.max(0, Number(e.target.value)))}
                        className="mt-2"
                        data-testid="input-shuttle-tubes"
                      />
                    </div>
                    <div>
                      <Label>Allowed Categories</Label>
                      <p className="text-sm text-muted-foreground mb-2">Select which player categories can join this session.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map((cat) => (
                          <div key={cat.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${cat.value}`}
                              checked={editCategories.includes(cat.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditCategories([...editCategories, cat.value]);
                                } else {
                                  setEditCategories(editCategories.filter(c => c !== cat.value));
                                }
                              }}
                              data-testid={`checkbox-edit-category-${cat.value}`}
                            />
                            <label htmlFor={`cat-${cat.value}`} className="text-sm cursor-pointer">
                              {cat.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        updateSession({ 
                          sessionId: id, 
                          updates: { 
                            courtsAvailable: editCourts, 
                            shuttleTubesUsed: editShuttleTubes,
                            allowedCategories: editCategories 
                          } 
                        }, {
                          onSuccess: () => setSettingsOpen(false)
                        });
                      }}
                      disabled={isUpdating || editCategories.length === 0}
                      data-testid="button-save-settings"
                    >
                      {isUpdating ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {isOrganiser && (
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" data-testid="button-delete-session">
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Session</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{session.title}"? This will also remove all signups and matches. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteSession(id, {
                          onSuccess: () => {
                            setDeleteDialogOpen(false);
                            setLocation("/sessions");
                          }
                        });
                      }}
                      disabled={isDeleting}
                      data-testid="button-confirm-delete-session"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete Session
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <h1 className="text-4xl font-display font-bold mb-2">{session.title}</h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(session.date), "EEEE, MMMM do")} • {session.startTime} • {session.courtsAvailable} Courts
            {(session.shuttleTubesUsed ?? 0) > 0 && ` • ${session.shuttleTubesUsed} Shuttle Tubes`}
          </p>
        </div>

        <Card className="min-w-[300px] border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex justify-between mb-4">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-bold">{signups?.length} / {session.maxPlayers}</span>
            </div>
            {session.status === "COMPLETED" ? (
              <Badge variant="secondary" className="w-full justify-center py-2 text-base">
                <CheckCircle className="w-4 h-4 mr-2" /> Session Completed
              </Badge>
            ) : isSignedUp ? (
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => withdraw(id)}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            ) : (
              <Button 
                className="w-full shadow-lg shadow-primary/25" 
                onClick={() => join(id)}
                disabled={isJoining || (signups?.length || 0) >= session.maxPlayers}
              >
                {isJoining ? "Joining..." : "Join Session"}
              </Button>
            )}
            {isOrganiser && session.status !== "COMPLETED" && (
              <Button 
                variant="outline" 
                className="w-full mt-3 gap-2" 
                onClick={() => {
                  if (confirm("Are you sure you want to finish this session? This will archive all matches.")) {
                    updateSession({ sessionId: id, updates: { status: "COMPLETED" } });
                  }
                }}
                disabled={isUpdating}
                data-testid="button-finish-session"
              >
                <CheckCircle className="w-4 h-4" />
                {isUpdating ? "Finishing..." : "Finish Session"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="signups" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-muted/50 p-1">
          <TabsTrigger value="signups" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" /> Players ({signups?.length})
          </TabsTrigger>
          <TabsTrigger value="matches" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Trophy className="w-4 h-4 mr-2" /> Courts & Matches
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="signups" className="mt-6">
          {isOrganiser && (
            <div className="mb-4 flex justify-end">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-player">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Player to Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger data-testid="select-player">
                        <SelectValue placeholder="Select a player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers.map(player => (
                          <SelectItem key={player.id} value={String(player.id)}>
                            {player.fullName} ({player.gender || "?"} - {player.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full" 
                      onClick={handleAddPlayer} 
                      disabled={!selectedPlayerId || isAdding}
                      data-testid="button-confirm-add-player"
                    >
                      {isAdding ? "Adding..." : "Add to Session"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signups?.map((signup) => (
              <div key={signup.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm hover-elevate cursor-pointer" data-testid={`signup-${signup.id}`}>
                <div 
                  className="flex items-center flex-1"
                  onClick={() => setStatsPlayerId(signup.playerId)}
                  data-testid={`button-player-stats-${signup.playerId}`}
                >
                  <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player.user.fullName}`} />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{signup.player.user.fullName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs h-5">{signup.player.gender || "?"}</Badge>
                      <Badge variant="outline" className="text-xs h-5">Rank {signup.player.rankingPoints}</Badge>
                      <span className="text-xs text-muted-foreground">Level {signup.player.category}</span>
                    </div>
                  </div>
                </div>
                {isOrganiser && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      adminRemovePlayer({ sessionId: id, playerId: signup.playerId });
                    }}
                    data-testid={`button-remove-player-${signup.playerId}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <PlayerStatsPopup 
            profileId={statsPlayerId} 
            open={statsPlayerId !== null}
            onOpenChange={(open) => !open && setStatsPlayerId(null)}
          />
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <MatchesView 
            sessionId={id} 
            isOrganiser={isOrganiser} 
            matchMode={session.matchMode} 
            courtsAvailable={session.courtsAvailable}
            courtNames={session.courtNames}
            signups={signups || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchesView({ sessionId, isOrganiser, matchMode, courtsAvailable, courtNames: initialCourtNames, signups }: { 
  sessionId: number; 
  isOrganiser: boolean; 
  matchMode: "COMPETITIVE" | "SOCIAL";
  courtsAvailable: number;
  courtNames?: string[] | null;
  signups: { playerId: number; player: { id: number; user: { fullName: string }; category: string | null } }[];
}) {
  const { data: matches, isLoading } = useSessionMatches(sessionId);
  const { mutate: startMatch } = useStartMatch();
  const { mutate: completeMatch } = useCompleteMatch();
  const { mutate: swapPlayer } = useSwapPlayer();
  const { mutate: autoGenerate, isPending: isGenerating } = useAutoGenerateMatches();
  const { mutate: updateSession } = useUpdateSession();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [courtsToUse, setCourtsToUse] = useState(Math.min(courtsAvailable, 4));
  const [matchesToGenerate, setMatchesToGenerate] = useState(8);
  const [courtNamesState, setCourtNamesState] = useState<string[]>(initialCourtNames || []);

  useEffect(() => {
    setCourtNamesState(initialCourtNames || []);
  }, [initialCourtNames]);

  const handleCourtNameChange = (courtNumber: number, name: string) => {
    const newNames = [...courtNamesState];
    while (newNames.length < courtNumber) {
      newNames.push(`Court ${newNames.length + 1}`);
    }
    newNames[courtNumber - 1] = name;
    setCourtNamesState(newNames);
    updateSession({ sessionId, updates: { courtNames: newNames } });
  };

  if (isLoading) return <div className="p-8 text-center">Loading matches...</div>;

  // Transform matches to CourtMatch type
  const typedMatches: CourtMatch[] = (matches || []).map(m => ({
    id: m.id,
    courtNumber: m.courtNumber,
    status: (m.status as "QUEUED" | "LIVE" | "COMPLETED") || (m.isCompleted ? "COMPLETED" : "QUEUED"),
    teamAPlayer1: m.teamAPlayer1,
    teamAPlayer2: m.teamAPlayer2,
    teamBPlayer1: m.teamBPlayer1,
    teamBPlayer2: m.teamBPlayer2,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    startedAt: m.startedAt ? (m.startedAt instanceof Date ? m.startedAt.toISOString() : m.startedAt) : null,
    completedAt: m.completedAt ? (m.completedAt instanceof Date ? m.completedAt.toISOString() : m.completedAt) : null,
    queuePosition: m.queuePosition,
  }));

  // Get live matches assigned to courts
  const liveMatches = typedMatches.filter(m => m.status === "LIVE");
  
  // Available courts (not currently occupied)
  const occupiedCourts = new Set(liveMatches.map(m => m.courtNumber));
  const availableCourts = Array.from({ length: courtsToUse }, (_, i) => i + 1)
    .filter(c => !occupiedCourts.has(c));

  // Available players for swapping (those signed up)
  const availablePlayers = signups.map(s => ({
    id: s.player.id,
    fullName: s.player.user.fullName,
    category: s.player.category,
  }));

  const handleGenerate = () => {
    autoGenerate({ sessionId, numberOfMatches: matchesToGenerate, courtsToUse });
    setShowGenerateDialog(false);
  };

  return (
    <div className="space-y-8">
      {isOrganiser && (
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Courts:</span>
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setCourtsToUse(Math.max(1, courtsToUse - 1))}
                disabled={courtsToUse <= 1}
                data-testid="button-decrease-courts"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Badge variant="secondary" className="text-lg px-4 py-1 min-w-[3rem] justify-center" data-testid="badge-courts-count">
                {courtsToUse}
              </Badge>
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => setCourtsToUse(Math.min(courtsAvailable, 10, courtsToUse + 1))}
                disabled={courtsToUse >= Math.min(courtsAvailable, 10)}
                data-testid="button-increase-courts"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">(max {Math.min(courtsAvailable, 10)})</span>
          </div>
          <div className="flex gap-2">
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-generate-matches">
                  <Shuffle className="w-4 h-4" />
                  Generate Matches
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Matches</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Number of Courts to Use (max {courtsAvailable})</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={Math.min(courtsAvailable, 10)}
                      value={courtsToUse}
                      onChange={(e) => setCourtsToUse(Math.min(Number(e.target.value), courtsAvailable, 10))}
                      className="mt-2"
                      data-testid="input-courts-to-use"
                    />
                  </div>
                  <div>
                    <Label>Number of Matches to Queue (max 8)</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={8}
                      value={matchesToGenerate}
                      onChange={(e) => setMatchesToGenerate(Math.min(Number(e.target.value), 8))}
                      className="mt-2"
                      data-testid="input-matches-to-generate"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    data-testid="button-confirm-generate"
                  >
                    {isGenerating ? "Generating..." : "Generate Matches"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Live Courts */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Live Courts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: courtsToUse }, (_, i) => i + 1).map(courtNum => {
            const match = liveMatches.find(m => m.courtNumber === courtNum) || 
                         (availableCourts.includes(courtNum) ? null : null);
            return (
              <BadmintonCourt
                key={courtNum}
                courtNumber={courtNum}
                courtName={courtNamesState[courtNum - 1]}
                match={match}
                availablePlayers={availablePlayers}
                isOrganiser={isOrganiser}
                onStartMatch={(matchId, court) => startMatch({ matchId, courtNumber: court })}
                onCompleteMatch={(matchId, scoreA, scoreB) => completeMatch({ matchId, scoreA, scoreB })}
                onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
                onCourtNameChange={handleCourtNameChange}
              />
            );
          })}
        </div>
      </div>

      {/* Match Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MatchQueue
          matches={typedMatches}
          availablePlayers={availablePlayers}
          isOrganiser={isOrganiser}
          onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
          onAssignToCourt={(matchId, courtNumber) => startMatch({ matchId, courtNumber })}
          availableCourts={availableCourts}
        />
        
        <CompletedMatches matches={typedMatches} isOrganiser={isOrganiser} />
      </div>
    </div>
  );
}

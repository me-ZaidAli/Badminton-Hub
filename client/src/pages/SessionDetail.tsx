import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer, useUpdateSession, useDeleteSession, useToggleGender, useTogglePause, useSetPairGroup, useAddGuestPlayer } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs } from "@/hooks/use-clubs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Users, UserPlus, X, Shuffle, Settings2, Plus, Minus, CheckCircle, Trash2, Link2, PauseCircle, PlayCircle, UserPlus2, Trophy, Search, Check } from "lucide-react";

const PAIR_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
];

function getPairColor(pairGroupId: number) {
  return PAIR_COLORS[(pairGroupId - 1) % PAIR_COLORS.length];
}

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
  const { mutate: toggleGender } = useToggleGender();
  const { mutate: togglePause } = useTogglePause();
  const { mutate: setPairGroup } = useSetPairGroup();
  const { mutate: addGuestPlayer, isPending: isAddingGuest } = useAddGuestPlayer();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addGuestDialogOpen, setAddGuestDialogOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [addingPlayerIds, setAddingPlayerIds] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editCourts, setEditCourts] = useState(0);
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();

  const [guestName, setGuestName] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestCategory, setGuestCategory] = useState("D");

  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairPlayer1, setPairPlayer1] = useState<string>("");
  const [pairPlayer2, setPairPlayer2] = useState<string>("");
  const [pairSearch1, setPairSearch1] = useState("");
  const [pairSearch2, setPairSearch2] = useState("");

  const CATEGORIES = [
    { value: "A", label: "Category A" },
    { value: "B", label: "Category B" },
    { value: "C", label: "Category C" },
    { value: "D", label: "Category D" },
  ];

  const { data: sessionClubs } = useMySessionClubs(!!user);
  
  const isSignedUp = signups?.some(s => s.playerId === user?.playerProfile?.id);
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const isSuperAdmin = user?.role === "OWNER";
  const isOrganiser = isSuperAdmin || (session ? managedClubIds.has(session.clubId) : false);
  
  const signedUpPlayerIds = new Set(signups?.map(s => s.playerId) || []);
  const availablePlayers = allPlayers
    ?.filter(u => u.playerProfile && !signedUpPlayerIds.has(u.playerProfile.id))
    .map(u => ({ 
      id: u.playerProfile!.id, 
      fullName: u.fullName, 
      gender: u.playerProfile!.gender, 
      category: u.playerProfile!.category 
    })) || [];

  const handleAddPlayer = (playerId: number) => {
    if (addingPlayerIds.has(playerId)) return;
    setAddingPlayerIds(prev => new Set(prev).add(playerId));
    adminAddPlayer({ sessionId: id, playerId }, {
      onSuccess: () => {
        setAddingPlayerIds(prev => {
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
      },
      onError: () => {
        setAddingPlayerIds(prev => {
          const next = new Set(prev);
          next.delete(playerId);
          return next;
        });
      }
    });
  };

  const handleAddGuest = () => {
    if (guestName.trim()) {
      addGuestPlayer({ sessionId: id, fullName: guestName.trim(), gender: guestGender, category: guestCategory }, {
        onSuccess: () => {
          setAddGuestDialogOpen(false);
          setGuestName("");
          setGuestGender("MALE");
          setGuestCategory("D");
        }
      });
    }
  };

  const handleToggleGender = (signupId: number, currentGender: string) => {
    const newGender = currentGender === "MALE" ? "FEMALE" : "MALE";
    toggleGender({ sessionId: id, signupId, gender: newGender });
  };

  const handleCreatePair = () => {
    if (pairPlayer1 && pairPlayer2 && pairPlayer1 !== pairPlayer2) {
      const nextPairGroupId = Math.max(0, ...(signups || []).map(s => (s as any).pairGroupId || 0)) + 1;
      setPairGroup({ sessionId: id, signupId: Number(pairPlayer1), pairGroupId: nextPairGroupId });
      setPairGroup({ sessionId: id, signupId: Number(pairPlayer2), pairGroupId: nextPairGroupId });
      setPairDialogOpen(false);
      setPairPlayer1("");
      setPairPlayer2("");
    }
  };

  const handleUnpair = (pairGroupId: number) => {
    const pairedSignups = signups?.filter(s => (s as any).pairGroupId === pairGroupId) || [];
    pairedSignups.forEach(s => {
      setPairGroup({ sessionId: id, signupId: s.id, pairGroupId: null });
    });
  };

  const unpairedSignups = signups?.filter(s => !(s as any).pairGroupId) || [];

  const pairGroups = new Map<number, typeof signups>();
  signups?.forEach(s => {
    const pgId = (s as any).pairGroupId;
    if (pgId) {
      if (!pairGroups.has(pgId)) pairGroups.set(pgId, []);
      pairGroups.get(pgId)!.push(s);
    }
  });

  if (isLoadingSession || isLoadingSignups) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Badge variant="outline">{session.matchMode}</Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{session.status}</Badge>
            <Badge variant="outline">{session.playersPerSide === 1 ? "Singles (1v1)" : "Doubles (2v2)"}</Badge>
            {session.matchGenderType !== "MIXED" && (
              <Badge variant="outline">{session.matchGenderType === "FEMALE" ? "Female Matches" : "Male Matches"}</Badge>
            )}
            {session.genderRestriction === "FEMALE_ONLY" && (
              <Badge variant="secondary" className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">Females Only</Badge>
            )}
            {session.sessionType === "JUNIORS_ONLY" && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Juniors {session.juniorAgeGroups?.length ? `(${session.juniorAgeGroups.join(", ")})` : ""}
              </Badge>
            )}
            {session.isPrivate && (
              <Badge variant="outline">Private</Badge>
            )}
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
            {session.genderRestriction === "FEMALE_ONLY" && (
              <p className="text-sm text-pink-600 dark:text-pink-400 mb-2">This session is for female players only.</p>
            )}
            {session.sessionType === "JUNIORS_ONLY" && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                This session is for juniors only (under 18).
                {session.juniorAgeGroups?.length ? ` Age groups: ${session.juniorAgeGroups.join(", ")}` : ""}
              </p>
            )}
            {session.isPrivate && (
              <p className="text-sm text-muted-foreground mb-2">This is a private session. Players can only be added by the organiser.</p>
            )}
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
            ) : session.isPrivate ? (
              <Badge variant="secondary" className="w-full justify-center py-2 text-base">
                Private Session (Invite Only)
              </Badge>
            ) : (
              <Button 
                className="w-full shadow-lg shadow-primary/25" 
                onClick={() => join(id)}
                disabled={isJoining || (signups?.length || 0) >= session.maxPlayers}
                data-testid="button-join-session"
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

      <MatchesView 
        sessionId={id} 
        isOrganiser={isOrganiser} 
        matchMode={session.matchMode} 
        courtsAvailable={session.courtsAvailable}
        courtNames={session.courtNames}
        signups={signups || []}
        playersPerSide={session.playersPerSide}
        matchGenderType={session.matchGenderType}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Session Players ({signups?.length})
          </h2>
          {isOrganiser && (
            <div className="flex items-center gap-2 flex-wrap">
              <Dialog open={addDialogOpen} onOpenChange={(open) => {
                setAddDialogOpen(open);
                if (!open) setPlayerSearchQuery("");
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-add-existing-player">
                    <UserPlus className="w-4 h-4" /> Add Players
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Players to Session</DialogTitle>
                    <DialogDescription>Search and click players to add them instantly</DialogDescription>
                  </DialogHeader>
                  <Command className="rounded-lg border shadow-md" shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search players by name..." 
                      value={playerSearchQuery}
                      onValueChange={setPlayerSearchQuery}
                      data-testid="input-search-add-player"
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>No players found.</CommandEmpty>
                      <CommandGroup>
                        {availablePlayers
                          .filter(p => {
                            if (!playerSearchQuery) return true;
                            const q = playerSearchQuery.toLowerCase();
                            return p.fullName.toLowerCase().includes(q) || 
                              (p.gender || "").toLowerCase().includes(q) ||
                              (p.category || "").toLowerCase().includes(q);
                          })
                          .map(player => {
                            const isCurrentlyAdding = addingPlayerIds.has(player.id);
                            return (
                              <CommandItem
                                key={player.id}
                                value={String(player.id)}
                                onSelect={() => handleAddPlayer(player.id)}
                                className="flex items-center justify-between gap-2 cursor-pointer"
                                disabled={isCurrentlyAdding}
                                data-testid={`select-player-${player.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{player.fullName}</span>
                                  <Badge variant="outline" className="text-xs">{player.gender || "?"}</Badge>
                                  <Badge variant="secondary" className="text-xs">Cat {player.category}</Badge>
                                </div>
                                {isCurrentlyAdding ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                )}
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DialogContent>
              </Dialog>

              <Dialog open={addGuestDialogOpen} onOpenChange={setAddGuestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-new-player">
                    <UserPlus2 className="w-4 h-4" /> Add New Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Player</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter player name..."
                        className="mt-2"
                        data-testid="input-guest-name"
                      />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Select value={guestGender} onValueChange={setGuestGender}>
                        <SelectTrigger className="mt-2" data-testid="select-guest-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={guestCategory} onValueChange={setGuestCategory}>
                        <SelectTrigger className="mt-2" data-testid="select-guest-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleAddGuest}
                      disabled={!guestName.trim() || isAddingGuest}
                      data-testid="button-confirm-add-guest"
                    >
                      {isAddingGuest ? "Adding..." : "Add Player"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signups?.map((signup) => {
            const s = signup as any;
            const effectiveGender = s.genderOverride || signup.player.gender || "?";
            const isPaused = !!s.isPaused;
            const pairGroupId = s.pairGroupId as number | null;

            return (
              <div 
                key={signup.id} 
                className={`flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm hover-elevate ${isPaused ? "opacity-60" : ""}`}
                data-testid={`signup-${signup.id}`}
              >
                <div 
                  className="flex items-center flex-1 min-w-0 cursor-pointer"
                  onClick={() => setStatsPlayerId(signup.playerId)}
                  data-testid={`button-player-stats-${signup.playerId}`}
                >
                  <Avatar className="h-10 w-10 mr-3 shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player.user.fullName}`} />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{signup.player.user.fullName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOrganiser) handleToggleGender(signup.id, effectiveGender);
                        }}
                        data-testid={`badge-gender-${signup.id}`}
                      >
                        {effectiveGender}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{signup.player.category}</Badge>
                      <span className="text-xs text-muted-foreground">Rank {signup.player.rankingPoints}</span>
                      {isPaused && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid={`badge-paused-${signup.id}`}>
                          Paused
                        </Badge>
                      )}
                      {pairGroupId && (
                        <Badge variant="secondary" className={`text-xs ${getPairColor(pairGroupId)}`} data-testid={`badge-pair-${signup.id}`}>
                          Pair {pairGroupId}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isOrganiser && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePause({ sessionId: id, signupId: signup.id, isPaused: !isPaused });
                      }}
                      data-testid={`button-toggle-pause-${signup.id}`}
                    >
                      {isPaused ? <PlayCircle className="w-4 h-4 text-green-600" /> : <PauseCircle className="w-4 h-4 text-amber-600" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        adminRemovePlayer({ sessionId: id, playerId: signup.playerId });
                      }}
                      data-testid={`button-remove-player-${signup.playerId}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isOrganiser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Pair Management
              </h3>
              <Dialog open={pairDialogOpen} onOpenChange={(open) => {
                setPairDialogOpen(open);
                if (!open) { setPairSearch1(""); setPairSearch2(""); setPairPlayer1(""); setPairPlayer2(""); }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="button-create-pair">
                    <Link2 className="w-4 h-4" /> Create Pair
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Pair</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Player 1</Label>
                      <Command className="rounded-lg border mt-2" shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search player..." 
                          value={pairSearch1}
                          onValueChange={setPairSearch1}
                          data-testid="input-search-pair-player-1"
                        />
                        <CommandList className="max-h-[150px]">
                          <CommandEmpty>No players found.</CommandEmpty>
                          <CommandGroup>
                            {unpairedSignups
                              .filter(s => String(s.id) !== pairPlayer2)
                              .filter(s => !pairSearch1 || s.player.user.fullName.toLowerCase().includes(pairSearch1.toLowerCase()))
                              .map(s => (
                                <CommandItem
                                  key={s.id}
                                  value={String(s.id)}
                                  onSelect={() => { setPairPlayer1(String(s.id)); setPairSearch1(s.player.user.fullName); }}
                                  className="cursor-pointer"
                                  data-testid={`select-pair-1-player-${s.id}`}
                                >
                                  <span>{s.player.user.fullName}</span>
                                  {pairPlayer1 === String(s.id) && <Check className="w-4 h-4 ml-auto text-primary" />}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                    <div>
                      <Label>Player 2</Label>
                      <Command className="rounded-lg border mt-2" shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search player..." 
                          value={pairSearch2}
                          onValueChange={setPairSearch2}
                          data-testid="input-search-pair-player-2"
                        />
                        <CommandList className="max-h-[150px]">
                          <CommandEmpty>No players found.</CommandEmpty>
                          <CommandGroup>
                            {unpairedSignups
                              .filter(s => String(s.id) !== pairPlayer1)
                              .filter(s => !pairSearch2 || s.player.user.fullName.toLowerCase().includes(pairSearch2.toLowerCase()))
                              .map(s => (
                                <CommandItem
                                  key={s.id}
                                  value={String(s.id)}
                                  onSelect={() => { setPairPlayer2(String(s.id)); setPairSearch2(s.player.user.fullName); }}
                                  className="cursor-pointer"
                                  data-testid={`select-pair-2-player-${s.id}`}
                                >
                                  <span>{s.player.user.fullName}</span>
                                  {pairPlayer2 === String(s.id) && <Check className="w-4 h-4 ml-auto text-primary" />}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleCreatePair}
                      disabled={!pairPlayer1 || !pairPlayer2 || pairPlayer1 === pairPlayer2}
                      data-testid="button-confirm-create-pair"
                    >
                      Create Pair
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {pairGroups.size > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(pairGroups.entries()).map(([pgId, members]) => (
                  <Card key={pgId} data-testid={`pair-card-${pgId}`}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className={`shrink-0 ${getPairColor(pgId)}`}>
                          Pair {pgId}
                        </Badge>
                        <span className="text-sm truncate">
                          {members?.map(m => m.player.user.fullName).join(" & ")}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => handleUnpair(pgId)}
                        data-testid={`button-unpair-${pgId}`}
                      >
                        Unpair
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pairs created yet.</p>
            )}
          </div>
        )}
      </div>
      
      <PlayerStatsPopup 
        profileId={statsPlayerId} 
        open={statsPlayerId !== null}
        onOpenChange={(open) => !open && setStatsPlayerId(null)}
      />
    </div>
  );
}

function MatchesView({ sessionId, isOrganiser, matchMode, courtsAvailable, courtNames: initialCourtNames, signups, playersPerSide, matchGenderType }: { 
  sessionId: number; 
  isOrganiser: boolean; 
  matchMode: "COMPETITIVE" | "SOCIAL";
  courtsAvailable: number;
  courtNames?: string[] | null;
  signups: { playerId: number; player: { id: number; user: { fullName: string }; category: string | null } }[];
  playersPerSide: number;
  matchGenderType: string;
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
  const [generateGenderType, setGenerateGenderType] = useState(matchGenderType || "MIXED");
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
    autoGenerate({ sessionId, numberOfMatches: matchesToGenerate, courtsToUse, matchGenderType: generateGenderType });
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
                    <Label>Match Format</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {playersPerSide === 1 ? "Singles (1v1)" : "Doubles (2v2)"}
                    </p>
                  </div>
                  <div>
                    <Label>Match Gender Type</Label>
                    <Select value={generateGenderType} onValueChange={setGenerateGenderType}>
                      <SelectTrigger className="mt-2" data-testid="select-generate-gender-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                        <SelectItem value="FEMALE">Female Only</SelectItem>
                        <SelectItem value="MALE">Male Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

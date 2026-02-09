import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer, useUpdateSession, useDeleteSession, useToggleGender, useTogglePause, useSetPairGroup, useAddGuestPlayer, useRestartSession, useAdminInlineEditPlayer, useUploadProfilePicture } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs, useSessionLeaderboard, useClubs } from "@/hooks/use-clubs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionMatches, useStartMatch, useCompleteMatch, useSwapPlayer, useSmartGenerateMatches, useHandlePause, useHandleResume, useUpdateMatchTarget, useStopAllMatches, useEditMatchScore } from "@/hooks/use-matches";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { BadmintonCourt, type CourtMatch } from "@/components/BadmintonCourt";
import { MatchQueue, CompletedMatches } from "@/components/MatchQueue";
import { PlayerStatsPopup } from "@/components/PlayerStatsPopup";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Users, UserPlus, X, Shuffle, Settings2, Plus, Minus, CheckCircle, Trash2, Link2, PauseCircle, PlayCircle, UserPlus2, Trophy, Search, Check, Video, Lock, OctagonX, ArrowRight, RotateCcw, Pencil, Camera } from "lucide-react";

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
  const { mutate: handlePauseReplacement } = useHandlePause();
  const { mutate: handleResumeRebalance } = useHandleResume();
  const { mutate: setPairGroup } = useSetPairGroup();
  const { mutate: addGuestPlayer, isPending: isAddingGuest } = useAddGuestPlayer();
  const { mutate: adminInlineEdit } = useAdminInlineEditPlayer();
  const { mutate: uploadProfilePicture } = useUploadProfilePicture();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addGuestDialogOpen, setAddGuestDialogOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [addingPlayerIds, setAddingPlayerIds] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editCourts, setEditCourts] = useState(0);
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editLiveStreamUrl, setEditLiveStreamUrl] = useState("");
  const [editClubId, setEditClubId] = useState<number | null>(null);
  const [editMaxPlayers, setEditMaxPlayers] = useState(0);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();
  const { mutate: restartSession, isPending: isRestarting } = useRestartSession();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityValue, setCapacityValue] = useState(0);

  const [guestName, setGuestName] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestCategory, setGuestCategory] = useState("D");

  const [editingNameSignupId, setEditingNameSignupId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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
  const { data: allClubs } = useClubs();
  
  const { data: memberships } = useQuery<{ clubId: number; membershipStatus: string }[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const userProfileForClub = user?.playerProfiles?.find((p: any) => session && p.clubId === session.clubId) || user?.playerProfiles?.[0];
  const isSignedUp = signups?.some(s => s.playerId === userProfileForClub?.id);
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const isSuperAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isOrganiser = isSuperAdmin || (session ? managedClubIds.has(session.clubId) : false);
  
  const isApprovedMember = (() => {
    if (!user || !session) return false;
    if (isSuperAdmin) return true;
    const m = memberships?.find(m => m.clubId === session.clubId);
    return m?.membershipStatus === "APPROVED";
  })();
  
  const signedUpPlayerIds = new Set(signups?.map(s => s.playerId) || []);
  const availablePlayers = allPlayers
    ?.flatMap(u => {
      const clubProfile = session ? u.playerProfiles?.find((p: any) => p.clubId === session.clubId) : u.playerProfiles?.[0];
      if (!clubProfile || signedUpPlayerIds.has(clubProfile.id)) return [];
      return [{ 
        id: clubProfile.id, 
        fullName: u.fullName, 
        gender: clubProfile.gender, 
        category: clubProfile.category 
      }];
    }) || [];

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
                  setEditLiveStreamUrl(session.liveStreamUrl || "");
                  setEditClubId(session.clubId);
                  setEditMaxPlayers(session.maxPlayers);
                  setEditIsPrivate(session.isPrivate);
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
                      <Label>Session Capacity</Label>
                      <p className="text-sm text-muted-foreground mb-1">Maximum number of players allowed in this session.</p>
                      <Input 
                        type="number" 
                        min={2}
                        max={100}
                        value={editMaxPlayers}
                        onChange={(e) => setEditMaxPlayers(Math.min(100, Math.max(2, Number(e.target.value))))}
                        className="mt-2"
                        data-testid="input-edit-max-players"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Private Session</Label>
                        <p className="text-sm text-muted-foreground">When enabled, only organisers can add players.</p>
                      </div>
                      <Switch 
                        checked={editIsPrivate} 
                        onCheckedChange={setEditIsPrivate}
                        data-testid="switch-edit-is-private"
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
                    {isSuperAdmin && allClubs && allClubs.length > 1 && (
                      <div>
                        <Label>Assign to Club</Label>
                        <p className="text-sm text-muted-foreground mb-2">Move this session to a different club if it was set up incorrectly.</p>
                        <Select value={editClubId?.toString() || ""} onValueChange={(v) => setEditClubId(Number(v))}>
                          <SelectTrigger className="mt-2" data-testid="select-reassign-club">
                            <SelectValue placeholder="Select club" />
                          </SelectTrigger>
                          <SelectContent>
                            {allClubs.map(club => (
                              <SelectItem key={club.id} value={club.id.toString()}>
                                {club.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Live Stream Link</Label>
                      <Input
                        placeholder="https://youtube.com/live/... or any streaming URL"
                        value={editLiveStreamUrl}
                        onChange={(e) => setEditLiveStreamUrl(e.target.value)}
                        className="mt-2"
                        data-testid="input-edit-live-stream-url"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Optional link to any live streaming platform</p>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const sessionUpdates: any = { 
                            courtsAvailable: editCourts, 
                            maxPlayers: editMaxPlayers,
                            isPrivate: editIsPrivate,
                            shuttleTubesUsed: editShuttleTubes,
                            allowedCategories: editCategories,
                            liveStreamUrl: editLiveStreamUrl || ""
                        };
                        if (editClubId && editClubId !== session.clubId) {
                          sessionUpdates.clubId = editClubId;
                        }
                        updateSession({ 
                          sessionId: id, 
                          updates: sessionUpdates
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

          <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <RotateCcw className="w-5 h-5" />
                  Restart Session
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to restart this session? This will permanently delete all completed, active, and queued matches along with their scores. Players will remain signed up and the session will be ready for fresh matches.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive">
                This action cannot be undone. All match history and scores will be lost.
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setRestartDialogOpen(false)} data-testid="button-cancel-restart">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    restartSession(id, {
                      onSuccess: () => setRestartDialogOpen(false)
                    });
                  }}
                  disabled={isRestarting}
                  data-testid="button-confirm-restart"
                >
                  {isRestarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Yes, Restart Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <h1 className="text-4xl font-display font-bold mb-2">{session.title}</h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(session.date), "EEEE, MMMM do")} • {session.startTime} • {session.courtsAvailable} Courts
            {(session.shuttleTubesUsed ?? 0) > 0 && ` • ${session.shuttleTubesUsed} Shuttle Tubes`}
          </p>
          {session.liveStreamUrl && (
            <a href={session.liveStreamUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-live-stream">
                <Video className="w-4 h-4" /> Watch Live Stream
              </Button>
            </a>
          )}
        </div>

        <Card className="min-w-[300px] border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Capacity</span>
              {editingCapacity && isOrganiser ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{signups?.length} /</span>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    value={capacityValue}
                    onChange={(e) => setCapacityValue(Number(e.target.value))}
                    className="w-16 h-8 text-center text-sm"
                    data-testid="input-edit-capacity"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = Math.max(2, Math.min(100, capacityValue));
                        updateSession({ sessionId: id, updates: { maxPlayers: val } });
                        setEditingCapacity(false);
                      } else if (e.key === "Escape") {
                        setEditingCapacity(false);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const val = Math.max(2, Math.min(100, capacityValue));
                      updateSession({ sessionId: id, updates: { maxPlayers: val } });
                      setEditingCapacity(false);
                    }}
                    data-testid="button-save-capacity"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingCapacity(false)}
                    data-testid="button-cancel-capacity"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-bold">{signups?.length} / {session.maxPlayers}</span>
                  {isOrganiser && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setCapacityValue(session.maxPlayers); setEditingCapacity(true); }}
                      data-testid="button-edit-capacity"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
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
            ) : !user ? (
              <Link href="/login">
                <Button className="w-full" variant="outline" data-testid="button-login-to-join">
                  Sign in to Join
                </Button>
              </Link>
            ) : !isApprovedMember ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-center py-2 text-base bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <Lock className="w-4 h-4 mr-2" />
                  Membership Required
                </Badge>
                <p className="text-xs text-muted-foreground text-center">
                  You must be an accepted member of this club to join this session.
                </p>
                <Link href="/clubs">
                  <Button variant="outline" className="w-full" size="sm" data-testid="button-browse-clubs">
                    Browse Clubs
                  </Button>
                </Link>
              </div>
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
              <div className="space-y-2 mt-3">
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
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
                <Button 
                  variant="outline" 
                  className="w-full gap-2 text-destructive"
                  onClick={() => setRestartDialogOpen(true)}
                  disabled={isRestarting}
                  data-testid="button-restart-session"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isRestarting ? "Restarting..." : "Restart Session"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MatchesView 
        sessionId={id} 
        isOrganiser={isOrganiser}
        isSignedUp={!!isSignedUp}
        matchMode={session.matchMode} 
        courtsAvailable={session.courtsAvailable}
        courtNames={session.courtNames}
        signups={signups || []}
        playersPerSide={session.playersPerSide}
        matchGenderType={session.matchGenderType}
        defaultPointsToPlayTo={(session as any).defaultPointsToPlayTo || 21}
        sessionStatus={session.status || "UPCOMING"}
        autoGenerateActive={(session as any).autoGenerateActive || false}
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
            const playerUser = signup.player.user as any;
            const profilePic = playerUser.profilePictureUrl;
            const isEditingName = editingNameSignupId === signup.id;

            return (
              <div 
                key={signup.id} 
                className={`flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm hover-elevate ${isPaused ? "opacity-60" : ""}`}
                data-testid={`signup-${signup.id}`}
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="relative shrink-0 mr-3">
                    <Avatar 
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => setStatsPlayerId(signup.playerId)}
                      data-testid={`avatar-player-${signup.playerId}`}
                    >
                      {profilePic ? (
                        <AvatarImage src={profilePic} />
                      ) : (
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player.user.fullName}`} />
                      )}
                      <AvatarFallback>{signup.player.user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {isSuperAdmin && (
                      <>
                        <button
                          className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRefs.current[signup.id]?.click();
                          }}
                          data-testid={`button-upload-photo-${signup.playerId}`}
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[signup.id] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadProfilePicture({ userId: playerUser.id, sessionId: id, file });
                              e.target.value = "";
                            }
                          }}
                          data-testid={`input-photo-${signup.playerId}`}
                        />
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="h-7 text-sm font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editNameValue.trim().length >= 2) {
                              adminInlineEdit({ profileId: signup.playerId, sessionId: id, fullName: editNameValue.trim() });
                              setEditingNameSignupId(null);
                            } else if (e.key === "Escape") {
                              setEditingNameSignupId(null);
                            }
                          }}
                          data-testid={`input-edit-name-${signup.id}`}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                          if (editNameValue.trim().length >= 2) {
                            adminInlineEdit({ profileId: signup.playerId, sessionId: id, fullName: editNameValue.trim() });
                          }
                          setEditingNameSignupId(null);
                        }} data-testid={`button-save-name-${signup.id}`}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingNameSignupId(null)} data-testid={`button-cancel-name-${signup.id}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className={`font-semibold truncate ${isSuperAdmin ? "cursor-pointer hover:underline" : ""}`}
                        onClick={() => {
                          if (isSuperAdmin) {
                            setEditNameValue(signup.player.user.fullName);
                            setEditingNameSignupId(signup.id);
                          } else {
                            setStatsPlayerId(signup.playerId);
                          }
                        }}
                        data-testid={`text-player-name-${signup.id}`}
                      >
                        {signup.player.user.fullName}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${isSuperAdmin ? "cursor-pointer" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSuperAdmin) {
                            const newGender = effectiveGender === "MALE" ? "FEMALE" : "MALE";
                            adminInlineEdit({ profileId: signup.playerId, sessionId: id, gender: newGender });
                          } else if (isOrganiser) {
                            handleToggleGender(signup.id, effectiveGender);
                          }
                        }}
                        data-testid={`badge-gender-${signup.id}`}
                      >
                        {effectiveGender}
                      </Badge>
                      {isSuperAdmin ? (
                        <Select
                          value={signup.player.category || ""}
                          onValueChange={(grade) => {
                            adminInlineEdit({ profileId: signup.playerId, sessionId: id, category: grade });
                          }}
                        >
                          <SelectTrigger 
                            className="h-6 w-auto min-w-0 px-2 py-0 text-xs border rounded-full gap-1"
                            data-testid={`badge-grade-${signup.id}`}
                          >
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {["A", "B", "C", "D"].map((grade) => (
                              <SelectItem
                                key={grade}
                                value={grade}
                                data-testid={`menu-grade-${grade}-${signup.id}`}
                              >
                                Grade {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{signup.player.category}</Badge>
                      )}
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
                        const newPaused = !isPaused;
                        togglePause({ sessionId: id, signupId: signup.id, isPaused: newPaused }, {
                          onSuccess: () => {
                            if (newPaused) {
                              handlePauseReplacement({ sessionId: id, pausedPlayerId: signup.playerId });
                            } else {
                              handleResumeRebalance({ sessionId: id, resumedPlayerId: signup.playerId, mode: session?.matchMode, genderType: session?.matchGenderType });
                            }
                          }
                        });
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

function MatchesView({ sessionId, isOrganiser, isSignedUp, matchMode, courtsAvailable, courtNames: initialCourtNames, signups, playersPerSide, matchGenderType, defaultPointsToPlayTo = 21, sessionStatus, autoGenerateActive }: { 
  sessionId: number; 
  isOrganiser: boolean;
  isSignedUp: boolean;
  matchMode: "COMPETITIVE" | "SOCIAL" | "TRAINING";
  courtsAvailable: number;
  courtNames?: string[] | null;
  signups: { playerId: number; player: { id: number; user: { fullName: string }; category: string | null } }[];
  playersPerSide: number;
  matchGenderType: string;
  defaultPointsToPlayTo?: number;
  sessionStatus: string;
  autoGenerateActive: boolean;
}) {
  const { data: matches, isLoading } = useSessionMatches(sessionId);
  const { mutate: startMatch } = useStartMatch();
  const { mutateAsync: completeMatch } = useCompleteMatch();
  const { mutate: swapPlayer } = useSwapPlayer();
  const { mutate: updateMatchTarget } = useUpdateMatchTarget();
  const { mutate: smartGenerate, isPending: isSmartGenerating } = useSmartGenerateMatches();
  const { mutate: updateSession } = useUpdateSession();
  const { mutate: stopAllMatches, isPending: isStoppingAll } = useStopAllMatches();
  const queryClient = useQueryClient();

  const [courtsToUse, setCourtsToUse] = useState(Math.min(courtsAvailable, 4));
  const [courtNamesState, setCourtNamesState] = useState<string[]>(initialCourtNames || []);
  const [activeMode, setActiveMode] = useState<"SOCIAL" | "COMPETITIVE">(matchMode === "COMPETITIVE" ? "COMPETITIVE" : "SOCIAL");
  const [queueTargetSize, setQueueTargetSize] = useState(3);
  const [generateGenderType, setGenerateGenderType] = useState(matchGenderType || "MIXED");
  const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const [forcedCompletionActive, setForcedCompletionActive] = useState(false);
  const [forcedCompletionIndex, setForcedCompletionIndex] = useState(0);
  const [forcedMatches, setForcedMatches] = useState<CourtMatch[]>([]);
  const [fcWinner, setFcWinner] = useState<"A" | "B" | null>(null);
  const [fcWinnerScore, setFcWinnerScore] = useState("");
  const [fcLoserScore, setFcLoserScore] = useState("");
  const [fcStep, setFcStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fcSubmitting, setFcSubmitting] = useState(false);
  const [fcShowSuccess, setFcShowSuccess] = useState(false);

  const isSessionCompleted = sessionStatus === "COMPLETED";

  useEffect(() => {
    setCourtNamesState(initialCourtNames || []);
  }, [initialCourtNames]);

  useEffect(() => {
    if (!autoGenerateActive || !isOrganiser) return;
    const interval = setInterval(() => {
      smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: true });
    }, 8000);
    return () => clearInterval(interval);
  }, [autoGenerateActive, isOrganiser, sessionId, activeMode, queueTargetSize, generateGenderType, smartGenerate]);

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
    pointsToPlayTo: (m as any).pointsToPlayTo,
  }));

  const liveMatches = typedMatches.filter(m => m.status === "LIVE");
  const queuedMatches = typedMatches.filter(m => m.status === "QUEUED");
  const completedMatches = typedMatches.filter(m => m.status === "COMPLETED");
  const completedCount = completedMatches.length;
  
  const occupiedCourts = new Set(liveMatches.map(m => m.courtNumber));
  const availableCourts = Array.from({ length: courtsToUse }, (_, i) => i + 1)
    .filter(c => !occupiedCourts.has(c));

  const availablePlayers = signups.map(s => ({
    id: s.player.id,
    fullName: s.player.user.fullName,
    category: s.player.category,
  }));

  const handleSmartGenerate = () => {
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType });
  };

  const handleStartAutoGenerate = () => {
    updateSession({ sessionId, updates: { autoGenerateActive: true } });
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: true });
  };

  const handleStopAutoGenerate = () => {
    updateSession({ sessionId, updates: { autoGenerateActive: false } });
  };

  const handleStopAllMatches = () => {
    stopAllMatches({ sessionId }, {
      onSuccess: (data: any) => {
        if (data.frozenLive > 0 && data.frozenMatches?.length > 0) {
          const mapped: CourtMatch[] = data.frozenMatches.map((m: any) => ({
            id: m.id,
            courtNumber: m.courtNumber,
            status: m.status || "LIVE",
            teamAPlayer1: m.teamAPlayer1,
            teamAPlayer2: m.teamAPlayer2,
            teamBPlayer1: m.teamBPlayer1,
            teamBPlayer2: m.teamBPlayer2,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            startedAt: m.startedAt,
            completedAt: m.completedAt,
            queuePosition: m.queuePosition,
            pointsToPlayTo: m.pointsToPlayTo,
          }));
          const sorted = mapped.sort((a: CourtMatch, b: CourtMatch) => {
            const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
            const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
            return aTime - bTime;
          });
          setForcedMatches(sorted);
          setForcedCompletionIndex(0);
          setForcedCompletionActive(true);
          resetFcFlow();
        }
      }
    });
  };

  const resetFcFlow = () => {
    setFcWinner(null);
    setFcWinnerScore("");
    setFcLoserScore("");
    setFcStep(1);
    setFcShowSuccess(false);
  };

  const getCurrentForcedMatch = () => {
    if (!forcedCompletionActive || forcedCompletionIndex >= forcedMatches.length) return null;
    return forcedMatches[forcedCompletionIndex];
  };

  const handleFcConfirm = async () => {
    const match = getCurrentForcedMatch();
    if (!match || !fcWinner || !fcWinnerScore || !fcLoserScore) return;
    const wScore = Number(fcWinnerScore);
    const lScore = Number(fcLoserScore);
    if (isNaN(wScore) || isNaN(lScore) || wScore < 0 || lScore < 0) return;
    if (wScore <= lScore) return;
    const sA = fcWinner === "A" ? wScore : lScore;
    const sB = fcWinner === "B" ? wScore : lScore;
    setFcSubmitting(true);
    try {
      await completeMatch({ matchId: match.id, scoreA: sA, scoreB: sB });
      setFcShowSuccess(true);
      setTimeout(() => {
        setFcShowSuccess(false);
        const nextIndex = forcedCompletionIndex + 1;
        if (nextIndex >= forcedMatches.length) {
          setFcStep(5);
        } else {
          setForcedCompletionIndex(nextIndex);
          resetFcFlow();
        }
      }, 1500);
    } catch {
    } finally {
      setFcSubmitting(false);
    }
  };

  const fcMatch = getCurrentForcedMatch();
  const fcGetTeamALabel = () => {
    if (!fcMatch) return "Team A";
    const p1 = fcMatch.teamAPlayer1?.user?.fullName || "Player 1";
    const p2 = fcMatch.teamAPlayer2?.user?.fullName;
    return p2 ? `${p1} & ${p2}` : p1;
  };
  const fcGetTeamBLabel = () => {
    if (!fcMatch) return "Team B";
    const p1 = fcMatch.teamBPlayer1?.user?.fullName || "Player 1";
    const p2 = fcMatch.teamBPlayer2?.user?.fullName;
    return p2 ? `${p1} & ${p2}` : p1;
  };
  const fcGetWinnerLabel = () => fcWinner === "A" ? fcGetTeamALabel() : fcGetTeamBLabel();
  const fcGetLoserLabel = () => fcWinner === "A" ? fcGetTeamBLabel() : fcGetTeamALabel();

  if (isSessionCompleted) {
    return (
      <CompletedSessionView
        sessionId={sessionId}
        completedMatches={completedMatches}
        completedCount={completedCount}
        isOrganiser={isOrganiser}
        updateSession={updateSession}
      />
    );
  }

  return (
    <div className="space-y-6">
      {(isOrganiser || isSignedUp) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                {isOrganiser && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2" data-testid="mode-toggle-container">
                      <Label className="text-sm font-medium">Mode:</Label>
                      <div className="flex items-center gap-2 rounded-md border p-1">
                        <Button
                          size="sm"
                          variant={activeMode === "SOCIAL" ? "default" : "ghost"}
                          onClick={() => setActiveMode("SOCIAL")}
                          data-testid="button-mode-social"
                        >
                          Social
                        </Button>
                        <Button
                          size="sm"
                          variant={activeMode === "COMPETITIVE" ? "default" : "ghost"}
                          onClick={() => setActiveMode("COMPETITIVE")}
                          data-testid="button-mode-competitive"
                        >
                          Competitive
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" data-testid="badge-live-count">
                    {liveMatches.length} Live
                  </Badge>
                  <Badge variant="outline" data-testid="badge-queued-count">
                    {queuedMatches.length} Queued
                  </Badge>
                  <Badge variant="outline" data-testid="badge-completed-count">
                    {completedCount} Completed
                  </Badge>
                </div>
              </div>

              {isOrganiser && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Queue Size:</Label>
                    <Select value={String(queueTargetSize)} onValueChange={(v) => setQueueTargetSize(Number(v))}>
                      <SelectTrigger className="w-[70px]" data-testid="select-queue-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={generateGenderType} onValueChange={setGenerateGenderType}>
                    <SelectTrigger className="w-[120px]" data-testid="select-generate-gender-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                      <SelectItem value="FEMALE">Female Only</SelectItem>
                      <SelectItem value="MALE">Male Only</SelectItem>
                    </SelectContent>
                  </Select>

                  {!autoGenerateActive ? (
                    <>
                      <Button 
                        onClick={handleSmartGenerate}
                        disabled={isSmartGenerating}
                        className="gap-2"
                        data-testid="button-generate-matches"
                      >
                        <Shuffle className="w-4 h-4" />
                        {isSmartGenerating ? "Generating..." : "Generate Matches"}
                      </Button>
                      <Button 
                        onClick={handleStartAutoGenerate}
                        variant="outline"
                        className="gap-2"
                        data-testid="button-start-auto-generate"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Auto Generate
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleStopAutoGenerate}
                      variant="destructive"
                      className="gap-2"
                      data-testid="button-stop-generating"
                    >
                      <X className="w-4 h-4" />
                      Stop Auto-Generated Matches
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={handleStopAllMatches}
                    disabled={isStoppingAll || (liveMatches.length === 0 && queuedMatches.length === 0)}
                    data-testid="button-stop-all-matches"
                  >
                    <OctagonX className="w-4 h-4" />
                    {isStoppingAll ? "Stopping..." : "Stop All Matches"}
                  </Button>

                  <Button 
                    variant="outline"
                    className="gap-2 ml-auto"
                    onClick={() => setEndSessionModalOpen(true)}
                    disabled={liveMatches.length > 0}
                    data-testid="button-end-session"
                  >
                    <Trophy className="w-4 h-4" />
                    End Session
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {autoGenerateActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2" data-testid="auto-generate-indicator">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Auto-generating matches in <strong>{activeMode}</strong> mode (target: {queueTargetSize} queued)</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Live Courts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: courtsToUse }, (_, i) => i + 1).map(courtNum => {
                const match = liveMatches.find(m => m.courtNumber === courtNum) || null;
                return (
                  <BadmintonCourt
                    key={courtNum}
                    courtNumber={courtNum}
                    courtName={courtNamesState[courtNum - 1]}
                    match={match}
                    availablePlayers={availablePlayers}
                    isOrganiser={isOrganiser}
                    isSignedUp={isSignedUp}
                    onStartMatch={(matchId, court) => startMatch({ matchId, courtNumber: court })}
                    onCompleteMatch={(matchId, scoreA, scoreB) => completeMatch({ matchId, scoreA, scoreB })}
                    onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
                    onCourtNameChange={handleCourtNameChange}
                    onUpdatePointsTarget={(matchId, pts) => updateMatchTarget({ matchId, pointsToPlayTo: pts })}
                    defaultPointsToPlayTo={defaultPointsToPlayTo}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MatchQueue
              matches={typedMatches}
              availablePlayers={availablePlayers}
              isOrganiser={isOrganiser}
              onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
              onAssignToCourt={(matchId, courtNumber) => startMatch({ matchId, courtNumber })}
              availableCourts={availableCourts}
              activeMode={activeMode}
              genderType={generateGenderType}
              defaultPointsToPlayTo={defaultPointsToPlayTo}
            />
            <CompletedMatches matches={typedMatches} isOrganiser={isOrganiser} isSignedUp={isSignedUp} />
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <SessionLiveLeaderboard sessionId={sessionId} />
        </div>
      </div>

      <EndSessionLeaderboardModal 
        sessionId={sessionId} 
        open={endSessionModalOpen} 
        onClose={() => setEndSessionModalOpen(false)}
        onEndSession={() => {
          updateSession({ sessionId, updates: { status: "COMPLETED", autoGenerateActive: false } });
        }}
      />

      <Dialog open={forcedCompletionActive && (!!fcMatch || fcStep === 5)} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {fcShowSuccess ? "Score Saved" : fcStep === 5 ? "All Matches Completed" : fcStep === 1 ? "Who won the match?" : fcStep === 2 ? "Winning team score" : fcStep === 3 ? "Losing team score" : "Confirm match result"}
            </DialogTitle>
            <DialogDescription>
              {fcStep === 5 ? "What would you like to do next?" : `Complete match ${forcedCompletionIndex + 1} of ${forcedMatches.length} — all live matches must be scored`}
            </DialogDescription>
          </DialogHeader>

          {fcShowSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Score saved. {forcedCompletionIndex + 1 < forcedMatches.length ? "Moving to next match..." : "All matches completed."}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`w-8 h-1 rounded-full ${s <= fcStep ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>

              {fcStep === 1 && (
                <div className="space-y-3 py-4">
                  <Button
                    variant={fcWinner === "A" ? "default" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => setFcWinner("A")}
                    data-testid="fc-button-winner-a"
                  >
                    <Trophy className="w-4 h-4" />
                    {fcGetTeamALabel()}
                  </Button>
                  <Button
                    variant={fcWinner === "B" ? "default" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => setFcWinner("B")}
                    data-testid="fc-button-winner-b"
                  >
                    <Trophy className="w-4 h-4" />
                    {fcGetTeamBLabel()}
                  </Button>
                  <Button
                    className="w-full gap-2 mt-2"
                    disabled={!fcWinner}
                    onClick={() => setFcStep(2)}
                    data-testid="fc-button-next-step1"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {fcStep === 2 && (
                <div className="space-y-3 py-4">
                  <Label className="text-sm text-muted-foreground">{fcGetWinnerLabel()} scored:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={fcWinnerScore}
                    onChange={(e) => setFcWinnerScore(e.target.value)}
                    placeholder="Enter score"
                    className="text-center text-2xl"
                    data-testid="fc-input-winner-score"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setFcStep(1)} data-testid="fc-button-back-step2">
                      <RotateCcw className="w-4 h-4" /> Back
                    </Button>
                    <Button className="flex-1 gap-2" disabled={!fcWinnerScore} onClick={() => setFcStep(3)} data-testid="fc-button-next-step2">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {fcStep === 3 && (
                <div className="space-y-3 py-4">
                  <Label className="text-sm text-muted-foreground">{fcGetLoserLabel()} scored:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={fcLoserScore}
                    onChange={(e) => setFcLoserScore(e.target.value)}
                    placeholder="Enter score"
                    className="text-center text-2xl"
                    data-testid="fc-input-loser-score"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setFcStep(2)} data-testid="fc-button-back-step3">
                      <RotateCcw className="w-4 h-4" /> Back
                    </Button>
                    <Button className="flex-1 gap-2" disabled={!fcLoserScore} onClick={() => setFcStep(4)} data-testid="fc-button-next-step3">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {fcStep === 4 && (
                <div className="space-y-4 py-4">
                  <div className="bg-muted/50 rounded-md p-4 text-center space-y-2">
                    <div className="text-sm text-muted-foreground">Winner</div>
                    <div className="font-semibold">{fcGetWinnerLabel()}</div>
                    <div className="text-3xl font-bold">{fcWinnerScore} - {fcLoserScore}</div>
                    <div className="text-sm text-muted-foreground">{fcGetLoserLabel()}</div>
                  </div>
                  {Number(fcWinnerScore) <= Number(fcLoserScore) && (
                    <p className="text-sm text-destructive text-center">Winner's score must be higher than the losing team's score</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={resetFcFlow} data-testid="fc-button-amend">
                      <RotateCcw className="w-4 h-4" /> Amend
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={fcSubmitting || Number(fcWinnerScore) <= Number(fcLoserScore)}
                      onClick={handleFcConfirm}
                      data-testid="fc-button-save"
                    >
                      {fcSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {forcedCompletionIndex + 1 < forcedMatches.length ? "Save & Next Match" : "Save Result"}
                    </Button>
                  </div>
                </div>
              )}

              {fcStep === 5 && (
                <div className="space-y-4 py-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-md p-4 text-center space-y-2">
                    <CheckCircle className="w-10 h-10 mx-auto text-green-500" />
                    <p className="font-semibold text-lg">All {forcedMatches.length} matches scored</p>
                    <p className="text-sm text-muted-foreground">Would you like to continue the session or end it?</p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        setForcedCompletionActive(false);
                        resetFcFlow();
                      }}
                      data-testid="fc-button-return-to-session"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Return to Session
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setForcedCompletionActive(false);
                        resetFcFlow();
                        setEndSessionModalOpen(true);
                      }}
                      data-testid="fc-button-view-leaderboard-end"
                    >
                      <Trophy className="w-4 h-4" />
                      View Leaderboard & End Session
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompletedSessionView({ sessionId, completedMatches, completedCount, isOrganiser, updateSession }: {
  sessionId: number;
  completedMatches: CourtMatch[];
  completedCount: number;
  isOrganiser: boolean;
  updateSession: any;
}) {
  const [editMatch, setEditMatch] = useState<CourtMatch | null>(null);
  const [editStep, setEditStep] = useState<1 | 2 | 3 | 4>(1);
  const [editWinner, setEditWinner] = useState<"A" | "B" | null>(null);
  const [editWinnerScore, setEditWinnerScore] = useState("");
  const [editLoserScore, setEditLoserScore] = useState("");
  const [editShowSuccess, setEditShowSuccess] = useState(false);
  const { mutate: editScore, isPending: isEditPending } = useEditMatchScore();

  const openEditDialog = (match: CourtMatch) => {
    setEditMatch(match);
    setEditShowSuccess(false);
    const sA = match.scoreA ?? 0;
    const sB = match.scoreB ?? 0;
    if (sA > 0 || sB > 0) {
      const winner = sA >= sB ? "A" : "B";
      setEditWinner(winner as "A" | "B");
      setEditWinnerScore(String(Math.max(sA, sB)));
      setEditLoserScore(String(Math.min(sA, sB)));
      setEditStep(4);
    } else {
      setEditStep(1);
      setEditWinner(null);
      setEditWinnerScore("");
      setEditLoserScore("");
    }
  };

  const getTeamALabel = (m: CourtMatch) => {
    const p1 = m.teamAPlayer1?.user?.fullName || "Player 1";
    const p2 = m.teamAPlayer2?.user?.fullName;
    return p2 ? `${p1} & ${p2}` : p1;
  };
  const getTeamBLabel = (m: CourtMatch) => {
    const p1 = m.teamBPlayer1?.user?.fullName || "Player 1";
    const p2 = m.teamBPlayer2?.user?.fullName;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  const handleEditConfirm = () => {
    if (!editMatch || !editWinner || !editWinnerScore || !editLoserScore) return;
    const wScore = Number(editWinnerScore);
    const lScore = Number(editLoserScore);
    if (isNaN(wScore) || isNaN(lScore) || wScore <= lScore) return;
    const sA = editWinner === "A" ? wScore : lScore;
    const sB = editWinner === "B" ? wScore : lScore;
    editScore({ matchId: editMatch.id, scoreA: sA, scoreB: sB }, {
      onSuccess: () => {
        setEditShowSuccess(true);
        setTimeout(() => { setEditMatch(null); setEditShowSuccess(false); }, 2000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {isOrganiser && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">This session has ended. You can reopen it to start new matches.</p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => updateSession({ sessionId, updates: { status: "ACTIVE" } })}
                data-testid="button-reopen-session"
              >
                <PlayCircle className="w-4 h-4" />
                Reopen Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-completed-matches-title">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Matches Played ({completedCount})
              </h3>
              {completedMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matches were played in this session</p>
              ) : (
                <div className="space-y-3">
                  {completedMatches.map(m => (
                    <div key={m.id} className="flex items-center gap-3 rounded-md px-3 py-3 bg-muted/30" data-testid={`completed-match-${m.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className={`font-medium ${(m.scoreA ?? 0) > (m.scoreB ?? 0) ? "text-green-600 dark:text-green-400" : ""}`}>
                            {m.teamAPlayer1?.user?.fullName}{m.teamAPlayer2 ? ` & ${m.teamAPlayer2.user?.fullName}` : ""}
                          </span>
                          <Badge variant="secondary" className="text-xs">{m.scoreA ?? 0}</Badge>
                          <span className="text-muted-foreground">vs</span>
                          <Badge variant="secondary" className="text-xs">{m.scoreB ?? 0}</Badge>
                          <span className={`font-medium ${(m.scoreB ?? 0) > (m.scoreA ?? 0) ? "text-green-600 dark:text-green-400" : ""}`}>
                            {m.teamBPlayer1?.user?.fullName}{m.teamBPlayer2 ? ` & ${m.teamBPlayer2.user?.fullName}` : ""}
                          </span>
                        </div>
                      </div>
                      {isOrganiser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(m)}
                          data-testid={`button-edit-completed-score-${m.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <SessionLiveLeaderboard sessionId={sessionId} />
        </div>
      </div>

      <Dialog open={!!editMatch} onOpenChange={(open) => { if (!open) setEditMatch(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editShowSuccess ? "Score Updated" : editStep === 1 ? "Who won the match?" : editStep === 2 ? "Winning team score" : editStep === 3 ? "Losing team score" : "Confirm score change"}
            </DialogTitle>
            <DialogDescription>Edit the score for this completed match</DialogDescription>
          </DialogHeader>

          {editShowSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Score updated successfully</p>
            </div>
          ) : editMatch && (
            <>
              <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className={`w-8 h-1 rounded-full ${s <= editStep ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {editStep === 1 && (
                <div className="space-y-3 py-4">
                  <Button variant={editWinner === "A" ? "default" : "outline"} className="w-full justify-start gap-3" onClick={() => setEditWinner("A")} data-testid="edit-button-winner-a">
                    <Trophy className="w-4 h-4" /> {getTeamALabel(editMatch)}
                  </Button>
                  <Button variant={editWinner === "B" ? "default" : "outline"} className="w-full justify-start gap-3" onClick={() => setEditWinner("B")} data-testid="edit-button-winner-b">
                    <Trophy className="w-4 h-4" /> {getTeamBLabel(editMatch)}
                  </Button>
                  <Button className="w-full gap-2 mt-2" disabled={!editWinner} onClick={() => setEditStep(2)} data-testid="edit-button-next-step1">
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {editStep === 2 && (
                <div className="space-y-3 py-4">
                  <Label className="text-sm text-muted-foreground">{editWinner === "A" ? getTeamALabel(editMatch) : getTeamBLabel(editMatch)} scored:</Label>
                  <Input type="number" min="0" max="99" value={editWinnerScore} onChange={(e) => setEditWinnerScore(e.target.value)} placeholder="Enter score" className="text-center text-2xl" data-testid="edit-input-winner-score" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setEditStep(1)} data-testid="edit-button-back-step2"><RotateCcw className="w-4 h-4" /> Back</Button>
                    <Button className="flex-1 gap-2" disabled={!editWinnerScore} onClick={() => setEditStep(3)} data-testid="edit-button-next-step2">Next <ArrowRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {editStep === 3 && (
                <div className="space-y-3 py-4">
                  <Label className="text-sm text-muted-foreground">{editWinner === "A" ? getTeamBLabel(editMatch) : getTeamALabel(editMatch)} scored:</Label>
                  <Input type="number" min="0" max="99" value={editLoserScore} onChange={(e) => setEditLoserScore(e.target.value)} placeholder="Enter score" className="text-center text-2xl" data-testid="edit-input-loser-score" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setEditStep(2)} data-testid="edit-button-back-step3"><RotateCcw className="w-4 h-4" /> Back</Button>
                    <Button className="flex-1 gap-2" disabled={!editLoserScore} onClick={() => setEditStep(4)} data-testid="edit-button-next-step3">Next <ArrowRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {editStep === 4 && (
                <div className="space-y-4 py-4">
                  <div className="bg-muted/50 rounded-md p-4 text-center space-y-2">
                    <div className="text-sm text-muted-foreground">Winner</div>
                    <div className="font-semibold">{editWinner === "A" ? getTeamALabel(editMatch) : getTeamBLabel(editMatch)}</div>
                    <div className="text-3xl font-bold">{editWinnerScore} - {editLoserScore}</div>
                    <div className="text-sm text-muted-foreground">{editWinner === "A" ? getTeamBLabel(editMatch) : getTeamALabel(editMatch)}</div>
                  </div>
                  {Number(editWinnerScore) <= Number(editLoserScore) && (
                    <p className="text-sm text-destructive text-center">Winner's score must be higher than the losing team's score</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => { setEditStep(1); setEditWinner(null); setEditWinnerScore(""); setEditLoserScore(""); }} data-testid="edit-button-amend">
                      <RotateCcw className="w-4 h-4" /> Amend
                    </Button>
                    <Button className="flex-1 gap-2" disabled={isEditPending || Number(editWinnerScore) <= Number(editLoserScore)} onClick={handleEditConfirm} data-testid="edit-button-save">
                      {isEditPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Save Score
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionLiveLeaderboard({ sessionId }: { sessionId: number }) {
  const { data: leaderboard, isLoading } = useSessionLeaderboard(sessionId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card data-testid="card-session-leaderboard">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-session-leaderboard-title">
            <Trophy className="w-5 h-5 text-amber-500" />
            Live Leaderboard
          </h3>
          <p className="text-sm text-muted-foreground text-center py-4">No matches completed yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-session-leaderboard">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-session-leaderboard-title">
          <Trophy className="w-5 h-5 text-amber-500" />
          Live Leaderboard
        </h3>
        <div className="space-y-2">
          {leaderboard.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center gap-3 rounded-md px-3 py-2 bg-muted/30"
              data-testid={`session-leaderboard-player-${player.id}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                index === 0 ? "bg-amber-500 text-white" :
                index === 1 ? "bg-gray-400 text-white" :
                index === 2 ? "bg-amber-700 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{player.fullName}</div>
                <div className="text-xs text-muted-foreground">
                  {player.matchesWon}W / {player.matchesLost}L ({player.matchesPlayed} played)
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">{player.winPercentage}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EndSessionLeaderboardModal({ sessionId, open, onClose, onEndSession }: { 
  sessionId: number; 
  open: boolean; 
  onClose: () => void;
  onEndSession: () => void;
}) {
  const { data: leaderboard } = useSessionLeaderboard(sessionId);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-end-session-leaderboard">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <Trophy className="w-7 h-7 text-amber-500" />
            Session Leaderboard
          </DialogTitle>
          <DialogDescription>
            Final rankings based on match results
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {(!leaderboard || leaderboard.length === 0) ? (
            <p className="text-center text-muted-foreground py-8">No completed matches yet</p>
          ) : (
            leaderboard.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-4 rounded-md px-4 py-3 ${
                  index === 0 ? "bg-amber-500/10 border border-amber-500/30" :
                  index === 1 ? "bg-gray-400/10 border border-gray-400/30" :
                  index === 2 ? "bg-amber-700/10 border border-amber-700/30" :
                  "bg-muted/30"
                }`}
                data-testid={`modal-leaderboard-player-${player.id}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? "bg-amber-500 text-white" :
                  index === 1 ? "bg-gray-400 text-white" :
                  index === 2 ? "bg-amber-700 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base truncate">{player.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {player.matchesWon} Won / {player.matchesLost} Lost / {player.matchesPlayed} Played
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{player.winPercentage}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-close-leaderboard">
            Back to Session
          </Button>
          <Button 
            variant="destructive"
            onClick={() => {
              onEndSession();
              onClose();
            }}
            data-testid="button-confirm-end-session"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

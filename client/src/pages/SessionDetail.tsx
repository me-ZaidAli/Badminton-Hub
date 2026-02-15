import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer, useUpdateSession, useDeleteSession, useToggleGender, useTogglePause, useSetPairGroup, useAddGuestPlayer, useRestartSession, useAdminInlineEditPlayer, useUploadProfilePicture } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs, useMyAdminClubs, useSessionLeaderboard, useClubs } from "@/hooks/use-clubs";
import { useVenues } from "@/hooks/use-venues";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionMatches, useStartMatch, useCompleteMatch, useEndSet, useSwapPlayer, useSmartGenerateMatches, useHandlePause, useHandleResume, useUpdateMatchTarget, useUpdateMatchSets, useStopAllMatches, useEditMatchScore, useCancelLiveMatch, useTrimQueue, useClearQueue } from "@/hooks/use-matches";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BadmintonCourt, type CourtMatch } from "@/components/BadmintonCourt";
import { MatchQueue, CompletedMatches } from "@/components/MatchQueue";
import { PlayerStatsPopup } from "@/components/PlayerStatsPopup";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Users, UserPlus, X, Shuffle, Settings2, Plus, Minus, CheckCircle, Trash2, Link2, PauseCircle, PlayCircle, UserPlus2, Trophy, Search, Check, Video, Lock, OctagonX, ArrowRight, RotateCcw, Pencil, Camera, BedDouble, LogOut, CreditCard, Building2, Ban, ClipboardList, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { toast } = useToast();
  const qc = useQueryClient();
  const { mutate: adminAddPlayer, isPending: isAdding } = useAdminAddPlayer();
  const { mutate: adminRemovePlayer } = useAdminRemovePlayer();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();
  const { mutate: smartGenerateFromParent } = useSmartGenerateMatches();
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
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(120);
  const [editCourts, setEditCourts] = useState(0);
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editLiveStreamUrl, setEditLiveStreamUrl] = useState("");
  const [editClubId, setEditClubId] = useState<number | null>(null);
  const [editMaxPlayers, setEditMaxPlayers] = useState(0);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editMatchMode, setEditMatchMode] = useState("SOCIAL");
  const [editPlayersPerSide, setEditPlayersPerSide] = useState(2);
  const [editMatchGenderType, setEditMatchGenderType] = useState("MIXED");
  const [editGenderRestriction, setEditGenderRestriction] = useState("ALL");
  const [editSessionType, setEditSessionType] = useState("OPEN");
  const [editJuniorAgeGroups, setEditJuniorAgeGroups] = useState<string[]>([]);
  const [editSessionFee, setEditSessionFee] = useState<string>("");
  const [editShuttlecockType, setEditShuttlecockType] = useState("");
  const [editDefaultPoints, setEditDefaultPoints] = useState(21);
  const [editVenueId, setEditVenueId] = useState<number | null>(null);
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();
  const { mutate: restartSession, isPending: isRestarting } = useRestartSession();
  const { mutate: stopAllMatchesParent, isPending: isStoppingAllParent } = useStopAllMatches();
  const { data: parentMatches } = useSessionMatches(id);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [endSessionModalOpenParent, setEndSessionModalOpenParent] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityValue, setCapacityValue] = useState(0);

  const [guestName, setGuestName] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestCategory, setGuestCategory] = useState("C3");

  const [editingNameSignupId, setEditingNameSignupId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Multi-select join modal
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinSelections, setJoinSelections] = useState<Record<number, { selected: boolean; paymentMethod: string }>>({});
  const { data: juniorAccounts } = useQuery<any[]>({
    queryKey: ["/api/juniors"],
    enabled: !!user,
  });
  const joinMultiMutation = useMutation({
    mutationFn: async (data: { sessionId: number; attendees: { userId: number; paymentMethod: string }[] }) => {
      const res = await apiRequest("POST", `/api/sessions/${data.sessionId}/join-multi`, { attendees: data.attendees });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to join session" }));
        throw new Error(errData.message || "Failed to join session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions", id, "signups"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      setJoinModalOpen(false);
      const signedUp = data.signups?.length || 0;
      const errs = data.errors?.length || 0;
      toast({ title: `${signedUp} attendee${signedUp !== 1 ? "s" : ""} signed up`, description: errs > 0 ? `${errs} issue(s): ${data.errors.join("; ")}` : undefined, variant: errs > 0 ? "destructive" : undefined });
    },
    onError: (err: any) => {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    },
  });

  // Manage players modal
  const [managePlayersOpen, setManagePlayersOpen] = useState(false);
  const { data: managePlayersData, refetch: refetchManagePlayers } = useQuery<any>({
    queryKey: ["/api/sessions", id, "manage-players"],
    enabled: managePlayersOpen && !!session,
  });
  const paymentOverrideMutation = useMutation({
    mutationFn: async (data: { signupId: number; paymentStatus?: string; paymentMethod?: string; verifiedByAdmin?: boolean; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${id}/signups/${data.signupId}/payment-override`, data);
      return res.json();
    },
    onSuccess: () => { refetchManagePlayers(); qc.invalidateQueries({ queryKey: ["/api/sessions", id, "signups"] }); },
  });
  const statusOverrideMutation = useMutation({
    mutationFn: async (data: { signupId: number; signupStatus: string; waitingListPosition?: number | null }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${id}/signups/${data.signupId}/status`, data);
      return res.json();
    },
    onSuccess: () => { refetchManagePlayers(); qc.invalidateQueries({ queryKey: ["/api/sessions", id, "signups"] }); },
  });
  const promoteMutation = useMutation({
    mutationFn: async (signupId: number) => {
      const res = await apiRequest("POST", `/api/sessions/${id}/promote-waiting`, { signupId });
      return res.json();
    },
    onSuccess: () => { refetchManagePlayers(); qc.invalidateQueries({ queryKey: ["/api/sessions", id, "signups"] }); toast({ title: "Player promoted from waiting list" }); },
  });

  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ playerId: number; playerName: string } | null>(null);
  const [pairPlayer1, setPairPlayer1] = useState<string>("");
  const [pairPlayer2, setPairPlayer2] = useState<string>("");
  const [pairSearch1, setPairSearch1] = useState("");
  const [pairSearch2, setPairSearch2] = useState("");

  const CATEGORIES = [
    { value: "C3", label: "C3" },
    { value: "C2", label: "C2" },
    { value: "C1", label: "C1" },
    { value: "B3", label: "B3" },
    { value: "B2", label: "B2" },
    { value: "B1", label: "B1" },
    { value: "A3", label: "A3" },
    { value: "A2", label: "A2" },
    { value: "A1", label: "A1" },
  ];

  const JUNIOR_AGE_GROUPS = [
    { value: "7-10", label: "7 to 10 years" },
    { value: "10-12", label: "10 to 12 years" },
    { value: "13-15", label: "13 to 15 years" },
    { value: "16-18", label: "16 to 18 years" },
  ];

  const { data: sessionClubs } = useMySessionClubs(!!user);
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const { data: allClubs } = useClubs();
  const { data: venues } = useVenues(session?.clubId || null);
  
  const { data: memberships } = useQuery<{ clubId: number; membershipStatus: string }[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const userProfileForClub = user?.playerProfiles?.find((p: any) => session && p.clubId === session.clubId) || user?.playerProfiles?.[0];
  const isSignedUp = signups?.some(s => s.playerId === userProfileForClub?.id);
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const isSuperAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isOrganiser = isSuperAdmin || (session ? managedClubIds.has(session.clubId) : false);
  const editableClubIds = new Set(user?.role === "OWNER" ? (allClubs?.map(c => c.id) || []) : (adminClubs?.map(c => c.id) || []));
  const canEditSession = session ? editableClubIds.has(session.clubId) : false;
  const parentLiveCount = (parentMatches as any[])?.filter((m: any) => m.status === "LIVE").length || 0;
  const parentQueuedCount = (parentMatches as any[])?.filter((m: any) => m.status === "QUEUED").length || 0;
  
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
          setGuestCategory("C3");
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
            {canEditSession && (
              <Dialog open={settingsOpen} onOpenChange={(open) => {
                setSettingsOpen(open);
                if (open) {
                  setEditTitle(session.title);
                  setEditDate(session.date ? format(new Date(session.date), "yyyy-MM-dd") : "");
                  setEditStartTime(session.startTime || "18:00");
                  setEditDuration(session.durationMinutes || 120);
                  setEditCourts(session.courtsAvailable);
                  setEditShuttleTubes(session.shuttleTubesUsed || 0);
                  setEditCategories(session.allowedCategories || ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"]);
                  setEditLiveStreamUrl(session.liveStreamUrl || "");
                  setEditClubId(session.clubId);
                  setEditMaxPlayers(session.maxPlayers);
                  setEditIsPrivate(session.isPrivate);
                  setEditMatchMode(session.matchMode || "SOCIAL");
                  setEditPlayersPerSide(session.playersPerSide || 2);
                  setEditMatchGenderType(session.matchGenderType || "MIXED");
                  setEditGenderRestriction(session.genderRestriction || "ALL");
                  setEditSessionType(session.sessionType || "OPEN");
                  setEditJuniorAgeGroups(session.juniorAgeGroups || []);
                  setEditSessionFee(session.sessionFee != null ? (session.sessionFee / 100).toFixed(2) : "");
                  setEditShuttlecockType(session.shuttlecockType || "");
                  setEditDefaultPoints(session.defaultPointsToPlayTo || 21);
                  setEditVenueId(session.venueId || null);
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1" data-testid="button-session-settings">
                    <Settings2 className="w-4 h-4" /> Edit Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Session Title</Label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Friday Night Social"
                        className="mt-2"
                        data-testid="input-edit-title"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="mt-2"
                          data-testid="input-edit-date"
                        />
                      </div>
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="mt-2"
                          data-testid="input-edit-start-time"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          min={15}
                          value={editDuration}
                          onChange={(e) => setEditDuration(Math.max(15, Number(e.target.value)))}
                          className="mt-2"
                          data-testid="input-edit-duration"
                        />
                      </div>
                      <div>
                        <Label>Courts (1-10)</Label>
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Max Players</Label>
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
                    </div>
                    <div>
                      <Label>Match Mode</Label>
                      <Select value={editMatchMode} onValueChange={setEditMatchMode}>
                        <SelectTrigger className="mt-2" data-testid="select-edit-match-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOCIAL">Social (Mixed)</SelectItem>
                          <SelectItem value="COMPETITIVE">Competitive (Ranked)</SelectItem>
                          <SelectItem value="TRAINING">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Players Per Side</Label>
                        <Select value={editPlayersPerSide.toString()} onValueChange={(v) => setEditPlayersPerSide(Number(v))}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-players-per-side">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 (Singles)</SelectItem>
                            <SelectItem value="2">2 (Doubles)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Match Gender Type</Label>
                        <Select value={editMatchGenderType} onValueChange={setEditMatchGenderType}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-match-gender-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                            <SelectItem value="FEMALE">Female Only</SelectItem>
                            <SelectItem value="MALE">Male Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Gender Restriction</Label>
                        <Select value={editGenderRestriction} onValueChange={setEditGenderRestriction}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-gender-restriction">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Open to All</SelectItem>
                            <SelectItem value="FEMALE_ONLY">Females Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Session Access</Label>
                        <Select value={editIsPrivate ? "true" : "false"} onValueChange={(v) => setEditIsPrivate(v === "true")}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-is-private">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Public</SelectItem>
                            <SelectItem value="true">Private (Invite Only)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Session Type</Label>
                      <Select value={editSessionType} onValueChange={setEditSessionType}>
                        <SelectTrigger className="mt-2" data-testid="select-edit-session-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open (All Ages)</SelectItem>
                          <SelectItem value="JUNIORS_ONLY">Juniors Only (Under 18)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editSessionType === "JUNIORS_ONLY" && (
                      <div>
                        <Label>Junior Age Groups</Label>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {JUNIOR_AGE_GROUPS.map((group) => (
                            <div key={group.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-age-${group.value}`}
                                checked={editJuniorAgeGroups.includes(group.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditJuniorAgeGroups([...editJuniorAgeGroups, group.value]);
                                  } else {
                                    setEditJuniorAgeGroups(editJuniorAgeGroups.filter(v => v !== group.value));
                                  }
                                }}
                                data-testid={`checkbox-edit-age-group-${group.value}`}
                              />
                              <label htmlFor={`edit-age-${group.value}`} className="text-sm cursor-pointer">
                                {group.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Session Fee (£)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 5.00"
                          value={editSessionFee}
                          onChange={(e) => setEditSessionFee(e.target.value)}
                          className="mt-2"
                          data-testid="input-edit-session-fee"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Leave empty for club default</p>
                      </div>
                      <div>
                        <Label>Shuttlecock Type</Label>
                        <Select value={editShuttlecockType || "none"} onValueChange={(v) => setEditShuttlecockType(v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-shuttlecock-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not specified</SelectItem>
                            <SelectItem value="feather">Feather</SelectItem>
                            <SelectItem value="plastic">Plastic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Default Points to Play To</Label>
                      <Select value={String(editDefaultPoints)} onValueChange={(v) => setEditDefaultPoints(Number(v))}>
                        <SelectTrigger className="mt-2" data-testid="select-edit-default-points">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Points</SelectItem>
                          <SelectItem value="11">11 Points</SelectItem>
                          <SelectItem value="15">15 Points</SelectItem>
                          <SelectItem value="21">21 Points</SelectItem>
                          <SelectItem value="25">25 Points</SelectItem>
                          <SelectItem value="30">30 Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {venues && venues.length > 0 && (
                      <div>
                        <Label>Venue</Label>
                        <Select value={editVenueId?.toString() || "none"} onValueChange={(v) => setEditVenueId(v === "none" ? null : Number(v))}>
                          <SelectTrigger className="mt-2" data-testid="select-edit-venue">
                            <SelectValue placeholder="Select venue" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No venue selected</SelectItem>
                            {venues.map(venue => (
                              <SelectItem key={venue.id} value={venue.id.toString()}>
                                {venue.name}{venue.city ? ` - ${venue.city}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {isSuperAdmin && allClubs && allClubs.length > 1 && (
                      <div>
                        <Label>Assign to Club</Label>
                        <p className="text-sm text-muted-foreground mb-2">Move this session to a different club.</p>
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
                          title: editTitle,
                          date: editDate,
                          startTime: editStartTime,
                          durationMinutes: editDuration,
                          courtsAvailable: editCourts, 
                          maxPlayers: editMaxPlayers,
                          isPrivate: editIsPrivate,
                          shuttleTubesUsed: editShuttleTubes,
                          allowedCategories: editCategories,
                          liveStreamUrl: editLiveStreamUrl || "",
                          matchMode: editMatchMode,
                          playersPerSide: editPlayersPerSide,
                          matchGenderType: editMatchGenderType,
                          genderRestriction: editGenderRestriction,
                          sessionType: editSessionType,
                          juniorAgeGroups: editJuniorAgeGroups,
                          sessionFee: editSessionFee ? Math.round(parseFloat(editSessionFee) * 100) : null,
                          shuttlecockType: editShuttlecockType || null,
                          defaultPointsToPlayTo: editDefaultPoints,
                          venueId: editVenueId,
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
                      disabled={isUpdating || editCategories.length === 0 || !editTitle.trim()}
                      data-testid="button-save-settings"
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
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
                onClick={() => {
                  if (juniorAccounts && juniorAccounts.length > 0) {
                    const selections: Record<number, { selected: boolean; paymentMethod: string }> = {};
                    selections[user.id] = { selected: true, paymentMethod: "" };
                    juniorAccounts.forEach((j: any) => { selections[j.id] = { selected: false, paymentMethod: "" }; });
                    setJoinSelections(selections);
                    setJoinModalOpen(true);
                  } else {
                    join(id);
                  }
                }}
                disabled={isJoining || (signups?.length || 0) >= session.maxPlayers}
                data-testid="button-join-session"
              >
                {isJoining ? "Joining..." : "Join Session"}
              </Button>
            )}
            {isOrganiser && session.status !== "COMPLETED" && !(session as any).autoGenerateActive && (
              <Button 
                className="w-full gap-2 mt-3 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25" 
                onClick={() => {
                  updateSession({ sessionId: id, updates: { autoGenerateActive: true } });
                  smartGenerateFromParent({ sessionId: id, mode: session.matchMode === "COMPETITIVE" ? "COMPETITIVE" : "SOCIAL", queueTargetSize: 3, genderType: session.matchGenderType || "MIXED", isAutoGenerate: true });
                }}
                data-testid="button-start-session-main"
              >
                <PlayCircle className="w-5 h-5" />
                Start Session
              </Button>
            )}
            {isOrganiser && session.status !== "COMPLETED" && (
              <div className="space-y-2 mt-3">
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    stopAllMatchesParent({ sessionId: id });
                  }}
                  disabled={isStoppingAllParent || (parentLiveCount === 0 && parentQueuedCount === 0)}
                  data-testid="button-stop-all-matches-top"
                >
                  <OctagonX className="w-4 h-4" />
                  {isStoppingAllParent ? "Stopping..." : "Stop All Matches"}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setEndSessionModalOpenParent(true)}
                  disabled={parentLiveCount > 0}
                  data-testid="button-end-session-top"
                >
                  <Trophy className="w-4 h-4" />
                  End Session
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
              <Button variant="outline" className="gap-2" onClick={() => setManagePlayersOpen(true)} data-testid="button-manage-players">
                <ClipboardList className="w-4 h-4" /> Manage Players
              </Button>
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
                                  <Badge variant="secondary" className="text-xs">{player.grade || player.category || "C3"}</Badge>
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
                      <Label>Grade</Label>
                      <Select value={guestCategory} onValueChange={setGuestCategory}>
                        <SelectTrigger className="mt-2" data-testid="select-guest-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
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
          {signups?.slice().sort((a, b) => {
            const aPaused = !!(a as any).isPaused;
            const bPaused = !!(b as any).isPaused;
            if (aPaused !== bPaused) return aPaused ? 1 : -1;
            const aName = a.player?.user?.fullName || "";
            const bName = b.player?.user?.fullName || "";
            return aName.localeCompare(bName);
          }).map((signup) => {
            const s = signup as any;
            const effectiveGender = s.genderOverride || signup.player?.gender || "?";
            const isPaused = !!s.isPaused;
            const pairGroupId = s.pairGroupId as number | null;
            const playerUser = (signup.player?.user || {}) as any;
            const profilePic = playerUser?.profilePictureUrl;
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
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player?.user?.fullName || "?"}`} />
                      )}
                      <AvatarFallback>{(signup.player?.user?.fullName || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
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
                            setEditNameValue(signup.player?.user?.fullName || "");
                            setEditingNameSignupId(signup.id);
                          } else {
                            setStatsPlayerId(signup.playerId);
                          }
                        }}
                        data-testid={`text-player-name-${signup.id}`}
                      >
                        {signup.player?.user?.fullName || "Unknown"}
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
                          value={signup.player?.grade || signup.player?.category || "C3"}
                          onValueChange={(newGrade) => {
                            adminInlineEdit({ profileId: signup.playerId, sessionId: id, grade: newGrade });
                          }}
                        >
                          <SelectTrigger 
                            className="h-6 w-auto min-w-0 px-2 py-0 text-xs border rounded-full gap-1"
                            data-testid={`badge-grade-${signup.id}`}
                          >
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                              <SelectItem
                                key={g}
                                value={g}
                                data-testid={`menu-grade-${g}-${signup.id}`}
                              >
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{signup.player?.grade || signup.player?.category || "?"}</Badge>
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
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button
                      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                        isPaused 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" 
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                      }`}
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
                      {isPaused ? <PlayCircle className="w-5 h-5" /> : <BedDouble className="w-5 h-5" />}
                    </button>
                    <button
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveConfirm({ playerId: signup.playerId, playerName: signup.player?.user?.fullName || "this player" });
                      }}
                      data-testid={`button-remove-player-${signup.playerId}`}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AlertDialog open={!!removeConfirm} onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Player</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {removeConfirm?.playerName} from this session? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-remove"
                onClick={() => {
                  if (removeConfirm) {
                    adminRemovePlayer({ sessionId: id, playerId: removeConfirm.playerId });
                  }
                  setRemoveConfirm(null);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                              .filter(s => !pairSearch1 || (s.player?.user?.fullName || "").toLowerCase().includes(pairSearch1.toLowerCase()))
                              .map(s => (
                                <CommandItem
                                  key={s.id}
                                  value={String(s.id)}
                                  onSelect={() => { setPairPlayer1(String(s.id)); setPairSearch1(s.player?.user?.fullName || ""); }}
                                  className="cursor-pointer"
                                  data-testid={`select-pair-1-player-${s.id}`}
                                >
                                  <span>{s.player?.user?.fullName || "Unknown"}</span>
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
                              .filter(s => !pairSearch2 || (s.player?.user?.fullName || "").toLowerCase().includes(pairSearch2.toLowerCase()))
                              .map(s => (
                                <CommandItem
                                  key={s.id}
                                  value={String(s.id)}
                                  onSelect={() => { setPairPlayer2(String(s.id)); setPairSearch2(s.player?.user?.fullName || ""); }}
                                  className="cursor-pointer"
                                  data-testid={`select-pair-2-player-${s.id}`}
                                >
                                  <span>{s.player?.user?.fullName || "Unknown"}</span>
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
                          {members?.map(m => m.player?.user?.fullName || "Unknown").join(" & ")}
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

      <EndSessionLeaderboardModal 
        sessionId={id} 
        open={endSessionModalOpenParent} 
        onClose={() => setEndSessionModalOpenParent(false)}
        onEndSession={() => {
          updateSession({ sessionId: id, updates: { status: "COMPLETED", autoGenerateActive: false } });
        }}
      />

      {/* Multi-Select Join Session Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Who is joining this session?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-md border">
                  <Checkbox
                    checked={joinSelections[user.id]?.selected || false}
                    onCheckedChange={(checked) => setJoinSelections(prev => ({ ...prev, [user.id]: { ...prev[user.id], selected: !!checked } }))}
                    data-testid="checkbox-join-self"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{user.fullName} (me)</p>
                  </div>
                  {joinSelections[user.id]?.selected && (
                    <Select value={joinSelections[user.id]?.paymentMethod || ""} onValueChange={(v) => setJoinSelections(prev => ({ ...prev, [user.id]: { ...prev[user.id], paymentMethod: v } }))}>
                      <SelectTrigger className="w-[160px]" data-testid="select-payment-self">
                        <SelectValue placeholder="Payment..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CARD"><div className="flex items-center gap-2"><CreditCard className="w-3 h-3" />Pay Now</div></SelectItem>
                        <SelectItem value="BANK_TRANSFER"><div className="flex items-center gap-2"><Building2 className="w-3 h-3" />Bank Transfer</div></SelectItem>
                        <SelectItem value="NONE"><div className="flex items-center gap-2"><Ban className="w-3 h-3" />No Payment</div></SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {juniorAccounts?.map((junior: any) => (
                  <div key={junior.id} className="flex items-center gap-3 p-3 rounded-md border">
                    <Checkbox
                      checked={joinSelections[junior.id]?.selected || false}
                      onCheckedChange={(checked) => setJoinSelections(prev => ({ ...prev, [junior.id]: { ...prev[junior.id], selected: !!checked } }))}
                      data-testid={`checkbox-join-junior-${junior.id}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{junior.fullName}</p>
                      <p className="text-xs text-muted-foreground">Junior</p>
                    </div>
                    {joinSelections[junior.id]?.selected && (
                      <Select value={joinSelections[junior.id]?.paymentMethod || ""} onValueChange={(v) => setJoinSelections(prev => ({ ...prev, [junior.id]: { ...prev[junior.id], paymentMethod: v } }))}>
                        <SelectTrigger className="w-[160px]" data-testid={`select-payment-junior-${junior.id}`}>
                          <SelectValue placeholder="Payment..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CARD"><div className="flex items-center gap-2"><CreditCard className="w-3 h-3" />Pay Now</div></SelectItem>
                          <SelectItem value="BANK_TRANSFER"><div className="flex items-center gap-2"><Building2 className="w-3 h-3" />Bank Transfer</div></SelectItem>
                          <SelectItem value="NONE"><div className="flex items-center gap-2"><Ban className="w-3 h-3" />No Payment</div></SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinModalOpen(false)} data-testid="button-cancel-join-multi">Cancel</Button>
            <Button
              onClick={() => {
                const attendees = Object.entries(joinSelections)
                  .filter(([, v]) => v.selected && v.paymentMethod)
                  .map(([userId, v]) => ({ userId: Number(userId), paymentMethod: v.paymentMethod }));
                if (attendees.length === 0) {
                  toast({ title: "Select at least one attendee and choose payment for each", variant: "destructive" });
                  return;
                }
                const missingPayment = Object.entries(joinSelections).filter(([, v]) => v.selected && !v.paymentMethod);
                if (missingPayment.length > 0) {
                  toast({ title: "Please choose a payment method for all selected attendees", variant: "destructive" });
                  return;
                }
                joinMultiMutation.mutate({ sessionId: id, attendees });
              }}
              disabled={joinMultiMutation.isPending}
              data-testid="button-confirm-join-multi"
            >
              {joinMultiMutation.isPending ? "Joining..." : "Confirm Signup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Players Modal */}
      <Dialog open={managePlayersOpen} onOpenChange={setManagePlayersOpen}>
        <DialogContent className="bg-background max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Manage Players</DialogTitle>
          </DialogHeader>
          {managePlayersData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{managePlayersData.summary?.totalAttendees || 0}</p><p className="text-xs text-muted-foreground">Total Attendees</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{managePlayersData.summary?.paid || 0}</p><p className="text-xs text-muted-foreground">Paid</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-yellow-600">{managePlayersData.summary?.pendingBankTransfer || 0}</p><p className="text-xs text-muted-foreground">Pending Transfer</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-red-600">{managePlayersData.summary?.unpaid || 0}</p><p className="text-xs text-muted-foreground">Unpaid</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{managePlayersData.summary?.cardPayments || 0}</p><p className="text-xs text-muted-foreground">Card</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{managePlayersData.summary?.bankTransfers || 0}</p><p className="text-xs text-muted-foreground">Bank Transfer</p></CardContent></Card>
              </div>
              <Tabs defaultValue="confirmed">
                <TabsList className="w-full">
                  <TabsTrigger value="confirmed" className="flex-1" data-testid="tab-confirmed">Confirmed ({managePlayersData.confirmed?.length || 0})</TabsTrigger>
                  <TabsTrigger value="waiting" className="flex-1" data-testid="tab-waiting">Waiting ({managePlayersData.waiting?.length || 0})</TabsTrigger>
                  <TabsTrigger value="cancelled" className="flex-1" data-testid="tab-cancelled">Cancelled ({managePlayersData.cancelled?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="confirmed" className="space-y-2 mt-3">
                  {(managePlayersData.confirmed || []).map((s: any) => (
                    <ManagePlayerRow key={s.id} signup={s} onPaymentOverride={(updates) => paymentOverrideMutation.mutate({ signupId: s.id, ...updates })} onStatusChange={(status) => statusOverrideMutation.mutate({ signupId: s.id, signupStatus: status })} />
                  ))}
                  {(!managePlayersData.confirmed || managePlayersData.confirmed.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No confirmed players</p>}
                </TabsContent>
                <TabsContent value="waiting" className="space-y-2 mt-3">
                  {(managePlayersData.waiting || []).map((s: any, idx: number) => (
                    <div key={s.id} className="flex items-center gap-2 p-3 border rounded-md">
                      <span className="text-sm font-mono text-muted-foreground w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{s.player?.user?.fullName || "Unknown"}</p>
                        <PaymentBadge status={s.paymentStatus} method={s.paymentMethod} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => promoteMutation.mutate(s.id)} disabled={promoteMutation.isPending} data-testid={`button-promote-${s.id}`}>
                        <ChevronUp className="w-4 h-4 mr-1" /> Promote
                      </Button>
                    </div>
                  ))}
                  {(!managePlayersData.waiting || managePlayersData.waiting.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No players on waiting list</p>}
                </TabsContent>
                <TabsContent value="cancelled" className="space-y-2 mt-3">
                  {(managePlayersData.cancelled || []).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 p-3 border rounded-md opacity-60">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{s.player?.user?.fullName || "Unknown"}</p>
                        <PaymentBadge status={s.paymentStatus} method={s.paymentMethod} />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => statusOverrideMutation.mutate({ signupId: s.id, signupStatus: "CONFIRMED" })} data-testid={`button-reinstate-${s.id}`}>
                        Reinstate
                      </Button>
                    </div>
                  ))}
                  {(!managePlayersData.cancelled || managePlayersData.cancelled.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No cancelled signups</p>}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          )}
        </DialogContent>
      </Dialog>
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
  signups: { playerId: number; isPaused?: boolean; attendanceStatus?: string; player: { id: number; user: { fullName: string }; category: string | null } }[];
  playersPerSide: number;
  matchGenderType: string;
  defaultPointsToPlayTo?: number;
  sessionStatus: string;
  autoGenerateActive: boolean;
}) {
  const { data: matches, isLoading } = useSessionMatches(sessionId);
  const { mutate: startMatch } = useStartMatch();
  const { mutateAsync: completeMatch } = useCompleteMatch();
  const { mutateAsync: endSet } = useEndSet();
  const { mutate: swapPlayer } = useSwapPlayer();
  const { mutate: updateMatchTarget } = useUpdateMatchTarget();
  const { mutate: updateMatchSets } = useUpdateMatchSets();
  const { mutate: smartGenerate, isPending: isSmartGenerating } = useSmartGenerateMatches();
  const { mutate: updateSession } = useUpdateSession();
  const { mutate: stopAllMatches, isPending: isStoppingAll } = useStopAllMatches();
  const { mutate: cancelLiveMatch } = useCancelLiveMatch();
  const { mutate: trimQueue } = useTrimQueue();
  const { mutate: clearQueue, isPending: isClearingQueue } = useClearQueue();
  const queryClient = useQueryClient();
  const [autoGenWaiting, setAutoGenWaiting] = useState(false);
  const [pairConstraintMessage, setPairConstraintMessage] = useState<string | null>(null);
  const [autoGenLocallyStopped, setAutoGenLocallyStopped] = useState(false);

  const [courtsToUse, setCourtsToUse] = useState(courtsAvailable);
  const [courtNamesState, setCourtNamesState] = useState<string[]>(initialCourtNames || []);
  const [activeMode, setActiveMode] = useState<"SOCIAL" | "COMPETITIVE">(matchMode === "COMPETITIVE" ? "COMPETITIVE" : "SOCIAL");
  const [queueTargetSize, setQueueTargetSize] = useState(3);
  const [generateGenderType, setGenerateGenderType] = useState(matchGenderType || "MIXED");
  const [forcedCompletionActive, setForcedCompletionActive] = useState(false);
  const [forcedCompletionIndex, setForcedCompletionIndex] = useState(0);
  const [forcedMatches, setForcedMatches] = useState<CourtMatch[]>([]);
  const [fcScoreA, setFcScoreA] = useState("");
  const [fcScoreB, setFcScoreB] = useState("");
  const [fcStep, setFcStep] = useState<1 | 5>(1);
  const [fcSubmitting, setFcSubmitting] = useState(false);
  const [fcShowSuccess, setFcShowSuccess] = useState(false);
  const [fcDialogTarget, setFcDialogTarget] = useState(defaultPointsToPlayTo);
  const [notEnoughPlayersMessage, setNotEnoughPlayersMessage] = useState<string | null>(null);

  const isSessionCompleted = sessionStatus === "COMPLETED";

  useEffect(() => {
    setCourtNamesState(initialCourtNames || []);
  }, [initialCourtNames]);

  useEffect(() => {
    if (sessionStatus === "ACTIVE") {
      setAutoGenLocallyStopped(false);
      setAutoGenWaiting(false);
      setPairConstraintMessage(null);
      setForcedCompletionActive(false);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (autoGenerateActive) {
      setAutoGenLocallyStopped(false);
    }
  }, [autoGenerateActive]);

  useEffect(() => {
    if (!autoGenerateActive || !isOrganiser || autoGenLocallyStopped) {
      setAutoGenWaiting(false);
      setPairConstraintMessage(null);
      return;
    }
    const interval = setInterval(() => {
      smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: true }, {
        onSuccess: (data: any) => {
          if (data?.status === "waiting") {
            setAutoGenWaiting(true);
            setPairConstraintMessage(null);
          } else if (data?.status === "pair_blocked") {
            setAutoGenWaiting(true);
            setPairConstraintMessage(data.message || "Waiting for matches to finish to allow different pair combinations.");
          } else {
            setAutoGenWaiting(false);
            setPairConstraintMessage(null);
          }
        },
        onError: () => {
          setAutoGenWaiting(false);
          setPairConstraintMessage(null);
        },
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [autoGenerateActive, isOrganiser, autoGenLocallyStopped, sessionId, activeMode, queueTargetSize, generateGenderType, smartGenerate]);

  const handleCourtNameChange = (courtNumber: number, name: string) => {
    const newNames = [...courtNamesState];
    while (newNames.length < courtNumber) {
      newNames.push(`Court ${newNames.length + 1}`);
    }
    newNames[courtNumber - 1] = name;
    setCourtNamesState(newNames);
    updateSession({ sessionId, updates: { courtNames: newNames } });
  };

  const currentFcMatchForEffect = (forcedCompletionActive && forcedCompletionIndex < forcedMatches.length) ? forcedMatches[forcedCompletionIndex] : null;
  useEffect(() => {
    if (currentFcMatchForEffect) {
      setFcDialogTarget(currentFcMatchForEffect.pointsToPlayTo || defaultPointsToPlayTo);
    }
  }, [forcedCompletionIndex, forcedCompletionActive, currentFcMatchForEffect?.pointsToPlayTo, defaultPointsToPlayTo]);

  const attendingSignups = signups.filter(s => !(s as any).attendanceStatus || (s as any).attendanceStatus === "ATTENDING");
  const activePlayerCount = attendingSignups.filter(s => !s.isPaused).length;
  const minPlayersNeeded = playersPerSide * 2;

  useEffect(() => {
    if (activePlayerCount >= minPlayersNeeded && notEnoughPlayersMessage) {
      setNotEnoughPlayersMessage(null);
    }
  }, [activePlayerCount, minPlayersNeeded]);

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
    numberOfSets: (m as any).numberOfSets,
    currentSet: (m as any).currentSet,
    setsWonA: (m as any).setsWonA,
    setsWonB: (m as any).setsWonB,
    setScores: (m as any).setScores,
  }));

  const liveMatches = typedMatches.filter(m => m.status === "LIVE");
  const queuedMatches = typedMatches.filter(m => m.status === "QUEUED");
  const completedMatches = typedMatches.filter(m => m.status === "COMPLETED");
  const completedCount = completedMatches.length;
  
  const occupiedCourts = new Set(liveMatches.map(m => m.courtNumber));
  const availableCourts = Array.from({ length: courtsToUse }, (_, i) => i + 1)
    .filter(c => !occupiedCourts.has(c));

  const availablePlayers = signups.map(s => ({
    id: s.player?.id || s.playerId,
    fullName: s.player?.user?.fullName || "",
    category: s.player?.category,
  }));

  const pausedCount = attendingSignups.filter(s => s.isPaused).length;

  const getNotEnoughPlayersText = () => {
    if (activePlayerCount < minPlayersNeeded) {
      if (pausedCount > 0) {
        return `Not enough active players to generate a match. ${pausedCount} player${pausedCount > 1 ? "s are" : " is"} paused. Resume players or add more to continue.`;
      }
      return `Not enough players to generate a match. Need at least ${minPlayersNeeded} active players.`;
    }
    return null;
  };

  const showNotEnoughPlayersWarning = () => {
    const msg = getNotEnoughPlayersText();
    if (msg) {
      setNotEnoughPlayersMessage(msg);
      setTimeout(() => setNotEnoughPlayersMessage(null), 5000);
      return true;
    }
    return false;
  };

  const handleSmartGenerate = () => {
    if (activePlayerCount < minPlayersNeeded) {
      if (showNotEnoughPlayersWarning()) return;
    }
    setNotEnoughPlayersMessage(null);
    const wasInactive = !autoGenerateActive || autoGenLocallyStopped;
    if (wasInactive) {
      setAutoGenLocallyStopped(false);
      updateSession({ sessionId, updates: { autoGenerateActive: true } });
    }
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: !wasInactive }, {
      onSuccess: (data: any) => {
        if (data?.status === "waiting") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(null);
        } else if (data?.status === "pair_blocked") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(data.message || "Waiting for matches to finish to allow different pair combinations.");
        } else {
          setAutoGenWaiting(false);
          setPairConstraintMessage(null);
        }
      },
    });
  };

  const handleStartAutoGenerate = () => {
    if (showNotEnoughPlayersWarning()) return;
    setAutoGenLocallyStopped(false);
    updateSession({ sessionId, updates: { autoGenerateActive: true } });
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: true }, {
      onSuccess: (data: any) => {
        if (data?.status === "waiting") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(null);
        } else if (data?.status === "pair_blocked") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(data.message || "Waiting for matches to finish to allow different pair combinations.");
        } else {
          setAutoGenWaiting(false);
          setPairConstraintMessage(null);
        }
      },
    });
  };

  const handleStopAutoGenerate = () => {
    setAutoGenLocallyStopped(true);
    setAutoGenWaiting(false);
    setPairConstraintMessage(null);
    updateSession({ sessionId, updates: { autoGenerateActive: false } });
  };

  const handleQueueTargetSizeChange = (newSize: number) => {
    setQueueTargetSize(newSize);
    const currentQueuedCount = typedMatches.filter(m => m.status === "QUEUED").length;
    if (currentQueuedCount > newSize) {
      trimQueue({ sessionId, targetSize: newSize });
    } else if (currentQueuedCount < newSize && autoGenerateActive && !autoGenLocallyStopped) {
      smartGenerate({ sessionId, mode: activeMode, queueTargetSize: newSize, genderType: generateGenderType, isAutoGenerate: true });
    }
  };

  const handleClearQueue = () => {
    setAutoGenLocallyStopped(true);
    setAutoGenWaiting(false);
    setPairConstraintMessage(null);
    clearQueue({ sessionId });
  };

  const handleStopAllMatches = () => {
    stopAllMatches({ sessionId }, {
      onSuccess: (data: any) => {
        setAutoGenWaiting(false);
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
    setFcScoreA("");
    setFcScoreB("");
    setFcStep(1);
    setFcShowSuccess(false);
  };

  const getCurrentForcedMatch = () => {
    if (!forcedCompletionActive || forcedCompletionIndex >= forcedMatches.length) return null;
    return forcedMatches[forcedCompletionIndex];
  };

  const currentFcMatch = getCurrentForcedMatch();

  const handleFcConfirm = async () => {
    const match = getCurrentForcedMatch();
    if (!match) return;
    const sA = Number(fcScoreA);
    const sB = Number(fcScoreB);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0 || sA === sB) return;
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
    const p1 = fcMatch.teamAPlayer1?.user?.fullName || (fcMatch.teamAPlayer1 as any)?.fullName || "Player 1";
    const p2 = fcMatch.teamAPlayer2 ? (fcMatch.teamAPlayer2?.user?.fullName || (fcMatch.teamAPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };
  const fcGetTeamBLabel = () => {
    if (!fcMatch) return "Team B";
    const p1 = fcMatch.teamBPlayer1?.user?.fullName || (fcMatch.teamBPlayer1 as any)?.fullName || "Player 1";
    const p2 = fcMatch.teamBPlayer2 ? (fcMatch.teamBPlayer2?.user?.fullName || (fcMatch.teamBPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

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
                          onClick={() => {
                            const newVal = Math.max(1, courtsToUse - 1);
                            setCourtsToUse(newVal);
                            updateSession({ sessionId, updates: { courtsAvailable: newVal } });
                          }}
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
                          onClick={() => {
                            const newVal = Math.min(10, courtsToUse + 1);
                            setCourtsToUse(newVal);
                            updateSession({ sessionId, updates: { courtsAvailable: newVal } });
                          }}
                          disabled={courtsToUse >= 10}
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

                  <Button 
                    onClick={handleSmartGenerate}
                    disabled={isSmartGenerating}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-generate-matches"
                  >
                    <Shuffle className="w-4 h-4" />
                    {isSmartGenerating ? "Generating..." : "Generate Matches"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {autoGenerateActive && !autoGenLocallyStopped && (
        <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${autoGenWaiting ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' : 'text-muted-foreground bg-muted/50'}`} data-testid="auto-generate-indicator">
          <Loader2 className="w-4 h-4 animate-spin" />
          {pairConstraintMessage ? (
            <span>{pairConstraintMessage}</span>
          ) : autoGenWaiting ? (
            <span>Waiting for matches to finish before generating new ones... (target: {queueTargetSize} queued)</span>
          ) : (
            <span>Session active — auto-generating matches in <strong>{activeMode}</strong> mode (target: {queueTargetSize} queued)</span>
          )}
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
                    onEndSet={(matchId, setNumber, scoreA, scoreB) => endSet({ matchId, setNumber, scoreA, scoreB })}
                    onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
                    onCancelMatch={(matchId) => cancelLiveMatch({ matchId })}
                    onCourtNameChange={handleCourtNameChange}
                    onUpdatePointsTarget={(matchId, pts) => updateMatchTarget({ matchId, pointsToPlayTo: pts })}
                    onUpdateSets={(matchId, sets) => updateMatchSets({ matchId, numberOfSets: sets })}
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
              onGenerateMatch={handleSmartGenerate}
              isGenerating={isSmartGenerating}
              queueTargetSize={queueTargetSize}
              onQueueTargetSizeChange={handleQueueTargetSizeChange}
              onClearQueue={handleClearQueue}
              notEnoughPlayersMessage={notEnoughPlayersMessage}
            />
            <CompletedMatches matches={typedMatches} isOrganiser={isOrganiser} isSignedUp={isSignedUp} />
          </div>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <SessionLiveLeaderboard sessionId={sessionId} />
        </div>
      </div>


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

              <div className="flex items-center justify-center gap-2 py-1" data-testid="fc-target-selector">
                <span className="text-sm text-muted-foreground">Play to</span>
                <Input
                  type="number"
                  min="1"
                  value={String(fcDialogTarget)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setFcDialogTarget(val);
                      const match = getCurrentForcedMatch();
                      if (match) updateMatchTarget({ matchId: match.id, pointsToPlayTo: val });
                    }
                  }}
                  className="w-20 h-8 text-sm text-center"
                  data-testid="input-fc-target"
                />
              </div>

              {fcStep === 1 && (
                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium truncate" data-testid="fc-text-team-a">{fcGetTeamALabel()}</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={fcScoreA}
                        onChange={(e) => setFcScoreA(e.target.value)}
                        className="w-24 text-center text-lg font-bold"
                        data-testid="fc-input-score-a"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium truncate" data-testid="fc-text-team-b">{fcGetTeamBLabel()}</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={fcScoreB}
                        onChange={(e) => setFcScoreB(e.target.value)}
                        className="w-24 text-center text-lg font-bold"
                        data-testid="fc-input-score-b"
                      />
                    </div>
                  </div>

                  {fcScoreA !== "" && fcScoreB !== "" && fcScoreA === fcScoreB && (
                    <p className="text-sm text-destructive text-center">Scores cannot be tied</p>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={
                      fcSubmitting ||
                      fcScoreA === "" || fcScoreB === "" ||
                      isNaN(Number(fcScoreA)) || isNaN(Number(fcScoreB)) ||
                      Number(fcScoreA) < 0 || Number(fcScoreB) < 0 ||
                      Number(fcScoreA) === Number(fcScoreB)
                    }
                    onClick={handleFcConfirm}
                    data-testid="fc-button-save"
                  >
                    {fcSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {forcedCompletionIndex + 1 < forcedMatches.length ? "Save & Next Match" : "Save Result"}
                  </Button>
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

function PaymentBadge({ status, method }: { status?: string; method?: string }) {
  const statusColors: Record<string, string> = {
    PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    UNPAID: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const methodLabels: Record<string, string> = { CARD: "Card", BANK_TRANSFER: "Bank Transfer", NONE: "No Payment" };
  return (
    <div className="flex gap-1 flex-wrap">
      <Badge variant="secondary" className={statusColors[status || "UNPAID"] || ""}>{status || "UNPAID"}</Badge>
      {method && method !== "NONE" && <Badge variant="outline" className="text-xs">{methodLabels[method] || method}</Badge>}
    </div>
  );
}

function ManagePlayerRow({ signup, onPaymentOverride, onStatusChange }: { signup: any; onPaymentOverride: (u: any) => void; onStatusChange: (s: string) => void }) {
  const [showOverride, setShowOverride] = useState(false);
  return (
    <div className="p-3 border rounded-md space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{signup.player?.user?.fullName || "Unknown"}</p>
          {signup.player?.user?.isJunior && <Badge variant="outline" className="text-xs">Junior</Badge>}
        </div>
        <PaymentBadge status={signup.paymentStatus} method={signup.paymentMethod} />
        {signup.verifiedByAdmin && <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950">Verified</Badge>}
        <Button size="icon" variant="ghost" onClick={() => setShowOverride(!showOverride)} data-testid={`button-override-${signup.id}`}>
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>
      {showOverride && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Select onValueChange={(v) => { const [ps, pm] = v.split("|"); onPaymentOverride({ paymentStatus: ps, paymentMethod: pm }); setShowOverride(false); }}>
            <SelectTrigger className="w-[180px]" data-testid={`select-override-payment-${signup.id}`}>
              <SelectValue placeholder="Set Payment..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PAID|CARD">Paid (Card)</SelectItem>
              <SelectItem value="PAID|BANK_TRANSFER">Paid (Bank Transfer)</SelectItem>
              <SelectItem value="PENDING|BANK_TRANSFER">Pending (Bank Transfer)</SelectItem>
              <SelectItem value="UNPAID|NONE">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          {signup.paymentStatus === "PENDING" && (
            <Button size="sm" variant="outline" onClick={() => { onPaymentOverride({ paymentStatus: "PAID", verifiedByAdmin: true }); setShowOverride(false); }} data-testid={`button-verify-${signup.id}`}>
              <Check className="w-3 h-3 mr-1" /> Verify
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { onStatusChange("CANCELLED"); setShowOverride(false); }} data-testid={`button-cancel-signup-${signup.id}`}>
            <X className="w-3 h-3 mr-1" /> Remove
          </Button>
          <Button size="sm" variant="outline" onClick={() => { onStatusChange("WAITING"); setShowOverride(false); }} data-testid={`button-to-waiting-${signup.id}`}>
            Move to Waiting
          </Button>
        </div>
      )}
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
  const [editSetScores, setEditSetScores] = useState<{ scoreA: string; scoreB: string }[]>([]);
  const [editSelectedSet, setEditSelectedSet] = useState<number | null>(null);
  const [editSetScoreA, setEditSetScoreA] = useState("");
  const [editSetScoreB, setEditSetScoreB] = useState("");
  const { mutate: editScore, isPending: isEditPending } = useEditMatchScore();

  const isMultiSetEdit = (match: CourtMatch | null) => {
    if (!match) return false;
    const totalSets = match.numberOfSets || 1;
    return totalSets > 1;
  };

  const openEditDialog = (match: CourtMatch) => {
    setEditMatch(match);
    setEditShowSuccess(false);
    setEditSelectedSet(null);
    setEditSetScoreA("");
    setEditSetScoreB("");

    if (isMultiSetEdit(match)) {
      const existing = (match.setScores as { scoreA: number; scoreB: number }[]) || [];
      const totalSets = match.numberOfSets || 1;
      const scores: { scoreA: string; scoreB: string }[] = [];
      for (let i = 0; i < totalSets; i++) {
        if (i < existing.length) {
          scores.push({ scoreA: String(existing[i].scoreA), scoreB: String(existing[i].scoreB) });
        } else {
          scores.push({ scoreA: "", scoreB: "" });
        }
      }
      setEditSetScores(scores);
      setEditStep(1);
    } else {
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
    }
  };

  const getTeamALabel = (m: CourtMatch) => {
    const p1 = m.teamAPlayer1?.user?.fullName || (m.teamAPlayer1 as any)?.fullName || "Player 1";
    const p2 = m.teamAPlayer2 ? (m.teamAPlayer2?.user?.fullName || (m.teamAPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };
  const getTeamBLabel = (m: CourtMatch) => {
    const p1 = m.teamBPlayer1?.user?.fullName || (m.teamBPlayer1 as any)?.fullName || "Player 1";
    const p2 = m.teamBPlayer2 ? (m.teamBPlayer2?.user?.fullName || (m.teamBPlayer2 as any)?.fullName) : null;
    return p2 ? `${p1} & ${p2}` : p1;
  };

  const handleEditConfirm = () => {
    if (!editMatch) return;

    if (isMultiSetEdit(editMatch)) {
      const validSets = editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "");
      if (validSets.length === 0) return;
      const parsedSets = validSets.map(s => ({ scoreA: Number(s.scoreA), scoreB: Number(s.scoreB) }));
      let totalA = 0, totalB = 0;
      for (const s of parsedSets) { totalA += s.scoreA; totalB += s.scoreB; }
      editScore({ matchId: editMatch.id, scoreA: totalA, scoreB: totalB, setScores: parsedSets }, {
        onSuccess: () => {
          setEditShowSuccess(true);
          setTimeout(() => { setEditMatch(null); setEditShowSuccess(false); }, 2000);
        }
      });
    } else {
      if (!editWinner || !editWinnerScore || !editLoserScore) return;
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
    }
  };

  const handleSetScoreSave = () => {
    if (editSelectedSet === null || editSetScoreA === "" || editSetScoreB === "") return;
    const updated = [...editSetScores];
    updated[editSelectedSet] = { scoreA: editSetScoreA, scoreB: editSetScoreB };
    setEditSetScores(updated);
    setEditSelectedSet(null);
    setEditSetScoreA("");
    setEditSetScoreB("");
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
                            {m.teamAPlayer1?.user?.fullName || (m.teamAPlayer1 as any)?.fullName || "Player"}{m.teamAPlayer2 ? ` & ${m.teamAPlayer2?.user?.fullName || (m.teamAPlayer2 as any)?.fullName || "Player"}` : ""}
                          </span>
                          <Badge variant="secondary" className="text-xs">{m.scoreA ?? 0}</Badge>
                          <span className="text-muted-foreground">vs</span>
                          <Badge variant="secondary" className="text-xs">{m.scoreB ?? 0}</Badge>
                          <span className={`font-medium ${(m.scoreB ?? 0) > (m.scoreA ?? 0) ? "text-green-600 dark:text-green-400" : ""}`}>
                            {m.teamBPlayer1?.user?.fullName || (m.teamBPlayer1 as any)?.fullName || "Player"}{m.teamBPlayer2 ? ` & ${m.teamBPlayer2?.user?.fullName || (m.teamBPlayer2 as any)?.fullName || "Player"}` : ""}
                          </span>
                          {m.setScores && (m.setScores as any[]).length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono" data-testid={`text-set-scores-${m.id}`}>
                              ({(m.setScores as any[]).map((s: any, i: number) => `${s.scoreA}-${s.scoreB}`).join(", ")})
                            </span>
                          )}
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

      <Dialog open={!!editMatch} onOpenChange={(open) => { if (!open) { setEditMatch(null); setEditSelectedSet(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editShowSuccess ? "Score Updated" : editMatch && isMultiSetEdit(editMatch) ? (editSelectedSet !== null ? `Edit Set ${editSelectedSet + 1}` : "Edit Set Scores") : editStep === 1 ? "Who won the match?" : editStep === 2 ? "Winning team score" : editStep === 3 ? "Losing team score" : "Confirm score change"}
            </DialogTitle>
            <DialogDescription>Edit the score for this completed match</DialogDescription>
          </DialogHeader>

          {editShowSuccess ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">Score updated successfully</p>
            </div>
          ) : editMatch && isMultiSetEdit(editMatch) ? (
            editSelectedSet !== null ? (
              <div className="space-y-4 py-4">
                <div className="text-center text-sm text-muted-foreground mb-2">
                  Enter scores for Set {editSelectedSet + 1}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="flex-1 text-sm truncate">{getTeamALabel(editMatch)}</Label>
                    <Input type="number" min="0" max="99" value={editSetScoreA} onChange={(e) => setEditSetScoreA(e.target.value)} placeholder="Score" className="w-24 text-center text-lg" data-testid="edit-input-set-score-a" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex-1 text-sm truncate">{getTeamBLabel(editMatch)}</Label>
                    <Input type="number" min="0" max="99" value={editSetScoreB} onChange={(e) => setEditSetScoreB(e.target.value)} placeholder="Score" className="w-24 text-center text-lg" data-testid="edit-input-set-score-b" />
                  </div>
                </div>
                {editSetScoreA !== "" && editSetScoreB !== "" && editSetScoreA === editSetScoreB && (
                  <p className="text-sm text-destructive text-center">Scores cannot be tied</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => { setEditSelectedSet(null); setEditSetScoreA(""); setEditSetScoreB(""); }} data-testid="edit-button-back-sets">
                    <RotateCcw className="w-4 h-4" /> Back
                  </Button>
                  <Button className="flex-1 gap-2" disabled={editSetScoreA === "" || editSetScoreB === "" || editSetScoreA === editSetScoreB} onClick={handleSetScoreSave} data-testid="edit-button-save-set">
                    <CheckCircle className="w-4 h-4" /> Save Set
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="text-xs text-muted-foreground text-center mb-1">
                  {getTeamALabel(editMatch)} vs {getTeamBLabel(editMatch)}
                </div>
                <div className="space-y-2">
                  {editSetScores.map((s, i) => {
                    const hasScore = s.scoreA !== "" && s.scoreB !== "";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-md px-3 py-3 bg-muted/30 cursor-pointer hover-elevate"
                        onClick={() => {
                          setEditSelectedSet(i);
                          setEditSetScoreA(s.scoreA);
                          setEditSetScoreB(s.scoreB);
                        }}
                        data-testid={`edit-set-row-${i}`}
                      >
                        <Badge variant="secondary" className="text-xs">Set {i + 1}</Badge>
                        <div className="flex-1 text-center">
                          {hasScore ? (
                            <span className="font-mono font-semibold">{s.scoreA} - {s.scoreB}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not set</span>
                          )}
                        </div>
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const validSets = editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "");
                  let totalA = 0, totalB = 0, setsWonA = 0, setsWonB = 0;
                  for (const s of validSets) {
                    totalA += Number(s.scoreA); totalB += Number(s.scoreB);
                    if (Number(s.scoreA) > Number(s.scoreB)) setsWonA++;
                    else if (Number(s.scoreB) > Number(s.scoreA)) setsWonB++;
                  }
                  return validSets.length > 0 ? (
                    <div className="bg-muted/50 rounded-md p-3 text-center space-y-1">
                      <div className="text-xs text-muted-foreground">Total Score</div>
                      <div className="text-xl font-bold">{totalA} - {totalB}</div>
                      <div className="text-xs text-muted-foreground">Sets won: {setsWonA} - {setsWonB}</div>
                    </div>
                  ) : null;
                })()}
                <Button
                  className="w-full gap-2"
                  disabled={isEditPending || editSetScores.filter(s => s.scoreA !== "" && s.scoreB !== "").length === 0}
                  onClick={handleEditConfirm}
                  data-testid="edit-button-save-all"
                >
                  {isEditPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save All Scores
                </Button>
              </div>
            )
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

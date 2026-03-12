import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer, useUpdateSession, useDeleteSession, useToggleGender, useTogglePause, useBulkPause, useSetPairGroup, useAddGuestPlayer, useRestartSession, useRecoverMatches, useAdminInlineEditPlayer, useUploadProfilePicture } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useMySessionClubs, useMyAdminClubs, useSessionLeaderboard, useClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
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
import { CompactMatchView } from "@/components/CompactMatchView";
import { ProLiveMatches, type PlayerAchievements } from "@/components/ProLiveMatches";
import { MatchQueue, CompletedMatches } from "@/components/MatchQueue";
import { MatchAlgorithmInfoButton } from "@/components/MatchAlgorithmInfo";
import { CrowdControlPanel } from "@/components/CrowdControlPanel";
import { StartSessionButton } from "@/components/StartSessionButton";
import { PlayerStatsPopup } from "@/components/PlayerStatsPopup";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Users, UserPlus, X, Shuffle, Settings2, Plus, Minus, CheckCircle, Trash2, Link2, PauseCircle, PlayCircle, UserPlus2, Trophy, Search, Check, Video, Lock, OctagonX, ArrowRight, RotateCcw, Pencil, Camera, BedDouble, LogOut, CreditCard, Building2, Ban, ClipboardList, ChevronUp, ChevronDown, Clock, Send, AlertTriangle, Info, LayoutGrid, List, Baby, Brain, Power, Square, Play, Flame, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  const { data: clubMembers } = useQuery({
    queryKey: ["/api/clubs", session?.clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${session!.clubId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session?.clubId,
  });
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
  const { mutate: bulkPause, isPending: isBulkPausing } = useBulkPause();
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
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);
  const [adminDashboardTab, setAdminDashboardTab] = useState("payments");
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();
  const { mutate: restartSession, isPending: isRestarting } = useRestartSession();
  const { mutate: recoverMatches, isPending: isRecovering } = useRecoverMatches();
  const [recoverDialogOpen, setRecoverDialogOpen] = useState(false);
  const { mutate: stopAllMatchesParent, isPending: isStoppingAllParent } = useStopAllMatches();
  const { data: parentMatches } = useSessionMatches(id);
  const { data: parentLeaderboard } = useSessionLeaderboard(id);

  const parentSessionMatchCounts: Record<number, number> = {};
  if (parentMatches) {
    for (const m of parentMatches) {
      if (m.status === "LIVE" || m.status === "COMPLETED") {
        for (const p of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
          if ((p as any)?.id) parentSessionMatchCounts[(p as any).id] = (parentSessionMatchCounts[(p as any).id] || 0) + 1;
        }
      }
    }
  }

  const parentPlayerAchievements: Record<number, { trophy?: boolean; fire?: boolean }> = (() => {
    if (!parentLeaderboard || parentLeaderboard.length === 0) return {};
    const result: Record<number, { trophy?: boolean; fire?: boolean }> = {};
    let maxWins = 0, maxPoints = 0;
    for (const p of parentLeaderboard) {
      if (p.matchesWon > maxWins) maxWins = p.matchesWon;
      if (p.pointsWon > maxPoints) maxPoints = p.pointsWon;
    }
    if (maxWins > 0) {
      for (const p of parentLeaderboard) {
        if (p.matchesWon === maxWins) result[p.playerId] = { ...result[p.playerId], trophy: true };
      }
    }
    if (maxPoints > 0) {
      for (const p of parentLeaderboard) {
        if (p.pointsWon === maxPoints) result[p.playerId] = { ...result[p.playerId], fire: true };
      }
    }
    return result;
  })();

  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [endSessionModalOpenParent, setEndSessionModalOpenParent] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityValue, setCapacityValue] = useState(0);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestGender, setGuestGender] = useState("MALE");
  const [guestCategory, setGuestCategory] = useState("C3");
  const [duplicateWarning, setDuplicateWarning] = useState<{ duplicates: any[]; formData: any } | null>(null);

  const [editingNameSignupId, setEditingNameSignupId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [cancelCreditDialogOpen, setCancelCreditDialogOpen] = useState(false);
  const [cancelCreditAmount, setCancelCreditAmount] = useState("");
  const [cancelCreditUseCustom, setCancelCreditUseCustom] = useState(false);
  const cancelAndCreditMutation = useMutation({
    mutationFn: async (data: { sessionId: number; creditAmount?: number }) => {
      const res = await apiRequest("POST", `/api/sessions/${data.sessionId}/cancel-and-credit`, data.creditAmount ? { creditAmount: data.creditAmount } : {});
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to cancel session" }));
        throw new Error(errData.message || "Failed to cancel session");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions", id] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", id, "signups"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      setCancelCreditDialogOpen(false);
      toast({
        title: "Session Cancelled",
        description: `${data.creditsIssued} credit(s) issued totalling £${(data.totalCreditAmount / 100).toFixed(2)}. Ticket ${data.ticketNumber} created.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel session", description: err.message, variant: "destructive" });
    },
  });

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

  const publishNowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/sessions/${id}`, { publishAt: null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sessions"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", id] });
      toast({ title: "Published", description: "Session is now open for signups." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to publish session.", variant: "destructive" });
    },
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
  const userSignup = signups?.find(s => s.playerId === userProfileForClub?.id);
  const isSignedUp = userSignup && ((userSignup as any).signupStatus === "CONFIRMED" || !(userSignup as any).signupStatus);
  const isInvited = userSignup && (userSignup as any).signupStatus === "INVITED";
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const isSuperAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isOrganiser = isSuperAdmin || (session ? managedClubIds.has(session.clubId) : false);
  const isOrganiserOnly = useIsOrganiserOnly(!!user);

  const { data: deletedMatchesData } = useQuery<{ count: number }>({
    queryKey: ["/api/sessions", id, "deleted-matches-count"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${id}/deleted-matches-count`, { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isOrganiser,
  });
  const deletedMatchesCount = deletedMatchesData?.count ?? 0;

  const editableClubIds = new Set((user?.role === "OWNER" || user?.role === "ADMIN") ? (allClubs?.map(c => c.id) || []) : (adminClubs?.map(c => c.id) || []));
  const canEditSession = session ? editableClubIds.has(session.clubId) : false;
  const parentLiveCount = (parentMatches as any[])?.filter((m: any) => m.status === "LIVE").length || 0;
  const parentQueuedCount = (parentMatches as any[])?.filter((m: any) => m.status === "QUEUED").length || 0;

  const confirmedSignups = signups?.filter(s => (s as any).signupStatus === "CONFIRMED" || !(s as any).signupStatus) || [];

  const { data: reliabilityData } = useQuery<{ scores: Record<number, { score: number; totalSessions: number; paidOnTime: number; unpaid: number; outstandingAmount: number; preferredMethod: string }> }>({
    queryKey: ["/api/sessions", id, "payment-reliability-bulk"],
    enabled: isOrganiser && !!session && session.status !== "COMPLETED",
  });
  const reliabilityScores = reliabilityData?.scores || {};
  const riskyPlayers = Object.entries(reliabilityScores)
    .filter(([, data]) => data.score < 50 && data.totalSessions > 0)
    .map(([pid]) => {
      const signup = confirmedSignups.find(s => s.playerId === Number(pid));
      return { playerId: Number(pid), name: signup?.player?.user?.fullName || "Unknown", ...reliabilityScores[Number(pid)] };
    });
  
  const isApprovedMember = (() => {
    if (!user || !session) return false;
    if (isSuperAdmin) return true;
    const m = memberships?.find(m => m.clubId === session.clubId);
    return m?.membershipStatus === "APPROVED";
  })();

  const ALL_GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
  const meetsGradeCriteria = (() => {
    if (!user || !session) return true;
    if (isOrganiser) return true;
    const allowed = session.allowedCategories;
    if (!allowed || allowed.length === 0 || allowed.length >= ALL_GRADES.length) return true;
    const profile = user.playerProfiles?.find((p: any) => p.clubId === session.clubId);
    if (!profile) return false;
    const playerGrade = profile.grade || profile.category;
    if (!playerGrade) return false;
    return allowed.includes(playerGrade);
  })();
  
  const confirmedOrWaitingPlayerIds = new Set(
    (signups || [])
      .filter((s: any) => s.signupStatus === "CONFIRMED" || s.signupStatus === "WAITING" || !s.signupStatus)
      .map(s => s.playerId)
  );
  const availablePlayers = (clubMembers || [])
    .filter((m: any) => !confirmedOrWaitingPlayerIds.has(m.id) && m.membershipStatus === "APPROVED")
    .map((m: any) => ({
      id: m.id,
      fullName: m.user?.fullName || m.fullName || "",
      gender: m.gender,
      category: m.category,
      grade: m.grade,
    }));

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

  const handleAddGuest = (forceCreate?: boolean) => {
    if (guestName.trim()) {
      addGuestPlayer({ sessionId: id, fullName: guestName.trim(), gender: guestGender, category: guestCategory, email: guestEmail.trim() || undefined, forceCreate }, {
        onSuccess: (data) => {
          if (data?._isDuplicate) {
            setDuplicateWarning({
              duplicates: data.duplicates,
              formData: { fullName: guestName.trim(), gender: guestGender, category: guestCategory, email: guestEmail.trim() },
            });
            return;
          }
          setAddGuestDialogOpen(false);
          setDuplicateWarning(null);
          setGuestName("");
          setGuestEmail("");
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
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4 sm:gap-6">
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
            {session.allowedCategories && session.allowedCategories.length > 0 && session.allowedCategories.length < ALL_GRADES.length && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" data-testid="badge-allowed-grades">
                Grades: {session.allowedCategories.join(", ")}
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
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Baby className="h-4 w-4 text-emerald-500" />
                        <Label className="!mt-0 font-medium">Junior Session</Label>
                      </div>
                      <Switch
                        checked={editSessionType === "JUNIORS_ONLY"}
                        onCheckedChange={(checked) => setEditSessionType(checked ? "JUNIORS_ONLY" : "OPEN")}
                        data-testid="toggle-edit-session-type"
                      />
                    </div>
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
                        <Label>Equipment Used</Label>
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
                        <Label>Equipment Type</Label>
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
            {isOrganiser && confirmedSignups.length > 0 && session.status !== "COMPLETED" && session.status !== "CANCELLED" && (
              <AlertDialog open={cancelCreditDialogOpen} onOpenChange={(open) => {
                setCancelCreditDialogOpen(open);
                if (open) {
                  setCancelCreditAmount("");
                  setCancelCreditUseCustom(false);
                }
              }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setCancelCreditDialogOpen(true)}
                  data-testid="button-cancel-session-credit"
                >
                  <CreditCard className="w-4 h-4" /> Cancel & Issue Credits
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Cancel Session & Issue Credits
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        This will cancel "{session.title}" and issue credits to all {confirmedSignups.length} confirmed player(s).
                      </span>
                      <span className="block text-sm">
                        Default credit amount: £{((session.sessionFee || 0) / 100).toFixed(2)} per player (session fee).
                      </span>
                      <span className="block">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={cancelCreditUseCustom}
                            onCheckedChange={(checked) => setCancelCreditUseCustom(!!checked)}
                            data-testid="checkbox-custom-credit-amount"
                          />
                          <span className="text-sm text-foreground">Use custom credit amount</span>
                        </label>
                      </span>
                      {cancelCreditUseCustom && (
                        <span className="block">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Amount in £ (e.g. 5.00)"
                            value={cancelCreditAmount}
                            onChange={(e) => setCancelCreditAmount(e.target.value)}
                            data-testid="input-cancel-credit-amount"
                          />
                        </span>
                      )}
                      <span className="block font-medium text-destructive text-sm">
                        This action cannot be undone. All confirmed signups will be cancelled.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-credit-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        const customAmount = cancelCreditUseCustom && cancelCreditAmount ? Math.round(parseFloat(cancelCreditAmount) * 100) : undefined;
                        cancelAndCreditMutation.mutate({ sessionId: id, creditAmount: customAmount });
                      }}
                      disabled={cancelAndCreditMutation.isPending || (cancelCreditUseCustom && (!cancelCreditAmount || parseFloat(cancelCreditAmount) <= 0))}
                      className="bg-destructive text-destructive-foreground"
                      data-testid="button-confirm-cancel-credit"
                    >
                      {cancelAndCreditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cancel & Issue Credits
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                  Are you sure you want to restart this session? This will archive all completed, active, and queued matches along with their scores. Players will remain signed up and the session will be ready for fresh matches.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-700 dark:text-amber-400">
                Matches will be archived. You can recover them later using the "Recover Matches" button.
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

          <Dialog open={recoverDialogOpen} onOpenChange={setRecoverDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <RotateCcw className="w-5 h-5" />
                  Recover Previous Matches
                </DialogTitle>
                <DialogDescription>
                  This will restore {deletedMatchesCount} previously archived match{deletedMatchesCount !== 1 ? "es" : ""} back into this session, including all scores and player assignments.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3 text-sm text-emerald-700 dark:text-emerald-400">
                All archived matches will be restored to the session. Any new matches created after the restart will be kept as well.
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setRecoverDialogOpen(false)} data-testid="button-cancel-recover">
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    recoverMatches(id, {
                      onSuccess: () => setRecoverDialogOpen(false)
                    });
                  }}
                  disabled={isRecovering}
                  data-testid="button-confirm-recover"
                >
                  {isRecovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  Yes, Recover Matches
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <h1 className="text-4xl font-display font-bold mb-2">{session.title}</h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(session.date), "EEEE, MMMM do")} • {session.startTime} • {session.courtsAvailable} Courts
            {(session.shuttleTubesUsed ?? 0) > 0 && ` • ${session.shuttleTubesUsed} Equipment Used`}
          </p>
          {session.sessionDetails && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line" data-testid="text-session-details">
              {session.sessionDetails}
            </p>
          )}
          {session.liveStreamUrl && (
            <a href={session.liveStreamUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-live-stream">
                <Video className="w-4 h-4" /> Watch Live Stream
              </Button>
            </a>
          )}
        </div>

        <Card className="min-w-[300px] border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground text-sm">Capacity</span>
                {editingCapacity && isOrganiser ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{confirmedSignups.length} /</span>
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
                    <span className="font-bold text-sm">{confirmedSignups.length} / {session.maxPlayers}</span>
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
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden" data-testid="capacity-progress-bar">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    (session as any).autoGenerateActive
                      ? "bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                      : confirmedSignups.length >= session.maxPlayers
                        ? "bg-gradient-to-r from-amber-500 to-amber-400"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  )}
                  style={{ width: `${Math.min(100, (confirmedSignups.length / session.maxPlayers) * 100)}%` }}
                />
              </div>
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
            ) : (session as any).publishAt && new Date((session as any).publishAt) > new Date() && !isOrganiser ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-center py-2 text-base bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Clock className="w-4 h-4 mr-2" /> Signups Not Yet Open
                </Badge>
                <p className="text-xs text-muted-foreground text-center" data-testid="text-publish-date">
                  Signups open on {format(new Date((session as any).publishAt), "EEE, d MMM yyyy")}
                </p>
              </div>
            ) : (session as any).publishAt && new Date((session as any).publishAt) > new Date() && isOrganiser ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-medium truncate">Signups open {format(new Date((session as any).publishAt), "d MMM")}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                    onClick={() => publishNowMutation.mutate()}
                    disabled={publishNowMutation.isPending}
                    data-testid="button-publish-now"
                  >
                    {publishNowMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                    Publish Now
                  </Button>
                </div>
              </div>
            ) : isSignedUp ? (
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => withdraw(id)}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            ) : isInvited ? (
              <div className="space-y-2">
                <Badge variant="secondary" className="w-full justify-center py-2 text-base bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  You've been invited to this session
                </Badge>
                <Button 
                  className="w-full shadow-lg shadow-primary/25" 
                  onClick={() => join(id)}
                  disabled={isJoining || confirmedSignups.length >= session.maxPlayers}
                  data-testid="button-accept-invitation"
                >
                  {isJoining ? "Joining..." : "Accept & Join"}
                </Button>
              </div>
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
            ) : !meetsGradeCriteria ? (
              <div className="space-y-2" data-testid="grade-restriction-warning">
                <Badge variant="secondary" className="w-full justify-center py-2 text-base bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Does Not Meet Grading
                </Badge>
                <p className="text-xs text-muted-foreground text-center">
                  Your grade ({userProfileForClub?.grade || userProfileForClub?.category || "ungraded"}) does not meet the criteria for this session. Allowed grades: {session.allowedCategories?.join(", ")}.
                </p>
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
                disabled={isJoining || confirmedSignups.length >= session.maxPlayers}
                data-testid="button-join-session"
              >
                {isJoining ? "Joining..." : "Join Session"}
              </Button>
            )}
            {isOrganiser && session.status !== "COMPLETED" && (
              <div className="flex flex-col items-center gap-3 mt-4">
                {!(session as any).autoGenerateActive ? (
                  <StartSessionButton
                    onClick={() => {
                      updateSession({ sessionId: id, updates: { autoGenerateActive: true } });
                      smartGenerateFromParent({ sessionId: id, mode: session.matchMode === "COMPETITIVE" ? "COMPETITIVE" : "SOCIAL", queueTargetSize: (session as any).queueTargetSize || 3, genderType: session.matchGenderType || "MIXED", isAutoGenerate: true });
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <button
                        onClick={() => {
                          stopAllMatchesParent({ sessionId: id });
                        }}
                        disabled={isStoppingAllParent || (parentLiveCount === 0 && parentQueuedCount === 0)}
                        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.5)] hover:shadow-[0_0_40px_rgba(244,63,94,0.65)] active:scale-95 transition-all duration-500 disabled:opacity-50"
                        data-testid="button-stop-all-matches-top"
                      >
                        <div className="absolute inset-0 rounded-full animate-pulse bg-rose-500/20" />
                        <Square className="w-7 h-7 text-white relative z-10" strokeWidth={2.5} />
                      </button>
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-background" />
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-rose-400">
                      {isStoppingAllParent ? "Stopping..." : "Live"}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 w-full">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 rounded-full transition-all duration-300"
                    onClick={() => setEndSessionModalOpenParent(true)}
                    disabled={parentLiveCount > 0}
                    data-testid="button-end-session-top"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    End
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 gap-1.5 rounded-full text-destructive transition-all duration-300"
                    onClick={() => setRestartDialogOpen(true)}
                    disabled={isRestarting}
                    data-testid="button-restart-session"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isRestarting ? "Restarting..." : "Restart"}
                  </Button>
                  {deletedMatchesCount > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 gap-1.5 rounded-full text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950 transition-all duration-300"
                      onClick={() => setRecoverDialogOpen(true)}
                      disabled={isRecovering}
                      data-testid="button-recover-matches"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {isRecovering ? "Recovering..." : `Recover (${deletedMatchesCount})`}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {isSuperAdmin && (
              <div className="border-t border-border/40 mt-4 pt-3">
                <Button
                  variant="ghost"
                  onClick={() => setAdminDashboardOpen(!adminDashboardOpen)}
                  className="w-full flex items-center justify-between h-auto py-2 px-1 rounded-lg"
                  data-testid="button-toggle-admin-dashboard"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Session Finance</span>
                  </div>
                  {adminDashboardOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </Button>
                {adminDashboardOpen && (
                  <div className="mt-3 space-y-3">
                    <Tabs value={adminDashboardTab} onValueChange={setAdminDashboardTab}>
                      <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-1" data-testid="admin-dashboard-tabs">
                        <TabsTrigger value="payments" className="text-xs py-2" data-testid="tab-payments">Payments</TabsTrigger>
                        <TabsTrigger value="financials" className="text-xs py-2" data-testid="tab-financials">Financials</TabsTrigger>
                        <TabsTrigger value="intelligence" className="text-xs py-2" data-testid="tab-intelligence">Intelligence</TabsTrigger>
                        <TabsTrigger value="ai-tools" className="text-xs py-2" data-testid="tab-ai-tools">AI Tools</TabsTrigger>
                      </TabsList>
                      <TabsContent value="payments" className="mt-3 space-y-3">
                        {riskyPlayers.length > 0 && session.status !== "COMPLETED" && (
                          <Card className="border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20" data-testid="payment-risk-alert">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="space-y-1.5 flex-1">
                                  <p className="font-semibold text-sm text-red-700 dark:text-red-400" data-testid="text-risk-alert-title">
                                    Payment Risk Alert
                                  </p>
                                  <p className="text-xs text-red-600 dark:text-red-400/80">
                                    {riskyPlayers.length} player{riskyPlayers.length !== 1 ? "s" : ""} with low reliability:
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {riskyPlayers.map(rp => (
                                      <Badge key={rp.playerId} variant="outline" className="text-[10px] border-red-300 dark:border-red-700 text-red-700 dark:text-red-400" data-testid={`badge-risky-player-${rp.playerId}`}>
                                        {rp.name} ({rp.score}%, {"\u00A3"}{((rp.outstandingAmount || 0) / 100).toFixed(2)})
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {confirmedSignups.length > 0 ? (
                          <PaymentVerificationDashboard sessionId={id} session={session} signups={confirmedSignups} />
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-3">No players yet.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="financials" className="mt-3 space-y-3">
                        {confirmedSignups.length > 0 ? (
                          <SessionFinancialCommandCenter sessionId={id} />
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-3">No players yet.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="intelligence" className="mt-3 space-y-3">
                        {session.status !== "COMPLETED" && session.status !== "CANCELLED" && (
                          <SessionBalancePrediction sessionId={id} />
                        )}
                        {session.status === "COMPLETED" && (
                          <SessionEngagementScore sessionId={id} />
                        )}
                        {session.status === "CANCELLED" && (
                          <p className="text-xs text-muted-foreground text-center py-3">Not available for cancelled sessions.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="ai-tools" className="mt-3 space-y-3">
                        {session.status !== "COMPLETED" && confirmedSignups.length >= 4 && (
                          <AISessionDesigner sessionId={id} />
                        )}
                        {session.status !== "COMPLETED" && confirmedSignups.length < 4 && (
                          <p className="text-xs text-muted-foreground text-center py-3">Needs at least 4 players.</p>
                        )}
                        {session.status === "COMPLETED" && (
                          <p className="text-xs text-muted-foreground text-center py-3">Not available for completed sessions.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MatchesView 
        sessionId={id} 
        isOrganiser={isOrganiser}
        isSignedUp={!!isSignedUp}
        currentPlayerProfileId={userProfileForClub?.id || null}
        matchMode={session.matchMode} 
        courtsAvailable={session.courtsAvailable}
        courtNames={session.courtNames}
        signups={signups || []}
        playersPerSide={session.playersPerSide}
        matchGenderType={session.matchGenderType}
        defaultPointsToPlayTo={(session as any).defaultPointsToPlayTo || 21}
        sessionStatus={session.status || "UPCOMING"}
        autoGenerateActive={(session as any).autoGenerateActive || false}
        savedQueueTargetSize={(session as any).queueTargetSize ?? 3}
        clubId={session.clubId}
      />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            Session Players ({confirmedSignups.length})
          </h2>
          {isOrganiser && (
            <div className="flex items-center gap-2 flex-wrap">
              {confirmedSignups.some(s => (s as any).isPaused) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  onClick={() => bulkPause({ sessionId: id, isPaused: false })}
                  disabled={isBulkPausing}
                  data-testid="button-wake-all"
                >
                  <PlayCircle className="w-4 h-4" />
                  Wake All
                </Button>
              )}
              {confirmedSignups.some(s => !(s as any).isPaused) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
                  onClick={() => bulkPause({ sessionId: id, isPaused: true })}
                  disabled={isBulkPausing}
                  data-testid="button-sleep-all"
                >
                  <BedDouble className="w-4 h-4" />
                  Sleep All
                </Button>
              )}
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

              <Dialog open={addGuestDialogOpen} onOpenChange={(open) => { setAddGuestDialogOpen(open); if (!open) { setDuplicateWarning(null); } }}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-add-new-player">
                    <UserPlus2 className="w-4 h-4" /> Add New Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Player</DialogTitle>
                    <DialogDescription>Create a new player account and add them to this session.</DialogDescription>
                  </DialogHeader>
                  {duplicateWarning ? (
                    <div className="space-y-4 pt-2">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Potential duplicate player(s) found
                        </p>
                        <div className="space-y-2">
                          {duplicateWarning.duplicates.map((dup: any, idx: number) => (
                            <div key={idx} className="text-sm p-2 bg-background rounded border">
                              <p className="font-medium">{dup.fullName}</p>
                              {dup.email && <p className="text-muted-foreground text-xs">{dup.email}</p>}
                              <p className="text-xs text-muted-foreground">
                                Match: {dup.matchType === "email" ? "Same email" : "Same name"}
                              </p>
                              {dup.clubs?.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Clubs: {dup.clubs.map((c: any) => c.clubName).join(", ")}
                                </p>
                              )}
                              {user?.role === "OWNER" && (
                                <p className="text-xs text-primary mt-1">
                                  As super admin, you can merge these accounts from God Mode.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setDuplicateWarning(null)}
                          data-testid="button-cancel-duplicate"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setDuplicateWarning(null);
                            handleAddGuest(true);
                          }}
                          disabled={isAddingGuest}
                          data-testid="button-force-create"
                        >
                          {isAddingGuest ? "Adding..." : "Create Anyway"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
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
                        <Label>Email (optional)</Label>
                        <Input 
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="player@example.com"
                          className="mt-2"
                          data-testid="input-guest-email"
                        />
                        <p className="text-xs text-muted-foreground mt-1">If provided, the player will receive an email to claim their account.</p>
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
                        onClick={() => handleAddGuest()}
                        disabled={!guestName.trim() || isAddingGuest}
                        data-testid="button-confirm-add-guest"
                      >
                        {isAddingGuest ? "Adding..." : "Add Player"}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {confirmedSignups.slice().sort((a, b) => {
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
                className={`flex items-center justify-between p-3 sm:p-4 bg-card rounded-xl border border-border/50 shadow-sm hover-elevate ${isPaused ? "opacity-60" : ""}`}
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
                        <span className="inline-flex items-center gap-1">
                          {signup.player?.user?.fullName || "Unknown"}
                          {parentSessionMatchCounts[signup.playerId] != null && (
                            <span className="text-muted-foreground text-xs font-normal">({parentSessionMatchCounts[signup.playerId]})</span>
                          )}
                          {parentPlayerAchievements[signup.playerId]?.trophy && <Trophy className="w-3.5 h-3.5 text-amber-400 inline-block" />}
                          {parentPlayerAchievements[signup.playerId]?.fire && <Flame className="w-3.5 h-3.5 text-orange-400 inline-block" />}
                        </span>
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
                      {isOrganiser && reliabilityScores[signup.playerId] && reliabilityScores[signup.playerId].totalSessions > 0 && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            reliabilityScores[signup.playerId].score >= 70 
                              ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" 
                              : reliabilityScores[signup.playerId].score >= 50 
                                ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" 
                                : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                          }`}
                          data-testid={`badge-reliability-${signup.playerId}`}
                        >
                          {reliabilityScores[signup.playerId].score >= 70 ? <CreditCard className="w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                          {reliabilityScores[signup.playerId].score}%
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

function PaymentVerificationDashboard({ sessionId, session, signups }: { sessionId: number; session: any; signups: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const paidSignups = signups.filter((s: any) => s.paymentStatus === "PAID");
  const pendingBankSignups = signups.filter((s: any) => s.paymentStatus === "PENDING" && s.paymentMethod === "BANK_TRANSFER");
  const pendingCashSignups = signups.filter((s: any) => s.paymentStatus === "PENDING" && s.paymentMethod === "CASH");
  const creditSignups = signups.filter((s: any) => s.paymentMethod === "MEMBERSHIP_CREDIT");
  const unpaidSignups = signups.filter((s: any) => s.paymentStatus === "UNPAID");
  const pendingAll = signups.filter((s: any) => s.paymentStatus === "PENDING");

  const sessionDate = new Date(session.date);
  const now = new Date();
  const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const showUrgentWarning = hoursUntilSession > 0 && hoursUntilSession <= 24 && (pendingAll.length > 0 || unpaidSignups.length > 0);

  const bulkVerifyMutation = useMutation({
    mutationFn: async (paymentMethod: string) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/bulk-verify-payments`, { paymentMethod });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to verify payments" }));
        throw new Error(errData.message || "Failed to verify payments");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "signups"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "manage-players"] });
      toast({ title: "Payments Verified", description: `${data.verified} payment(s) confirmed.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const individualPaymentMutation = useMutation({
    mutationFn: async (data: { signupId: number; paymentStatus: string; paymentMethod?: string; verifiedByAdmin?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${data.signupId}/payment-override`, data);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to update payment" }));
        throw new Error(errData.message || "Failed to update payment");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "signups"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "manage-players"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid="card-payment-verification">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {showUrgentWarning && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800" data-testid="banner-pending-payments-warning">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Unverified Payments</p>
              <p className="text-xs">Session starts in {hoursUntilSession < 1 ? "less than 1 hour" : `${Math.round(hoursUntilSession)} hours`}. {pendingAll.length + unpaidSignups.length} payment(s) still require attention.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Overview
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} data-testid="button-toggle-payment-details">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-paid-count">{paidSignups.length}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-bank-count">{pendingBankSignups.length}</p>
            <p className="text-xs text-muted-foreground">Pending Bank</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-pending-cash-count">{pendingCashSignups.length}</p>
            <p className="text-xs text-muted-foreground">Cash Pending</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-credit-count">{creditSignups.length}</p>
            <p className="text-xs text-muted-foreground">Using Credit</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-unpaid-count">{unpaidSignups.length}</p>
            <p className="text-xs text-muted-foreground">Unpaid</p>
          </CardContent></Card>
        </div>

        {(pendingBankSignups.length > 0 || pendingCashSignups.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {pendingBankSignups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => bulkVerifyMutation.mutate("BANK_TRANSFER")}
                disabled={bulkVerifyMutation.isPending}
                data-testid="button-confirm-all-bank"
              >
                {bulkVerifyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Confirm All Bank Transfers ({pendingBankSignups.length})
              </Button>
            )}
            {pendingCashSignups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => bulkVerifyMutation.mutate("CASH")}
                disabled={bulkVerifyMutation.isPending}
                data-testid="button-confirm-all-cash"
              >
                {bulkVerifyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Confirm All Cash ({pendingCashSignups.length})
              </Button>
            )}
          </div>
        )}

        {expanded && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Individual Payment Actions</p>
            {signups.map((s: any) => {
              const playerName = s.player?.user?.fullName || "Unknown";
              const feeDisplay = s.fee ? `£${(s.fee / 100).toFixed(2)}` : "Free";
              return (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border" data-testid={`row-payment-player-${s.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{playerName}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{feeDisplay}</span>
                      <PaymentBadge status={s.paymentStatus} method={s.paymentMethod} />
                      {s.verifiedByAdmin && <Badge variant="secondary" className="text-[10px] bg-green-50 dark:bg-green-950">Verified</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.paymentStatus !== "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => individualPaymentMutation.mutate({ signupId: s.id, paymentStatus: "PAID", verifiedByAdmin: true })}
                        disabled={individualPaymentMutation.isPending}
                        data-testid={`button-mark-paid-${s.id}`}
                      >
                        <Check className="w-3 h-3" /> Paid
                      </Button>
                    )}
                    {s.paymentStatus === "PENDING" && s.paymentMethod === "CASH" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => individualPaymentMutation.mutate({ signupId: s.id, paymentStatus: "PAID", paymentMethod: "CASH", verifiedByAdmin: true })}
                        disabled={individualPaymentMutation.isPending}
                        data-testid={`button-cash-received-${s.id}`}
                      >
                        <Check className="w-3 h-3" /> Cash Received
                      </Button>
                    )}
                    {s.paymentStatus !== "UNPAID" && s.paymentStatus !== "PAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 text-destructive"
                        onClick={() => individualPaymentMutation.mutate({ signupId: s.id, paymentStatus: "UNPAID", paymentMethod: "NONE", verifiedByAdmin: false })}
                        disabled={individualPaymentMutation.isPending}
                        data-testid={`button-reject-payment-${s.id}`}
                      >
                        <X className="w-3 h-3" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionFinancialCommandCenter({ sessionId }: { sessionId: number }) {
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/sessions", sessionId, "financial-overview"],
  });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [expandedPlayers, setExpandedPlayers] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditTarget, setCreditTarget] = useState<{ playerId: number; fullName: string; fee: number } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");

  const confirmPaymentMutation = useMutation({
    mutationFn: async (data: { signupId: number }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${data.signupId}/payment-override`, {
        paymentStatus: "PAID",
        verifiedByAdmin: true,
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "signups"] });
      toast({ title: "Payment confirmed" });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (data: { signupId: number; playerId: number }) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/send-payment-reminder`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reminder sent" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reminder", description: err.message, variant: "destructive" });
    },
  });

  const issueCreditMutation = useMutation({
    mutationFn: async (data: { playerId: number; amount: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/issue-credit`, data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      setCreditDialogOpen(false);
      setCreditTarget(null);
      setCreditAmount("");
      toast({ title: "Credit issued" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to issue credit", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <Card><CardContent className="p-4 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!data) return null;

  const { summary, players } = data;
  const expectedPence = summary.expectedRevenue;
  const paidPence = summary.paidRevenue;
  const gap = expectedPence - paidPence;
  const paidPct = expectedPence > 0 ? Math.round((paidPence / expectedPence) * 100) : 0;
  const pendingPct = expectedPence > 0 ? Math.round((summary.pendingRevenue / expectedPence) * 100) : 0;
  const unpaidPct = expectedPence > 0 ? Math.round((summary.unpaidRevenue / expectedPence) * 100) : 0;

  const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const methodLabels: Record<string, string> = {
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
    CASH: "Cash",
    ONLINE: "Online",
    MEMBERSHIP_CREDIT: "Credit",
    NONE: "None",
  };

  const statusColors: Record<string, string> = {
    PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    UNPAID: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <>
      <Card data-testid="card-financial-command-center">
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Financial Overview
            </h3>
            <Badge variant="secondary" data-testid="badge-collection-rate">
              {summary.collectionRate}% Collected
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="text-center p-3 rounded-md bg-muted/30">
              <p className="text-xl font-bold" data-testid="text-expected-revenue">{fmt(summary.expectedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Expected</p>
            </div>
            <div className="text-center p-3 rounded-md bg-green-50 dark:bg-green-950/30">
              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-paid-revenue">{fmt(summary.paidRevenue)}</p>
              <p className="text-xs text-muted-foreground">Confirmed ({summary.paidCount})</p>
            </div>
            <div className="text-center p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending-revenue">{fmt(summary.pendingRevenue)}</p>
              <p className="text-xs text-muted-foreground">Pending ({summary.pendingCount})</p>
            </div>
            <div className="text-center p-3 rounded-md bg-amber-50 dark:bg-amber-950/30">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-cash-pending">{fmt(summary.cashPendingRevenue)}</p>
              <p className="text-xs text-muted-foreground">Cash Pending ({summary.cashPendingCount})</p>
            </div>
            <div className="text-center p-3 rounded-md bg-blue-50 dark:bg-blue-950/30">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-credit-applied">{fmt(summary.creditAppliedRevenue)}</p>
              <p className="text-xs text-muted-foreground">Credit ({summary.creditCount})</p>
            </div>
            <div className="text-center p-3 rounded-md bg-red-50 dark:bg-red-950/30">
              <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-unpaid-balance">{fmt(summary.unpaidRevenue)}</p>
              <p className="text-xs text-muted-foreground">Unpaid ({summary.unpaidCount})</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expected vs Actual</span>
              <span className="font-medium" data-testid="text-revenue-gap">
                {gap > 0 ? `${fmt(gap)} outstanding` : "Fully collected"}
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-muted/50 overflow-hidden flex" data-testid="bar-revenue-comparison">
              {paidPct > 0 && (
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                  title={`Paid: ${paidPct}%`}
                />
              )}
              {pendingPct > 0 && (
                <div
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${pendingPct}%` }}
                  title={`Pending: ${pendingPct}%`}
                />
              )}
              {unpaidPct > 0 && (
                <div
                  className="h-full bg-red-400 transition-all duration-500"
                  style={{ width: `${unpaidPct}%` }}
                  title={`Unpaid: ${unpaidPct}%`}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" />Paid</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-yellow-500" />Pending</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" />Unpaid</div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setExpandedPlayers(!expandedPlayers)}
              className="flex items-center gap-2 text-sm font-medium w-full text-left"
              data-testid="button-toggle-player-financials"
            >
              <Users className="w-4 h-4" />
              Player Breakdown ({players.length})
              {expandedPlayers ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>

            {expandedPlayers && (
              <div className="space-y-2 pt-2" data-testid="list-player-financials">
                {players.map((p: any) => (
                  <div key={p.signupId} className="flex items-center gap-2 p-3 border rounded-md" data-testid={`row-player-financial-${p.playerId}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-player-name-${p.playerId}`}>{p.fullName}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <Badge variant="secondary" className={`text-xs ${statusColors[p.paymentStatus] || ""}`}>
                          {p.paymentStatus}
                        </Badge>
                        {p.paymentMethod !== "NONE" && (
                          <Badge variant="outline" className="text-xs">{methodLabels[p.paymentMethod] || p.paymentMethod}</Badge>
                        )}
                        <span className="text-xs font-medium">{fmt(p.fee)}</span>
                        {p.creditUsed > 0 && (
                          <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
                            Credit: {fmt(p.creditUsed)}
                          </Badge>
                        )}
                        {p.verifiedByAdmin && (
                          <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-950">
                            <CheckCircle className="w-3 h-3 mr-0.5" /> Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.paymentStatus !== "PAID" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirmPaymentMutation.mutate({ signupId: p.signupId })}
                          disabled={confirmPaymentMutation.isPending}
                          title="Confirm Payment"
                          data-testid={`button-confirm-payment-${p.playerId}`}
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {p.paymentStatus !== "PAID" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => sendReminderMutation.mutate({ signupId: p.signupId, playerId: p.playerId })}
                          disabled={sendReminderMutation.isPending}
                          title="Send Reminder"
                          data-testid={`button-send-reminder-${p.playerId}`}
                        >
                          <Send className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setCreditTarget({ playerId: p.playerId, fullName: p.fullName, fee: p.fee });
                          setCreditAmount(String(p.fee));
                          setCreditDialogOpen(true);
                        }}
                        title="Issue Credit"
                        data-testid={`button-issue-credit-${p.playerId}`}
                      >
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Credit</DialogTitle>
            <DialogDescription>
              Issue a credit to {creditTarget?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount (pence)</Label>
              <Input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Amount in pence"
                data-testid="input-credit-amount"
              />
              {creditAmount && Number(creditAmount) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">= {fmt(Number(creditAmount))}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)} data-testid="button-cancel-credit">Cancel</Button>
            <Button
              onClick={() => {
                if (creditTarget && creditAmount && Number(creditAmount) > 0) {
                  issueCreditMutation.mutate({
                    playerId: creditTarget.playerId,
                    amount: Number(creditAmount),
                    reason: `Manual credit for session`,
                  });
                }
              }}
              disabled={issueCreditMutation.isPending || !creditAmount || Number(creditAmount) <= 0}
              data-testid="button-confirm-credit"
            >
              {issueCreditMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Issue {creditAmount && Number(creditAmount) > 0 ? fmt(Number(creditAmount)) : "Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionBalancePrediction({ sessionId }: { sessionId: number }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/sessions", sessionId, "balance-prediction"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/balance-prediction`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-4 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!data || data.playerCount === 0) return null;

  const ratingColors: Record<string, string> = {
    EXCELLENT: "text-emerald-600 dark:text-emerald-400",
    GOOD: "text-blue-600 dark:text-blue-400",
    FAIR: "text-amber-600 dark:text-amber-400",
    POOR: "text-red-600 dark:text-red-400",
  };

  const ratingBg: Record<string, string> = {
    EXCELLENT: "bg-emerald-500",
    GOOD: "bg-blue-500",
    FAIR: "bg-amber-500",
    POOR: "bg-red-500",
  };

  const GRADE_ORDER_DISPLAY = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
  const maxDistCount = Math.max(1, ...Object.values(data.skillDistribution as Record<string, number>));

  return (
    <Card data-testid="card-balance-prediction">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Pre-Session Intelligence
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={ratingColors[data.balanceRating] || ""} data-testid="badge-balance-rating">
              {data.balanceRating}
            </Badge>
            <span className="text-sm font-mono font-bold" data-testid="text-fairness-score">{data.predictedFairnessScore}/100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold" data-testid="text-player-count">{data.playerCount}</p>
            <p className="text-xs text-muted-foreground">Players</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" data-testid="text-grade-range">{data.gradeRange}</p>
            <p className="text-xs text-muted-foreground">Grade Spread</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" data-testid="text-male-count">{data.genderBreakdown.male}</p>
            <p className="text-xs text-muted-foreground">Male</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" data-testid="text-female-count">{data.genderBreakdown.female}</p>
            <p className="text-xs text-muted-foreground">Female</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Skill Distribution</p>
          <div className="flex items-end gap-1 h-16">
            {GRADE_ORDER_DISPLAY.map(grade => {
              const count = (data.skillDistribution as Record<string, number>)[grade] || 0;
              const height = count > 0 ? Math.max(8, (count / maxDistCount) * 100) : 0;
              return (
                <div key={grade} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-t-sm transition-all ${ratingBg[data.balanceRating] || "bg-primary"} opacity-70`}
                    style={{ height: `${height}%` }}
                    data-testid={`bar-grade-${grade}`}
                  />
                  <span className="text-[9px] text-muted-foreground">{grade}</span>
                  {count > 0 && <span className="text-[9px] font-medium">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {data.warnings.length > 0 && (
          <div className="space-y-2">
            {data.warnings.map((w: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 text-sm p-2 rounded-md",
                  w.severity === "HIGH" ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" :
                  w.severity === "MEDIUM" ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                  "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                )}
                data-testid={`warning-balance-${i}`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionEngagementScore({ sessionId }: { sessionId: number }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/sessions", sessionId, "engagement-score"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/engagement-score`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) return <Card><CardContent className="p-4 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!data || data.totalMatches === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const factors = [
    { label: "Match Balance", value: data.matchBalanceFactor, weight: "40%", desc: `${data.breakdown.closeMatches}/${data.breakdown.totalCompleted} close matches` },
    { label: "Participation Equity", value: data.participationEquity, weight: "30%", desc: `${data.breakdown.minMatchesPlayed}-${data.breakdown.maxMatchesPlayed} matches per player` },
    { label: "Player Utilization", value: data.waitingTimeFactor, weight: "30%", desc: `${data.breakdown.playersWhoPlayed}/${data.breakdown.playersSignedUp} players active` },
  ];

  return (
    <Card data-testid="card-engagement-score">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Session Engagement Score
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={getScoreColor(data.engagementScore)} data-testid="badge-engagement-rating">
              {getScoreLabel(data.engagementScore)}
            </Badge>
            <span className="text-2xl font-bold font-mono" data-testid="text-engagement-score">{data.engagementScore}</span>
          </div>
        </div>

        <div className="space-y-3">
          {factors.map((f, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{f.label} <span className="text-muted-foreground text-xs">({f.weight})</span></span>
                <span className="text-sm font-mono font-bold" data-testid={`text-factor-${i}`}>{f.value}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(f.value)}`}
                  style={{ width: `${f.value}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-bold" data-testid="text-unique-partners">{data.breakdown.uniquePartnerPairs}</p>
            <p className="text-xs text-muted-foreground">Unique Partner Pairs</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold" data-testid="text-unique-opponents">{data.breakdown.uniqueOpponentPairs}</p>
            <p className="text-xs text-muted-foreground">Unique Opponent Pairs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AISessionDesigner({ sessionId }: { sessionId: number }) {
  const [designData, setDesignData] = useState<any>(null);
  const { toast } = useToast();

  const designMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/ai-design`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => setDesignData(data),
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const GRADE_ORDER_DISPLAY = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];

  return (
    <Card data-testid="card-ai-session-designer">
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            AI Session Designer
          </h3>
          <Button
            size="sm"
            onClick={() => designMutation.mutate()}
            disabled={designMutation.isPending}
            data-testid="button-ai-design"
          >
            {designMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
            {designData ? "Refresh Analysis" : "Analyze Session"}
          </Button>
        </div>

        {!designData && !designMutation.isPending && (
          <p className="text-sm text-muted-foreground">Click "Analyze Session" to get AI-powered suggestions for optimal session structure, court usage, and revenue prediction.</p>
        )}

        {designData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-md bg-muted/30">
                <p className="text-2xl font-bold" data-testid="text-ai-player-count">{designData.playerCount}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/30">
                <p className="text-2xl font-bold" data-testid="text-ai-rounds">{designData.suggestedRounds}</p>
                <p className="text-xs text-muted-foreground">Rounds</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/30">
                <p className="text-2xl font-bold" data-testid="text-ai-matches-per-round">{designData.matchesPerRound}</p>
                <p className="text-xs text-muted-foreground">Matches/Round</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/30">
                <p className="text-2xl font-bold" data-testid="text-ai-duration">{designData.estimatedDurationMinutes}m</p>
                <p className="text-xs text-muted-foreground">Est. Duration</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Balance Score</span>
                  <span className={cn("text-sm font-bold", designData.predictedBalanceScore >= 70 ? "text-emerald-600" : designData.predictedBalanceScore >= 40 ? "text-amber-600" : "text-red-600")} data-testid="text-ai-balance">
                    {designData.predictedBalanceScore}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className={cn("h-full rounded-full", designData.predictedBalanceScore >= 70 ? "bg-emerald-500" : designData.predictedBalanceScore >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${designData.predictedBalanceScore}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Engagement Score</span>
                  <span className={cn("text-sm font-bold", designData.predictedEngagementScore >= 70 ? "text-emerald-600" : designData.predictedEngagementScore >= 40 ? "text-amber-600" : "text-red-600")} data-testid="text-ai-engagement">
                    {designData.predictedEngagementScore}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className={cn("h-full rounded-full", designData.predictedEngagementScore >= 70 ? "bg-emerald-500" : designData.predictedEngagementScore >= 40 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${designData.predictedEngagementScore}%` }} />
                </div>
              </div>
            </div>

            {designData.courtOptimization && (
              <div className="rounded-md border p-3 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Court Optimization
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold" data-testid="text-court-utilization">{designData.courtOptimization.courtUtilization}%</p>
                    <p className="text-xs text-muted-foreground">Court Usage</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" data-testid="text-active-per-round">{designData.courtOptimization.playersActivePerRound}</p>
                    <p className="text-xs text-muted-foreground">Active/Round</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold" data-testid="text-idle-per-round">{designData.courtOptimization.playersIdlePerRound}</p>
                    <p className="text-xs text-muted-foreground">Idle/Round</p>
                  </div>
                </div>
              </div>
            )}

            {designData.profitPrediction && designData.profitPrediction.expectedRevenue > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Revenue Prediction
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-profit-optimistic">
                      {"\u00A3"}{(designData.profitPrediction.optimistic / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Optimistic</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-profit-realistic">
                      {"\u00A3"}{(designData.profitPrediction.realistic / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Realistic</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400" data-testid="text-profit-pessimistic">
                      {"\u00A3"}{(designData.profitPrediction.pessimistic / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pessimistic</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>Confirmed: {"\u00A3"}{(designData.profitPrediction.confirmedRevenue / 100).toFixed(2)}</span>
                  <span>Pending: {"\u00A3"}{(designData.profitPrediction.pendingAmount / 100).toFixed(2)}</span>
                  <span>Unpaid: {"\u00A3"}{(designData.profitPrediction.unpaidAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            {designData.gradeDistribution && Object.keys(designData.gradeDistribution).length > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <h4 className="text-sm font-semibold">Grade Distribution</h4>
                <div className="flex items-end gap-1.5 h-16">
                  {GRADE_ORDER_DISPLAY.map(g => {
                    const count = designData.gradeDistribution[g] || 0;
                    const maxCount = Math.max(1, ...Object.values(designData.gradeDistribution as Record<string, number>));
                    return (
                      <div key={g} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-mono">{count || ""}</span>
                        <div
                          className={cn("w-full rounded-t-sm", count > 0 ? "bg-primary/60" : "bg-muted/30")}
                          style={{ height: `${count > 0 ? Math.max(4, (count / maxCount) * 40) : 2}px` }}
                        />
                        <span className="text-[9px] text-muted-foreground">{g}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {designData.recommendations?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  Recommendations
                </h4>
                {designData.recommendations.map((r: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-2" data-testid={`text-recommendation-${i}`}>
                    <span className="text-primary shrink-0">•</span>
                    {r}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchesView({ sessionId, isOrganiser, isSignedUp, currentPlayerProfileId, matchMode, courtsAvailable, courtNames: initialCourtNames, signups, playersPerSide, matchGenderType, defaultPointsToPlayTo = 21, sessionStatus, autoGenerateActive, savedQueueTargetSize = 3, clubId }: { 
  sessionId: number; 
  isOrganiser: boolean;
  isSignedUp: boolean;
  currentPlayerProfileId: number | null;
  matchMode: "COMPETITIVE" | "SOCIAL" | "TRAINING";
  courtsAvailable: number;
  courtNames?: string[] | null;
  signups: { playerId: number; isPaused?: boolean; attendanceStatus?: string; player: { id: number; user: { fullName: string }; category: string | null } }[];
  playersPerSide: number;
  matchGenderType: string;
  defaultPointsToPlayTo?: number;
  sessionStatus: string;
  autoGenerateActive: boolean;
  savedQueueTargetSize?: number;
  clubId?: number;
}) {
  const confirmedSignups = signups?.filter(s => (s as any).signupStatus === "CONFIRMED" || !(s as any).signupStatus) || [];
  const { toast } = useToast();
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
  const { mutate: editMatchScore } = useEditMatchScore();
  const queryClient = useQueryClient();
  const { data: sessionLeaderboard } = useSessionLeaderboard(sessionId);
  const [autoGenWaiting, setAutoGenWaiting] = useState(false);
  const [pairConstraintMessage, setPairConstraintMessage] = useState<string | null>(null);
  const [autoGenLocallyStopped, setAutoGenLocallyStopped] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const manualGenInFlight = useRef(false);

  const [courtsToUse, setCourtsToUse] = useState(courtsAvailable);
  const [courtNamesState, setCourtNamesState] = useState<string[]>(initialCourtNames || []);
  const [activeMode, setActiveMode] = useState<"SOCIAL" | "COMPETITIVE">(matchMode === "COMPETITIVE" ? "COMPETITIVE" : "SOCIAL");
  const [crowdControlOpen, setCrowdControlOpen] = useState(false);
  const [queueTargetSize, setQueueTargetSize] = useState(savedQueueTargetSize);
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
  const [fullScheduleOpen, setFullScheduleOpen] = useState(false);
  const [fullScheduleData, setFullScheduleData] = useState<any>(null);
  const [fullScheduleRounds, setFullScheduleRounds] = useState<string>("");
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ roundIdx: number; matchIdx: number; position: string; currentPlayerId: number } | null>(null);
  const [fairnessListOpen, setFairnessListOpen] = useState(false);

  const generateFullScheduleMutation = useMutation({
    mutationFn: async (data: { numberOfRounds?: number; genderType?: string; mode?: string }) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/generate-full-schedule`, data);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to generate schedule" }));
        throw new Error(errData.message || "Failed to generate schedule");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setFullScheduleData(data);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate full schedule.", variant: "destructive" });
    },
  });

  const confirmScheduleMutation = useMutation({
    mutationFn: async (rounds: any[]) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/confirm-full-schedule`, { rounds });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to confirm schedule" }));
        throw new Error(errData.message || "Failed to confirm schedule");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setFullScheduleData(null);
      setFullScheduleOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "matches"] });
      toast({ title: "Schedule Confirmed", description: `${data.matchesCreated} matches added to the queue.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to confirm schedule.", variant: "destructive" });
    },
  });

  const handleSwapInSchedule = (roundIdx: number, matchIdx: number, position: string, newPlayerId: number) => {
    if (!fullScheduleData) return;
    const newRounds = [...fullScheduleData.rounds];
    const match = { ...newRounds[roundIdx].matches[matchIdx] };
    const oldPlayerId = match[position as keyof typeof match];
    match[position as keyof typeof match] = newPlayerId;
    newRounds[roundIdx] = { ...newRounds[roundIdx], matches: [...newRounds[roundIdx].matches] };
    newRounds[roundIdx].matches[matchIdx] = match;

    for (let ri = 0; ri < newRounds.length; ri++) {
      for (let mi = 0; mi < newRounds[ri].matches.length; mi++) {
        if (ri === roundIdx && mi === matchIdx) continue;
        const m = { ...newRounds[ri].matches[mi] };
        let changed = false;
        for (const pos of ["teamAPlayer1Id", "teamAPlayer2Id", "teamBPlayer1Id", "teamBPlayer2Id"] as const) {
          if (m[pos] === newPlayerId) {
            (m as any)[pos] = oldPlayerId;
            changed = true;
          }
        }
        if (changed) {
          newRounds[ri] = { ...newRounds[ri], matches: [...newRounds[ri].matches] };
          newRounds[ri].matches[mi] = m;
        }
      }
    }

    setFullScheduleData({ ...fullScheduleData, rounds: newRounds });
    setSwapDialogOpen(false);
    setSwapTarget(null);
  };

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
      if (manualGenInFlight.current) return;
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

  const attendingSignups = confirmedSignups.filter(s => !(s as any).attendanceStatus || (s as any).attendanceStatus === "ATTENDING");
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
    scoreEnteredByUserId: (m as any).scoreEnteredByUserId,
    scoreEnteredAt: (m as any).scoreEnteredAt,
    scoreEnteredByUser: (m as any).scoreEnteredByUser,
    scoreUpdatedByUserId: (m as any).scoreUpdatedByUserId,
    scoreUpdatedAt: (m as any).scoreUpdatedAt,
    scoreUpdatedByUser: (m as any).scoreUpdatedByUser,
  }));

  const liveMatches = typedMatches.filter(m => m.status === "LIVE");
  const queuedMatches = typedMatches.filter(m => m.status === "QUEUED");
  const completedMatches = typedMatches.filter(m => m.status === "COMPLETED");
  const completedCount = completedMatches.length;

  const sessionMatchCounts: Record<number, number> = {};
  const countedMatches = typedMatches.filter(m => m.status === "LIVE" || m.status === "COMPLETED");
  for (const m of countedMatches) {
    for (const p of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
      if (p?.id) sessionMatchCounts[p.id] = (sessionMatchCounts[p.id] || 0) + 1;
    }
  }

  const playerAchievements = (() => {
    if (!sessionLeaderboard || sessionLeaderboard.length === 0) return {} as Record<number, { trophy?: boolean; fire?: boolean }>;
    const result: Record<number, { trophy?: boolean; fire?: boolean }> = {};
    let maxWins = 0;
    let maxPoints = 0;
    for (const p of sessionLeaderboard) {
      if (p.matchesWon > maxWins) maxWins = p.matchesWon;
      if (p.pointsWon > maxPoints) maxPoints = p.pointsWon;
    }
    if (maxWins > 0) {
      for (const p of sessionLeaderboard) {
        if (p.matchesWon === maxWins) {
          const pid = p.playerId ?? p.id;
          if (pid != null) result[pid] = { ...result[pid], trophy: true };
        }
      }
    }
    if (maxPoints > 0) {
      for (const p of sessionLeaderboard) {
        if (p.pointsWon === maxPoints) {
          const pid = p.playerId ?? p.id;
          if (pid != null) result[pid] = { ...result[pid], fire: true };
        }
      }
    }
    return result;
  })();

  const busyPlayerIds = (() => {
    const playerMatchCount = new Map<number, number>();
    const liveAndQueued = typedMatches.filter(m => m.status === "LIVE" || m.status === "QUEUED");
    for (const m of liveAndQueued) {
      for (const p of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
        if (p?.id) playerMatchCount.set(p.id, (playerMatchCount.get(p.id) || 0) + 1);
      }
    }
    const dupes = new Set<number>();
    for (const [id, count] of playerMatchCount) {
      if (count > 1) dupes.add(id);
    }
    return dupes;
  })();
  
  const occupiedCourts = new Set(liveMatches.map(m => m.courtNumber));
  const availableCourts = Array.from({ length: courtsToUse }, (_, i) => i + 1)
    .filter(c => !occupiedCourts.has(c));

  const availablePlayers = confirmedSignups.map(s => ({
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
    setNotEnoughPlayersMessage(null);
    manualGenInFlight.current = true;
    const wasInactive = !autoGenerateActive || autoGenLocallyStopped;
    if (wasInactive) {
      setAutoGenLocallyStopped(false);
      updateSession({ sessionId, updates: { autoGenerateActive: true } });
    }
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: !wasInactive }, {
      onSuccess: (data: any) => {
        manualGenInFlight.current = false;
        if (data?.status === "waiting") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(null);
        } else if (data?.status === "pair_blocked") {
          setAutoGenWaiting(true);
          setPairConstraintMessage(data.message || "Waiting for matches to finish to allow different pair combinations.");
        } else {
          setAutoGenWaiting(false);
          setPairConstraintMessage(null);
          setGenerateSuccess(true);
          setTimeout(() => setGenerateSuccess(false), 1200);
        }
      },
      onError: (err: any) => {
        manualGenInFlight.current = false;
        const msg = err?.message || "Failed to generate matches";
        setNotEnoughPlayersMessage(msg);
        setTimeout(() => setNotEnoughPlayersMessage(null), 5000);
      },
    });
  };

  const handleStartAutoGenerate = () => {
    if (showNotEnoughPlayersWarning()) return;
    manualGenInFlight.current = true;
    setAutoGenLocallyStopped(false);
    updateSession({ sessionId, updates: { autoGenerateActive: true } });
    smartGenerate({ sessionId, mode: activeMode, queueTargetSize, genderType: generateGenderType, isAutoGenerate: true }, {
      onSuccess: (data: any) => {
        manualGenInFlight.current = false;
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
      onError: () => { manualGenInFlight.current = false; },
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
    updateSession({ sessionId, updates: { queueTargetSize: newSize } });
    const currentQueuedCount = typedMatches.filter(m => m.status === "QUEUED").length;
    if (currentQueuedCount > newSize) {
      trimQueue({ sessionId, targetSize: newSize });
    } else if (currentQueuedCount < newSize && autoGenerateActive && !autoGenLocallyStopped) {
      manualGenInFlight.current = true;
      smartGenerate({ sessionId, mode: activeMode, queueTargetSize: newSize, genderType: generateGenderType, isAutoGenerate: true }, {
        onSettled: () => { manualGenInFlight.current = false; },
      });
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
        <div
          className="relative rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 hover:scale-[1.01] transition-all duration-300 overflow-hidden shadow-sm"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }}
        >
          <div className="absolute inset-0 rounded-[2rem] pointer-events-none bg-[radial-gradient(ellipse_at_center_bottom,rgba(56,189,248,0.06)_0%,transparent_60%)]" />
          <div className="relative z-10 flex flex-col gap-6">

            <div className="flex justify-between items-start flex-wrap gap-4">
              {isOrganiser && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3" data-testid="mode-toggle-container">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">Mode</span>
                    <div className="flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 p-0.5 relative shadow-[0_0_12px_rgba(96,165,250,0.15)]">
                      <button
                        className={cn(
                          "relative z-10 flex-1 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-500 flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap",
                          activeMode === "SOCIAL"
                            ? "text-white"
                            : "text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70"
                        )}
                        onClick={() => {
                          setActiveMode("SOCIAL");
                          updateSession({ sessionId, updates: { matchMode: "SOCIAL" } });
                        }}
                        data-testid="button-mode-social"
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0 transition-all duration-500",
                          activeMode === "SOCIAL" ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" : "bg-gray-300 dark:bg-white/20"
                        )} />
                        Social
                      </button>
                      <button
                        className={cn(
                          "relative z-10 flex-1 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-500 flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap",
                          activeMode === "COMPETITIVE"
                            ? "text-white"
                            : "text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70"
                        )}
                        onClick={() => {
                          setActiveMode("COMPETITIVE");
                          updateSession({ sessionId, updates: { matchMode: "COMPETITIVE" } });
                        }}
                        data-testid="button-mode-competitive"
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0 transition-all duration-500",
                          activeMode === "COMPETITIVE" ? "bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" : "bg-gray-300 dark:bg-white/20"
                        )} />
                        Competitive
                      </button>
                      <div
                        className={cn(
                          "absolute top-0.5 bottom-0.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 shadow-[0_0_16px_rgba(96,165,250,0.3)]",
                          activeMode === "SOCIAL" ? "left-0.5 right-[50%]" : "left-[50%] right-0.5"
                        )}
                        style={{ transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                      />
                    </div>
                    <MatchAlgorithmInfoButton />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">Courts</span>
                    <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <button
                        onClick={() => {
                          const newVal = Math.max(1, courtsToUse - 1);
                          setCourtsToUse(newVal);
                          updateSession({ sessionId, updates: { courtsAvailable: newVal } });
                        }}
                        disabled={courtsToUse <= 1}
                        className="px-3 py-1.5 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid="button-decrease-courts"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] min-w-[2.5rem] text-center" data-testid="badge-courts-count">
                        {courtsToUse}
                      </span>
                      <button
                        onClick={() => {
                          const newVal = Math.min(10, courtsToUse + 1);
                          setCourtsToUse(newVal);
                          updateSession({ sessionId, updates: { courtsAvailable: newVal } });
                        }}
                        disabled={courtsToUse >= 10}
                        className="px-3 py-1.5 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5 active:scale-95 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        data-testid="button-increase-courts"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 text-xs font-medium transition-all duration-300" data-testid="badge-live-count">
                <span className="relative flex h-2 w-2">
                  {liveMatches.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", liveMatches.length > 0 ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-gray-300 dark:bg-white/20")} />
                </span>
                <span className="text-gray-600 dark:text-white/70">{liveMatches.length} Live</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 text-xs font-medium transition-all duration-300" data-testid="badge-queued-count">
                <span className="relative flex h-2 w-2">
                  {queuedMatches.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", queuedMatches.length > 0 ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" : "bg-gray-300 dark:bg-white/20")} />
                </span>
                <span className="text-gray-600 dark:text-white/70">{queuedMatches.length} Queued</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 text-xs font-medium transition-all duration-300" data-testid="badge-completed-count">
                <span className="relative flex h-2 w-2">
                  {completedCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", completedCount > 0 ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.7)]" : "bg-gray-300 dark:bg-white/20")} />
                </span>
                <span className="text-gray-600 dark:text-white/70">{completedCount} Done</span>
              </span>
              {!isOrganiser && <MatchAlgorithmInfoButton />}
              {isOrganiser && (
                <button
                  onClick={() => setCrowdControlOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] active:scale-95 transition-all duration-300"
                  data-testid="button-crowd-control"
                >
                  <Users className="w-3.5 h-3.5" />
                  Crowd
                </button>
              )}
            </div>

            {isOrganiser && (() => {
              const allPlayerCounts = confirmedSignups.map(s => {
                const pid = s.player?.id || s.playerId;
                return sessionMatchCounts[pid] || 0;
              });
              const maxGames = allPlayerCounts.length > 0 ? Math.max(...allPlayerCounts) : 0;
              const minGames = allPlayerCounts.length > 0 ? Math.min(...allPlayerCounts) : 0;
              const fairnessPercent = maxGames > 0 ? Math.round((minGames / maxGames) * 100) : 100;
              const fairnessColor = fairnessPercent >= 80 ? "text-emerald-500" : fairnessPercent >= 50 ? "text-amber-500" : "text-red-500";
              const fairnessStroke = fairnessPercent >= 80 ? "stroke-emerald-500" : fairnessPercent >= 50 ? "stroke-amber-500" : "stroke-red-500";
              const fairnessGlow = fairnessPercent >= 80 ? "drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : fairnessPercent >= 50 ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]";
              const playerList = confirmedSignups
                .map(s => ({ name: s.player?.user?.fullName || "Unknown", count: sessionMatchCounts[s.player?.id || s.playerId] || 0 }))
                .sort((a, b) => a.count - b.count);
              if (maxGames === 0) return null;
              return (
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.03] p-4" data-testid="fairness-panel">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 36 36" className={cn("w-16 h-16 -rotate-90", fairnessGlow)}>
                        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" className="stroke-gray-200 dark:stroke-white/10" />
                        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeDasharray={`${fairnessPercent * 0.975} 100`} strokeLinecap="round" className={fairnessStroke} />
                      </svg>
                      <div className={cn("absolute inset-0 flex items-center justify-center text-base font-bold", fairnessColor)} data-testid="text-fairness-percent">
                        {fairnessPercent}%
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={cn("text-sm font-bold", fairnessColor)}>Fairness</span>
                          <span className="text-xs text-gray-400 dark:text-white/40 ml-2">{minGames}–{maxGames} games</span>
                        </div>
                        <button
                          onClick={() => setFairnessListOpen(prev => !prev)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 transition-colors rounded-full border border-slate-200 dark:border-white/10 px-2.5 py-1"
                          data-testid="button-toggle-fairness-list"
                        >
                          {playerList.length} players
                          {fairnessListOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                      {!fairnessListOpen && (() => {
                        const needPriority = playerList.filter(p => p.count < maxGames && (maxGames - p.count) >= 2);
                        if (needPriority.length === 0) return null;
                        return (
                          <div className="mt-1 flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{needPriority.map(p => `${p.name} (${p.count})`).join(", ")}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {fairnessListOpen && (
                    <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-white/[0.05]" data-testid="fairness-player-list">
                      {playerList.map((p, i) => {
                        const barWidth = maxGames > 0 ? Math.round((p.count / maxGames) * 100) : 0;
                        const isLow = p.count < maxGames && (maxGames - p.count) >= 2;
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2">
                            <span className={cn("text-xs font-medium flex-1 min-w-0 truncate", isLow ? "text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-white/70")}>{p.name}</span>
                            <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0">
                              <div className={cn("h-full rounded-full transition-all", isLow ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${barWidth}%` }} />
                            </div>
                            <span className={cn("text-xs font-bold tabular-nums w-5 text-right", isLow ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-white/50")}>{p.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {isOrganiser && (
              <div className="flex items-center justify-center gap-6 flex-wrap pt-2">
                <Select value={generateGenderType} onValueChange={setGenerateGenderType}>
                  <SelectTrigger className="w-[120px] rounded-full border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 text-gray-700 dark:text-white/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-300" data-testid="select-generate-gender-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                    <SelectItem value="FEMALE">Female Only</SelectItem>
                    <SelectItem value="MALE">Male Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex flex-col items-center gap-1.5">
                  <div className="absolute inset-0 -m-6 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.08)_0%,transparent_70%)] pointer-events-none" />
                  <button
                    onClick={handleSmartGenerate}
                    disabled={isSmartGenerating}
                    className={cn(
                      "neon-power-btn group relative active:scale-95 transition-transform duration-300",
                      generateSuccess && "ring-2 ring-emerald-400/60"
                    )}
                    style={{ width: '80px', height: '80px' }}
                    data-testid="button-generate-matches"
                  >
                    <div className={cn(
                      "neon-power-outer",
                      generateSuccess && "!border-emerald-500/50",
                      isSmartGenerating && "!animate-spin"
                    )} style={isSmartGenerating ? { animationDuration: '3s' } : undefined} />
                    <div className="neon-power-ring" />
                    <div className={cn("neon-power-ring-pulse", isSmartGenerating ? "neon-heartbeat animate-pulse" : "", generateSuccess && "!bg-emerald-500/30")} />
                    <div className={cn("neon-power-glow", isSmartGenerating ? "neon-heartbeat animate-pulse" : "", generateSuccess && "!bg-emerald-500/20")} />
                    <div className="neon-power-inner">
                      {isSmartGenerating ? (
                        <div className="neon-power-icon neon-vibrate">
                          <Power className="h-7 w-7 animate-spin text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" strokeWidth={2.5} style={{ animationDuration: '2s' }} />
                        </div>
                      ) : generateSuccess ? (
                        <div className="neon-power-icon">
                          <CheckCircle className="h-7 w-7 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="neon-power-icon">
                          <Power className="h-7 w-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <div className={cn("neon-power-circuit-ring", isSmartGenerating && "animate-spin")} style={isSmartGenerating ? { animationDuration: '2s' } : undefined} />
                  </button>
                  <span className={cn(
                    "text-[10px] font-semibold tracking-[0.2em] uppercase transition-colors duration-500",
                    isSmartGenerating ? "text-cyan-400 neon-text-pulse" : generateSuccess ? "text-emerald-400" : "text-gray-400 dark:text-white/40"
                  )}>
                    {isSmartGenerating ? "Generating..." : generateSuccess ? "Done!" : "Generate"}
                  </span>
                </div>

                <button
                  onClick={() => setFullScheduleOpen(true)}
                  className="relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium active:scale-95 transition-all duration-300 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800/80 text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 hover:bg-slate-200 dark:hover:bg-slate-800"
                  data-testid="button-full-schedule"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Full Schedule</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {fullScheduleOpen && (
        <Dialog open={fullScheduleOpen} onOpenChange={(open) => { setFullScheduleOpen(open); if (!open) setFullScheduleData(null); }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                AI Full Session Schedule Generator
              </DialogTitle>
              <DialogDescription>
                Generate all matches for the entire session in one click. Preview, adjust, and confirm.
              </DialogDescription>
            </DialogHeader>

            {!fullScheduleData ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Rounds (optional)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="Auto-calculate"
                      value={fullScheduleRounds}
                      onChange={(e) => setFullScheduleRounds(e.target.value)}
                      data-testid="input-schedule-rounds"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to auto-calculate based on session duration</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender Type</Label>
                    <Select value={generateGenderType} onValueChange={setGenerateGenderType}>
                      <SelectTrigger data-testid="select-schedule-gender">
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
                <Button
                  className="w-full"
                  onClick={() => generateFullScheduleMutation.mutate({
                    numberOfRounds: fullScheduleRounds ? parseInt(fullScheduleRounds) : undefined,
                    genderType: generateGenderType,
                    mode: activeMode,
                  })}
                  disabled={generateFullScheduleMutation.isPending}
                  data-testid="button-generate-full-schedule"
                >
                  {generateFullScheduleMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Schedule...</>
                  ) : (
                    <><Shuffle className="w-4 h-4 mr-2" /> Generate Full Schedule</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold" data-testid="text-total-rounds">{fullScheduleData.totalRounds}</div>
                      <div className="text-xs text-muted-foreground">Rounds</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold" data-testid="text-total-matches">{fullScheduleData.totalMatches}</div>
                      <div className="text-xs text-muted-foreground">Matches</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className={cn("text-2xl font-bold", fullScheduleData.overallFairnessScore >= 70 ? "text-emerald-600" : fullScheduleData.overallFairnessScore >= 40 ? "text-amber-600" : "text-red-600")} data-testid="text-fairness-score">
                        {fullScheduleData.overallFairnessScore}%
                      </div>
                      <div className="text-xs text-muted-foreground">Fairness</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-bold" data-testid="text-partner-diversity">{fullScheduleData.partnerDiversity}%</div>
                      <div className="text-xs text-muted-foreground">Partner Diversity</div>
                    </CardContent>
                  </Card>
                </div>

                {fullScheduleData.courtUtilization && (
                  <div className="flex items-center gap-4 rounded-md border p-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Court Utilization:</span>
                      <span className="font-semibold" data-testid="text-schedule-court-util">{fullScheduleData.courtUtilization.utilizationPercent}%</span>
                    </div>
                    {fullScheduleData.idleEquity !== undefined && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Idle Equity:</span>
                        <span className={cn("font-semibold", fullScheduleData.idleEquity >= 80 ? "text-emerald-600" : fullScheduleData.idleEquity >= 50 ? "text-amber-600" : "text-red-600")} data-testid="text-idle-equity">{fullScheduleData.idleEquity}%</span>
                      </div>
                    )}
                  </div>
                )}

                {fullScheduleData.playerIdleTime && Object.keys(fullScheduleData.playerIdleTime).length > 0 && (
                  <details className="rounded-md border">
                    <summary className="px-3 py-2 text-sm font-medium cursor-pointer hover:bg-muted/30 transition-colors flex items-center gap-2" data-testid="toggle-idle-time">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Player Idle Time
                    </summary>
                    <div className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(fullScheduleData.playerIdleTime as Record<string, { idleRounds: number; estimatedIdleMinutes: number; idleRoundNumbers: number[] }>)
                        .sort(([, a], [, b]) => b.idleRounds - a.idleRounds)
                        .map(([pid, info]) => {
                          const player = fullScheduleData.playerLookup?.[Number(pid)];
                          if (!player) return null;
                          return (
                            <div key={pid} className="flex items-center justify-between gap-2 text-xs" data-testid={`idle-player-${pid}`}>
                              <span className="truncate">{player.fullName}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {info.idleRounds > 0 ? (
                                  <>
                                    <Badge variant="outline" className={cn("text-[10px]", info.idleRounds > 2 ? "text-red-600 border-red-300" : info.idleRounds > 0 ? "text-amber-600 border-amber-300" : "text-emerald-600 border-emerald-300")}>
                                      {info.idleRounds} idle round{info.idleRounds !== 1 ? "s" : ""}
                                    </Badge>
                                    <span className="text-muted-foreground">~{info.estimatedIdleMinutes}m</span>
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Active all rounds</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </details>
                )}

                {fullScheduleData.warnings?.length > 0 && (
                  <div className="rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Warnings ({fullScheduleData.warnings.length})</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {fullScheduleData.warnings.slice(0, 5).map((w: any, i: number) => (
                        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{w.playerName}: {w.message}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {fullScheduleData.rounds.map((round: any, roundIdx: number) => (
                    <div key={roundIdx} className="border rounded-md">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b">
                        <span className="text-sm font-semibold" data-testid={`text-round-${round.round}`}>Round {round.round}</span>
                        <Badge variant="outline">{round.matches.length} match{round.matches.length !== 1 ? "es" : ""}</Badge>
                      </div>
                      <div className="divide-y">
                        {round.matches.map((match: any, matchIdx: number) => {
                          const p = fullScheduleData.playerLookup;
                          const teamA = [match.teamAPlayer1Id, match.teamAPlayer2Id].filter(Boolean);
                          const teamB = [match.teamBPlayer1Id, match.teamBPlayer2Id].filter(Boolean);
                          return (
                            <div key={matchIdx} className="flex items-center justify-between gap-2 px-3 py-2 text-sm" data-testid={`match-${roundIdx}-${matchIdx}`}>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {teamA.map((id: number) => (
                                    <button
                                      key={id}
                                      onClick={() => { setSwapTarget({ roundIdx, matchIdx, position: id === match.teamAPlayer1Id ? "teamAPlayer1Id" : "teamAPlayer2Id", currentPlayerId: id }); setSwapDialogOpen(true); }}
                                      className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                                      data-testid={`player-swap-${roundIdx}-${matchIdx}-${id}`}
                                    >
                                      {p[id]?.fullName || `#${id}`}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-muted-foreground font-medium mx-1">vs</span>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {teamB.map((id: number) => (
                                    <button
                                      key={id}
                                      onClick={() => { setSwapTarget({ roundIdx, matchIdx, position: id === match.teamBPlayer1Id ? "teamBPlayer1Id" : "teamBPlayer2Id", currentPlayerId: id }); setSwapDialogOpen(true); }}
                                      className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors cursor-pointer"
                                      data-testid={`player-swap-${roundIdx}-${matchIdx}-${id}`}
                                    >
                                      {p[id]?.fullName || `#${id}`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0",
                                  match.fairnessScore >= 70 ? "text-emerald-600 border-emerald-300" : match.fairnessScore >= 40 ? "text-amber-600 border-amber-300" : "text-red-600 border-red-300"
                                )}
                                data-testid={`fairness-${roundIdx}-${matchIdx}`}
                              >
                                {match.fairnessScore}%
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => generateFullScheduleMutation.mutate({
                      numberOfRounds: fullScheduleRounds ? parseInt(fullScheduleRounds) : undefined,
                      genderType: generateGenderType,
                      mode: activeMode,
                    })}
                    disabled={generateFullScheduleMutation.isPending}
                    data-testid="button-regenerate-schedule"
                  >
                    {generateFullScheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Regenerate
                  </Button>
                  <Button
                    onClick={() => confirmScheduleMutation.mutate(fullScheduleData.rounds)}
                    disabled={confirmScheduleMutation.isPending}
                    data-testid="button-confirm-schedule"
                  >
                    {confirmScheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Confirm Schedule
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {swapDialogOpen && swapTarget && fullScheduleData && (
        <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Swap Player</DialogTitle>
              <DialogDescription>
                Replace {fullScheduleData.playerLookup?.[swapTarget.currentPlayerId]?.fullName || `Player #${swapTarget.currentPlayerId}`} with another player
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {Object.values((fullScheduleData.playerLookup || {}) as Record<string, any>)
                .filter((p: any) => p.id !== swapTarget.currentPlayerId)
                .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName))
                .map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleSwapInSchedule(swapTarget.roundIdx, swapTarget.matchIdx, swapTarget.position, p.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
                    data-testid={`swap-player-${p.id}`}
                  >
                    <span>{p.fullName}</span>
                    <Badge variant="outline" className="text-xs">{p.grade || "?"}</Badge>
                  </button>
                ))}
            </div>
          </DialogContent>
        </Dialog>
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
            <ProLiveMatches
              liveMatches={liveMatches}
              isOrganiser={isOrganiser}
              isSignedUp={isSignedUp}
              currentPlayerProfileId={currentPlayerProfileId}
              availablePlayers={availablePlayers}
              courtNames={courtNamesState}
              defaultPointsToPlayTo={defaultPointsToPlayTo}
              sessionMatchCounts={sessionMatchCounts}
              achievements={playerAchievements}
              onCompleteMatch={(matchId, scoreA, scoreB) => completeMatch({ matchId, scoreA, scoreB })}
              onEndSet={(matchId, setNumber, scoreA, scoreB) => endSet({ matchId, setNumber, scoreA, scoreB })}
              onCancelMatch={(matchId) => cancelLiveMatch({ matchId })}
              onSwapPlayer={(matchId, position, newPlayerId) => swapPlayer({ matchId, position, newPlayerId })}
              onCourtNameChange={handleCourtNameChange}
              onUpdatePointsTarget={(matchId, pts) => updateMatchTarget({ matchId, pointsToPlayTo: pts })}
              onUpdateSets={(matchId, sets) => updateMatchSets({ matchId, numberOfSets: sets })}
              busyPlayerIds={busyPlayerIds}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                sessionId={sessionId}
                busyPlayerIds={busyPlayerIds}
                sessionMatchCounts={sessionMatchCounts}
                achievements={playerAchievements}
              />
              <CompletedMatches matches={typedMatches} isOrganiser={isOrganiser} isSignedUp={isSignedUp} currentPlayerProfileId={currentPlayerProfileId} />
            </div>
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <SessionLiveLeaderboard sessionId={sessionId} />
          </div>
        </div>

      {isOrganiser && (
        <CrowdControlPanel
          open={crowdControlOpen}
          onOpenChange={setCrowdControlOpen}
          sessionMatchCounts={sessionMatchCounts}
          players={(() => {
            const signupPlayers = confirmedSignups.map(s => ({
              id: s.player?.id || s.playerId,
              fullName: s.player?.user?.fullName || "",
              category: s.player?.category || null,
              isPaused: s.isPaused || false,
            }));
            const knownIds = new Set(signupPlayers.map(p => p.id));
            const matchOnlyPlayers: typeof signupPlayers = [];
            for (const m of typedMatches) {
              for (const p of [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2]) {
                if (p && p.id && !knownIds.has(p.id)) {
                  knownIds.add(p.id);
                  matchOnlyPlayers.push({
                    id: p.id,
                    fullName: p.user?.fullName || `Player ${p.id}`,
                    category: p.category || null,
                    isPaused: false,
                  });
                }
              }
            }
            return [...signupPlayers, ...matchOnlyPlayers];
          })()}
          liveCount={liveMatches.length}
          queuedCount={queuedMatches.length}
          completedCount={completedCount}
          matches={typedMatches as any}
          sessionId={sessionId}
        />
      )}

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

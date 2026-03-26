import { useSessions, useCreateSession, useUpdateSession } from "@/hooks/use-sessions";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useMySessionClubs, useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSessionSchema, insertRecurringEventSchema } from "@shared/schema";
import { Plus, Users, MapPin, Calendar, PoundSterling, CircleDot, Building2, Filter, Trash2, Loader2, Lock, Search, Video, Home, CheckCircle, ShieldAlert, Shield, Activity, Pencil, Wallet, Repeat, CalendarPlus, UserPlus, X, CheckSquare, Clock, Eye, Send, UserCheck, UserX, Baby, Info, Shuffle, BarChart3, LayoutGrid, CalendarDays, AlignJustify, Layers, Copy, MoreVertical, Play, ArrowRight, AlertTriangle, FileText, Bell, ShieldCheck, ShieldX, CircleDollarSign } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionDetailsModal, SessionFinanceModal } from "@/components/SessionDetailsModal";
import { MatchAlgorithmInfoButton } from "@/components/MatchAlgorithmInfo";
import { CrowdControlPanel } from "@/components/CrowdControlPanel";
import { StartSessionButton } from "@/components/StartSessionButton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useVenues } from "@/hooks/use-venues";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarView, TimelineView, GroupedView } from "@/components/SessionViews";
import { addWeeks, addMonths } from "date-fns";

const CATEGORIES = [
  { value: "A1", label: "A1 (Elite)" },
  { value: "A2", label: "A2 (Advanced+)" },
  { value: "A3", label: "A3 (Advanced)" },
  { value: "B1", label: "B1 (Upper Intermediate)" },
  { value: "B2", label: "B2 (Intermediate+)" },
  { value: "B3", label: "B3 (Intermediate)" },
  { value: "C1", label: "C1 (Lower Intermediate)" },
  { value: "C2", label: "C2 (Beginner+)" },
  { value: "C3", label: "C3 (Beginner)" },
] as const;

const JUNIOR_AGE_GROUPS = [
  { value: "7-10", label: "7 to 10 years" },
  { value: "10-12", label: "10 to 12 years" },
  { value: "13-15", label: "13 to 15 years" },
  { value: "16-18", label: "16 to 18 years" },
] as const;

const createSessionSchema = insertSessionSchema.extend({
  date: z.coerce.date(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:MM format"),
});

function computePublishAt(sessionDate: Date | string | null | undefined, weeksBefore: number): Date | null {
  if (!sessionDate) return null;
  const d = new Date(sessionDate);
  d.setDate(d.getDate() - weeksBefore * 7);
  return d;
}

function StandaloneCrowdControl({ sessionId, open, onOpenChange }: { sessionId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: matches = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", sessionId, "matches"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/matches`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!sessionId,
    refetchInterval: open ? 5000 : false,
  });

  const { data: signups = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", sessionId, "signups"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/signups`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!sessionId,
  });

  const { data: sessionData } = useQuery<any>({
    queryKey: ["/api/sessions", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open && !!sessionId,
  });

  const confirmedSignups = signups.filter((s: any) => s.signupStatus === "CONFIRMED" || !s.signupStatus);

  const sessionMatchCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const m of matches) {
      for (const pid of [m.teamAPlayer1Id, m.teamAPlayer2Id, m.teamBPlayer1Id, m.teamBPlayer2Id]) {
        if (pid) counts[pid] = (counts[pid] || 0) + 1;
      }
    }
    return counts;
  }, [matches]);

  const players = useMemo(() => {
    const signupPlayers = confirmedSignups.map((s: any) => ({
      id: s.player?.id || s.playerId,
      fullName: s.player?.user?.fullName || "",
      category: s.player?.category || null,
      isPaused: s.isPaused || false,
    }));
    const knownIds = new Set(signupPlayers.map((p: any) => p.id));
    const matchOnlyPlayers: typeof signupPlayers = [];
    for (const m of matches) {
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
  }, [confirmedSignups, matches]);

  const liveCount = matches.filter((m: any) => m.status === "LIVE").length;
  const queuedCount = matches.filter((m: any) => m.status === "QUEUED").length;
  const completedCount = matches.filter((m: any) => m.status === "COMPLETED").length;

  return (
    <CrowdControlPanel
      open={open}
      onOpenChange={onOpenChange}
      sessionMatchCounts={sessionMatchCounts}
      players={players}
      liveCount={liveCount}
      queuedCount={queuedCount}
      completedCount={completedCount}
      matches={matches}
      sessionId={sessionId}
    />
  );
}

function ScheduledPublishSection({ sessionDate, scheduleEnabled, setScheduleEnabled, weeksBefore, setWeeksBefore }: {
  sessionDate: Date | string | null | undefined;
  scheduleEnabled: boolean;
  setScheduleEnabled: (v: boolean) => void;
  weeksBefore: number;
  setWeeksBefore: (v: number) => void;
}) {
  const publishAt = scheduleEnabled && sessionDate ? computePublishAt(sessionDate, weeksBefore) : null;
  const publishInPast = publishAt && publishAt <= new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Schedule Publishing
        </Label>
        <Switch
          checked={scheduleEnabled}
          onCheckedChange={setScheduleEnabled}
          data-testid="switch-schedule-publish"
        />
      </div>
      {scheduleEnabled && (
        <div className="space-y-2 pl-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Open signups</span>
            <Input
              type="number"
              min={1}
              max={52}
              value={weeksBefore}
              onChange={(e) => setWeeksBefore(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
              className="w-20"
              data-testid="input-publish-weeks"
            />
            <span className="text-sm text-muted-foreground">week{weeksBefore !== 1 ? "s" : ""} before</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4].map(w => (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={weeksBefore === w ? "default" : "outline"}
                onClick={() => setWeeksBefore(w)}
                data-testid={`button-publish-preset-${w}`}
              >
                {w === 4 ? "1 month" : `${w} week${w > 1 ? "s" : ""}`}
              </Button>
            ))}
          </div>
          {publishAt && (
            <p className="text-xs text-muted-foreground">
              {publishInPast
                ? "Signups will be open immediately (publish date is in the past)"
                : `Signups open: ${format(publishAt, "EEE, d MMM yyyy")}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type ClubPlayer = {
  id: number;
  userId: number;
  clubId: number;
  membershipStatus: string;
  category?: string | null;
  grade?: string | null;
  gender?: string | null;
  user: { id: number; fullName: string; email: string };
};

function InvitePlayersModal({
  clubId,
  selectedPlayerIds,
  onSelectionChange,
}: {
  clubId: number | undefined;
  selectedPlayerIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [localSelected, setLocalSelected] = useState<Set<number>>(new Set(selectedPlayerIds));

  const { data: clubPlayers, isLoading } = useQuery<ClubPlayer[]>({
    queryKey: ["/api/admin/clubs", clubId, "players"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clubs/${clubId}/players`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && open,
  });

  useEffect(() => {
    if (open) {
      setLocalSelected(new Set(selectedPlayerIds));
    }
  }, [open, selectedPlayerIds]);

  const approvedPlayers = useMemo(() => {
    return (clubPlayers || []).filter(p => p.membershipStatus === "APPROVED" && p.user?.role === "PLAYER");
  }, [clubPlayers]);

  const filteredPlayers = useMemo(() => {
    let filtered = approvedPlayers;
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => {
        const playerGrade = p.grade || p.category || "C3";
        return playerGrade === categoryFilter;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.user.fullName.toLowerCase().includes(q) ||
        p.user.email.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
  }, [approvedPlayers, categoryFilter, searchQuery]);

  const togglePlayer = (playerId: number) => {
    const next = new Set(localSelected);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      next.add(playerId);
    }
    setLocalSelected(next);
  };

  const selectAllVisible = () => {
    const next = new Set(localSelected);
    filteredPlayers.forEach(p => next.add(p.id));
    setLocalSelected(next);
  };

  const deselectAllVisible = () => {
    const next = new Set(localSelected);
    filteredPlayers.forEach(p => next.delete(p.id));
    setLocalSelected(next);
  };

  const selectByCategory = (cat: string) => {
    const next = new Set(localSelected);
    approvedPlayers.forEach(p => {
      const playerGrade = p.grade || p.category || "C3";
      if (playerGrade === cat) next.add(p.id);
    });
    setLocalSelected(next);
  };

  const handleConfirm = () => {
    onSelectionChange(localSelected);
    setOpen(false);
  };

  const allVisibleSelected = filteredPlayers.length > 0 && filteredPlayers.every(p => localSelected.has(p.id));

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invitees ({selectedPlayerIds.size} selected)
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={!clubId}
            data-testid="button-manage-invitees"
          >
            <Users className="h-4 w-4 mr-1" />
            {selectedPlayerIds.size > 0 ? "Edit Invitees" : "Select Players"}
          </Button>
        </div>
        {selectedPlayerIds.size > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedPlayerIds.size} player{selectedPlayerIds.size !== 1 ? "s" : ""} will be invited to this session
          </p>
        )}
        {selectedPlayerIds.size === 0 && (
          <p className="text-xs text-muted-foreground">
            All approved club members will be invited by default
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Invitees</DialogTitle>
            <DialogDescription>Choose which players to invite to this session</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-invitee-search"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-invitee-category-filter">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
                data-testid="button-toggle-all-invitees"
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {allVisibleSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(c => {
                const count = approvedPlayers.filter(p => (p.grade || p.category || "C3") === c.value).length;
                if (count === 0) return null;
                return (
                  <Button
                    key={c.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => selectByCategory(c.value)}
                    className="text-xs"
                    data-testid={`button-invite-category-${c.value}`}
                  >
                    +{c.value} ({count})
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px] max-h-[40vh]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4 text-muted-foreground text-sm">
                {searchQuery || categoryFilter !== "all" ? "No players match the filter" : "No approved players in this club"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlayers.map(player => {
                  const grade = player.grade || player.category || "C3";
                  const isSelected = localSelected.has(player.id);
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover-elevate ${isSelected ? "bg-primary/5" : ""}`}
                      onClick={() => togglePlayer(player.id)}
                      data-testid={`invitee-player-${player.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePlayer(player.id)}
                        data-testid={`checkbox-invitee-${player.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{player.user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{player.user.email}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{grade}</Badge>
                      {player.gender && (
                        <Badge variant="outline" className="text-xs">{player.gender === "MALE" ? "M" : player.gender === "FEMALE" ? "F" : player.gender}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{localSelected.size} selected</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-invitees">
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirm} data-testid="button-confirm-invitees">
                Confirm Selection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecommendedSessions() {
  const { data: recommended, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions/recommended"],
  });

  if (isLoading || !recommended || recommended.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="section-recommended-sessions">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Shuffle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Recommended for You</h3>
          <span className="text-xs text-muted-foreground">Sessions matching your skill level</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {recommended.map((session: any) => (
          <Link key={session.id} href={`/sessions/${session.id}`}>
            <Card className="min-w-[240px] max-w-[280px] hover-elevate cursor-pointer" data-testid={`card-recommended-session-${session.id}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm truncate">{session.title}</h4>
                  <Badge variant={session.inGradeRange ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {session.matchScore}% match
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{format(new Date(session.date), "EEE, d MMM")}</span>
                  <span>{session.startTime}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.clubName}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{session.matchMode}</Badge>
                  <Badge variant="outline" className="text-[10px]">{session.courtsAvailable} courts</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Sessions() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();
  const { data: clubs } = useClubs();
  const { data: sessionClubs } = useMySessionClubs(!!user);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sessionsScope, setSessionsScope] = useState<"regular" | "juniors">("regular");
  const [clubScope, setClubScope] = useState<"my" | "all">("my");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [sessionTypeFilter, setSessionTypeFilter] = useState<"all" | "grouped" | "single">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "calendar" | "timeline" | "grouped">(() => {
    const saved = localStorage.getItem("sessionsViewMode");
    return (saved as any) || "timeline";
  });
  const [timeRange, setTimeRange] = useState<"all" | "week" | "2weeks" | "month">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<any>(null);
  const [financeSession, setFinanceSession] = useState<any>(null);
  const [deleteSession, setDeleteSession] = useState<{ id: number; recurringEventId: number | null; date: string | null } | null>(null);
  const [crowdSessionId, setCrowdSessionId] = useState<number | null>(null);
  const [joinSession, setJoinSession] = useState<any>(null);
  const [copySession, setCopySession] = useState<any>(null);
  const [editSessionFromView, setEditSessionFromView] = useState<any>(null);
  const [togglingSessionId, setTogglingSessionId] = useState<number | null>(null);
  const { mutate: toggleSessionTypeMut } = useUpdateSession();
  const handleToggleSessionType = async (session: any) => {
    setTogglingSessionId(session.id);
    const newType = session.sessionType === "JUNIORS_ONLY" ? "OPEN" : "JUNIORS_ONLY";
    try {
      if (session.recurringEventId) {
        await apiRequest("PATCH", `/api/recurring-events/${session.recurringEventId}/apply-to-series`, {
          updates: { sessionType: newType },
        });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        toast({ title: "Series Updated", description: `All sessions in this series moved to ${newType === "JUNIORS_ONLY" ? "Juniors" : "Sessions"}.` });
      } else {
        toggleSessionTypeMut({ sessionId: session.id, updates: { sessionType: newType } }, {
          onSettled: () => setTogglingSessionId(null),
        });
        return;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
    setTogglingSessionId(null);
  };
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const isSuperUser = user?.role === "OWNER";
  const isPlatformAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const isOrganiserOnly = useIsOrganiserOnly(!!user);
  const canManageSessions = isPlatformAdmin || (sessionClubs && sessionClubs.length > 0) || false;
  const managedClubIds = useMemo(() => new Set(sessionClubs?.map(c => c.id) || []), [sessionClubs]);
  const editableClubIds = useMemo(() => new Set(isPlatformAdmin ? (clubs?.map(c => c.id) || []) : (adminClubs?.map(c => c.id) || [])), [isPlatformAdmin, clubs, adminClubs]);

  const { data: memberships } = useQuery<{ clubId: number; membershipStatus: string }[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const { data: mySignups } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
    enabled: !!user,
  });

  const { data: juniors } = useQuery<any[]>({
    queryKey: ["/api/juniors"],
    enabled: !!user,
  });

  const mySignupsBySession = useMemo(() => {
    const map = new Map<number, any>();
    if (mySignups) {
      mySignups.forEach(s => map.set(s.sessionId, s));
    }
    return map;
  }, [mySignups]);

  const myClubIds = useMemo(() => {
    if (!memberships) return new Set<number>();
    return new Set(memberships.filter(m => m.membershipStatus === "APPROVED").map(m => m.clubId));
  }, [memberships]);

  const displayClubs = useMemo(() => {
    if (isPlatformAdmin || clubScope === "all") return clubs || [];
    return (clubs || []).filter(c => myClubIds.has(c.id));
  }, [clubs, clubScope, myClubIds, isPlatformAdmin]);

  const getSessionAccess = (clubId: number): "allowed" | "denied" => {
    if (!user) return "denied";
    if (isPlatformAdmin) return "allowed";
    const m = memberships?.find(m => m.clubId === clubId);
    return m?.membershipStatus === "APPROVED" ? "allowed" : "denied";
  };

  const ALL_GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
  const checkGradeEligibility = (_session: any): boolean => {
    return true;
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      await apiRequest("DELETE", "/api/sessions", { sessionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Sessions Deleted", description: `${selectedIds.size} sessions deleted.` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async ({ recurringEventId, fromDate }: { recurringEventId: number; fromDate?: string }) => {
      const url = fromDate
        ? `/api/recurring-events/${recurringEventId}?fromDate=${encodeURIComponent(fromDate)}`
        : `/api/recurring-events/${recurringEventId}`;
      const res = await apiRequest("DELETE", url);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Recurring Sessions Deleted", description: data.message });
      setDeleteSession(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSingleSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session Deleted", description: "The session has been deleted." });
      setDeleteSession(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { publishAt: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Published", description: "Session is now open for signups." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const remindInviteesMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/remind-invitees`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Reminder Sent", description: data.message || "Reminders sent to members." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send reminders", variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("POST", `/api/sessions/${sessionId}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      toast({ title: "Withdrawn", description: "You've been removed from this session." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const baseFilteredSessions = useMemo(() => {
    let result = sessions;
    if (!result) return [];
    result = result.filter(s => (s as any).sessionType !== "JUNIORS_ONLY");
    if (!isPlatformAdmin && clubScope === "my") {
      result = result.filter(s => myClubIds.has(s.clubId));
    }
    if (selectedClubId !== "all") {
      result = result.filter(s => s.clubId === Number(selectedClubId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q));
    }
    result = result.filter(s => {
      const isScheduled = (s as any).publishAt && new Date((s as any).publishAt) > new Date();
      if (isScheduled) return false;
      return true;
    });
    if (sessionTypeFilter === "grouped") {
      result = result.filter(s => !!(s as any).recurringEventId);
    } else if (sessionTypeFilter === "single") {
      result = result.filter(s => !(s as any).recurringEventId);
    }
    return result;
  }, [sessions, selectedClubId, searchQuery, clubScope, myClubIds, isPlatformAdmin, sessionTypeFilter]);

  const scheduledSessions = useMemo(() => {
    let result = sessions;
    if (!result) return [];
    result = result.filter(s => (s as any).sessionType !== "JUNIORS_ONLY");
    result = result.filter(s => {
      const isScheduled = (s as any).publishAt && new Date((s as any).publishAt) > new Date();
      return isScheduled && (isPlatformAdmin || managedClubIds.has(s.clubId));
    });
    if (selectedClubId !== "all") {
      result = result.filter(s => s.clubId === Number(selectedClubId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, selectedClubId, searchQuery, managedClubIds, isPlatformAdmin]);

  const juniorFilteredSessions = useMemo(() => {
    let result = sessions;
    if (!result) return [];
    result = result.filter(s => (s as any).sessionType === "JUNIORS_ONLY");
    result = result.filter(s => {
      const isScheduled = (s as any).publishAt && new Date((s as any).publishAt) > new Date();
      if (isScheduled) return false;
      return true;
    });
    if (!isPlatformAdmin && clubScope === "my") {
      result = result.filter(s => myClubIds.has(s.clubId));
    }
    if (selectedClubId !== "all") {
      result = result.filter(s => s.clubId === Number(selectedClubId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(q));
    }
    return result;
  }, [sessions, selectedClubId, searchQuery, clubScope, myClubIds, isPlatformAdmin]);

  const juniorUpcoming = useMemo(() => {
    const n = new Date(); n.setHours(0, 0, 0, 0);
    return juniorFilteredSessions.filter(s => {
      const d = new Date(s.date); d.setHours(0, 0, 0, 0);
      return d >= n && s.status !== "COMPLETED" && s.status !== "CANCELLED";
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [juniorFilteredSessions]);

  const juniorPast = useMemo(() => {
    const n = new Date(); n.setHours(0, 0, 0, 0);
    return juniorFilteredSessions.filter(s => {
      const d = new Date(s.date); d.setHours(0, 0, 0, 0);
      return d < n || s.status === "COMPLETED";
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [juniorFilteredSessions]);

  const juniorLive = useMemo(() =>
    juniorFilteredSessions.filter(s => s.status === "ACTIVE" || (s as any).liveMatchCount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [juniorFilteredSessions]
  );

  const juniorAllVisible = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const combined = [...juniorLive, ...juniorUpcoming].filter(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d >= todayStart;
    });
    const seen = new Set<number>();
    return combined.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
  }, [juniorLive, juniorUpcoming]);

  const [juniorStatusFilter, setJuniorStatusFilter] = useState<string>("all");
  const juniorDisplaySessions = useMemo(() => {
    if (juniorStatusFilter === "upcoming") return juniorUpcoming;
    if (juniorStatusFilter === "live") return juniorLive;
    if (juniorStatusFilter === "past") return juniorPast;
    return juniorAllVisible;
  }, [juniorStatusFilter, juniorUpcoming, juniorPast, juniorLive, juniorAllVisible]);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [sessions]);

  const liveSessions = useMemo(() =>
    baseFilteredSessions.filter(s => s.status === "ACTIVE" || (s as any).liveMatchCount > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [baseFilteredSessions]
  );

  const upcomingSessions = useMemo(() =>
    baseFilteredSessions.filter(s => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= now && s.status !== "ACTIVE" && s.status !== "COMPLETED" && s.status !== "CANCELLED";
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [baseFilteredSessions, now]
  );

  const pastSessions = useMemo(() =>
    baseFilteredSessions.filter(s => {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate < now || s.status === "COMPLETED";
    }).filter(s => !liveSessions.some(ls => ls.id === s.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [baseFilteredSessions, now, liveSessions]
  );

  const filteredSessions = useMemo(() => {
    if (statusFilter === "scheduled") return [];

    let result: typeof upcomingSessions;
    if (statusFilter === "upcoming") result = upcomingSessions;
    else if (statusFilter === "live") result = liveSessions;
    else if (statusFilter === "past") result = pastSessions;
    else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const combined = [...liveSessions, ...upcomingSessions].filter(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d >= todayStart;
      });
      const seen = new Set<number>();
      result = combined.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    }

    if (timeRange !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (statusFilter === "past") {
        let start: Date;
        if (timeRange === "week") start = addWeeks(today, -1);
        else if (timeRange === "2weeks") start = addWeeks(today, -2);
        else start = addMonths(today, -1);

        result = result.filter(s => {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d >= start && d <= today;
        });
      } else if (statusFilter === "upcoming") {
        let end: Date;
        if (timeRange === "week") end = addWeeks(today, 1);
        else if (timeRange === "2weeks") end = addWeeks(today, 2);
        else end = addMonths(today, 1);

        result = result.filter(s => {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d >= today && d <= end;
        });
      } else {
        let start: Date;
        let end: Date;
        if (timeRange === "week") { start = addWeeks(today, -1); end = addWeeks(today, 1); }
        else if (timeRange === "2weeks") { start = addWeeks(today, -2); end = addWeeks(today, 2); }
        else { start = addMonths(today, -1); end = addMonths(today, 1); }

        result = result.filter(s => {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d >= start && d <= end;
        });
      }
    }

    return result;
  }, [statusFilter, upcomingSessions, liveSessions, pastSessions, timeRange]);

  useEffect(() => {
    localStorage.setItem("sessionsViewMode", viewMode);
  }, [viewMode]);

  const handleSessionClickFromView = (session: any) => {
    setLocation(`/sessions/${session.id}`);
  };

  const viewAdminActions = useMemo(() => {
    if (!canManageSessions) return undefined;
    return {
      editableClubIds,
      isOrganiserOnly,
      onCrowdControl: (id: number) => { setCrowdSessionId(id); },
      onFinances: (s: any) => setFinanceSession(s),
      onEdit: (s: any) => setEditSessionFromView(s),
      onDuplicate: (s: any) => setCopySession(s),
      onToggleJunior: (s: any) => handleToggleSessionType(s),
      onDelete: (s: any) => setDeleteSession({ id: s.id, recurringEventId: s.recurringEventId || null, date: s.date ? new Date(s.date).toISOString() : null }),
      onDetails: (s: any) => setDetailsSession(s),
      onRemindMembers: (id: number) => remindInviteesMutation.mutate(id),
    };
  }, [canManageSessions, editableClubIds, isOrganiserOnly]);

  // Group sessions by club for super user view
  const sessionsByClub = sessions?.reduce((acc, session) => {
    const clubId = session.clubId;
    if (!acc[clubId]) acc[clubId] = [];
    acc[clubId].push(session);
    return acc;
  }, {} as Record<number, typeof sessions>);

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredSessions) return;
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <PageHeader 
        title="Sessions" 
        description="Book your spot for upcoming games."
        action={
          <div className="flex items-center gap-2">
            <MatchAlgorithmInfoButton />
            {canManageSessions && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/admin/calendar")}
                  data-testid="button-import-from-calendar"
                >
                  <Calendar className="h-4 w-4 mr-2" /> Import from Calendar
                </Button>
                <EventTypeChooser sessionClubs={sessionClubs || []} />
              </>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit" data-testid="tabs-sessions-scope">
        <Button
          variant={sessionsScope === "regular" ? "default" : "ghost"}
          size="sm"
          className={`h-8 px-3 gap-1.5 text-xs ${sessionsScope === "regular" ? "" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setSessionsScope("regular")}
          data-testid="tab-sessions-regular"
        >
          <Calendar className="h-3.5 w-3.5" />
          Sessions
        </Button>
        <Button
          variant={sessionsScope === "juniors" ? "default" : "ghost"}
          size="sm"
          className={`h-8 px-3 gap-1.5 text-xs ${sessionsScope === "juniors" ? "" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setSessionsScope("juniors")}
          data-testid="tab-sessions-juniors"
        >
          <Baby className="h-3.5 w-3.5" />
          Juniors
          {juniorFilteredSessions.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">{juniorFilteredSessions.length}</Badge>
          )}
        </Button>
      </div>

      {sessionsScope === "regular" && (<>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {!isPlatformAdmin && (
          <div className="flex items-center gap-1">
            <Button
              variant={clubScope === "my" ? "default" : "outline"}
              size="sm"
              onClick={() => { setClubScope("my"); setSelectedClubId("all"); }}
              data-testid="button-sessions-scope-my"
            >
              My Clubs
            </Button>
            <Button
              variant={clubScope === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => { setClubScope("all"); setSelectedClubId("all"); }}
              data-testid="button-sessions-scope-all"
            >
              All Clubs
            </Button>
          </div>
        )}
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-sessions"
          />
        </div>
        {displayClubs.length > 1 && (
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-[160px] sm:w-[200px]" data-testid="select-club-filter">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {displayClubs.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sessionTypeFilter} onValueChange={(v) => setSessionTypeFilter(v as "all" | "grouped" | "single")}>
          <SelectTrigger className="w-[150px] sm:w-[180px]" data-testid="select-session-type-filter">
            <SelectValue placeholder="All Sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="grouped">Grouped Only</SelectItem>
            <SelectItem value="single">Single Only</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="button-filter-all"
          >
            All ({liveSessions.length + upcomingSessions.length})
          </Button>
          {liveSessions.length > 0 && (
            <Button
              variant={statusFilter === "live" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("live")}
              data-testid="button-filter-live"
            >
              <Activity className="w-3 h-3 mr-1" /> Live ({liveSessions.length})
            </Button>
          )}
          <Button
            variant={statusFilter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("upcoming")}
            data-testid="button-filter-upcoming"
          >
            <Calendar className="w-3 h-3 mr-1" /> Upcoming ({upcomingSessions.length})
          </Button>
          <Button
            variant={statusFilter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("past")}
            data-testid="button-filter-past"
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Past ({pastSessions.length})
          </Button>
          {canManageSessions && (
            <Button
              variant={statusFilter === "scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("scheduled")}
              className={statusFilter === "scheduled" ? "" : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"}
              data-testid="button-filter-scheduled"
            >
              <Clock className="w-3 h-3 mr-1" /> Scheduled ({scheduledSessions.length})
            </Button>
          )}
        </div>
      </div>

      {statusFilter !== "scheduled" && (
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {([
            { key: "timeline" as const, icon: AlignJustify, label: "Timeline" },
            { key: "cards" as const, icon: LayoutGrid, label: "Cards" },
            { key: "calendar" as const, icon: CalendarDays, label: "Calendar" },
            { key: "grouped" as const, icon: Layers, label: "Grouped" },
          ]).map(v => (
            <Button
              key={v.key}
              variant={viewMode === v.key ? "default" : "ghost"}
              size="sm"
              className={`h-8 px-2.5 gap-1.5 text-xs ${viewMode === v.key ? "" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode(v.key)}
              data-testid={`button-view-${v.key}`}
            >
              <v.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {([
            { key: "all" as const, label: "All" },
            { key: "week" as const, label: statusFilter === "past" ? "Last Week" : statusFilter === "upcoming" ? "This Week" : "±1 Week" },
            { key: "2weeks" as const, label: statusFilter === "past" ? "Last 2 Weeks" : statusFilter === "upcoming" ? "2 Weeks" : "±2 Weeks" },
            { key: "month" as const, label: statusFilter === "past" ? "Last Month" : statusFilter === "upcoming" ? "1 Month" : "±1 Month" },
          ]).map(r => (
            <Button
              key={r.key}
              variant={timeRange === r.key ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setTimeRange(r.key)}
              data-testid={`button-range-${r.key}`}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>
      )}

      {user && statusFilter !== "scheduled" && statusFilter !== "past" && (
        <RecommendedSessions />
      )}

      {statusFilter === "scheduled" && canManageSessions && (
        <div className="space-y-4" data-testid="section-scheduled-sessions">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Scheduled Sessions</h3>
              <span className="text-xs text-muted-foreground">Not yet visible to players — publish to make them live</span>
            </div>
            <Badge variant="secondary" className="text-xs ml-1">{scheduledSessions.length}</Badge>
          </div>
          {scheduledSessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No scheduled sessions</p>
                <p className="text-xs text-muted-foreground mt-1">Sessions with a future publish date will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scheduledSessions.map((session) => (
                <Card key={session.id} className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10" data-testid={`card-scheduled-session-${session.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{session.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{format(new Date(session.date), "EEE, d MMM yyyy")}</span>
                        </div>
                        {session.startTime && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{session.startTime}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 flex-shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Opens {format(new Date((session as any).publishAt), "MMM d")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.maxPlayers} max
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="h-3 w-3" />
                        {session.courtsAvailable} courts
                      </span>
                      {session.sessionFee != null && (
                        <span className="flex items-center gap-1">
                          <PoundSterling className="h-3 w-3" />
                          £{(session.sessionFee / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900"
                        onClick={() => publishNowMutation.mutate(session.id)}
                        disabled={publishNowMutation.isPending}
                        data-testid={`button-publish-now-${session.id}`}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Publish Now
                      </Button>
                      <EditSessionDialog session={session} venues={[]} adminClubs={isPlatformAdmin ? (clubs || []) : (adminClubs || [])} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSessionType(session);
                        }}
                        disabled={togglingSessionId === session.id}
                        data-testid={`button-toggle-junior-scheduled-${session.id}`}
                        title={session.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
                      >
                        <Baby className={`h-3 w-3 ${session.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setCopySession(session); }}
                        data-testid={`button-copy-scheduled-${session.id}`}
                        title="Copy Session"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteSession({ id: session.id, recurringEventId: (session as any).recurringEventId || null, date: session.date || null })}
                        data-testid={`button-delete-scheduled-${session.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {statusFilter !== "scheduled" && canManageSessions && viewMode === "cards" && filteredSessions && filteredSessions.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filteredSessions.length > 0 && selectedIds.size === filteredSessions.length}
              onCheckedChange={toggleSelectAll}
              data-testid="checkbox-select-all-sessions"
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                data-testid="button-bulk-delete-sessions"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {statusFilter !== "scheduled" && viewMode === "calendar" && filteredSessions && (
        <CalendarView
          sessions={filteredSessions}
          clubs={clubs || []}
          onSessionClick={handleSessionClickFromView}
          adminActions={viewAdminActions}
        />
      )}

      {statusFilter !== "scheduled" && viewMode === "timeline" && filteredSessions && (
        <TimelineView
          sessions={filteredSessions}
          clubs={clubs || []}
          onSessionClick={handleSessionClickFromView}
          mySignupsBySession={mySignupsBySession}
          onSignUp={(session) => setJoinSession(session)}
          adminActions={viewAdminActions}
        />
      )}

      {statusFilter !== "scheduled" && viewMode === "grouped" && filteredSessions && (
        <GroupedView
          sessions={filteredSessions}
          clubs={clubs || []}
          onSessionClick={handleSessionClickFromView}
          adminActions={viewAdminActions}
        />
      )}

      {statusFilter !== "scheduled" && viewMode === "cards" && (
        <div className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1,2,3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />)}
        
        {filteredSessions?.map((session) => {
          const canManageThis = isPlatformAdmin || managedClubIds.has(session.clubId);
          const clubName = clubs?.find(c => c.id === session.clubId)?.name;
          const formatLabel = session.playersPerSide === 1 ? "Singles" : "Doubles";
          const venue = (session as any).venue;

          return (
          <div key={session.id} className="relative">
            {canManageThis && (
              <div
                className="absolute top-5 left-5 z-10"
                onClick={(e) => toggleSelect(session.id, e)}
              >
                <Checkbox
                  checked={selectedIds.has(session.id)}
                  onCheckedChange={() => {}}
                  data-testid={`checkbox-session-${session.id}`}
                />
              </div>
            )}
            <Card className={`h-full border-border/40 group overflow-visible rounded-2xl shadow-sm ${selectedIds.has(session.id) ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-4 sm:p-5">

                <div className={`flex items-center justify-between gap-2 ${canManageThis ? "pl-7" : ""}`}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                      session.matchMode === "COMPETITIVE"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : session.matchMode === "TRAINING"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`} data-testid={`badge-mode-${session.id}`}>
                      {session.matchMode}
                    </span>
                    {session.genderRestriction === "FEMALE_ONLY" && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">Females Only</span>
                    )}
                    {session.sessionType === "JUNIORS_ONLY" && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Juniors</span>
                    )}
                    {session.isPrivate && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground">
                        <Lock className="h-3 w-3 mr-0.5" />Private
                      </span>
                    )}
                    {(session as any).recurringEventId && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted/60">
                        <Repeat className="h-3 w-3 mr-0.5" />Series
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground bg-muted/70 px-2.5 py-1 rounded-lg whitespace-nowrap tabular-nums" data-testid={`text-time-${session.id}`}>
                    {session.startTime}
                  </span>
                </div>

                <div className="mt-3 space-y-0.5">
                  <h3
                    className="text-lg sm:text-xl font-bold leading-tight cursor-pointer transition-colors"
                    onClick={() => setDetailsSession(session)}
                    data-testid={`button-session-title-${session.id}`}
                  >
                    {session.title || "Untitled Session"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {clubName && <span>{clubName}</span>}
                    {clubName && <span className="mx-1.5 text-border">•</span>}
                    <span>{formatLabel}</span>
                    {session.durationMinutes && (
                      <>
                        <span className="mx-1.5 text-border">•</span>
                        <span>{session.durationMinutes} min</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/70 font-medium pt-0.5">
                    {format(new Date(session.date), "EEE, MMM d, yyyy")}
                  </p>
                </div>

                <div className="mt-3.5 flex items-center gap-2 flex-wrap" data-testid={`stats-row-${session.id}`}>
                  <div
                    className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => setDetailsSession(session)}
                    data-testid={`button-rsvp-${session.id}`}
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{session.signupCount || 0}/{session.maxPlayers}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 cursor-pointer">RSVP</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{session.courtsAvailable}</span>
                    <span className="text-[10px] text-muted-foreground">Courts</span>
                  </div>
                  {session.hallName && (
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium truncate max-w-[120px]">{session.hallName}</span>
                    </div>
                  )}
                  {session.courtNames && session.courtNames.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium truncate max-w-[150px]">{session.courtNames.join(", ")}</span>
                    </div>
                  )}
                  {venue && (
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium truncate max-w-[120px]">{venue.name}{venue.city ? `, ${venue.city}` : ''}</span>
                    </div>
                  )}
                </div>

                {(session as any).waitingCount > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-2" data-testid={`bar-waiting-list-${session.id}`}>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300/50 dark:ring-amber-700/50">
                      Waiting List
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-[5px] h-[10px] rounded-[1px] ${
                              i < Math.round(Math.min((session as any).waitingCount / session.maxPlayers * 100, 100) / 10) ? "bg-amber-500" : "bg-muted/50 dark:bg-muted/40"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                        {(session as any).waitingCount}
                      </span>
                    </div>
                  </div>
                )}

                {(session.sessionFee != null || session.shuttlecockType) && (
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {session.sessionFee != null && (
                      <div className="flex items-center gap-1">
                        <PoundSterling className="h-3 w-3" />
                        <span>£{(session.sessionFee / 100).toFixed(2)} per session</span>
                      </div>
                    )}
                    {session.shuttlecockType && (
                      <div className="flex items-center gap-1">
                        <CircleDot className="h-3 w-3" />
                        <span>{session.shuttlecockType === 'feather' ? 'Feather' : session.shuttlecockType === 'plastic' ? 'Plastic' : 'Feather & Plastic'}</span>
                      </div>
                    )}
                  </div>
                )}

                {session.allowedCategories && session.allowedCategories.length > 0 && (
                  (() => {
                    const ALL_GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
                    const grades = session.allowedCategories.filter((g: string) => !["A", "B", "C", "D"].includes(g));
                    const isAll = ALL_GRADES.every(g => session.allowedCategories!.includes(g));
                    return (
                      <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 dark:bg-muted/20 px-3 py-2.5" data-testid={`text-grades-${session.id}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-semibold text-foreground">
                            {isAll ? "All Grades Welcome" : "Grading Criteria"}
                          </span>
                        </div>
                        {!isAll && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {grades.map((grade: string) => {
                              const tier = grade.charAt(0);
                              const colors = tier === "A"
                                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700/60"
                                : tier === "B"
                                ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/60"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700/60";
                              return (
                                <span key={grade} className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${colors}`}>
                                  {grade}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {(() => {
                  const signup = mySignupsBySession.get(session.id);
                  const isSignedUp = signup && (signup.signupStatus === "CONFIRMED" || signup.signupStatus === "WAITING");
                  const isNotAttending = signup && signup.signupStatus === "NOT_ATTENDING";
                  const isInvited = signup && signup.signupStatus === "INVITED";
                  const isPast = new Date(session.date) < now;
                  const isScheduledLater = (session as any).publishAt && new Date((session as any).publishAt) > new Date();
                  const hasAccess = getSessionAccess(session.clubId) === "allowed";
                  const gradeEligible = checkGradeEligibility(session);

                  return (
                    <>
                      {user && hasAccess && !isPast && !isScheduledLater && session.status !== "COMPLETED" && session.status !== "CANCELLED" && (
                        <div className="mt-4 pt-4 border-t border-border/30 space-y-2" data-testid={`session-join-area-${session.id}`}>
                          {isSignedUp ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 px-3.5 py-2.5">
                                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                    {signup.signupStatus === "WAITING" ? "On Waiting List" : "Signed Up"}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 rounded-xl text-xs font-medium"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    withdrawMutation.mutate(session.id);
                                  }}
                                  disabled={withdrawMutation.isPending}
                                  data-testid={`button-decline-session-${session.id}`}
                                >
                                  {withdrawMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                                  Withdraw
                                </Button>
                              </div>
                              {signup.signupStatus !== "WAITING" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {signup.paymentStatus === "PAID" ? (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/40 px-3 py-1.5">
                                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Space Secured</span>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-800/40 px-3 py-1.5">
                                      <ShieldX className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Space Unsecured</span>
                                    </div>
                                  )}
                                  {signup.paymentStatus === "PAID" ? (
                                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/40 px-3 py-1.5">
                                      <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Payment Received</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 px-3 py-1.5">
                                      <CircleDollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Payment Pending</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : isInvited ? (
                            <div className="flex items-center gap-2">
                              <Button
                                className="flex-1 rounded-xl font-semibold shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setJoinSession(session);
                                }}
                                data-testid={`button-accept-invite-${session.id}`}
                              >
                                <UserCheck className="h-4 w-4" />
                                Accept Invite
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 rounded-xl text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  withdrawMutation.mutate(session.id);
                                }}
                                disabled={withdrawMutation.isPending}
                                data-testid={`button-decline-invite-${session.id}`}
                              >
                                {withdrawMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                                Decline
                              </Button>
                            </div>
                          ) : !gradeEligible ? (
                            <div className="space-y-2" data-testid={`grade-restriction-${session.id}`}>
                              <div className="flex items-center gap-2 text-sm justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 py-2.5 px-3">
                                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-amber-700 dark:text-amber-300 font-medium text-xs">Not available for your level</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground text-center">
                                Required: {session.allowedCategories?.join(", ")}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                className="flex-1 rounded-xl font-semibold shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setJoinSession(session);
                                }}
                                data-testid={`button-join-session-${session.id}`}
                              >
                                <UserCheck className="h-4 w-4" />
                                Join Session
                              </Button>
                              {juniors && juniors.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl text-xs font-medium gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJoinSession(session);
                                  }}
                                  data-testid={`button-join-kids-${session.id}`}
                                >
                                  <Baby className="h-3.5 w-3.5" />
                                  +Kids
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {user && !hasAccess && !isPast && (
                        <div className="mt-4 pt-4 border-t border-border/30">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center rounded-xl bg-muted/30 py-2.5 px-3 border border-border/20">
                            <Lock className="h-4 w-4 text-red-500" />
                            <span>Join the club to sign up</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {editableClubIds.has(session.clubId) && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg h-8 px-2 text-xs gap-1 text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCrowdSessionId(session.id);
                            }}
                            data-testid={`button-crowd-session-${session.id}`}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Crowd</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Crowd Control</TooltipContent>
                      </Tooltip>
                      {!isOrganiserOnly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg h-8 px-2 text-xs gap-1 text-muted-foreground"
                              onClick={() => setFinanceSession(session)}
                              data-testid={`button-finance-session-${session.id}`}
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Finances</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Session Finances</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg h-8 gap-1 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              remindInviteesMutation.mutate(session.id);
                            }}
                            disabled={remindInviteesMutation.isPending}
                            data-testid={`button-remind-session-${session.id}`}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Remind</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send reminder to members who haven't signed up</TooltipContent>
                      </Tooltip>
                      <EditSessionDialog session={session} venues={[]} adminClubs={isPlatformAdmin ? (clubs || []) : (adminClubs || [])} />
                      <div className="flex-1" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg h-8 w-8 p-0 text-muted-foreground"
                            data-testid={`button-more-session-${session.id}`}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setDetailsSession(session); }}
                            data-testid={`button-rsvp-dropdown-session-${session.id}`}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            RSVP List
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); remindInviteesMutation.mutate(session.id); }}
                            data-testid={`button-remind-dropdown-session-${session.id}`}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Remind Members
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setCopySession(session); }}
                            data-testid={`button-copy-session-${session.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate Session
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSessionType(session);
                            }}
                            disabled={togglingSessionId === session.id}
                            data-testid={`button-toggle-junior-${session.id}`}
                          >
                            <Baby className={`h-4 w-4 mr-2 ${session.sessionType === "JUNIORS_ONLY" ? "text-emerald-500" : ""}`} />
                            {session.sessionType === "JUNIORS_ONLY" ? "Move to Sessions" : "Move to Juniors"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            onClick={(e) => { e.stopPropagation(); setDeleteSession({ id: session.id, recurringEventId: (session as any).recurringEventId || null, date: session.date ? new Date(session.date).toISOString() : null }); }}
                            data-testid={`button-delete-session-${session.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Session
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}

                {editableClubIds.has(session.clubId) ? (
                  <div className="mt-3 pt-3 border-t border-border/30 flex justify-center">
                    <StartSessionButton
                      size="sm"
                      onClick={() => setLocation(`/sessions/${session.id}`)}
                    />
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <Link href={`/sessions/${session.id}`}>
                      <Button variant="outline" className="w-full rounded-xl font-medium gap-2" data-testid={`button-details-session-${session.id}`}>
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
          );
        })}
      </div>
      )}
      </>)}

      {sessionsScope === "juniors" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={juniorStatusFilter === "all" ? "default" : "outline"} size="sm"
              onClick={() => setJuniorStatusFilter("all")} data-testid="button-junior-filter-all">
              All ({juniorAllVisible.length})
            </Button>
            {juniorLive.length > 0 && (
              <Button variant={juniorStatusFilter === "live" ? "default" : "outline"} size="sm"
                onClick={() => setJuniorStatusFilter("live")} data-testid="button-junior-filter-live">
                <Activity className="w-3 h-3 mr-1" /> Live ({juniorLive.length})
              </Button>
            )}
            <Button variant={juniorStatusFilter === "upcoming" ? "default" : "outline"} size="sm"
              onClick={() => setJuniorStatusFilter("upcoming")} data-testid="button-junior-filter-upcoming">
              <Calendar className="w-3 h-3 mr-1" /> Upcoming ({juniorUpcoming.length})
            </Button>
            <Button variant={juniorStatusFilter === "past" ? "default" : "outline"} size="sm"
              onClick={() => setJuniorStatusFilter("past")} data-testid="button-junior-filter-past">
              <CheckCircle className="w-3 h-3 mr-1" /> Past ({juniorPast.length})
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 w-fit">
            {([
              { key: "timeline" as const, icon: AlignJustify, label: "Timeline" },
              { key: "cards" as const, icon: LayoutGrid, label: "Cards" },
              { key: "calendar" as const, icon: CalendarDays, label: "Calendar" },
              { key: "grouped" as const, icon: Layers, label: "Grouped" },
            ]).map(v => (
              <Button key={v.key} variant={viewMode === v.key ? "default" : "ghost"} size="sm"
                className={`h-8 px-2.5 gap-1.5 text-xs ${viewMode === v.key ? "" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewMode(v.key)} data-testid={`button-junior-view-${v.key}`}>
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </Button>
            ))}
          </div>

          {viewMode === "timeline" && (
            <TimelineView
              sessions={juniorDisplaySessions}
              clubs={clubs || []}
              onSessionClick={handleSessionClickFromView}
              mySignupsBySession={mySignupsBySession}
              onSignUp={(session) => setJoinSession(session)}
              adminActions={viewAdminActions}
            />
          )}
          {viewMode === "calendar" && (
            <CalendarView
              sessions={juniorDisplaySessions}
              clubs={clubs || []}
              onSessionClick={handleSessionClickFromView}
              adminActions={viewAdminActions}
            />
          )}
          {viewMode === "grouped" && (
            <GroupedView
              sessions={juniorDisplaySessions}
              clubs={clubs || []}
              onSessionClick={handleSessionClickFromView}
              adminActions={viewAdminActions}
            />
          )}
          {viewMode === "cards" && (
            <div className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {juniorDisplaySessions.length === 0 ? (
                <div className="col-span-full">
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Baby className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">No Junior Sessions</h3>
                      <p className="text-sm text-muted-foreground">There are no junior sessions matching your filters.</p>
                    </CardContent>
                  </Card>
                </div>
              ) : juniorDisplaySessions.map(session => {
                const sessionDate = new Date(session.date);
                const isLive = session.status === "ACTIVE";
                const spotsLeft = session.maxPlayers - (session.signupCount || 0);
                return (
                  <Card key={session.id} className="overflow-hidden" data-testid={`card-junior-session-${session.id}`}>
                    {isLive && <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-400" />}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{session.title}</h4>
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              <Baby className="h-2.5 w-2.5 mr-0.5" /> Juniors
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(sessionDate, "EEE, d MMM yyyy")}</span>
                          </div>
                          {session.startTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{session.startTime} ({session.durationMinutes}min)</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isLive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>}
                          {spotsLeft > 0 && !isLive && <Badge variant="secondary">{spotsLeft} spots</Badge>}
                          {spotsLeft <= 0 && !isLive && <Badge variant="destructive">Full</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{session.signupCount || 0}/{session.maxPlayers} players</span>
                      </div>
                      {(session as any).waitingCount > 0 && (
                        <div className="mt-1.5 flex items-center justify-between gap-2" data-testid={`bar-waiting-list-junior-${session.id}`}>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300/50 dark:ring-amber-700/50">
                            Waiting List
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-[5px] h-[10px] rounded-[1px] ${
                                    i < Math.round(Math.min((session as any).waitingCount / session.maxPlayers * 100, 100) / 10) ? "bg-amber-500" : "bg-muted/50 dark:bg-muted/40"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                              {(session as any).waitingCount}
                            </span>
                          </div>
                        </div>
                      )}
                      {(session as any).sessionFee != null && (
                        <div className="flex items-center gap-1 mt-1 text-sm">
                          <PoundSterling className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-medium">£{((session as any).sessionFee / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="mt-3">
                        <Link href={`/sessions/${session.id}`}>
                          <Button size="sm" className="w-full" variant="outline" data-testid={`button-view-junior-session-${session.id}`}>
                            View & Sign Up <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sessions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected sessions? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete {selectedIds.size} Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSession} onOpenChange={(open) => { if (!open) setDeleteSession(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              {deleteSession?.recurringEventId
                ? "This session is part of a recurring series. Choose how to delete:"
                : "Are you sure you want to delete this session? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteSession(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteSession && deleteSingleSessionMutation.mutate(deleteSession.id)}
              disabled={deleteSingleSessionMutation.isPending || deleteRecurringMutation.isPending}
              data-testid="button-delete-this-session"
            >
              {deleteSingleSessionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleteSession?.recurringEventId ? "Delete This Session Only" : "Delete Session"}
            </Button>
            {deleteSession?.recurringEventId && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => deleteSession.recurringEventId && deleteRecurringMutation.mutate({ recurringEventId: deleteSession.recurringEventId, fromDate: deleteSession.date || undefined })}
                  disabled={deleteRecurringMutation.isPending || deleteSingleSessionMutation.isPending}
                  data-testid="button-delete-future-recurring"
                >
                  {deleteRecurringMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete This & Future Sessions
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-700 hover:bg-red-800"
                  onClick={() => deleteSession.recurringEventId && deleteRecurringMutation.mutate({ recurringEventId: deleteSession.recurringEventId })}
                  disabled={deleteRecurringMutation.isPending || deleteSingleSessionMutation.isPending}
                  data-testid="button-delete-entire-series"
                >
                  {deleteRecurringMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete Entire Series
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {detailsSession && (
        <SessionDetailsModal
          session={detailsSession}
          open={!!detailsSession}
          onOpenChange={(open) => { if (!open) setDetailsSession(null); }}
          isAdmin={editableClubIds.has(detailsSession.clubId)}
        />
      )}

      {financeSession && (
        <SessionFinanceModal
          session={financeSession}
          open={!!financeSession}
          onOpenChange={(open) => { if (!open) setFinanceSession(null); }}
        />
      )}

      {crowdSessionId && (
        <StandaloneCrowdControl
          sessionId={crowdSessionId}
          open={!!crowdSessionId}
          onOpenChange={(open) => { if (!open) setCrowdSessionId(null); }}
        />
      )}

      {copySession && (
        <CopySessionChooser
          session={copySession}
          sessionClubs={sessionClubs || []}
          onClose={() => setCopySession(null)}
        />
      )}

      {editSessionFromView && (
        <EditSessionDialog
          session={editSessionFromView}
          venues={[]}
          adminClubs={isPlatformAdmin ? (clubs || []) : (adminClubs || [])}
          externalOpen={true}
          onExternalClose={() => setEditSessionFromView(null)}
        />
      )}

      {joinSession && (
        <JoinSessionModal
          session={joinSession}
          open={!!joinSession}
          onOpenChange={(open) => { if (!open) setJoinSession(null); }}
          user={user}
          juniors={juniors || []}
        />
      )}
    </div>
  );
}

function JoinSessionModal({
  session,
  open,
  onOpenChange,
  user,
  juniors,
}: {
  session: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  juniors: any[];
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set([user?.id]));
  const [paymentOption, setPaymentOption] = useState<"paid" | "payment_sent" | "cash" | "credit" | "pay_later">("pay_later");
  const [creditMode, setCreditMode] = useState<"none" | "full" | "partial">("none");
  const [partialCreditAmount, setPartialCreditAmount] = useState("");

  const { data: creditData, isLoading: creditLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/credits/balance", session.clubId],
    queryFn: async () => {
      const res = await fetch(`/api/credits/balance?clubId=${session.clubId}`, { credentials: "include" });
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: open && !!session.clubId,
  });

  const creditBalance = creditData?.balance || 0;
  const totalFee = session.sessionFee != null ? session.sessionFee * selectedIds.size : 0;

  const creditToApply = creditMode === "full"
    ? Math.min(creditBalance, totalFee)
    : creditMode === "partial"
    ? Math.min(Math.round(parseFloat(partialCreditAmount || "0") * 100), creditBalance, totalFee)
    : 0;

  const clubJuniors = juniors.filter((j: any) => {
    return true;
  });

  const allAttendees = [
    { id: user?.id, fullName: user?.fullName || "Me", isJunior: false },
    ...clubJuniors.map((j: any) => ({ id: j.id, fullName: j.fullName, isJunior: true })),
  ];

  const hasChildren = clubJuniors.length > 0;

  const toggleAttendee = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === allAttendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allAttendees.map(a => a.id)));
    }
  };

  const getPaymentFields = () => {
    switch (paymentOption) {
      case "paid":
        return { paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID" };
      case "payment_sent":
        return { paymentMethod: "BANK_TRANSFER", paymentStatus: "PENDING" };
      case "cash":
        return { paymentMethod: "CASH", paymentStatus: "PENDING" };
      case "credit":
        return { paymentMethod: "MEMBERSHIP_CREDIT", paymentStatus: "PENDING" };
      case "pay_later":
      default:
        return { paymentMethod: "NONE", paymentStatus: "UNPAID" };
    }
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.size === 0) throw new Error("Select at least one person");
      const { paymentMethod, paymentStatus } = getPaymentFields();
      const attendees = Array.from(selectedIds).map(userId => ({
        userId,
        paymentMethod,
        paymentStatus,
      }));
      const res = await apiRequest("POST", `/api/sessions/${session.id}/join-multi`, { attendees });
      const data = await res.json();

      if (paymentOption === "credit" && creditToApply > 0 && data.signups?.length > 0) {
        try {
          await apiRequest("POST", "/api/credits/apply", {
            clubId: session.clubId,
            sessionId: session.id,
            amount: creditToApply,
          });
        } catch (creditErr: any) {
          console.error("Credit application failed:", creditErr);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance", session.clubId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-credits"] });
      const signedUp = data.signups?.length || 0;
      const errs = data.errors?.length || 0;
      if (signedUp > 0) {
        const creditMsg = creditToApply > 0 ? ` £${(creditToApply / 100).toFixed(2)} credit applied.` : "";
        toast({
          title: "Signed Up",
          description: `${signedUp} ${signedUp === 1 ? "person" : "people"} signed up for ${session.title || "session"}.${creditMsg}${errs > 0 ? ` ${errs} could not be added.` : ""}`,
        });
      }
      if (errs > 0 && signedUp === 0) {
        toast({
          title: "Could Not Join",
          description: data.errors.join(", "),
          variant: "destructive",
        });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-join-session-title">Join Session</DialogTitle>
          <DialogDescription>
            {session.title || "Session"} - {format(new Date(session.date), "EEE, MMM d")} at {session.startTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Who's attending?</span>
            {hasChildren && (
              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                data-testid="button-select-all-attendees"
              >
                {selectedIds.size === allAttendees.length ? (
                  <>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    Select All
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2" data-testid="attendee-list">
            {allAttendees.map((attendee) => (
              <div
                key={attendee.id}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  selectedIds.has(attendee.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover-elevate"
                }`}
                onClick={() => toggleAttendee(attendee.id)}
                data-testid={`attendee-option-${attendee.id}`}
              >
                <Checkbox
                  checked={selectedIds.has(attendee.id)}
                  onCheckedChange={() => toggleAttendee(attendee.id)}
                  data-testid={`checkbox-attendee-${attendee.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{attendee.fullName}</span>
                    {attendee.isJunior && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Baby className="h-3 w-3 mr-0.5" />
                        Junior
                      </Badge>
                    )}
                    {!attendee.isJunior && (
                      <Badge variant="outline" className="text-[10px]">You</Badge>
                    )}
                  </div>
                </div>
                {selectedIds.has(attendee.id) && (
                  <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
            ))}
          </div>

          {session.sessionFee != null && (
            <div className="text-sm text-muted-foreground text-center">
              Session fee: <span className="font-medium">£{(session.sessionFee / 100).toFixed(2)}</span> per person
              {selectedIds.size > 0 && (
                <span className="ml-1">
                  (Total: <span className="font-medium">£{(totalFee / 100).toFixed(2)}</span>)
                </span>
              )}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="space-y-2" data-testid="payment-method-picker">
              <span className="text-sm font-medium">Payment Status</span>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    paymentOption === "paid" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border hover-elevate"
                  }`}
                  onClick={() => { setPaymentOption("paid"); setCreditMode("none"); }}
                  data-testid="payment-option-paid"
                >
                  <Checkbox checked={paymentOption === "paid"} onCheckedChange={() => { setPaymentOption("paid"); setCreditMode("none"); }} />
                  <div>
                    <p className="text-sm font-medium">Paid</p>
                    <p className="text-[10px] text-muted-foreground">Bank transfer verified</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    paymentOption === "payment_sent" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-border hover-elevate"
                  }`}
                  onClick={() => { setPaymentOption("payment_sent"); setCreditMode("none"); }}
                  data-testid="payment-option-payment-sent"
                >
                  <Checkbox checked={paymentOption === "payment_sent"} onCheckedChange={() => { setPaymentOption("payment_sent"); setCreditMode("none"); }} />
                  <div>
                    <p className="text-sm font-medium">Payment Sent</p>
                    <p className="text-[10px] text-muted-foreground">Pending verification</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    paymentOption === "cash" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border hover-elevate"
                  }`}
                  onClick={() => { setPaymentOption("cash"); setCreditMode("none"); }}
                  data-testid="payment-option-cash"
                >
                  <Checkbox checked={paymentOption === "cash"} onCheckedChange={() => { setPaymentOption("cash"); setCreditMode("none"); }} />
                  <div>
                    <p className="text-sm font-medium">Cash Pending</p>
                    <p className="text-[10px] text-muted-foreground">Pay cash at session</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                    paymentOption === "pay_later" ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-border hover-elevate"
                  }`}
                  onClick={() => { setPaymentOption("pay_later"); setCreditMode("none"); }}
                  data-testid="payment-option-pay-later"
                >
                  <Checkbox checked={paymentOption === "pay_later"} onCheckedChange={() => { setPaymentOption("pay_later"); setCreditMode("none"); }} />
                  <div>
                    <p className="text-sm font-medium">Unpaid</p>
                    <p className="text-[10px] text-muted-foreground">Settle payment later</p>
                  </div>
                </div>
                {!creditLoading && creditBalance > 0 && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors col-span-2 ${
                      paymentOption === "credit" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30" : "border-border hover-elevate"
                    }`}
                    onClick={() => { setPaymentOption("credit"); setCreditMode("full"); }}
                    data-testid="payment-option-credit"
                  >
                    <Checkbox checked={paymentOption === "credit"} onCheckedChange={() => { setPaymentOption("credit"); setCreditMode("full"); }} />
                    <div>
                      <p className="text-sm font-medium">Reward Used</p>
                      <p className="text-[10px] text-muted-foreground">£{(creditBalance / 100).toFixed(2)} available in wallet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentOption === "credit" && !creditLoading && creditBalance > 0 && session.sessionFee != null && selectedIds.size > 0 && (
            <div className="rounded-md border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3" data-testid="credit-prompt">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Credit balance: £{(creditBalance / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                    creditMode === "full" ? "border-primary bg-primary/5" : "border-border hover-elevate"
                  }`}
                  onClick={() => setCreditMode("full")}
                  data-testid="credit-option-full"
                >
                  <Checkbox
                    checked={creditMode === "full"}
                    onCheckedChange={() => setCreditMode("full")}
                  />
                  <span className="text-sm">
                    Apply full credit (£{(Math.min(creditBalance, totalFee) / 100).toFixed(2)})
                  </span>
                </div>
                <div
                  className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${
                    creditMode === "partial" ? "border-primary bg-primary/5" : "border-border hover-elevate"
                  }`}
                  onClick={() => setCreditMode("partial")}
                  data-testid="credit-option-partial"
                >
                  <Checkbox
                    checked={creditMode === "partial"}
                    onCheckedChange={() => setCreditMode("partial")}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">Apply partial:</span>
                    {creditMode === "partial" && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={(Math.min(creditBalance, totalFee) / 100).toFixed(2)}
                          value={partialCreditAmount}
                          onChange={(e) => setPartialCreditAmount(e.target.value)}
                          className="w-24"
                          placeholder="0.00"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="input-partial-credit"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {creditToApply > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium text-center">
                  £{(creditToApply / 100).toFixed(2)} credit will be applied. Remaining to pay: £{((totalFee - creditToApply) / 100).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-join">
            Cancel
          </Button>
          <Button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending || selectedIds.size === 0}
            data-testid="button-confirm-join"
          >
            {joinMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserCheck className="h-4 w-4 mr-2" />
            )}
            Join ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractSessionPrefill(session: any) {
  return {
    clubId: session.clubId,
    title: session.title || "",
    date: session.date ? new Date(session.date) : undefined,
    startTime: session.startTime || "18:00",
    maxPlayers: session.maxPlayers || 24,
    courtsAvailable: session.courtsAvailable || 4,
    matchMode: session.matchMode || "SOCIAL",
    isPrivate: session.isPrivate || false,
    genderRestriction: session.genderRestriction || "ALL",
    sessionType: session.sessionType || "OPEN",
    juniorAgeGroups: session.juniorAgeGroups || [],
    playersPerSide: session.playersPerSide || 2,
    matchGenderType: session.matchGenderType || "MIXED",
    durationMinutes: session.durationMinutes || 120,
    allowedCategories: session.allowedCategories || ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
    sessionFee: session.sessionFee != null ? session.sessionFee / 100 : undefined,
    shuttlecockType: session.shuttlecockType || undefined,
    liveStreamUrl: session.liveStreamUrl || undefined,
    defaultPointsToPlayTo: session.defaultPointsToPlayTo || 21,
    numberOfSets: session.numberOfSets || 1,
    venueId: session.venueId || undefined,
    sessionDetails: session.sessionDetails || "",
  };
}

function CopySessionChooser({ session, sessionClubs, onClose }: { session: any; sessionClubs: { id: number; name: string }[]; onClose: () => void }) {
  const [eventType, setEventType] = useState<"single" | "recurring" | null>(null);
  const prefillData = useMemo(() => extractSessionPrefill(session), [session]);

  if (eventType === "single") {
    return <CreateSessionDialog sessionClubs={sessionClubs} initialOpen prefillData={prefillData} onClose={onClose} />;
  }
  if (eventType === "recurring") {
    return <RecurringEventDialog sessionClubs={sessionClubs} initialOpen prefillData={prefillData} onClose={onClose} />;
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle>Copy Session As...</DialogTitle>
          <DialogDescription>Choose how to create the copy</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <button
            onClick={() => setEventType("single")}
            className="flex items-center gap-4 p-4 rounded-md border hover-elevate cursor-pointer text-left"
            data-testid="button-copy-as-single"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Single Event</p>
              <p className="text-xs text-muted-foreground">Copy as a one-off session</p>
            </div>
          </button>
          <button
            onClick={() => setEventType("recurring")}
            className="flex items-center gap-4 p-4 rounded-md border hover-elevate cursor-pointer text-left"
            data-testid="button-copy-as-recurring"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Recurring Event</p>
              <p className="text-xs text-muted-foreground">Copy as a recurring series</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventTypeChooser({ sessionClubs }: { sessionClubs: { id: number; name: string }[] }) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [eventType, setEventType] = useState<"single" | "recurring" | null>(null);

  return (
    <>
      <Dialog open={chooserOpen && !eventType} onOpenChange={(open) => { setChooserOpen(open); if (!open) setEventType(null); }}>
        <DialogTrigger asChild>
          <Button className="shadow-lg shadow-primary/25" data-testid="button-new-session">
            <Plus className="h-4 w-4 mr-2" /> New Session
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>What would you like to create?</DialogTitle>
            <DialogDescription>Choose the type of event</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <button
              onClick={() => { setEventType("single"); }}
              className="flex items-center gap-4 p-4 rounded-md border hover-elevate cursor-pointer text-left"
              data-testid="button-choose-single-event"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Event</p>
                <p className="text-xs text-muted-foreground">Create a single session</p>
              </div>
            </button>
            <button
              onClick={() => { setEventType("recurring"); }}
              className="flex items-center gap-4 p-4 rounded-md border hover-elevate cursor-pointer text-left"
              data-testid="button-choose-recurring-event"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Recurring Event</p>
                <p className="text-xs text-muted-foreground">Auto-generate sessions on a schedule</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {eventType === "single" && (
        <CreateSessionDialog sessionClubs={sessionClubs} initialOpen onClose={() => { setEventType(null); setChooserOpen(false); }} />
      )}
      {eventType === "recurring" && (
        <RecurringEventDialog sessionClubs={sessionClubs} initialOpen onClose={() => { setEventType(null); setChooserOpen(false); }} />
      )}
    </>
  );
}

function RecurringEventDialog({ sessionClubs, initialOpen, onClose, prefillData }: { sessionClubs: { id: number; name: string }[]; initialOpen?: boolean; onClose: () => void; prefillData?: Record<string, any> }) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const { toast } = useToast();
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set());
  const [recurringScheduleEnabled, setRecurringScheduleEnabled] = useState(false);
  const [recurringWeeksBefore, setRecurringWeeksBefore] = useState(1);

  const recurringSchema = z.object({
    clubId: z.number().min(1, "Select a club"),
    title: z.string().min(1, "Title is required"),
    frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    neverEnd: z.boolean().default(false),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:MM format"),
    durationMinutes: z.coerce.number().min(30).default(120),
    maxPlayers: z.coerce.number().min(1).default(24),
    courtsAvailable: z.coerce.number().min(1).default(4),
    matchMode: z.enum(["COMPETITIVE", "SOCIAL", "TRAINING"]).default("SOCIAL"),
    sessionFee: z.coerce.number().optional(),
    allowedCategories: z.array(z.string()).default(["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"]),
    playersPerSide: z.coerce.number().min(1).max(2).default(2),
    matchGenderType: z.enum(["MIXED", "FEMALE", "MALE"]).default("MIXED"),
    numberOfSets: z.coerce.number().min(1).max(3).default(1),
    defaultPointsToPlayTo: z.coerce.number().default(21),
    isPrivate: z.boolean().default(false),
    genderRestriction: z.enum(["ALL", "FEMALE_ONLY"]).default("ALL"),
    sessionType: z.enum(["OPEN", "JUNIORS_ONLY"]).default("OPEN"),
  }).refine((data) => data.neverEnd || (data.endDate && data.endDate >= data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  }).refine((data) => data.neverEnd || data.endDate, {
    message: "End date is required unless 'Never End' is selected",
    path: ["endDate"],
  });

  const form = useForm<z.infer<typeof recurringSchema>>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      clubId: prefillData?.clubId ?? (sessionClubs.length > 0 ? sessionClubs[0].id : undefined),
      title: prefillData?.title ?? "",
      frequency: "WEEKLY",
      neverEnd: false,
      startTime: prefillData?.startTime ?? "18:00",
      durationMinutes: prefillData?.durationMinutes ?? 120,
      maxPlayers: prefillData?.maxPlayers ?? 24,
      courtsAvailable: prefillData?.courtsAvailable ?? 4,
      matchMode: prefillData?.matchMode ?? "SOCIAL",
      allowedCategories: prefillData?.allowedCategories ?? ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      playersPerSide: prefillData?.playersPerSide ?? 2,
      matchGenderType: prefillData?.matchGenderType ?? "MIXED",
      numberOfSets: prefillData?.numberOfSets ?? 1,
      defaultPointsToPlayTo: prefillData?.defaultPointsToPlayTo ?? 21,
      isPrivate: prefillData?.isPrivate ?? false,
      genderRestriction: prefillData?.genderRestriction ?? "ALL",
      sessionType: prefillData?.sessionType ?? "OPEN",
    }
  });

  const watchNeverEnd = form.watch("neverEnd");
  const watchRecurringClubId = form.watch("clubId");

  const createRecurring = useMutation({
    mutationFn: async (values: z.infer<typeof recurringSchema>) => {
      const { clubId, title, frequency, startDate, endDate, neverEnd, ...sessionFields } = values;
      const res = await apiRequest("POST", "/api/recurring-events", {
        recurringEvent: { clubId, title, frequency, startDate, endDate: neverEnd ? null : endDate, neverEnd },
        sessionTemplate: {
          clubId,
          title,
          date: startDate,
          ...sessionFields,
          sessionFee: sessionFields.sessionFee ? Math.round(sessionFields.sessionFee * 100) : undefined,
        },
        inviteePlayerIds: selectedInvitees.size > 0 ? Array.from(selectedInvitees) : undefined,
        publishWeeksBefore: recurringScheduleEnabled ? recurringWeeksBefore : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Recurring event created", description: `${data.sessions.length} sessions generated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setOpen(false);
      setRecurringScheduleEnabled(false);
      setRecurringWeeksBefore(1);
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create recurring event", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{prefillData ? "Copy as Recurring Event" : "Create Recurring Event"}</DialogTitle>
          <DialogDescription>{prefillData ? "Session details have been pre-filled. Set the schedule and adjust as needed." : "Sessions will be auto-generated based on the schedule"}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createRecurring.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="clubId" render={({ field }) => (
              <FormItem>
                <FormLabel>Club</FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                  <FormControl><SelectTrigger data-testid="select-recurring-club"><SelectValue placeholder="Select club" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {sessionClubs.map(club => (
                      <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="e.g. Weekly Club Night" {...field} data-testid="input-recurring-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-recurring-frequency"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Every 2 Weeks</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl><Input type="date" onChange={(e) => field.onChange(new Date(e.target.value))} data-testid="input-recurring-start-date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="neverEnd" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={(checked) => { field.onChange(checked); if (checked) form.setValue("endDate", null); }} data-testid="switch-never-end" />
                </FormControl>
                <FormLabel className="!mt-0">Never End</FormLabel>
                <FormDescription className="!mt-0 text-xs">Auto-generates up to 52 sessions</FormDescription>
              </FormItem>
            )} />
            {!watchNeverEnd && (
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl><Input type="date" onChange={(e) => field.onChange(new Date(e.target.value))} data-testid="input-recurring-end-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl><Input type="time" {...field} data-testid="input-recurring-start-time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (mins)</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-recurring-duration" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="maxPlayers" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Players</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-recurring-max-players" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="courtsAvailable" render={({ field }) => (
                <FormItem>
                  <FormLabel>Courts</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-recurring-courts" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="sessionFee" render={({ field }) => (
              <FormItem>
                <FormLabel>Session Fee (optional)</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} value={field.value ?? ""} data-testid="input-recurring-fee" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="matchMode" render={({ field }) => (
              <FormItem>
                <FormLabel>Match Mode</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger data-testid="select-recurring-match-mode"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                    <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <ScheduledPublishSection
              sessionDate={form.watch("startDate")}
              scheduleEnabled={recurringScheduleEnabled}
              setScheduleEnabled={setRecurringScheduleEnabled}
              weeksBefore={recurringWeeksBefore}
              setWeeksBefore={setRecurringWeeksBefore}
            />
            <InvitePlayersModal
              clubId={watchRecurringClubId}
              selectedPlayerIds={selectedInvitees}
              onSelectionChange={setSelectedInvitees}
            />
            <Button type="submit" className="w-full" disabled={createRecurring.isPending} data-testid="button-create-recurring">
              {createRecurring.isPending ? "Creating..." : "Create Recurring Event"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSessionDialog({ sessionClubs, initialOpen, onClose, prefillData }: { sessionClubs: { id: number; name: string }[]; initialOpen?: boolean; onClose?: () => void; prefillData?: Record<string, any> }) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const { mutate: create, isPending } = useCreateSession();
  const [selectedInvitees, setSelectedInvitees] = useState<Set<number>>(new Set());
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [weeksBefore, setWeeksBefore] = useState(1);
  
  const form = useForm<z.infer<typeof createSessionSchema>>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      clubId: prefillData?.clubId ?? (sessionClubs.length === 1 ? sessionClubs[0].id : (sessionClubs.length > 0 ? sessionClubs[0].id : undefined)),
      title: prefillData?.title ?? "",
      date: prefillData?.date ?? undefined,
      startTime: prefillData?.startTime ?? "18:00",
      maxPlayers: prefillData?.maxPlayers ?? 24,
      courtsAvailable: prefillData?.courtsAvailable ?? 4,
      matchMode: prefillData?.matchMode ?? "SOCIAL",
      isPrivate: prefillData?.isPrivate ?? false,
      genderRestriction: prefillData?.genderRestriction ?? "ALL",
      sessionType: prefillData?.sessionType ?? "OPEN",
      juniorAgeGroups: prefillData?.juniorAgeGroups ?? [],
      playersPerSide: prefillData?.playersPerSide ?? 2,
      matchGenderType: prefillData?.matchGenderType ?? "MIXED",
      durationMinutes: prefillData?.durationMinutes ?? 120,
      allowedCategories: prefillData?.allowedCategories ?? ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      sessionFee: prefillData?.sessionFee ?? undefined,
      shuttlecockType: prefillData?.shuttlecockType ?? undefined,
      liveStreamUrl: prefillData?.liveStreamUrl ?? undefined,
      defaultPointsToPlayTo: prefillData?.defaultPointsToPlayTo ?? 21,
      numberOfSets: prefillData?.numberOfSets ?? 1,
      sessionDetails: prefillData?.sessionDetails ?? "",
      hallName: prefillData?.hallName ?? "",
      courtNames: prefillData?.courtNames ?? [],
    }
  });

  const watchClubId = form.watch("clubId");
  const watchSessionType = form.watch("sessionType");
  const watchGenderRestriction = form.watch("genderRestriction");
  const watchDate = form.watch("date");
  const [courtNamesText, setCourtNamesText] = useState(prefillData?.courtNames?.join(", ") || "");
  const { data: venues } = useVenues(watchClubId || null);

  useEffect(() => {
    if (sessionClubs.length > 0 && !form.getValues("clubId")) {
      form.setValue("clubId", sessionClubs[0].id);
    }
  }, [sessionClubs, form]);

  function onSubmit(values: z.infer<typeof createSessionSchema>) {
    const publishAt = scheduleEnabled ? computePublishAt(values.date, weeksBefore) : null;
    const courtNamesArray = courtNamesText ? courtNamesText.split(",").map(s => s.trim()).filter(Boolean) : null;
    const payload = {
      ...values,
      courtNames: courtNamesArray,
      publishAt: publishAt?.toISOString() || null,
      inviteePlayerIds: selectedInvitees.size > 0 ? Array.from(selectedInvitees) : undefined,
    };
    create(payload as any, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setSelectedInvitees(new Set());
        setScheduleEnabled(false);
        setWeeksBefore(1);
        onClose?.();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) onClose?.(); }}>
      {!initialOpen && (
        <DialogTrigger asChild>
          <Button className="shadow-lg shadow-primary/25" data-testid="button-new-session">
            <Plus className="h-4 w-4 mr-2" /> New Session
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{prefillData ? "Copy Session" : "Create New Session"}</DialogTitle>
          {prefillData && <DialogDescription>All details have been pre-filled from the original session. Adjust as needed.</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-emerald-500" />
                      <FormLabel className="!mt-0 font-medium">Junior Session</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "JUNIORS_ONLY"}
                        onCheckedChange={(checked) => field.onChange(checked ? "JUNIORS_ONLY" : "OPEN")}
                        data-testid="toggle-session-type"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-session-club">
                        <SelectValue placeholder="Select club" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sessionClubs.map(club => (
                        <SelectItem key={club.id} value={club.id.toString()}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {venues && venues.length > 0 && (
              <FormField
                control={form.control}
                name="venueId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "none" ? undefined : Number(v))}
                      value={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-session-venue">
                          <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Select venue (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No venue selected</SelectItem>
                        {venues.map(venue => (
                          <SelectItem key={venue.id} value={venue.id.toString()}>
                            {venue.name}{venue.city ? ` - ${venue.city}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Friday Night Social" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sessionDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details about the session..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                      data-testid="input-session-details"
                    />
                  </FormControl>
                  <FormDescription>Optional notes visible to all players</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courtsAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courts</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hallName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hall Name / Number</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g. Main Hall, Hall 2" {...field} value={field.value || ""} data-testid="input-create-hall-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Court Names</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. Court 1, Court 2"
                    value={courtNamesText}
                    onChange={(e) => setCourtNamesText(e.target.value)}
                    data-testid="input-create-court-names"
                  />
                </FormControl>
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="matchMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SOCIAL">Social (Mixed)</SelectItem>
                      <SelectItem value="COMPETITIVE">Competitive (Ranked)</SelectItem>
                      <SelectItem value="TRAINING">Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="playersPerSide"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Players Per Side</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-players-per-side">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 (Singles)</SelectItem>
                        <SelectItem value="2">2 (Doubles)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="matchGenderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Gender Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-match-gender-type">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                        <SelectItem value="FEMALE">Female Only</SelectItem>
                        <SelectItem value="MALE">Male Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genderRestriction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender Restriction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender-restriction">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">Open to All</SelectItem>
                        <SelectItem value="FEMALE_ONLY">Females Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {watchGenderRestriction === "FEMALE_ONLY" ? "Only female players can sign up" : ""}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Access</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-session-access">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="false">Public</SelectItem>
                        <SelectItem value="true">Private (Invite Only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value ? "Only admins can add players" : "Anyone can sign up"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {watchSessionType === "JUNIORS_ONLY" && (
              <FormField
                control={form.control}
                name="juniorAgeGroups"
                render={() => (
                  <FormItem>
                    <FormLabel>Junior Age Groups</FormLabel>
                    <FormDescription>
                      Select which age groups can join this session.
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {JUNIOR_AGE_GROUPS.map((group) => (
                        <FormField
                          key={group.value}
                          control={form.control}
                          name="juniorAgeGroups"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.value)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = (field.value || []) as string[];
                                    if (checked) {
                                      field.onChange([...currentValue, group.value]);
                                    } else {
                                      field.onChange(currentValue.filter(v => v !== group.value));
                                    }
                                  }}
                                  data-testid={`checkbox-age-group-${group.value}`}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {group.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="allowedCategories"
              render={() => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Allowed Categories</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => {
                        const allValues = CATEGORIES.map(c => c.value);
                        const current = form.getValues("allowedCategories") || [];
                        if (current.length === allValues.length) {
                          form.setValue("allowedCategories", []);
                        } else {
                          form.setValue("allowedCategories", allValues);
                        }
                      }}
                      data-testid="button-select-all-categories"
                    >
                      {(form.watch("allowedCategories") || []).length === CATEGORIES.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  <FormDescription>
                    Select which player categories can join this session.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {CATEGORIES.map((category) => (
                      <FormField
                        key={category.value}
                        control={form.control}
                        name="allowedCategories"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(category.value)}
                                onCheckedChange={(checked) => {
                                  const currentValue = (field.value || []) as string[];
                                  if (checked) {
                                    field.onChange([...currentValue, category.value]);
                                  } else {
                                    field.onChange(currentValue.filter(v => v !== category.value));
                                  }
                                }}
                                data-testid={`checkbox-category-${category.value}`}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {category.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Fee (£)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="e.g. 5.00" 
                        {...field}
                        value={field.value != null ? field.value / 100 : ""}
                        onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                        data-testid="input-session-fee"
                      />
                    </FormControl>
                    <FormDescription>Leave empty to use club default</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shuttlecockType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shuttlecock-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="feather">Feather</SelectItem>
                        <SelectItem value="plastic">Plastic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="defaultPointsToPlayTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Points to Play To</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="21"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 21)}
                      data-testid="input-default-points"
                    />
                  </FormControl>
                  <FormDescription>Default score target for all matches (can be changed per match)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfSets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sets Per Match</FormLabel>
                  <Select
                    value={String(field.value || 1)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-number-of-sets">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 Set (Default)</SelectItem>
                      <SelectItem value="2">2 Sets</SelectItem>
                      <SelectItem value="3">Best of 3 Sets</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>How many sets each match will play</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="liveStreamUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Live Stream Link</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://youtube.com/live/... or any streaming URL"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-live-stream-url"
                    />
                  </FormControl>
                  <FormDescription>Optional link to any live streaming platform</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ScheduledPublishSection
              sessionDate={watchDate}
              scheduleEnabled={scheduleEnabled}
              setScheduleEnabled={setScheduleEnabled}
              weeksBefore={weeksBefore}
              setWeeksBefore={setWeeksBefore}
            />
            <InvitePlayersModal
              clubId={watchClubId}
              selectedPlayerIds={selectedInvitees}
              onSelectionChange={setSelectedInvitees}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-create-session">
              {isPending ? "Creating..." : "Create Session"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditSessionDialog({ session, venues: propVenues, adminClubs, externalOpen, onExternalClose }: { session: any; venues: any[]; adminClubs?: { id: number; name: string }[]; externalOpen?: boolean; onExternalClose?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (externalOpen !== undefined) {
      if (!val && onExternalClose) onExternalClose();
    } else {
      setInternalOpen(val);
    }
  };
  const { mutate: updateSession, isPending } = useUpdateSession();
  const [editClubId, setEditClubId] = useState<number>(session.clubId);
  const { data: venues } = useVenues(editClubId || null);
  const { toast } = useToast();

  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(120);
  const [editCourts, setEditCourts] = useState(0);
  const [editMaxPlayers, setEditMaxPlayers] = useState(0);
  const [editMatchMode, setEditMatchMode] = useState("SOCIAL");
  const [editPlayersPerSide, setEditPlayersPerSide] = useState(2);
  const [editMatchGenderType, setEditMatchGenderType] = useState("MIXED");
  const [editGenderRestriction, setEditGenderRestriction] = useState("ALL");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editSessionType, setEditSessionType] = useState("OPEN");
  const [editJuniorAgeGroups, setEditJuniorAgeGroups] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editSessionFee, setEditSessionFee] = useState("");
  const [editInvitees, setEditInvitees] = useState<Set<number>>(new Set());
  const [inviteesLoaded, setInviteesLoaded] = useState(false);
  const [editShuttlecockType, setEditShuttlecockType] = useState("");
  const [editDefaultPoints, setEditDefaultPoints] = useState(21);
  const [editVenueId, setEditVenueId] = useState<number | null>(null);
  const [editLiveStreamUrl, setEditLiveStreamUrl] = useState("");
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editNumberOfSets, setEditNumberOfSets] = useState(1);
  const [editSessionDetails, setEditSessionDetails] = useState("");
  const [editHallName, setEditHallName] = useState("");
  const [editCourtNames, setEditCourtNames] = useState("");
  const [editScheduleEnabled, setEditScheduleEnabled] = useState(false);
  const [editWeeksBefore, setEditWeeksBefore] = useState(1);
  const [showSeriesConfirm, setShowSeriesConfirm] = useState(false);

  const applyToSeriesMutation = useMutation({
    mutationFn: async ({ recurringEventId, fromDate, updates }: { recurringEventId: number; fromDate?: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/recurring-events/${recurringEventId}/apply-to-series`, { fromDate, updates });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Series Updated", description: data.message || "All sessions updated." });
      setOpen(false);
      setShowSeriesConfirm(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update series", variant: "destructive" });
    },
  });

  const updateInviteesMutation = useMutation({
    mutationFn: async (inviteePlayerIds: number[]) => {
      const res = await apiRequest("PATCH", `/api/sessions/${session.id}/invitees`, { inviteePlayerIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", session.id, "signups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update invitees", variant: "destructive" });
    },
  });

  const initializeForm = async () => {
    setEditClubId(session.clubId);
    setEditTitle(session.title || "");
    setEditDate(session.date ? format(new Date(session.date), "yyyy-MM-dd") : "");
    setEditStartTime(session.startTime || "18:00");
    setEditDuration(session.durationMinutes || 120);
    setEditCourts(session.courtsAvailable || 4);
    setEditMaxPlayers(session.maxPlayers || 24);
    setEditMatchMode(session.matchMode || "SOCIAL");
    setEditPlayersPerSide(session.playersPerSide || 2);
    setEditMatchGenderType(session.matchGenderType || "MIXED");
    setEditGenderRestriction(session.genderRestriction || "ALL");
    setEditIsPrivate(session.isPrivate || false);
    setEditSessionType(session.sessionType || "OPEN");
    setEditJuniorAgeGroups(session.juniorAgeGroups || []);
    setEditCategories(session.allowedCategories || ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"]);
    setEditSessionFee(session.sessionFee != null ? (session.sessionFee / 100).toFixed(2) : "");
    setEditShuttlecockType(session.shuttlecockType || "");
    setEditDefaultPoints(session.defaultPointsToPlayTo || 21);
    setEditVenueId(session.venueId || null);
    setEditLiveStreamUrl(session.liveStreamUrl || "");
    setEditShuttleTubes(session.shuttleTubesUsed || 0);
    setEditNumberOfSets(session.numberOfSets || 1);
    setEditSessionDetails(session.sessionDetails || "");
    setEditHallName(session.hallName || "");
    setEditCourtNames(session.courtNames?.join(", ") || "");
    if (session.publishAt) {
      setEditScheduleEnabled(true);
      const sessionDate = new Date(session.date);
      const pubDate = new Date(session.publishAt);
      const diffMs = sessionDate.getTime() - pubDate.getTime();
      const diffWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
      setEditWeeksBefore(diffWeeks);
    } else {
      setEditScheduleEnabled(false);
      setEditWeeksBefore(1);
    }
    
    try {
      const res = await fetch(`/api/sessions/${session.id}/signups`);
      if (res.ok) {
        const signups = await res.json();
        const invitedIds = new Set<number>(
          signups.filter((s: any) => s.signupStatus === "INVITED").map((s: any) => s.playerId)
        );
        setEditInvitees(invitedIds);
      }
    } catch {
      setEditInvitees(new Set());
    }
    setInviteesLoaded(true);
  };

  const [formInitialized, setFormInitialized] = useState(false);
  useEffect(() => {
    if (externalOpen && !formInitialized) {
      setFormInitialized(true);
      initializeForm();
    }
  }, [externalOpen]);

  const getUpdatesPayload = () => {
    const publishAt = editScheduleEnabled ? computePublishAt(editDate, editWeeksBefore) : null;
    return {
      clubId: editClubId,
      title: editTitle,
      date: editDate,
      startTime: editStartTime,
      durationMinutes: editDuration,
      courtsAvailable: editCourts,
      maxPlayers: editMaxPlayers,
      matchMode: editMatchMode,
      playersPerSide: editPlayersPerSide,
      matchGenderType: editMatchGenderType,
      genderRestriction: editGenderRestriction,
      isPrivate: editIsPrivate,
      sessionType: editSessionType,
      juniorAgeGroups: editJuniorAgeGroups,
      allowedCategories: editCategories,
      sessionFee: editSessionFee ? Math.round(parseFloat(editSessionFee) * 100) : null,
      shuttlecockType: editShuttlecockType || null,
      defaultPointsToPlayTo: editDefaultPoints,
      numberOfSets: editNumberOfSets,
      venueId: editVenueId,
      liveStreamUrl: editLiveStreamUrl || "",
      shuttleTubesUsed: editShuttleTubes,
      sessionDetails: editSessionDetails || null,
      hallName: editHallName || null,
      courtNames: editCourtNames ? editCourtNames.split(",").map(s => s.trim()).filter(Boolean) : null,
      publishAt: publishAt?.toISOString() || null,
      scheduleWeeksBefore: editScheduleEnabled ? editWeeksBefore : undefined,
    };
  };

  const handleSave = () => {
    if (session.recurringEventId) {
      setShowSeriesConfirm(true);
      return;
    }
    saveThisOnly();
  };

  const saveThisOnly = () => {
    const updates = getUpdatesPayload();
    updateSession({
      sessionId: session.id,
      updates,
    }, {
      onSuccess: () => {
        if (inviteesLoaded) {
          updateInviteesMutation.mutate(Array.from(editInvitees));
        }
        setOpen(false);
        setShowSeriesConfirm(false);
      }
    });
  };

  const saveAllFuture = () => {
    const { date, clubId, ...seriesUpdates } = getUpdatesPayload();
    applyToSeriesMutation.mutate({
      recurringEventId: session.recurringEventId,
      fromDate: session.date,
      updates: seriesUpdates,
    });
  };

  const venueList = venues || propVenues || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) initializeForm();
    }}>
      {externalOpen === undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg h-8 px-2 text-xs text-muted-foreground gap-1"
                data-testid={`button-edit-session-${session.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit Session</TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {adminClubs && adminClubs.length > 0 && (
            <div>
              <Label>Club</Label>
              <Select value={editClubId?.toString() || ""} onValueChange={(v) => { setEditClubId(Number(v)); setEditVenueId(null); setEditInvitees(new Set()); }}>
                <SelectTrigger className="mt-2" data-testid="select-edit-club">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {adminClubs.map((club: any) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Venue</Label>
            <Select value={editVenueId?.toString() || "none"} onValueChange={(v) => setEditVenueId(v === "none" ? null : Number(v))}>
              <SelectTrigger className="mt-2" data-testid="select-edit-venue">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No venue selected</SelectItem>
                {venueList.map((venue: any) => (
                  <SelectItem key={venue.id} value={venue.id.toString()}>
                    {venue.name}{venue.city ? ` - ${venue.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {venueList.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No venues configured for this club</p>
            )}
          </div>
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
          <div>
            <Label>Session Details</Label>
            <Textarea
              value={editSessionDetails}
              onChange={(e) => setEditSessionDetails(e.target.value)}
              placeholder="Add any additional details about the session..."
              className="mt-2 resize-none"
              rows={3}
              data-testid="input-edit-session-details"
            />
            <p className="text-xs text-muted-foreground mt-1">Optional notes visible to all players</p>
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
              <Label>Hall Name / Number</Label>
              <Input
                type="text"
                placeholder="e.g. Main Hall, Hall 2"
                value={editHallName}
                onChange={(e) => setEditHallName(e.target.value)}
                className="mt-2"
                data-testid="input-edit-hall-name"
              />
            </div>
            <div>
              <Label>Court Names</Label>
              <Input
                type="text"
                placeholder="e.g. Court 1, Court 2"
                value={editCourtNames}
                onChange={(e) => setEditCourtNames(e.target.value)}
                className="mt-2"
                data-testid="input-edit-court-names"
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
                data-testid="input-edit-shuttle-tubes"
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
            <div className="flex items-center justify-between">
              <Label>Allowed Categories</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => {
                  const allValues = CATEGORIES.map(c => c.value);
                  if (editCategories.length === allValues.length) {
                    setEditCategories([]);
                  } else {
                    setEditCategories([...allValues]);
                  }
                }}
                data-testid="button-edit-select-all-categories"
              >
                {editCategories.length === CATEGORIES.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-cat-${cat.value}`}
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
                  <label htmlFor={`edit-cat-${cat.value}`} className="text-sm cursor-pointer">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Points to Play To</Label>
              <Input
                type="number"
                min={1}
                className="mt-2"
                placeholder="21"
                value={editDefaultPoints || ""}
                onChange={(e) => setEditDefaultPoints(e.target.value ? Number(e.target.value) : 21)}
                data-testid="input-edit-default-points"
              />
            </div>
            <div>
              <Label>Sets Per Match</Label>
              <Select value={String(editNumberOfSets)} onValueChange={(v) => setEditNumberOfSets(Number(v))}>
                <SelectTrigger className="mt-2" data-testid="select-edit-number-of-sets">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Set (Default)</SelectItem>
                  <SelectItem value="2">2 Sets</SelectItem>
                  <SelectItem value="3">Best of 3 Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
          <ScheduledPublishSection
            sessionDate={editDate}
            scheduleEnabled={editScheduleEnabled}
            setScheduleEnabled={setEditScheduleEnabled}
            weeksBefore={editWeeksBefore}
            setWeeksBefore={setEditWeeksBefore}
          />
          <InvitePlayersModal
            clubId={editClubId}
            selectedPlayerIds={editInvitees}
            onSelectionChange={setEditInvitees}
          />
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isPending || applyToSeriesMutation.isPending || editCategories.length === 0 || !editTitle.trim()}
            data-testid="button-save-edit-session"
          >
            {isPending || applyToSeriesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {showSeriesConfirm && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 rounded-lg">
            <div className="space-y-4 text-center max-w-sm">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Repeat className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Recurring Session</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                This session is part of a recurring series. How would you like to apply your changes?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={saveThisOnly}
                  disabled={isPending}
                  variant="outline"
                  data-testid="button-save-this-only"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply to This Session Only
                </Button>
                <Button
                  onClick={saveAllFuture}
                  disabled={applyToSeriesMutation.isPending}
                  data-testid="button-save-all-future"
                >
                  {applyToSeriesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply to All Future Sessions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSeriesConfirm(false)}
                  data-testid="button-cancel-series-confirm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useSessions, useCreateSession, useUpdateSession } from "@/hooks/use-sessions";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useMySessionClubs, useMyAdminClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSessionSchema, insertRecurringEventSchema } from "@shared/schema";
import { Plus, Users, MapPin, Calendar, PoundSterling, CircleDot, Building2, Filter, Trash2, Loader2, Lock, Search, Video, Home, CheckCircle, ShieldAlert, Activity, Pencil, Wallet, Info, Repeat, CalendarPlus } from "lucide-react";
import { SessionDetailsModal, SessionFinanceModal } from "@/components/SessionDetailsModal";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useVenues } from "@/hooks/use-venues";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function Sessions() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();
  const { data: clubs } = useClubs();
  const { data: sessionClubs } = useMySessionClubs(!!user);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [clubScope, setClubScope] = useState<"my" | "all">("my");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [detailsSession, setDetailsSession] = useState<any>(null);
  const [financeSession, setFinanceSession] = useState<any>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<number | null>(null);
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const isSuperUser = user?.role === "OWNER";
  const canManageSessions = (sessionClubs && sessionClubs.length > 0) || false;
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);
  const editableClubIds = new Set(isSuperUser ? (clubs?.map(c => c.id) || []) : (adminClubs?.map(c => c.id) || []));

  const { data: memberships } = useQuery<{ clubId: number; membershipStatus: string }[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const myClubIds = useMemo(() => {
    if (!memberships) return new Set<number>();
    return new Set(memberships.filter(m => m.membershipStatus === "APPROVED").map(m => m.clubId));
  }, [memberships]);

  const displayClubs = useMemo(() => {
    if (isSuperUser || clubScope === "all") return clubs || [];
    return (clubs || []).filter(c => myClubIds.has(c.id));
  }, [clubs, clubScope, myClubIds, isSuperUser]);

  const getSessionAccess = (clubId: number): "allowed" | "denied" => {
    if (!user) return "denied";
    if (isSuperUser) return "allowed";
    const m = memberships?.find(m => m.clubId === clubId);
    return m?.membershipStatus === "APPROVED" ? "allowed" : "denied";
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
    mutationFn: async (recurringEventId: number) => {
      const res = await apiRequest("DELETE", `/api/recurring-events/${recurringEventId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Recurring Sessions Deleted", description: data.message });
      setDeleteRecurringId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const baseFilteredSessions = useMemo(() => {
    let result = sessions;
    if (!result) return [];
    if (!isSuperUser && clubScope === "my") {
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
  }, [sessions, selectedClubId, searchQuery, clubScope, myClubIds, isSuperUser]);

  const now = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

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
    if (statusFilter === "upcoming") return upcomingSessions;
    if (statusFilter === "live") return liveSessions;
    if (statusFilter === "past") return pastSessions;
    return [...liveSessions, ...upcomingSessions];
  }, [statusFilter, upcomingSessions, liveSessions, pastSessions]);

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
    <div className="space-y-8">
      <PageHeader 
        title="Sessions" 
        description="Book your spot for upcoming games."
        action={canManageSessions && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/calendar")}
              data-testid="button-import-from-calendar"
            >
              <Calendar className="h-4 w-4 mr-2" /> Import from Calendar
            </Button>
            <EventTypeChooser sessionClubs={sessionClubs || []} />
          </div>
        )}
      />

      <div className="flex items-center gap-3 flex-wrap">
        {!isSuperUser && (
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
            <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
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
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {canManageSessions && filteredSessions && filteredSessions.length > 0 && (
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1,2,3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />)}
        
        {filteredSessions?.map((session) => (
          <div key={session.id} className="relative">
            {managedClubIds.has(session.clubId) && (
              <div
                className="absolute top-4 left-4 z-10"
                onClick={(e) => toggleSelect(session.id, e)}
              >
                <Checkbox
                  checked={selectedIds.has(session.id)}
                  onCheckedChange={() => {}}
                  data-testid={`checkbox-session-${session.id}`}
                />
              </div>
            )}
            <Card className={`h-full border-border/50 group overflow-visible ${selectedIds.has(session.id) ? "ring-2 ring-primary" : ""}`}>
              <div className="h-2 bg-gradient-to-r from-primary to-secondary rounded-t-md" />
              <CardContent className="p-6">
                <div className={`flex justify-between items-start mb-4 gap-2 ${managedClubIds.has(session.clubId) ? "pl-8" : ""}`}>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant={session.matchMode === "COMPETITIVE" ? "destructive" : session.matchMode === "TRAINING" ? "outline" : "secondary"}>
                      {session.matchMode}
                    </Badge>
                    {clubs?.find(c => c.id === session.clubId)?.name && (
                      <Badge variant="outline" className="text-xs">
                        {clubs.find(c => c.id === session.clubId)!.name}
                      </Badge>
                    )}
                    {session.playersPerSide === 1 && (
                      <Badge variant="outline">Singles</Badge>
                    )}
                    {session.genderRestriction === "FEMALE_ONLY" && (
                      <Badge variant="secondary" className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">Females Only</Badge>
                    )}
                    {session.sessionType === "JUNIORS_ONLY" && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Juniors</Badge>
                    )}
                    {session.isPrivate && (
                      <Badge variant="outline">Private</Badge>
                    )}
                    {(session as any).recurringEventId && (
                      <Badge variant="outline" className="text-xs">
                        <Repeat className="h-3 w-3 mr-1" />
                        Recurring
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap">
                    {session.startTime}
                  </span>
                </div>
                
                <h3
                  className="text-xl font-bold mb-2 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 flex-wrap"
                  onClick={() => setDetailsSession(session)}
                  data-testid={`button-session-title-${session.id}`}
                >
                  {session.title}
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                </h3>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{session.signupCount || 0} / {session.maxPlayers} Players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{session.courtsAvailable} Courts Available</span>
                  </div>
                  {(session as any).venue && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{(session as any).venue.name}{(session as any).venue.city ? `, ${(session as any).venue.city}` : ''}</span>
                    </div>
                  )}
                  {session.sessionFee != null && (
                    <div className="flex items-center gap-2">
                      <PoundSterling className="h-4 w-4" />
                      <span>£{(session.sessionFee / 100).toFixed(2)} per session</span>
                    </div>
                  )}
                  {session.shuttlecockType && (
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4" />
                      <span>{session.shuttlecockType === 'feather' ? 'Feather' : session.shuttlecockType === 'plastic' ? 'Plastic' : 'Feather & Plastic'} shuttlecocks</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50 gap-2">
                  <span className="font-bold text-lg">
                    {format(new Date(session.date), "EEE, MMM d")}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {user && !isSuperUser && !editableClubIds.has(session.clubId) && (
                      getSessionAccess(session.clubId) === "denied" ? (
                        <Lock className="h-5 w-5 text-red-500" data-testid={`icon-session-locked-${session.id}`} />
                      ) : null
                    )}
                    {editableClubIds.has(session.clubId) ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setFinanceSession(session)} data-testid={`button-finance-session-${session.id}`}>
                          <Wallet className="h-4 w-4 mr-1" />
                          Finances
                        </Button>
                        <EditSessionDialog session={session} venues={[]} />
                        {(session as any).recurringEventId && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteRecurringId((session as any).recurringEventId)}
                            data-testid={`button-delete-recurring-${session.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete All
                          </Button>
                        )}
                        <Button size="sm" onClick={() => setLocation(`/sessions/${session.id}`)} data-testid={`button-run-session-${session.id}`}>
                          <Activity className="h-4 w-4 mr-1" />
                          Run Session
                        </Button>
                      </>
                    ) : (
                      <Link href={`/sessions/${session.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-details-session-${session.id}`}>
                          Details
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

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

      <Dialog open={!!deleteRecurringId} onOpenChange={(open) => { if (!open) setDeleteRecurringId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Recurring Sessions</DialogTitle>
            <DialogDescription>
              This will permanently delete all sessions linked to this recurring event, including their signups and match data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecurringId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteRecurringId && deleteRecurringMutation.mutate(deleteRecurringId)}
              disabled={deleteRecurringMutation.isPending}
              data-testid="button-confirm-delete-recurring"
            >
              {deleteRecurringMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete All Recurrences
            </Button>
          </DialogFooter>
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
    </div>
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

function RecurringEventDialog({ sessionClubs, initialOpen, onClose }: { sessionClubs: { id: number; name: string }[]; initialOpen?: boolean; onClose: () => void }) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const { toast } = useToast();

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
      clubId: sessionClubs.length > 0 ? sessionClubs[0].id : undefined,
      title: "",
      frequency: "WEEKLY",
      neverEnd: false,
      startTime: "18:00",
      durationMinutes: 120,
      maxPlayers: 24,
      courtsAvailable: 4,
      matchMode: "SOCIAL",
      allowedCategories: ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      playersPerSide: 2,
      matchGenderType: "MIXED",
      numberOfSets: 1,
      defaultPointsToPlayTo: 21,
      isPrivate: false,
      genderRestriction: "ALL",
      sessionType: "OPEN",
    }
  });

  const watchNeverEnd = form.watch("neverEnd");

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
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Recurring event created", description: `${data.sessions.length} sessions generated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setOpen(false);
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
          <DialogTitle>Create Recurring Event</DialogTitle>
          <DialogDescription>Sessions will be auto-generated based on the schedule</DialogDescription>
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
            <Button type="submit" className="w-full" disabled={createRecurring.isPending} data-testid="button-create-recurring">
              {createRecurring.isPending ? "Creating..." : "Create Recurring Event"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateSessionDialog({ sessionClubs, initialOpen, onClose }: { sessionClubs: { id: number; name: string }[]; initialOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const { mutate: create, isPending } = useCreateSession();
  
  const form = useForm<z.infer<typeof createSessionSchema>>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      clubId: sessionClubs.length === 1 ? sessionClubs[0].id : (sessionClubs.length > 0 ? sessionClubs[0].id : undefined),
      title: "",
      startTime: "18:00",
      maxPlayers: 24,
      courtsAvailable: 4,
      matchMode: "SOCIAL",
      isPrivate: false,
      genderRestriction: "ALL",
      sessionType: "OPEN",
      juniorAgeGroups: [],
      playersPerSide: 2,
      matchGenderType: "MIXED",
      durationMinutes: 120,
      allowedCategories: ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      sessionFee: undefined,
      shuttlecockType: undefined,
      liveStreamUrl: undefined,
      defaultPointsToPlayTo: 21,
      numberOfSets: 1,
    }
  });

  const watchClubId = form.watch("clubId");
  const watchSessionType = form.watch("sessionType");
  const watchGenderRestriction = form.watch("genderRestriction");
  const { data: venues } = useVenues(watchClubId || null);

  useEffect(() => {
    if (sessionClubs.length > 0 && !form.getValues("clubId")) {
      form.setValue("clubId", sessionClubs[0].id);
    }
  }, [sessionClubs, form]);

  function onSubmit(values: z.infer<typeof createSessionSchema>) {
    create(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
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
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-session-type">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OPEN">Open (All Ages)</SelectItem>
                      <SelectItem value="JUNIORS_ONLY">Juniors Only (Under 18)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>Allowed Categories</FormLabel>
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
                    <FormLabel>Shuttlecock Type</FormLabel>
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
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-create-session">
              {isPending ? "Creating..." : "Create Session"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditSessionDialog({ session, venues: propVenues }: { session: any; venues: any[] }) {
  const [open, setOpen] = useState(false);
  const { mutate: updateSession, isPending } = useUpdateSession();
  const { data: venues } = useVenues(session.clubId || null);

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
  const [editShuttlecockType, setEditShuttlecockType] = useState("");
  const [editDefaultPoints, setEditDefaultPoints] = useState(21);
  const [editVenueId, setEditVenueId] = useState<number | null>(null);
  const [editLiveStreamUrl, setEditLiveStreamUrl] = useState("");
  const [editShuttleTubes, setEditShuttleTubes] = useState(0);
  const [editNumberOfSets, setEditNumberOfSets] = useState(1);

  const initializeForm = () => {
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
  };

  const handleSave = () => {
    updateSession({
      sessionId: session.id,
      updates: {
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
      }
    }, {
      onSuccess: () => setOpen(false)
    });
  };

  const venueList = venues || propVenues || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) initializeForm();
    }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          data-testid={`button-edit-session-${session.id}`}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
          {venueList.length > 0 && (
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
            onClick={handleSave}
            disabled={isPending || editCategories.length === 0 || !editTitle.trim()}
            data-testid="button-save-edit-session"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Calendar as CalendarIcon, List, Grid3X3, Clock, MapPin,
  Users, LogOut, ChevronLeft, ChevronRight, AlertCircle, CalendarDays, LayoutList
} from "lucide-react";
import { Link } from "wouter";

interface MySession {
  signupId: number;
  sessionId: number;
  playerId: number;
  signupStatus: string;
  fee: number | null;
  paymentStatus: string | null;
  sessionTitle: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionDuration: number;
  sessionStatus: string;
  maxPlayers: number;
  courtsAvailable: number;
  clubId: number;
  clubName: string;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
}

type ViewMode = "list" | "grid" | "calendar" | "timeline";

function getStatusBadge(status: string) {
  switch (status) {
    case "CONFIRMED": return <Badge variant="default" className="bg-green-500 no-default-hover-elevate text-xs">Confirmed</Badge>;
    case "WAITING": return <Badge variant="secondary" className="no-default-hover-elevate text-xs">Waiting</Badge>;
    case "INVITED": return <Badge variant="outline" className="no-default-hover-elevate text-xs">Invited</Badge>;
    default: return <Badge variant="outline" className="no-default-hover-elevate text-xs">{status}</Badge>;
  }
}

function getSessionStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE": return <Badge variant="default" className="bg-green-500 no-default-hover-elevate text-xs">Live</Badge>;
    case "UPCOMING": return <Badge variant="secondary" className="no-default-hover-elevate text-xs">Upcoming</Badge>;
    case "COMPLETED": return <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate text-xs">Completed</Badge>;
    case "CANCELLED": return <Badge variant="destructive" className="no-default-hover-elevate text-xs">Cancelled</Badge>;
    default: return <Badge variant="outline" className="no-default-hover-elevate text-xs">{status}</Badge>;
  }
}

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function SessionCard({ session, selected, onSelect, onWithdraw, withdrawing }: {
  session: MySession;
  selected: boolean;
  onSelect: (id: number) => void;
  onWithdraw: (id: number) => void;
  withdrawing: boolean;
}) {
  const sessionDate = new Date(session.sessionDate);

  return (
    <div className="rounded-md border p-4 space-y-2" data-testid={`session-card-${session.sessionId}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelect(session.sessionId)}
          data-testid={`checkbox-session-${session.sessionId}`}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Link href={`/sessions/${session.sessionId}`} className="font-semibold text-sm hover:underline truncate" data-testid={`link-session-${session.sessionId}`}>
              {session.sessionTitle}
            </Link>
            <div className="flex items-center gap-1 flex-wrap">
              {getStatusBadge(session.signupStatus)}
              {getSessionStatusBadge(session.sessionStatus)}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {format(sessionDate, "EEE, dd MMM yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.sessionStartTime} ({session.sessionDuration}min)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>{session.clubName}</span>
            {session.venueName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {session.venueName}
              </span>
            )}
            {session.fee != null && (
              <span className="font-medium">{formatPounds(session.fee)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onWithdraw(session.sessionId)}
          disabled={withdrawing}
          data-testid={`button-withdraw-${session.sessionId}`}
        >
          <LogOut className="h-3 w-3 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
}

function ListView({ sessions, selectedIds, onSelect, onWithdraw, withdrawingId }: {
  sessions: MySession[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onWithdraw: (id: number) => void;
  withdrawingId: number | null;
}) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground" data-testid="text-no-sessions">No sessions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2" data-testid="view-list">
      {sessions.map(s => (
        <SessionCard
          key={s.signupId}
          session={s}
          selected={selectedIds.has(s.sessionId)}
          onSelect={onSelect}
          onWithdraw={onWithdraw}
          withdrawing={withdrawingId === s.sessionId}
        />
      ))}
    </div>
  );
}

function GridView({ sessions, selectedIds, onSelect, onWithdraw, withdrawingId }: {
  sessions: MySession[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onWithdraw: (id: number) => void;
  withdrawingId: number | null;
}) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No sessions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="view-grid">
      {sessions.map(s => {
        const sessionDate = new Date(s.sessionDate);
        return (
          <Card key={s.signupId} className="overflow-visible" data-testid={`grid-card-${s.sessionId}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selectedIds.has(s.sessionId)}
                  onCheckedChange={() => onSelect(s.sessionId)}
                />
                <div className="flex-1 min-w-0">
                  <Link href={`/sessions/${s.sessionId}`} className="font-semibold text-sm hover:underline block truncate">
                    {s.sessionTitle}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.clubName}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {getStatusBadge(s.signupStatus)}
                {getSessionStatusBadge(s.sessionStatus)}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{format(sessionDate, "EEE, dd MMM yyyy")}</p>
                <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.sessionStartTime} ({s.sessionDuration}min)</p>
                {s.venueName && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.venueName}</p>}
              </div>

              {s.fee != null && (
                <p className="text-sm font-medium">{formatPounds(s.fee)}</p>
              )}

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => onWithdraw(s.sessionId)}
                disabled={withdrawingId === s.sessionId}
                data-testid={`button-withdraw-grid-${s.sessionId}`}
              >
                <LogOut className="h-3 w-3 mr-1" />
                Withdraw
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TimelineView({ sessions, selectedIds, onSelect, onWithdraw, withdrawingId }: {
  sessions: MySession[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onWithdraw: (id: number) => void;
  withdrawingId: number | null;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, MySession[]> = {};
    sessions.forEach(s => {
      const key = format(new Date(s.sessionDate), "MMMM yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No sessions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="view-timeline">
      {Object.entries(grouped).map(([month, monthSessions]) => (
        <div key={month}>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">{month}</h3>
          <div className="relative pl-6 border-l-2 border-border space-y-3">
            {monthSessions.map(s => {
              const sessionDate = new Date(s.sessionDate);
              return (
                <div key={s.signupId} className="relative" data-testid={`timeline-item-${s.sessionId}`}>
                  <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-background border-2 border-primary" />
                  <div className="rounded-md border p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedIds.has(s.sessionId)}
                        onCheckedChange={() => onSelect(s.sessionId)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Link href={`/sessions/${s.sessionId}`} className="font-semibold text-sm hover:underline truncate">
                            {s.sessionTitle}
                          </Link>
                          <div className="flex items-center gap-1">
                            {getStatusBadge(s.signupStatus)}
                            {getSessionStatusBadge(s.sessionStatus)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>{format(sessionDate, "EEE dd MMM")} at {s.sessionStartTime}</span>
                          <span>{s.clubName}</span>
                          {s.venueName && <span>{s.venueName}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onWithdraw(s.sessionId)}
                        disabled={withdrawingId === s.sessionId}
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Withdraw
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ sessions, selectedIds, onSelect, onWithdraw, withdrawingId }: {
  sessions: MySession[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onWithdraw: (id: number) => void;
  withdrawingId: number | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, MySession[]>();
    sessions.forEach(s => {
      const key = format(new Date(s.sessionDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sessions]);

  const selectedDateSessions = selectedDate
    ? sessions.filter(s => isSameDay(new Date(s.sessionDate), selectedDate))
    : [];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4" data-testid="view-calendar">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="button-prev-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="button-next-month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDate.get(key) || [];
          const hasSession = daySessions.length > 0;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              className={`
                relative p-1 rounded-md text-center text-sm min-h-[40px] transition-colors
                ${isSelected ? "bg-primary text-primary-foreground" : ""}
                ${today && !isSelected ? "border border-primary" : ""}
                ${!isSelected && !today ? "hover:bg-muted" : ""}
              `}
              data-testid={`calendar-day-${key}`}
            >
              <span>{format(day, "d")}</span>
              {hasSession && (
                <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium">{format(selectedDate, "EEEE, dd MMMM yyyy")}</h4>
          {selectedDateSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions on this day</p>
          ) : (
            selectedDateSessions.map(s => (
              <SessionCard
                key={s.signupId}
                session={s}
                selected={selectedIds.has(s.sessionId)}
                onSelect={onSelect}
                onWithdraw={onWithdraw}
                withdrawing={withdrawingId === s.sessionId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MySessions() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const { data: sessions = [], isLoading } = useQuery<MySession[]>({
    queryKey: ["/api/my-sessions"],
    enabled: !!user,
  });

  const clubs = useMemo(() => {
    const map = new Map<number, string>();
    sessions.forEach(s => map.set(s.clubId, s.clubName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (clubFilter === "all") return sessions;
    return sessions.filter(s => s.clubId === parseInt(clubFilter));
  }, [sessions, clubFilter]);

  const handleSelect = (sessionId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allVisible = filtered.map(s => s.sessionId);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisible));
    }
  };

  const withdrawMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("POST", `/api/sessions/${sessionId}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-session-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-session-activity"] });
    },
  });

  const handleWithdraw = async (sessionId: number) => {
    setWithdrawingId(sessionId);
    try {
      await withdrawMutation.mutateAsync(sessionId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      toast({ title: "Withdrawn", description: "You have been removed from this session." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to withdraw", variant: "destructive" });
    } finally {
      setWithdrawingId(null);
    }
  };

  const [bulkWithdrawing, setBulkWithdrawing] = useState(false);

  const handleBulkWithdraw = async () => {
    setBulkWithdrawing(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        await apiRequest("POST", `/api/sessions/${id}/withdraw`);
        successCount++;
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/my-session-history"] });
    queryClient.invalidateQueries({ queryKey: ["/api/my-session-activity"] });
    setSelectedIds(new Set());
    setWithdrawDialogOpen(false);
    setBulkWithdrawing(false);
    toast({
      title: "Bulk Withdraw Complete",
      description: `Successfully withdrawn from ${successCount} of ${ids.length} session${ids.length !== 1 ? "s" : ""}.`,
    });
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-page" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Please log in to view your sessions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const viewButtons: { mode: ViewMode; icon: any; label: string }[] = [
    { mode: "list", icon: List, label: "List" },
    { mode: "grid", icon: Grid3X3, label: "Grid" },
    { mode: "calendar", icon: CalendarIcon, label: "Calendar" },
    { mode: "timeline", icon: LayoutList, label: "Timeline" },
  ];

  const allVisibleSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.sessionId));

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-page-title">
          <CalendarDays className="h-6 w-6 text-primary" />
          My Sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your upcoming and active sessions</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-club-filter">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {clubs.map(c => (
              <SelectItem key={c.id} value={c.id.toString()} data-testid={`filter-club-${c.id}`}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md overflow-visible">
          {viewButtons.map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="rounded-none first:rounded-l-md last:rounded-r-md"
              data-testid={`button-view-${mode}`}
            >
              <Icon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setWithdrawDialogOpen(true)}
              data-testid="button-bulk-withdraw"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Withdraw from {selectedIds.size} session{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{filtered.length} session{filtered.length !== 1 ? "s" : ""}{clubFilter !== "all" ? ` at ${clubs.find(c => c.id.toString() === clubFilter)?.name}` : ""}</p>

      {viewMode === "list" && (
        <ListView sessions={filtered} selectedIds={selectedIds} onSelect={handleSelect} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
      )}
      {viewMode === "grid" && (
        <GridView sessions={filtered} selectedIds={selectedIds} onSelect={handleSelect} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
      )}
      {viewMode === "calendar" && (
        <CalendarView sessions={filtered} selectedIds={selectedIds} onSelect={handleSelect} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
      )}
      {viewMode === "timeline" && (
        <TimelineView sessions={filtered} selectedIds={selectedIds} onSelect={handleSelect} onWithdraw={handleWithdraw} withdrawingId={withdrawingId} />
      )}

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="bg-background" data-testid="dialog-bulk-withdraw">
          <DialogHeader>
            <DialogTitle>Withdraw from {selectedIds.size} Session{selectedIds.size !== 1 ? "s" : ""}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            You will be removed from all selected sessions. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)} data-testid="button-cancel-bulk">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkWithdraw}
              disabled={bulkWithdrawing}
              data-testid="button-confirm-bulk-withdraw"
            >
              {bulkWithdrawing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

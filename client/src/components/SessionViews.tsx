import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, PoundSterling, Layers } from "lucide-react";
import { Link } from "wouter";

type SessionItem = {
  id: number;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxPlayers: number;
  signupCount?: number;
  courtsAvailable: number;
  matchMode: string;
  clubId: number;
  sessionFee?: number | null;
  status?: string;
  genderRestriction?: string;
  sessionType?: string;
  isPrivate?: boolean;
  recurringEventId?: number | null;
  [key: string]: any;
};

type SessionViewProps = {
  sessions: SessionItem[];
  clubs: any[];
  onSessionClick: (session: SessionItem) => void;
};

function SessionMiniCard({ session, clubs, onSessionClick }: { session: SessionItem; clubs: any[]; onSessionClick: (s: SessionItem) => void }) {
  const clubName = clubs?.find(c => c.id === session.clubId)?.name || "";
  const isPast = new Date(session.date) < new Date();
  const isLive = session.status === "ACTIVE";

  return (
    <div
      className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
        isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
        isPast ? "border-border/30 opacity-70" :
        "border-border/50 hover:border-primary/30"
      }`}
      onClick={() => onSessionClick(session)}
      data-testid={`session-mini-${session.id}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
        <span className="font-semibold text-sm truncate">{session.title}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.startTime}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {session.signupCount || 0}/{session.maxPlayers}
        </span>
        {clubName && <span className="truncate">{clubName}</span>}
      </div>
    </div>
  );
}

export function CalendarView({ sessions, clubs, onSessionClick }: SessionViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    sessions.forEach(s => {
      const key = format(new Date(s.date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [sessions]);

  const selectedDaySessions = selectedDay
    ? sessionsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const today = new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-bold text-base sm:text-lg" data-testid="text-calendar-month">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {day}
              </div>
            ))}

            {calendarDays.map((day, i) => {
              const key = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDay.get(key) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const hasLive = daySessions.some(s => s.status === "ACTIVE");

              return (
                <div
                  key={i}
                  className={`relative min-h-[52px] sm:min-h-[64px] p-1 rounded-md cursor-pointer transition-colors text-center ${
                    !isCurrentMonth ? "opacity-30" :
                    isSelected ? "bg-primary/10 ring-1 ring-primary" :
                    isToday ? "bg-accent" :
                    "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedDay(day)}
                  data-testid={`calendar-day-${key}`}
                >
                  <span className={`text-xs sm:text-sm ${isToday ? "font-bold text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {daySessions.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
                      {daySessions.slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasLive && s.status === "ACTIVE" ? "bg-green-500" :
                            s.matchMode === "COMPETITIVE" ? "bg-red-500" :
                            s.matchMode === "TRAINING" ? "bg-amber-500" :
                            "bg-primary"
                          }`}
                        />
                      ))}
                      {daySessions.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{daySessions.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground" data-testid="text-selected-date">
            {format(selectedDay, "EEEE, d MMMM yyyy")} — {selectedDaySessions.length} session{selectedDaySessions.length !== 1 ? "s" : ""}
          </h4>
          {selectedDaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sessions on this day</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {selectedDaySessions.map(s => (
                <SessionMiniCard key={s.id} session={s} clubs={clubs} onSessionClick={onSessionClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TimelineView({ sessions, clubs, onSessionClick }: SessionViewProps) {
  const grouped = useMemo(() => {
    const groups: { label: string; key: string; sessions: SessionItem[] }[] = [];
    const map = new Map<string, SessionItem[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sessions.forEach(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      let label: string;
      if (isSameDay(d, today)) {
        label = "Today";
      } else if (isSameDay(d, addDays(today, 1))) {
        label = "Tomorrow";
      } else if (d < today) {
        label = format(d, "EEEE, d MMMM yyyy");
      } else {
        label = format(d, "EEEE, d MMMM yyyy");
      }
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ label, key, sessions: map.get(key)! });
      }
      map.get(key)!.push(s);
    });

    groups.sort((a, b) => a.key.localeCompare(b.key));
    return groups;
  }, [sessions]);

  if (sessions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sessions to display</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {grouped.map(group => {
          const isToday = group.label === "Today";
          const isTomorrow = group.label === "Tomorrow";
          const isPast = new Date(group.key) < new Date(new Date().toDateString());

          return (
            <div key={group.key} className="relative" data-testid={`timeline-group-${group.key}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`relative z-10 w-3 h-3 rounded-full border-2 ${
                  isToday ? "bg-primary border-primary" :
                  isTomorrow ? "bg-blue-500 border-blue-500" :
                  isPast ? "bg-muted border-muted-foreground/30" :
                  "bg-background border-primary"
                }`} />
                <h3 className={`font-bold text-sm ${
                  isToday ? "text-primary" :
                  isPast ? "text-muted-foreground" :
                  ""
                }`}>
                  {group.label}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="ml-8 sm:ml-10 space-y-2">
                {group.sessions
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(s => (
                    <SessionMiniCard key={s.id} session={s} clubs={clubs} onSessionClick={onSessionClick} />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GroupedView({ sessions, clubs, onSessionClick }: SessionViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const titleMap = new Map<string, SessionItem[]>();

    sessions.forEach(s => {
      const normalizedTitle = s.title.trim().toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*[-–]\s*week\s*\d+/i, "")
        .replace(/\s*#\d+/i, "")
        .replace(/\s*\d{1,2}[\/\-]\d{1,2}/i, "");

      if (!titleMap.has(normalizedTitle)) {
        titleMap.set(normalizedTitle, []);
      }
      titleMap.get(normalizedTitle)!.push(s);
    });

    const result = Array.from(titleMap.entries()).map(([key, sessions]) => {
      const sorted = sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const displayTitle = sorted[0].title;
      const clubIds = [...new Set(sorted.map(s => s.clubId))];
      const clubNames = clubIds.map(id => clubs?.find(c => c.id === id)?.name || "").filter(Boolean);
      const isRecurring = sorted.length > 1;

      const nextSession = sorted.find(s => new Date(s.date) >= new Date(new Date().toDateString()));
      const totalSignups = sorted.reduce((sum, s) => sum + (s.signupCount || 0), 0);

      let dayPattern = "";
      if (isRecurring && sorted.length >= 2) {
        const days = sorted.map(s => format(new Date(s.date), "EEEE"));
        const uniqueDays = [...new Set(days)];
        if (uniqueDays.length === 1) {
          dayPattern = `Every ${uniqueDays[0]}`;
        } else if (uniqueDays.length <= 3) {
          dayPattern = uniqueDays.join(" & ");
        }
      }

      return {
        key,
        displayTitle,
        sessions: sorted,
        clubNames,
        isRecurring,
        nextSession,
        totalSignups,
        dayPattern,
        upcomingCount: sorted.filter(s => new Date(s.date) >= new Date(new Date().toDateString())).length,
        pastCount: sorted.filter(s => new Date(s.date) < new Date(new Date().toDateString())).length,
      };
    });

    result.sort((a, b) => {
      const aNext = a.nextSession ? new Date(a.nextSession.date).getTime() : Infinity;
      const bNext = b.nextSession ? new Date(b.nextSession.date).getTime() : Infinity;
      return aNext - bNext;
    });

    return result;
  }, [sessions, clubs]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (sessions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sessions to display</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.key);

        return (
          <Card key={group.key} className="border-border/50" data-testid={`session-group-${group.key}`}>
            <CardContent className="p-0">
              <div
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleGroup(group.key)}
                data-testid={`button-toggle-group-${group.key}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-base truncate">{group.displayTitle}</h3>
                    {group.isRecurring && (
                      <Badge variant="secondary" className="text-xs">
                        <Layers className="h-3 w-3 mr-1" />
                        {group.sessions.length}x
                      </Badge>
                    )}
                    {group.clubNames.map((name, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {group.dayPattern && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {group.dayPattern}
                      </span>
                    )}
                    {group.nextSession && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {format(new Date(group.nextSession.date), "EEE, d MMM")} at {group.nextSession.startTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.totalSignups} total signups
                    </span>
                    {group.upcomingCount > 0 && (
                      <Badge variant="outline" className="text-[10px]">{group.upcomingCount} upcoming</Badge>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t px-3 sm:px-4 py-2 space-y-2">
                  {group.sessions.map(s => {
                    const isPast = new Date(s.date) < new Date(new Date().toDateString());
                    const isLive = s.status === "ACTIVE";

                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                          isLive ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" :
                          isPast ? "border-border/30 opacity-60" :
                          "border-border/50 hover:border-primary/30"
                        }`}
                        onClick={() => onSessionClick(s)}
                        data-testid={`grouped-session-${s.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isLive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                          <div className="min-w-0">
                            <span className="font-medium text-sm">
                              {format(new Date(s.date), "EEE, d MMM")}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{s.startTime}</span>
                              <span>·</span>
                              <span>{s.signupCount || 0}/{s.maxPlayers} players</span>
                              {s.sessionFee != null && (
                                <>
                                  <span>·</span>
                                  <span>£{(s.sessionFee / 100).toFixed(2)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLive && <Badge className="bg-green-600 text-white text-[10px]">LIVE</Badge>}
                          {isPast && <Badge variant="outline" className="text-[10px]">Past</Badge>}
                          <Link href={`/sessions/${s.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs" data-testid={`button-view-grouped-${s.id}`}>
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

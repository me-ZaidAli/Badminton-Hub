import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Calendar, Loader2, MapPin, Sun, ExternalLink } from "lucide-react";

interface CoachAvail {
  id: number;
  fullName: string;
  profilePhoto?: string;
  city?: string;
  roleTitle?: string;
  holidayMode: boolean;
  slotDurationMinutes: number;
  defaultPricePence: number;
  rules: { dayOfWeek: number; startTime: string; endTime: string }[];
  overrides: { date: string; isClosed: boolean; startTime?: string | null; endTime?: string | null }[];
}
interface MonthResp { month: string; coaches: CoachAvail[] }

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABEL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function fmtDay(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function initials(name: string) { return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }

// Returns the windows a coach is available on a specific date, factoring overrides + holiday.
function windowsForDate(c: CoachAvail, dateStr: string, dow: number): { start: string; end: string }[] {
  if (c.holidayMode) return [];
  const ov = c.overrides.find((o) => o.date === dateStr);
  if (ov) {
    if (ov.isClosed) return [];
    if (ov.startTime && ov.endTime) return [{ start: ov.startTime, end: ov.endTime }];
  }
  return c.rules.filter((r) => r.dayOfWeek === dow).map((r) => ({ start: r.startTime, end: r.endTime }));
}

export default function CoachesAvailabilityCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(fmtDay(today.getFullYear(), today.getMonth(), today.getDate()));

  const monthStr = fmtMonth(cursor);
  const { data, isLoading } = useQuery<MonthResp>({
    queryKey: ["/api/coaches/availability-month", monthStr],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/availability-month?month=${monthStr}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load availability");
      return r.json();
    },
  });

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid: ({ date: string; day: number; dow: number; inMonth: boolean } | null)[] = [];
    // Leading blanks
    for (let i = 0; i < firstDow; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ date: fmtDay(y, m, d), day: d, dow: new Date(y, m, d).getDay(), inMonth: true });
    }
    // Trailing blanks to fill the last row
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [cursor]);

  // Available coaches per day for the visible month
  const availPerDay = useMemo(() => {
    const map = new Map<string, CoachAvail[]>();
    if (!data) return map;
    for (const cell of cells) {
      if (!cell) continue;
      const list = data.coaches.filter((c) => windowsForDate(c, cell.date, cell.dow).length > 0);
      map.set(cell.date, list);
    }
    return map;
  }, [data, cells]);

  const selectedDow = useMemo(() => {
    const [yy, mm, dd] = selectedDate.split("-").map(Number);
    return new Date(yy, mm - 1, dd).getDay();
  }, [selectedDate]);
  const selectedCoaches = useMemo(() => {
    if (!data) return [] as CoachAvail[];
    return data.coaches.filter((c) => windowsForDate(c, selectedDate, selectedDow).length > 0);
  }, [data, selectedDate, selectedDow]);

  const todayStr = fmtDay(today.getFullYear(), today.getMonth(), today.getDate());

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(fmtDay(t.getFullYear(), t.getMonth(), t.getDate()));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-violet-400/20 bg-gradient-to-br from-violet-600/15 via-fuchsia-500/5 to-cyan-500/10 backdrop-blur-xl">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="rounded-xl p-2.5 bg-violet-500/20 border border-violet-400/30">
            <Calendar className="w-5 h-5 text-violet-200" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-lg font-bold text-white" data-testid="text-month-title">{MONTH_LABEL[cursor.getMonth()]} {cursor.getFullYear()}</h2>
            <p className="text-xs text-zinc-400">Tap any day to see which coaches are available.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={goToday} data-testid="button-today">Today</Button>
            <Button variant="outline" size="sm" onClick={goNext} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
        <CardContent className="p-3 md:p-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DOW_LABEL.map((d) => (
                  <div key={d} className="text-[10px] uppercase tracking-wider text-center text-zinc-500 font-semibold">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={`b-${idx}`} className="aspect-square" />;
                  const list = availPerDay.get(cell.date) ?? [];
                  const isSel = cell.date === selectedDate;
                  const isToday = cell.date === todayStr;
                  const isPast = cell.date < todayStr;
                  const count = list.length;
                  const hot = count >= 3;
                  return (
                    <button
                      key={cell.date}
                      onClick={() => setSelectedDate(cell.date)}
                      disabled={isPast}
                      className={`relative aspect-square rounded-lg border text-left p-1.5 transition flex flex-col ${
                        isSel
                          ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_18px_rgba(168,85,247,0.4)]"
                          : isPast
                            ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
                            : count === 0
                              ? "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/10"
                              : hot
                                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400"
                                : "border-violet-400/30 bg-violet-500/5 text-zinc-200 hover:border-violet-400/60"
                      }`}
                      data-testid={`button-day-${cell.date}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-sm font-bold ${isToday && !isSel ? "text-violet-300" : ""}`}>{cell.day}</span>
                        {isToday && <span className="text-[8px] px-1 rounded-full bg-violet-500/30 text-violet-100 uppercase tracking-wider">Today</span>}
                      </div>
                      {!isPast && count > 0 && (
                        <div className="mt-auto flex items-center gap-1 text-[10px] font-semibold">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${hot ? "bg-emerald-400" : "bg-violet-400"}`} />
                          {count} {count === 1 ? "coach" : "coaches"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-zinc-500">
                <div className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /> 3+ available</div>
                <div className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" /> 1–2 available</div>
                <div className="flex items-center gap-1 opacity-70"><span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-600" /> No coaches</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected day list */}
      <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-violet-300" />
            <h3 className="font-bold text-white">{selectedDate} — {selectedCoaches.length} {selectedCoaches.length === 1 ? "coach" : "coaches"} available</h3>
          </div>
          {selectedCoaches.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">
              <Sun className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No coaches have published availability for this date yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="list-day-coaches">
              {selectedCoaches.map((c) => {
                const wins = windowsForDate(c, selectedDate, selectedDow);
                return (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex gap-3">
                    <Avatar className="h-12 w-12 border border-violet-400/30">
                      {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={c.fullName} className="object-cover" /> : null}
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold">{initials(c.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-zinc-100 truncate" data-testid={`text-coach-${c.id}`}>{c.fullName}</div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {c.roleTitle || "Coach"}
                        {c.city ? <> · <MapPin className="inline w-3 h-3 -mt-0.5" /> {c.city}</> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {wins.map((w, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-violet-400/40 text-violet-200 bg-violet-500/10">
                            {w.start}–{w.end}
                          </Badge>
                        ))}
                        {c.defaultPricePence > 0 && (
                          <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-200 bg-emerald-500/10">
                            from £{(c.defaultPricePence / 100).toFixed(0)}
                          </Badge>
                        )}
                      </div>
                      <Link href={`/coach/${c.id}`}>
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" data-testid={`link-book-${c.id}`}>
                          <ExternalLink className="w-3 h-3 mr-1" />Book
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
    </div>
  );
}

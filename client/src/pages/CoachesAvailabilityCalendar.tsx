import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft, ChevronRight, Calendar, Loader2, MapPin, Sun, ExternalLink,
  Users, X, PoundSterling, Clock, Check,
} from "lucide-react";

interface CoachAvail {
  id: number;
  fullName: string;
  profilePhoto?: string;
  city?: string;
  roleTitle?: string;
  holidayMode: boolean;
  slotDurationMinutes: number;
  defaultPricePence: number;
  advanceNoticeHours?: number;
  maxAdvanceDays?: number;
  rules: { dayOfWeek: number; startTime: string; endTime: string }[];
  overrides: { date: string; isClosed: boolean; startTime?: string | null; endTime?: string | null }[];
}
interface MonthResp { month: string; coaches: CoachAvail[] }
interface PriceTier { id: string; label: string; pricePence: number; durationMinutes: number; maxParticipants: number; sortOrder?: number }
interface SummaryResp {
  rules: { id: number; dayOfWeek: number; startTime: string; endTime: string }[];
  settings: { slotDurationMinutes: number; defaultPricePence: number; priceTiers?: PriceTier[]; holidayMode: boolean; holidayMessage?: string } | null;
}
interface Slot { time: string; available: boolean; reason?: string }

const DOW_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABEL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtMonth(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function fmtDay(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function initials(name: string) { return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }

function windowsForDate(c: CoachAvail, dateStr: string, dow: number): { start: string; end: string }[] {
  if (c.holidayMode) return [];
  const ov = c.overrides.find((o) => o.date === dateStr);
  if (ov) {
    if (ov.isClosed) return [];
    if (ov.startTime && ov.endTime) return [{ start: ov.startTime, end: ov.endTime }];
  }
  return c.rules.filter((r) => r.dayOfWeek === dow).map((r) => ({ start: r.startTime, end: r.endTime }));
}

// True if this coach has a bookable window AND the date is inside the
// configured booking window (max-advance + not in the past). The calendar
// uses this so the dot only lights up on dates the user can ACTUALLY book —
// otherwise users tap a future Monday and get a confusing empty list.
function isBookableForDate(c: CoachAvail, dateStr: string, dow: number, todayStr: string): boolean {
  if (dateStr < todayStr) return false;
  const max = c.maxAdvanceDays ?? 60;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const diffDays = Math.floor(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000,
  );
  if (diffDays > max) return false;
  return windowsForDate(c, dateStr, dow).length > 0;
}

// Find the next date this coach is bookable on (within their booking window).
function nextBookableDate(c: CoachAvail, fromDateStr: string): string | null {
  const max = c.maxAdvanceDays ?? 60;
  const [y, m, d] = fromDateStr.split("-").map(Number);
  for (let i = 1; i <= max; i++) {
    const dt = new Date(y, m - 1, d + i);
    const ds = fmtDay(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (isBookableForDate(c, ds, dt.getDay(), fromDateStr)) return ds;
  }
  return null;
}

export default function CoachesAvailabilityCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(fmtDay(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [bookCoachId, setBookCoachId] = useState<number | null>(null);
  const [bookDate, setBookDate] = useState<string | null>(null);
  const [bookSlot, setBookSlot] = useState<string | null>(null);

  const monthStr = fmtMonth(cursor);
  const { data, isLoading } = useQuery<MonthResp>({
    queryKey: ["/api/coaches/availability-month", monthStr],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/availability-month?month=${monthStr}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load availability");
      return r.json();
    },
  });

  const visibleCoaches = useMemo(() => {
    if (!data) return [] as CoachAvail[];
    return selectedCoachId ? data.coaches.filter((c) => c.id === selectedCoachId) : data.coaches;
  }, [data, selectedCoachId]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid: ({ date: string; day: number; dow: number } | null)[] = [];
    for (let i = 0; i < firstDow; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ date: fmtDay(y, m, d), day: d, dow: new Date(y, m, d).getDay() });
    }
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [cursor]);

  const todayStr = fmtDay(today.getFullYear(), today.getMonth(), today.getDate());

  const availPerDay = useMemo(() => {
    const map = new Map<string, CoachAvail[]>();
    for (const cell of cells) {
      if (!cell) continue;
      const list = visibleCoaches.filter((c) => isBookableForDate(c, cell.date, cell.dow, todayStr));
      map.set(cell.date, list);
    }
    return map;
  }, [visibleCoaches, cells, todayStr]);

  const selectedDow = useMemo(() => {
    const [yy, mm, dd] = selectedDate.split("-").map(Number);
    return new Date(yy, mm - 1, dd).getDay();
  }, [selectedDate]);
  const selectedCoaches = useMemo(() => {
    return visibleCoaches.filter((c) => isBookableForDate(c, selectedDate, selectedDow, todayStr));
  }, [visibleCoaches, selectedDate, selectedDow, todayStr]);

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(fmtDay(t.getFullYear(), t.getMonth(), t.getDate()));
  };

  const openBooking = (coachId: number, date: string, time?: string) => {
    setBookCoachId(coachId);
    setBookDate(date);
    setBookSlot(time ?? null);
  };
  const handleDayClick = (date: string, _dow: number) => {
    setSelectedDate(date);
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
            <p className="text-xs text-zinc-400">Tap a coach to filter, then a day to book a session.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} data-testid="button-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={goToday} data-testid="button-today">Today</Button>
            <Button variant="outline" size="sm" onClick={goNext} data-testid="button-next-month"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Coach avatar strip */}
      <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-violet-300" />
            <h3 className="text-sm font-bold text-white">Coaches</h3>
            {selectedCoachId && (
              <button onClick={() => setSelectedCoachId(null)} className="ml-auto text-[11px] text-zinc-400 hover:text-violet-300 inline-flex items-center gap-1" data-testid="button-clear-coach-filter">
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>
          {isLoading || !data ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
          ) : data.coaches.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No coaches available yet.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {data.coaches.map((c) => {
                const active = selectedCoachId === c.id;
                const dimmed = selectedCoachId && !active;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCoachId(active ? null : c.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 transition ${dimmed ? "opacity-40 hover:opacity-70" : ""}`}
                    data-testid={`button-filter-coach-${c.id}`}
                    title={c.fullName}
                  >
                    <div className={`relative rounded-full ${active ? "ring-2 sm:ring-4 ring-violet-400 shadow-[0_0_16px_rgba(168,85,247,0.6)]" : "ring-2 ring-white/10 hover:ring-violet-400/60"} transition`}>
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={c.fullName} className="object-cover" /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xs font-bold">{initials(c.fullName)}</AvatarFallback>
                      </Avatar>
                      {active && (
                        <span className="absolute -bottom-0.5 -right-0.5 bg-violet-500 rounded-full p-0.5 border-2 border-zinc-950">
                          <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-medium max-w-[56px] sm:max-w-[64px] truncate ${active ? "text-violet-200" : "text-zinc-400"}`}>
                      {c.fullName.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                      onClick={() => handleDayClick(cell.date, cell.dow)}
                      disabled={isPast}
                      className={`relative aspect-square rounded-md sm:rounded-lg border text-center transition flex flex-col items-center justify-center ${
                        isSel
                          ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_18px_rgba(168,85,247,0.4)]"
                          : isPast
                            ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
                            : count === 0
                              ? "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/10"
                              : selectedCoachId
                                ? "border-violet-400/50 bg-violet-500/15 text-violet-100 hover:border-violet-400 cursor-pointer"
                                : hot
                                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400"
                                  : "border-violet-400/30 bg-violet-500/5 text-zinc-200 hover:border-violet-400/60"
                      }`}
                      data-testid={`button-day-${cell.date}`}
                    >
                      {isToday && !isSel && (
                        <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-violet-300" />
                      )}
                      <span className={`text-xs sm:text-sm font-bold leading-none ${isToday && !isSel ? "text-violet-200" : ""}`}>{cell.day}</span>
                      {!isPast && count > 0 && (
                        <div className="mt-0.5 sm:mt-1 flex items-center justify-center gap-0.5">
                          {selectedCoachId ? (
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-violet-400" />
                          ) : (
                            <span className={`text-[9px] sm:text-[10px] font-semibold leading-none px-1 rounded-full ${hot ? "bg-emerald-500/30 text-emerald-100" : "bg-violet-500/30 text-violet-100"}`}>{count}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-zinc-500">
                {selectedCoachId ? (
                  <>
                    <div className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" /> Coach is open — tap to book</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /> 3+ available</div>
                    <div className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" /> 1–2 available</div>
                    <div className="flex items-center gap-1 opacity-70"><span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-600" /> No coaches</div>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected day list — always visible so users get feedback when they tap. */}
      {(
        <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-violet-300" />
              <h3 className="font-bold text-white">{selectedDate} — {selectedCoaches.length} {selectedCoaches.length === 1 ? "coach" : "coaches"} available</h3>
            </div>
            {selectedCoaches.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-4 text-sm text-zinc-500">
                  <Sun className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No coaches are open on this day.
                </div>
                {/* Show every coach with their next available date so the user
                    has a one-tap path to a bookable day. */}
                <div className="space-y-2" data-testid="list-day-coaches-empty">
                  {visibleCoaches.map((c) => {
                    const nxt = nextBookableDate(c, selectedDate < todayStr ? todayStr : selectedDate);
                    return (
                      <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3" data-testid={`row-next-open-${c.id}`}>
                        <Avatar className="h-9 w-9 border border-violet-400/30 flex-shrink-0">
                          {c.profilePhoto ? <AvatarImage src={c.profilePhoto} alt={c.fullName} className="object-cover" /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-[10px] font-bold">{initials(c.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-zinc-100 truncate">{c.fullName}</div>
                          <div className="text-[11px] text-zinc-400">
                            {nxt ? <>Next open: <span className="text-violet-200 font-medium">{fmtPrettyDate(nxt)}</span></> : "No open days in the booking window"}
                          </div>
                        </div>
                        {nxt && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setSelectedDate(nxt)} data-testid={`button-goto-next-${c.id}`}>
                            Go
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-day-coaches">
                {selectedCoaches.map((c) => (
                  <CoachDaySlots
                    key={c.id}
                    coach={c}
                    date={selectedDate}
                    onPickSlot={(time) => openBooking(c.id, selectedDate, time)}
                    onBook={() => openBooking(c.id, selectedDate)}
                    onJumpToDate={(d) => setSelectedDate(d)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Dialog */}
      {(() => {
        if (!bookCoachId || !bookDate || !data) return null;
        const coach = data.coaches.find((c) => c.id === bookCoachId);
        if (!coach) return null;
        return (
          <BookSessionDialog
            coach={coach}
            date={bookDate}
            initialSlot={bookSlot}
            onClose={() => { setBookCoachId(null); setBookDate(null); setBookSlot(null); }}
          />
        );
      })()}
    </div>
  );
}

function fmtPrettyDate(ds: string) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Per-coach inline slot row on the selected-day card ────────────────────
function CoachDaySlots({ coach, date, onPickSlot, onBook, onJumpToDate }: { coach: CoachAvail; date: string; onPickSlot: (time: string) => void; onBook: () => void; onJumpToDate?: (d: string) => void }) {
  const { data, isLoading } = useQuery<{ slots: Slot[] }>({
    queryKey: [`/api/coaches/${coach.id}/availability-slots`, date],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/${coach.id}/availability-slots?date=${date}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load slots");
      return r.json();
    },
  });
  const slots = data?.slots ?? [];
  const open = slots.filter((s) => s.available);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`card-coach-${coach.id}`}>
      <div className="flex items-center gap-3 mb-2">
        <Avatar className="h-10 w-10 border border-violet-400/30 flex-shrink-0">
          {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} className="object-cover" /> : null}
          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xs font-bold">{initials(coach.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-100 text-sm truncate" data-testid={`text-coach-${coach.id}`}>{coach.fullName}</div>
          <div className="text-[10px] text-zinc-400 truncate">
            {coach.roleTitle || "Coach"}
            {coach.city ? <> · <MapPin className="inline w-3 h-3 -mt-0.5" /> {coach.city}</> : null}
          </div>
        </div>
        <Link href={`/coach/${coach.id}`}>
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" data-testid={`link-profile-${coach.id}`}>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-violet-400" /></div>
      ) : open.length === 0 ? (
        (() => {
          const nxt = nextBookableDate(coach, date);
          const reason = slots.length === 0
            ? (coach.holidayMode
                ? "Coach is on holiday."
                : (coach.rules.length === 0
                    ? "This coach hasn't set any weekly hours yet."
                    : "Coach is closed on this day."))
            : "All times are booked or past the cut-off.";
          return (
            <div className="space-y-1.5">
              <p className="text-[11px] text-amber-300/80 italic" data-testid={`text-empty-reason-${coach.id}`}>{reason}</p>
              {nxt && onJumpToDate && (
                <button
                  onClick={() => onJumpToDate(nxt)}
                  className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 underline inline-flex items-center gap-1"
                  data-testid={`button-jump-next-${coach.id}`}
                >
                  Next open: {fmtPrettyDate(nxt)} →
                </button>
              )}
            </div>
          );
        })()
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-wider text-violet-200 mb-1.5 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Tap a time to book
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
            {open.slice(0, 18).map((s) => (
              <button
                key={s.time}
                onClick={() => onPickSlot(s.time)}
                className="px-1.5 py-1.5 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 text-xs font-semibold hover:border-violet-400 hover:bg-violet-500/25 transition"
                data-testid={`button-pick-slot-${coach.id}-${s.time}`}
              >
                {s.time}
              </button>
            ))}
          </div>
          {open.length > 18 && (
            <button onClick={onBook} className="mt-2 text-[11px] text-violet-300 hover:text-violet-200 underline" data-testid={`button-more-times-${coach.id}`}>
              + {open.length - 18} more times
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Booking dialog ──────────────────────────────────────────────────────────
function BookSessionDialog({ coach, date, initialSlot, onClose }: { coach: CoachAvail; date: string; initialSlot?: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const { data: user } = useUser();
  const [tierId, setTierId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(initialSlot ?? null);
  const [message, setMessage] = useState("");

  // Pull full coach summary (price tiers live here, not on /availability-month).
  const { data: summary, isLoading: sLoading } = useQuery<SummaryResp>({
    queryKey: [`/api/coaches/${coach.id}/availability-summary`],
  });
  const tiers: PriceTier[] = (summary?.settings?.priceTiers ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Slots for this specific date
  const { data: slotData, isLoading: slotsLoading } = useQuery<{ slots: Slot[] }>({
    queryKey: [`/api/coaches/${coach.id}/availability-slots`, date],
    queryFn: async () => {
      const r = await fetch(`/api/coaches/${coach.id}/availability-slots?date=${date}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load slots");
      return r.json();
    },
  });
  const slots = slotData?.slots ?? [];

  // Default: pick the first tier when summary loads
  useEffect(() => {
    if (!tierId && tiers.length > 0) setTierId(tiers[0].id);
  }, [tiers, tierId]);

  const tier = tiers.find((t) => t.id === tierId) || null;
  const dur = tier?.durationMinutes || summary?.settings?.slotDurationMinutes || 60;
  const pricePence = tier?.pricePence ?? summary?.settings?.defaultPricePence ?? 0;
  const lessonType = (tier && tier.maxParticipants > 1) ? "GROUP" : "ONE_TO_ONE";

  const book = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach-bookings", {
        coachId: coach.id, date, time: selectedSlot, durationMinutes: dur,
        lessonType, priceTierId: tier?.id ?? undefined,
        playerMessage: message || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking sent!", description: "The coach will confirm shortly." });
      queryClient.invalidateQueries({ queryKey: [`/api/coaches/${coach.id}/availability-slots`, date] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/player"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-bookings/coach"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Booking failed", description: String(e.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const dateLabel = useMemo(() => {
    const [yy, mm, dd] = date.split("-").map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }, [date]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border-violet-400/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-violet-400/30">
              {coach.profilePhoto ? <AvatarImage src={coach.profilePhoto} alt={coach.fullName} className="object-cover" /> : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-xs font-bold">{initials(coach.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold truncate" data-testid="text-book-coach-name">{coach.fullName}</div>
              <div className="text-[11px] font-normal text-zinc-400 truncate">{coach.roleTitle || "Coach"}{coach.city ? ` · ${coach.city}` : ""}</div>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-violet-200">
            <Calendar className="w-3.5 h-3.5" />{dateLabel}
          </DialogDescription>
        </DialogHeader>

        {sLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : (
          <div className="space-y-4">
            {/* Session type / tier picker */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-violet-200 mb-2 inline-flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Session type
              </Label>
              {tiers.length === 0 ? (
                <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 p-3 text-sm text-violet-100">
                  Default 1-to-1 session · {dur} min{pricePence > 0 ? ` · £${(pricePence / 100).toFixed(2)}` : ""}
                  <p className="text-[11px] text-zinc-400 mt-1">This coach hasn't published packages yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="grid-tiers">
                  {tiers.map((t) => {
                    const active = tierId === t.id;
                    const groupLabel = t.maxParticipants <= 1 ? "1-to-1" : `1-to-${t.maxParticipants}`;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTierId(t.id)}
                        className={`relative text-left p-3 rounded-xl border transition ${
                          active
                            ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]"
                            : "border-white/10 bg-white/[0.02] hover:border-violet-400/40 text-zinc-200"
                        }`}
                        data-testid={`button-tier-${t.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{t.label}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{groupLabel}</span>
                              <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" />{t.durationMinutes}m</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-extrabold inline-flex items-center text-emerald-300">
                              <PoundSterling className="w-3 h-3" />{(t.pricePence / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {active && <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-violet-200" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slot picker */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-violet-200 mb-2 inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Choose a time
              </Label>
              {slotsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
              ) : slots.length === 0 ? (
                <div className="text-center py-4 space-y-1">
                  <p className="text-sm text-amber-300">No bookable times on this date.</p>
                  <p className="text-[11px] text-zinc-500">The coach hasn't set hours for this day, or they're all taken / past the booking window.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      disabled={!s.available}
                      onClick={() => setSelectedSlot(s.time)}
                      className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${
                        !s.available
                          ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed line-through"
                          : selectedSlot === s.time
                            ? "border-violet-400 bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                            : "border-white/10 hover:border-violet-400/50 text-zinc-200"
                      }`}
                      data-testid={`button-slot-${s.time}`}
                    >
                      {s.time}
                      {!s.available && s.reason && <div className="text-[8px] uppercase opacity-60">{s.reason}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional message */}
            {selectedSlot && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-violet-200 mb-1">Message (optional)</Label>
                <Textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything the coach should know?"
                  data-testid="textarea-booking-message"
                />
              </div>
            )}

            {/* Confirm */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-booking">Cancel</Button>
              {!user ? (
                <Link href={`/login?next=${encodeURIComponent(`/coach/${coach.id}`)}`} className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90" data-testid="button-login-to-book">Sign in to book</Button>
                </Link>
              ) : (
                <Button
                  disabled={!selectedSlot || book.isPending}
                  onClick={() => book.mutate()}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90"
                  data-testid="button-confirm-booking"
                >
                  {book.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Calendar className="w-4 h-4 mr-1" />}
                  {selectedSlot ? `Book ${selectedSlot}` : "Pick a time"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

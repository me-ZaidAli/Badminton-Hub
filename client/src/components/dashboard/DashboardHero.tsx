import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Calendar, MapPin, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Sparkles,
  GraduationCap, ChevronRight, Loader2, Wind, Droplets,
} from "lucide-react";
import { format, addDays, isSameDay, parseISO, startOfWeek, getISOWeek } from "date-fns";
import { Dumbbell, Trophy } from "lucide-react";

interface DashboardHeroProps {
  userName: string;
  sessions: any[];
}

interface WeeklyChallenge {
  id: number;
  weekNumber: number;
  title: string;
  description: string | null;
  isRevealed: boolean;
  skillPointsReward: number;
  days: Array<{ id: number; dayOfWeek: number; exercise: { name: string } | null }>;
}

const WMO: Record<number, { label: string; Icon: any }> = {
  0: { label: "Clear", Icon: Sun },
  1: { label: "Mostly clear", Icon: Sun },
  2: { label: "Partly cloudy", Icon: Cloud },
  3: { label: "Overcast", Icon: Cloud },
  45: { label: "Fog", Icon: CloudFog },
  48: { label: "Fog", Icon: CloudFog },
  51: { label: "Drizzle", Icon: CloudRain },
  53: { label: "Drizzle", Icon: CloudRain },
  55: { label: "Drizzle", Icon: CloudRain },
  61: { label: "Rain", Icon: CloudRain },
  63: { label: "Rain", Icon: CloudRain },
  65: { label: "Heavy rain", Icon: CloudRain },
  71: { label: "Snow", Icon: CloudSnow },
  73: { label: "Snow", Icon: CloudSnow },
  75: { label: "Heavy snow", Icon: CloudSnow },
  80: { label: "Showers", Icon: CloudRain },
  81: { label: "Showers", Icon: CloudRain },
  82: { label: "Heavy showers", Icon: CloudRain },
  95: { label: "Thunderstorm", Icon: CloudLightning },
  96: { label: "Thunder + hail", Icon: CloudLightning },
  99: { label: "Thunder + hail", Icon: CloudLightning },
};

function describe(code: number) {
  return WMO[code] ?? { label: "—", Icon: Cloud };
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useWeather() {
  const [coords, setCoords] = useState<{ lat: number; lon: number; label: string } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setCoords({ lat: 52.4862, lon: -1.8904, label: "Birmingham" });
      return;
    }
    const t = setTimeout(() => setCoords((c) => c ?? { lat: 52.4862, lon: -1.8904, label: "Birmingham" }), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); setCoords({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Your location" }); },
      () => { clearTimeout(t); setCoords({ lat: 52.4862, lon: -1.8904, label: "Birmingham" }); },
      { timeout: 4000, maximumAge: 600_000 },
    );
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery<{ current: { temperature_2m: number; weather_code: number; wind_speed_10m: number; relative_humidity_2m: number } }>({
    queryKey: ["weather", coords?.lat, coords?.lon],
    enabled: !!coords,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords!.lat}&longitude=${coords!.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`);
      if (!r.ok) throw new Error("weather");
      return r.json();
    },
  });
  return { coords, weather: data?.current ?? null, isLoading };
}

function isSessionAttendee(s: any, userId: number | undefined) {
  if (!userId) return false;
  const attendees: any[] = s?.attendees || s?.players || [];
  return attendees.some((a) => a?.userId === userId || a?.id === userId);
}

export default function DashboardHero({ userName, sessions }: DashboardHeroProps) {
  const now = useLiveClock();
  const { coords, weather, isLoading: wxLoading } = useWeather();

  const weekDays = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [now]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    (sessions || []).forEach((s) => {
      const raw = s.startTime || s.scheduledAt || s.date || s.dateTime;
      if (!raw) return;
      const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) || [];
      arr.push({ ...s, _when: d });
      map.set(key, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a._when - b._when));
    return map;
  }, [sessions]);

  const todayKey = format(now, "yyyy-MM-dd");
  const todayCount = sessionsByDay.get(todayKey)?.length ?? 0;
  const upcoming = useMemo(() => {
    const list = (sessions || [])
      .map((s: any) => {
        const raw = s.startTime || s.scheduledAt || s.date || s.dateTime;
        if (!raw) return null;
        const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
        return { s, d };
      })
      .filter((x): x is { s: any; d: Date } => !!x && !Number.isNaN(x.d.getTime()) && x.d > now)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 3);
    return list;
  }, [sessions, now]);

  const wx = weather ? describe(weather.weather_code) : null;

  // THIS WEEK'S TRAINING CHALLENGE
  const { data: challenges = [] } = useQuery<WeeklyChallenge[]>({
    queryKey: ["/api/junior-weekly-challenges"],
    staleTime: 5 * 60_000,
  });
  const isoWeek = getISOWeek(now);
  const thisWeekChallenge = useMemo(() => {
    if (challenges.length === 0) return null;
    const exact = challenges.find((c) => c.weekNumber === isoWeek && c.isRevealed);
    if (exact) return exact;
    // fallback: most recent revealed challenge ≤ this week
    const revealed = challenges.filter((c) => c.isRevealed).sort((a, b) => b.weekNumber - a.weekNumber);
    return revealed[0] || null;
  }, [challenges, isoWeek]);

  const challengeDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDow = now.getDay();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5" data-testid="dashboard-hero">
      {/* GREETING + CLOCK */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-fuchsia-500/15 to-cyan-500/20 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)]" data-testid="hero-clock">
        <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-200/80">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hello {userName.split(" ")[0]}</span>
          </div>
          <p className="mt-1 text-sm text-white/80" data-testid="text-date">{format(now, "EEEE, d MMMM yyyy")}</p>

          <div className="mt-6 flex items-end gap-3">
            <span className="text-5xl md:text-6xl font-extrabold tracking-tight text-white tabular-nums" data-testid="text-clock">{format(now, "HH:mm")}</span>
            <span className="text-xl font-semibold text-white/70 tabular-nums mb-1.5">{format(now, "ss")}s</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10">
              <div className="text-white/60 uppercase tracking-wider text-[10px]">Today</div>
              <div className="text-white font-bold text-base mt-0.5" data-testid="text-today-sessions">{todayCount} session{todayCount === 1 ? "" : "s"}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10">
              <div className="text-white/60 uppercase tracking-wider text-[10px]">This week</div>
              <div className="text-white font-bold text-base mt-0.5">
                {weekDays.reduce((acc, d) => acc + (sessionsByDay.get(format(d, "yyyy-MM-dd"))?.length ?? 0), 0)} planned
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WEATHER */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-indigo-500/15 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)]" data-testid="hero-weather">
        <div className="pointer-events-none absolute -top-12 -right-8 w-56 h-56 rounded-full bg-sky-400/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-200/80">
              <MapPin className="w-3.5 h-3.5" />
              <span data-testid="text-weather-location">{coords?.label || "Locating…"}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Live</span>
          </div>

          {wxLoading || !weather || !wx ? (
            <div className="mt-8 flex items-center gap-3 text-white/60">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Fetching today's weather…</span>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center gap-4">
                <wx.Icon className="w-16 h-16 text-white drop-shadow-[0_4px_18px_rgba(56,189,248,0.6)]" />
                <div>
                  <div className="text-5xl font-extrabold text-white tabular-nums" data-testid="text-weather-temp">{Math.round(weather.temperature_2m)}°C</div>
                  <div className="text-sm text-white/80 mt-1" data-testid="text-weather-label">{wx.label}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10 flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-sky-200" />
                  <span className="text-white/70">Wind</span>
                  <span className="ml-auto text-white font-semibold tabular-nums">{Math.round(weather.wind_speed_10m)} km/h</span>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/10 flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-sky-200" />
                  <span className="text-white/70">Humidity</span>
                  <span className="ml-auto text-white font-semibold tabular-nums">{Math.round(weather.relative_humidity_2m)}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* WEEKLY TIMELINE + UPCOMING */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)]" data-testid="hero-timeline">
        <div className="pointer-events-none absolute -top-14 -right-10 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80">
              <Calendar className="w-3.5 h-3.5" />
              <span>This week</span>
            </div>
            <Link href="/sessions">
              <button className="text-[11px] text-emerald-200 hover:text-white inline-flex items-center gap-1" data-testid="link-all-sessions">
                All sessions <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5" data-testid="week-strip">
            {weekDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const count = sessionsByDay.get(key)?.length ?? 0;
              const isToday = isSameDay(d, now);
              return (
                <div
                  key={key}
                  className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 border transition ${isToday ? "bg-white/15 border-white/30 shadow-[0_0_18px_rgba(167,243,208,0.3)]" : "bg-white/5 border-white/10"}`}
                  data-testid={`day-${key}`}
                >
                  <span className="text-[9px] uppercase tracking-wider text-white/60">{format(d, "EEE")}</span>
                  <span className={`text-base font-bold ${isToday ? "text-white" : "text-white/85"}`}>{format(d, "d")}</span>
                  <span className={`mt-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums ${count > 0 ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white/40"}`}>{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-2" data-testid="list-upcoming">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Up next</div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-white/60">No upcoming sessions this week. Browse <Link href="/sessions"><span className="underline cursor-pointer">all sessions</span></Link>.</p>
            ) : (
              upcoming.map(({ s, d }) => (
                <Link key={s.id} href={`/sessions/${s.id}`}>
                  <div className="group flex items-center gap-3 rounded-xl p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer" data-testid={`session-upcoming-${s.id}`}>
                    <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-emerald-400/20 border border-emerald-400/30 py-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-emerald-200">{format(d, "EEE")}</span>
                      <span className="text-sm font-bold text-white">{format(d, "HH:mm")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-100">{s.title || "Session"}</p>
                      <p className="text-[11px] text-white/60 truncate flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {s.venueName || s.venue?.name || s.location || s.clubName || "Club session"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TRAINING CHALLENGES */}
      <Link href="/training-challenges" className="block group" data-testid="hero-challenges">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-500/20 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)] h-full transition group-hover:border-amber-300/40 group-hover:shadow-[0_10px_40px_rgba(251,146,60,0.3)] cursor-pointer">
          <div className="pointer-events-none absolute -top-16 -right-12 w-64 h-64 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-200/80">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Training</span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-200/60 group-hover:text-white group-hover:translate-x-0.5 transition" />
            </div>

            {thisWeekChallenge ? (
              <>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-amber-200/60">Week {thisWeekChallenge.weekNumber}</div>
                  <h3 className="text-xl lg:text-2xl font-extrabold text-white leading-tight mt-0.5 line-clamp-2" data-testid="text-challenge-title">
                    {thisWeekChallenge.title}
                  </h3>
                  {thisWeekChallenge.description && (
                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{thisWeekChallenge.description}</p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1" data-testid="challenge-day-strip">
                  {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                    const has = thisWeekChallenge.days.some((d) => d.dayOfWeek === dow);
                    const isToday = dow === todayDow;
                    return (
                      <div
                        key={dow}
                        className={`flex flex-col items-center justify-center rounded-lg py-1.5 border transition ${
                          isToday
                            ? "bg-white/15 border-amber-300/50 shadow-[0_0_12px_rgba(252,211,77,0.4)]"
                            : has
                              ? "bg-amber-400/15 border-amber-300/20"
                              : "bg-white/5 border-white/10"
                        }`}
                      >
                        <span className="text-[8px] uppercase tracking-wider text-white/55">{challengeDayLabels[dow]}</span>
                        <span className={`mt-0.5 inline-flex items-center justify-center w-1.5 h-1.5 rounded-full ${has ? "bg-amber-300" : "bg-white/15"}`} />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
                    <Trophy className="w-3 h-3 text-amber-300" />
                    <span className="text-[11px] font-bold text-white tabular-nums">{thisWeekChallenge.skillPointsReward} pts</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-100 group-hover:text-white inline-flex items-center gap-1">
                    Open <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <h3 className="text-xl lg:text-2xl font-extrabold text-white leading-tight">Daily Training</h3>
                <p className="text-xs text-white/70 mt-1">No active challenge this week. Browse exercises and earn skill points.</p>
                <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/15">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-200" />
                  <span className="text-xs font-semibold text-white">Start training</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export function _silenceUnused() { return isSessionAttendee; }

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Calendar, MapPin, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Sparkles, Clock,
  GraduationCap, ChevronRight, Loader2, Wind, Droplets, Dumbbell, Trophy, Users, Tag, Lightbulb, Moon, Sunrise, Sunset, Activity,
  Quote, GlassWater, Plus, Minus, BarChart3, PartyPopper, ExternalLink,
} from "lucide-react";
import { format, addDays, isSameDay, parseISO, startOfWeek, getISOWeek, getDayOfYear, differenceInMinutes } from "date-fns";
import { CustomPollTile } from "./CustomPollTile";
import { NewsTile } from "./NewsTile";
import { HydrationTile } from "./HydrationTile";
import { CounterTile } from "./CounterTile";
import { Crosshair, Banana } from "lucide-react";

interface DashboardHeroProps {
  userName: string;
  sessions: any[];
  profilePictureUrl?: string | null;
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
  0: { label: "Clear", Icon: Sun }, 1: { label: "Mostly clear", Icon: Sun },
  2: { label: "Partly cloudy", Icon: Cloud }, 3: { label: "Overcast", Icon: Cloud },
  45: { label: "Fog", Icon: CloudFog }, 48: { label: "Fog", Icon: CloudFog },
  51: { label: "Drizzle", Icon: CloudRain }, 53: { label: "Drizzle", Icon: CloudRain }, 55: { label: "Drizzle", Icon: CloudRain },
  61: { label: "Rain", Icon: CloudRain }, 63: { label: "Rain", Icon: CloudRain }, 65: { label: "Heavy rain", Icon: CloudRain },
  71: { label: "Snow", Icon: CloudSnow }, 73: { label: "Snow", Icon: CloudSnow }, 75: { label: "Heavy snow", Icon: CloudSnow },
  80: { label: "Showers", Icon: CloudRain }, 81: { label: "Showers", Icon: CloudRain }, 82: { label: "Heavy showers", Icon: CloudRain },
  95: { label: "Thunderstorm", Icon: CloudLightning }, 96: { label: "Thunder + hail", Icon: CloudLightning }, 99: { label: "Thunder + hail", Icon: CloudLightning },
};
function describe(code: number) { return WMO[code] ?? { label: "—", Icon: Cloud }; }

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

function useWeather() {
  const [coords, setCoords] = useState<{ lat: number; lon: number; label: string } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) { setCoords({ lat: 52.4862, lon: -1.8904, label: "Birmingham" }); return; }
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
      if (!r.ok) throw new Error("weather"); return r.json();
    },
  });
  return { coords, weather: data?.current ?? null, isLoading };
}

// Time-of-day greeting + accent palette
function timeOfDay(now: Date) {
  const h = now.getHours();
  if (h < 6) return { label: "night", greet: "Still up", Icon: Moon, grad: "from-indigo-700/35 via-violet-600/20 to-slate-900/30", glowA: "bg-indigo-500/35", glowB: "bg-violet-600/25" };
  if (h < 12) return { label: "morning", greet: "Good morning", Icon: Sunrise, grad: "from-amber-500/30 via-orange-400/20 to-rose-400/20", glowA: "bg-amber-400/35", glowB: "bg-rose-400/25" };
  if (h < 17) return { label: "afternoon", greet: "Good afternoon", Icon: Sun, grad: "from-sky-500/30 via-cyan-400/20 to-violet-500/20", glowA: "bg-sky-400/35", glowB: "bg-cyan-400/25" };
  if (h < 21) return { label: "evening", greet: "Good evening", Icon: Sunset, grad: "from-fuchsia-600/30 via-violet-500/20 to-amber-500/20", glowA: "bg-fuchsia-500/35", glowB: "bg-amber-400/25" };
  return { label: "night", greet: "Good night", Icon: Moon, grad: "from-indigo-700/35 via-violet-600/20 to-slate-900/30", glowA: "bg-indigo-500/35", glowB: "bg-violet-600/25" };
}

// Tile shell — uniform compact
function Tile({ children, accent = "from-violet-600/25 via-fuchsia-500/15 to-cyan-500/20", glowA = "bg-violet-500/30", glowB = "bg-cyan-500/20", testId, className = "" }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-4 lg:p-5 shadow-[0_6px_24px_rgba(0,0,0,0.22)] min-h-[180px] ${className}`} data-testid={testId}>
      <div className={`pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full ${glowA} blur-3xl`} />
      <div className={`pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full ${glowB} blur-3xl`} />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

const TIPS = [
  "Keep your racket head up during transitions to improve reaction time.",
  "Split-step as your opponent strikes — it's the foundation of fast court coverage.",
  "Aim for the lines on serve, but commit to safe margins on returns.",
  "Recover to the T after every shot. Position beats power.",
  "Loosen your grip between shots — tight forearms slow your swing.",
  "Watch the shuttle/ball off the strings, not where you want it to go.",
  "Use your non-racket arm for balance — it's not just along for the ride.",
  "Train your weakest shot for 10 minutes before every session.",
  "Hydrate before you feel thirsty. By the time you do, you've already lost edge.",
  "Visualise your next point during change-overs. Mental reps count.",
];

const DEAL_COLORS = ["text-amber-300", "text-emerald-300", "text-rose-300", "text-cyan-300", "text-violet-300", "text-lime-300"];

export default function DashboardHero({ userName, sessions, profilePictureUrl }: DashboardHeroProps) {
  const now = useLiveClock();
  const { coords, weather, isLoading: wxLoading } = useWeather();
  const tod = timeOfDay(now);

  // Sessions the current user is personally signed up for (any club).
  // Merged with the club-wide `sessions` prop so booked sessions in clubs the
  // user doesn't admin still appear in the Today/Week/Up Next tiles.
  const { data: mySessionsRaw } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
    staleTime: 60_000,
  });

  const allSessions = useMemo(() => {
    const byId = new Map<number, any>();
    (sessions || []).forEach((s: any) => {
      if (s && s.id != null) byId.set(s.id, s);
    });
    (mySessionsRaw || []).forEach((m: any) => {
      const id = m.sessionId ?? m.id;
      if (id == null) return;
      if (byId.has(id)) return;
      // Normalise /api/my-sessions shape into the field names DashboardHero expects.
      const startBase = m.sessionDate || m.date;
      let combined: string | null = null;
      if (startBase && m.sessionStartTime && /^\d{1,2}:\d{2}/.test(String(m.sessionStartTime))) {
        const datePart = String(startBase).slice(0, 10);
        combined = `${datePart}T${m.sessionStartTime.length === 4 ? "0" + m.sessionStartTime : m.sessionStartTime}`;
      }
      byId.set(id, {
        id,
        title: m.sessionTitle,
        date: startBase,
        startTime: combined || startBase,
        durationMinutes: m.sessionDuration,
        status: m.sessionStatus,
        clubId: m.clubId,
        clubName: m.clubName,
        venueName: m.venueName,
        maxPlayers: m.maxPlayers,
        courtsAvailable: m.courtsAvailable,
        signupCount: 0,
        _booked: true,
      });
    });
    return Array.from(byId.values());
  }, [sessions, mySessionsRaw]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [now]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    allSessions.forEach((s) => {
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
  }, [allSessions]);

  const todayKey = format(now, "yyyy-MM-dd");
  const todaySessions = sessionsByDay.get(todayKey) || [];
  const weekTotal = weekDays.reduce((acc, d) => acc + (sessionsByDay.get(format(d, "yyyy-MM-dd"))?.length ?? 0), 0);

  const upcoming = useMemo(() => {
    return allSessions
      .map((s: any) => {
        const raw = s.startTime || s.scheduledAt || s.date || s.dateTime;
        if (!raw) return null;
        const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
        return { s, d };
      })
      .filter((x): x is { s: any; d: Date } => !!x && !Number.isNaN(x.d.getTime()) && x.d > now)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 1);
  }, [allSessions, now]);

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
    const revealed = challenges.filter((c) => c.isRevealed).sort((a, b) => b.weekNumber - a.weekNumber);
    return revealed[0] || null;
  }, [challenges, isoWeek]);

  const challengeDayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const todayDow = now.getDay();

  // LIVE COURTS — sessions that are currently active (started but not ended)
  const liveSessions = useMemo(() => {
    return allSessions.filter((s: any) => {
      const startRaw = s.startTime || s.scheduledAt || s.date || s.dateTime;
      const endRaw = s.endTime || s.endsAt;
      if (!startRaw) return false;
      const start = typeof startRaw === "string" ? parseISO(startRaw) : new Date(startRaw);
      const end = endRaw ? (typeof endRaw === "string" ? parseISO(endRaw) : new Date(endRaw)) : new Date(start.getTime() + 90 * 60_000);
      return start <= now && end >= now;
    });
  }, [sessions, now]);
  const liveVenues = useMemo(() => {
    const set = new Set<string>();
    liveSessions.forEach((s: any) => {
      const v = s.venueName || s.venue?.name || s.location || s.clubName;
      if (v) set.add(v);
    });
    return Array.from(set).slice(0, 3);
  }, [liveSessions]);

  // Pro-tip rotates by day-of-year
  const tip = TIPS[getDayOfYear(now) % TIPS.length];

  // AI-SOURCED DAILY DEALS (web)
  const { data: dealsData } = useQuery<{ deals: Array<{ brand: string; offer: string; url: string; category: string }> }>({
    queryKey: ["/api/daily-content/deals"],
    staleTime: 60 * 60_000,
  });
  const deals = dealsData?.deals || [];
  const [dealIdx, setDealIdx] = useState(0);
  useEffect(() => {
    if (deals.length <= 1) return;
    const id = setInterval(() => setDealIdx((i) => (i + 1) % deals.length), 6000);
    return () => clearInterval(id);
  }, [deals.length]);
  const deal = deals[dealIdx % Math.max(1, deals.length)] || null;
  const dealColor = DEAL_COLORS[dealIdx % DEAL_COLORS.length];

  // HYDRATION (localStorage, daily reset)
  const hydrationKey = `cm-hydration-${todayKey}`;
  const HYDRATION_GOAL = 8;
  const [cups, setCups] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = localStorage.getItem(hydrationKey);
    return v ? Math.max(0, Math.min(20, parseInt(v, 10) || 0)) : 0;
  });
  useEffect(() => {
    // reset when day rolls over
    const v = localStorage.getItem(hydrationKey);
    setCups(v ? Math.max(0, Math.min(20, parseInt(v, 10) || 0)) : 0);
  }, [hydrationKey]);
  useEffect(() => {
    localStorage.setItem(hydrationKey, String(cups));
  }, [cups, hydrationKey]);
  const hydroPct = Math.min(100, Math.round((cups / HYDRATION_GOAL) * 100));

  // SHUTTLES (localStorage, daily reset)
  const shuttlesKey = `cm-shuttles-${todayKey}`;
  const SHUTTLES_GOAL = 50;
  const [shuttles, setShuttles] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = localStorage.getItem(shuttlesKey);
    return v ? Math.max(0, Math.min(2000, parseInt(v, 10) || 0)) : 0;
  });
  useEffect(() => {
    const v = localStorage.getItem(shuttlesKey);
    setShuttles(v ? Math.max(0, Math.min(2000, parseInt(v, 10) || 0)) : 0);
  }, [shuttlesKey]);
  useEffect(() => {
    localStorage.setItem(shuttlesKey, String(shuttles));
  }, [shuttles, shuttlesKey]);

  // BANANAS (localStorage, daily reset)
  const bananasKey = `cm-bananas-${todayKey}`;
  const BANANAS_GOAL = 3;
  const [bananas, setBananas] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = localStorage.getItem(bananasKey);
    return v ? Math.max(0, Math.min(20, parseInt(v, 10) || 0)) : 0;
  });
  useEffect(() => {
    const v = localStorage.getItem(bananasKey);
    setBananas(v ? Math.max(0, Math.min(20, parseInt(v, 10) || 0)) : 0);
  }, [bananasKey]);
  useEffect(() => {
    localStorage.setItem(bananasKey, String(bananas));
  }, [bananas, bananasKey]);

  // DAILY QUOTE
  const { data: quoteData } = useQuery<{ text: string; author: string }>({
    queryKey: ["/api/daily-content/quote"],
    staleTime: 60 * 60_000,
  });

  // DAILY POLL
  const { data: pollData } = useQuery<{ question: string; options: string[]; counts: number[]; total: number; myVote: number | null }>({
    queryKey: ["/api/daily-content/poll"],
    staleTime: 60_000,
  });
  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      return await apiRequest("POST", "/api/daily-content/poll/vote", { optionIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-content/poll"] });
    },
  });

  // NEXT TEAM EVENT
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/team-events"],
    staleTime: 5 * 60_000,
  });
  const nextEvent = useMemo(() => {
    return (events || [])
      .filter((e: any) => e?.status === "UPCOMING" && e?.date && new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .map((e: any) => ({ e, d: new Date(e.date) }))
      .filter((x) => !Number.isNaN(x.d.getTime()))
      .sort((a, b) => a.d.getTime() - b.d.getTime())[0] || null;
  }, [events, now]);

  const firstName = (userName || "").split(" ")[0] || "there";
  const initials = firstName.slice(0, 1).toUpperCase();

  // Next session countdown helper
  const nextSession = upcoming[0];
  const minsToNext = nextSession ? differenceInMinutes(nextSession.d, now) : null;
  const countdownLabel = minsToNext === null
    ? null
    : minsToNext < 60
      ? `in ${minsToNext}m`
      : minsToNext < 60 * 24
        ? `in ${Math.floor(minsToNext / 60)}h ${minsToNext % 60}m`
        : format(nextSession.d, "EEE HH:mm");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4" data-testid="dashboard-hero">
      <CustomPollTile />
      <NewsTile />

      {/* 1. GREETING + PROFILE PHOTO + CLOCK */}
      <Tile accent={tod.grad} glowA={tod.glowA} glowB={tod.glowB} testId="hero-greeting">
        <div className="flex items-start gap-3">
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt={firstName}
              className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.25)] shrink-0"
              data-testid="img-profile-avatar"
              onError={(e) => { (e.currentTarget.style.display = "none"); }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white text-xl font-extrabold shadow-[0_0_20px_rgba(167,139,250,0.4)] shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70">
              <tod.Icon className="w-3 h-3" />
              <span>{tod.greet}</span>
            </div>
            <h2 className="text-base font-extrabold text-white truncate" data-testid="text-welcome">{firstName}</h2>
            <p className="text-[11px] text-white/70 truncate" data-testid="text-date">{format(now, "EEE, d MMM")}</p>
          </div>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white tabular-nums" data-testid="text-clock">{format(now, "HH:mm")}</span>
          <span className="text-xs text-white/60 tabular-nums mb-0.5">{format(now, "ss")}s</span>
        </div>
      </Tile>

      {/* 2. WEATHER */}
      <Tile accent="from-sky-500/25 via-blue-500/15 to-indigo-500/15" glowA="bg-sky-400/30" glowB="bg-indigo-500/20" testId="hero-weather">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-sky-200/80">
            <MapPin className="w-3 h-3" />
            <span data-testid="text-weather-location" className="truncate max-w-[120px]">{coords?.label || "Locating…"}</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-white/40">Live</span>
        </div>
        {wxLoading || !weather || !wx ? (
          <div className="mt-6 flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Fetching…</span>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              <wx.Icon className="w-12 h-12 text-white drop-shadow-[0_3px_14px_rgba(56,189,248,0.55)]" />
              <div>
                <div className="text-3xl font-extrabold text-white tabular-nums" data-testid="text-weather-temp">{Math.round(weather.temperature_2m)}°</div>
                <div className="text-[11px] text-white/75" data-testid="text-weather-label">{wx.label}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-white/70">
              <Wind className="w-3 h-3 text-sky-200" />
              <span className="tabular-nums">{Math.round(weather.wind_speed_10m)} km/h</span>
              <span className="text-white/30 mx-1">•</span>
              <Droplets className="w-3 h-3 text-sky-200" />
              <span className="tabular-nums">{Math.round(weather.relative_humidity_2m)}%</span>
            </div>
          </>
        )}
      </Tile>

      {/* 3. TODAY + WEEK COUNTERS */}
      <Tile accent="from-emerald-500/20 via-teal-500/15 to-cyan-500/15" glowA="bg-emerald-400/25" glowB="bg-cyan-500/20" testId="hero-counters">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
            <Calendar className="w-3 h-3" />
            <span>At a glance</span>
          </div>
          <Link href="/sessions">
            <button className="text-[10px] text-emerald-200 hover:text-white inline-flex items-center gap-0.5" data-testid="link-all-sessions">
              All <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 border border-white/10 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-white/55">Today</div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-0.5" data-testid="text-today-sessions">{todaySessions.length}</div>
            <div className="text-[10px] text-white/60">session{todaySessions.length === 1 ? "" : "s"}</div>
          </div>
          <div className="rounded-xl bg-white/10 border border-white/10 p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-white/55">This week</div>
            <div className="text-2xl font-extrabold text-white tabular-nums mt-0.5">{weekTotal}</div>
            <div className="text-[10px] text-white/60">planned</div>
          </div>
        </div>
        {countdownLabel && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-emerald-100/90">
            <Sparkles className="w-3 h-3" />
            <span>Next session {countdownLabel}</span>
          </div>
        )}
      </Tile>

      {/* 4. WEEK STRIP */}
      <Tile accent="from-violet-500/20 via-fuchsia-500/15 to-pink-500/15" glowA="bg-violet-400/25" glowB="bg-pink-500/20" testId="hero-week-strip">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-violet-200/80">
            <Calendar className="w-3 h-3" />
            <span>Week</span>
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider">W{isoWeek}</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const count = sessionsByDay.get(key)?.length ?? 0;
            const isToday = isSameDay(d, now);
            return (
              <div key={key} className={`flex flex-col items-center justify-center rounded-lg px-1 py-1.5 border ${isToday ? "bg-white/15 border-white/30 shadow-[0_0_14px_rgba(244,114,182,0.4)]" : "bg-white/5 border-white/10"}`} data-testid={`day-${key}`}>
                <span className="text-[8px] uppercase tracking-wider text-white/55">{format(d, "EEE")[0]}</span>
                <span className={`text-xs font-bold ${isToday ? "text-white" : "text-white/85"}`}>{format(d, "d")}</span>
                <span className={`mt-0.5 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-bold tabular-nums ${count > 0 ? "bg-fuchsia-400 text-fuchsia-950" : "bg-white/10 text-white/40"}`}>{count}</span>
              </div>
            );
          })}
        </div>
        <Link href="/sessions" className="mt-3 inline-flex items-center gap-1 text-[10px] text-violet-200 hover:text-white">
          Open week view <ChevronRight className="w-3 h-3" />
        </Link>
      </Tile>

      {/* 5. UP NEXT */}
      <Tile accent="from-cyan-500/20 via-teal-500/15 to-emerald-500/15" glowA="bg-cyan-400/25" glowB="bg-emerald-500/20" testId="hero-upnext">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">
            <Clock /><span>Up next</span>
          </div>
          {countdownLabel && <span className="text-[9px] text-cyan-100/80 uppercase tracking-wider">{countdownLabel}</span>}
        </div>
        {nextSession ? (
          <Link href={`/sessions/${nextSession.s.id}`}>
            <div className="mt-3 group cursor-pointer">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 border border-white/10 p-2.5 hover:bg-white/15 transition" data-testid={`session-upcoming-${nextSession.s.id}`}>
                <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-cyan-400/25 border border-cyan-300/30 py-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-cyan-100">{format(nextSession.d, "EEE")}</span>
                  <span className="text-xs font-bold text-white">{format(nextSession.d, "HH:mm")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{nextSession.s.title || "Session"}</p>
                  <p className="text-[10px] text-white/60 truncate flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {nextSession.s.venueName || nextSession.s.venue?.name || nextSession.s.location || nextSession.s.clubName || "Club"}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="mt-4 text-xs text-white/65">No upcoming sessions. <Link href="/sessions"><span className="underline">Browse all</span></Link>.</div>
        )}
      </Tile>

      {/* 6. TRAINING CHALLENGES */}
      <Link href="/training-challenges" className="block group" data-testid="hero-challenges">
        <Tile accent="from-amber-500/20 via-orange-500/15 to-rose-500/20" glowA="bg-amber-400/30" glowB="bg-rose-500/20" className="h-full transition group-hover:border-amber-300/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
              <Dumbbell className="w-3 h-3" /><span>Training</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-200/60 group-hover:text-white group-hover:translate-x-0.5 transition" />
          </div>
          {thisWeekChallenge ? (
            <>
              <div className="mt-2">
                <div className="text-[9px] uppercase tracking-wider text-amber-200/60">Week {thisWeekChallenge.weekNumber}</div>
                <h3 className="text-sm font-extrabold text-white leading-tight mt-0.5 line-clamp-2" data-testid="text-challenge-title">{thisWeekChallenge.title}</h3>
              </div>
              <div className="mt-2.5 grid grid-cols-7 gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                  const has = thisWeekChallenge.days.some((d) => d.dayOfWeek === dow);
                  const isToday = dow === todayDow;
                  return (
                    <div key={dow} className={`flex flex-col items-center justify-center rounded-md py-1 border ${isToday ? "bg-white/15 border-amber-300/50 shadow-[0_0_10px_rgba(252,211,77,0.4)]" : has ? "bg-amber-400/15 border-amber-300/20" : "bg-white/5 border-white/10"}`}>
                      <span className="text-[8px] text-white/55">{challengeDayLabels[dow]}</span>
                      <span className={`mt-0.5 w-1 h-1 rounded-full ${has ? "bg-amber-300" : "bg-white/15"}`} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                <Trophy className="w-3 h-3 text-amber-300" />
                <span className="text-[10px] font-bold text-white tabular-nums">{thisWeekChallenge.skillPointsReward} pts</span>
              </div>
            </>
          ) : (
            <div className="mt-3">
              <h3 className="text-sm font-extrabold text-white">Daily Training</h3>
              <p className="text-[11px] text-white/70 mt-1">Tap to browse exercises and earn skill points.</p>
            </div>
          )}
        </Tile>
      </Link>

      {/* 7. LIVE COURTS */}
      <Tile accent="from-rose-500/20 via-pink-500/15 to-fuchsia-500/15" glowA="bg-rose-400/25" glowB="bg-fuchsia-500/20" testId="hero-live-courts">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-rose-200/80">
            <Activity className="w-3 h-3" /><span>Live courts</span>
          </div>
          <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider ${liveSessions.length > 0 ? "text-rose-200" : "text-white/40"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${liveSessions.length > 0 ? "bg-rose-400 animate-pulse" : "bg-white/30"}`} />
            {liveSessions.length > 0 ? "Active" : "Quiet"}
          </span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-extrabold text-white tabular-nums" data-testid="text-live-count">{liveSessions.length}</span>
          <span className="text-[11px] text-white/65 mb-1">running now</span>
        </div>
        {liveVenues.length > 0 ? (
          <div className="mt-2 space-y-1">
            {liveVenues.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/75 truncate">
                <MapPin className="w-3 h-3 text-rose-200 shrink-0" />
                <span className="truncate">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-white/55">All courts free right now.</p>
        )}
      </Tile>

      {/* 8. AI WEB DEAL */}
      <Tile accent="from-lime-500/20 via-emerald-500/15 to-teal-500/15" glowA="bg-lime-400/25" glowB="bg-teal-500/20" testId="hero-partner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-lime-200/80">
            <Tag className="w-3 h-3" /><span>Today's deal</span>
          </div>
          {deals.length > 1 && (
            <span className="text-[9px] text-white/40 uppercase tracking-wider tabular-nums" data-testid="text-deal-counter">
              {dealIdx + 1}/{deals.length}
            </span>
          )}
        </div>
        {deal ? (
          <a href={deal.url} target="_blank" rel="noopener noreferrer" className="block group" data-testid={`link-deal-${dealIdx}`}>
            <div className="mt-3">
              <div className="inline-block px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[9px] uppercase tracking-wider text-white/65 mb-1.5">
                {deal.category}
              </div>
              <h3 className="text-sm font-extrabold text-white leading-tight truncate group-hover:text-lime-200 transition" data-testid="text-deal-brand">
                {deal.brand}
              </h3>
              <p className={`text-lg font-extrabold mt-0.5 leading-tight line-clamp-2 ${dealColor}`} data-testid="text-deal-offer">
                {deal.offer}
              </p>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-lime-200 group-hover:text-white">
              Visit site <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        ) : (
          <div className="mt-6 flex items-center gap-2 text-white/55">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Finding deals…</span>
          </div>
        )}
      </Tile>

      {/* 9. PRO TIP */}
      <Tile accent="from-indigo-500/20 via-violet-500/15 to-purple-500/15" glowA="bg-indigo-400/25" glowB="bg-purple-500/20" testId="hero-tip">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-indigo-200/80">
            <Lightbulb className="w-3 h-3" /><span>Pro tip</span>
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider">Daily</span>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-200" />
          </div>
          <p className="text-[12px] leading-snug text-white/90 italic" data-testid="text-pro-tip">"{tip}"</p>
        </div>
      </Tile>

      {/* 10. HYDRATION TRACKER */}
      <HydrationTile cups={cups} setCups={setCups} goal={HYDRATION_GOAL} />

      {/* 10b. SHUTTLES HIT TRACKER */}
      <CounterTile
        count={shuttles}
        setCount={setShuttles}
        goal={SHUTTLES_GOAL}
        max={2000}
        label="Shuttles hit"
        unitLabel="today"
        icon={Crosshair}
        accentClass="border-orange-300/20"
        gradientClass="from-orange-900/40 via-amber-900/25 to-rose-950/60"
        glowAClass="bg-amber-400/15"
        glowBClass="bg-orange-500/15"
        iconColorClass="text-amber-200/85"
        iconBgEmptyClass="bg-amber-950/40"
        iconBgFillClass="bg-amber-500/70"
        testId="hero-shuttles"
      />

      {/* 10c. BANANAS EATEN TRACKER */}
      <CounterTile
        count={bananas}
        setCount={setBananas}
        goal={BANANAS_GOAL}
        max={20}
        label="Bananas eaten"
        unitLabel="today"
        icon={Banana}
        accentClass="border-yellow-300/20"
        gradientClass="from-yellow-900/40 via-lime-900/25 to-emerald-950/60"
        glowAClass="bg-yellow-400/15"
        glowBClass="bg-lime-500/15"
        iconColorClass="text-yellow-200/85"
        iconBgEmptyClass="bg-yellow-950/40"
        iconBgFillClass="bg-yellow-500/70"
        testId="hero-bananas"
      />

      {/* 11. DAILY QUOTE / MINDSET */}
      <Tile accent="from-fuchsia-500/20 via-purple-500/15 to-violet-500/15" glowA="bg-fuchsia-400/25" glowB="bg-violet-500/20" testId="hero-quote">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/80">
            <Quote className="w-3 h-3" /><span>Mindset</span>
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider">Daily</span>
        </div>
        {quoteData ? (
          <div className="mt-3">
            <Quote className="w-5 h-5 text-fuchsia-300/40" />
            <p className="text-[12px] leading-snug text-white/95 italic mt-1 line-clamp-4" data-testid="text-daily-quote">{quoteData.text}</p>
            <p className="text-[10px] text-fuchsia-200/80 mt-1.5 font-semibold">— {quoteData.author}</p>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 text-white/55"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
        )}
      </Tile>

      {/* 12. DAILY POLL */}
      <Tile accent="from-orange-500/20 via-amber-500/15 to-yellow-500/15" glowA="bg-orange-400/25" glowB="bg-yellow-500/20" testId="hero-poll">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
            <BarChart3 className="w-3 h-3" /><span>Daily poll</span>
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider">{pollData?.total ?? 0} votes</span>
        </div>
        {pollData ? (
          <>
            <p className="mt-2 text-xs font-semibold text-white leading-snug line-clamp-2" data-testid="text-poll-question">{pollData.question}</p>
            <div className="mt-2 space-y-1">
              {pollData.options.map((opt, i) => {
                const count = pollData.counts[i] || 0;
                const pct = pollData.total > 0 ? Math.round((count / pollData.total) * 100) : 0;
                const mine = pollData.myVote === i;
                const voted = pollData.myVote !== null;
                return (
                  <button
                    key={i}
                    onClick={() => !voteMutation.isPending && voteMutation.mutate(i)}
                    disabled={voteMutation.isPending}
                    className={`relative w-full text-left rounded-lg border overflow-hidden transition px-2.5 py-1.5 ${mine ? "border-amber-300/60 bg-amber-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    data-testid={`button-poll-option-${i}`}
                  >
                    {voted && (
                      <div
                        className={`absolute inset-y-0 left-0 ${mine ? "bg-amber-400/30" : "bg-white/10"} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${mine ? "text-white" : "text-white/85"} truncate`}>{opt}</span>
                      {voted && <span className="text-white/70 tabular-nums shrink-0 ml-2">{pct}%</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6 flex items-center gap-2 text-white/55"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading…</span></div>
        )}
      </Tile>

      {/* 13. NEXT EVENT */}
      <Tile accent="from-pink-500/20 via-rose-500/15 to-orange-500/15" glowA="bg-pink-400/25" glowB="bg-orange-500/20" testId="hero-event">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-pink-200/80">
            <PartyPopper className="w-3 h-3" /><span>Next event</span>
          </div>
          <Link href="/events">
            <button className="text-[10px] text-pink-200 hover:text-white inline-flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
        {nextEvent ? (
          <Link href={`/events/${nextEvent.e.id}`}>
            <div className="mt-3 group cursor-pointer" data-testid={`event-${nextEvent.e.id}`}>
              <div className="flex items-start gap-2.5">
                <div className="shrink-0 flex flex-col items-center justify-center w-12 rounded-lg bg-pink-400/25 border border-pink-300/30 py-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-pink-100">{format(nextEvent.d, "MMM")}</span>
                  <span className="text-base font-extrabold text-white leading-none">{format(nextEvent.d, "d")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-white truncate" data-testid="text-event-title">{nextEvent.e.title}</p>
                  <p className="text-[10px] text-white/65 truncate flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />{nextEvent.e.startTime || format(nextEvent.d, "HH:mm")}
                  </p>
                  {nextEvent.e.location && (
                    <p className="text-[10px] text-white/60 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{nextEvent.e.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-white/55 inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {(nextEvent.e.signupCount || 0)}/{nextEvent.e.maxParticipants} signed up
                </span>
                {nextEvent.e.isSignedUp && (
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold">You're in</span>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <div className="mt-4">
            <p className="text-xs text-white/65">No upcoming club events.</p>
            <Link href="/events">
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-pink-200 hover:text-white underline cursor-pointer">Browse events</span>
            </Link>
          </div>
        )}
      </Tile>

    </div>
  );
}

export function _silenceUnused() { return null; }

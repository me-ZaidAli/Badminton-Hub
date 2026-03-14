import { useState, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users, DollarSign, Calendar, Target, Activity, TrendingUp, TrendingDown,
  Search, Brain, Send, Zap, Eye, Star, Lock, RotateCcw,
  ChevronRight, X, ArrowUpRight, ArrowDownRight, BarChart3, Building2, Clock, User
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend
} from "recharts";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const NEON = {
  purple: "#a855f7",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  pink: "#ec4899",
  red: "#ef4444",
  indigo: "#6366f1",
};

const GRADIENT_COLORS = [NEON.purple, NEON.blue, NEON.cyan, NEON.green, NEON.amber, NEON.pink, NEON.indigo];

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
function formatPenceShort(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`;
  return `£${(pence / 100).toFixed(0)}`;
}

type MultiFilter = {
  playerIds: number[];
  playerNames: string[];
  sessionTitles: string[];
  clubIds: number[];
  clubNames: string[];
  months: string[];
  weekdays: number[];
  weekdayNames: string[];
  timeOfDay?: string;
  dateFrom?: string;
  dateTo?: string;
};

const emptyFilter: MultiFilter = {
  playerIds: [], playerNames: [], sessionTitles: [],
  clubIds: [], clubNames: [], months: [],
  weekdays: [], weekdayNames: [],
};

function useToggleFilter() {
  const [filter, setFilter] = useState<MultiFilter>({ ...emptyFilter });
  const [multiSelectMode, setMultiSelectMode] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilter = filter.playerIds.length > 0 || filter.sessionTitles.length > 0 ||
    filter.clubIds.length > 0 || filter.months.length > 0 ||
    filter.weekdays.length > 0 || !!filter.timeOfDay ||
    !!filter.dateFrom || !!filter.dateTo;

  const toggleItem = useCallback((category: string, value: any, label?: string) => {
    setFilter(prev => {
      const next = { ...prev };
      if (category === "club") {
        const idx = next.clubIds.indexOf(value);
        if (idx >= 0) { next.clubIds = next.clubIds.filter((_, i) => i !== idx); next.clubNames = next.clubNames.filter((_, i) => i !== idx); }
        else { if (multiSelectMode === "club") { next.clubIds = [...next.clubIds, value]; next.clubNames = [...next.clubNames, label || ""]; } else { next.clubIds = [value]; next.clubNames = [label || ""]; } }
      } else if (category === "session") {
        const idx = next.sessionTitles.indexOf(value);
        if (idx >= 0) { next.sessionTitles = next.sessionTitles.filter((_, i) => i !== idx); }
        else { if (multiSelectMode === "session") { next.sessionTitles = [...next.sessionTitles, value]; } else { next.sessionTitles = [value]; } }
      } else if (category === "weekday") {
        const idx = next.weekdays.indexOf(value);
        if (idx >= 0) { next.weekdays = next.weekdays.filter((_, i) => i !== idx); next.weekdayNames = next.weekdayNames.filter((_, i) => i !== idx); }
        else { if (multiSelectMode === "weekday") { next.weekdays = [...next.weekdays, value]; next.weekdayNames = [...next.weekdayNames, label || ""]; } else { next.weekdays = [value]; next.weekdayNames = [label || ""]; } }
      } else if (category === "player") {
        const idx = next.playerIds.indexOf(value);
        if (idx >= 0) { next.playerIds = next.playerIds.filter((_, i) => i !== idx); next.playerNames = next.playerNames.filter((_, i) => i !== idx); }
        else { if (multiSelectMode === "player") { next.playerIds = [...next.playerIds, value]; next.playerNames = [...next.playerNames, label || ""]; } else { next.playerIds = [value]; next.playerNames = [label || ""]; } }
      } else if (category === "month") {
        const idx = next.months.indexOf(value);
        if (idx >= 0) { next.months = next.months.filter((_, i) => i !== idx); }
        else { if (multiSelectMode === "month") { next.months = [...next.months, value]; } else { next.months = [value]; } }
      }
      return next;
    });
  }, [multiSelectMode]);

  const startLongPress = useCallback((category: string) => {
    longPressTimer.current = setTimeout(() => { setMultiSelectMode(prev => prev === category ? null : category); }, 500);
  }, []);
  const cancelLongPress = useCallback(() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }, []);
  const clearAll = useCallback(() => { setFilter({ ...emptyFilter }); setMultiSelectMode(null); }, []);
  const removeCategory = useCallback((category: string) => {
    setFilter(prev => {
      const next = { ...prev };
      if (category === "club") { next.clubIds = []; next.clubNames = []; }
      if (category === "session") { next.sessionTitles = []; }
      if (category === "weekday") { next.weekdays = []; next.weekdayNames = []; }
      if (category === "player") { next.playerIds = []; next.playerNames = []; }
      if (category === "month") { next.months = []; }
      if (category === "timeOfDay") { next.timeOfDay = undefined; }
      if (category === "dateRange") { next.dateFrom = undefined; next.dateTo = undefined; }
      return next;
    });
    if (multiSelectMode === category) setMultiSelectMode(null);
  }, [multiSelectMode]);

  return { filter, hasFilter, toggleItem, startLongPress, cancelLongPress, clearAll, removeCategory, multiSelectMode, setMultiSelectMode, setFilter };
}

interface CommandCenterProps {
  data: any;
}

function GlassCard({ children, className = "", glow, onClick }: {
  children: React.ReactNode; className?: string; glow?: string; onClick?: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-white/[0.08] overflow-hidden ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        boxShadow: glow ? `0 0 30px ${glow}15, inset 0 1px 0 rgba(255,255,255,0.05)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function NeonKpiCard({ icon: Icon, label, value, subtitle, color, glow, totalValue }: {
  icon: any; label: string; value: string | number; subtitle?: string;
  color: string; glow: string; totalValue?: string | number;
}) {
  const hasTotal = totalValue !== undefined;
  const isChanged = hasTotal && totalValue !== value;

  const pctLabel = useMemo(() => {
    if (!isChanged) return null;
    const parseNum = (v: string | number): number | null => {
      if (typeof v === "number") return v;
      const stripped = v.replace(/[£%,]/g, "");
      const n = parseFloat(stripped);
      return isNaN(n) ? null : n;
    };
    const cur = parseNum(value);
    const total = parseNum(totalValue!);
    if (cur === null || total === null || total === 0) return null;
    return `${Math.round((cur / total) * 100)}%`;
  }, [value, totalValue, isChanged]);

  return (
    <GlassCard glow={glow} className={`group hover:border-white/[0.15] transition-all duration-300 ${isChanged ? "ring-1" : ""}`} >
      <div className="p-4 relative" style={isChanged ? { borderColor: `${glow}40` } : {}}>
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: glow }} />
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl" style={{ background: `${glow}20` }}>
            <Icon className="h-4 w-4" style={{ color: glow }} />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <div className="flex items-center justify-between mt-2">
          {subtitle && !isChanged && <span className="text-[10px] text-white/30">{subtitle}</span>}
          {isChanged && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/30 line-through">{totalValue}</span>
              {pctLabel && <span className="text-[9px] font-medium rounded px-1 py-0.5" style={{ background: `${glow}20`, color: glow }}>{pctLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function SectionHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: any }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/10">
          <Icon className="h-4 w-4 text-purple-400" />
        </div>
      )}
      <div>
        <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
        {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function iconForCategory(cat: string) {
  switch (cat) {
    case "club": return Building2;
    case "session": return Calendar;
    case "weekday": return Clock;
    case "player": return User;
    case "month": return Calendar;
    case "timeOfDay": return Clock;
    case "dateRange": return Calendar;
    default: return Target;
  }
}

export default function CommandCenterDashboard({ data }: CommandCenterProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerSort, setPlayerSort] = useState<"revenue" | "sessions" | "attendanceRate">("revenue");
  const [aiQuestion, setAiQuestion] = useState("");

  const { filter, hasFilter, toggleItem, startLongPress, cancelLongPress, clearAll, removeCategory, multiSelectMode, setMultiSelectMode, setFilter } = useToggleFilter();

  const filteredSignups = useMemo(() => {
    if (!data?.signupsRaw) return [];
    let sigs = data.signupsRaw;
    if (filter.playerIds.length > 0) { const ids = new Set(filter.playerIds); sigs = sigs.filter((s: any) => ids.has(s.playerId)); }
    if (filter.sessionTitles.length > 0) {
      const titles = new Set(filter.sessionTitles);
      const sessIds = new Set((data.sessionStats || []).filter((s: any) => titles.has(s.title)).map((s: any) => s.id));
      sigs = sigs.filter((s: any) => sessIds.has(s.sessionId));
    }
    if (filter.clubIds.length > 0) { const ids = new Set(filter.clubIds); sigs = sigs.filter((s: any) => ids.has(s.clubId)); }
    if (filter.months.length > 0) { sigs = sigs.filter((s: any) => filter.months.some(m => s.date?.startsWith(m))); }
    if (filter.weekdays.length > 0) { const wdSet = new Set(filter.weekdays); sigs = sigs.filter((s: any) => wdSet.has(new Date(s.date).getDay())); }
    if (filter.timeOfDay) {
      const sessionMap = new Map((data.sessionStats || []).map((s: any) => [s.id, s]));
      sigs = sigs.filter((s: any) => {
        const sess: any = sessionMap.get(s.sessionId);
        if (!sess?.startTime) return false;
        const hour = parseInt(sess.startTime.split(":")[0]);
        if (filter.timeOfDay === "morning") return hour >= 6 && hour < 12;
        if (filter.timeOfDay === "afternoon") return hour >= 12 && hour < 17;
        if (filter.timeOfDay === "evening") return hour >= 17 && hour < 21;
        return hour >= 21 || hour < 6;
      });
    }
    if (filter.dateFrom) sigs = sigs.filter((s: any) => s.date && s.date >= filter.dateFrom!);
    if (filter.dateTo) sigs = sigs.filter((s: any) => s.date && s.date <= filter.dateTo!);
    return sigs;
  }, [data, filter]);

  const activeSessionStats = useMemo(() => {
    if (!data?.sessionStats) return [];
    if (!hasFilter) return data.sessionStats;
    const sigSessionIds = new Set(filteredSignups.map((s: any) => s.sessionId));
    return data.sessionStats.filter((s: any) => sigSessionIds.has(s.id));
  }, [data, filteredSignups, hasFilter]);

  const activeSignups = useMemo(() => {
    if (!data?.signupsRaw) return [];
    if (!hasFilter) return data.signupsRaw;
    return filteredSignups;
  }, [data, filteredSignups, hasFilter]);

  const kpis = useMemo(() => {
    const sessions = activeSessionStats.length;
    const signups = activeSignups.length;
    const revenue = activeSignups.reduce((s: number, sg: any) => s + sg.fee, 0);
    const noShows = activeSignups.filter((s: any) => s.attendance === "NOT_ATTENDED").length;
    const tracked = activeSignups.filter((s: any) => ["ATTENDED", "NOT_ATTENDED", "PARTIAL_ATTENDANCE", "JUSTIFIED_CANCELLATION"].includes(s.attendance)).length;
    const totalCap = activeSessionStats.reduce((s: number, ss: any) => s + (ss.maxPlayers || 0), 0);
    return {
      totalSessions: sessions, totalPlayers: signups, totalRevenue: revenue,
      avgPlayersPerSession: sessions > 0 ? Math.round((signups / sessions) * 10) / 10 : 0,
      revenuePerSession: sessions > 0 ? Math.round(revenue / sessions) : 0,
      revenuePerPlayer: signups > 0 ? Math.round(revenue / signups) : 0,
      fillRate: totalCap > 0 ? Math.round((signups / totalCap) * 1000) / 10 : 0,
      noShowRate: tracked > 0 ? Math.round((noShows / tracked) * 1000) / 10 : 0,
      noShows,
    };
  }, [activeSessionStats, activeSignups]);

  const filterBadges = useMemo(() => {
    const badges: { category: string; label: string }[] = [];
    if (filter.clubIds.length > 0) badges.push({ category: "club", label: `Club: ${filter.clubNames.join(", ")}` });
    if (filter.sessionTitles.length > 0) badges.push({ category: "session", label: `Session: ${filter.sessionTitles.join(", ")}` });
    if (filter.weekdays.length > 0) badges.push({ category: "weekday", label: `Day: ${filter.weekdayNames.join(", ")}` });
    if (filter.playerIds.length > 0) badges.push({ category: "player", label: `Player: ${filter.playerNames.join(", ")}` });
    if (filter.months.length > 0) badges.push({ category: "month", label: `Month: ${filter.months.join(", ")}` });
    if (filter.timeOfDay) badges.push({ category: "timeOfDay", label: `Time: ${filter.timeOfDay}` });
    if (filter.dateFrom || filter.dateTo) badges.push({ category: "dateRange", label: `Date: ${filter.dateFrom || "..."} → ${filter.dateTo || "..."}` });
    return badges;
  }, [filter]);

  const aiMutation = useMutation({
    mutationFn: async (question?: string) => {
      const penceToGBP = (p: number) => +(p / 100).toFixed(2);
      const filteredClubStats = clubBreakdown.map(c => ({
        name: c.name, sessions: c.sessions, playerSignups: hasFilter ? c.filteredPlayers : c.players,
        revenue_GBP: penceToGBP(hasFilter ? c.filteredRevenue : c.revenue),
      }));
      const filteredSeasonality = seasonalData.map(s => ({
        month: s.label, sessions: s.sessions, players: s.players, revenue_GBP: penceToGBP(s.revenue),
      }));
      const body: any = {
        kpis: {
          totalSessions: kpis.totalSessions, totalUniquePlayerSignups: kpis.totalPlayers,
          totalRevenue_GBP: penceToGBP(kpis.totalRevenue), fillRatePercent: kpis.fillRate,
          noShowRatePercent: kpis.noShowRate,
        },
        clubStats: filteredClubStats,
        seasonality: filteredSeasonality,
        alerts: data?.alerts,
      };
      if (question) body.question = question;
      if (hasFilter) body.filterContext = `Active filters: ${filterBadges.map(b => b.label).join("; ")}`;
      const res = await apiRequest("POST", "/api/dashboard/analytics/ai-insights", body);
      return res.json();
    },
  });

  const seasonalData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; revenue: number; players: number; sessions: number }>();
    for (const s of activeSessionStats) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      if (!map.has(key)) map.set(key, { key, label, revenue: 0, players: 0, sessions: 0 });
      const e = map.get(key)!;
      e.revenue += s.revenue; e.players += s.players; e.sessions++;
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [activeSessionStats]);

  const clubBreakdown = useMemo(() => {
    const allStats = data?.sessionStats || [];
    const filteredStats = activeSessionStats;
    const allMap = new Map<number, { id: number; name: string; sessions: number; players: number; revenue: number }>();
    for (const s of allStats) {
      if (!allMap.has(s.clubId)) allMap.set(s.clubId, { id: s.clubId, name: s.clubName || "Unknown", sessions: 0, players: 0, revenue: 0 });
      const e = allMap.get(s.clubId)!; e.sessions++; e.players += s.players; e.revenue += s.revenue;
    }
    const filtMap = new Map<number, { players: number; revenue: number }>();
    for (const s of filteredStats) {
      if (!filtMap.has(s.clubId)) filtMap.set(s.clubId, { players: 0, revenue: 0 });
      const e = filtMap.get(s.clubId)!; e.players += s.players; e.revenue += s.revenue;
    }
    return [...allMap.values()].map(v => {
      const filt = filtMap.get(v.id);
      return {
        ...v,
        filteredPlayers: hasFilter ? (filt?.players ?? 0) : v.players,
        filteredRevenue: hasFilter ? (filt?.revenue ?? 0) : v.revenue,
        totalPlayers: v.players,
        totalRevenue: v.revenue,
        fill: GRADIENT_COLORS[(v.id || 0) % GRADIENT_COLORS.length],
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [data, activeSessionStats, hasFilter]);

  const weekdayBreakdown = useMemo(() => {
    const allStats = data?.sessionStats || [];
    const filteredStats = activeSessionStats;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((name, i) => {
      const allDaySess = allStats.filter((s: any) => new Date(s.date).getDay() === i);
      const filtDaySess = filteredStats.filter((s: any) => new Date(s.date).getDay() === i);
      const allPlayers = allDaySess.reduce((s: number, ss: any) => s + ss.players, 0);
      const filtPlayers = filtDaySess.reduce((s: number, ss: any) => s + ss.players, 0);
      return {
        day: i, dayName: name, sessions: allDaySess.length, players: allPlayers,
        avgPlayers: allDaySess.length > 0 ? Math.round((allPlayers / allDaySess.length) * 10) / 10 : 0,
        filteredAvgPlayers: filtDaySess.length > 0 ? Math.round((filtPlayers / filtDaySess.length) * 10) / 10 : 0,
        totalAvgPlayers: allDaySess.length > 0 ? Math.round((allPlayers / allDaySess.length) * 10) / 10 : 0,
      };
    });
  }, [data, activeSessionStats]);

  const sessionBreakdown = useMemo(() => {
    const allStats = data?.sessionStats || [];
    const filteredStats = activeSessionStats;
    const allMap = new Map<string, { title: string; sessions: number; players: number; revenue: number }>();
    for (const s of allStats) {
      const key = s.title || "Untitled";
      if (!allMap.has(key)) allMap.set(key, { title: key, sessions: 0, players: 0, revenue: 0 });
      const e = allMap.get(key)!; e.sessions++; e.players += s.players; e.revenue += s.revenue;
    }
    const filtMap = new Map<string, { revenue: number }>();
    for (const s of filteredStats) {
      const key = s.title || "Untitled";
      if (!filtMap.has(key)) filtMap.set(key, { revenue: 0 });
      filtMap.get(key)!.revenue += s.revenue;
    }
    return [...allMap.values()].map(v => ({
      ...v,
      filteredRevenue: hasFilter ? (filtMap.get(v.title)?.revenue ?? 0) : v.revenue,
      totalRevenue: v.revenue,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [data, activeSessionStats, hasFilter]);

  const timeData = useMemo(() => {
    const buckets = [
      { label: "Early Morning (6-9)", min: 6, max: 9, sessions: 0, players: 0 },
      { label: "Morning (9-12)", min: 9, max: 12, sessions: 0, players: 0 },
      { label: "Afternoon (12-17)", min: 12, max: 17, sessions: 0, players: 0 },
      { label: "Evening (17-21)", min: 17, max: 21, sessions: 0, players: 0 },
      { label: "Night (21+)", min: 21, max: 24, sessions: 0, players: 0 },
    ];
    for (const s of activeSessionStats) {
      if (!s.startTime) continue;
      const hour = parseInt(s.startTime.split(":")[0]);
      for (const b of buckets) {
        if (hour >= b.min && hour < b.max) {
          b.sessions++; b.players += s.players; break;
        }
      }
    }
    return buckets.filter(b => b.sessions > 0);
  }, [activeSessionStats]);

  const capacityData = useMemo(() => {
    const buckets = [
      { label: "0-25%", min: 0, max: 25, count: 0 },
      { label: "25-50%", min: 25, max: 50, count: 0 },
      { label: "50-75%", min: 50, max: 75, count: 0 },
      { label: "75-100%", min: 75, max: 100, count: 0 },
      { label: "100%+", min: 100, max: 999, count: 0 },
    ];
    for (const s of activeSessionStats) {
      const pct = s.maxPlayers > 0 ? (s.players / s.maxPlayers) * 100 : 0;
      for (const b of buckets) {
        if (pct >= b.min && pct < b.max) { b.count++; break; }
      }
    }
    return buckets.filter(b => b.count > 0).map((b, i) => ({ ...b, fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }));
  }, [activeSessionStats]);

  const revenueBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of activeSessionStats) {
      const key = s.title || "Other";
      map.set(key, (map.get(key) || 0) + s.revenue);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, fill: GRADIENT_COLORS[i % GRADIENT_COLORS.length] }));
  }, [activeSessionStats]);

  const sortedPlayers = useMemo(() => {
    if (!data?.playerStats) return [];
    let players = [...data.playerStats];

    if (hasFilter) {
      const activePlayerIds = new Set(activeSignups.map((s: any) => s.playerId));
      const revenueByPlayer = new Map<number, number>();
      const sessionsByPlayer = new Map<number, number>();
      for (const s of activeSignups) {
        revenueByPlayer.set(s.playerId, (revenueByPlayer.get(s.playerId) || 0) + s.fee);
        sessionsByPlayer.set(s.playerId, (sessionsByPlayer.get(s.playerId) || 0) + 1);
      }
      players = players
        .filter((p: any) => activePlayerIds.has(p.id))
        .map((p: any) => ({
          ...p,
          revenue: revenueByPlayer.get(p.id) || 0,
          sessions: sessionsByPlayer.get(p.id) || 0,
        }));
    }

    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      players = players.filter((p: any) => p.name?.toLowerCase().includes(q));
    }
    return players.sort((a: any, b: any) => (b[playerSort] || 0) - (a[playerSort] || 0));
  }, [data, playerSearch, playerSort, hasFilter, activeSignups]);

  const topSpenders = useMemo(() => {
    return sortedPlayers.slice(0, 5);
  }, [sortedPlayers]);

  const playerRadar = useMemo(() => {
    if (!selectedPlayer) return [];
    const allPlayers = data?.playerStats || [];
    const maxRev = Math.max(...allPlayers.map((p: any) => p.revenue || 0), 1);
    const maxSess = Math.max(...allPlayers.map((p: any) => p.sessions || 0), 1);
    return [
      { metric: "Spend", value: Math.round((selectedPlayer.revenue / maxRev) * 100) },
      { metric: "Attendance", value: selectedPlayer.attendanceRate || 0 },
      { metric: "Sessions", value: Math.round((selectedPlayer.sessions / maxSess) * 100) },
      { metric: "Consistency", value: selectedPlayer.attendanceRate > 80 ? 85 : selectedPlayer.attendanceRate > 50 ? 60 : 30 },
      { metric: "Engagement", value: Math.min(100, Math.round((selectedPlayer.sessions / maxSess) * 120)) },
    ];
  }, [selectedPlayer, data]);

  const memberValueScore = useCallback((p: any) => {
    if (!p) return 0;
    const allPlayers = data?.playerStats || [];
    const maxRev = Math.max(...allPlayers.map((x: any) => x.revenue || 0), 1);
    const maxSess = Math.max(...allPlayers.map((x: any) => x.sessions || 0), 1);
    return Math.round(
      ((p.revenue || 0) / maxRev) * 30 +
      ((p.attendanceRate || 0) / 100) * 30 +
      ((p.sessions || 0) / maxSess) * 25 +
      (p.sessions >= 5 ? 15 : ((p.sessions || 0) / 5) * 15)
    );
  }, [data]);

  const tooltipStyle = {
    backgroundColor: "rgba(15,20,30,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    fontSize: "11px",
    color: "#fff",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="relative min-h-screen rounded-2xl overflow-hidden" style={{ background: "#0b0f14" }} data-testid="command-center">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 20% 0%, rgba(168,85,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.06) 0%, transparent 50%)",
      }} />

      <div className="relative z-10 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">Command Center</h1>
            <p className="text-[10px] text-white/30 tracking-wider uppercase mt-0.5">Executive Analytics Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilter && (
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
                onClick={clearAll} data-testid="cc-clear-filters">
                <RotateCcw className="h-3 w-3" /> Clear All
              </Button>
            )}
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px]">
              <Zap className="h-3 w-3 mr-1" /> LIVE
            </Badge>
          </div>
        </div>

        {filterBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {filterBadges.map(fb => {
              const Icon = iconForCategory(fb.category);
              return (
                <div key={fb.category} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border border-white/10"
                  style={{ background: "rgba(168,85,247,0.1)" }} data-testid={`cc-filter-badge-${fb.category}`}>
                  <Icon className="h-3 w-3 text-purple-400" />
                  <span className="text-white/60 max-w-[200px] truncate">{fb.label}</span>
                  <button className="ml-0.5 p-0.5 rounded hover:bg-white/10 transition-colors" onClick={() => removeCategory(fb.category)}>
                    <X className="h-3 w-3 text-white/40" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-white/20 px-1">Tap any chart bar to filter. Long-press to enable multi-select.</p>

        <SectionHeader title="Global Performance" subtitle="Key performance indicators across all clubs" icon={BarChart3} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="cc-kpis">
          <NeonKpiCard icon={DollarSign} label="Total Revenue" value={formatPence(kpis.totalRevenue)} glow={NEON.green} color="green"
            subtitle="All clubs combined" totalValue={hasFilter ? formatPence(data?.kpis?.totalRevenue || 0) : undefined} />
          <NeonKpiCard icon={Calendar} label="Sessions" value={kpis.totalSessions} glow={NEON.blue} color="blue"
            subtitle="Completed sessions" totalValue={hasFilter ? (data?.kpis?.totalSessions || 0) : undefined} />
          <NeonKpiCard icon={Users} label="Total Signups" value={kpis.totalPlayers} glow={NEON.purple} color="purple"
            subtitle="Confirmed attendance" totalValue={hasFilter ? (data?.kpis?.totalPlayers || 0) : undefined} />
          <NeonKpiCard icon={Target} label="Fill Rate" value={`${kpis.fillRate}%`} glow={NEON.cyan} color="cyan"
            subtitle="Capacity utilisation" totalValue={hasFilter ? `${data?.kpis?.fillRate || 0}%` : undefined} />
          <NeonKpiCard icon={Activity} label="No-Show Rate" value={`${kpis.noShowRate}%`} glow={kpis.noShowRate > 15 ? NEON.red : NEON.green} color={kpis.noShowRate > 15 ? "red" : "green"}
            totalValue={hasFilter ? `${data?.kpis?.noShowRate || 0}%` : undefined} />
          <NeonKpiCard icon={DollarSign} label="Rev/Player" value={formatPence(kpis.revenuePerPlayer)} glow={NEON.amber} color="amber"
            subtitle="Average spend" totalValue={hasFilter ? formatPence(data?.kpis?.revenuePerPlayer || 0) : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Revenue & Attendance Trend</h3>
                {hasFilter && <Badge className="text-[8px] bg-purple-500/15 text-purple-300 border-purple-500/20">Filtered</Badge>}
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonalData} onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) {
                      const item = e.activePayload[0].payload;
                      if (item.key) toggleItem("month", item.key);
                    }
                  }}>
                    <defs>
                      <linearGradient id="ccRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.green} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={NEON.green} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ccPlayerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.purple} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={NEON.purple} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickFormatter={(v: number) => formatPenceShort(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Revenue" ? formatPence(v) : v} cursor={{ fill: "rgba(168,85,247,0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke={NEON.green} fill="url(#ccRevGrad)" strokeWidth={2} dot={{ r: 3, fill: NEON.green }} style={{ cursor: "pointer" }} />
                    <Area yAxisId="right" type="monotone" dataKey="players" name="Players" stroke={NEON.purple} fill="url(#ccPlayerGrad)" strokeWidth={2} dot={{ r: 3, fill: NEON.purple }} style={{ cursor: "pointer" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Revenue by Session</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      onClick={(entry: any) => { if (entry?.name) toggleItem("session", entry.name); }}
                      label={({ name, percent }: any) => `${name?.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
                      style={{ cursor: "pointer" }}
                    >
                      {revenueBySource.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent"
                          opacity={filter.sessionTitles.length === 0 || filter.sessionTitles.includes(entry.name) ? 1 : 0.2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPence(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Attendance Analytics" subtitle="Session participation patterns and utilisation" icon={Users} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Weekday Performance</h3>
                {multiSelectMode === "weekday" && <Badge className="text-[8px] bg-amber-500/20 text-amber-300 border-amber-500/20"><Lock className="h-2.5 w-2.5 mr-0.5" />Multi</Badge>}
              </div>
              <div className="h-[220px]"
                onPointerDown={() => startLongPress("weekday")}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayBreakdown} onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) {
                      const wd = e.activePayload[0].payload;
                      toggleItem("weekday", wd.day, wd.dayName);
                    }
                  }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {hasFilter && <Bar dataKey="totalAvgPlayers" name="Total Avg" radius={[6, 6, 0, 0]} fill={NEON.purple} opacity={0.12} isAnimationActive={false} />}
                    <Bar dataKey={hasFilter ? "filteredAvgPlayers" : "avgPlayers"} name="Avg Players" radius={[6, 6, 0, 0]} cursor="pointer"
                      shape={(props: any) => {
                        const isActive = filter.weekdays.length === 0 || filter.weekdays.includes(props.payload?.day);
                        return <rect {...props} fill={GRADIENT_COLORS[props.index % GRADIENT_COLORS.length]} opacity={isActive ? 0.8 : 0.2} />;
                      }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Time of Day Analysis</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis dataKey="label" type="category" width={80} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false}
                      tickFormatter={(v: string) => v.replace(/ \(\d+-\d+\)/, "")} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="sessions" name="Sessions" radius={[0, 6, 6, 0]}>
                      {timeData.map((_: any, i: number) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Capacity Utilisation</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Sessions" radius={[6, 6, 0, 0]}>
                      {capacityData.map((_: any, i: number) => (
                        <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Financial Analytics" subtitle="Revenue breakdown and club performance" icon={DollarSign} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Club Performance Comparison</h3>
                {multiSelectMode === "club" && <Badge className="text-[8px] bg-amber-500/20 text-amber-300 border-amber-500/20"><Lock className="h-2.5 w-2.5 mr-0.5" />Multi</Badge>}
              </div>
              <div className="h-[260px]"
                onPointerDown={() => startLongPress("club")}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clubBreakdown} onClick={(e: any) => {
                    if (e?.activePayload?.[0]?.payload) {
                      const club = e.activePayload[0].payload;
                      toggleItem("club", club.id, club.name);
                    }
                  }}>
                    <defs>
                      <linearGradient id="ccClubRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.blue} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={NEON.blue} stopOpacity={0.3} />
                      </linearGradient>
                      <linearGradient id="ccClubPlayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={NEON.purple} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={NEON.purple} stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickFormatter={(v: number) => formatPenceShort(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name.includes("Revenue") ? formatPence(v) : v} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                    {hasFilter && <Bar yAxisId="left" dataKey="totalRevenue" name="Total Revenue" fill={NEON.blue} opacity={0.12} radius={[6, 6, 0, 0]} isAnimationActive={false} />}
                    <Bar yAxisId="left" dataKey="filteredRevenue" name="Revenue" radius={[6, 6, 0, 0]} cursor="pointer"
                      shape={(props: any) => {
                        const isActive = filter.clubIds.length === 0 || filter.clubIds.includes(props.payload?.id);
                        return <rect {...props} fill={NEON.blue} opacity={isActive ? 0.85 : 0.2} />;
                      }} />
                    {hasFilter && <Bar yAxisId="right" dataKey="totalPlayers" name="Total Players" fill={NEON.purple} opacity={0.12} radius={[6, 6, 0, 0]} isAnimationActive={false} />}
                    <Bar yAxisId="right" dataKey="filteredPlayers" name="Players" radius={[6, 6, 0, 0]} cursor="pointer"
                      shape={(props: any) => {
                        const isActive = filter.clubIds.length === 0 || filter.clubIds.includes(props.payload?.id);
                        return <rect {...props} fill={NEON.purple} opacity={isActive ? 0.85 : 0.2} />;
                      }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-4">Top Spenders</h3>
              <div className="space-y-3">
                {topSpenders.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => { setSelectedPlayer(p); toggleItem("player", p.id, p.name); }} data-testid={`top-spender-${p.id}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${GRADIENT_COLORS[i]}40, ${GRADIENT_COLORS[i]}10)`,
                        border: `1px solid ${GRADIENT_COLORS[i]}40`,
                        color: GRADIENT_COLORS[i],
                      }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white/80 truncate group-hover:text-white transition-colors">{p.name}</div>
                      <div className="text-[10px] text-white/30">{p.sessions} sessions</div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: GRADIENT_COLORS[i] }}>
                      {formatPence(p.revenue)}
                    </div>
                  </div>
                ))}
                {topSpenders.length === 0 && <p className="text-xs text-white/20 text-center py-4">No data</p>}
              </div>
            </div>
          </GlassCard>
        </div>

        <SectionHeader title="Session Rankings" subtitle="Click a session to filter across the dashboard" icon={Star} />
        <GlassCard>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Sessions by Revenue</h3>
              {multiSelectMode === "session" && <Badge className="text-[8px] bg-amber-500/20 text-amber-300 border-amber-500/20"><Lock className="h-2.5 w-2.5 mr-0.5" />Multi</Badge>}
            </div>
            <div className="h-[220px]"
              onPointerDown={() => startLongPress("session")}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionBreakdown.slice(0, 8)} layout="vertical" onClick={(e: any) => {
                  if (e?.activePayload?.[0]?.payload) {
                    const sess = e.activePayload[0].payload;
                    toggleItem("session", sess.title);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickFormatter={(v: number) => formatPenceShort(v)} />
                  <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 8, fill: "rgba(255,255,255,0.4)" }} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPence(v)} />
                  {hasFilter && <Bar dataKey="totalRevenue" name="Total Revenue" radius={[0, 6, 6, 0]} fill={NEON.green} opacity={0.12} isAnimationActive={false} />}
                  <Bar dataKey={hasFilter ? "filteredRevenue" : "revenue"} name="Revenue" radius={[0, 6, 6, 0]} cursor="pointer"
                    shape={(props: any) => {
                      const isActive = filter.sessionTitles.length === 0 || filter.sessionTitles.includes(props.payload?.title);
                      return <rect {...props} fill={NEON.green} opacity={isActive ? 0.8 : 0.2} />;
                    }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        <SectionHeader title="Member Value Analytics" subtitle="Individual player performance and engagement scores" icon={Users} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Member Explorer</h3>
                  {multiSelectMode === "player" && <Badge className="text-[8px] bg-amber-500/20 text-amber-300 border-amber-500/20"><Lock className="h-2.5 w-2.5 mr-0.5" />Multi</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                    <Input placeholder="Search members..." value={playerSearch} onChange={e => setPlayerSearch(e.target.value)}
                      className="pl-7 h-7 text-[11px] w-32 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                      data-testid="cc-player-search" />
                  </div>
                  <div className="flex gap-1">
                    {(["revenue", "sessions", "attendanceRate"] as const).map(key => (
                      <Button key={key} size="sm" variant="ghost"
                        className={`h-6 text-[9px] px-2 ${playerSort === key ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
                        onClick={() => setPlayerSort(key)}>
                        {key === "revenue" ? "Spend" : key === "sessions" ? "Sessions" : "Attend."}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 custom-scrollbar"
                onPointerDown={() => startLongPress("player")}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}>
                {sortedPlayers.map((p: any) => {
                  const vs = memberValueScore(p);
                  const isSelected = selectedPlayer?.id === p.id;
                  const isFiltered = filter.playerIds.includes(p.id);
                  return (
                    <div key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected ? "bg-purple-500/15 border border-purple-500/30" :
                        isFiltered ? "bg-blue-500/10 border border-blue-500/20" :
                        "hover:bg-white/[0.03] border border-transparent"
                      }`}
                      onClick={() => {
                        setSelectedPlayer(isSelected ? null : p);
                        toggleItem("player", p.id, p.name);
                      }}
                      data-testid={`cc-player-${p.id}`}
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: `conic-gradient(${vs > 70 ? NEON.green : vs > 40 ? NEON.amber : NEON.red} ${vs}%, transparent ${vs}%)`,
                          border: "2px solid rgba(255,255,255,0.1)",
                        }}>
                        <span className="text-[10px] text-white/80">{vs}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/80 truncate">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-white/30">{p.sessions} sessions</span>
                          <span className="text-[9px] text-white/30">{p.attendanceRate}% att.</span>
                          {p.clubs?.length > 0 && <span className="text-[9px] text-white/20">{p.clubs[0]}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white/80">{formatPence(p.revenue)}</div>
                        <div className="text-[9px] text-white/30">{p.noShows} no-shows</div>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 text-white/20 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>
                  );
                })}
                {sortedPlayers.length === 0 && (
                  <div className="text-center py-8 text-white/20 text-xs">No members found</div>
                )}
              </div>
            </div>
          </GlassCard>

          {selectedPlayer ? (
            <GlassCard glow={NEON.purple}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Member Profile</h3>
                  <button onClick={() => setSelectedPlayer(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <X className="h-3.5 w-3.5 text-white/40" />
                  </button>
                </div>

                <div className="text-center mb-4">
                  <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${NEON.purple}40, ${NEON.blue}20)`,
                      border: `2px solid ${NEON.purple}40`,
                      color: NEON.purple,
                    }}>
                    {selectedPlayer.name?.charAt(0) || "?"}
                  </div>
                  <div className="text-sm font-bold text-white">{selectedPlayer.name}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Badge className="text-[8px] bg-purple-500/20 text-purple-300 border-purple-500/20">
                      Value: {memberValueScore(selectedPlayer)}/100
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{formatPence(selectedPlayer.revenue)}</div>
                    <div className="text-[8px] text-white/30 uppercase">Spent</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{selectedPlayer.sessions}</div>
                    <div className="text-[8px] text-white/30 uppercase">Sessions</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-xs font-bold text-white">{selectedPlayer.attendanceRate}%</div>
                    <div className="text-[8px] text-white/30 uppercase">Attend.</div>
                  </div>
                </div>

                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={playerRadar} cx="50%" cy="50%">
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar name="Score" dataKey="value" stroke={NEON.purple} fill={NEON.purple} fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: NEON.purple }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {selectedPlayer.sessionTitles?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Sessions Played</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlayer.sessionTitles.map((t: string, i: number) => (
                        <Badge key={i} className="text-[8px] bg-white/5 text-white/50 border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleItem("session", t); }}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          ) : (
            <GlassCard>
              <div className="p-4 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <Eye className="h-6 w-6 text-purple-400/50" />
                </div>
                <p className="text-xs text-white/30 text-center">Select a member from the list to view their analytics profile</p>
              </div>
            </GlassCard>
          )}
        </div>

        <SectionHeader title="AI Insights" subtitle="Intelligent analysis of your club data" icon={Brain} />
        <GlassCard glow={NEON.cyan}>
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Brain className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50" />
                <Input placeholder="Ask anything about your club data..."
                  value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && aiQuestion.trim()) { aiMutation.mutate(aiQuestion); setAiQuestion(""); } }}
                  className="pl-9 h-9 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
                  data-testid="cc-ai-input" />
              </div>
              <Button size="sm" className="h-9 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 border-0 text-white hover:from-purple-600 hover:to-blue-600"
                onClick={() => { if (aiQuestion.trim()) { aiMutation.mutate(aiQuestion); setAiQuestion(""); } else { aiMutation.mutate(undefined); } }}
                disabled={aiMutation.isPending} data-testid="cc-ai-generate">
                {aiMutation.isPending ? <span className="animate-pulse text-[10px]">Analysing...</span> : <><Send className="h-3.5 w-3.5 mr-1" /> Analyse</>}
              </Button>
            </div>

            {aiMutation.data?.report && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] max-h-[400px] overflow-y-auto custom-scrollbar">
                <AIReportDark content={aiMutation.data.report} />
              </div>
            )}

            {!aiMutation.data?.report && !aiMutation.isPending && (
              <div className="text-center py-6">
                <Brain className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-[10px] text-white/20">Click Analyse for an AI-generated report, or ask a specific question</p>
                {hasFilter && <p className="text-[9px] text-purple-400/40 mt-1">AI will analyse the currently filtered data</p>}
              </div>
            )}
          </div>
        </GlassCard>

        {data?.alerts?.length > 0 && (
          <>
            <SectionHeader title="Smart Alerts" subtitle="Automated performance warnings and insights" icon={Activity} />
            <GlassCard>
              <div className="p-4 space-y-2">
                {data.alerts.slice(0, 8).map((alert: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className={`p-1.5 rounded-lg ${alert.severity === "warning" ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
                      {alert.severity === "warning" ?
                        <TrendingDown className="h-3 w-3 text-amber-400" /> :
                        <TrendingUp className="h-3 w-3 text-blue-400" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/60">{alert.message}</p>
                    </div>
                    <Badge className={`text-[8px] ${alert.severity === "warning" ? "bg-amber-500/20 text-amber-300 border-amber-500/20" : "bg-blue-500/20 text-blue-300 border-blue-500/20"}`}>
                      {alert.severity === "warning" ? "Warning" : "Info"}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

function AIReportDark({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-[11px]">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="text-xs font-bold mt-3 mb-1 text-white/90">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold mt-2 mb-1 text-white/80">{line.slice(4)}</h4>;
        if (line.startsWith("# ")) return <h2 key={i} className="text-sm font-bold mt-3 mb-1.5 text-white">{line.slice(2)}</h2>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 text-white/60">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-white/60 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i} className="text-white/60">{line}</p>;
      })}
    </div>
  );
}

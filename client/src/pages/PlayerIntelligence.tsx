import { useUser } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { useClubs } from "@/hooks/use-clubs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PremiumFeatureGate } from "@/components/PremiumFeatureGate";
import { getAvatarUrl } from "@/components/AvatarPicker";
import { RivalryArenaView } from "@/components/RivalryArena";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Users, Trophy, Target, Zap, Shield, Activity,
  TrendingUp, TrendingDown, Award, Star, Clock, BarChart3,
  Swords, ChevronRight, ChevronLeft, Brain, Loader2, Lock,
  Flame, Medal, Crown, Heart, Eye, Crosshair, Dumbbell,
  Lightbulb, BookOpen, Move, GitCompare, MessageSquare, Sparkles,
  PoundSterling, CheckCircle, XCircle, Send, ClipboardList,
  MapPin, UserCheck, MinusCircle
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart, Cell
} from "recharts";

type ProfileData = {
  id: number;
  clubId: number;
  gender: string | null;
  category: string | null;
  grade?: string | null;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
};

type PlayerData = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  profilePictureUrl?: string | null;
  selectedAvatar?: string | null;
  playerProfiles: ProfileData[];
};

const GRADE_COLORS: Record<string, string> = {
  A1: "from-yellow-500 to-amber-600",
  A2: "from-yellow-400 to-amber-500",
  A3: "from-yellow-300 to-amber-400",
  B1: "from-blue-500 to-indigo-600",
  B2: "from-blue-400 to-indigo-500",
  B3: "from-blue-300 to-indigo-400",
  C1: "from-green-500 to-emerald-600",
  C2: "from-green-400 to-emerald-500",
  C3: "from-green-300 to-emerald-400",
};

const GRADE_GLOW: Record<string, string> = {
  A1: "shadow-yellow-500/20",
  A2: "shadow-yellow-400/20",
  A3: "shadow-yellow-300/20",
  B1: "shadow-blue-500/20",
  B2: "shadow-blue-400/20",
  B3: "shadow-blue-300/20",
  C1: "shadow-green-500/20",
  C2: "shadow-green-400/20",
  C3: "shadow-green-300/20",
};

const CATEGORY_ICONS: Record<string, any> = {
  target: Target, crosshair: Crosshair, zap: Zap, shield: Shield,
  move: Move, brain: Brain, lightbulb: Lightbulb, book: BookOpen,
  heart: Heart, dumbbell: Dumbbell,
};

function PlayerAvatar({ name, id, size = "md", className = "", profilePictureUrl, selectedAvatar, gender, grade }: {
  name: string; id?: number; size?: "sm" | "md" | "lg" | "xl" | "hero"; className?: string; profilePictureUrl?: string | null; selectedAvatar?: string | null; gender?: string | null; grade?: string | null;
}) {
  const sizeMap = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-20 w-20", xl: "h-24 w-24", hero: "h-32 w-32" };
  const textSize = { sm: "text-[10px]", md: "text-xs", lg: "text-lg", xl: "text-2xl", hero: "text-4xl" };
  const silhouetteSize = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-12 w-12", xl: "h-14 w-14", hero: "h-20 w-20" };
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const avatarSrc = profilePictureUrl || getAvatarUrl(selectedAvatar) || null;

  const gradeGradient = grade && GRADE_COLORS[grade]
    ? GRADE_COLORS[grade]
    : "from-primary to-primary/70";

  const isHeroOrXl = size === "hero" || size === "xl";
  const isLarge = size === "lg" || isHeroOrXl;

  const outerPadding = { sm: "p-[2px]", md: "p-[2px]", lg: "p-[3px]", xl: "p-[3px]", hero: "p-[3px]" };
  const glowSize = isHeroOrXl ? "shadow-xl" : isLarge ? "shadow-lg" : "shadow-md";
  const glowColor = grade ? (GRADE_GLOW[grade] || "shadow-primary/10") : "shadow-primary/10";

  return (
    <div className={`relative inline-flex ${className}`}>
      <div className={`rounded-full bg-gradient-to-br ${gradeGradient} ${outerPadding[size]} ${glowSize} ${glowColor}`}>
        <Avatar className={`${sizeMap[size]} border-2 border-background`}>
          {avatarSrc && <AvatarImage src={avatarSrc} alt={name} className="object-cover" />}
          <AvatarFallback className={`${textSize[size]} bg-muted font-bold`}>
            {avatarSrc ? initials : (
              <svg className={`${silhouetteSize[size]} text-muted-foreground`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </AvatarFallback>
        </Avatar>
      </div>
      {isHeroOrXl && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

function StatIcon({ icon: Icon, color = "#22d3ee" }: { icon: any; color?: string }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, subtitle, color = "text-cyan-400", sparkColor }: {
  label: string; value: string | number; icon: any; trend?: number; subtitle?: string; color?: string; sparkColor?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-4 flex flex-col gap-1.5 group hover:border-cyan-500/30 transition-all duration-300" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/3 to-transparent rounded-bl-full" />
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</span>
        <StatIcon icon={Icon} color={sparkColor || "#22d3ee"} />
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {trend !== undefined && (
          <span className={`text-[11px] flex items-center gap-0.5 mb-0.5 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
    </div>
  );
}

function AchievementBadge({ badge }: { badge: any }) {
  const iconMap: Record<string, any> = {
    MATCHES: Swords, ATTENDANCE: Clock, WINS: Trophy,
    match_milestone: Swords, win_milestone: Trophy, session_milestone: Clock,
    streak: Flame, grade_promotion: TrendingUp, perfect_session: Star,
    social: Users, default: Award,
  };
  const badgeName = badge.name || badge.achievementName;
  const badgeType = badge.type || badge.achievementType;
  const isLocked = badge.unlocked === false || badge.locked === true;
  const progressPercent = badge.target ? Math.min((badge.progress / badge.target) * 100, 100) : badge.progress;
  const Icon = iconMap[badgeType] || iconMap.default;
  return (
    <div
      className={`relative rounded-2xl p-4 text-center transition-all duration-300 ${
        isLocked
          ? "bg-muted/30 dark:bg-muted/10 border border-dashed border-border opacity-40"
          : "bg-card border border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5"
      }`}
      data-testid={`badge-${badgeName?.replace(/\s+/g, '-')}`}
    >
      {isLocked && <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />}
      <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${isLocked ? "bg-muted/50" : "bg-cyan-500/10"}`}>
        <Icon className={`h-6 w-6 ${isLocked ? "text-muted-foreground" : "text-cyan-400"}`} />
      </div>
      <p className="text-xs font-semibold truncate text-foreground">{badgeName}</p>
      {badge.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>}
      {progressPercent !== undefined && isLocked && (
        <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500/70 rounded-full transition-all" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function PlayerListItem({ player, isSelected, onSelect, clubId }: {
  player: PlayerData; isSelected: boolean; onSelect: () => void; clubId: string;
}) {
  const profile = clubId !== "all"
    ? player.playerProfiles.find(p => p.clubId === Number(clubId)) || player.playerProfiles[0]
    : player.playerProfiles[0];
  const grade = profile?.grade || profile?.category || "—";
  const winRate = profile && profile.matchesPlayed > 0
    ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100) : 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left ${
        isSelected
          ? "bg-cyan-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/5"
          : "border border-transparent hover:bg-muted/40 hover:border-border"
      }`}
      data-testid={`player-list-item-${player.id}`}
    >
      <PlayerAvatar name={player.fullName} id={player.id} size="md" profilePictureUrl={player.profilePictureUrl} selectedAvatar={player.selectedAvatar} gender={profile?.gender} grade={grade !== "—" ? grade : undefined} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isSelected ? "text-cyan-300" : "text-foreground"}`}>{player.fullName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{grade !== "—" ? grade : "Ungraded"}</p>
      </div>
      {isSelected && <ChevronRight className="h-4 w-4 text-cyan-400 shrink-0" />}
    </button>
  );
}

function PerformanceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <p className="text-muted-foreground text-sm text-center py-8">No performance data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="winRateGradientCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="winRateGradientPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" domain={[0, 100]} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            fontSize: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            color: "hsl(var(--foreground))",
          }}
        />
        <Area type="monotone" dataKey="winRate" stroke="#22d3ee" fill="url(#winRateGradientCyan)" strokeWidth={2.5} name="Win Rate %" dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#22d3ee", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DifficultyChart({ data }: { data: any }) {
  if (!data) return null;
  const chartData = [
    { level: "Higher", wins: data.vsHigher?.wins || 0, losses: data.vsHigher?.losses || 0 },
    { level: "Same", wins: data.vsSame?.wins || 0, losses: data.vsSame?.losses || 0 },
    { level: "Lower", wins: data.vsLower?.wins || 0, losses: data.vsLower?.losses || 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="winsGradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="lossesGradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis dataKey="level" tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" axisLine={false} />
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", color: "hsl(var(--foreground))" }} />
        <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }} />
        <Area type="monotone" dataKey="wins" stroke="#22d3ee" fill="url(#winsGradientFill)" strokeWidth={2.5} name="Wins" dot={{ r: 4, fill: "#22d3ee", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#22d3ee", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
        <Area type="monotone" dataKey="losses" stroke="#a78bfa" fill="url(#lossesGradientFill)" strokeWidth={2.5} name="Losses" dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#a78bfa", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SkillRadarChart({ evaluations }: { evaluations: any[] }) {
  if (!evaluations || evaluations.length === 0) return <p className="text-muted-foreground text-sm text-center py-8">No skill evaluations yet</p>;
  const categoryMap: Record<string, { total: number; count: number }> = {};
  evaluations.forEach((e: any) => {
    const cat = e.categoryName || "Other";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += e.rating;
    categoryMap[cat].count += 1;
  });
  const radarData = Object.entries(categoryMap).map(([name, v]) => ({
    skill: name.length > 12 ? name.substring(0, 12) + "…" : name,
    rating: Math.round(v.total / v.count),
    fullMark: 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={radarData} cx="50%" cy="50%">
        <PolarGrid stroke="hsl(var(--border))" opacity={0.5} />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "#64748b" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
        <Radar name="Skill" dataKey="rating" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function PlayerStatsRadar({ stats }: { stats: any }) {
  if (!stats) return null;
  const maxMatches = Math.max(stats.matchesPlayed || 1, 1);
  const maxPoints = Math.max(stats.pointsScored || 1, 1);
  const radarData = [
    { stat: "Win Rate", value: stats.winRate || 0, fullMark: 100 },
    { stat: "Attack", value: maxPoints > 0 ? Math.min(Math.round((stats.pointsScored / Math.max(stats.pointsScored + (stats.pointsConceded || 0), 1)) * 100), 100) : 0, fullMark: 100 },
    { stat: "Consistency", value: stats.sessionsAttended > 0 ? Math.min(Math.round((stats.sessions30d / Math.max(stats.sessionsAttended, 1)) * 100), 100) : Math.min(stats.matchesPlayed * 10, 100), fullMark: 100 },
    { stat: "Impact", value: Math.min(stats.sessionImpactScore || 0, 100), fullMark: 100 },
    { stat: "Experience", value: Math.min(Math.round((stats.uniqueOpponents || 0) * 8), 100), fullMark: 100 },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-cyan-500/20 p-4" data-testid="player-stats-radar">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-400/5 pointer-events-none" />
      <h4 className="text-sm font-semibold text-cyan-300/90 mb-2 flex items-center gap-2 relative z-10">
        <Activity className="h-4 w-4" />
        Performance Radar
      </h4>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData} cx="50%" cy="50%">
          <PolarGrid stroke="#22d3ee" strokeOpacity={0.15} gridType="polygon" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#64748b" }}
            axisLine={false}
          />
          <Radar
            name="Stats"
            dataKey="value"
            stroke="#22d3ee"
            fill="#22d3ee"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}


function SkillReviewTab({ playerId, clubId, isAdmin, isOwnProfile }: {
  playerId: number; clubId: number; isAdmin: boolean; isOwnProfile: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [evaluateRequestId, setEvaluateRequestId] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [newNote, setNewNote] = useState("");

  const canViewCoachNotes = isAdmin || isOwnProfile;

  const { data: skillEvals } = useQuery({
    queryKey: ["/api/players/skill-review", playerId],
    enabled: !!playerId,
  });
  const { data: categories } = useQuery({
    queryKey: ["/api/players/skill-categories"],
  });
  const { data: skills } = useQuery({
    queryKey: ["/api/players/skills"],
  });
  const { data: coachNotes } = useQuery({
    queryKey: ["/api/players/coach-notes", playerId],
    enabled: !!playerId && canViewCoachNotes,
  });
  const { data: pendingRequests } = useQuery({
    queryKey: ["/api/players/skill-review/requests"],
    enabled: isAdmin,
  });

  const requestReview = useMutation({
    mutationFn: () => apiRequest("POST", "/api/players/skill-review/request", { playerId, clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/skill-review", playerId] });
      toast({ title: "Review Requested", description: "Your skill review request has been submitted." });
      setShowRequestDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acceptRequest = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/players/skill-review/requests/${id}/accept`, { paymentConfirmed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/skill-review/requests"] });
      toast({ title: "Request Accepted" });
    },
  });

  const submitEvaluation = useMutation({
    mutationFn: (data: { reviewRequestId: number; evaluations: any[] }) =>
      apiRequest("POST", "/api/players/skill-review/evaluate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/skill-review", playerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/players/skill-review/requests"] });
      toast({ title: "Evaluation Saved" });
      setEvaluateRequestId(null);
      setRatings({});
      setComments({});
    },
  });

  const addNote = useMutation({
    mutationFn: () => apiRequest("POST", "/api/players/coach-notes", { playerId, clubId, note: newNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players/coach-notes", playerId] });
      setNewNote("");
      toast({ title: "Note Added" });
    },
  });

  const rawEvals = Array.isArray(skillEvals) ? skillEvals : (skillEvals as any)?.evaluations || [];
  const evalList = rawEvals.map((e: any) => ({
    ...e,
    categoryName: e.category?.name || e.categoryName,
    categoryId: e.category?.id || e.categoryId || e.skill?.categoryId,
    skillName: e.skill?.name || e.skillName,
    skillId: e.skillId || e.skill?.id,
    rating: e.rating,
  }));
  const requestHistory = (skillEvals as any)?.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Target className="h-5 w-5 text-cyan-400" />
          Skill Assessment
        </h3>
        {isOwnProfile && !requestHistory.some((r: any) => r.status === "PENDING" || r.status === "ACCEPTED") && (
          <Button size="sm" onClick={() => setShowRequestDialog(true)} className="rounded-xl" data-testid="button-request-review">
            <PoundSterling className="h-4 w-4 mr-1" />
            Request Coach Feedback (£20)
          </Button>
        )}
      </div>

      {evalList.length > 0 && <SkillRadarChart evaluations={evalList} />}

      {evalList.length > 0 && (
        <div className="space-y-3">
          {(categories as any[])?.map((cat: any) => {
            const catEvals = evalList.filter((e: any) => e.categoryId === cat.id || e.categoryName === cat.name);
            if (catEvals.length === 0) return null;
            const avg = Math.round(catEvals.reduce((s: number, e: any) => s + e.rating, 0) / catEvals.length);
            const Icon = CATEGORY_ICONS[cat.iconName] || Target;
            return (
              <div key={cat.id} className="bg-muted/30 dark:bg-muted/10 border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    {cat.name}
                  </span>
                  <Badge variant="outline" className="rounded-lg border-border text-cyan-300">{avg}%</Badge>
                </div>
                <div className="space-y-2">
                  {catEvals.map((e: any) => (
                    <div key={e.skillId || e.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-32 truncate">{e.skillName}</span>
                      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500/60 rounded-full transition-all" style={{ width: `${e.rating}%` }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right text-foreground">{e.rating}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && pendingRequests && (pendingRequests as any[]).filter((r: any) => r.status === "PENDING" || r.status === "ACCEPTED").length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Pending Review Requests</h4>
          <div className="space-y-2">
            {(pendingRequests as any[])
              .filter((r: any) => r.status === "PENDING" || r.status === "ACCEPTED")
              .map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-muted/40 dark:bg-muted/15 rounded-xl p-3 border border-border">
                  <div>
                    <p className="text-sm font-medium">{r.playerName || `Player #${r.playerId}`}</p>
                    <Badge variant={r.status === "PENDING" ? "secondary" : "default"} className="text-[10px] rounded-lg">{r.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {r.status === "PENDING" && (
                      <Button size="sm" variant="outline" onClick={() => acceptRequest.mutate(r.id)} className="rounded-xl" data-testid={`button-accept-review-${r.id}`}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Accept
                      </Button>
                    )}
                    {r.status === "ACCEPTED" && (
                      <Button size="sm" onClick={() => setEvaluateRequestId(r.id)} className="rounded-xl" data-testid={`button-evaluate-${r.id}`}>
                        <Star className="h-3 w-3 mr-1" /> Evaluate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {canViewCoachNotes && (
        <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            Coach Notes
          </h4>
          {isAdmin && (
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a coach note..."
                className="min-h-[60px] rounded-xl bg-background border-border"
                data-testid="textarea-coach-note"
              />
              <Button size="sm" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending} className="rounded-xl" data-testid="button-add-note">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="space-y-3">
            {(coachNotes as any[])?.map((n: any) => (
              <div key={n.id} className="bg-muted/40 dark:bg-muted/15 rounded-xl p-3 border border-border">
                <p className="text-sm text-foreground">{n.note}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {n.createdByName || "Coach"} • {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </div>
            )) || <p className="text-sm text-muted-foreground">No coach notes yet</p>}
          </div>
        </div>
      )}

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Skill Review</DialogTitle>
            <DialogDescription>A coach will evaluate your skills across all categories. The cost is £20.</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">£20</div>
            <p className="text-sm text-muted-foreground mt-2">Comprehensive skill assessment by a qualified coach</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => requestReview.mutate()} disabled={requestReview.isPending} className="rounded-xl" data-testid="button-confirm-review-request">
              {requestReview.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {evaluateRequestId && skills && (
        <Dialog open={!!evaluateRequestId} onOpenChange={() => setEvaluateRequestId(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Evaluate Player Skills</DialogTitle>
              <DialogDescription>Rate each skill from 0-100%</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {(categories as any[])?.map((cat: any) => {
                const catSkills = (skills as any[])?.filter((s: any) => s.categoryId === cat.id) || [];
                if (catSkills.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {(() => { const I = CATEGORY_ICONS[cat.iconName] || Target; return <I className="h-4 w-4 text-cyan-400" />; })()}
                      {cat.name}
                    </h4>
                    {catSkills.map((skill: any) => (
                      <div key={skill.id} className="space-y-1 pl-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{skill.name}</span>
                          <span className="text-sm font-medium w-10 text-right">{ratings[skill.id] || 0}%</span>
                        </div>
                        <Slider
                          value={[ratings[skill.id] || 0]}
                          onValueChange={([v]) => setRatings(prev => ({ ...prev, [skill.id]: v }))}
                          max={100}
                          step={1}
                          data-testid={`slider-skill-${skill.id}`}
                        />
                        <Input
                          placeholder="Optional comment..."
                          className="text-xs h-7 rounded-lg"
                          value={comments[skill.id] || ""}
                          onChange={(e) => setComments(prev => ({ ...prev, [skill.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEvaluateRequestId(null)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={() => {
                  const evals = Object.entries(ratings).map(([skillId, rating]) => ({
                    playerId,
                    skillId: Number(skillId),
                    rating,
                    comment: comments[Number(skillId)] || null,
                  }));
                  submitEvaluation.mutate({ reviewRequestId: evaluateRequestId, evaluations: evals });
                }}
                disabled={submitEvaluation.isPending || Object.keys(ratings).length === 0}
                className="rounded-xl"
                data-testid="button-submit-evaluation"
              >
                {submitEvaluation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Evaluation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AIStyleBadge({ playerId }: { playerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/players/analytics", playerId, "ai-style"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${playerId}/ai-style`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!playerId,
    staleTime: 1000 * 60 * 30,
  });
  if (isLoading || !data) return null;
  const styleColors: Record<string, string> = {
    Attacking: "bg-red-500/15 text-red-400 border-red-500/30",
    Defensive: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Tactical: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    Balanced: "bg-green-500/15 text-green-400 border-green-500/30",
    Power: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Control: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  };
  return (
    <div className="space-y-2 mt-2" data-testid="ai-style-badge">
      <Badge variant="outline" className={`${styleColors[data.style] || "bg-muted"} text-xs rounded-lg px-2.5 py-0.5`}>
        <Brain className="h-3 w-3 mr-1" />
        {data.style} Player
      </Badge>
      {data.explanation && <p className="text-[11px] text-muted-foreground leading-relaxed">{data.explanation}</p>}
    </div>
  );
}

function PlayerDashboard({ player, clubId, clubs, isAdmin, currentUserId }: {
  player: PlayerData; clubId: string; clubs: any[]; isAdmin: boolean; currentUserId: number;
}) {
  const [dashTab, setDashTab] = useState("overview");
  const profile = clubId !== "all"
    ? player.playerProfiles.find(p => p.clubId === Number(clubId)) || player.playerProfiles[0]
    : player.playerProfiles[0];
  const profileId = profile?.id;
  const grade = profile?.grade || profile?.category || "N/A";
  const clubName = profile && clubs ? clubs.find((c: any) => c.id === profile.clubId)?.name : "—";
  const isOwnProfile = player.id === currentUserId;

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["/api/players/analytics", profileId],
    enabled: !!profileId,
  });

  const { data: perfHistory } = useQuery({
    queryKey: ["/api/players/analytics", profileId, "performance-history"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${profileId}/performance-history`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileId && dashTab === "overview",
  });

  const { data: matchLog, isLoading: loadingMatchLog } = useQuery<any[]>({
    queryKey: ["/api/players/analytics", profileId, "match-log"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${profileId}/match-log`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileId && dashTab === "matches",
  });

  const { data: achievements } = useQuery({
    queryKey: ["/api/players/analytics", profileId, "achievements"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${profileId}/achievements`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileId && dashTab === "achievements",
  });

  const { data: developmentData, isLoading: loadingDevelopment } = useQuery<any>({
    queryKey: ["/api/players/analytics", profileId, "development"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${profileId}/development`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!profileId && dashTab === "development",
  });

  const stats = (analytics as any)?.stats;

  const heroRadarData = useMemo(() => {
    if (!stats) return [];
    const maxMatches = Math.max(stats.matchesPlayed || 1, 1);
    const maxPoints = Math.max(stats.pointsScored || 1, 1);
    return [
      { stat: "Win Rate", value: stats.winRate || 0, fullMark: 100 },
      { stat: "Attack", value: maxPoints > 0 ? Math.min(Math.round((stats.pointsScored / Math.max(stats.pointsScored + (stats.pointsConceded || 0), 1)) * 100), 100) : 0, fullMark: 100 },
      { stat: "Consistency", value: stats.sessionsAttended > 0 ? Math.min(Math.round((stats.sessions30d / Math.max(stats.sessionsAttended, 1)) * 100), 100) : Math.min(stats.matchesPlayed * 10, 100), fullMark: 100 },
      { stat: "Impact", value: Math.min(stats.sessionImpactScore || 0, 100), fullMark: 100 },
      { stat: "Experience", value: Math.min(Math.round((stats.uniqueOpponents || 0) * 8), 100), fullMark: 100 },
    ];
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08]" style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4338ca 50%, #6366f1 75%, #818cf8 100%)",
      }} data-testid="player-hero-card">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 30% 50%, rgba(139,92,246,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 50%)",
        }} />
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex items-start gap-5 lg:gap-6 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="relative">
                  <PlayerAvatar
                    name={player.fullName}
                    id={player.id}
                    size="hero"
                    profilePictureUrl={player.profilePictureUrl}
                    selectedAvatar={player.selectedAvatar}
                    gender={profile?.gender}
                    grade={grade}
                  />
                  <div className={`absolute -bottom-1 -right-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${GRADE_COLORS[grade] || "from-slate-500 to-slate-600"} shadow-lg border border-white/30`}>
                    {grade}
                  </div>
                </div>
              </div>

              <div className="hidden md:block w-[200px] h-[200px] shrink-0 relative" data-testid="hero-radar">
                {heroRadarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={heroRadarData} cx="50%" cy="50%">
                      <PolarGrid stroke="rgba(255,255,255,0.15)" gridType="polygon" />
                      <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.7)", fontWeight: 600 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Stats" dataKey="value" stroke="#f472b6" fill="#f472b6" fillOpacity={0.2} strokeWidth={2.5} dot={{ r: 4, fill: "#f472b6", stroke: "#fff", strokeWidth: 1 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Activity className="h-12 w-12 text-white/20" />
                  </div>
                )}
                {stats?.matchesPlayed && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-white/10">{stats.matchesPlayed}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">{player.fullName}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm text-white/60 font-medium flex items-center gap-1.5 truncate max-w-[180px]">
                    <Shield className="h-3.5 w-3.5 text-white/40 shrink-0" />
                    {clubName}
                  </span>
                  {profile && (
                    <span className="text-sm text-white/60 flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      <span className="font-semibold text-amber-300">{profile.rankingPoints}</span> pts
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <AIStyleBadge playerId={profileId!} />
                </div>

                {stats && (
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <div className="flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[80px]" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <Trophy className="h-4 w-4 text-red-400 mb-1" />
                      <span className="text-xl font-black text-white leading-none">{stats.matchesWon || 0}</span>
                      <span className="text-[9px] text-white/50 uppercase tracking-wider mt-1 font-semibold">Wins</span>
                    </div>
                    <div className="flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[80px]" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                      <XCircle className="h-4 w-4 text-purple-400 mb-1" />
                      <span className="text-xl font-black text-white leading-none">{stats.matchesLost || 0}</span>
                      <span className="text-[9px] text-white/50 uppercase tracking-wider mt-1 font-semibold">Losses</span>
                    </div>
                    <div className="flex flex-col items-center px-4 py-2.5 rounded-xl min-w-[80px]" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      <Star className="h-4 w-4 text-white/70 mb-1" />
                      <span className="text-xl font-black text-white leading-none">{stats.winRate || 0}%</span>
                      <span className="text-[9px] text-white/50 uppercase tracking-wider mt-1 font-semibold">Win %</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-2 shrink-0 w-full lg:w-auto" data-testid="hero-info-cards">
                <div className="flex flex-col items-center px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Matches</span>
                  <span className="text-base font-black text-white mt-0.5">{stats.matchesPlayed || 0}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Sessions</span>
                  <span className="text-base font-black text-white mt-0.5">{stats.sessionsAttended || 0}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Opponents</span>
                  <span className="text-base font-black text-white mt-0.5">{stats.uniqueOpponents || 0}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Impact</span>
                  <span className="text-base font-black text-white mt-0.5">{stats.sessionImpactScore ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={dashTab} onValueChange={setDashTab}>
        <TabsList className="w-full bg-muted/30 dark:bg-muted/10 border border-border rounded-xl p-1">
          <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-muted-foreground" data-testid="tab-overview">
            <Activity className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1 rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-muted-foreground" data-testid="tab-achievements">
            <Award className="h-4 w-4 mr-1" /> Badges
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex-1 rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-muted-foreground" data-testid="tab-matches">
            <ClipboardList className="h-4 w-4 mr-1" /> Matches
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex-1 rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-muted-foreground" data-testid="tab-skills">
            <Target className="h-4 w-4 mr-1" /> Skills
          </TabsTrigger>
          <TabsTrigger value="development" className="flex-1 rounded-lg data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-muted-foreground" data-testid="tab-development">
            <TrendingUp className="h-4 w-4 mr-1" /> Development
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 mt-5">
          {loadingAnalytics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-2xl" />)}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Matches" value={stats.matchesPlayed || 0} icon={Swords} subtitle={`${stats.matchesWon || 0}W - ${stats.matchesLost || 0}L`} sparkColor="#22d3ee" />
                <StatCard label="Win Rate" value={`${stats.winRate || 0}%`} icon={TrendingUp} color={stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"} sparkColor="#10b981" />
                <StatCard label="Points" value={stats.pointsScored || 0} icon={Target} subtitle={`${stats.pointsConceded || 0} conceded`} sparkColor="#a78bfa" />
                <StatCard label="Sets Won" value={stats.setsWon || 0} icon={Trophy} sparkColor="#f472b6" />
                <StatCard label="Sessions" value={stats.sessionsAttended || 0} icon={Clock} subtitle={`${stats.totalHoursPlayed?.toFixed(1) || 0}h played`} sparkColor="#f59e0b" />
                <StatCard label="Impact Score" value={stats.sessionImpactScore || "0"} icon={Zap} color="text-yellow-400" sparkColor="#eab308" />
                <StatCard label="Opponents" value={stats.uniqueOpponents || 0} icon={Users} sparkColor="#22d3ee" />
                <StatCard label="30-Day Sessions" value={stats.sessions30d || 0} icon={Medal} sparkColor="#10b981" />
                <StatCard label="Difficulty Score" value={stats.opponentDifficultyScore?.toFixed(2) || "—"} icon={BarChart3} sparkColor="#a78bfa" />
              </div>

              <PlayerStatsRadar stats={stats} />

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  Performance Analytics
                  <span className="ml-auto text-[10px] text-muted-foreground font-normal">Win Rate %</span>
                </h4>
                <PerformanceChart data={perfHistory?.monthlyWinRate || []} />
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10">
                  <Swords className="h-4 w-4 text-cyan-400" />
                  Wins vs Losses by Difficulty
                </h4>
                <DifficultyChart data={perfHistory?.difficultyPerformance} />
              </div>

              {perfHistory?.monthlyHours && perfHistory.monthlyHours.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    Hours Per Month
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={perfHistory.monthlyHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="hours" fill="#22d3ee" radius={[6, 6, 0, 0]} fillOpacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">No analytics data available yet</p>
              <p className="text-sm mt-1">Play some matches to see your stats!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches" className="mt-5">
          {loadingMatchLog ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted/20 animate-pulse rounded-xl" />)}
            </div>
          ) : matchLog && matchLog.length > 0 ? (
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  Match Results Overview
                </h4>
                <div className="relative z-10">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={(() => {
                      const recent = matchLog.slice(0, 20).reverse();
                      return recent.map(m => ({
                        match: `#${m.matchNumber}`,
                        diff: m.pointDiff,
                        fill: m.result === "W" ? "#22d3ee" : m.result === "L" ? "#ef4444" : "#64748b",
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="match" tick={{ fontSize: 9, fill: "#64748b" }} stroke="transparent" axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#64748b" }} stroke="transparent" axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`${value > 0 ? "+" : ""}${value} pts`, "Point Diff"]}
                      />
                      <Bar dataKey="diff" radius={[4, 4, 0, 0]} fillOpacity={0.85}>
                        {(() => {
                          const recent = matchLog.slice(0, 20).reverse();
                          return recent.map((m, i) => (
                            <Cell key={i} fill={m.result === "W" ? "#22d3ee" : m.result === "L" ? "#ef4444" : "#64748b"} />
                          ));
                        })()}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-[10px] text-muted-foreground">Win</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-[10px] text-muted-foreground">Loss</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Last 20 matches</span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                <div className="relative z-10 overflow-x-auto">
                  <table className="w-full text-left" data-testid="match-log-table">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <MapPin className="h-3 w-3 inline mr-1" />Session
                        </th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Partner</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opponents</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Result</th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                          <CheckCircle className="h-3 w-3 inline" />
                        </th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">
                          <XCircle className="h-3 w-3 inline" />
                        </th>
                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchLog.map((m: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          data-testid={`match-log-row-${idx}`}
                        >
                          <td className="px-3 py-2 text-xs font-bold text-muted-foreground">{m.matchNumber}</td>
                          <td className="px-3 py-2">
                            <div className="text-xs font-medium text-foreground truncate max-w-[120px]">{m.sessionTitle}</div>
                            {m.sessionDate && (
                              <div className="text-[9px] text-muted-foreground">{new Date(m.sessionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[100px]">{m.partner || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="text-xs text-foreground truncate max-w-[130px]">
                              {[m.opponent1, m.opponent2].filter(Boolean).join(" & ") || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-md ${
                                m.result === "W"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : m.result === "L"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-slate-500/20 text-muted-foreground"
                              }`}
                              data-testid={`match-result-${idx}`}
                            >
                              {m.myScore}-{m.oppScore}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.result === "W" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {m.result === "L" ? (
                              <XCircle className="h-3.5 w-3.5 text-red-400 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-mono font-bold ${m.pointDiff > 0 ? "text-emerald-400" : m.pointDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                              {m.pointDiff > 0 ? `+${m.pointDiff}` : m.pointDiff}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{matchLog.length} match{matchLog.length !== 1 ? "es" : ""} played</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-emerald-400 font-semibold">{matchLog.filter((m: any) => m.result === "W").length}W</span>
                    <span className="text-[10px] text-red-400 font-semibold">{matchLog.filter((m: any) => m.result === "L").length}L</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">{matchLog.filter((m: any) => m.result === "D").length}D</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">No match history yet</p>
              <p className="text-sm mt-1">Completed matches will appear here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-5">
          {(() => {
            const achData = achievements as any;
            const allBadges = [
              ...(achData?.dynamicBadges || []),
              ...(achData?.lockedBadges || []),
              ...(Array.isArray(achData) ? achData : []),
            ];
            return allBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allBadges.map((b: any, i: number) => (
                  <AchievementBadge key={i} badge={b} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Award className="h-14 w-14 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-muted-foreground">No achievements yet</p>
                <p className="text-sm mt-1">Keep playing to unlock badges!</p>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="skills" className="mt-5">
          {profileId && (
            <SkillReviewTab
              playerId={profileId}
              clubId={profile?.clubId || 0}
              isAdmin={isAdmin}
              isOwnProfile={isOwnProfile}
            />
          )}
        </TabsContent>

        <TabsContent value="development" className="mt-5">
          {loadingDevelopment ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-2xl" />)}
            </div>
          ) : developmentData ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Matches" value={developmentData.totalMatches || 0} icon={Swords} sparkColor="#22d3ee" />
                <StatCard label="Current Grade" value={developmentData.currentGrade || "N/A"} icon={Award} sparkColor="#f59e0b" />
                <StatCard label="Recent Win Rate" value={`${developmentData.recentAvgWinRate || 0}%`} icon={TrendingUp} sparkColor="#10b981" />
                <StatCard
                  label="Trend"
                  value={developmentData.trendDirection === "improving" ? "Improving" : developmentData.trendDirection === "declining" ? "Declining" : developmentData.trendDirection === "stable" ? "Stable" : "N/A"}
                  icon={developmentData.trendDirection === "improving" ? TrendingUp : developmentData.trendDirection === "declining" ? TrendingDown : Activity}
                  sparkColor={developmentData.trendDirection === "improving" ? "#10b981" : developmentData.trendDirection === "declining" ? "#ef4444" : "#64748b"}
                />
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10" data-testid="text-win-rate-trend-title">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  Win Rate Trend (Per Session)
                  <span className="ml-auto text-[10px] text-muted-foreground font-normal">Last {developmentData.winRateTrend?.length || 0} sessions</span>
                </h4>
                {developmentData.winRateTrend && developmentData.winRateTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={developmentData.winRateTrend}>
                      <defs>
                        <linearGradient id="devWinRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} stroke="transparent" axisLine={false} tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} stroke="transparent" domain={[0, 100]} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", color: "hsl(var(--foreground))" }}
                        labelFormatter={(v: string) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        formatter={(value: number, name: string) => [`${value}%`, name === "winRate" ? "Win Rate" : name]}
                      />
                      <Area type="monotone" dataKey="winRate" stroke="#22d3ee" fill="url(#devWinRateGrad)" strokeWidth={2.5} name="Win Rate" dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#22d3ee", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-8">No session data available yet</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-cyan-500/3 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10" data-testid="text-best-partners-title">
                    <Heart className="h-4 w-4 text-emerald-400" />
                    Best Partners
                  </h4>
                  {developmentData.topPartners && developmentData.topPartners.length > 0 ? (
                    <div className="space-y-2 relative z-10">
                      {developmentData.topPartners.slice(0, 5).map((p: any, idx: number) => (
                        <div key={p.playerId} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50" data-testid={`partner-row-${idx}`}>
                          <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] font-bold text-emerald-400">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.games} games together</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">{p.winRate}% WR</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">No partner data yet</p>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/3 via-transparent to-purple-500/3 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10" data-testid="text-challenging-opponents-title">
                    <Swords className="h-4 w-4 text-red-400" />
                    Challenging Opponents
                  </h4>
                  {developmentData.challengingOpponents && developmentData.challengingOpponents.length > 0 ? (
                    <div className="space-y-2 relative z-10">
                      {developmentData.challengingOpponents.slice(0, 5).map((o: any, idx: number) => (
                        <div key={o.playerId} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50" data-testid={`challenging-opponent-row-${idx}`}>
                          <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center text-[10px] font-bold text-red-400">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{o.name}</p>
                            <p className="text-[10px] text-muted-foreground">{o.games} games against</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">{o.winRate}% WR</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">No challenging opponents identified</p>
                  )}
                </div>
              </div>

              {developmentData.bestOpponents && developmentData.bestOpponents.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 via-transparent to-amber-500/3 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10" data-testid="text-dominant-opponents-title">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Dominant Against
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative z-10">
                    {developmentData.bestOpponents.slice(0, 6).map((o: any, idx: number) => (
                      <div key={o.playerId} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/50" data-testid={`best-opponent-row-${idx}`}>
                        <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-[10px] font-bold text-amber-400">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{o.name}</p>
                          <p className="text-[10px] text-muted-foreground">{o.games} games</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">{o.winRate}% WR</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {developmentData.improvementAreas && developmentData.improvementAreas.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 via-transparent to-cyan-500/3 pointer-events-none" />
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 relative z-10" data-testid="text-improvement-areas-title">
                    <Lightbulb className="h-4 w-4 text-purple-400" />
                    Improvement Areas
                  </h4>
                  <div className="space-y-2 relative z-10">
                    {developmentData.improvementAreas.map((area: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10" data-testid={`improvement-area-${idx}`}>
                        <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-foreground">{area}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">No development data available yet</p>
              <p className="text-sm mt-1">Play matches to see your development trends!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const DEMO_PLAYERS: PlayerData[] = [
  {
    id: -1, fullName: "Alex Morgan", email: "alex@demo.com", role: "PLAYER",
    selectedAvatar: null, profilePictureUrl: null,
    playerProfiles: [{
      id: -1, userId: -1, clubId: 1, membershipStatus: "APPROVED",
      gender: "male", category: "B", grade: "B2", rankingPoints: 1450,
      matchesPlayed: 78, matchesWon: 52,
    }],
  },
  {
    id: -2, fullName: "Sam Taylor", email: "sam@demo.com", role: "PLAYER",
    selectedAvatar: null, profilePictureUrl: null,
    playerProfiles: [{
      id: -2, userId: -2, clubId: 1, membershipStatus: "APPROVED",
      gender: "female", category: "B", grade: "B1", rankingPoints: 1620,
      matchesPlayed: 92, matchesWon: 64,
    }],
  },
];

const DEMO_PERF_DATA = {
  "-1": [
    { month: "Sep", winRate: 55 }, { month: "Oct", winRate: 60 },
    { month: "Nov", winRate: 58 }, { month: "Dec", winRate: 65 },
    { month: "Jan", winRate: 62 }, { month: "Feb", winRate: 67 },
  ],
  "-2": [
    { month: "Sep", winRate: 62 }, { month: "Oct", winRate: 68 },
    { month: "Nov", winRate: 65 }, { month: "Dec", winRate: 72 },
    { month: "Jan", winRate: 70 }, { month: "Feb", winRate: 74 },
  ],
};

const DEMO_STATS: Record<string, any> = {
  "-1": {
    totalMatches: 78, wins: 52, losses: 26, winRate: 66.7,
    currentStreak: 3, longestStreak: 7, avgPointsScored: 17.2,
    avgPointsConceded: 14.1, sessionImpactScore: 72, uniqueOpponents: 18,
    recentForm: ["W", "W", "W", "L", "W"],
  },
  "-2": {
    totalMatches: 92, wins: 64, losses: 28, winRate: 69.6,
    currentStreak: 5, longestStreak: 9, avgPointsScored: 18.5,
    avgPointsConceded: 13.2, sessionImpactScore: 81, uniqueOpponents: 22,
    recentForm: ["W", "W", "W", "W", "W"],
  },
};

function DemoPlayerIntelligence() {
  const [selectedDemo, setSelectedDemo] = useState<PlayerData | null>(DEMO_PLAYERS[0]);
  const [compareDemo, setCompareDemo] = useState<PlayerData | null>(null);
  const [demoCompareMode, setDemoCompareMode] = useState(false);

  const handleDemoSelect = (p: PlayerData) => {
    if (demoCompareMode && selectedDemo && selectedDemo.id !== p.id) {
      setCompareDemo(p);
    } else {
      setSelectedDemo(p);
      setCompareDemo(null);
    }
  };

  const demoStats = selectedDemo ? DEMO_STATS[String(selectedDemo.id)] : null;
  const demoPerfData = selectedDemo ? (DEMO_PERF_DATA as any)[String(selectedDemo.id)] : null;
  const demoProfile = selectedDemo?.playerProfiles?.[0];

  return (
    <div className="space-y-0">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6" data-testid="demo-membership-banner">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">Get Your Full Player Analytics</h3>
            <p className="text-muted-foreground text-sm mt-1">
              You're viewing a demo with sample players. Get an annual club membership to unlock your own stats, compare with real players, track your progress, and get detailed AI-powered performance summaries.
            </p>
            <a href="/clubs" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 mt-2 transition-colors" data-testid="link-join-club">
              Join a Club <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="flex gap-0 min-h-[calc(100vh-280px)]">
        <div className="hidden lg:block w-72 shrink-0 border-r border-border pr-4">
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
              <h1 className="text-base font-bold text-foreground">Demo Players</h1>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">DEMO</Badge>
            </div>
            <div className="space-y-1">
              {DEMO_PLAYERS.map((p) => (
                <PlayerListItem
                  key={p.id}
                  player={p}
                  isSelected={selectedDemo?.id === p.id}
                  onSelect={() => handleDemoSelect(p)}
                  clubId="all"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 lg:pl-6">
          <div className="lg:hidden flex flex-wrap items-center gap-2 mb-4">
            {DEMO_PLAYERS.map((p) => (
              <Button
                key={p.id}
                variant={selectedDemo?.id === p.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleDemoSelect(p)}
                className="rounded-xl text-xs"
                data-testid={`demo-player-btn-${p.id}`}
              >
                {p.fullName}
              </Button>
            ))}
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">DEMO</Badge>
          </div>

          <div className="flex items-center gap-2 mb-5">
            <Button
              variant={demoCompareMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDemoCompareMode(!demoCompareMode);
                if (demoCompareMode) setCompareDemo(null);
              }}
              className="rounded-xl"
              data-testid="button-demo-compare"
            >
              <GitCompare className="h-4 w-4 mr-1" />
              {demoCompareMode ? "Exit Compare" : "Compare Players"}
            </Button>
            {demoCompareMode && !compareDemo && selectedDemo && (
              <span className="text-sm text-muted-foreground animate-pulse">Select the other demo player to compare</span>
            )}
          </div>

          {demoCompareMode && selectedDemo && compareDemo ? (
            <DemoCompareView player1={selectedDemo} player2={compareDemo} />
          ) : selectedDemo && demoStats ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <PlayerAvatar
                  name={selectedDemo.fullName}
                  id={selectedDemo.id}
                  size="lg"
                  gender={demoProfile?.gender}
                  grade={demoProfile?.grade}
                />
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedDemo.fullName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="rounded-lg text-xs">{demoProfile?.grade || "Ungraded"}</Badge>
                    <span className="text-sm text-muted-foreground">{demoProfile?.rankingPoints} pts</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Matches", value: demoStats.totalMatches, icon: Swords },
                  { label: "Win Rate", value: `${demoStats.winRate}%`, icon: TrendingUp },
                  { label: "Current Streak", value: `${demoStats.currentStreak}W`, icon: Flame },
                  { label: "Opponents", value: demoStats.uniqueOpponents, icon: Users },
                ].map((s) => (
                  <Card key={s.label} className="rounded-xl border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <s.icon className="h-3.5 w-3.5" />
                        {s.label}
                      </div>
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-xl border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Win Rate Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={demoPerfData} />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    Recent Form
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {demoStats.recentForm.map((r: string, i: number) => (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          r === "W" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                        data-testid={`demo-form-${i}`}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center" data-testid="demo-upgrade-cta">
                <Lock className="h-8 w-8 mx-auto mb-2 text-amber-500/60" />
                <p className="text-sm font-semibold text-foreground">Want to see more?</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Achievements, skill reviews, AI analysis, match logs, development trends, and head-to-head comparisons are available with an annual club membership.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center text-muted-foreground">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center border border-border">
                  <Users className="h-10 w-10 opacity-30" />
                </div>
                <h2 className="text-lg font-bold mb-1 text-foreground">Select a Demo Player</h2>
                <p className="text-sm">Choose one of the demo players to preview the analytics experience</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoCompareView({ player1, player2 }: { player1: PlayerData; player2: PlayerData }) {
  const stats1 = DEMO_STATS[String(player1.id)];
  const stats2 = DEMO_STATS[String(player2.id)];
  const p1 = player1.playerProfiles[0];
  const p2 = player2.playerProfiles[0];

  const comparisons = [
    { label: "Win Rate", v1: `${stats1.winRate}%`, v2: `${stats2.winRate}%`, n1: stats1.winRate, n2: stats2.winRate },
    { label: "Matches", v1: stats1.totalMatches, v2: stats2.totalMatches, n1: stats1.totalMatches, n2: stats2.totalMatches },
    { label: "Wins", v1: stats1.wins, v2: stats2.wins, n1: stats1.wins, n2: stats2.wins },
    { label: "Best Streak", v1: stats1.longestStreak, v2: stats2.longestStreak, n1: stats1.longestStreak, n2: stats2.longestStreak },
    { label: "Avg Scored", v1: stats1.avgPointsScored, v2: stats2.avgPointsScored, n1: stats1.avgPointsScored, n2: stats2.avgPointsScored },
    { label: "Opponents", v1: stats1.uniqueOpponents, v2: stats2.uniqueOpponents, n1: stats1.uniqueOpponents, n2: stats2.uniqueOpponents },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-around gap-4">
        <div className="text-center">
          <PlayerAvatar name={player1.fullName} id={player1.id} size="lg" gender={p1?.gender} grade={p1?.grade} />
          <p className="font-bold text-foreground mt-2 text-sm">{player1.fullName}</p>
          <Badge variant="outline" className="text-[10px] mt-1">{p1?.grade}</Badge>
        </div>
        <div className="text-2xl font-black text-muted-foreground/30">VS</div>
        <div className="text-center">
          <PlayerAvatar name={player2.fullName} id={player2.id} size="lg" gender={p2?.gender} grade={p2?.grade} />
          <p className="font-bold text-foreground mt-2 text-sm">{player2.fullName}</p>
          <Badge variant="outline" className="text-[10px] mt-1">{p2?.grade}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {comparisons.map((c) => {
          const winner = c.n1 > c.n2 ? 1 : c.n1 < c.n2 ? 2 : 0;
          return (
            <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50" data-testid={`demo-compare-${c.label}`}>
              <span className={`text-sm font-bold w-16 text-right ${winner === 1 ? "text-cyan-400" : "text-foreground"}`}>{c.v1}</span>
              <div className="flex-1 text-center">
                <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
              </div>
              <span className={`text-sm font-bold w-16 ${winner === 2 ? "text-cyan-400" : "text-foreground"}`}>{c.v2}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center" data-testid="demo-compare-upgrade-cta">
        <Lock className="h-8 w-8 mx-auto mb-2 text-amber-500/60" />
        <p className="text-sm font-semibold text-foreground">Full Comparison Locked</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Head-to-head match history, AI rivalry analysis, momentum graphs, and detailed comparisons are available with an annual club membership.
        </p>
        <a href="/clubs" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500 hover:text-amber-400 mt-3 transition-colors" data-testid="link-compare-join-club">
          Join a Club <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function PlayerIntelligence() {
  const { data: user } = useUser();
  const { data: players, isLoading } = usePlayers();
  const { data: clubs } = useClubs();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const hasAccess = isAdmin || !!(user as any)?.hasActiveAnnualMembership;
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [comparePlayer, setComparePlayer] = useState<PlayerData | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return (players as PlayerData[]).filter((p) => {
      const matchesSearch = !search ||
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      const profiles = p.playerProfiles || [];
      return selectedClubId === "all" || profiles.some(pr => pr.clubId === Number(selectedClubId));
    });
  }, [players, search, selectedClubId]);

  const { data: compareStats1 } = useQuery({
    queryKey: ["/api/players/analytics/compare", selectedPlayer?.playerProfiles?.[0]?.id, comparePlayer?.playerProfiles?.[0]?.id],
    queryFn: async () => {
      const p1 = selectedPlayer?.playerProfiles?.[0]?.id;
      const p2 = comparePlayer?.playerProfiles?.[0]?.id;
      if (!p1 || !p2) return null;
      const res = await fetch(`/api/players/analytics/compare/${p1}/${p2}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPlayer && !!comparePlayer && compareMode,
  });

  const { data: h2hData } = useQuery({
    queryKey: ["/api/players/analytics/head-to-head", selectedPlayer?.playerProfiles?.[0]?.id, comparePlayer?.playerProfiles?.[0]?.id],
    queryFn: async () => {
      const p1 = selectedPlayer?.playerProfiles?.[0]?.id;
      const p2 = comparePlayer?.playerProfiles?.[0]?.id;
      if (!p1 || !p2) return null;
      const res = await fetch(`/api/players/analytics/head-to-head/${p1}/${p2}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPlayer && !!comparePlayer && compareMode,
  });

  const playerList = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{filteredPlayers.length} players</span>
        {clubs && clubs.length > 1 && (
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-auto h-7 text-xs rounded-lg border-border/30 bg-transparent gap-1 px-2" data-testid="select-club-filter">
              <SelectValue placeholder="ALL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL</SelectItem>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Search players..."
          className="pl-10 bg-background border-border rounded-xl h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-players"
        />
      </div>
      <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scrollbar-thin">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <div className="h-11 w-11 bg-muted/20 animate-pulse rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 bg-muted/20 animate-pulse rounded" />
                <div className="h-2.5 w-16 bg-muted/20 animate-pulse rounded" />
              </div>
            </div>
          ))
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No players found</p>
          </div>
        ) : (
          filteredPlayers.map((p) => (
            <PlayerListItem
              key={p.id}
              player={p}
              isSelected={selectedPlayer?.id === p.id || (compareMode && comparePlayer?.id === p.id)}
              onSelect={() => {
                if (compareMode && selectedPlayer && selectedPlayer.id !== p.id) {
                  setComparePlayer(p);
                } else {
                  setSelectedPlayer(p);
                  setComparePlayer(null);
                }
                setMobileListOpen(false);
              }}
              clubId={selectedClubId}
            />
          ))
        )}
      </div>
    </div>
  );

  if (!hasAccess) {
    return <PremiumFeatureGate featureName="Player Intelligence" description="Access advanced player analytics, skill tracking, AI-powered comparisons, and more. Upgrade to Premium to unlock this feature."><DemoPlayerIntelligence /></PremiumFeatureGate>;
  }

  return (
    <PremiumFeatureGate featureName="Player Intelligence" description="Access advanced player analytics, skill tracking, AI-powered comparisons, and more. Upgrade to Premium to unlock this feature.">
    <div className="flex gap-0 min-h-[calc(100vh-140px)]">
      <div className="hidden lg:block w-72 shrink-0 border-r border-border pr-4">
        <div className="sticky top-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-cyan-400" />
            </div>
            <h1 className="text-base font-bold text-foreground">Players</h1>
          </div>
          {playerList}
        </div>
      </div>

      <div className="flex-1 min-w-0 lg:pl-6">
        <div className="lg:hidden flex items-center gap-2 mb-4">
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl" data-testid="button-open-player-list">
                <Users className="h-4 w-4 mr-2" /> Players
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Players</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{playerList}</div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-cyan-400" />
            Player Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setComparePlayer(null);
            }}
            className="rounded-xl"
            data-testid="button-toggle-compare"
          >
            <GitCompare className="h-4 w-4 mr-1" />
            {compareMode ? "Exit Compare" : "Compare Players"}
          </Button>
          {compareMode && !comparePlayer && selectedPlayer && (
            <span className="text-sm text-muted-foreground animate-pulse">Select a second player to compare</span>
          )}
        </div>

        {compareMode && selectedPlayer && comparePlayer ? (
          <RivalryArenaView
            player1={selectedPlayer}
            player2={comparePlayer}
            compareData={compareStats1}
            h2h={h2hData}
            clubs={clubs || []}
          />
        ) : selectedPlayer ? (
          <PlayerDashboard
            player={selectedPlayer}
            clubId={selectedClubId}
            clubs={clubs || []}
            isAdmin={isAdmin}
            currentUserId={user?.id || 0}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center text-muted-foreground">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center border border-border">
                <Users className="h-10 w-10 opacity-30" />
              </div>
              <h2 className="text-lg font-bold mb-1 text-foreground">Select a Player</h2>
              <p className="text-sm">Choose a player from the list to view their analytics</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </PremiumFeatureGate>
  );
}

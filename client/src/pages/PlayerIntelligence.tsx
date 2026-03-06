import { useUser } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { useClubs } from "@/hooks/use-clubs";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  Lightbulb, BookOpen, Move, GitCompare, MessageSquare,
  PoundSterling, CheckCircle, XCircle, Send
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Area, AreaChart
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

function getRealisticAvatarUrl(name: string, id?: number, gender?: string | null) {
  if (gender === "FEMALE") {
    const idx = ((id || 0) % 50) + 1;
    return `https://randomuser.me/api/portraits/women/${idx}.jpg`;
  }
  if (gender === "MALE") {
    const idx = ((id || 0) % 50) + 1;
    return `https://randomuser.me/api/portraits/men/${idx}.jpg`;
  }
  const seed = encodeURIComponent(name);
  const idx = (id || 0) % 70;
  return `https://i.pravatar.cc/300?u=${seed}-${idx}`;
}

function PlayerAvatar({ name, id, size = "md", className = "", profilePictureUrl, gender, grade }: {
  name: string; id?: number; size?: "sm" | "md" | "lg" | "xl" | "hero"; className?: string; profilePictureUrl?: string | null; gender?: string | null; grade?: string | null;
}) {
  const sizeMap = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-20 w-20", xl: "h-24 w-24", hero: "h-32 w-32" };
  const textSize = { sm: "text-[10px]", md: "text-xs", lg: "text-lg", xl: "text-2xl", hero: "text-4xl" };
  const initials = name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  const avatarSrc = profilePictureUrl || getRealisticAvatarUrl(name, id, gender);

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
          <AvatarImage src={avatarSrc} alt={name} className="object-cover" />
          <AvatarFallback className={`${textSize[size]} bg-gradient-to-br from-primary/20 to-primary/5 font-bold`}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      {isHeroOrXl && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, subtitle, color = "text-primary" }: {
  label: string; value: string | number; icon: any; trend?: number; subtitle?: string; color?: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-4 flex flex-col gap-1.5 group hover:border-primary/30 transition-all duration-300" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <div className={`${color} p-1.5 rounded-lg bg-current/10`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {trend !== undefined && (
          <span className={`text-xs flex items-center gap-0.5 mb-0.5 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtitle && <span className="text-[11px] text-muted-foreground/80">{subtitle}</span>}
    </div>
  );
}

function AchievementBadge({ badge }: { badge: any }) {
  const iconMap: Record<string, any> = {
    match_milestone: Swords, win_milestone: Trophy, session_milestone: Clock,
    streak: Flame, grade_promotion: TrendingUp, perfect_session: Star,
    social: Users, default: Award,
  };
  const Icon = iconMap[badge.achievementType] || iconMap.default;
  const isLocked = badge.locked;
  return (
    <div
      className={`relative rounded-2xl p-4 text-center transition-all duration-300 ${
        isLocked
          ? "bg-muted/10 border border-dashed border-border/30 opacity-40"
          : "bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      }`}
      data-testid={`badge-${badge.achievementName?.replace(/\s+/g, '-')}`}
    >
      {isLocked && <Lock className="h-3 w-3 absolute top-2 right-2 text-muted-foreground" />}
      <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${isLocked ? "bg-muted/20" : "bg-primary/10"}`}>
        <Icon className={`h-6 w-6 ${isLocked ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      <p className="text-xs font-semibold truncate">{badge.achievementName}</p>
      {badge.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>}
      {badge.progress !== undefined && (
        <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: `${Math.min(badge.progress, 100)}%` }} />
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
          ? "bg-primary/10 border border-primary/30 shadow-lg shadow-primary/5"
          : "border border-transparent hover:bg-card/60 hover:border-border/30"
      }`}
      data-testid={`player-list-item-${player.id}`}
    >
      <PlayerAvatar name={player.fullName} id={player.id} size="md" profilePictureUrl={player.profilePictureUrl} gender={profile?.gender} grade={grade !== "—" ? grade : undefined} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isSelected ? "text-primary" : ""}`}>{player.fullName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{grade !== "—" ? grade : "Ungraded"}</p>
      </div>
      {isSelected && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
    </button>
  );
}

function PerformanceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <p className="text-muted-foreground text-sm text-center py-8">No performance data yet</p>;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="winRateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            fontSize: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        />
        <Area type="monotone" dataKey="winRate" stroke="hsl(var(--primary))" fill="url(#winRateGradient)" strokeWidth={2.5} name="Win Rate %" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
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
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
        <XAxis dataKey="level" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" />
        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} />
        <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Wins" />
        <Bar dataKey="losses" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} name="Losses" />
      </BarChart>
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
        <PolarGrid stroke="hsl(var(--border))" opacity={0.3} />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
        <Radar name="Skill" dataKey="rating" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ComparisonView({ player1, player2, compareData, h2h, clubs }: {
  player1: PlayerData; player2: PlayerData; compareData: any; h2h: any; clubs: any[];
}) {
  const s1 = compareData?.player1?.stats;
  const s2 = compareData?.player2?.stats;
  const compMetrics = [
    { label: "Win Rate", v1: `${s1?.winRate || 0}%`, v2: `${s2?.winRate || 0}%`, n1: s1?.winRate || 0, n2: s2?.winRate || 0 },
    { label: "Matches Played", v1: s1?.matchesPlayed || 0, v2: s2?.matchesPlayed || 0, n1: s1?.matchesPlayed || 0, n2: s2?.matchesPlayed || 0 },
    { label: "Points Scored", v1: s1?.pointsScored || 0, v2: s2?.pointsScored || 0, n1: s1?.pointsScored || 0, n2: s2?.pointsScored || 0 },
    { label: "Sessions", v1: s1?.sessionsAttended || 0, v2: s2?.sessionsAttended || 0, n1: s1?.sessionsAttended || 0, n2: s2?.sessionsAttended || 0 },
    { label: "Hours Played", v1: s1?.totalHoursPlayed?.toFixed(1) || "0", v2: s2?.totalHoursPlayed?.toFixed(1) || "0", n1: s1?.totalHoursPlayed || 0, n2: s2?.totalHoursPlayed || 0 },
  ];
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-400/5" />
        <div className="flex items-center justify-center gap-6 relative z-10">
          <div className="text-center">
            <PlayerAvatar name={player1.fullName} id={player1.id} size="xl" className="mx-auto mb-2" profilePictureUrl={player1.profilePictureUrl} gender={player1.playerProfiles[0]?.gender} grade={player1.playerProfiles[0]?.grade || player1.playerProfiles[0]?.category} />
            <p className="font-bold text-sm">{player1.fullName}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center border border-border/30 shadow-lg">
              <span className="text-lg font-black text-muted-foreground">VS</span>
            </div>
          </div>
          <div className="text-center">
            <PlayerAvatar name={player2.fullName} id={player2.id} size="xl" className="mx-auto mb-2" profilePictureUrl={player2.profilePictureUrl} gender={player2.playerProfiles[0]?.gender} grade={player2.playerProfiles[0]?.grade || player2.playerProfiles[0]?.category} />
            <p className="font-bold text-sm">{player2.fullName}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {compMetrics.map((m) => {
          const p1Better = m.n1 > m.n2;
          const equal = m.n1 === m.n2;
          const total = m.n1 + m.n2;
          const p1Pct = total > 0 ? (m.n1 / total) * 100 : 50;
          return (
            <div key={m.label} className="space-y-1.5 bg-card/30 rounded-xl p-3 border border-border/20">
              <div className="flex justify-between text-sm">
                <span className={p1Better && !equal ? "font-bold text-primary" : ""}>{m.v1}</span>
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{m.label}</span>
                <span className={!p1Better && !equal ? "font-bold text-blue-400" : ""}>{m.v2}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-muted/20">
                <div className="bg-gradient-to-r from-primary to-primary/70 rounded-l-full transition-all duration-500" style={{ width: `${p1Pct}%` }} />
                <div className="bg-gradient-to-l from-blue-400 to-blue-400/70 rounded-r-full transition-all duration-500" style={{ width: `${100 - p1Pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {h2h && (
        <Card className="border-border/30 bg-card/40 backdrop-blur rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              Head-to-Head Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center py-2">
              <div>
                <p className="text-3xl font-black text-primary">{h2h.player1Wins || 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Wins</p>
              </div>
              <div>
                <p className="text-3xl font-black text-muted-foreground/50">{h2h.totalMatches || 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Total</p>
              </div>
              <div>
                <p className="text-3xl font-black text-blue-400">{h2h.player2Wins || 0}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Wins</p>
              </div>
            </div>
            {h2h.recentResults && h2h.recentResults.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Recent Results</p>
                {h2h.recentResults.slice(0, 5).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/10 rounded-lg px-3 py-2 border border-border/20">
                    <span className={r.player1Score > r.player2Score ? "font-bold text-primary" : ""}>{r.player1Score ?? "?"}</span>
                    <span className="text-muted-foreground">{r.date ? new Date(r.date).toLocaleDateString() : ""}</span>
                    <span className={r.player2Score > r.player1Score ? "font-bold text-blue-400" : ""}>{r.player2Score ?? "?"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
    enabled: !!playerId,
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
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
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
              <div key={cat.id} className="bg-card/30 border border-border/20 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {cat.name}
                  </span>
                  <Badge variant="outline" className="rounded-lg">{avg}%</Badge>
                </div>
                <div className="space-y-2">
                  {catEvals.map((e: any) => (
                    <div key={e.skillId || e.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-32 truncate">{e.skillName}</span>
                      <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${e.rating}%` }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{e.rating}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && pendingRequests && (pendingRequests as any[]).filter((r: any) => r.status === "PENDING" || r.status === "ACCEPTED").length > 0 && (
        <Card className="border-border/30 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Review Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pendingRequests as any[])
              .filter((r: any) => r.status === "PENDING" || r.status === "ACCEPTED")
              .map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-muted/10 rounded-xl p-3 border border-border/20">
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
          </CardContent>
        </Card>
      )}

      <Card className="border-border/30 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Coach Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <div className="flex gap-2 mb-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a coach note..."
                className="min-h-[60px] rounded-xl"
                data-testid="textarea-coach-note"
              />
              <Button size="sm" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending} className="rounded-xl" data-testid="button-add-note">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="space-y-3">
            {(coachNotes as any[])?.map((n: any) => (
              <div key={n.id} className="bg-muted/10 rounded-xl p-3 border border-border/20">
                <p className="text-sm">{n.note}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {n.createdByName || "Coach"} • {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </div>
            )) || <p className="text-sm text-muted-foreground">No coach notes yet</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Skill Review</DialogTitle>
            <DialogDescription>A coach will evaluate your skills across all categories. The cost is £20.</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="text-3xl font-bold text-primary">£20</div>
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
                      {(() => { const I = CATEGORY_ICONS[cat.iconName] || Target; return <I className="h-4 w-4 text-primary" />; })()}
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
      {data.explanation && <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{data.explanation}</p>}
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

  const { data: achievements } = useQuery({
    queryKey: ["/api/players/analytics", profileId, "achievements"],
    queryFn: async () => {
      const res = await fetch(`/api/players/analytics/${profileId}/achievements`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!profileId && dashTab === "achievements",
  });

  const stats = (analytics as any)?.stats;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/30 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />
        <div className="relative z-10 flex items-start gap-5">
          <div className="relative">
            <PlayerAvatar
              name={player.fullName}
              id={player.id}
              size="hero"
              profilePictureUrl={player.profilePictureUrl}
              gender={profile?.gender}
              grade={grade}
            />
            <div className={`absolute -bottom-1 -right-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${GRADE_COLORS[grade] || "from-muted to-muted"} shadow-lg ${GRADE_GLOW[grade] || ""} border border-white/20`}>
              {grade}
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-2xl font-black tracking-tight">{player.fullName}</h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-muted-foreground font-medium">{clubName}</span>
              {profile && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="font-semibold">{profile.rankingPoints}</span> pts
                </span>
              )}
            </div>
            <AIStyleBadge playerId={profileId!} />

            {stats && (
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-none">{stats.matchesWon || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Wins</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-none">{stats.matchesLost || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Losses</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black leading-none">{stats.winRate || 0}%</p>
                    <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={dashTab} onValueChange={setDashTab}>
        <TabsList className="w-full bg-card/40 border border-border/30 rounded-xl p-1">
          <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-overview">
            <Activity className="h-4 w-4 mr-1" /> Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-achievements">
            <Award className="h-4 w-4 mr-1" /> Badges
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-skills">
            <Target className="h-4 w-4 mr-1" /> Skills
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
                <StatCard label="Matches" value={stats.matchesPlayed || 0} icon={Swords} subtitle={`${stats.matchesWon || 0}W - ${stats.matchesLost || 0}L`} />
                <StatCard label="Win Rate" value={`${stats.winRate || 0}%`} icon={TrendingUp} color={stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"} />
                <StatCard label="Points Scored" value={stats.pointsScored || 0} icon={Target} subtitle={`${stats.pointsConceded || 0} conceded`} />
                <StatCard label="Sessions" value={stats.sessionsAttended || 0} icon={Clock} subtitle={`${stats.totalHoursPlayed?.toFixed(1) || 0}h played`} />
                <StatCard label="Impact Score" value={stats.sessionImpactScore || "0"} icon={Zap} color="text-yellow-400" />
                <StatCard label="Opponents" value={stats.uniqueOpponents || 0} icon={Users} />
                <StatCard label="30-Day Sessions" value={stats.sessions30d || 0} icon={Medal} />
                <StatCard label="Difficulty Score" value={stats.opponentDifficultyScore?.toFixed(2) || "—"} icon={BarChart3} />
              </div>

              <Card className="border-border/30 bg-card/40 backdrop-blur rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Performance Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={perfHistory?.monthlyWinRate || []} />
                </CardContent>
              </Card>

              <Card className="border-border/30 bg-card/40 backdrop-blur rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Performance by Opponent Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DifficultyChart data={perfHistory?.difficultyPerformance} />
                </CardContent>
              </Card>

              {perfHistory?.monthlyHours && perfHistory.monthlyHours.length > 0 && (
                <Card className="border-border/30 bg-card/40 backdrop-blur rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Hours Per Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={perfHistory.monthlyHours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="transparent" />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} />
                        <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No analytics data available yet</p>
              <p className="text-sm mt-1">Play some matches to see your stats!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-5">
          {achievements && (achievements as any[]).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(achievements as any[]).map((b: any, i: number) => (
                <AchievementBadge key={i} badge={b} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Award className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No achievements yet</p>
              <p className="text-sm mt-1">Keep playing to unlock badges!</p>
            </div>
          )}
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
      </Tabs>
    </div>
  );
}

export default function PlayerIntelligence() {
  const { data: user } = useUser();
  const { data: players, isLoading } = usePlayers();
  const { data: clubs } = useClubs();
  const adminClubId = useAdminClubId();
  const { isPremium: clubIsPremium, isSuperAdmin } = useClubPlan(adminClubId);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [comparePlayer, setComparePlayer] = useState<PlayerData | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isPremium = clubIsPremium || isSuperAdmin;

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder="Search players..."
          className="pl-10 bg-card/30 border-border/20 rounded-xl h-9 text-sm"
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

  if (!isPremium) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center p-8 rounded-2xl">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
          <p className="text-muted-foreground">Player Intelligence & Analytics is a Premium feature. Upgrade your club plan to access comprehensive player analytics, comparisons, skill assessments, and more.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-h-[calc(100vh-140px)]">
      <div className="hidden lg:block w-72 shrink-0 border-r border-border/20 pr-4">
        <div className="sticky top-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-bold">Players</h1>
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
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
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
          <ComparisonView
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
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                <Users className="h-10 w-10 opacity-30" />
              </div>
              <h2 className="text-lg font-bold mb-1">Select a Player</h2>
              <p className="text-sm">Choose a player from the list to view their analytics</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

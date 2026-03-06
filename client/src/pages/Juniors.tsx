import juniorHeroBg from "@assets/image_1772215411174.png";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useUpdateSession } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useSearch } from "wouter";
import { PlayerStatsDialog } from "@/components/PlayerStatsDialog";
import { SkillCategoryManager } from "@/components/SkillCategoryManager";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  Baby,
  Users,
  Star,
  Shield,
  Heart,
  Zap,
  Target,
  Gamepad2,
  Calendar,
  MapPin,
  Clock,
  PoundSterling,
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Dumbbell,
  Brain,
  Trophy,
  Smile,
  Eye,
  Plus,
  Building2,
  Award,
  Video,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  BookOpen,
  Flame,
  Footprints,
  Crosshair,
  Send,
  Swords,
  MessageSquare,
  Lock,
  ArrowLeft,
  Info,
  Settings,
  DatabaseZap,
  Crown,
  Search,
  Play,
  Timer,
  Check,
  CircleCheck,
  Repeat,
  Unlock,
  Bell,
  BellOff,
  ExternalLink,
  HelpCircle,
  FileDown,
  ArrowRightLeft,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  BookOpen, Flame, Dumbbell, Footprints, Crosshair, Send, Swords, Shield, Target, Brain, Users,
  Trophy, Star, Calendar, Zap, Gamepad2,
};

function SectionInfoButton({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
        data-testid={`info-btn-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" data-testid={`info-dialog-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              {title}
            </DialogTitle>
            <DialogDescription>How this section works</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IMPROVER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PERFORMANCE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SQUAD: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  COMPETITION_READY: "bg-red-500/15 text-red-400 border-red-500/30",
};
const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: "Beginner",
  IMPROVER: "Improver",
  PERFORMANCE: "Performance",
  SQUAD: "Squad",
  COMPETITION_READY: "Competition Ready",
};

const ACHIEVEMENT_DEFS = [
  { key: "effort_star", title: "Effort Champion", icon: Star, desc: "Effort rating 4+" },
  { key: "attendance_streak", title: "Attendance Star", icon: Calendar, desc: "90%+ attendance" },
  { key: "smash_90", title: "Smash King", icon: Zap, desc: "90%+ smash proficiency" },
  { key: "footwork_85", title: "Fleet Feet", icon: Footprints, desc: "85%+ footwork" },
  { key: "first_match", title: "First Match", icon: Gamepad2, desc: "Played first match" },
  { key: "first_win", title: "First Victory", icon: Trophy, desc: "Won first match" },
  { key: "match_10", title: "Match Veteran", icon: Swords, desc: "Played 10+ matches" },
  { key: "wins_5", title: "Rising Star", icon: Star, desc: "Won 5+ matches" },
  { key: "win_streak_70", title: "Dominant Player", icon: Flame, desc: "70%+ win rate (5+ games)" },
  { key: "sessions_10", title: "Regular Player", icon: Calendar, desc: "Attended 10+ sessions" },
];

function MiniGauge({ value, size = 48 }: { value: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : value >= 25 ? "#3b82f6" : "#6b7280";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" opacity={0.3} />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{value}%</span>
      </div>
    </div>
  );
}

function CircularGauge({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : value >= 25 ? "#3b82f6" : "#6b7280";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" opacity={0.3} />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall</span>
      </div>
    </div>
  );
}

function StarRating({ value, max = 5, size = "md" }: { value: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`${sz} ${i < value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function JuniorHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl min-h-[220px] md:min-h-[260px] text-white">
      <img src={juniorHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      <div className="relative z-10 p-6 md:p-10 max-w-3xl flex flex-col justify-end h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
            <Baby className="h-7 w-7" />
          </div>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-3 py-1">
            All Abilities Welcome
          </Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-juniors-title">
          Junior Programme
        </h1>
        <p className="text-base md:text-lg text-white/90 leading-relaxed">
          Welcome to our junior programme! Whether your child is picking up a racket for the first
          time or already dreaming of competitive play, they'll find a place here.
        </p>
      </div>
    </div>
  );
}

function ChildProfileCard({
  junior,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onAddToClub,
  hasClubs,
}: {
  junior: any;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToClub: () => void;
  hasClubs: boolean;
}) {
  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/junior-profiles", String(junior.id)],
    enabled: !!junior.id,
  });

  const profile = profileData?.profiles?.[0] || null;
  const achievements = profileData?.achievements || [];
  const videos = profileData?.videos || [];
  const progress = profileData?.progress || [];

  const matchStats = profileData?.matchStats;
  const skillPercent = profile?.overallSkillPercentage || 0;
  const attendance = matchStats?.totalSessions > 0 ? matchStats.attendancePercent : (profile?.attendancePercentage || 0);
  const effortRating = profile?.effortRating || 0;
  const coachRating = profile?.coachRating || 0;
  const level = profile?.juniorLevel || "BEGINNER";
  const skillsAssessed = progress.filter((p: any) => p.percentage > 0).length;
  const matchesPlayed = matchStats?.matchesPlayed || 0;
  const matchesWon = matchStats?.matchesWon || 0;

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-2 ring-emerald-500 border-emerald-500/50" : "hover:border-emerald-500/30"}`}
      onClick={onSelect}
      data-testid={`card-child-${junior.id}`}
    >
      <div className={`h-1.5 ${isSelected ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" : "bg-gradient-to-r from-slate-400/50 to-slate-300/50"}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full p-2">
              <Baby className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-base" data-testid={`text-child-name-${junior.id}`}>{junior.fullName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {junior.dateOfBirth && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(junior.dateOfBirth), "d MMM yyyy")}
                  </span>
                )}
                <Badge className={`text-[10px] py-0 h-5 border ${LEVEL_COLORS[level]}`} data-testid={`badge-level-${junior.id}`}>
                  {LEVEL_NAMES[level]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} data-testid={`button-edit-child-${junior.id}`}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete} data-testid={`button-delete-child-${junior.id}`}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40" data-testid={`stat-skill-${junior.id}`}>
            <MiniGauge value={skillPercent} size={36} />
            <span className="text-[9px] text-muted-foreground mt-0.5 uppercase">Skills</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40" data-testid={`stat-attendance-${junior.id}`}>
            <div className="text-base font-bold text-emerald-500">{attendance}%</div>
            <span className="text-[9px] text-muted-foreground uppercase">Attend.</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40" data-testid={`stat-effort-${junior.id}`}>
            <div className="flex items-center gap-0.5">
              <Star className={`h-3.5 w-3.5 ${effortRating >= 1 ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              <span className="text-base font-bold">{effortRating}</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase">Effort</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40" data-testid={`stat-coach-${junior.id}`}>
            <div className="flex items-center gap-0.5">
              <Star className={`h-3.5 w-3.5 ${coachRating >= 1 ? "text-emerald-400 fill-emerald-400" : "text-muted-foreground/30"}`} />
              <span className="text-base font-bold">{coachRating}</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase">Coach</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-matches-${junior.id}`}>
            <Gamepad2 className="h-3 w-3 text-indigo-500 shrink-0" />
            <span><strong>{matchesPlayed}</strong> games</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-wins-${junior.id}`}>
            <Trophy className="h-3 w-3 text-emerald-500 shrink-0" />
            <span><strong>{matchesWon}</strong> wins</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-awards-${junior.id}`}>
            <Award className="h-3 w-3 text-amber-500 shrink-0" />
            <span><strong>{achievements.length}</strong> awards</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-assessed-${junior.id}`}>
            <BarChart3 className="h-3 w-3 text-blue-500 shrink-0" />
            <span><strong>{skillsAssessed}</strong> skills</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {hasClubs && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddToClub} data-testid={`button-add-to-club-${junior.id}`}>
              <Building2 className="h-3 w-3 mr-1" />
              Add to Club
            </Button>
          )}
          {(junior.emergencyContact || junior.medicalNotes) && (
            <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
              {junior.emergencyContact && <span>Emergency: {junior.emergencyContact}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SkillCategoryCard({ category, skills, progressMap, isAdmin, userId }: { category: any; skills: any[]; progressMap: Map<number, any>; isAdmin: boolean; userId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [editLevel, setEditLevel] = useState(0);
  const [editPercentage, setEditPercentage] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editPriority, setEditPriority] = useState(false);
  const { toast } = useToast();

  const categoryProgress = useMemo(() => {
    if (skills.length === 0) return 0;
    const total = skills.reduce((sum, s) => sum + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(total / skills.length);
  }, [skills, progressMap]);

  const IconComponent = ICON_MAP[category.iconName] || Target;

  const updateMutation = useMutation({
    mutationFn: async ({ skillId, data }: { skillId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/junior-skills/progress/${userId}/${skillId}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Skill Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userId)] });
      setEditingSkill(null);
      try {
        await apiRequest("POST", `/api/junior-achievements/check/${userId}`);
      } catch {}
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEditSkill = (skill: any) => {
    const progress = progressMap.get(skill.id);
    setEditLevel(progress?.level || 0);
    setEditPercentage(progress?.percentage || 0);
    setEditComment(progress?.comment || "");
    setEditPriority(progress?.priority || false);
    setEditingSkill(skill);
  };

  return (
    <>
      <Card className="overflow-hidden border-slate-700/50 bg-slate-900/50" data-testid={`card-category-${category.id}`}>
        <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center gap-3 text-left" data-testid={`button-toggle-category-${category.id}`}>
          <div className="bg-amber-500/10 rounded-lg p-2 shrink-0">
            <IconComponent className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm truncate text-white">{category.name}</h3>
              <span className="text-xs font-medium text-amber-400 ml-2">{categoryProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700" style={{ width: `${categoryProgress}%` }} />
            </div>
          </div>
          <div className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-700/50 pt-3">
            {skills.map((skill) => {
              const progress = progressMap.get(skill.id);
              const pct = progress?.percentage || 0;
              const level = progress?.level || 0;
              return (
                <div key={skill.id} className={`p-3 rounded-xl bg-slate-800/50 ${isAdmin ? "cursor-pointer active:bg-slate-700/50" : ""} ${progress?.priority ? "ring-1 ring-amber-500/40" : ""}`} onClick={() => isAdmin && openEditSkill(skill)} data-testid={`skill-card-${skill.id}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {progress?.comment && <MessageSquare className="h-3 w-3 text-white/50" />}
                      {progress?.priority && <Zap className="h-3 w-3 text-amber-400" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-blue-500" : "bg-slate-600"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-white/70 w-8 text-right">{pct}%</span>
                    <StarRating value={level} size="sm" />
                  </div>
                  {progress?.updatedAt && (
                    <p className="text-[10px] text-white/50 mt-1">Updated {format(new Date(progress.updatedAt), "d MMM")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!editingSkill} onOpenChange={(open) => { if (!open) setEditingSkill(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-edit-skill">
          <DialogHeader>
            <DialogTitle className="text-base">{editingSkill?.name}</DialogTitle>
            <DialogDescription>Update skill assessment</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm">Skill Level: {editPercentage}%</Label>
              <Slider value={[editPercentage]} onValueChange={([v]) => { setEditPercentage(v); setEditLevel(Math.min(5, Math.floor(v / 20))); }} max={100} step={5} className="mt-2" data-testid="slider-skill-level" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
            <div>
              <Label className="text-sm">Star Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => { setEditLevel(v); setEditPercentage(v * 20); }} className="p-1" data-testid={`button-skill-star-${v}`}>
                    <Star className={`h-8 w-8 ${v <= editLevel ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Priority Skill</Label>
              <Switch checked={editPriority} onCheckedChange={setEditPriority} data-testid="switch-priority" />
            </div>
            <div>
              <Label className="text-sm">Coach Comment</Label>
              <Textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Add coaching notes..." className="mt-1 min-h-[60px]" data-testid="input-coach-comment" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" disabled={updateMutation.isPending} onClick={() => { if (editingSkill) { updateMutation.mutate({ skillId: editingSkill.id, data: { level: editLevel, percentage: editPercentage, comment: editComment || null, priority: editPriority } }); } }} data-testid="button-save-skill">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AnimatedGauge({ value, size = 120, strokeWidth = 10, label, sublabel, color }: { value: number; size?: number; strokeWidth?: number; label?: string; sublabel?: string; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const gradientId = `gauge-grad-${label?.replace(/\s/g, '') || Math.random()}`;
  const startColor = color || (value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : value >= 25 ? "#3b82f6" : "#6b7280");
  const endColor = value >= 80 ? "#86efac" : value >= 50 ? "#fcd34d" : value >= 25 ? "#93c5fd" : "#9ca3af";
  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" opacity={0.15} />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={`url(#${gradientId})`} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" style={{ filter: `drop-shadow(0 0 6px ${startColor}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tracking-tight">{value}%</span>
        {label && <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{label}</span>}
        {sublabel && <span className="text-[9px] text-muted-foreground/70">{sublabel}</span>}
      </div>
    </div>
  );
}

function SemiCircularGauge({ value, size = 200 }: { value: number; size?: number }) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const levelLabel = value >= 80 ? "Excellent" : value >= 60 ? "Advanced" : value >= 40 ? "Intermediate" : value >= 20 ? "Developing" : "Beginner";
  const segments = 30;
  const segmentAngle = 180 / segments;
  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size / 2 + 30 }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <defs>
          <linearGradient id="semi-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#84cc16" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>
        {Array.from({ length: segments }).map((_, i) => {
          const startAngle = 180 + i * segmentAngle;
          const endAngle = 180 + (i + 0.7) * segmentAngle;
          const filledSegments = Math.floor((value / 100) * segments);
          const isFilled = i < filledSegments;
          const x1 = size / 2 + (radius - 2) * Math.cos((startAngle * Math.PI) / 180);
          const y1 = size / 2 + (radius - 2) * Math.sin((startAngle * Math.PI) / 180);
          const x2 = size / 2 + (radius - 2) * Math.cos((endAngle * Math.PI) / 180);
          const y2 = size / 2 + (radius - 2) * Math.sin((endAngle * Math.PI) / 180);
          const x3 = size / 2 + (radius - strokeWidth + 2) * Math.cos((endAngle * Math.PI) / 180);
          const y3 = size / 2 + (radius - strokeWidth + 2) * Math.sin((endAngle * Math.PI) / 180);
          const x4 = size / 2 + (radius - strokeWidth + 2) * Math.cos((startAngle * Math.PI) / 180);
          const y4 = size / 2 + (radius - strokeWidth + 2) * Math.sin((startAngle * Math.PI) / 180);
          const hue = 120 + (i / segments) * 60;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
              fill={isFilled ? `hsl(${hue}, 70%, 50%)` : 'hsl(var(--muted))'}
              opacity={isFilled ? 1 : 0.15}
              className="transition-all duration-500"
              style={{ transitionDelay: `${i * 20}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground font-medium">{levelLabel}</p>
        <p className="text-3xl font-black tracking-tight">{value}%</p>
      </div>
    </div>
  );
}

function StripedLevelBar({ value, label }: { value: number; label?: string }) {
  const segments = 20;
  const filledSegments = Math.round((value / 100) * segments);
  const levelText = value >= 80 ? "Advanced" : value >= 60 ? "Intermediate+" : value >= 40 ? "Intermediate" : value >= 20 ? "Developing" : "Beginner";
  const activeLevelIndex = value >= 80 ? 3 : value >= 60 ? 2 : value >= 40 ? 1 : 0;
  const levels = ["Beginner", "Developing", "Intermediate", "Advanced"];
  return (
    <div className="w-full rounded-2xl bg-[hsl(220,25%,12%)] border border-[hsl(220,20%,18%)] p-5">
      {label && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-[hsl(45,10%,70%)] tracking-wide">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[hsl(45,10%,55%)]">{levelText}</span>
            <span className="text-2xl font-black text-white tabular-nums">{value}%</span>
          </div>
        </div>
      )}
      <div className="flex gap-[3px] h-7 rounded-lg overflow-hidden bg-[hsl(220,20%,8%)] p-1">
        {Array.from({ length: segments }).map((_, i) => {
          const isFilled = i < filledSegments;
          return (
            <div
              key={i}
              className="flex-1 rounded-[3px] transition-all duration-500"
              style={{
                backgroundColor: isFilled ? 'hsl(100, 75%, 48%)' : 'hsl(220, 15%, 15%)',
                boxShadow: isFilled ? '0 0 6px hsl(100, 75%, 48%, 0.5), inset 0 1px 0 hsl(100, 75%, 65%, 0.3)' : 'none',
                opacity: isFilled ? 1 : 0.3,
                transitionDelay: `${i * 30}ms`,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2.5 px-0.5">
        {levels.map((lbl, i) => (
          <span key={lbl} className={`text-[10px] font-medium transition-colors ${i === activeLevelIndex ? 'text-[hsl(100,75%,48%)]' : 'text-[hsl(220,10%,40%)]'}`}>{lbl}</span>
        ))}
      </div>
    </div>
  );
}

function MonthlyProgressChart({ userId }: { userId: number }) {
  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/junior-progress-history", String(userId)],
    enabled: !!userId,
  });

  const monthlyData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const byMonth = new Map<string, { overall: number; count: number; updates: number }>();
    for (const h of history) {
      const date = new Date(h.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(key) || { overall: 0, count: 0, updates: 0 };
      existing.overall += h.overallPercentageAtTime;
      existing.count++;
      existing.updates++;
      byMonth.set(key, existing);
    }
    const result = Array.from(byMonth.entries())
      .map(([key, val]) => {
        const [y, m] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: monthNames[parseInt(m) - 1],
          overall: Math.round(val.overall / val.count),
          updates: val.updates,
          sortKey: key,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return result;
  }, [history]);

  const recentActivity = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.slice(0, 8).map((h: any) => ({
      skill: h.skillName || 'Unknown',
      from: h.previousPercentage,
      to: h.newPercentage,
      date: format(new Date(h.createdAt), 'd MMM yyyy'),
      time: format(new Date(h.createdAt), 'HH:mm'),
      change: h.newPercentage - h.previousPercentage,
    }));
  }, [history]);

  const weeklyUpdates = useMemo(() => {
    if (!history) return 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return history.filter((h: any) => new Date(h.createdAt) >= oneWeekAgo).length;
  }, [history]);

  const thisMonthUpdates = useMemo(() => {
    if (!history) return 0;
    const now = new Date();
    return history.filter((h: any) => {
      const d = new Date(h.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [history]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <p className="text-lg font-black text-blue-400">{history?.length || 0}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Total Updates</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <p className="text-lg font-black text-emerald-400">{weeklyUpdates}</p>
          <p className="text-[9px] text-muted-foreground uppercase">This Week</p>
        </div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
          <p className="text-lg font-black text-amber-400">{thisMonthUpdates}</p>
          <p className="text-[9px] text-muted-foreground uppercase">This Month</p>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Monthly Progress</span>
          </div>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.15} />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="overall" stroke="#22c55e" strokeWidth={2} fill="url(#progressGradient)" dot={{ r: 4, fill: '#22c55e' }} name="Overall %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Recent Updates</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((act: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${act.change > 0 ? 'bg-emerald-500/20 text-emerald-400' : act.change < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {act.change > 0 ? `+${act.change}` : act.change}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">{act.skill}</p>
                  <p className="text-[10px] text-white/60">{act.from}% → {act.to}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-white/70">{act.date}</p>
                  <p className="text-[9px] text-white/50">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!history || history.length === 0) && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-8 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-white/30" />
          <p className="text-sm text-white/70">No progress history yet</p>
          <p className="text-xs text-white/50 mt-1">Updates will be tracked as coaches assess skills</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, gradient, iconColor }: { icon: any; label: string; value: string | number; subtitle?: string; gradient: string; iconColor: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ${gradient}`} data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="absolute top-2 right-2 opacity-10">
        <Icon className="h-12 w-12" />
      </div>
      <div className="relative z-10">
        <Icon className={`h-5 w-5 ${iconColor} mb-2`} />
        <p className="text-2xl font-black tracking-tight text-white">{value}</p>
        <p className="text-[11px] text-white/70 uppercase tracking-wider font-medium mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-white/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SkillRadarChart({ categories, progressMap }: { categories: any[]; progressMap: Map<number, any> }) {
  const data = useMemo(() => {
    return categories.map((cat: any) => {
      const skills = cat.skills || [];
      const avg = skills.length > 0
        ? Math.round(skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0) / skills.length)
        : 0;
      const shortName = cat.name.length > 10 ? cat.name.substring(0, 8) + '...' : cat.name;
      return { category: shortName, fullName: cat.name, value: avg, fullMark: 100 };
    });
  }, [categories, progressMap]);

  if (data.length === 0) return null;

  return (
    <div className="w-full" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid stroke="hsl(var(--muted))" strokeOpacity={0.3} />
          <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Skills" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SkillBarChart({ categories, progressMap }: { categories: any[]; progressMap: Map<number, any> }) {
  const data = useMemo(() => {
    return categories.map((cat: any) => {
      const skills = cat.skills || [];
      const avg = skills.length > 0
        ? Math.round(skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0) / skills.length)
        : 0;
      return { name: cat.name.length > 12 ? cat.name.substring(0, 10) + '..' : cat.name, value: avg };
    });
  }, [categories, progressMap]);

  if (data.length === 0) return null;

  return (
    <div className="w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" strokeOpacity={0.15} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
          <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.value >= 80 ? '#22c55e' : entry.value >= 50 ? '#f59e0b' : entry.value >= 25 ? '#3b82f6' : '#4b5563'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopSkillsList({ categories, progressMap }: { categories: any[]; progressMap: Map<number, any> }) {
  const topSkills = useMemo(() => {
    const all: { name: string; category: string; pct: number }[] = [];
    for (const cat of categories) {
      for (const skill of (cat.skills || [])) {
        const pct = progressMap.get(skill.id)?.percentage || 0;
        if (pct > 0) all.push({ name: skill.name, category: cat.name, pct });
      }
    }
    return all.sort((a, b) => b.pct - a.pct).slice(0, 5);
  }, [categories, progressMap]);

  const weakSkills = useMemo(() => {
    const all: { name: string; category: string; pct: number }[] = [];
    for (const cat of categories) {
      for (const skill of (cat.skills || [])) {
        const pct = progressMap.get(skill.id)?.percentage || 0;
        all.push({ name: skill.name, category: cat.name, pct });
      }
    }
    return all.sort((a, b) => a.pct - b.pct).slice(0, 5);
  }, [categories, progressMap]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">Strongest Skills</span>
        </div>
        <div className="space-y-2.5">
          {topSkills.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-400/60 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-emerald-400 w-8 text-right">{s.pct}%</span>
              </div>
            </div>
          ))}
          {topSkills.length === 0 && <p className="text-xs text-muted-foreground">No skills assessed yet</p>}
        </div>
      </div>
      <div className="rounded-2xl bg-orange-500/5 border border-orange-500/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-400">Focus Areas</span>
        </div>
        <div className="space-y-2.5">
          {weakSkills.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-orange-400/60 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500 transition-all duration-700" style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-orange-400 w-8 text-right">{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChildReportSection({ childId, childName }: { childId: number; childName: string }) {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/juniors/${childId}/report/generate`, {});
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => {
      setReportData(data);
      setShowReport(true);
      toast({ title: "Report Generated", description: "Your child's coach progress report is ready." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleDownloadPdf = async () => {
    if (!reportData?.report?.id) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/juniors/${childId}/report/${reportData.report.id}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${childName.replace(/[^a-zA-Z0-9]/g, "_")}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "PDF report saved to your device." });
    } catch {
      toast({ title: "Error", description: "Could not download the report", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/20 p-4" data-testid="card-child-report">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-amber-500/20 p-2.5 shrink-0">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Coach Progress Report</p>
              <p className="text-xs text-muted-foreground">Get a personalised coaching analysis with downloadable PDF</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {reportData && (
              <Button
                data-testid="button-download-pdf"
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">PDF</span>
              </Button>
            )}
            <Button
              data-testid="button-generate-child-report"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              {reportData ? "Refresh" : "Generate"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Progress Report — {childName}
            </DialogTitle>
            <DialogDescription>
              Generated on {reportData?.report?.createdAt ? new Date(reportData.report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "today"}
            </DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 text-center">
                  <p className="text-xl font-black text-amber-400">{reportData.profile?.overallSkillPercentage || 0}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-3 text-center">
                  <p className="text-xl font-black text-emerald-400">{reportData.profile?.attendancePercentage || 0}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 p-3 text-center">
                  <p className="text-xl font-black text-blue-400">{reportData.profile?.effortRating || 0}/10</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Effort</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 p-3 text-center">
                  <p className="text-xl font-black text-purple-400">{reportData.profile?.coachRating || 0}/10</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coach Rating</p>
                </div>
              </div>

              {reportData.strongest?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Strongest Skills
                    </p>
                    {reportData.strongest.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs text-foreground flex-1">{s.name}</span>
                        <span className="text-xs font-bold text-emerald-400">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" /> Areas to Develop
                    </p>
                    {reportData.weakest?.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span className="text-xs text-foreground flex-1">{s.name}</span>
                        <span className="text-xs font-bold text-orange-400">{s.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportData.categories?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category Breakdown</p>
                  {reportData.categories.map((cat: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-28 truncate">{cat.category}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${cat.avgScore}%`,
                            background: cat.avgScore >= 70 ? "#22c55e" : cat.avgScore >= 40 ? "#D4AF37" : "#ef4444"
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right" style={{ color: cat.avgScore >= 70 ? "#22c55e" : cat.avgScore >= 40 ? "#D4AF37" : "#ef4444" }}>{cat.avgScore}%</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Coach Analysis
                </p>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {reportData.report?.aiSummary}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  data-testid="button-download-pdf-modal"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Download PDF Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PerformancePanel({ userId, isAdmin }: { userId: number; isAdmin: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [filterWeakest, setFilterWeakest] = useState(false);

  const { data: profileData, isLoading } = useQuery<any>({
    queryKey: ["/api/junior-profiles", String(userId)],
    enabled: !!userId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/junior-skills/categories"],
  });

  const profile = profileData?.profiles?.[0] || null;
  const clubId = profile?.clubId || profileData?.playerClubId || 0;

  const progressMap = useMemo(() => {
    const map = new Map<number, any>();
    if (profileData?.progress) {
      for (const p of profileData.progress) map.set(p.skillId, p);
    }
    return map;
  }, [profileData?.progress]);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    if (!filterWeakest) return categories;
    return [...categories].sort((a, b) => {
      const aAvg = a.skills.length > 0 ? a.skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0) / a.skills.length : 0;
      const bAvg = b.skills.length > 0 ? b.skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0) / b.skills.length : 0;
      return aAvg - bAvg;
    });
  }, [categories, filterWeakest, progressMap]);

  const totalSkillsAssessed = useMemo(() => {
    if (!categories) return 0;
    let count = 0;
    for (const cat of categories) {
      for (const skill of (cat.skills || [])) {
        if ((progressMap.get(skill.id)?.percentage || 0) > 0) count++;
      }
    }
    return count;
  }, [categories, progressMap]);

  const totalSkills = useMemo(() => {
    if (!categories) return 0;
    return categories.reduce((sum: number, cat: any) => sum + (cat.skills?.length || 0), 0);
  }, [categories]);

  const prioritySkills = useMemo(() => {
    if (!categories) return 0;
    let count = 0;
    for (const cat of categories) {
      for (const skill of (cat.skills || [])) {
        if (progressMap.get(skill.id)?.priority) count++;
      }
    }
    return count;
  }, [categories, progressMap]);

  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editLevel, setEditLevel] = useState(profile?.juniorLevel || "BEGINNER");
  const [editAttendance, setEditAttendance] = useState(profile?.attendancePercentage || 0);
  const [editEffort, setEditEffort] = useState(profile?.effortRating || 0);
  const [editCoachRating, setEditCoachRating] = useState(profile?.coachRating || 0);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/junior-profiles/${userId}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userId)] });
      setEditOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!profileData?.user) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a child above to view their performance.</p>
        </CardContent>
      </Card>
    );
  }

  const matchStats = profileData.matchStats;
  const overallSkill = profile?.overallSkillPercentage || 0;
  const attendance = matchStats?.attendancePercent ?? profile?.attendancePercentage ?? 0;
  const winRate = matchStats?.winPercent || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <SectionInfoButton title="Skill Dashboard">
          <p className="font-medium text-foreground">Welcome to your child's Skill Dashboard!</p>
          <p>This is where you can see exactly how your child is progressing in their sporting journey. Everything shown here is based on real data from actual sessions, matches, and coach assessments.</p>
          <p className="font-medium text-foreground mt-2">What the stats mean:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Overall Skill</strong> — A percentage showing your child's progress across all 66 individual skills (like footwork, serves, and positioning), assessed by their coach.</li>
            <li><strong>Attendance</strong> — How many sessions your child has attended out of the ones they signed up for. Calculated from real session sign-up records.</li>
            <li><strong>Matches</strong> — Total matches played, wins, and losses from actual completed matches during sessions.</li>
            <li><strong>Win Rate</strong> — The percentage of matches your child has won.</li>
            <li><strong>Effort &amp; Coach Rating</strong> — Star ratings given by the coach based on your child's attitude and performance.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">The charts:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Radar Chart</strong> — Shows your child's strengths and areas for improvement across all skill categories at a glance. The further out the shape reaches, the stronger that area.</li>
            <li><strong>Progress Bars</strong> — Each skill category (like Footwork, Attack, Defense) has a progress bar showing how far your child has come. Skills marked with a star are priorities the coach wants to focus on.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">The goal:</p>
          <p>We want every child to develop their skills progressively and have fun doing it. The dashboard helps you see their improvement over time, celebrate their strengths, and understand where they can grow. Speak to the coach if you have any questions about specific skill areas.</p>
        </SectionInfoButton>
      </div>
      <StripedLevelBar value={overallSkill} label="Skill Level Progress" />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50" data-testid="card-junior-profile-header">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-amber-500/40 shadow-lg shadow-amber-500/10">
              <AvatarImage src={profileData.user.profilePictureUrl} />
              <AvatarFallback className="bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-400 text-xl font-black">
                {profileData.user.fullName?.charAt(0) || "J"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white tracking-tight truncate">{profileData.user.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${LEVEL_COLORS[profile?.juniorLevel || "BEGINNER"]} border font-semibold`}>
                  {LEVEL_NAMES[profile?.juniorLevel || "BEGINNER"]}
                </Badge>
                {isAdmin && (
                  <button onClick={() => { setEditLevel(profile?.juniorLevel || "BEGINNER"); setEditAttendance(profile?.attendancePercentage || 0); setEditEffort(profile?.effortRating || 0); setEditCoachRating(profile?.coachRating || 0); setEditOpen(true); }} className="text-amber-400/60 hover:text-amber-400 transition-colors" data-testid="button-edit-junior-profile">
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <StatCard icon={Activity} label="Overall Skill" value={`${overallSkill}%`} gradient="bg-gradient-to-br from-amber-600/80 to-orange-700/80" iconColor="text-amber-300" />
            <StatCard icon={Calendar} label="Attendance" value={`${attendance}%`} subtitle={matchStats?.totalSessions > 0 ? `${matchStats.sessionsAttended}/${matchStats.totalSessions} sessions` : undefined} gradient="bg-gradient-to-br from-emerald-600/80 to-teal-700/80" iconColor="text-emerald-300" />
            <StatCard icon={Gamepad2} label="Matches" value={matchStats?.matchesPlayed || 0} subtitle={matchStats?.matchesPlayed > 0 ? `${matchStats.matchesWon}W / ${matchStats.matchesLost}L` : undefined} gradient="bg-gradient-to-br from-blue-600/80 to-indigo-700/80" iconColor="text-blue-300" />
            <StatCard icon={Trophy} label="Win Rate" value={`${winRate}%`} subtitle={matchStats?.setsWon > 0 ? `${matchStats.setsWon} sets won` : undefined} gradient="bg-gradient-to-br from-purple-600/80 to-violet-700/80" iconColor="text-purple-300" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm p-3 flex items-center gap-3 border border-white/5" data-testid="stat-effort">
              <Star className="h-5 w-5 text-amber-400" />
              <div>
                <StarRating value={profile?.effortRating || 0} size="sm" />
                <p className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">Effort</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm p-3 flex items-center gap-3 border border-white/5" data-testid="stat-coach">
              <Award className="h-5 w-5 text-emerald-400" />
              <div>
                <StarRating value={profile?.coachRating || 0} size="sm" />
                <p className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">Coach</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-lg bg-white/5 p-2 text-center border border-white/5">
              <p className="text-lg font-black text-white">{totalSkillsAssessed}</p>
              <p className="text-[9px] text-white/60 uppercase">Skills Assessed</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center border border-white/5">
              <p className="text-lg font-black text-white">{totalSkills}</p>
              <p className="text-[9px] text-white/60 uppercase">Total Skills</p>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center border border-white/5">
              <p className="text-lg font-black text-amber-400">{prioritySkills}</p>
              <p className="text-[9px] text-white/60 uppercase">Priority</p>
            </div>
          </div>
        </div>
      </div>

      <ChildReportSection childId={userId} childName={profileData.user.fullName} />

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-900/60 rounded-xl p-1 h-auto">
          <TabsTrigger value="overview" className="text-[11px] py-2 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-overview">
            <Activity className="h-3.5 w-3.5 mr-1" />Overview
          </TabsTrigger>
          <TabsTrigger value="skills" className="text-[11px] py-2 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-skills">
            <Target className="h-3.5 w-3.5 mr-1" />Skills
          </TabsTrigger>
          <TabsTrigger value="rankings" className="text-[11px] py-2 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-rankings">
            <Trophy className="h-3.5 w-3.5 mr-1" />Rank
          </TabsTrigger>
          <TabsTrigger value="achievements" className="text-[11px] py-2 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-achievements">
            <Award className="h-3.5 w-3.5 mr-1" />Awards
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-[11px] py-2 rounded-lg data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400" data-testid="tab-videos">
            <Video className="h-3.5 w-3.5 mr-1" />Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Game Level</span>
              </div>
              <div className="flex items-center justify-center py-2">
                <SemiCircularGauge value={overallSkill} size={220} />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Skill Radar</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">{overallSkill}% Overall</Badge>
              </div>
              <div className="flex items-center justify-center">
                {categories && categories.length > 0 ? (
                  <SkillRadarChart categories={categories} progressMap={progressMap} />
                ) : (
                  <div className="flex flex-col items-center py-8 text-white/50">
                    <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs">No skill data yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Category Progress</span>
              </div>
              {categories && categories.length > 0 ? (
                <SkillBarChart categories={categories} progressMap={progressMap} />
              ) : (
                <div className="flex flex-col items-center py-8 text-white/50">
                  <Activity className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">No data available</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Progress Tracking</span>
              </div>
              <MonthlyProgressChart userId={userId} />
            </div>
          </div>

          {categories && categories.length > 0 && (
            <TopSkillsList categories={categories} progressMap={progressMap} />
          )}

          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Quick Category View</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(categories || []).map((cat: any) => {
                const IconComp = ICON_MAP[cat.iconName] || Target;
                const skills = cat.skills || [];
                const avg = skills.length > 0 ? Math.round(skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0) / skills.length) : 0;
                const color = avg >= 80 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : avg >= 50 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : avg >= 25 ? "text-blue-400 border-blue-500/30 bg-blue-500/10" : "text-slate-400 border-slate-500/30 bg-slate-500/10";
                return (
                  <button key={cat.id} onClick={() => setActiveSubTab("skills")} className={`rounded-xl border p-3 text-center transition-colors cursor-pointer ${color}`} data-testid={`quick-cat-${cat.id}`}>
                    <IconComp className="h-5 w-5 mx-auto mb-1.5" />
                    <p className="text-[10px] font-bold">{avg}%</p>
                    <p className="text-[8px] opacity-70 truncate">{cat.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-bold">Skill Development</span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">{totalSkillsAssessed}/{totalSkills}</Badge>
            </div>
            <Button variant={filterWeakest ? "default" : "outline"} size="sm" className="text-xs h-8 rounded-lg" onClick={() => setFilterWeakest(!filterWeakest)} data-testid="button-filter-weakest">
              {filterWeakest ? "Show All" : "Weakest First"}
            </Button>
          </div>
          {sortedCategories.map((cat: any) => (
            <SkillCategoryCard key={cat.id} category={cat} skills={cat.skills || []} progressMap={progressMap} isAdmin={isAdmin} userId={userId} />
          ))}
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <RankingsPanel clubId={clubId} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsPanel userId={userId} achievements={profileData.achievements || []} />
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <VideosPanel userId={userId} videos={profileData.videos || []} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-edit-junior-profile">
          <DialogHeader>
            <DialogTitle>Edit Junior Profile</DialogTitle>
            <DialogDescription>Update {profileData.user.fullName}'s profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm">Level</Label>
              <Select value={editLevel} onValueChange={setEditLevel}>
                <SelectTrigger className="mt-1" data-testid="select-junior-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_NAMES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Attendance %: {editAttendance}%</Label>
              <Slider value={[editAttendance]} onValueChange={([v]) => setEditAttendance(v)} max={100} step={1} className="mt-2" data-testid="slider-attendance" />
            </div>
            <div>
              <Label className="text-sm">Effort Rating: {editEffort}/5</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setEditEffort(v)} className="p-1" data-testid={`button-effort-${v}`}>
                    <Star className={`h-7 w-7 ${v <= editEffort ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm">Coach Rating: {editCoachRating}/5</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setEditCoachRating(v)} className="p-1" data-testid={`button-coach-${v}`}>
                    <Star className={`h-7 w-7 ${v <= editCoachRating ? "text-emerald-400 fill-emerald-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={updateProfileMutation.isPending} onClick={() => { updateProfileMutation.mutate({ clubId: profile?.clubId || clubId, juniorLevel: editLevel, attendancePercentage: editAttendance, effortRating: editEffort, coachRating: editCoachRating }); }} data-testid="button-save-junior-profile">
              {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RankingsPanel({ clubId }: { clubId: number }) {
  const [selectedRank, setSelectedRank] = useState<any>(null);

  const { data: rankings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/junior-rankings", String(clubId)],
    enabled: !!clubId,
  });

  const handlePlayerClick = (rank: any) => {
    setSelectedRank(rank);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!rankings || rankings.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No Rankings Yet</h3>
          <p className="text-sm text-muted-foreground">Rankings will appear once juniors have been assessed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="font-bold">Junior Rankings</h3>
        <Badge variant="secondary" className="ml-auto">{rankings.length} players</Badge>
      </div>
      {rankings.slice(0, 10).map((rank: any, i: number) => {
        const movement = rank.previousPosition > 0 ? rank.previousPosition - rank.rankPosition : 0;
        const achievements: any[] = rank.achievements || [];
        const matchStats = rank.matchStats;
        return (
          <Card
            key={rank.id}
            className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${i < 3 ? "border-amber-500/20" : ""}`}
            data-testid={`card-ranking-${rank.userId}`}
            onClick={() => handlePlayerClick(rank)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-slate-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                  {rank.rankPosition}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={rank.user?.profilePictureUrl} />
                      <AvatarFallback className="text-[10px] bg-amber-500/20 text-amber-400">{rank.user?.fullName?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium truncate">{rank.user?.fullName || "Unknown"}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">{rank.overallSkillPercent}% skill</span>
                    {matchStats && matchStats.matchesPlayed > 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground">{matchStats.matchesPlayed} games</span>
                        <span className={`text-[10px] font-medium ${matchStats.winPercent >= 50 ? "text-emerald-400" : "text-red-400"}`}>{matchStats.winPercent}% win</span>
                      </>
                    )}
                    {matchStats && matchStats.totalSessions > 0 && (
                      <span className="text-[10px] text-muted-foreground">{matchStats.attendancePercent}% att</span>
                    )}
                  </div>
                  {achievements.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {achievements.slice(0, 5).map((ach: any) => {
                        const AchIcon = ICON_MAP[ach.iconName] || Award;
                        return (
                          <div key={ach.id} className="bg-amber-500/10 rounded-full px-1.5 py-0.5 flex items-center gap-0.5" title={ach.title}>
                            <AchIcon className="h-2.5 w-2.5 text-amber-400" />
                            <span className="text-[8px] text-amber-400 font-medium">{ach.title}</span>
                          </div>
                        );
                      })}
                      {achievements.length > 5 && (
                        <span className="text-[8px] text-muted-foreground">+{achievements.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  {movement > 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                  {movement < 0 && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                  {movement !== 0 && <span className={`text-xs font-medium ${movement > 0 ? "text-emerald-400" : "text-red-400"}`}>{Math.abs(movement)}</span>}
                  {achievements.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Award className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium">{achievements.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <JuniorRankingDetailDialog rank={selectedRank} open={!!selectedRank} onOpenChange={(o) => { if (!o) setSelectedRank(null); }} />
    </div>
  );
}

function JuniorRankingDetailDialog({ rank, open, onOpenChange }: { rank: any; open: boolean; onOpenChange: (o: boolean) => void }) {
  const userId = rank?.userId;
  const { data: sessionHistory } = useQuery<any[]>({
    queryKey: ["/api/junior-session-history", String(userId)],
    enabled: open && !!userId,
  });
  const allMatches = useMemo(() => {
    if (!sessionHistory) return [];
    return sessionHistory
      .filter((s: any) => s.status === "COMPLETED" && s.matches && s.matches.length > 0)
      .flatMap((s: any) => s.matches.map((m: any) => ({ ...m, sessionTitle: s.title, sessionDate: s.date })));
  }, [sessionHistory]);
  if (!rank) return null;
  const achievements: any[] = rank.achievements || [];
  const matchStats = rank.matchStats;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[85vh] overflow-y-auto" data-testid="dialog-junior-ranking-detail" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>Player Details</DialogTitle>
        </DialogHeader>
        <div className={`p-4 ${rank.rankPosition === 1 ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/10" : rank.rankPosition === 2 ? "bg-gradient-to-r from-slate-400/20 to-slate-300/10" : rank.rankPosition === 3 ? "bg-gradient-to-r from-amber-700/20 to-amber-600/10" : "bg-muted/20"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shrink-0 ${rank.rankPosition === 1 ? "bg-amber-500 text-black" : rank.rankPosition === 2 ? "bg-slate-400 text-black" : rank.rankPosition === 3 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
              #{rank.rankPosition}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={rank.user?.profilePictureUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{rank.user?.fullName?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-base truncate" data-testid="text-ranking-player-name">{rank.user?.fullName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{rank.overallSkillPercent}% overall skill</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
              <Target className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-black" data-testid="text-ranking-skill">{rank.overallSkillPercent}%</p>
              <p className="text-[9px] text-blue-400/80 uppercase tracking-wider">Skill Level</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <Calendar className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-black" data-testid="text-ranking-attendance">{rank.attendancePercent || matchStats?.attendancePercent || 0}%</p>
              <p className="text-[9px] text-emerald-400/80 uppercase tracking-wider">Attendance</p>
            </div>
          </div>

          {matchStats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <p className="text-base font-bold" data-testid="text-ranking-matches">{matchStats.matchesPlayed || 0}</p>
                <p className="text-[9px] text-muted-foreground">Matches</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <p className="text-base font-bold text-emerald-500" data-testid="text-ranking-wins">{matchStats.matchesWon || 0}</p>
                <p className="text-[9px] text-muted-foreground">Wins</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <p className="text-base font-bold text-red-400">{matchStats.matchesLost || 0}</p>
                <p className="text-[9px] text-muted-foreground">Losses</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                <p className={`text-base font-bold ${(matchStats.winPercent || 0) >= 50 ? "text-emerald-500" : "text-muted-foreground"}`} data-testid="text-ranking-winrate">{matchStats.winPercent || 0}%</p>
                <p className="text-[9px] text-muted-foreground">Win Rate</p>
              </div>
            </div>
          )}

          {rank.effortRating > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <Star className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-amber-400/80 uppercase tracking-wider">Effort Rating</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= rank.effortRating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {achievements.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-400" /> Achievements ({achievements.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {achievements.map((ach: any) => {
                  const AchIcon = ICON_MAP[ach.iconName] || Award;
                  return (
                    <div key={ach.id} className="bg-amber-500/10 rounded-full px-2.5 py-1 flex items-center gap-1" title={ach.description} data-testid={`badge-achievement-${ach.id}`}>
                      <AchIcon className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium">{ach.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {allMatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Swords className="h-3.5 w-3.5 text-blue-400" /> Match Results ({allMatches.length})</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {allMatches.map((match: any, idx: number) => (
                  <div key={match.id || idx} className={`flex items-center gap-2.5 p-2 rounded-lg text-sm ${match.won ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"}`} data-testid={`popup-match-${match.id || idx}`}>
                    <div className={`w-1 h-7 rounded-full shrink-0 ${match.won ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${match.won ? "text-emerald-500" : "text-red-400"}`}>{match.won ? "W" : "L"}</span>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{match.isTeamA ? `${match.scoreA}-${match.scoreB}` : `${match.scoreB}-${match.scoreA}`}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{match.sessionTitle}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {match.partner && <span>w/ {match.partner}</span>}
                        {match.opponents && match.opponents.length > 0 && <span>{match.partner ? " vs " : "vs "}{match.opponents.join(" & ")}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AchievementsPanel({ userId, achievements }: { userId: number; achievements: any[] }) {
  const unlockedKeys = new Set(achievements.map((a: any) => a.achievementKey));
  const allPossible = [
    ...ACHIEVEMENT_DEFS,
    { key: "category_80_1", title: "Game Rules Master", icon: BookOpen, desc: "80%+ in Game Rules" },
    { key: "category_80_2", title: "Warm Up Pro", icon: Flame, desc: "80%+ in Warm Up" },
    { key: "category_80_3", title: "Physical Beast", icon: Dumbbell, desc: "80%+ in Physical" },
    { key: "category_80_4", title: "Footwork King", icon: Footprints, desc: "80%+ in Footwork" },
    { key: "category_80_5", title: "Positioning Expert", icon: Crosshair, desc: "80%+ in Positioning" },
    { key: "category_80_6", title: "Service Ace", icon: Send, desc: "80%+ in Service" },
    { key: "category_80_7", title: "Attack Master", icon: Swords, desc: "80%+ in Attack" },
    { key: "category_80_8", title: "Defense Wall", icon: Shield, desc: "80%+ in Defense" },
    { key: "category_80_9", title: "Strategic Mind", icon: Target, desc: "80%+ in Strategic Shot" },
    { key: "category_80_10", title: "Mental Champion", icon: Brain, desc: "80%+ in Psychology" },
    { key: "category_80_11", title: "Sync Master", icon: Users, desc: "80%+ in Sync" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-amber-400" />
        <h3 className="font-bold">Achievements</h3>
        <Badge variant="secondary" className="ml-auto">{achievements.length}/{allPossible.length}</Badge>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {allPossible.map((ach) => {
          const unlocked = unlockedKeys.has(ach.key);
          const actual = achievements.find((a: any) => a.achievementKey === ach.key);
          return (
            <div key={ach.key} className={`p-3 rounded-xl text-center transition-all ${unlocked ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30 opacity-50"}`} data-testid={`achievement-${ach.key}`}>
              <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${unlocked ? "bg-amber-500/20" : "bg-muted/50"}`}>
                {unlocked ? <ach.icon className="h-5 w-5 text-amber-400" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-[11px] font-medium leading-tight">{ach.title}</p>
              {unlocked && actual?.unlockedAt && <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(actual.unlockedAt), "d MMM")}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideosPanel({ userId, videos, isAdmin }: { userId: number; videos: any[]; isAdmin: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [coachComment, setCoachComment] = useState("");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/junior-videos", data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Video Added" });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userId)] });
      setAddOpen(false); setTitle(""); setYoutubeUrl(""); setCategoryTag(""); setCoachComment("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/junior-videos/${id}`);
      if (!res.ok) throw new Error((await res.json()).message);
    },
    onSuccess: () => { toast({ title: "Video Removed" }); queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userId)] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-amber-400" />
          <h3 className="font-bold">Video Feedback</h3>
          <Badge variant="secondary">{videos.length}</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="border-amber-500/30 text-amber-400" data-testid="button-add-video">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      {videos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No videos added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {videos.map((video: any) => {
            const embedUrl = getYouTubeEmbedUrl(video.youtubeUrl);
            return (
              <Card key={video.id} className="overflow-hidden" data-testid={`card-video-${video.id}`}>
                {embedUrl && (
                  <div className="aspect-video">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{video.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {video.categoryTag && <Badge variant="secondary" className="text-[10px]">{video.categoryTag}</Badge>}
                        <span className="text-[10px] text-muted-foreground">{format(new Date(video.createdAt), "d MMM yyyy")}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => deleteMutation.mutate(video.id)} data-testid={`button-delete-video-${video.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {video.coachComment && <p className="text-xs text-muted-foreground mt-2 bg-muted/30 rounded-lg p-2">{video.coachComment}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-add-video">
          <DialogHeader>
            <DialogTitle>Add Video</DialogTitle>
            <DialogDescription>Add a coaching video for this junior</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Smash technique drill" className="mt-1" data-testid="input-video-title" /></div>
            <div><Label>YouTube URL</Label><Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1" data-testid="input-video-url" /></div>
            <div><Label>Category</Label><Input value={categoryTag} onChange={(e) => setCategoryTag(e.target.value)} placeholder="e.g., Footwork, Attack" className="mt-1" data-testid="input-video-category" /></div>
            <div><Label>Coach Comment</Label><Textarea value={coachComment} onChange={(e) => setCoachComment(e.target.value)} placeholder="Notes for the player..." className="mt-1 min-h-[60px]" data-testid="input-video-comment" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!title || !youtubeUrl || addMutation.isPending} onClick={() => addMutation.mutate({ userId, title, youtubeUrl, categoryTag: categoryTag || null, coachComment: coachComment || null })} data-testid="button-save-video">
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JuniorRankingsSection({ parentClubs }: { parentClubs: { clubId: number; clubName: string }[] }) {
  const [selectedClub, setSelectedClub] = useState<string>(parentClubs.length > 0 ? String(parentClubs[0].clubId) : "");
  const clubId = Number(selectedClub) || (parentClubs.length > 0 ? parentClubs[0].clubId : 0);
  const [selectedRank, setSelectedRank] = useState<any>(null);

  const { data: rankings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/junior-rankings", String(clubId)],
    enabled: !!clubId,
  });

  const handlePlayerClick = (rank: any) => {
    setSelectedRank(rank);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-bold" data-testid="text-junior-rankings">Junior Rankings</h2>
          {rankings && <Badge variant="secondary">{rankings.length} players</Badge>}
          <SectionInfoButton title="Junior Rankings">
            <p className="font-medium text-foreground">How the rankings work</p>
            <p>The junior rankings show how all the children in the club compare to each other. This isn't just about winning matches — we look at the whole picture of their development.</p>
            <p className="font-medium text-foreground mt-2">How scores are calculated:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Skill Progress (50%)</strong> — The biggest part of the score comes from how well your child is developing their skills, as assessed by the coach across all categories.</li>
              <li><strong>Attendance (20%)</strong> — Regular attendance matters! Children who come to sessions consistently score higher here.</li>
              <li><strong>Effort Rating</strong> — The coach rates how hard your child tries during sessions. Great effort is always rewarded.</li>
              <li><strong>Coach Rating</strong> — An overall assessment from the coach about your child's progress and attitude.</li>
              <li><strong>Win Rate Bonus</strong> — Children who win more matches get a small bonus, but it's not the main factor.</li>
              <li><strong>Match Volume</strong> — Playing more matches shows commitment and gives extra points.</li>
            </ul>
            <p className="font-medium text-foreground mt-2">What you'll see:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>A ranked list of all juniors with their overall score and level badge.</li>
              <li>Tap on any player to see their achievements, match results, and detailed stats.</li>
              <li>Badges like "Beginner", "Improver", and "Performance" show the player's current level.</li>
            </ul>
            <p className="mt-2">Remember, rankings are a guide to progress — every child develops at their own pace, and we celebrate all improvements equally!</p>
          </SectionInfoButton>
        </div>
        {parentClubs.length > 1 && (
          <Select value={selectedClub} onValueChange={setSelectedClub}>
            <SelectTrigger className="w-40" data-testid="select-rankings-club">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {parentClubs.map((c) => <SelectItem key={c.clubId} value={String(c.clubId)}>{c.clubName}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !rankings || rankings.length === 0 ? (
        <Card className="border-dashed" data-testid="card-no-rankings">
          <CardContent className="p-8 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No Rankings Yet</h3>
            <p className="text-sm text-muted-foreground">Rankings will appear once junior players have been assessed and the leaderboard recalculated.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rankings.map((rank: any, i: number) => {
            const movement = rank.previousPosition > 0 ? rank.previousPosition - rank.rankPosition : 0;
            const achievements: any[] = rank.achievements || [];
            const matchStats = rank.matchStats;
            return (
              <Card
                key={rank.id}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${i < 3 ? "border-amber-500/20" : ""}`}
                data-testid={`card-full-ranking-${rank.userId}`}
                onClick={() => handlePlayerClick(rank)}
              >
                {i < 3 && <div className={`h-1 ${i === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-300" : i === 1 ? "bg-gradient-to-r from-slate-300 to-slate-400" : "bg-gradient-to-r from-amber-700 to-amber-600"}`} />}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-slate-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                      {rank.rankPosition}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={rank.user?.profilePictureUrl} />
                          <AvatarFallback className="text-xs bg-purple-500/20 text-purple-400">{rank.user?.fullName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{rank.user?.fullName || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{rank.overallSkillPercent}% overall skill</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="text-center p-1.5 rounded-lg bg-muted/40">
                          <p className="text-xs font-bold">{matchStats?.matchesPlayed || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Matches</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-muted/40">
                          <p className="text-xs font-bold text-emerald-500">{matchStats?.matchesWon || 0}</p>
                          <p className="text-[9px] text-muted-foreground">Wins</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-muted/40">
                          <p className={`text-xs font-bold ${(matchStats?.winPercent || 0) >= 50 ? "text-emerald-500" : "text-muted-foreground"}`}>{matchStats?.winPercent || 0}%</p>
                          <p className="text-[9px] text-muted-foreground">Win Rate</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-muted/40">
                          <p className="text-xs font-bold">{matchStats?.attendancePercent || rank.attendancePercent || 0}%</p>
                          <p className="text-[9px] text-muted-foreground">Attend.</p>
                        </div>
                      </div>

                      {achievements.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {achievements.map((ach: any) => {
                            const AchIcon = ICON_MAP[ach.iconName] || Award;
                            return (
                              <div key={ach.id} className="bg-amber-500/10 rounded-full px-2 py-0.5 flex items-center gap-1" title={ach.description}>
                                <AchIcon className="h-3 w-3 text-amber-400" />
                                <span className="text-[9px] text-amber-400 font-medium">{ach.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {movement > 0 && <div className="flex items-center gap-0.5"><TrendingUp className="h-4 w-4 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">{Math.abs(movement)}</span></div>}
                      {movement < 0 && <div className="flex items-center gap-0.5"><TrendingDown className="h-4 w-4 text-red-400" /><span className="text-xs font-medium text-red-400">{Math.abs(movement)}</span></div>}
                      {achievements.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-1">
                          <Award className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs text-amber-400 font-medium">{achievements.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <JuniorRankingDetailDialog rank={selectedRank} open={!!selectedRank} onOpenChange={(o) => { if (!o) setSelectedRank(null); }} />
    </div>
  );
}

function JuniorSessionsPanel({ juniors, selectedChildId, setSelectedChildId }: { juniors: any[] | undefined; selectedChildId: number | null; setSelectedChildId: (id: number | null) => void }) {
  const { data: sessions, isLoading } = useQuery<any[]>({ queryKey: ["/api/sessions"] });
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs();
  const { toast } = useToast();
  const [sessionsTab, setSessionsTab] = useState<"upcoming" | "past" | "scheduled">("upcoming");
  const [deleteSession, setDeleteSession] = useState<{ id: number; recurringEventId: number | null; date: string | null } | null>(null);
  const [togglingSessionId, setTogglingSessionId] = useState<number | null>(null);
  const { mutate: toggleSessionTypeMut } = useUpdateSession();
  const handleMoveToSessions = async (session: any) => {
    setTogglingSessionId(session.id);
    try {
      if (session.recurringEventId) {
        await apiRequest("PATCH", `/api/recurring-events/${session.recurringEventId}/apply-to-series`, {
          updates: { sessionType: "OPEN" },
        });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
        toast({ title: "Series Moved", description: "All sessions in this series moved to Sessions." });
      } else {
        toggleSessionTypeMut({ sessionId: session.id, updates: { sessionType: "OPEN" } }, {
          onSettled: () => setTogglingSessionId(null),
        });
        return;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    }
    setTogglingSessionId(null);
  };

  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const managedClubIds = useMemo(() => new Set(adminClubs?.map((c: any) => c.id) || []), [adminClubs]);
  const isAdmin = isPlatformAdmin || managedClubIds.size > 0;

  const activeChildId = selectedChildId || (juniors && juniors.length === 1 ? juniors[0].id : null);

  const { data: sessionHistory, isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/junior-session-history", String(activeChildId)],
    enabled: !!activeChildId && sessionsTab === "past",
  });

  const deleteSingleMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Session Deleted", description: "The session has been deleted." });
      setDeleteSession(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async ({ recurringEventId, fromDate }: { recurringEventId: number; fromDate?: string }) => {
      const url = fromDate
        ? `/api/recurring-events/${recurringEventId}?fromDate=${encodeURIComponent(fromDate)}`
        : `/api/recurring-events/${recurringEventId}`;
      const res = await apiRequest("DELETE", url);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Sessions Deleted", description: data.message });
      setDeleteSession(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("PATCH", `/api/sessions/${sessionId}`, { publishAt: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Published", description: "Session is now open for signups." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const juniorSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s: any) => s.sessionType === "JUNIORS_ONLY" && s.status !== "CANCELLED")
      .filter((s: any) => {
        const isScheduled = s.publishAt && new Date(s.publishAt) > new Date();
        return !isScheduled;
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  const scheduledJuniorSessions = useMemo(() => {
    if (!sessions || !isAdmin) return [];
    return sessions
      .filter((s: any) => s.sessionType === "JUNIORS_ONLY" && s.status !== "CANCELLED")
      .filter((s: any) => {
        const isScheduled = s.publishAt && new Date(s.publishAt) > new Date();
        return isScheduled && (isPlatformAdmin || managedClubIds.has(s.clubId));
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, isAdmin, isPlatformAdmin, managedClubIds]);

  const upcomingSessions = useMemo(() => juniorSessions.filter((s: any) => s.status !== "COMPLETED"), [juniorSessions]);

  const pastSessions = useMemo(() => {
    if (!sessionHistory) return [];
    return sessionHistory.filter((s: any) => s.status === "COMPLETED");
  }, [sessionHistory]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="h-5 w-5 text-teal-500" />
        <h3 className="font-bold">Junior Sessions</h3>
        <SectionInfoButton title="Junior Sessions">
          <p className="font-medium text-foreground">Your child's session schedule and history</p>
          <p>This section shows all the junior-only sessions your child can attend, and keeps a record of everything they've done.</p>
          <p className="font-medium text-foreground mt-2">Upcoming Sessions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Shows all future junior sessions that are open for sign-up.</li>
            <li>You can see the date, time, venue, and how many spots are available.</li>
            <li>Click "Sign Up" to register your child for a session. If it's full, they'll be placed on a waiting list and automatically moved up when a spot opens.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Past Sessions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Select your child from the dropdown to see their session history.</li>
            <li>Each past session shows whether they attended and how many matches they played.</li>
            <li>Match results show the score, who their partner was, and who they played against.</li>
            <li>A green "Attended" badge means they were marked as present by the coach.</li>
          </ul>
          <p className="font-medium text-foreground mt-2">Why it matters:</p>
          <p>Regular attendance is key to improvement! The attendance data shown here feeds directly into your child's overall stats and rankings. The more sessions they attend, the more matches they play, and the faster their skills develop.</p>
        </SectionInfoButton>
      </div>

      <div className="flex gap-2 mb-4" data-testid="tabs-sessions">
        {([
          { key: "upcoming" as const, label: `Upcoming (${upcomingSessions.length})`, icon: Calendar },
          { key: "past" as const, label: "Past Sessions", icon: Clock },
          ...(isAdmin ? [{ key: "scheduled" as const, label: `Scheduled (${scheduledJuniorSessions.length})`, icon: Clock }] : []),
        ]).map(tab => (
          <Button
            key={tab.key}
            variant={sessionsTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setSessionsTab(tab.key)}
            className={tab.key === "scheduled" && sessionsTab !== "scheduled" ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" : ""}
            data-testid={`tab-sessions-${tab.key}`}
          >
            <tab.icon className="h-3.5 w-3.5 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {sessionsTab === "scheduled" && isAdmin && (
        <div className="space-y-4" data-testid="section-scheduled-junior-sessions">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/40">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Scheduled Junior Sessions</h3>
              <span className="text-xs text-muted-foreground">Not yet visible to players — publish to make them live</span>
            </div>
          </div>
          {scheduledJuniorSessions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No scheduled junior sessions</p>
                <p className="text-xs text-muted-foreground mt-1">Sessions with a future publish date will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scheduledJuniorSessions.map((session: any) => (
                <Card key={session.id} className="border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10" data-testid={`card-scheduled-junior-${session.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{session.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(session.date), "EEE, d MMM yyyy")}</span>
                        </div>
                        {session.startTime && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{session.startTime}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 flex-shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Opens {format(new Date(session.publishAt), "MMM d")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900"
                        onClick={() => publishNowMutation.mutate(session.id)}
                        disabled={publishNowMutation.isPending}
                        data-testid={`button-publish-junior-${session.id}`}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Publish Now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleMoveToSessions(session)}
                        disabled={togglingSessionId === session.id}
                        data-testid={`button-move-to-sessions-scheduled-${session.id}`}
                        title="Move to Sessions"
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Move to Sessions</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteSession({ id: session.id, recurringEventId: session.recurringEventId || null, date: session.date || null })}
                        data-testid={`button-delete-scheduled-junior-${session.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {sessionsTab === "upcoming" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : upcomingSessions.length === 0 ? (
            <Card className="border-dashed" data-testid="card-no-upcoming-sessions">
              <CardContent className="p-8 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No Upcoming Sessions</h3>
                <p className="text-sm text-muted-foreground">There are currently no junior sessions scheduled. Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSessions.map((session: any) => {
                const sessionDate = new Date(session.date);
                const isLive = session.status === "ACTIVE";
                const spotsLeft = session.maxPlayers - (session.signupCount || 0);
                return (
                  <Card key={session.id} className="overflow-hidden" data-testid={`card-session-${session.id}`}>
                    {isLive && <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-400" />}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{session.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(sessionDate, "EEE, d MMM yyyy")}</span>
                          </div>
                          {session.startTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{session.startTime}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          {isLive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>}
                          {spotsLeft > 0 && !isLive && <Badge variant="secondary">{spotsLeft} spots</Badge>}
                        </div>
                      </div>
                      {(session as any).venue && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{(session as any).venue.name}{(session as any).venue.city ? `, ${(session as any).venue.city}` : ""}</span>
                        </div>
                      )}
                      {session.sessionFee != null && (
                        <div className="flex items-center gap-1 mt-2 text-sm">
                          <PoundSterling className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-medium">£{(session.sessionFee / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {user && (
                        <div className="flex items-center gap-2 mt-3">
                          <Link href={`/sessions/${session.id}`} className="flex-1">
                            <Button size="sm" className="w-full" variant="outline" data-testid={`button-view-session-${session.id}`}>
                              View & Sign Up <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </Link>
                          {isAdmin && (isPlatformAdmin || managedClubIds.has(session.clubId)) && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleMoveToSessions(session)}
                                disabled={togglingSessionId === session.id}
                                data-testid={`button-move-to-sessions-${session.id}`}
                                title="Move to Sessions"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteSession({ id: session.id, recurringEventId: session.recurringEventId || null, date: session.date || null })}
                                data-testid={`button-delete-junior-session-${session.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {sessionsTab === "past" && (
        <div>
          {juniors && juniors.length > 1 && (
            <div className="mb-4">
              <Select value={activeChildId ? String(activeChildId) : ""} onValueChange={v => setSelectedChildId(Number(v))}>
                <SelectTrigger className="w-full max-w-xs" data-testid="select-child-sessions">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {juniors.map((j: any) => (
                    <SelectItem key={j.id} value={String(j.id)}>{j.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!activeChildId ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">Select a Child</h3>
                <p className="text-sm text-muted-foreground">Choose a child to view their past session history and match results.</p>
              </CardContent>
            </Card>
          ) : historyLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pastSessions.length === 0 ? (
            <Card className="border-dashed" data-testid="card-no-past-sessions">
              <CardContent className="p-8 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">No Past Sessions</h3>
                <p className="text-sm text-muted-foreground">No completed sessions found for this player yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((session: any) => {
                const sessionDate = new Date(session.date);
                return (
                  <Card key={session.sessionId} data-testid={`card-past-session-${session.sessionId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{session.title || "Session"}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(sessionDate, "EEE, d MMM yyyy")}</span>
                          </div>
                          {session.startTime && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{session.startTime}</span>
                            </div>
                          )}
                          {session.clubName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{session.clubName}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={session.attendanceStatus === "ATTENDED" ? "default" : "secondary"} className={session.attendanceStatus === "ATTENDED" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : ""}>
                            {session.attendanceStatus === "ATTENDED" ? "Attended" : "Absent"}
                          </Badge>
                        </div>
                      </div>

                      {session.matchesPlayed > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Swords className="h-4 w-4 text-muted-foreground" />
                              <span>{session.matchesPlayed} match{session.matchesPlayed !== 1 ? "es" : ""}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{session.wins}W</span>
                              <span className="text-red-500 font-semibold">{session.losses}L</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {session.matches.map((match: any, idx: number) => (
                              <div key={match.id || idx} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${match.won ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"}`} data-testid={`match-result-${match.id || idx}`}>
                                <div className={`w-1.5 h-8 rounded-full ${match.won ? "bg-emerald-500" : "bg-red-500"}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${match.won ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                      {match.won ? "Won" : "Lost"}
                                    </span>
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                      {match.isTeamA ? `${match.scoreA}-${match.scoreB}` : `${match.scoreB}-${match.scoreA}`}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {match.partner && <span>Partner: {match.partner}</span>}
                                    {match.opponents && match.opponents.length > 0 && (
                                      <span>{match.partner ? " · " : ""}vs {match.opponents.join(" & ")}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!deleteSession} onOpenChange={(open) => { if (!open) setDeleteSession(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              {deleteSession?.recurringEventId
                ? "This session is part of a recurring series. Choose how to delete:"
                : "Are you sure you want to delete this session? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteSession(null)} data-testid="button-cancel-junior-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteSession && deleteSingleMutation.mutate(deleteSession.id)}
              disabled={deleteSingleMutation.isPending || deleteRecurringMutation.isPending}
              data-testid="button-delete-junior-this"
            >
              {deleteSingleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleteSession?.recurringEventId ? "Delete This Session Only" : "Delete Session"}
            </Button>
            {deleteSession?.recurringEventId && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => deleteSession.recurringEventId && deleteRecurringMutation.mutate({ recurringEventId: deleteSession.recurringEventId, fromDate: deleteSession.date || undefined })}
                  disabled={deleteRecurringMutation.isPending || deleteSingleMutation.isPending}
                  data-testid="button-delete-junior-future"
                >
                  {deleteRecurringMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete This & Future Sessions
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-700 hover:bg-red-800"
                  onClick={() => deleteSession.recurringEventId && deleteRecurringMutation.mutate({ recurringEventId: deleteSession.recurringEventId })}
                  disabled={deleteRecurringMutation.isPending || deleteSingleMutation.isPending}
                  data-testid="button-delete-junior-series"
                >
                  {deleteRecurringMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete Entire Series
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeesPanel() {
  const plans = [
    { title: "Group Sessions", price: "£15", unit: "per session", description: "Weekly junior group sessions with structured coaching, drills, and match play.", features: ["Expert coaching", "Age-grouped sessions", "Weekly schedule", "All equipment provided"], highlight: true, icon: Users, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { title: "1-to-1 Coaching", price: "£25", unit: "per hour", description: "Personalised one-on-one coaching sessions. Available on request and agreed one week in advance.", features: ["Personalised coaching", "Flexible scheduling", "Individual attention", "Tailored development"], highlight: false, icon: Star, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    { title: "Match Sessions", price: "£8", unit: "per session", description: "Competitive match practice sessions to apply skills in real game scenarios.", features: ["Competitive play", "Skill application", "Performance tracking", "Fun environment"], highlight: false, icon: Gamepad2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <PoundSterling className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold">Pricing</h3>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">Our pricing is designed to be accessible, flexible, and great value for quality coaching.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan, i) => (
          <Card key={i} className={`relative overflow-hidden ${plan.highlight ? "border-emerald-500 shadow-lg ring-1 ring-emerald-500/20" : ""}`} data-testid={`card-pricing-${i}`}>
            {plan.highlight && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />}
            <CardContent className="p-6">
              <div className={`${plan.iconBg} rounded-lg p-2.5 w-fit mb-4`}>
                <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">{plan.title}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/{plan.unit}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plan.description}</p>
              <ul className="space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AboutPanel() {
  const features = [
    { icon: Target, title: "Technical Coaching", description: "Age-appropriate coaching covering footwork, grips, and strokes tailored to each player's level.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Dumbbell, title: "Movement & Agility", description: "Developing coordination, agility, and movement skills essential for racket sports and general fitness.", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Brain, title: "Game Understanding", description: "Building tactical awareness and game intelligence through structured drills and guided play.", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Trophy, title: "Structured Match Play", description: "Confidence-building through organised match play, helping players apply skills in real game situations.", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Smile, title: "Fun & Engaging", description: "Fun, engaging drills and activities that keep juniors motivated, active, and loving the sport.", color: "text-pink-500", bg: "bg-pink-500/10" },
    { icon: Users, title: "Grouped by Ability", description: "Sessions are grouped by age and ability so every player gets the right level of challenge and support.", color: "text-teal-500", bg: "bg-teal-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold">What We Do</h3>
        </div>
        <p className="text-muted-foreground mb-6 text-sm">Our sessions focus on long-term player development in a fun and supportive environment. Here's what your child can expect:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <Card key={i} className="border hover:shadow-md transition-shadow" data-testid={`card-feature-${i}`}>
              <CardContent className="p-5">
                <div className={`${feature.bg} rounded-lg p-2.5 w-fit mb-3`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-safeguarding">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-blue-500/10 rounded-xl p-3 shrink-0">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3" data-testid="text-safeguarding">Safeguarding & Player Welfare</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Player safety and wellbeing are our top priority. All junior sessions adhere to
                national governing body safeguarding policies. Parents and guardians can be confident
                their children are in a safe, inclusive, and respectful environment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: CheckCircle, text: "DBS-checked coaches" },
                  { icon: Shield, text: "Safeguarding-trained staff" },
                  { icon: Heart, text: "Clear codes of conduct" },
                  { icon: Eye, text: "Safe & inclusive environment" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <item.icon className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4 italic">
                We advise parents and guardians to remain at the session until your child is familiar
                with the new environment and feels comfortable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CATEGORY_CHIPS = [
  { key: "ALL", label: "All", icon: Dumbbell },
  { key: "HOME", label: "Home", icon: Heart },
  { key: "FOOTWORK", label: "Footwork", icon: Footprints },
  { key: "CORE", label: "Core", icon: Target },
  { key: "STRENGTH", label: "Strength", icon: Flame },
  { key: "CARDIO", label: "Cardio", icon: Zap },
  { key: "FLEXIBILITY", label: "Flexibility", icon: Activity },
  { key: "GYM", label: "Gym", icon: Dumbbell },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  HARD: "bg-red-500/20 text-red-400 border-red-500/40",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function ExerciseChallengePanel({ isAdmin, juniors }: { isAdmin: boolean; juniors: any[] | undefined }) {
  const [activeTab, setActiveTab] = useState<"challenges" | "exercises" | "videos">("challenges");
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [editExerciseOpen, setEditExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCategory, setVideoCategory] = useState("HOME");
  const [videoDescription, setVideoDescription] = useState("");
  const [viewExercise, setViewExercise] = useState<any>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    try { return localStorage.getItem("junior-training-alerts") !== "off"; } catch { return true; }
  });
  const { toast } = useToast();

  const toggleAlerts = () => {
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    try { localStorage.setItem("junior-training-alerts", next ? "on" : "off"); } catch {}
    toast({ title: next ? "Daily reminders turned on" : "Daily reminders turned off", description: next ? "You'll get reminders for incomplete exercises" : "You won't receive exercise reminders" });
  };

  useEffect(() => {
    if (juniors && juniors.length > 0 && !selectedChild) {
      setSelectedChild(juniors[0].id);
    }
  }, [juniors, selectedChild]);

  const { data: challenges } = useQuery<any[]>({ queryKey: ["/api/junior-weekly-challenges"] });
  const { data: exercises } = useQuery<any[]>({ queryKey: ["/api/junior-exercises"] });
  const { data: exerciseVideos } = useQuery<any[]>({ queryKey: ["/api/junior-exercise-videos"] });
  const { data: completions } = useQuery<any[]>({
    queryKey: ["/api/junior-challenge-completions", String(selectedChild)],
    enabled: !!selectedChild,
  });
  const { data: skillPoints } = useQuery<{ totalPoints: number }>({
    queryKey: ["/api/junior-skill-points", String(selectedChild)],
    enabled: !!selectedChild,
  });

  const completeMutation = useMutation({
    mutationFn: async (data: { userId: number; challengeDayId: number; challengeId: number }) => {
      const res = await apiRequest("POST", "/api/junior-challenge-completions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-challenge-completions", String(selectedChild)] });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skill-points", String(selectedChild)] });
      toast({ title: "Exercise completed!", description: "Skill points earned!" });
    },
  });

  const uncompleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/junior-challenge-completions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-challenge-completions", String(selectedChild)] });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skill-points", String(selectedChild)] });
    },
  });

  const revealMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/junior-weekly-challenges/${id}/reveal`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-weekly-challenges"] });
      toast({ title: "Week revealed!" });
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/junior-exercises/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-exercises"] });
      setEditExerciseOpen(false);
      toast({ title: "Exercise updated" });
    },
  });

  const addVideoMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/junior-exercise-videos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-exercise-videos"] });
      setAddVideoOpen(false);
      setVideoTitle(""); setVideoUrl(""); setVideoDescription("");
      toast({ title: "Video added" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/junior-exercise-videos/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-exercise-videos"] });
      toast({ title: "Video deleted" });
    },
  });

  const currentWeek = useMemo(() => {
    if (!challenges) return null;
    if (selectedWeek !== null) return challenges.find((c: any) => c.weekNumber === selectedWeek) || null;
    const revealed = challenges.filter((c: any) => c.isRevealed);
    return revealed.length > 0 ? revealed[revealed.length - 1] : challenges[0] || null;
  }, [challenges, selectedWeek]);

  const dayExercises = useMemo(() => {
    if (!currentWeek?.days) return [];
    return currentWeek.days.filter((d: any) => d.dayOfWeek === selectedDay);
  }, [currentWeek, selectedDay]);

  const completionSet = useMemo(() => {
    if (!completions) return new Set<number>();
    return new Set(completions.map((c: any) => c.challengeDayId));
  }, [completions]);

  const completionMap = useMemo(() => {
    if (!completions) return new Map<number, any>();
    return new Map(completions.map((c: any) => [c.challengeDayId, c]));
  }, [completions]);

  const weekProgress = useMemo(() => {
    if (!currentWeek?.days || !completions) return 0;
    const totalDays = currentWeek.days.length;
    const completed = currentWeek.days.filter((d: any) => completionSet.has(d.id)).length;
    return totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
  }, [currentWeek, completions, completionSet]);

  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    if (categoryFilter === "ALL") return exercises;
    return exercises.filter((e: any) => e.category === categoryFilter);
  }, [exercises, categoryFilter]);

  const filteredVideos = useMemo(() => {
    if (!exerciseVideos) return [];
    if (categoryFilter === "ALL") return exerciseVideos;
    return exerciseVideos.filter((v: any) => v.category === categoryFilter);
  }, [exerciseVideos, categoryFilter]);

  function getYoutubeId(url: string) {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)/);
    return match ? match[1] : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-bold" data-testid="text-training-title">Training Challenges</h2>
          <SectionInfoButton title="Training Challenges">
            <p className="font-medium text-foreground">Your child's exercise and training programme</p>
            <p>Training Challenges give your child structured weekly exercise routines they can follow at home, in the gym, or on the court. It's designed to build their fitness and sporting skills between sessions.</p>
            <p className="font-medium text-foreground mt-2">How it works:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Weekly Challenges</strong> — Each week has a set of exercises spread across 5 days (Monday to Friday). New weeks are unlocked by the coach as your child progresses.</li>
              <li><strong>Difficulty Levels</strong> — Weeks 1-4 are Beginner level, Weeks 5-8 are Intermediate, and Weeks 9-12 are Advanced. Each exercise is marked as Easy (green), Medium (amber), or Hard (red).</li>
              <li><strong>Completing Exercises</strong> — Tap the circle next to an exercise to mark it as done. Your child earns skill points for each exercise they complete!</li>
              <li><strong>Progress Bar</strong> — The orange bar at the top shows how much of the current week your child has completed.</li>
              <li><strong>Skill Points</strong> — The golden points counter in the top right tracks total points earned. More exercises completed = more points!</li>
            </ul>
            <p className="font-medium text-foreground mt-2">The three tabs:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Challenges</strong> — The weekly programme with day-by-day exercises to complete.</li>
              <li><strong>Exercises</strong> — Browse the full exercise library with descriptions, difficulty levels, and tutorial videos.</li>
              <li><strong>Videos</strong> — Watch tutorial videos grouped by category to learn the correct technique.</li>
            </ul>
            <p className="font-medium text-foreground mt-2">Daily Reminders:</p>
            <p>Use the bell button to turn daily reminders on or off. When turned on, your child will get a gentle nudge about any exercises they haven't completed yet.</p>
            <p className="mt-2">Encourage your child to complete as many exercises as they can each week — consistency is the key to improvement!</p>
          </SectionInfoButton>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAlerts}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${alertsEnabled ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-muted/20 border-muted-foreground/20 text-muted-foreground"}`}
            data-testid="btn-toggle-alerts"
          >
            {alertsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            {alertsEnabled ? "On" : "Off"}
          </button>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-sm font-bold text-amber-400" data-testid="text-skill-points">{skillPoints?.totalPoints || 0}</span>
            <span className="text-[10px] text-amber-400/70">pts</span>
          </div>
        </div>
      </div>

      {juniors && juniors.length > 1 && (
        <Select value={selectedChild?.toString() || ""} onValueChange={(v) => setSelectedChild(parseInt(v))}>
          <SelectTrigger className="w-full" data-testid="select-child-training">
            <SelectValue placeholder="Select child" />
          </SelectTrigger>
          <SelectContent>
            {juniors.map((j: any) => (
              <SelectItem key={j.id} value={j.id.toString()}>{j.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {[
          { key: "challenges", label: "Challenges", icon: Trophy },
          { key: "exercises", label: "Exercises", icon: Dumbbell },
          { key: "videos", label: "Videos", icon: Play },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? "bg-orange-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-training-${tab.key}`}
          >
            <tab.icon className="h-3.5 w-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "challenges" && (
        <div className="space-y-4">
          {currentWeek && (
            <div className="rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 p-4 text-white" data-testid="card-current-challenge">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <span className="font-bold text-sm">Week {currentWeek.weekNumber}</span>
                </div>
                <Badge className="bg-white/20 text-white border-0 text-[10px]">{currentWeek.skillPointsReward} pts</Badge>
              </div>
              <h3 className="text-lg font-black mb-1">{currentWeek.title}</h3>
              <p className="text-xs text-white/80 mb-3">{currentWeek.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${weekProgress}%` }} />
                </div>
                <span className="text-xs font-bold">{weekProgress}%</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(challenges || []).map((c: any) => (
              <button
                key={c.id}
                onClick={() => { if (c.isRevealed) setSelectedWeek(c.weekNumber); }}
                className={`shrink-0 rounded-xl px-3 py-2 text-center min-w-[60px] transition-all ${
                  currentWeek?.weekNumber === c.weekNumber
                    ? "bg-orange-500 text-white shadow-lg"
                    : c.isRevealed
                    ? "bg-muted/50 hover:bg-muted"
                    : "bg-muted/20 opacity-50"
                }`}
                disabled={!c.isRevealed && !isAdmin}
                data-testid={`week-btn-${c.weekNumber}`}
              >
                {!c.isRevealed && <Lock className="h-3 w-3 mx-auto mb-0.5 opacity-50" />}
                <span className="text-[10px] font-medium block">Wk {c.weekNumber}</span>
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="flex gap-2 overflow-x-auto">
              {(challenges || []).filter((c: any) => !c.isRevealed).slice(0, 3).map((c: any) => (
                <Button key={c.id} size="sm" variant="outline" className="gap-1 text-xs shrink-0 border-orange-500/30 text-orange-400 hover:bg-orange-500/10" onClick={() => revealMutation.mutate(c.id)} data-testid={`btn-reveal-week-${c.weekNumber}`}>
                  <Unlock className="h-3 w-3" /> Reveal Week {c.weekNumber}
                </Button>
              ))}
            </div>
          )}

          {currentWeek?.isRevealed && (
            <>
              <div className="flex gap-2 justify-center">
                {DAY_NAMES.map((day, i) => {
                  const dayNum = i + 1;
                  const dayItems = (currentWeek?.days || []).filter((d: any) => d.dayOfWeek === dayNum);
                  const allDone = dayItems.length > 0 && dayItems.every((d: any) => completionSet.has(d.id));
                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-[52px] transition-all ${
                        selectedDay === dayNum
                          ? "bg-orange-500 text-white shadow-lg scale-105"
                          : allDone
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-muted/30 hover:bg-muted/50"
                      }`}
                      data-testid={`day-btn-${dayNum}`}
                    >
                      <span className="text-[10px] font-medium">{day}</span>
                      {allDone && selectedDay !== dayNum && <CircleCheck className="h-3 w-3 text-emerald-400 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {dayExercises.length === 0 ? (
                  <div className="rounded-2xl bg-muted/20 p-8 text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Rest day! No exercises scheduled.</p>
                  </div>
                ) : (
                  dayExercises.map((item: any) => {
                    const exercise = item.exercise;
                    if (!exercise) return null;
                    const isCompleted = completionSet.has(item.id);
                    const completion = completionMap.get(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border transition-all ${isCompleted ? "bg-emerald-500/5 border-emerald-500/30" : "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50"}`}
                        data-testid={`exercise-card-${item.id}`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => {
                                if (!selectedChild) return;
                                if (isCompleted && completion) {
                                  uncompleteMutation.mutate(completion.id);
                                } else {
                                  completeMutation.mutate({ userId: selectedChild, challengeDayId: item.id, challengeId: currentWeek.id });
                                }
                              }}
                              className={`shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30 hover:border-orange-400"}`}
                              data-testid={`complete-btn-${item.id}`}
                            >
                              {isCompleted && <Check className="h-4 w-4" />}
                            </button>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewExercise({ ...exercise, targetReps: item.targetReps, targetSets: item.targetSets, targetDurationMinutes: item.targetDurationMinutes })}>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-bold ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{exercise.name}</h4>
                                <Badge className={`text-[9px] px-1.5 py-0 border ${DIFFICULTY_COLORS[exercise.difficulty] || ""}`}>
                                  {exercise.difficulty}
                                </Badge>
                              </div>
                              <p className="text-xs text-white/60 line-clamp-2 mb-2">{exercise.description}</p>
                              <div className="flex items-center gap-3 text-[10px] text-white/50">
                                {(item.targetDurationMinutes || exercise.durationMinutes) && (
                                  <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{item.targetDurationMinutes || exercise.durationMinutes} min</span>
                                )}
                                {(item.targetReps || exercise.reps) && (
                                  <span className="flex items-center gap-1"><Repeat className="h-3 w-3" />{item.targetReps || exercise.reps} reps</span>
                                )}
                                {(item.targetSets || exercise.sets) && (
                                  <span className="flex items-center gap-1">{item.targetSets || exercise.sets} sets</span>
                                )}
                                {exercise.equipment && (
                                  <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{exercise.equipment}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {exercise.videoUrl && (
                            <a href={exercise.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-400 hover:text-orange-300">
                              <Play className="h-3 w-3" /> Watch Tutorial
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {currentWeek && !currentWeek.isRevealed && (
            <div className="rounded-2xl bg-muted/20 p-8 text-center">
              <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="font-semibold mb-1">Week Locked</h3>
              <p className="text-sm text-muted-foreground">This week's challenges haven't been revealed yet. Check back soon!</p>
              {isAdmin && (
                <Button size="sm" className="mt-3 gap-1 bg-orange-500 hover:bg-orange-600" onClick={() => revealMutation.mutate(currentWeek.id)}>
                  <Unlock className="h-3.5 w-3.5" /> Reveal This Week
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "exercises" && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_CHIPS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  categoryFilter === cat.key
                    ? "bg-orange-500 text-white"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
                data-testid={`cat-chip-${cat.key}`}
              >
                <cat.icon className="h-3 w-3" />{cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredExercises.map((ex: any) => (
              <div key={ex.id} className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 p-4 cursor-pointer hover:border-orange-500/40 transition-colors" onClick={() => setViewExercise(ex)} data-testid={`exercise-lib-${ex.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white">{ex.name}</h4>
                      <Badge className={`text-[9px] px-1.5 py-0 border ${DIFFICULTY_COLORS[ex.difficulty] || ""}`}>{ex.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2 mb-2">{ex.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-white/50 flex-wrap">
                      {ex.durationMinutes && <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{ex.durationMinutes} min</span>}
                      {ex.reps && <span className="flex items-center gap-1"><Repeat className="h-3 w-3" />{ex.reps} reps</span>}
                      {ex.sets && <span>{ex.sets} sets</span>}
                      {ex.equipment && <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{ex.equipment}</span>}
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{ex.location}</Badge>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="shrink-0 h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditingExercise(ex); setEditExerciseOpen(true); }} data-testid={`btn-edit-exercise-${ex.id}`}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-400 hover:text-orange-300">
                    <Play className="h-3 w-3" /> Watch Tutorial
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "videos" && (
        <div className="space-y-4">
          {isAdmin && (
            <Button size="sm" className="gap-1 bg-orange-500 hover:bg-orange-600" onClick={() => setAddVideoOpen(true)} data-testid="btn-add-video">
              <Plus className="h-3.5 w-3.5" /> Add Video
            </Button>
          )}

          {(() => {
            const allVids = exerciseVideos || [];
            const categories = [...new Set(allVids.map((v: any) => v.category).filter(Boolean))].sort();
            if (allVids.length === 0) {
              return (
                <div className="rounded-2xl bg-muted/20 p-8 text-center">
                  <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No videos found</p>
                </div>
              );
            }
            return (
              <div className="space-y-6">
                {categories.map((cat: string) => {
                  const catVids = allVids.filter((v: any) => v.category === cat);
                  const CatIcon = CATEGORY_CHIPS.find(c => c.key === cat)?.icon || Play;
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <CatIcon className="h-4 w-4 text-orange-400" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400">{cat}</h3>
                        <Badge variant="secondary" className="text-[9px]">{catVids.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catVids.map((video: any) => {
                          const ytId = getYoutubeId(video.youtubeUrl);
                          return (
                            <div key={video.id} className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow" data-testid={`video-card-${video.id}`}>
                              {ytId && (
                                <div className="aspect-video bg-black">
                                  <iframe
                                    src={`https://www.youtube.com/embed/${ytId}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={video.title}
                                  />
                                </div>
                              )}
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold truncate">{video.title}</h4>
                                    {video.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{video.description}</p>}
                                    <a
                                      href={video.youtubeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:underline"
                                      data-testid={`link-video-${video.id}`}
                                    >
                                      <ExternalLink className="h-3 w-3" /> Watch on YouTube
                                    </a>
                                  </div>
                                  {isAdmin && (
                                    <Button size="sm" variant="ghost" className="shrink-0 h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => deleteVideoMutation.mutate(video.id)} data-testid={`btn-delete-video-${video.id}`}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <Dialog open={editExerciseOpen} onOpenChange={setEditExerciseOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-exercise">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editingExercise.name} onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })} data-testid="input-exercise-name" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editingExercise.description} onChange={(e) => setEditingExercise({ ...editingExercise, description: e.target.value })} rows={3} data-testid="input-exercise-desc" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={editingExercise.category} onValueChange={(v) => setEditingExercise({ ...editingExercise, category: v })}>
                    <SelectTrigger data-testid="select-exercise-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["HOME", "GYM", "COURT", "FOOTWORK", "CORE", "FLEXIBILITY", "STRENGTH", "CARDIO"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={editingExercise.difficulty} onValueChange={(v) => setEditingExercise({ ...editingExercise, difficulty: v })}>
                    <SelectTrigger data-testid="select-exercise-diff"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Duration (min)</Label>
                  <Input type="number" value={editingExercise.durationMinutes || ""} onChange={(e) => setEditingExercise({ ...editingExercise, durationMinutes: e.target.value ? parseInt(e.target.value) : null })} data-testid="input-exercise-duration" />
                </div>
                <div>
                  <Label>Reps</Label>
                  <Input type="number" value={editingExercise.reps || ""} onChange={(e) => setEditingExercise({ ...editingExercise, reps: e.target.value ? parseInt(e.target.value) : null })} data-testid="input-exercise-reps" />
                </div>
                <div>
                  <Label>Sets</Label>
                  <Input type="number" value={editingExercise.sets || ""} onChange={(e) => setEditingExercise({ ...editingExercise, sets: e.target.value ? parseInt(e.target.value) : null })} data-testid="input-exercise-sets" />
                </div>
              </div>
              <div>
                <Label>Equipment</Label>
                <Input value={editingExercise.equipment || ""} onChange={(e) => setEditingExercise({ ...editingExercise, equipment: e.target.value || null })} data-testid="input-exercise-equip" />
              </div>
              <div>
                <Label>Video URL</Label>
                <Input value={editingExercise.videoUrl || ""} onChange={(e) => setEditingExercise({ ...editingExercise, videoUrl: e.target.value || null })} data-testid="input-exercise-video" />
              </div>
              <DialogFooter>
                <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={updateExerciseMutation.isPending} onClick={() => updateExerciseMutation.mutate({ id: editingExercise.id, data: editingExercise })} data-testid="btn-save-exercise">
                  {updateExerciseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addVideoOpen} onOpenChange={setAddVideoOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-video">
          <DialogHeader>
            <DialogTitle>Add Exercise Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Video title" data-testid="input-video-title" />
            </div>
            <div>
              <Label>YouTube URL</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." data-testid="input-video-url" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={videoCategory} onValueChange={setVideoCategory}>
                <SelectTrigger data-testid="select-video-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["HOME", "GYM", "COURT", "FOOTWORK", "CORE", "FLEXIBILITY", "STRENGTH", "CARDIO"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder="Brief description..." rows={2} data-testid="input-video-desc" />
            </div>
            <DialogFooter>
              <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={addVideoMutation.isPending || !videoTitle || !videoUrl} onClick={() => addVideoMutation.mutate({ title: videoTitle, youtubeUrl: videoUrl, category: videoCategory, description: videoDescription })} data-testid="btn-save-video">
                {addVideoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Add Video
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewExercise} onOpenChange={(open) => { if (!open) setViewExercise(null); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50" data-testid="dialog-exercise-detail" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Exercise Details</DialogTitle>
          </DialogHeader>
          {viewExercise && (() => {
            const ex = viewExercise;
            const ytId = ex.videoUrl ? (() => { const m = ex.videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?#]+)/); return m ? m[1] : null; })() : null;
            const catChip = CATEGORY_CHIPS.find(c => c.key === ex.category);
            const CatIcon = catChip?.icon || Dumbbell;
            return (
              <>
                {ytId ? (
                  <div className="aspect-video bg-black">
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={ex.name} />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-slate-900 flex items-center justify-center">
                    <CatIcon className="h-16 w-16 text-orange-400/40" />
                  </div>
                )}
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-black text-white" data-testid="text-exercise-name">{ex.name}</h3>
                      <Badge className={`text-[10px] px-2 py-0.5 border font-bold ${DIFFICULTY_COLORS[ex.difficulty] || ""}`} data-testid="badge-exercise-difficulty">{ex.difficulty}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-[10px] gap-1 border-orange-500/30 text-orange-400" data-testid="badge-exercise-category">
                        <CatIcon className="h-3 w-3" />{ex.category}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 border-slate-600 text-slate-400" data-testid="badge-exercise-location">
                        <MapPin className="h-3 w-3" />{ex.location === "gym" ? "Gym" : "Home"}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{ex.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(ex.targetDurationMinutes || ex.durationMinutes) && (
                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                        <Timer className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-lg font-black text-white" data-testid="text-exercise-duration">{ex.targetDurationMinutes || ex.durationMinutes}</p>
                        <p className="text-[9px] text-blue-400/80 uppercase tracking-wider">Minutes</p>
                      </div>
                    )}
                    {(ex.targetReps || ex.reps) && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                        <Repeat className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                        <p className="text-lg font-black text-white" data-testid="text-exercise-reps">{ex.targetReps || ex.reps}</p>
                        <p className="text-[9px] text-emerald-400/80 uppercase tracking-wider">Reps</p>
                      </div>
                    )}
                    {(ex.targetSets || ex.sets) && (
                      <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                        <Dumbbell className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                        <p className="text-lg font-black text-white" data-testid="text-exercise-sets">{ex.targetSets || ex.sets}</p>
                        <p className="text-[9px] text-purple-400/80 uppercase tracking-wider">Sets</p>
                      </div>
                    )}
                  </div>

                  {ex.equipment && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3">
                      <Dumbbell className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-amber-400/80 uppercase tracking-wider">Equipment Needed</p>
                        <p className="text-sm font-semibold text-white">{ex.equipment}</p>
                      </div>
                    </div>
                  )}

                  {ex.videoUrl && !ytId && (
                    <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-orange-400 hover:bg-orange-500/20 transition-colors" data-testid="link-exercise-video">
                      <Play className="h-5 w-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Watch Tutorial Video</p>
                        <p className="text-[10px] text-orange-400/70 truncate">{ex.videoUrl}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Juniors() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const urlTab = searchParams.get("tab");
  const urlChild = searchParams.get("child");

  const [mainTab, setMainTab] = useState(urlTab || "menu");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(urlChild ? Number(urlChild) : null);

  useEffect(() => {
    if (urlTab && urlTab !== mainTab) setMainTab(urlTab);
    if (urlChild && Number(urlChild) !== selectedChildId) setSelectedChildId(Number(urlChild));
  }, [urlTab, urlChild]);

  const { data: juniors, isLoading } = useQuery<any[]>({ queryKey: ["/api/juniors"], enabled: !!user });
  const { data: profiles } = useQuery<any[]>({ queryKey: ["/api/player-profiles"], enabled: !!user });

  const parentClubs = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p: any) => p.membershipStatus === "APPROVED").map((p: any) => ({ clubId: p.clubId, clubName: p.club?.name || `Club ${p.clubId}` }));
  }, [profiles]);

  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const isClubAdmin = useMemo(() => {
    if (!profiles) return false;
    return profiles.some((p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER");
  }, [profiles]);
  const isAdmin = isPlatformAdmin || isClubAdmin;

  const { data: adminJuniors, isLoading: adminJuniorsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/juniors"], enabled: !!user && isAdmin });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJunior, setEditingJunior] = useState<any>(null);
  const [deletingJuniorId, setDeletingJuniorId] = useState<number | null>(null);
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", gender: "MALE", emergencyContact: "", medicalNotes: "" });
  const [addToClubDialog, setAddToClubDialog] = useState<{ juniorId: number; juniorName: string } | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("C3");

  const resetForm = () => setForm({ fullName: "", dateOfBirth: "", gender: "MALE", emergencyContact: "", medicalNotes: "" });
  const openAdd = () => { setEditingJunior(null); resetForm(); setDialogOpen(true); };
  const openEdit = (junior: any) => {
    setEditingJunior(junior);
    setForm({ fullName: junior.fullName || "", dateOfBirth: junior.dateOfBirth ? new Date(junior.dateOfBirth).toISOString().split("T")[0] : "", gender: junior.gender || "MALE", emergencyContact: junior.emergencyContact || "", medicalNotes: junior.medicalNotes || "" });
    setDialogOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/juniors", data); if (!res.ok) { const err = await res.json(); throw new Error(err.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Child Added", description: "Your child's account has been created." }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setDialogOpen(false); resetForm(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PATCH", `/api/juniors/${id}`, data); if (!res.ok) { const err = await res.json(); throw new Error(err.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Child Updated" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setDialogOpen(false); setEditingJunior(null); resetForm(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { const res = await apiRequest("DELETE", `/api/juniors/${id}`); if (!res.ok) { const err = await res.json(); throw new Error(err.message); } },
    onSuccess: () => { toast({ title: "Child Removed" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setDeletingJuniorId(null); if (selectedChildId === deletingJuniorId) setSelectedChildId(null); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addToClubMutation = useMutation({
    mutationFn: async ({ juniorId, clubId, grade }: { juniorId: number; clubId: number; grade: string }) => { const res = await apiRequest("POST", `/api/juniors/${juniorId}/clubs/${clubId}`, { grade }); if (!res.ok) { const err = await res.json(); throw new Error(err.message); } return res.json(); },
    onSuccess: () => { toast({ title: "Added to Club" }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); setAddToClubDialog(null); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const seedDemoMutation = useMutation({
    mutationFn: async (clubId: number) => { const res = await apiRequest("POST", "/api/admin/juniors/seed-demo", { clubId }); if (!res.ok) { const err = await res.json(); throw new Error(err.message); } return res.json(); },
    onSuccess: (data: any) => { toast({ title: "Demo Junior Created", description: `Junior ID: ${data.juniorId} with skill data, achievements & videos.` }); queryClient.invalidateQueries({ queryKey: ["/api/admin/juniors"] }); queryClient.invalidateQueries({ queryKey: ["/api/juniors"] }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [adminSearch, setAdminSearch] = useState("");
  const [adminSelectedJunior, setAdminSelectedJunior] = useState<number | null>(null);
  const filteredAdminJuniors = useMemo(() => {
    if (!adminJuniors) return [];
    if (!adminSearch) return adminJuniors;
    const q = adminSearch.toLowerCase();
    return adminJuniors.filter((j: any) => j.fullName?.toLowerCase().includes(q));
  }, [adminJuniors, adminSearch]);

  const handleSave = () => {
    const payload = { fullName: form.fullName, dateOfBirth: form.dateOfBirth || undefined, gender: form.gender, emergencyContact: form.emergencyContact || undefined, medicalNotes: form.medicalNotes || undefined };
    if (editingJunior) editMutation.mutate({ id: editingJunior.id, data: payload });
    else addMutation.mutate(payload);
  };

  const menuItems = [
    { key: "children", icon: Baby, title: "My Children", description: "Manage your children's profiles", iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
    { key: "performance", icon: Activity, title: "Skill Dashboard", description: "Track skills, rankings & achievements", iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    { key: "rankings", icon: Trophy, title: "Rankings", description: "Junior leaderboard & badges", iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    { key: "sessions", icon: Calendar, title: "Sessions", description: "View junior session schedule", iconBg: "bg-teal-500/10", iconColor: "text-teal-500" },
    { key: "training", icon: Dumbbell, title: "Training Challenges", description: "Weekly exercise programs & videos", iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
  ];

  const infoItems = [
    { key: "fees", icon: PoundSterling, title: "Fees", description: "Session pricing information", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { key: "about", icon: Info, title: "About & Safeguarding", description: "What we do & player welfare", iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
  ];

  const renderSectionContent = () => {
    switch (mainTab) {
      case "children":
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <h2 className="text-xl font-bold" data-testid="text-my-children">My Children</h2>
                {juniors && <Badge variant="secondary">{juniors.length}</Badge>}
              </div>
              <Button onClick={openAdd} size="sm" data-testid="button-add-child">
                <UserPlus className="h-4 w-4 mr-2" /> Add Child
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !juniors || juniors.length === 0 ? (
              <Card className="border-dashed" data-testid="card-no-children">
                <CardContent className="p-8 text-center">
                  <Baby className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold mb-1">No Children Added Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add your child's profile to sign them up for junior sessions and manage their account.</p>
                  <Button onClick={openAdd} variant="outline" data-testid="button-add-first-child"><UserPlus className="h-4 w-4 mr-2" /> Add Your First Child</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {juniors.map((junior: any) => (
                  <ChildProfileCard
                    key={junior.id}
                    junior={junior}
                    isSelected={selectedChildId === junior.id}
                    onSelect={() => { setSelectedChildId(junior.id); setMainTab("performance"); }}
                    onEdit={() => openEdit(junior)}
                    onDelete={() => setDeletingJuniorId(junior.id)}
                    onAddToClub={() => { setAddToClubDialog({ juniorId: junior.id, juniorName: junior.fullName }); setSelectedClubId(""); setSelectedGrade("C3"); }}
                    hasClubs={parentClubs.length > 0}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case "performance":
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Skill Dashboard</h2>
            </div>
            {!juniors || juniors.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold mb-1">No Children Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add a child first to view their performance dashboard.</p>
                  <Button onClick={() => { setMainTab("children"); openAdd(); }} variant="outline"><UserPlus className="h-4 w-4 mr-2" /> Add Child</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {juniors && juniors.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {juniors.map((junior: any) => (
                      <Button
                        key={junior.id}
                        variant={selectedChildId === junior.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedChildId(junior.id)}
                        className="shrink-0"
                        data-testid={`button-select-child-${junior.id}`}
                      >
                        <Baby className="h-3.5 w-3.5 mr-1" />
                        {junior.fullName}
                      </Button>
                    ))}
                  </div>
                )}
                {selectedChildId ? (
                  <PerformancePanel userId={selectedChildId} isAdmin={isAdmin} />
                ) : juniors && juniors.length === 1 ? (
                  <PerformancePanel userId={juniors[0].id} isAdmin={isAdmin} />
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">Select a Child</h3>
                      <p className="text-sm text-muted-foreground">Choose a child above to view their skill development and performance.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        );
      case "rankings":
        return <JuniorRankingsSection parentClubs={parentClubs} />;
      case "sessions":
        return <JuniorSessionsPanel juniors={juniors} selectedChildId={selectedChildId} setSelectedChildId={setSelectedChildId} />;
      case "fees":
        return <FeesPanel />;
      case "about":
        return <AboutPanel />;
      case "admin":
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-red-500" />
                <h2 className="text-xl font-bold" data-testid="text-admin-management">Admin Management</h2>
                {adminJuniors && <Badge variant="secondary">{adminJuniors.length} juniors</Badge>}
              </div>
              {user?.role === "OWNER" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const clubId = parentClubs.length > 0 ? parentClubs[0].clubId : 1;
                    seedDemoMutation.mutate(clubId);
                  }}
                  disabled={seedDemoMutation.isPending}
                  data-testid="button-seed-demo"
                >
                  {seedDemoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DatabaseZap className="h-4 w-4 mr-2" />}
                  Seed Demo Junior
                </Button>
              )}
            </div>

            {adminSelectedJunior ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 mb-4 -ml-2"
                  onClick={() => setAdminSelectedJunior(null)}
                  data-testid="button-back-to-juniors-list"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Juniors List
                </Button>
                <PerformancePanel userId={adminSelectedJunior} isAdmin={true} />
              </div>
            ) : (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search juniors by name..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-admin-search-juniors"
                  />
                </div>

                {adminJuniorsLoading ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : !filteredAdminJuniors || filteredAdminJuniors.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">No Junior Accounts Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">Use the "Seed Demo Junior" button to create a sample account with skill data, or add juniors via the My Children section.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredAdminJuniors.map((junior: any) => (
                      <Card
                        key={junior.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        data-testid={`card-admin-junior-${junior.id}`}
                        onClick={() => setAdminSelectedJunior(junior.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={junior.profilePictureUrl} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                {junior.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{junior.fullName}</h3>
                                {junior.gender && <Badge variant="outline" className="text-xs">{junior.gender}</Badge>}
                                {junior.profile?.juniorLevel && (
                                  <Badge className={`text-xs ${LEVEL_COLORS[junior.profile.juniorLevel] || ""}`}>
                                    {LEVEL_NAMES[junior.profile.juniorLevel] || junior.profile.juniorLevel}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {junior.dateOfBirth && <span>Born: {format(new Date(junior.dateOfBirth), "dd MMM yyyy")}</span>}
                                <span>ID: {junior.id}</span>
                                {junior.parentUserId && <span>Parent: #{junior.parentUserId}</span>}
                              </div>
                              {junior.profile && (
                                <div className="flex items-center gap-3 mt-2">
                                  {junior.profile.overallSkillPercentage !== null && (
                                    <div className="flex items-center gap-1">
                                      <MiniGauge value={junior.profile.overallSkillPercentage || 0} size={28} />
                                      <span className="text-xs text-muted-foreground">Skill</span>
                                    </div>
                                  )}
                                  {junior.profile.attendancePercentage !== null && (
                                    <div className="flex items-center gap-1 text-xs">
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                      <span>{junior.profile.attendancePercentage}% attendance</span>
                                    </div>
                                  )}
                                  {junior.profile.effortRating > 0 && (
                                    <div className="flex items-center gap-1 text-xs">
                                      {Array.from({ length: junior.profile.effortRating }).map((_, i) => (
                                        <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-8 pt-6 border-t">
              <SkillCategoryManager />
            </div>
          </div>
        );
      case "training":
        return <ExerciseChallengePanel isAdmin={isAdmin} juniors={juniors} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {mainTab === "menu" && <JuniorHero />}

      {mainTab === "menu" ? (
        <div className="space-y-4">
          <Card className="border-border/50" data-testid="card-juniors-menu">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-bold">Junior Hub</h2>
              </div>
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMainTab(item.key)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 active:bg-muted/70 transition-colors text-left group"
                    data-testid={`menu-item-${item.key}`}
                  >
                    <div className={`${item.iconBg} rounded-xl p-2.5 shrink-0`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5" data-testid="card-info-section">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Information</h3>
              </div>
              <div className="space-y-1">
                {infoItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setMainTab(item.key)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-500/10 active:bg-blue-500/15 transition-colors text-left group"
                    data-testid={`menu-item-${item.key}`}
                  >
                    <div className={`${item.iconBg} rounded-xl p-2.5 shrink-0`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-red-500/20 bg-red-500/5" data-testid="card-admin-section">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Admin Only</h3>
                </div>
                <button
                  onClick={() => setMainTab("admin")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 active:bg-red-500/15 transition-colors text-left group border border-red-500/20"
                  data-testid="menu-item-admin"
                >
                  <div className="bg-red-500/10 rounded-xl p-2.5 shrink-0">
                    <Settings className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">Admin Management</h3>
                    <p className="text-xs text-muted-foreground">Manage all juniors, edit skills & seed demo data</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 mb-4 -ml-2"
            onClick={() => setMainTab("menu")}
            data-testid="button-back-to-menu"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Junior Hub
          </Button>
          {renderSectionContent()}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingJunior(null); resetForm(); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-child-form">
          <DialogHeader>
            <DialogTitle>{editingJunior ? "Edit Child" : "Add New Child"}</DialogTitle>
            <DialogDescription>{editingJunior ? "Update your child's details below." : "Fill in your child's details to create their profile."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-name" className="text-sm font-medium">Full Name *</Label>
              <Input id="child-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your child's full name" className="mt-1" data-testid="input-child-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="child-dob" className="text-sm font-medium">Date of Birth</Label>
                <Input id="child-dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="mt-1" data-testid="input-child-dob" />
              </div>
              <div>
                <Label className="text-sm font-medium">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="mt-1" data-testid="select-child-gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="child-emergency" className="text-sm font-medium">Emergency Contact</Label>
              <Input id="child-emergency" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Phone number" className="mt-1" data-testid="input-child-emergency" />
            </div>
            <div>
              <Label htmlFor="child-medical" className="text-sm font-medium">Medical Notes</Label>
              <Textarea id="child-medical" value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} placeholder="Any allergies, conditions, or special requirements..." className="mt-1 min-h-[60px]" data-testid="input-child-medical" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingJunior(null); resetForm(); }}>Cancel</Button>
            <Button disabled={!form.fullName || addMutation.isPending || editMutation.isPending} onClick={handleSave} data-testid="button-save-child">
              {(addMutation.isPending || editMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingJunior ? "Update" : "Add Child"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingJuniorId !== null} onOpenChange={(open) => { if (!open) setDeletingJuniorId(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-delete-child">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Child?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the child's profile. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deletingJuniorId !== null) deleteMutation.mutate(deletingJuniorId); }} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!addToClubDialog} onOpenChange={(open) => { if (!open) setAddToClubDialog(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-add-to-club">
          <DialogHeader>
            <DialogTitle>Add to Club</DialogTitle>
            <DialogDescription>{addToClubDialog ? `Add ${addToClubDialog.juniorName} to one of your clubs.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Select Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="mt-1" data-testid="select-club-for-child"><SelectValue placeholder="Choose a club..." /></SelectTrigger>
                <SelectContent>
                  {parentClubs.map((c: any) => <SelectItem key={c.clubId} value={String(c.clubId)}>{c.clubName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Starting Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="mt-1" data-testid="select-grade-for-child"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToClubDialog(null)} data-testid="button-cancel-club-add">Cancel</Button>
            <Button disabled={!selectedClubId || addToClubMutation.isPending} onClick={() => { if (addToClubDialog && selectedClubId) addToClubMutation.mutate({ juniorId: addToClubDialog.juniorId, clubId: Number(selectedClubId), grade: selectedGrade }); }} data-testid="button-confirm-club-add">
              {addToClubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add to Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

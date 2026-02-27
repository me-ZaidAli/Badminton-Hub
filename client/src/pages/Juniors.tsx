import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
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
import { format } from "date-fns";
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
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  BookOpen, Flame, Dumbbell, Footprints, Crosshair, Send, Swords, Shield, Target, Brain, Users,
};

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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 md:p-10 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-4 left-12 w-24 h-24 rounded-full bg-yellow-300/30 blur-xl" />
      </div>
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
            <Baby className="h-7 w-7" />
          </div>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-3 py-1">
            All Abilities Welcome
          </Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-juniors-title">
          Junior Badminton
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

  const skillPercent = profile?.overallSkillPercentage || 0;
  const attendance = profile?.attendancePercentage || 0;
  const effortRating = profile?.effortRating || 0;
  const coachRating = profile?.coachRating || 0;
  const level = profile?.juniorLevel || "BEGINNER";
  const skillsAssessed = progress.filter((p: any) => p.percentage > 0).length;

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

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-assessed-${junior.id}`}>
            <BarChart3 className="h-3 w-3 text-blue-500 shrink-0" />
            <span><strong>{skillsAssessed}</strong> skills</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-awards-${junior.id}`}>
            <Award className="h-3 w-3 text-amber-500 shrink-0" />
            <span><strong>{achievements.length}</strong> awards</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/30 text-xs" data-testid={`info-videos-${junior.id}`}>
            <Video className="h-3 w-3 text-purple-500 shrink-0" />
            <span><strong>{videos.length}</strong> videos</span>
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
              <h3 className="font-semibold text-sm truncate">{category.name}</h3>
              <span className="text-xs font-medium text-amber-400 ml-2">{categoryProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700" style={{ width: `${categoryProgress}%` }} />
            </div>
          </div>
          <div className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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
                    <span className="text-sm font-medium">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {progress?.comment && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                      {progress?.priority && <Zap className="h-3 w-3 text-amber-400" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-blue-500" : "bg-slate-600"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{pct}%</span>
                    <StarRating value={level} size="sm" />
                  </div>
                  {progress?.updatedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">Updated {format(new Date(progress.updatedAt), "d MMM")}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!editingSkill} onOpenChange={(open) => { if (!open) setEditingSkill(null); }}>
        <DialogContent className="max-w-sm fixed bottom-0 left-0 right-0 top-auto rounded-t-2xl rounded-b-none sm:bottom-auto sm:left-auto sm:right-auto sm:top-auto sm:rounded-2xl" data-testid="dialog-edit-skill">
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
          <div className="sticky bottom-0 pt-3">
            <Button className="w-full" disabled={updateMutation.isPending} onClick={() => { if (editingSkill) { updateMutation.mutate({ skillId: editingSkill.id, data: { level: editLevel, percentage: editPercentage, comment: editComment || null, priority: editPriority } }); } }} data-testid="button-save-skill">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PerformancePanel({ userId, isAdmin }: { userId: number; isAdmin: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState("skills");
  const [filterWeakest, setFilterWeakest] = useState(false);

  const { data: profileData, isLoading } = useQuery<any>({
    queryKey: ["/api/junior-profiles", String(userId)],
    enabled: !!userId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/junior-skills/categories"],
  });

  const profile = profileData?.profiles?.[0] || null;
  const clubId = profile?.clubId || 0;

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

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-testid="card-junior-profile-header">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-amber-500/30">
              <AvatarImage src={profileData.user.profilePictureUrl} />
              <AvatarFallback className="bg-amber-500/20 text-amber-400 text-lg font-bold">
                {profileData.user.fullName?.charAt(0) || "J"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{profileData.user.fullName}</h2>
              <Badge className={`mt-0.5 ${LEVEL_COLORS[profile?.juniorLevel || "BEGINNER"]} border`}>
                {LEVEL_NAMES[profile?.juniorLevel || "BEGINNER"]}
              </Badge>
            </div>
            <CircularGauge value={profile?.overallSkillPercentage || 0} size={72} strokeWidth={5} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-2 rounded-xl bg-white/5">
              <p className="text-base font-bold text-white">{profile?.attendancePercentage || 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/5">
              <StarRating value={profile?.effortRating || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Effort</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-white/5">
              <StarRating value={profile?.coachRating || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Coach</p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="w-full mt-3 border-amber-500/30 text-amber-400" onClick={() => { setEditLevel(profile?.juniorLevel || "BEGINNER"); setEditAttendance(profile?.attendancePercentage || 0); setEditEffort(profile?.effortRating || 0); setEditCoachRating(profile?.coachRating || 0); setEditOpen(true); }} data-testid="button-edit-junior-profile">
              Edit Profile
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50">
          <TabsTrigger value="skills" className="text-xs" data-testid="tab-skills">Skills</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs" data-testid="tab-rankings">Rankings</TabsTrigger>
          <TabsTrigger value="achievements" className="text-xs" data-testid="tab-achievements">Awards</TabsTrigger>
          <TabsTrigger value="videos" className="text-xs" data-testid="tab-videos">Videos</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="mt-4 space-y-3">
          {isAdmin && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Skill Development</span>
              </div>
              <Button variant={filterWeakest ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setFilterWeakest(!filterWeakest)} data-testid="button-filter-weakest">
                {filterWeakest ? "Show All" : "Weakest First"}
              </Button>
            </div>
          )}
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
  const { data: rankings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/junior-rankings", String(clubId)],
    enabled: !!clubId,
  });

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
        return (
          <Card key={rank.id} className={`${i < 3 ? "border-amber-500/20" : ""}`} data-testid={`card-ranking-${rank.userId}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-slate-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>
                {rank.rankPosition}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{rank.user?.fullName || "Unknown"}</p>
                <p className="text-[10px] text-muted-foreground">{rank.overallSkillPercent}% skill</p>
              </div>
              <div className="flex items-center gap-1">
                {movement > 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                {movement < 0 && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                {movement !== 0 && <span className={`text-xs font-medium ${movement > 0 ? "text-emerald-400" : "text-red-400"}`}>{Math.abs(movement)}</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
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

function JuniorSessionsPanel() {
  const { data: sessions, isLoading } = useQuery<any[]>({ queryKey: ["/api/sessions"] });
  const { data: user } = useUser();

  const juniorSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s: any) => s.sessionType === "JUNIORS_ONLY" && s.status !== "CANCELLED")
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  const ageGroupLabels: Record<string, string> = {
    "7-10": "7-10 years", "10-12": "10-12 years", "13-15": "13-15 years", "16-18": "16-18 years",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="h-5 w-5 text-teal-500" />
        <h3 className="font-bold">Junior Sessions</h3>
        <Badge variant="secondary" className="ml-auto">{juniorSessions.length} session{juniorSessions.length !== 1 ? "s" : ""}</Badge>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : juniorSessions.length === 0 ? (
        <Card className="border-dashed" data-testid="card-no-junior-sessions">
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No Junior Sessions Available</h3>
            <p className="text-sm text-muted-foreground">There are currently no junior sessions scheduled. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {juniorSessions.map((session: any) => {
            const sessionDate = new Date(session.date);
            const isPast = session.status === "COMPLETED";
            const isLive = session.status === "ACTIVE";
            const spotsLeft = session.maxPlayers - (session.signupCount || 0);
            return (
              <Card key={session.id} className={`overflow-hidden ${isPast ? "opacity-60" : ""}`} data-testid={`card-session-${session.id}`}>
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
                          <span>{session.startTime}{session.endTime ? ` - ${session.endTime}` : ""}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {isLive && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Live</Badge>}
                      {isPast && <Badge variant="secondary">Done</Badge>}
                      {!isPast && !isLive && spotsLeft > 0 && <Badge variant="secondary">{spotsLeft} spots</Badge>}
                    </div>
                  </div>
                  {(session as any).venue && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{(session as any).venue.name}{(session as any).venue.city ? `, ${(session as any).venue.city}` : ""}</span>
                    </div>
                  )}
                  {session.juniorAgeGroups && session.juniorAgeGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {session.juniorAgeGroups.map((ag: string) => (
                        <Badge key={ag} variant="outline" className="text-xs">{ageGroupLabels[ag] || ag}</Badge>
                      ))}
                    </div>
                  )}
                  {session.sessionFee != null && (
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <PoundSterling className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">£{(session.sessionFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {!isPast && user && (
                    <Link href={`/sessions/${session.id}`}>
                      <Button size="sm" className="mt-3 w-full" variant="outline" data-testid={`button-view-session-${session.id}`}>
                        View & Sign Up <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
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
    { icon: Dumbbell, title: "Movement & Agility", description: "Developing coordination, agility, and movement skills essential for badminton and general fitness.", color: "text-blue-500", bg: "bg-blue-500/10" },
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
                Badminton England safeguarding policies. Parents and guardians can be confident
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
  const { data: adminJuniors, isLoading: adminJuniorsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/juniors"], enabled: !!user && isAdmin });

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
    { key: "sessions", icon: Calendar, title: "Sessions", description: "View junior session schedule", iconBg: "bg-teal-500/10", iconColor: "text-teal-500" },
    { key: "fees", icon: PoundSterling, title: "Fees", description: "Session pricing information", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { key: "about", icon: Info, title: "About", description: "What we do & safeguarding", iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ...(isAdmin ? [{ key: "admin", icon: Settings, title: "Admin Management", description: "Manage all juniors, seed demo data", iconBg: "bg-red-500/10", iconColor: "text-red-500" }] : []),
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
      case "sessions":
        return <JuniorSessionsPanel />;
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
              <div className="space-y-3">
                {filteredAdminJuniors.map((junior: any) => (
                  <Card key={junior.id} className="hover:bg-muted/30 transition-colors" data-testid={`card-admin-junior-${junior.id}`}>
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
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedChildId(junior.id); setMainTab("performance"); }}
                            data-testid={`button-view-junior-${junior.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(junior)}
                            data-testid={`button-edit-junior-${junior.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {junior.emergencyContact && (
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          Emergency: {junior.emergencyContact}
                          {junior.medicalNotes && <span className="ml-3">Medical: {junior.medicalNotes}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <JuniorHero />

      {mainTab === "menu" ? (
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

import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import {
  ArrowLeft,
  Baby,
  BookOpen,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Dumbbell,
  Flame,
  Footprints,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  Send,
  Shield,
  Star,
  Swords,
  Target,
  Trash2,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  Zap,
  Award,
  Lock,
  Minus,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  BookOpen, Flame, Dumbbell, Footprints, Crosshair, Send, Swords, Shield, Target, Brain, Users,
};

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  BEGINNER: { label: "Beginner", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  IMPROVER: { label: "Improver", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  PERFORMANCE: { label: "Performance", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  SQUAD: { label: "Squad", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  COMPETITION_READY: { label: "Competition Ready", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const ACHIEVEMENT_DEFS = [
  { key: "effort_star", title: "Effort Champion", icon: Star, desc: "Effort rating 4+" },
  { key: "attendance_streak", title: "Attendance Star", icon: Calendar, desc: "90%+ attendance" },
  { key: "smash_90", title: "Smash King", icon: Zap, desc: "90%+ smash proficiency" },
  { key: "footwork_85", title: "Fleet Feet", icon: Footprints, desc: "85%+ footwork" },
];

function StarRating({ value, max = 5, size = "md" }: { value: number; max?: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`${sz} ${i < value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
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

function ProfileHeader({ userData, profile, isAdmin, fallbackClubId }: { userData: any; profile: any; isAdmin: boolean; fallbackClubId: number }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editLevel, setEditLevel] = useState(profile?.juniorLevel || "BEGINNER");
  const [editAttendance, setEditAttendance] = useState(profile?.attendancePercentage || 0);
  const [editEffort, setEditEffort] = useState(profile?.effortRating || 0);
  const [editCoachRating, setEditCoachRating] = useState(profile?.coachRating || 0);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/junior-profiles/${userData.id}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userData.id)] });
      setEditOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const levelInfo = LEVEL_LABELS[profile?.juniorLevel || "BEGINNER"];

  return (
    <>
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" data-testid="card-junior-profile">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-amber-500/30">
              <AvatarImage src={userData.profilePictureUrl} />
              <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl font-bold">
                {userData.fullName?.charAt(0) || "J"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate" data-testid="text-junior-name">{userData.fullName}</h1>
              <Badge className={`mt-1 ${levelInfo.color} border`} data-testid="badge-junior-level">
                {levelInfo.label}
              </Badge>
              {userData.dateOfBirth && (
                <p className="text-xs text-muted-foreground mt-1">
                  DOB: {format(new Date(userData.dateOfBirth), "d MMM yyyy")}
                </p>
              )}
            </div>
            <CircularGauge value={profile?.overallSkillPercentage || 0} size={80} strokeWidth={6} />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-2.5 rounded-xl bg-white/5">
              <p className="text-lg font-bold text-white">{profile?.attendancePercentage || 0}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attendance</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white/5">
              <StarRating value={profile?.effortRating || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Effort</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-white/5">
              <StarRating value={profile?.coachRating || 0} size="sm" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Coach</p>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-amber-500/30 text-amber-400"
              onClick={() => {
                setEditLevel(profile?.juniorLevel || "BEGINNER");
                setEditAttendance(profile?.attendancePercentage || 0);
                setEditEffort(profile?.effortRating || 0);
                setEditCoachRating(profile?.coachRating || 0);
                setEditOpen(true);
              }}
              data-testid="button-edit-junior-profile"
            >
              Edit Profile
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-edit-junior-profile">
          <DialogHeader>
            <DialogTitle>Edit Junior Profile</DialogTitle>
            <DialogDescription>Update {userData.fullName}'s profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm">Level</Label>
              <Select value={editLevel} onValueChange={setEditLevel}>
                <SelectTrigger className="mt-1" data-testid="select-junior-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
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
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                updateMutation.mutate({
                  clubId: profile?.clubId || fallbackClubId,
                  juniorLevel: editLevel,
                  attendancePercentage: editAttendance,
                  effortRating: editEffort,
                  coachRating: editCoachRating,
                });
              }}
              data-testid="button-save-junior-profile"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SkillCategoryCard({
  category,
  skills,
  progressMap,
  isAdmin,
  userId,
}: {
  category: any;
  skills: any[];
  progressMap: Map<number, any>;
  isAdmin: boolean;
  userId: number;
}) {
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
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/progress", String(userId)] });
      setEditingSkill(null);
      try {
        await apiRequest("POST", `/api/junior-achievements/check/${userId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/junior-achievements", String(userId)] });
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
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left"
          data-testid={`button-toggle-category-${category.id}`}
        >
          <div className="bg-amber-500/10 rounded-lg p-2 shrink-0">
            <IconComponent className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-white truncate">{category.name}</h3>
              <span className="text-xs font-medium text-amber-400 ml-2">{categoryProgress}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                style={{ width: `${categoryProgress}%` }}
              />
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
                <div
                  key={skill.id}
                  className={`p-3 rounded-xl bg-slate-800/50 ${isAdmin ? "cursor-pointer active:bg-slate-700/50" : ""} ${progress?.priority ? "ring-1 ring-amber-500/40" : ""}`}
                  onClick={() => isAdmin && openEditSkill(skill)}
                  data-testid={`skill-card-${skill.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white/90">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {progress?.comment && <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                      {progress?.priority && <Zap className="h-3 w-3 text-amber-400" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-blue-500" : "bg-slate-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{pct}%</span>
                    <StarRating value={level} size="sm" />
                  </div>
                  {progress?.updatedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Updated {format(new Date(progress.updatedAt), "d MMM")}
                    </p>
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
              <Slider
                value={[editPercentage]}
                onValueChange={([v]) => {
                  setEditPercentage(v);
                  setEditLevel(Math.min(5, Math.floor(v / 20)));
                }}
                max={100}
                step={5}
                className="mt-2"
                data-testid="slider-skill-level"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
            <div>
              <Label className="text-sm">Star Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      setEditLevel(v);
                      setEditPercentage(v * 20);
                    }}
                    className="p-1"
                    data-testid={`button-skill-star-${v}`}
                  >
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
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Add coaching notes..."
                className="mt-1 min-h-[60px]"
                data-testid="input-coach-comment"
              />
            </div>
          </div>
          <div className="sticky bottom-0 pt-3">
            <Button
              className="w-full"
              disabled={updateMutation.isPending}
              onClick={() => {
                if (editingSkill) {
                  updateMutation.mutate({
                    skillId: editingSkill.id,
                    data: { level: editLevel, percentage: editPercentage, comment: editComment || null, priority: editPriority },
                  });
                }
              }}
              data-testid="button-save-skill"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RankingsTab({ clubId }: { clubId: number }) {
  const { data: rankings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/junior-rankings", String(clubId)],
    enabled: !!clubId,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!rankings || rankings.length === 0) {
    return (
      <Card className="border-dashed border-slate-700/50 bg-slate-900/30">
        <CardContent className="p-8 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold text-white mb-1">No Rankings Yet</h3>
          <p className="text-sm text-muted-foreground">Rankings will appear once juniors have been assessed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="font-bold text-white">Junior Rankings</h3>
        <Badge variant="secondary" className="ml-auto">{rankings.length} players</Badge>
      </div>
      {rankings.slice(0, 10).map((rank: any, i: number) => {
        const movement = rank.previousPosition > 0 ? rank.previousPosition - rank.rankPosition : 0;
        return (
          <Card key={rank.id} className={`bg-slate-900/50 border-slate-700/50 ${i < 3 ? "border-amber-500/20" : ""}`} data-testid={`card-ranking-${rank.userId}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-slate-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-muted-foreground"}`}>
                {rank.rankPosition}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{rank.user?.fullName || "Unknown"}</p>
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

function AchievementsTab({ userId, achievements }: { userId: number; achievements: any[] }) {
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
        <h3 className="font-bold text-white">Achievements</h3>
        <Badge variant="secondary" className="ml-auto">
          {achievements.length}/{allPossible.length}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {allPossible.map((ach) => {
          const unlocked = unlockedKeys.has(ach.key);
          const actual = achievements.find((a: any) => a.achievementKey === ach.key);
          return (
            <div
              key={ach.key}
              className={`p-3 rounded-xl text-center transition-all ${unlocked ? "bg-amber-500/10 border border-amber-500/30" : "bg-slate-800/30 opacity-50"}`}
              data-testid={`achievement-${ach.key}`}
            >
              <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${unlocked ? "bg-amber-500/20" : "bg-slate-700/50"}`}>
                {unlocked ? <ach.icon className="h-5 w-5 text-amber-400" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-[11px] font-medium text-white/80 leading-tight">{ach.title}</p>
              {unlocked && actual?.unlockedAt && (
                <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(actual.unlockedAt), "d MMM")}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideosTab({ userId, videos, isAdmin }: { userId: number; videos: any[]; isAdmin: boolean }) {
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
      setAddOpen(false);
      setTitle("");
      setYoutubeUrl("");
      setCategoryTag("");
      setCoachComment("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/junior-videos/${id}`);
      if (!res.ok) throw new Error((await res.json()).message);
    },
    onSuccess: () => {
      toast({ title: "Video Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/junior-profiles", String(userId)] });
    },
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
          <h3 className="font-bold text-white">Video Feedback</h3>
          <Badge variant="secondary">{videos.length}</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="border-amber-500/30 text-amber-400" data-testid="button-add-video">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      {videos.length === 0 ? (
        <Card className="border-dashed border-slate-700/50 bg-slate-900/30">
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
              <Card key={video.id} className="overflow-hidden bg-slate-900/50 border-slate-700/50" data-testid={`card-video-${video.id}`}>
                {embedUrl && (
                  <div className="aspect-video">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-white">{video.title}</h4>
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
                  {video.coachComment && (
                    <p className="text-xs text-muted-foreground mt-2 bg-slate-800/50 rounded-lg p-2">{video.coachComment}</p>
                  )}
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
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Smash technique drill" className="mt-1" data-testid="input-video-title" />
            </div>
            <div>
              <Label>YouTube URL</Label>
              <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1" data-testid="input-video-url" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={categoryTag} onChange={(e) => setCategoryTag(e.target.value)} placeholder="e.g., Footwork, Attack" className="mt-1" data-testid="input-video-category" />
            </div>
            <div>
              <Label>Coach Comment</Label>
              <Textarea value={coachComment} onChange={(e) => setCoachComment(e.target.value)} placeholder="Notes for the player..." className="mt-1 min-h-[60px]" data-testid="input-video-comment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!title || !youtubeUrl || addMutation.isPending}
              onClick={() => addMutation.mutate({ userId, title, youtubeUrl, categoryTag: categoryTag || null, coachComment: coachComment || null })}
              data-testid="button-save-video"
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function JuniorDashboard() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState("skills");
  const [filterWeakest, setFilterWeakest] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/junior-profiles", String(userId)],
    enabled: !!userId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/junior-skills/categories"],
  });

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const progressMap = useMemo(() => {
    const map = new Map<number, any>();
    if (profileData?.progress) {
      for (const p of profileData.progress) {
        map.set(p.skillId, p);
      }
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

  if (profileLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!profileData?.user) {
    return (
      <div className="p-6 text-center">
        <Baby className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Junior Not Found</h2>
        <p className="text-muted-foreground mb-4">This profile could not be loaded.</p>
        <Link href="/juniors"><Button variant="outline">Back to Juniors</Button></Link>
      </div>
    );
  }

  const profile = profileData.profiles?.[0] || null;
  const clubId = profile?.clubId || 0;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20">
      <div className="flex items-center gap-2">
        <Link href="/juniors">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-juniors">
            <ArrowLeft className="h-4 w-4" /> Juniors
          </Button>
        </Link>
      </div>

      <ProfileHeader userData={profileData.user} profile={profile} isAdmin={isAdmin} fallbackClubId={clubId} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <span className="text-sm font-medium text-white">Skill Development</span>
              </div>
              <Button
                variant={filterWeakest ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilterWeakest(!filterWeakest)}
                data-testid="button-filter-weakest"
              >
                {filterWeakest ? "Show All" : "Weakest First"}
              </Button>
            </div>
          )}
          {sortedCategories.map((cat: any) => (
            <SkillCategoryCard
              key={cat.id}
              category={cat}
              skills={cat.skills || []}
              progressMap={progressMap}
              isAdmin={isAdmin}
              userId={userId}
            />
          ))}
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <RankingsTab clubId={clubId} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <AchievementsTab userId={userId} achievements={profileData.achievements || []} />
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <VideosTab userId={userId} videos={profileData.videos || []} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

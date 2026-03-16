import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, BarChart3, Target, Star, ChevronDown, ChevronUp, Loader2, Zap,
  MessageSquare, AlertTriangle, Save, Users
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";

const GOLD = "#D4AF37";
const CARD_BG = "#1A1A1A";
const PAGE_BG = "#111111";

function StarRating({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? 12 : 16;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(v => (
        <Star key={v} size={sz} className={v <= value ? "text-amber-400 fill-amber-400" : "text-white/20"} />
      ))}
    </div>
  );
}

export default function PlayerSkillProfile() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ playerId: string }>();
  const playerId = parseInt(params.playerId || "0");
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  const { data: clubs = [] } = useQuery<any[]>({ queryKey: ["/api/clubs"] });
  const clubId = selectedClubId || (clubs.length > 0 ? clubs[0]?.id : null);

  const { data: playerProfile } = useQuery<any>({
    queryKey: ["/api/players/profile", playerId],
    queryFn: async () => {
      const r = await fetch(`/api/players/${playerId}/profile`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!playerId,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/players/skill-categories", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skill-categories?clubId=${clubId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: skills = [] } = useQuery<any[]>({
    queryKey: ["/api/players/skills", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skills?clubId=${clubId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery<any[]>({
    queryKey: ["/api/player-skills/progress", playerId],
    queryFn: async () => {
      const r = await fetch(`/api/player-skills/progress/${playerId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!playerId,
  });

  const progressMap = useMemo(() => {
    const map = new Map<number, any>();
    progress.forEach((p: any) => map.set(p.skillId, p));
    return map;
  }, [progress]);

  const radarData = useMemo(() => {
    if (categories.length === 0 || skills.length === 0) return [];
    return categories.map((cat: any) => {
      const catSkills = skills.filter((s: any) => s.categoryId === cat.id);
      if (catSkills.length === 0) return { category: cat.name.slice(0, 12), score: 0 };
      const total = catSkills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0);
      return {
        category: cat.name.length > 12 ? cat.name.slice(0, 12) + "…" : cat.name,
        score: Math.round(total / catSkills.length),
      };
    });
  }, [categories, skills, progressMap]);

  const overallPercent = useMemo(() => {
    if (skills.length === 0) return 0;
    const assessed = skills.filter((s: any) => progressMap.has(s.id));
    if (assessed.length === 0) return 0;
    const total = assessed.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(total / assessed.length);
  }, [skills, progressMap]);

  const assessedCount = skills.filter((s: any) => progressMap.has(s.id) && (progressMap.get(s.id)?.percentage || 0) > 0).length;
  const playerName = playerProfile?.user?.fullName || playerProfile?.fullName || "Player";

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button data-testid="button-back" onClick={() => navigate("/coach/player-skills")} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={24} style={{ color: GOLD }} />
              {playerName}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {playerProfile?.grade || playerProfile?.category || "—"} · {playerProfile?.gender || "—"}
            </p>
          </div>
          <Select value={String(clubId || "")} onValueChange={v => setSelectedClubId(Number(v))}>
            <SelectTrigger data-testid="select-club" className="w-[160px] border-white/10 text-white" style={{ background: CARD_BG }}>
              <SelectValue placeholder="Select Club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 text-center border border-white/5" style={{ background: CARD_BG }}>
            <div className="text-2xl font-bold" style={{ color: GOLD }}>{overallPercent}%</div>
            <div className="text-xs text-gray-500 mt-1">Overall Score</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-white/5" style={{ background: CARD_BG }}>
            <div className="text-2xl font-bold text-blue-400">{assessedCount}/{skills.length}</div>
            <div className="text-xs text-gray-500 mt-1">Skills Assessed</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-white/5" style={{ background: CARD_BG }}>
            <div className="text-2xl font-bold text-green-400">{categories.length}</div>
            <div className="text-xs text-gray-500 mt-1">Categories</div>
          </div>
          <div className="rounded-xl p-4 text-center border border-white/5" style={{ background: CARD_BG }}>
            <div className="text-2xl font-bold text-amber-400">
              {progress.filter((p: any) => p.priority).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Priority Skills</div>
          </div>
        </div>

        {radarData.length > 0 && radarData.some((d: any) => d.score > 0) && (
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Target size={18} style={{ color: GOLD }} />
              Skills Radar
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "#999", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke={GOLD} fill={GOLD} fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(categoriesLoading || progressLoading) ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-gray-500" size={32} /></div>
        ) : categories.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BarChart3 size={18} style={{ color: GOLD }} />
              Skill Categories
              <span className="text-xs text-gray-500 ml-2">Click any skill to edit</span>
            </h3>
            {categories.map((cat: any) => {
              const catSkills = skills.filter((s: any) => s.categoryId === cat.id);
              return (
                <SkillCategoryCard
                  key={cat.id}
                  category={cat}
                  skills={catSkills}
                  progressMap={progressMap}
                  playerId={playerId}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl p-8 border border-white/5 text-center" style={{ background: CARD_BG }}>
            <p className="text-gray-500">No skill categories configured yet. Set them up in Admin Panel → Player Skills.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillCategoryCard({ category, skills, progressMap, playerId }: {
  category: any; skills: any[]; progressMap: Map<number, any>; playerId: number;
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
    const total = skills.reduce((sum: number, s: any) => sum + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(total / skills.length);
  }, [skills, progressMap]);

  const updateMutation = useMutation({
    mutationFn: async ({ skillId, data }: { skillId: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/player-skills/progress/${playerId}/${skillId}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Skill Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/player-skills/progress", playerId] });
      setEditingSkill(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEditSkill = (skill: any) => {
    const prog = progressMap.get(skill.id);
    setEditLevel(prog?.level || 0);
    setEditPercentage(prog?.percentage || 0);
    setEditComment(prog?.comment || "");
    setEditPriority(prog?.priority || false);
    setEditingSkill(skill);
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-white/5" style={{ background: CARD_BG }} data-testid={`card-category-${category.id}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
          data-testid={`button-toggle-category-${category.id}`}
        >
          <div className="rounded-lg p-2 shrink-0" style={{ background: GOLD + "15" }}>
            <Target className="h-5 w-5" style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm truncate text-white">{category.name}</h3>
              <span className="text-xs font-medium ml-2" style={{ color: GOLD }}>{categoryProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${categoryProgress}%`, background: `linear-gradient(90deg, ${GOLD}, #fcd34d)` }}
              />
            </div>
          </div>
          <div className="shrink-0 ml-2">
            <Badge variant="outline" className="text-xs border-white/10 text-gray-400">{skills.length} skills</Badge>
          </div>
          <div className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
            {skills.map((skill: any) => {
              const prog = progressMap.get(skill.id);
              const pct = prog?.percentage || 0;
              const level = prog?.level || 0;
              return (
                <div
                  key={skill.id}
                  className={`p-3 rounded-xl bg-white/[0.03] cursor-pointer hover:bg-white/[0.06] transition-colors ${prog?.priority ? "ring-1 ring-amber-500/40" : ""}`}
                  onClick={() => openEditSkill(skill)}
                  data-testid={`skill-card-${skill.id}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-white">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {prog?.comment && <MessageSquare className="h-3 w-3 text-white/50" />}
                      {prog?.priority && <Zap className="h-3 w-3 text-amber-400" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-blue-500" : "bg-white/20"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-white/70 w-8 text-right">{pct}%</span>
                    <StarRating value={level} size="sm" />
                  </div>
                  {prog?.updatedAt && (
                    <p className="text-[10px] text-white/40 mt-1">
                      Updated {new Date(prog.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editingSkill} onOpenChange={(open) => { if (!open) setEditingSkill(null); }}>
        <DialogContent className="max-w-sm border-white/10 text-white" style={{ background: "#1E1E1E" }} data-testid="dialog-edit-skill">
          <DialogHeader>
            <DialogTitle className="text-base">{editingSkill?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">Update skill assessment</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm text-gray-300">Skill Level: {editPercentage}%</Label>
              <Slider
                value={[editPercentage]}
                onValueChange={([v]) => { setEditPercentage(v); setEditLevel(Math.min(5, Math.floor(v / 20))); }}
                max={100}
                step={5}
                className="mt-2"
                data-testid="slider-skill-level"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-300">Star Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => { setEditLevel(v); setEditPercentage(v * 20); }} className="p-1" data-testid={`button-skill-star-${v}`}>
                    <Star className={`h-8 w-8 ${v <= editLevel ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-300">Priority Skill</Label>
              <Switch checked={editPriority} onCheckedChange={setEditPriority} data-testid="switch-priority" />
            </div>
            <div>
              <Label className="text-sm text-gray-300">Coach Comment</Label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Add coaching notes..."
                className="mt-1 min-h-[60px] bg-white/5 border-white/10 text-white"
                data-testid="input-coach-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full text-black font-semibold"
              style={{ background: GOLD }}
              disabled={updateMutation.isPending}
              onClick={() => {
                if (editingSkill) {
                  updateMutation.mutate({
                    skillId: editingSkill.id,
                    data: { level: editLevel, percentage: editPercentage, comment: editComment || null, priority: editPriority }
                  });
                }
              }}
              data-testid="button-save-skill"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <Save size={14} className="mr-1" />
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

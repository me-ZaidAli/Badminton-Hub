import { useState, useMemo } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Star, Zap, MessageSquare, Target, TrendingUp, Trophy, Award, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import imgServing from "@/assets/skills/serving.png";
import imgForecourt from "@/assets/skills/forecourt.png";
import imgMidcourt from "@/assets/skills/midcourt.png";
import imgRearcourt from "@/assets/skills/rearcourt.png";
import imgFootwork from "@/assets/skills/footwork.png";
import imgGrip from "@/assets/skills/grip.png";
import imgDeception from "@/assets/skills/deception.png";
import imgTactical from "@/assets/skills/tactical.png";
import imgDoubles from "@/assets/skills/doubles.png";
import imgFitness from "@/assets/skills/fitness.png";
import imgMental from "@/assets/skills/mental.png";
import imgDefault from "@/assets/skills/default.png";

function imageForCategory(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("serv")) return imgServing;
  if (n.includes("fore") && n.includes("court")) return imgForecourt;
  if (n.includes("mid")) return imgMidcourt;
  if (n.includes("rear") || n.includes("back court") || n.includes("smash")) return imgRearcourt;
  if (n.includes("foot")) return imgFootwork;
  if (n.includes("grip") || n.includes("racket")) return imgGrip;
  if (n.includes("decep") || n.includes("advanced")) return imgDeception;
  if (n.includes("tactic") || n.includes("strategy")) return imgTactical;
  if (n.includes("double")) return imgDoubles;
  if (n.includes("fit") || n.includes("physical") || n.includes("strength")) return imgFitness;
  if (n.includes("mental") || n.includes("focus") || n.includes("mind")) return imgMental;
  return imgDefault;
}

interface PlayerProfile { id: number; clubId: number; membershipStatus: string }
interface Club { id: number; name: string }
interface Category { id: number; name: string; displayOrder: number; iconName?: string | null }
interface Skill { id: number; categoryId: number; name: string; displayOrder: number }
interface Progress {
  id: number; playerId: number; skillId: number; percentage: number; level: number;
  comment: string | null; priority: boolean; updatedAt: string;
  skillName: string; categoryId: number; categoryName: string;
}

const TILE_GRADIENTS = [
  { ring: "from-violet-400/70 via-fuchsia-400/50 to-cyan-400/40", glow: "rgba(168,85,247,0.45)", chip: "bg-violet-500/15 text-violet-200 border-violet-400/30" },
  { ring: "from-cyan-400/70 via-sky-400/50 to-violet-400/40", glow: "rgba(56,189,248,0.45)", chip: "bg-cyan-500/15 text-cyan-200 border-cyan-400/30" },
  { ring: "from-amber-400/70 via-orange-400/50 to-rose-400/40", glow: "rgba(251,191,36,0.45)", chip: "bg-amber-500/15 text-amber-200 border-amber-400/30" },
  { ring: "from-emerald-400/70 via-teal-400/50 to-cyan-400/40", glow: "rgba(16,185,129,0.45)", chip: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" },
  { ring: "from-rose-400/70 via-pink-400/50 to-fuchsia-400/40", glow: "rgba(244,63,94,0.45)", chip: "bg-rose-500/15 text-rose-200 border-rose-400/30" },
  { ring: "from-indigo-400/70 via-purple-400/50 to-blue-400/40", glow: "rgba(99,102,241,0.45)", chip: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30" },
];

function gradientFor(catId: number) {
  return TILE_GRADIENTS[Math.abs(catId) % TILE_GRADIENTS.length];
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5" data-testid={`stars-${value}`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Star key={v} size={size} className={v <= value ? "text-amber-300 fill-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" : "text-white/15"} />
      ))}
    </div>
  );
}

export default function MyTrainingProfile() {
  const { data: user } = useUser();
  const [selectedSkill, setSelectedSkill] = useState<{ skill: Skill; progress: Progress | null; category: Category | null } | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | "all">("all");

  const profiles: PlayerProfile[] = (user as any)?.playerProfiles || [];
  const approved = profiles.filter((p) => p.membershipStatus === "APPROVED");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const activeProfile = useMemo(() => {
    if (selectedProfileId) return approved.find((p) => String(p.id) === selectedProfileId) || approved[0] || null;
    return approved[0] || null;
  }, [approved, selectedProfileId]);

  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ["/api/clubs"], enabled: !!user });
  const clubId = activeProfile?.clubId;

  const { data: categories = [], isLoading: cLoading } = useQuery<Category[]>({
    queryKey: ["/api/players/skill-categories", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skill-categories?clubId=${clubId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load categories");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/players/skills", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skills?clubId=${clubId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load skills");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: progress = [], isLoading: pLoading } = useQuery<Progress[]>({
    queryKey: ["/api/player-skills/progress", activeProfile?.id],
    queryFn: async () => {
      const r = await fetch(`/api/player-skills/progress/${activeProfile!.id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load progress");
      return r.json();
    },
    enabled: !!activeProfile?.id,
  });

  const progressMap = useMemo(() => {
    const m = new Map<number, Progress>();
    progress.forEach((p) => m.set(p.skillId, p));
    return m;
  }, [progress]);

  const overall = useMemo(() => {
    if (skills.length === 0) return 0;
    const sum = skills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(sum / skills.length);
  }, [skills, progressMap]);

  const assessedCount = skills.filter((s) => (progressMap.get(s.id)?.percentage || 0) > 0).length;
  const priorityCount = progress.filter((p) => p.priority).length;
  const fiveStarCount = progress.filter((p) => p.level >= 5).length;

  const visibleCategories = activeCatId === "all" ? categories : categories.filter((c) => c.id === activeCatId);
  const clubName = clubs.find((c) => c.id === clubId)?.name || "Your Club";

  if (!user) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
    );
  }

  if (approved.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-3" data-testid="state-no-membership">
        <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">My Training Profile</h2>
        <p className="text-muted-foreground">Join a club to start building your training profile — your coaches will assess your skills and you'll see them here.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] p-6 md:p-8">
            <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/15 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-5 h-5 text-violet-300" />
                    <span className="text-xs uppercase tracking-[0.18em] text-violet-300/80">Training Profile</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" data-testid="text-page-title">{user.fullName}</h1>
                  <p className="text-sm text-zinc-400 mt-1" data-testid="text-club-name">{clubName} · {assessedCount} of {skills.length} skills assessed</p>
                </div>
                {approved.length > 1 && (
                  <Select value={String(activeProfile?.id || "")} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="w-[200px] bg-white/5 border-white/10" data-testid="select-club-profile">
                      <SelectValue placeholder="Choose club" />
                    </SelectTrigger>
                    <SelectContent>
                      {approved.map((p) => {
                        const c = clubs.find((cl) => cl.id === p.clubId);
                        return <SelectItem key={p.id} value={String(p.id)}>{c?.name || `Club ${p.clubId}`}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Overall meter */}
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <div className="relative" data-testid="meter-overall">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="url(#grad-overall)" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(overall / 100) * 326.7} 326.7`}
                      style={{ transition: "stroke-dasharray 1s ease-out" }}
                    />
                    <defs>
                      <linearGradient id="grad-overall" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="50%" stopColor="#f0abfc" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold bg-gradient-to-br from-violet-200 to-cyan-200 bg-clip-text text-transparent">{overall}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Overall</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 flex-1 min-w-[260px]">
                  <StatTile label="Assessed" value={`${assessedCount}/${skills.length}`} icon={Target} accent="violet" testId="stat-assessed" />
                  <StatTile label="5-Star" value={String(fiveStarCount)} icon={Star} accent="amber" testId="stat-five-star" />
                  <StatTile label="Priority" value={String(priorityCount)} icon={Zap} accent="cyan" testId="stat-priority" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CATEGORY FILTER */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="filter-categories">
            <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
            <button
              onClick={() => setActiveCatId("all")}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${activeCatId === "all" ? "bg-violet-500/20 border-violet-400/50 text-white" : "border-white/10 text-zinc-400 hover:border-white/30"}`}
              data-testid="filter-all"
            >All</button>
            {categories.map((c) => {
              const g = gradientFor(c.id);
              const active = activeCatId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCatId(c.id)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${active ? `${g.chip} shadow-[0_0_14px_rgba(168,85,247,0.25)]` : "border-white/10 text-zinc-400 hover:border-white/30"}`}
                  data-testid={`filter-cat-${c.id}`}
                >{c.name}</button>
              );
            })}
          </div>
        )}

        {/* COLLAGE */}
        {(cLoading || pLoading) ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-400" /></div>
        ) : skills.length === 0 ? (
          <div className="rounded-2xl p-10 text-center border border-white/10 bg-white/[0.02]" data-testid="state-empty">
            <Trophy className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400">Your club hasn't set up skill categories yet. Once they do, your assessments will appear here as a colourful collage.</p>
          </div>
        ) : (
          <div className="space-y-8" data-testid="collage-root">
            {visibleCategories.map((cat) => {
              const catSkills = skills.filter((s) => s.categoryId === cat.id);
              if (catSkills.length === 0) return null;
              const g = gradientFor(cat.id);
              const catTotal = catSkills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
              const catAvg = Math.round(catTotal / catSkills.length);
              return (
                <section key={cat.id} data-testid={`section-cat-${cat.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${g.ring}`}>
                        <Sparkles className="w-4 h-4 text-white/90" />
                      </span>
                      <h2 className="text-lg font-bold tracking-tight">{cat.name}</h2>
                      <Badge variant="outline" className="border-white/10 text-zinc-400 text-[10px]">{catSkills.length} skills</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-white">{catAvg}%</span> avg
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                    {catSkills.map((skill, i) => {
                      const prog = progressMap.get(skill.id) || null;
                      const pct = prog?.percentage || 0;
                      const lvl = prog?.level || 0;
                      // Make some tiles wider for collage feel
                      const wide = i % 7 === 3 ? "sm:col-span-2" : "";
                      return (
                        <SkillTile
                          key={skill.id}
                          skill={skill}
                          progress={prog}
                          gradient={g}
                          extraClass={wide}
                          onClick={() => setSelectedSkill({ skill, progress: prog, category: cat })}
                          pct={pct}
                          level={lvl}
                          imageUrl={imageForCategory(cat.name)}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => { if (!open) setSelectedSkill(null); }}>
        <DialogContent className="sm:max-w-md border-white/10 bg-zinc-950 text-zinc-100" data-testid="dialog-skill-detail">
          {selectedSkill && (() => {
            const g = gradientFor(selectedSkill.category?.id || 0);
            const prog = selectedSkill.progress;
            const pct = prog?.percentage || 0;
            const lvl = prog?.level || 0;
            return (
              <>
                <div className={`relative overflow-hidden -mx-6 -mt-6 px-6 pt-6 pb-8 mb-2 bg-gradient-to-br ${g.ring}`}>
                  <img src={imageForCategory(selectedSkill.category?.name || "")} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/85" />
                  <div className="relative">
                    <Badge className={`${g.chip} mb-2 text-[10px] uppercase tracking-wider`}>{selectedSkill.category?.name}</Badge>
                    <DialogHeader className="space-y-1">
                      <DialogTitle className="text-2xl font-extrabold tracking-tight" data-testid="text-skill-name">{selectedSkill.skill.name}</DialogTitle>
                      <DialogDescription className="text-zinc-200/80">
                        {prog ? "Latest assessment from your coach" : "Not yet assessed — your coach will rate this skill soon."}
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400">Skill level</span>
                      <span className="text-2xl font-extrabold" data-testid="text-pct">{pct}%</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${g.ring}`}
                        style={{ boxShadow: `0 0 12px ${g.glow}` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-sm text-zinc-300">Star rating</span>
                    <StarRow value={lvl} size={20} />
                  </div>

                  {prog?.priority && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200" data-testid="badge-priority">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">Marked as a priority focus</span>
                    </div>
                  )}

                  {prog?.comment ? (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5" data-testid="text-coach-comment">
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-violet-300" />
                        <span className="text-xs uppercase tracking-wider text-violet-300/80">Coach comment</span>
                      </div>
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{prog.comment}</p>
                    </div>
                  ) : prog ? (
                    <p className="text-xs text-zinc-500 text-center">No coach notes for this skill yet.</p>
                  ) : null}

                  {prog?.updatedAt && (
                    <p className="text-[11px] text-zinc-500 text-center">
                      Last updated {new Date(prog.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
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

function StatTile({ label, value, icon: Icon, accent, testId }: { label: string; value: string; icon: any; accent: "violet" | "amber" | "cyan"; testId: string }) {
  const tone = accent === "violet" ? "from-violet-500/20 text-violet-200 border-violet-400/30"
    : accent === "amber" ? "from-amber-500/20 text-amber-200 border-amber-400/30"
    : "from-cyan-500/20 text-cyan-200 border-cyan-400/30";
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${tone} to-transparent p-3`} data-testid={testId}>
      <Icon className="w-4 h-4 opacity-80" />
      <div className="mt-1 text-xl font-extrabold text-white leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</div>
    </div>
  );
}

function SkillTile({ skill, progress, gradient, extraClass, onClick, pct, level, imageUrl }: {
  skill: Skill; progress: Progress | null; gradient: typeof TILE_GRADIENTS[number]; extraClass: string;
  onClick: () => void; pct: number; level: number; imageUrl: string;
}) {
  const filled = pct > 0;
  const isPriority = !!progress?.priority;
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/80 text-left p-3 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-violet-400/60 ${extraClass}`}
      data-testid={`tile-skill-${skill.id}`}
    >
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        style={{ filter: filled ? "saturate(1.05) contrast(1.05)" : "grayscale(0.6) brightness(0.7)" }}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient.ring} mix-blend-overlay transition-opacity`}
        style={{ opacity: filled ? Math.min(0.85, 0.35 + pct / 200) : 0.5 }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-zinc-950/10" />
      {isPriority && (
        <span className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/90 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.7)]" data-testid={`badge-priority-${skill.id}`}>
          <Zap className="w-3 h-3" />
        </span>
      )}
      {progress?.comment && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/80 text-white" title="Coach left a note">
          <MessageSquare className="w-3 h-3" />
        </span>
      )}
      <div className="relative z-10 ml-auto">
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-white font-bold">{filled ? `${pct}%` : "—"}</span>
      </div>
      <div className="relative z-10 space-y-1">
        <h4 className="text-sm font-bold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] line-clamp-2" data-testid={`text-skill-${skill.id}`}>{skill.name}</h4>
        <StarRow value={level} size={12} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
        <div
          className={`h-full bg-gradient-to-r ${gradient.ring}`}
          style={{ width: `${pct}%`, boxShadow: `0 0 8px ${gradient.glow}` }}
        />
      </div>
    </motion.button>
  );
}

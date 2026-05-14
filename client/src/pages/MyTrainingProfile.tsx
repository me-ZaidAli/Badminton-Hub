import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, Star, Zap, MessageSquare, Trophy, MessageCircle, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";
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
interface AnalyticsEnrollment {
  id: number; playerId: number; clubId: number; type: "LEAGUE" | "PREMIUM";
  fullName: string | null; gender?: string | null; category?: string | null; grade?: string | null;
}
interface AdminClub { id: number; name: string }

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
  const u: any = user;
  const [selectedSkill, setSelectedSkill] = useState<{ skill: Skill; progress: Progress | null; category: Category | null } | null>(null);
  const [activeCatId, setActiveCatId] = useState<number | null>(null);

  const profiles: PlayerProfile[] = u?.playerProfiles || [];
  const approved = profiles.filter((p) => p.membershipStatus === "APPROVED");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const activeProfile = useMemo(() => {
    if (selectedProfileId) return approved.find((p) => String(p.id) === selectedProfileId) || approved[0] || null;
    return approved[0] || null;
  }, [approved, selectedProfileId]);

  // Match server's isAnyClubAdmin (primary OWNER/ADMIN or playerProfile clubRole OWNER/ADMIN).
  // COACH is intentionally excluded here because the server endpoints used by the picker
  // (/api/admin/player-analytics/enrollments + /api/player-skills/progress/:playerId for non-self)
  // gate on isAnyClubAdmin, which doesn't currently recognise coaches.
  const isAdminish = u?.role === "OWNER" || u?.role === "ADMIN"
    || (Array.isArray(u?.secondaryRoles) && (u.secondaryRoles as string[]).some((r) => ["OWNER","ADMIN"].includes(r)));

  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ["/api/clubs"], enabled: !!user });
  const { data: myAdminClubs = [] } = useQuery<AdminClub[]>({
    queryKey: ["/api/my-admin-clubs"],
    enabled: !!user && isAdminish,
  });

  // Admin-only club override (used when admin has no own approved profile, or wants to browse another club's roster)
  const [adminClubIdOverride, setAdminClubIdOverride] = useState<number | null>(null);
  const clubId = adminClubIdOverride ?? activeProfile?.clubId ?? (isAdminish ? myAdminClubs[0]?.id ?? null : null);

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

  // Admin-only: load enrolled players for the active club so admins/coaches can browse any player
  const { data: leagueEnrollments = [] } = useQuery<AnalyticsEnrollment[]>({
    queryKey: ["/api/admin/player-analytics/enrollments", clubId, "LEAGUE"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/player-analytics/enrollments?clubId=${clubId}&type=LEAGUE`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!clubId && isAdminish,
  });
  const { data: premiumEnrollments = [] } = useQuery<AnalyticsEnrollment[]>({
    queryKey: ["/api/admin/player-analytics/enrollments", clubId, "PREMIUM"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/player-analytics/enrollments?clubId=${clubId}&type=PREMIUM`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!clubId && isAdminish,
  });
  const enrolledPlayers = useMemo(() => {
    const map = new Map<number, AnalyticsEnrollment & { types: string[] }>();
    [...leagueEnrollments, ...premiumEnrollments].forEach((e) => {
      const cur = map.get(e.playerId);
      if (cur) cur.types.push(e.type);
      else map.set(e.playerId, { ...e, types: [e.type] });
    });
    return Array.from(map.values()).sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [leagueEnrollments, premiumEnrollments]);

  // viewedPlayerId: defaults to user's own approved profile id; admins can override via picker.
  const [viewedPlayerId, setViewedPlayerId] = useState<number | null>(null);
  // Only fall back to activeProfile when its club matches the currently viewed clubId,
  // otherwise we'd render skills for one club but progress rows from another.
  const ownProfileMatchesClub = !!activeProfile && activeProfile.clubId === clubId;
  const effectivePlayerId = viewedPlayerId ?? (ownProfileMatchesClub ? activeProfile!.id : null);
  const viewedEnrollment = enrolledPlayers.find((p) => p.playerId === viewedPlayerId) || null;
  const isViewingOther = !!viewedPlayerId && viewedPlayerId !== activeProfile?.id;

  const { data: progress = [], isLoading: pLoading } = useQuery<Progress[]>({
    queryKey: ["/api/player-skills/progress", effectivePlayerId],
    queryFn: async () => {
      const r = await fetch(`/api/player-skills/progress/${effectivePlayerId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load progress");
      return r.json();
    },
    enabled: !!effectivePlayerId,
  });

  const progressMap = useMemo(() => {
    const m = new Map<number, Progress>();
    progress.forEach((p) => m.set(p.skillId, p));
    return m;
  }, [progress]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.displayOrder - b.displayOrder),
    [categories],
  );

  // default to first category once loaded
  useEffect(() => {
    if (activeCatId === null && sortedCategories.length > 0) {
      setActiveCatId(sortedCategories[0].id);
    }
  }, [activeCatId, sortedCategories]);

  // Reset all per-club state whenever the active club changes (admin override or own-profile club switch).
  // Prevents the previous club's selected category, viewed player, or open skill dialog from bleeding
  // into a different club's data.
  useEffect(() => {
    setViewedPlayerId(null);
    setActiveCatId(null);
    setSelectedSkill(null);
  }, [clubId]);

  const activeCat = sortedCategories.find((c) => c.id === activeCatId) || null;
  const activeCatSkills = useMemo(
    () => skills.filter((s) => s.categoryId === activeCatId).sort((a, b) => a.displayOrder - b.displayOrder),
    [skills, activeCatId],
  );

  const overall = useMemo(() => {
    if (skills.length === 0) return 0;
    const sum = skills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(sum / skills.length);
  }, [skills, progressMap]);

  const assessedCount = skills.filter((s) => (progressMap.get(s.id)?.percentage || 0) > 0).length;
  const fiveStarCount = progress.filter((p) => p.level >= 5).length;
  const priorityCount = progress.filter((p) => p.priority).length;

  const catScore = useMemo(() => {
    if (activeCatSkills.length === 0) return 0;
    const sum = activeCatSkills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.round(sum / activeCatSkills.length);
  }, [activeCatSkills, progressMap]);

  // Potential score = current + uplift toward 100 in untapped skills
  const catPotential = useMemo(() => {
    if (activeCatSkills.length === 0) return 0;
    const max = 100;
    const uplift = activeCatSkills.reduce((acc, s) => {
      const cur = progressMap.get(s.id)?.percentage || 0;
      return acc + (max - cur) * 0.45; // 45% closure
    }, 0);
    const sum = activeCatSkills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
    return Math.min(100, Math.round((sum + uplift) / activeCatSkills.length));
  }, [activeCatSkills, progressMap]);

  const radarData = useMemo(
    () => activeCatSkills.map((s) => {
      const p = progressMap.get(s.id);
      const short = s.name.length > 16 ? s.name.slice(0, 14) + "…" : s.name;
      return {
        skill: short,
        fullName: s.name,
        current: p?.percentage || 0,
        target: 100,
        skillObj: s,
        progress: p || null,
      };
    }),
    [activeCatSkills, progressMap],
  );

  const clubName = clubs.find((c) => c.id === clubId)?.name || "Your Club";

  if (!user) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" /></div>
    );
  }

  if (approved.length === 0 && !isAdminish) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4 text-center space-y-3" data-testid="state-no-membership">
        <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">My Training Profile</h2>
        <p className="text-muted-foreground">Join a club to start building your training profile — your coaches will assess your skills and you'll see them here.</p>
      </div>
    );
  }

  const displayName = isViewingOther
    ? (viewedEnrollment?.fullName || `Player #${viewedPlayerId}`)
    : (u?.fullName || "You");
  const initials = displayName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const avatarSrc = isViewingOther ? undefined : (u?.profilePictureUrl || u?.avatarUrl);
  const moodImage = imageForCategory(activeCat?.name || "");
  const isFullyEmpty = !pLoading && !cLoading && (skills.length === 0 || assessedCount === 0);

  return (
    <div className="min-h-screen bg-[#1a0626] bg-gradient-to-br from-[#240a3b] via-[#3a0e4a] to-[#0a0218] text-zinc-100 relative overflow-hidden">
      {/* ambient halos */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="container max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 relative">
        {/* Outer card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          {/* Top header */}
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-[0_0_14px_rgba(236,72,153,0.6)]">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
                Training Profile
              </span>
            </div>
            <div className="flex items-center gap-3 flex-1 justify-center">
              <h1 className="text-base sm:text-2xl font-extrabold tracking-tight uppercase text-center" data-testid="text-page-title">
                YOUR <span className="bg-gradient-to-r from-rose-400 to-fuchsia-400 bg-clip-text text-transparent">SKILL SCORE</span>
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {approved.length > 1 && (
                <Select value={String(activeProfile?.id || "")} onValueChange={setSelectedProfileId}>
                  <SelectTrigger className="w-[170px] bg-white/5 border-white/10 h-8 text-xs" data-testid="select-club-profile">
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
              {isAdminish && myAdminClubs.length > 0 && (
                <Select
                  value={String(clubId ?? "")}
                  onValueChange={(v) => {
                    const id = Number(v);
                    setAdminClubIdOverride(id);
                    setViewedPlayerId(null);
                    setActiveCatId(null);
                  }}
                >
                  <SelectTrigger className="w-[170px] bg-white/5 border-white/10 h-8 text-xs" data-testid="select-admin-club">
                    <SelectValue placeholder="Pick club" />
                  </SelectTrigger>
                  <SelectContent>
                    {myAdminClubs.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isAdminish && enrolledPlayers.length > 0 && (
                <Select
                  value={viewedPlayerId ? String(viewedPlayerId) : (ownProfileMatchesClub ? String(activeProfile!.id) : "_none")}
                  onValueChange={(v) => setViewedPlayerId(v === "_none" ? null : Number(v))}
                >
                  <SelectTrigger className="w-[200px] bg-fuchsia-500/10 border-fuchsia-400/30 h-8 text-xs" data-testid="select-view-player">
                    <SelectValue placeholder="View as player" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownProfileMatchesClub ? (
                      <SelectItem value={String(activeProfile!.id)}>You ({u?.fullName || "self"})</SelectItem>
                    ) : (
                      <SelectItem value="_none">— pick a player —</SelectItem>
                    )}
                    {enrolledPlayers.map((p) => (
                      <SelectItem key={p.playerId} value={String(p.playerId)} data-testid={`option-player-${p.playerId}`}>
                        {p.fullName || `Player #${p.playerId}`} · {p.types.join("/")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <p className="text-center text-xs sm:text-sm text-zinc-400 px-5 pt-3 pb-1" data-testid="text-club-name">
            {isViewingOther ? <>Viewing <span className="text-fuchsia-300 font-semibold">{displayName}</span> · </> : null}
            Skill score from {clubName} coach assessments · {assessedCount} of {skills.length} skills assessed
          </p>
          {isAdminish && enrolledPlayers.length > 0 && (
            <div className="sm:hidden flex items-center gap-2 px-5 pb-3" data-testid="picker-mobile">
              <Select
                value={viewedPlayerId ? String(viewedPlayerId) : (ownProfileMatchesClub ? String(activeProfile!.id) : "_none")}
                onValueChange={(v) => setViewedPlayerId(v === "_none" ? null : Number(v))}
              >
                <SelectTrigger className="flex-1 bg-fuchsia-500/10 border-fuchsia-400/30 h-9 text-xs">
                  <SelectValue placeholder="View as player" />
                </SelectTrigger>
                <SelectContent>
                  {ownProfileMatchesClub ? (
                    <SelectItem value={String(activeProfile!.id)}>You ({u?.fullName || "self"})</SelectItem>
                  ) : (
                    <SelectItem value="_none">— pick a player —</SelectItem>
                  )}
                  {enrolledPlayers.map((p) => (
                    <SelectItem key={p.playerId} value={String(p.playerId)}>
                      {p.fullName || `Player #${p.playerId}`} · {p.types.join("/")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Body grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-0">
            {/* LEFT RAIL */}
            <aside
              className="relative overflow-hidden border-r border-white/5 px-5 py-6 sm:py-8"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(40,8,60,0.85) 0%, rgba(20,4,30,0.95) 100%), url(${moodImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "multiply",
              }}
              data-testid="rail-categories"
            >
              <div className="flex items-center gap-3 mb-7">
                <Avatar className="w-12 h-12 border-2 border-fuchsia-400/60 shadow-[0_0_16px_rgba(236,72,153,0.4)]">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={displayName} /> : null}
                  <AvatarFallback className="bg-fuchsia-500/30 text-white font-bold text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs uppercase tracking-wider text-fuchsia-300/80">{isViewingOther ? "Viewing" : "Hey"}</div>
                  <div className="text-base font-bold leading-tight" data-testid="text-user-name">{displayName}</div>
                </div>
              </div>

              <div className="text-[10px] uppercase tracking-[0.18em] text-fuchsia-300/70 font-bold mb-3">
                Your Skill Categories
              </div>

              {cLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-white/5 animate-pulse rounded-lg" />)}
                </div>
              ) : (
                <ol className="space-y-1.5" data-testid="list-categories">
                  {sortedCategories.map((cat, idx) => {
                    const catSkills = skills.filter((s) => s.categoryId === cat.id);
                    const sum = catSkills.reduce((acc, s) => acc + (progressMap.get(s.id)?.percentage || 0), 0);
                    const avg = catSkills.length > 0 ? Math.round(sum / catSkills.length) : 0;
                    const isActive = cat.id === activeCatId;
                    const fullyDone = avg >= 90;
                    return (
                      <li key={cat.id}>
                        <button
                          onClick={() => setActiveCatId(cat.id)}
                          className={`w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg transition group ${isActive ? "bg-white/5" : "hover:bg-white/[0.03]"}`}
                          data-testid={`btn-cat-${cat.id}`}
                        >
                          <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition ${
                            isActive
                              ? "border-fuchsia-400 text-fuchsia-300 shadow-[0_0_10px_rgba(236,72,153,0.6)]"
                              : fullyDone
                                ? "border-emerald-400/60 text-emerald-300"
                                : "border-white/15 text-white/50"
                          }`}>
                            {fullyDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          <span className={`text-sm truncate ${isActive ? "text-white font-semibold" : "text-white/70 group-hover:text-white"}`}>
                            {cat.name}
                          </span>
                          {isActive && <ChevronRight className="w-3.5 h-3.5 text-fuchsia-300 ml-auto shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="mt-7 pt-5 border-t border-white/5 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-base font-extrabold text-white">{assessedCount}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/50">Assessed</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-extrabold text-amber-300">{fiveStarCount}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/50">5-Star</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-extrabold text-cyan-300">{priorityCount}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/50">Priority</div>
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="px-4 sm:px-7 py-6 sm:py-8">
              {(cLoading || pLoading) ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" /></div>
              ) : isFullyEmpty ? (
                <EmptyAskCoach categoryName={activeCat?.name} />
              ) : !activeCat ? (
                <div className="text-center py-20 text-white/60">No categories configured by your club yet.</div>
              ) : (
                <>
                  {/* Toggles row */}
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Your Score
                      </span>
                      <span className="text-white/30 text-[10px] font-bold">VS</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Potential
                      </span>
                    </div>
                    <Badge className="bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30 text-[10px] uppercase tracking-wider">
                      {activeCat.name}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* CURRENT vs IMPROVED */}
                    <div className="rounded-2xl bg-zinc-950/70 border border-white/5 p-5 sm:p-6 relative overflow-hidden" data-testid="card-score">
                      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl" />
                      <div>
                        <h3 className="text-base font-bold text-white">{activeCat.name} Score</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Score calculated from your latest coach assessments</p>
                      </div>
                      <div className="mt-5 flex items-center justify-center">
                        <ScoreMeter current={catScore} potential={catPotential} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-white/5 border border-white/5 p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Now</div>
                          <div className="text-2xl font-extrabold text-white tabular-nums" data-testid="text-cat-now">{catScore}%</div>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/5 p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-rose-300 font-bold">After Coaching</div>
                          <div className="text-2xl font-extrabold text-white tabular-nums" data-testid="text-cat-potential">{catPotential}%</div>
                        </div>
                      </div>
                    </div>

                    {/* RADAR — skill comparison */}
                    <div className="rounded-2xl bg-zinc-950/70 border border-white/5 p-5 sm:p-6 relative overflow-hidden" data-testid="card-radar">
                      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl" />
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">Skill comparison</h3>
                          <p className="text-xs text-zinc-400 mt-0.5">Your coach-rated score per skill</p>
                        </div>
                      </div>
                      <div className="mt-2 h-[280px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} outerRadius="78%">
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis
                              dataKey="skill"
                              tick={{ fill: "#e9d5ff", fontSize: 10, fontWeight: 600 }}
                            />
                            <Tooltip
                              contentStyle={{ background: "#1a0626", border: "1px solid rgba(236,72,153,0.4)", borderRadius: 8, color: "#fff", fontSize: 12 }}
                              labelFormatter={(_, payload: any[]) => payload?.[0]?.payload?.fullName || ""}
                              formatter={(v: any, name: string) => [`${v}%`, name === "current" ? "Your Score" : "Potential"]}
                            />
                            <Radar name="potential" dataKey="target" stroke="#fb7185" strokeWidth={1.5} fill="#fb7185" fillOpacity={0.10} strokeDasharray="4 4" />
                            <Radar name="current" dataKey="current" stroke="#34d399" strokeWidth={2} fill="#34d399" fillOpacity={0.30} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Per-skill mini list */}
                  <div className="mt-6 rounded-2xl bg-zinc-950/70 border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Skills in {activeCat.name}</h3>
                      <span className="text-[10px] text-white/50">Tap any skill for coach feedback</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="list-skills">
                      {activeCatSkills.map((s) => {
                        const p = progressMap.get(s.id) || null;
                        const pct = p?.percentage || 0;
                        const lvl = p?.level || 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSkill({ skill: s, progress: p, category: activeCat })}
                            className="text-left rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-fuchsia-400/40 transition px-3 py-2.5 group"
                            data-testid={`row-skill-${s.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {p?.priority && (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/90 text-amber-950 shrink-0">
                                    <Zap className="w-3 h-3" />
                                  </span>
                                )}
                                {p?.comment && (
                                  <MessageSquare className="w-3 h-3 text-fuchsia-300 shrink-0" />
                                )}
                                <span className="text-sm text-white truncate font-medium">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StarRow value={lvl} size={11} />
                                <span className="text-xs font-bold text-white/80 tabular-nums w-9 text-right">
                                  {pct > 0 ? `${pct}%` : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-fuchsia-400"
                                style={{ width: `${pct}%`, boxShadow: pct > 0 ? "0 0 8px rgba(236,72,153,0.4)" : undefined }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        </motion.div>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => { if (!open) setSelectedSkill(null); }}>
        <DialogContent className="sm:max-w-md border-white/10 bg-zinc-950 text-zinc-100" data-testid="dialog-skill-detail">
          {selectedSkill && (() => {
            const prog = selectedSkill.progress;
            const pct = prog?.percentage || 0;
            const lvl = prog?.level || 0;
            return (
              <>
                <div className="relative overflow-hidden -mx-6 -mt-6 px-6 pt-6 pb-8 mb-2 bg-gradient-to-br from-fuchsia-600/40 via-rose-500/30 to-violet-700/40">
                  <img src={imageForCategory(selectedSkill.category?.name || "")} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/85" />
                  <div className="relative">
                    <Badge className="bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/40 mb-2 text-[10px] uppercase tracking-wider">
                      {selectedSkill.category?.name}
                    </Badge>
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
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-fuchsia-400 to-rose-400"
                        style={{ boxShadow: "0 0 12px rgba(236,72,153,0.45)" }}
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
                        <MessageSquare className="w-3.5 h-3.5 text-fuchsia-300" />
                        <span className="text-xs uppercase tracking-wider text-fuchsia-300/80">Coach comment</span>
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

function ScoreMeter({ current, potential }: { current: number; potential: number }) {
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="meter-score">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="grad-current" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="grad-potential" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke="url(#grad-potential)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(potential / 100) * c} ${c}`}
          opacity={0.55}
          strokeDashoffset={0}
        />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke="url(#grad-current)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(current / 100) * c} ${c}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-extrabold bg-gradient-to-br from-emerald-300 to-cyan-300 bg-clip-text text-transparent tabular-nums">
          {current}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mt-0.5">Your Score</span>
        <span className="text-base font-bold text-rose-300/90 tabular-nums mt-1">{potential}</span>
        <span className="text-[9px] uppercase tracking-wider text-rose-300/60">After coaching</span>
      </div>
    </div>
  );
}

function EmptyAskCoach({ categoryName }: { categoryName?: string }) {
  return (
    <div className="py-10 sm:py-16 px-4 text-center max-w-md mx-auto" data-testid="state-empty-ask-coach">
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="absolute inset-0 rounded-full bg-fuchsia-500/30 blur-2xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)]">
          <Trophy className="w-9 h-9 text-white" />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">No skills assessed yet</h3>
      <p className="text-sm text-zinc-300 mb-1">
        Your coach hasn't rated {categoryName ? `your ${categoryName.toLowerCase()} skills` : "any of your skills"} yet.
      </p>
      <p className="text-sm text-zinc-400 mb-6">
        Ask your coach for feedback and a skills update — once they assess you, your scores, comparison radar, and priority focus areas will appear here.
      </p>
      <Button
        size="lg"
        className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-95 shadow-[0_0_20px_rgba(236,72,153,0.45)]"
        onClick={() => { window.location.href = "/coaching?tab=find"; }}
        data-testid="button-ask-coach"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Ask a coach for feedback
      </Button>
      <p className="text-[10px] text-zinc-500 mt-4">Or contact your club admin to be enrolled in coaching</p>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, AlertTriangle, Users, Target,
  ChevronDown, ChevronUp, Loader2, UserPlus, Trash2, Shield, Trophy, Pencil
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";

const GOLD = "#D4AF37";
const CARD_BG = "#1A1A1A";
const PAGE_BG = "#111111";

function StatCard({ label, value, icon: Icon, sub, color = GOLD }: { label: string; value: string | number; icon: any; sub?: string; color?: string }) {
  return (
    <div
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-white/5"
      style={{ background: CARD_BG }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function CoachPlayerSkillsDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [analyticsType, setAnalyticsType] = useState<"LEAGUE" | "PREMIUM">("LEAGUE");
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState("");

  const { data: clubs = [] } = useQuery<any[]>({ queryKey: ["/api/clubs"] });
  const clubId = selectedClubId || (clubs.length > 0 ? clubs[0]?.id : null);

  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["/api/coach/players/skills/overview", clubId, analyticsType],
    queryFn: async () => {
      const r = await fetch(`/api/coach/players/skills/overview?clubId=${clubId}&type=${analyticsType}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: weakStrong, isLoading: weakStrongLoading } = useQuery<any>({
    queryKey: ["/api/coach/players/skills/weak-strong", clubId, analyticsType],
    queryFn: async () => {
      const r = await fetch(`/api/coach/players/skills/weak-strong?clubId=${clubId}&type=${analyticsType}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/player-analytics/enrollments", clubId, analyticsType],
    queryFn: async () => {
      const r = await fetch(`/api/admin/player-analytics/enrollments?clubId=${clubId}&type=${analyticsType}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId,
  });

  const { data: clubMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/clubs", clubId, "players"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/clubs/${clubId}/players`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!clubId && enrollDialogOpen,
  });

  const enrollMutation = useMutation({
    mutationFn: async (data: { playerId: number; clubId: number; type: string }) => {
      const res = await apiRequest("POST", "/api/admin/player-analytics/enroll", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/player-analytics/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/players/skills/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/players/skills/weak-strong"] });
      toast({ title: "Player Enrolled", description: `Player added to ${analyticsType === "LEAGUE" ? "League" : "Premium"} Analytics` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/player-analytics/enroll/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/player-analytics/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/players/skills/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/players/skills/weak-strong"] });
      toast({ title: "Player Removed" });
    },
  });

  const radarData = useMemo(() => {
    if (!overview?.categories) return [];
    return overview.categories.map((c: any) => ({
      category: c.categoryName.length > 12 ? c.categoryName.slice(0, 12) + "…" : c.categoryName,
      fullName: c.categoryName,
      score: c.avgScore,
    }));
  }, [overview]);

  const enrolledPlayerIds = new Set(enrollments.map((e: any) => e.playerId));
  const availableMembers = clubMembers.filter((m: any) => {
    if (enrolledPlayerIds.has(m.id)) return false;
    const name = m.user?.fullName || m.fullName || "";
    if (!enrollSearch) return true;
    return name.toLowerCase().includes(enrollSearch.toLowerCase());
  });

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button data-testid="button-back" onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 size={24} style={{ color: GOLD }} />
              Player Skills Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-1">Skills insights for league and premium analytics players</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
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
            <Button
              data-testid="button-manage-players"
              onClick={() => setEnrollDialogOpen(true)}
              className="text-black font-semibold"
              style={{ background: GOLD }}
            >
              <UserPlus size={16} className="mr-2" />
              Manage Players
            </Button>
          </div>
        </div>

        <Tabs value={analyticsType} onValueChange={(v) => setAnalyticsType(v as "LEAGUE" | "PREMIUM")}>
          <TabsList className="border border-white/10" style={{ background: CARD_BG }}>
            <TabsTrigger value="LEAGUE" data-testid="tab-league" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <Shield size={14} className="mr-1.5" /> League Players
            </TabsTrigger>
            <TabsTrigger value="PREMIUM" data-testid="tab-premium" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
              <Trophy size={14} className="mr-1.5" /> Premium Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {overviewLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl animate-pulse border border-white/5" style={{ background: CARD_BG }}>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-8 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Players" value={overview.totalPlayers} icon={Users} sub="Enrolled players" />
            <StatCard label="Overall Average" value={`${overview.overallAvg}%`} icon={Target} sub="Skill proficiency" />
            <StatCard label="Categories" value={overview.categories?.length || 0} icon={BarChart3} sub="Skill categories" />
            <StatCard
              label="Below 50%"
              value={overview.categories?.filter((c: any) => c.avgScore > 0 && c.avgScore < 50).length || 0}
              icon={AlertTriangle}
              sub="Need attention"
              color="#ef4444"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Target size={18} style={{ color: GOLD }} />
              Skills Overview by Category
            </h3>
            {overviewLoading ? (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: "#999", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                  <Radar name="Average Score" dataKey="score" stroke={GOLD} fill={GOLD} fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
            )}
          </div>

          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={18} style={{ color: GOLD }} />
              Category Performance
            </h3>
            {overviewLoading ? (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
            ) : overview?.categories?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overview.categories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#999", fontSize: 11 }} />
                  <YAxis dataKey="categoryName" type="category" width={90} tick={{ fill: "#999", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#222", border: "1px solid #444", borderRadius: 8, color: "#fff" }}
                    formatter={(v: any) => [`${v}%`, "Avg Score"]}
                  />
                  <Bar dataKey="avgScore" radius={[0, 6, 6, 0]}>
                    {overview.categories.map((c: any, i: number) => (
                      <Cell key={i} fill={c.avgScore >= 70 ? "#22c55e" : c.avgScore >= 40 ? GOLD : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingDown size={18} className="text-red-400" />
              Weakest Skills
              <span className="text-xs text-gray-500 ml-auto">Needs Improvement</span>
            </h3>
            {weakStrongLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : weakStrong?.weakest?.length > 0 ? (
              <div className="space-y-2">
                {weakStrong.weakest.map((s: any, i: number) => (
                  <div key={s.skillId} data-testid={`weak-skill-${s.skillId}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#ef4444", color: "#fff" }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.skillName}</div>
                      <div className="text-xs text-gray-500">{s.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: s.avgScore < 30 ? "#ef4444" : "#f59e0b" }}>{s.avgScore}%</div>
                      <div className="text-xs text-gray-500">{s.playerCount} players</div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.avgScore}%`, background: s.avgScore < 30 ? "#ef4444" : "#f59e0b" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">No data</div>
            )}
          </div>

          <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-400" />
              Strongest Skills
              <span className="text-xs text-gray-500 ml-auto">Top Performers</span>
            </h3>
            {weakStrongLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : weakStrong?.strongest?.length > 0 ? (
              <div className="space-y-2">
                {weakStrong.strongest.map((s: any, i: number) => (
                  <div key={s.skillId} data-testid={`strong-skill-${s.skillId}`} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#22c55e", color: "#fff" }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.skillName}</div>
                      <div className="text-xs text-gray-500">{s.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">{s.avgScore}%</div>
                      <div className="text-xs text-gray-500">{s.playerCount} players</div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${s.avgScore}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">No data</div>
            )}
          </div>
        </div>

        <div className="rounded-xl p-5 border border-white/5" style={{ background: CARD_BG }}>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users size={18} style={{ color: GOLD }} />
            Enrolled Players
            <Badge variant="outline" className="text-xs border-white/20 text-gray-400 ml-2">{enrollments.length}</Badge>
          </h3>
          {enrollmentsLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
          ) : enrollments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrollments.map((e: any) => (
                <div key={e.id} data-testid={`enrolled-player-${e.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => navigate(`/coach/player-skills/${e.playerId}`)}
                    data-testid={`link-player-profile-${e.playerId}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: GOLD + "30", color: GOLD }}>
                      {e.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{e.fullName}</div>
                      <div className="text-xs text-gray-500">{e.grade || e.category || "—"}</div>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-white/10"
                    style={{ color: GOLD }}
                    onClick={() => navigate(`/coach/player-skills/${e.playerId}`)}
                    data-testid={`button-edit-skills-${e.playerId}`}
                    title="Edit skills"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={() => unenrollMutation.mutate(e.id)}
                    data-testid={`button-unenroll-${e.id}`}
                    title="Remove from analytics"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm mb-3">No players enrolled in {analyticsType === "LEAGUE" ? "League" : "Premium"} Analytics</p>
              <Button onClick={() => setEnrollDialogOpen(true)} className="text-black font-semibold" style={{ background: GOLD }}>
                <UserPlus size={16} className="mr-2" /> Add Players
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Players to {analyticsType === "LEAGUE" ? "League" : "Premium"} Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Search players..."
              value={enrollSearch}
              onChange={(e) => setEnrollSearch(e.target.value)}
              data-testid="input-enroll-search"
            />
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {availableMembers.length > 0 ? availableMembers.map((m: any) => {
                const playerName = m.user?.fullName || m.fullName || "Unknown";
                return (
                <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {playerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{playerName}</div>
                    <div className="text-xs text-muted-foreground">{m.grade || m.category || "—"} · {m.gender || "—"}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={enrollMutation.isPending}
                    onClick={() => enrollMutation.mutate({ playerId: m.id, clubId: clubId!, type: analyticsType })}
                    data-testid={`button-enroll-${m.id}`}
                  >
                    <UserPlus size={12} className="mr-1" /> Add
                  </Button>
                </div>
              );}) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {enrollSearch ? "No matching players found" : "All club members are already enrolled"}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

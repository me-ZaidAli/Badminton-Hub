import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import {
  useTournament, useTournamentCategories, useTournamentTeams,
  useTournamentMatches, useTournamentStandings,
  useCreateCategory, useDeleteCategory, useRegisterTeam, useDeleteTeam,
  useGenerateMatches, useScoreMatch, useAdvanceWinners, useUpdateTournament,
  useTournamentRegistrations, useTournamentAllPlayers, useTournamentPairs,
  useTournamentPlayerPool, useTournamentPairRequests, useTournamentWaitlist,
  useRegisterForTournament, useUpdateRegistration, useSendPairRequest, useRespondPairRequest,
} from "@/hooks/use-tournaments";
import { useUser } from "@/hooks/use-auth";
import { useMyTournamentClubs } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, Plus, Trash2,
  Play, ArrowLeft, GitBranch, LayoutGrid, Settings, Search, Check, X, Crown,
  UserPlus, Clock, Shield, ChevronRight, Zap, Award, Star, Target, Lock, CheckCircle,
  Building2, ExternalLink, Flame, Medal,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import tournamentHeroImg from "@assets/tournament-hero.png";

type SubPage = "overview" | "players" | "pairs" | "signup" | "matches" | "admin";

const categorySchema = z.object({
  name: z.string().min(1, "Name required"),
  format: z.enum(["ROUND_ROBIN", "KNOCKOUT", "GROUP_KNOCKOUT"]),
  playersPerSide: z.coerce.number().min(1).max(2),
  genderRestriction: z.enum(["MIXED", "MALE", "FEMALE"]).default("MIXED"),
  scoringFormat: z.enum(["BEST_OF_3", "BEST_OF_5", "SINGLE_GAME"]).default("BEST_OF_3"),
  groupCount: z.coerce.number().min(1).default(2),
  advancePerGroup: z.coerce.number().min(1).default(2),
  pointsPerWin: z.coerce.number().min(0).default(2),
  pointsPerLoss: z.coerce.number().min(0).default(0),
});

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  PUBLISHED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ONGOING: "bg-red-500/20 text-red-400 border-red-500/30",
  COMPLETED: "bg-gray-500/20 text-gray-500 border-gray-500/20",
};

function getTeamName(team: any): string {
  const p1 = team?.player1?.user?.fullName || `Player #${team?.player1Id}`;
  if (team?.player2) {
    const p2 = team.player2?.user?.fullName || `Player #${team.player2Id}`;
    return `${p1} & ${p2}`;
  }
  return p1;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
}

const avatarGradients = [
  "from-violet-600 to-purple-600",
  "from-rose-600 to-pink-600",
  "from-amber-600 to-orange-600",
  "from-emerald-600 to-teal-600",
  "from-blue-600 to-indigo-600",
  "from-pink-600 to-fuchsia-600",
  "from-teal-600 to-cyan-600",
  "from-indigo-600 to-violet-600",
  "from-orange-600 to-red-600",
  "from-cyan-600 to-blue-600",
];

function getAvatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarGradients[Math.abs(h) % avatarGradients.length];
}

function PlayerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <div className={cn("rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br shadow-lg", getAvatarGradient(name), sizeClasses[size])}>
      {getInitials(name)}
    </div>
  );
}

function GradeTierBadge({ grade }: { grade: string }) {
  if (!grade || grade === "—") return <span className="text-xs text-muted-foreground">—</span>;
  const tier = grade.charAt(0);
  const colorMap: Record<string, string> = {
    A: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    B: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    C: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  const tierLabelMap: Record<string, string> = { A: "GOLD", B: "SILVER", C: "BRONZE" };
  return (
    <Badge className={cn("text-[9px] px-1.5 py-0 font-black border tracking-wider", colorMap[tier] || "bg-gray-500/20 text-gray-400 border-gray-500/30")}>
      {tierLabelMap[tier] || tier} {grade}
    </Badge>
  );
}

export default function TournamentDetail() {
  const [, params] = useRoute("/tournaments/:id");
  const tournamentId = Number(params?.id);
  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: user } = useUser();
  const { data: tournamentClubs } = useMyTournamentClubs(!!user);
  const { toast } = useToast();

  const [subPage, setSubPage] = useState<SubPage>("overview");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const isSuperAdmin = user?.role === "OWNER";
  const managedClubIds = new Set(tournamentClubs?.map(c => c.id) || []);
  const canManage = tournament ? (isSuperAdmin || managedClubIds.has(tournament.clubId)) : false;

  const createCatMutation = useCreateCategory();
  const generateMatchesMutation = useGenerateMatches();
  const advanceWinnersMutation = useAdvanceWinners();

  const categories = tournament?.categories || [];
  const activeCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : categories[0];

  const catForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", format: "GROUP_KNOCKOUT", playersPerSide: 2, genderRestriction: "MIXED", scoringFormat: "BEST_OF_3", groupCount: 4, advancePerGroup: 2, pointsPerWin: 2, pointsPerLoss: 0 },
  });
  const watchFormat = catForm.watch("format");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <div className="text-center py-16 text-muted-foreground">Tournament not found</div>;
  }

  async function handleCreateCategory(values: z.infer<typeof categorySchema>) {
    try {
      await createCatMutation.mutateAsync({ tournamentId, ...values });
      toast({ title: "Category Created" });
      setAddCategoryOpen(false);
      catForm.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const tabs: { key: SubPage; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "players", label: "All Players", icon: Users },
    { key: "pairs", label: "Pairs", icon: UserPlus },
    { key: "signup", label: "Sign Up", icon: Zap },
    { key: "matches", label: "Matches", icon: Swords },
    ...(canManage ? [{ key: "admin" as SubPage, label: "Admin", icon: Settings }] : []),
  ];

  return (
    <div className="space-y-4 pb-8">
      <div className="relative overflow-hidden rounded-2xl min-h-[200px]">
        <img src={tournamentHeroImg} alt="Tournament" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-amber-500 to-rose-500" />
        <div className="relative p-5 sm:p-6 flex flex-col justify-end h-full min-h-[200px]">
          <div className="flex items-start gap-3">
            <Link href="/tournaments">
              <Button variant="ghost" size="icon" className="rounded-xl bg-black/30 hover:bg-black/50 text-white border border-white/10" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className={cn("text-[10px] px-2 py-0.5 border font-bold", statusColors[tournament.status])} data-testid="badge-tournament-status">
                  {tournament.status === "ONGOING" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />}
                  {tournament.status}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white truncate drop-shadow-lg" data-testid="text-tournament-title">{tournament.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-300 flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(tournament.startDate), "d MMM")} – {format(new Date(tournament.endDate), "d MMM")}</span>
                <span className="flex items-center gap-1"><Swords className="h-3 w-3" />{tournament.courtsAvailable} courts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSubPage(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                subPage === tab.key
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              data-testid={`tab-${tab.key}`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {categories.length > 0 && subPage !== "overview" && subPage !== "signup" && subPage !== "admin" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category:</span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                activeCategory?.id === cat.id
                  ? "bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:border-amber-500/30"
              )}
              data-testid={`button-category-${cat.id}`}
            >
              {cat.name}
            </button>
          ))}
          {canManage && (
            <button onClick={() => setAddCategoryOpen(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-500 transition-all" data-testid="button-add-category">
              <Plus className="h-3 w-3 inline mr-1" />Add
            </button>
          )}
        </div>
      )}

      {subPage === "overview" && <OverviewTab tournament={tournament} categories={categories} />}
      {subPage === "players" && <PlayersTab tournamentId={tournamentId} />}
      {subPage === "pairs" && <PairsTab tournamentId={tournamentId} />}
      {subPage === "signup" && <SignUpTab tournamentId={tournamentId} tournament={tournament} />}
      {subPage === "matches" && activeCategory && <MatchesTab category={activeCategory} canManage={canManage} tournamentId={tournamentId} onGenerateMatches={async () => {
        try { await generateMatchesMutation.mutateAsync(activeCategory.id); toast({ title: "Matches Generated" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
      }} onAdvanceWinners={async () => {
        try { const r = await advanceWinnersMutation.mutateAsync(activeCategory.id); toast({ title: r.message === "Tournament complete" ? "Tournament Complete" : "Next Round Created" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
      }} isGenerating={generateMatchesMutation.isPending} isAdvancing={advanceWinnersMutation.isPending} />}
      {subPage === "matches" && !activeCategory && (
        <EmptyState icon={Swords} title="No Categories" description="Add a category to create matches." />
      )}
      {subPage === "admin" && canManage && <AdminTab tournamentId={tournamentId} tournament={tournament} categories={categories} />}

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create event category (e.g., Men's Doubles)</DialogDescription>
          </DialogHeader>
          <Form {...catForm}>
            <form onSubmit={catForm.handleSubmit(handleCreateCategory)} className="space-y-4">
              <FormField control={catForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Category Name</FormLabel><FormControl><Input data-testid="input-category-name" placeholder="Men's Doubles" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={catForm.control} name="format" render={({ field }) => (
                  <FormItem><FormLabel>Format</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="GROUP_KNOCKOUT">Group + Knockout</SelectItem>
                        <SelectItem value="KNOCKOUT">Knockout</SelectItem>
                        <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                      </SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={catForm.control} name="playersPerSide" render={({ field }) => (
                  <FormItem><FormLabel>Players/Side</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value.toString()}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="1">Singles</SelectItem><SelectItem value="2">Doubles</SelectItem></SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
              </div>
              {(watchFormat === "GROUP_KNOCKOUT") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={catForm.control} name="groupCount" render={({ field }) => (
                    <FormItem><FormLabel>Groups</FormLabel><FormControl><Input type="number" min={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={catForm.control} name="advancePerGroup" render={({ field }) => (
                    <FormItem><FormLabel>Advance/Group</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createCatMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                  {createCatMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-7 w-7 text-amber-500" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function OverviewTab({ tournament, categories }: { tournament: any; categories: any[] }) {
  const regCount = tournament.registrationCount || 0;
  const maxPlayers = tournament.maxPlayers;
  const fillPercent = maxPlayers ? Math.min((regCount / maxPlayers) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: "Date", value: `${format(new Date(tournament.startDate), "d MMM")} – ${format(new Date(tournament.endDate), "d MMM")}`, accent: "from-violet-500 to-purple-500" },
          { icon: Building2, label: "Club", value: tournament.club?.name || "—", accent: "from-blue-500 to-indigo-500" },
          { icon: MapPin, label: "Location", value: tournament.location || tournament.venue?.name || "TBD", accent: "from-emerald-500 to-teal-500" },
          { icon: Swords, label: "Courts", value: `${tournament.courtsAvailable} courts`, accent: "from-amber-500 to-orange-500" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-4 hover:border-amber-500/20 transition-colors">
            <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", item.accent)}>
              <item.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-bold text-foreground truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {tournament.description && (
        <div className="rounded-xl bg-card border border-border/50 p-4">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">About the Tournament</h3>
          <p className="text-sm text-foreground leading-relaxed">{tournament.description}</p>
        </div>
      )}

      {maxPlayers && (
        <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Registration Progress</h3>
            <span className="text-sm font-black text-foreground">{regCount} / {maxPlayers}</span>
          </div>
          <div className="h-3 rounded-full bg-muted/50 dark:bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 shadow-lg shadow-amber-500/20" style={{ width: `${fillPercent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{fillPercent >= 100 ? "🔥 Tournament is full!" : `${maxPlayers - regCount} spots remaining`}</p>
        </div>
      )}

      {tournament.entryFee && (
        <div className="flex items-center gap-2 text-sm px-1">
          <span className="text-muted-foreground font-medium">Entry Fee:</span>
          <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold">{tournament.entryFee}</Badge>
        </div>
      )}

      {categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider px-1">Categories</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map(cat => (
              <div key={cat.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between hover:border-amber-500/20 transition-colors">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{cat.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{cat.format?.replace("_", " + ")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{cat.playersPerSide === 1 ? "Singles" : "Doubles"}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayersTab({ tournamentId }: { tournamentId: number }) {
  const { data: players, isLoading } = useTournamentAllPlayers(tournamentId);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!players) return [];
    const list = [...players];
    list.sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p: any) => p.user?.fullName?.toLowerCase().includes(q));
  }, [players, searchQuery]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wide">List of Players with their standings</h2>
          <p className="text-xs text-muted-foreground">All registered tournament players ranked by performance</p>
        </div>
        <Badge variant="outline" className="font-bold">{filtered.length} players</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search players..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors"
          data-testid="input-search-players" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No Players" description="No players registered yet." />
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="hidden sm:grid grid-cols-[50px_1fr_100px_60px_60px_60px_70px_70px] items-center px-4 py-2.5 bg-muted/30 dark:bg-muted/10 border-b border-border/30">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Rank</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Player</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Tier</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Win</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Loss</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Played</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Ratio</span>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Status</span>
          </div>
          <div className="divide-y divide-border/20">
            {filtered.map((p: any, idx: number) => {
              const isTop3 = idx < 3;
              const rankColors = ["text-amber-400", "text-gray-400", "text-orange-400"];
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[50px_1fr_100px_60px_60px_60px_70px_70px] items-center px-4 py-3 transition-all hover:bg-muted/30 dark:hover:bg-muted/10",
                    isTop3 && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"
                  )}
                  data-testid={`player-row-${p.userId}`}
                >
                  <div className="flex items-center gap-2 sm:gap-0">
                    <span className={cn("text-sm font-black w-7 text-center", isTop3 ? rankColors[idx] : "text-muted-foreground")}>
                      {isTop3 ? <Medal className={cn("h-5 w-5 inline", rankColors[idx])} /> : `${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar name={p.user?.fullName || "?"} />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{p.user?.fullName}</h4>
                      <div className="sm:hidden flex items-center gap-2 mt-0.5">
                        <GradeTierBadge grade={p.profile?.currentGrade || "—"} />
                        <span className="text-[10px] text-muted-foreground">{p.matchesPlayed || 0}P • {p.winRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex justify-center"><GradeTierBadge grade={p.profile?.currentGrade || "—"} /></div>
                  <div className="hidden sm:block text-center text-sm font-bold text-emerald-500">{p.matchesWon || 0}</div>
                  <div className="hidden sm:block text-center text-sm font-medium text-red-400">{p.matchesLost || 0}</div>
                  <div className="hidden sm:block text-center text-sm text-muted-foreground">{p.matchesPlayed || 0}</div>
                  <div className="hidden sm:block text-center text-sm font-bold text-foreground">{p.winRate || 0}%</div>
                  <div className="flex justify-end sm:justify-center">
                    <Badge className={cn("text-[9px] px-1.5 border font-bold",
                      p.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      p.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    )}>{p.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PairsTab({ tournamentId }: { tournamentId: number }) {
  const { data: pairs, isLoading } = useTournamentPairs(tournamentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  if (!pairs || pairs.length === 0) return <EmptyState icon={UserPlus} title="No Pairs" description="No confirmed pairs yet." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-foreground uppercase tracking-wide">Confirmed Pairs</h2>
          <p className="text-xs text-muted-foreground">Teams ready for tournament action</p>
        </div>
        <Badge variant="outline" className="font-bold">{pairs.length} pairs</Badge>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[50px_1fr_120px_100px_100px_80px] items-center px-4 py-2.5 bg-muted/30 dark:bg-muted/10 border-b border-border/30">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">#</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Team</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Roster</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Player 1 Tier</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Player 2 Tier</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Status</span>
        </div>
        <div className="divide-y divide-border/20">
          {pairs.map((pair: any, idx: number) => {
            const p1Name = pair.user1?.fullName || "Player 1";
            const p2Name = pair.user2?.fullName || "Player 2";
            const isTop3 = idx < 3;
            const rankColors = ["text-amber-400", "text-gray-400", "text-orange-400"];
            return (
              <div
                key={pair.id}
                className={cn(
                  "group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[50px_1fr_120px_100px_100px_80px] items-center px-4 py-3 transition-all hover:bg-muted/30 dark:hover:bg-muted/10",
                  isTop3 && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]"
                )}
                data-testid={`pair-row-${idx}`}
              >
                <div className="flex items-center">
                  <span className={cn("text-sm font-black w-7 text-center", isTop3 ? rankColors[idx] : "text-muted-foreground")}>
                    {isTop3 ? <Medal className={cn("h-5 w-5 inline", rankColors[idx])} /> : `${idx + 1}`}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{p1Name} & {p2Name}</h4>
                  <div className="sm:hidden flex items-center gap-2 mt-0.5">
                    <GradeTierBadge grade={pair.profile1?.currentGrade || "—"} />
                    <GradeTierBadge grade={pair.profile2?.currentGrade || "—"} />
                  </div>
                </div>
                <div className="hidden sm:flex justify-center">
                  <div className="flex -space-x-2">
                    <PlayerAvatar name={p1Name} size="sm" />
                    <PlayerAvatar name={p2Name} size="sm" />
                  </div>
                </div>
                <div className="hidden sm:flex justify-center"><GradeTierBadge grade={pair.profile1?.currentGrade || "—"} /></div>
                <div className="hidden sm:flex justify-center"><GradeTierBadge grade={pair.profile2?.currentGrade || "—"} /></div>
                <div className="flex justify-end sm:justify-center">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">CONFIRMED</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SignUpTab({ tournamentId, tournament }: { tournamentId: number; tournament: any }) {
  const { data: user } = useUser();
  const { data: registrations } = useTournamentRegistrations(tournamentId);
  const { data: playerPool } = useTournamentPlayerPool(tournamentId);
  const { data: pairRequests } = useTournamentPairRequests(tournamentId);
  const registerMutation = useRegisterForTournament();
  const sendPairMutation = useSendPairRequest();
  const respondPairMutation = useRespondPairRequest();
  const { toast } = useToast();
  const [regType, setRegType] = useState<"INDIVIDUAL" | "PAIR">("INDIVIDUAL");
  const [partnerSearch, setPartnerSearch] = useState("");

  const myRegistration = registrations?.find((r: any) => r.userId === user?.id);
  const myPendingRequests = pairRequests?.filter((pr: any) => pr.toUserId === user?.id && pr.status === "PENDING") || [];

  async function handleRegister() {
    try {
      await registerMutation.mutateAsync({ tournamentId, registrationType: regType });
      toast({ title: "Registered!", description: regType === "INDIVIDUAL" ? "You've been added to the player pool." : "Registration submitted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleSendPairRequest(toUserId: number) {
    try {
      await sendPairMutation.mutateAsync({ tournamentId, toUserId });
      toast({ title: "Pair Request Sent!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleRespondPairRequest(id: number, status: string) {
    try {
      await respondPairMutation.mutateAsync({ id, status });
      toast({ title: status === "ACCEPTED" ? "Pair Confirmed!" : "Request Declined" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {!myRegistration ? (
        <div className="relative rounded-2xl border border-amber-500/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-orange-600/5 to-rose-600/10" />
          <div className="relative p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/25">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-black text-foreground">Join This Tournament</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">Sign up as an individual to join the player pool, or register as a pair if you already have a partner.</p>
            <div className="flex gap-3 justify-center">
              {[{ type: "INDIVIDUAL", emoji: "🙋", label: "Individual" }, { type: "PAIR", emoji: "👥", label: "As Pair" }].map(opt => (
                <button key={opt.type} onClick={() => setRegType(opt.type as any)}
                  className={cn("px-5 py-3 rounded-xl text-sm font-bold transition-all border", regType === opt.type ? "bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30 shadow-lg shadow-amber-500/10" : "bg-card text-muted-foreground border-border/50 hover:border-amber-500/30")}>
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            <Button onClick={handleRegister} disabled={registerMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 font-bold px-8">
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Register Now
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">You're registered!</p>
            <p className="text-xs text-muted-foreground">Status: {myRegistration.status} · Type: {myRegistration.registrationType}</p>
          </div>
        </div>
      )}

      {myPendingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Incoming Pair Requests</h3>
          {myPendingRequests.map((pr: any) => (
            <div key={pr.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PlayerAvatar name={pr.fromUser?.fullName || "?"} size="sm" />
                <div>
                  <p className="text-sm font-bold text-foreground">{pr.fromUser?.fullName}</p>
                  <p className="text-xs text-muted-foreground">wants to pair with you</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 font-bold" onClick={() => handleRespondPairRequest(pr.id, "ACCEPTED")}>
                  <Check className="h-3.5 w-3.5 mr-1" />Accept
                </Button>
                <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive" onClick={() => handleRespondPairRequest(pr.id, "DECLINED")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {playerPool && playerPool.length > 0 && myRegistration && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Player Pool</h3>
              <p className="text-[10px] text-muted-foreground">Available players looking for a partner</p>
            </div>
            <Badge variant="outline" className="font-bold">{playerPool.length} available</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search pool..." value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors" />
          </div>
          <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/20">
            {playerPool.filter((p: any) => {
              if (p.userId === user?.id) return false;
              if (partnerSearch) return p.user?.fullName?.toLowerCase().includes(partnerSearch.toLowerCase());
              return true;
            }).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors" data-testid={`pool-player-${p.userId}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar name={p.user?.fullName || "?"} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{p.user?.fullName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <GradeTierBadge grade={p.profile?.currentGrade || "—"} />
                      <span>{p.matchesPlayed || 0} played</span>
                      <span>{p.winRate || 0}% win</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold"
                  onClick={() => handleSendPairRequest(p.userId)} disabled={sendPairMutation.isPending}>
                  <UserPlus className="h-3 w-3 mr-1" />Pair Up
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesTab({ category, canManage, tournamentId, onGenerateMatches, onAdvanceWinners, isGenerating, isAdvancing }: {
  category: any; canManage: boolean; tournamentId: number;
  onGenerateMatches: () => void; onAdvanceWinners: () => void; isGenerating: boolean; isAdvancing: boolean;
}) {
  const { data: teams } = useTournamentTeams(category.id);
  const { data: matchList } = useTournamentMatches(category.id);
  const { data: standings } = useTournamentStandings(category.id);
  const [activeView, setActiveView] = useState<"bracket" | "standings" | "list">(
    category.format === "KNOCKOUT" ? "bracket" : category.format === "GROUP_KNOCKOUT" ? "standings" : "list"
  );
  const scoreMutation = useScoreMatch();
  const { toast } = useToast();
  const [scoreDialog, setScoreDialog] = useState<any>(null);

  const matches = matchList || [];
  const groupMatches = matches.filter(m => m.groupNumber && m.groupNumber < 100);
  const knockoutMatches = matches.filter(m => !m.groupNumber || m.round >= 100);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={onGenerateMatches} disabled={isGenerating || !teams || teams.length < 2}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Swords className="h-3.5 w-3.5 mr-1" />}
            Generate Fixtures
          </Button>
          {category.format !== "ROUND_ROBIN" && matches.length > 0 && (
            <Button size="sm" variant="outline" onClick={onAdvanceWinners} disabled={isAdvancing} className="font-bold">
              {isAdvancing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 mr-1" />}
              {category.format === "GROUP_KNOCKOUT" ? "Generate Knockout" : "Advance Winners"}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-1 bg-muted/30 dark:bg-muted/10 rounded-xl p-1">
        {(category.format === "GROUP_KNOCKOUT" || category.format === "ROUND_ROBIN") && (
          <button onClick={() => setActiveView("standings")} className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            activeView === "standings" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <BarChart3 className="h-3.5 w-3.5 inline mr-1" />Standings
          </button>
        )}
        <button onClick={() => setActiveView("list")} className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
          activeView === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Swords className="h-3.5 w-3.5 inline mr-1" />Matches
        </button>
        {(category.format === "KNOCKOUT" || (category.format === "GROUP_KNOCKOUT" && knockoutMatches.length > 0)) && (
          <button onClick={() => setActiveView("bracket")} className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            activeView === "bracket" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            <GitBranch className="h-3.5 w-3.5 inline mr-1" />Bracket
          </button>
        )}
      </div>

      {activeView === "standings" && standings && standings.length > 0 && (
        <StandingsView standings={standings} teams={teams || []} category={category} />
      )}

      {activeView === "list" && (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <EmptyState icon={Swords} title="No Matches" description="Generate fixtures to create matches." />
          ) : (
            matches.map(match => (
              <MatchCard key={match.id} match={match} canManage={canManage} onScore={() => setScoreDialog(match)} />
            ))
          )}
        </div>
      )}

      {activeView === "bracket" && (
        <BracketView matches={category.format === "GROUP_KNOCKOUT" ? knockoutMatches : matches} teams={teams || []} />
      )}

      {scoreDialog && (
        <ScoreDialog match={scoreDialog} onClose={() => setScoreDialog(null)} onSubmit={async (scores: any, winnerId: number) => {
          try {
            await scoreMutation.mutateAsync({ matchId: scoreDialog.id, scores, winnerId });
            toast({ title: "Score Saved" });
            setScoreDialog(null);
          } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
          }
        }} isPending={scoreMutation.isPending} />
      )}
    </div>
  );
}

function MatchCard({ match, canManage, onScore }: { match: any; canManage: boolean; onScore: () => void }) {
  const teamAName = match.teamA ? getTeamName(match.teamA) : "TBD";
  const teamBName = match.teamB ? getTeamName(match.teamB) : "TBD";
  const isFinished = match.status === "FINISHED";
  const scores = match.scores || [];
  const scoreStr = scores.length > 0 ? scores.map((s: any) => `${s.scoreA}-${s.scoreB}`).join(", ") : "";

  return (
    <div className={cn("rounded-xl border bg-card p-3 transition-all",
      isFinished ? "border-border/30" : "border-border/50 hover:border-amber-500/30"
    )} data-testid={`match-card-${match.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {match.groupNumber && <Badge variant="outline" className="text-[10px] font-bold">G{match.groupNumber}</Badge>}
            <span className="text-[10px] text-muted-foreground font-medium">R{match.round} · M{match.matchOrder + 1}</span>
          </div>
          <div className="space-y-1">
            <div className={cn("text-sm font-bold truncate flex items-center gap-1.5", match.winnerId === match.teamAId ? "text-amber-500" : "text-foreground")}>
              {match.winnerId === match.teamAId && <Crown className="h-3.5 w-3.5 text-amber-400" />}
              {teamAName}
            </div>
            <div className={cn("text-sm font-bold truncate flex items-center gap-1.5", match.winnerId === match.teamBId ? "text-amber-500" : "text-foreground")}>
              {match.winnerId === match.teamBId && <Crown className="h-3.5 w-3.5 text-amber-400" />}
              {teamBName}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {isFinished && scoreStr && <p className="text-sm font-mono font-black text-foreground">{scoreStr}</p>}
          {!isFinished && canManage && match.teamAId && match.teamBId && (
            <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={onScore}>
              <Target className="h-3 w-3 mr-1" />Score
            </Button>
          )}
          {match.isBye && <Badge variant="outline" className="text-[10px] font-bold">BYE</Badge>}
        </div>
      </div>
    </div>
  );
}

function ScoreDialog({ match, onClose, onSubmit, isPending }: { match: any; onClose: () => void; onSubmit: (scores: any[], winnerId: number) => void; isPending: boolean }) {
  const [sets, setSets] = useState([{ scoreA: 0, scoreB: 0 }]);

  function addSet() { setSets([...sets, { scoreA: 0, scoreB: 0 }]); }
  function updateSet(idx: number, field: "scoreA" | "scoreB", val: number) {
    const newSets = [...sets];
    newSets[idx] = { ...newSets[idx], [field]: val };
    setSets(newSets);
  }

  function handleSubmit() {
    const winsA = sets.filter(s => s.scoreA > s.scoreB).length;
    const winsB = sets.filter(s => s.scoreB > s.scoreA).length;
    const winnerId = winsA >= winsB ? match.teamAId : match.teamBId;
    onSubmit(sets, winnerId);
  }

  const teamAName = match.teamA ? getTeamName(match.teamA) : "Team A";
  const teamBName = match.teamB ? getTeamName(match.teamB) : "Team B";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter Score</DialogTitle>
          <DialogDescription>{teamAName} vs {teamBName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {sets.map((set, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-bold w-12">Set {i + 1}</span>
              <Input type="number" min={0} value={set.scoreA} onChange={e => updateSet(i, "scoreA", Number(e.target.value))} className="h-9 text-center font-bold" />
              <span className="text-muted-foreground font-bold">-</span>
              <Input type="number" min={0} value={set.scoreB} onChange={e => updateSet(i, "scoreB", Number(e.target.value))} className="h-9 text-center font-bold" />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addSet} className="w-full font-bold">
            <Plus className="h-3 w-3 mr-1" />Add Set
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StandingsView({ standings, teams, category }: { standings: any[]; teams: any[]; category: any }) {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const groupCount = category.groupCount || 1;
  const groups = Array.from({ length: groupCount }, (_, i) => standings.filter(s => s.groupNumber === i + 1));

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => (
        <div key={gi} className="rounded-xl border border-border/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600/10 to-orange-600/5 dark:from-amber-500/10 dark:to-orange-500/5 px-4 py-2.5 border-b border-border/30">
            <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Group {gi + 1}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20 dark:bg-muted/5">
                  <th className="text-left px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Team</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">P</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">W</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">L</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">GW</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider">GL</th>
                  <th className="text-center px-2 py-2 text-[10px] font-black text-amber-500 uppercase tracking-wider">PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.map((s: any, si: number) => {
                  const team = teamMap.get(s.teamId);
                  const isQualifying = si < (category.advancePerGroup || 2);
                  return (
                    <tr key={s.id} className={cn("border-t border-border/20 transition-colors hover:bg-muted/20 dark:hover:bg-muted/5", isQualifying && "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]")}>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-black", isQualifying ? "text-emerald-500" : "text-muted-foreground")}>{si + 1}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-foreground">{team ? getTeamName(team) : `Team #${s.teamId}`}</span>
                      </td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.matchesPlayed}</td>
                      <td className="text-center px-2 py-2.5 font-bold text-emerald-500">{s.matchesWon}</td>
                      <td className="text-center px-2 py-2.5 text-red-400">{s.matchesLost}</td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesWon}</td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesLost}</td>
                      <td className="text-center px-2 py-2.5 font-black text-amber-500">{s.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketView({ matches, teams }: { matches: any[]; teams: any[] }) {
  const rounds = useMemo(() => {
    const roundMap = new Map<number, any[]>();
    matches.forEach(m => {
      const r = m.round;
      if (!roundMap.has(r)) roundMap.set(r, []);
      roundMap.get(r)!.push(m);
    });
    return Array.from(roundMap.entries()).sort(([a], [b]) => a - b).map(([round, ms]) => ({
      round,
      label: ms.length === 1 ? "🏆 Final" : ms.length === 2 ? "Semi Finals" : ms.length === 4 ? "Quarter Finals" : `Round ${round}`,
      matches: ms.sort((a, b) => a.matchOrder - b.matchOrder),
    }));
  }, [matches]);

  if (rounds.length === 0) return <EmptyState icon={GitBranch} title="No Bracket" description="Generate fixtures to see the bracket." />;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map((round, ri) => (
          <div key={round.round} className="flex flex-col">
            <div className="text-xs font-black text-amber-500 uppercase tracking-wider mb-3 text-center">{round.label}</div>
            <div className="flex flex-col justify-around flex-1 gap-3" style={{ minHeight: rounds[0]?.matches?.length * 80 }}>
              {round.matches.map(match => {
                const teamAName = match.teamA ? getTeamName(match.teamA) : match.teamAId ? `Team #${match.teamAId}` : "TBD";
                const teamBName = match.teamB ? getTeamName(match.teamB) : match.teamBId ? `Team #${match.teamBId}` : "TBD";
                const isFinished = match.status === "FINISHED";
                return (
                  <div key={match.id} className={cn(
                    "w-56 rounded-xl border overflow-hidden transition-all",
                    isFinished ? "border-border/30 bg-card" : "border-amber-500/20 bg-card hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
                  )}>
                    <div className={cn("flex items-center justify-between px-3 py-2.5 border-b border-border/20",
                      match.winnerId === match.teamAId && "bg-amber-500/10"
                    )}>
                      <span className={cn("text-xs font-bold truncate flex-1 flex items-center gap-1",
                        match.winnerId === match.teamAId ? "text-amber-500" : match.teamAId ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {match.winnerId === match.teamAId && <Crown className="h-3 w-3 flex-shrink-0" />}
                        {teamAName}
                      </span>
                      {match.scores && match.scores.length > 0 && (
                        <span className="text-xs font-mono font-black text-foreground ml-2">
                          {match.scores.reduce((a: number, s: any) => a + s.scoreA, 0)}
                        </span>
                      )}
                    </div>
                    <div className={cn("flex items-center justify-between px-3 py-2.5",
                      match.winnerId === match.teamBId && "bg-amber-500/10"
                    )}>
                      <span className={cn("text-xs font-bold truncate flex-1 flex items-center gap-1",
                        match.winnerId === match.teamBId ? "text-amber-500" : match.teamBId ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {match.winnerId === match.teamBId && <Crown className="h-3 w-3 flex-shrink-0" />}
                        {teamBName}
                      </span>
                      {match.scores && match.scores.length > 0 && (
                        <span className="text-xs font-mono font-black text-foreground ml-2">
                          {match.scores.reduce((a: number, s: any) => a + s.scoreB, 0)}
                        </span>
                      )}
                    </div>
                    {match.isBye && (
                      <div className="px-3 py-1 text-center border-t border-border/20">
                        <span className="text-[10px] text-muted-foreground font-bold">BYE</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTab({ tournamentId, tournament, categories }: { tournamentId: number; tournament: any; categories: any[] }) {
  const { data: registrations, isLoading: regsLoading } = useTournamentRegistrations(tournamentId);
  const { data: waitlist } = useTournamentWaitlist(tournamentId);
  const updateRegMutation = useUpdateRegistration();
  const updateTournamentMutation = useUpdateTournament();
  const registerTeamMutation = useRegisterTeam();
  const deleteCatMutation = useDeleteCategory();
  const { toast } = useToast();
  const [adminView, setAdminView] = useState<"registrations" | "waitlist" | "settings">("registrations");

  async function handleApprove(id: number) {
    try { await updateRegMutation.mutateAsync({ id, status: "APPROVED" }); toast({ title: "Approved" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }
  async function handleReject(id: number) {
    try { await updateRegMutation.mutateAsync({ id, status: "REJECTED" }); toast({ title: "Rejected" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }
  async function handlePayment(id: number, confirmed: boolean) {
    try { await updateRegMutation.mutateAsync({ id, paymentConfirmed: confirmed }); toast({ title: confirmed ? "Payment Confirmed" : "Payment Unconfirmed" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }
  async function handleLock() {
    try { await updateTournamentMutation.mutateAsync({ id: tournamentId, isLocked: !tournament.isLocked }); toast({ title: tournament.isLocked ? "Tournament Unlocked" : "Tournament Locked" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={tournament.isLocked ? "destructive" : "outline"} onClick={handleLock} className="font-bold">
          <Lock className="h-3.5 w-3.5 mr-1" />{tournament.isLocked ? "Unlock" : "Lock"} Tournament
        </Button>
      </div>

      <div className="flex gap-1 bg-muted/30 dark:bg-muted/10 rounded-xl p-1">
        {["registrations", "waitlist", "settings"].map(view => (
          <button key={view} onClick={() => setAdminView(view as any)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all capitalize",
              adminView === view ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {view}
          </button>
        ))}
      </div>

      {adminView === "registrations" && (
        <div className="space-y-2">
          {regsLoading ? <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" /> :
            !registrations?.length ? <EmptyState icon={Users} title="No Registrations" description="No one has registered yet." /> :
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/20">
              {registrations.map((reg: any) => (
                <div key={reg.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors flex-wrap" data-testid={`admin-reg-${reg.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar name={reg.user?.fullName || "?"} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{reg.user?.fullName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-medium">{reg.registrationType}</span>
                        {reg.partner && <span>+ {reg.partner.fullName}</span>}
                        {reg.paymentConfirmed && <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1 font-bold">PAID</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {reg.status === "PENDING" && (
                      <>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => handleApprove(reg.id)}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" onClick={() => handleReject(reg.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs font-medium" onClick={() => handlePayment(reg.id, !reg.paymentConfirmed)}>
                      {reg.paymentConfirmed ? "Unpay" : "💰 Confirm"}
                    </Button>
                    <Badge className={cn("text-[9px] px-1.5 border font-bold",
                      reg.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      reg.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      reg.status === "WAITLISTED" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>{reg.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {adminView === "waitlist" && (
        <div className="space-y-2">
          {!waitlist?.length ? <EmptyState icon={Clock} title="Waitlist Empty" description="No players on the waitlist." /> :
            <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/20">
              {waitlist.map((w: any) => (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                  <span className="text-xs font-mono font-black text-amber-500 w-8">#{w.position}</span>
                  <PlayerAvatar name={w.user?.fullName || "?"} size="sm" />
                  <span className="text-sm font-bold text-foreground">{w.user?.fullName}</span>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {adminView === "settings" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-1">
            <h4 className="font-black text-foreground text-sm uppercase tracking-wider mb-3">Categories</h4>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories created yet.</p>
            ) : categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-bold text-foreground">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.format?.replace("_", "+")} · {cat.playersPerSide === 1 ? "Singles" : "Doubles"}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={async () => {
                  try { await deleteCatMutation.mutateAsync(cat.id); toast({ title: "Category Deleted" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

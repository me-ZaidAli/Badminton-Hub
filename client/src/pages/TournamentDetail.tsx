import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import {
  useTournament, useTournamentCategories, useTournamentTeams,
  useTournamentMatches, useTournamentStandings,
  useCreateCategory, useDeleteCategory, useRegisterTeam, useDeleteTeam, useUpdateTeam,
  useGenerateMatches, useScoreMatch, useAdvanceWinners, useUpdateTournament,
  useTournamentRegistrations, useTournamentAllPlayers, useTournamentPairs,
  useTournamentPlayerPool, useTournamentPairRequests, useTournamentWaitlist,
  useRegisterForTournament, useUpdateRegistration, useSendPairRequest, useRespondPairRequest,
  useWithdrawRegistration,
  useTournamentIsAdmin, useTournamentAdmins, useTournamentEligibleAdmins,
  useAddTournamentAdmin, useRemoveTournamentAdmin,
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
  Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, Plus, Trash2, Edit3,
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

  const { data: adminCheck } = useTournamentIsAdmin(tournamentId);
  const isSuperAdmin = user?.role === "OWNER";
  const managedClubIds = new Set(tournamentClubs?.map(c => c.id) || []);
  const canManage = tournament ? (isSuperAdmin || managedClubIds.has(tournament.clubId) || adminCheck?.isAdmin === true) : false;

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
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  const filtered = useMemo(() => {
    if (!players) return [];
    const list = [...players];
    list.sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0));
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p: any) => p.user?.fullName?.toLowerCase().includes(q));
  }, [players, searchQuery]);

  const selectedRank = selectedPlayer ? filtered.findIndex((p: any) => p.id === selectedPlayer.id) + 1 : 0;

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
                  onClick={() => setSelectedPlayer({ ...p, rank: idx + 1 })}
                  className={cn(
                    "group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[50px_1fr_100px_60px_60px_60px_70px_70px] items-center px-4 py-3 transition-all hover:bg-muted/30 dark:hover:bg-muted/10 cursor-pointer",
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

      {selectedPlayer && (
        <PlayerStatsDialog
          player={selectedPlayer}
          rank={selectedPlayer.rank}
          totalPlayers={filtered.length}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}

function PlayerStatsDialog({ player, rank, totalPlayers, onClose }: { player: any; rank: number; totalPlayers: number; onClose: () => void }) {
  const name = player.user?.fullName || "Unknown Player";
  const grade = player.profile?.currentGrade || "—";
  const wins = player.matchesWon || 0;
  const losses = player.matchesLost || 0;
  const played = player.matchesPlayed || 0;
  const winRate = player.winRate || 0;
  const gamesWon = player.gamesWon || 0;
  const gamesLost = player.gamesLost || 0;
  const pointsScored = player.pointsScored || 0;
  const pointsConceded = player.pointsConceded || 0;

  const streakData = useMemo(() => {
    let currentStreak = 0;
    let bestStreak = 0;
    const recentResults: string[] = [];
    for (let i = 0; i < Math.min(played, 10); i++) {
      if (i < wins) {
        recentResults.push("W");
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        recentResults.push("L");
        currentStreak = 0;
      }
    }
    return { currentStreak: Math.min(currentStreak, wins), bestStreak, recentResults: recentResults.slice(0, 8) };
  }, [wins, losses, played]);

  const consistencyScore = played > 0 ? Math.round((wins / played) * 100) : 0;
  const dominanceRatio = gamesLost > 0 ? (gamesWon / gamesLost).toFixed(1) : gamesWon > 0 ? "MAX" : "0";
  const avgPointsPerMatch = played > 0 ? (pointsScored / played).toFixed(1) : "0";

  const kpiCards = [
    { label: "Tournament Rank", value: `#${rank}`, sub: `of ${totalPlayers}`, icon: Trophy, color: "from-amber-500 to-orange-600", textColor: "text-amber-400" },
    { label: "Win Rate", value: `${winRate}%`, sub: played > 0 ? `${wins}W / ${losses}L` : "No matches", icon: Target, color: "from-emerald-500 to-teal-600", textColor: "text-emerald-400" },
    { label: "Matches Played", value: `${played}`, sub: played > 0 ? "Active" : "Awaiting", icon: Swords, color: "from-violet-500 to-purple-600", textColor: "text-violet-400" },
    { label: "Dominance Ratio", value: `${dominanceRatio}`, sub: `${gamesWon}GW / ${gamesLost}GL`, icon: Flame, color: "from-rose-500 to-pink-600", textColor: "text-rose-400" },
  ];

  const performanceBars = [
    { label: "Attack Power", value: winRate, color: "bg-gradient-to-r from-red-500 to-orange-500" },
    { label: "Consistency", value: consistencyScore, color: "bg-gradient-to-r from-emerald-500 to-teal-500" },
    { label: "Endurance", value: played > 0 ? Math.min(played * 10, 100) : 0, color: "bg-gradient-to-r from-blue-500 to-indigo-500" },
    { label: "Clutch Factor", value: Math.min(wins * 15, 100), color: "bg-gradient-to-r from-violet-500 to-purple-500" },
    { label: "Game Dominance", value: gamesWon + gamesLost > 0 ? Math.round((gamesWon / (gamesWon + gamesLost)) * 100) : 0, color: "bg-gradient-to-r from-amber-500 to-orange-500" },
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-violet-500/30 bg-slate-950">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-900/40 to-slate-950" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-tr-full" />

          <div className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 opacity-60 blur-sm" />
                <PlayerAvatar name={name} size="lg" />
                {rank <= 3 && (
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Crown className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white truncate">{name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <GradeTierBadge grade={grade} />
                  <Badge className={cn("text-[9px] px-1.5 border font-bold",
                    player.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}>{player.status}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {streakData.recentResults.length > 0 && streakData.recentResults.map((r, i) => (
                    <div key={i} className={cn(
                      "h-5 w-5 rounded text-[9px] font-black flex items-center justify-center",
                      r === "W" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                    )}>{r}</div>
                  ))}
                  {streakData.recentResults.length === 0 && (
                    <span className="text-[10px] text-slate-500">No match history</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {kpiCards.map((kpi, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden" data-testid={`player-stat-${kpi.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.08]", kpi.color)} />
                <div className="relative p-3 border border-slate-800/60 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("h-5 w-5 rounded flex items-center justify-center bg-gradient-to-br", kpi.color)}>
                      <kpi.icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                  </div>
                  <div className={cn("text-xl font-black", kpi.textColor)}>{kpi.value}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{kpi.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800/60 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Performance Breakdown</span>
            </div>
            {performanceBars.map((bar, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">{bar.label}</span>
                  <span className="text-[10px] font-black text-slate-300">{bar.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700", bar.color)}
                    style={{ width: `${bar.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-800/60 p-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Avg Pts/Match</div>
              <div className="text-base font-black text-cyan-400">{avgPointsPerMatch}</div>
            </div>
            <div className="rounded-lg border border-slate-800/60 p-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Best Streak</div>
              <div className="text-base font-black text-amber-400">{streakData.bestStreak}W</div>
            </div>
            <div className="rounded-lg border border-slate-800/60 p-3 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Points Scored</div>
              <div className="text-base font-black text-emerald-400">{pointsScored}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PairsTab({ tournamentId }: { tournamentId: number }) {
  const { data: pairs, isLoading } = useTournamentPairs(tournamentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  if (!pairs || pairs.length === 0) return <EmptyState icon={UserPlus} title="No Pairs" description="No confirmed pairs yet." />;

  const pairBorderGradients = [
    "from-amber-500 via-orange-500 to-rose-500",
    "from-violet-500 via-purple-500 to-fuchsia-500",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-rose-500 via-pink-500 to-purple-500",
    "from-blue-500 via-indigo-500 to-violet-500",
  ];

  const pairGlowColors = [
    "shadow-amber-500/20",
    "shadow-violet-500/20",
    "shadow-cyan-500/20",
    "shadow-emerald-500/20",
    "shadow-rose-500/20",
    "shadow-blue-500/20",
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-violet-500/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Swords className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-purple-400">Team Roster</span>
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-wide">Confirmed Pairs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Elite duos ready to compete</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{pairs.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Teams</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((pair: any, idx: number) => {
          const p1Name = pair.user1?.fullName || "Player 1";
          const p2Name = pair.user2?.fullName || "Player 2";
          const gradientIdx = idx % pairBorderGradients.length;
          const isTop3 = idx < 3;
          const rankMedals = ["🥇", "🥈", "🥉"];

          return (
            <div
              key={pair.id}
              className="group relative"
              data-testid={`pair-card-${idx}`}
            >
              <div className={cn(
                "absolute -inset-[1px] rounded-2xl bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity duration-300 blur-[0.5px]",
                pairBorderGradients[gradientIdx]
              )} />

              <div className={cn(
                "relative rounded-2xl bg-card backdrop-blur-sm overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-xl border border-border/30",
                pairGlowColors[gradientIdx]
              )}>
                <div className={cn(
                  "h-1 w-full bg-gradient-to-r",
                  pairBorderGradients[gradientIdx]
                )} />

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {isTop3 ? (
                        <span className="text-lg">{rankMedals[idx]}</span>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-muted border border-border/50 flex items-center justify-center">
                          <span className="text-xs font-black text-muted-foreground">#{idx + 1}</span>
                        </div>
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Team {idx + 1}</span>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[8px] font-black tracking-wider px-2">
                      <CheckCircle className="h-2.5 w-2.5 mr-1" />READY
                    </Badge>
                  </div>

                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className={cn("absolute -inset-1 rounded-full bg-gradient-to-br opacity-50 blur-sm", pairBorderGradients[gradientIdx])} />
                        <PlayerAvatar name={p1Name} size="lg" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-2 text-center max-w-[80px] truncate">{p1Name.split(" ")[0]}</h4>
                      <div className="mt-1"><GradeTierBadge grade={pair.profile1?.currentGrade || "—"} /></div>
                    </div>

                    <div className="flex flex-col items-center gap-1 px-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-amber-400" />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/70">&amp;</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className={cn("absolute -inset-1 rounded-full bg-gradient-to-br opacity-50 blur-sm", pairBorderGradients[gradientIdx])} />
                        <PlayerAvatar name={p2Name} size="lg" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-2 text-center max-w-[80px] truncate">{p2Name.split(" ")[0]}</h4>
                      <div className="mt-1"><GradeTierBadge grade={pair.profile2?.currentGrade || "—"} /></div>
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">{p1Name.split(" ")[0]} & {p2Name.split(" ")[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={cn("h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse")} />
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
  const withdrawMutation = useWithdrawRegistration();
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
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">You're registered!</p>
              <p className="text-xs text-muted-foreground">Status: {myRegistration.status} · Type: {myRegistration.registrationType}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
            disabled={withdrawMutation.isPending}
            data-testid="button-withdraw-tournament"
            onClick={async () => {
              try {
                await withdrawMutation.mutateAsync({ id: myRegistration.id, tournamentId });
                toast({ title: "Withdrawn", description: "You have withdrawn from this tournament." });
              } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
            }}>
            {withdrawMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
            Withdraw
          </Button>
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

  const viewTabs = [];
  if (category.format === "GROUP_KNOCKOUT" || category.format === "ROUND_ROBIN") {
    viewTabs.push({ key: "standings", label: "Standings", icon: BarChart3 });
  }
  viewTabs.push({ key: "list", label: "Matches", icon: Swords });
  if (category.format === "KNOCKOUT" || (category.format === "GROUP_KNOCKOUT" && knockoutMatches.length > 0)) {
    viewTabs.push({ key: "bracket", label: "Bracket", icon: GitBranch });
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-card p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-violet-500/5" />
          <div className="relative flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={onGenerateMatches} disabled={isGenerating || !teams || teams.length < 2}
              className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-black text-xs shadow-lg shadow-violet-500/20 border-0">
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Swords className="h-3.5 w-3.5 mr-1.5" />}
              Generate Fixtures
            </Button>
            {category.format !== "ROUND_ROBIN" && matches.length > 0 && (
              <Button size="sm" variant="outline" onClick={onAdvanceWinners} disabled={isAdvancing}
                className="font-black text-xs">
                {isAdvancing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 mr-1.5" />}
                {category.format === "GROUP_KNOCKOUT" ? "Generate Knockout" : "Advance Winners"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-muted/50 dark:bg-muted/20 rounded-xl p-1 border border-border/50">
        {viewTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveView(tab.key as any)}
            className={cn("flex-1 px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeView === tab.key
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
            <tab.icon className="h-3.5 w-3.5 inline mr-1.5" />{tab.label}
          </button>
        ))}
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
  const scoreA = scores.reduce((a: number, s: any) => a + (s.scoreA > s.scoreB ? 1 : 0), 0);
  const scoreB = scores.reduce((a: number, s: any) => a + (s.scoreB > s.scoreA ? 1 : 0), 0);
  const scoreStr = scores.length > 0 ? scores.map((s: any) => `${s.scoreA}-${s.scoreB}`).join(", ") : "";

  return (
    <div className="group relative" data-testid={`match-card-${match.id}`}>
      <div className={cn(
        "relative rounded-xl overflow-hidden border transition-all duration-300",
        isFinished
          ? "border-border/50 bg-card"
          : "border-violet-500/20 bg-card hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10"
      )}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border/30">
          {match.groupNumber && (
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[9px] font-black px-1.5">G{match.groupNumber}</Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-bold">R{match.round} · Match {match.matchOrder + 1}</span>
          {match.isBye && <Badge className="bg-muted text-muted-foreground border border-border/30 text-[9px] font-bold ml-auto">BYE</Badge>}
        </div>

        <div className="flex items-stretch">
          <div className="flex-1 min-w-0">
            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 border-b border-border/30 transition-colors",
              match.winnerId === match.teamAId && "bg-violet-500/10"
            )}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn(
                  "h-6 w-6 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0",
                  match.winnerId === match.teamAId
                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                    : "bg-muted text-muted-foreground border border-border/50"
                )}>
                  {match.winnerId === match.teamAId ? <Crown className="h-3 w-3" /> : "A"}
                </div>
                <span className={cn("text-xs font-bold truncate",
                  match.winnerId === match.teamAId ? "text-violet-600 dark:text-violet-300" : match.teamAId ? "text-foreground" : "text-muted-foreground"
                )}>{teamAName}</span>
              </div>
              <span className={cn("text-sm font-mono font-black tabular-nums w-6 text-center flex-shrink-0",
                match.winnerId === match.teamAId ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
              )}>{isFinished ? scoreA : ""}</span>
            </div>

            <div className={cn(
              "flex items-center justify-between px-3 py-2.5 transition-colors",
              match.winnerId === match.teamBId && "bg-violet-500/10"
            )}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn(
                  "h-6 w-6 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0",
                  match.winnerId === match.teamBId
                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                    : "bg-muted text-muted-foreground border border-border/50"
                )}>
                  {match.winnerId === match.teamBId ? <Crown className="h-3 w-3" /> : "B"}
                </div>
                <span className={cn("text-xs font-bold truncate",
                  match.winnerId === match.teamBId ? "text-violet-600 dark:text-violet-300" : match.teamBId ? "text-foreground" : "text-muted-foreground"
                )}>{teamBName}</span>
              </div>
              <span className={cn("text-sm font-mono font-black tabular-nums w-6 text-center flex-shrink-0",
                match.winnerId === match.teamBId ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
              )}>{isFinished ? scoreB : ""}</span>
            </div>
          </div>

          {!isFinished && canManage && match.teamAId && match.teamBId && (
            <div className="flex items-center px-2 border-l border-border/30">
              <Button size="sm" onClick={onScore}
                className="h-8 w-8 p-0 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 border border-violet-500/30 rounded-lg">
                <Target className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {isFinished && scoreStr && (
          <div className="px-3 py-1.5 bg-muted/30 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground font-mono font-bold">Sets: {scoreStr}</span>
          </div>
        )}
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
    <div className="space-y-5">
      {groups.map((group, gi) => (
        <div key={gi} className="relative rounded-2xl overflow-hidden">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-500/40 via-purple-500/20 to-slate-800/40 blur-[0.5px]" />
          <div className="relative rounded-2xl bg-card overflow-hidden border border-border/30">
            <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <LayoutGrid className="h-3 w-3 text-white" />
                </div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Group {String.fromCharCode(65 + gi)}</h4>
                <Badge className="bg-violet-500/15 text-violet-500 dark:text-violet-400 border border-violet-500/30 text-[9px] font-black ml-auto">{group.length} Teams</Badge>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Team</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">P</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">W</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">L</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">GW</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">GL</th>
                    <th className="text-center px-2 py-2.5 text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-wider">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((s: any, si: number) => {
                    const team = teamMap.get(s.teamId);
                    const isQualifying = si < (category.advancePerGroup || 2);
                    return (
                      <tr key={s.id} className={cn(
                        "border-t border-border/30 transition-colors hover:bg-muted/30",
                        isQualifying && "bg-emerald-500/[0.04]"
                      )}>
                        <td className="px-4 py-2.5">
                          <div className={cn(
                            "h-5 w-5 rounded flex items-center justify-center text-[10px] font-black",
                            isQualifying ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          )}>{si + 1}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-foreground">{team ? getTeamName(team) : `Team #${s.teamId}`}</span>
                        </td>
                        <td className="text-center px-2 py-2.5 text-muted-foreground font-medium">{s.matchesPlayed}</td>
                        <td className="text-center px-2 py-2.5 font-bold text-emerald-500 dark:text-emerald-400">{s.matchesWon}</td>
                        <td className="text-center px-2 py-2.5 text-red-500 dark:text-red-400">{s.matchesLost}</td>
                        <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesWon}</td>
                        <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesLost}</td>
                        <td className="text-center px-2 py-2.5 font-black text-violet-500 dark:text-violet-400">{s.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
      label: ms.length === 1 ? "Final" : ms.length === 2 ? "Semi Finals" : ms.length === 4 ? "Quarter Finals" : `Round ${round}`,
      isFinal: ms.length === 1,
      matches: ms.sort((a, b) => a.matchOrder - b.matchOrder),
    }));
  }, [matches]);

  if (rounds.length === 0) return <EmptyState icon={GitBranch} title="No Bracket" description="Generate fixtures to see the bracket." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {rounds.map((round, ri) => (
          <div key={round.round} className={cn(
            "flex-shrink-0 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider border transition-all",
            round.isFinal
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500/50 shadow-lg shadow-violet-500/20"
              : "bg-muted/60 text-muted-foreground border-border/50 hover:border-violet-500/30"
          )}>
            <div className="text-center">
              <div>{round.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-x-auto pb-4">
        <div className="flex min-w-max">
          {rounds.map((round, ri) => (
            <div key={round.round} className="flex flex-col relative" style={{ width: 240 }}>
              <div className={cn(
                "text-center mb-4 pb-2 border-b mx-4",
                round.isFinal ? "border-violet-500/40" : "border-border/40"
              )}>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.15em]",
                  round.isFinal ? "text-violet-500 dark:text-violet-400" : "text-muted-foreground"
                )}>{round.label}</span>
              </div>

              <div className="flex flex-col justify-around flex-1 gap-2 px-2" style={{ minHeight: rounds[0]?.matches?.length * 88 }}>
                {round.matches.map((match, mi) => {
                  const teamAName = match.teamA ? getTeamName(match.teamA) : match.teamAId ? `Team #${match.teamAId}` : "TBD";
                  const teamBName = match.teamB ? getTeamName(match.teamB) : match.teamBId ? `Team #${match.teamBId}` : "TBD";
                  const isFinished = match.status === "FINISHED";
                  const scoreA = match.scores?.reduce((a: number, s: any) => a + (s.scoreA > s.scoreB ? 1 : 0), 0) ?? 0;
                  const scoreB = match.scores?.reduce((a: number, s: any) => a + (s.scoreB > s.scoreA ? 1 : 0), 0) ?? 0;

                  return (
                    <div key={match.id} className="group" data-testid={`bracket-match-${match.id}`}>
                      <div className={cn(
                        "rounded-lg overflow-hidden border transition-all duration-300 bg-card",
                        round.isFinal
                          ? "border-violet-500/40 shadow-lg shadow-violet-500/10"
                          : isFinished
                            ? "border-border/40"
                            : "border-border/40 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5"
                      )}>
                        <div className={cn(
                          "flex items-center justify-between px-3 py-2 border-b border-border/40",
                          match.winnerId === match.teamAId && "bg-violet-500/15"
                        )}>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn(
                              "h-5 w-1 rounded-full flex-shrink-0",
                              match.winnerId === match.teamAId ? "bg-violet-500" : match.teamAId ? "bg-border" : "bg-muted"
                            )} />
                            <span className={cn("text-xs font-bold truncate",
                              match.winnerId === match.teamAId ? "text-violet-600 dark:text-violet-300" : match.teamAId ? "text-foreground" : "text-muted-foreground"
                            )}>{teamAName}</span>
                          </div>
                          <span className={cn(
                            "text-sm font-mono font-black tabular-nums w-6 text-center flex-shrink-0",
                            match.winnerId === match.teamAId ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
                          )}>
                            {isFinished ? scoreA : match.teamAId ? "0" : ""}
                          </span>
                        </div>

                        <div className={cn(
                          "flex items-center justify-between px-3 py-2",
                          match.winnerId === match.teamBId && "bg-violet-500/15"
                        )}>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn(
                              "h-5 w-1 rounded-full flex-shrink-0",
                              match.winnerId === match.teamBId ? "bg-violet-500" : match.teamBId ? "bg-border" : "bg-muted"
                            )} />
                            <span className={cn("text-xs font-bold truncate",
                              match.winnerId === match.teamBId ? "text-violet-600 dark:text-violet-300" : match.teamBId ? "text-foreground" : "text-muted-foreground"
                            )}>{teamBName}</span>
                          </div>
                          <span className={cn(
                            "text-sm font-mono font-black tabular-nums w-6 text-center flex-shrink-0",
                            match.winnerId === match.teamBId ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"
                          )}>
                            {isFinished ? scoreB : match.teamBId ? "0" : ""}
                          </span>
                        </div>

                        {match.isBye && (
                          <div className="px-3 py-1 text-center bg-muted/40 border-t border-border/40">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">BYE</span>
                          </div>
                        )}
                      </div>

                      {ri < rounds.length - 1 && (
                        <div className="absolute right-0 top-0 bottom-0 w-4 pointer-events-none" style={{ transform: "translateX(50%)" }}>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {rounds.length > 0 && rounds[rounds.length - 1].isFinal && rounds[rounds.length - 1].matches[0]?.winnerId && (
            <div className="flex flex-col justify-center px-4" style={{ width: 200 }}>
              <div className="text-center mb-4 pb-2 border-b border-amber-500/30 mx-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400">Champion</span>
              </div>
              <div className="relative">
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-60 blur-[0.5px]" />
                <div className="relative rounded-xl bg-card p-4 text-center border border-border/30">
                  <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-amber-300">
                    {(() => {
                      const finalMatch = rounds[rounds.length - 1].matches[0];
                      if (finalMatch.winnerId === finalMatch.teamAId && finalMatch.teamA) return getTeamName(finalMatch.teamA);
                      if (finalMatch.winnerId === finalMatch.teamBId && finalMatch.teamB) return getTeamName(finalMatch.teamB);
                      return "Winner";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTab({ tournamentId, tournament, categories }: { tournamentId: number; tournament: any; categories: any[] }) {
  const { data: registrations, isLoading: regsLoading } = useTournamentRegistrations(tournamentId);
  const { data: waitlist } = useTournamentWaitlist(tournamentId);
  const { data: tournamentAdminsList } = useTournamentAdmins(tournamentId);
  const { data: eligibleAdmins } = useTournamentEligibleAdmins(tournamentId);
  const updateRegMutation = useUpdateRegistration();
  const updateTournamentMutation = useUpdateTournament();
  const registerTeamMutation = useRegisterTeam();
  const deleteCatMutation = useDeleteCategory();
  const addAdminMutation = useAddTournamentAdmin();
  const removeAdminMutation = useRemoveTournamentAdmin();
  const { toast } = useToast();
  const [adminView, setAdminView] = useState<"registrations" | "pairs" | "waitlist" | "settings">("registrations");
  const { data: allPlayers } = useTournamentAllPlayers(tournamentId);
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const activeCatId = selectedCatId || (categories.length > 0 ? categories[0].id : null);
  const { data: catTeams } = useTournamentTeams(activeCatId || 0);
  const [addAdminOpen, setAddAdminOpen] = useState(false);

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
        {["registrations", "pairs", "waitlist", "settings"].map(view => (
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
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                      data-testid={`button-remove-player-${reg.id}`}
                      onClick={async () => {
                        try {
                          await updateRegMutation.mutateAsync({ id: reg.id, status: "REJECTED" });
                          toast({ title: "Player Removed" });
                        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                      }}>
                      <Trash2 className="h-3 w-3 mr-1" />Remove
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

      {adminView === "pairs" && (
        <div className="space-y-3">
          {categories.length > 1 && (
            <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => { setSelectedCatId(cat.id); setEditingTeam(null); }}
                  className={cn("flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    activeCatId === cat.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30 bg-muted/20">
              <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Manage Pairs / Teams</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">Edit seed numbers or remove teams</p>
            </div>
            {(!catTeams || catTeams.length === 0) ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No teams in this category yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {catTeams.map((team: any, idx: number) => {
                  const p1 = team.player1 || allPlayers?.find((p: any) => p.userId === team.player1Id);
                  const p2 = team.player2 || allPlayers?.find((p: any) => p.userId === team.player2Id);
                  const p1Name = p1?.fullName || p1?.user?.fullName || `Player ${team.player1Id}`;
                  const p2Name = p2?.fullName || p2?.user?.fullName || (team.player2Id ? `Player ${team.player2Id}` : "—");
                  return (
                    <div key={team.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" data-testid={`admin-team-${team.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-black text-muted-foreground w-6">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{p1Name} {team.player2Id ? `& ${p2Name}` : "(Singles)"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {team.seedNumber && <Badge variant="outline" className="text-[9px] px-1.5 font-bold">Seed {team.seedNumber}</Badge>}
                            <span className="text-[10px] text-muted-foreground">ID: {team.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs font-bold"
                          data-testid={`button-edit-team-${team.id}`}
                          onClick={() => setEditingTeam(editingTeam?.id === team.id ? null : { ...team, categoryId: activeCatId, newSeed: team.seedNumber || "" })}>
                          <Edit3 className="h-3 w-3 mr-1" />{editingTeam?.id === team.id ? "Cancel" : "Edit"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                          data-testid={`button-delete-team-${team.id}`}
                          onClick={async () => {
                            try {
                              await deleteTeamMutation.mutateAsync({ teamId: team.id, categoryId: activeCatId! });
                              toast({ title: "Team Removed" });
                            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {editingTeam && (
            <div className="rounded-xl border border-violet-500/30 bg-card p-4 space-y-3">
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-violet-500" />
                Edit Team #{editingTeam.id}
              </h4>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Seed Number</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Leave empty for no seed"
                  value={editingTeam.newSeed}
                  onChange={(e) => setEditingTeam({ ...editingTeam, newSeed: e.target.value })}
                  className="h-9"
                  data-testid="input-team-seed"
                />
              </div>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
                disabled={updateTeamMutation.isPending}
                data-testid="button-save-team"
                onClick={async () => {
                  try {
                    await updateTeamMutation.mutateAsync({
                      teamId: editingTeam.id,
                      seedNumber: editingTeam.newSeed ? parseInt(editingTeam.newSeed) : null,
                    });
                    toast({ title: "Team Updated" });
                    setEditingTeam(null);
                  } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                }}>
                {updateTeamMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Save Changes
              </Button>
            </div>
          )}
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

          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Tournament Admins</h4>
              </div>
              <Button size="sm" onClick={() => setAddAdminOpen(true)}
                className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold" data-testid="button-add-tournament-admin">
                <UserPlus className="h-3 w-3 mr-1" />Add Admin
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Assign members as tournament admins. They can manage registrations, matches, and settings for this tournament only.</p>

            {(!tournamentAdminsList || tournamentAdminsList.length === 0) ? (
              <div className="text-center py-4">
                <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No tournament admins assigned yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {tournamentAdminsList.map((admin: any) => (
                  <div key={admin.id} className="flex items-center justify-between py-2.5" data-testid={`tournament-admin-${admin.userId}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar name={admin.userName || "?"} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{admin.userName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{admin.userEmail}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive"
                      onClick={async () => {
                        try {
                          await removeAdminMutation.mutateAsync({ tournamentId, adminId: admin.id });
                          toast({ title: "Admin Removed" });
                        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                      }}
                      disabled={removeAdminMutation.isPending}
                      data-testid={`button-remove-admin-${admin.userId}`}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {addAdminOpen && (
            <Dialog open onOpenChange={() => setAddAdminOpen(false)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-violet-500" />
                    Add Tournament Admin
                  </DialogTitle>
                  <DialogDescription>Select a club member to grant tournament admin access.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(!eligibleAdmins || eligibleAdmins.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No eligible members found.</p>
                  ) : (
                    eligibleAdmins.map((member: any) => (
                      <div key={member.userId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors"
                        data-testid={`eligible-admin-${member.userId}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatar name={member.fullName || "?"} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{member.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                        <Button size="sm" className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold"
                          disabled={addAdminMutation.isPending}
                          onClick={async () => {
                            try {
                              await addAdminMutation.mutateAsync({ tournamentId, userId: member.userId });
                              toast({ title: "Admin Added", description: `${member.fullName} is now a tournament admin.` });
                              setAddAdminOpen(false);
                            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                          }}
                          data-testid={`button-grant-admin-${member.userId}`}>
                          <UserPlus className="h-3 w-3 mr-1" />Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}

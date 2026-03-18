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
  Building2, ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  PUBLISHED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ONGOING: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
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

const avatarColors = ["bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-emerald-600", "bg-blue-600", "bg-pink-600", "bg-teal-600", "bg-indigo-600"];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
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
          <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto mb-3" />
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
    { key: "players", label: "Players", icon: Users },
    { key: "pairs", label: "Pairs", icon: UserPlus },
    { key: "signup", label: "Sign Up", icon: Zap },
    { key: "matches", label: "Matches", icon: Swords },
    ...(canManage ? [{ key: "admin" as SubPage, label: "Admin", icon: Settings }] : []),
  ];

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon" className="rounded-xl" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-foreground truncate" data-testid="text-tournament-title">{tournament.name}</h1>
            <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold", statusColors[tournament.status])} data-testid="badge-tournament-status">
              {tournament.status === "ONGOING" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
              {tournament.status}
            </Badge>
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
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
                subPage === tab.key
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25"
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
          <span className="text-xs font-medium text-muted-foreground">Category:</span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all border",
                activeCategory?.id === cat.id
                  ? "bg-violet-500/20 text-violet-500 dark:text-violet-400 border-violet-500/30"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:border-violet-500/30"
              )}
              data-testid={`button-category-${cat.id}`}
            >
              {cat.name}
            </button>
          ))}
          {canManage && (
            <button onClick={() => setAddCategoryOpen(true)} className="px-3 py-1 rounded-lg text-xs font-semibold border border-dashed border-border text-muted-foreground hover:border-violet-500/30 hover:text-violet-500 transition-all" data-testid="button-add-category">
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
                <Button type="submit" disabled={createCatMutation.isPending} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
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
      <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-7 w-7 text-violet-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
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
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-violet-600/10 via-purple-600/5 to-indigo-600/10 dark:from-violet-900/20 dark:via-purple-900/10 dark:to-indigo-900/20 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/25 flex-shrink-0">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-foreground">{tournament.name}</h2>
              {tournament.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{tournament.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Calendar, label: "Date", value: `${format(new Date(tournament.startDate), "d MMM")} – ${format(new Date(tournament.endDate), "d MMM")}` },
              { icon: Building2, label: "Club", value: tournament.club?.name || "—" },
              { icon: MapPin, label: "Location", value: tournament.location || tournament.venue?.name || "TBD" },
              { icon: Swords, label: "Courts", value: `${tournament.courtsAvailable} courts` },
            ].map((item, i) => (
              <div key={i} className="rounded-xl bg-background/50 dark:bg-white/[0.03] border border-border/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {maxPlayers && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Registration Progress</span>
                <span className="font-bold text-foreground">{regCount} / {maxPlayers}</span>
              </div>
              <div className="h-3 rounded-full bg-muted/50 dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{fillPercent >= 100 ? "Tournament is full!" : `${maxPlayers - regCount} spots remaining`}</p>
            </div>
          )}

          {tournament.entryFee && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Entry Fee:</span>
              <Badge variant="outline" className="font-bold">{tournament.entryFee}</Badge>
            </div>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Categories</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map(cat => (
              <div key={cat.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{cat.name}</h4>
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

      {tournament.socialLinks && Object.keys(tournament.socialLinks).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Social Links</h3>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(tournament.socialLinks).map(([platform, url]) => (
              <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <ExternalLink className="h-3 w-3" />{platform}
              </a>
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
    if (!searchQuery) return players;
    const q = searchQuery.toLowerCase();
    return players.filter((p: any) => p.user?.fullName?.toLowerCase().includes(q));
  }, [players, searchQuery]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search players..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 dark:bg-white/[0.06] border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/40 transition-colors"
          data-testid="input-search-players" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No Players" description="No players registered yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => (
            <div key={p.id} className="group rounded-xl border border-border/50 bg-card hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all p-4" data-testid={`player-card-${p.userId}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm", getAvatarColor(p.user?.fullName || ""))}>
                  {getInitials(p.user?.fullName || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{p.user?.fullName}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5">{p.registrationType === "PAIR" ? "Paired" : "Individual"}</Badge>
                    <Badge className={cn("text-[10px] px-1.5 border", p.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : p.status === "PENDING" ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-gray-500/20 text-gray-500 border-gray-500/30")}>{p.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Grade", value: p.profile?.currentGrade || "—" },
                  { label: "Played", value: p.matchesPlayed },
                  { label: "Win %", value: `${p.winRate}%` },
                ].map((stat, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 dark:bg-white/[0.03] p-2 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PairsTab({ tournamentId }: { tournamentId: number }) {
  const { data: pairs, isLoading } = useTournamentPairs(tournamentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  if (!pairs || pairs.length === 0) return <EmptyState icon={UserPlus} title="No Pairs" description="No confirmed pairs yet." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pairs.map((pair: any, idx: number) => (
        <div key={pair.id} className="rounded-xl border border-border/50 bg-card hover:border-violet-500/30 transition-all p-4" data-testid={`pair-card-${idx}`}>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-card z-10", getAvatarColor(pair.user1?.fullName || ""))}>
                {getInitials(pair.user1?.fullName || "?")}
              </div>
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-card", getAvatarColor(pair.user2?.fullName || ""))}>
                {getInitials(pair.user2?.fullName || "?")}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate">{pair.user1?.fullName} & {pair.user2?.fullName}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                {pair.profile1?.currentGrade && <Badge variant="outline" className="text-[10px]">{pair.profile1.currentGrade}</Badge>}
                {pair.profile2?.currentGrade && <Badge variant="outline" className="text-[10px]">{pair.profile2.currentGrade}</Badge>}
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px]">Confirmed</Badge>
          </div>
        </div>
      ))}
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
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 to-purple-600/5 p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/25">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Join This Tournament</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Sign up as an individual to join the player pool, or register as a pair if you already have a partner.</p>
          <div className="flex gap-3 justify-center">
            {["INDIVIDUAL", "PAIR"].map(type => (
              <button key={type} onClick={() => setRegType(type as any)}
                className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border", regType === type ? "bg-violet-500/20 text-violet-500 dark:text-violet-400 border-violet-500/30" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-violet-500/30")}>
                {type === "INDIVIDUAL" ? "🙋 Individual" : "👥 As Pair"}
              </button>
            ))}
          </div>
          <Button onClick={handleRegister} disabled={registerMutation.isPending} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25">
            {registerMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Register Now
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">You're registered!</p>
            <p className="text-xs text-muted-foreground">Status: {myRegistration.status} • Type: {myRegistration.registrationType}</p>
          </div>
        </div>
      )}

      {myPendingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Incoming Pair Requests</h3>
          {myPendingRequests.map((pr: any) => (
            <div key={pr.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs", getAvatarColor(pr.fromUser?.fullName || ""))}>
                  {getInitials(pr.fromUser?.fullName || "?")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{pr.fromUser?.fullName}</p>
                  <p className="text-xs text-muted-foreground">wants to pair with you</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => handleRespondPairRequest(pr.id, "ACCEPTED")}>
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
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Player Pool</h3>
            <Badge variant="outline">{playerPool.length} available</Badge>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search pool..." value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-muted/50 dark:bg-white/[0.06] border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/40 transition-colors" />
          </div>
          <div className="space-y-2">
            {playerPool.filter((p: any) => {
              if (p.userId === user?.id) return false;
              if (partnerSearch) return p.user?.fullName?.toLowerCase().includes(partnerSearch.toLowerCase());
              return true;
            }).map((p: any) => (
              <div key={p.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-center justify-between gap-3" data-testid={`pool-player-${p.userId}`}>
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs", getAvatarColor(p.user?.fullName || ""))}>
                    {getInitials(p.user?.fullName || "?")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.user?.fullName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{p.profile?.currentGrade || "—"}</span>
                      <span>•</span>
                      <span>{p.matchesPlayed} played</span>
                      <span>•</span>
                      <span>{p.winRate}% win</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs border-violet-500/30 text-violet-500 hover:bg-violet-500/10"
                  onClick={() => handleSendPairRequest(p.userId)} disabled={sendPairMutation.isPending}>
                  <UserPlus className="h-3 w-3 mr-1" />Request Pair
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
            className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Swords className="h-3.5 w-3.5 mr-1" />}
            Generate Fixtures
          </Button>
          {category.format !== "ROUND_ROBIN" && matches.length > 0 && (
            <Button size="sm" variant="outline" onClick={onAdvanceWinners} disabled={isAdvancing}>
              {isAdvancing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 mr-1" />}
              {category.format === "GROUP_KNOCKOUT" ? "Generate Knockout" : "Advance Winners"}
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-1">
        {(category.format === "GROUP_KNOCKOUT" || category.format === "ROUND_ROBIN") && (
          <button onClick={() => setActiveView("standings")} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            activeView === "standings" ? "bg-violet-500/20 text-violet-500" : "text-muted-foreground hover:text-foreground")}>
            <BarChart3 className="h-3.5 w-3.5 inline mr-1" />Standings
          </button>
        )}
        <button onClick={() => setActiveView("list")} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          activeView === "list" ? "bg-violet-500/20 text-violet-500" : "text-muted-foreground hover:text-foreground")}>
          <Swords className="h-3.5 w-3.5 inline mr-1" />Matches
        </button>
        {(category.format === "KNOCKOUT" || (category.format === "GROUP_KNOCKOUT" && knockoutMatches.length > 0)) && (
          <button onClick={() => setActiveView("bracket")} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
            activeView === "bracket" ? "bg-violet-500/20 text-violet-500" : "text-muted-foreground hover:text-foreground")}>
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
      isFinished ? "border-border/30" : "border-border/50 hover:border-violet-500/30"
    )} data-testid={`match-card-${match.id}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {match.groupNumber && <Badge variant="outline" className="text-[10px]">G{match.groupNumber}</Badge>}
            <span className="text-[10px] text-muted-foreground">R{match.round} • M{match.matchOrder + 1}</span>
          </div>
          <div className="space-y-1">
            <div className={cn("text-sm font-semibold truncate", match.winnerId === match.teamAId && "text-emerald-500")}>
              {match.winnerId === match.teamAId && <Crown className="h-3 w-3 inline mr-1" />}
              {teamAName}
            </div>
            <div className={cn("text-sm font-semibold truncate", match.winnerId === match.teamBId && "text-emerald-500")}>
              {match.winnerId === match.teamBId && <Crown className="h-3 w-3 inline mr-1" />}
              {teamBName}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {isFinished && scoreStr && <p className="text-sm font-mono font-bold text-foreground">{scoreStr}</p>}
          {!isFinished && canManage && match.teamAId && match.teamBId && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onScore}>
              <Target className="h-3 w-3 mr-1" />Score
            </Button>
          )}
          {match.isBye && <Badge variant="outline" className="text-[10px]">BYE</Badge>}
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
              <span className="text-xs text-muted-foreground w-12">Set {i + 1}</span>
              <Input type="number" min={0} value={set.scoreA} onChange={e => updateSet(i, "scoreA", Number(e.target.value))} className="h-9 text-center" />
              <span className="text-muted-foreground">-</span>
              <Input type="number" min={0} value={set.scoreB} onChange={e => updateSet(i, "scoreB", Number(e.target.value))} className="h-9 text-center" />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addSet} className="w-full">
            <Plus className="h-3 w-3 mr-1" />Add Set
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
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
          <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/5 px-4 py-2 border-b border-border/30">
            <h4 className="text-sm font-bold text-foreground">Group {gi + 1}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Team</th>
                  <th className="text-center px-2 py-2">P</th>
                  <th className="text-center px-2 py-2">W</th>
                  <th className="text-center px-2 py-2">L</th>
                  <th className="text-center px-2 py-2">GW</th>
                  <th className="text-center px-2 py-2">GL</th>
                  <th className="text-center px-2 py-2 font-bold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.map((s: any, si: number) => {
                  const team = teamMap.get(s.teamId);
                  const isQualifying = si < (category.advancePerGroup || 2);
                  return (
                    <tr key={s.id} className={cn("border-t border-border/20", isQualifying && "bg-emerald-500/5")}>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-bold", isQualifying ? "text-emerald-500" : "text-muted-foreground")}>{si + 1}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-foreground">{team ? getTeamName(team) : `Team #${s.teamId}`}</span>
                      </td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.matchesPlayed}</td>
                      <td className="text-center px-2 py-2.5 font-medium text-emerald-500">{s.matchesWon}</td>
                      <td className="text-center px-2 py-2.5 text-red-400">{s.matchesLost}</td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesWon}</td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesLost}</td>
                      <td className="text-center px-2 py-2.5 font-black text-foreground">{s.points}</td>
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
      label: ms.length === 1 ? "Final" : ms.length === 2 ? "Semi Finals" : ms.length === 4 ? "Quarter Finals" : `Round ${round}`,
      matches: ms.sort((a, b) => a.matchOrder - b.matchOrder),
    }));
  }, [matches]);

  if (rounds.length === 0) return <EmptyState icon={GitBranch} title="No Bracket" description="Generate fixtures to see the bracket." />;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map((round, ri) => (
          <div key={round.round} className="flex flex-col">
            <div className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-3 text-center">{round.label}</div>
            <div className="flex flex-col justify-around flex-1 gap-3" style={{ minHeight: rounds[0]?.matches?.length * 80 }}>
              {round.matches.map(match => {
                const teamAName = match.teamA ? getTeamName(match.teamA) : match.teamAId ? `Team #${match.teamAId}` : "TBD";
                const teamBName = match.teamB ? getTeamName(match.teamB) : match.teamBId ? `Team #${match.teamBId}` : "TBD";
                const isFinished = match.status === "FINISHED";
                return (
                  <div key={match.id} className={cn(
                    "w-56 rounded-xl border overflow-hidden transition-all",
                    isFinished ? "border-border/30 bg-card" : "border-violet-500/20 bg-card hover:border-violet-500/40"
                  )}>
                    <div className={cn("flex items-center justify-between px-3 py-2 border-b border-border/20",
                      match.winnerId === match.teamAId && "bg-emerald-500/10"
                    )}>
                      <span className={cn("text-xs font-semibold truncate flex-1",
                        match.winnerId === match.teamAId ? "text-emerald-500" : match.teamAId ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {match.winnerId === match.teamAId && <Crown className="h-3 w-3 inline mr-1" />}
                        {teamAName}
                      </span>
                      {match.scores && match.scores.length > 0 && (
                        <span className="text-xs font-mono font-bold text-foreground ml-2">
                          {match.scores.reduce((a: number, s: any) => a + s.scoreA, 0)}
                        </span>
                      )}
                    </div>
                    <div className={cn("flex items-center justify-between px-3 py-2",
                      match.winnerId === match.teamBId && "bg-emerald-500/10"
                    )}>
                      <span className={cn("text-xs font-semibold truncate flex-1",
                        match.winnerId === match.teamBId ? "text-emerald-500" : match.teamBId ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {match.winnerId === match.teamBId && <Crown className="h-3 w-3 inline mr-1" />}
                        {teamBName}
                      </span>
                      {match.scores && match.scores.length > 0 && (
                        <span className="text-xs font-mono font-bold text-foreground ml-2">
                          {match.scores.reduce((a: number, s: any) => a + s.scoreB, 0)}
                        </span>
                      )}
                    </div>
                    {match.isBye && (
                      <div className="px-3 py-1 text-center border-t border-border/20">
                        <span className="text-[10px] text-muted-foreground">BYE</span>
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
        <Button size="sm" variant={tournament.isLocked ? "destructive" : "outline"} onClick={handleLock}>
          <Lock className="h-3.5 w-3.5 mr-1" />{tournament.isLocked ? "Unlock" : "Lock"} Tournament
        </Button>
      </div>

      <div className="flex gap-1">
        {["registrations", "waitlist", "settings"].map(view => (
          <button key={view} onClick={() => setAdminView(view as any)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
              adminView === view ? "bg-violet-500/20 text-violet-500" : "text-muted-foreground hover:text-foreground")}>
            {view}
          </button>
        ))}
      </div>

      {adminView === "registrations" && (
        <div className="space-y-2">
          {regsLoading ? <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto" /> :
            !registrations?.length ? <EmptyState icon={Users} title="No Registrations" description="No one has registered yet." /> :
            registrations.map((reg: any) => (
              <div key={reg.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-center justify-between gap-3 flex-wrap" data-testid={`admin-reg-${reg.id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0", getAvatarColor(reg.user?.fullName || ""))}>
                    {getInitials(reg.user?.fullName || "?")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{reg.user?.fullName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{reg.registrationType}</span>
                      {reg.partner && <span>+ {reg.partner.fullName}</span>}
                      {reg.paymentConfirmed && <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] px-1">PAID</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {reg.status === "PENDING" && (
                    <>
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(reg.id)}>
                        <Check className="h-3 w-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" onClick={() => handleReject(reg.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePayment(reg.id, !reg.paymentConfirmed)}>
                    {reg.paymentConfirmed ? "Unpay" : "💰 Confirm"}
                  </Button>
                  <Badge className={cn("text-[10px] px-1.5 border",
                    reg.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" :
                    reg.status === "PENDING" ? "bg-amber-500/20 text-amber-500 border-amber-500/30" :
                    reg.status === "WAITLISTED" ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                    "bg-red-500/20 text-red-500 border-red-500/30"
                  )}>{reg.status}</Badge>
                </div>
              </div>
            ))}
        </div>
      )}

      {adminView === "waitlist" && (
        <div className="space-y-2">
          {!waitlist?.length ? <EmptyState icon={Clock} title="Waitlist Empty" description="No players on the waitlist." /> :
            waitlist.map((w: any, i: number) => (
              <div key={w.id} className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-6">#{w.position}</span>
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs", getAvatarColor(w.user?.fullName || ""))}>
                  {getInitials(w.user?.fullName || "?")}
                </div>
                <span className="text-sm font-semibold text-foreground">{w.user?.fullName}</span>
              </div>
            ))}
        </div>
      )}

      {adminView === "settings" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <h4 className="font-semibold text-foreground text-sm">Categories</h4>
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{cat.name}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.format?.replace("_", "+")} • {cat.playersPerSide === 1 ? "Singles" : "Doubles"}</p>
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

import { useRoute } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useTournament, useTournamentCategories, useTournamentTeams,
  useTournamentMatches, useTournamentStandings,
  useCreateCategory, useDeleteCategory, useRegisterTeam, useDeleteTeam, useUpdateTeam,
  useGenerateMatches, useScoreMatch, useAdvanceWinners, useAddGroupMatch, useUpdateTournament,
  useTournamentRegistrations, useTournamentAllPlayers, useTournamentPairs,
  useTournamentPlayerPool, useTournamentPairRequests, useTournamentWaitlist,
  useRegisterForTournament, useUpdateRegistration, useDeleteRegistration, useSendPairRequest, useRespondPairRequest, useUpdatePairName,
  useWithdrawRegistration, useAdminCreatePair, useAutoPopulateTeams, useBulkAssignGroups, useAssignTeamGroup,
  useTournamentIsAdmin, useTournamentAdmins, useTournamentEligibleAdmins,
  useAddTournamentAdmin, useRemoveTournamentAdmin,
  useSeedDemoPlayers, useClearDemoPlayers, useRestartTournament,
  useTournamentGroups, useCreateTournamentGroup, useUpdateTournamentGroup, useDeleteTournamentGroup,
  useAddPairToGroup, useRemovePairFromGroup,
  useTournamentFinances, useConfirmTournamentPayment, useUpdateTournamentPayment,
  useTournamentPrizesQuery, useCreatePrize, useDeletePrize,
  useTournamentCourts, useCreateCourt, useUpdateCourt, useDeleteCourt,
  useAssignMatchCourt, useUpdateMatchStatus, useUpdateMatchTeamNames, useUpdateMatchScheduledTime, useBulkUpdateMatchScheduledTime,
  useTournamentPlayerStats, useRecalculateStats,
} from "@/hooks/use-tournaments";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMyTournamentClubs, useDetailedPlayerStats, useClubs } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, Plus, Trash2, Edit3,
  Play, ArrowLeft, GitBranch, LayoutGrid, Settings, Search, Check, X, Crown,
  UserPlus, UserMinus, Clock, Shield, ChevronRight, Zap, Award, Star, Target, Lock, CheckCircle,
  Building2, ExternalLink, Flame, Medal, PoundSterling, Gift, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Eye, AlertTriangle, Globe, Sparkles, FileText,
  Monitor, Square, CircleDot, ArrowUpDown, BarChart, RotateCcw,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import tournamentHeroImg from "@assets/tournament-hero.png";

type SubPage = "overview" | "players" | "pairs" | "signup" | "matches" | "groups" | "courts" | "stats" | "prizes" | "admin";

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

function PlayerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-12 w-12 text-sm", xl: "h-14 w-14 text-base" };
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

  const [subPage, setSubPage] = useState<SubPage>("players");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const { data: adminCheck } = useTournamentIsAdmin(tournamentId);
  const { data: pairRequests } = useTournamentPairRequests(tournamentId);
  const respondPairMutation = useRespondPairRequest();
  const isSuperAdmin = user?.role === "OWNER";
  const managedClubIds = new Set(tournamentClubs?.map(c => c.id) || []);
  const canManage = tournament ? (isSuperAdmin || managedClubIds.has(tournament.clubId) || adminCheck?.isAdmin === true) : false;
  const myPendingProposals = pairRequests?.filter((pr: any) => pr.toUserId === user?.id && pr.status === "PENDING") || [];

  const createCatMutation = useCreateCategory();
  const generateMatchesMutation = useGenerateMatches();
  const autoPopulateMutation = useAutoPopulateTeams();
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
    { key: "players", label: "Players", icon: Users },
    { key: "pairs", label: "Pairs", icon: Users },
    { key: "signup", label: "Sign Up", icon: Zap },
    { key: "matches", label: "Matches", icon: Swords },
    { key: "groups", label: "Groups", icon: LayoutGrid },
    { key: "courts", label: "Courts", icon: Monitor },
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

      {myPendingProposals.length > 0 && (
        <div className="space-y-2" data-testid="pair-proposal-banner">
          {myPendingProposals.map((pr: any) => (
            <div key={pr.id} className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-amber-500/15 p-4"
              data-testid={`pair-proposal-${pr.id}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">
                      {pr.fromUser?.fullName || "Someone"} wants to pair up with you!
                    </p>
                    {pr.pairName && (
                      <p className="text-xs text-amber-500 font-bold mt-0.5">Team: "{pr.pairName}"</p>
                    )}
                    {pr.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic truncate max-w-xs">"{pr.message}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white h-9 font-bold shadow-lg shadow-emerald-500/20 border-0"
                    disabled={respondPairMutation.isPending}
                    data-testid={`button-accept-pair-${pr.id}`}
                    onClick={async () => {
                      try {
                        await respondPairMutation.mutateAsync({ id: pr.id, status: "ACCEPTED" });
                        toast({ title: "Pair Confirmed!", description: `You're now paired with ${pr.fromUser?.fullName}.` });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <Check className="h-4 w-4 mr-1" />Accept
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                    disabled={respondPairMutation.isPending}
                    data-testid={`button-decline-pair-${pr.id}`}
                    onClick={async () => {
                      try {
                        await respondPairMutation.mutateAsync({ id: pr.id, status: "DECLINED" });
                        toast({ title: "Request Declined" });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <X className="h-4 w-4 mr-1" />Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {subPage !== "overview" && subPage !== "signup" && subPage !== "admin" && (
        <div className="flex items-center gap-2 flex-wrap">
          {categories.length > 0 && (
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category:</span>
          )}
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

      {subPage === "overview" && <OverviewTab tournament={tournament} categories={categories} tournamentId={tournamentId} />}
      {subPage === "players" && <PlayersTab tournamentId={tournamentId} />}
      {subPage === "pairs" && <PairsTab tournamentId={tournamentId} />}
      {subPage === "signup" && <SignUpTab tournamentId={tournamentId} tournament={tournament} />}
      {subPage === "matches" && activeCategory && <MatchesTab category={activeCategory} canManage={canManage} tournamentId={tournamentId} onGenerateMatches={async () => {
        try {
          await autoPopulateMutation.mutateAsync(activeCategory.id);
          await generateMatchesMutation.mutateAsync(activeCategory.id);
          toast({ title: "Tournament Started", description: "Teams populated and fixtures generated!" });
        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
      }} onAdvanceWinners={async () => {
        try { const r = await advanceWinnersMutation.mutateAsync(activeCategory.id); toast({ title: r.message === "Tournament complete" ? "Tournament Complete" : "Next Round Created" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
      }} isGenerating={generateMatchesMutation.isPending || autoPopulateMutation.isPending} isAdvancing={advanceWinnersMutation.isPending} />}
      {subPage === "matches" && !activeCategory && (
        <EmptyState icon={Swords} title="No Categories" description="Add a category to create matches." />
      )}
      {subPage === "groups" && <GroupsTab tournamentId={tournamentId} tournament={tournament} categories={categories} canManage={canManage} />}
      {subPage === "courts" && <CourtsTab tournamentId={tournamentId} canManage={canManage} />}
      {subPage === "stats" && <PlayerStatsTab tournamentId={tournamentId} categories={categories} canManage={canManage} />}
      {subPage === "prizes" && <PrizesTab tournamentId={tournamentId} tournament={tournament} categories={categories} />}
      {subPage === "admin" && canManage && <AdminTab tournamentId={tournamentId} tournament={tournament} categories={categories} canManage={canManage} />}

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

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm">
          <span className="text-xl sm:text-2xl font-black text-white tabular-nums">{String(value).padStart(2, "0")}</span>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
      </div>
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{label}</span>
    </div>
  );
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });
  
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  
  return timeLeft;
}

function OverviewTab({ tournament, categories, tournamentId }: { tournament: any; categories: any[]; tournamentId: number }) {
  const regCount = tournament.registrationCount || 0;
  const maxPlayers = tournament.maxPlayers;
  const fillPercent = maxPlayers ? Math.min((regCount / maxPlayers) * 100, 100) : 0;
  const spotsLeft = maxPlayers ? Math.max(maxPlayers - regCount, 0) : null;
  const { data: prizes } = useTournamentPrizesQuery(tournamentId);
  const { data: allPlayers } = useTournamentAllPlayers(tournamentId);
  const countdown = useCountdown(tournament.startDate);
  const isUpcoming = !countdown.expired && tournament.status !== "COMPLETED" && tournament.status !== "ONGOING";
  const isLive = tournament.status === "ONGOING";

  const placementIcons: Record<string, { icon: any; gradient: string; ring: string }> = {
    "1st": { icon: Crown, gradient: "from-amber-400 via-yellow-500 to-amber-600", ring: "ring-amber-500/30" },
    "2nd": { icon: Medal, gradient: "from-gray-300 via-slate-400 to-gray-500", ring: "ring-slate-400/30" },
    "3rd": { icon: Award, gradient: "from-amber-600 via-orange-700 to-amber-800", ring: "ring-orange-600/30" },
  };

  const recentPlayers = (allPlayers || []).slice(0, 8);
  const extraPlayerCount = Math.max(regCount - 8, 0);

  return (
    <div className="space-y-5" data-testid="overview-tab">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.06),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        <div className="relative p-5 sm:p-6 space-y-5">
          {(isUpcoming || isLive) && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {isLive ? (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-black text-xs px-3 py-1 animate-pulse" data-testid="badge-live">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1.5" />LIVE NOW
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-xs px-3 py-1" data-testid="badge-starts-in">
                    <Clock className="h-3 w-3 mr-1" />STARTS IN
                  </Badge>
                )}
              </div>
              {isUpcoming && (
                <div className="flex items-center gap-2">
                  <CountdownUnit value={countdown.days} label="Days" />
                  <span className="text-white/30 text-xl font-bold mb-4">:</span>
                  <CountdownUnit value={countdown.hours} label="Hrs" />
                  <span className="text-white/30 text-xl font-bold mb-4">:</span>
                  <CountdownUnit value={countdown.mins} label="Min" />
                  <span className="text-white/30 text-xl font-bold mb-4">:</span>
                  <CountdownUnit value={countdown.secs} label="Sec" />
                </div>
              )}
            </div>
          )}

          {maxPlayers && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {recentPlayers.map((p: any, i: number) => (
                      <div key={i} className="relative" style={{ zIndex: recentPlayers.length - i }}>
                        <PlayerAvatar name={p.user?.fullName || `P${i}`} size="sm" />
                      </div>
                    ))}
                    {extraPlayerCount > 0 && (
                      <div className="h-8 w-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-300 relative" style={{ zIndex: 0 }}>
                        +{extraPlayerCount}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-300">
                    <span className="font-black text-white">{regCount}</span> / {maxPlayers} joined
                  </span>
                </div>
                <span className={cn("text-sm font-black", fillPercent >= 100 ? "text-red-400" : fillPercent >= 75 ? "text-amber-400" : "text-emerald-400")}>
                  {fillPercent >= 100 ? "FULL" : `${Math.round(fillPercent)}%`}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-gray-700/50 overflow-hidden">
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out relative",
                      fillPercent >= 100 ? "bg-gradient-to-r from-red-500 to-rose-500" :
                      fillPercent >= 75 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                      "bg-gradient-to-r from-emerald-500 to-teal-500"
                    )}
                    style={{ width: `${fillPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full" />
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-white/30 to-transparent rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {fillPercent >= 100 ? (
                  <span className="text-red-400 font-bold">🔥 Tournament is full! Join the waitlist.</span>
                ) : (
                  <>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} remaining — <span className="text-amber-400 font-bold">sign up now!</span></>
                )}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>{format(new Date(tournament.startDate), "d MMM yyyy")} – {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
            </div>
            <div className="h-4 w-px bg-gray-600" />
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>{tournament.location || tournament.venue?.name || "TBD"}</span>
            </div>
            <div className="h-4 w-px bg-gray-600" />
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Swords className="h-4 w-4 text-violet-400" />
              <span>{tournament.courtsAvailable} courts</span>
            </div>
          </div>

          {tournament.entryFee && parseFloat(tournament.entryFee) > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entry Fee</p>
                {tournament.externalEntryFee && parseFloat(tournament.externalEntryFee) > 0 && parseFloat(tournament.externalEntryFee) !== parseFloat(tournament.entryFee) ? (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-lg font-black text-white">£{parseFloat(tournament.entryFee).toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">Members</p>
                    </div>
                    <span className="text-gray-600">/</span>
                    <div>
                      <p className="text-lg font-black text-white">£{parseFloat(tournament.externalEntryFee).toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">External</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-lg font-black text-white">£{parseFloat(tournament.entryFee).toFixed(2)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {tournament.description && (
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            About the Tournament
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{tournament.description}</p>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map(cat => (
                <Badge key={cat.id} variant="outline" className="text-xs font-bold bg-muted/30" data-testid={`badge-category-${cat.id}`}>
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {tournament.rules && (
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-500" />
            Rules
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
        </div>
      )}

      {prizes && prizes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 px-1">
            <Trophy className="h-4 w-4 text-amber-500" />
            Prize Pool
          </h3>
          <div className="space-y-2">
            {prizes.sort((a: any, b: any) => {
              const order: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3 };
              return (order[a.placement] || 99) - (order[b.placement] || 99);
            }).map((prize: any) => {
              const meta = placementIcons[prize.placement];
              const PrizeIcon = meta?.icon || Gift;
              return (
                <div key={prize.id} className="relative overflow-hidden rounded-xl border border-border/50 bg-card group hover:border-amber-500/20 transition-all" data-testid={`prize-card-${prize.id}`}>
                  {meta && <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", meta.gradient)} />}
                  <div className="flex items-center gap-4 p-4 pl-5">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center ring-2 flex-shrink-0", meta ? `bg-gradient-to-br ${meta.gradient} ${meta.ring}` : "bg-gray-500/20 ring-gray-500/20")}>
                      <PrizeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{prize.placement} Place</p>
                      {prize.title && <p className="text-xs text-muted-foreground truncate">{prize.title}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {prize.prizeValue && !isNaN(parseFloat(prize.prizeValue)) && (
                        <>
                          <p className="text-base font-black text-foreground">£{parseFloat(prize.prizeValue).toFixed(0)}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Amount</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 px-1">
            <LayoutGrid className="h-4 w-4 text-violet-500" />
            Event Categories
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map(cat => (
              <div key={cat.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between hover:border-amber-500/20 transition-colors group">
                <div>
                  <h4 className="font-bold text-foreground text-sm">{cat.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{cat.format?.replace(/_/g, " + ")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{cat.playersPerSide === 1 ? "Singles" : "Doubles"}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-500/60 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {tournament.socialLinks && typeof tournament.socialLinks === "object" && Object.keys(tournament.socialLinks).length > 0 && (
        <div className="rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <ExternalLink className="h-5 w-5" />
              <div>
                <p className="text-sm font-black uppercase tracking-wide">For More Info</p>
                <p className="text-xs text-white/70">Follow us on social media</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(tournament.socialLinks as Record<string, string>).map(([platform, url]) => (
                <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs font-bold transition-colors">
                  {platform.charAt(0).toUpperCase()}
                </a>
              ))}
            </div>
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
    list.sort((a: any, b: any) => {
      const aPlayed = a.matchesPlayed || 0;
      const bPlayed = b.matchesPlayed || 0;
      if (aPlayed === 0 && bPlayed === 0) return (a.user?.fullName || "").localeCompare(b.user?.fullName || "");
      if (aPlayed === 0) return 1;
      if (bPlayed === 0) return -1;
      return (b.winRate || 0) - (a.winRate || 0) || bPlayed - aPlayed;
    });
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
                    <span className={cn("text-sm font-black w-7 text-center", isTop3 && (p.matchesPlayed || 0) > 0 ? rankColors[idx] : "text-muted-foreground")}>
                      {(p.matchesPlayed || 0) === 0 ? "—" : isTop3 ? <Medal className={cn("h-5 w-5 inline", rankColors[idx])} /> : `${idx + 1}`}
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
  const [statsTab, setStatsTab] = useState<"tournament" | "club">("club");
  const name = player.user?.fullName || "Unknown Player";
  const grade = player.profile?.currentGrade || "—";
  const profileId = player.profile?.id || null;
  const { data: clubStats, isLoading: clubLoading } = useDetailedPlayerStats(statsTab === "club" ? profileId : null);

  const wins = player.matchesWon || 0;
  const losses = player.matchesLost || 0;
  const played = player.matchesPlayed || 0;
  const winRate = player.winRate || 0;
  const gamesWon = player.gamesWon || 0;
  const gamesLost = player.gamesLost || 0;
  const pointsScored = player.pointsScored || 0;
  const dominanceRatio = gamesLost > 0 ? (gamesWon / gamesLost).toFixed(1) : gamesWon > 0 ? "MAX" : "0";
  const avgPointsPerMatch = played > 0 ? (pointsScored / played).toFixed(1) : "0";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-violet-500/30 bg-slate-950 max-h-[90vh] overflow-y-auto">
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
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-2">
          <div className="flex gap-1 bg-slate-900/80 rounded-xl p-1">
            {[
              { key: "club" as const, label: "Club Ranking", icon: Building2 },
              { key: "tournament" as const, label: "Tournament Stats", icon: Trophy },
            ].map(t => (
              <button key={t.key} onClick={() => setStatsTab(t.key)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                  statsTab === t.key ? "bg-violet-600/30 text-violet-300 shadow-sm border border-violet-500/30" : "text-slate-500 hover:text-slate-300")}
                data-testid={`tab-stats-${t.key}`}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {statsTab === "club" && (
          <div className="p-4 space-y-4">
            {clubLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
            ) : clubStats ? (
              <>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-bold">{clubStats.clubName}</span>
                  <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">{clubStats.grade || clubStats.category || "C3"}</Badge>
                  {clubStats.gender && <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">{clubStats.gender}</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Club Matches", value: `${clubStats.matchesPlayed}`, sub: "Total played", icon: Swords, color: "from-violet-500 to-purple-600", textColor: "text-violet-400" },
                    { label: "Win Rate", value: `${clubStats.winRatio}%`, sub: `${clubStats.matchesWon}W / ${clubStats.matchesLost}L`, icon: Target, color: "from-emerald-500 to-teal-600", textColor: "text-emerald-400" },
                    { label: "Wins", value: `${clubStats.matchesWon}`, sub: "Club sessions", icon: TrendingUp, color: "from-amber-500 to-orange-600", textColor: "text-amber-400" },
                    { label: "Losses", value: `${clubStats.matchesLost}`, sub: "Club sessions", icon: TrendingDown, color: "from-rose-500 to-pink-600", textColor: "text-rose-400" },
                  ].map((kpi, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden">
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

                {clubStats.recentForm.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Recent Club Form</h4>
                    <div className="flex items-center gap-1">
                      {clubStats.recentForm.map((won, i) => (
                        <div key={i} className={cn("h-6 w-6 rounded text-[9px] font-black flex items-center justify-center",
                          won ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>{won ? "W" : "L"}</div>
                      ))}
                    </div>
                  </div>
                )}

                {clubStats.matchHistory.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Club Match History ({clubStats.matchHistory.length})
                    </h4>
                    <div className="space-y-1 max-h-[250px] overflow-y-auto">
                      {clubStats.matchHistory.map((match) => (
                        <div key={match.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/40" data-testid={`club-match-${match.id}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                              match.won ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            )}>{match.won ? "W" : "L"}</div>
                            <div className="min-w-0">
                              <div className="text-xs font-mono font-bold text-slate-300">
                                {match.isTeamA ? `${match.scoreA} - ${match.scoreB}` : `${match.scoreB} - ${match.scoreA}`}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                vs {match.opponent1}{match.opponent2 ? ` & ${match.opponent2}` : ""}
                                {match.partner && <span className="opacity-60"> (w/ {match.partner})</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 shrink-0 text-right">
                            <div className="truncate max-w-[100px]">{match.sessionTitle}</div>
                            {match.completedAt && <div>{format(new Date(match.completedAt), "MMM d, yy")}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No club ranking data available for this player.</p>
              </div>
            )}
          </div>
        )}

        {statsTab === "tournament" && (
          <div className="p-4 space-y-4">
            {played === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No Tournament Matches Yet</p>
                <p className="text-xs text-slate-600 mt-1">Stats will appear once this player completes tournament matches.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Tournament Rank", value: played > 0 ? `#${rank}` : "—", sub: played > 0 ? `of ${totalPlayers}` : "Unranked", icon: Trophy, color: "from-amber-500 to-orange-600", textColor: "text-amber-400" },
                    { label: "Win Rate", value: `${winRate}%`, sub: `${wins}W / ${losses}L`, icon: Target, color: "from-emerald-500 to-teal-600", textColor: "text-emerald-400" },
                    { label: "Matches Played", value: `${played}`, sub: "Tournament", icon: Swords, color: "from-violet-500 to-purple-600", textColor: "text-violet-400" },
                    { label: "Dominance Ratio", value: `${dominanceRatio}`, sub: `${gamesWon}GW / ${gamesLost}GL`, icon: Flame, color: "from-rose-500 to-pink-600", textColor: "text-rose-400" },
                  ].map((kpi, i) => (
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

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-800/60 p-3 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Avg Pts/Match</div>
                    <div className="text-base font-black text-cyan-400">{avgPointsPerMatch}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800/60 p-3 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Games Won</div>
                    <div className="text-base font-black text-amber-400">{gamesWon}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800/60 p-3 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Points Scored</div>
                    <div className="text-base font-black text-emerald-400">{pointsScored}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PairsTab({ tournamentId }: { tournamentId: number }) {
  const { data: user } = useUser();
  const { data: pairs, isLoading } = useTournamentPairs(tournamentId);
  const { data: pairRequests } = useTournamentPairRequests(tournamentId);
  const { data: playerPool } = useTournamentPlayerPool(tournamentId);
  const { data: registrations } = useTournamentRegistrations(tournamentId);
  const respondPairMutation = useRespondPairRequest();
  const sendPairMutation = useSendPairRequest();
  const updatePairNameMutation = useUpdatePairName();
  const { data: adminCheck } = useTournamentIsAdmin(tournamentId);
  const { toast } = useToast();
  const [proposingTo, setProposingTo] = useState<{ userId: number; name: string } | null>(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalPairName, setProposalPairName] = useState("");
  const [poolSearch, setPoolSearch] = useState("");
  const [unpairConfirm, setUnpairConfirm] = useState<{ pairId: number; partnerName: string } | null>(null);
  const [comparisonPairId, setComparisonPairId] = useState<number | null>(null);
  const [comparisonPairNames, setComparisonPairNames] = useState<{ p1: string; p2: string }>({ p1: "", p2: "" });
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingPairId, setEditingPairId] = useState<number | null>(null);
  const [editPairName, setEditPairName] = useState("");
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" || adminCheck?.isAdmin === true;

  const { data: comparisonData, isLoading: compLoading } = useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId, "pair-comparison", comparisonPairId],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/pair-comparison/${comparisonPairId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load pair data");
      return res.json();
    },
    enabled: !!comparisonPairId,
  });

  const unpairMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/unpair`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "pairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "player-pool"] });
      toast({ title: "Pair dissolved", description: data.message });
      setUnpairConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const myRegistration = registrations?.find((r: any) => r.userId === user?.id);
  const myIncomingRequests = pairRequests?.filter((pr: any) => pr.toUserId === user?.id && pr.status === "PENDING") || [];
  const mySentRequests = pairRequests?.filter((pr: any) => pr.fromUserId === user?.id && pr.status === "PENDING") || [];
  const isIndividual = myRegistration && myRegistration.registrationType === "INDIVIDUAL" && !myRegistration.partnerId;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;

  const esportsAccents = [
    { neon: "from-cyan-400 to-blue-500", ring: "ring-cyan-400/30", glow: "shadow-cyan-500/20", dot: "bg-cyan-400", text: "text-cyan-400", border: "border-cyan-500/25" },
    { neon: "from-violet-400 to-purple-500", ring: "ring-violet-400/30", glow: "shadow-violet-500/20", dot: "bg-violet-400", text: "text-violet-400", border: "border-violet-500/25" },
    { neon: "from-blue-400 to-indigo-500", ring: "ring-blue-400/30", glow: "shadow-blue-500/20", dot: "bg-blue-400", text: "text-blue-400", border: "border-blue-500/25" },
    { neon: "from-fuchsia-400 to-pink-500", ring: "ring-fuchsia-400/30", glow: "shadow-fuchsia-500/20", dot: "bg-fuchsia-400", text: "text-fuchsia-400", border: "border-fuchsia-500/25" },
    { neon: "from-emerald-400 to-teal-500", ring: "ring-emerald-400/30", glow: "shadow-emerald-500/20", dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-500/25" },
    { neon: "from-amber-400 to-orange-500", ring: "ring-amber-400/30", glow: "shadow-amber-500/20", dot: "bg-amber-400", text: "text-amber-400", border: "border-amber-500/25" },
  ];

  function getPairQuality(p1Power: number, p2Power: number) {
    const avg = (p1Power + p2Power) / 2;
    const diff = Math.abs(p1Power - p2Power);
    if (avg >= 75 && diff <= 15) return { label: "STRONG", gradient: "from-emerald-400 to-cyan-400", text: "text-emerald-300", glow: "shadow-emerald-500/30" };
    if (diff <= 20) return { label: "BALANCED", gradient: "from-blue-400 to-violet-400", text: "text-blue-300", glow: "shadow-blue-500/30" };
    return { label: "VOLATILE", gradient: "from-amber-400 to-orange-400", text: "text-amber-300", glow: "shadow-amber-500/30" };
  }

  function getTeamSynergy(p1Power: number, p2Power: number) {
    const avg = (p1Power + p2Power) / 2;
    const diff = Math.abs(p1Power - p2Power);
    const synergy = Math.max(0, Math.min(100, Math.round(avg - diff * 0.5)));
    let color: string;
    if (synergy >= 75) color = "from-emerald-400 via-cyan-400 to-emerald-400";
    else if (synergy >= 50) color = "from-blue-400 via-violet-400 to-blue-400";
    else color = "from-amber-400 via-orange-400 to-amber-400";
    return { synergy, color };
  }

  const loadAiAnalysis = async () => {
    if (!comparisonPairId) return;
    setAiLoading(true);
    try {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/pair-analysis/${comparisonPairId}`);
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch {
      setAiAnalysis("Unable to generate AI analysis at this time.");
    }
    setAiLoading(false);
  };

  function getPlayerPowerLevel(grade: string, matchesPlayed: number, matchesWon: number) {
    const gradeScores: Record<string, number> = { "A1": 95, "A2": 88, "A3": 82, "B1": 75, "B2": 68, "B3": 62, "C1": 55, "C2": 48, "C3": 40, "D": 25 };
    const gradeScore = gradeScores[grade] || 30;
    const winRate = matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0;
    const expBonus = Math.min(matchesPlayed * 0.3, 10);
    const power = Math.min(Math.round(gradeScore * 0.6 + winRate * 0.3 + expBonus), 100);

    let label: string, color: string, bgColor: string;
    if (power >= 85) { label = "Elite"; color = "text-amber-400"; bgColor = "bg-amber-400"; }
    else if (power >= 70) { label = "Advanced"; color = "text-emerald-400"; bgColor = "bg-emerald-400"; }
    else if (power >= 55) { label = "Skilled"; color = "text-blue-400"; bgColor = "bg-blue-400"; }
    else if (power >= 40) { label = "Developing"; color = "text-violet-400"; bgColor = "bg-violet-400"; }
    else { label = "Rising Star"; color = "text-cyan-400"; bgColor = "bg-cyan-400"; }
    return { power, label, color, bgColor };
  }

  return (
    <div className="space-y-6">
      {myIncomingRequests.length > 0 && (
        <div className="space-y-3" data-testid="pairs-incoming-requests">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Incoming Pair Requests</h3>
            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-bold">{myIncomingRequests.length}</Badge>
          </div>
          {myIncomingRequests.map((pr: any) => (
            <div key={pr.id} className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10 p-4" data-testid={`pairs-incoming-${pr.id}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar name={pr.fromUser?.fullName || "?"} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{pr.fromUser?.fullName}</p>
                    <p className="text-xs text-muted-foreground">wants to pair with you</p>
                    {pr.pairName && <p className="text-xs text-amber-500 font-bold mt-0.5">Team: "{pr.pairName}"</p>}
                    {pr.message && <p className="text-xs text-muted-foreground mt-0.5 italic">"{pr.message}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white h-9 font-bold shadow-lg shadow-emerald-500/20 border-0"
                    disabled={respondPairMutation.isPending}
                    data-testid={`button-pairs-accept-${pr.id}`}
                    onClick={async () => {
                      try {
                        await respondPairMutation.mutateAsync({ id: pr.id, status: "ACCEPTED" });
                        toast({ title: "Pair Confirmed!", description: `You're now paired with ${pr.fromUser?.fullName}.` });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <Check className="h-4 w-4 mr-1" />Accept
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                    disabled={respondPairMutation.isPending}
                    data-testid={`button-pairs-decline-${pr.id}`}
                    onClick={async () => {
                      try {
                        await respondPairMutation.mutateAsync({ id: pr.id, status: "DECLINED" });
                        toast({ title: "Request Declined" });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <X className="h-4 w-4 mr-1" />Decline
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mySentRequests.length > 0 && (
        <div className="space-y-3" data-testid="pairs-sent-requests">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Your Sent Requests</h3>
          {mySentRequests.map((pr: any) => (
            <div key={pr.id} className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10 p-4 flex items-center justify-between gap-3" data-testid={`pairs-sent-${pr.id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <PlayerAvatar name={pr.toUser?.fullName || "?"} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{pr.toUser?.fullName}</p>
                  <p className="text-xs text-muted-foreground">Waiting for their response</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-bold flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />Pending
              </Badge>
            </div>
          ))}
        </div>
      )}

      {isIndividual && playerPool && playerPool.length > 0 && (
        <div className="space-y-3" data-testid="pairs-player-pool">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Find a Partner</h3>
              </div>
              <p className="text-[10px] text-muted-foreground ml-8">Send a pair request to any available player</p>
            </div>
            <Badge variant="outline" className="font-bold">{playerPool.filter((p: any) => p.userId !== user?.id).length} available</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search players..." value={poolSearch} onChange={e => setPoolSearch(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors"
              data-testid="input-pairs-pool-search" />
          </div>
          <div className="rounded-xl border border-border/50 overflow-hidden divide-y divide-border/20">
            {playerPool.filter((p: any) => {
              if (p.userId === user?.id) return false;
              if (poolSearch) return p.user?.fullName?.toLowerCase().includes(poolSearch.toLowerCase());
              return true;
            }).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors" data-testid={`pairs-pool-player-${p.userId}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar name={p.user?.fullName || "?"} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{p.user?.fullName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <GradeTierBadge grade={p.profile?.currentGrade || "—"} />
                    </div>
                  </div>
                </div>
                {pairRequests?.some((pr: any) => pr.fromUserId === user?.id && pr.toUserId === p.userId && pr.status === "PENDING") ? (
                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-bold">
                    <Clock className="h-3 w-3 mr-1" />Pending
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold"
                    data-testid={`button-pairs-propose-${p.userId}`}
                    onClick={() => setProposingTo({ userId: p.userId, name: p.user?.fullName || "Player" })}>
                    <UserPlus className="h-3 w-3 mr-1" />Propose
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {proposingTo && (
        <Dialog open onOpenChange={() => { setProposingTo(null); setProposalMessage(""); setProposalPairName(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Propose Partner
              </DialogTitle>
              <DialogDescription>Send a pair request to {proposingTo.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Team Name (optional)</label>
                <input type="text" value={proposalPairName} onChange={e => setProposalPairName(e.target.value)} placeholder="e.g. Thunder Smash"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40"
                  data-testid="input-pairs-team-name" />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Message (optional)</label>
                <textarea value={proposalMessage} onChange={e => setProposalMessage(e.target.value)} placeholder="Hey, want to team up?"
                  className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 resize-none"
                  data-testid="input-pairs-message" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setProposingTo(null); setProposalMessage(""); setProposalPairName(""); }}>Cancel</Button>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-0"
                disabled={sendPairMutation.isPending}
                data-testid="button-pairs-send-request"
                onClick={async () => {
                  try {
                    await sendPairMutation.mutateAsync({ tournamentId, toUserId: proposingTo.userId, message: proposalMessage || undefined, pairName: proposalPairName || undefined });
                    toast({ title: "Pair Request Sent!", description: "They'll receive a notification." });
                    setProposingTo(null); setProposalMessage(""); setProposalPairName("");
                  } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                }}>
                {sendPairMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {pairs && pairs.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)" }}
          >
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 esports-status-dot" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-violet-400/80">Tournament Arena</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Confirmed Pairs</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Elite duos locked in for competition</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-md" />
                  <div className="relative h-12 px-4 rounded-xl border border-violet-500/20 flex items-center gap-2" style={{ background: "rgba(139, 92, 246, 0.08)" }}>
                    <Swords className="h-4 w-4 text-violet-400" />
                    <span className="text-xl font-black text-white">{pairs.length}</span>
                    <span className="text-[9px] uppercase tracking-wider text-violet-300/70 font-bold">Teams</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pairs.map((pair: any, idx: number) => {
              const p1Name = pair.user1?.fullName || "Player 1";
              const p2Name = pair.user2?.fullName || "Player 2";
              const accentIdx = idx % esportsAccents.length;
              const accent = esportsAccents[accentIdx];
              const pairedDate = pair.createdAt ? format(new Date(pair.createdAt), "d MMM yyyy") : null;
              const isMyPair = user && (pair.user1?.id === user.id || pair.user2?.id === user.id);
              const partnerInPair = isMyPair
                ? (pair.user1?.id === user.id ? pair.user2?.fullName : pair.user1?.fullName)
                : null;

              const p1Level = getPlayerPowerLevel(
                pair.profile1?.grade || pair.profile1?.currentGrade || "C3",
                pair.profile1?.matchesPlayed || 0,
                pair.profile1?.matchesWon || 0
              );
              const p2Level = getPlayerPowerLevel(
                pair.profile2?.grade || pair.profile2?.currentGrade || "C3",
                pair.profile2?.matchesPlayed || 0,
                pair.profile2?.matchesWon || 0
              );
              const quality = getPairQuality(p1Level.power, p2Level.power);
              const synergy = getTeamSynergy(p1Level.power, p2Level.power);
              const teamName = pair.pairName || `${p1Name.split(" ")[0]} & ${p2Name.split(" ")[0]}`;
              const isFeatured = synergy.synergy >= 75;

              return (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ scale: 1.025, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  role="button"
                  tabIndex={0}
                  className={cn("group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 rounded-2xl", isFeatured && "esports-card")}
                  data-testid={`pair-card-${idx}`}
                  onClick={() => {
                    setComparisonPairId(pair.id);
                    setComparisonPairNames({ p1: p1Name, p2: p2Name });
                    setAiAnalysis(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setComparisonPairId(pair.id);
                      setComparisonPairNames({ p1: p1Name, p2: p2Name });
                      setAiAnalysis(null);
                    }
                  }}
                >
                  <div className={cn(
                    "relative rounded-2xl overflow-hidden transition-all duration-300",
                    "shadow-lg group-hover:shadow-2xl",
                    accent.glow
                  )} style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f0f1a 100%)" }}>
                    <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity esports-border-glow", accent.neon)} />
                    <div className={cn("absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r opacity-20 group-hover:opacity-40 transition-opacity", accent.neon)} />
                    <div className={cn("absolute top-0 left-0 w-px h-full bg-gradient-to-b opacity-30 group-hover:opacity-60 transition-opacity", accent.neon)} />
                    <div className={cn("absolute top-0 right-0 w-px h-full bg-gradient-to-b opacity-15 group-hover:opacity-30 transition-opacity", accent.neon)} />

                    {isFeatured && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25">
                          <Flame className="h-2.5 w-2.5 text-amber-400" />
                          <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">Featured</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 esports-shimmer-line opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="relative p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">#{idx + 1}</span>
                          <div className="flex items-center gap-1.5">
                            {isMyPair && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setUnpairConfirm({ pairId: pair.id, partnerName: partnerInPair || "your partner" }); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 text-[9px] font-medium hover:bg-red-500/15 transition-colors"
                                aria-label={`Unpair from ${partnerInPair || "your partner"}`}
                                data-testid={`button-unpair-${idx}`}
                              >
                                <UserMinus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={cn("relative overflow-hidden px-2.5 py-1 rounded-full", quality.glow)} style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className={cn("absolute inset-0 bg-gradient-to-r opacity-15", quality.gradient)} />
                          <span className={cn("relative text-[9px] font-black uppercase tracking-wider", quality.text)}>{quality.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        {editingPairId === pair.id ? (
                          <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              type="text"
                              value={editPairName}
                              onChange={(e) => setEditPairName(e.target.value)}
                              maxLength={50}
                              placeholder="Enter team name..."
                              className="flex-1 h-8 px-2 rounded-lg bg-white/[0.06] border border-white/[0.12] text-sm font-bold text-white placeholder:text-slate-500 outline-none focus:border-amber-500/50"
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") {
                                  updatePairNameMutation.mutate({ tournamentId, pairId: pair.id, pairName: editPairName }, {
                                    onSuccess: () => { toast({ title: "Team name updated" }); setEditingPairId(null); },
                                    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
                                  });
                                }
                                if (e.key === "Escape") setEditingPairId(null);
                              }}
                              data-testid={`input-pair-name-${idx}`}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePairNameMutation.mutate({ tournamentId, pairId: pair.id, pairName: editPairName }, {
                                  onSuccess: () => { toast({ title: "Team name updated" }); setEditingPairId(null); },
                                  onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
                                });
                              }}
                              disabled={updatePairNameMutation.isPending}
                              className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                              data-testid={`button-save-pair-name-${idx}`}
                            >
                              {updatePairNameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingPairId(null); }}
                              className="h-8 w-8 rounded-lg bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                              data-testid={`button-cancel-pair-name-${idx}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-black tracking-wide truncate flex-1" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} data-testid={`pair-name-${idx}`}>
                              {p1Name} & {p2Name}
                            </h3>
                            {(isMyPair || isAdmin) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingPairId(pair.id); setEditPairName(pair.pairName || ""); }}
                                className="flex-shrink-0 h-7 w-7 rounded-lg bg-white/[0.04] text-slate-400 hover:text-amber-400 hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                                aria-label="Edit team name"
                                data-testid={`button-edit-pair-name-${idx}`}
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div
                        className="flex items-center"
                        data-testid={`pair-compare-trigger-${idx}`}
                      >
                        {[{ name: p1Name, profile: pair.profile1, level: p1Level }, { name: p2Name, profile: pair.profile2, level: p2Level }].map((player, pi) => (
                          <div key={pi} className="flex-1 flex flex-col items-center text-center px-1">
                            <div className="relative mb-2">
                              <div className={cn("absolute -inset-1.5 rounded-full bg-gradient-to-br opacity-30 group-hover:opacity-50 transition-opacity blur-sm", accent.neon)} />
                              <div className={cn("relative ring-2 rounded-full", accent.ring)}>
                                <PlayerAvatar name={player.name} size="xl" />
                              </div>
                              <div className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-6 rounded-full blur-sm opacity-50", accent.dot)} />
                            </div>
                            <p className="text-sm font-bold text-white truncate max-w-[90px] leading-tight">{player.name}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <GradeTierBadge grade={player.profile?.currentGrade || "—"} />
                            </div>
                            <div className="mt-2 w-full max-w-[80px]">
                              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${player.level.power}%` }}
                                  transition={{ duration: 0.8, delay: 0.3 + idx * 0.07, ease: "easeOut" }}
                                  className={cn("h-full rounded-full", player.level.bgColor)}
                                  style={{ opacity: 0.85 }}
                                />
                              </div>
                              <span className={cn("text-[8px] font-bold uppercase tracking-wider mt-0.5 block", player.level.color)}>{player.level.label}</span>
                            </div>
                          </div>
                        )).reduce((prev: any, curr: any, i: number) => i === 0 ? [curr] : [...prev, (
                          <div key="vs" className="flex flex-col items-center mx-1 flex-shrink-0">
                            <div className="relative">
                              <div className="absolute -inset-2 bg-gradient-to-b from-violet-500/10 to-transparent rounded-full blur-md" />
                              <div className="relative h-8 w-8 rounded-full border border-white/[0.08] flex items-center justify-center" style={{ background: "rgba(139, 92, 246, 0.1)" }}>
                                <span className="text-[10px] font-black text-violet-300/80 tracking-wider">VS</span>
                              </div>
                            </div>
                          </div>
                        ), curr], [] as any[])}
                      </div>

                      <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-violet-400" />
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Team Synergy</span>
                          </div>
                          <span className="text-[10px] font-black text-white/80">{synergy.synergy}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${synergy.synergy}%` }}
                            transition={{ duration: 1, delay: 0.5 + idx * 0.07, ease: "easeOut" }}
                            className={cn("h-full rounded-full bg-gradient-to-r esports-synergy-bar", synergy.color)}
                            style={{ opacity: 0.9 }}
                          />
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 esports-status-dot" />
                            <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider">Ready</span>
                          </div>
                          {pairedDate && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-500">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>{pairedDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {(!pairs || pairs.length === 0) && myIncomingRequests.length === 0 && mySentRequests.length === 0 && (!isIndividual || !playerPool || playerPool.length === 0) && (
        <EmptyState icon={UserPlus} title="No Pairs Yet" description={myRegistration ? "No confirmed pairs yet. Other players will appear here once they register." : "No confirmed pairs yet. Register as an individual in the Sign-Up tab to find a partner."} />
      )}

      <Dialog open={!!unpairConfirm} onOpenChange={(open) => { if (!open) setUnpairConfirm(null); }}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-unpair-confirm">
          <DialogHeader>
            <DialogTitle>Break Pair?</DialogTitle>
            <DialogDescription>
              Are you sure you want to unpair from {unpairConfirm?.partnerName}? Both of you will be moved back to individual registrations and will appear in the player pool again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUnpairConfirm(null)} data-testid="button-cancel-unpair">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => unpairMutation.mutate()}
              disabled={unpairMutation.isPending}
              data-testid="button-confirm-unpair"
            >
              {unpairMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserMinus className="h-4 w-4 mr-1" />}
              Unpair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!comparisonPairId} onOpenChange={(open) => { if (!open) { setComparisonPairId(null); setAiAnalysis(null); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="dialog-pair-comparison">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Pair Comparison
            </DialogTitle>
            <DialogDescription>
              Side-by-side stats for {comparisonPairNames.p1} &amp; {comparisonPairNames.p2}
            </DialogDescription>
          </DialogHeader>

          {compLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : comparisonData ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[comparisonData.player1, comparisonData.player2].map((p: any, pi: number) => {
                  const pLevel = getPlayerPowerLevel(p.grade, p.matchesPlayed, p.matchesWon);
                  const winRate = p.matchesPlayed > 0 ? Math.round(p.matchesWon / p.matchesPlayed * 100) : 0;
                  return (
                    <div key={pi} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3" data-testid={`comparison-player-${pi}`}>
                      <div className="flex flex-col items-center text-center">
                        <PlayerAvatar name={p.user.fullName} size="lg" />
                        <h4 className="text-sm font-bold text-foreground mt-2">{p.user.fullName}</h4>
                        <div className="mt-1"><GradeTierBadge grade={p.grade} /></div>
                        <div className="mt-2 flex items-center gap-1">
                          <Zap className={cn("h-3.5 w-3.5", pLevel.color)} />
                          <div className="w-16 h-2.5 rounded-full bg-muted/50 dark:bg-white/[0.08] overflow-hidden">
                            <div className={cn("h-full rounded-full", pLevel.bgColor)} style={{ width: `${pLevel.power}%`, opacity: 0.85 }} />
                          </div>
                          <span className={cn("text-[9px] font-bold", pLevel.color)}>{pLevel.power}%</span>
                        </div>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", pLevel.color)}>{pLevel.label}</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Matches</span>
                          <span className="font-semibold">{p.matchesPlayed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Wins</span>
                          <span className="font-semibold text-green-500">{p.matchesWon}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Win Rate</span>
                          <span className="font-semibold">{winRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Ranking Pts</span>
                          <span className="font-semibold">{p.rankingPoints}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Avg Score For</span>
                          <span className="font-semibold">{p.stats.avgScoreFor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Avg Score Against</span>
                          <span className="font-semibold">{p.stats.avgScoreAgainst}</span>
                        </div>
                        {p.stats.recentForm && p.stats.recentForm.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-[10px]">Recent Form</span>
                            <div className="flex gap-0.5 mt-0.5">
                              {p.stats.recentForm.map((r: string, ri: number) => (
                                <span key={ri} className={cn("text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center", r === "W" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>{r}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {comparisonData.pairStats.played > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3" data-testid="pair-together-stats">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">Together as a Pair</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <div className="text-lg font-bold text-foreground">{comparisonData.pairStats.played}</div>
                      <div className="text-muted-foreground">Played</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-500">{comparisonData.pairStats.won}</div>
                      <div className="text-muted-foreground">Won</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-400">{comparisonData.pairStats.winRate}%</div>
                      <div className="text-muted-foreground">Win Rate</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border/30 pt-4" data-testid="pair-ai-section">
                {aiAnalysis ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      <span className="text-sm font-bold text-foreground">AI Partnership Analysis</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                    onClick={loadAiAnalysis}
                    disabled={aiLoading}
                    data-testid="button-ai-analysis"
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {aiLoading ? "Analysing Partnership..." : "Generate AI Analysis"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No comparison data available.</p>
          )}
        </DialogContent>
      </Dialog>
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
  const [proposingTo, setProposingTo] = useState<{ userId: number; name: string } | null>(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalPairName, setProposalPairName] = useState("");

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

  async function handleSendPairRequest(toUserId: number, message?: string, pairName?: string) {
    try {
      await sendPairMutation.mutateAsync({ tournamentId, toUserId, message: message || undefined, pairName: pairName || undefined });
      toast({ title: "Pair Request Sent!", description: "They'll receive a notification and a message." });
      setProposingTo(null);
      setProposalMessage("");
      setProposalPairName("");
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
            {tournament.entryFee && parseFloat(tournament.entryFee) > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 mx-auto">
                <Banknote className="h-4 w-4 text-amber-500" />
                {tournament.externalEntryFee && parseFloat(tournament.externalEntryFee) > 0 && parseFloat(tournament.externalEntryFee) !== parseFloat(tournament.entryFee) ? (
                  <span className="text-sm font-bold text-foreground">
                    Members: <span className="text-amber-500">£{parseFloat(tournament.entryFee).toFixed(2)}</span>
                    <span className="text-muted-foreground mx-1">·</span>
                    External: <span className="text-amber-500">£{parseFloat(tournament.externalEntryFee).toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="text-sm font-bold text-foreground">Entry Fee: <span className="text-amber-500">£{parseFloat(tournament.entryFee).toFixed(2)}</span></span>
                )}
              </div>
            )}
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
              <p className="text-xs text-muted-foreground">
                Status: {myRegistration.status} · Type: {myRegistration.registrationType}
                {tournament.entryFee && parseFloat(tournament.entryFee) > 0 && ` · Fee: £${parseFloat(tournament.entryFee).toFixed(2)}`}
              </p>
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
                {pairRequests?.some((pr: any) => pr.fromUserId === user?.id && pr.toUserId === p.userId && pr.status === "PENDING") ? (
                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-bold">
                    <Clock className="h-3 w-3 mr-1" />Pending
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold"
                    data-testid={`button-propose-pair-${p.userId}`}
                    onClick={() => setProposingTo({ userId: p.userId, name: p.user?.fullName || "Player" })}>
                    <UserPlus className="h-3 w-3 mr-1" />Propose
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {proposingTo && (
        <Dialog open onOpenChange={() => { setProposingTo(null); setProposalMessage(""); setProposalPairName(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Propose Partner
              </DialogTitle>
              <DialogDescription>Send a pair request to {proposingTo.name} for this tournament.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <PlayerAvatar name={proposingTo.name} size="md" />
                <div>
                  <p className="text-sm font-bold text-foreground">{proposingTo.name}</p>
                  <p className="text-xs text-muted-foreground">Will be notified via in-app message</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Team Name (optional)</label>
                <input
                  type="text"
                  placeholder='e.g. "The Smashers", "Dynamic Duo"'
                  value={proposalPairName}
                  onChange={(e) => setProposalPairName(e.target.value)}
                  maxLength={50}
                  className="w-full rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors p-3"
                  data-testid="input-pair-name"
                />
                <p className="text-[10px] text-muted-foreground">Give your pair a fun team name!</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Message (optional)</label>
                <textarea
                  placeholder="Hey! Want to team up for this tournament?"
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors p-3 resize-none"
                  data-testid="input-pair-message"
                />
                <p className="text-[10px] text-muted-foreground text-right">{proposalMessage.length}/200</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setProposingTo(null); setProposalMessage(""); setProposalPairName(""); }}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-0"
                  disabled={sendPairMutation.isPending}
                  data-testid="button-send-pair-request"
                  onClick={() => handleSendPairRequest(proposingTo.userId, proposalMessage, proposalPairName)}>
                  {sendPairMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                  Send Proposal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
  const { data: courts } = useTournamentCourts(tournamentId);
  const { data: allGroups = [] } = useTournamentGroups(tournamentId);
  // Show every group from the Groups tab (groups without a category are also included).
  const categoryGroups = (allGroups as any[]).filter((g: any) => !g.categoryId || g.categoryId === category.id);
  const assignCourtMutation = useAssignMatchCourt();
  const updateStatusMutation = useUpdateMatchStatus();
  const updateTimeMutation = useUpdateMatchScheduledTime();
  const bulkUpdateTimeMutation = useBulkUpdateMatchScheduledTime();
  const [bulkTimeBySection, setBulkTimeBySection] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<"bracket" | "standings" | "list">(
    category.format === "KNOCKOUT" ? "bracket" : category.format === "GROUP_KNOCKOUT" ? "standings" : "list"
  );
  const scoreMutation = useScoreMatch();
  const addGroupMatchMutation = useAddGroupMatch();
  const { toast } = useToast();
  const [scoreDialog, setScoreDialog] = useState<any>(null);
  const [addMatchDialog, setAddMatchDialog] = useState<{ groupNumber?: number; subGroupNumber?: number } | null>(null);
  const [addMatchTeamA, setAddMatchTeamA] = useState<number | "">("");
  const [addMatchTeamB, setAddMatchTeamB] = useState<number | "">("");
  const [addMatchGroupNumber, setAddMatchGroupNumber] = useState<number | "">("");

  const handleAssignCourt = (matchId: number, courtId: number | null) => {
    assignCourtMutation.mutate({ matchId, courtId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
        toast({ title: courtId ? "Court assigned" : "Court removed" });
      },
    });
  };

  const handleUpdateStatus = (matchId: number, status: string) => {
    updateStatusMutation.mutate({ matchId, status }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
        toast({ title: status === "LIVE" ? "Match started" : "Match paused" });
      },
    });
  };

  const matches = matchList || [];
  const groupMatches = matches.filter(m => m.groupNumber && m.groupNumber < 100);
  const qfMatches = matches.filter(m => m.round === 200);
  const semiMatches = matches.filter(m => m.round === 300);
  const finalMatches = matches.filter(m => m.round === 400);
  const knockoutMatches = matches.filter(m => m.round >= 200);
  const hasQF = qfMatches.length > 0;
  const hasSemiFinals = semiMatches.length > 0;
  const hasFinal = finalMatches.length > 0;

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
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.08)_0%,_transparent_70%)]" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
          <div className="relative flex items-center gap-3 flex-wrap">
            <button
              onClick={onGenerateMatches}
              disabled={isGenerating}
              className={cn(
                "group relative px-6 py-3 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all duration-300",
                "bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500",
                "shadow-[0_0_20px_rgba(6,182,212,0.3),_0_0_40px_rgba(139,92,246,0.15)]",
                "hover:shadow-[0_0_30px_rgba(6,182,212,0.5),_0_0_60px_rgba(139,92,246,0.25),_0_0_80px_rgba(217,70,239,0.15)]",
                "hover:scale-[1.03] active:scale-[0.98]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none",
                "text-white border border-white/10",
              )}
              data-testid="button-start-tournament"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/20 via-transparent to-fuchsia-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500" />
              <span className="relative flex items-center gap-2">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] group-hover:animate-pulse" />
                )}
                {matches.length > 0 ? "Regenerate Fixtures" : category.format === "GROUP_KNOCKOUT" ? "Generate Group Stage" : "Start Tournament"}
              </span>
            </button>
            {category.format !== "ROUND_ROBIN" && matches.length > 0 && !hasFinal && (
              <button
                onClick={onAdvanceWinners}
                disabled={isAdvancing}
                className={cn(
                  "group relative px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300",
                  "bg-slate-900/80 border border-amber-500/30 text-amber-400",
                  "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
                  "hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:border-amber-400/50",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                )}
                data-testid="button-advance-winners"
              >
                <span className="relative flex items-center gap-2">
                  {isAdvancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" />}
                  {category.format === "GROUP_KNOCKOUT"
                    ? (hasSemiFinals ? "Generate Final" : hasQF ? "Generate Semi-Finals" : "Generate Quarter-Finals")
                    : "Advance Winners"}
                </span>
              </button>
            )}
            <button
              onClick={async () => {
                if (!window.confirm("Clear all matches and standings for this category? Groups and pair assignments will be kept. You can then click Regenerate Fixtures to rebuild matches for every group.")) return;
                try {
                  const res = await apiRequest("POST", `/api/tournament-categories/${category.id}/clear-matches`);
                  const data = await res.json();
                  toast({ title: "Matches Cleared", description: data.message || "All matches and standings have been cleared." });
                  queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "standings"] });
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
              className={cn(
                "group relative px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300",
                "bg-slate-900/80 border border-rose-500/40 text-rose-400",
                "hover:shadow-[0_0_25px_rgba(244,63,94,0.25)] hover:border-rose-400/70",
                "hover:scale-[1.02] active:scale-[0.98]",
              )}
              data-testid="button-clear-matches"
            >
              <span className="relative flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Clear All Matches
              </span>
            </button>
            {(category.format === "GROUP_KNOCKOUT" || category.format === "ROUND_ROBIN") && (
              <button
                onClick={() => {
                  setAddMatchTeamA("");
                  setAddMatchTeamB("");
                  setAddMatchGroupNumber("");
                  setAddMatchDialog({});
                }}
                className={cn(
                  "group relative px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300",
                  "bg-slate-900/80 border border-cyan-500/40 text-cyan-300",
                  "hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:border-cyan-400/70",
                  "hover:scale-[1.02] active:scale-[0.98]",
                )}
                data-testid="button-add-match-manual"
              >
                <span className="relative flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add Match Manually
                </span>
              </button>
            )}
            {teams && teams.length > 0 && (
              <span className="text-[10px] font-bold text-slate-500 ml-auto">{teams.length} teams ready</span>
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

      {activeView === "standings" && (
        <StandingsView standings={standings || []} teams={teams || []} category={category} groups={categoryGroups} />
      )}

      {activeView === "list" && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <EmptyState icon={Swords} title="No Matches" description="Generate fixtures to create matches." />
          ) : (
            (() => {
              const displayMatches = matches.filter(m => {
                if (m.isBye) return false;
                if (!m.groupNumber && !m.teamAId && !m.teamBId) return false;
                return true;
              });
              const grpMatches = displayMatches.filter(m => m.groupNumber && m.groupNumber < 100);
              const koMatches = displayMatches.filter(m => !m.groupNumber || m.round >= 100);

              const allKoRounds = new Set(matches.filter(m => !m.groupNumber || m.round >= 100).map(m => m.round));
              const allKoRoundsSorted = Array.from(allKoRounds).sort((a, b) => a - b);
              const totalKoRounds = allKoRoundsSorted.length;

              function getKoLabel(round: number) {
                const idx = allKoRoundsSorted.indexOf(round);
                const fromEnd = totalKoRounds - idx;
                if (fromEnd === 1) return "Final";
                if (fromEnd === 2) return "Semi Finals";
                if (fromEnd === 3) return "Quarter Finals";
                if (fromEnd === 4) return "Round of 16";
                if (fromEnd === 5) return "Round of 32";
                return `Round ${idx + 1}`;
              }

              const sections: { key: string; label: string; color: string; matches: typeof displayMatches; groupNumber?: number; subGroupNumber?: number }[] = [];

              if (grpMatches.length > 0) {
                const sgMap = new Map<string, typeof grpMatches>();
                grpMatches.forEach(m => {
                  const k = `${m.groupNumber}-${m.subGroupNumber || 1}`;
                  if (!sgMap.has(k)) sgMap.set(k, []);
                  sgMap.get(k)!.push(m);
                });
                const sgKeys = Array.from(sgMap.keys()).sort();
                for (const k of sgKeys) {
                  const [g, sg] = k.split("-").map(Number);
                  const hasMultipleSg = sgKeys.filter(sk => sk.startsWith(`${g}-`)).length > 1;
                  const label = hasMultipleSg
                    ? `Group ${String.fromCharCode(64 + g)} · Subgroup ${sg}`
                    : `Group ${String.fromCharCode(64 + g)}`;
                  sections.push({ key: k, label, color: "violet", matches: sgMap.get(k)!, groupNumber: g, subGroupNumber: sg });
                }
              }

              const qfDisplayMatches = displayMatches.filter(m => m.round === 200);
              if (qfDisplayMatches.length > 0) {
                const qfGroupMap = new Map<number, typeof qfDisplayMatches>();
                qfDisplayMatches.forEach(m => {
                  const g = m.groupNumber || 200;
                  if (!qfGroupMap.has(g)) qfGroupMap.set(g, []);
                  qfGroupMap.get(g)!.push(m);
                });
                const qfGroupKeys = Array.from(qfGroupMap.keys()).sort((a, b) => a - b);
                qfGroupKeys.forEach((gNum, idx) => {
                  const label = qfGroupKeys.length > 1 ? `Quarter-Finals · Group ${String.fromCharCode(65 + idx)}` : "Quarter-Finals";
                  sections.push({ key: `qf-${gNum}`, label, color: "amber", matches: qfGroupMap.get(gNum)!, groupNumber: gNum, subGroupNumber: 1 });
                });
              }

              const semiDisplayMatches = displayMatches.filter(m => m.round === 300);
              if (semiDisplayMatches.length > 0) {
                const semiGroupMap = new Map<number, typeof semiDisplayMatches>();
                semiDisplayMatches.forEach(m => {
                  const g = m.groupNumber || 300;
                  if (!semiGroupMap.has(g)) semiGroupMap.set(g, []);
                  semiGroupMap.get(g)!.push(m);
                });
                const semiGroupKeys = Array.from(semiGroupMap.keys()).sort((a, b) => a - b);
                semiGroupKeys.forEach((gNum, idx) => {
                  const label = semiGroupKeys.length > 1 ? `Semi-Finals · Group ${String.fromCharCode(65 + idx)}` : "Semi-Finals";
                  sections.push({ key: `semi-${gNum}`, label, color: "amber", matches: semiGroupMap.get(gNum)!, groupNumber: gNum, subGroupNumber: 1 });
                });
              }

              const finalDisplayMatches = displayMatches.filter(m => m.round === 400);
              if (finalDisplayMatches.length > 0) {
                sections.push({ key: "final", label: "Final", color: "amber", matches: finalDisplayMatches, groupNumber: 400 });
              }

              const otherKoMatches = displayMatches.filter(m =>
                m.round >= 100 && m.round !== 200 && m.round !== 300 && m.round !== 400 && (!m.groupNumber || m.groupNumber >= 100)
              );
              if (otherKoMatches.length > 0) {
                const koRoundMap = new Map<number, typeof otherKoMatches>();
                otherKoMatches.forEach(m => {
                  const r = m.round;
                  if (!koRoundMap.has(r)) koRoundMap.set(r, []);
                  koRoundMap.get(r)!.push(m);
                });
                Array.from(koRoundMap.entries()).sort(([a], [b]) => a - b).forEach(([round, ms]) => {
                  sections.push({ key: `ko-${round}`, label: getKoLabel(round), color: "amber", matches: ms });
                });
              }

              if (sections.length === 0) {
                return <EmptyState icon={Swords} title="No Matches" description="Generate fixtures to create matches." />;
              }

              return sections.map(sec => (
                <div key={sec.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("h-px flex-1 bg-gradient-to-r to-transparent", sec.color === "amber" ? "from-amber-500/30" : "from-violet-500/30")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-2", sec.color === "amber" ? "text-amber-400" : "text-violet-400")}>{sec.label}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">{sec.matches.length} {sec.matches.length === 1 ? "match" : "matches"}</span>
                    {canManage && sec.groupNumber && (
                      <button
                        onClick={() => {
                          setAddMatchTeamA("");
                          setAddMatchTeamB("");
                          setAddMatchDialog({ groupNumber: sec.groupNumber!, subGroupNumber: sec.subGroupNumber || 1 });
                        }}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        data-testid={`button-add-group-match-${sec.key}`}
                      >
                        <Plus className="h-3 w-3" /> Add Match
                      </button>
                    )}
                    <div className={cn("h-px flex-1 bg-gradient-to-l to-transparent", sec.color === "amber" ? "from-amber-500/30" : "from-violet-500/30")} />
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg border border-border/40 bg-muted/30">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] font-bold text-muted-foreground">Bulk set time:</span>
                      <Input
                        type="datetime-local"
                        value={bulkTimeBySection[sec.key] || ""}
                        onChange={(e) => setBulkTimeBySection(prev => ({ ...prev, [sec.key]: e.target.value }))}
                        className="h-7 text-xs flex-1 min-w-[180px] max-w-[240px]"
                        data-testid={`input-bulk-time-${sec.key}`}
                      />
                      <Button
                        size="sm"
                        className="h-7 text-[10px] font-bold"
                        disabled={!bulkTimeBySection[sec.key] || bulkUpdateTimeMutation.isPending}
                        onClick={() => {
                          const val = bulkTimeBySection[sec.key];
                          if (!val) return;
                          const iso = new Date(val).toISOString();
                          bulkUpdateTimeMutation.mutate(
                            { matchIds: sec.matches.map(m => m.id), scheduledTime: iso, tournamentId },
                            {
                              onSuccess: () => {
                                toast({ title: `Updated ${sec.matches.length} matches` });
                                queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                              },
                              onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                            }
                          );
                        }}
                        data-testid={`button-apply-bulk-time-${sec.key}`}
                      >
                        Apply to all
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px]"
                        disabled={bulkUpdateTimeMutation.isPending}
                        onClick={() => {
                          bulkUpdateTimeMutation.mutate(
                            { matchIds: sec.matches.map(m => m.id), scheduledTime: null, tournamentId },
                            {
                              onSuccess: () => {
                                toast({ title: "Cleared times" });
                                queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                              },
                            }
                          );
                        }}
                        data-testid={`button-clear-bulk-time-${sec.key}`}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {sec.matches.map(match => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        canManage={canManage}
                        onScore={() => setScoreDialog(match)}
                        courts={courts || []}
                        onAssignCourt={handleAssignCourt}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateTime={(matchId, scheduledTime) => {
                          updateTimeMutation.mutate({ matchId, scheduledTime, tournamentId }, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                              toast({ title: scheduledTime ? "Time updated" : "Time cleared" });
                            },
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()
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

      {addMatchDialog && (
        <Dialog open={!!addMatchDialog} onOpenChange={(o) => !o && setAddMatchDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Match</DialogTitle>
              <DialogDescription>
                Pick a group and the two pairs that will play.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const presetGroup = addMatchDialog.groupNumber;
                const effectiveGroupNumber: number | "" = presetGroup ?? addMatchGroupNumber;
                const effectiveSubGroup = addMatchDialog.subGroupNumber ?? 1;
                const allCategoryTeams = (teams || []) as any[];
                // Build a user-pair lookup so we can resolve pair-request group entries to a team in this category.
                const teamIdByUserKey = new Map<string, number>();
                for (const t of allCategoryTeams) {
                  const u1 = t.player1?.user?.id;
                  const u2 = t.player2?.user?.id;
                  if (u1 && u2) {
                    const key = [Math.min(u1, u2), Math.max(u1, u2)].join("-");
                    teamIdByUserKey.set(key, t.id);
                  }
                }
                // Resolve selected group → its assigned team IDs (covers both teamId and pairRequestId entries)
                const selectedGroup = (allGroups as any[])
                  .slice()
                  .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))
                  .find((g: any) => g.groupOrder === effectiveGroupNumber);
                const groupTeamIds = new Set<number>();
                for (const p of (selectedGroup?.pairs || [])) {
                  if (typeof p.teamId === "number") {
                    groupTeamIds.add(p.teamId);
                  } else if (p.pairRequest) {
                    const u1 = p.pairRequest.fromUserId;
                    const u2 = p.pairRequest.toUserId;
                    if (u1 && u2) {
                      const key = [Math.min(u1, u2), Math.max(u1, u2)].join("-");
                      const tid = teamIdByUserKey.get(key);
                      if (tid) groupTeamIds.add(tid);
                    }
                  }
                }
                const pairOptions = effectiveGroupNumber !== "" && groupTeamIds.size > 0
                  ? allCategoryTeams.filter(t => groupTeamIds.has(t.id))
                  : (effectiveGroupNumber !== "" ? [] : allCategoryTeams);
                return (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Group</label>
                      <Select
                        value={effectiveGroupNumber === "" ? "" : String(effectiveGroupNumber)}
                        onValueChange={v => setAddMatchGroupNumber(Number(v))}
                        disabled={!!presetGroup}
                      >
                        <SelectTrigger data-testid="select-add-match-group">
                          <SelectValue placeholder={(allGroups as any[]).length === 0 ? "No groups — create one first" : "Select group"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(allGroups as any[]).length === 0 ? (
                            <SelectItem value="1">Group A</SelectItem>
                          ) : (
                            (allGroups as any[])
                              .slice()
                              .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))
                              .map((g: any) => (
                                <SelectItem key={g.id} value={String(g.groupOrder)}>
                                  {g.name || `Group ${String.fromCharCode(64 + (g.groupOrder ?? 1))}`}
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pair A</label>
                      <Select value={addMatchTeamA === "" ? "" : String(addMatchTeamA)} onValueChange={v => setAddMatchTeamA(Number(v))}>
                        <SelectTrigger data-testid="select-add-match-team-a"><SelectValue placeholder={effectiveGroupNumber === "" ? "Select group first" : "Select pair"} /></SelectTrigger>
                        <SelectContent>
                          {pairOptions.filter(t => t.id !== addMatchTeamB).map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{getTeamName(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pair B</label>
                      <Select value={addMatchTeamB === "" ? "" : String(addMatchTeamB)} onValueChange={v => setAddMatchTeamB(Number(v))}>
                        <SelectTrigger data-testid="select-add-match-team-b"><SelectValue placeholder={effectiveGroupNumber === "" ? "Select group first" : "Select pair"} /></SelectTrigger>
                        <SelectContent>
                          {pairOptions.filter(t => t.id !== addMatchTeamA).map(t => (
                            <SelectItem key={t.id} value={String(t.id)}>{getTeamName(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                );
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMatchDialog(null)} data-testid="button-cancel-add-match">Cancel</Button>
              <Button
                disabled={
                  !addMatchTeamA ||
                  !addMatchTeamB ||
                  (!addMatchDialog.groupNumber && !addMatchGroupNumber) ||
                  addGroupMatchMutation.isPending
                }
                onClick={() => {
                  if (!addMatchTeamA || !addMatchTeamB) return;
                  const gNum = addMatchDialog.groupNumber ?? (addMatchGroupNumber as number);
                  const sgNum = addMatchDialog.subGroupNumber ?? 1;
                  if (!gNum) return;
                  addGroupMatchMutation.mutate({
                    categoryId: category.id,
                    teamAId: addMatchTeamA as number,
                    teamBId: addMatchTeamB as number,
                    groupNumber: gNum,
                    subGroupNumber: sgNum,
                  }, {
                    onSuccess: () => {
                      toast({ title: "Match Added" });
                      setAddMatchDialog(null);
                    },
                    onError: (err: any) => {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    },
                  });
                }}
                data-testid="button-confirm-add-match"
              >
                {addGroupMatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MatchCard({ match, canManage, onScore, courts, onAssignCourt, onUpdateStatus, onUpdateTime }: {
  match: any; canManage: boolean; onScore: () => void;
  courts?: any[]; onAssignCourt?: (matchId: number, courtId: number | null) => void;
  onUpdateStatus?: (matchId: number, status: string) => void;
  onUpdateTime?: (matchId: number, scheduledTime: string | null) => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  const toLocalInput = (d: any) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
  const [timeDraft, setTimeDraft] = useState<string>(() => toLocalInput(match.scheduledTime));
  const scheduledLabel = match.scheduledTime
    ? new Date(match.scheduledTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  const teamAName = match.teamA ? getTeamName(match.teamA) : "TBD";
  const teamBName = match.teamB ? getTeamName(match.teamB) : "TBD";
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const scores = match.scores || [];
  const scoreA = scores.reduce((a: number, s: any) => a + (s.scoreA > s.scoreB ? 1 : 0), 0);
  const scoreB = scores.reduce((a: number, s: any) => a + (s.scoreB > s.scoreA ? 1 : 0), 0);
  const scoreStr = scores.length > 0 ? scores.map((s: any) => `${s.scoreA}-${s.scoreB}`).join(", ") : "";

  return (
    <div className="group relative" data-testid={`match-card-${match.id}`}>
      <div className={cn(
        "relative rounded-xl overflow-hidden border transition-all duration-300",
        isLive
          ? "border-red-500/40 bg-card shadow-lg shadow-red-500/5"
          : isFinished
            ? "border-border/50 bg-card"
            : "border-violet-500/20 bg-card hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10"
      )}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border/30">
          {match.groupNumber && (
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[9px] font-black px-1.5">
              G{String.fromCharCode(64 + match.groupNumber)}{match.subGroupNumber ? `-SG${match.subGroupNumber}` : ""}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-bold">Match {match.matchOrder + 1}</span>
          {match.courtId && match.court && (
            <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[9px] font-bold">
              <Monitor className="h-2.5 w-2.5 mr-0.5" />{match.court.name}
            </Badge>
          )}
          {isLive && (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold animate-pulse">
              <CircleDot className="h-2.5 w-2.5 mr-0.5" />LIVE
            </Badge>
          )}
          {match.isBye && <Badge className="bg-muted text-muted-foreground border border-border/30 text-[9px] font-bold ml-auto">BYE</Badge>}
          {!match.isBye && (
            canManage ? (
              editingTime ? (
                <div className="ml-auto flex items-center gap-1">
                  <Input
                    type="datetime-local"
                    value={timeDraft}
                    onChange={(e) => setTimeDraft(e.target.value)}
                    className="h-6 text-[10px] px-1 w-[160px]"
                    data-testid={`input-match-time-${match.id}`}
                  />
                  <Button
                    size="icon"
                    className="h-6 w-6 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => {
                      const iso = timeDraft ? new Date(timeDraft).toISOString() : null;
                      onUpdateTime?.(match.id, iso);
                      setEditingTime(false);
                    }}
                    data-testid={`button-save-match-time-${match.id}`}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      setEditingTime(false);
                      setTimeDraft(toLocalInput(match.scheduledTime));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setTimeDraft(toLocalInput(match.scheduledTime)); setEditingTime(true); }}
                  className="ml-auto flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-violet-400 transition-colors"
                  data-testid={`button-edit-match-time-${match.id}`}
                >
                  <Clock className="h-3 w-3" />
                  {scheduledLabel || "Set time"}
                </button>
              )
            ) : (
              scheduledLabel ? (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                  <Clock className="h-3 w-3" />{scheduledLabel}
                </span>
              ) : null
            )
          )}
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
            <div className="flex items-center gap-1 px-2 border-l border-border/30">
              {!isLive && (
                <Button size="sm" onClick={() => onUpdateStatus?.(match.id, "LIVE")}
                  data-testid={`match-start-${match.id}`}
                  className="h-8 w-8 p-0 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded-lg"
                  title="Start Match">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              {isLive && (
                <Button size="sm" onClick={() => onUpdateStatus?.(match.id, "PENDING")}
                  data-testid={`match-stop-${match.id}`}
                  className="h-8 w-8 p-0 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 rounded-lg"
                  title="Pause Match">
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" onClick={onScore}
                data-testid={`match-score-${match.id}`}
                className="h-8 w-8 p-0 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 border border-violet-500/30 rounded-lg"
                title="Submit Score">
                <Target className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {canManage && !isFinished && !match.isBye && courts && courts.length > 0 && (
          <div className="px-3 py-1.5 bg-muted/30 border-t border-border/30 flex items-center gap-2">
            <Monitor className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <select
              data-testid={`match-court-select-${match.id}`}
              className="text-[11px] bg-transparent border border-border/50 rounded px-1.5 py-0.5 text-foreground flex-1"
              value={match.courtId || ""}
              onChange={(e) => onAssignCourt?.(match.id, e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No Court</option>
              {courts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

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

function StandingsView({ standings, teams, category, groups = [] }: { standings: any[]; teams: any[]; category: any; groups?: any[] }) {
  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Stat lookup keyed by teamId — Groups section is the source of truth for membership; standings only contributes stats.
  const statsByTeamId = new Map<number, any>();
  for (const s of standings) {
    if (s.teamId && s.groupNumber < 100) statsByTeamId.set(s.teamId, s);
  }
  const emptyStats = (teamId: number, groupNumber: number) => ({
    id: `empty-${groupNumber}-${teamId}`,
    teamId, groupNumber, subGroupNumber: 1,
    matchesPlayed: 0, matchesWon: 0, matchesLost: 0,
    gamesWon: 0, gamesLost: 0, pointsFor: 0, pointsAgainst: 0, points: 0,
  });

  const hasSubGroups = standings.some(s => s.subGroupNumber && s.subGroupNumber > 0);
  const groupNumbers = Array.from(new Set(standings.map(s => s.groupNumber))).sort((a, b) => a - b);

  const renderStandingsTable = (rows: any[], advanceCount: number) => (
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
            <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">PF</th>
            <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">PA</th>
            <th className="text-center px-2 py-2.5 text-[10px] font-black text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">+/-</th>
            <th className="text-center px-2 py-2.5 text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-wider">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s: any, si: number) => {
            const team = teamMap.get(s.teamId);
            const isQualifying = si < advanceCount;
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
                  <span className="font-bold text-foreground">{s.displayName || (team ? getTeamName(team) : `Team #${s.teamId}`)}</span>
                </td>
                <td className="text-center px-2 py-2.5 text-muted-foreground font-medium">{s.matchesPlayed}</td>
                <td className="text-center px-2 py-2.5 font-bold text-emerald-500 dark:text-emerald-400">{s.matchesWon}</td>
                <td className="text-center px-2 py-2.5 text-red-500 dark:text-red-400">{s.matchesLost}</td>
                <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesWon}</td>
                <td className="text-center px-2 py-2.5 text-muted-foreground">{s.gamesLost}</td>
                <td className="text-center px-2 py-2.5 text-muted-foreground">{s.pointsFor}</td>
                <td className="text-center px-2 py-2.5 text-muted-foreground">{s.pointsAgainst}</td>
                <td className={cn("text-center px-2 py-2.5 font-bold", (s.pointsFor - s.pointsAgainst) > 0 ? "text-emerald-500" : (s.pointsFor - s.pointsAgainst) < 0 ? "text-red-400" : "text-muted-foreground")}>{(s.pointsFor - s.pointsAgainst) > 0 ? "+" : ""}{s.pointsFor - s.pointsAgainst}</td>
                <td className="text-center px-2 py-2.5 font-black text-violet-500 dark:text-violet-400">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const advancePerGroup = category.advancePerGroup || 1;

  const groupStageStandings = standings.filter(s => s.groupNumber < 100);
  const qfStandings = standings.filter(s => s.groupNumber >= 200 && s.groupNumber < 300);
  const semiStandings = standings.filter(s => s.groupNumber >= 300 && s.groupNumber < 400);
  const finalStandings = standings.filter(s => s.groupNumber >= 400);
  const groupStageNumbers = Array.from(new Set(groupStageStandings.map(s => s.groupNumber))).sort((a, b) => a - b);

  const sortFn = (a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    return a.gamesLost - b.gamesLost;
  };

  const renderStageSection = (stageStandings: any[], stageLabel: string, colorFrom: string, colorTo: string, badgeColor: string, advCount: number) => {
    const stageGroupNums = Array.from(new Set(stageStandings.map(s => s.groupNumber))).sort((a, b) => a - b);
    return stageGroupNums.map((gNum, idx) => {
      const gStandings = stageStandings.filter(s => s.groupNumber === gNum).sort(sortFn);
      const groupLabel = stageGroupNums.length > 1 ? `${stageLabel} · Group ${String.fromCharCode(65 + idx)}` : stageLabel;
      return (
        <div key={`stage-${gNum}`} className="relative rounded-2xl overflow-hidden">
          <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${colorFrom} via-purple-500/20 to-slate-800/40 blur-[0.5px]`} />
          <div className="relative rounded-2xl bg-card overflow-hidden border border-border/30">
            <div className={`bg-gradient-to-r ${colorTo} via-transparent to-transparent px-4 py-3 border-b border-border/30`}>
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${colorFrom.replace('/40', '')} flex items-center justify-center`}>
                  <Trophy className="h-3 w-3 text-white" />
                </div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{groupLabel}</h4>
                <Badge className={`${badgeColor} text-[9px] font-black ml-auto`}>{gStandings.length} Teams</Badge>
              </div>
            </div>
            {renderStandingsTable(gStandings, advCount)}
          </div>
        </div>
      );
    });
  };

  // CANONICAL group rendering: derive from the Groups section (tournament_groups) — never invent groups from standings.
  const sortedGroups = [...groups].sort((a: any, b: any) => (a.groupOrder || 0) - (b.groupOrder || 0));

  return (
    <div className="space-y-5">
      {sortedGroups.length === 0 && groupStageNumbers.length > 0 && (
        <div className="text-xs text-muted-foreground italic px-2">No groups defined yet — add groups in the Groups section.</div>
      )}
      {sortedGroups.map((grp: any, gi: number) => {
        const gNum = gi + 1;
        // Build one row per pair in the group — covers both team-based and pairRequest-based assignments.
        const rows = (grp.pairs || []).map((p: any, pi: number) => {
          let teamId: number | null = null;
          let displayName = "Unknown Pair";
          if (p.teamId) {
            teamId = p.teamId;
            const team = teamMap.get(p.teamId);
            displayName = team
              ? getTeamName(team)
              : (p.team
                ? [p.team.player1Name, p.team.player2Name].filter(Boolean).join(" / ")
                : `Team #${p.teamId}`);
          } else if (p.pairRequest) {
            displayName = p.pairRequest.pairName
              || [p.pairRequest.fromUserName, p.pairRequest.toUserName].filter(Boolean).join(" / ")
              || "Pair";
          }
          const stats = teamId ? statsByTeamId.get(teamId) : null;
          return {
            ...(stats || emptyStats(teamId ?? -(p.id || pi + 1), gNum)),
            id: stats?.id ?? `pair-${grp.id}-${p.id || pi}`,
            teamId: teamId ?? -(p.id || pi + 1),
            displayName,
          };
        });

        return (
          <div key={`grp-${grp.id}`} className="relative rounded-2xl overflow-hidden">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-500/40 via-purple-500/20 to-slate-800/40 blur-[0.5px]" />
            <div className="relative rounded-2xl bg-card overflow-hidden border border-border/30">
              <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <LayoutGrid className="h-3 w-3 text-white" />
                  </div>
                  <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{grp.name || `Group ${String.fromCharCode(64 + gNum)}`}</h4>
                  <Badge className="bg-violet-500/15 text-violet-500 dark:text-violet-400 border border-violet-500/30 text-[9px] font-black ml-auto">{rows.length} Teams</Badge>
                </div>
              </div>
              {renderStandingsTable(rows.sort(sortFn), advancePerGroup)}
            </div>
          </div>
        );
      })}

      {qfStandings.length > 0 && renderStageSection(
        qfStandings, "Quarter-Finals",
        "from-cyan-500/40", "from-cyan-600/10",
        "bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30",
        1
      )}

      {semiStandings.length > 0 && renderStageSection(
        semiStandings, "Semi-Finals",
        "from-amber-500/40", "from-amber-600/10",
        "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30",
        1
      )}

      {finalStandings.length > 0 && renderStageSection(
        finalStandings, "Final",
        "from-yellow-500/40", "from-yellow-600/10",
        "bg-yellow-500/15 text-yellow-500 dark:text-yellow-400 border border-yellow-500/30",
        1
      )}
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
    const sorted = Array.from(roundMap.entries()).sort(([a], [b]) => a - b);
    const totalRounds = sorted.length;
    return sorted.map(([round, ms], ri) => {
      const roundsFromEnd = totalRounds - ri;
      let label: string;
      if (roundsFromEnd === 1) label = "Final";
      else if (roundsFromEnd === 2) label = "Semi Finals";
      else if (roundsFromEnd === 3) label = "Quarter Finals";
      else if (roundsFromEnd === 4) label = "Round of 16";
      else if (roundsFromEnd === 5) label = "Round of 32";
      else label = `Round ${ri + 1}`;
      return {
        round,
        label,
        isFinal: roundsFromEnd === 1,
        matches: ms.sort((a, b) => a.matchOrder - b.matchOrder),
      };
    });
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

function CourtsTab({ tournamentId, canManage }: { tournamentId: number; canManage: boolean }) {
  const { data: courts, isLoading } = useTournamentCourts(tournamentId);
  const createCourtMutation = useCreateCourt();
  const updateCourtMutation = useUpdateCourt();
  const deleteCourtMutation = useDeleteCourt();
  const { toast } = useToast();
  const [editingCourt, setEditingCourt] = useState<{ id: number; name: string } | null>(null);
  const [newCourtName, setNewCourtName] = useState("");

  const activeCourts = courts?.filter(c => c.isActive) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Monitor className="h-5 w-5 text-amber-500" /> Court Management
        </h3>
        <div className="flex items-center gap-2">
          <Link href={`/tournaments/${tournamentId}/court-view`}>
            <Button size="sm" variant="outline" className="font-bold text-xs border-violet-500/30 text-violet-500 hover:bg-violet-500/10" data-testid="button-open-court-view">
              <Monitor className="h-3.5 w-3.5 mr-1" /> Live Court View
            </Button>
          </Link>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Court name (optional)"
            value={newCourtName}
            onChange={(e) => setNewCourtName(e.target.value)}
            className="max-w-xs"
            data-testid="input-new-court-name"
          />
          <Button size="sm" onClick={async () => {
            try {
              await createCourtMutation.mutateAsync({ tournamentId, name: newCourtName || undefined });
              setNewCourtName("");
              toast({ title: "Court Added" });
            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
          }} disabled={createCourtMutation.isPending} data-testid="button-add-court">
            {createCourtMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Court
          </Button>
        </div>
      )}

      {(!courts || courts.length === 0) ? (
        <EmptyState icon={Monitor} title="No Courts" description="Add courts to manage match locations during the tournament." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courts.map(court => (
            <Card key={court.id} className={cn("border transition-all", court.isActive ? "border-amber-500/30 bg-amber-500/5" : "border-gray-700/30 bg-gray-800/20 opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {editingCourt?.id === court.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editingCourt.name}
                        onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
                        className="h-8 text-sm"
                        data-testid={`input-edit-court-${court.id}`}
                      />
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          await updateCourtMutation.mutateAsync({ courtId: court.id, tournamentId, name: editingCourt.name });
                          setEditingCourt(null);
                          toast({ title: "Court Updated" });
                        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                      }} data-testid={`button-save-court-${court.id}`}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingCourt(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Square className="h-5 w-5 text-amber-500" />
                        <span className="font-bold" data-testid={`text-court-name-${court.id}`}>{court.name}</span>
                        {!court.isActive && <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400">Inactive</Badge>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingCourt({ id: court.id, name: court.name })} data-testid={`button-edit-court-${court.id}`}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try {
                              await updateCourtMutation.mutateAsync({ courtId: court.id, tournamentId, isActive: !court.isActive });
                              toast({ title: court.isActive ? "Court Deactivated" : "Court Activated" });
                            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                          }} data-testid={`button-toggle-court-${court.id}`}>
                            {court.isActive ? <X className="h-3.5 w-3.5 text-red-400" /> : <Check className="h-3.5 w-3.5 text-green-400" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try {
                              await deleteCourtMutation.mutateAsync({ courtId: court.id, tournamentId });
                              toast({ title: "Court Deleted" });
                            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                          }} data-testid={`button-delete-court-${court.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeCourts.length > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-sm text-muted-foreground">
            <Monitor className="h-4 w-4 inline mr-1 text-violet-500" />
            Open the <Link href={`/tournaments/${tournamentId}/court-view`} className="text-violet-500 font-bold hover:underline">Live Court View</Link> for a fullscreen, tablet-friendly display of match progress on each court.
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerStatsTab({ tournamentId, categories, canManage }: { tournamentId: number; categories: any[]; canManage: boolean }) {
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);
  const { data: stats, isLoading } = useTournamentPlayerStats(tournamentId, selectedCatId);
  const recalcMutation = useRecalculateStats();
  const { toast } = useToast();

  const sorted = useMemo(() => {
    if (!stats) return [];
    return [...stats].sort((a, b) => b.matchesWon - a.matchesWon || b.pointDifference - a.pointDifference || b.pointsScored - a.pointsScored);
  }, [stats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart className="h-5 w-5 text-amber-500" /> Player Tournament Stats
        </h3>
        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <Select value={selectedCatId?.toString() || "all"} onValueChange={(v) => setSelectedCatId(v === "all" ? undefined : Number(v))}>
              <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-stats-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canManage && (
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={async () => {
              try {
                await recalcMutation.mutateAsync({ tournamentId });
                toast({ title: "Stats Recalculated" });
              } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
            }} disabled={recalcMutation.isPending} data-testid="button-recalculate-stats">
              {recalcMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ArrowUpDown className="h-3.5 w-3.5 mr-1" />}
              Recalculate
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={BarChart} title="No Stats Yet" description="Player stats will appear after matches are completed." />
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 dark:bg-muted/10 text-muted-foreground text-xs uppercase">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3 px-4">Player</th>
                <th className="text-center py-3 px-4">Played</th>
                <th className="text-center py-3 px-4">Won</th>
                <th className="text-center py-3 px-4">Lost</th>
                <th className="text-center py-3 px-4">PF</th>
                <th className="text-center py-3 px-4">PA</th>
                <th className="text-center py-3 px-4">PD</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => (
                <tr key={s.id} className="border-t border-border/30 hover:bg-muted/10">
                  <td className="py-2.5 px-4 text-muted-foreground font-bold">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-bold" data-testid={`text-stat-player-${s.userId}`}>{s.playerName}</td>
                  <td className="py-2.5 px-4 text-center">{s.matchesPlayed}</td>
                  <td className="py-2.5 px-4 text-center text-green-500 font-bold">{s.matchesWon}</td>
                  <td className="py-2.5 px-4 text-center text-red-400">{s.matchesLost}</td>
                  <td className="py-2.5 px-4 text-center">{s.pointsScored}</td>
                  <td className="py-2.5 px-4 text-center">{s.pointsConceded}</td>
                  <td className={cn("py-2.5 px-4 text-center font-bold", s.pointDifference > 0 ? "text-green-500" : s.pointDifference < 0 ? "text-red-400" : "text-muted-foreground")}>
                    {s.pointDifference > 0 ? "+" : ""}{s.pointDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupsTab({ tournamentId, tournament, categories, canManage }: { tournamentId: number; tournament: any; categories: any[]; canManage: boolean }) {
  const { data: groups = [], isLoading } = useTournamentGroups(tournamentId);
  const createGroupMutation = useCreateTournamentGroup();
  const updateGroupMutation = useUpdateTournamentGroup();
  const deleteGroupMutation = useDeleteTournamentGroup();
  const addPairMutation = useAddPairToGroup();
  const removePairMutation = useRemovePairFromGroup();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [addPairOpen, setAddPairOpen] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [formName, setFormName] = useState("");
  const [formMaxPairs, setFormMaxPairs] = useState("4");
  const [formStartTime, setFormStartTime] = useState("");
  const [formHallName, setFormHallName] = useState("");
  const [formCourtName, setFormCourtName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [bulkGroupTime, setBulkGroupTime] = useState("");
  const [perGroupTime, setPerGroupTime] = useState<Record<number, string>>({});

  const activeCatId = formCategoryId ? Number(formCategoryId) : (categories.length > 0 ? categories[0].id : 0);
  const { data: allTeams = [] } = useTournamentTeams(activeCatId);
  const { data: allPairs = [] } = useTournamentPairs(tournamentId);
  const acceptedPairs = allPairs.filter((p: any) => !!p.pairRequestId);

  const assignedTeamIds = new Set<number>(groups.flatMap((g: any) => g.pairs?.map((p: any) => p.teamId).filter(Boolean) || []));
  const assignedPairRequestIds = new Set<number>(groups.flatMap((g: any) => g.pairs?.map((p: any) => p.pairRequestId).filter(Boolean) || []));

  // Map: "minProfileId-maxProfileId" -> teamId, so we can cross-check pairs against team assignments
  const teamIdByPlayerKey = new Map<string, number>();
  for (const t of allTeams as any[]) {
    if (t.player1Id && t.player2Id) {
      const key = [Math.min(t.player1Id, t.player2Id), Math.max(t.player1Id, t.player2Id)].join("-");
      teamIdByPlayerKey.set(key, t.id);
    }
  }

  // De-dupe pairs by pairRequestId, then exclude any pair already assigned (via pairRequestId OR via its mapped teamId)
  const seenPrIds = new Set<number>();
  const availablePairs = acceptedPairs.filter((p: any) => {
    if (!p.pairRequestId) return false;
    if (seenPrIds.has(p.pairRequestId)) return false;
    seenPrIds.add(p.pairRequestId);
    if (assignedPairRequestIds.has(p.pairRequestId)) return false;
    if (p.profile1?.id && p.profile2?.id) {
      const key = [Math.min(p.profile1.id, p.profile2.id), Math.max(p.profile1.id, p.profile2.id)].join("-");
      const tid = teamIdByPlayerKey.get(key);
      if (tid && assignedTeamIds.has(tid)) return false;
    }
    return true;
  });
  const hasPairs = acceptedPairs.length > 0;

  function resetForm() {
    setFormName(""); setFormMaxPairs("4"); setFormStartTime(""); setFormHallName(""); setFormCourtName(""); setFormCategoryId("");
  }

  function openEdit(group: any) {
    setEditingGroup(group);
    setFormName(group.name);
    setFormMaxPairs(String(group.maxPairs));
    setFormStartTime(group.startTime ? new Date(group.startTime).toISOString().slice(0, 16) : "");
    setFormHallName(group.hallName || "");
    setFormCourtName(group.courtName || "");
    setFormCategoryId(group.categoryId ? String(group.categoryId) : "");
  }

  async function handleCreate() {
    if (!formName.trim()) { toast({ title: "Error", description: "Group name is required", variant: "destructive" }); return; }
    try {
      await createGroupMutation.mutateAsync({
        tournamentId,
        name: formName.trim(),
        maxPairs: Number(formMaxPairs) || 4,
        startTime: formStartTime || undefined,
        hallName: formHallName || undefined,
        courtName: formCourtName || undefined,
        categoryId: formCategoryId ? Number(formCategoryId) : undefined,
        groupOrder: groups.length + 1,
      });
      toast({ title: "Group Created" });
      setCreateOpen(false);
      resetForm();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleUpdate() {
    if (!editingGroup || !formName.trim()) return;
    try {
      await updateGroupMutation.mutateAsync({
        groupId: editingGroup.id,
        tournamentId,
        name: formName.trim(),
        maxPairs: Number(formMaxPairs) || 4,
        startTime: formStartTime || null,
        hallName: formHallName || null,
        courtName: formCourtName || null,
        categoryId: formCategoryId ? Number(formCategoryId) : null,
      });
      toast({ title: "Group Updated" });
      setEditingGroup(null);
      resetForm();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleDelete(groupId: number) {
    try {
      await deleteGroupMutation.mutateAsync({ groupId });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "groups"] });
      toast({ title: "Group Deleted" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleAddPair(groupId: number, valueOverride?: string) {
    const value = valueOverride ?? selectedTeamId;
    if (!value) return;
    try {
      const isPairReq = value.startsWith("pr-");
      const payload: any = { groupId, tournamentId };
      if (isPairReq) {
        payload.pairRequestId = Number(value.replace("pr-", ""));
      } else {
        payload.teamId = Number(value);
      }
      await addPairMutation.mutateAsync(payload);
      toast({ title: "Pair Added" });
      setSelectedTeamId("");
      setAddPairOpen(null);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleRemovePair(pairId: number) {
    try {
      await removePairMutation.mutateAsync({ pairId, tournamentId });
      toast({ title: "Pair Removed" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const groupFormDialog = (
    <Dialog open={createOpen || !!editingGroup} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditingGroup(null); resetForm(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>Set up a round robin group with venue details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Group Name *</label>
            <Input data-testid="input-group-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Group A" />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger data-testid="select-group-category"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Max Pairs</label>
              <Input data-testid="input-group-max-pairs" type="number" min={2} value={formMaxPairs} onChange={(e) => setFormMaxPairs(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</label>
              <Input data-testid="input-group-start-time" type="datetime-local" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hall Name</label>
            <Input data-testid="input-group-hall" value={formHallName} onChange={(e) => setFormHallName(e.target.value)} placeholder="e.g. Main Hall" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Court Name</label>
            <Input data-testid="input-group-court" value={formCourtName} onChange={(e) => setFormCourtName(e.target.value)} placeholder="e.g. Court 1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingGroup(null); resetForm(); }}>Cancel</Button>
          <Button data-testid="button-save-group" className="bg-violet-600 hover:bg-violet-700 text-white font-bold"
            disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
            onClick={editingGroup ? handleUpdate : handleCreate}>
            {(createGroupMutation.isPending || updateGroupMutation.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {editingGroup ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  async function applyBulkGroupTime() {
    if (!bulkGroupTime) return;
    const iso = new Date(bulkGroupTime).toISOString();
    try {
      await Promise.all(
        groups.map((g: any) => updateGroupMutation.mutateAsync({
          groupId: g.id, tournamentId,
          name: g.name, maxPairs: g.maxPairs,
          startTime: iso, hallName: g.hallName ?? null, courtName: g.courtName ?? null,
          categoryId: g.categoryId ?? null,
        }))
      );
      toast({ title: `Updated ${groups.length} groups` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function clearAllGroupTimes() {
    try {
      await Promise.all(
        groups.map((g: any) => updateGroupMutation.mutateAsync({
          groupId: g.id, tournamentId,
          name: g.name, maxPairs: g.maxPairs,
          startTime: null, hallName: g.hallName ?? null, courtName: g.courtName ?? null,
          categoryId: g.categoryId ?? null,
        }))
      );
      toast({ title: "Cleared all group times" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function saveGroupTime(group: any) {
    const val = perGroupTime[group.id];
    if (val === undefined) return;
    const iso = val ? new Date(val).toISOString() : null;
    try {
      await updateGroupMutation.mutateAsync({
        groupId: group.id, tournamentId,
        name: group.name, maxPairs: group.maxPairs,
        startTime: iso, hallName: group.hallName ?? null, courtName: group.courtName ?? null,
        categoryId: group.categoryId ?? null,
      });
      toast({ title: iso ? "Group time updated" : "Group time cleared" });
      setPerGroupTime(prev => { const n = { ...prev }; delete n[group.id]; return n; });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-violet-500" />
          Round Robin Groups
        </h3>
        {canManage && (
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
            data-testid="button-create-group"
            onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
          </Button>
        )}
      </div>

      {canManage && groups.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Bulk set start time:</span>
          <Input
            type="datetime-local"
            value={bulkGroupTime}
            onChange={(e) => setBulkGroupTime(e.target.value)}
            className="h-8 text-xs flex-1 min-w-[200px] max-w-[260px]"
            data-testid="input-bulk-group-time"
          />
          <Button size="sm" className="h-8 text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white"
            disabled={!bulkGroupTime || updateGroupMutation.isPending}
            onClick={applyBulkGroupTime}
            data-testid="button-apply-bulk-group-time">
            Apply to all groups
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-[11px]"
            disabled={updateGroupMutation.isPending}
            onClick={clearAllGroupTimes}
            data-testid="button-clear-bulk-group-time">
            Clear all
          </Button>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No Groups" description="Create round robin groups and assign pairs to get started." />
      ) : (
        <div className="grid gap-4">
          {groups.map((group: any) => {
            const pairsCount = group.pairs?.length || 0;
            const isFull = pairsCount >= group.maxPairs;
            return (
              <Card key={group.id} className="overflow-hidden border-border/50">
                <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent px-4 py-3 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-foreground text-sm" data-testid={`text-group-name-${group.id}`}>{group.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-bold">{pairsCount}/{group.maxPairs} pairs</span>
                          {group.startTime && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{format(new Date(group.startTime), "dd MMM, HH:mm")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`button-edit-group-${group.id}`}
                          onClick={() => openEdit(group)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" data-testid={`button-delete-group-${group.id}`}
                          onClick={() => handleDelete(group.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  {(group.hallName || group.courtName) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {group.hallName && (
                        <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-blue-500" />{group.hallName}</span>
                      )}
                      {group.courtName && (
                        <span className="flex items-center gap-1"><Square className="h-3.5 w-3.5 text-emerald-500" />{group.courtName}</span>
                      )}
                      {group.venue && (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-500" />{group.venue.name}</span>
                      )}
                    </div>
                  )}

                  {canManage && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/40 bg-muted/20">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start time</span>
                      <Input
                        type="datetime-local"
                        value={perGroupTime[group.id] ?? (group.startTime ? new Date(group.startTime).toISOString().slice(0, 16) : "")}
                        onChange={(e) => setPerGroupTime(prev => ({ ...prev, [group.id]: e.target.value }))}
                        className="h-7 text-xs flex-1 min-w-[180px] max-w-[240px]"
                        data-testid={`input-group-time-${group.id}`}
                      />
                      <Button size="sm" className="h-7 text-[10px] font-bold"
                        disabled={perGroupTime[group.id] === undefined || updateGroupMutation.isPending}
                        onClick={() => saveGroupTime(group)}
                        data-testid={`button-save-group-time-${group.id}`}>
                        Save
                      </Button>
                    </div>
                  )}

                  {group.pairs && group.pairs.length > 0 ? (
                    <div className="space-y-1.5">
                      {group.pairs.map((pair: any, idx: number) => {
                        let pairLabel = "";
                        if (pair.pairRequest) {
                          pairLabel = `${pair.pairRequest.fromUserName} & ${pair.pairRequest.toUserName}`;
                        } else if (pair.team) {
                          pairLabel = `${pair.team.player1Name}${pair.team.player2Name ? ` & ${pair.team.player2Name}` : ""}`;
                        }
                        return (
                          <div key={pair.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-muted-foreground w-5">{idx + 1}.</span>
                              {pairLabel ? (
                                <span className="text-xs font-bold text-foreground">{pairLabel}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Unknown pair</span>
                              )}
                            </div>
                            {canManage && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600"
                                data-testid={`button-remove-pair-${pair.id}`}
                                onClick={() => handleRemovePair(pair.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2 italic">No pairs assigned yet</p>
                  )}

                  {canManage && !isFull && (
                    <div className="flex items-center gap-2 pt-1">
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (val) handleAddPair(group.id, val);
                        }}
                        disabled={addPairMutation.isPending}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-add-pair-${group.id}`}>
                          <SelectValue placeholder={addPairMutation.isPending ? "Adding..." : "+ Add pair to this group"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePairs.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground italic">All pairs assigned</div>
                          ) : (
                            availablePairs.map((p: any) => (
                              <SelectItem key={`pr-${p.pairRequestId}`} value={`pr-${p.pairRequestId}`}>
                                {`${p.user1?.fullName || "?"} & ${p.user2?.fullName || "?"}`}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {isFull && (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[9px] font-black">
                      <CheckCircle className="h-3 w-3 mr-1" /> Full
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {groupFormDialog}
    </div>
  );
}

function AdminTab({ tournamentId, tournament, categories, canManage }: { tournamentId: number; tournament: any; categories: any[]; canManage: boolean }) {
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
  const seedDemoMutation = useSeedDemoPlayers();
  const clearDemoMutation = useClearDemoPlayers();
  const restartMutation = useRestartTournament();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const { toast } = useToast();
  const [adminView, setAdminView] = useState<"registrations" | "pairs" | "waitlist" | "finance" | "prizes" | "settings">("registrations");
  const { data: allPlayers } = useTournamentAllPlayers(tournamentId);
  const { data: playerPool } = useTournamentPlayerPool(tournamentId);
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const adminCreatePairMutation = useAdminCreatePair();
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const activeCatId = selectedCatId || (categories.length > 0 ? categories[0].id : null);
  const { data: catTeams } = useTournamentTeams(activeCatId || 0);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [showCreatePair, setShowCreatePair] = useState(false);
  const [newPairPlayer1, setNewPairPlayer1] = useState<string>("");
  const [newPairPlayer2, setNewPairPlayer2] = useState<string>("");
  const [newPairName, setNewPairName] = useState("");

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
        <Button size="sm" variant="outline" className="font-bold border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
          data-testid="button-seed-demo-players"
          disabled={seedDemoMutation.isPending}
          onClick={async () => {
            try {
              const result = await seedDemoMutation.mutateAsync({ tournamentId, count: 20 });
              toast({ title: "Demo Players Added", description: result.message });
            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
          }}>
          {seedDemoMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
          Add 20 Demo Players
        </Button>
        <Button size="sm" variant="outline" className="font-bold border-red-500/30 text-red-500 hover:bg-red-500/10"
          data-testid="button-clear-demo-players"
          disabled={clearDemoMutation.isPending}
          onClick={async () => {
            try {
              const result = await clearDemoMutation.mutateAsync({ tournamentId });
              toast({ title: "Demo Players Removed", description: result.message });
            } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
          }}>
          {clearDemoMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
          Clear Demo Players
        </Button>
        <Button size="sm" variant="outline" className="font-bold border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
          data-testid="button-restart-tournament"
          disabled={restartMutation.isPending}
          onClick={() => setConfirmRestart(true)}>
          {restartMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
          Restart Tournament
        </Button>
      </div>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart Tournament?</DialogTitle>
            <DialogDescription>
              This will clear ALL match data, standings, stats, and groups. Teams and registrations will be kept. The tournament status will be reset to Draft. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)} data-testid="button-cancel-restart">Cancel</Button>
            <Button variant="destructive" data-testid="button-confirm-restart" disabled={restartMutation.isPending}
              onClick={async () => {
                try {
                  const result = await restartMutation.mutateAsync({ tournamentId });
                  toast({ title: "Tournament Restarted", description: result.message });
                  setConfirmRestart(false);
                } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
              }}>
              {restartMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Yes, Restart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-1 bg-muted/30 dark:bg-muted/10 rounded-xl p-1 overflow-x-auto">
        {[
          { key: "registrations", label: "Registrations" },
          { key: "pairs", label: "Pairs" },
          { key: "waitlist", label: "Waitlist" },
          { key: "finance", label: "Finance" },
          { key: "prizes", label: "Prizes" },
          { key: "settings", label: "Settings" },
        ].map(view => (
          <button key={view.key} onClick={() => setAdminView(view.key as any)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              adminView === view.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {view.label}
          </button>
        ))}
      </div>

      {adminView === "registrations" && (
        <AdminRegistrationsView registrations={registrations} regsLoading={regsLoading}
          tournamentId={tournamentId} onApprove={handleApprove} onReject={handleReject} onPayment={handlePayment} />
      )}

      {adminView === "pairs" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            {!showCreatePair ? (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                data-testid="button-open-create-pair"
                onClick={() => setShowCreatePair(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Create Pair from Player Pool
              </Button>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Create New Pair
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Player 1</label>
                    <Select value={newPairPlayer1} onValueChange={setNewPairPlayer1}>
                      <SelectTrigger className="h-9" data-testid="select-pair-player1">
                        <SelectValue placeholder="Select player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(playerPool || []).filter((p: any) => String(p.userId) !== newPairPlayer2).map((p: any) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.user?.fullName || `Player ${p.userId}`}</SelectItem>
                        ))}
                        {(registrations || []).filter((r: any) => r.status === "APPROVED" && r.registrationType === "INDIVIDUAL" && !playerPool?.some((p: any) => p.userId === r.userId) && String(r.userId) !== newPairPlayer2).map((r: any) => (
                          <SelectItem key={r.userId} value={String(r.userId)}>{r.user?.fullName || `Player ${r.userId}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Player 2</label>
                    <Select value={newPairPlayer2} onValueChange={setNewPairPlayer2}>
                      <SelectTrigger className="h-9" data-testid="select-pair-player2">
                        <SelectValue placeholder="Select player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(playerPool || []).filter((p: any) => String(p.userId) !== newPairPlayer1).map((p: any) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.user?.fullName || `Player ${p.userId}`}</SelectItem>
                        ))}
                        {(registrations || []).filter((r: any) => r.status === "APPROVED" && r.registrationType === "INDIVIDUAL" && !playerPool?.some((p: any) => p.userId === r.userId) && String(r.userId) !== newPairPlayer1).map((r: any) => (
                          <SelectItem key={r.userId} value={String(r.userId)}>{r.user?.fullName || `Player ${r.userId}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Team Name (optional)</label>
                  <Input value={newPairName} onChange={e => setNewPairName(e.target.value)}
                    placeholder="e.g. Thunder Smash" maxLength={50} className="h-9"
                    data-testid="input-pair-name" />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    disabled={!newPairPlayer1 || !newPairPlayer2 || adminCreatePairMutation.isPending}
                    data-testid="button-confirm-create-pair"
                    onClick={async () => {
                      try {
                        await adminCreatePairMutation.mutateAsync({
                          tournamentId,
                          player1Id: Number(newPairPlayer1),
                          player2Id: Number(newPairPlayer2),
                          pairName: newPairName || undefined,
                        });
                        toast({ title: "Pair Created" });
                        setNewPairPlayer1(""); setNewPairPlayer2(""); setNewPairName(""); setShowCreatePair(false);
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    {adminCreatePairMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Create Pair
                  </Button>
                  <Button size="sm" variant="outline" className="font-bold text-xs"
                    onClick={() => { setShowCreatePair(false); setNewPairPlayer1(""); setNewPairPlayer2(""); setNewPairName(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

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

      {adminView === "finance" && <AdminFinanceView tournamentId={tournamentId} tournament={tournament} />}

      {adminView === "prizes" && <AdminPrizesView tournamentId={tournamentId} tournament={tournament} categories={categories} />}

      {adminView === "settings" && (
        <div className="space-y-4">
          <AdminTournamentDetailsSection tournament={tournament} tournamentId={tournamentId} />
          <AdminEntryFeeSection tournament={tournament} tournamentId={tournamentId} />

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
                <Button size="sm" variant="ghost" className="h-7 text-destructive" data-testid={`button-delete-category-${cat.id}`} onClick={async () => {
                  if (!window.confirm(`Delete "${cat.name}"? This will remove all matches, standings, and teams in this category.`)) return;
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
            <AdminSearchDialog
              eligibleAdmins={eligibleAdmins || []}
              isPending={addAdminMutation.isPending}
              onAdd={async (member: any) => {
                try {
                  await addAdminMutation.mutateAsync({ tournamentId, userId: member.userId });
                  toast({ title: "Admin Added", description: `${member.fullName} is now a tournament admin.` });
                  setAddAdminOpen(false);
                } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
              }}
              onClose={() => setAddAdminOpen(false)}
            />
          )}

          <TournamentVisibilitySection tournament={tournament} tournamentId={tournamentId} />
        </div>
      )}
    </div>
  );
}

function AdminGroupsView({ categoryId, teams, categories, selectedCatId, onSelectCat, toast }: {
  categoryId: number; teams: any[]; categories: any[];
  selectedCatId: number | null; onSelectCat: (id: number) => void; toast: any;
}) {
  const bulkAssignMutation = useBulkAssignGroups();
  const assignMutation = useAssignTeamGroup();
  const [assignments, setAssignments] = useState<Record<number, { group: number; subGroup: number }>>({});

  useEffect(() => {
    const initial: Record<number, { group: number; subGroup: number }> = {};
    teams.forEach(t => {
      initial[t.id] = { group: t.groupNumber || 0, subGroup: t.subGroupNumber || 0 };
    });
    setAssignments(initial);
  }, [teams]);

  const setTeamAssignment = (teamId: number, field: "group" | "subGroup", value: number) => {
    setAssignments(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
  };

  const handleSaveAll = async () => {
    const validAssignments = Object.entries(assignments)
      .filter(([_, a]) => a.group > 0 && a.subGroup > 0)
      .map(([teamId, a]) => ({ teamId: Number(teamId), groupNumber: a.group, subGroupNumber: a.subGroup }));
    if (validAssignments.length === 0) {
      toast({ title: "No Assignments", description: "Set group and subgroup for at least one team.", variant: "destructive" });
      return;
    }
    try {
      await bulkAssignMutation.mutateAsync({ assignments: validAssignments });
      toast({ title: "Groups Saved", description: `${validAssignments.length} teams assigned to groups.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const groupedTeams = useMemo(() => {
    const map = new Map<string, any[]>();
    teams.forEach(t => {
      const a = assignments[t.id];
      if (a && a.group > 0 && a.subGroup > 0) {
        const key = `${a.group}-${a.subGroup}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [teams, assignments]);

  const maxGroup = Math.max(1, ...Object.values(assignments).map(a => a.group));
  const maxSubGroup = Math.max(1, ...Object.values(assignments).map(a => a.subGroup));
  const unassignedTeams = teams.filter(t => {
    const a = assignments[t.id];
    return !a || a.group === 0 || a.subGroup === 0;
  });

  return (
    <div className="space-y-4">
      {categories.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {categories.map((c: any) => (
            <button key={c.id} onClick={() => onSelectCat(c.id)}
              data-testid={`button-select-cat-group-${c.id}`}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedCatId === c.id ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-violet-500" />
          Group & Subgroup Assignment
        </h4>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
          data-testid="button-save-group-assignments"
          disabled={bulkAssignMutation.isPending}
          onClick={handleSaveAll}>
          {bulkAssignMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Save All Assignments
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Team</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider w-24">Group</th>
              <th className="text-center px-3 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider w-28">Subgroup</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t: any) => {
              const a = assignments[t.id] || { group: 0, subGroup: 0 };
              return (
                <tr key={t.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-foreground">{getTeamName(t)}</span>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <Select value={String(a.group)} onValueChange={(v) => setTeamAssignment(t.id, "group", Number(v))}>
                      <SelectTrigger className="h-8 w-20 mx-auto text-xs" data-testid={`select-group-${t.id}`}>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-</SelectItem>
                        {Array.from({ length: Math.max(2, maxGroup + 1) }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{String.fromCharCode(65 + i)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <Select value={String(a.subGroup)} onValueChange={(v) => setTeamAssignment(t.id, "subGroup", Number(v))}>
                      <SelectTrigger className="h-8 w-24 mx-auto text-xs" data-testid={`select-subgroup-${t.id}`}>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-</SelectItem>
                        {Array.from({ length: Math.max(4, maxSubGroup + 1) }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>SG {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {groupedTeams.size > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-500" />
            Assignment Preview
          </h4>
          {Array.from(new Set(Object.values(assignments).map(a => a.group))).filter(g => g > 0).sort().map(gNum => {
            const subGroups = Array.from(new Set(
              Object.entries(assignments).filter(([_, a]) => a.group === gNum && a.subGroup > 0).map(([_, a]) => a.subGroup)
            )).sort();
            return (
              <div key={gNum} className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent px-4 py-2.5 border-b border-violet-500/20">
                  <h5 className="text-xs font-black text-violet-500 uppercase tracking-wider">Group {String.fromCharCode(64 + gNum)}</h5>
                </div>
                <div className="p-3 space-y-2">
                  {subGroups.map(sgNum => {
                    const sgTeams = teams.filter(t => {
                      const a = assignments[t.id];
                      return a && a.group === gNum && a.subGroup === sgNum;
                    });
                    return (
                      <div key={sgNum} className="rounded-lg border border-border/30 bg-card/50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30 text-[9px] font-black">
                            Subgroup {sgNum}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-bold">{sgTeams.length} teams</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sgTeams.map(t => (
                            <span key={t.id} className="px-2 py-1 rounded-md bg-muted/50 text-xs font-bold text-foreground">
                              {getTeamName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {unassignedTeams.length > 0 && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-black text-orange-500 uppercase tracking-wider">{unassignedTeams.length} Unassigned Teams</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassignedTeams.map(t => (
                  <span key={t.id} className="px-2 py-1 rounded-md bg-orange-500/10 text-xs font-bold text-orange-500">{getTeamName(t)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentVisibilitySection({ tournament, tournamentId }: { tournament: any; tournamentId: number }) {
  const { data: allClubs } = useClubs();
  const updateTournament = useUpdateTournament();
  const { toast } = useToast();
  const [clubSearch, setClubSearch] = useState("");
  const currentAllowed: number[] = tournament.allowedClubIds || [];
  const isOwnerOnly = currentAllowed.length === 0;
  const isOpen = tournament.type === "OPEN";

  const otherClubs = useMemo(() => {
    if (!allClubs) return [];
    const filtered = allClubs.filter(c => c.id !== tournament.clubId);
    const sorted = filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (!clubSearch.trim()) return sorted;
    const q = clubSearch.toLowerCase();
    return sorted.filter(c => (c.name || "").toLowerCase().includes(q));
  }, [allClubs, clubSearch, tournament.clubId]);

  const toggleClub = async (clubId: number) => {
    let newAllowed: number[];
    if (currentAllowed.includes(clubId)) {
      newAllowed = currentAllowed.filter(id => id !== clubId);
    } else {
      newAllowed = [...currentAllowed, clubId];
      if (!newAllowed.includes(tournament.clubId)) newAllowed = [tournament.clubId, ...newAllowed];
    }
    try {
      await updateTournament.mutateAsync({ id: tournamentId, allowedClubIds: newAllowed });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const resetToOwnerOnly = async () => {
    try {
      await updateTournament.mutateAsync({ id: tournamentId, allowedClubIds: [] });
      toast({ title: "Visibility Updated", description: "Tournament is now visible to your club members only." });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-cyan-400" />
        <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Tournament Visibility</h4>
      </div>

      {isOpen ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Globe className="h-4 w-4 text-cyan-500 flex-shrink-0" />
          <p className="text-xs text-foreground">This is an <span className="font-bold">OPEN</span> tournament — visible to all platform users regardless of club membership.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            By default, this tournament is visible to members of the organising club. You can extend visibility to additional clubs below.
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant={isOwnerOnly ? "default" : "outline"}
              className={cn("h-8 text-xs font-bold", isOwnerOnly && "bg-cyan-600 hover:bg-cyan-700 text-white")}
              onClick={resetToOwnerOnly} disabled={updateTournament.isPending || isOwnerOnly} data-testid="button-visibility-owner-only">
              <Building2 className="h-3 w-3 mr-1" />Own Club Only
            </Button>
            <Button size="sm" variant={!isOwnerOnly ? "default" : "outline"}
              className={cn("h-8 text-xs font-bold", !isOwnerOnly && "bg-violet-600 hover:bg-violet-700 text-white")}
              onClick={() => {
                if (isOwnerOnly && tournament.clubId) {
                  updateTournament.mutateAsync({ id: tournamentId, allowedClubIds: [tournament.clubId] });
                }
              }} disabled={updateTournament.isPending || !isOwnerOnly} data-testid="button-visibility-multi-club">
              <Users className="h-3 w-3 mr-1" />Multiple Clubs
            </Button>
          </div>

          {!isOwnerOnly && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search clubs..." value={clubSearch} onChange={e => setClubSearch(e.target.value)}
                  className="pl-9 h-8 text-xs" data-testid="input-search-visibility-clubs" />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {otherClubs.map(club => {
                  const selected = currentAllowed.includes(club.id);
                  return (
                    <div key={club.id} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      selected ? "bg-violet-500/10 border border-violet-500/30" : "hover:bg-muted/30"
                    )} onClick={() => toggleClub(club.id)} data-testid={`club-visibility-${club.id}`}>
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                        selected ? "bg-violet-600 border-violet-600" : "border-muted-foreground/40"
                      )}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{club.name}</p>
                      </div>
                    </div>
                  );
                })}
                {otherClubs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {clubSearch ? "No clubs match your search." : "No other clubs available."}
                  </p>
                )}
              </div>
              {currentAllowed.length > 1 && (
                <p className="text-[10px] text-muted-foreground">
                  Visible to {currentAllowed.length} club{currentAllowed.length !== 1 ? "s" : ""} (including your own).
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdminSearchDialog({ eligibleAdmins, isPending, onAdd, onClose }: {
  eligibleAdmins: any[]; isPending: boolean; onAdd: (member: any) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const sorted = useMemo(() => {
    const filtered = eligibleAdmins.filter((m: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (m.fullName || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q);
    });
    return filtered.sort((a: any, b: any) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [eligibleAdmins, search]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" />
            Add Tournament Admin
          </DialogTitle>
          <DialogDescription>Search and select a member to grant tournament admin access.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9" data-testid="input-search-admin" />
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {eligibleAdmins.length === 0 ? "No eligible members found." : "No members match your search."}
            </p>
          ) : (
            sorted.map((member: any) => (
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
                  disabled={isPending}
                  onClick={() => onAdd(member)}
                  data-testid={`button-grant-admin-${member.userId}`}>
                  <UserPlus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminRegistrationsView({ registrations, regsLoading, tournamentId, onApprove, onReject, onPayment }: {
  registrations: any[]; regsLoading: boolean; tournamentId: number;
  onApprove: (id: number) => void; onReject: (id: number) => void; onPayment: (id: number, confirmed: boolean) => void;
}) {
  const updateRegMutation = useUpdateRegistration();
  const deleteRegMutation = useDeleteRegistration();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (regsLoading) return <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />;
  if (!registrations?.length) return <EmptyState icon={Users} title="No Registrations" description="No one has registered yet." />;

  const validRegIds = new Set(registrations.map((r: any) => r.id));
  const reconciledRegIds = new Set([...selectedIds].filter(id => validRegIds.has(id)));
  if (reconciledRegIds.size !== selectedIds.size && selectedIds.size > 0) {
    setTimeout(() => setSelectedIds(reconciledRegIds), 0);
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === registrations.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(registrations.map((r: any) => r.id)));
  }

  async function handleBulkAction(action: "APPROVED" | "REJECTED") {
    if (selectedIds.size === 0) return;
    let success = 0;
    for (const id of selectedIds) {
      try { await updateRegMutation.mutateAsync({ id, status: action }); success++; } catch {}
    }
    toast({ title: `${success} player${success !== 1 ? "s" : ""} ${action.toLowerCase()}` });
    setSelectedIds(new Set());
  }

  async function handleBulkPayment(confirmed: boolean) {
    if (selectedIds.size === 0) return;
    let success = 0;
    for (const id of selectedIds) {
      try { await updateRegMutation.mutateAsync({ id, paymentConfirmed: confirmed }); success++; } catch {}
    }
    toast({ title: `${success} payment${success !== 1 ? "s" : ""} ${confirmed ? "confirmed" : "unconfirmed"}` });
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="px-4 py-3 bg-muted/20 dark:bg-muted/10 border-b border-border/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={registrations.length > 0 && selectedIds.size === registrations.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
              data-testid="checkbox-select-all-regs" />
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Registrations</h4>
            {selectedIds.size > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold">{selectedIds.size} selected</Badge>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={updateRegMutation.isPending}
                data-testid="button-bulk-approve"
                onClick={() => handleBulkAction("APPROVED")}>
                <Check className="h-3 w-3 mr-1" />Approve ({selectedIds.size})
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive font-bold"
                disabled={updateRegMutation.isPending}
                data-testid="button-bulk-reject"
                onClick={() => handleBulkAction("REJECTED")}>
                <X className="h-3 w-3 mr-1" />Reject
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-500 font-bold"
                disabled={updateRegMutation.isPending}
                data-testid="button-bulk-confirm-payment"
                onClick={() => handleBulkPayment(true)}>
                <PoundSterling className="h-3 w-3 mr-1" />Confirm Pay
              </Button>
            </div>
          )}
        </div>
        <div className="divide-y divide-border/20">
          {registrations.map((reg: any) => (
            <div key={reg.id} className={cn("flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors flex-wrap", selectedIds.has(reg.id) && "bg-amber-500/5")} data-testid={`admin-reg-${reg.id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <input type="checkbox" checked={selectedIds.has(reg.id)}
                  onChange={() => toggleSelect(reg.id)}
                  className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid={`checkbox-reg-${reg.id}`} />
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
                {(reg.status === "PENDING" || reg.status === "WAITLISTED") && (
                  <>
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => onApprove(reg.id)}>
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" onClick={() => onReject(reg.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs font-medium" onClick={() => onPayment(reg.id, !reg.paymentConfirmed)}>
                  {reg.paymentConfirmed ? "Unpay" : "💰 Confirm"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-bold"
                  data-testid={`button-remove-player-${reg.id}`}
                  disabled={deleteRegMutation.isPending}
                  onClick={async () => {
                    try {
                      await deleteRegMutation.mutateAsync(reg.id);
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
      </div>
    </div>
  );
}

function AdminTournamentDetailsSection({ tournament, tournamentId }: { tournament: any; tournamentId: number }) {
  const updateTournamentMutation = useUpdateTournament();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(tournament.name || "");
  const [type, setType] = useState(tournament.type || "CLUB");
  const [status, setStatus] = useState(tournament.status || "DRAFT");
  const [startDate, setStartDate] = useState(tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : "");
  const [endDate, setEndDate] = useState(tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : "");
  const [registrationDeadline, setRegistrationDeadline] = useState(tournament.registrationDeadline ? new Date(tournament.registrationDeadline).toISOString().slice(0, 16) : "");
  const [location, setLocation] = useState(tournament.location || "");
  const [description, setDescription] = useState(tournament.description || "");
  const [rules, setRules] = useState(tournament.rules || "");
  const [bannerUrl, setBannerUrl] = useState(tournament.bannerUrl || "");
  const [maxPlayers, setMaxPlayers] = useState(tournament.maxPlayers?.toString() || "");
  const [courtsAvailable, setCourtsAvailable] = useState(tournament.courtsAvailable?.toString() || "4");
  const [skillLevelMin, setSkillLevelMin] = useState(tournament.skillLevelMin || "");
  const [skillLevelMax, setSkillLevelMax] = useState(tournament.skillLevelMax || "");

  function resetForm() {
    setName(tournament.name || "");
    setType(tournament.type || "CLUB");
    setStatus(tournament.status || "DRAFT");
    setStartDate(tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : "");
    setEndDate(tournament.endDate ? new Date(tournament.endDate).toISOString().slice(0, 16) : "");
    setRegistrationDeadline(tournament.registrationDeadline ? new Date(tournament.registrationDeadline).toISOString().slice(0, 16) : "");
    setLocation(tournament.location || "");
    setDescription(tournament.description || "");
    setRules(tournament.rules || "");
    setBannerUrl(tournament.bannerUrl || "");
    setMaxPlayers(tournament.maxPlayers?.toString() || "");
    setCourtsAvailable(tournament.courtsAvailable?.toString() || "4");
    setSkillLevelMin(tournament.skillLevelMin || "");
    setSkillLevelMax(tournament.skillLevelMax || "");
    setEditing(false);
  }

  async function handleSave() {
    if (!name.trim()) { toast({ title: "Error", description: "Tournament name is required", variant: "destructive" }); return; }
    if (!startDate || !endDate) { toast({ title: "Error", description: "Start and end dates are required", variant: "destructive" }); return; }
    try {
      await updateTournamentMutation.mutateAsync({
        id: tournamentId,
        name: name.trim(),
        type,
        status,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        location: location.trim() || null,
        description: description.trim() || null,
        rules: rules.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
        courtsAvailable: parseInt(courtsAvailable) || 4,
        skillLevelMin: skillLevelMin || null,
        skillLevelMax: skillLevelMax || null,
      });
      toast({ title: "Tournament Updated" });
      setEditing(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  const inputCls = "w-full rounded-lg bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/60 transition-colors p-2.5";
  const labelCls = "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Settings className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Tournament Details</h4>
            <p className="text-[10px] text-muted-foreground">Edit name, dates, location, and all tournament info</p>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => setEditing(true)} data-testid="button-edit-details">
            <Edit3 className="h-3 w-3 mr-1" />Edit All
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={labelCls}>Tournament Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tournament name" className={inputCls} data-testid="input-tournament-name" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls} data-testid="select-tournament-type">
                <option value="CLUB">Club</option>
                <option value="OPEN">Open</option>
                <option value="LEAGUE">League</option>
                <option value="FRIENDLY">Friendly</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls} data-testid="select-tournament-status">
                <option value="DRAFT">Draft</option>
                <option value="REGISTRATION">Registration Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Start Date & Time *</label>
              <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} data-testid="input-start-date" />
            </div>
            <div>
              <label className={labelCls}>End Date & Time *</label>
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} data-testid="input-end-date" />
            </div>
            <div>
              <label className={labelCls}>Registration Deadline</label>
              <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className={inputCls} data-testid="input-reg-deadline" />
            </div>
            <div>
              <label className={labelCls}>Max Players</label>
              <input type="number" min="0" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} placeholder="Unlimited" className={inputCls} data-testid="input-max-players" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Location / Address</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue address" className={inputCls} data-testid="input-location" />
            </div>
            <div>
              <label className={labelCls}>Courts Available</label>
              <input type="number" min="1" value={courtsAvailable} onChange={(e) => setCourtsAvailable(e.target.value)} className={inputCls} data-testid="input-courts-available" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Min Skill Level</label>
                <select value={skillLevelMin} onChange={(e) => setSkillLevelMin(e.target.value)} className={inputCls} data-testid="select-skill-min">
                  <option value="">Any</option>
                  {["Beginner", "Beginner+", "Intermediate-", "Intermediate", "Intermediate+", "Advanced-", "Advanced", "Advanced+", "Elite"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Max Skill Level</label>
                <select value={skillLevelMax} onChange={(e) => setSkillLevelMax(e.target.value)} className={inputCls} data-testid="select-skill-max">
                  <option value="">Any</option>
                  {["Beginner", "Beginner+", "Intermediate-", "Intermediate", "Intermediate+", "Advanced-", "Advanced", "Advanced+", "Elite"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Banner Image URL</label>
              <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." className={inputCls} data-testid="input-banner-url" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tournament description, format details..." rows={3}
                className={cn(inputCls, "resize-y min-h-[80px]")} data-testid="input-tournament-description" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Rules</label>
              <textarea value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Tournament rules and regulations..." rows={3}
                className={cn(inputCls, "resize-y min-h-[80px]")} data-testid="input-tournament-rules" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="h-9 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold border-0 px-6"
              disabled={updateTournamentMutation.isPending}
              onClick={handleSave} data-testid="button-save-details">
              {updateTournamentMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Save Changes
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { label: "Name", value: tournament.name, icon: Trophy },
              { label: "Type", value: tournament.type, icon: Globe },
              { label: "Status", value: tournament.status?.replace("_", " "), icon: Sparkles },
              { label: "Start", value: tournament.startDate ? format(new Date(tournament.startDate), "PPp") : "Not set", icon: Calendar },
              { label: "End", value: tournament.endDate ? format(new Date(tournament.endDate), "PPp") : "Not set", icon: Calendar },
              { label: "Reg Deadline", value: tournament.registrationDeadline ? format(new Date(tournament.registrationDeadline), "PPp") : "None", icon: Clock },
              { label: "Location", value: tournament.location || "Not set", icon: MapPin },
              { label: "Max Players", value: tournament.maxPlayers || "Unlimited", icon: Users },
              { label: "Courts", value: tournament.courtsAvailable || "4", icon: Monitor },
              { label: "Skill Range", value: (tournament.skillLevelMin || tournament.skillLevelMax) ? `${tournament.skillLevelMin || "Any"} - ${tournament.skillLevelMax || "Any"}` : "All levels", icon: BarChart3 },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/20">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase w-20 flex-shrink-0">{item.label}</span>
                <span className="text-sm font-medium text-foreground truncate">{item.value}</span>
              </div>
            ))}
          </div>
          {tournament.description && (
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Description</span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tournament.description}</p>
            </div>
          )}
          {tournament.rules && (
            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Rules</span>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminEntryFeeSection({ tournament, tournamentId }: { tournament: any; tournamentId: number }) {
  const updateTournamentMutation = useUpdateTournament();
  const { toast } = useToast();
  const [entryFee, setEntryFee] = useState(tournament.entryFee || "");
  const [externalEntryFee, setExternalEntryFee] = useState(tournament.externalEntryFee || "");
  const [editing, setEditing] = useState(false);

  async function handleSave() {
    try {
      await updateTournamentMutation.mutateAsync({
        id: tournamentId,
        entryFee: entryFee || "0",
        externalEntryFee: externalEntryFee || "0",
      });
      const desc = [];
      if (entryFee) desc.push(`Members: £${parseFloat(entryFee).toFixed(2)}`);
      if (externalEntryFee && externalEntryFee !== entryFee) desc.push(`External: £${parseFloat(externalEntryFee).toFixed(2)}`);
      toast({ title: "Entry Fees Updated", description: desc.join(" · ") || "Fees removed" });
      setEditing(false);
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  const hasExternalFee = tournament.externalEntryFee && parseFloat(tournament.externalEntryFee) > 0 && parseFloat(tournament.externalEntryFee) !== parseFloat(tournament.entryFee || "0");

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Banknote className="h-4 w-4 text-white" />
          </div>
          <div>
            <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Tournament Entry Fees</h4>
            <p className="text-[10px] text-muted-foreground">Set fees for club members and external players</p>
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => setEditing(true)} data-testid="button-edit-entry-fee">
            <Edit3 className="h-3 w-3 mr-1" />Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Member Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-card border border-amber-500/40 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/60 transition-colors p-3 pl-7"
                  data-testid="input-entry-fee"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">External Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">£</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={externalEntryFee}
                  onChange={(e) => setExternalEntryFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-card border border-violet-500/40 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/60 transition-colors p-3 pl-7"
                  data-testid="input-external-entry-fee"
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Leave at 0 or same as member fee for single pricing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-10 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-0"
              disabled={updateTournamentMutation.isPending}
              onClick={handleSave} data-testid="button-save-entry-fee">
              {updateTournamentMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button size="sm" variant="outline" className="h-10" onClick={() => { setEntryFee(tournament.entryFee || ""); setExternalEntryFee(tournament.externalEntryFee || ""); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Member Fee</p>
              <p className="text-lg font-black text-foreground">
                {tournament.entryFee && parseFloat(tournament.entryFee) > 0 ? `£${parseFloat(tournament.entryFee).toFixed(2)}` : "Free"}
              </p>
            </div>
          </div>
          {hasExternalFee && (
            <>
              <div className="h-8 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="text-xs text-muted-foreground">External Fee</p>
                  <p className="text-lg font-black text-foreground">£{parseFloat(tournament.externalEntryFee).toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AdminFinanceView({ tournamentId, tournament }: { tournamentId: number; tournament: any }) {
  const { data: finances, isLoading } = useTournamentFinances(tournamentId);
  const updatePaymentMutation = useUpdateTournamentPayment();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />;
  if (!finances) return <EmptyState icon={Wallet} title="No Financial Data" description="Set an entry fee in Settings to track tournament finances." />;

  const internalFee = parseFloat(tournament.entryFee || "0");
  const externalFee = parseFloat(tournament.externalEntryFee || tournament.entryFee || "0");
  const hasDualFees = externalFee > 0 && externalFee !== internalFee;
  const players = finances.players?.filter((p: any) => p.status !== "REJECTED") || [];
  const validIds = new Set(players.map((p: any) => p.id));
  const reconciledIds = new Set([...selectedIds].filter(id => validIds.has(id)));
  if (reconciledIds.size !== selectedIds.size && selectedIds.size > 0) {
    setTimeout(() => setSelectedIds(reconciledIds), 0);
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === players.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(players.map((p: any) => p.id)));
    }
  }

  async function handleBulkPayment(status: string) {
    if (selectedIds.size === 0) return;
    let success = 0;
    for (const regId of selectedIds) {
      try {
        await updatePaymentMutation.mutateAsync({ tournamentId, regId, paymentStatus: status });
        success++;
      } catch {}
    }
    toast({ title: `${success} player${success !== 1 ? "s" : ""} updated to ${status}` });
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: PoundSterling, label: hasDualFees ? "Member / External" : "Entry Fee", value: hasDualFees ? `£${internalFee.toFixed(2)} / £${externalFee.toFixed(2)}` : `£${internalFee.toFixed(2)}`, accent: "from-amber-500 to-orange-500" },
          { icon: TrendingUp, label: "Expected Revenue", value: `£${finances.totalExpected.toFixed(2)}`, accent: "from-emerald-500 to-teal-500" },
          { icon: Wallet, label: "Collected", value: `£${finances.totalCollected.toFixed(2)}`, accent: "from-blue-500 to-indigo-500" },
          { icon: Clock, label: "Pending", value: `£${finances.totalPending.toFixed(2)}`, accent: "from-violet-500 to-purple-500" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-4 hover:border-amber-500/20 transition-colors">
            <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2", item.accent)}>
              <item.icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-black text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Collection Rate</h4>
          <span className={cn("text-xl font-black", finances.collectionRate >= 80 ? "text-emerald-500" : finances.collectionRate >= 50 ? "text-amber-500" : "text-red-500")}>
            {finances.collectionRate}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted/50 dark:bg-muted/30 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 shadow-lg"
            style={{ width: `${finances.collectionRate}%`, background: finances.collectionRate >= 80 ? "linear-gradient(90deg, #10b981, #14b8a6)" : finances.collectionRate >= 50 ? "linear-gradient(90deg, #f59e0b, #f97316)" : "linear-gradient(90deg, #ef4444, #f97316)" }} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{finances.playerCount} approved players</span>
          <span>{finances.unpaidCount} unpaid</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="px-4 py-3 bg-muted/20 dark:bg-muted/10 border-b border-border/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={players.length > 0 && selectedIds.size === players.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
              data-testid="checkbox-select-all-finance" />
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Player Payments</h4>
            {selectedIds.size > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold">{selectedIds.size} selected</Badge>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={updatePaymentMutation.isPending}
                data-testid="button-bulk-mark-paid"
                onClick={() => handleBulkPayment("PAID")}>
                <Check className="h-3 w-3 mr-1" />Mark Paid ({selectedIds.size})
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-500 font-bold"
                disabled={updatePaymentMutation.isPending}
                data-testid="button-bulk-mark-pending"
                onClick={() => handleBulkPayment("PENDING")}>
                <Clock className="h-3 w-3 mr-1" />Pending
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-500 font-bold"
                disabled={updatePaymentMutation.isPending}
                data-testid="button-bulk-mark-unpaid"
                onClick={() => handleBulkPayment("UNPAID")}>
                <X className="h-3 w-3 mr-1" />Unpaid
              </Button>
            </div>
          )}
        </div>
        <div className="divide-y divide-border/20">
          {players.map((player: any) => (
            <div key={player.id} className={cn("flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors", selectedIds.has(player.id) && "bg-amber-500/5")} data-testid={`finance-player-${player.id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <input type="checkbox" checked={selectedIds.has(player.id)}
                  onChange={() => toggleSelect(player.id)}
                  className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid={`checkbox-finance-${player.id}`} />
                <PlayerAvatar name={player.user?.fullName || "?"} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{player.user?.fullName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>£{(player.playerFee ?? internalFee).toFixed(2)}</span>
                    {hasDualFees && (
                      <Badge className={cn("text-[8px] px-1 py-0 border font-bold", player.isInternal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-violet-500/10 text-violet-500 border-violet-500/30")}>
                        {player.isInternal ? "Member" : "External"}
                      </Badge>
                    )}
                    {player.paymentMethod && <span>{player.paymentMethod}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={cn("text-[9px] px-1.5 border font-bold",
                  player.paymentStatus === "PAID" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  player.paymentStatus === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                )}>{player.paymentStatus}</Badge>
                {player.paymentStatus !== "PAID" && (
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    disabled={updatePaymentMutation.isPending}
                    onClick={async () => {
                      try {
                        await updatePaymentMutation.mutateAsync({ tournamentId, regId: player.id, paymentStatus: "PAID" });
                        toast({ title: "Payment Confirmed" });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <Check className="h-3 w-3 mr-1" />Paid
                  </Button>
                )}
                {player.paymentStatus === "PAID" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-500"
                    disabled={updatePaymentMutation.isPending}
                    onClick={async () => {
                      try {
                        await updatePaymentMutation.mutateAsync({ tournamentId, regId: player.id, paymentStatus: "UNPAID" });
                        toast({ title: "Payment Reverted" });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPrizesView({ tournamentId, tournament, categories }: { tournamentId: number; tournament: any; categories: any[] }) {
  const { data: prizes } = useTournamentPrizesQuery(tournamentId);
  const createPrizeMutation = useCreatePrize();
  const deletePrizeMutation = useDeletePrize();
  const { toast } = useToast();
  const [newPrize, setNewPrize] = useState({ title: "", description: "", placement: 1, prizeValue: "", prizeType: "trophy", iconType: "trophy", categoryId: "" });

  const ICON_OPTIONS = [
    { value: "trophy", label: "Trophy", icon: Trophy },
    { value: "medal", label: "Medal", icon: Medal },
    { value: "star", label: "Star", icon: Star },
    { value: "crown", label: "Crown", icon: Crown },
    { value: "award", label: "Award", icon: Award },
    { value: "gift", label: "Gift", icon: Gift },
    { value: "flame", label: "Flame", icon: Flame },
    { value: "dollar", label: "Cash Prize", icon: PoundSterling },
  ];

  async function handleCreate() {
    if (!newPrize.title.trim()) return toast({ title: "Title is required", variant: "destructive" });
    try {
      await createPrizeMutation.mutateAsync({
        tournamentId,
        title: newPrize.title,
        description: newPrize.description || undefined,
        placement: newPrize.placement,
        prizeValue: newPrize.prizeValue || undefined,
        prizeType: newPrize.prizeType,
        iconType: newPrize.iconType,
        categoryId: newPrize.categoryId ? Number(newPrize.categoryId) : undefined,
      });
      toast({ title: "Prize Created" });
      setNewPrize({ title: "", description: "", placement: 1, prizeValue: "", prizeType: "trophy", iconType: "trophy", categoryId: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
        <h4 className="font-black text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          Create Prize
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Prize Title (e.g., Winner - Men's Doubles)" value={newPrize.title}
            onChange={(e) => setNewPrize(p => ({ ...p, title: e.target.value }))}
            className="w-full rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors p-3"
            data-testid="input-prize-title" />
          <input placeholder="Prize Value (e.g., £100, Trophy + Medal)" value={newPrize.prizeValue}
            onChange={(e) => setNewPrize(p => ({ ...p, prizeValue: e.target.value }))}
            className="w-full rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors p-3"
            data-testid="input-prize-value" />
        </div>
        <textarea placeholder="Description (optional)" value={newPrize.description}
          onChange={(e) => setNewPrize(p => ({ ...p, description: e.target.value }))}
          rows={2}
          className="w-full rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 transition-colors p-3 resize-none"
          data-testid="input-prize-description" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Placement</label>
            <select value={newPrize.placement} onChange={(e) => setNewPrize(p => ({ ...p, placement: Number(e.target.value) }))}
              className="w-full rounded-lg bg-card border border-border text-sm text-foreground p-2 outline-none focus:border-amber-500/40">
              <option value={1}>1st Place</option>
              <option value={2}>2nd Place</option>
              <option value={3}>3rd Place</option>
              <option value={4}>4th Place</option>
              <option value={5}>Special Prize</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Icon</label>
            <select value={newPrize.iconType} onChange={(e) => setNewPrize(p => ({ ...p, iconType: e.target.value }))}
              className="w-full rounded-lg bg-card border border-border text-sm text-foreground p-2 outline-none focus:border-amber-500/40">
              {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
              <select value={newPrize.categoryId} onChange={(e) => setNewPrize(p => ({ ...p, categoryId: e.target.value }))}
                className="w-full rounded-lg bg-card border border-border text-sm text-foreground p-2 outline-none focus:border-amber-500/40">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-0"
          disabled={createPrizeMutation.isPending}
          data-testid="button-create-prize"
          onClick={handleCreate}>
          {createPrizeMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Add Prize
        </Button>
      </div>

      {prizes && prizes.length > 0 && (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 bg-muted/20 dark:bg-muted/10 border-b border-border/30">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Current Prizes ({prizes.length})</h4>
          </div>
          <div className="divide-y divide-border/20">
            {prizes.map((prize: any) => {
              const PrizeIcon = { trophy: Trophy, medal: Medal, star: Star, crown: Crown, award: Award, gift: Gift, flame: Flame, dollar: PoundSterling }[prize.iconType as string] || Trophy;
              const placementColors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-amber-600 to-orange-700", "from-blue-400 to-indigo-500"];
              return (
                <div key={prize.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors" data-testid={`admin-prize-${prize.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", placementColors[Math.min(prize.placement - 1, 3)])}>
                      <PrizeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{prize.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{prize.placement === 1 ? "1st" : prize.placement === 2 ? "2nd" : prize.placement === 3 ? "3rd" : `${prize.placement}th`} Place</span>
                        {prize.prizeValue && <Badge variant="outline" className="text-[9px] font-bold">{prize.prizeValue}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive"
                    disabled={deletePrizeMutation.isPending}
                    onClick={async () => {
                      try {
                        await deletePrizeMutation.mutateAsync({ prizeId: prize.id, tournamentId });
                        toast({ title: "Prize Deleted" });
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PrizesTab({ tournamentId, tournament, categories }: { tournamentId: number; tournament: any; categories: any[] }) {
  const { data: prizes, isLoading } = useTournamentPrizesQuery(tournamentId);

  const ICON_MAP: Record<string, any> = { trophy: Trophy, medal: Medal, star: Star, crown: Crown, award: Award, gift: Gift, flame: Flame, dollar: PoundSterling };

  const internalFee = parseFloat(tournament.entryFee || "0");
  const externalFee = parseFloat(tournament.externalEntryFee || tournament.entryFee || "0");
  const avgFee = (internalFee + externalFee) / 2;
  const regCount = tournament.registrationCount || 0;
  const prizePool = avgFee * regCount;

  const placementLabels = ["Champion", "Runner-Up", "3rd Place", "4th Place", "Special"];
  const placementGradients = [
    "from-amber-400 via-yellow-400 to-amber-500",
    "from-slate-300 via-slate-200 to-slate-400",
    "from-amber-600 via-orange-500 to-amber-700",
    "from-blue-400 via-indigo-400 to-blue-500",
    "from-violet-400 via-purple-400 to-violet-500",
  ];
  const placementShadows = [
    "shadow-amber-500/30",
    "shadow-slate-400/30",
    "shadow-orange-500/30",
    "shadow-blue-500/30",
    "shadow-violet-500/30",
  ];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl min-h-[180px]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/90 via-orange-500/80 to-red-500/70" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)" }} />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[180px] px-6 py-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-xl shadow-black/10">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Prizes & Rewards</h2>
          <p className="text-white/80 text-sm font-medium">{tournament.name}</p>
          {prizePool > 0 && (
            <div className="mt-3 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm">
              <span className="text-white font-black text-sm">Prize Pool: £{prizePool.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {internalFee > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
            <PoundSterling className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Entry Fee</p>
            <p className="text-lg font-black text-foreground">
              {externalFee !== internalFee ? `£${internalFee.toFixed(2)} / £${externalFee.toFixed(2)}` : `£${internalFee.toFixed(2)}`}
            </p>
            {externalFee !== internalFee && <p className="text-[8px] text-muted-foreground">Member / External</p>}
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
            <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Players</p>
            <p className="text-lg font-black text-foreground">{regCount}</p>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-4 text-center">
            <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Prizes</p>
            <p className="text-lg font-black text-foreground">{prizes?.length || 0}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />
      ) : !prizes || prizes.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-black text-foreground mb-1">Prizes Coming Soon</h3>
          <p className="text-sm text-muted-foreground">Tournament prizes will be announced shortly. Stay tuned!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prizes.map((prize: any, i: number) => {
            const PrizeIcon = ICON_MAP[prize.iconType] || Trophy;
            const gradientIdx = Math.min(prize.placement - 1, 4);
            const cat = categories.find(c => c.id === prize.categoryId);

            return (
              <div key={prize.id}
                className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-amber-500/30 transition-all duration-300"
                data-testid={`prize-card-${prize.id}`}>
                <div className={cn("absolute top-0 left-0 w-1.5 h-full rounded-l-2xl bg-gradient-to-b opacity-80", placementGradients[gradientIdx])} />
                <div className="pl-5 pr-4 py-4 flex items-start gap-4">
                  <div className={cn("h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl flex-shrink-0",
                    placementGradients[gradientIdx], placementShadows[gradientIdx])}>
                    <PrizeIcon className="h-7 w-7 text-white drop-shadow-md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={cn("text-[9px] px-1.5 border font-black",
                        gradientIdx === 0 ? "bg-amber-500/20 text-amber-500 border-amber-500/30" :
                        gradientIdx === 1 ? "bg-slate-400/20 text-slate-400 border-slate-400/30" :
                        gradientIdx === 2 ? "bg-orange-500/20 text-orange-500 border-orange-500/30" :
                        "bg-blue-500/20 text-blue-500 border-blue-500/30"
                      )}>
                        {placementLabels[gradientIdx]}
                      </Badge>
                      {cat && <Badge variant="outline" className="text-[9px] font-bold">{cat.name}</Badge>}
                    </div>
                    <h3 className="text-base font-black text-foreground">{prize.title}</h3>
                    {prize.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{prize.description}</p>}
                    {prize.prizeValue && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <PoundSterling className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-black text-amber-500">{prize.prizeValue}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tournament.rules && (
        <div className="rounded-xl bg-card border border-border/50 p-4">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Tournament Rules</h3>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tournament.rules}</p>
        </div>
      )}
    </div>
  );
}

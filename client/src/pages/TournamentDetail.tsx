import { useRoute } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useTournament, useTournamentCategories, useTournamentTeams,
  useTournamentMatches, useTournamentStandings,
  useCreateCategory, useDeleteCategory, useUpdateCategory, useRegisterTeam, useDeleteTeam, useUpdateTeam,
  useGenerateMatches, useScoreMatch, useAdvanceWinners, useAddGroupMatch, useUpdateTournament, useDeleteTournamentMatch,
  useTournamentRegistrations, useTournamentAllPlayers, useTournamentPairs, useTournamentTeamsByCategory,
  useTournamentPlayerPool, useTournamentPairRequests, useTournamentWaitlist,
  useRegisterForTournament, useUpdateRegistration, useDeleteRegistration, useSendPairRequest, useRespondPairRequest, useUpdatePairName,
  useWithdrawRegistration, useAdminCreatePair, useAdminAddPlayer, useAutoPopulateTeams, useBulkAssignGroups, useAssignTeamGroup,
  useTournamentIsAdmin, useTournamentAdmins, useTournamentEligibleAdmins,
  useAddTournamentAdmin, useRemoveTournamentAdmin,
  useSeedDemoPlayers, useClearDemoPlayers, useRestartTournament,
  useTournamentGroups, useCreateTournamentGroup, useUpdateTournamentGroup, useDeleteTournamentGroup,
  useAddPairToGroup, useRemovePairFromGroup,
  useTournamentStages, useCreateTournamentStage, useUpdateTournamentStage, useDeleteTournamentStage,
  useTournamentFinances, useConfirmTournamentPayment, useUpdateTournamentPayment,
  useTournamentPrizesQuery, useCreatePrize, useDeletePrize,
  useTournamentCourts, useCreateCourt, useUpdateCourt, useDeleteCourt,
  useAssignMatchCourt, useUpdateMatchStatus, useUpdateMatchTeamNames, useUpdateMatchScheduledTime, useBulkUpdateMatchScheduledTime,
  useTournamentPlayerStats, useRecalculateStats, useRecalculateFees,
  useMyTournamentCategories, useJoinCategorySolo, useLeaveCategory, useSelfUnpair,
  useConfirmCategoryPayment, useUpdateTeamPayment,
  usePlayerTournamentStats,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import { UkDateTimePicker } from "@/components/UkDateTimePicker";
import { utcToLondonInputs, londonInputsToUtcISO, formatLondon } from "@/lib/uk-time";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Trophy, Calendar, MapPin, Users, Swords, BarChart3, Plus, Trash2, Edit3,
  Play, ArrowLeft, GitBranch, LayoutGrid, Settings, Search, Check, X, Crown,
  UserPlus, UserMinus, UserX, Clock, Shield, ChevronRight, ChevronDown, Zap, Award, Star, Target, Lock, CheckCircle,
  Building2, ExternalLink, Flame, Medal, PoundSterling, Gift, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Eye, AlertTriangle, Globe, Sparkles, FileText,
  Monitor, Square, CircleDot, ArrowUpDown, BarChart, RotateCcw, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import tournamentHeroImg from "@assets/tournament-hero.png";

type SubPage = "overview" | "players" | "pairs" | "signup" | "categories" | "matches" | "groups" | "courts" | "stats" | "prizes" | "admin";

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

  const initialSubPage = ((): SubPage => {
    try {
      const tab = new URLSearchParams(window.location.search).get("tab");
      const allowed: SubPage[] = ["overview", "players", "pairs", "signup", "categories", "matches", "groups", "courts", "stats", "prizes", "admin"];
      if (tab && (allowed as string[]).includes(tab)) return tab as SubPage;
    } catch {}
    return "players";
  })();
  const [subPage, setSubPage] = useState<SubPage>(initialSubPage);
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
    { key: "categories", label: "My Categories", icon: LayoutGrid },
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
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatLondon(tournament.startDate, "d MMM")} – {formatLondon(tournament.endDate, "d MMM")}</span>
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
      {subPage === "pairs" && <PairsTab tournamentId={tournamentId} onNavigate={setSubPage} />}
      {subPage === "signup" && <SignUpTab tournamentId={tournamentId} tournament={tournament} />}
      {subPage === "categories" && <MyCategoriesTab tournamentId={tournamentId} />}
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
              <span>{formatLondon(tournament.startDate, "d MMM yyyy")} – {formatLondon(tournament.endDate, "d MMM yyyy")}</span>
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

const DOUBLES_TAG_STYLES: Record<string, string> = {
  MX: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  MD: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  XD: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

function PartnerTags({ tags, hasPartner }: { tags?: string[]; hasPartner?: boolean }) {
  if (hasPartner && tags && tags.length > 0) {
    return (
      <>
        {tags.map((t) => (
          <Badge key={t} className={cn("text-[9px] px-1.5 border font-bold", DOUBLES_TAG_STYLES[t] || "bg-muted text-muted-foreground border-border")} data-testid={`tag-partner-${t}`}>
            {t}
          </Badge>
        ))}
      </>
    );
  }
  return (
    <Badge className="text-[9px] px-1.5 border font-bold bg-gray-500/15 text-gray-400 border-gray-500/30" data-testid="tag-no-partner">
      NO PARTNER
    </Badge>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground truncate">{p.user?.fullName}</h4>
                        <PartnerTags tags={p.partnerTags} hasPartner={p.hasPartner} />
                      </div>
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
  const { data: allTimeT, isLoading: allTimeLoading } = usePlayerTournamentStats(statsTab === "tournament" ? profileId : null);

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
                            {match.completedAt && <div>{formatLondon(match.completedAt, "MMM d, yy")}</div>}
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
              allTimeLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
              ) : allTimeT && allTimeT.tournamentsPlayed > 0 ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-bold">All-Time Tournament Record</span>
                    <span className="text-slate-600">· No matches in this tournament yet</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Tournaments", value: `${allTimeT.tournamentsPlayed}`, sub: "Played", icon: Trophy, color: "from-amber-500 to-orange-600", textColor: "text-amber-400" },
                      { label: "Win Rate", value: `${allTimeT.winRate}%`, sub: `${allTimeT.matchesWon}W / ${allTimeT.matchesLost}L`, icon: Target, color: "from-emerald-500 to-teal-600", textColor: "text-emerald-400" },
                      { label: "Matches Played", value: `${allTimeT.matchesPlayed}`, sub: "All tournaments", icon: Swords, color: "from-violet-500 to-purple-600", textColor: "text-violet-400" },
                      { label: "Point Diff", value: `${allTimeT.pointDifference > 0 ? "+" : ""}${allTimeT.pointDifference}`, sub: `${allTimeT.pointsScored} / ${allTimeT.pointsConceded}`, icon: Flame, color: "from-rose-500 to-pink-600", textColor: "text-rose-400" },
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
                  {allTimeT.tournaments.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Previous Tournaments ({allTimeT.tournaments.length})
                      </h4>
                      <div className="space-y-1 max-h-[250px] overflow-y-auto">
                        {allTimeT.tournaments.map((t) => (
                          <div key={t.tournamentId} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/40" data-testid={`alltime-tournament-${t.tournamentId}`}>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-300 truncate">{t.tournamentName}</div>
                              <div className="text-[10px] text-slate-500">
                                {t.endDate ? formatLondon(t.endDate, "MMM yyyy") : "—"}
                                {t.categories > 1 && ` · ${t.categories} categories`}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-center">
                                <div className="text-xs font-mono font-bold text-emerald-400">{t.matchesWon}</div>
                                <div className="text-[9px] text-slate-600">W</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-mono font-bold text-red-400">{t.matchesLost}</div>
                                <div className="text-[9px] text-slate-600">L</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">No Tournament Matches Yet</p>
                  <p className="text-xs text-slate-600 mt-1">Stats will appear once this player completes tournament matches.</p>
                </div>
              )
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

function PairsTab({ tournamentId, onNavigate }: { tournamentId: number; onNavigate?: (sub: SubPage) => void }) {
  const { data: user } = useUser();
  const { data: pairs, isLoading } = useTournamentPairs(tournamentId);
  const { data: teamsByCategory } = useTournamentTeamsByCategory(tournamentId);
  const { data: pairRequests } = useTournamentPairRequests(tournamentId);
  const { data: categories } = useTournamentCategories(tournamentId);
  const catNameById = (id: number | null | undefined): string => {
    if (!id) return "Tournament-wide";
    const c = (categories || []).find((x: any) => x.id === id);
    return c?.name || `Category #${id}`;
  };
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


  // Only show pairs that belong to a specific category. Tournament-wide pairs
  // (categoryId == null) are intentionally NOT surfaced as their own section.
  const allTeamRows = [...(teamsByCategory || [])];

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
      {(myIncomingRequests.length > 0 || mySentRequests.length > 0) && (() => {
        // Group both incoming and sent requests by categoryId. Null categoryId
        // is a legacy tournament-wide pair request and gets its own group.
        const groups = new Map<string, { catId: number | null; catName: string; incoming: any[]; sent: any[] }>();
        const keyOf = (cid: number | null | undefined) => cid == null ? "__tw__" : `cat-${cid}`;
        for (const pr of myIncomingRequests) {
          const k = keyOf(pr.categoryId);
          if (!groups.has(k)) groups.set(k, { catId: pr.categoryId ?? null, catName: catNameById(pr.categoryId), incoming: [], sent: [] });
          groups.get(k)!.incoming.push(pr);
        }
        for (const pr of mySentRequests) {
          const k = keyOf(pr.categoryId);
          if (!groups.has(k)) groups.set(k, { catId: pr.categoryId ?? null, catName: catNameById(pr.categoryId), incoming: [], sent: [] });
          groups.get(k)!.sent.push(pr);
        }
        return (
          <div className="space-y-4" data-testid="pairs-pending-by-category">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Pending Pair Requests</h3>
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px] font-bold">{myIncomingRequests.length + mySentRequests.length}</Badge>
            </div>
            {Array.from(groups.values()).map((g) => (
              <div key={g.catId ?? "tw"} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2" data-testid={`pairs-pending-group-${g.catId ?? "tw"}`}>
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="outline" className="text-[10px] font-black uppercase border-amber-500/40 text-amber-500">{g.catName}</Badge>
                  <span className="text-[10px] text-muted-foreground">{g.incoming.length} incoming · {g.sent.length} sent</span>
                </div>
                {g.incoming.map((pr: any) => (
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
                {g.sent.map((pr: any) => (
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
            ))}
          </div>
        );
      })()}

      {isIndividual && (
        <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/[0.06] to-blue-500/[0.06] p-4 flex items-center justify-between gap-3 flex-wrap" data-testid="pairs-find-partner-cta">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Looking for a partner?</p>
              <p className="text-[11px] text-muted-foreground">Pick a category and propose a partner from the <span className="font-bold text-cyan-500">My Categories</span> tab.</p>
            </div>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold border-0"
            data-testid="button-pairs-go-categories"
            onClick={() => onNavigate?.("categories")}>
            Open My Categories
          </Button>
        </div>
      )}



      {allTeamRows.length > 0 && allTeamRows.some((r: any) => r.confirmedPairs.length > 0 || r.soloEntries.length > 0) && (
        <div className="space-y-8" data-testid="pairs-by-category">
          {allTeamRows.map((row: any, catIdx: number) => {
            if (row.confirmedPairs.length === 0 && row.soloEntries.length === 0) return null;
            const catKey = `cat-${row.category.id}`;
            const genderBadge = (() => {
              const r = (row.category.genderRestriction || "").toUpperCase();
              if (r === "FEMALE_ONLY" || r === "FEMALE") return <Badge className="text-[10px] font-bold bg-pink-500/15 text-pink-500 border-pink-500/30">Female only</Badge>;
              if (r === "MALE_ONLY" || r === "MALE") return <Badge className="text-[10px] font-bold bg-blue-500/15 text-blue-500 border-blue-500/30">Male only</Badge>;
              return null;
            })();
            return (
              <div key={row.category.id} className="space-y-4" data-testid={`pairs-cat-section-${row.category.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: catIdx * 0.05 }}
                  className="relative overflow-hidden rounded-2xl p-5"
                  style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)" }}
                >
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                  <div className="relative flex items-center justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className="h-1.5 w-1.5 rounded-full bg-violet-400 esports-status-dot" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-violet-400/80">{row.category.name}</span>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-white/10 text-slate-300">{(row.category.playersPerSide || 1) > 1 ? "Doubles" : "Singles"}</Badge>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-white/10 text-slate-300">{row.category.format}</Badge>
                        {genderBadge}
                      </div>
                      <h2 className="text-xl font-black text-white uppercase tracking-wider">Confirmed Pairs</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {row.confirmedPairs.length === 0 ? "No pairs confirmed yet for this category" : "Elite duos locked in for competition"}
                        {row.soloEntries.length > 0 && ` · ${row.soloEntries.length} solo waiting`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-md" />
                        <div className="relative h-12 px-4 rounded-xl border border-violet-500/20 flex items-center gap-2" style={{ background: "rgba(139, 92, 246, 0.08)" }}>
                          <Swords className="h-4 w-4 text-violet-400" />
                          <span className="text-xl font-black text-white" data-testid={`pairs-cat-count-${row.category.id}`}>{row.confirmedPairs.length}</span>
                          <span className="text-[9px] uppercase tracking-wider text-violet-300/70 font-bold">Teams</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {row.confirmedPairs.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {row.confirmedPairs.map((pair: any, idx: number) => {
                      const p1Name = pair.player1?.fullName || "Player 1";
                      const p2Name = pair.player2?.fullName || "Player 2";
                      const accentIdx = idx % esportsAccents.length;
                      const accent = esportsAccents[accentIdx];
                      const pairedDate = pair.createdAt ? formatLondon(pair.createdAt, "d MMM yyyy") : null;
                      const p1Level = getPlayerPowerLevel(pair.profile1?.grade || "C3", pair.profile1?.matchesPlayed || 0, pair.profile1?.matchesWon || 0);
                      const p2Level = getPlayerPowerLevel(pair.profile2?.grade || "C3", pair.profile2?.matchesPlayed || 0, pair.profile2?.matchesWon || 0);
                      const quality = getPairQuality(p1Level.power, p2Level.power);
                      const synergy = getTeamSynergy(p1Level.power, p2Level.power);
                      const isFeatured = synergy.synergy >= 75;
                      return (
                        <motion.div
                          key={`${catKey}-pair-${pair.id}`}
                          initial={{ opacity: 0, y: 20, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                          whileHover={{ scale: 1.015, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          role="button"
                          tabIndex={0}
                          className={cn("group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 rounded-2xl", isFeatured && "esports-card")}
                          data-testid={`pair-card-${row.category.id}-${idx}`}
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
                          <div className={cn("relative rounded-2xl overflow-hidden transition-all duration-300 shadow-lg group-hover:shadow-2xl", accent.glow)} style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 60%, #0f0f1a 100%)" }}>
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
                            <div className="relative p-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">#{idx + 1}</span>
                                <div className={cn("relative overflow-hidden px-2.5 py-1 rounded-full", quality.glow)} style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <div className={cn("absolute inset-0 bg-gradient-to-r opacity-15", quality.gradient)} />
                                  <span className={cn("relative text-[9px] font-black uppercase tracking-wider", quality.text)}>{quality.label}</span>
                                </div>
                              </div>
                              <h3 className="text-lg font-black tracking-wide truncate mb-4" style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} data-testid={`pair-name-${row.category.id}-${idx}`}>
                                {p1Name} & {p2Name}
                              </h3>
                              <div className="flex items-center" data-testid={`pair-players-${row.category.id}-${idx}`}>
                                {[{ name: p1Name, level: p1Level, grade: pair.profile1?.grade }, { name: p2Name, level: p2Level, grade: pair.profile2?.grade }].map((player, pi) => (
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
                                      <GradeTierBadge grade={player.grade || "—"} />
                                    </div>
                                    <div className="mt-2 w-full max-w-[80px]">
                                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${player.level.power}%` }} transition={{ duration: 0.8, delay: 0.3 + idx * 0.06, ease: "easeOut" }} className={cn("h-full rounded-full", player.level.bgColor)} style={{ opacity: 0.85 }} />
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
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${synergy.synergy}%` }} transition={{ duration: 1, delay: 0.5 + idx * 0.06, ease: "easeOut" }} className={cn("h-full rounded-full bg-gradient-to-r esports-synergy-bar", synergy.color)} style={{ opacity: 0.9 }} />
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
                )}

                {row.soloEntries.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-3 space-y-1.5" data-testid={`pairs-cat-solo-${row.category.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Looking for partner</span>
                    </div>
                    {row.soloEntries.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-foreground/80 pl-5">
                        <span className="font-bold">{t.player1?.fullName || "?"}</span>
                        <span className="italic text-[10px] text-muted-foreground">(solo)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(!pairs || pairs.length === 0) && (!teamsByCategory || !teamsByCategory.some((r: any) => r.confirmedPairs.length > 0 || r.soloEntries.length > 0)) && myIncomingRequests.length === 0 && mySentRequests.length === 0 && (!isIndividual || !playerPool || playerPool.length === 0) && (
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

function MyCategoriesTab({ tournamentId }: { tournamentId: number }) {
  const { data: user } = useUser();
  const { data: myCategories, isLoading } = useMyTournamentCategories(tournamentId);
  const { data: registrations } = useTournamentRegistrations(tournamentId);
  const { data: tournament } = useTournament(tournamentId);
  const joinSoloMutation = useJoinCategorySolo();
  const leaveMutation = useLeaveCategory();
  const selfUnpairMutation = useSelfUnpair();
  const sendPairMutation = useSendPairRequest();
  const respondPairMutation = useRespondPairRequest();
  const confirmPayMutation = useConfirmCategoryPayment();
  const { toast } = useToast();
  const [partnerPicker, setPartnerPicker] = useState<{ categoryId: number; categoryName: string } | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [leaveConfirm, setLeaveConfirm] = useState<{ categoryId: number; categoryName: string } | null>(null);

  const myRegistration = registrations?.find((r: any) => r.userId === user?.id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;

  if (!myRegistration) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
        <Zap className="h-8 w-8 text-amber-500 mx-auto" />
        <p className="text-sm font-bold text-foreground">Register first</p>
        <p className="text-xs text-muted-foreground">Use the <span className="text-amber-500 font-bold">Sign Up</span> tab to register for this tournament, then come back here to join individual categories.</p>
      </div>
    );
  }

  if (!myCategories || myCategories.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">No categories have been created for this tournament yet.</p>
      </div>
    );
  }

  async function doJoinSolo(categoryId: number) {
    try { await joinSoloMutation.mutateAsync({ categoryId, tournamentId }); toast({ title: "Joined" }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function doLeave(categoryId: number) {
    try { await leaveMutation.mutateAsync({ categoryId, tournamentId }); toast({ title: "Left category" }); setLeaveConfirm(null); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function doSendPair(toUserId: number, categoryId: number) {
    try {
      await sendPairMutation.mutateAsync({ tournamentId, toUserId, categoryId });
      toast({ title: "Pair request sent", description: "They'll need to accept before you're officially paired." });
      setPartnerPicker(null);
      setPartnerSearch("");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  // Detect a legacy tournament-wide pair. Pairs created before per-category
  // pairing existed live on the registration row (registrationType=PAIR with
  // a partnerId). They block this player from being paired per-category until
  // they unpair, so we show a banner with a self-dissolve button.
  const isLegacyPaired = myRegistration?.registrationType === "PAIR" && !!myRegistration?.partnerId && myRegistration?.status === "APPROVED";
  // If the player already has at least one per-category entry (paired or solo),
  // they are NOT actually blocked — the "unpair" prompt would only confuse them
  // into undoing a partner they've already set, so hide it in that case.
  const hasAnyCategoryEntry = (myCategories || []).some((e: any) => e.isPaired || e.isSolo);
  const legacyPartner = isLegacyPaired
    ? (registrations || []).find((r: any) => r.userId === myRegistration.partnerId)
    : null;
  const legacyPartnerName = legacyPartner?.user?.fullName || legacyPartner?.user?.email || myRegistration?.partnerName || "your partner";

  async function doSelfUnpair() {
    try { await selfUnpairMutation.mutateAsync({ tournamentId }); toast({ title: "Unpaired", description: "You can now pick a different partner per category." }); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  return (
    <div className="space-y-4" data-testid="my-categories-tab">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">
          You're registered for <span className="font-bold text-foreground">{tournament?.name}</span>. Join the categories you want to play in below — pick a different partner per doubles category.
        </p>
      </div>
      {isLegacyPaired && !hasAnyCategoryEntry && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3" data-testid="legacy-pair-banner">
          <div className="flex items-start gap-2">
            <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">You're paired with {legacyPartnerName} for the whole tournament</p>
              <p className="text-xs text-muted-foreground mt-1">
                This is an older tournament-wide pairing. Categories now use a per-category partner — so as long as this pairing is in place, you can't pick a different partner per category. Unpair below to free both of you up to join each category individually.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={doSelfUnpair} disabled={selfUnpairMutation.isPending} data-testid="button-self-unpair">
              {selfUnpairMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
              Unpair with {legacyPartnerName}
            </Button>
          </div>
        </div>
      )}
      {myCategories.map((entry: any) => {
        const cat = entry.category;
        const isSingles = cat.playersPerSide < 2;
        const isPaired = entry.isPaired;
        const isSolo = entry.isSolo;
        const inEntry = isPaired || isSolo;
        const pendingIncoming = entry.pendingRequests?.filter((pr: any) => pr.direction === "INCOMING") || [];
        const pendingOutgoing = entry.pendingRequests?.filter((pr: any) => pr.direction === "OUTGOING") || [];

        return (
          <div key={cat.id} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3" data-testid={`category-entry-${cat.id}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-foreground">{cat.name}</h3>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {isSingles ? "Singles" : "Doubles"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-bold">{cat.format}</Badge>
                  {(() => {
                    const r = (cat.genderRestriction || "").toUpperCase();
                    if (r === "FEMALE_ONLY" || r === "FEMALE") return <Badge className="text-[10px] font-bold bg-pink-500/15 text-pink-500 border-pink-500/30">Female only</Badge>;
                    if (r === "MALE_ONLY" || r === "MALE") return <Badge className="text-[10px] font-bold bg-blue-500/15 text-blue-500 border-blue-500/30">Male only</Badge>;
                    return null;
                  })()}
                  {isPaired && <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Paired</Badge>}
                  {isSolo && !isSingles && <Badge className="text-[10px] font-bold bg-amber-500/15 text-amber-500 border-amber-500/30">Looking for partner</Badge>}
                  {isSolo && isSingles && <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Entered</Badge>}
                  {entry.isFull && !inEntry && (
                    <Badge className="text-[10px] font-bold bg-red-500/20 text-red-500 border-red-500/40" data-testid={`badge-full-${cat.id}`}>
                      FULL · {entry.totalTeams}/{entry.maxTeams}
                    </Badge>
                  )}
                  {!entry.isFull && entry.maxTeams != null && entry.slotsLeft != null && entry.slotsLeft <= 3 && (
                    <Badge className="text-[10px] font-bold bg-amber-500/20 text-amber-500 border-amber-500/40" data-testid={`badge-almost-full-${cat.id}`}>
                      {entry.slotsLeft} slot{entry.slotsLeft === 1 ? "" : "s"} left
                    </Badge>
                  )}
                  {entry.maxTeams != null && !entry.isFull && entry.slotsLeft != null && entry.slotsLeft > 3 && (
                    <Badge variant="outline" className="text-[10px] font-bold" data-testid={`badge-capacity-${cat.id}`}>
                      {entry.totalTeams}/{entry.maxTeams}
                    </Badge>
                  )}
                  {inEntry && entry.myPaymentStatus === "PAID" && (
                    <Badge className="text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border-emerald-500/30" data-testid={`badge-pay-status-${cat.id}`}>✓ Paid</Badge>
                  )}
                  {inEntry && entry.myPaymentStatus === "PENDING" && (
                    <Badge className="text-[10px] font-bold bg-amber-500/20 text-amber-500 border-amber-500/30" data-testid={`badge-pay-status-${cat.id}`}>Awaiting verification</Badge>
                  )}
                  {inEntry && entry.myPaymentStatus === "UNPAID" && entry.myFeePence != null && entry.myFeePence > 0 && (
                    <Badge className="text-[10px] font-bold bg-red-500/20 text-red-500 border-red-500/30" data-testid={`badge-pay-status-${cat.id}`}>Unpaid</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                  <span>{cat.playersPerSide || 1}-per-side</span>
                  <span>·</span>
                  <span data-testid={`text-cat-pair-count-${cat.id}`}>
                    {entry.confirmedPairCount ?? 0} confirmed {entry.confirmedPairCount === 1 ? "team" : "teams"}
                  </span>
                  {entry.soloCount ? (<><span>·</span><span>{entry.soloCount} solo / looking</span></>) : null}
                  {(() => {
                    const tIn = parseFloat(tournament?.entryFee || "0");
                    const tEx = parseFloat(tournament?.externalEntryFee || tournament?.entryFee || "0");
                    const hasOwn = cat.entryFee != null && cat.entryFee !== "";
                    const hasOwnEx = cat.externalEntryFee != null && cat.externalEntryFee !== "";
                    const internal = hasOwn ? parseFloat(cat.entryFee) : tIn;
                    const external = hasOwnEx ? parseFloat(cat.externalEntryFee) : (hasOwn ? parseFloat(cat.entryFee) : tEx);
                    if (!(internal > 0) && !(external > 0)) return null;
                    const split = external > 0 && external !== internal;
                    return (
                      <>
                        <span>·</span>
                        <span className="font-bold text-amber-500" data-testid={`text-cat-entry-fee-${cat.id}`}>
                          Fee: £{internal.toFixed(2)}{split ? ` / £${external.toFixed(2)}` : ""}
                        </span>
                      </>
                    );
                  })()}
                </div>
                {isPaired && entry.partner && (
                  <p className="text-xs text-muted-foreground mt-1">Partner: <span className="font-bold text-foreground">{entry.partner.fullName}</span></p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {!inEntry && entry.isFull && (
                  <div className="text-[11px] font-bold text-red-500 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10" data-testid={`text-full-notice-${cat.id}`}>
                    Category full — registration closed
                  </div>
                )}
                {!inEntry && !entry.isFull && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => doJoinSolo(cat.id)} disabled={joinSoloMutation.isPending} data-testid={`button-join-solo-${cat.id}`}>
                      {joinSoloMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                      {isSingles ? "Join" : "Join (find partner later)"}
                    </Button>
                    {!isSingles && (
                      <Button size="sm" className="h-8 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white" onClick={() => setPartnerPicker({ categoryId: cat.id, categoryName: cat.name })} data-testid={`button-pick-partner-${cat.id}`}>
                        <UserPlus className="h-3 w-3 mr-1" />Pick Partner
                      </Button>
                    )}
                  </>
                )}
                {inEntry && (
                  <>
                    {isSolo && !isSingles && (
                      <Button size="sm" className="h-8 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white" onClick={() => setPartnerPicker({ categoryId: cat.id, categoryName: cat.name })} data-testid={`button-find-partner-${cat.id}`}>
                        <UserPlus className="h-3 w-3 mr-1" />Find Partner
                      </Button>
                    )}
                    {entry.teamId && entry.myPaymentStatus === "UNPAID" && entry.myFeePence != null && entry.myFeePence > 0 && (
                      <Button size="sm" className="h-8 text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                        disabled={confirmPayMutation.isPending}
                        onClick={async () => {
                          try {
                            await confirmPayMutation.mutateAsync({ teamId: entry.teamId, tournamentId });
                            toast({ title: "Payment submitted", description: "Admin will verify shortly." });
                          } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                        }}
                        data-testid={`button-pay-cat-${cat.id}`}>
                        <PoundSterling className="h-3 w-3 mr-1" />Pay £{(entry.myFeePence / 100).toFixed(2)}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setLeaveConfirm({ categoryId: cat.id, categoryName: cat.name })} data-testid={`button-leave-${cat.id}`}>
                      <X className="h-3 w-3 mr-1" />Leave
                    </Button>
                  </>
                )}
              </div>
            </div>

            {pendingIncoming.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Incoming pair requests for this category</p>
                {pendingIncoming.map((pr: any) => (
                  <div key={pr.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar name={pr.otherUser?.fullName || "?"} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{pr.otherUser?.fullName}</p>
                        {pr.message && <p className="text-[10px] text-muted-foreground italic">"{pr.message}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-[10px] bg-emerald-600 text-white font-bold" onClick={async () => {
                        try { await respondPairMutation.mutateAsync({ id: pr.id, status: "ACCEPTED" }); toast({ title: "Paired!" }); }
                        catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                      }} data-testid={`button-accept-pair-cat-${pr.id}`}>
                        <Check className="h-3 w-3 mr-0.5" />Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-destructive/30 text-destructive" onClick={async () => {
                        try { await respondPairMutation.mutateAsync({ id: pr.id, status: "DECLINED" }); toast({ title: "Declined" }); }
                        catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                      }} data-testid={`button-decline-pair-cat-${pr.id}`}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingOutgoing.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting response</p>
                {pendingOutgoing.map((pr: any) => (
                  <div key={pr.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Sent to <span className="font-bold text-foreground">{pr.otherUser?.fullName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {partnerPicker && (
        <Dialog open onOpenChange={() => { setPartnerPicker(null); setPartnerSearch(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pick partner for {partnerPicker.categoryName}</DialogTitle>
              <DialogDescription>They'll need to accept your request before you're officially paired in this category.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Search registered players..." value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 rounded-xl bg-card border border-border text-sm outline-none focus:border-amber-500/40" data-testid="input-partner-search" />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/20">
                {(() => {
                  const entry: any = myCategories?.find((e: any) => e.category.id === partnerPicker.categoryId);
                  const cat: any = entry?.category;
                  // Players who already have a team (solo or paired) in this category
                  // shouldn't appear as eligible partners — their slot is taken.
                  const takenUserIds = new Set<number>(entry?.occupantUserIds || []);
                  const filtered = (registrations || []).filter((r: any) => {
                    if (r.userId === user?.id) return false;
                    if (takenUserIds.has(r.userId)) return false;
                    // Gender restriction — handle both the schema enum ("FEMALE_ONLY"/"MALE_ONLY")
                    // and the legacy short form ("FEMALE"/"MALE") still used by some category
                    // creation paths. "ALL"/"MIXED" impose no restriction.
                    const restriction = (cat?.genderRestriction || "").toUpperCase();
                    if (restriction === "FEMALE_ONLY" || restriction === "FEMALE") {
                      const g = (r.profile?.gender || "").toUpperCase();
                      if (g !== "FEMALE" && g !== "F") return false;
                    } else if (restriction === "MALE_ONLY" || restriction === "MALE") {
                      const g = (r.profile?.gender || "").toUpperCase();
                      if (g !== "MALE" && g !== "M") return false;
                    }
                    if (partnerSearch) return r.user?.fullName?.toLowerCase().includes(partnerSearch.toLowerCase());
                    return true;
                  });
                  if (filtered.length === 0) return <div className="p-4 text-center text-xs text-muted-foreground">No eligible partners. Either everyone is already paired, no one else has registered, or no one matches this category's restrictions.</div>;
                  return filtered.map((r: any) => (
                  <button key={r.id} onClick={() => doSendPair(r.userId, partnerPicker.categoryId)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 text-left transition-colors"
                    disabled={sendPairMutation.isPending}
                    data-testid={`button-invite-partner-${r.userId}`}>
                    <PlayerAvatar name={r.user?.fullName || "?"} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{r.user?.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{r.user?.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-amber-500" />
                  </button>
                  ));
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {leaveConfirm && (
        <Dialog open onOpenChange={() => setLeaveConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Leave {leaveConfirm.categoryName}?</DialogTitle>
              <DialogDescription>You'll be removed from this category. If you have a partner, your pair will be dissolved for this category only.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setLeaveConfirm(null)}>Cancel</Button>
              <Button className="bg-destructive text-destructive-foreground font-bold" onClick={() => doLeave(leaveConfirm.categoryId)} disabled={leaveMutation.isPending} data-testid="button-confirm-leave">
                {leaveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}Leave
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SignUpTab({ tournamentId, tournament }: { tournamentId: number; tournament: any }) {
  const { data: user } = useUser();
  const { data: registrations } = useTournamentRegistrations(tournamentId);
  const registerMutation = useRegisterForTournament();
  const withdrawMutation = useWithdrawRegistration();
  const { toast } = useToast();

  const myRegistration = registrations?.find((r: any) => r.userId === user?.id);

  async function handleRegister() {
    try {
      await registerMutation.mutateAsync({ tournamentId, registrationType: "INDIVIDUAL" });
      toast({ title: "You're in!", description: "Now open the My Categories tab to pick which categories you want to play." });
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
            <p className="text-sm text-muted-foreground max-w-md mx-auto">One click to register. After signing up, head to the <span className="font-bold text-amber-500">My Categories</span> tab to pick the categories you want to play in and choose a partner for each one.</p>
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
            <Button onClick={handleRegister} disabled={registerMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 font-bold px-8" data-testid="button-register-tournament">
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

      {myRegistration && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-500/5 p-4 flex items-start gap-3" data-testid="signup-categories-hint">
          <ArrowRight className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Next: pick your categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">Head to the <span className="font-bold text-amber-500">My Categories</span> tab to join singles or doubles events. You can pick a different partner for each doubles category there.</p>
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
  const { data: courts } = useTournamentCourts(tournamentId);
  const { data: allGroups = [] } = useTournamentGroups(tournamentId);
  const { data: stages = [] } = useTournamentStages(tournamentId);
  // Show every group from the Groups tab (groups without a category are also included).
  const categoryGroups = (allGroups as any[]).filter((g: any) => !g.categoryId || g.categoryId === category.id);
  const assignCourtMutation = useAssignMatchCourt();
  const updateStatusMutation = useUpdateMatchStatus();
  const updateTimeMutation = useUpdateMatchScheduledTime();
  const bulkUpdateTimeMutation = useBulkUpdateMatchScheduledTime();
  const [bulkTimeBySection, setBulkTimeBySection] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<"all" | "qf" | "sf" | "final" | "rr" | "other">("all");
  const [activeView, setActiveView] = useState<"bracket" | "standings" | "list">(
    category.format === "KNOCKOUT" ? "bracket" : category.format === "GROUP_KNOCKOUT" ? "standings" : "list"
  );
  const scoreMutation = useScoreMatch();
  const deleteMatchMutation = useDeleteTournamentMatch();
  const addGroupMatchMutation = useAddGroupMatch();
  const { toast } = useToast();
  const [scoreDialog, setScoreDialog] = useState<any>(null);
  const [addMatchDialog, setAddMatchDialog] = useState<{ groupNumber?: number; subGroupNumber?: number; stage?: "rr" | "qf" | "sf" | "final" } | null>(null);
  const [addMatchTeamA, setAddMatchTeamA] = useState<string>("");
  const [addMatchTeamB, setAddMatchTeamB] = useState<string>("");
  const [addMatchGroupNumber, setAddMatchGroupNumber] = useState<number | "">("");
  const [addMatchStage, setAddMatchStage] = useState<"rr" | "qf" | "sf" | "final">("rr");
  const [addMatchCustomStageId, setAddMatchCustomStageId] = useState<string>("none");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
            {category.format === "GROUP_KNOCKOUT" && hasQF && (
              <button
                onClick={async () => {
                  if (!window.confirm("Regenerate Quarter-Finals? This wipes the existing Quarter-Finals, Semi-Finals and Final (matches + standings) and rebuilds the Quarter-Finals from your current group standings. Round-robin groups stay untouched.")) return;
                  try {
                    await apiRequest("POST", `/api/tournament-categories/${category.id}/clear-knockout`);
                    const res = await apiRequest("POST", `/api/tournament-categories/${category.id}/advance-winners`);
                    const data = await res.json();
                    queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "standings"] });
                    toast({ title: "Quarter-Finals Regenerated", description: data.message });
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  }
                }}
                disabled={isAdvancing}
                className={cn(
                  "group relative px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300",
                  "bg-slate-900/80 border border-amber-500/40 text-amber-300",
                  "hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:border-amber-400/70",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                )}
                data-testid="button-regenerate-qf"
              >
                <span className="relative flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate Quarter-Finals
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
        <StandingsView standings={standings || []} teams={teams || []} category={category} groups={categoryGroups} matches={matches} stages={stages} />
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

              type SectionStage = "rr" | "qf" | "sf" | "final" | "other" | "custom";
              type Section = { key: string; label: string; color: string; matches: typeof displayMatches; groupNumber?: number; subGroupNumber?: number; stage: SectionStage; customStageId?: number; customStageOrder?: number; isPast?: boolean };
              // Build all stage buckets independently first, then concatenate them in
              // "latest stage on top" order: Custom stages (newest first) → Final → Semi-Finals → Quarter-Finals → other KO → Round Robin.
              const sections: Section[] = [];
              const finalSections: Section[] = [];
              const semiSections: Section[] = [];
              const qfSections: Section[] = [];
              const otherKoSections: Section[] = [];
              const rrSections: Section[] = [];
              const customSections: Section[] = [];

              // Pull matches assigned to custom stages out of the legacy buckets.
              // A match inherits its parent group's stage when it has no stageId of its own —
              // so stages set in the Groups tab automatically flow into Matches view too.
              const customStageMap = new Map<number, any>();
              for (const s of stages) customStageMap.set(s.id, s);
              const groupStageByNumber = new Map<number, number | null>();
              for (const g of categoryGroups) {
                if (g?.groupOrder != null) groupStageByNumber.set(Number(g.groupOrder), g.stageId ?? null);
              }
              const effectiveStageId = (m: any): number | null => {
                if (m.stageId && customStageMap.has(m.stageId)) return m.stageId;
                if (m.groupNumber != null) {
                  const sid = groupStageByNumber.get(Number(m.groupNumber));
                  if (sid && customStageMap.has(sid)) return sid;
                }
                return null;
              };
              const isCustomStaged = (m: any) => effectiveStageId(m) !== null;
              const customStageGroupings = new Map<number, typeof displayMatches>();
              for (const m of displayMatches) {
                const sid = effectiveStageId(m);
                if (sid !== null) {
                  if (!customStageGroupings.has(sid)) customStageGroupings.set(sid, [] as any);
                  customStageGroupings.get(sid)!.push(m);
                }
              }
              const nowMs = Date.now();
              // Look up a friendly label for a groupNumber inside a custom stage.
              const groupLabelByNumber = (gNum: number | null | undefined): string => {
                if (gNum == null || gNum <= 0) return "Unassigned";
                if (gNum >= 400) return "Final";
                if (gNum >= 300) return "Semi-Finals";
                if (gNum >= 200) return "Quarter-Finals";
                const grp = (categoryGroups as any[]).find(g => Number(g.groupOrder) === Number(gNum));
                if (grp?.name) return grp.name;
                return `Group ${String.fromCharCode(64 + gNum)}`;
              };
              for (const [sid, ms] of customStageGroupings.entries()) {
                const stage = customStageMap.get(sid);
                const allPast = ms.length > 0 && ms.every((m: any) => m.scheduledTime && new Date(m.scheduledTime).getTime() < nowMs);
                // Sub-bucket this stage's matches by groupNumber so each parent group gets
                // its own collapsible card inside the stage accordion.
                const byGroup = new Map<number, typeof ms>();
                for (const m of ms) {
                  const g = m.groupNumber ?? 0;
                  if (!byGroup.has(g)) byGroup.set(g, [] as any);
                  byGroup.get(g)!.push(m);
                }
                const sortedGroupKeys = Array.from(byGroup.keys()).sort((a, b) => a - b);
                for (const g of sortedGroupKeys) {
                  customSections.push({
                    key: `custom-${sid}-g${g}`,
                    label: groupLabelByNumber(g),
                    color: "violet",
                    matches: byGroup.get(g)!,
                    groupNumber: g || undefined,
                    subGroupNumber: 1,
                    stage: "custom",
                    customStageId: sid,
                    customStageOrder: stage.displayOrder,
                    isPast: allPast,
                  });
                }
              }

              const grpMatchesLegacy = grpMatches.filter(m => !isCustomStaged(m));
              if (grpMatchesLegacy.length > 0) {
                const sgMap = new Map<string, typeof grpMatchesLegacy>();
                grpMatchesLegacy.forEach(m => {
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
                  rrSections.push({ key: k, label, color: "violet", matches: sgMap.get(k)!, groupNumber: g, subGroupNumber: sg, stage: "rr" });
                }
              }

              const qfDisplayMatches = displayMatches.filter(m => m.round === 200 && !isCustomStaged(m));
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
                  qfSections.push({ key: `qf-${gNum}`, label, color: "amber", matches: qfGroupMap.get(gNum)!, groupNumber: gNum, subGroupNumber: 1, stage: "qf" });
                });
              }

              const semiDisplayMatches = displayMatches.filter(m => m.round === 300 && !isCustomStaged(m));
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
                  semiSections.push({ key: `semi-${gNum}`, label, color: "amber", matches: semiGroupMap.get(gNum)!, groupNumber: gNum, subGroupNumber: 1, stage: "sf" });
                });
              }

              const finalDisplayMatches = displayMatches.filter(m => m.round === 400 && !isCustomStaged(m));
              if (finalDisplayMatches.length > 0) {
                finalSections.push({ key: "final", label: "Final", color: "amber", matches: finalDisplayMatches, groupNumber: 400, stage: "final" });
              }

              const otherKoMatches = displayMatches.filter(m =>
                m.round >= 100 && m.round !== 200 && m.round !== 300 && m.round !== 400 && (!m.groupNumber || m.groupNumber >= 100) && !isCustomStaged(m)
              );
              if (otherKoMatches.length > 0) {
                const koRoundMap = new Map<number, typeof otherKoMatches>();
                otherKoMatches.forEach(m => {
                  const r = m.round;
                  if (!koRoundMap.has(r)) koRoundMap.set(r, []);
                  koRoundMap.get(r)!.push(m);
                });
                Array.from(koRoundMap.entries()).sort(([a], [b]) => a - b).forEach(([round, ms]) => {
                  otherKoSections.push({ key: `ko-${round}`, label: getKoLabel(round), color: "amber", matches: ms, stage: "other" });
                });
              }

              // Custom stages render newest-first at the top (past at bottom), then legacy stages.
              const sortedCustom = [...customSections].sort((a, b) => {
                const aPast = a.isPast ? 1 : 0;
                const bPast = b.isPast ? 1 : 0;
                if (aPast !== bPast) return aPast - bPast;
                return (b.customStageOrder ?? 0) - (a.customStageOrder ?? 0);
              });
              const activeCustom = sortedCustom.filter(s => !s.isPast);
              const pastCustom = sortedCustom.filter(s => s.isPast);
              // Latest stage on top: custom (active) → Final → Semi-Finals → Quarter-Finals → other KO → Round Robin → custom (past).
              sections.push(...activeCustom, ...finalSections, ...semiSections, ...qfSections, ...otherKoSections, ...rrSections, ...pastCustom);

              const stageCounts = {
                qf: sections.filter(s => s.stage === "qf").reduce((n, s) => n + s.matches.length, 0),
                sf: sections.filter(s => s.stage === "sf").reduce((n, s) => n + s.matches.length, 0),
                final: sections.filter(s => s.stage === "final").reduce((n, s) => n + s.matches.length, 0),
                rr: sections.filter(s => s.stage === "rr").reduce((n, s) => n + s.matches.length, 0),
                other: sections.filter(s => s.stage === "other").reduce((n, s) => n + s.matches.length, 0),
              };
              const visibleSections = stageFilter === "all" ? sections : sections.filter(s => s.stage === stageFilter);

              const stageOptions: { value: typeof stageFilter; label: string; count: number }[] = [
                { value: "all", label: "All stages", count: sections.reduce((n, s) => n + s.matches.length, 0) },
              ];
              if (stageCounts.qf) stageOptions.push({ value: "qf", label: "Quarter-Finals", count: stageCounts.qf });
              if (stageCounts.sf) stageOptions.push({ value: "sf", label: "Semi-Finals", count: stageCounts.sf });
              if (stageCounts.final) stageOptions.push({ value: "final", label: "Final", count: stageCounts.final });
              if (stageCounts.other) stageOptions.push({ value: "other", label: "Other knockouts", count: stageCounts.other });
              if (stageCounts.rr) stageOptions.push({ value: "rr", label: "Round Robin", count: stageCounts.rr });

              if (sections.length === 0) {
                return <EmptyState icon={Swords} title="No Matches" description="Generate fixtures to create matches." />;
              }

              // Bucket every per-group section into its parent stage so we can render one
              // accordion item per stage (each containing all of that stage's groups).
              const stageMeta: Record<Exclude<SectionStage, "custom">, { label: string; color: string; icon: any }> = {
                final: { label: "Final",          color: "from-yellow-500 to-amber-500",  icon: Trophy },
                sf:    { label: "Semi-Finals",    color: "from-amber-500 to-orange-500",  icon: Medal },
                qf:    { label: "Quarter-Finals", color: "from-cyan-500 to-sky-500",      icon: GitBranch },
                other: { label: "Other Knockouts",color: "from-fuchsia-500 to-pink-500",  icon: Swords },
                rr:    { label: "Round Robin",    color: "from-violet-600 to-purple-600", icon: LayoutGrid },
              };
              type LegacyStage = Exclude<SectionStage, "custom">;
              const stageOrder: LegacyStage[] = ["final", "sf", "qf", "other", "rr"];
              type Bucket =
                | { kind: "legacy"; stage: LegacyStage; sections: typeof sections }
                | { kind: "custom"; customStageId: number; stageName: string; isPast: boolean; sections: typeof sections };
              const buckets: Bucket[] = [];
              const seenLegacy = new Set<LegacyStage>();
              const seenCustom = new Set<number>();
              for (const sec of visibleSections) {
                if (sec.stage === "custom") {
                  const sid = sec.customStageId!;
                  if (seenCustom.has(sid)) continue;
                  seenCustom.add(sid);
                  const stageSecs = visibleSections.filter(s => s.stage === "custom" && s.customStageId === sid);
                  const stage = customStageMap.get(sid);
                  buckets.push({
                    kind: "custom",
                    customStageId: sid,
                    stageName: stage?.name ?? "Stage",
                    isPast: !!sec.isPast,
                    sections: stageSecs,
                  });
                } else if (!seenLegacy.has(sec.stage as LegacyStage)) {
                  seenLegacy.add(sec.stage as LegacyStage);
                  // Reorder legacy stages by stageOrder later — gather all sections with this stage from visibleSections.
                  const stage = sec.stage as LegacyStage;
                  const stageSecs = visibleSections.filter(s => s.stage === stage);
                  buckets.push({ kind: "legacy", stage, sections: stageSecs });
                }
              }

              const renderSection = (sec: typeof sections[number]) => {
                    const isCollapsed = !!collapsedSections[sec.key];
                    const stageForAdd: "rr" | "qf" | "sf" | "final" = sec.stage === "qf" ? "qf" : sec.stage === "sf" ? "sf" : sec.stage === "final" ? "final" : "rr";
                    return (
                <div key={sec.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                      className={cn("flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-muted/60", sec.color === "amber" ? "text-amber-400" : "text-violet-400")}
                      aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                      data-testid={`button-toggle-section-${sec.key}`}
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <div className={cn("h-px flex-1 bg-gradient-to-r to-transparent", sec.color === "amber" ? "from-amber-500/30" : "from-violet-500/30")} />
                    <button
                      type="button"
                      onClick={() => setCollapsedSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                      className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-2 hover:opacity-80 transition-opacity", sec.color === "amber" ? "text-amber-400" : "text-violet-400")}
                    >
                      {sec.label}
                    </button>
                    <span className="text-[9px] font-bold text-muted-foreground">{sec.matches.length} {sec.matches.length === 1 ? "match" : "matches"}</span>
                    {canManage && sec.groupNumber && (
                      <button
                        onClick={() => {
                          setAddMatchTeamA("");
                          setAddMatchTeamB("");
                          setAddMatchStage(stageForAdd);
                          setAddMatchDialog({ groupNumber: sec.groupNumber!, subGroupNumber: sec.subGroupNumber || 1, stage: stageForAdd });
                        }}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        data-testid={`button-add-group-match-${sec.key}`}
                      >
                        <Plus className="h-3 w-3" /> Add Match
                      </button>
                    )}
                    <div className={cn("h-px flex-1 bg-gradient-to-l to-transparent", sec.color === "amber" ? "from-amber-500/30" : "from-violet-500/30")} />
                  </div>
                  {!isCollapsed && canManage && (
                    <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg border border-border/40 bg-muted/30">
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] font-bold text-muted-foreground">Bulk set time (UK):</span>
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
                          const iso = londonInputsToUtcISO(val.slice(0, 10), val.slice(11, 16)) || new Date(val).toISOString();
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
                  {!isCollapsed && (
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
                        onDelete={(matchId) => {
                          deleteMatchMutation.mutate(matchId, {
                            onSuccess: () => {
                              toast({ title: "Match Deleted" });
                              queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "matches"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", category.id, "standings"] });
                            },
                            onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                          });
                        }}
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
                  )}
                </div>
                    );
                  };

              const firstActiveBucketKey: string | null = (() => {
                for (const b of buckets) {
                  if (b.kind === "custom") {
                    if (!b.isPast) return `mstage-custom-${b.customStageId}`;
                  } else {
                    return `mstage-${b.stage}`;
                  }
                }
                if (buckets.length > 0) {
                  const b = buckets[0];
                  return b.kind === "custom" ? `mstage-custom-${b.customStageId}` : `mstage-${b.stage}`;
                }
                return null;
              })();
              const defaultOpenStages = firstActiveBucketKey ? [firstActiveBucketKey] : [];
              return (
                <>
                  {stageOptions.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2.5 rounded-xl border border-border/60 bg-muted/40">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Show stage</span>
                      <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as any)}>
                        <SelectTrigger className="h-8 text-xs font-bold w-[200px]" data-testid="select-stage-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label} <span className="text-muted-foreground font-normal">· {opt.count}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {stageFilter !== "all" && (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setStageFilter("all")} data-testid="button-stage-filter-clear">
                          Show all
                        </Button>
                      )}
                    </div>
                  )}
                  {buckets.length === 0 ? (
                    <EmptyState icon={Swords} title="No Matches in this Stage" description="Pick another stage from the dropdown above." />
                  ) : (
                    <Accordion type="multiple" defaultValue={defaultOpenStages} className="space-y-3">
                      {buckets.map(b => {
                        if (b.kind === "custom") {
                          const StageIcon = Trophy;
                          const stageSecs = b.sections;
                          const matchCount = stageSecs.reduce((n, s) => n + s.matches.length, 0);
                          const groupCount = stageSecs.length;
                          return (
                            <AccordionItem key={`custom-${b.customStageId}`} value={`mstage-custom-${b.customStageId}`}
                              className={cn(
                                "border rounded-2xl overflow-hidden",
                                b.isPast ? "border-border/30 bg-muted/20 opacity-80" : "border-border/40 bg-card data-[state=open]:bg-card",
                              )}>
                              <AccordionTrigger
                                className="px-4 py-3 hover:no-underline hover:bg-muted/30"
                                data-testid={`accordion-matches-stage-custom-${b.customStageId}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <StageIcon className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  <span className="text-sm font-black text-foreground uppercase tracking-wider truncate">{b.stageName}</span>
                                  {b.isPast && (
                                    <Badge className="bg-muted/60 text-muted-foreground text-[9px] font-black border-0">PAST</Badge>
                                  )}
                                  <Badge className="bg-muted/60 text-foreground text-[9px] font-black ml-auto mr-2">
                                    {groupCount} {groupCount === 1 ? "group" : "groups"} · {matchCount} {matchCount === 1 ? "match" : "matches"}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-1">
                                <div className="space-y-4">
                                  {stageSecs.map(sec => renderSection(sec))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }
                        const stageKey = b.stage;
                        const meta = stageMeta[stageKey];
                        const StageIcon = meta.icon;
                        const stageSections = b.sections;
                        const stageMatchCount = stageSections.reduce((n, s) => n + s.matches.length, 0);
                        return (
                          <AccordionItem key={stageKey} value={`mstage-${stageKey}`}
                            className="border border-border/40 rounded-2xl overflow-hidden bg-card data-[state=open]:bg-card">
                            <AccordionTrigger
                              className="px-4 py-3 hover:no-underline hover:bg-muted/30"
                              data-testid={`accordion-matches-stage-${stageKey}`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0", meta.color)}>
                                  <StageIcon className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-sm font-black text-foreground uppercase tracking-wider truncate">{meta.label}</span>
                                <Badge className="bg-muted/60 text-foreground text-[9px] font-black ml-auto mr-2">
                                  {stageSections.length} {stageSections.length === 1 ? "group" : "groups"} · {stageMatchCount} {stageMatchCount === 1 ? "match" : "matches"}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-3 pb-3 pt-1">
                              <div className="space-y-4">
                                {stageSections.map(sec => renderSection(sec))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </>
              );
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
                const teamMap = new Map<number, any>(allCategoryTeams.map((t: any) => [t.id, t]));
                // Resolve selected group from the Groups tab — display every pair it contains, exactly as set up there.
                const selectedGroup = (allGroups as any[])
                  .slice()
                  .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))
                  .find((g: any) => g.groupOrder === effectiveGroupNumber);
                type PairOption = { value: string; label: string };
                let pairOptions: PairOption[] = [];
                if (effectiveGroupNumber !== "" && selectedGroup) {
                  pairOptions = ((selectedGroup.pairs || []) as any[]).map((p: any) => {
                    if (p.teamId) {
                      const t = teamMap.get(p.teamId);
                      const label = t
                        ? getTeamName(t)
                        : (p.team
                          ? [p.team.player1Name, p.team.player2Name].filter(Boolean).join(" / ")
                          : `Pair #${p.id}`);
                      return { value: `team-${p.teamId}`, label };
                    }
                    if (p.pairRequest) {
                      // Always use the players' real names, never the pair-name nickname,
                      // so the dropdown source matches what the rest of the UI shows.
                      const label = [p.pairRequest.fromUserName, p.pairRequest.toUserName]
                        .filter(Boolean).join(" / ") || `Pair #${p.id}`;
                      return { value: `pr-${p.pairRequestId}`, label };
                    }
                    return { value: `unknown-${p.id}`, label: `Pair #${p.id}` };
                  });
                } else if (effectiveGroupNumber === "") {
                  pairOptions = allCategoryTeams.map((t: any) => ({ value: `team-${t.id}`, label: getTeamName(t) }));
                }
                return (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Stage</label>
                      <Select value={addMatchStage} onValueChange={(v) => setAddMatchStage(v as any)}>
                        <SelectTrigger data-testid="select-add-match-stage"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rr">Round Robin / Group Stage</SelectItem>
                          <SelectItem value="qf">Quarter-Finals</SelectItem>
                          <SelectItem value="sf">Semi-Finals</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {stages.length > 0 && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Custom Stage (optional)</label>
                        <Select value={addMatchCustomStageId} onValueChange={setAddMatchCustomStageId}>
                          <SelectTrigger data-testid="select-add-match-custom-stage"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No custom stage</SelectItem>
                            {[...stages].sort((a, b) => b.displayOrder - a.displayOrder).map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                      <Select value={addMatchTeamA} onValueChange={v => setAddMatchTeamA(v)}>
                        <SelectTrigger data-testid="select-add-match-team-a"><SelectValue placeholder={effectiveGroupNumber === "" ? "Select group first" : "Select pair"} /></SelectTrigger>
                        <SelectContent>
                          {pairOptions.filter(t => t.value !== addMatchTeamB).map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pair B</label>
                      <Select value={addMatchTeamB} onValueChange={v => setAddMatchTeamB(v)}>
                        <SelectTrigger data-testid="select-add-match-team-b"><SelectValue placeholder={effectiveGroupNumber === "" ? "Select group first" : "Select pair"} /></SelectTrigger>
                        <SelectContent>
                          {pairOptions.filter(t => t.value !== addMatchTeamA).map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                  const parse = (v: string) => {
                    if (v.startsWith("team-")) return { teamId: Number(v.slice(5)) as number | null, prId: null as number | null };
                    if (v.startsWith("pr-")) return { teamId: null as number | null, prId: Number(v.slice(3)) as number | null };
                    return { teamId: null, prId: null };
                  };
                  const a = parse(addMatchTeamA);
                  const b = parse(addMatchTeamB);
                  const stageRound = addMatchStage === "qf" ? 200 : addMatchStage === "sf" ? 300 : addMatchStage === "final" ? 400 : 1;
                  addGroupMatchMutation.mutate({
                    categoryId: category.id,
                    teamAId: a.teamId ?? undefined,
                    teamBId: b.teamId ?? undefined,
                    pairARequestId: a.prId ?? undefined,
                    pairBRequestId: b.prId ?? undefined,
                    round: stageRound,
                    groupNumber: gNum,
                    subGroupNumber: sgNum,
                    stageId: addMatchCustomStageId !== "none" ? Number(addMatchCustomStageId) : null,
                  } as any, {
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

function MatchCard({ match, canManage, onScore, courts, onAssignCourt, onUpdateStatus, onUpdateTime, onDelete }: {
  match: any; canManage: boolean; onScore: () => void;
  courts?: any[]; onAssignCourt?: (matchId: number, courtId: number | null) => void;
  onUpdateStatus?: (matchId: number, status: string) => void;
  onUpdateTime?: (matchId: number, scheduledTime: string | null) => void;
  onDelete?: (matchId: number) => void;
}) {
  const [editingTime, setEditingTime] = useState(false);
  const toLocalInput = (d: any) => {
    if (!d) return "";
    const { date, time } = utcToLondonInputs(d);
    return date && time ? `${date}T${time}` : "";
  };
  const [timeDraft, setTimeDraft] = useState<string>(() => toLocalInput(match.scheduledTime));
  const scheduledLabel = match.scheduledTime
    ? formatLondon(match.scheduledTime, "d MMM HH:mm")
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
                  <span className="text-[9px] text-muted-foreground">UK</span>
                  <Button
                    size="icon"
                    className="h-6 w-6 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => {
                      const iso = timeDraft ? londonInputsToUtcISO(timeDraft.slice(0, 10), timeDraft.slice(11, 16)) : null;
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

          {canManage && (
            <div className="flex items-center gap-1 px-2 border-l border-border/30">
              {!isFinished && match.teamAId && match.teamBId && !isLive && (
                <Button size="sm" onClick={() => onUpdateStatus?.(match.id, "LIVE")}
                  data-testid={`match-start-${match.id}`}
                  className="h-8 w-8 p-0 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded-lg"
                  title="Start Match">
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              {!isFinished && match.teamAId && match.teamBId && isLive && (
                <Button size="sm" onClick={() => onUpdateStatus?.(match.id, "PENDING")}
                  data-testid={`match-stop-${match.id}`}
                  className="h-8 w-8 p-0 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-500/30 rounded-lg"
                  title="Pause Match">
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              {match.teamAId && match.teamBId && (
                <Button size="sm" onClick={onScore}
                  data-testid={`match-score-${match.id}`}
                  className="h-8 w-8 p-0 bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 border border-violet-500/30 rounded-lg"
                  title={isFinished ? "Edit Score" : "Submit Score"}>
                  {isFinished ? <Edit3 className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
                </Button>
              )}
              {onDelete && (
                <Button size="sm" onClick={() => {
                  if (confirm("Delete this match? Standings will be adjusted automatically.")) onDelete(match.id);
                }}
                  data-testid={`match-delete-${match.id}`}
                  className="h-8 w-8 p-0 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg"
                  title="Delete Match">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
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
  // Prefill with existing sets when editing a finished match.
  const [sets, setSets] = useState(() => {
    const existing = (match.scores as any[] | undefined) || [];
    return existing.length > 0
      ? existing.map(s => ({ scoreA: s.scoreA ?? 0, scoreB: s.scoreB ?? 0 }))
      : [{ scoreA: 0, scoreB: 0 }];
  });

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

function StandingsView({ standings, teams, category, groups = [], matches = [], stages = [] }: { standings: any[]; teams: any[]; category: any; groups?: any[]; matches?: any[]; stages?: any[] }) {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const advancePerGroup = category.advancePerGroup || 1;

  // Canonical "user-pair" key — two user IDs sorted ascending.
  // This is the only fully stable identity for a pair, surviving differences between
  // pair-requests and teams (a pair can be represented either way for the same two players).
  const usersKey = (uidA?: number | null, uidB?: number | null): string | null => {
    if (!uidA || !uidB) return null;
    const [a, b] = [Number(uidA), Number(uidB)].sort((x, y) => x - y);
    return `u-${a}-${b}`;
  };

  // For each team, derive its users-key from the player profile -> user id chain.
  const teamUsersKey = (teamId?: number | null): string | null => {
    if (!teamId) return null;
    const t = teamMap.get(teamId);
    return usersKey(t?.player1?.user?.id ?? t?.player1?.userId, t?.player2?.user?.id ?? t?.player2?.userId);
  };

  // Each group_pair gets the same canonical users-key whether it stores teamId or pairRequestId.
  const groupPairKey = (p: any): string | null => {
    if (p.teamId) return teamUsersKey(p.teamId) || `t-${p.teamId}`;
    if (p.pairRequest) return usersKey(p.pairRequest.fromUserId, p.pairRequest.toUserId) || `pr-${p.pairRequestId}`;
    if (p.pairRequestId) return `pr-${p.pairRequestId}`;
    return `gp-${p.id}`;
  };

  // For a match, return the canonical key for one of its sides — almost always derived
  // from the team's underlying users so it lines up with whichever way the group represents the pair.
  const matchSideKey = (m: any, side: "A" | "B"): string | null => {
    const teamId = side === "A" ? m.teamAId : m.teamBId;
    if (teamId) return teamUsersKey(teamId) || `t-${teamId}`;
    return null;
  };

  // Compute per-pair stats for a single group, directly from the matches list.
  function computeGroupRows(grp: any, gNum: number) {
    const groupMatches = matches.filter(m => m.groupNumber === gNum && !m.isBye);

    return (grp.pairs || []).map((p: any, pi: number) => {
      const key = groupPairKey(p) || `gp-${p.id}`;
      // Always render pair names with " & " for visual consistency, regardless of source.
      const formatPair = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(" & ");
      let displayName = "Unknown Pair";
      if (p.teamId) {
        const team = teamMap.get(p.teamId);
        if (team) {
          displayName = formatPair(
            team.player1?.user?.fullName,
            team.player2?.user?.fullName,
          ) || getTeamName(team);
        } else if (p.team) {
          displayName = formatPair(p.team.player1Name, p.team.player2Name) || `Team #${p.teamId}`;
        } else {
          displayName = `Team #${p.teamId}`;
        }
      } else if (p.pairRequest) {
        displayName = formatPair(p.pairRequest.fromUserName, p.pairRequest.toUserName)
          || p.pairRequest.pairName
          || "Pair";
      }

      // Find this pair's matches in this group — and on which side they played.
      const pairMatches = groupMatches
        .map(m => {
          const aKey = matchSideKey(m, "A");
          const bKey = matchSideKey(m, "B");
          let side: "A" | "B" | null = null;
          if (aKey && aKey === key) side = "A";
          else if (bKey && bKey === key) side = "B";
          return side ? { match: m, side } : null;
        })
        .filter((x): x is { match: any; side: "A" | "B" } => x !== null)
        .sort((a, b) => (a.match.matchOrder || 0) - (b.match.matchOrder || 0));

      // Build per-match snapshot: list of points-for the pair scored across the sets of each match.
      const matchSnapshots = pairMatches.map(({ match, side }) => {
        const sets: { scoreA: number; scoreB: number }[] = match.scores || [];
        let pf = 0, pa = 0, setsWon = 0, setsLost = 0;
        for (const s of sets) {
          const my = side === "A" ? s.scoreA : s.scoreB;
          const opp = side === "A" ? s.scoreB : s.scoreA;
          pf += my; pa += opp;
          if (my > opp) setsWon++; else if (opp > my) setsLost++;
        }
        const finished = match.status === "completed" || !!match.winnerId;
        const won = finished && match.winnerId
          ? ((side === "A" && match.teamAId === match.winnerId) || (side === "B" && match.teamBId === match.winnerId))
          : false;
        return { matchId: match.id, finished, pf, pa, setsWon, setsLost, won };
      });

      const finishedSnaps = matchSnapshots.filter(s => s.finished);
      const totalPF = finishedSnaps.reduce((acc, s) => acc + s.pf, 0);
      const totalPA = finishedSnaps.reduce((acc, s) => acc + s.pa, 0);
      const matchesWon = finishedSnaps.filter(s => s.won).length;
      const matchesLost = finishedSnaps.length - matchesWon;
      const setsWon = finishedSnaps.reduce((acc, s) => acc + s.setsWon, 0);
      const setsLost = finishedSnaps.reduce((acc, s) => acc + s.setsLost, 0);

      return {
        id: `pair-${grp.id}-${p.id || pi}`,
        key,
        displayName,
        snapshots: matchSnapshots,
        matchesPlayed: finishedSnaps.length,
        matchesWon, matchesLost,
        setsWon, setsLost,
        pointsFor: totalPF, pointsAgainst: totalPA,
        points: totalPF, // 1 point per point scored — same convention as before
      };
    });
  }

  // Rank purely by Total points (PF) descending — that's what the user wants to see at a glance.
  // Tiebreakers: matches won, point difference, sets won, sets lost.
  const sortFn = (a: any, b: any) => {
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    return a.setsLost - b.setsLost;
  };

  // Rank styling — gold / silver / bronze / 4th highlights so the leaderboard reads at a glance.
  const rankStyles = [
    { row: "bg-yellow-500/[0.10]", badge: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md shadow-yellow-500/30" },
    { row: "bg-slate-300/[0.10]", badge: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-md shadow-slate-400/30" },
    { row: "bg-orange-500/[0.07]", badge: "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/30" },
    { row: "bg-muted/30", badge: "bg-muted text-muted-foreground" },
  ];

  // Render a per-pair table that columns out each match's points-for plus a Total column.
  const renderStandingsTable = (rows: any[], advanceCount: number) => {
    const matchCount = Math.max(1, ...rows.map(r => r.snapshots.length));
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Pos</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Pair</th>
              {Array.from({ length: matchCount }).map((_, i) => (
                <th key={`mh-${i}`} className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">M{i + 1}</th>
              ))}
              <th className="text-center px-2 py-2.5 text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">W</th>
              <th className="text-center px-2 py-2.5 text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-wider">L</th>
              <th className="text-center px-2 py-2.5 text-[11px] font-black bg-violet-500/15 text-violet-600 dark:text-violet-300 uppercase tracking-wider border-l border-violet-500/30">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any, si: number) => {
              const rank = rankStyles[Math.min(si, 3)];
              const isQualifying = si < advanceCount;
              const positionLabels = ["1st", "2nd", "3rd", "4th"];
              return (
                <tr key={s.id} data-testid={`row-standing-${s.key}`} className={cn(
                  "border-t border-border/30 transition-colors hover:bg-muted/40",
                  rank.row
                )}>
                  <td className="px-4 py-2.5">
                    <div className={cn(
                      "inline-flex items-center justify-center h-7 min-w-[34px] px-2 rounded-full text-[10px] font-black uppercase tracking-wider",
                      rank.badge
                    )}>{positionLabels[si] || `${si + 1}th`}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "font-bold",
                      si === 0 ? "text-yellow-600 dark:text-yellow-300" : "text-foreground"
                    )} data-testid={`text-pair-${s.key}`}>{s.displayName}</span>
                    {isQualifying && (
                      <Badge className="ml-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase">Adv</Badge>
                    )}
                  </td>
                  {Array.from({ length: matchCount }).map((_, i) => {
                    const snap = s.snapshots[i];
                    if (!snap) {
                      return <td key={`m-${i}`} className="text-center px-2 py-2.5 text-muted-foreground/40">—</td>;
                    }
                    if (!snap.finished) {
                      return <td key={`m-${i}`} className="text-center px-2 py-2.5 text-muted-foreground/60 italic text-[11px]">…</td>;
                    }
                    return (
                      <td key={`m-${i}`} className={cn(
                        "text-center px-2 py-2.5 font-bold tabular-nums",
                        snap.won ? "text-emerald-500 dark:text-emerald-400" : "text-foreground"
                      )} data-testid={`cell-pf-${s.key}-${i}`}>{snap.pf}</td>
                    );
                  })}
                  <td className="text-center px-2 py-2.5 font-bold text-emerald-500 dark:text-emerald-400 tabular-nums">{s.matchesWon}</td>
                  <td className="text-center px-2 py-2.5 text-red-500 dark:text-red-400 tabular-nums">{s.matchesLost}</td>
                  <td className={cn(
                    "text-center px-3 py-2.5 font-black text-base tabular-nums border-l border-violet-500/30 bg-violet-500/[0.06]",
                    si === 0 ? "text-yellow-500 dark:text-yellow-300" : "text-violet-600 dark:text-violet-300"
                  )} data-testid={`text-total-pf-${s.key}`}>{s.pointsFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // CANONICAL group rendering: derive groups from tournament_groups (the source of truth for membership).
  const sortedGroups = [...groups].sort((a: any, b: any) => (a.groupOrder || 0) - (b.groupOrder || 0));

  // Knockout/QF/SF/Final standings — render compact tables for any matches that exist beyond the group stage.
  const stageMatches = (lo: number, hi: number) => matches.filter(m => !m.isBye && m.groupNumber != null && m.groupNumber >= lo && m.groupNumber < hi);
  const qfMatches = stageMatches(200, 300);
  const semiMatches = stageMatches(300, 400);
  const finalMatches = stageMatches(400, 500);

  const renderKoStage = (label: string, ms: any[], colorClass: string) => {
    if (ms.length === 0) return null;
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${colorClass} via-purple-500/20 to-slate-800/40 blur-[0.5px]`} />
        <div className="relative rounded-2xl bg-card overflow-hidden border border-border/30">
          <div className={`bg-gradient-to-r ${colorClass.replace('/40', '/10')} via-transparent to-transparent px-4 py-3 border-b border-border/30`}>
            <div className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${colorClass.replace('/40', '')} flex items-center justify-center`}>
                <Trophy className="h-3 w-3 text-white" />
              </div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider">{label}</h4>
              <Badge className="bg-muted/60 text-foreground text-[9px] font-black ml-auto">{ms.length} Matches</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Match</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Pair A</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Pair B</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Winner</th>
                </tr>
              </thead>
              <tbody>
                {ms.map(m => {
                  const ta = m.teamAId ? teamMap.get(m.teamAId) : null;
                  const tb = m.teamBId ? teamMap.get(m.teamBId) : null;
                  const sets: { scoreA: number; scoreB: number }[] = m.scores || [];
                  const scoreStr = sets.length ? sets.map(s => `${s.scoreA}-${s.scoreB}`).join(", ") : "—";
                  const winner = m.winnerId === m.teamAId ? (ta ? getTeamName(ta) : "A") : m.winnerId === m.teamBId ? (tb ? getTeamName(tb) : "B") : "—";
                  return (
                    <tr key={m.id} className="border-t border-border/30">
                      <td className="px-4 py-2.5 text-muted-foreground">#{m.matchOrder || m.id}</td>
                      <td className="px-4 py-2.5 font-bold text-foreground">{ta ? getTeamName(ta) : "TBD"}</td>
                      <td className="px-4 py-2.5 font-bold text-foreground">{tb ? getTeamName(tb) : "TBD"}</td>
                      <td className="text-center px-2 py-2.5 text-muted-foreground">{scoreStr}</td>
                      <td className="text-center px-2 py-2.5 font-black text-emerald-500 dark:text-emerald-400">{winner}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Helper: render a list of groups as standings tables.
  const renderGroupsList = (groupList: any[]) => (
    <div className="space-y-3">
      {groupList.map((grp: any, gi: number) => {
        const gNum = grp.groupOrder || gi + 1;
        const rows = computeGroupRows(grp, gNum).sort(sortFn);
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
                  <Badge className="bg-violet-500/15 text-violet-500 dark:text-violet-400 border border-violet-500/30 text-[9px] font-black ml-auto">{rows.length} Pairs</Badge>
                </div>
              </div>
              {renderStandingsTable(rows, advancePerGroup)}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Bucket groups by their custom stageId. Groups without a known stage fall through to the
  // legacy "Round Robin" section so existing tournaments keep working.
  const customStageMap = new Map<number, any>();
  for (const s of stages) customStageMap.set(s.id, s);
  const customStageGroupBuckets = new Map<number, any[]>();
  const legacyGroups: any[] = [];
  for (const g of sortedGroups) {
    if (g.stageId && customStageMap.has(g.stageId)) {
      if (!customStageGroupBuckets.has(g.stageId)) customStageGroupBuckets.set(g.stageId, []);
      customStageGroupBuckets.get(g.stageId)!.push(g);
    } else {
      legacyGroups.push(g);
    }
  }
  const nowMs = Date.now();
  const isStagePast = (groupList: any[]) =>
    groupList.length > 0 && groupList.every((g: any) => g.startTime && new Date(g.startTime).getTime() < nowMs);
  const sortedCustomStages = Array.from(customStageGroupBuckets.entries())
    .map(([sid, gs]) => ({ stage: customStageMap.get(sid), groupList: gs, past: isStagePast(gs) }))
    .sort((a, b) => {
      if (a.past !== b.past) return a.past ? 1 : -1;
      return (b.stage.displayOrder ?? 0) - (a.stage.displayOrder ?? 0);
    });

  // Per-stage section list — render each stage as a single accordion item, with its
  // groups / KO matches stacked inside. Latest-stage-on-top order.
  type StandingsStage = { key: string; label: string; color: string; icon: any; count: number; countLabel: string; isPast?: boolean; render: () => React.ReactNode };
  const stageSections: StandingsStage[] = [];

  // Active custom stages (built from the Groups tab) render first.
  for (const cs of sortedCustomStages.filter(s => !s.past)) {
    stageSections.push({
      key: `custom-${cs.stage.id}`,
      label: cs.stage.name,
      color: "from-violet-600 to-purple-600",
      icon: Trophy,
      count: cs.groupList.length,
      countLabel: cs.groupList.length === 1 ? "group" : "groups",
      render: () => renderGroupsList(cs.groupList),
    });
  }
  if (finalMatches.length > 0) {
    stageSections.push({
      key: "final", label: "Final", color: "from-yellow-500 to-amber-500", icon: Trophy, count: finalMatches.length,
      countLabel: finalMatches.length === 1 ? "match" : "matches",
      render: () => renderKoStage("Final", finalMatches, "from-yellow-500/40"),
    });
  }
  if (semiMatches.length > 0) {
    stageSections.push({
      key: "sf", label: "Semi-Finals", color: "from-amber-500 to-orange-500", icon: Medal, count: semiMatches.length,
      countLabel: semiMatches.length === 1 ? "match" : "matches",
      render: () => renderKoStage("Semi-Finals", semiMatches, "from-amber-500/40"),
    });
  }
  if (qfMatches.length > 0) {
    stageSections.push({
      key: "qf", label: "Quarter-Finals", color: "from-cyan-500 to-sky-500", icon: GitBranch, count: qfMatches.length,
      countLabel: qfMatches.length === 1 ? "match" : "matches",
      render: () => renderKoStage("Quarter-Finals", qfMatches, "from-cyan-500/40"),
    });
  }
  if (legacyGroups.length > 0) {
    stageSections.push({
      key: "rr", label: "Round Robin", color: "from-violet-600 to-purple-600", icon: LayoutGrid, count: legacyGroups.length,
      countLabel: legacyGroups.length === 1 ? "group" : "groups",
      render: () => renderGroupsList(legacyGroups),
    });
  }
  // Past custom stages sink to the bottom, collapsed by default.
  for (const cs of sortedCustomStages.filter(s => s.past)) {
    stageSections.push({
      key: `custom-past-${cs.stage.id}`,
      label: cs.stage.name,
      color: "from-slate-500 to-slate-600",
      icon: Trophy,
      count: cs.groupList.length,
      countLabel: cs.groupList.length === 1 ? "group" : "groups",
      isPast: true,
      render: () => renderGroupsList(cs.groupList),
    });
  }

  // Default open: latest active stage with content (first non-past in the list).
  const firstActive = stageSections.find(s => !s.isPast) || stageSections[0];
  const defaultOpen = firstActive ? [`sstage-${firstActive.key}`] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-violet-500" />
        <span className="text-xs font-black text-foreground uppercase tracking-wider">Standings</span>
        {stageSections.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground ml-auto">
            {stageSections.length} {stageSections.length === 1 ? "stage" : "stages"}
          </span>
        )}
      </div>

      {stageSections.length === 0 ? (
        <div className="text-xs text-muted-foreground italic px-2">No standings yet — add groups or generate matches to begin.</div>
      ) : (
        <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
          {stageSections.map(s => {
            const Icon = s.icon;
            return (
              <AccordionItem key={s.key} value={`sstage-${s.key}`}
                className="border border-border/40 rounded-2xl overflow-hidden bg-card data-[state=open]:bg-card">
                <AccordionTrigger
                  className="px-4 py-3 hover:no-underline hover:bg-muted/30"
                  data-testid={`accordion-standings-stage-${s.key}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0", s.color)}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-black text-foreground uppercase tracking-wider truncate">{s.label}</span>
                    {s.isPast && (
                      <Badge className="bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30 text-[9px] font-black mr-2">Past</Badge>
                    )}
                    <Badge className="bg-muted/60 text-foreground text-[9px] font-black ml-auto mr-2">
                      {s.count} {s.countLabel}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  {s.render()}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
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
  const { data: stages = [] } = useTournamentStages(tournamentId);
  const createGroupMutation = useCreateTournamentGroup();
  const updateGroupMutation = useUpdateTournamentGroup();
  const deleteGroupMutation = useDeleteTournamentGroup();
  const createStageMutation = useCreateTournamentStage();
  const updateStageMutation = useUpdateTournamentStage();
  const deleteStageMutation = useDeleteTournamentStage();
  const addPairMutation = useAddPairToGroup();
  const removePairMutation = useRemovePairFromGroup();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [addPairOpen, setAddPairOpen] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [stagesDialogOpen, setStagesDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const [formName, setFormName] = useState("");
  const [formMaxPairs, setFormMaxPairs] = useState("4");
  const [formStartTime, setFormStartTime] = useState("");
  const [formHallName, setFormHallName] = useState("");
  const [formCourtName, setFormCourtName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formStageId, setFormStageId] = useState<string>("none");
  const [bulkGroupTime, setBulkGroupTime] = useState("");
  const [perGroupTime, setPerGroupTime] = useState<Record<number, string>>({});

  const activeCatId = formCategoryId ? Number(formCategoryId) : (categories.length > 0 ? categories[0].id : 0);
  const { data: allTeams = [] } = useTournamentTeams(activeCatId);
  const { data: allPairs = [] } = useTournamentPairs(tournamentId);
  const { data: catMatches = [] } = useTournamentMatches(activeCatId);
  const acceptedPairs = allPairs.filter((p: any) => !!p.pairRequestId);

  // Map: "minProfileId-maxProfileId" -> teamId, so we can cross-check pairs against team assignments
  const teamIdByPlayerKey = new Map<string, number>();
  const teamUsersById = new Map<number, { u1?: number; u2?: number }>();
  for (const t of allTeams as any[]) {
    if (t.player1Id && t.player2Id) {
      const key = [Math.min(t.player1Id, t.player2Id), Math.max(t.player1Id, t.player2Id)].join("-");
      teamIdByPlayerKey.set(key, t.id);
    }
    teamUsersById.set(t.id, {
      u1: t.player1?.user?.id ?? t.player1?.userId,
      u2: t.player2?.user?.id ?? t.player2?.userId,
    });
  }

  // Build a "qualifier index" — for each pair (keyed by sorted user IDs), find their
  // round-robin group number, points-for total, and rank within that group.
  // This lets the Add-Pair dropdown sort by performance and label each pair as "G1 · 1st (63 pts)".
  type PairStat = { uKey: string; groupNumber: number; pf: number; matchesWon: number };
  const userKey = (a?: number | null, b?: number | null) => (a && b) ? `u-${Math.min(a, b)}-${Math.max(a, b)}` : null;
  const statsByGroup = new Map<number, Map<string, PairStat>>();
  for (const m of (catMatches as any[])) {
    if (m.isBye || !m.groupNumber || m.groupNumber >= 100) continue;
    const aUsers = teamUsersById.get(m.teamAId);
    const bUsers = teamUsersById.get(m.teamBId);
    const aKey = userKey(aUsers?.u1, aUsers?.u2);
    const bKey = userKey(bUsers?.u1, bUsers?.u2);
    const sets: { scoreA: number; scoreB: number }[] = m.scores || [];
    let totalA = 0, totalB = 0;
    for (const s of sets) { totalA += s.scoreA; totalB += s.scoreB; }
    const finished = m.status === "completed" || !!m.winnerId;
    if (!finished) continue;
    const groupMap = statsByGroup.get(m.groupNumber) || new Map<string, PairStat>();
    if (aKey) {
      const existing = groupMap.get(aKey) || { uKey: aKey, groupNumber: m.groupNumber, pf: 0, matchesWon: 0 };
      existing.pf += totalA;
      if (m.winnerId === m.teamAId) existing.matchesWon += 1;
      groupMap.set(aKey, existing);
    }
    if (bKey) {
      const existing = groupMap.get(bKey) || { uKey: bKey, groupNumber: m.groupNumber, pf: 0, matchesWon: 0 };
      existing.pf += totalB;
      if (m.winnerId === m.teamBId) existing.matchesWon += 1;
      groupMap.set(bKey, existing);
    }
    statsByGroup.set(m.groupNumber, groupMap);
  }
  const qualifierByUserKey = new Map<string, { groupNumber: number; rank: number; points: number }>();
  for (const [gNum, pairMap] of statsByGroup.entries()) {
    const ranked = Array.from(pairMap.values()).sort((a, b) => b.pf - a.pf || b.matchesWon - a.matchesWon);
    ranked.forEach((stat, idx) => {
      qualifierByUserKey.set(stat.uKey, { groupNumber: gNum, rank: idx + 1, points: stat.pf });
    });
  }

  // For a given groupId, list available pairs — only excludes those already in THIS group.
  // Knockout groups (QF / SF / Final) can therefore reuse pairs already assigned to round-robin groups.
  function availablePairsForGroup(groupId: number) {
    const inThisGroup = groups.find((g: any) => g.id === groupId);
    const blockedPrIds = new Set<number>(
      (inThisGroup?.pairs || []).map((p: any) => p.pairRequestId).filter(Boolean)
    );
    const blockedTeamIds = new Set<number>(
      (inThisGroup?.pairs || []).map((p: any) => p.teamId).filter(Boolean)
    );
    const seenPrIds = new Set<number>();
    const list = acceptedPairs.filter((p: any) => {
      if (!p.pairRequestId) return false;
      if (seenPrIds.has(p.pairRequestId)) return false;
      seenPrIds.add(p.pairRequestId);
      if (blockedPrIds.has(p.pairRequestId)) return false;
      if (p.profile1?.id && p.profile2?.id) {
        const key = [Math.min(p.profile1.id, p.profile2.id), Math.max(p.profile1.id, p.profile2.id)].join("-");
        const tid = teamIdByPlayerKey.get(key);
        if (tid && blockedTeamIds.has(tid)) return false;
      }
      return true;
    });
    // Decorate with qualifier info, then sort by points DESC so top finishers appear first.
    const decorated = list.map((p: any) => {
      const uKey = userKey(p.user1?.id ?? p.fromUserId, p.user2?.id ?? p.toUserId);
      const q = uKey ? qualifierByUserKey.get(uKey) : undefined;
      return { pair: p, qualifier: q };
    });
    decorated.sort((a, b) => {
      const pa = a.qualifier?.points ?? -1;
      const pb = b.qualifier?.points ?? -1;
      return pb - pa;
    });
    return decorated;
  }

  const hasPairs = acceptedPairs.length > 0;

  function resetForm() {
    setFormName(""); setFormMaxPairs("4"); setFormStartTime(""); setFormHallName(""); setFormCourtName(""); setFormCategoryId(""); setFormStageId("none");
  }

  function openEdit(group: any) {
    setEditingGroup(group);
    setFormName(group.name);
    setFormMaxPairs(String(group.maxPairs));
    setFormStartTime(group.startTime ? (() => { const { date, time } = utcToLondonInputs(group.startTime); return date && time ? `${date}T${time}` : ""; })() : "");
    setFormHallName(group.hallName || "");
    setFormCourtName(group.courtName || "");
    setFormCategoryId(group.categoryId ? String(group.categoryId) : "");
    setFormStageId(group.stageId ? String(group.stageId) : "none");
  }

  async function handleCreate() {
    if (!formName.trim()) { toast({ title: "Error", description: "Group name is required", variant: "destructive" }); return; }
    try {
      await createGroupMutation.mutateAsync({
        tournamentId,
        name: formName.trim(),
        maxPairs: Number(formMaxPairs) || 4,
        startTime: formStartTime ? (londonInputsToUtcISO(formStartTime.slice(0, 10), formStartTime.slice(11, 16)) || undefined) : undefined,
        hallName: formHallName || undefined,
        courtName: formCourtName || undefined,
        categoryId: formCategoryId ? Number(formCategoryId) : undefined,
        stageId: formStageId !== "none" ? Number(formStageId) : null,
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
        startTime: formStartTime ? (londonInputsToUtcISO(formStartTime.slice(0, 10), formStartTime.slice(11, 16)) || null) : null,
        hallName: formHallName || null,
        courtName: formCourtName || null,
        categoryId: formCategoryId ? Number(formCategoryId) : null,
        stageId: formStageId !== "none" ? Number(formStageId) : null,
      });
      toast({ title: "Group Updated" });
      setEditingGroup(null);
      resetForm();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleCreateStage() {
    const name = newStageName.trim();
    if (!name) { toast({ title: "Error", description: "Stage name required", variant: "destructive" }); return; }
    try {
      await createStageMutation.mutateAsync({ tournamentId, name });
      setNewStageName("");
      toast({ title: "Stage Created" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleRenameStage(stageId: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await updateStageMutation.mutateAsync({ stageId, tournamentId, name: trimmed });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function handleDeleteStage(stageId: number) {
    try {
      await deleteStageMutation.mutateAsync({ stageId, tournamentId });
      toast({ title: "Stage Deleted" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

  async function moveStage(stageId: number, direction: "up" | "down") {
    const sorted = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(s => s.id === stageId);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapWith];
    try {
      await Promise.all([
        updateStageMutation.mutateAsync({ stageId: a.id, tournamentId, displayOrder: b.displayOrder }),
        updateStageMutation.mutateAsync({ stageId: b.id, tournamentId, displayOrder: a.displayOrder }),
      ]);
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
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stage</label>
            <Select value={formStageId} onValueChange={setFormStageId}>
              <SelectTrigger data-testid="select-group-stage"><SelectValue placeholder="No stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No stage (use legacy bucket)</SelectItem>
                {[...stages].sort((a, b) => b.displayOrder - a.displayOrder).map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stages.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">No stages yet. Use Manage Stages to create one.</p>
            )}
          </div>
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
    const iso = val ? (londonInputsToUtcISO(val.slice(0, 10), val.slice(11, 16)) || null) : null;
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="font-bold text-xs"
              data-testid="button-manage-stages"
              onClick={() => setStagesDialogOpen(true)}>
              <Settings className="h-3.5 w-3.5 mr-1" /> Manage Stages
              {stages.length > 0 && (
                <Badge className="ml-1.5 h-4 px-1.5 text-[9px] bg-violet-600/20 text-violet-400 border-0">{stages.length}</Badge>
              )}
            </Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
              data-testid="button-create-group"
              onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
            </Button>
          </div>
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
      ) : (() => {
        // Legacy stage thresholds (used when no admin-defined stages exist):
        // 1-99 = Round Robin, 100-199 = other/early knockout, 200-299 = QF, 300-399 = SF, 400+ = Final.
        const stageOf = (order?: number) => {
          if (!order) return "rr" as const;
          if (order >= 400) return "final" as const;
          if (order >= 300) return "sf" as const;
          if (order >= 200) return "qf" as const;
          if (order >= 100) return "other" as const;
          return "rr" as const;
        };
        const legacyMeta: Record<string, { label: string; color: string; icon: any; order: number }> = {
          final:  { label: "Final",            color: "from-yellow-500 to-amber-500",  icon: Trophy,     order: 1 },
          sf:     { label: "Semi-Finals",      color: "from-amber-500 to-orange-500",  icon: Medal,      order: 2 },
          qf:     { label: "Quarter-Finals",   color: "from-cyan-500 to-sky-500",      icon: GitBranch,  order: 3 },
          other:  { label: "Other Knockouts",  color: "from-fuchsia-500 to-pink-500",  icon: Swords,     order: 4 },
          rr:     { label: "Round Robin",      color: "from-violet-600 to-purple-600", icon: LayoutGrid, order: 5 },
        };
        const customColors = ["from-violet-600 to-purple-600", "from-cyan-500 to-sky-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500", "from-emerald-500 to-teal-500", "from-indigo-500 to-blue-500"];
        const stageMap = new Map<number, any>();
        for (const s of stages) stageMap.set(s.id, s);
        const useCustom = stages.length > 0;
        const now = Date.now();

        // Build buckets keyed by either `s-{stageId}` (custom), `legacy-{key}` (legacy fallback),
        // or `unassigned` (custom mode but group has no stageId).
        type Bucket = { key: string; label: string; color: string; icon: any; sortOrder: number; isPast: boolean; groups: any[] };
        const bucketMap = new Map<string, Bucket>();

        const isAllPast = (gs: any[]) => gs.length > 0 && gs.every(g => g.startTime && new Date(g.startTime).getTime() < now);

        if (useCustom) {
          for (const g of groups as any[]) {
            if (g.stageId && stageMap.has(g.stageId)) {
              const stage = stageMap.get(g.stageId);
              const key = `s-${stage.id}`;
              if (!bucketMap.has(key)) {
                const colorIdx = [...stages].sort((a, b) => b.displayOrder - a.displayOrder).findIndex(s => s.id === stage.id);
                bucketMap.set(key, {
                  key, label: stage.name, color: customColors[colorIdx % customColors.length], icon: LayoutGrid,
                  // Higher displayOrder = newer stage = lower sortOrder so it renders on top.
                  sortOrder: -stage.displayOrder, isPast: false, groups: [],
                });
              }
              bucketMap.get(key)!.groups.push(g);
            } else {
              const key = "unassigned";
              if (!bucketMap.has(key)) {
                bucketMap.set(key, {
                  key, label: "Unassigned", color: "from-slate-500 to-zinc-500", icon: LayoutGrid,
                  sortOrder: 9999, isPast: false, groups: [],
                });
              }
              bucketMap.get(key)!.groups.push(g);
            }
          }
        } else {
          for (const g of groups as any[]) {
            const sKey = stageOf(g.groupOrder);
            const meta = legacyMeta[sKey];
            const key = `legacy-${sKey}`;
            if (!bucketMap.has(key)) {
              bucketMap.set(key, {
                key, label: meta.label, color: meta.color, icon: meta.icon,
                sortOrder: meta.order, isPast: false, groups: [],
              });
            }
            bucketMap.get(key)!.groups.push(g);
          }
        }

        // Compute past status per bucket.
        for (const b of bucketMap.values()) b.isPast = isAllPast(b.groups);

        const allBuckets = Array.from(bucketMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
        const activeBuckets = allBuckets.filter(b => !b.isPast);
        const pastBuckets = allBuckets.filter(b => b.isPast);

        // Default open: first active bucket only. Past buckets stay collapsed by default.
        const defaultOpen = activeBuckets[0] ? [`gstage-${activeBuckets[0].key}`] : [];
        const orderedBuckets = [...activeBuckets, ...pastBuckets];
        return (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
            {orderedBuckets.map(bucket => {
              const StageIcon = bucket.icon;
              const stageGroups = bucket.groups;
              const meta = { label: bucket.label, color: bucket.color };
              const stageKey = bucket.key;
              return (
                <AccordionItem key={stageKey} value={`gstage-${stageKey}`}
                  className={cn(
                    "border rounded-2xl overflow-hidden",
                    bucket.isPast ? "border-border/30 bg-muted/20 opacity-80" : "border-border/40 bg-card data-[state=open]:bg-card",
                  )}>
                  <AccordionTrigger
                    className="px-4 py-3 hover:no-underline hover:bg-muted/30"
                    data-testid={`accordion-groups-stage-${stageKey}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm flex-shrink-0", meta.color)}>
                        <StageIcon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm font-black text-foreground uppercase tracking-wider truncate">{meta.label}</span>
                      {bucket.isPast && (
                        <Badge className="bg-muted/60 text-muted-foreground text-[9px] font-black border-0">PAST</Badge>
                      )}
                      <Badge className="bg-muted/60 text-foreground text-[9px] font-black ml-auto mr-2">
                        {stageGroups.length} {stageGroups.length === 1 ? "group" : "groups"}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 pt-1">
                    <div className="grid gap-4">
                      {stageGroups.map((group: any) => {
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
                              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatLondon(group.startTime, "dd MMM, HH:mm")}</span>
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
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start time (UK)</span>
                      <Input
                        type="datetime-local"
                        value={perGroupTime[group.id] ?? (group.startTime ? (() => { const { date, time } = utcToLondonInputs(group.startTime); return date && time ? `${date}T${time}` : ""; })() : "")}
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

                  {canManage && !isFull && (() => {
                    const options = availablePairsForGroup(group.id);
                    const rankLabel = (r: number) => r === 1 ? "1st" : r === 2 ? "2nd" : r === 3 ? "3rd" : `${r}th`;
                    const rankColor = (r: number) =>
                      r === 1 ? "text-yellow-600 dark:text-yellow-400 font-black"
                      : r === 2 ? "text-slate-500 dark:text-slate-300 font-bold"
                      : r === 3 ? "text-orange-500 dark:text-orange-400 font-bold"
                      : "text-muted-foreground";
                    return (
                      <div className="flex items-center gap-2 pt-1">
                        <Select
                          value=""
                          onValueChange={(val) => {
                            if (val) handleAddPair(group.id, val);
                          }}
                          disabled={addPairMutation.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-add-pair-${group.id}`}>
                            <SelectValue placeholder={addPairMutation.isPending ? "Adding..." : "+ Add pair (top finishers first)"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[400px]">
                            {options.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground italic">No more pairs available</div>
                            ) : (
                              options.map(({ pair: p, qualifier: q }: any) => (
                                <SelectItem key={`pr-${p.pairRequestId}`} value={`pr-${p.pairRequestId}`}>
                                  <div className="flex items-center gap-2">
                                    {q ? (
                                      <span className={cn("text-[10px] font-black uppercase tracking-wide tabular-nums px-1.5 py-0.5 rounded", rankColor(q.rank), "bg-muted/60")}>
                                        G{q.groupNumber} · {rankLabel(q.rank)} · {q.points}p
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/40">No matches yet</span>
                                    )}
                                    <span>{`${p.user1?.fullName || "?"} & ${p.user2?.fullName || "?"}`}</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
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
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        );
      })()}

      {groupFormDialog}

      <Dialog open={stagesDialogOpen} onOpenChange={setStagesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Stages</DialogTitle>
            <DialogDescription>
              Create named stages (for example "Group Stage", "Quarter-Finals", "Final"). Assign groups and matches to a stage so they render together.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="New stage name"
                data-testid="input-new-stage-name"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateStage(); }}
              />
              <Button
                onClick={handleCreateStage}
                disabled={!newStageName.trim() || createStageMutation.isPending}
                data-testid="button-add-stage"
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {createStageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {stages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">No stages yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                {[...stages].sort((a, b) => b.displayOrder - a.displayOrder).map((s, idx, arr) => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/40 bg-muted/30">
                    <span className="text-[10px] font-black text-muted-foreground w-8">#{s.displayOrder}</span>
                    <Input
                      defaultValue={s.name}
                      onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.name) handleRenameStage(s.id, e.target.value); }}
                      className="h-7 text-xs flex-1"
                      data-testid={`input-stage-name-${s.id}`}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      disabled={idx === 0 || updateStageMutation.isPending}
                      onClick={() => moveStage(s.id, "down")}
                      title="Move later (down in list)"
                      data-testid={`button-stage-down-${s.id}`}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      disabled={idx === arr.length - 1 || updateStageMutation.isPending}
                      onClick={() => moveStage(s.id, "up")}
                      title="Move earlier (up in list)"
                      data-testid={`button-stage-up-${s.id}`}>
                      <ChevronRight className="h-3.5 w-3.5 rotate-[-90deg]" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600"
                      disabled={deleteStageMutation.isPending}
                      onClick={() => handleDeleteStage(s.id)}
                      data-testid={`button-stage-delete-${s.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Latest stage (highest position) shows on top. Past stages collapse to the bottom automatically based on group start times. Deleting a stage detaches its groups and matches; it does not delete them.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStagesDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const addPlayerMutation = useAdminAddPlayer();
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addPlayerSearch, setAddPlayerSearch] = useState("");
  const { data: systemUsers } = useQuery<any[]>({ queryKey: ["/api/tournaments", tournamentId, "addable-players"], enabled: addPlayerOpen });
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const activeCatId = selectedCatId || (categories.length > 0 ? categories[0].id : null);
  const { data: catTeams } = useTournamentTeams(activeCatId || 0);
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [showCreatePair, setShowCreatePair] = useState(false);
  const [newPairPlayer1, setNewPairPlayer1] = useState<string>("");
  const [newPairPlayer2, setNewPairPlayer2] = useState<string>("");
  const [newPairName, setNewPairName] = useState("");
  const [newPairCategoryId, setNewPairCategoryId] = useState<string>("");
  const doublesCategories = (categories || []).filter((c: any) => (c.playersPerSide ?? 2) >= 2);
  const selectedNewPairCat = doublesCategories.find((c: any) => String(c.id) === newPairCategoryId);
  const genderAllowsForCat = (cat: any, gender: string | null | undefined): boolean => {
    const r = String(cat?.genderRestriction || "ALL").toUpperCase();
    if (r === "ALL" || r === "MIXED" || !r) return true;
    const g = String(gender || "").toUpperCase();
    if (r === "FEMALE_ONLY" || r === "FEMALE") return g === "FEMALE" || g === "F";
    if (r === "MALE_ONLY" || r === "MALE") return g === "MALE" || g === "M";
    return true;
  };
  const candidatePlayers = (() => {
    const pool: any[] = [];
    (playerPool || []).forEach((p: any) => pool.push({ userId: p.userId, fullName: p.user?.fullName || `Player ${p.userId}`, gender: p.user?.gender }));
    (registrations || []).forEach((r: any) => {
      if (r.status !== "APPROVED") return;
      // Include EVERY approved player — even those already in a pair for another
      // category. Per-category uniqueness is enforced server-side (409 from the
      // unique index), and the whole point of multi-category tournaments is that
      // a player can be in different pairs across categories.
      if (pool.some(p => p.userId === r.userId)) return;
      pool.push({ userId: r.userId, fullName: r.user?.fullName || `Player ${r.userId}`, gender: r.user?.gender });
    });
    if (selectedNewPairCat) return pool.filter(p => genderAllowsForCat(selectedNewPairCat, p.gender));
    return pool;
  })();

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
        <Button size="sm" variant="outline" className="font-bold border-violet-500/30 text-violet-500 hover:bg-violet-500/10"
          data-testid="button-add-player"
          onClick={() => setAddPlayerOpen(true)}>
          <UserPlus className="h-3.5 w-3.5 mr-1" />Add Player
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

      <Dialog open={addPlayerOpen} onOpenChange={(o) => { setAddPlayerOpen(o); if (!o) setAddPlayerSearch(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Pick an existing player from the system to add to this tournament. They will be added as approved.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search players by name or email..." value={addPlayerSearch}
              onChange={e => setAddPlayerSearch(e.target.value)} className="pl-9" data-testid="input-add-player-search" />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 mt-2">
            {(() => {
              const registeredIds = new Set((registrations || []).map((r: any) => r.userId));
              const q = addPlayerSearch.trim().toLowerCase();
              const matches = (systemUsers || [])
                .filter((u: any) => !registeredIds.has(u.id))
                .filter((u: any) => !q || (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))
                .slice(0, 50);
              if (!matches.length) return <p className="text-sm text-muted-foreground py-6 text-center">No matching players.</p>;
              return matches.map((u: any) => (
                <button key={u.id} data-testid={`button-add-player-${u.id}`}
                  disabled={addPlayerMutation.isPending}
                  onClick={async () => {
                    try {
                      await addPlayerMutation.mutateAsync({ tournamentId, userId: u.id });
                      toast({ title: "Player Added", description: `${u.fullName || "Player"} added to the tournament.` });
                      setAddPlayerOpen(false);
                      setAddPlayerSearch("");
                    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                  }}
                  className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50">
                  <span className="font-medium truncate">{u.fullName || `Player ${u.id}`}</span>
                  <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                </button>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

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
                {doublesCategories.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Category</label>
                    <Select value={newPairCategoryId} onValueChange={(v) => { setNewPairCategoryId(v); setNewPairPlayer1(""); setNewPairPlayer2(""); }}>
                      <SelectTrigger className="h-9" data-testid="select-pair-category">
                        <SelectValue placeholder="Tournament-wide (legacy) — pick a category to land in My Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Tournament-wide (legacy)</SelectItem>
                        {doublesCategories.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}{c.genderRestriction && c.genderRestriction !== "ALL" ? ` · ${c.genderRestriction}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedNewPairCat && (
                      <p className="text-[10px] text-muted-foreground">Players filtered by this category's gender restriction. Pair will be created directly in the per-category team list.</p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">Player 1</label>
                    <Select value={newPairPlayer1} onValueChange={setNewPairPlayer1}>
                      <SelectTrigger className="h-9" data-testid="select-pair-player1">
                        <SelectValue placeholder="Select player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {candidatePlayers.filter((p: any) => String(p.userId) !== newPairPlayer2).map((p: any) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.fullName}</SelectItem>
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
                        {candidatePlayers.filter((p: any) => String(p.userId) !== newPairPlayer1).map((p: any) => (
                          <SelectItem key={p.userId} value={String(p.userId)}>{p.fullName}</SelectItem>
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
                        const catId = newPairCategoryId && newPairCategoryId !== "__none__" ? Number(newPairCategoryId) : null;
                        await adminCreatePairMutation.mutateAsync({
                          tournamentId,
                          player1Id: Number(newPairPlayer1),
                          player2Id: Number(newPairPlayer2),
                          pairName: newPairName || undefined,
                          categoryId: catId,
                        });
                        toast({ title: catId ? "Pair Created in Category" : "Pair Created" });
                        setNewPairPlayer1(""); setNewPairPlayer2(""); setNewPairName(""); setNewPairCategoryId(""); setShowCreatePair(false);
                      } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    }}>
                    {adminCreatePairMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                    Create Pair
                  </Button>
                  <Button size="sm" variant="outline" className="font-bold text-xs"
                    onClick={() => { setShowCreatePair(false); setNewPairPlayer1(""); setNewPairPlayer2(""); setNewPairName(""); setNewPairCategoryId(""); }}>
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
            <h4 className="font-black text-foreground text-sm uppercase tracking-wider mb-1">Categories</h4>
            <p className="text-[11px] text-muted-foreground mb-3">Set a per-category entry fee to override the tournament default. Leave blank to use the tournament fee.</p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories created yet.</p>
            ) : categories.map(cat => (
              <CategoryFeeRow key={cat.id} category={cat} tournament={tournament} tournamentId={tournamentId} onDelete={async () => {
                if (!window.confirm(`Delete "${cat.name}"? This will remove all matches, standings, and teams in this category.`)) return;
                try { await deleteCatMutation.mutateAsync(cat.id); toast({ title: "Category Deleted" }); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
              }} />
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
  const [showUnpairedOnly, setShowUnpairedOnly] = useState(false);

  if (regsLoading) return <Loader2 className="h-6 w-6 animate-spin text-amber-500 mx-auto" />;
  if (!registrations?.length) return <EmptyState icon={Users} title="No Registrations" description="No one has registered yet." />;

  const validRegIds = new Set(registrations.map((r: any) => r.id));
  const reconciledRegIds = new Set([...selectedIds].filter(id => validRegIds.has(id)));
  if (reconciledRegIds.size !== selectedIds.size && selectedIds.size > 0) {
    setTimeout(() => setSelectedIds(reconciledRegIds), 0);
  }

  // A player counts as "without a partner" when no category pairing exists and no
  // legacy tournament-wide partner is set (mirrors the PAIR display logic below).
  const isUnpaired = (r: any) => !r.hasPartner && !r.partner;
  const unpairedCount = registrations.filter(isUnpaired).length;
  const visibleRegistrations = showUnpairedOnly ? registrations.filter(isUnpaired) : registrations;
  const visibleIdSet = new Set(visibleRegistrations.map((r: any) => r.id));
  const allVisibleSelected = visibleRegistrations.length > 0 && visibleRegistrations.every((r: any) => selectedIds.has(r.id));
  // Only act on selections that are currently visible, so toggling the filter can
  // never approve/reject/pay a hidden (partnered) registration.
  const effectiveSelectedIds = [...selectedIds].filter(id => visibleIdSet.has(id));

  function setFilter(next: boolean) {
    setShowUnpairedOnly(next);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleRegistrations.map((r: any) => r.id)));
  }

  async function handleBulkAction(action: "APPROVED" | "REJECTED") {
    if (effectiveSelectedIds.length === 0) return;
    let success = 0;
    for (const id of effectiveSelectedIds) {
      try { await updateRegMutation.mutateAsync({ id, status: action }); success++; } catch {}
    }
    toast({ title: `${success} player${success !== 1 ? "s" : ""} ${action.toLowerCase()}` });
    setSelectedIds(new Set());
  }

  async function handleBulkPayment(confirmed: boolean) {
    if (effectiveSelectedIds.length === 0) return;
    let success = 0;
    for (const id of effectiveSelectedIds) {
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
            <input type="checkbox" checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer"
              data-testid="checkbox-select-all-regs" />
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Registrations</h4>
            {selectedIds.size > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold">{selectedIds.size} selected</Badge>
            )}
            <Button size="sm" variant={showUnpairedOnly ? "default" : "outline"}
              className={cn("h-7 text-xs font-bold", showUnpairedOnly ? "bg-amber-600 hover:bg-amber-700 text-white" : "")}
              onClick={() => setFilter(!showUnpairedOnly)}
              data-testid="button-filter-no-partner">
              <UserX className="h-3 w-3 mr-1" />
              {showUnpairedOnly ? "Showing no-partner" : "No partner"}
              <Badge variant="outline" className="ml-1.5 text-[9px] px-1 font-bold bg-background/50">{unpairedCount}</Badge>
            </Button>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={updateRegMutation.isPending}
                data-testid="button-bulk-approve"
                onClick={() => handleBulkAction("APPROVED")}>
                <Check className="h-3 w-3 mr-1" />Approve ({effectiveSelectedIds.length})
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
          {visibleRegistrations.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-no-unpaired">
              Everyone has a partner.
            </div>
          )}
          {visibleRegistrations.map((reg: any) => (
            <div key={reg.id} className={cn("flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors flex-wrap", selectedIds.has(reg.id) && "bg-amber-500/5")} data-testid={`admin-reg-${reg.id}`}>
              <div className="flex items-center gap-3 min-w-0">
                <input type="checkbox" checked={selectedIds.has(reg.id)}
                  onChange={() => toggleSelect(reg.id)}
                  className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer flex-shrink-0"
                  data-testid={`checkbox-reg-${reg.id}`} />
                <PlayerAvatar name={reg.user?.fullName || "?"} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{reg.user?.fullName}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    {reg.hasPartner || reg.partner ? (
                      <span className="font-bold text-emerald-400">PAIR</span>
                    ) : (
                      <span className="font-medium">{reg.registrationType}</span>
                    )}
                    {reg.partner && !reg.hasPartner && <span>+ {reg.partner.fullName}</span>}
                    {reg.paymentConfirmed && <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1 font-bold">PAID</Badge>}
                  </div>
                  {Array.isArray(reg.categoryPartners) && reg.categoryPartners.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {reg.categoryPartners.map((cp: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground" data-testid={`reg-partner-${reg.id}-${i}`}>
                          <Badge className={cn("text-[9px] px-1 border font-bold", DOUBLES_TAG_STYLES[cp.tag] || "bg-violet-500/20 text-violet-300 border-violet-500/30")}>{cp.tag}</Badge>
                          <span className="truncate">with <span className="text-foreground font-medium">{cp.name}</span></span>
                        </div>
                      ))}
                    </div>
                  )}
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
                    const name = reg.user?.fullName || "this player";
                    const ok = window.confirm(
                      `Force-withdraw ${name} from the whole tournament?\n\n` +
                      `This removes them from every category they joined and deletes any matches, ` +
                      `standings rows and pair requests tied to them. If they had a partner, that ` +
                      `partner's registration is also removed (they will need to re-register). ` +
                      `This cannot be undone.`
                    );
                    if (!ok) return;
                    try {
                      await deleteRegMutation.mutateAsync(reg.id);
                      toast({ title: "Player withdrawn", description: `${name} removed from the tournament.` });
                    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                  }}>
                  <Trash2 className="h-3 w-3 mr-1" />Withdraw
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
  const toUkLocal = (d: any) => { if (!d) return ""; const { date, time } = utcToLondonInputs(d); return date && time ? `${date}T${time}` : ""; };
  const [startDate, setStartDate] = useState(toUkLocal(tournament.startDate));
  const [endDate, setEndDate] = useState(toUkLocal(tournament.endDate));
  const [registrationDeadline, setRegistrationDeadline] = useState(toUkLocal(tournament.registrationDeadline));
  const [location, setLocation] = useState(tournament.location || "");
  const [description, setDescription] = useState(tournament.description || "");
  const [rules, setRules] = useState(tournament.rules || "");
  const [bannerUrl, setBannerUrl] = useState(tournament.bannerUrl || "");
  const [logoUrl, setLogoUrl] = useState((tournament as any).logoUrl || "");
  const [maxPlayers, setMaxPlayers] = useState(tournament.maxPlayers?.toString() || "");
  const [courtsAvailable, setCourtsAvailable] = useState(tournament.courtsAvailable?.toString() || "4");
  const [skillLevelMin, setSkillLevelMin] = useState(tournament.skillLevelMin || "");
  const [skillLevelMax, setSkillLevelMax] = useState(tournament.skillLevelMax || "");

  function resetForm() {
    setName(tournament.name || "");
    setType(tournament.type || "CLUB");
    setStatus(tournament.status || "DRAFT");
    setStartDate(toUkLocal(tournament.startDate));
    setEndDate(toUkLocal(tournament.endDate));
    setRegistrationDeadline(toUkLocal(tournament.registrationDeadline));
    setLocation(tournament.location || "");
    setDescription(tournament.description || "");
    setRules(tournament.rules || "");
    setBannerUrl(tournament.bannerUrl || "");
    setLogoUrl((tournament as any).logoUrl || "");
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
        startDate: londonInputsToUtcISO(startDate.slice(0, 10), startDate.slice(11, 16)) || new Date(startDate).toISOString(),
        endDate: londonInputsToUtcISO(endDate.slice(0, 10), endDate.slice(11, 16)) || new Date(endDate).toISOString(),
        registrationDeadline: registrationDeadline ? (londonInputsToUtcISO(registrationDeadline.slice(0, 10), registrationDeadline.slice(11, 16)) || null) : null,
        location: location.trim() || null,
        description: description.trim() || null,
        rules: rules.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        logoUrl: logoUrl.trim() || null,
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
                <option value="PUBLISHED">Published</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
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
              <label className={labelCls}>Tournament Logo URL</label>
              <div className="flex items-start gap-3">
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className={cn(inputCls, "flex-1")} data-testid="input-logo-url" />
                {logoUrl && /^https?:\/\//i.test(logoUrl) && (
                  <div className="h-12 w-12 rounded-lg border border-border/60 bg-card overflow-hidden flex-shrink-0" data-testid="preview-logo">
                    <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Square image works best. Shows on the tournaments list.</p>
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
              { label: "Start", value: tournament.startDate ? formatLondon(tournament.startDate, "dd MMM yyyy HH:mm") : "Not set", icon: Calendar },
              { label: "End", value: tournament.endDate ? formatLondon(tournament.endDate, "dd MMM yyyy HH:mm") : "Not set", icon: Calendar },
              { label: "Reg Deadline", value: tournament.registrationDeadline ? formatLondon(tournament.registrationDeadline, "dd MMM yyyy HH:mm") : "None", icon: Clock },
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

function CategoryFeeRow({ category, tournament, tournamentId, onDelete }: { category: any; tournament: any; tournamentId: number; onDelete: () => void }) {
  const updateCatMutation = useUpdateCategory();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [entryFee, setEntryFee] = useState(category.entryFee ?? "");
  const [externalEntryFee, setExternalEntryFee] = useState(category.externalEntryFee ?? "");

  const tournamentInternal = parseFloat(tournament.entryFee || "0");
  const tournamentExternal = parseFloat(tournament.externalEntryFee || tournament.entryFee || "0");

  const effectiveInternal = category.entryFee != null && category.entryFee !== "" ? parseFloat(category.entryFee) : tournamentInternal;
  const effectiveExternal = category.externalEntryFee != null && category.externalEntryFee !== ""
    ? parseFloat(category.externalEntryFee)
    : (category.entryFee != null && category.entryFee !== "" ? parseFloat(category.entryFee) : tournamentExternal);
  const usesTournamentFee = (category.entryFee == null || category.entryFee === "") && (category.externalEntryFee == null || category.externalEntryFee === "");
  const hasSplit = effectiveExternal > 0 && effectiveExternal !== effectiveInternal;

  async function handleSave() {
    try {
      await updateCatMutation.mutateAsync({
        id: category.id,
        tournamentId,
        entryFee: entryFee === "" ? null : entryFee,
        externalEntryFee: externalEntryFee === "" ? null : externalEntryFee,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "finances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "my-categories"] });
      toast({ title: "Category fee saved" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="py-2.5 border-b border-border/20 last:border-0 space-y-2" data-testid={`category-fee-row-${category.id}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{category.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {category.format?.replace("_", "+")} · {category.playersPerSide === 1 ? "Singles" : "Doubles"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <div className="text-right">
              <div className="text-xs font-black text-foreground" data-testid={`text-cat-fee-${category.id}`}>
                {effectiveInternal > 0 ? `£${effectiveInternal.toFixed(2)}` : "Free"}
                {hasSplit && <span className="text-muted-foreground font-normal"> / £{effectiveExternal.toFixed(2)}</span>}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {usesTournamentFee ? "Tournament default" : "Category fee"}
                {hasSplit && " · Member / External"}
              </div>
            </div>
          )}
          {!editing && (
            <Button size="sm" variant="ghost" className="h-7 text-xs font-bold" onClick={() => { setEntryFee(category.entryFee ?? ""); setExternalEntryFee(category.externalEntryFee ?? ""); setEditing(true); }} data-testid={`button-edit-cat-fee-${category.id}`}>
              <Edit3 className="h-3 w-3 mr-1" />Fee
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-destructive" data-testid={`button-delete-category-${category.id}`} onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Member Fee</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">£</span>
                <input
                  type="number" step="0.01" min="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder={`${tournamentInternal.toFixed(2)} (default)`}
                  className="w-full rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/60 transition-colors p-2 pl-6"
                  data-testid={`input-cat-fee-${category.id}`}
                />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">External Fee</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">£</span>
                <input
                  type="number" step="0.01" min="0"
                  value={externalEntryFee}
                  onChange={(e) => setExternalEntryFee(e.target.value)}
                  placeholder={`${tournamentExternal.toFixed(2)} (default)`}
                  className="w-full rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-violet-500/60 transition-colors p-2 pl-6"
                  data-testid={`input-cat-external-fee-${category.id}`}
                />
              </div>
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground">Leave blank to inherit the tournament-level entry fee.</p>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold border-0"
              disabled={updateCatMutation.isPending}
              onClick={handleSave} data-testid={`button-save-cat-fee-${category.id}`}>
              {updateCatMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}Save
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminFinanceView({ tournamentId, tournament }: { tournamentId: number; tournament: any }) {
  const { data: finances, isLoading } = useTournamentFinances(tournamentId);
  const updatePaymentMutation = useUpdateTournamentPayment();
  const updateTeamPayment = useUpdateTeamPayment();
  const recalcFees = useRecalculateFees();
  const { toast } = useToast();

  async function handleRecalcFees() {
    try {
      const result = await recalcFees.mutateAsync({ tournamentId });
      toast({ title: result?.message || "Fees recalculated" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function setTeamPay(teamId: number, slot: 1 | 2, paymentStatus: "UNPAID" | "PENDING" | "PAID") {
    try {
      await updateTeamPayment.mutateAsync({ teamId, tournamentId, slot, paymentStatus });
      toast({ title: `Marked ${paymentStatus}` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  }

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
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-black text-foreground text-sm uppercase tracking-wider">Collection Rate</h4>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecalcFees}
              disabled={recalcFees.isPending}
              className="h-7 text-[10px] font-bold uppercase tracking-wider"
              data-testid="button-recalculate-fees"
            >
              {recalcFees.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              <span className="ml-1.5">Recalculate fees</span>
            </Button>
            <span className={cn("text-xl font-black", finances.collectionRate >= 80 ? "text-emerald-500" : finances.collectionRate >= 50 ? "text-amber-500" : "text-red-500")}>
              {finances.collectionRate}%
            </span>
          </div>
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

      {Array.isArray(finances.byCategory) && finances.byCategory.length > 0 && (
        <div className="rounded-xl border border-border/50 overflow-hidden" data-testid="finance-by-category">
          <div className="px-4 py-3 bg-muted/20 dark:bg-muted/10 border-b border-border/30 flex items-center justify-between gap-3">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Revenue by Category</h4>
            <span className="text-[10px] text-muted-foreground">Per-category entries × fee</span>
          </div>
          <div className="divide-y divide-border/20">
            {finances.byCategory.map((c: any) => {
              const split = c.externalFee > 0 && c.externalFee !== c.internalFee;
              return (
                <div key={c.categoryId} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors" data-testid={`finance-cat-${c.categoryId}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.categoryName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{c.playerCount} {c.playerCount === 1 ? "entry" : "entries"}</span>
                      <span>·</span>
                      <span>
                        £{c.internalFee.toFixed(2)}{split ? ` / £${c.externalFee.toFixed(2)}` : ""}
                      </span>
                      {c.usesTournamentFee && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 font-bold">Default</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Expected</p>
                      <p className="text-sm font-black text-foreground" data-testid={`text-cat-expected-${c.categoryId}`}>£{c.expected.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Collected</p>
                      <p className="text-sm font-black text-emerald-500" data-testid={`text-cat-collected-${c.categoryId}`}>£{c.collected.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {players.map((player: any) => {
            const cats: any[] = player.categoryFees || [];
            const isExpanded = expandedIds.has(player.id);
            const hasCats = cats.length > 0;
            return (
              <div key={player.id} className={cn(selectedIds.has(player.id) && "bg-amber-500/5")} data-testid={`finance-player-${player.id}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input type="checkbox" checked={selectedIds.has(player.id)}
                      onChange={() => toggleSelect(player.id)}
                      className="h-4 w-4 rounded border-border accent-amber-500 cursor-pointer flex-shrink-0"
                      data-testid={`checkbox-finance-${player.id}`} />
                    <PlayerAvatar name={player.user?.fullName || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{player.user?.fullName}</p>
                        {hasCats && (
                          <button onClick={() => toggleExpand(player.id)}
                            className="text-[10px] font-bold text-amber-500 hover:text-amber-400"
                            data-testid={`button-expand-finance-${player.id}`}>
                            {isExpanded ? "Hide" : "Show"} {cats.length} {cats.length === 1 ? "category" : "categories"}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        <span>£{(player.playerFee ?? internalFee).toFixed(2)} total</span>
                        {hasCats && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-500 font-bold">£{(player.collectedFee ?? 0).toFixed(2)} paid</span>
                            {(player.pendingFee ?? 0) > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-amber-500 font-bold">£{player.pendingFee.toFixed(2)} pending</span>
                              </>
                            )}
                          </>
                        )}
                        {hasDualFees && (
                          <Badge className={cn("text-[8px] px-1 py-0 border font-bold", player.isInternal ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-violet-500/10 text-violet-500 border-violet-500/30")}>
                            {player.isInternal ? "Member" : "External"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={cn("text-[9px] px-1.5 border font-bold",
                      player.paymentStatus === "PAID" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      player.paymentStatus === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>{player.paymentStatus}</Badge>
                    {!hasCats && player.paymentStatus !== "PAID" && (
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
                    {!hasCats && player.paymentStatus === "PAID" && (
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
                {hasCats && isExpanded && (
                  <div className="px-4 pb-3 space-y-1.5">
                    {cats.map((c: any) => (
                      <div key={`${c.teamId}-${c.slot}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 dark:bg-muted/10 border border-border/30" data-testid={`finance-cat-row-${player.id}-${c.catId}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{c.categoryName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>£{c.fee.toFixed(2)}</span>
                            <Badge className={cn("text-[8px] px-1 py-0 border font-bold",
                              c.status === "PAID" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                              c.status === "PENDING" ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                              "bg-red-500/15 text-red-500 border-red-500/30"
                            )}>{c.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {c.status !== "PAID" && (
                            <Button size="sm" className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              disabled={updateTeamPayment.isPending}
                              onClick={() => setTeamPay(c.teamId, c.slot, "PAID")}
                              data-testid={`button-team-pay-paid-${c.teamId}-${c.slot}`}>
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          {c.status !== "PENDING" && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-500 font-bold"
                              disabled={updateTeamPayment.isPending}
                              onClick={() => setTeamPay(c.teamId, c.slot, "PENDING")}
                              data-testid={`button-team-pay-pending-${c.teamId}-${c.slot}`}>
                              <Clock className="h-3 w-3" />
                            </Button>
                          )}
                          {c.status !== "UNPAID" && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-red-500/30 text-red-500 font-bold"
                              disabled={updateTeamPayment.isPending}
                              onClick={() => setTeamPay(c.teamId, c.slot, "UNPAID")}
                              data-testid={`button-team-pay-unpaid-${c.teamId}-${c.slot}`}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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

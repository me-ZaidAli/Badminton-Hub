import { useTournaments, useCreateTournament, useDeleteTournament, useUpdateTournament } from "@/hooks/use-tournaments";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useMyTournamentClubs } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trophy, Calendar, MapPin, Building2, Loader2, Trash2, Eye, Play, CheckCircle, Users, Swords, ChevronRight, Flame, Zap, Crown } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import tournamentHeroImg from "@assets/tournament-hero.png";

const createTournamentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clubId: z.coerce.number().min(1, "Select a club"),
  type: z.enum(["CLUB", "OPEN", "LEAGUE", "FRIENDLY"]),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  description: z.string().optional(),
  courtsAvailable: z.coerce.number().min(1).default(4),
  maxPlayers: z.coerce.number().optional(),
  location: z.string().optional(),
  entryFee: z.string().optional(),
  logoUrl: z
    .string()
    .max(500, "Logo URL too long")
    .refine((v) => !v || /^https?:\/\//i.test(v), "Logo URL must start with http:// or https://")
    .optional()
    .or(z.literal("")),
});

const statusConfig: Record<string, { label: string; color: string; glow: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", glow: "" },
  PUBLISHED: { label: "Registration Open", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", glow: "shadow-amber-500/10" },
  ONGOING: { label: "🔴 LIVE", color: "bg-red-500/20 text-red-400 border-red-500/30", glow: "shadow-red-500/20" },
  COMPLETED: { label: "Completed", color: "bg-gray-500/20 text-gray-500 border-gray-500/20", glow: "" },
};

const typeConfig: Record<string, { emoji: string; label: string; color: string }> = {
  CLUB: { emoji: "🏸", label: "Club", color: "text-violet-400" },
  OPEN: { emoji: "🌍", label: "Open", color: "text-blue-400" },
  LEAGUE: { emoji: "🏆", label: "League", color: "text-amber-400" },
  FRIENDLY: { emoji: "🤝", label: "Friendly", color: "text-emerald-400" },
};

export default function Tournaments() {
  const { data: user } = useUser();
  const { data: tournaments, isLoading } = useTournaments();
  const { data: clubs } = useClubs();
  const { data: tournamentClubs } = useMyTournamentClubs(!!user);
  const createMutation = useCreateTournament();
  const deleteMutation = useDeleteTournament();
  const updateMutation = useUpdateTournament();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>("all");

  const isSuperAdmin = user?.role === "OWNER";
  const canManage = isSuperAdmin || (tournamentClubs && tournamentClubs.length > 0);
  const managedClubIds = new Set(tournamentClubs?.map(c => c.id) || []);

  const form = useForm<z.infer<typeof createTournamentSchema>>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: { name: "", type: "CLUB", startDate: "", endDate: "", description: "", courtsAvailable: 4, logoUrl: "" },
  });

  const availableClubs = isSuperAdmin ? clubs : clubs?.filter(c => managedClubIds.has(c.id));
  const filteredTournaments = selectedClubFilter === "all" ? tournaments : tournaments?.filter(t => t.clubId === Number(selectedClubFilter));

  // Treat any tournament whose end date is before today (after 12:00 AM the next day) as past,
  // even if its status is still PUBLISHED or ONGOING. Status COMPLETED/CANCELLED also counts as past.
  const startOfToday = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const isTournamentPast = (t: any): boolean => {
    if (t.status === "COMPLETED" || t.status === "CANCELLED") return true;
    if (!t.endDate) return false;
    return new Date(t.endDate) < startOfToday;
  };

  const liveTournaments = filteredTournaments?.filter(t => t.status === "ONGOING" && !isTournamentPast(t)) || [];
  const upcomingTournaments = filteredTournaments?.filter(t => (t.status === "PUBLISHED" || t.status === "DRAFT") && !isTournamentPast(t)) || [];
  const pastTournaments = filteredTournaments?.filter(t => isTournamentPast(t)) || [];

  async function onSubmit(values: z.infer<typeof createTournamentSchema>) {
    try {
      const created = await createMutation.mutateAsync({
        ...values,
        startDate: new Date(values.startDate + "T00:00:00").toISOString(),
        endDate: new Date(values.endDate + "T23:59:59").toISOString(),
      });
      toast({
        title: "Tournament Created",
        description: "Next: add categories, teams and generate matches.",
      });
      setCreateOpen(false);
      form.reset();
      if (created?.id) {
        setLocation(`/tournaments/${created.id}`);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Tournament Deleted" });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await updateMutation.mutateAsync({ id, status });
      toast({ title: "Status Updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function getClubName(clubId: number) {
    return clubs?.find(c => c.id === clubId)?.name || "Unknown Club";
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl min-h-[280px] sm:min-h-[320px]">
        <img src={tournamentHeroImg} alt="Tournament" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/40 via-transparent to-purple-900/40" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-amber-500 to-rose-500" />

        <div className="relative p-6 sm:p-8 flex flex-col justify-end h-full min-h-[280px] sm:min-h-[320px]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <Badge className="bg-violet-500/30 text-violet-200 border-violet-400/30 text-[10px] uppercase tracking-wider font-bold">
                  <Flame className="h-3 w-3 mr-1" />Tournament Arena
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-lg" data-testid="text-page-title">
                Tournaments
              </h1>
              <p className="text-sm sm:text-base text-gray-300 max-w-md">
                Compete in epic battles, climb the ranks, and prove you're the champion.
              </p>
              {filteredTournaments && filteredTournaments.length > 0 && (
                <div className="flex items-center gap-4 mt-4">
                  {[
                    { icon: Zap, label: "Live", value: liveTournaments.length, color: "text-red-400" },
                    { icon: Calendar, label: "Upcoming", value: upcomingTournaments.length, color: "text-amber-400" },
                    { icon: Crown, label: "Completed", value: pastTournaments.length, color: "text-emerald-400" },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                      <span className="text-sm font-bold text-white">{stat.value}</span>
                      <span className="text-xs text-gray-400">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/tournaments-leaderboard">
                <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white" data-testid="button-leaderboard">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
              {canManage && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25 border-0 font-bold" data-testid="button-create-tournament">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Tournament</DialogTitle>
                    <DialogDescription>Set up a new tournament for your club.</DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Tournament Name</FormLabel><FormControl><Input data-testid="input-tournament-name" placeholder="Spring Championship 2026" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="clubId" render={({ field }) => (
                        <FormItem><FormLabel>Club</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl><SelectTrigger data-testid="select-tournament-club"><SelectValue placeholder="Select club" /></SelectTrigger></FormControl>
                            <SelectContent>{availableClubs?.map(club => (<SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>))}</SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-tournament-type"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="CLUB">Club Internal</SelectItem>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="LEAGUE">League</SelectItem>
                              <SelectItem value="FRIENDLY">Friendly</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input data-testid="input-start-date" type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem><FormLabel>End Date</FormLabel><FormControl><Input data-testid="input-end-date" type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="courtsAvailable" render={({ field }) => (
                          <FormItem><FormLabel>Courts</FormLabel><FormControl><Input data-testid="input-courts" type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="maxPlayers" render={({ field }) => (
                          <FormItem><FormLabel>Max Players</FormLabel><FormControl><Input type="number" min={2} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="Venue address..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="logoUrl" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tournament Logo URL (optional)</FormLabel>
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/logo.png"
                                  data-testid="input-tournament-logo-url"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">Paste a public image URL (PNG, JPG, SVG, or WebP). Square images work best.</p>
                              <FormMessage />
                            </div>
                            {field.value && /^https?:\/\//i.test(field.value) && (
                              <div className="h-14 w-14 rounded-xl border border-border/60 bg-card overflow-hidden flex-shrink-0" data-testid="preview-tournament-logo">
                                <img src={field.value} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                              </div>
                            )}
                          </div>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea data-testid="input-description" placeholder="Tournament details..." {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="submit" data-testid="button-submit-tournament" disabled={createMutation.isPending} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Create Tournament
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      {(isSuperAdmin || (clubs && clubs.length > 1)) && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClubFilter} onValueChange={setSelectedClubFilter}>
            <SelectTrigger className="w-48" data-testid="select-club-filter"><SelectValue placeholder="Filter by club" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs?.map(club => (<SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading tournaments...</p>
          </div>
        </div>
      ) : !filteredTournaments?.length ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Tournaments Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {liveTournaments.length > 0 && (
            <TournamentSection title="🔴 Live Now" tournaments={liveTournaments} getClubName={getClubName} canManage={canManage} isSuperAdmin={isSuperAdmin} managedClubIds={managedClubIds} onStatusChange={handleStatusChange} onDelete={setDeleteId} accent="red" />
          )}
          {upcomingTournaments.length > 0 && (
            <TournamentSection title="⚡ Upcoming" tournaments={upcomingTournaments} getClubName={getClubName} canManage={canManage} isSuperAdmin={isSuperAdmin} managedClubIds={managedClubIds} onStatusChange={handleStatusChange} onDelete={setDeleteId} accent="amber" />
          )}
          {pastTournaments.length > 0 && (
            <TournamentSection title="🏆 Completed" tournaments={pastTournaments} getClubName={getClubName} canManage={canManage} isSuperAdmin={isSuperAdmin} managedClubIds={managedClubIds} onStatusChange={handleStatusChange} onDelete={setDeleteId} accent="gray" />
          )}
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>This will permanently delete this tournament and all data.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" data-testid="button-confirm-delete" disabled={deleteMutation.isPending}
              onClick={() => deleteId && handleDelete(deleteId)}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TournamentSection({ title, tournaments, getClubName, canManage, isSuperAdmin, managedClubIds, onStatusChange, onDelete, accent }: {
  title: string; tournaments: any[]; getClubName: (id: number) => string; canManage: boolean; isSuperAdmin: boolean; managedClubIds: Set<number>; onStatusChange: (id: number, s: string) => void; onDelete: (id: number) => void; accent: string;
}) {
  const accentMap: Record<string, string> = {
    red: "border-l-red-500",
    amber: "border-l-amber-500",
    gray: "border-l-gray-500",
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-wider text-foreground">{title}</h2>
      <div className="space-y-2">
        {tournaments.map(tournament => {
          const sc = statusConfig[tournament.status] || statusConfig.DRAFT;
          const tc = typeConfig[tournament.type] || typeConfig.CLUB;
          return (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
              <div
                className={cn(
                  "group relative rounded-xl border border-border/50 bg-card overflow-hidden transition-all duration-300 border-l-4",
                  accentMap[accent],
                  "hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5",
                  tournament.status === "ONGOING" && "ring-1 ring-red-500/20"
                )}
                data-testid={`card-tournament-${tournament.id}`}
              >
                <div className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="hidden sm:flex h-14 w-14 rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 dark:from-violet-500/30 dark:to-purple-500/30 items-center justify-center flex-shrink-0 border border-violet-500/20 overflow-hidden" data-testid={`logo-tournament-${tournament.id}`}>
                    {(tournament as any).logoUrl ? (
                      <img
                        src={(tournament as any).logoUrl}
                        alt={`${tournament.name} logo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          const parent = img.parentElement;
                          img.remove();
                          if (parent) {
                            const span = document.createElement("span");
                            span.className = "text-2xl";
                            span.textContent = tc.emoji;
                            parent.appendChild(span);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-2xl">{tc.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-base text-foreground truncate group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" data-testid={`text-tournament-name-${tournament.id}`}>
                        {tournament.name}
                      </h3>
                      <Badge className={cn("text-[10px] px-2 py-0.5 border font-bold", sc.color)} data-testid={`badge-status-${tournament.id}`}>
                        {tournament.status === "ONGOING" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />}
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{getClubName(tournament.clubId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(tournament.startDate), "d MMM")} – {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
                      {tournament.location && <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="h-3 w-3" /><span className="truncate max-w-[120px]">{tournament.location}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      {tournament.courtsAvailable && <span className="flex items-center gap-1"><Swords className="h-3 w-3" />{tournament.courtsAvailable} courts</span>}
                      {tournament.maxPlayers && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tournament.maxPlayers} max</span>}
                    </div>
                    {canManage && (isSuperAdmin || managedClubIds.has(tournament.clubId)) && (
                      <div className="flex items-center gap-1">
                        {tournament.status === "DRAFT" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(tournament.id, "PUBLISHED"); }}>
                            <Eye className="h-3 w-3 mr-1" />Publish
                          </Button>
                        )}
                        {tournament.status === "PUBLISHED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(tournament.id, "ONGOING"); }}>
                            <Play className="h-3 w-3 mr-1" />Start
                          </Button>
                        )}
                        {tournament.status === "ONGOING" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(tournament.id, "COMPLETED"); }}>
                            <CheckCircle className="h-3 w-3 mr-1" />End
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(tournament.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-amber-500 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

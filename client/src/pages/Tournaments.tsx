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
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trophy, Calendar, MapPin, Building2, Loader2, Trash2, Eye, Play, CheckCircle, Users, Swords, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
});

const statusConfig: Record<string, { label: string; color: string; glow: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", glow: "" },
  PUBLISHED: { label: "Open", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", glow: "shadow-blue-500/10" },
  ONGOING: { label: "Live", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", glow: "shadow-emerald-500/20" },
  COMPLETED: { label: "Ended", color: "bg-gray-500/20 text-gray-500 border-gray-500/20", glow: "" },
};

const typeIcons: Record<string, string> = { CLUB: "🏸", OPEN: "🌍", LEAGUE: "🏆", FRIENDLY: "🤝" };

export default function Tournaments() {
  const { data: user } = useUser();
  const { data: tournaments, isLoading } = useTournaments();
  const { data: clubs } = useClubs();
  const { data: tournamentClubs } = useMyTournamentClubs(!!user);
  const createMutation = useCreateTournament();
  const deleteMutation = useDeleteTournament();
  const updateMutation = useUpdateTournament();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>("all");

  const isSuperAdmin = user?.role === "OWNER";
  const canManage = isSuperAdmin || (tournamentClubs && tournamentClubs.length > 0);
  const managedClubIds = new Set(tournamentClubs?.map(c => c.id) || []);

  const form = useForm<z.infer<typeof createTournamentSchema>>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: { name: "", type: "CLUB", startDate: "", endDate: "", description: "", courtsAvailable: 4 },
  });

  const availableClubs = isSuperAdmin ? clubs : clubs?.filter(c => managedClubIds.has(c.id));
  const filteredTournaments = selectedClubFilter === "all" ? tournaments : tournaments?.filter(t => t.clubId === Number(selectedClubFilter));

  async function onSubmit(values: z.infer<typeof createTournamentSchema>) {
    try {
      await createMutation.mutateAsync({
        ...values,
        startDate: new Date(values.startDate + "T00:00:00").toISOString(),
        endDate: new Date(values.endDate + "T23:59:59").toISOString(),
      });
      toast({ title: "Tournament Created" });
      setCreateOpen(false);
      form.reset();
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-indigo-600/20 dark:from-violet-600/30 dark:via-purple-900/20 dark:to-indigo-900/30 border border-border/50 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight" data-testid="text-page-title">Tournaments</h1>
                <p className="text-sm text-muted-foreground">Compete, rank up, and prove your skills</p>
              </div>
            </div>
          </div>
          {canManage && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 border-0" data-testid="button-create-tournament">
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
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea data-testid="input-description" placeholder="Tournament details..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-tournament" disabled={createMutation.isPending} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
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
            <Loader2 className="h-10 w-10 animate-spin text-violet-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading tournaments...</p>
          </div>
        </div>
      ) : !filteredTournaments?.length ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No Tournaments Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first tournament to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map(tournament => {
            const sc = statusConfig[tournament.status] || statusConfig.DRAFT;
            return (
              <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
                <div
                  className={cn(
                    "group relative rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-300",
                    "hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-0.5",
                    tournament.status === "ONGOING" && "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                  )}
                  data-testid={`card-tournament-${tournament.id}`}
                >
                  <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{typeIcons[tournament.type] || "🏸"}</span>
                        <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" data-testid={`text-tournament-name-${tournament.id}`}>
                          {tournament.name}
                        </h3>
                      </div>
                      <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold", sc.color)} data-testid={`badge-status-${tournament.id}`}>
                        {tournament.status === "ONGOING" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
                        {sc.label}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-violet-500/70" />
                        <span>{getClubName(tournament.clubId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-violet-500/70" />
                        <span>{format(new Date(tournament.startDate), "d MMM")} – {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
                      </div>
                      {tournament.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-violet-500/70" />
                          <span className="truncate">{tournament.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {tournament.courtsAvailable && (
                          <span className="flex items-center gap-1"><Swords className="h-3 w-3" />{tournament.courtsAvailable} courts</span>
                        )}
                        {tournament.maxPlayers && (
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tournament.maxPlayers} max</span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </div>

                  {canManage && (isSuperAdmin || managedClubIds.has(tournament.clubId)) && (
                    <div className="px-5 pb-4 flex items-center gap-1.5 flex-wrap">
                      {tournament.status === "DRAFT" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10" data-testid={`button-publish-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "PUBLISHED"); }}>
                          <Eye className="h-3 w-3 mr-1" /> Publish
                        </Button>
                      )}
                      {tournament.status === "PUBLISHED" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" data-testid={`button-start-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "ONGOING"); }}>
                          <Play className="h-3 w-3 mr-1" /> Start
                        </Button>
                      )}
                      {tournament.status === "ONGOING" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`button-complete-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "COMPLETED"); }}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" data-testid={`button-delete-${tournament.id}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(tournament.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
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

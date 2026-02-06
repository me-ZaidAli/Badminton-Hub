import { useTournaments, useCreateTournament, useDeleteTournament, useUpdateTournament } from "@/hooks/use-tournaments";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useMySessionClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trophy, Calendar, MapPin, Building2, Loader2, Trash2, Eye, Play, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const createTournamentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clubId: z.coerce.number().min(1, "Select a club"),
  type: z.enum(["CLUB", "OPEN", "LEAGUE", "FRIENDLY"]),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  description: z.string().optional(),
  courtsAvailable: z.coerce.number().min(1).default(4),
});

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  ONGOING: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const typeLabels: Record<string, string> = {
  CLUB: "Club",
  OPEN: "Open",
  LEAGUE: "League",
  FRIENDLY: "Friendly",
};

export default function Tournaments() {
  const { data: user } = useUser();
  const { data: tournaments, isLoading } = useTournaments();
  const { data: clubs } = useClubs();
  const { data: sessionClubs } = useMySessionClubs(!!user);
  const createMutation = useCreateTournament();
  const deleteMutation = useDeleteTournament();
  const updateMutation = useUpdateTournament();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedClubFilter, setSelectedClubFilter] = useState<string>("all");

  const isSuperAdmin = user?.role === "OWNER";
  const canManage = isSuperAdmin || (sessionClubs && sessionClubs.length > 0);
  const managedClubIds = new Set(sessionClubs?.map(c => c.id) || []);

  const form = useForm<z.infer<typeof createTournamentSchema>>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: "",
      type: "CLUB",
      startDate: "",
      endDate: "",
      description: "",
      courtsAvailable: 4,
    },
  });

  const availableClubs = isSuperAdmin ? clubs : clubs?.filter(c => managedClubIds.has(c.id));

  const filteredTournaments = selectedClubFilter === "all"
    ? tournaments
    : tournaments?.filter(t => t.clubId === Number(selectedClubFilter));

  async function onSubmit(values: z.infer<typeof createTournamentSchema>) {
    try {
      await createMutation.mutateAsync({
        ...values,
        startDate: new Date(values.startDate + "T00:00:00").toISOString(),
        endDate: new Date(values.endDate + "T23:59:59").toISOString(),
      });
      toast({ title: "Tournament Created", description: "Your new tournament has been created." });
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
      toast({ title: "Status Updated", description: `Tournament status changed to ${status.toLowerCase()}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  function getClubName(clubId: number) {
    return clubs?.find(c => c.id === clubId)?.name || "Unknown Club";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments"
        description="Manage and view badminton tournaments"
        action={
          canManage ? (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-tournament">
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
                      <FormItem>
                        <FormLabel>Tournament Name</FormLabel>
                        <FormControl><Input data-testid="input-tournament-name" placeholder="Spring Championship 2026" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="clubId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl><SelectTrigger data-testid="select-tournament-club"><SelectValue placeholder="Select club" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {availableClubs?.map(club => (
                              <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tournament Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-tournament-type"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="CLUB">Club Internal</SelectItem>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="LEAGUE">League</SelectItem>
                            <SelectItem value="FRIENDLY">Friendly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl><Input data-testid="input-start-date" type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl><Input data-testid="input-end-date" type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="courtsAvailable" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Courts Available</FormLabel>
                        <FormControl><Input data-testid="input-courts" type="number" min={1} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl><Textarea data-testid="input-description" placeholder="Tournament details..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-tournament" disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Tournament
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {(isSuperAdmin || (clubs && clubs.length > 1)) && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClubFilter} onValueChange={setSelectedClubFilter}>
            <SelectTrigger className="w-48" data-testid="select-club-filter">
              <SelectValue placeholder="Filter by club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs?.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !filteredTournaments?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No tournaments found</p>
            {canManage && <p className="text-muted-foreground text-sm mt-1">Create your first tournament to get started.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map(tournament => (
            <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-tournament-${tournament.id}`}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base leading-tight" data-testid={`text-tournament-name-${tournament.id}`}>{tournament.name}</h3>
                    <Badge className={statusColors[tournament.status] || ""} data-testid={`badge-status-${tournament.id}`}>
                      {tournament.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{getClubName(tournament.clubId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(tournament.startDate), "d MMM yyyy")} - {format(new Date(tournament.endDate), "d MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5" />
                      <span>{typeLabels[tournament.type] || tournament.type}</span>
                    </div>
                  </div>

                  {canManage && (isSuperAdmin || managedClubIds.has(tournament.clubId)) && (
                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {tournament.status === "DRAFT" && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-publish-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "PUBLISHED"); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      {tournament.status === "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-start-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "ONGOING"); }}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Start
                        </Button>
                      )}
                      {tournament.status === "ONGOING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-complete-${tournament.id}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(tournament.id, "COMPLETED"); }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        data-testid={`button-delete-${tournament.id}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(tournament.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>This will permanently delete this tournament, all its categories, teams, and match results. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

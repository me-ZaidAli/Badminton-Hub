import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSessionSchema } from "@shared/schema";
import { Plus, Users, MapPin, Calendar, PoundSterling, CircleDot, Building2, Filter, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "A", label: "Category A (Advanced)" },
  { value: "B", label: "Category B (Intermediate+)" },
  { value: "C", label: "Category C (Intermediate)" },
  { value: "D", label: "Category D (Beginner)" },
] as const;

// Helper for schema refinement if needed, usually direct import works
const createSessionSchema = insertSessionSchema.extend({
  date: z.coerce.date(), // ensure string dates are coerced
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:MM format"),
});

export default function Sessions() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();
  const { data: clubs } = useClubs();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const isOrganiser = ["OWNER", "ADMIN", "ORGANISER"].includes(user?.role || "");
  const isSuperUser = user?.role === "OWNER";

  const bulkDeleteMutation = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      await apiRequest("DELETE", "/api/sessions", { sessionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Sessions Deleted", description: `${selectedIds.size} sessions deleted.` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter sessions by selected club for super users
  const filteredSessions = selectedClubId === "all" 
    ? sessions 
    : sessions?.filter(s => s.clubId === Number(selectedClubId));

  // Group sessions by club for super user view
  const sessionsByClub = sessions?.reduce((acc, session) => {
    const clubId = session.clubId;
    if (!acc[clubId]) acc[clubId] = [];
    acc[clubId].push(session);
    return acc;
  }, {} as Record<number, typeof sessions>);

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredSessions) return;
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Sessions" 
        description="Book your spot for upcoming games."
        action={isOrganiser && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/calendar")}
              data-testid="button-import-from-calendar"
            >
              <Calendar className="h-4 w-4 mr-2" /> Import from Calendar
            </Button>
            <CreateSessionDialog />
          </div>
        )}
      />

      {isSuperUser && clubs && clubs.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <label className="text-sm font-medium">Filter by Club:</label>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-[250px]" data-testid="select-club-filter">
              <SelectValue placeholder="All Clubs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubs.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Showing {filteredSessions?.length || 0} sessions
          </span>
        </div>
      )}

      {isOrganiser && filteredSessions && filteredSessions.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filteredSessions.length > 0 && selectedIds.size === filteredSessions.length}
              onCheckedChange={toggleSelectAll}
              data-testid="checkbox-select-all-sessions"
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                data-testid="button-bulk-delete-sessions"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1,2,3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />)}
        
        {filteredSessions?.map((session) => (
          <div key={session.id} className="relative">
            {isOrganiser && (
              <div
                className="absolute top-4 left-4 z-10"
                onClick={(e) => toggleSelect(session.id, e)}
              >
                <Checkbox
                  checked={selectedIds.has(session.id)}
                  onCheckedChange={() => {}}
                  data-testid={`checkbox-session-${session.id}`}
                />
              </div>
            )}
            <Link href={`/sessions/${session.id}`}>
              <Card className={`h-full cursor-pointer border-border/50 group overflow-visible ${selectedIds.has(session.id) ? "ring-2 ring-primary" : ""}`}>
                <div className="h-2 bg-gradient-to-r from-primary to-secondary rounded-t-md" />
                <CardContent className="p-6">
                  <div className={`flex justify-between items-start mb-4 ${isOrganiser ? "pl-8" : ""}`}>
                    <Badge variant={session.matchMode === "COMPETITIVE" ? "destructive" : "secondary"}>
                      {session.matchMode}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {session.startTime}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {session.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{session.signupCount || 0} / {session.maxPlayers} Players</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{session.courtsAvailable} Courts Available</span>
                    </div>
                    {session.venue && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{session.venue.name}{session.venue.city ? `, ${session.venue.city}` : ''}</span>
                      </div>
                    )}
                    {session.sessionFee != null && (
                      <div className="flex items-center gap-2">
                        <PoundSterling className="h-4 w-4" />
                        <span>£{(session.sessionFee / 100).toFixed(2)} per session</span>
                      </div>
                    )}
                    {session.shuttlecockType && (
                      <div className="flex items-center gap-2">
                        <CircleDot className="h-4 w-4" />
                        <span>{session.shuttlecockType === 'feather' ? 'Feather' : session.shuttlecockType === 'plastic' ? 'Plastic' : 'Feather & Plastic'} shuttlecocks</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <span className="font-bold text-lg">
                      {format(new Date(session.date), "EEE, MMM d")}
                    </span>
                    <Button size="sm" variant="outline">
                      Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sessions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected sessions? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete {selectedIds.size} Sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateSessionDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateSession();
  
  const form = useForm<z.infer<typeof createSessionSchema>>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: "",
      startTime: "18:00",
      maxPlayers: 24,
      courtsAvailable: 4,
      matchMode: "SOCIAL",
      isPrivate: false,
      durationMinutes: 120,
      allowedCategories: ["A", "B", "C", "D"],
      sessionFee: undefined,
      shuttlecockType: undefined,
    }
  });

  function onSubmit(values: z.infer<typeof createSessionSchema>) {
    create(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Friday Night Social" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courtsAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courts</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="matchMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SOCIAL">Social (Mixed)</SelectItem>
                      <SelectItem value="COMPETITIVE">Competitive (Ranked)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Allowed Categories</FormLabel>
                  <FormDescription>
                    Select which player categories can join this session.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {CATEGORIES.map((category) => (
                      <FormField
                        key={category.value}
                        control={form.control}
                        name="allowedCategories"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(category.value)}
                                onCheckedChange={(checked) => {
                                  const currentValue = (field.value || []) as string[];
                                  if (checked) {
                                    field.onChange([...currentValue, category.value]);
                                  } else {
                                    field.onChange(currentValue.filter(v => v !== category.value));
                                  }
                                }}
                                data-testid={`checkbox-category-${category.value}`}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {category.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Fee (£)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="e.g. 5.00" 
                        {...field}
                        value={field.value != null ? field.value / 100 : ""}
                        onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                        data-testid="input-session-fee"
                      />
                    </FormControl>
                    <FormDescription>Leave empty to use club default</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shuttlecockType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shuttlecock Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shuttlecock-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="feather">Feather</SelectItem>
                        <SelectItem value="plastic">Plastic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-create-session">
              {isPending ? "Creating..." : "Create Session"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

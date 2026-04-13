import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Users, Plus, MapPin, Calendar, Loader2, Clock, ArrowLeft, UserPlus,
  Search, X, Edit, PoundSterling, Shirt, Car, Phone, User
} from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  SOCIAL: "from-pink-500 to-rose-600",
  MATCH: "from-blue-500 to-indigo-600",
  TOURNAMENT_PREP: "from-emerald-500 to-teal-600",
  TRAINING: "from-amber-500 to-orange-600",
  FUNDRAISER: "from-purple-500 to-violet-600",
  OTHER: "from-slate-500 to-gray-600",
};

export default function CommunityTeamEventDetail() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/community/team-event/:id");
  const eventId = Number(params?.id);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: adminClubs } = useMyAdminClubs(!!user);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/team-events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/team-events/${eventId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!eventId,
  });

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" ||
    (adminClubs && adminClubs.some((c: any) => c.id === event?.clubId));

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/team-events/${eventId}/signup`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events", eventId] });
      toast({ title: "Joined!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/team-events/${eventId}/signup`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events", eventId] });
      toast({ title: "Left event" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-muted-foreground">Event not found</div>;
  }

  const confirmed = (event.signups || []).filter((s: any) => s.status === "CONFIRMED");
  const gradient = EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.OTHER;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className={`relative h-52 sm:h-64 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <button
          className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-full p-2 text-white"
          onClick={() => navigate("/community")}
          data-testid="btn-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {isAdmin && (
          <button
            className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-2 text-white"
            onClick={() => setShowEdit(true)}
            data-testid="btn-edit"
          >
            <Edit className="h-5 w-5" />
          </button>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="text-[10px] bg-white/20 backdrop-blur-sm border-0 text-white">
              {event.eventType}
            </Badge>
            <Badge className={`text-[10px] backdrop-blur-sm border-0 text-white ${event.status === "UPCOMING" ? "bg-green-500/80" : event.status === "COMPLETED" ? "bg-gray-500/80" : event.status === "CANCELLED" ? "bg-red-500/80" : "bg-yellow-500/80"}`}>
              {event.status}
            </Badge>
          </div>
          <h1 className="text-white font-bold text-xl sm:text-2xl">{event.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-white/70" />
              <span className="text-white text-sm">{event.signupCount} / {event.maxParticipants}</span>
            </div>
            {event.date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-white/70" />
                <span className="text-white text-sm">{format(new Date(event.date), "EEE, d MMM")} · {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-white/70" />
                <span className="text-white text-sm">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 relative z-10">
        <Card className="rounded-2xl shadow-lg border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {confirmed.slice(0, 8).map((p: any) => (
                  <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-[10px]">{getInitials(p.userName || "?")}</AvatarFallback>
                  </Avatar>
                ))}
                {confirmed.length > 8 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[10px] font-medium">+{confirmed.length - 8}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {event.isSignedUp ? (
                  <Button size="sm" variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending} data-testid="btn-leave">
                    Leave
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="btn-join">
                    {joinMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Join
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="people" className="flex-1 text-xs" data-testid="tab-people">People</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {event.description && (
              <Card className="rounded-xl border-border/40">
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                </CardContent>
              </Card>
            )}
            <Card className="rounded-xl border-border/40">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Details</h3>
                {event.date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(event.date), "EEEE, d MMMM yyyy")} · {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {event.durationMinutes} minutes
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {event.signupCount} / {event.maxParticipants} participants
                </div>
                {event.fee > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    £{(event.fee / 100).toFixed(2)}
                  </div>
                )}
                {event.meetingPoint && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Meeting: {event.meetingPoint}
                  </div>
                )}
                {event.transportInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {event.transportInfo}
                  </div>
                )}
                {event.dressCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shirt className="h-4 w-4 text-muted-foreground" />
                    {event.dressCode}
                  </div>
                )}
                {event.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {event.contactPerson}{event.contactPhone ? ` · ${event.contactPhone}` : ""}
                  </div>
                )}
                {event.notes && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                    <p className="text-sm">{event.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Created by {event.creatorName}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people" className="mt-4 space-y-4">
            {isAdmin && (
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{confirmed.length} Participant{confirmed.length !== 1 ? "s" : ""}</h3>
                <Button size="sm" onClick={() => setShowAddUser(true)} data-testid="btn-add-user">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Members
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {confirmed.map((p: any) => (
                <Card key={p.id} className="rounded-xl border-border/40" data-testid={`participant-${p.id}`}>
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Avatar className="h-14 w-14 mb-2">
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">{getInitials(p.userName || "?")}</AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm truncate w-full">{p.userName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {confirmed.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No participants yet. Be the first to join!</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isAdmin && event && (
        <EditTeamEventDialog
          open={showEdit}
          onOpenChange={setShowEdit}
          event={event}
          eventId={eventId}
        />
      )}

      {isAdmin && event && (
        <AddTeamMembersDialog
          open={showAddUser}
          onOpenChange={setShowAddUser}
          clubId={event.clubId}
          eventId={eventId}
          existingUserIds={confirmed.map((p: any) => p.userId)}
        />
      )}
    </div>
  );
}

function EditTeamEventDialog({ open, onOpenChange, event, eventId }: {
  open: boolean; onOpenChange: (v: boolean) => void; event: any; eventId: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: event.title || "",
    description: event.description || "",
    location: event.location || "",
    date: event.date ? format(new Date(event.date), "yyyy-MM-dd") : "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    durationMinutes: String(event.durationMinutes || 120),
    maxParticipants: String(event.maxParticipants || 20),
    eventType: event.eventType || "SOCIAL",
    status: event.status || "UPCOMING",
    meetingPoint: event.meetingPoint || "",
    transportInfo: event.transportInfo || "",
    dressCode: event.dressCode || "",
    equipmentRequired: event.equipmentRequired || "",
    contactPerson: event.contactPerson || "",
    contactPhone: event.contactPhone || "",
    fee: String(event.fee || 0),
    notes: event.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/team-events/${eventId}`, {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        date: form.date || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        durationMinutes: Number(form.durationMinutes) || 120,
        maxParticipants: Number(form.maxParticipants) || 20,
        eventType: form.eventType,
        status: form.status,
        meetingPoint: form.meetingPoint || undefined,
        transportInfo: form.transportInfo || undefined,
        dressCode: form.dressCode || undefined,
        equipmentRequired: form.equipmentRequired || undefined,
        contactPerson: form.contactPerson || undefined,
        contactPhone: form.contactPhone || undefined,
        fee: Number(form.fee) || 0,
        notes: form.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-events"] });
      onOpenChange(false);
      toast({ title: "Event Updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Event</DialogTitle>
          <DialogDescription>Update event details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="input-edit-title" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} data-testid="input-edit-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.eventType} onValueChange={v => setForm(p => ({ ...p, eventType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="MATCH">Match</SelectItem>
                  <SelectItem value="TOURNAMENT_PREP">Tournament Prep</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="FUNDRAISER">Fundraiser</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} data-testid="input-edit-date" />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} data-testid="input-edit-time" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} data-testid="input-edit-location" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Max Participants</Label>
              <Input type="number" value={form.maxParticipants} onChange={e => setForm(p => ({ ...p, maxParticipants: e.target.value }))} />
            </div>
            <div>
              <Label>Fee (pence)</Label>
              <Input type="number" value={form.fee} onChange={e => setForm(p => ({ ...p, fee: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Meeting Point</Label>
            <Input value={form.meetingPoint} onChange={e => setForm(p => ({ ...p, meetingPoint: e.target.value }))} />
          </div>
          <div>
            <Label>Dress Code</Label>
            <Input value={form.dressCode} onChange={e => setForm(p => ({ ...p, dressCode: e.target.value }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || mutation.isPending} data-testid="btn-save-edit">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTeamMembersDialog({ open, onOpenChange, clubId, eventId, existingUserIds }: {
  open: boolean; onOpenChange: (v: boolean) => void; clubId: number; eventId: number; existingUserIds: number[];
}) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open && !!clubId,
  });

  const addMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/team-events/${eventId}/signup`, { userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-events", eventId] });
      toast({ title: "Member Added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const available = members.filter((m: any) => {
    const userId = m.userId;
    if (!userId || existingUserIds.includes(userId)) return false;
    if (!search) return true;
    const name = (m.user?.fullName || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Members</DialogTitle>
          <DialogDescription>Select club members to add to this event</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-9" data-testid="input-search-members" />
        </div>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {members.length === 0 ? "No club members found" : "All members already added"}
            </p>
          ) : (
            available.map((m: any) => {
              const userId = m.userId;
              const name = m.user?.fullName || "Unknown";
              return (
                <div key={userId} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{name}</p>
                      {m.grade && <p className="text-[10px] text-muted-foreground">Grade: {m.grade}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addMutation.mutate(userId)} disabled={addMutation.isPending} data-testid={`btn-add-member-${userId}`}>
                    {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

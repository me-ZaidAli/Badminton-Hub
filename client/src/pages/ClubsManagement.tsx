import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  MapPin,
  Loader2,
  Trash2,
  Pencil,
  Save,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Club, PlayerProfile, User as UserType } from "@shared/schema";

type MemberWithUser = PlayerProfile & { user: UserType };
type ClubWithStatus = Club & { status: string };

type SessionData = {
  id: number;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxPlayers: number;
  courtsAvailable: number;
  matchMode: string;
  status: string | null;
  signupCount?: number;
  clubId: number;
  isPrivate: boolean;
};

type VenueData = {
  id: number;
  name: string;
  address: string;
  city: string | null;
  postcode: string | null;
  courtNames: string[] | null;
  isDefault: boolean;
};

export default function ClubsManagement() {
  const { toast } = useToast();
  const [selectedClub, setSelectedClub] = useState<ClubWithStatus | null>(null);
  const [activeTab, setActiveTab] = useState("members");
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SessionData>>({});

  const { data: clubs, isLoading: clubsLoading } = useQuery<ClubWithStatus[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/clubs", selectedClub?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${selectedClub!.id}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!selectedClub,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionData[]>({
    queryKey: ["/api/public/clubs", selectedClub?.id, "sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/public/clubs/${selectedClub!.id}/sessions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: !!selectedClub,
  });

  const { data: venues, isLoading: venuesLoading } = useQuery<VenueData[]>({
    queryKey: ["/api/clubs", selectedClub?.id, "venues"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${selectedClub!.id}/venues`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch venues");
      return res.json();
    },
    enabled: !!selectedClub,
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: number; updates: { membershipStatus?: string; clubRole?: string } }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${selectedClub!.id}/members/${profileId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", selectedClub?.id, "members"] });
      toast({ title: "Member updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/clubs", selectedClub?.id, "sessions"] });
      toast({ title: "Session deleted successfully" });
      setDeleteSessionId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      await apiRequest("DELETE", "/api/sessions", { sessionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/clubs", selectedClub?.id, "sessions"] });
      toast({ title: "Sessions deleted successfully" });
      setSelectedSessions(new Set());
      setBulkDeleteOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: number; updates: Partial<SessionData> }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${sessionId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/clubs", selectedClub?.id, "sessions"] });
      toast({ title: "Session updated successfully" });
      setEditingSessionId(null);
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectClub = (club: ClubWithStatus) => {
    setSelectedClub(club);
    setActiveTab("members");
    setSelectedSessions(new Set());
  };

  const handleBack = () => {
    setSelectedClub(null);
    setSelectedSessions(new Set());
    setEditingSessionId(null);
  };

  const toggleSessionSelection = (sessionId: number) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!sessions) return;
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map((s) => s.id)));
    }
  };

  const startEditing = (session: SessionData) => {
    setEditingSessionId(session.id);
    setEditForm({
      title: session.title,
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      maxPlayers: session.maxPlayers,
      status: session.status,
    });
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingSessionId === null) return;
    updateSessionMutation.mutate({ sessionId: editingSessionId, updates: editForm });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" data-testid={`badge-status-pending`}>
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" data-testid={`badge-status-approved`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" data-testid={`badge-status-rejected`}>
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (selectedClub) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title={selectedClub.name}
            description={`Manage club details, members, sessions, and venues`}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(selectedClub.status)}
          {selectedClub.city && (
            <Badge variant="outline" data-testid="badge-club-city">
              <MapPin className="w-3 h-3 mr-1" />
              {selectedClub.city}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-club-detail">
            <TabsTrigger value="members" data-testid="tab-members">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="sessions" data-testid="tab-sessions">
              <Calendar className="w-4 h-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="venues" data-testid="tab-venues">
              <MapPin className="w-4 h-4 mr-2" />
              Venues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-members-title">Members</CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !members?.length ? (
                  <p className="text-muted-foreground text-center py-8" data-testid="text-no-members">
                    No members found for this club.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Membership Status</TableHead>
                        <TableHead>Club Role</TableHead>
                        <TableHead>Ranking Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{getInitials(member.user.fullName)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium" data-testid={`text-member-name-${member.id}`}>
                                {member.user.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-member-email-${member.id}`}>
                            {member.user.email}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={member.membershipStatus}
                              onValueChange={(value) =>
                                updateMemberMutation.mutate({ profileId: member.id, updates: { membershipStatus: value } })
                              }
                            >
                              <SelectTrigger className="w-[140px]" data-testid={`select-member-status-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={member.clubRole}
                              onValueChange={(value) =>
                                updateMemberMutation.mutate({ profileId: member.id, updates: { clubRole: value } })
                              }
                            >
                              <SelectTrigger className="w-[140px]" data-testid={`select-member-role-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OWNER">Owner</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="ORGANISER">Organiser</SelectItem>
                                <SelectItem value="COACH">Coach</SelectItem>
                                <SelectItem value="PLAYER">Player</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell data-testid={`text-member-points-${member.id}`}>
                            {member.rankingPoints}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle data-testid="text-sessions-title">Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !sessions?.length ? (
                  <p className="text-muted-foreground text-center py-8" data-testid="text-no-sessions">
                    No sessions found for this club.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={selectedSessions.size === sessions.length && sessions.length > 0}
                              onCheckedChange={toggleSelectAll}
                              data-testid="checkbox-select-all-sessions"
                            />
                          </TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Players</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSessions.has(session.id)}
                                onCheckedChange={() => toggleSessionSelection(session.id)}
                                data-testid={`checkbox-session-${session.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              {editingSessionId === session.id ? (
                                <Input
                                  value={editForm.title || ""}
                                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  data-testid={`input-edit-title-${session.id}`}
                                />
                              ) : (
                                <span className="font-medium" data-testid={`text-session-title-${session.id}`}>
                                  {session.title}
                                </span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-session-date-${session.id}`}>
                              {format(new Date(session.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {editingSessionId === session.id ? (
                                <Input
                                  type="time"
                                  value={editForm.startTime || ""}
                                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                  data-testid={`input-edit-time-${session.id}`}
                                />
                              ) : (
                                <span data-testid={`text-session-time-${session.id}`}>{session.startTime}</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-session-status-${session.id}`}>
                              {editingSessionId === session.id ? (
                                <Select
                                  value={editForm.status || "UPCOMING"}
                                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                                >
                                  <SelectTrigger data-testid={`select-edit-status-${session.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline">{session.status || "UPCOMING"}</Badge>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-session-players-${session.id}`}>
                              {session.signupCount ?? 0} / {session.maxPlayers}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {editingSessionId === session.id ? (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={saveEditing}
                                      disabled={updateSessionMutation.isPending}
                                      data-testid={`button-save-session-${session.id}`}
                                    >
                                      {updateSessionMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Save className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={cancelEditing}
                                      data-testid={`button-cancel-edit-${session.id}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => startEditing(session)}
                                      data-testid={`button-edit-session-${session.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setDeleteSessionId(session.id)}
                                      data-testid={`button-delete-session-${session.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {selectedSessions.size > 0 && (
                      <div
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-md border bg-background p-4 shadow-lg"
                        data-testid="floating-action-bar"
                      >
                        <span className="text-sm font-medium" data-testid="text-selected-count">
                          {selectedSessions.size} session{selectedSessions.size !== 1 ? "s" : ""} selected
                        </span>
                        <Button
                          variant="destructive"
                          onClick={() => setBulkDeleteOpen(true)}
                          data-testid="button-delete-selected"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-venues-title">Venues</CardTitle>
              </CardHeader>
              <CardContent>
                {venuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !venues?.length ? (
                  <p className="text-muted-foreground text-center py-8" data-testid="text-no-venues">
                    No venues found for this club.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Courts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {venues.map((venue) => (
                        <TableRow key={venue.id} data-testid={`row-venue-${venue.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium" data-testid={`text-venue-name-${venue.id}`}>
                                {venue.name}
                              </span>
                              {venue.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-venue-address-${venue.id}`}>{venue.address}</TableCell>
                          <TableCell data-testid={`text-venue-city-${venue.id}`}>{venue.city || "-"}</TableCell>
                          <TableCell data-testid={`text-venue-courts-${venue.id}`}>
                            {venue.courtNames?.length ? (
                              <div className="flex gap-1 flex-wrap">
                                {venue.courtNames.map((court, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {court}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={deleteSessionId !== null} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Session</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this session? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSessionId(null)} data-testid="button-cancel-delete">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteSessionId !== null && deleteSessionMutation.mutate(deleteSessionId)}
                disabled={deleteSessionMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteSessionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Sessions</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedSessions.size} session
                {selectedSessions.size !== 1 ? "s" : ""}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} data-testid="button-cancel-bulk-delete">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedSessions))}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-confirm-bulk-delete"
              >
                {bulkDeleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete {selectedSessions.size} Session{selectedSessions.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs Management"
        description="View and manage all clubs on the platform."
      />

      {clubsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !clubs?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-clubs">
            No clubs found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Card
              key={club.id}
              className="cursor-pointer hover-elevate"
              onClick={() => handleSelectClub(club)}
              data-testid={`card-club-${club.id}`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base" data-testid={`text-club-name-${club.id}`}>
                      {club.name}
                    </CardTitle>
                    {club.city && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-club-city-${club.id}`}>
                        {club.city}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(club.status)}
              </CardHeader>
              <CardContent>
                {club.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-club-description-${club.id}`}>
                    {club.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span data-testid={`text-club-slug-${club.id}`}>/{club.slug}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

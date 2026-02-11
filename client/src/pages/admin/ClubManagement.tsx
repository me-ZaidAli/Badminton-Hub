import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Building2, Users, Settings, Check, X, Loader2, Trash2, Shield, Clock, CheckCircle, XCircle, UserCog, MapPin, ExternalLink, Save, Archive, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Club, PlayerProfile, User as UserType } from "@shared/schema";

type MemberWithUser = PlayerProfile & { user: UserType };
type UserWithProfile = UserType & { playerProfile: PlayerProfile | null };
type ClubWithStatus = Club & { status: string };

interface ClubEditState {
  name: string;
  description: string;
  logoUrl: string;
  address: string;
  city: string;
  postcode: string;
  googleMapsUrl: string;
  isRegisteredWithBE: boolean;
  beRegistrationNumber: string;
  hasCompetitions: boolean;
  hasSocialGames: boolean;
  socialGameTimings: string;
  providesTraining: boolean;
  trainingDetails: string;
  sessionFee: string;
  membershipFee: string;
  shuttlecockType: string;
  providesClubTShirts: boolean;
  contactFullName: string;
  contactPhone: string;
  contactAddress: string;
  ageGroups: string[];
  playerLevels: string[];
}

const AGE_GROUP_OPTIONS = ["Juniors", "Adults", "Seniors", "All Ages"];
const PLAYER_LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Pro"];

function clubToEditState(club: ClubWithStatus): ClubEditState {
  return {
    name: club.name || "",
    description: (club as any).description || "",
    logoUrl: club.logoUrl || "",
    address: club.address || "",
    city: club.city || "",
    postcode: club.postcode || "",
    googleMapsUrl: club.googleMapsUrl || "",
    isRegisteredWithBE: !!(club as any).isRegisteredWithBE,
    beRegistrationNumber: (club as any).beRegistrationNumber || "",
    hasCompetitions: !!(club as any).hasCompetitions,
    hasSocialGames: !!(club as any).hasSocialGames,
    socialGameTimings: (club as any).socialGameTimings || "",
    providesTraining: !!(club as any).providesTraining,
    trainingDetails: (club as any).trainingDetails || "",
    sessionFee: (club as any).sessionFee != null ? String((club as any).sessionFee) : "",
    membershipFee: (club as any).membershipFee != null ? String((club as any).membershipFee) : "",
    shuttlecockType: (club as any).shuttlecockType || "",
    providesClubTShirts: !!(club as any).providesClubTShirts,
    contactFullName: (club as any).contactFullName || "",
    contactPhone: (club as any).contactPhone || "",
    contactAddress: (club as any).contactAddress || "",
    ageGroups: (club as any).ageGroups || [],
    playerLevels: (club as any).playerLevels || [],
  };
}

export default function ClubManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageClub, setManageClub] = useState<ClubWithStatus | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<ClubWithStatus | null>(null);
  const [userManageOpen, setUserManageOpen] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", slug: "", description: "" });
  const [activeTab, setActiveTab] = useState("all");
  const [editDetails, setEditDetails] = useState<ClubEditState>({
    name: "", description: "", logoUrl: "", address: "", city: "", postcode: "", googleMapsUrl: "",
    isRegisteredWithBE: false, beRegistrationNumber: "", hasCompetitions: false,
    hasSocialGames: false, socialGameTimings: "", providesTraining: false, trainingDetails: "",
    sessionFee: "", membershipFee: "", shuttlecockType: "", providesClubTShirts: false,
    contactFullName: "", contactPhone: "", contactAddress: "", ageGroups: [], playerLevels: [],
  });
  const [manageTab, setManageTab] = useState("details");

  const { data: clubs, isLoading } = useQuery<ClubWithStatus[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: clubMembers, isLoading: membersLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/clubs", manageClub?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${manageClub!.id}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!manageClub,
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: number; updates: { membershipStatus?: string; clubRole?: string } }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${manageClub!.id}/members/${profileId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", manageClub?.id, "members"] });
      toast({ title: "Member updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateClubDetailsMutation = useMutation({
    mutationFn: async ({ clubId, updates }: { clubId: number; updates: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${clubId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Club details updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateClubStatusMutation = useMutation({
    mutationFn: async ({ clubId, status }: { clubId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${clubId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Club status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (clubId: number) => {
      await apiRequest("DELETE", `/api/admin/clubs/${clubId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Club archived successfully" });
      setDeleteConfirmOpen(false);
      setClubToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pauseClubMutation = useMutation({
    mutationFn: async (data: { clubId: number; paused: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.clubId}/pause`, { paused: data.paused });
      return res.json();
    },
    onSuccess: (_data: any, variables: { clubId: number; paused: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ 
        title: variables.paused ? "Club Paused" : "Club Resumed", 
        description: variables.paused 
          ? "Club operations have been paused. It won't appear in public listings." 
          : "Club has been resumed and is now fully operational."
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateClub = async () => {
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClub),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to create club");
      toast({ title: "Club Created", description: "New club has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setDialogOpen(false);
      setNewClub({ name: "", slug: "", description: "" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to create club", variant: "destructive" });
    }
  };

  const handleSaveDetails = () => {
    if (!manageClub) return;
    const updates: Record<string, unknown> = {
      name: editDetails.name || null,
      description: editDetails.description || null,
      logoUrl: editDetails.logoUrl || null,
      address: editDetails.address || null,
      city: editDetails.city || null,
      postcode: editDetails.postcode || null,
      googleMapsUrl: editDetails.googleMapsUrl || null,
      isRegisteredWithBE: editDetails.isRegisteredWithBE,
      beRegistrationNumber: editDetails.beRegistrationNumber || null,
      hasCompetitions: editDetails.hasCompetitions,
      hasSocialGames: editDetails.hasSocialGames,
      socialGameTimings: editDetails.socialGameTimings || null,
      providesTraining: editDetails.providesTraining,
      trainingDetails: editDetails.trainingDetails || null,
      sessionFee: editDetails.sessionFee ? Number(editDetails.sessionFee) : null,
      membershipFee: editDetails.membershipFee ? Number(editDetails.membershipFee) : null,
      shuttlecockType: editDetails.shuttlecockType || null,
      providesClubTShirts: editDetails.providesClubTShirts,
      contactFullName: editDetails.contactFullName || null,
      contactPhone: editDetails.contactPhone || null,
      contactAddress: editDetails.contactAddress || null,
      ageGroups: editDetails.ageGroups.length > 0 ? editDetails.ageGroups : null,
      playerLevels: editDetails.playerLevels.length > 0 ? editDetails.playerLevels : null,
    };
    updateClubDetailsMutation.mutate({ clubId: manageClub.id, updates });
  };

  const handleStatusChange = (profileId: number, status: string) => {
    updateMemberMutation.mutate({ profileId, updates: { membershipStatus: status } });
  };

  const handleRoleChange = (profileId: number, role: string) => {
    updateMemberMutation.mutate({ profileId, updates: { clubRole: role } });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "PAUSED":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case "ARCHIVED":
        return <Badge variant="outline" className="text-muted-foreground"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleArrayItem = (field: "ageGroups" | "playerLevels", item: string) => {
    const arr = editDetails[field];
    if (arr.includes(item)) {
      setEditDetails({ ...editDetails, [field]: arr.filter(i => i !== item) });
    } else {
      setEditDetails({ ...editDetails, [field]: [...arr, item] });
    }
  };

  const filteredClubs = clubs?.filter(club => {
    if (activeTab === "all") return club.isActive;
    if (activeTab === "pending") return club.status === "PENDING" && club.isActive;
    if (activeTab === "approved") return club.status === "APPROVED" && club.isActive;
    if (activeTab === "rejected") return club.status === "REJECTED" && club.isActive;
    if (activeTab === "paused") return club.status === "PAUSED" && club.isActive;
    if (activeTab === "archived") return !club.isActive;
    return true;
  }) || [];

  const pendingCount = clubs?.filter(c => c.status === "PENDING" && c.isActive).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader 
          title="God's Mode: Club Management" 
          description="Manage all clubs, approve requests, and assign platform admin rights."
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUserManageOpen(true)} data-testid="button-manage-users">
            <UserCog className="w-4 h-4 mr-2" />
            Manage Admin Rights
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-club">
                <Plus className="w-4 h-4 mr-2" />
                Add Club
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Club</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Club Name</Label>
                  <Input 
                    id="name"
                    placeholder="e.g., Downtown Badminton Club"
                    value={newClub.name}
                    onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                    data-testid="input-club-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input 
                    id="slug"
                    placeholder="e.g., downtown-badminton"
                    value={newClub.slug}
                    onChange={(e) => setNewClub({ ...newClub, slug: e.target.value })}
                    data-testid="input-club-slug"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description"
                    placeholder="Brief description of the club..."
                    value={newClub.description}
                    onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                    data-testid="input-club-description"
                  />
                </div>
                <Button className="w-full" onClick={handleCreateClub} data-testid="button-create-club">
                  Create Club
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" data-testid="tab-all-clubs">All Clubs</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-clubs" className="relative">
            Pending
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved-clubs">Approved</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected-clubs">Rejected</TabsTrigger>
          <TabsTrigger value="paused" data-testid="tab-paused-clubs">Paused</TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived-clubs">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 w-32 bg-muted rounded" /></CardHeader>
                  <CardContent><div className="h-16 bg-muted rounded" /></CardContent>
                </Card>
              ))
            ) : filteredClubs.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No clubs in this category
              </div>
            ) : filteredClubs.map(club => (
              <Card key={club.id} data-testid={`card-club-${club.id}`} className={!club.isActive ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {club.name}
                    </CardTitle>
                    {getStatusBadge(club.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{club.description || "No description"}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>/{club.slug}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {club.status === "PENDING" && club.isActive && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => updateClubStatusMutation.mutate({ clubId: club.id, status: "APPROVED" })}
                          disabled={updateClubStatusMutation.isPending}
                          data-testid={`approve-club-${club.id}`}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateClubStatusMutation.mutate({ clubId: club.id, status: "REJECTED" })}
                          disabled={updateClubStatusMutation.isPending}
                          data-testid={`reject-club-${club.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {club.isActive && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setManageClub(club);
                            setEditDetails(clubToEditState(club));
                            setManageTab("details");
                          }}
                          data-testid={`manage-club-${club.id}`}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        {(club.status === "APPROVED" || club.status === "PAUSED") && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => pauseClubMutation.mutate({ clubId: club.id, paused: club.status !== "PAUSED" })}
                            disabled={pauseClubMutation.isPending}
                            data-testid={`pause-club-${club.id}`}
                          >
                            {club.status === "PAUSED" 
                              ? <Play className="w-4 h-4 text-green-500" /> 
                              : <Pause className="w-4 h-4 text-orange-500" />}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setClubToDelete(club); setDeleteConfirmOpen(true); }}
                          data-testid={`delete-club-${club.id}`}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Club</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{clubToDelete?.name}"? The club will no longer be visible publicly, won't appear in rankings or session listings, and members won't be able to access it. All data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => clubToDelete && deleteClubMutation.mutate(clubToDelete.id)}
              disabled={deleteClubMutation.isPending}
              data-testid="confirm-delete-club"
            >
              {deleteClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Archive Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageClub} onOpenChange={(open) => !open && setManageClub(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Manage {manageClub?.name}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={manageTab} onValueChange={setManageTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" data-testid="tab-club-details">Club Details</TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-club-members">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                  <Building2 className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Club Name</Label>
                    <Input
                      value={editDetails.name}
                      onChange={(e) => setEditDetails({ ...editDetails, name: e.target.value })}
                      data-testid="input-edit-club-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Logo URL</Label>
                    <Input
                      value={editDetails.logoUrl}
                      onChange={(e) => setEditDetails({ ...editDetails, logoUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-edit-club-logo"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    className="resize-none"
                    value={editDetails.description}
                    onChange={(e) => setEditDetails({ ...editDetails, description: e.target.value })}
                    placeholder="Describe the club..."
                    data-testid="input-edit-club-description"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h3>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={editDetails.address}
                    onChange={(e) => setEditDetails({ ...editDetails, address: e.target.value })}
                    placeholder="e.g., 123 Sports Center Drive"
                    data-testid="input-edit-club-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      value={editDetails.city}
                      onChange={(e) => setEditDetails({ ...editDetails, city: e.target.value })}
                      placeholder="e.g., London"
                      data-testid="input-edit-club-city"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Postcode</Label>
                    <Input
                      value={editDetails.postcode}
                      onChange={(e) => setEditDetails({ ...editDetails, postcode: e.target.value })}
                      placeholder="e.g., SW1A 1AA"
                      data-testid="input-edit-club-postcode"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Google Maps Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editDetails.googleMapsUrl}
                      onChange={(e) => setEditDetails({ ...editDetails, googleMapsUrl: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="flex-1"
                      data-testid="input-edit-club-google-maps"
                    />
                    {editDetails.googleMapsUrl && (
                      <a href={editDetails.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline" type="button">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                  <Shield className="w-4 h-4" />
                  Registration & Affiliation
                </h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editDetails.isRegisteredWithBE}
                    onCheckedChange={(checked) => setEditDetails({ ...editDetails, isRegisteredWithBE: !!checked })}
                    data-testid="checkbox-registered-be"
                  />
                  <Label>Registered with Badminton England</Label>
                </div>
                {editDetails.isRegisteredWithBE && (
                  <div className="space-y-1.5">
                    <Label>BE Registration Number</Label>
                    <Input
                      value={editDetails.beRegistrationNumber}
                      onChange={(e) => setEditDetails({ ...editDetails, beRegistrationNumber: e.target.value })}
                      placeholder="Registration number"
                      data-testid="input-edit-be-number"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">Activities & Training</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editDetails.hasCompetitions}
                    onCheckedChange={(checked) => setEditDetails({ ...editDetails, hasCompetitions: !!checked })}
                    data-testid="checkbox-competitions"
                  />
                  <Label>Has Competitions</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editDetails.hasSocialGames}
                    onCheckedChange={(checked) => setEditDetails({ ...editDetails, hasSocialGames: !!checked })}
                    data-testid="checkbox-social-games"
                  />
                  <Label>Has Social Games</Label>
                </div>
                {editDetails.hasSocialGames && (
                  <div className="space-y-1.5">
                    <Label>Social Game Timings</Label>
                    <Input
                      value={editDetails.socialGameTimings}
                      onChange={(e) => setEditDetails({ ...editDetails, socialGameTimings: e.target.value })}
                      placeholder="e.g., Fridays 7-9pm"
                      data-testid="input-social-timings"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editDetails.providesTraining}
                    onCheckedChange={(checked) => setEditDetails({ ...editDetails, providesTraining: !!checked })}
                    data-testid="checkbox-training"
                  />
                  <Label>Provides Training</Label>
                </div>
                {editDetails.providesTraining && (
                  <div className="space-y-1.5">
                    <Label>Training Details</Label>
                    <Textarea
                      className="resize-none"
                      value={editDetails.trainingDetails}
                      onChange={(e) => setEditDetails({ ...editDetails, trainingDetails: e.target.value })}
                      placeholder="Describe training offered..."
                      data-testid="input-training-details"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">Fees & Equipment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Session Fee (pence)</Label>
                    <Input
                      type="number"
                      value={editDetails.sessionFee}
                      onChange={(e) => setEditDetails({ ...editDetails, sessionFee: e.target.value })}
                      placeholder="e.g., 500 for £5.00"
                      data-testid="input-session-fee"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Membership Fee (pence)</Label>
                    <Input
                      type="number"
                      value={editDetails.membershipFee}
                      onChange={(e) => setEditDetails({ ...editDetails, membershipFee: e.target.value })}
                      placeholder="e.g., 2000 for £20.00"
                      data-testid="input-membership-fee"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Shuttlecock Type</Label>
                  <Select
                    value={editDetails.shuttlecockType}
                    onValueChange={(v) => setEditDetails({ ...editDetails, shuttlecockType: v })}
                  >
                    <SelectTrigger data-testid="select-shuttlecock-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feather">Feather</SelectItem>
                      <SelectItem value="plastic">Plastic</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={editDetails.providesClubTShirts}
                    onCheckedChange={(checked) => setEditDetails({ ...editDetails, providesClubTShirts: !!checked })}
                    data-testid="checkbox-tshirts"
                  />
                  <Label>Provides Club T-Shirts</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">Target Players</h3>
                <div className="space-y-2">
                  <Label>Age Groups</Label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_GROUP_OPTIONS.map((opt) => (
                      <Badge
                        key={opt}
                        variant={editDetails.ageGroups.includes(opt) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem("ageGroups", opt)}
                        data-testid={`badge-age-${opt}`}
                      >
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Player Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLAYER_LEVEL_OPTIONS.map((opt) => (
                      <Badge
                        key={opt}
                        variant={editDetails.playerLevels.includes(opt) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem("playerLevels", opt)}
                        data-testid={`badge-level-${opt}`}
                      >
                        {opt}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Contact Full Name</Label>
                    <Input
                      value={editDetails.contactFullName}
                      onChange={(e) => setEditDetails({ ...editDetails, contactFullName: e.target.value })}
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input
                      value={editDetails.contactPhone}
                      onChange={(e) => setEditDetails({ ...editDetails, contactPhone: e.target.value })}
                      data-testid="input-contact-phone"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Address</Label>
                  <Input
                    value={editDetails.contactAddress}
                    onChange={(e) => setEditDetails({ ...editDetails, contactAddress: e.target.value })}
                    data-testid="input-contact-address"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveDetails}
                disabled={updateClubDetailsMutation.isPending}
                data-testid="button-save-club-details"
              >
                {updateClubDetailsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save All Details
              </Button>
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : !clubMembers?.length ? (
                <p className="text-center py-8 text-muted-foreground">No members in this club yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Club Role</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clubMembers.map(member => (
                      <TableRow key={member.id} data-testid={`member-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user.fullName}`} />
                              <AvatarFallback>{member.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.user.fullName}</div>
                              <div className="text-sm text-muted-foreground">{member.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.membershipStatus}
                            onValueChange={(status) => handleStatusChange(member.id, status)}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`status-select-${member.id}`}>
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
                            onValueChange={(role) => handleRoleChange(member.id, role)}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`role-select-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OWNER">Owner</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="PLAYER">Player</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{(member as any).eloRating ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={userManageOpen} onOpenChange={setUserManageOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Platform Admin Rights</DialogTitle>
          </DialogHeader>
          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="PLAYER">Player</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

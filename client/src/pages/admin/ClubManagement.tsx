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
import { Plus, Building2, Users, Settings, Check, X, Loader2, Trash2, Shield, Clock, CheckCircle, XCircle, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Club, PlayerProfile, User as UserType } from "@shared/schema";

type MemberWithUser = PlayerProfile & { user: UserType };
type UserWithProfile = UserType & { playerProfile: PlayerProfile | null };
type ClubWithStatus = Club & { status: string };

export default function ClubManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageClub, setManageClub] = useState<ClubWithStatus | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<ClubWithStatus | null>(null);
  const [userManageOpen, setUserManageOpen] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", slug: "", description: "" });
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all clubs for super admin
  const { data: clubs, isLoading } = useQuery<ClubWithStatus[]>({
    queryKey: ["/api/admin/clubs"],
  });

  // Fetch all users for admin rights management
  const { data: allUsers, isLoading: usersLoading } = useQuery<UserWithProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch club members when managing a specific club
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
      toast({ title: "Club deleted successfully" });
      setDeleteConfirmOpen(false);
      setClubToDelete(null);
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredClubs = clubs?.filter(club => {
    if (activeTab === "all") return club.isActive;
    if (activeTab === "pending") return club.status === "PENDING" && club.isActive;
    if (activeTab === "approved") return club.status === "APPROVED" && club.isActive;
    if (activeTab === "rejected") return club.status === "REJECTED" && club.isActive;
    if (activeTab === "deleted") return !club.isActive;
    return true;
  }) || [];

  const pendingCount = clubs?.filter(c => c.status === "PENDING" && c.isActive).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader 
          title="Super Admin: Club Management" 
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
          <TabsTrigger value="deleted" data-testid="tab-deleted-clubs">Deleted</TabsTrigger>
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
                          onClick={() => setManageClub(club)}
                          data-testid={`manage-club-${club.id}`}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setClubToDelete(club); setDeleteConfirmOpen(true); }}
                          data-testid={`delete-club-${club.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Club</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{clubToDelete?.name}"? This action will deactivate the club and all its data.
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
              Delete Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Club Members Dialog */}
      <Dialog open={!!manageClub} onOpenChange={(open) => !open && setManageClub(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Manage {manageClub?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-4">Club Members</h3>
            
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
                          value={member.membershipStatus || "PENDING"} 
                          onValueChange={(status) => handleStatusChange(member.id, status)}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`status-select-${member.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">
                              <Badge variant="outline" className="font-normal">Pending</Badge>
                            </SelectItem>
                            <SelectItem value="APPROVED">
                              <Badge className="bg-green-500 font-normal">Approved</Badge>
                            </SelectItem>
                            <SelectItem value="REJECTED">
                              <Badge variant="destructive" className="font-normal">Rejected</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={member.clubRole || "PLAYER"} 
                          onValueChange={(role) => handleRoleChange(member.id, role)}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`role-select-${member.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLAYER">Player</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="OWNER">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium">{member.rankingPoints}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* User Admin Rights Management Dialog */}
      <Dialog open={userManageOpen} onOpenChange={setUserManageOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Manage Platform Admin Rights
            </DialogTitle>
            <DialogDescription>
              Assign platform-wide admin roles to users. OWNER has super admin access to all clubs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : !allUsers?.length ? (
              <p className="text-center py-8 text-muted-foreground">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Platform Role</TableHead>
                    <TableHead>Account Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map(user => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                            <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Select 
                          value={user.role} 
                          onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`user-role-select-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Super Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="ORGANISER">Organiser</SelectItem>
                            <SelectItem value="COACH">Coach</SelectItem>
                            <SelectItem value="PLAYER">Player</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.accountStatus === "APPROVED" ? (
                          <Badge className="bg-green-500">Approved</Badge>
                        ) : user.accountStatus === "PENDING" ? (
                          <Badge variant="outline">Pending</Badge>
                        ) : (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

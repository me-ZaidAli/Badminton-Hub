import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Check, X, Shield, User, Clock, Loader2, UserPlus, Pencil, Trash2, Filter } from "lucide-react";
import { PlayerProfile, User as UserType } from "@shared/schema";
import { Link } from "wouter";

type MemberWithUser = PlayerProfile & { user: UserType };

export default function ClubAdmin() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [editingMember, setEditingMember] = useState<MemberWithUser | null>(null);
  const [editingFullName, setEditingFullName] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isSuperAdmin = user?.role === "OWNER";
  const ownedClubs = isSuperAdmin ? (clubs || []) : (clubs?.filter(club => club.ownerId === user?.id) || []);
  const clubId = selectedClubId ?? ownedClubs[0]?.id ?? null;

  const { data: members, isLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!clubId,
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: number; updates: { membershipStatus?: string; clubRole?: string; category?: string; gender?: string; fullName?: string } }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${clubId}/members/${profileId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members"] });
      toast({ title: "Member updated successfully" });
      setEditingMember(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMembersMutation = useMutation({
    mutationFn: async (profileIds: number[]) => {
      const res = await apiRequest("DELETE", `/api/clubs/${clubId}/members`, { profileIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members"] });
      toast({ title: `Deleted ${selectedIds.size} members` });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingMembers = members?.filter(m => m.membershipStatus === "PENDING") || [];
  const approvedMembers = members?.filter(m => m.membershipStatus === "APPROVED") || [];
  const rejectedMembers = members?.filter(m => m.membershipStatus === "REJECTED") || [];

  const filteredApprovedMembers = categoryFilter === "ALL" 
    ? approvedMembers 
    : approvedMembers.filter(m => m.category === categoryFilter);

  const groupedByCategory = {
    A: approvedMembers.filter(m => m.category === "A"),
    B: approvedMembers.filter(m => m.category === "B"),
    C: approvedMembers.filter(m => m.category === "C"),
    D: approvedMembers.filter(m => m.category === "D"),
  };

  const handleApprove = (profileId: number) => {
    updateMemberMutation.mutate({ profileId, updates: { membershipStatus: "APPROVED" } });
  };

  const handleReject = (profileId: number) => {
    updateMemberMutation.mutate({ profileId, updates: { membershipStatus: "REJECTED" } });
  };

  const handleRoleChange = (profileId: number, role: string) => {
    updateMemberMutation.mutate({ profileId, updates: { clubRole: role } });
  };

  const handleEditSubmit = () => {
    if (!editingMember) return;
    updateMemberMutation.mutate({
      profileId: editingMember.id,
      updates: {
        category: editingMember.category || undefined,
        gender: editingMember.gender || undefined,
        fullName: editingFullName || undefined,
      }
    });
  };

  const openEditDialog = (member: MemberWithUser) => {
    setEditingMember({...member});
    setEditingFullName(member.user.fullName);
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (membersList: MemberWithUser[]) => {
    if (membersList.every(m => selectedIds.has(m.id))) {
      const newSet = new Set(selectedIds);
      membersList.forEach(m => newSet.delete(m.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      membersList.forEach(m => newSet.add(m.id));
      setSelectedIds(newSet);
    }
  };

  const handleBulkDelete = () => {
    deleteMembersMutation.mutate(Array.from(selectedIds));
  };

  if (!ownedClubs.length && !isSuperAdmin && user?.role !== "ADMIN") {
    return (
      <div className="space-y-8">
        <PageHeader title="Club Admin" description="You don't own any clubs." />
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Create a club to start managing members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Club Admin" 
          description="Manage your club members and approve join requests."
        />
        {clubId && (
          <Link href={`/club-admin/${clubId}/organizers`}>
            <Button data-testid="button-manage-organizers">
              <UserPlus className="w-4 h-4 mr-2" /> Manage Organizers
            </Button>
          </Link>
        )}
      </div>

      {ownedClubs.length > 1 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Club:</label>
          <Select value={clubId?.toString() || ""} onValueChange={(v) => setSelectedClubId(Number(v))}>
            <SelectTrigger className="w-[250px]" data-testid="select-club">
              <SelectValue placeholder="Select a club..." />
            </SelectTrigger>
            <SelectContent>
              {ownedClubs.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <span className="text-sm font-medium">{selectedIds.size} member(s) selected</span>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="button-bulk-delete"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
            <Clock className="w-4 h-4" />
            Pending ({pendingMembers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2" data-testid="tab-approved">
            <Check className="w-4 h-4" />
            Approved ({approvedMembers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2" data-testid="tab-rejected">
            <X className="w-4 h-4" />
            Rejected ({rejectedMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Join Requests</CardTitle>
              <CardDescription>Review and approve new member requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pendingMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={pendingMembers.every(m => selectedIds.has(m.id))}
                          onCheckedChange={() => toggleSelectAll(pendingMembers)}
                          data-testid="checkbox-select-all-pending"
                        />
                      </TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMembers.map(member => (
                      <TableRow key={member.id} data-testid={`pending-member-${member.id}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelection(member.id)}
                            data-testid={`checkbox-${member.id}`}
                          />
                        </TableCell>
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
                          <Badge variant="outline">{member.gender || "Not specified"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(member.id)} data-testid={`approve-${member.id}`}>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(member.id)} data-testid={`reject-${member.id}`}>
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Approved Members</CardTitle>
                <CardDescription>Manage member roles, categories, and permissions.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="A">Category A ({groupedByCategory.A.length})</SelectItem>
                    <SelectItem value="B">Category B ({groupedByCategory.B.length})</SelectItem>
                    <SelectItem value="C">Category C ({groupedByCategory.C.length})</SelectItem>
                    <SelectItem value="D">Category D ({groupedByCategory.D.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredApprovedMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {categoryFilter === "ALL" ? "No approved members yet." : `No members in Category ${categoryFilter}.`}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={filteredApprovedMembers.every(m => selectedIds.has(m.id))}
                          onCheckedChange={() => toggleSelectAll(filteredApprovedMembers)}
                          data-testid="checkbox-select-all-approved"
                        />
                      </TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovedMembers.map(member => (
                      <TableRow key={member.id} data-testid={`approved-member-${member.id}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelection(member.id)}
                            data-testid={`checkbox-${member.id}`}
                          />
                        </TableCell>
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
                          <Badge variant="outline">{member.category || "D"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.gender || "N/A"}</Badge>
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
                              <SelectItem value="PLAYER">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  Player
                                </div>
                              </SelectItem>
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="OWNER">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  Owner
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-medium">{member.rankingPoints}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEditDialog(member)}
                            data-testid={`edit-${member.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Members</CardTitle>
              <CardDescription>Members whose requests were rejected.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : rejectedMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No rejected members.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={rejectedMembers.every(m => selectedIds.has(m.id))}
                          onCheckedChange={() => toggleSelectAll(rejectedMembers)}
                          data-testid="checkbox-select-all-rejected"
                        />
                      </TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedMembers.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(member.id)}
                            onCheckedChange={() => toggleSelection(member.id)}
                            data-testid={`checkbox-${member.id}`}
                          />
                        </TableCell>
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
                          <Button size="sm" variant="outline" onClick={() => handleApprove(member.id)}>
                            Approve
                          </Button>
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

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Details</DialogTitle>
            <DialogDescription>
              Update member name, category, and gender information.
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${editingMember.user.fullName}`} />
                  <AvatarFallback>{editingMember.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">{editingMember.user.email}</div>
              </div>
              
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={editingFullName}
                  onChange={(e) => setEditingFullName(e.target.value)}
                  placeholder="Enter member's full name"
                  data-testid="input-edit-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={editingMember.category || "D"} 
                  onValueChange={(v) => setEditingMember({...editingMember, category: v as "A" | "B" | "C" | "D"})}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Category A (Advanced)</SelectItem>
                    <SelectItem value="B">Category B (Intermediate+)</SelectItem>
                    <SelectItem value="C">Category C (Intermediate)</SelectItem>
                    <SelectItem value="D">Category D (Beginner)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={editingMember.gender || ""} 
                  onValueChange={(v) => setEditingMember({...editingMember, gender: v as "MALE" | "FEMALE"})}
                >
                  <SelectTrigger data-testid="select-edit-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button 
              onClick={handleEditSubmit} 
              disabled={updateMemberMutation.isPending}
              data-testid="button-save-member"
            >
              {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Members</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} member(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={deleteMembersMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMembersMutation.isPending ? "Deleting..." : "Delete Members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

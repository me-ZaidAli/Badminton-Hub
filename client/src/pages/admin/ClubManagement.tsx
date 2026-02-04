import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Building2, Users, Settings, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Club, PlayerProfile, User as UserType } from "@shared/schema";

type MemberWithUser = PlayerProfile & { user: UserType };

export default function ClubManagement() {
  const { data: clubs, isLoading } = useClubs();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageClub, setManageClub] = useState<Club | null>(null);
  const [newClub, setNewClub] = useState({ name: "", slug: "", description: "" });

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
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader 
          title="Club Management" 
          description="Manage all clubs and their members across the platform."
        />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 w-32 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))
        ) : clubs?.map(club => (
          <Card key={club.id} data-testid={`card-club-${club.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {club.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{club.description || "No description"}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>/{club.slug}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setManageClub(club)}
                  data-testid={`manage-club-${club.id}`}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users, Building2, Shield, UserPlus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";

type Club = {
  id: number;
  name: string;
  slug: string;
  status: string;
  isActive: boolean;
};

type ClubAdmin = {
  id: number;
  userId: number;
  clubId: number;
  clubRole: string;
  membershipStatus: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
  club: {
    id: number;
    name: string;
    slug: string;
  };
};

export default function ClubAdmins() {
  const { toast } = useToast();
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ email: "", clubId: "", role: "ADMIN" });

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: admins, isLoading: adminsLoading } = useQuery<ClubAdmin[]>({
    queryKey: ["/api/admin/club-admins", selectedClub],
    queryFn: async () => {
      const res = await fetch(`/api/admin/club-admins?club=${selectedClub}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admins");
      return res.json();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ profileId, role }: { profileId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/profiles/${profileId}`, { clubRole: role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-admins", selectedClub] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: { email: string; clubId: number; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/club-admins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-admins", selectedClub] });
      toast({ title: "Admin added successfully" });
      setAddAdminOpen(false);
      setNewAdminData({ email: "", clubId: "", role: "ADMIN" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddAdmin = () => {
    if (!newAdminData.email || !newAdminData.clubId) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    addAdminMutation.mutate({
      email: newAdminData.email,
      clubId: Number(newAdminData.clubId),
      role: newAdminData.role,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Badge className="bg-purple-500"><Shield className="w-3 h-3 mr-1" />Owner</Badge>;
      case "ADMIN":
        return <Badge className="bg-blue-500"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case "ORGANISER":
        return <Badge className="bg-green-500">Organiser</Badge>;
      case "COACH":
        return <Badge className="bg-orange-500">Coach</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredAdmins = admins?.filter(admin => {
    const matchesClub = selectedClub === "all" || admin.clubId === Number(selectedClub);
    const matchesSearch = !searchQuery || 
      admin.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.club.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isAdminRole = ["OWNER", "ADMIN", "ORGANISER", "COACH"].includes(admin.clubRole);
    return matchesClub && matchesSearch && isAdminRole;
  }) || [];

  const adminsByClub = filteredAdmins.reduce((acc, admin) => {
    const clubName = admin.club.name;
    if (!acc[clubName]) acc[clubName] = [];
    acc[clubName].push(admin);
    return acc;
  }, {} as Record<string, ClubAdmin[]>);

  if (clubsLoading || adminsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader 
          title="Club Administrators" 
          description="Manage all club administrators across the platform"
        />
        <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-admin">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Club Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Club Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">User Email</Label>
                <Input
                  id="admin-email"
                  placeholder="user@example.com"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  data-testid="input-admin-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-club">Club</Label>
                <Select 
                  value={newAdminData.clubId}
                  onValueChange={(value) => setNewAdminData({ ...newAdminData, clubId: value })}
                >
                  <SelectTrigger data-testid="select-admin-club">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs?.filter(c => c.isActive && c.status === "APPROVED").map(club => (
                      <SelectItem key={club.id} value={String(club.id)}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-role">Role</Label>
                <Select 
                  value={newAdminData.role}
                  onValueChange={(value) => setNewAdminData({ ...newAdminData, role: value })}
                >
                  <SelectTrigger data-testid="select-admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner (Full Access)</SelectItem>
                    <SelectItem value="ADMIN">Admin (Club Management)</SelectItem>
                    <SelectItem value="ORGANISER">Organiser (Session Management)</SelectItem>
                    <SelectItem value="COACH">Coach (Session Management)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleAddAdmin}
                disabled={addAdminMutation.isPending}
                data-testid="button-confirm-add-admin"
              >
                {addAdminMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Admin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Club Administrators
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-admins"
              />
            </div>
            <Select value={selectedClub} onValueChange={setSelectedClub}>
              <SelectTrigger className="w-48" data-testid="select-filter-club">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by club" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {clubs?.filter(c => c.isActive).map(club => (
                  <SelectItem key={club.id} value={String(club.id)}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No administrators found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(adminsByClub).map(([clubName, clubAdmins]) => (
                <div key={clubName} className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    {clubName}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administrator</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Club Role</TableHead>
                        <TableHead>Platform Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clubAdmins.map(admin => (
                        <TableRow key={admin.id} data-testid={`admin-row-${admin.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${admin.user.fullName}`} />
                                <AvatarFallback>{admin.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{admin.user.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{admin.user.email}</TableCell>
                          <TableCell>
                            <Select 
                              value={admin.clubRole}
                              onValueChange={(role) => updateRoleMutation.mutate({ profileId: admin.id, role })}
                            >
                              <SelectTrigger className="w-[130px]" data-testid={`role-select-${admin.id}`}>
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
                          <TableCell>{getRoleBadge(admin.user.role)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateRoleMutation.mutate({ profileId: admin.id, role: "PLAYER" })}
                              disabled={updateRoleMutation.isPending}
                              data-testid={`button-demote-${admin.id}`}
                            >
                              Demote to Player
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

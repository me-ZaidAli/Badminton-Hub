import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Users, Building2, Shield, UserPlus, Search, Pencil, MoreHorizontal, Trash2, CheckSquare, ChevronsUpDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

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
  fullName?: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
  club?: {
    id: number;
    name: string;
    slug: string;
  };
};

const ROLE_ORDER: Record<string, number> = { "OWNER": 0, "ADMIN": 1, "ORGANISER": 2, "COACH": 3, "PLAYER": 4 };

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "OWNER": return "destructive";
    case "ADMIN": return "default";
    case "ORGANISER": return "secondary";
    case "COACH": return "secondary";
    default: return "outline";
  }
}

export default function ClubAdmins() {
  const { toast } = useToast();
  const [selectedClub, setSelectedClub] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ email: "", clubId: "", role: "ADMIN" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRoleDialogOpen, setBulkRoleDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>("PLAYER");
  const [clubSearchOpen, setClubSearchOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: admins, isLoading: adminsLoading } = useQuery<ClubAdmin[]>({
    queryKey: ["/api/admin/club-admins", selectedClub],
    queryFn: async () => {
      const res = await fetch(`/api/admin/club-admins?club=${selectedClub}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch club admins");
      return res.json();
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: { email: string; clubId: number; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/club-admins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-admins"] });
      toast({ title: "Member added successfully" });
      setAddAdminOpen(false);
      setNewAdminData({ email: "", clubId: "", role: "ADMIN" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ profileId, clubRole }: { profileId: number; clubRole: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/profiles/${profileId}`, { clubRole });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-admins"] });
      toast({ title: "Role updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async (data: { profileIds: number[]; action: string; role?: string }) => {
      const res = await apiRequest("POST", "/api/admin/profiles/bulk-action", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-admins"] });
      toast({ title: "Bulk action completed", description: data.message });
      setSelectedIds(new Set());
      setBulkRoleDialogOpen(false);
      setBulkDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredAdmins = useMemo(() => {
    if (!admins) return [];
    let result = [...admins];

    if (roleFilter !== "all") {
      result = result.filter(a => a.clubRole === roleFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.user.fullName.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.club?.name || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const roleA = ROLE_ORDER[a.clubRole] ?? 99;
      const roleB = ROLE_ORDER[b.clubRole] ?? 99;
      if (roleA !== roleB) return roleA - roleB;
      return a.user.fullName.localeCompare(b.user.fullName);
    });

    return result;
  }, [admins, searchQuery, roleFilter]);

  const selectAll = () => {
    if (selectedIds.size === filteredAdmins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAdmins.map(a => a.id)));
    }
  };

  const toggleSelection = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkRoleChange = () => {
    bulkActionMutation.mutate({
      profileIds: Array.from(selectedIds),
      action: "changeRole",
      role: bulkRole,
    });
  };

  const handleBulkDelete = () => {
    bulkActionMutation.mutate({
      profileIds: Array.from(selectedIds),
      action: "delete",
    });
  };

  const activeClubs = clubs?.filter(c => c.isActive) || [];

  const getClubName = (admin: ClubAdmin) => {
    if (admin.club?.name) return admin.club.name;
    const club = clubs?.find(c => c.id === admin.clubId);
    return club?.name || `Club #${admin.clubId}`;
  };

  const selectedClubName = selectedClub === "all"
    ? "All Clubs"
    : activeClubs.find(c => c.id === Number(selectedClub))?.name || "All Clubs";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader
          title="Club Members & Admins"
          description="Manage all club members, roles, and admin rights across clubs."
        />
        <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-admin">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to Club</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input
                  placeholder="user@example.com"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  data-testid="input-admin-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Club</Label>
                <Select value={newAdminData.clubId} onValueChange={(v) => setNewAdminData({ ...newAdminData, clubId: v })}>
                  <SelectTrigger data-testid="select-admin-club">
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClubs.map(club => (
                      <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newAdminData.role} onValueChange={(v) => setNewAdminData({ ...newAdminData, role: v })}>
                  <SelectTrigger data-testid="select-admin-role">
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
              </div>
              <Button
                className="w-full"
                disabled={addAdminMutation.isPending || !newAdminData.email || !newAdminData.clubId}
                onClick={() => addAdminMutation.mutate({
                  email: newAdminData.email,
                  clubId: Number(newAdminData.clubId),
                  role: newAdminData.role,
                })}
                data-testid="button-confirm-add-admin"
              >
                {addAdminMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Add Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Popover open={clubSearchOpen} onOpenChange={setClubSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clubSearchOpen}
                  className="w-[240px] justify-between"
                  data-testid="button-club-filter"
                >
                  <Building2 className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedClubName}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Search clubs..." data-testid="input-club-search" />
                  <CommandList>
                    <CommandEmpty>No club found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedClub("all");
                          setClubSearchOpen(false);
                          setSelectedIds(new Set());
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedClub === "all" ? "opacity-100" : "opacity-0")} />
                        All Clubs
                      </CommandItem>
                      {activeClubs.map(club => (
                        <CommandItem
                          key={club.id}
                          value={club.name}
                          onSelect={() => {
                            setSelectedClub(String(club.id));
                            setClubSearchOpen(false);
                            setSelectedIds(new Set());
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedClub === String(club.id) ? "opacity-100" : "opacity-0")} />
                          {club.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-role-filter">
                <Shield className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ORGANISER">Organiser</SelectItem>
                <SelectItem value="COACH">Coach</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or club..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedIds(new Set()); }}
                className="pl-10"
                data-testid="input-search-admins"
              />
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-md">
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkRoleDialogOpen(true)}
                data-testid="button-bulk-change-role"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Change Role
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Remove
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                data-testid="button-clear-selection"
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          {adminsLoading || clubsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredAdmins.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {searchQuery || roleFilter !== "all" ? "No members match your filters." : "No members found."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredAdmins.length && filteredAdmins.length > 0}
                        onCheckedChange={selectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Club Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platform Role</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map(admin => (
                    <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(admin.id)}
                          onCheckedChange={() => toggleSelection(admin.id)}
                          data-testid={`checkbox-admin-${admin.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${admin.user.fullName}`} />
                            <AvatarFallback>{admin.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{admin.user.fullName}</div>
                            <div className="text-xs text-muted-foreground">{admin.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getClubName(admin)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(admin.clubRole)} data-testid={`badge-club-role-${admin.id}`}>
                          {admin.clubRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.membershipStatus === "APPROVED" ? "default" : admin.membershipStatus === "PENDING" ? "outline" : "destructive"}>
                          {admin.membershipStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {admin.user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`menu-admin-${admin.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].map(role => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => updateRoleMutation.mutate({ profileId: admin.id, clubRole: role })}
                                disabled={admin.clubRole === role}
                              >
                                Set as {role}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filteredAdmins.length} of {admins?.length ?? 0} members</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={bulkRoleDialogOpen} onOpenChange={setBulkRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role for {selectedIds.size} Members</DialogTitle>
            <DialogDescription>
              Select the new club role to assign to all selected members.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bulkRole} onValueChange={setBulkRole}>
              <SelectTrigger data-testid="select-bulk-role">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRoleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkRoleChange}
              disabled={bulkActionMutation.isPending}
              data-testid="button-confirm-bulk-role"
            >
              {bulkActionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {selectedIds.size} Members</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove these members from their clubs? This will delete their club membership profiles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkActionMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkActionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Remove Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePlayers, useUpdatePlayer } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useMyAdminClubs } from "@/hooks/use-clubs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Shield, Mail, Trophy, Search, Trash2, Ban, Archive, UserPlus, Building2, Pencil, MoreHorizontal, CheckCircle, ArrowLeft, Loader2, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { UnifiedMemberEditDialog, MemberEditData } from "@/components/UnifiedMemberEditDialog";

type ProfileData = {
  id: number;
  clubId: number;
  gender: string | null;
  category: string | null;
  grade: string | null;
  playerStatus: string;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
};

type PlayerData = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  isJunior?: boolean;
  parentGuardianName?: string | null;
  parentGuardianEmail?: string | null;
  playerProfiles: ProfileData[];
};

function getDisplayProfile(player: PlayerData, selectedClubId: string): ProfileData | null {
  if (!player.playerProfiles || player.playerProfiles.length === 0) return null;
  if (selectedClubId !== "all") {
    const clubProfile = player.playerProfiles.find(p => p.clubId === Number(selectedClubId));
    if (clubProfile) return clubProfile;
  }
  return player.playerProfiles[0];
}

function getCategoryBadgeClass(category: string | null) {
  if (!category) return "bg-muted text-muted-foreground";
  if (category.startsWith("A")) return "bg-green-500/10 text-green-600 border-green-500/30";
  if (category.startsWith("B")) return "bg-blue-500/10 text-blue-600 border-blue-500/30";
  if (category.startsWith("C")) return "bg-orange-500/10 text-orange-600 border-orange-500/30";
  return "bg-muted text-muted-foreground";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE": return <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Active</Badge>;
    case "SUSPENDED": return <Badge variant="destructive" className="no-default-hover-elevate">Suspended</Badge>;
    case "BANNED": return <Badge variant="destructive" className="no-default-hover-elevate">Banned</Badge>;
    case "ARCHIVED": return <Badge variant="secondary" className="no-default-hover-elevate">Archived</Badge>;
    default: return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

export default function PlayerManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: players, isLoading } = usePlayers();
  const { data: clubs } = useClubs();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  const isSuperAdmin = user?.role === "OWNER";
  const isPlatformAdmin = user?.role === "ADMIN";

  const accessibleClubIds = useMemo(() => {
    if (isSuperAdmin || isPlatformAdmin) return null;
    return myAdminClubs?.map(c => c.id) || [];
  }, [isSuperAdmin, isPlatformAdmin, myAdminClubs]);

  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState<string>("all");

  useEffect(() => {
    if (!isSuperAdmin && !isPlatformAdmin && myAdminClubs && myAdminClubs.length > 0 && clubFilter === "all") {
      setClubFilter(myAdminClubs[0].id.toString());
    }
  }, [isSuperAdmin, isPlatformAdmin, myAdminClubs, clubFilter]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [allocateUserId, setAllocateUserId] = useState<number | null>(null);
  const [allocateClubIds, setAllocateClubIds] = useState<number[]>([]);
  const [editPlayer, setEditPlayer] = useState<PlayerData | null>(null);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return (players as PlayerData[]).filter((p) => {
      if (accessibleClubIds !== null) {
        const hasAccessibleProfile = p.playerProfiles.some(pr => accessibleClubIds.includes(pr.clubId));
        if (!hasAccessibleProfile) return false;
      }
      const profiles = p.playerProfiles || [];
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        p.fullName.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;

      const matchesClub = clubFilter === "all" ||
        profiles.some(pr => pr.clubId === Number(clubFilter));
      if (!matchesClub) return false;

      const relevantProfiles = clubFilter === "all"
        ? profiles
        : profiles.filter(pr => pr.clubId === Number(clubFilter));

      const matchesCategory = categoryFilter === "all" ||
        relevantProfiles.some(pr => (pr.grade || pr.category) === categoryFilter);

      const matchesGender = genderFilter === "all" ||
        relevantProfiles.some(pr => pr.gender === genderFilter);

      const matchesRole = roleFilter === "all" || p.role === roleFilter;

      const matchesStatus = statusFilter === "all" ||
        relevantProfiles.some(pr => pr.playerStatus === statusFilter);

      return matchesCategory && matchesGender && matchesRole && matchesStatus;
    });
  }, [players, search, clubFilter, categoryFilter, genderFilter, roleFilter, statusFilter, accessibleClubIds]);

  const bulkActionMutation = useMutation({
    mutationFn: async ({ profileIds, action }: { profileIds: number[], action: string }) => {
      return apiRequest("POST", "/api/admin/players/bulk-action", { profileIds, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      setSelectedMembers([]);
      toast({ title: "Success", description: "Bulk action completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to perform action", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      const res = await fetch(`/api/admin/players/${profileId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete player profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Success", description: "Player profile deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete player profile", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete user account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setDeleteUserDialogOpen(false);
      setDeleteUserId(null);
      setDeleteUserName("");
      toast({ title: "Account Deleted", description: "The member account has been permanently deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user account", variant: "destructive" });
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async ({ userId, clubIds }: { userId: number, clubIds: number[] }) => {
      return apiRequest("POST", `/api/admin/players/${userId}/allocate`, { clubIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      setAllocateDialogOpen(false);
      setAllocateUserId(null);
      setAllocateClubIds([]);
      toast({ title: "Success", description: "Member allocated to clubs successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to allocate member", variant: "destructive" });
    },
  });

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredPlayers.length) {
      setSelectedMembers([]);
    } else {
      const allProfileIds = filteredPlayers.flatMap(p => p.playerProfiles.map(pr => pr.id));
      setSelectedMembers(allProfileIds);
    }
  };

  const handleSelectMember = (player: PlayerData) => {
    const profileIds = player.playerProfiles.map(pr => pr.id);
    const allSelected = profileIds.every(id => selectedMembers.includes(id));
    if (allSelected) {
      setSelectedMembers(prev => prev.filter(id => !profileIds.includes(id)));
    } else {
      setSelectedMembers(prev => Array.from(new Set([...prev, ...profileIds])));
    }
  };

  const isMemberSelected = (player: PlayerData) => {
    if (player.playerProfiles.length === 0) return false;
    return player.playerProfiles.some(pr => selectedMembers.includes(pr.id));
  };

  const handleBulkAction = (action: string) => {
    setPendingAction(action);
    setBulkActionDialogOpen(true);
  };

  const confirmBulkAction = () => {
    if (pendingAction && selectedMembers.length > 0) {
      bulkActionMutation.mutate({ profileIds: selectedMembers, action: pendingAction });
    }
    setBulkActionDialogOpen(false);
    setPendingAction(null);
  };

  const openAllocateDialog = (player: PlayerData) => {
    setAllocateUserId(player.id);
    setAllocateClubIds([]);
    setAllocateDialogOpen(true);
  };

  const openDeleteUserDialog = (player: PlayerData) => {
    setDeleteUserId(player.id);
    setDeleteUserName(player.fullName);
    setDeleteUserDialogOpen(true);
  };

  if (user?.role !== "OWNER" && user?.role !== "ADMIN" && (!myAdminClubs || myAdminClubs.length === 0)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must be an Admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Members Management
          </h1>
          <p className="text-muted-foreground">
            {isSuperAdmin || isPlatformAdmin 
              ? "Manage all registered members across all clubs" 
              : `Manage members in your club${(myAdminClubs?.length ?? 0) > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-members"
              />
            </div>
            {clubs && clubs.length > 0 && (
              <Select value={clubFilter} onValueChange={setClubFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  {(isSuperAdmin || isPlatformAdmin) && <SelectItem value="all">All Clubs</SelectItem>}
                  {(isSuperAdmin || isPlatformAdmin ? clubs : clubs.filter(c => accessibleClubIds?.includes(c.id))).map(club => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-gender-filter">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-role-filter">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedMembers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{selectedMembers.length} profile(s) selected</span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")} data-testid="button-bulk-activate">
            <CheckCircle className="h-4 w-4 mr-1" />
            Activate
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("suspend")} data-testid="button-bulk-suspend">
            <Ban className="h-4 w-4 mr-1" />
            Suspend
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("archive")} data-testid="button-bulk-archive">
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")} data-testid="button-bulk-delete">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="text-members-count">
            Members ({filteredPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No members found{search ? ` matching "${search}"` : ""}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMembers.length > 0 && filteredPlayers.every(p => isMemberSelected(p))}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Club(s)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                    const profile = getDisplayProfile(player, clubFilter);
                    const totalMatches = player.playerProfiles.reduce((sum, pr) => sum + pr.matchesPlayed, 0);
                    const totalWins = player.playerProfiles.reduce((sum, pr) => sum + pr.matchesWon, 0);
                    const categories = Array.from(new Set(player.playerProfiles.map(pr => pr.grade || pr.category).filter(Boolean)));
                    const genders = Array.from(new Set(player.playerProfiles.map(pr => pr.gender).filter(Boolean)));

                    return (
                      <TableRow key={player.id} data-testid={`row-member-${player.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={isMemberSelected(player)}
                            onCheckedChange={() => handleSelectMember(player)}
                            data-testid={`checkbox-member-${player.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                              <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium" data-testid={`text-member-name-${player.id}`}>{player.fullName}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {player.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {player.playerProfiles.length > 0 ? (
                              player.playerProfiles.map(pr => {
                                const clubName = clubs?.find(c => c.id === pr.clubId)?.name;
                                return clubName ? (
                                  <Badge key={pr.id} variant="outline" className="text-xs no-default-hover-elevate">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {clubName}
                                  </Badge>
                                ) : null;
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground">No club</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {categories.length > 0 ? categories.map(cat => (
                              <Badge key={cat} variant="outline" className={`${getCategoryBadgeClass(cat)} no-default-hover-elevate`}>
                                {cat}
                              </Badge>
                            )) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{genders.length > 0 ? genders.join(", ") : "N/A"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="no-default-hover-elevate">
                            <Shield className="h-3 w-3 mr-1" />
                            {player.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {profile ? getStatusBadge(profile.playerStatus) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span>{totalWins}/{totalMatches}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${player.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditPlayer(player)}
                                data-testid={`menu-edit-${player.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {(isSuperAdmin || isPlatformAdmin) && (
                                <DropdownMenuItem
                                  onClick={() => openAllocateDialog(player)}
                                  data-testid={`menu-allocate-${player.id}`}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Allocate to Clubs
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {player.playerProfiles.map(pr => (
                                <DropdownMenuItem
                                  key={`activate-${pr.id}`}
                                  onClick={() => bulkActionMutation.mutate({ profileIds: [pr.id], action: "activate" })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )).slice(0, 1)}
                              {player.playerProfiles.map(pr => (
                                <DropdownMenuItem
                                  key={`suspend-${pr.id}`}
                                  onClick={() => bulkActionMutation.mutate({ profileIds: [pr.id], action: "suspend" })}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )).slice(0, 1)}
                              {player.playerProfiles.map(pr => (
                                <DropdownMenuItem
                                  key={`archive-${pr.id}`}
                                  onClick={() => bulkActionMutation.mutate({ profileIds: [pr.id], action: "archive" })}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              )).slice(0, 1)}
                              {player.playerProfiles.length > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      const profileId = profile?.id || player.playerProfiles[0]?.id;
                                      if (profileId) deleteProfileMutation.mutate(profileId);
                                    }}
                                    data-testid={`menu-delete-profile-${player.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Profile
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(isSuperAdmin || isPlatformAdmin) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 font-semibold"
                                    onClick={() => openDeleteUserDialog(player)}
                                    data-testid={`menu-delete-account-${player.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Permanently Delete Account
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingAction} {selectedMembers.length} profile(s)?
              {pendingAction === "delete" && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className={pendingAction === "delete" ? "bg-destructive text-destructive-foreground" : ""}
              data-testid="button-confirm-bulk"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You are about to permanently delete <strong>{deleteUserName}</strong>'s account.
              This will permanently delete this member's account and all associated data including match history, session signups, and club memberships. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white"
              onClick={() => {
                if (deleteUserId) deleteUserMutation.mutate(deleteUserId);
              }}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Member to Clubs</DialogTitle>
            <DialogDescription>Select additional clubs for this member to join</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {clubs?.map(club => (
              <div key={club.id} className="flex items-center gap-3">
                <Checkbox
                  id={`allocate-club-${club.id}`}
                  checked={allocateClubIds.includes(club.id)}
                  onCheckedChange={(checked) => {
                    setAllocateClubIds(prev =>
                      checked
                        ? [...prev, club.id]
                        : prev.filter(id => id !== club.id)
                    );
                  }}
                  data-testid={`checkbox-allocate-club-${club.id}`}
                />
                <label htmlFor={`allocate-club-${club.id}`} className="flex items-center gap-2 cursor-pointer">
                  {club.logoUrl && (
                    <img src={club.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                  )}
                  {club.name}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)} data-testid="button-cancel-allocate">Cancel</Button>
            <Button
              onClick={() => allocateUserId && allocateMutation.mutate({ userId: allocateUserId, clubIds: allocateClubIds })}
              disabled={allocateClubIds.length === 0 || allocateMutation.isPending}
              data-testid="button-confirm-allocate"
            >
              {allocateMutation.isPending ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editPlayer && (
        <AdminEditMemberWrapper
          player={editPlayer}
          clubs={clubs || []}
          open={!!editPlayer}
          onClose={() => setEditPlayer(null)}
          selectedClubFilter={clubFilter}
        />
      )}
    </div>
  );
}

function AdminEditMemberWrapper({
  player,
  clubs,
  open,
  onClose,
  selectedClubFilter,
}: {
  player: PlayerData;
  clubs: { id: number; name: string }[];
  open: boolean;
  onClose: () => void;
  selectedClubFilter: string;
}) {
  const { toast } = useToast();
  const { mutateAsync: updatePlayer, isPending } = useUpdatePlayer();

  const activeProfile = (selectedClubFilter !== "all"
    ? player.playerProfiles.find(p => p.clubId === Number(selectedClubFilter))
    : player.playerProfiles[0]) || null;

  const banMutation = useMutation({
    mutationFn: async () => {
      if (!activeProfile) throw new Error("No profile found");
      await apiRequest("POST", `/api/clubs/${activeProfile.clubId}/members/${activeProfile.id}/ban`);
    },
    onSuccess: () => {
      toast({ title: "Player banned from club" });
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to ban player", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!activeProfile) throw new Error("No profile found");
      await apiRequest("POST", `/api/clubs/${activeProfile.clubId}/members/${activeProfile.id}/remove`);
    },
    onSuccess: () => {
      toast({ title: "Player removed from club" });
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove player", description: err.message, variant: "destructive" });
    },
  });

  const editData: MemberEditData = {
    userId: player.id,
    fullName: player.fullName,
    email: player.email,
    phone: (player as any).phone || "",
    nickname: (player as any).nickname || "",
    dateOfBirth: player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : "",
    gender: activeProfile?.gender || "",
    category: activeProfile?.grade || activeProfile?.category || "C3",
    isJunior: player.isJunior || false,
    parentGuardianName: player.parentGuardianName || "",
    parentGuardianEmail: player.parentGuardianEmail || "",
    city: (player as any).city || "",
    country: (player as any).country || "",
    region: (player as any).region || "",
    continent: (player as any).continent || "",
    acquisitionSource: (player as any).acquisitionSource || "",
    acquisitionSourceOther: (player as any).acquisitionSourceOther || "",
    clubRole: (activeProfile as any)?.clubRole || "PLAYER",
    playerStatus: activeProfile?.playerStatus || "ACTIVE",
    membershipStatus: (activeProfile as any)?.membershipStatus || "APPROVED",
    role: player.role,
    accountStatus: "APPROVED",
    rankingPoints: String(activeProfile?.rankingPoints || 0),
    matchesPlayed: String(activeProfile?.matchesPlayed || 0),
    matchesWon: String(activeProfile?.matchesWon || 0),
    joinedAt: "",
    profileId: activeProfile?.id,
    clubId: activeProfile?.clubId,
    clubName: clubs.find(c => c.id === activeProfile?.clubId)?.name,
  };

  const handleSave = async (formData: MemberEditData & { password?: string }) => {
    const updates: any = { id: player.id };

    if (formData.fullName !== player.fullName) updates.fullName = formData.fullName;
    if (formData.email !== player.email) updates.email = formData.email;
    if (formData.phone !== ((player as any).phone || "")) updates.phone = formData.phone || null;
    if (formData.nickname !== ((player as any).nickname || "")) updates.nickname = formData.nickname;
    if (formData.gender !== (activeProfile?.gender || "")) updates.gender = formData.gender;
    if (formData.category !== (activeProfile?.grade || activeProfile?.category || "C3")) updates.category = formData.category;
    if (formData.clubId && formData.clubId !== activeProfile?.clubId) updates.clubId = formData.clubId;

    const origDob = player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : "";
    if (formData.dateOfBirth !== origDob) updates.dateOfBirth = formData.dateOfBirth || null;

    if (formData.isJunior !== (player.isJunior || false)) updates.isJunior = formData.isJunior;
    if (formData.parentGuardianName !== (player.parentGuardianName || "")) updates.parentGuardianName = formData.parentGuardianName || null;
    if (formData.parentGuardianEmail !== (player.parentGuardianEmail || "")) updates.parentGuardianEmail = formData.parentGuardianEmail || null;

    if (formData.city !== ((player as any).city || "")) updates.city = formData.city;
    if (formData.country !== ((player as any).country || "")) updates.country = formData.country;
    if (formData.region !== ((player as any).region || "")) updates.region = formData.region;
    if (formData.continent !== ((player as any).continent || "")) updates.continent = formData.continent;
    if (formData.acquisitionSource !== ((player as any).acquisitionSource || "")) updates.acquisitionSource = formData.acquisitionSource;
    if (formData.acquisitionSourceOther !== ((player as any).acquisitionSourceOther || "")) updates.acquisitionSourceOther = formData.acquisitionSourceOther;
    if (formData.clubRole !== ((activeProfile as any)?.clubRole || "PLAYER")) updates.clubRole = formData.clubRole;
    if (formData.playerStatus !== (activeProfile?.playerStatus || "ACTIVE")) updates.playerStatus = formData.playerStatus;
    if (formData.membershipStatus !== ((activeProfile as any)?.membershipStatus || "APPROVED")) updates.membershipStatus = formData.membershipStatus;

    if (Number(formData.rankingPoints) !== (activeProfile?.rankingPoints || 0)) updates.rankingPoints = Number(formData.rankingPoints);
    if (Number(formData.matchesPlayed) !== (activeProfile?.matchesPlayed || 0)) updates.matchesPlayed = Number(formData.matchesPlayed);
    if (Number(formData.matchesWon) !== (activeProfile?.matchesWon || 0)) updates.matchesWon = Number(formData.matchesWon);

    if (formData.password) updates.password = formData.password;

    await updatePlayer(updates);
    onClose();
  };

  const { data: reliabilityData } = useQuery<{ score: number; totalSessions: number; paidOnTime: number; unpaid: number; outstandingAmount: number; preferredMethod: string }>({
    queryKey: ["/api/players", activeProfile?.id, "payment-reliability"],
    enabled: open && !!activeProfile?.id,
  });

  return (
    <>
      <UnifiedMemberEditDialog
        open={open}
        onClose={onClose}
        data={editData}
        onSave={handleSave}
        isSaving={isPending}
        context="admin"
        clubs={clubs}
        showKPIs={true}
        showClubActions={!!activeProfile}
        playerStatusValue={activeProfile?.playerStatus}
        onBan={() => banMutation.mutate()}
        isBanning={banMutation.isPending}
        onRemove={() => removeMutation.mutate()}
        isRemoving={removeMutation.isPending}
        extraContent={reliabilityData && reliabilityData.totalSessions > 0 ? (
          <div className="p-3 rounded-md border space-y-2" data-testid="payment-reliability-section">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-semibold">Payment Reliability</span>
              <Badge 
                variant="outline" 
                className={`text-xs ml-auto ${
                  reliabilityData.score >= 70 
                    ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" 
                    : reliabilityData.score >= 50 
                      ? "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400" 
                      : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                }`}
                data-testid="badge-reliability-score"
              >
                {reliabilityData.score}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Sessions: {reliabilityData.totalSessions}</span>
              <span>Paid: {reliabilityData.paidOnTime}</span>
              <span>Unpaid: {reliabilityData.unpaid}</span>
              <span>Outstanding: {"\u00A3"}{((reliabilityData.outstandingAmount || 0) / 100).toFixed(2)}</span>
            </div>
          </div>
        ) : undefined}
      />
    </>
  );
}

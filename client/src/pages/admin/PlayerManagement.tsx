import { useState, useMemo, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Shield, Mail, Trophy, Search, Trash2, Ban, Archive, UserPlus, Building2, Pencil, MoreHorizontal, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

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
        <EditMemberDialog
          player={editPlayer}
          clubs={clubs || []}
          open={!!editPlayer}
          onOpenChange={(open) => { if (!open) setEditPlayer(null); }}
          selectedClubFilter={clubFilter}
        />
      )}
    </div>
  );
}

function EditMemberDialog({
  player,
  clubs,
  open,
  onOpenChange,
  selectedClubFilter,
}: {
  player: PlayerData;
  clubs: { id: number; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClubFilter: string;
}) {
  const { toast } = useToast();
  const { mutate: updatePlayer, isPending } = useUpdatePlayer();
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setBanConfirmOpen(false);
      onOpenChange(false);
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
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setRemoveConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove player", description: err.message, variant: "destructive" });
    },
  });

  const [fullName, setFullName] = useState(player.fullName);
  const [email, setEmail] = useState(player.email);
  const [phone, setPhone] = useState(player.phone || "");
  const [gender, setGender] = useState(activeProfile?.gender || "");
  const [category, setCategory] = useState(activeProfile?.grade || activeProfile?.category || "C3");
  const [clubId, setClubId] = useState(activeProfile?.clubId?.toString() || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : ""
  );
  const [isJunior, setIsJunior] = useState(player.isJunior || false);
  const [parentGuardianName, setParentGuardianName] = useState(player.parentGuardianName || "");
  const [parentGuardianEmail, setParentGuardianEmail] = useState(player.parentGuardianEmail || "");
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    const updates: any = { id: player.id };

    if (fullName !== player.fullName) updates.fullName = fullName;
    if (email !== player.email) updates.email = email;
    if (phone !== (player.phone || "")) updates.phone = phone || null;
    if (gender !== (activeProfile?.gender || "")) updates.gender = gender;
    if (category !== (activeProfile?.grade || activeProfile?.category || "C3")) updates.category = category;
    if (clubId && Number(clubId) !== activeProfile?.clubId) updates.clubId = Number(clubId);

    const origDob = player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : "";
    if (dateOfBirth !== origDob) updates.dateOfBirth = dateOfBirth || null;

    if (isJunior !== (player.isJunior || false)) updates.isJunior = isJunior;
    if (parentGuardianName !== (player.parentGuardianName || "")) updates.parentGuardianName = parentGuardianName || null;
    if (parentGuardianEmail !== (player.parentGuardianEmail || "")) updates.parentGuardianEmail = parentGuardianEmail || null;
    if (newPassword.trim()) updates.password = newPassword;

    updatePlayer(updates, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
  <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Member
          </DialogTitle>
          <DialogDescription>
            Update {player.fullName}'s details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
              <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{player.fullName}</p>
              <p className="text-sm text-muted-foreground">{player.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="input-edit-fullname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-edit-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xxx xxxxxx"
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dob">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                data-testid="input-edit-dob"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category / Grade</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Club</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger data-testid="select-edit-club">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <div>
              <Label htmlFor="edit-isJunior" className="font-medium">Junior Player</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Under 18 years old</p>
            </div>
            <Switch
              id="edit-isJunior"
              checked={isJunior}
              onCheckedChange={setIsJunior}
              data-testid="switch-edit-junior"
            />
          </div>

          {isJunior && (
            <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-primary/30">
              <div className="space-y-1.5">
                <Label htmlFor="edit-guardian-name">Parent/Guardian Name</Label>
                <Input
                  id="edit-guardian-name"
                  value={parentGuardianName}
                  onChange={(e) => setParentGuardianName(e.target.value)}
                  placeholder="Guardian name"
                  data-testid="input-edit-guardian-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-guardian-email">Parent/Guardian Email</Label>
                <Input
                  id="edit-guardian-email"
                  type="email"
                  value={parentGuardianEmail}
                  onChange={(e) => setParentGuardianEmail(e.target.value)}
                  placeholder="guardian@email.com"
                  data-testid="input-edit-guardian-email"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Reset Password</Label>
            <Input
              id="edit-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              data-testid="input-edit-password"
            />
            <p className="text-xs text-muted-foreground">Only fill this if you want to change the member's password.</p>
          </div>
        </div>

        {activeProfile && (
          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-semibold text-muted-foreground mb-3">Club Actions</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30"
                onClick={() => setRemoveConfirmOpen(true)}
                data-testid="button-remove-from-club"
              >
                <Trash2 className="w-3 h-3" />
                Remove from Club
              </Button>
              {activeProfile.playerStatus !== "BANNED" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => setBanConfirmOpen(true)}
                  data-testid="button-ban-player"
                >
                  <Ban className="w-3 h-3" />
                  Ban Player
                </Button>
              )}
              {activeProfile.playerStatus === "BANNED" && (
                <Badge variant="destructive" className="no-default-hover-elevate">Currently Banned</Badge>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-member">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
      <AlertDialogContent data-testid="dialog-remove-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Remove from Club
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will completely remove <strong>{player.fullName}</strong>'s profile from this club, including all club-specific data. They will be able to rejoin the club in the future.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            data-testid="button-confirm-remove"
          >
            {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
      <AlertDialogContent data-testid="dialog-ban-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Ban Player
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will ban <strong>{player.fullName}</strong> from this club. They will not be able to join sessions or participate in matches. This action can be reversed by changing their player status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => banMutation.mutate()}
            disabled={banMutation.isPending}
            data-testid="button-confirm-ban"
          >
            {banMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Ban Player
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Club } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Shield, Mail, Trophy, Search, Trash2, Ban, Archive, UserPlus, Building2, Pencil, MoreHorizontal, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ClubPlayer = {
  id: number;
  userId: number;
  clubId: number;
  clubRole: string;
  membershipStatus: string;
  playerStatus: string;
  gender: string | null;
  category: string;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
};

export default function PlayerManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/admin/clubs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/clubs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clubs");
      return res.json();
    },
    enabled: user?.role === "OWNER",
  });
  
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [allocatePlayerId, setAllocatePlayerId] = useState<number | null>(null);
  const [allocateClubIds, setAllocateClubIds] = useState<number[]>([]);
  const [editClubDialogOpen, setEditClubDialogOpen] = useState(false);
  const [editClubName, setEditClubName] = useState("");
  const [editClubLogo, setEditClubLogo] = useState("");

  const { data: players, isLoading: playersLoading } = useQuery<ClubPlayer[]>({
    queryKey: ["/api/admin/clubs", selectedClubId, "players"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clubs/${selectedClubId}/players`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
    enabled: selectedClubId !== null,
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ profileIds, action }: { profileIds: number[], action: string }) => {
      return apiRequest("/api/admin/players/bulk-action", "POST", { profileIds, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs", selectedClubId, "players"] });
      setSelectedPlayers([]);
      toast({ title: "Success", description: "Bulk action completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to perform action", variant: "destructive" });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (profileId: number) => {
      const res = await fetch(`/api/admin/players/${profileId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete player");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs", selectedClubId, "players"] });
      toast({ title: "Success", description: "Player deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete player", variant: "destructive" });
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async ({ userId, clubIds }: { userId: number, clubIds: number[] }) => {
      return apiRequest(`/api/admin/players/${userId}/allocate`, "POST", { clubIds });
    },
    onSuccess: () => {
      setAllocateDialogOpen(false);
      setAllocatePlayerId(null);
      setAllocateClubIds([]);
      toast({ title: "Success", description: "Player allocated to clubs successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to allocate player", variant: "destructive" });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: async ({ clubId, name, logoUrl }: { clubId: number, name: string, logoUrl: string }) => {
      return apiRequest(`/api/clubs/${clubId}`, "PATCH", { name, logoUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditClubDialogOpen(false);
      toast({ title: "Success", description: "Club updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update club", variant: "destructive" });
    },
  });

  const selectedClub = clubs?.find(c => c.id === selectedClubId);

  const filteredPlayers = players?.filter(p => 
    p.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSelectAll = () => {
    if (selectedPlayers.length === filteredPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map(p => p.id));
    }
  };

  const handleSelectPlayer = (profileId: number) => {
    setSelectedPlayers(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleBulkAction = (action: string) => {
    setPendingAction(action);
    setBulkActionDialogOpen(true);
  };

  const confirmBulkAction = () => {
    if (pendingAction && selectedPlayers.length > 0) {
      bulkActionMutation.mutate({ profileIds: selectedPlayers, action: pendingAction });
    }
    setBulkActionDialogOpen(false);
    setPendingAction(null);
  };

  const openAllocateDialog = (player: ClubPlayer) => {
    setAllocatePlayerId(player.userId);
    setAllocateClubIds([]);
    setAllocateDialogOpen(true);
  };

  const openEditClubDialog = () => {
    if (selectedClub) {
      setEditClubName(selectedClub.name);
      setEditClubLogo(selectedClub.logoUrl || "");
      setEditClubDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "SUSPENDED": return <Badge variant="destructive">Suspended</Badge>;
      case "ARCHIVED": return <Badge variant="secondary">Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "A": return "text-green-500";
      case "B": return "text-blue-500";
      case "C": return "text-orange-500";
      case "D": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  if (user?.role !== "OWNER") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must be a Super Admin to access this page.</p>
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
            Player Management
          </h1>
          <p className="text-muted-foreground">Manage players across all clubs</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Club
          </CardTitle>
          <CardDescription>Choose a club to view and manage its players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Select 
              value={selectedClubId?.toString() || ""} 
              onValueChange={(v) => {
                setSelectedClubId(Number(v));
                setSelectedPlayers([]);
              }}
            >
              <SelectTrigger className="w-72" data-testid="select-club">
                <SelectValue placeholder="Select a club..." />
              </SelectTrigger>
              <SelectContent>
                {clubs?.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    <div className="flex items-center gap-2">
                      {club.logoUrl && (
                        <img src={club.logoUrl} alt="" className="w-5 h-5 rounded object-cover" />
                      )}
                      {club.name}
                      <Badge variant="outline" className="ml-2">{club.status}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedClub && (
              <Button variant="outline" size="sm" onClick={openEditClubDialog} data-testid="button-edit-club">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Club
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClubId && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search players..." 
                className="pl-10" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-players"
              />
            </div>

            {selectedPlayers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedPlayers.length} selected</span>
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
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Players in {selectedClub?.name} ({filteredPlayers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {playersLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading players...</div>
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No players found in this club
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedPlayers.length === filteredPlayers.length && filteredPlayers.length > 0}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Club Role</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Ranking</TableHead>
                        <TableHead>Stats</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player) => (
                        <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedPlayers.includes(player.id)}
                              onCheckedChange={() => handleSelectPlayer(player.id)}
                              data-testid={`checkbox-player-${player.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.user.fullName}`} />
                                <AvatarFallback>{player.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{player.user.fullName}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {player.user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(player.playerStatus || "ACTIVE")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Shield className="h-3 w-3 mr-1" />
                              {player.clubRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${getCategoryColor(player.category)}`}>
                              {player.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{player.rankingPoints}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span>{player.matchesWon}/{player.matchesPlayed}</span>
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
                                <DropdownMenuItem onClick={() => openAllocateDialog(player)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Allocate to Clubs
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {player.playerStatus !== "ACTIVE" && (
                                  <DropdownMenuItem onClick={() => bulkActionMutation.mutate({ profileIds: [player.id], action: "activate" })}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                                {player.playerStatus !== "SUSPENDED" && (
                                  <DropdownMenuItem onClick={() => bulkActionMutation.mutate({ profileIds: [player.id], action: "suspend" })}>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                {player.playerStatus !== "ARCHIVED" && (
                                  <DropdownMenuItem onClick={() => bulkActionMutation.mutate({ profileIds: [player.id], action: "archive" })}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => deletePlayerMutation.mutate(player.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {pendingAction} {selectedPlayers.length} player(s)?
              {pendingAction === "delete" && " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction} className={pendingAction === "delete" ? "bg-destructive text-destructive-foreground" : ""}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Player to Clubs</DialogTitle>
            <DialogDescription>Select additional clubs for this player to join</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {clubs?.filter(c => c.id !== selectedClubId).map(club => (
              <div key={club.id} className="flex items-center gap-3">
                <Checkbox 
                  id={`club-${club.id}`}
                  checked={allocateClubIds.includes(club.id)}
                  onCheckedChange={(checked) => {
                    setAllocateClubIds(prev => 
                      checked 
                        ? [...prev, club.id]
                        : prev.filter(id => id !== club.id)
                    );
                  }}
                />
                <label htmlFor={`club-${club.id}`} className="flex items-center gap-2 cursor-pointer">
                  {club.logoUrl && (
                    <img src={club.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                  )}
                  {club.name}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => allocatePlayerId && allocateMutation.mutate({ userId: allocatePlayerId, clubIds: allocateClubIds })}
              disabled={allocateClubIds.length === 0 || allocateMutation.isPending}
            >
              {allocateMutation.isPending ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editClubDialogOpen} onOpenChange={setEditClubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
            <DialogDescription>Update club name and logo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Club Name</label>
              <Input 
                value={editClubName}
                onChange={(e) => setEditClubName(e.target.value)}
                placeholder="Club name"
                data-testid="input-edit-club-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <Input 
                value={editClubLogo}
                onChange={(e) => setEditClubLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                data-testid="input-edit-club-logo"
              />
              {editClubLogo && (
                <div className="mt-2">
                  <img src={editClubLogo} alt="Logo preview" className="w-16 h-16 rounded object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClubDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedClubId && updateClubMutation.mutate({ 
                clubId: selectedClubId, 
                name: editClubName, 
                logoUrl: editClubLogo 
              })}
              disabled={!editClubName || updateClubMutation.isPending}
            >
              {updateClubMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

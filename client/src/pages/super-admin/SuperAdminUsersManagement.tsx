import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Users, Shield, ArrowLeft, Search, Loader2, Trophy, Clock,
  KeyRound, CheckCircle, XCircle, Pencil, Trash2, ChevronRight,
  Filter, Eye, Lock, UserCheck, Copy, AlertTriangle, Plus, Building2
} from "lucide-react";

interface PlayerProfile {
  id: number;
  userId: number;
  clubId: number;
  clubRole: string;
  membershipStatus: string;
  playerStatus: string;
  gender: string | null;
  category: string | null;
  grade?: string | null;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
  clubName: string;
  clubCity: string;
}

interface ComprehensiveUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  dateOfBirth: string | null;
  isJunior: boolean;
  phone: string | null;
  parentGuardianName: string | null;
  parentGuardianEmail: string | null;
  continent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  nickname: string | null;
  showPublicName: boolean;
  createdAt: string;
  profiles: PlayerProfile[];
  totalMatchesWon: number;
  totalMatchesPlayed: number;
}

interface PendingUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  accountStatus: string;
  phone?: string;
  city?: string;
  country?: string;
  region?: string;
  continent?: string;
  nickname?: string;
  dateOfBirth?: string;
  isJunior?: boolean;
  parentGuardianName?: string;
  parentGuardianEmail?: string;
  createdAt?: string;
}

interface PasswordResetUser {
  id: number;
  fullName: string;
  email: string;
  passwordResetToken: string;
  passwordResetExpiry: string;
}

export default function SuperAdminUsersManagement() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterClub, setFilterClub] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [resetsOpen, setResetsOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingUser | null>(null);
  const [selectedReset, setSelectedReset] = useState<PasswordResetUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedBulk, setSelectedBulk] = useState<number[]>([]);

  const [selectedPlayer, setSelectedPlayer] = useState<ComprehensiveUser | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [profileEditForm, setProfileEditForm] = useState<Record<number, Record<string, any>>>({});
  const [passwordMode, setPasswordMode] = useState<"none" | "set" | "link">("none");
  const [playerNewPassword, setPlayerNewPassword] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [assignClubId, setAssignClubId] = useState("");
  const [assignClubRole, setAssignClubRole] = useState("PLAYER");
  const [assignGrade, setAssignGrade] = useState("C3");
  const [showAssignClub, setShowAssignClub] = useState(false);
  const [selectedProfileClub, setSelectedProfileClub] = useState<string>("all");

  const { data: players, isLoading } = useQuery<ComprehensiveUser[]>({
    queryKey: ["/api/super-admin/players-comprehensive"],
  });

  const { data: pendingUsers } = useQuery<PendingUser[]>({
    queryKey: ["/api/admin/pending-users"],
  });

  const { data: passwordResets } = useQuery<PasswordResetUser[]>({
    queryKey: ["/api/admin/password-resets"],
  });

  const { data: allClubs } = useQuery<{ id: number; name: string; status: string }[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const assignToClubMutation = useMutation({
    mutationFn: async ({ userId, clubId, clubRole, grade }: { userId: number; clubId: number; clubRole: string; grade: string }) => {
      const res = await apiRequest("POST", "/api/god-mode/assign-user-to-club", { userId, clubId, clubRole, grade });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      setShowAssignClub(false);
      setAssignClubId("");
      setAssignClubRole("PLAYER");
      setAssignGrade("C3");
      toast({ title: "Assigned", description: "User has been assigned to the club." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      toast({ title: "Approved", description: "User has been approved." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      setSelectedApproval(null);
      toast({ title: "Rejected", description: "User has been rejected." });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const res = await apiRequest("POST", "/api/admin/users/bulk-action", { userIds, action: "approve" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      setSelectedBulk([]);
      toast({ title: "Bulk Approved", description: "All selected users have been approved." });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/set-password", { userId, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-resets"] });
      setNewPassword("");
      setSelectedReset(null);
      toast({ title: "Password Set", description: "Password has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateResetLinkMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/super-admin/users/${userId}/reset-password`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reset Link Generated", description: "Copy the link and share it with the user." });
      return data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      toast({ title: "Updated", description: "User details have been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/player-profiles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      toast({ title: "Profile Updated", description: "Player profile has been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      setSelectedPlayer(null);
      setDeleteConfirmOpen(false);
      toast({ title: "Deleted", description: "User and all records have been completely removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const playerSetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/set-password", { userId, password });
      return res.json();
    },
    onSuccess: () => {
      setPasswordMode("none");
      setPlayerNewPassword("");
      toast({ title: "Password Set", description: "Password has been updated for this player." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const playerResetLinkMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/super-admin/users/${userId}/reset-password`);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedLink(window.location.origin + data.resetLink);
      setPasswordMode("link");
      toast({ title: "Reset Link Generated" });
    },
  });

  const clubs = useMemo(() => {
    if (!players) return [];
    const s = new Set<string>();
    players.forEach(p => p.profiles.forEach(pr => s.add(pr.clubName)));
    return Array.from(s).sort();
  }, [players]);

  const cities = useMemo(() => {
    if (!players) return [];
    const s = new Set<string>();
    players.forEach(p => { if (p.city) s.add(p.city); });
    return Array.from(s).sort();
  }, [players]);

  const filtered = useMemo(() => {
    if (!players) return [];
    return players.filter(p => {
      if (search) {
        const s = search.toLowerCase();
        if (!p.fullName.toLowerCase().includes(s) && !p.email.toLowerCase().includes(s) && !(p.nickname || "").toLowerCase().includes(s)) return false;
      }
      if (filterGender !== "all") {
        const hasGender = p.profiles.some(pr => pr.gender === filterGender);
        if (!hasGender) return false;
      }
      if (filterClub !== "all") {
        const hasClub = p.profiles.some(pr => pr.clubName === filterClub);
        if (!hasClub) return false;
      }
      if (filterCity !== "all" && p.city !== filterCity) return false;
      if (filterGrade !== "all") {
        const hasGrade = p.profiles.some(pr => (pr.grade || pr.category) === filterGrade);
        if (!hasGrade) return false;
      }
      return true;
    });
  }, [players, search, filterGender, filterClub, filterCity, filterGrade]);

  const openPlayerDetail = (player: ComprehensiveUser) => {
    setSelectedPlayer(player);
    setEditMode(false);
    setPasswordMode("none");
    setPlayerNewPassword("");
    setGeneratedLink("");
    setShowAssignClub(false);
    setSelectedProfileClub("all");
    setEditForm({
      fullName: player.fullName,
      email: player.email,
      phone: player.phone || "",
      city: player.city || "",
      country: player.country || "",
      region: player.region || "",
      continent: player.continent || "",
      nickname: player.nickname || "",
      role: player.role,
      accountStatus: player.accountStatus,
      dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().split("T")[0] : "",
      isJunior: player.isJunior,
      parentGuardianName: player.parentGuardianName || "",
      parentGuardianEmail: player.parentGuardianEmail || "",
      showPublicName: player.showPublicName,
    });
    const pf: Record<number, Record<string, any>> = {};
    player.profiles.forEach(pr => {
      pf[pr.id] = { gender: pr.gender || "", category: pr.grade || pr.category || "C3", clubRole: pr.clubRole || "PLAYER", membershipStatus: pr.membershipStatus || "PENDING", playerStatus: pr.playerStatus || "ACTIVE" };
    });
    setProfileEditForm(pf);
  };

  const savePlayerEdits = async () => {
    if (!selectedPlayer) return;
    await updateUserMutation.mutateAsync({
      id: selectedPlayer.id,
      data: {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || null,
        city: editForm.city || null,
        country: editForm.country || null,
        region: editForm.region || null,
        continent: editForm.continent || null,
        role: editForm.role,
        accountStatus: editForm.accountStatus,
        dateOfBirth: editForm.dateOfBirth || null,
        isJunior: editForm.isJunior,
        parentGuardianName: editForm.parentGuardianName || null,
        parentGuardianEmail: editForm.parentGuardianEmail || null,
      },
    });
    for (const [profileIdStr, updates] of Object.entries(profileEditForm)) {
      const profileId = parseInt(profileIdStr);
      await updateProfileMutation.mutateAsync({ id: profileId, data: updates });
    }
    setEditMode(false);
  };

  const handleApproveAndNext = (userId: number) => {
    approveMutation.mutate(userId);
    setSelectedApproval(null);
  };

  const winRate = (won: number, played: number) => {
    if (played === 0) return "0%";
    return `${Math.round((won / played) * 100)}%`;
  };

  return (
    <div className="space-y-6" data-testid="users-management-page">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/super-admin">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-users-title">
            <Users className="w-7 h-7 text-blue-500" />
            Users Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage all users, approvals, and player rankings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={() => setApprovalsOpen(true)} data-testid="card-pending-approvals">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                <UserCheck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingUsers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setResetsOpen(true)} data-testid="card-password-resets">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10">
                <KeyRound className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{passwordResets?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Password Resets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-users">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-ranked-players">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <Trophy className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players?.filter(p => p.totalMatchesPlayed > 0).length || 0}</p>
                <p className="text-xs text-muted-foreground">Ranked Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or nickname..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2" data-testid="button-toggle-filters">
              <Filter className="w-4 h-4" />
              Filters
              {(filterGender !== "all" || filterClub !== "all" || filterCity !== "all" || filterGrade !== "all") && (
                <Badge variant="secondary" className="ml-1 text-xs">{[filterGender, filterClub, filterCity, filterGrade].filter(f => f !== "all").length}</Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
              <div>
                <Label className="text-xs text-muted-foreground">Gender</Label>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger data-testid="select-filter-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Club</Label>
                <Select value={filterClub} onValueChange={setFilterClub}>
                  <SelectTrigger data-testid="select-filter-club">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {clubs.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger data-testid="select-filter-city">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Grade</Label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger data-testid="select-filter-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFilterGender("all"); setFilterClub("all"); setFilterCity("all"); setFilterGrade("all"); }} data-testid="button-clear-filters">
                Clear All
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">{filtered.length} users found</div>
              <div className="flex flex-col gap-1">
                {filtered.map((player, idx) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg hover-elevate cursor-pointer border border-border/50 transition-all"
                    onClick={() => openPlayerDetail(player)}
                    data-testid={`user-row-${player.id}`}
                  >
                    <div className="w-8 text-center">
                      <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{player.fullName}</span>
                        {player.accountStatus === "PENDING" && <Badge variant="outline" className="text-xs text-amber-600">Pending</Badge>}
                        {player.role === "OWNER" && <Badge variant="destructive" className="text-xs">Super Admin</Badge>}
                        {player.role === "ADMIN" && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{player.email}</span>
                        {player.city && <span>{player.city}</span>}
                        {player.profiles.length > 0 && (
                          <span>{player.profiles.map(p => p.clubName).join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        <span className="text-sm font-bold">{player.totalMatchesWon}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{player.totalMatchesPlayed} played</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">No users found matching your criteria.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={approvalsOpen} onOpenChange={setApprovalsOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-pending-approvals">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" />
              Pending Approvals ({pendingUsers?.length || 0})
            </DialogTitle>
            <DialogDescription>Review and approve new user registrations.</DialogDescription>
          </DialogHeader>
          {pendingUsers && pendingUsers.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedBulk.length === pendingUsers.length}
                onCheckedChange={(checked) => {
                  setSelectedBulk(checked ? pendingUsers.map(u => u.id) : []);
                }}
                data-testid="checkbox-select-all-approvals"
              />
              <Label className="text-sm cursor-pointer">Select All</Label>
              {selectedBulk.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => bulkApproveMutation.mutate(selectedBulk)}
                  disabled={bulkApproveMutation.isPending}
                  className="ml-auto gap-2"
                  data-testid="button-bulk-approve"
                >
                  {bulkApproveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                  Approve Selected ({selectedBulk.length})
                </Button>
              )}
            </div>
          )}
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {pendingUsers?.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 hover-elevate cursor-pointer"
                data-testid={`approval-item-${u.id}`}
              >
                <Checkbox
                  checked={selectedBulk.includes(u.id)}
                  onCheckedChange={(checked) => {
                    setSelectedBulk(prev => checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                  }}
                />
                <div className="flex-1 min-w-0" onClick={() => setSelectedApproval(u)}>
                  <div className="font-medium text-sm">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedApproval(u)} data-testid={`button-review-${u.id}`}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button size="sm" onClick={() => handleApproveAndNext(u.id)} disabled={approveMutation.isPending} data-testid={`button-quick-approve-${u.id}`}>
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(u.id)} disabled={rejectMutation.isPending} data-testid={`button-quick-reject-${u.id}`}>
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(!pendingUsers || pendingUsers.length === 0) && (
              <p className="text-center py-6 text-muted-foreground text-sm">No pending approvals.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedApproval} onOpenChange={(open) => { if (!open) setSelectedApproval(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-review-approval">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Review Registration
            </DialogTitle>
            <DialogDescription>Review the user's registration details before approving or rejecting.</DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{selectedApproval.fullName}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> <strong>{selectedApproval.email}</strong></div>
                <div><span className="text-muted-foreground">Phone:</span> <strong>{selectedApproval.phone || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">City:</span> <strong>{selectedApproval.city || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">Country:</span> <strong>{selectedApproval.country || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">Region:</span> <strong>{selectedApproval.region || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">Continent:</span> <strong>{selectedApproval.continent || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">Nickname:</span> <strong>{selectedApproval.nickname || "N/A"}</strong></div>
                <div><span className="text-muted-foreground">DOB:</span> <strong>{selectedApproval.dateOfBirth ? new Date(selectedApproval.dateOfBirth).toLocaleDateString() : "N/A"}</strong></div>
                <div><span className="text-muted-foreground">Junior:</span> <strong>{selectedApproval.isJunior ? "Yes" : "No"}</strong></div>
                {selectedApproval.parentGuardianName && (
                  <div className="col-span-2"><span className="text-muted-foreground">Guardian:</span> <strong>{selectedApproval.parentGuardianName} ({selectedApproval.parentGuardianEmail})</strong></div>
                )}
                {selectedApproval.createdAt && (
                  <div className="col-span-2"><span className="text-muted-foreground">Registered:</span> <strong>{new Date(selectedApproval.createdAt).toLocaleString()}</strong></div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => selectedApproval && rejectMutation.mutate(selectedApproval.id)} disabled={rejectMutation.isPending} className="gap-2" data-testid="button-reject-approval">
              <XCircle className="w-4 h-4" /> Reject
            </Button>
            <Button onClick={() => selectedApproval && handleApproveAndNext(selectedApproval.id)} disabled={approveMutation.isPending} className="gap-2" data-testid="button-approve-approval">
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetsOpen} onOpenChange={setResetsOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-password-resets">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-500" />
              Password Reset Requests ({passwordResets?.length || 0})
            </DialogTitle>
            <DialogDescription>Manage pending password reset requests.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {passwordResets?.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 hover-elevate cursor-pointer"
                onClick={() => { setSelectedReset(u); setNewPassword(""); }}
                data-testid={`reset-item-${u.id}`}
              >
                <KeyRound className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
            {(!passwordResets || passwordResets.length === 0) && (
              <p className="text-center py-6 text-muted-foreground text-sm">No pending password resets.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedReset} onOpenChange={(open) => { if (!open) setSelectedReset(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-reset-action">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-500" />
              Password Reset: {selectedReset?.fullName}
            </DialogTitle>
            <DialogDescription>{selectedReset?.email}</DialogDescription>
          </DialogHeader>
          {selectedReset && (
            <div className="space-y-4">
              <div>
                <Label>Set New Password</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    data-testid="input-new-password-reset"
                  />
                  <Button
                    onClick={() => setPasswordMutation.mutate({ userId: selectedReset.id, password: newPassword })}
                    disabled={newPassword.length < 6 || setPasswordMutation.isPending}
                    data-testid="button-set-password-reset"
                  >
                    {setPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
                  </Button>
                </div>
              </div>
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => generateResetLinkMutation.mutate(selectedReset.id)}
                  disabled={generateResetLinkMutation.isPending}
                  data-testid="button-generate-reset-link"
                >
                  {generateResetLinkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Generate Password Reset Link
                </Button>
                {generateResetLinkMutation.data?.resetLink && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs break-all flex items-start gap-2">
                    <span className="flex-1">{window.location.origin + generateResetLinkMutation.data.resetLink}</span>
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(window.location.origin + generateResetLinkMutation.data.resetLink); toast({ title: "Copied" }); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPlayer} onOpenChange={(open) => { if (!open) { setSelectedPlayer(null); setEditMode(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-player-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editMode ? <Pencil className="w-5 h-5 text-primary" /> : <Eye className="w-5 h-5 text-primary" />}
              {editMode ? "Edit Player" : "Player Details"}
            </DialogTitle>
            <DialogDescription>{selectedPlayer?.email}</DialogDescription>
          </DialogHeader>

          {selectedPlayer && !editMode && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="py-3 px-3 text-center">
                    <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedPlayer.totalMatchesWon}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 px-3 text-center">
                    <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{selectedPlayer.totalMatchesPlayed}</p>
                    <p className="text-xs text-muted-foreground">Played</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 px-3 text-center">
                    <Trophy className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{winRate(selectedPlayer.totalMatchesWon, selectedPlayer.totalMatchesPlayed)}</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Personal Information</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <strong>{selectedPlayer.fullName}</strong></div>
                  <div><span className="text-muted-foreground">Email:</span> <strong>{selectedPlayer.email}</strong></div>
                  <div><span className="text-muted-foreground">Phone:</span> <strong>{selectedPlayer.phone || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">Nickname:</span> <strong>{selectedPlayer.nickname || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">City:</span> <strong>{selectedPlayer.city || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">Country:</span> <strong>{selectedPlayer.country || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">Region:</span> <strong>{selectedPlayer.region || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">Continent:</span> <strong>{selectedPlayer.continent || "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">DOB:</span> <strong>{selectedPlayer.dateOfBirth ? new Date(selectedPlayer.dateOfBirth).toLocaleDateString() : "N/A"}</strong></div>
                  <div><span className="text-muted-foreground">Junior:</span> <strong>{selectedPlayer.isJunior ? "Yes" : "No"}</strong></div>
                  <div><span className="text-muted-foreground">Role:</span> <strong>{selectedPlayer.role}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <strong>{selectedPlayer.accountStatus}</strong></div>
                  <div><span className="text-muted-foreground">Public Name:</span> <strong>{selectedPlayer.showPublicName ? "Visible" : "Hidden"}</strong></div>
                  <div><span className="text-muted-foreground">Joined:</span> <strong>{new Date(selectedPlayer.createdAt).toLocaleDateString()}</strong></div>
                  {selectedPlayer.parentGuardianName && (
                    <div className="col-span-2"><span className="text-muted-foreground">Guardian:</span> <strong>{selectedPlayer.parentGuardianName} ({selectedPlayer.parentGuardianEmail})</strong></div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="text-sm font-semibold text-muted-foreground border-b pb-1 flex-1">Club Profiles ({selectedPlayer.profiles.length})</div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAssignClub(!showAssignClub)} data-testid="button-assign-to-club">
                    <Plus className="w-3 h-3" /> Assign to Club
                  </Button>
                </div>

                {showAssignClub && (
                  <div className="p-3 rounded-lg border border-border/50 mb-3 space-y-3 bg-muted/30" data-testid="panel-assign-club">
                    <div className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Assign to New Club</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Club</Label>
                        <Select value={assignClubId} onValueChange={setAssignClubId}>
                          <SelectTrigger data-testid="select-assign-club"><SelectValue placeholder="Select club..." /></SelectTrigger>
                          <SelectContent>
                            {allClubs?.filter(c => !selectedPlayer.profiles.some(p => p.clubId === c.id)).map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={assignClubRole} onValueChange={setAssignClubRole}>
                          <SelectTrigger data-testid="select-assign-role"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLAYER">Player</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="OWNER">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Grade</Label>
                        <Select value={assignGrade} onValueChange={setAssignGrade}>
                          <SelectTrigger data-testid="select-assign-grade"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!assignClubId || assignToClubMutation.isPending}
                      onClick={() => assignToClubMutation.mutate({ userId: selectedPlayer.id, clubId: Number(assignClubId), clubRole: assignClubRole, grade: assignGrade })}
                      data-testid="button-confirm-assign"
                    >
                      {assignToClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      Assign
                    </Button>
                  </div>
                )}

                {selectedPlayer.profiles.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPlayer.profiles.map(pr => (
                      <div key={pr.id} className="p-3 rounded-lg border border-border/50 text-sm">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <strong>{pr.clubName}</strong>
                          <Badge variant="outline" className="text-xs">{pr.clubRole}</Badge>
                          <Badge variant="outline" className="text-xs">{pr.membershipStatus}</Badge>
                          <Badge variant="outline" className={`text-xs ${pr.playerStatus === "ACTIVE" ? "text-green-600" : pr.playerStatus === "SUSPENDED" ? "text-red-600" : "text-muted-foreground"}`}>
                            {pr.playerStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>Gender: {pr.gender || "N/A"}</span>
                          <span>Grade: {pr.grade || pr.category || "N/A"}</span>
                          <span>W: {pr.matchesWon} / P: {pr.matchesPlayed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Not a member of any club yet.</p>
                )}
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="text-sm font-semibold text-muted-foreground">Password Management</div>
                {passwordMode === "none" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setPasswordMode("set")} data-testid="button-player-set-password">
                      <Lock className="w-3 h-3" /> Set New Password
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => playerResetLinkMutation.mutate(selectedPlayer.id)} disabled={playerResetLinkMutation.isPending} data-testid="button-player-reset-link">
                      {playerResetLinkMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                      Generate Reset Link
                    </Button>
                  </div>
                )}
                {passwordMode === "set" && (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={playerNewPassword}
                      onChange={(e) => setPlayerNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      data-testid="input-player-new-password"
                    />
                    <Button onClick={() => playerSetPasswordMutation.mutate({ userId: selectedPlayer.id, password: playerNewPassword })} disabled={playerNewPassword.length < 6 || playerSetPasswordMutation.isPending} data-testid="button-confirm-set-password">
                      {playerSetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setPasswordMode("none"); setPlayerNewPassword(""); }}>Cancel</Button>
                  </div>
                )}
                {passwordMode === "link" && generatedLink && (
                  <div className="p-2 bg-muted rounded text-xs break-all flex items-start gap-2">
                    <span className="flex-1">{generatedLink}</span>
                    <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedLink); toast({ title: "Copied" }); }} data-testid="button-copy-reset-link">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPlayer && editMode && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Personal Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-edit-fullname" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} data-testid="input-edit-email" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-edit-phone" />
                  </div>
                  <div>
                    <Label>Nickname</Label>
                    <Input value={editForm.nickname} onChange={(e) => setEditForm(f => ({ ...f, nickname: e.target.value }))} data-testid="input-edit-nickname" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={editForm.country} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} data-testid="input-edit-country" />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Input value={editForm.region} onChange={(e) => setEditForm(f => ({ ...f, region: e.target.value }))} data-testid="input-edit-region" />
                  </div>
                  <div>
                    <Label>Continent</Label>
                    <Input value={editForm.continent} onChange={(e) => setEditForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-edit-continent" />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-edit-dob" />
                  </div>
                  <div>
                    <Label>Platform Role</Label>
                    <Select value={editForm.role} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger data-testid="select-edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLAYER">Player</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="OWNER">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Account Status</Label>
                    <Select value={editForm.accountStatus} onValueChange={(v) => setEditForm(f => ({ ...f, accountStatus: v }))}>
                      <SelectTrigger data-testid="select-edit-account-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Checkbox id="editJunior" checked={editForm.isJunior} onCheckedChange={(v) => setEditForm(f => ({ ...f, isJunior: !!v }))} data-testid="checkbox-edit-junior" />
                    <Label htmlFor="editJunior" className="cursor-pointer">Junior Player</Label>
                  </div>
                  {editForm.isJunior && (
                    <>
                      <div>
                        <Label>Guardian Name</Label>
                        <Input value={editForm.parentGuardianName} onChange={(e) => setEditForm(f => ({ ...f, parentGuardianName: e.target.value }))} data-testid="input-edit-guardian-name" />
                      </div>
                      <div>
                        <Label>Guardian Email</Label>
                        <Input value={editForm.parentGuardianEmail} onChange={(e) => setEditForm(f => ({ ...f, parentGuardianEmail: e.target.value }))} data-testid="input-edit-guardian-email" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedPlayer.profiles.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Club Profiles</div>
                  {selectedPlayer.profiles.length > 1 && (
                    <div className="mb-3">
                      <Label className="text-xs">Filter by Club</Label>
                      <Select value={selectedProfileClub} onValueChange={setSelectedProfileClub}>
                        <SelectTrigger data-testid="select-filter-profile-club"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Clubs</SelectItem>
                          {selectedPlayer.profiles.map(pr => (
                            <SelectItem key={pr.id} value={String(pr.clubId)}>{pr.clubName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-4">
                    {selectedPlayer.profiles
                      .filter(pr => selectedProfileClub === "all" || String(pr.clubId) === selectedProfileClub)
                      .map(pr => (
                      <div key={pr.id} className="p-3 rounded-lg border border-border/50">
                        <div className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {pr.clubName}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Gender</Label>
                            <Select value={profileEditForm[pr.id]?.gender || ""} onValueChange={(v) => setProfileEditForm(pf => ({ ...pf, [pr.id]: { ...pf[pr.id], gender: v } }))}>
                              <SelectTrigger data-testid={`select-profile-gender-${pr.id}`}>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Grade</Label>
                            <Select value={profileEditForm[pr.id]?.category || "C3"} onValueChange={(v) => setProfileEditForm(pf => ({ ...pf, [pr.id]: { ...pf[pr.id], category: v } }))}>
                              <SelectTrigger data-testid={`select-profile-grade-${pr.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Club Role</Label>
                            <Select value={profileEditForm[pr.id]?.clubRole || "PLAYER"} onValueChange={(v) => setProfileEditForm(pf => ({ ...pf, [pr.id]: { ...pf[pr.id], clubRole: v } }))}>
                              <SelectTrigger data-testid={`select-profile-role-${pr.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PLAYER">Player</SelectItem>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="OWNER">Owner</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Membership</Label>
                            <Select value={profileEditForm[pr.id]?.membershipStatus || "PENDING"} onValueChange={(v) => setProfileEditForm(pf => ({ ...pf, [pr.id]: { ...pf[pr.id], membershipStatus: v } }))}>
                              <SelectTrigger data-testid={`select-profile-membership-${pr.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Player Status</Label>
                            <Select value={profileEditForm[pr.id]?.playerStatus || "ACTIVE"} onValueChange={(v) => setProfileEditForm(pf => ({ ...pf, [pr.id]: { ...pf[pr.id], playerStatus: v } }))}>
                              <SelectTrigger data-testid={`select-profile-player-status-${pr.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!editMode && selectedPlayer && (
              <>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-player">
                  <Trash2 className="w-3 h-3" /> Delete Profile
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setSelectedPlayer(null)}>Close</Button>
                <Button onClick={() => setEditMode(true)} className="gap-2" data-testid="button-edit-player">
                  <Pencil className="w-4 h-4" /> Edit Details
                </Button>
              </>
            )}
            {editMode && (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={savePlayerEdits} disabled={updateUserMutation.isPending || updateProfileMutation.isPending} data-testid="button-save-player">
                  {(updateUserMutation.isPending || updateProfileMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save All Changes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete User Permanently
            </DialogTitle>
            <DialogDescription>
              This will completely remove <strong>{selectedPlayer?.fullName}</strong> and ALL their records from the system. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedPlayer && deleteUserMutation.mutate(selectedPlayer.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Yes, Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

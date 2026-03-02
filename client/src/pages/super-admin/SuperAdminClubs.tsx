import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Building2, Search, Loader2, Pencil, Trash2, CheckCircle, XCircle,
  Clock, ChevronLeft, ChevronRight, Zap, Shield, UserPlus, ArrowRightLeft, MapPin, Users, Archive, Pause, Play,
  Mail, Key, Save, Send, AlertTriangle, User, ShieldAlert, UserMinus, Ban, DollarSign, MessageSquare, Crown
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface ClubRecord {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId?: number;
  status: string;
  isActive: boolean;
  city?: string;
  postcode?: string;
  country?: string;
  address?: string;
  createdAt: string;
  contactFullName?: string;
  contactPhone?: string;
  contactAddress?: string;
  continent?: string;
  region?: string;
  isRegisteredWithBE?: boolean;
  beRegistrationNumber?: string;
  hasCompetitions?: boolean;
  hasSocialGames?: boolean;
  socialGameTimings?: string;
  providesTraining?: boolean;
  trainingDetails?: string;
  sessionFee?: number;
  hasMembership?: boolean;
  membershipFee?: number;
  shuttlecockType?: string;
  providesClubTShirts?: boolean;
  ageGroups?: string[];
  playerLevels?: string[];
  latitude?: string;
  longitude?: string;
  googleMapsUrl?: string;
  logoUrl?: string;
  sportTypes?: string[];
  planType?: string;
  planStatus?: string;
  premiumStartDate?: string;
  premiumEndDate?: string;
  ownerId_user?: { email?: string; fullName?: string };
}

interface ClubEditForm {
  name: string;
  description: string;
  status: string;
  address: string;
  city: string;
  postcode: string;
  region: string;
  country: string;
  continent: string;
  contactFullName: string;
  contactPhone: string;
  contactAddress: string;
  hasCompetitions: boolean;
  hasSocialGames: boolean;
  socialGameTimings: string;
  providesTraining: boolean;
  trainingDetails: string;
  sessionFee: string;
  hasMembership: boolean;
  membershipFee: string;
  shuttlecockType: string;
  providesClubTShirts: boolean;
  isRegisteredWithBE: boolean;
  beRegistrationNumber: string;
}

interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface MemberRecord {
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
  user?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string;
    nickname?: string;
    city?: string;
    country?: string;
    region?: string;
    continent?: string;
    dateOfBirth?: string;
    isJunior?: boolean;
    parentGuardianName?: string;
    parentGuardianEmail?: string;
    role?: string;
  };
}

interface PendingMember {
  id: number;
  userId: number;
  clubRole: string;
  membershipStatus: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface UserDetailFormData {
  fullName: string;
  email: string;
  phone: string;
  nickname: string;
  city: string;
  country: string;
  region: string;
  continent: string;
  dateOfBirth: string;
  isJunior: boolean;
  parentGuardianName: string;
  parentGuardianEmail: string;
  gender: string;
  category: string;
  clubRole: string;
  playerStatus: string;
  role: string;
  joinedAt: string;
}

function MembersManagementDialog({
  club,
  open,
  onClose,
}: {
  club: ClubRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [memberSearch, setMemberSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailMember, setDetailMember] = useState<MemberRecord | null>(null);
  const [activeTab, setActiveTab] = useState("members");

  useEffect(() => {
    if (!open) {
      setMemberSearch("");
      setGenderFilter("ALL");
      setCategoryFilter("ALL");
      setStatusFilter("ALL");
      setRoleFilter("ALL");
      setSelectedIds([]);
      setDetailMember(null);
      setActiveTab("members");
    }
  }, [open]);

  const { data: members, isLoading: membersLoading } = useQuery<MemberRecord[]>({
    queryKey: ["/api/clubs", club?.id, "members-comprehensive"],
    queryFn: async () => {
      if (!club) return [];
      const res = await fetch(`/api/clubs/${club.id}/members-comprehensive`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: open && !!club,
  });

  const { data: pendingMembers, isLoading: pendingLoading } = useQuery<PendingMember[]>({
    queryKey: ["/api/clubs", club?.id, "pending-approvals"],
    queryFn: async () => {
      if (!club) return [];
      const res = await fetch(`/api/clubs/${club.id}/pending-approvals`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pending approvals");
      return res.json();
    },
    enabled: open && !!club,
  });

  const bulkActionMutation = useMutation({
    mutationFn: async (data: { action: string }) => {
      if (!club) return;
      await apiRequest("POST", `/api/clubs/${club.id}/members/bulk-action`, {
        profileIds: selectedIds,
        action: data.action,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club?.id, "members-comprehensive"] });
      setSelectedIds([]);
      toast({ title: "Bulk Action Complete", description: "Selected members have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Bulk action failed", variant: "destructive" });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (data: { profileId: number; status: string }) => {
      if (!club) return;
      await apiRequest("PATCH", `/api/clubs/${club.id}/members/${data.profileId}/status`, {
        membershipStatus: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club?.id, "pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club?.id, "members-comprehensive"] });
      toast({ title: "Updated", description: "Member status updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => {
        const name = m.user?.fullName?.toLowerCase() || "";
        const email = m.user?.email?.toLowerCase() || "";
        const q = memberSearch.toLowerCase();
        if (q && !name.includes(q) && !email.includes(q)) return false;
        if (genderFilter !== "ALL" && m.gender !== genderFilter) return false;
        if (categoryFilter !== "ALL" && (m.grade || m.category) !== categoryFilter) return false;
        if (statusFilter !== "ALL" && m.playerStatus !== statusFilter) return false;
        if (roleFilter !== "ALL" && m.clubRole !== roleFilter) return false;
        return true;
      })
      .sort((a, b) => (a.user?.fullName || "").localeCompare(b.user?.fullName || ""));
  }, [members, memberSearch, genderFilter, categoryFilter, statusFilter, roleFilter]);

  const allSelected = filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.includes(m.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map((m) => m.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!club) return null;

  return (
    <>
      <Dialog open={open && !detailMember} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-manage-members">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Members - {club.name}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList data-testid="tabs-members-management">
              <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending Approvals
                {pendingMembers && pendingMembers.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{pendingMembers.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-member-search"
                  />
                </div>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[110px]" data-testid="select-member-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Gender</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[100px]" data-testid="select-member-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Cat</SelectItem>
                    {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]" data-testid="select-member-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                    <SelectItem value="BANNED">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[110px]" data-testid="select-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Role</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ORGANISER">Organiser</SelectItem>
                    <SelectItem value="PLAYER">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 border rounded-md bg-muted/50" data-testid="bulk-action-bar">
                  <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
                  <div className="flex items-center gap-1 ml-auto flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkActionMutation.mutate({ action: "DELETE" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-delete"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkActionMutation.mutate({ action: "ARCHIVE" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-archive"
                    >
                      <Archive className="w-3 h-3 mr-1" /> Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkActionMutation.mutate({ action: "PAUSE" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-pause"
                    >
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkActionMutation.mutate({ action: "SUSPEND" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-bulk-suspend"
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Suspend
                    </Button>
                  </div>
                </div>
              )}

              {membersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all-members"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Cat</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Matches</TableHead>
                        <TableHead>Win %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((m) => {
                        const winPct = m.matchesPlayed > 0 ? Math.round((m.matchesWon / m.matchesPlayed) * 100) : 0;
                        return (
                          <TableRow
                            key={m.id}
                            className="cursor-pointer"
                            data-testid={`row-member-${m.id}`}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.includes(m.id)}
                                onCheckedChange={() => toggleSelect(m.id)}
                                data-testid={`checkbox-member-${m.id}`}
                              />
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <span className="text-sm font-medium" data-testid={`text-member-name-${m.id}`}>
                                {m.user?.fullName || "Unknown"}
                              </span>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <span className="text-sm text-muted-foreground">{m.user?.email || ""}</span>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <span className="text-xs">{m.gender || "-"}</span>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <Badge variant="outline" className="text-xs">{m.grade || m.category || "-"}</Badge>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <Badge variant={m.clubRole === "ADMIN" ? "default" : "outline"} className="text-xs">
                                {m.clubRole}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  m.playerStatus === "ACTIVE" ? "text-green-600" :
                                  m.playerStatus === "BANNED" ? "text-red-700" :
                                  m.playerStatus === "SUSPENDED" ? "text-red-600" : "text-muted-foreground"
                                }`}
                              >
                                {m.playerStatus}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <span className="text-xs">{m.matchesPlayed}/{m.matchesWon}</span>
                            </TableCell>
                            <TableCell onClick={() => setDetailMember(m)}>
                              <span className="text-xs">{winPct}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredMembers.length === 0 && !membersLoading && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No members found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {pendingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingMembers && pendingMembers.length > 0 ? (
                <div className="space-y-2 max-h-[50vh] overflow-auto">
                  {pendingMembers.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between gap-3 p-3 border rounded-md"
                      data-testid={`row-pending-member-${pm.id}`}
                    >
                      <div>
                        <div className="text-sm font-medium" data-testid={`text-pending-name-${pm.id}`}>
                          {pm.user?.fullName || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">{pm.user?.email || ""}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          onClick={() => approvalMutation.mutate({ profileId: pm.id, status: "APPROVED" })}
                          disabled={approvalMutation.isPending}
                          data-testid={`button-approve-member-${pm.id}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approvalMutation.mutate({ profileId: pm.id, status: "REJECTED" })}
                          disabled={approvalMutation.isPending}
                          data-testid={`button-reject-member-${pm.id}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No pending approvals.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {detailMember && (
        <UserDetailDialog
          member={detailMember}
          club={club}
          open={!!detailMember}
          onClose={() => setDetailMember(null)}
        />
      )}
    </>
  );
}

function UserDetailDialog({
  member,
  club,
  open,
  onClose,
}: {
  member: MemberRecord;
  club: ClubRecord;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [showMessage, setShowMessage] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);

  const [form, setForm] = useState<UserDetailFormData>({
    fullName: member.user?.fullName || "",
    email: member.user?.email || "",
    phone: member.user?.phone || "",
    nickname: member.user?.nickname || "",
    city: member.user?.city || "",
    country: member.user?.country || "",
    region: member.user?.region || "",
    continent: member.user?.continent || "",
    dateOfBirth: member.user?.dateOfBirth ? member.user.dateOfBirth.split("T")[0] : "",
    isJunior: member.user?.isJunior || false,
    parentGuardianName: member.user?.parentGuardianName || "",
    parentGuardianEmail: member.user?.parentGuardianEmail || "",
    gender: member.gender || "",
    category: member.grade || member.category || "C3",
    clubRole: member.clubRole || "PLAYER",
    playerStatus: member.playerStatus || "ACTIVE",
    role: member.user?.role || "PLAYER",
    joinedAt: (member as any).joinedAt ? new Date((member as any).joinedAt).toISOString().split("T")[0] : "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/clubs/${club.id}/members/${member.id}/comprehensive`, { ...form, joinedAt: form.joinedAt || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      toast({ title: "Saved", description: "Member details updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clubs/${club.id}/members/${member.userId}/reset-password`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setResetToken(data.token || data.resetToken || "Token generated");
      toast({ title: "Password Reset", description: "A reset token has been generated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/messages/send", {
        recipientId: member.userId,
        subject: msgSubject,
        body: msgBody,
        clubId: club.id,
      });
    },
    onSuccess: () => {
      setShowMessage(false);
      setMsgSubject("");
      setMsgBody("");
      toast({ title: "Message Sent", description: "Your message has been delivered." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to send message", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clubs/${club.id}/members/${member.id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      setConfirmDelete(false);
      onClose();
      toast({ title: "Deleted", description: "Member profile has been permanently deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/clubs/${club.id}/members/${member.id}/remove`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      setConfirmRemove(false);
      onClose();
      toast({ title: "Removed", description: "Member has been removed from the club. They can request to rejoin in the future." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to remove member", variant: "destructive" });
    },
  });

  const banMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/clubs/${club.id}/members/${member.id}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", club.id, "members-comprehensive"] });
      setConfirmBan(false);
      onClose();
      toast({ title: "Banned", description: "Member has been banned. They will be notified and can no longer access club sessions." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to ban member", variant: "destructive" });
    },
  });

  const winPct = member.matchesPlayed > 0 ? Math.round((member.matchesWon / member.matchesPlayed) * 100) : 0;

  return (
    <>
      <Dialog open={open && !confirmDelete && !confirmRemove && !confirmBan} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-user-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {member.user?.fullName || "Member Detail"}
              {member.playerStatus === "BANNED" && (
                <Badge variant="destructive" className="no-default-hover-elevate">Banned</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto space-y-5 py-2 pr-2">
            <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/30" data-testid="member-ranking-summary">
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-matches-played">{member.matchesPlayed}</div>
                <div className="text-xs text-muted-foreground">Played</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-matches-won">{member.matchesWon}</div>
                <div className="text-xs text-muted-foreground">Won</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" data-testid="text-win-pct">{winPct}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Personal Info</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} data-testid="input-detail-fullname" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} data-testid="input-detail-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} data-testid="input-detail-phone" />
                </div>
                <div>
                  <Label>Nickname</Label>
                  <Input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} data-testid="input-detail-nickname" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} data-testid="input-detail-city" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} data-testid="input-detail-country" />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} data-testid="input-detail-region" />
                </div>
                <div>
                  <Label>Continent</Label>
                  <Input value={form.continent} onChange={(e) => setForm((f) => ({ ...f, continent: e.target.value }))} data-testid="input-detail-continent" />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-detail-dob" />
                </div>
                <div>
                  <Label>Joined Date</Label>
                  <Input type="date" value={form.joinedAt} onChange={(e) => setForm((f) => ({ ...f, joinedAt: e.target.value }))} data-testid="input-joined-at" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Checkbox
                    id="detail-isJunior"
                    checked={form.isJunior}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isJunior: !!v }))}
                    data-testid="checkbox-detail-is-junior"
                  />
                  <Label htmlFor="detail-isJunior" className="cursor-pointer">Junior Player</Label>
                </div>
                <div>
                  <Label>Parent/Guardian Name</Label>
                  <Input value={form.parentGuardianName} onChange={(e) => setForm((f) => ({ ...f, parentGuardianName: e.target.value }))} data-testid="input-detail-guardian-name" />
                </div>
                <div>
                  <Label>Parent/Guardian Email</Label>
                  <Input value={form.parentGuardianEmail} onChange={(e) => setForm((f) => ({ ...f, parentGuardianEmail: e.target.value }))} data-testid="input-detail-guardian-email" />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Profile Settings</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                    <SelectTrigger data-testid="select-detail-gender"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger data-testid="select-detail-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Club Role</Label>
                  <Select value={form.clubRole} onValueChange={(v) => setForm((f) => ({ ...f, clubRole: v }))}>
                    <SelectTrigger data-testid="select-detail-club-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANISER">Organiser</SelectItem>
                      <SelectItem value="PLAYER">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Player Status</Label>
                  <Select value={form.playerStatus} onValueChange={(v) => setForm((f) => ({ ...f, playerStatus: v }))}>
                    <SelectTrigger data-testid="select-detail-player-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                      <SelectItem value="BANNED">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>System Role (Super Admin)</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger data-testid="select-detail-system-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANISER">Organiser</SelectItem>
                      <SelectItem value="PLAYER">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {resetToken && (
              <div className="p-3 border rounded-md bg-muted/30" data-testid="text-reset-token">
                <div className="text-sm font-semibold mb-1">Password Reset Token</div>
                <code className="text-xs break-all">{resetToken}</code>
              </div>
            )}

            {showMessage && (
              <div className="space-y-3 p-3 border rounded-md" data-testid="compose-message-form">
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-2">Send Message</div>
                <div>
                  <Label>Subject</Label>
                  <Input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} data-testid="input-msg-subject" />
                </div>
                <div>
                  <Label>Body</Label>
                  <Textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={4} data-testid="input-msg-body" />
                </div>
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setShowMessage(false); setMsgSubject(""); setMsgBody(""); }} data-testid="button-cancel-message">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={!msgSubject.trim() || !msgBody.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-3">
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-member"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => resetPasswordMutation.mutate()}
                disabled={resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Key className="w-4 h-4 mr-1" />}
                Reset Password
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMessage(!showMessage)}
                data-testid="button-toggle-message"
              >
                <Mail className="w-4 h-4 mr-1" /> Send Message
              </Button>
            </div>
            <div className="flex items-center gap-1 flex-wrap border-t pt-3">
              <Button
                variant="outline"
                className="text-amber-600"
                onClick={() => setConfirmRemove(true)}
                data-testid="button-remove-from-club"
              >
                <UserMinus className="w-4 h-4 mr-1" /> Remove from Club
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmBan(true)}
                data-testid="button-ban-member"
              >
                <ShieldAlert className="w-4 h-4 mr-1" /> Ban
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-profile"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete Profile
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Club</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{member.user?.fullName}</strong> from <strong>{club.name}</strong>. Their profile and match history for this club will be deleted. They will be notified and can request to rejoin in the future.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
              className="bg-amber-600 text-white"
              data-testid="button-confirm-remove"
            >
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserMinus className="w-4 h-4 mr-1" />}
              Remove Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBan} onOpenChange={setConfirmBan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will ban <strong>{member.user?.fullName}</strong> from <strong>{club.name}</strong>. They will no longer be able to see or sign up for any sessions from this club. They will receive a notification informing them of the ban.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => banMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-ban"
            >
              {banMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldAlert className="w-4 h-4 mr-1" />}
              Ban Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the profile for <strong>{member.user?.fullName}</strong> from <strong>{club.name}</strong>. This action cannot be undone and ALL associated data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProfileMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-profile"
            >
              {deleteProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SuperAdminClubs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editClub, setEditClub] = useState<ClubRecord | null>(null);
  const [editClubForm, setEditClubForm] = useState<ClubEditForm>({
    name: "",
    description: "",
    status: "PENDING",
    address: "",
    city: "",
    postcode: "",
    region: "",
    country: "",
    continent: "",
    contactFullName: "",
    contactPhone: "",
    contactAddress: "",
    hasCompetitions: false,
    hasSocialGames: false,
    socialGameTimings: "",
    providesTraining: false,
    trainingDetails: "",
    sessionFee: "",
    hasMembership: false,
    membershipFee: "",
    shuttlecockType: "",
    providesClubTShirts: false,
    isRegisteredWithBE: false,
    beRegistrationNumber: "",
  });
  const [archiveClub, setArchiveClub] = useState<ClubRecord | null>(null);
  const [permanentDeleteClub, setPermanentDeleteClub] = useState<ClubRecord | null>(null);
  const [transferClub, setTransferClub] = useState<ClubRecord | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [manageClub, setManageClub] = useState<ClubRecord | null>(null);
  const [suspendClub, setSuspendClub] = useState<ClubRecord | null>(null);
  const [contactClub, setContactClub] = useState<ClubRecord | null>(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const pageSize = 25;

  useEffect(() => {
    if (editClub) {
      setEditClubForm({
        name: editClub.name || "",
        description: editClub.description || "",
        status: editClub.status || "PENDING",
        address: editClub.address || "",
        city: editClub.city || "",
        postcode: editClub.postcode || "",
        region: editClub.region || "",
        country: editClub.country || "",
        continent: editClub.continent || "",
        contactFullName: editClub.contactFullName || "",
        contactPhone: editClub.contactPhone || "",
        contactAddress: editClub.contactAddress || "",
        hasCompetitions: editClub.hasCompetitions || false,
        hasSocialGames: editClub.hasSocialGames || false,
        socialGameTimings: editClub.socialGameTimings || "",
        providesTraining: editClub.providesTraining || false,
        trainingDetails: editClub.trainingDetails || "",
        sessionFee: editClub.sessionFee != null ? (editClub.sessionFee / 100).toFixed(2) : "",
        hasMembership: editClub.hasMembership || false,
        membershipFee: editClub.membershipFee != null ? (editClub.membershipFee / 100).toFixed(2) : "",
        shuttlecockType: editClub.shuttlecockType || "",
        providesClubTShirts: editClub.providesClubTShirts || false,
        isRegisteredWithBE: editClub.isRegisteredWithBE || false,
        beRegistrationNumber: editClub.beRegistrationNumber || "",
      });
    }
  }, [editClub]);

  const { data: allClubs, isLoading } = useQuery<ClubRecord[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: allUsers } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.id}/status`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({ title: "Club Updated", description: "Club status has been changed." });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (clubId: number) => {
      await apiRequest("DELETE", `/api/admin/clubs/${clubId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setArchiveClub(null);
      toast({ title: "Club Archived", description: "Club has been archived and is no longer visible publicly." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to archive club", variant: "destructive" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (clubId: number) => {
      await apiRequest("DELETE", `/api/admin/clubs/${clubId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setPermanentDeleteClub(null);
      toast({ title: "Club Deleted", description: "Club and all associated data have been permanently deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete club permanently", variant: "destructive" });
    },
  });

  const pauseClubMutation = useMutation({
    mutationFn: async (data: { clubId: number; paused: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.clubId}/pause`, { paused: data.paused });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({ 
        title: variables.paused ? "Club Paused" : "Club Resumed", 
        description: variables.paused 
          ? "Club operations have been paused. It won't appear in public listings." 
          : "Club has been resumed and is now fully operational."
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club", variant: "destructive" });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (data: { clubId: number; newOwnerId: number }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${data.clubId}/transfer`, { newOwnerId: data.newOwnerId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setTransferClub(null);
      setNewOwnerId("");
      toast({ title: "Ownership Transferred", description: "Club ownership has been transferred." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to transfer ownership", variant: "destructive" });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: async (data: { id: number; form: ClubEditForm }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${data.id}`, {
        name: data.form.name,
        description: data.form.description,
        status: data.form.status,
        address: data.form.address,
        city: data.form.city,
        postcode: data.form.postcode,
        region: data.form.region,
        country: data.form.country,
        continent: data.form.continent,
        contactFullName: data.form.contactFullName,
        contactPhone: data.form.contactPhone,
        contactAddress: data.form.contactAddress,
        hasCompetitions: data.form.hasCompetitions,
        hasSocialGames: data.form.hasSocialGames,
        socialGameTimings: data.form.socialGameTimings,
        providesTraining: data.form.providesTraining,
        trainingDetails: data.form.trainingDetails,
        sessionFee: data.form.sessionFee ? Math.round(parseFloat(data.form.sessionFee) * 100) : null,
        hasMembership: data.form.hasMembership,
        membershipFee: data.form.membershipFee ? Math.round(parseFloat(data.form.membershipFee) * 100) : null,
        shuttlecockType: data.form.shuttlecockType,
        providesClubTShirts: data.form.providesClubTShirts,
        isRegisteredWithBE: data.form.isRegisteredWithBE,
        beRegistrationNumber: data.form.beRegistrationNumber,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditClub(null);
      toast({ title: "Club Updated", description: "Club details have been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!allClubs) return [];
    return allClubs.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.city || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      return true;
    });
  }, [allClubs, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getOwnerName = (ownerId?: number) => {
    if (!ownerId || !allUsers) return "\u2014";
    const owner = allUsers.find(u => u.id === ownerId);
    return owner?.fullName || `User #${ownerId}`;
  };

  const statusBadge = (status: string, isActive?: boolean) => {
    if (!isActive && status === "ARCHIVED") {
      return <Badge variant="outline" className="text-xs text-muted-foreground"><Archive className="w-3 h-3 mr-1" /> Archived</Badge>;
    }
    switch (status) {
      case "APPROVED": return <Badge variant="outline" className="text-xs text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "PENDING": return <Badge variant="outline" className="text-xs text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs text-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "PAUSED": return <Badge variant="outline" className="text-xs text-orange-600"><Pause className="w-3 h-3 mr-1" /> Paused</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="super-admin-clubs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/super-admin">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-clubs-title">
              <Building2 className="w-6 h-6 text-emerald-500" />
              Clubs Control
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Global club management with full override capabilities.</p>
        </div>
        <Badge variant="destructive" className="text-xs py-1 px-3">
          <Zap className="h-3 w-3 mr-1" /> God's Mode
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs by name or city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search-clubs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-club-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            Showing {paginated.length} of {filtered.length} clubs
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((club) => (
                  <TableRow key={club.id} data-testid={`row-club-${club.id}`}>
                    <TableCell>
                      <div>
                        <button
                          className="font-medium text-sm cursor-pointer hover:text-primary text-left"
                          onClick={() => setEditClub(club)}
                          data-testid={`button-edit-club-name-${club.id}`}
                        >
                          {club.name}
                        </button>
                        <div className="text-xs text-muted-foreground">{club.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getOwnerName(club.ownerId)}</span>
                    </TableCell>
                    <TableCell>{statusBadge(club.status, club.isActive)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {[club.city, club.country].filter(Boolean).join(", ") || "\u2014"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {club.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ id: club.id, status: "APPROVED" })}
                              data-testid={`button-approve-club-${club.id}`}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ id: club.id, status: "REJECTED" })}
                              data-testid={`button-reject-club-${club.id}`}
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {(club.status === "APPROVED" || club.status === "PAUSED") && club.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => pauseClubMutation.mutate({ clubId: club.id, paused: club.status !== "PAUSED" })}
                            disabled={pauseClubMutation.isPending}
                            data-testid={`button-pause-club-${club.id}`}
                          >
                            {club.status === "PAUSED" 
                              ? <Play className="w-4 h-4 text-green-500" /> 
                              : <Pause className="w-4 h-4 text-orange-500" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setManageClub(club)}
                          data-testid={`button-manage-members-${club.id}`}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setTransferClub(club)} data-testid={`button-transfer-club-${club.id}`}>
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setArchiveClub(club)}
                          data-testid={`button-archive-club-${club.id}`}
                        >
                          <Archive className="w-4 h-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPermanentDeleteClub(club)}
                          className="text-destructive"
                          data-testid={`button-permanent-delete-club-${club.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No clubs found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editClub} onOpenChange={(open) => { if (!open) setEditClub(null); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-club">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Club
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto space-y-6 py-2 pr-2">
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Basic Info</div>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editClubForm.name}
                    onChange={(e) => setEditClubForm(f => ({ ...f, name: e.target.value }))}
                    data-testid="input-edit-club-name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editClubForm.description}
                    onChange={(e) => setEditClubForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    data-testid="input-edit-club-description"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editClubForm.status} onValueChange={(v) => setEditClubForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-edit-club-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Location</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={editClubForm.address}
                    onChange={(e) => setEditClubForm(f => ({ ...f, address: e.target.value }))}
                    data-testid="input-edit-club-address"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editClubForm.city}
                    onChange={(e) => setEditClubForm(f => ({ ...f, city: e.target.value }))}
                    data-testid="input-edit-club-city"
                  />
                </div>
                <div>
                  <Label>Postcode</Label>
                  <Input
                    value={editClubForm.postcode}
                    onChange={(e) => setEditClubForm(f => ({ ...f, postcode: e.target.value }))}
                    data-testid="input-edit-club-postcode"
                  />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    value={editClubForm.region}
                    onChange={(e) => setEditClubForm(f => ({ ...f, region: e.target.value }))}
                    data-testid="input-edit-club-region"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={editClubForm.country}
                    onChange={(e) => setEditClubForm(f => ({ ...f, country: e.target.value }))}
                    data-testid="input-edit-club-country"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Continent</Label>
                  <Input
                    value={editClubForm.continent}
                    onChange={(e) => setEditClubForm(f => ({ ...f, continent: e.target.value }))}
                    data-testid="input-edit-club-continent"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Contact</div>
              <div className="space-y-3">
                <div>
                  <Label>Contact Full Name</Label>
                  <Input
                    value={editClubForm.contactFullName}
                    onChange={(e) => setEditClubForm(f => ({ ...f, contactFullName: e.target.value }))}
                    data-testid="input-edit-club-contact-name"
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={editClubForm.contactPhone}
                    onChange={(e) => setEditClubForm(f => ({ ...f, contactPhone: e.target.value }))}
                    data-testid="input-edit-club-contact-phone"
                  />
                </div>
                <div>
                  <Label>Contact Address</Label>
                  <Input
                    value={editClubForm.contactAddress}
                    onChange={(e) => setEditClubForm(f => ({ ...f, contactAddress: e.target.value }))}
                    data-testid="input-edit-club-contact-address"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Activities</div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-hasCompetitions"
                    checked={editClubForm.hasCompetitions}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, hasCompetitions: !!v }))}
                    data-testid="checkbox-edit-club-has-competitions"
                  />
                  <Label htmlFor="edit-hasCompetitions" className="cursor-pointer">Has Competitions</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-hasSocialGames"
                    checked={editClubForm.hasSocialGames}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, hasSocialGames: !!v }))}
                    data-testid="checkbox-edit-club-has-social-games"
                  />
                  <Label htmlFor="edit-hasSocialGames" className="cursor-pointer">Has Social Games</Label>
                </div>
                <div>
                  <Label>Social Game Timings</Label>
                  <Input
                    value={editClubForm.socialGameTimings}
                    onChange={(e) => setEditClubForm(f => ({ ...f, socialGameTimings: e.target.value }))}
                    data-testid="input-edit-club-social-game-timings"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-providesTraining"
                    checked={editClubForm.providesTraining}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, providesTraining: !!v }))}
                    data-testid="checkbox-edit-club-provides-training"
                  />
                  <Label htmlFor="edit-providesTraining" className="cursor-pointer">Provides Training</Label>
                </div>
                <div>
                  <Label>Training Details</Label>
                  <Input
                    value={editClubForm.trainingDetails}
                    onChange={(e) => setEditClubForm(f => ({ ...f, trainingDetails: e.target.value }))}
                    data-testid="input-edit-club-training-details"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Fees</div>
              <div className="space-y-3">
                <div>
                  <Label>Session Fee (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editClubForm.sessionFee}
                    onChange={(e) => setEditClubForm(f => ({ ...f, sessionFee: e.target.value }))}
                    data-testid="input-edit-club-session-fee"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-hasMembership"
                    checked={editClubForm.hasMembership}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, hasMembership: !!v }))}
                    data-testid="checkbox-edit-club-has-membership"
                  />
                  <Label htmlFor="edit-hasMembership" className="cursor-pointer">Has Membership</Label>
                </div>
                <div>
                  <Label>Membership Fee (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editClubForm.membershipFee}
                    onChange={(e) => setEditClubForm(f => ({ ...f, membershipFee: e.target.value }))}
                    data-testid="input-edit-club-membership-fee"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Equipment</div>
              <div className="space-y-3">
                <div>
                  <Label>Equipment Type</Label>
                  <Select value={editClubForm.shuttlecockType} onValueChange={(v) => setEditClubForm(f => ({ ...f, shuttlecockType: v }))}>
                    <SelectTrigger data-testid="select-edit-club-shuttlecock-type">
                      <SelectValue placeholder="Select type..." />
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
                    id="edit-providesClubTShirts"
                    checked={editClubForm.providesClubTShirts}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, providesClubTShirts: !!v }))}
                    data-testid="checkbox-edit-club-provides-tshirts"
                  />
                  <Label htmlFor="edit-providesClubTShirts" className="cursor-pointer">Provides Club T-Shirts</Label>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Registration</div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-isRegisteredWithBE"
                    checked={editClubForm.isRegisteredWithBE}
                    onCheckedChange={(v) => setEditClubForm(f => ({ ...f, isRegisteredWithBE: !!v }))}
                    data-testid="checkbox-edit-club-registered-be"
                  />
                  <Label htmlFor="edit-isRegisteredWithBE" className="cursor-pointer">Registered with BE</Label>
                </div>
                <div>
                  <Label>BE Registration Number</Label>
                  <Input
                    value={editClubForm.beRegistrationNumber}
                    onChange={(e) => setEditClubForm(f => ({ ...f, beRegistrationNumber: e.target.value }))}
                    data-testid="input-edit-club-be-registration"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClub(null)} data-testid="button-cancel-edit-club">Cancel</Button>
            <Button
              onClick={() => editClub && updateClubMutation.mutate({ id: editClub.id, form: editClubForm })}
              disabled={updateClubMutation.isPending}
              data-testid="button-save-edit-club"
            >
              {updateClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferClub} onOpenChange={(open) => { if (!open) { setTransferClub(null); setNewOwnerId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Transfer Club Ownership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2">
              You are performing a God's Mode action.
            </p>
            <p className="text-sm">
              Transfer <strong>{transferClub?.name}</strong> to a new owner.
            </p>
            <div>
              <Label>New Owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger data-testid="select-new-owner">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.filter(u => u.id !== transferClub?.ownerId).map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferClub(null); setNewOwnerId(""); }}>Cancel</Button>
            <Button
              onClick={() => transferClub && newOwnerId && transferOwnershipMutation.mutate({ clubId: transferClub.id, newOwnerId: parseInt(newOwnerId) })}
              disabled={!newOwnerId || transferOwnershipMutation.isPending}
              data-testid="button-confirm-transfer"
            >
              {transferOwnershipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveClub} onOpenChange={(open) => !open && setArchiveClub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Club</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{archiveClub?.name}</strong>. The club will no longer be visible publicly, won't appear in rankings or session listings, and members won't be able to access it. All data will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveClub && deleteClubMutation.mutate(archiveClub.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-archive-club"
            >
              {deleteClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Archive Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permanentDeleteClub} onOpenChange={(open) => !open && setPermanentDeleteClub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Club Permanently
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">WARNING: ALL DATA WILL BE LOST.</strong> This will permanently delete <strong>{permanentDeleteClub?.name}</strong> and all associated data including members, sessions, matches, rankings, and financial records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentDeleteClub && permanentDeleteMutation.mutate(permanentDeleteClub.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-permanent-delete-club"
            >
              {permanentDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MembersManagementDialog
        club={manageClub}
        open={!!manageClub}
        onClose={() => setManageClub(null)}
      />
    </div>
  );
}

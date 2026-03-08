import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  User, Pencil, Save, Trash2, Ban, Loader2, Lock, KeyRound, Copy, Plus, Building2, MapPin, Baby, Megaphone, BarChart3, Shield, UserPlus, Users, Search, X, Link2Off, ClipboardList
} from "lucide-react";

export const ACQUISITION_SOURCES = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "WEBSITE", label: "Website" },
  { value: "WORD_OF_MOUTH", label: "Word of Mouth" },
  { value: "LEISURE_CENTRE", label: "Leisure Centre" },
  { value: "SAW_SESSION", label: "Saw a Session" },
  { value: "THROUGH_COACH", label: "Through a Coach" },
  { value: "REFERRAL", label: "Referral" },
  { value: "OTHER", label: "Other" },
];

const GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];

export interface MemberEditData {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  nickname: string;
  dateOfBirth: string;
  gender: string;
  category: string;
  isJunior: boolean;
  parentGuardianName: string;
  parentGuardianEmail: string;
  city: string;
  country: string;
  region: string;
  continent: string;
  acquisitionSource: string;
  acquisitionSourceOther: string;
  clubRole: string;
  playerStatus: string;
  membershipStatus: string;
  role: string;
  accountStatus: string;
  rankingPoints: string;
  matchesPlayed: string;
  matchesWon: string;
  joinedAt: string;
  profileId?: number;
  clubId?: number;
  clubName?: string;
}

interface UnifiedMemberEditDialogProps {
  open: boolean;
  onClose: () => void;
  data: MemberEditData | null;
  onSave: (formData: MemberEditData & { password?: string }) => Promise<void>;
  isSaving: boolean;
  context: "admin" | "super-admin" | "god-mode";
  clubs?: { id: number; name: string }[];
  onDelete?: () => void;
  isDeleting?: boolean;
  onBan?: () => void;
  isBanning?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
  onMoveToTrial?: () => void;
  isMovingToTrial?: boolean;
  onResetPassword?: (password: string) => Promise<void>;
  isResettingPassword?: boolean;
  onGenerateResetLink?: () => Promise<string | null>;
  isGeneratingLink?: boolean;
  onAssignToClub?: (clubId: number, role: string, grade: string) => Promise<void>;
  isAssigning?: boolean;
  queryKeysToInvalidate?: string[][];
  showJoinedDate?: boolean;
  showKPIs?: boolean;
  showSystemRole?: boolean;
  showClubActions?: boolean;
  showAssignToClub?: boolean;
  playerStatusValue?: string;
  extraContent?: React.ReactNode;
}

export function UnifiedMemberEditDialog({
  open,
  onClose,
  data,
  onSave,
  isSaving,
  context,
  clubs = [],
  onDelete,
  isDeleting,
  onBan,
  isBanning,
  onRemove,
  isRemoving,
  onMoveToTrial,
  isMovingToTrial,
  onResetPassword,
  isResettingPassword,
  onGenerateResetLink,
  isGeneratingLink,
  onAssignToClub,
  isAssigning,
  showJoinedDate = false,
  showKPIs = false,
  showSystemRole = false,
  showClubActions = false,
  showAssignToClub = false,
  playerStatusValue,
  extraContent,
}: UnifiedMemberEditDialogProps) {
  const { toast } = useToast();

  const [form, setForm] = useState<MemberEditData & { password: string }>({
    userId: 0, fullName: "", email: "", phone: "", nickname: "",
    dateOfBirth: "", gender: "", category: "C3",
    isJunior: false, parentGuardianName: "", parentGuardianEmail: "",
    city: "", country: "", region: "", continent: "",
    acquisitionSource: "", acquisitionSourceOther: "",
    clubRole: "PLAYER", playerStatus: "ACTIVE", membershipStatus: "APPROVED",
    role: "PLAYER", accountStatus: "APPROVED",
    rankingPoints: "0", matchesPlayed: "0", matchesWon: "0",
    joinedAt: "", password: "",
  });

  const [passwordMode, setPasswordMode] = useState<"none" | "set" | "link">("none");
  const [newPassword, setNewPassword] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignClubId, setAssignClubId] = useState("");
  const [assignRole, setAssignRole] = useState("PLAYER");
  const [assignGrade, setAssignGrade] = useState("C3");

  const [childrenMode, setChildrenMode] = useState<"list" | "add-existing" | "create-new">("list");
  const [childSearchQuery, setChildSearchQuery] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");
  const [newChildGender, setNewChildGender] = useState("MALE");
  const [newChildEmergencyContact, setNewChildEmergencyContact] = useState("");
  const [newChildMedicalNotes, setNewChildMedicalNotes] = useState("");

  const { data: childrenData, refetch: refetchChildren } = useQuery<any[]>({
    queryKey: ["/api/admin/users", form.userId, "children"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${form.userId}/children`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && form.userId > 0,
  });

  const { data: childSearchResults } = useQuery<any[]>({
    queryKey: ["/api/admin/children/search", childSearchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/children/search?q=${encodeURIComponent(childSearchQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && childrenMode === "add-existing" && childSearchQuery.length > 0,
  });

  const [forceReassignChildId, setForceReassignChildId] = useState<number | null>(null);

  const assignChild = useMutation({
    mutationFn: async ({ childId, forceReassign }: { childId: number; forceReassign?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${form.userId}/children/${childId}/assign`, { forceReassign: !!forceReassign });
      return res.json();
    },
    onSuccess: () => {
      refetchChildren();
      setChildrenMode("list");
      setSelectedChildId(null);
      setChildSearchQuery("");
      setForceReassignChildId(null);
      toast({ title: "Child Assigned", description: "Child account has been assigned to this member." });
    },
    onError: (err: any) => {
      if (err.message?.includes("already assigned to another parent") && selectedChildId) {
        setForceReassignChildId(selectedChildId);
      } else {
        toast({ title: "Error", description: err.message || "Failed to assign child", variant: "destructive" });
      }
    },
  });

  const unassignChild = useMutation({
    mutationFn: async ({ childId }: { childId: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${form.userId}/children/${childId}/unassign`);
      return res.json();
    },
    onSuccess: () => {
      refetchChildren();
      toast({ title: "Child Unassigned", description: "Child account has been removed from this member." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to unassign child", variant: "destructive" });
    },
  });

  const createChild = useMutation({
    mutationFn: async (data: { fullName: string; dateOfBirth?: string; gender: string; emergencyContact?: string; medicalNotes?: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${form.userId}/children`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchChildren();
      setChildrenMode("list");
      setNewChildName("");
      setNewChildDob("");
      setNewChildGender("MALE");
      setNewChildEmergencyContact("");
      setNewChildMedicalNotes("");
      toast({ title: "Child Created", description: "New child account has been created and assigned to this member." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create child", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (data && open) {
      setForm({
        ...data,
        password: "",
      });
      setPasswordMode("none");
      setNewPassword("");
      setGeneratedLink("");
      setShowAssignPanel(false);
      setBanConfirmOpen(false);
      setRemoveConfirmOpen(false);
      setChildrenMode("list");
      setChildSearchQuery("");
      setSelectedChildId(null);
      setForceReassignChildId(null);
      setNewChildName("");
      setNewChildDob("");
      setNewChildGender("MALE");
      setNewChildEmergencyContact("");
      setNewChildMedicalNotes("");
    }
  }, [data, open]);

  const handleSave = async () => {
    try {
      await onSave({ ...form, password: form.password || undefined });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
  };

  const handleSetPassword = async () => {
    if (!onResetPassword || newPassword.length < 6) return;
    try {
      await onResetPassword(newPassword);
      setPasswordMode("none");
      setNewPassword("");
      toast({ title: "Password Set", description: "Password has been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateLink = async () => {
    if (!onGenerateResetLink) return;
    try {
      const link = await onGenerateResetLink();
      if (link) {
        setGeneratedLink(link);
        setPasswordMode("link");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!onAssignToClub || !assignClubId) return;
    try {
      await onAssignToClub(Number(assignClubId), assignRole, assignGrade);
      setShowAssignPanel(false);
      setAssignClubId("");
      toast({ title: "Assigned", description: "User has been assigned to the club." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!data) return null;

  const winRate = Number(form.matchesPlayed) > 0
    ? Math.round((Number(form.matchesWon) / Number(form.matchesPlayed)) * 100)
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-unified-member-edit">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-edit-title">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Member: {data.fullName}
            </DialogTitle>
            <DialogDescription>
              Update member details, profile settings, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto space-y-5 py-2 pr-2">
            <div className="flex items-center gap-4 pb-2">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${form.fullName}`} />
                <AvatarFallback>{form.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{form.fullName}</p>
                <p className="text-sm text-muted-foreground">{form.email}</p>
              </div>
            </div>

            {showJoinedDate && form.joinedAt && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Membership</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Joined Date</Label>
                    <Input type="date" value={form.joinedAt} onChange={(e) => setForm(f => ({ ...f, joinedAt: e.target.value }))} data-testid="input-edit-joined-at" />
                  </div>
                </div>
              </div>
            )}

            {showKPIs && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Player KPIs
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Ranking Points</Label>
                    <Input type="number" min={0} value={form.rankingPoints} onChange={(e) => setForm(f => ({ ...f, rankingPoints: e.target.value }))} data-testid="input-edit-ranking-points" />
                  </div>
                  <div>
                    <Label className="text-xs">Matches Played</Label>
                    <Input type="number" min={0} value={form.matchesPlayed} onChange={(e) => setForm(f => ({ ...f, matchesPlayed: e.target.value }))} data-testid="input-edit-matches-played" />
                  </div>
                  <div>
                    <Label className="text-xs">Matches Won</Label>
                    <Input type="number" min={0} value={form.matchesWon} onChange={(e) => setForm(f => ({ ...f, matchesWon: e.target.value }))} data-testid="input-edit-matches-won" />
                  </div>
                  <div>
                    <Label className="text-xs">Win Rate</Label>
                    <div className="flex items-center h-9 px-3 border rounded-md bg-muted/30 text-sm font-medium" data-testid="text-edit-win-rate">
                      {winRate}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {extraContent}

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Personal Information
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-edit-fullname" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} data-testid="input-edit-email" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07xxx xxxxxx" data-testid="input-edit-phone" />
                </div>
                <div>
                  <Label>Nickname</Label>
                  <Input value={form.nickname} onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} data-testid="input-edit-nickname" />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-edit-dob" />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Profile Settings
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender || "UNSET"} onValueChange={(v) => setForm(f => ({ ...f, gender: v === "UNSET" ? "" : v }))}>
                    <SelectTrigger data-testid="select-edit-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNSET">Not specified</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category / Grade</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger data-testid="select-edit-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Club Role</Label>
                  <Select value={form.clubRole} onValueChange={(v) => setForm(f => ({ ...f, clubRole: v }))}>
                    <SelectTrigger data-testid="select-edit-club-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="ORGANISER">Organiser</SelectItem>
                      <SelectItem value="COACH">Coach</SelectItem>
                      <SelectItem value="PLAYER">Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Player Status</Label>
                  <Select value={form.playerStatus} onValueChange={(v) => setForm(f => ({ ...f, playerStatus: v }))}>
                    <SelectTrigger data-testid="select-edit-player-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="BANNED">Banned</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Membership Status</Label>
                  <Select value={form.membershipStatus} onValueChange={(v) => setForm(f => ({ ...f, membershipStatus: v }))}>
                    <SelectTrigger data-testid="select-edit-membership-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showSystemRole && (
                  <div>
                    <Label>System Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger data-testid="select-edit-system-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Super Admin</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="PLAYER">Player</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {showSystemRole && (
                  <div>
                    <Label>Account Status</Label>
                    <Select value={form.accountStatus} onValueChange={(v) => setForm(f => ({ ...f, accountStatus: v }))}>
                      <SelectTrigger data-testid="select-edit-account-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {clubs.length > 0 && context === "admin" && (
                  <div className="col-span-2">
                    <Label>Club</Label>
                    <Select value={form.clubId?.toString() || ""} onValueChange={(v) => setForm(f => ({ ...f, clubId: Number(v) }))}>
                      <SelectTrigger data-testid="select-edit-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                      <SelectContent>
                        {clubs.map(club => (
                          <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} data-testid="input-edit-country" />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} data-testid="input-edit-region" />
                </div>
                <div>
                  <Label>Continent</Label>
                  <Input value={form.continent} onChange={(e) => setForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-edit-continent" />
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <Baby className="w-4 h-4" /> Junior / Guardian
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center gap-3 col-span-2 p-2 -m-2 rounded-lg cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors text-left"
                  onClick={() => setForm(f => ({ ...f, isJunior: !f.isJunior }))}
                  data-testid="container-edit-junior"
                >
                  <Checkbox checked={form.isJunior === true} tabIndex={-1} className="pointer-events-none" data-testid="checkbox-edit-junior" />
                  <span className="select-none text-sm">Junior Player (Under 18)</span>
                </button>
                {form.isJunior && (
                  <>
                    <div>
                      <Label className="text-xs">Parent/Guardian Name <span className="text-muted-foreground">(optional)</span></Label>
                      <Input value={form.parentGuardianName} onChange={(e) => setForm(f => ({ ...f, parentGuardianName: e.target.value }))} placeholder="Guardian name" data-testid="input-edit-guardian-name" />
                    </div>
                    <div>
                      <Label className="text-xs">Parent/Guardian Email <span className="text-muted-foreground">(optional)</span></Label>
                      <Input type="email" value={form.parentGuardianEmail} onChange={(e) => setForm(f => ({ ...f, parentGuardianEmail: e.target.value }))} placeholder="guardian@email.com" data-testid="input-edit-guardian-email" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Children Accounts
                <span className="text-xs font-normal ml-auto">
                  {(childrenData || []).length} child{(childrenData || []).length !== 1 ? "ren" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {childrenMode === "list" && (
                  <>
                    {(childrenData || []).length > 0 ? (
                      <div className="space-y-2">
                        {(childrenData || []).map((child: any) => (
                          <div key={child.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Baby className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm font-medium">{child.fullName}</span>
                                {child.dateOfBirth && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    DOB: {new Date(child.dateOfBirth).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={() => unassignChild.mutate({ childId: child.id })}
                              disabled={unassignChild.isPending}
                              data-testid={`button-unassign-child-${child.id}`}
                            >
                              {unassignChild.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2Off className="h-3 w-3" />}
                              <span className="ml-1 text-xs">Unassign</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No children accounts assigned</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setChildrenMode("add-existing"); setChildSearchQuery(""); setSelectedChildId(null); }}
                        data-testid="button-assign-existing-child"
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Assign Existing
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setChildrenMode("create-new"); setNewChildName(""); setNewChildDob(""); setNewChildGender("MALE"); setNewChildEmergencyContact(""); setNewChildMedicalNotes(""); }}
                        data-testid="button-create-new-child"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Create New
                      </Button>
                    </div>
                  </>
                )}

                {childrenMode === "add-existing" && (
                  <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Assign Existing Child</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setChildrenMode("list")} data-testid="button-cancel-assign-child">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Search junior accounts by name..."
                      value={childSearchQuery}
                      onChange={(e) => { setChildSearchQuery(e.target.value); setSelectedChildId(null); }}
                      data-testid="input-search-child"
                    />
                    {childSearchQuery.length > 0 && (
                      <div className="max-h-36 overflow-y-auto border rounded-md">
                        {(() => {
                          const currentChildIds = new Set((childrenData || []).map((c: any) => c.id));
                          const available = (childSearchResults || []).filter((c: any) => !currentChildIds.has(c.id) && c.id !== form.userId);
                          if (available.length === 0) {
                            return <p className="text-xs text-muted-foreground p-2 text-center">No matching junior accounts found</p>;
                          }
                          return available.map((child: any) => (
                            <button
                              key={child.id}
                              type="button"
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${selectedChildId === child.id ? "bg-primary/10 text-primary" : ""}`}
                              onClick={() => setSelectedChildId(child.id)}
                              data-testid={`option-child-${child.id}`}
                            >
                              <div>
                                <span className="font-medium">{child.fullName}</span>
                                {child.parentUserId && (
                                  <span className="text-xs text-amber-500 ml-2">(assigned to another parent)</span>
                                )}
                              </div>
                              {selectedChildId === child.id && <Shield className="h-3 w-3 text-primary" />}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                    {forceReassignChildId && (
                      <div className="p-2 border border-amber-300 bg-amber-50 dark:bg-amber-950 rounded-md text-sm">
                        <p className="text-amber-700 dark:text-amber-300 mb-2">This child is currently assigned to another parent. Reassign anyway?</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={assignChild.isPending}
                            onClick={() => assignChild.mutate({ childId: forceReassignChildId, forceReassign: true })}
                            data-testid="button-force-reassign-child"
                          >
                            {assignChild.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Yes, Reassign
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setForceReassignChildId(null)} data-testid="button-cancel-reassign">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {!forceReassignChildId && (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!selectedChildId || assignChild.isPending}
                        onClick={() => { if (selectedChildId) assignChild.mutate({ childId: selectedChildId }); }}
                        data-testid="button-confirm-assign-child"
                      >
                        {assignChild.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                        Assign to Member
                      </Button>
                    )}
                  </div>
                )}

                {childrenMode === "create-new" && (
                  <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Create New Child</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setChildrenMode("list")} data-testid="button-cancel-create-child">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Full Name *</Label>
                        <Input
                          value={newChildName}
                          onChange={(e) => setNewChildName(e.target.value)}
                          placeholder="Child's full name"
                          data-testid="input-new-child-name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date of Birth</Label>
                        <Input
                          type="date"
                          value={newChildDob}
                          onChange={(e) => setNewChildDob(e.target.value)}
                          data-testid="input-new-child-dob"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={newChildGender} onValueChange={setNewChildGender}>
                          <SelectTrigger data-testid="select-new-child-gender">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Emergency Contact</Label>
                        <Input
                          value={newChildEmergencyContact}
                          onChange={(e) => setNewChildEmergencyContact(e.target.value)}
                          placeholder="Emergency contact details"
                          data-testid="input-new-child-emergency"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Medical Notes</Label>
                        <Input
                          value={newChildMedicalNotes}
                          onChange={(e) => setNewChildMedicalNotes(e.target.value)}
                          placeholder="Any medical notes"
                          data-testid="input-new-child-medical"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!newChildName.trim() || createChild.isPending}
                      onClick={() => {
                        createChild.mutate({
                          fullName: newChildName.trim(),
                          dateOfBirth: newChildDob || undefined,
                          gender: newChildGender,
                          emergencyContact: newChildEmergencyContact || undefined,
                          medicalNotes: newChildMedicalNotes || undefined,
                        });
                      }}
                      data-testid="button-confirm-create-child"
                    >
                      {createChild.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
                      Create & Assign
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Acquisition Source
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>How did they hear about us?</Label>
                  <Select value={form.acquisitionSource || "UNSET"} onValueChange={(v) => setForm(f => ({ ...f, acquisitionSource: v === "UNSET" ? "" : v }))}>
                    <SelectTrigger data-testid="select-edit-acquisition"><SelectValue placeholder="Select source..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNSET">Not specified</SelectItem>
                      {ACQUISITION_SOURCES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.acquisitionSource === "OTHER" && (
                  <div>
                    <Label>Other (specify)</Label>
                    <Input value={form.acquisitionSourceOther} onChange={(e) => setForm(f => ({ ...f, acquisitionSourceOther: e.target.value }))} placeholder="Please specify..." data-testid="input-edit-acquisition-other" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password Reset
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Set New Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to keep current password"
                    data-testid="input-edit-password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Only fill this if you want to change the member's password.</p>
                </div>
                {(onResetPassword || onGenerateResetLink) && (
                  <div className="space-y-2">
                    {passwordMode === "none" && (
                      <div className="flex gap-2 flex-wrap">
                        {onResetPassword && (
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPasswordMode("set")} data-testid="button-set-password-mode">
                            <Lock className="w-3 h-3" /> Set Password Directly
                          </Button>
                        )}
                        {onGenerateResetLink && (
                          <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerateLink} disabled={isGeneratingLink} data-testid="button-generate-reset-link">
                            {isGeneratingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                            Generate Reset Link
                          </Button>
                        )}
                      </div>
                    )}
                    {passwordMode === "set" && (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          data-testid="input-direct-password"
                        />
                        <Button onClick={handleSetPassword} disabled={newPassword.length < 6 || isResettingPassword} data-testid="button-confirm-set-password">
                          {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setPasswordMode("none"); setNewPassword(""); }}>Cancel</Button>
                      </div>
                    )}
                    {passwordMode === "link" && generatedLink && (
                      <div className="p-2 bg-muted rounded text-xs break-all flex items-start gap-2">
                        <span className="flex-1" data-testid="text-reset-link">{generatedLink}</span>
                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedLink); toast({ title: "Copied" }); }} data-testid="button-copy-reset-link">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showAssignToClub && onAssignToClub && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="text-sm font-semibold text-muted-foreground border-b pb-1 flex-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Assign to Another Club
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAssignPanel(!showAssignPanel)} data-testid="button-assign-to-club">
                    <Plus className="w-3 h-3" /> Assign
                  </Button>
                </div>
                {showAssignPanel && (
                  <div className="p-3 rounded-lg border border-border/50 space-y-3 bg-muted/30" data-testid="panel-assign-club">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Club</Label>
                        <Select value={assignClubId} onValueChange={setAssignClubId}>
                          <SelectTrigger data-testid="select-assign-club"><SelectValue placeholder="Select club..." /></SelectTrigger>
                          <SelectContent>
                            {clubs.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={assignRole} onValueChange={setAssignRole}>
                          <SelectTrigger data-testid="select-assign-role"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLAYER">Player</SelectItem>
                            <SelectItem value="ORGANISER">Organiser</SelectItem>
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
                            {GRADES.map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!assignClubId || isAssigning}
                      onClick={handleAssign}
                      data-testid="button-confirm-assign"
                    >
                      {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      Assign to Club
                    </Button>
                  </div>
                )}
              </div>
            )}

            {showClubActions && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Club Actions</div>
                <div className="flex gap-2 flex-wrap">
                  {onRemove && (
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
                  )}
                  {onMoveToTrial && playerStatusValue === "ACTIVE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700"
                      onClick={onMoveToTrial}
                      disabled={isMovingToTrial}
                      data-testid="button-move-to-trial"
                    >
                      {isMovingToTrial ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardList className="w-3 h-3" />}
                      Move to Trial
                    </Button>
                  )}
                  {onBan && (playerStatusValue !== "BANNED") && (
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
                  {playerStatusValue === "BANNED" && (
                    <Badge variant="destructive" className="no-default-hover-elevate">Currently Banned</Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-member">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
            {onDelete && (
              <Button variant="outline" className="text-destructive" onClick={onDelete} disabled={isDeleting} data-testid="button-delete-member">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
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
              This will completely remove <strong>{data.fullName}</strong>'s profile from this club, including all club-specific data. They will be able to rejoin the club in the future.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { onRemove?.(); setRemoveConfirmOpen(false); }}
              disabled={isRemoving}
              data-testid="button-confirm-remove"
            >
              {isRemoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
              This will ban <strong>{data.fullName}</strong> from this club. They will not be able to join sessions or participate in matches. This action can be reversed by changing their player status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { onBan?.(); setBanConfirmOpen(false); }}
              disabled={isBanning}
              data-testid="button-confirm-ban"
            >
              {isBanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ban Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
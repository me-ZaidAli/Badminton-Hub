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
  User, Pencil, Save, Trash2, Ban, Loader2, Lock, KeyRound, Copy, Plus, Building2, MapPin, Baby, Megaphone, BarChart3, Shield
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
                <div className="flex items-center gap-2 col-span-2">
                  <Checkbox id="editIsJunior" checked={form.isJunior} onCheckedChange={(v) => setForm(f => ({ ...f, isJunior: !!v }))} data-testid="checkbox-edit-junior" />
                  <Label htmlFor="editIsJunior" className="cursor-pointer">Junior Player (Under 18)</Label>
                </div>
                {form.isJunior && (
                  <>
                    <div>
                      <Label>Parent/Guardian Name</Label>
                      <Input value={form.parentGuardianName} onChange={(e) => setForm(f => ({ ...f, parentGuardianName: e.target.value }))} placeholder="Guardian name" data-testid="input-edit-guardian-name" />
                    </div>
                    <div>
                      <Label>Parent/Guardian Email</Label>
                      <Input type="email" value={form.parentGuardianEmail} onChange={(e) => setForm(f => ({ ...f, parentGuardianEmail: e.target.value }))} placeholder="guardian@email.com" data-testid="input-edit-guardian-email" />
                    </div>
                  </>
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
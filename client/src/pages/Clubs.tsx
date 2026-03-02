import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useClubs, useMyAdminClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClubMap } from "@/components/ui/club-map";
import {
  Users, MapPin, Search, Plus, ArrowRight, List, LayoutGrid, Map,
  CheckCircle, Clock, XCircle, Loader2, Building2, Pencil,
  Trash2, Archive, Pause, Mail, Key, Save, Send, User,
  ChevronDown, ChevronUp, Phone, Calendar, ShieldAlert, UserMinus, Gift, CheckCircle2, Upload, Camera,
  Share2
} from "lucide-react";
import { SocialLinksEditor, SocialLinksDisplay, type SocialLink } from "@/components/SocialLinks";

type Membership = {
  clubId: number;
  clubName: string;
  membershipStatus: string;
  profileId: number;
};

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
  clubPolicies?: string;
  clubStandards?: string;
  sportTypes?: string[];
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
  clubPolicies: string;
  clubStandards: string;
  sportTypes: string[];
  socialLinks: { platform: string; url: string }[];
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
  gender?: string;
  category?: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
    phone?: string;
    city?: string;
    dateOfBirth?: string;
    createdAt?: string;
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

const SPORT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  badminton: { label: "Badminton", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  tennis: { label: "Tennis", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  padel: { label: "Padel", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  squash: { label: "Squash", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  table_tennis: { label: "Table Tennis", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  other: { label: "Other", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
};

function SportTypeBadges({ sportTypes }: { sportTypes?: string[] }) {
  if (!sportTypes || sportTypes.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {sportTypes.map((sport) => {
        const config = SPORT_TYPE_CONFIG[sport];
        if (!config) return null;
        return (
          <Badge
            key={sport}
            variant="secondary"
            className={`text-xs ${config.color} no-default-hover-elevate no-default-active-elevate`}
            data-testid={`badge-sport-${sport}`}
          >
            {config.label}
          </Badge>
        );
      })}
    </div>
  );
}

function getMembershipStatus(memberships: Membership[] | undefined, clubId: number) {
  if (!memberships) return null;
  return memberships.find(m => m.clubId === clubId) || null;
}

function MembershipBadge({ membership }: { membership: Membership | null }) {
  if (!membership) {
    return (
      <Badge variant="outline" className="text-xs" data-testid="badge-not-member">
        Not a member
      </Badge>
    );
  }
  if (membership.membershipStatus === "APPROVED") {
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-accepted">
        <CheckCircle className="w-3 h-3 mr-1" />
        Member
      </Badge>
    );
  }
  if (membership.membershipStatus === "PENDING") {
    return (
      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-pending">
        <Clock className="w-3 h-3 mr-1" />
        Pending Approval
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="badge-rejected">
      <XCircle className="w-3 h-3 mr-1" />
      Rejected
    </Badge>
  );
}

function UserDetailDialog({
  member,
  club,
  open,
  onClose,
  isOwner,
}: {
  member: MemberRecord;
  club: ClubRecord;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
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
                {isOwner && (
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
                )}
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

function PendingMemberCard({
  member,
  onApprove,
  onReject,
  isPending,
}: {
  member: PendingMember;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md" data-testid={`row-pending-member-${member.id}`}>
      <div
        className="flex items-center justify-between gap-3 p-3 cursor-pointer hover-elevate"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" data-testid={`text-pending-name-${member.id}`}>
              {member.user?.fullName || "Unknown"}
            </div>
            <div className="text-xs text-muted-foreground truncate">{member.user?.email || ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {member.gender && (
              <Badge variant="outline" className="text-xs">{member.gender}</Badge>
            )}
            {member.category && (
              <Badge variant="outline" className="text-xs">Cat {(member as any).grade || member.category}</Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {member.user?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{member.user.phone}</span>
              </div>
            )}
            {member.user?.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{member.user.city}</span>
              </div>
            )}
            {member.user?.dateOfBirth && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>DOB: {member.user.dateOfBirth}</span>
              </div>
            )}
            {member.user?.createdAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Joined: {new Date(member.user.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              disabled={isPending}
              data-testid={`button-approve-member-${member.id}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              disabled={isPending}
              data-testid={`button-reject-member-${member.id}`}
            >
              <XCircle className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MembersManagementDialog({
  club,
  open,
  onClose,
  isOwner,
}: {
  club: ClubRecord | null;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
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
        if (categoryFilter !== "ALL" && ((m as any).grade || m.category) !== categoryFilter) return false;
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
                              <Badge variant="outline" className="text-xs">{(m as any).grade || m.category || "-"}</Badge>
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
                <div className="space-y-3 max-h-[50vh] overflow-auto">
                  {pendingMembers.map((pm) => (
                    <PendingMemberCard
                      key={pm.id}
                      member={pm}
                      onApprove={() => approvalMutation.mutate({ profileId: pm.id, status: "APPROVED" })}
                      onReject={() => approvalMutation.mutate({ profileId: pm.id, status: "REJECTED" })}
                      isPending={approvalMutation.isPending}
                    />
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
          isOwner={isOwner}
        />
      )}
    </>
  );
}

function EditClubDialog({
  club,
  open,
  onClose,
  isOwner,
}: {
  club: ClubRecord | null;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
}) {
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !club) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`/api/clubs/${club.id}/logo`, { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      const data = await res.json();
      setLogoPreview(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Logo Updated", description: "Club logo has been uploaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

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
    clubPolicies: "",
    clubStandards: "",
    sportTypes: ["badminton"],
    socialLinks: [],
  });

  useEffect(() => {
    if (club) {
      setLogoPreview(club.logoUrl || null);
      setEditClubForm({
        name: club.name || "",
        description: club.description || "",
        status: club.status || "PENDING",
        address: club.address || "",
        city: club.city || "",
        postcode: club.postcode || "",
        region: club.region || "",
        country: club.country || "",
        continent: club.continent || "",
        contactFullName: club.contactFullName || "",
        contactPhone: club.contactPhone || "",
        contactAddress: club.contactAddress || "",
        hasCompetitions: club.hasCompetitions || false,
        hasSocialGames: club.hasSocialGames || false,
        socialGameTimings: club.socialGameTimings || "",
        providesTraining: club.providesTraining || false,
        trainingDetails: club.trainingDetails || "",
        sessionFee: club.sessionFee != null ? (club.sessionFee / 100).toFixed(2) : "",
        hasMembership: club.hasMembership || false,
        membershipFee: club.membershipFee != null ? (club.membershipFee / 100).toFixed(2) : "",
        shuttlecockType: club.shuttlecockType || "",
        providesClubTShirts: club.providesClubTShirts || false,
        isRegisteredWithBE: club.isRegisteredWithBE || false,
        beRegistrationNumber: club.beRegistrationNumber || "",
        clubPolicies: club.clubPolicies || "",
        clubStandards: club.clubStandards || "",
        sportTypes: club.sportTypes || ["badminton"],
        socialLinks: (club as any).socialLinks || [],
      });
    }
  }, [club]);

  const updateClubMutation = useMutation({
    mutationFn: async (data: { id: number; form: ClubEditForm }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${data.id}`, {
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
        clubPolicies: data.form.clubPolicies,
        clubStandards: data.form.clubStandards,
        sportTypes: data.form.sportTypes,
        socialLinks: data.form.socialLinks,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      onClose();
      toast({ title: "Club Updated", description: "Club details have been saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club", variant: "destructive" });
    },
  });

  if (!club) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
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
                <Label>Club Logo</Label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden flex-shrink-0 bg-muted/30">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Club logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label htmlFor="club-logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted transition-colors text-sm w-fit" data-testid="button-upload-club-logo">
                        {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {uploadingLogo ? "Uploading..." : logoPreview ? "Change Logo" : "Upload Logo"}
                      </div>
                    </label>
                    <input id="club-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} data-testid="input-club-logo-file" />
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. JPG, PNG, or WebP.</p>
                  </div>
                </div>
              </div>
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
                <Label className="mb-2 block">Sport Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "badminton", label: "Badminton" },
                    { id: "tennis", label: "Tennis" },
                    { id: "padel", label: "Padel" },
                    { id: "squash", label: "Squash" },
                    { id: "table_tennis", label: "Table Tennis" },
                    { id: "other", label: "Other" },
                  ].map((sport) => (
                    <div key={sport.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-sport-${sport.id}`}
                        checked={editClubForm.sportTypes.includes(sport.id)}
                        onCheckedChange={(checked) => {
                          setEditClubForm(f => ({
                            ...f,
                            sportTypes: checked
                              ? [...f.sportTypes, sport.id]
                              : f.sportTypes.filter(s => s !== sport.id),
                          }));
                        }}
                        data-testid={`checkbox-edit-sport-${sport.id}`}
                      />
                      <Label htmlFor={`edit-sport-${sport.id}`} className="cursor-pointer font-normal">{sport.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              {isOwner && (
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
              )}
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
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Policies & Standards</div>
            <div className="space-y-3">
              <div>
                <Label>Club Policies</Label>
                <Textarea
                  value={editClubForm.clubPolicies}
                  onChange={(e) => setEditClubForm(f => ({ ...f, clubPolicies: e.target.value }))}
                  placeholder="Code of conduct, cancellation policy, payment terms..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-edit-club-policies"
                />
              </div>
              <div>
                <Label>Standards & Expectations</Label>
                <Textarea
                  value={editClubForm.clubStandards}
                  onChange={(e) => setEditClubForm(f => ({ ...f, clubStandards: e.target.value }))}
                  placeholder="Expected skill level, sportsmanship, dress code..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-edit-club-standards"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Social Media & Links
            </div>
            <SocialLinksEditor
              links={editClubForm.socialLinks}
              onChange={(links) => setEditClubForm(f => ({ ...f, socialLinks: links }))}
            />
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
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit-club">Cancel</Button>
          <Button
            onClick={() => club && updateClubMutation.mutate({ id: club.id, form: editClubForm })}
            disabled={updateClubMutation.isPending}
            data-testid="button-save-edit-club"
          >
            {updateClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminActionButtons({
  club,
  canEdit,
  canManage,
  onEdit,
  onManage,
}: {
  club: any;
  canEdit: boolean;
  canManage: boolean;
  onEdit: (e: React.MouseEvent) => void;
  onManage: (e: React.MouseEvent) => void;
}) {
  if (!canEdit && !canManage) return null;
  return (
    <div className="flex items-center gap-1" style={{ visibility: "visible" }}>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          data-testid={`button-edit-club-${club.id}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
      )}
      {canManage && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onManage}
          data-testid={`button-manage-members-${club.id}`}
        >
          <Users className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default function Clubs() {
  const { data: user } = useUser();
  const { data: clubs, isLoading } = useClubs();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinReferralCode, setJoinReferralCode] = useState("");
  const [joinReferralStatus, setJoinReferralStatus] = useState<{ valid: boolean; referrerName?: string; message?: string } | null>(null);
  const [validatingJoinReferral, setValidatingJoinReferral] = useState(false);
  const [cancelJoinClubId, setCancelJoinClubId] = useState<number | null>(null);
  const [editClub, setEditClub] = useState<ClubRecord | null>(null);
  const [manageClub, setManageClub] = useState<ClubRecord | null>(null);

  const [clubScope, setClubScope] = useState<"my" | "all">("my");
  const isOwnerRole = user?.role === "OWNER";
  const isAdminRole = user?.role === "ADMIN";

  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  const { data: memberships } = useQuery<Membership[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const myAdminClubIds = useMemo(() => {
    if (!myAdminClubs) return new Set<number>();
    return new Set(myAdminClubs.map(c => c.id));
  }, [myAdminClubs]);

  const hasClubAdminAccess = isOwnerRole || isAdminRole || myAdminClubIds.size > 0;
  const isRegularPlayer = user && !hasClubAdminAccess;

  const myClubIds = useMemo(() => {
    if (!memberships) return new Set<number>();
    const ids = new Set(memberships.filter(m => m.membershipStatus === "APPROVED").map(m => m.clubId));
    for (const id of myAdminClubIds) ids.add(id);
    return ids;
  }, [memberships, myAdminClubIds]);

  const joinMutation = useMutation({
    mutationFn: async (data: { clubId: number; referralCode?: string }) => {
      const res = await apiRequest("POST", "/api/clubs/join", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Join request submitted",
        description: joinReferralStatus?.valid
          ? "Your referral code has been applied. The club admin will review your request."
          : "The club admin will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] });
      setJoinDialogOpen(false);
      setSelectedClub(null);
      setJoinReferralCode("");
      setJoinReferralStatus(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelJoinMutation = useMutation({
    mutationFn: async (clubId: number) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/cancel-join`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request cancelled", description: "Your join request has been withdrawn." });
      queryClient.invalidateQueries({ queryKey: ["/api/user/memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] });
      setCancelJoinClubId(null);
      setSelectedClub(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const baseClubs = useMemo(() => {
    if (!clubs) return [];
    if (isRegularPlayer && clubScope === "my") {
      return clubs.filter(c => myClubIds.has(c.id));
    }
    return clubs;
  }, [clubs, isRegularPlayer, myClubIds, clubScope]);

  const filteredClubs = baseClubs.filter(club => {
    const query = searchQuery.toLowerCase();
    return (
      club.name.toLowerCase().includes(query) ||
      club.description?.toLowerCase().includes(query) ||
      club.city?.toLowerCase().includes(query) ||
      club.postcode?.toLowerCase().includes(query) ||
      club.address?.toLowerCase().includes(query) ||
      club.country?.toLowerCase().includes(query)
    );
  });

  const clubsWithLocation = filteredClubs.filter(c => c.latitude && c.longitude);

  const handleClubClick = (club: any) => {
    if (user) {
      setSelectedClub(club);
    }
  };

  const handleJoinRequest = () => {
    if (!selectedClub || !user) return;
    const payload: { clubId: number; referralCode?: string } = { clubId: selectedClub.id };
    if (joinReferralCode.trim() && joinReferralStatus?.valid) {
      payload.referralCode = joinReferralCode.trim();
    }
    joinMutation.mutate(payload);
  };

  const validateJoinReferral = async (code: string) => {
    if (!code.trim()) {
      setJoinReferralStatus(null);
      return;
    }
    setValidatingJoinReferral(true);
    try {
      const res = await fetch(`/api/referrals/validate/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setJoinReferralStatus(data);
    } catch {
      setJoinReferralStatus({ valid: false, message: "Failed to validate code" });
    } finally {
      setValidatingJoinReferral(false);
    }
  };

  const getJoinButtonState = (clubId: number) => {
    const membership = getMembershipStatus(memberships, clubId);
    if (!membership) return "join";
    if (membership.membershipStatus === "APPROVED") return "member";
    if (membership.membershipStatus === "PENDING") return "pending";
    return "rejected";
  };

  const canEditClub = (clubId: number) => {
    if (!user) return false;
    if (isOwnerRole) return true;
    if (myAdminClubIds.has(clubId)) return true;
    return false;
  };

  const canManageMembers = (clubId: number) => {
    if (!user) return false;
    if (isOwnerRole) return true;
    if (myAdminClubIds.has(clubId)) return true;
    return false;
  };

  const handleEditClick = (e: React.MouseEvent, club: any) => {
    e.stopPropagation();
    setEditClub(club as ClubRecord);
  };

  const handleManageClick = (e: React.MouseEvent, club: any) => {
    e.stopPropagation();
    setManageClub(club as ClubRecord);
  };

  return (
    <div className="min-h-screen bg-background">
      {!user && (
        <header className="border-b bg-card px-6 py-4 flex justify-between items-center flex-wrap gap-2">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">Club Master</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </header>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader 
          title={isRegularPlayer && clubScope === "my" ? "My Clubs" : "Browse Clubs"}
          description={isRegularPlayer && clubScope === "my" ? "Clubs you are a member of." : "Find a club near you. Search by name, city, postcode, or country."}
        />

        <div className="flex flex-wrap items-center gap-3">
          {isRegularPlayer && (
            <div className="flex items-center gap-1">
              <Button
                variant={clubScope === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => setClubScope("my")}
                data-testid="button-clubs-scope-my"
              >
                My Clubs
              </Button>
              <Button
                variant={clubScope === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setClubScope("all")}
                data-testid="button-clubs-scope-all"
              >
                All Clubs
              </Button>
            </div>
          )}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by club name, city, postcode, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clubs"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant={viewMode === "grid" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "map" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {user && user.role === "OWNER" && (
            <Link href="/create-club">
              <Button data-testid="button-create-club">
                <Plus className="w-4 h-4 mr-2" />
                Create Club
              </Button>
            </Link>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''} found
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No clubs found matching your search." : "No clubs available yet."}
              </p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different city, postcode, or club name.
                </p>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "map" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredClubs.map(club => {
                  const membership = getMembershipStatus(memberships, club.id);
                  const showEdit = canEditClub(club.id);
                  const showManage = canManageMembers(club.id);
                  return (
                    <Card
                      key={club.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleClubClick(club)}
                      data-testid={`club-card-${club.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{club.name}</h3>
                            {(club.city || club.postcode) && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {[club.city, club.postcode, club.country].filter(Boolean).join(", ")}
                                </span>
                              </div>
                            )}
                            <div className="mt-1">
                              <SportTypeBadges sportTypes={(club as any).sportTypes} />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {user && <MembershipBadge membership={membership} />}
                            <AdminActionButtons
                              club={club}
                              canEdit={showEdit}
                              canManage={showManage}
                              onEdit={(e) => handleEditClick(e, club)}
                              onManage={(e) => handleManageClick(e, club)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            <div className="lg:sticky lg:top-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Club Locations
                  </CardTitle>
                  <CardDescription>
                    {clubsWithLocation.length} club{clubsWithLocation.length !== 1 ? 's' : ''} shown on map
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <ClubMap clubs={clubsWithLocation} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {filteredClubs.map(club => {
              const membership = getMembershipStatus(memberships, club.id);
              const showEdit = canEditClub(club.id);
              const showManage = canManageMembers(club.id);
              return (
                <Card
                  key={club.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleClubClick(club)}
                  data-testid={`club-card-${club.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="h-10 w-10 rounded object-contain" />
                          ) : (
                            <Building2 className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{club.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[club.city, club.postcode, club.country].filter(Boolean).join(", ") || club.slug}
                            </span>
                          </div>
                          <div className="mt-1">
                            <SportTypeBadges sportTypes={(club as any).sportTypes} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user && <MembershipBadge membership={membership} />}
                        <AdminActionButtons
                          club={club}
                          canEdit={showEdit}
                          canManage={showManage}
                          onEdit={(e) => handleEditClick(e, club)}
                          onManage={(e) => handleManageClick(e, club)}
                        />
                        <Button size="sm" variant="outline" data-testid={`button-view-club-${club.id}`}>
                          View
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => {
              const membership = getMembershipStatus(memberships, club.id);
              const showEdit = canEditClub(club.id);
              const showManage = canManageMembers(club.id);
              return (
                <Card
                  key={club.id}
                  className="hover-elevate transition-all cursor-pointer"
                  onClick={() => handleClubClick(club)}
                  data-testid={`club-card-${club.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="h-8 w-8 rounded object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{club.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[club.city, club.postcode].filter(Boolean).join(", ") || club.slug}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <AdminActionButtons
                        club={club}
                        canEdit={showEdit}
                        canManage={showManage}
                        onEdit={(e) => handleEditClick(e, club)}
                        onManage={(e) => handleManageClick(e, club)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SportTypeBadges sportTypes={(club as any).sportTypes} />
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description || "A great place to play and meet fellow players."}
                    </p>
                    {club.country && (
                      <p className="text-xs text-muted-foreground">{club.country}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {user ? (
                        <MembershipBadge membership={membership} />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>Open for members</span>
                        </div>
                      )}
                      {!user && (
                        <Link href="/register">
                          <Button size="sm" variant="outline">
                            Register to Join
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedClub} onOpenChange={(open) => { if (!open) { setSelectedClub(null); setJoinReferralCode(""); setJoinReferralStatus(null); } }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-club-detail">
          {selectedClub && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {selectedClub.logoUrl ? (
                      <img src={selectedClub.logoUrl} alt={selectedClub.name} className="h-10 w-10 rounded object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <DialogTitle>{selectedClub.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[selectedClub.city, selectedClub.postcode, selectedClub.country].filter(Boolean).join(", ") || "Location not set"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedClub.description && (
                  <p className="text-sm text-muted-foreground">{selectedClub.description}</p>
                )}

                {selectedClub.address && (
                  <div className="text-sm">
                    <span className="font-medium">Address:</span>{" "}
                    <span className="text-muted-foreground">{selectedClub.address}</span>
                  </div>
                )}

                {selectedClub.playerLevels && selectedClub.playerLevels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Levels:</span>
                    {selectedClub.playerLevels.map((level: string) => (
                      <Badge key={level} variant="outline" className="text-xs capitalize">{level}</Badge>
                    ))}
                  </div>
                )}

                {selectedClub.sessionFee != null && (
                  <div className="text-sm">
                    <span className="font-medium">Session Fee:</span>{" "}
                    <span className="text-muted-foreground">{"\u00A3"}{(selectedClub.sessionFee / 100).toFixed(2)}</span>
                  </div>
                )}

                <SocialLinksDisplay links={selectedClub.socialLinks || []} />

                {user && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium">Your Status:</span>
                      {selectedClub.ownerId === user.id ? (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid="badge-owner">
                          <Building2 className="w-3 h-3 mr-1" />
                          Club Owner
                        </Badge>
                      ) : (
                        <MembershipBadge membership={getMembershipStatus(memberships, selectedClub.id)} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-3">
                {user && (canEditClub(selectedClub.id) || canManageMembers(selectedClub.id)) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {canEditClub(selectedClub.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditClub(selectedClub as ClubRecord);
                          setSelectedClub(null);
                        }}
                        data-testid="button-detail-edit-club"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit Club
                      </Button>
                    )}
                    {canManageMembers(selectedClub.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManageClub(selectedClub as ClubRecord);
                          setSelectedClub(null);
                        }}
                        data-testid="button-detail-manage-members"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Manage Members
                      </Button>
                    )}
                  </div>
                )}
                {user && (() => {
                  const isOwner = selectedClub.ownerId === user.id;
                  if (isOwner) {
                    return null;
                  }
                  const state = getJoinButtonState(selectedClub.id);
                  if (state === "member") {
                    return (
                      <Button className="w-full sm:w-auto" data-testid="button-go-dashboard" onClick={() => { setSelectedClub(null); navigate("/dashboard"); }}>
                        Go to Dashboard
                      </Button>
                    );
                  }
                  if (state === "pending") {
                    return (
                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Button disabled className="flex-1" data-testid="button-join-pending">
                          <Clock className="w-4 h-4 mr-2" />
                          Request Sent (Pending Approval)
                        </Button>
                        <Button
                          variant="destructive"
                          size="default"
                          className="flex-shrink-0"
                          onClick={() => setCancelJoinClubId(selectedClub.id)}
                          data-testid="button-cancel-join-request"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div className="w-full space-y-3">
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Gift className="w-4 h-4" />
                          Referral Code (optional)
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g. REF-A1B2C3D4"
                            value={joinReferralCode}
                            onChange={(e) => {
                              setJoinReferralCode(e.target.value.toUpperCase());
                              if (!e.target.value.trim()) setJoinReferralStatus(null);
                            }}
                            className="flex-1 h-9 text-sm"
                            data-testid="input-join-referral-code"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => validateJoinReferral(joinReferralCode)}
                            disabled={!joinReferralCode.trim() || validatingJoinReferral}
                            data-testid="button-validate-join-referral"
                          >
                            {validatingJoinReferral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify"}
                          </Button>
                        </div>
                        {joinReferralStatus && (
                          <div
                            className={`flex items-center gap-2 text-xs rounded-md p-2 ${
                              joinReferralStatus.valid
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-destructive/10 text-destructive"
                            }`}
                            data-testid="text-join-referral-status"
                          >
                            {joinReferralStatus.valid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Valid referral from <strong>{joinReferralStatus.referrerName}</strong></span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{joinReferralStatus.message || "Invalid referral code"}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleJoinRequest}
                        disabled={joinMutation.isPending}
                        className="w-full"
                        data-testid="button-request-join"
                      >
                        {joinMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Request to Join Club
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })()}
                {!user && (
                  <Link href="/register">
                    <Button data-testid="button-register-join">
                      Register to Join
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <EditClubDialog
        club={editClub}
        open={!!editClub}
        onClose={() => setEditClub(null)}
        isOwner={isOwnerRole}
      />

      <MembersManagementDialog
        club={manageClub}
        open={!!manageClub}
        onClose={() => setManageClub(null)}
        isOwner={isOwnerRole}
      />

      <AlertDialog open={cancelJoinClubId !== null} onOpenChange={(open) => { if (!open) setCancelJoinClubId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Join Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your join request? You can always request to join again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-join-dismiss">Keep Request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (cancelJoinClubId) cancelJoinMutation.mutate(cancelJoinClubId); }}
              disabled={cancelJoinMutation.isPending}
              data-testid="button-cancel-join-confirm"
            >
              {cancelJoinMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

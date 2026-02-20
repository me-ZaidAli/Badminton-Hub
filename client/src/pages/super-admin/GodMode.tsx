import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import {
  Shield, Zap, Users, MapPin, Calendar, Search, Plus, Loader2,
  Save, Trash2, Pencil, Building2, Clock, User, Mail, DollarSign,
  Package, CreditCard, Upload, ChevronRight, Merge, BarChart3, Bell, Gift
} from "lucide-react";
import { MergeProfilesModal, MergeLogsPanel } from "@/components/MergeProfilesModal";

const controlItems = [
  { href: "/super-admin/users-management", label: "Users Management", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/admin/messages", label: "Messages", icon: Mail, color: "text-pink-500", bg: "bg-pink-500/10" },
  { href: "/admin/financials", label: "Financials", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
  { href: "/admin/inventory", label: "Inventory", icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
  { href: "/admin/clubs-management", label: "Clubs Management", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "/admin/import-members", label: "Import Members", icon: Upload, color: "text-rose-500", bg: "bg-rose-500/10" },
  { href: "/admin/acquisition-analytics", label: "Acquisition & KPI Analytics", icon: BarChart3, color: "text-amber-500", bg: "bg-amber-500/10" },
  { href: "/admin/notifications", label: "Notification Settings", icon: Bell, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { href: "/admin/rewards", label: "Club Rewards", icon: Gift, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

interface ClubRecord {
  id: number;
  name: string;
  slug: string;
  status: string;
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
  joinedAt?: string;
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
    accountStatus?: string;
    profilePictureUrl?: string;
    createdAt?: string;
    acquisitionSource?: string;
    acquisitionSourceOther?: string;
  };
}

const ACQUISITION_SOURCES = [
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

interface SessionRecord {
  id: number;
  clubId: number;
  venueId?: number | null;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxPlayers: number;
  courtsAvailable: number;
  allowedCategories: string[];
  matchMode: string;
  isPrivate: boolean;
  genderRestriction: string;
  sessionType: string;
  juniorAgeGroups?: string[];
  playersPerSide: number;
  matchGenderType: string;
  status?: string;
  sessionFee?: number | null;
  shuttlecockType?: string | null;
  courtNames?: string[] | null;
  liveStreamUrl?: string | null;
  defaultPointsToPlayTo?: number;
  numberOfSets?: number;
  autoGenerateActive?: boolean;
  signupCount?: number;
  venue?: { id: number; name: string } | null;
}

interface VenueRecord {
  id: number;
  clubId: number;
  name: string;
  address: string;
  city?: string | null;
  postcode?: string | null;
  googleMapsUrl?: string | null;
  isDefault: boolean;
  courtNames?: string[] | null;
}

const GRADES = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];

function MembershipDurationBanner({ joinedAt }: { joinedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const start = new Date(joinedAt).getTime();
      const now = Date.now();
      const diff = now - start;
      if (diff < 0) { setElapsed("Just joined"); return; }

      const totalSeconds = Math.floor(diff / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);

      const years = Math.floor(totalDays / 365);
      const remainDays = totalDays - years * 365;
      const months = Math.floor(remainDays / 30);
      const days = remainDays - months * 30;
      const hours = totalHours % 24;
      const minutes = totalMinutes % 60;
      const seconds = totalSeconds % 60;

      const parts: string[] = [];
      if (years > 0) parts.push(`${years}y`);
      if (months > 0) parts.push(`${months}m`);
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours}h ${minutes}m ${seconds}s`);
      setElapsed(parts.join(" "));
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [joinedAt]);

  const joinDate = new Date(joinedAt);
  const formattedDate = joinDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-3 border rounded-md bg-muted/30" data-testid="banner-membership-duration">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Club Member Since: {formattedDate}</span>
      </div>
      <div className="text-lg font-bold font-mono tracking-wider text-foreground" data-testid="text-duration-counter">
        {elapsed}
      </div>
    </div>
  );
}

function MemberEditModal({ member, clubId, open, onClose }: { member: MemberRecord | null; clubId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = !member;
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", nickname: "", password: "",
    gender: "", category: "C3", clubRole: "PLAYER", playerStatus: "ACTIVE",
    membershipStatus: "APPROVED", role: "PLAYER",
    city: "", country: "", region: "", continent: "",
    dateOfBirth: "", isJunior: false, parentGuardianName: "", parentGuardianEmail: "",
    acquisitionSource: "", acquisitionSourceOther: "",
    rankingPoints: "0", matchesPlayed: "0", matchesWon: "0",
    joinedAt: "",
  });
  const [showAssignClub, setShowAssignClub] = useState(false);
  const [assignClubId, setAssignClubId] = useState("");
  const [assignClubRole, setAssignClubRole] = useState("PLAYER");
  const [assignGrade, setAssignGrade] = useState("C3");

  const { data: allClubs } = useQuery<{ id: number; name: string; status: string }[]>({
    queryKey: ["/api/admin/clubs"],
    enabled: open && !isNew && showAssignClub,
  });

  const { data: userProfiles } = useQuery<{ clubId: number }[]>({
    queryKey: ["/api/god-mode/user-profiles", member?.userId],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/player-profiles-by-user/${member!.userId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !isNew && showAssignClub && !!member?.userId,
  });

  const assignToClubMutation = useMutation({
    mutationFn: async ({ userId, targetClubId, role, grade }: { userId: number; targetClubId: number; role: string; grade: string }) => {
      const res = await apiRequest("POST", "/api/god-mode/assign-user-to-club", { userId, clubId: targetClubId, clubRole: role, grade });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
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

  useEffect(() => {
    setShowAssignClub(false);
    setAssignClubId("");
    if (member) {
      setForm({
        fullName: member.user?.fullName || "",
        email: member.user?.email || "",
        phone: member.user?.phone || "",
        nickname: member.user?.nickname || "",
        password: "",
        gender: member.gender || "",
        category: member.grade || member.category || "C3",
        clubRole: member.clubRole || "PLAYER",
        playerStatus: member.playerStatus || "ACTIVE",
        membershipStatus: member.membershipStatus || "APPROVED",
        role: member.user?.role || "PLAYER",
        city: member.user?.city || "",
        country: member.user?.country || "",
        region: member.user?.region || "",
        continent: member.user?.continent || "",
        dateOfBirth: member.user?.dateOfBirth ? member.user.dateOfBirth.split("T")[0] : "",
        isJunior: member.user?.isJunior || false,
        parentGuardianName: member.user?.parentGuardianName || "",
        parentGuardianEmail: member.user?.parentGuardianEmail || "",
        acquisitionSource: member.user?.acquisitionSource || "",
        acquisitionSourceOther: member.user?.acquisitionSourceOther || "",
        rankingPoints: String(member.rankingPoints || 0),
        matchesPlayed: String(member.matchesPlayed || 0),
        matchesWon: String(member.matchesWon || 0),
        joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString().split("T")[0] : "",
      });
    } else {
      setForm({
        fullName: "", email: "", phone: "", nickname: "", password: "",
        gender: "", category: "C3", clubRole: "PLAYER", playerStatus: "ACTIVE",
        membershipStatus: "APPROVED", role: "PLAYER",
        city: "", country: "", region: "", continent: "",
        dateOfBirth: "", isJunior: false, parentGuardianName: "", parentGuardianEmail: "",
        acquisitionSource: "", acquisitionSourceOther: "",
        rankingPoints: "0", matchesPlayed: "0", matchesWon: "0",
        joinedAt: "",
      });
    }
  }, [member, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        await apiRequest("POST", `/api/god-mode/clubs/${clubId}/add-member`, {
          fullName: form.fullName, email: form.email, phone: form.phone,
          nickname: form.nickname, gender: form.gender || null,
          category: form.category, clubRole: form.clubRole,
          password: form.password || undefined,
        });
      } else {
        await apiRequest("PATCH", `/api/clubs/${clubId}/members/${member!.id}/comprehensive`, {
          fullName: form.fullName, email: form.email, phone: form.phone,
          nickname: form.nickname, gender: form.gender || null,
          category: form.category, clubRole: form.clubRole,
          playerStatus: form.playerStatus, membershipStatus: form.membershipStatus,
          role: form.role, city: form.city, country: form.country,
          region: form.region, continent: form.continent,
          dateOfBirth: form.dateOfBirth || null,
          isJunior: form.isJunior,
          parentGuardianName: form.parentGuardianName,
          parentGuardianEmail: form.parentGuardianEmail,
          acquisitionSource: form.acquisitionSource || null,
          acquisitionSourceOther: form.acquisitionSourceOther || null,
          rankingPoints: Number(form.rankingPoints),
          matchesPlayed: Number(form.matchesPlayed),
          matchesWon: Number(form.matchesWon),
          joinedAt: form.joinedAt || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members-comprehensive"] });
      toast({ title: isNew ? "Member Added" : "Member Updated" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clubs/${clubId}/members/${member!.id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members-comprehensive"] });
      toast({ title: "Member Deleted" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-god-member">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {isNew ? "Add New Member" : `Edit: ${member?.user?.fullName || "Member"}`}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto space-y-5 py-2 pr-2">
          {!isNew && form.joinedAt && (
            <MembershipDurationBanner joinedAt={form.joinedAt} />
          )}
          {!isNew && (
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Membership</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Joined Date</Label>
                  <Input type="date" value={form.joinedAt} onChange={(e) => setForm(f => ({ ...f, joinedAt: e.target.value }))} data-testid="input-god-joined-at" />
                </div>
              </div>
            </div>
          )}
          {!isNew && (
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Player KPIs (Editable)</div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Ranking Points</Label>
                  <Input type="number" min={0} value={form.rankingPoints} onChange={(e) => setForm(f => ({ ...f, rankingPoints: e.target.value }))} data-testid="input-god-ranking-points" />
                </div>
                <div>
                  <Label className="text-xs">Matches Played</Label>
                  <Input type="number" min={0} value={form.matchesPlayed} onChange={(e) => setForm(f => ({ ...f, matchesPlayed: e.target.value }))} data-testid="input-god-matches-played" />
                </div>
                <div>
                  <Label className="text-xs">Matches Won</Label>
                  <Input type="number" min={0} value={form.matchesWon} onChange={(e) => setForm(f => ({ ...f, matchesWon: e.target.value }))} data-testid="input-god-matches-won" />
                </div>
                <div>
                  <Label className="text-xs">Win Rate</Label>
                  <div className="flex items-center h-9 px-3 border rounded-md bg-muted/30 text-sm font-medium">
                    {Number(form.matchesPlayed) > 0 ? Math.round((Number(form.matchesWon) / Number(form.matchesPlayed)) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Personal Info</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full Name</Label>
                <Input value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-god-member-name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} data-testid="input-god-member-email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-god-member-phone" />
              </div>
              <div>
                <Label>Nickname</Label>
                <Input value={form.nickname} onChange={(e) => setForm(f => ({ ...f, nickname: e.target.value }))} data-testid="input-god-member-nickname" />
              </div>
              {isNew && (
                <div className="col-span-2">
                  <Label>Password (default: changeme123)</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for default" data-testid="input-god-member-password" />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Profile Settings</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger data-testid="select-god-member-gender"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-god-member-grade"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Club Role</Label>
                <Select value={form.clubRole} onValueChange={(v) => setForm(f => ({ ...f, clubRole: v }))}>
                  <SelectTrigger data-testid="select-god-member-club-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="ORGANISER">Organiser</SelectItem>
                    <SelectItem value="PLAYER">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isNew && (
                <>
                  <div>
                    <Label>Player Status</Label>
                    <Select value={form.playerStatus} onValueChange={(v) => setForm(f => ({ ...f, playerStatus: v }))}>
                      <SelectTrigger data-testid="select-god-member-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Membership Status</Label>
                    <Select value={form.membershipStatus} onValueChange={(v) => setForm(f => ({ ...f, membershipStatus: v }))}>
                      <SelectTrigger data-testid="select-god-member-membership"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>System Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger data-testid="select-god-member-system-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="PLAYER">Player</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isNew && (
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Location</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-god-member-city" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} data-testid="input-god-member-country" />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} data-testid="input-god-member-region" />
                </div>
                <div>
                  <Label>Continent</Label>
                  <Input value={form.continent} onChange={(e) => setForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-god-member-continent" />
                </div>
              </div>
            </div>
          )}

          {!isNew && (
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Junior / Guardian</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-god-member-dob" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="isJunior" checked={form.isJunior} onCheckedChange={(v) => setForm(f => ({ ...f, isJunior: !!v }))} data-testid="checkbox-god-member-junior" />
                  <Label htmlFor="isJunior" className="cursor-pointer">Is Junior</Label>
                </div>
                <div>
                  <Label>Parent/Guardian Name</Label>
                  <Input value={form.parentGuardianName} onChange={(e) => setForm(f => ({ ...f, parentGuardianName: e.target.value }))} data-testid="input-god-member-guardian-name" />
                </div>
                <div>
                  <Label>Parent/Guardian Email</Label>
                  <Input value={form.parentGuardianEmail} onChange={(e) => setForm(f => ({ ...f, parentGuardianEmail: e.target.value }))} data-testid="input-god-member-guardian-email" />
                </div>
              </div>
            </div>
          )}
          {!isNew && (
            <div>
              <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Acquisition Source</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>How did they hear about us?</Label>
                  <Select value={form.acquisitionSource || "UNSET"} onValueChange={(v) => setForm(f => ({ ...f, acquisitionSource: v === "UNSET" ? "" : v }))}>
                    <SelectTrigger data-testid="select-god-member-acquisition"><SelectValue placeholder="Select source..." /></SelectTrigger>
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
                    <Input value={form.acquisitionSourceOther} onChange={(e) => setForm(f => ({ ...f, acquisitionSourceOther: e.target.value }))} placeholder="Please specify..." data-testid="input-god-member-acquisition-other" />
                  </div>
                )}
              </div>
            </div>
          )}
          {!isNew && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="text-sm font-semibold text-muted-foreground border-b pb-1 flex-1">Assign to Another Club</div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAssignClub(!showAssignClub)} data-testid="button-god-assign-to-club">
                  <Plus className="w-3 h-3" /> Assign
                </Button>
              </div>
              {showAssignClub && (
                <div className="p-3 rounded-lg border border-border/50 space-y-3 bg-muted/30" data-testid="panel-god-assign-club">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Club</Label>
                      <Select value={assignClubId} onValueChange={setAssignClubId}>
                        <SelectTrigger data-testid="select-god-assign-club"><SelectValue placeholder="Select club..." /></SelectTrigger>
                        <SelectContent>
                          {allClubs?.filter(c => {
                            const existingClubIds = new Set(userProfiles?.map(p => p.clubId) || []);
                            existingClubIds.add(clubId);
                            return !existingClubIds.has(c.id);
                          }).map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Select value={assignClubRole} onValueChange={setAssignClubRole}>
                        <SelectTrigger data-testid="select-god-assign-role"><SelectValue /></SelectTrigger>
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
                        <SelectTrigger data-testid="select-god-assign-grade"><SelectValue /></SelectTrigger>
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
                    disabled={!assignClubId || assignToClubMutation.isPending}
                    onClick={() => assignToClubMutation.mutate({ userId: member!.userId, targetClubId: Number(assignClubId), role: assignClubRole, grade: assignGrade })}
                    data-testid="button-god-confirm-assign"
                  >
                    {assignToClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    Assign to Club
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-god-save-member">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {isNew ? "Add Member" : "Save Changes"}
          </Button>
          {!isNew && (
            <Button variant="outline" className="text-destructive" onClick={() => { if (confirm("Delete this member permanently?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} data-testid="button-god-delete-member">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionEditModal({ session, clubId, venues, open, onClose }: { session: SessionRecord | null; clubId: number; venues: VenueRecord[]; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = !session;
  const [form, setForm] = useState({
    title: "", date: "", startTime: "19:00", durationMinutes: "120",
    maxPlayers: "24", courtsAvailable: "4", matchMode: "SOCIAL",
    isPrivate: false, genderRestriction: "ALL", sessionType: "OPEN",
    playersPerSide: "2", matchGenderType: "MIXED", status: "UPCOMING",
    sessionFee: "", shuttlecockType: "", venueId: "",
    defaultPointsToPlayTo: "21", numberOfSets: "1",
    autoGenerateActive: false, liveStreamUrl: "",
    allowedCategories: ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"] as string[],
  });

  useEffect(() => {
    if (session) {
      setForm({
        title: session.title || "",
        date: session.date ? session.date.split("T")[0] : "",
        startTime: session.startTime || "19:00",
        durationMinutes: String(session.durationMinutes || 120),
        maxPlayers: String(session.maxPlayers || 24),
        courtsAvailable: String(session.courtsAvailable || 4),
        matchMode: session.matchMode || "SOCIAL",
        isPrivate: session.isPrivate || false,
        genderRestriction: session.genderRestriction || "ALL",
        sessionType: session.sessionType || "OPEN",
        playersPerSide: String(session.playersPerSide || 2),
        matchGenderType: session.matchGenderType || "MIXED",
        status: session.status || "UPCOMING",
        sessionFee: session.sessionFee != null ? String(session.sessionFee) : "",
        shuttlecockType: session.shuttlecockType || "",
        venueId: session.venueId ? String(session.venueId) : "",
        defaultPointsToPlayTo: String(session.defaultPointsToPlayTo || 21),
        numberOfSets: String(session.numberOfSets || 1),
        autoGenerateActive: session.autoGenerateActive || false,
        liveStreamUrl: session.liveStreamUrl || "",
        allowedCategories: session.allowedCategories || ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      });
    } else {
      setForm({
        title: "", date: "", startTime: "19:00", durationMinutes: "120",
        maxPlayers: "24", courtsAvailable: "4", matchMode: "SOCIAL",
        isPrivate: false, genderRestriction: "ALL", sessionType: "OPEN",
        playersPerSide: "2", matchGenderType: "MIXED", status: "UPCOMING",
        sessionFee: "", shuttlecockType: "", venueId: "",
        defaultPointsToPlayTo: "21", numberOfSets: "1",
        autoGenerateActive: false, liveStreamUrl: "",
        allowedCategories: ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"],
      });
    }
  }, [session, open]);

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      allowedCategories: f.allowedCategories.includes(cat)
        ? f.allowedCategories.filter(c => c !== cat)
        : [...f.allowedCategories, cat],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        date: new Date(form.date).toISOString(),
        startTime: form.startTime,
        durationMinutes: parseInt(form.durationMinutes),
        maxPlayers: parseInt(form.maxPlayers),
        courtsAvailable: parseInt(form.courtsAvailable),
        matchMode: form.matchMode,
        isPrivate: form.isPrivate,
        genderRestriction: form.genderRestriction,
        sessionType: form.sessionType,
        playersPerSide: parseInt(form.playersPerSide),
        matchGenderType: form.matchGenderType,
        allowedCategories: form.allowedCategories,
        defaultPointsToPlayTo: parseInt(form.defaultPointsToPlayTo),
        numberOfSets: parseInt(form.numberOfSets),
        autoGenerateActive: form.autoGenerateActive,
        sessionFee: form.sessionFee ? parseInt(form.sessionFee) : null,
        shuttlecockType: form.shuttlecockType || null,
        venueId: form.venueId ? parseInt(form.venueId) : null,
        liveStreamUrl: form.liveStreamUrl || null,
      };
      if (isNew) {
        payload.clubId = clubId;
        await apiRequest("POST", "/api/sessions", payload);
      } else {
        payload.status = form.status;
        await apiRequest("PATCH", `/api/sessions/${session!.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: isNew ? "Session Created" : "Session Updated" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-god-session">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {isNew ? "Create New Session" : `Edit: ${session?.title || "Session"}`}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto space-y-5 py-2 pr-2">
          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Basic Info</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-god-session-title" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} data-testid="input-god-session-date" />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} data-testid="input-god-session-time" />
              </div>
              <div>
                <Label>Duration (mins)</Label>
                <Input type="number" value={form.durationMinutes} onChange={(e) => setForm(f => ({ ...f, durationMinutes: e.target.value }))} data-testid="input-god-session-duration" />
              </div>
              <div>
                <Label>Venue</Label>
                <Select value={form.venueId} onValueChange={(v) => setForm(f => ({ ...f, venueId: v }))}>
                  <SelectTrigger data-testid="select-god-session-venue"><SelectValue placeholder="Select venue..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Venue</SelectItem>
                    {venues.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!isNew && (
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-god-session-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Capacity & Courts</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Players</Label>
                <Input type="number" value={form.maxPlayers} onChange={(e) => setForm(f => ({ ...f, maxPlayers: e.target.value }))} data-testid="input-god-session-max" />
              </div>
              <div>
                <Label>Courts Available</Label>
                <Input type="number" value={form.courtsAvailable} onChange={(e) => setForm(f => ({ ...f, courtsAvailable: e.target.value }))} data-testid="input-god-session-courts" />
              </div>
              <div>
                <Label>Players Per Side</Label>
                <Select value={form.playersPerSide} onValueChange={(v) => setForm(f => ({ ...f, playersPerSide: v }))}>
                  <SelectTrigger data-testid="select-god-session-pps"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Singles (1)</SelectItem>
                    <SelectItem value="2">Doubles (2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Match Settings</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Match Mode</Label>
                <Select value={form.matchMode} onValueChange={(v) => setForm(f => ({ ...f, matchMode: v }))}>
                  <SelectTrigger data-testid="select-god-session-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOCIAL">Social</SelectItem>
                    <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gender Type</Label>
                <Select value={form.matchGenderType} onValueChange={(v) => setForm(f => ({ ...f, matchGenderType: v }))}>
                  <SelectTrigger data-testid="select-god-session-gender-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIXED">Mixed</SelectItem>
                    <SelectItem value="SAME_GENDER">Same Gender</SelectItem>
                    <SelectItem value="MALE_ONLY">Male Only</SelectItem>
                    <SelectItem value="FEMALE_ONLY">Female Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Points to Play To</Label>
                <Input type="number" value={form.defaultPointsToPlayTo} onChange={(e) => setForm(f => ({ ...f, defaultPointsToPlayTo: e.target.value }))} data-testid="input-god-session-points" />
              </div>
              <div>
                <Label>Number of Sets</Label>
                <Select value={form.numberOfSets} onValueChange={(v) => setForm(f => ({ ...f, numberOfSets: v }))}>
                  <SelectTrigger data-testid="select-god-session-sets"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Set</SelectItem>
                    <SelectItem value="3">Best of 3</SelectItem>
                    <SelectItem value="5">Best of 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Access & Restrictions</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender Restriction</Label>
                <Select value={form.genderRestriction} onValueChange={(v) => setForm(f => ({ ...f, genderRestriction: v }))}>
                  <SelectTrigger data-testid="select-god-session-gender-restrict"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="MALE_ONLY">Male Only</SelectItem>
                    <SelectItem value="FEMALE_ONLY">Female Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session Type</Label>
                <Select value={form.sessionType} onValueChange={(v) => setForm(f => ({ ...f, sessionType: v }))}>
                  <SelectTrigger data-testid="select-god-session-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="MEMBERS_ONLY">Members Only</SelectItem>
                    <SelectItem value="JUNIORS_ONLY">Juniors Only</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox id="isPrivate" checked={form.isPrivate} onCheckedChange={(v) => setForm(f => ({ ...f, isPrivate: !!v }))} data-testid="checkbox-god-session-private" />
                <Label htmlFor="isPrivate" className="cursor-pointer">Private Session</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox id="autoGen" checked={form.autoGenerateActive} onCheckedChange={(v) => setForm(f => ({ ...f, autoGenerateActive: !!v }))} data-testid="checkbox-god-session-autogen" />
                <Label htmlFor="autoGen" className="cursor-pointer">Auto Generate Matches</Label>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Allowed Grades</div>
            <div className="flex flex-wrap gap-2">
              {GRADES.map(g => (
                <Badge
                  key={g}
                  variant={form.allowedCategories.includes(g) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(g)}
                  data-testid={`badge-god-grade-${g}`}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Fees & Equipment</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Session Fee (pence)</Label>
                <Input type="number" value={form.sessionFee} onChange={(e) => setForm(f => ({ ...f, sessionFee: e.target.value }))} data-testid="input-god-session-fee" />
              </div>
              <div>
                <Label>Shuttlecock Type</Label>
                <Select value={form.shuttlecockType || "none"} onValueChange={(v) => setForm(f => ({ ...f, shuttlecockType: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-god-session-shuttle"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not Set</SelectItem>
                    <SelectItem value="feather">Feather</SelectItem>
                    <SelectItem value="plastic">Plastic</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Live Stream URL</Label>
                <Input value={form.liveStreamUrl} onChange={(e) => setForm(f => ({ ...f, liveStreamUrl: e.target.value }))} data-testid="input-god-session-stream" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-god-save-session">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {isNew ? "Create Session" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VenueEditModal({ venue, clubId, open, onClose }: { venue: VenueRecord | null; clubId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isNew = !venue;
  const [form, setForm] = useState({
    name: "", address: "", city: "", postcode: "", googleMapsUrl: "",
    isDefault: false, courtNames: "",
  });

  useEffect(() => {
    if (venue) {
      setForm({
        name: venue.name || "",
        address: venue.address || "",
        city: venue.city || "",
        postcode: venue.postcode || "",
        googleMapsUrl: venue.googleMapsUrl || "",
        isDefault: venue.isDefault || false,
        courtNames: venue.courtNames?.join(", ") || "",
      });
    } else {
      setForm({ name: "", address: "", city: "", postcode: "", googleMapsUrl: "", isDefault: false, courtNames: "" });
    }
  }, [venue, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        address: form.address,
        city: form.city || null,
        postcode: form.postcode || null,
        googleMapsUrl: form.googleMapsUrl || null,
        isDefault: form.isDefault,
        courtNames: form.courtNames ? form.courtNames.split(",").map(s => s.trim()).filter(Boolean) : null,
      };
      if (isNew) {
        await apiRequest("POST", `/api/clubs/${clubId}/venues`, payload);
      } else {
        await apiRequest("PATCH", `/api/venues/${venue!.id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "venues"] });
      toast({ title: isNew ? "Venue Created" : "Venue Updated" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/venues/${venue!.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "venues"] });
      toast({ title: "Venue Deleted" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="dialog-god-venue">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {isNew ? "Add New Venue" : `Edit: ${venue?.name || "Venue"}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Venue Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-god-venue-name" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} data-testid="input-god-venue-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-god-venue-city" />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={form.postcode} onChange={(e) => setForm(f => ({ ...f, postcode: e.target.value }))} data-testid="input-god-venue-postcode" />
            </div>
          </div>
          <div>
            <Label>Google Maps URL</Label>
            <Input value={form.googleMapsUrl} onChange={(e) => setForm(f => ({ ...f, googleMapsUrl: e.target.value }))} data-testid="input-god-venue-maps" />
          </div>
          <div>
            <Label>Court Names (comma-separated)</Label>
            <Input value={form.courtNames} onChange={(e) => setForm(f => ({ ...f, courtNames: e.target.value }))} placeholder="Court 1, Court 2, Court 3" data-testid="input-god-venue-courts" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="isDefaultVenue" checked={form.isDefault} onCheckedChange={(v) => setForm(f => ({ ...f, isDefault: !!v }))} data-testid="checkbox-god-venue-default" />
            <Label htmlFor="isDefaultVenue" className="cursor-pointer">Default Venue</Label>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-god-save-venue">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {isNew ? "Add Venue" : "Save Changes"}
          </Button>
          {!isNew && (
            <Button variant="outline" className="text-destructive" onClick={() => { if (confirm("Delete this venue permanently?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} data-testid="button-god-delete-venue">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GodMode() {
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("members");
  const [memberSearch, setMemberSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");

  const [editMember, setEditMember] = useState<MemberRecord | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<SessionRecord | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editVenue, setEditVenue] = useState<VenueRecord | null>(null);
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  const { data: clubs, isLoading: clubsLoading } = useQuery<ClubRecord[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const clubId = selectedClubId ? Number(selectedClubId) : null;

  useEffect(() => {
    if (clubs && clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(String(clubs[0].id));
    }
  }, [clubs]);

  const { data: members, isLoading: membersLoading } = useQuery<MemberRecord[]>({
    queryKey: ["/api/clubs", clubId, "members-comprehensive"],
    queryFn: async () => {
      if (!clubId) return [];
      const res = await fetch(`/api/clubs/${clubId}/members-comprehensive`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: allSessions } = useQuery<SessionRecord[]>({
    queryKey: ["/api/sessions"],
  });

  const clubSessions = useMemo(() => {
    if (!allSessions || !clubId) return [];
    return allSessions.filter(s => s.clubId === clubId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSessions, clubId]);

  const { data: venues, isLoading: venuesLoading } = useQuery<VenueRecord[]>({
    queryKey: ["/api/clubs", clubId, "venues"],
    queryFn: async () => {
      if (!clubId) return [];
      const res = await fetch(`/api/clubs/${clubId}/venues`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!clubId,
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!memberSearch) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => {
      const name = m.user?.fullName?.toLowerCase() || "";
      const email = m.user?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [members, memberSearch]);

  const filteredSessions = useMemo(() => {
    if (!sessionSearch) return clubSessions;
    const q = sessionSearch.toLowerCase();
    return clubSessions.filter(s => s.title.toLowerCase().includes(q));
  }, [clubSessions, sessionSearch]);

  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    if (!venueSearch) return venues;
    const q = venueSearch.toLowerCase();
    return venues.filter(v => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q));
  }, [venues, venueSearch]);

  const selectedClub = clubs?.find(c => c.id === clubId);

  const mergeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/merge-duplicate-accounts");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Duplicates Merged", description: data.message || "Done" });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/memberships"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6" data-testid="god-mode-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" data-testid="text-god-mode-title">
            <Shield className="w-8 h-8 text-primary" />
            God Mode
          </h1>
          <p className="text-muted-foreground mt-1">Unrestricted access to all clubs and data.</p>
        </div>
        <Badge variant="destructive" className="text-sm py-1.5 px-4" data-testid="badge-god-mode">
          <Zap className="h-4 w-4 mr-2" />
          FULL CONTROL
        </Badge>
      </div>

      <Card data-testid="card-control-panel">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {controlItems.map(item => (
              <Link key={item.href} href={item.href}>
                <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-control-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <div className={`${item.bg} rounded-lg p-2.5`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => mergeDuplicatesMutation.mutate()} 
              disabled={mergeDuplicatesMutation.isPending}
              data-testid="button-merge-duplicates"
            >
              {mergeDuplicatesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              Merge Duplicate Accounts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMergeModalOpen(true)}
              data-testid="button-merge-profiles"
              className="ml-2"
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge Player Profiles
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-club-selector">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Select Club
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clubsLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger data-testid="select-god-club"><SelectValue placeholder="Choose a club..." /></SelectTrigger>
              <SelectContent>
                {clubs?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {clubId && selectedClub && (
        <Card data-testid="card-god-tabs">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList data-testid="tabs-god-mode">
                <TabsTrigger value="members" data-testid="tab-god-members">
                  <Users className="w-4 h-4 mr-1" /> Members
                  {members && <Badge variant="secondary" className="ml-2 text-xs">{members.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sessions" data-testid="tab-god-sessions">
                  <Calendar className="w-4 h-4 mr-1" /> Sessions
                  <Badge variant="secondary" className="ml-2 text-xs">{clubSessions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="venues" data-testid="tab-god-venues">
                  <MapPin className="w-4 h-4 mr-1" /> Venues
                  {venues && <Badge variant="secondary" className="ml-2 text-xs">{venues.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-4">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="pl-10" data-testid="input-god-search-members" />
                  </div>
                  <Button onClick={() => { setEditMember(null); setMemberModalOpen(true); }} data-testid="button-god-add-member">
                    <Plus className="w-4 h-4 mr-1" /> Add Member
                  </Button>
                </div>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-auto max-h-[55vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Points</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map(m => (
                          <TableRow key={m.id} className="cursor-pointer" onClick={() => { setEditMember(m); setMemberModalOpen(true); }} data-testid={`row-god-member-${m.id}`}>
                            <TableCell className="font-medium" data-testid={`text-god-member-name-${m.id}`}>{m.user?.fullName || "Unknown"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{m.user?.email || ""}</TableCell>
                            <TableCell><span className="text-xs">{m.gender || "-"}</span></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{m.grade || m.category || "-"}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{m.clubRole}</Badge></TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${m.playerStatus === "ACTIVE" ? "text-green-600" : m.playerStatus === "SUSPENDED" ? "text-red-600" : "text-muted-foreground"}`}>
                                {m.playerStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{m.rankingPoints}</TableCell>
                          </TableRow>
                        ))}
                        {filteredMembers.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No members found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sessions" className="mt-4">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search sessions..." value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} className="pl-10" data-testid="input-god-search-sessions" />
                  </div>
                  <Button onClick={() => { setEditSession(null); setSessionModalOpen(true); }} data-testid="button-god-add-session">
                    <Plus className="w-4 h-4 mr-1" /> Add Session
                  </Button>
                </div>
                <div className="overflow-auto max-h-[55vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map(s => (
                        <TableRow key={s.id} className="cursor-pointer" onClick={() => { setEditSession(s); setSessionModalOpen(true); }} data-testid={`row-god-session-${s.id}`}>
                          <TableCell className="font-medium" data-testid={`text-god-session-title-${s.id}`}>{s.title}</TableCell>
                          <TableCell className="text-sm">{new Date(s.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm">{s.startTime}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.venue?.name || "-"}</TableCell>
                          <TableCell>
                            <span className="text-sm">{s.signupCount ?? 0}/{s.maxPlayers}</span>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{s.matchMode}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${s.status === "ACTIVE" || s.status === "LIVE" ? "text-green-600" : s.status === "COMPLETED" ? "text-muted-foreground" : "text-blue-600"}`}>
                              {s.status || "UPCOMING"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredSessions.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sessions found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="venues" className="mt-4">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search venues..." value={venueSearch} onChange={(e) => setVenueSearch(e.target.value)} className="pl-10" data-testid="input-god-search-venues" />
                  </div>
                  <Button onClick={() => { setEditVenue(null); setVenueModalOpen(true); }} data-testid="button-god-add-venue">
                    <Plus className="w-4 h-4 mr-1" /> Add Venue
                  </Button>
                </div>
                {venuesLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="overflow-auto max-h-[55vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Postcode</TableHead>
                          <TableHead>Courts</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVenues.map(v => (
                          <TableRow key={v.id} className="cursor-pointer" onClick={() => { setEditVenue(v); setVenueModalOpen(true); }} data-testid={`row-god-venue-${v.id}`}>
                            <TableCell className="font-medium" data-testid={`text-god-venue-name-${v.id}`}>{v.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{v.address}</TableCell>
                            <TableCell className="text-sm">{v.city || "-"}</TableCell>
                            <TableCell className="text-sm">{v.postcode || "-"}</TableCell>
                            <TableCell className="text-sm">{v.courtNames?.length || "-"}</TableCell>
                            <TableCell>{v.isDefault ? <Badge variant="outline" className="text-xs text-green-600">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                          </TableRow>
                        ))}
                        {filteredVenues.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No venues found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <MemberEditModal
        member={editMember}
        clubId={clubId || 0}
        open={memberModalOpen}
        onClose={() => { setMemberModalOpen(false); setEditMember(null); }}
      />

      <SessionEditModal
        session={editSession}
        clubId={clubId || 0}
        venues={venues || []}
        open={sessionModalOpen}
        onClose={() => { setSessionModalOpen(false); setEditSession(null); }}
      />

      <VenueEditModal
        venue={editVenue}
        clubId={clubId || 0}
        open={venueModalOpen}
        onClose={() => { setVenueModalOpen(false); setEditVenue(null); }}
      />

      <MergeProfilesModal
        open={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
      />

      {!clubId && (
        <Card className="mt-4" data-testid="card-merge-logs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Merge className="w-5 h-5 text-primary" />
              Profile Merge History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MergeLogsPanel />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

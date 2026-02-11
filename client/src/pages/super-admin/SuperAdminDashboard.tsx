import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Users, Building2, DollarSign,
  Shield, Zap, Mail, BarChart3,
  Package, CreditCard, Upload, ChevronRight, Loader2,
  CheckCircle, XCircle, Clock, Plus, MapPin, Search, Pencil,
  Archive, Pause
} from "lucide-react";

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
  googleMapsUrl?: string;
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
  adminUserId: string;
}

interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

const defaultEditForm: ClubEditForm = {
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
  adminUserId: "",
};

const controlItems = [
  { href: "/super-admin/users-management", label: "Users Management", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/admin/members", label: "Members", icon: Users, color: "text-sky-500", bg: "bg-sky-500/10" },
  { href: "/admin/messages", label: "Messages", icon: Mail, color: "text-pink-500", bg: "bg-pink-500/10" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { href: "/admin/financials", label: "Financials", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
  { href: "/admin/inventory", label: "Inventory", icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
  { href: "/admin/import-members", label: "Import Members", icon: Upload, color: "text-rose-500", bg: "bg-rose-500/10" },
];

function ClubFormFields({ form, setForm, users }: { form: ClubEditForm; setForm: (fn: (f: ClubEditForm) => ClubEditForm) => void; users?: UserRecord[] }) {
  return (
    <div className="max-h-[70vh] overflow-y-auto space-y-6 py-2 pr-2">
      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Basic Info</div>
        <div className="space-y-3">
          <div>
            <Label>Club Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-club-name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="input-club-description" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Assign Admin</div>
        <div>
          <Label>Club Admin</Label>
          <Select value={form.adminUserId} onValueChange={(v) => setForm(f => ({ ...f, adminUserId: v }))}>
            <SelectTrigger data-testid="select-club-admin">
              <SelectValue placeholder="Select a user as admin..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.fullName} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Location</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} data-testid="input-club-address" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} data-testid="input-club-city" />
          </div>
          <div>
            <Label>Postcode</Label>
            <Input value={form.postcode} onChange={(e) => setForm(f => ({ ...f, postcode: e.target.value }))} data-testid="input-club-postcode" />
          </div>
          <div>
            <Label>Region</Label>
            <Input value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} data-testid="input-club-region" />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))} data-testid="input-club-country" />
          </div>
          <div className="col-span-2">
            <Label>Continent</Label>
            <Input value={form.continent} onChange={(e) => setForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-club-continent" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Contact</div>
        <div className="space-y-3">
          <div>
            <Label>Contact Full Name</Label>
            <Input value={form.contactFullName} onChange={(e) => setForm(f => ({ ...f, contactFullName: e.target.value }))} data-testid="input-club-contact-name" />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input value={form.contactPhone} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} data-testid="input-club-contact-phone" />
          </div>
          <div>
            <Label>Contact Address</Label>
            <Input value={form.contactAddress} onChange={(e) => setForm(f => ({ ...f, contactAddress: e.target.value }))} data-testid="input-club-contact-address" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Activities</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="hasCompetitions" checked={form.hasCompetitions} onCheckedChange={(v) => setForm(f => ({ ...f, hasCompetitions: !!v }))} data-testid="checkbox-has-competitions" />
            <Label htmlFor="hasCompetitions" className="cursor-pointer">Has Competitions</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hasSocialGames" checked={form.hasSocialGames} onCheckedChange={(v) => setForm(f => ({ ...f, hasSocialGames: !!v }))} data-testid="checkbox-has-social-games" />
            <Label htmlFor="hasSocialGames" className="cursor-pointer">Has Social Games</Label>
          </div>
          <div>
            <Label>Social Game Timings</Label>
            <Input value={form.socialGameTimings} onChange={(e) => setForm(f => ({ ...f, socialGameTimings: e.target.value }))} data-testid="input-social-game-timings" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="providesTraining" checked={form.providesTraining} onCheckedChange={(v) => setForm(f => ({ ...f, providesTraining: !!v }))} data-testid="checkbox-provides-training" />
            <Label htmlFor="providesTraining" className="cursor-pointer">Provides Training</Label>
          </div>
          <div>
            <Label>Training Details</Label>
            <Input value={form.trainingDetails} onChange={(e) => setForm(f => ({ ...f, trainingDetails: e.target.value }))} data-testid="input-training-details" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Fees</div>
        <div className="space-y-3">
          <div>
            <Label>Session Fee (pence)</Label>
            <Input type="number" value={form.sessionFee} onChange={(e) => setForm(f => ({ ...f, sessionFee: e.target.value }))} data-testid="input-session-fee" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hasMembership" checked={form.hasMembership} onCheckedChange={(v) => setForm(f => ({ ...f, hasMembership: !!v }))} data-testid="checkbox-has-membership" />
            <Label htmlFor="hasMembership" className="cursor-pointer">Has Membership</Label>
          </div>
          <div>
            <Label>Membership Fee (pence)</Label>
            <Input type="number" value={form.membershipFee} onChange={(e) => setForm(f => ({ ...f, membershipFee: e.target.value }))} data-testid="input-membership-fee" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Equipment</div>
        <div className="space-y-3">
          <div>
            <Label>Shuttlecock Type</Label>
            <Select value={form.shuttlecockType} onValueChange={(v) => setForm(f => ({ ...f, shuttlecockType: v }))}>
              <SelectTrigger data-testid="select-shuttlecock-type">
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
            <Checkbox id="providesClubTShirts" checked={form.providesClubTShirts} onCheckedChange={(v) => setForm(f => ({ ...f, providesClubTShirts: !!v }))} data-testid="checkbox-provides-tshirts" />
            <Label htmlFor="providesClubTShirts" className="cursor-pointer">Provides Club T-Shirts</Label>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-muted-foreground border-b pb-1 mb-3">Registration</div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="isRegisteredWithBE" checked={form.isRegisteredWithBE} onCheckedChange={(v) => setForm(f => ({ ...f, isRegisteredWithBE: !!v }))} data-testid="checkbox-registered-be" />
            <Label htmlFor="isRegisteredWithBE" className="cursor-pointer">Registered with Badminton England</Label>
          </div>
          <div>
            <Label>BE Registration Number</Label>
            <Input value={form.beRegistrationNumber} onChange={(e) => setForm(f => ({ ...f, beRegistrationNumber: e.target.value }))} data-testid="input-be-registration" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const [editClub, setEditClub] = useState<ClubRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] = useState<ClubEditForm>({ ...defaultEditForm });
  const [createForm, setCreateForm] = useState<ClubEditForm>({ ...defaultEditForm });

  const { data: allClubs, isLoading: clubsLoading } = useQuery<ClubRecord[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: allUsers } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  useEffect(() => {
    if (editClub) {
      setEditForm({
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
        sessionFee: editClub.sessionFee != null ? String(editClub.sessionFee) : "",
        hasMembership: editClub.hasMembership || false,
        membershipFee: editClub.membershipFee != null ? String(editClub.membershipFee) : "",
        shuttlecockType: editClub.shuttlecockType || "",
        providesClubTShirts: editClub.providesClubTShirts || false,
        isRegisteredWithBE: editClub.isRegisteredWithBE || false,
        beRegistrationNumber: editClub.beRegistrationNumber || "",
        adminUserId: editClub.ownerId ? String(editClub.ownerId) : "",
      });
    }
  }, [editClub]);

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
        sessionFee: data.form.sessionFee ? parseInt(data.form.sessionFee) : null,
        hasMembership: data.form.hasMembership,
        membershipFee: data.form.membershipFee ? parseInt(data.form.membershipFee) : null,
        shuttlecockType: data.form.shuttlecockType,
        providesClubTShirts: data.form.providesClubTShirts,
        isRegisteredWithBE: data.form.isRegisteredWithBE,
        beRegistrationNumber: data.form.beRegistrationNumber,
        adminUserId: data.form.adminUserId || undefined,
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

  const approveClubMutation = useMutation({
    mutationFn: async (data: { id: number; status: string; adminUserId?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.id}/status`, {
        status: data.status,
        adminUserId: data.adminUserId,
      });
      return res.json();
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditClub(null);
      toast({
        title: variables.status === "APPROVED" ? "Club Approved" : "Club Rejected",
        description: variables.status === "APPROVED" ? "The club has been approved and is now active." : "The club request has been rejected.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update club status", variant: "destructive" });
    },
  });

  const createClubMutation = useMutation({
    mutationFn: async (form: ClubEditForm) => {
      const res = await apiRequest("POST", "/api/admin/clubs", {
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        postcode: form.postcode,
        country: form.country,
        region: form.region,
        continent: form.continent,
        contactFullName: form.contactFullName,
        contactPhone: form.contactPhone,
        contactAddress: form.contactAddress,
        isRegisteredWithBE: form.isRegisteredWithBE,
        beRegistrationNumber: form.beRegistrationNumber,
        hasCompetitions: form.hasCompetitions,
        hasSocialGames: form.hasSocialGames,
        socialGameTimings: form.socialGameTimings,
        providesTraining: form.providesTraining,
        trainingDetails: form.trainingDetails,
        sessionFee: form.sessionFee,
        hasMembership: form.hasMembership,
        membershipFee: form.membershipFee,
        shuttlecockType: form.shuttlecockType,
        providesClubTShirts: form.providesClubTShirts,
        adminUserId: form.adminUserId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setCreateOpen(false);
      setCreateForm({ ...defaultEditForm });
      toast({ title: "Club Created", description: "New club has been created and approved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create club", variant: "destructive" });
    },
  });

  const pendingClubs = useMemo(() => allClubs?.filter(c => c.status === "PENDING") || [], [allClubs]);
  const approvedClubs = useMemo(() => allClubs?.filter(c => c.status === "APPROVED") || [], [allClubs]);
  const filteredClubs = useMemo(() => {
    if (!allClubs) return [];
    if (!search) return allClubs;
    const s = search.toLowerCase();
    return allClubs.filter(c => c.name.toLowerCase().includes(s) || (c.city || "").toLowerCase().includes(s));
  }, [allClubs, search]);

  const getOwnerName = (ownerId?: number) => {
    if (!ownerId || !allUsers) return "No admin assigned";
    const owner = allUsers.find(u => u.id === ownerId);
    return owner?.fullName || `User #${ownerId}`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "PENDING": return <Clock className="w-4 h-4 text-amber-500" />;
      case "REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
      case "PAUSED": return <Pause className="w-4 h-4 text-orange-500" />;
      case "ARCHIVED": return <Archive className="w-4 h-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="outline" className="text-xs text-green-600">Approved</Badge>;
      case "PENDING": return <Badge variant="outline" className="text-xs text-amber-600">Pending</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs text-red-600">Rejected</Badge>;
      case "PAUSED": return <Badge variant="outline" className="text-xs text-orange-600">Paused</Badge>;
      case "ARCHIVED": return <Badge variant="outline" className="text-xs text-muted-foreground">Archived</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8" data-testid="super-admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" data-testid="text-super-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            God's Mode Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Full control access to all system features.</p>
        </div>
        <Badge variant="destructive" className="text-sm py-1.5 px-4" data-testid="badge-god-mode">
          <Zap className="h-4 w-4 mr-2" />
          GOD MODE
        </Badge>
      </div>

      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {controlItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover-elevate cursor-pointer border border-border/50 transition-all"
                  data-testid={`button-quick-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 font-medium text-sm">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-clubs-management">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            Clubs Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card data-testid="card-pending-count">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingClubs.length}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-approved-count">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approvedClubs.length}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-count">
              <CardContent className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                    <Building2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{allClubs?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-clubs"
              />
            </div>
            <Button onClick={() => { setCreateForm({ ...defaultEditForm }); setCreateOpen(true); }} className="gap-2" data-testid="button-create-club">
              <Plus className="w-4 h-4" /> Create New Club
            </Button>
          </div>

          {clubsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredClubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover-elevate cursor-pointer border border-border/50 transition-all"
                  onClick={() => setEditClub(club)}
                  data-testid={`club-item-${club.id}`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{club.name}</span>
                      {statusLabel(club.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {club.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {club.city}
                        </span>
                      )}
                      <span>Admin: {getOwnerName(club.ownerId)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
              {filteredClubs.length === 0 && (
                <p className="text-center py-6 text-muted-foreground text-sm">No clubs found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editClub} onOpenChange={(open) => { if (!open) setEditClub(null); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-club">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {editClub?.status === "PENDING" ? "Review Club Submission" : "Edit Club"}
            </DialogTitle>
            <DialogDescription>
              {editClub?.status === "PENDING" ? "Review and approve or reject this club application." : "Update the club details and admin assignment."}
            </DialogDescription>
          </DialogHeader>

          {editClub?.status === "PENDING" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              This club is awaiting approval. Review the details and approve or reject below.
            </div>
          )}

          {editClub && (
            <div className="text-sm text-muted-foreground">
              Applicant: <strong>{getOwnerName(editClub.ownerId)}</strong>
            </div>
          )}

          <ClubFormFields form={editForm} setForm={setEditForm} users={allUsers} />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editClub?.status === "PENDING" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => editClub && approveClubMutation.mutate({ id: editClub.id, status: "REJECTED" })}
                  disabled={approveClubMutation.isPending}
                  className="gap-2"
                  data-testid="button-reject-club"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button
                  onClick={() => editClub && approveClubMutation.mutate({ id: editClub.id, status: "APPROVED", adminUserId: editForm.adminUserId })}
                  disabled={approveClubMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-club"
                >
                  {approveClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Club
                </Button>
              </>
            )}
            <div className="flex gap-2 flex-1 justify-end">
              <Button variant="outline" onClick={() => setEditClub(null)} data-testid="button-cancel-edit">Cancel</Button>
              <Button
                onClick={() => editClub && updateClubMutation.mutate({ id: editClub.id, form: editForm })}
                disabled={updateClubMutation.isPending}
                data-testid="button-save-club"
              >
                {updateClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-create-club">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Club
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new club and assign an admin.
            </DialogDescription>
          </DialogHeader>
          <ClubFormFields form={createForm} setForm={setCreateForm} users={allUsers} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createClubMutation.mutate(createForm)}
              disabled={createClubMutation.isPending || !createForm.name.trim()}
              data-testid="button-confirm-create"
            >
              {createClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

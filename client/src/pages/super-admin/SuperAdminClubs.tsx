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
import { Label } from "@/components/ui/label";
import {
  Building2, Search, Loader2, Pencil, Trash2, CheckCircle, XCircle,
  Clock, ChevronLeft, ChevronRight, Zap, Shield, UserPlus, ArrowRightLeft, MapPin, Users
} from "lucide-react";
import { Link } from "wouter";

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
  const [deleteClub, setDeleteClub] = useState<ClubRecord | null>(null);
  const [transferClub, setTransferClub] = useState<ClubRecord | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
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
        sessionFee: editClub.sessionFee != null ? String(editClub.sessionFee) : "",
        hasMembership: editClub.hasMembership || false,
        membershipFee: editClub.membershipFee != null ? String(editClub.membershipFee) : "",
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
      setDeleteClub(null);
      toast({ title: "Club Deleted", description: "Club has been removed from the system." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete club", variant: "destructive" });
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
        sessionFee: data.form.sessionFee ? parseInt(data.form.sessionFee) : null,
        hasMembership: data.form.hasMembership,
        membershipFee: data.form.membershipFee ? parseInt(data.form.membershipFee) : null,
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
    if (!ownerId || !allUsers) return "—";
    const owner = allUsers.find(u => u.id === ownerId);
    return owner?.fullName || `User #${ownerId}`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="outline" className="text-xs text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "PENDING": return <Badge variant="outline" className="text-xs text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs text-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
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
          <Zap className="h-3 w-3 mr-1" /> Super Admin
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
                    <TableCell>{statusBadge(club.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {[club.city, club.country].filter(Boolean).join(", ") || "—"}
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
                        <Button variant="ghost" size="icon" onClick={() => setTransferClub(club)} data-testid={`button-transfer-club-${club.id}`}>
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteClub(club)}
                          className="text-destructive"
                          data-testid={`button-delete-club-${club.id}`}
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
            <div className="flex items-center justify-between mt-4">
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
                  <Label>Session Fee (pence)</Label>
                  <Input
                    type="number"
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
                  <Label>Membership Fee (pence)</Label>
                  <Input
                    type="number"
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
                  <Label>Shuttlecock Type</Label>
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
              You are performing a Super Admin action.
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

      <AlertDialog open={!!deleteClub} onOpenChange={(open) => !open && setDeleteClub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteClub?.name}</strong> and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClub && deleteClubMutation.mutate(deleteClub.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-club"
            >
              {deleteClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Search, MoreHorizontal, CheckCircle, XCircle, Ban, Pencil, Trash2, Users, GraduationCap, CreditCard, Clock, ShieldAlert, Loader2, UserX } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Coach = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  location: string | null;
  areaCoverage: string | null;
  badmintonEnglandCert: boolean;
  qualifications: string | null;
  yearsTraining: number | null;
  professionalCareer: string | null;
  experience: string | null;
  status: string;
  bio: string | null;
};

type CoachSeeker = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  paidUntil: string | null;
};

export default function CoachManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("coaches");

  const [coachSearch, setCoachSearch] = useState("");
  const [selectedCoaches, setSelectedCoaches] = useState<number[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<string | null>(null);

  const [editCoachDialogOpen, setEditCoachDialogOpen] = useState(false);
  const [editCoach, setEditCoach] = useState<Coach | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    postcode: "",
    location: "",
    areaCoverage: "",
    bio: "",
    qualifications: "",
    yearsTraining: "",
  });

  const [seekerSearch, setSeekerSearch] = useState("");
  const [selectedSeekers, setSelectedSeekers] = useState<number[]>([]);
  const [seekerBulkDialogOpen, setSeekerBulkDialogOpen] = useState(false);
  const [pendingSeekerBulkAction, setPendingSeekerBulkAction] = useState<string | null>(null);

  const [suspendUserDialogOpen, setSuspendUserDialogOpen] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState<number | null>(null);

  const { data: coaches, isLoading: coachesLoading } = useQuery<Coach[]>({
    queryKey: ["/api/admin/coaches"],
    enabled: user?.role === "OWNER",
  });

  const { data: seekers, isLoading: seekersLoading } = useQuery<CoachSeeker[]>({
    queryKey: ["/api/admin/coach-seekers"],
    enabled: user?.role === "OWNER",
  });

  const coachActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      return apiRequest("PATCH", `/api/admin/coaches/${id}`, { status: action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      toast({ title: "Success", description: "Coach status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/coaches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      toast({ title: "Success", description: "Coach deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editCoachMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/coaches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setEditCoachDialogOpen(false);
      setEditCoach(null);
      toast({ title: "Success", description: "Coach updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const coachBulkActionMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      return apiRequest("POST", "/api/admin/coaches/bulk-action", { ids, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setSelectedCoaches([]);
      toast({ title: "Success", description: "Bulk action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seekerActionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/coach-seekers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      toast({ title: "Success", description: "Coach seeker updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seekerBulkActionMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      return apiRequest("POST", "/api/admin/coach-seekers/bulk-action", { ids, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      setSelectedSeekers([]);
      toast({ title: "Success", description: "Bulk action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/admin/users/${userId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      setSuspendUserDialogOpen(false);
      setSuspendUserId(null);
      toast({ title: "User Suspended", description: "All rights have been removed from this user." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredCoaches = coaches?.filter((c) => {
    const q = coachSearch.toLowerCase();
    if (!q) return true;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.postcode || "").toLowerCase().includes(q)
    );
  }) || [];

  const filteredSeekers = seekers?.filter((s) => {
    const q = seekerSearch.toLowerCase();
    if (!q) return true;
    return (
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q)
    );
  }) || [];

  const pendingCount = coaches?.filter((c) => c.status === "PENDING").length || 0;
  const approvedCount = coaches?.filter((c) => c.status === "APPROVED").length || 0;
  const rejectedCount = coaches?.filter((c) => c.status === "REJECTED").length || 0;
  const suspendedCount = coaches?.filter((c) => c.status === "SUSPENDED").length || 0;

  const handleCoachSelectAll = () => {
    if (selectedCoaches.length === filteredCoaches.length) {
      setSelectedCoaches([]);
    } else {
      setSelectedCoaches(filteredCoaches.map((c) => c.id));
    }
  };

  const handleCoachSelect = (id: number) => {
    setSelectedCoaches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCoachBulkAction = (action: string) => {
    setPendingBulkAction(action);
    setBulkDialogOpen(true);
  };

  const confirmCoachBulkAction = () => {
    if (pendingBulkAction && selectedCoaches.length > 0) {
      coachBulkActionMutation.mutate({ ids: selectedCoaches, action: pendingBulkAction });
    }
    setBulkDialogOpen(false);
    setPendingBulkAction(null);
  };

  const handleSeekerSelectAll = () => {
    if (selectedSeekers.length === filteredSeekers.length) {
      setSelectedSeekers([]);
    } else {
      setSelectedSeekers(filteredSeekers.map((s) => s.id));
    }
  };

  const handleSeekerSelect = (id: number) => {
    setSelectedSeekers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSeekerBulkAction = (action: string) => {
    setPendingSeekerBulkAction(action);
    setSeekerBulkDialogOpen(true);
  };

  const confirmSeekerBulkAction = () => {
    if (pendingSeekerBulkAction && selectedSeekers.length > 0) {
      seekerBulkActionMutation.mutate({ ids: selectedSeekers, action: pendingSeekerBulkAction });
    }
    setSeekerBulkDialogOpen(false);
    setPendingSeekerBulkAction(null);
  };

  const openEditCoachDialog = (coach: Coach) => {
    setEditCoach(coach);
    setEditForm({
      fullName: coach.fullName || "",
      email: coach.email || "",
      phone: coach.phone || "",
      city: coach.city || "",
      postcode: coach.postcode || "",
      location: coach.location || "",
      areaCoverage: coach.areaCoverage || "",
      bio: coach.bio || "",
      qualifications: coach.qualifications || "",
      yearsTraining: coach.yearsTraining?.toString() || "",
    });
    setEditCoachDialogOpen(true);
  };

  const handleSaveEditCoach = () => {
    if (!editCoach) return;
    editCoachMutation.mutate({
      id: editCoach.id,
      data: {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || null,
        city: editForm.city || null,
        postcode: editForm.postcode || null,
        location: editForm.location || null,
        areaCoverage: editForm.areaCoverage || null,
        bio: editForm.bio || null,
        qualifications: editForm.qualifications || null,
        yearsTraining: editForm.yearsTraining ? parseInt(editForm.yearsTraining) : null,
      },
    });
  };

  const getCoachStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" data-testid={`badge-status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-500" data-testid={`badge-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "SUSPENDED":
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}><Ban className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeekerStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" data-testid={`badge-seeker-status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "ACTIVE":
        return <Badge className="bg-green-500" data-testid={`badge-seeker-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "SUSPENDED":
        return <Badge variant="secondary" data-testid={`badge-seeker-status-${status}`}><Ban className="w-3 h-3 mr-1" />Suspended</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" data-testid={`badge-seeker-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConfirmPayment = (seeker: CoachSeeker) => {
    const paidUntil = new Date();
    paidUntil.setDate(paidUntil.getDate() + 30);
    seekerActionMutation.mutate({
      id: seeker.id,
      data: { status: "ACTIVE", paidUntil: paidUntil.toISOString() },
    });
  };

  if (user?.role !== "OWNER") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive" data-testid="text-access-denied">Access Denied</h1>
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
          <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-page-title">
            <GraduationCap className="h-6 w-6 text-primary" />
            Coach Management
          </h1>
          <p className="text-muted-foreground">Manage coaches and coach seeker memberships</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="coaches" data-testid="tab-coaches">
            <GraduationCap className="w-4 h-4 mr-2" />
            Coach Management
          </TabsTrigger>
          <TabsTrigger value="seekers" data-testid="tab-seekers">
            <Users className="w-4 h-4 mr-2" />
            Coach Seeker Memberships
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coaches" className="mt-6 space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-pending">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-approved">{approvedCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-rejected">{rejectedCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
                <Ban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-suspended">{suspendedCount}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, city, postcode..."
                className="pl-10"
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                data-testid="input-search-coaches"
              />
            </div>

            {selectedCoaches.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedCoaches.length} selected</span>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("APPROVED")} data-testid="button-bulk-approve">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("REJECTED")} data-testid="button-bulk-reject">
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("SUSPENDED")} data-testid="button-bulk-suspend">
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend All Selected
                </Button>
              </div>
            )}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-coaches-count">
                Coaches ({filteredCoaches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachesLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : filteredCoaches.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No coaches found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCoaches.length === filteredCoaches.length && filteredCoaches.length > 0}
                            onCheckedChange={handleCoachSelectAll}
                            data-testid="checkbox-select-all-coaches"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Postcode</TableHead>
                        <TableHead>BE Cert</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoaches.map((coach) => (
                        <TableRow key={coach.id} data-testid={`row-coach-${coach.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCoaches.includes(coach.id)}
                              onCheckedChange={() => handleCoachSelect(coach.id)}
                              data-testid={`checkbox-coach-${coach.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-coach-name-${coach.id}`}>{coach.fullName}</span>
                          </TableCell>
                          <TableCell data-testid={`text-coach-email-${coach.id}`}>{coach.email}</TableCell>
                          <TableCell data-testid={`text-coach-phone-${coach.id}`}>{coach.phone || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-city-${coach.id}`}>{coach.city || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-postcode-${coach.id}`}>{coach.postcode || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-cert-${coach.id}`}>{coach.badmintonEnglandCert ? "Yes" : "No"}</TableCell>
                          <TableCell>{getCoachStatusBadge(coach.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-coach-actions-${coach.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {coach.status !== "APPROVED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "APPROVED" })}
                                    data-testid={`action-approve-coach-${coach.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {coach.status !== "REJECTED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "REJECTED" })}
                                    data-testid={`action-reject-coach-${coach.id}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                                {coach.status !== "SUSPENDED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "SUSPENDED" })}
                                    data-testid={`action-suspend-coach-${coach.id}`}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openEditCoachDialog(coach)}
                                  data-testid={`action-edit-coach-${coach.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteCoachMutation.mutate(coach.id)}
                                  data-testid={`action-delete-coach-${coach.id}`}
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
        </TabsContent>

        <TabsContent value="seekers" className="mt-6 space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={seekerSearch}
                onChange={(e) => setSeekerSearch(e.target.value)}
                data-testid="input-search-seekers"
              />
            </div>

            {selectedSeekers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedSeekers.length} selected</span>
                <Button variant="outline" size="sm" onClick={() => handleSeekerBulkAction("ACTIVE")} data-testid="button-bulk-approve-seekers">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSeekerBulkAction("SUSPENDED")} data-testid="button-bulk-suspend-seekers">
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend All
                </Button>
              </div>
            )}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-seekers-count">
                Coach Seekers ({filteredSeekers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seekersLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : filteredSeekers.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No coach seekers found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedSeekers.length === filteredSeekers.length && filteredSeekers.length > 0}
                            onCheckedChange={handleSeekerSelectAll}
                            data-testid="checkbox-select-all-seekers"
                          />
                        </TableHead>
                        <TableHead>User Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Until</TableHead>
                        <TableHead className="w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSeekers.map((seeker) => (
                        <TableRow key={seeker.id} data-testid={`row-seeker-${seeker.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSeekers.includes(seeker.id)}
                              onCheckedChange={() => handleSeekerSelect(seeker.id)}
                              data-testid={`checkbox-seeker-${seeker.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-seeker-name-${seeker.id}`}>{seeker.userName}</span>
                          </TableCell>
                          <TableCell data-testid={`text-seeker-email-${seeker.id}`}>{seeker.userEmail}</TableCell>
                          <TableCell>{getSeekerStatusBadge(seeker.status)}</TableCell>
                          <TableCell data-testid={`text-seeker-paid-${seeker.id}`}>
                            {seeker.paidUntil ? new Date(seeker.paidUntil).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-seeker-actions-${seeker.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmPayment(seeker)}
                                    data-testid={`action-confirm-payment-${seeker.id}`}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Confirm Payment
                                  </DropdownMenuItem>
                                  {seeker.status !== "SUSPENDED" && (
                                    <DropdownMenuItem
                                      onClick={() => seekerActionMutation.mutate({ id: seeker.id, data: { status: "SUSPENDED" } })}
                                      data-testid={`action-suspend-seeker-${seeker.id}`}
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Suspend
                                    </DropdownMenuItem>
                                  )}
                                  {seeker.status !== "CANCELLED" && (
                                    <DropdownMenuItem
                                      onClick={() => seekerActionMutation.mutate({ id: seeker.id, data: { status: "CANCELLED" } })}
                                      data-testid={`action-cancel-seeker-${seeker.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setSuspendUserId(seeker.userId);
                                  setSuspendUserDialogOpen(true);
                                }}
                                data-testid={`button-suspend-user-${seeker.id}`}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Suspend User
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set {selectedCoaches.length} coach(es) to {pendingBulkAction}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCoachBulkAction} data-testid="button-confirm-bulk">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seekerBulkDialogOpen} onOpenChange={setSeekerBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set {selectedSeekers.length} seeker(s) to {pendingSeekerBulkAction}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-seeker-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSeekerBulkAction} data-testid="button-confirm-seeker-bulk">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={suspendUserDialogOpen} onOpenChange={setSuspendUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all rights from this user by setting their account status to REJECTED. This action is serious and affects their entire account. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend-user">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => suspendUserId && suspendUserMutation.mutate(suspendUserId)}
              data-testid="button-confirm-suspend-user"
            >
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editCoachDialogOpen} onOpenChange={setEditCoachDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update coach details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                data-testid="input-edit-fullName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                data-testid="input-edit-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  data-testid="input-edit-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postcode">Postcode</Label>
                <Input
                  id="edit-postcode"
                  value={editForm.postcode}
                  onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                  data-testid="input-edit-postcode"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Address</Label>
              <Input
                id="edit-location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                data-testid="input-edit-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-areaCoverage">Area of Coverage</Label>
              <Input
                id="edit-areaCoverage"
                value={editForm.areaCoverage}
                onChange={(e) => setEditForm({ ...editForm, areaCoverage: e.target.value })}
                data-testid="input-edit-areaCoverage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Input
                id="edit-bio"
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                data-testid="input-edit-bio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-qualifications">Qualifications</Label>
              <Input
                id="edit-qualifications"
                value={editForm.qualifications}
                onChange={(e) => setEditForm({ ...editForm, qualifications: e.target.value })}
                data-testid="input-edit-qualifications"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-yearsTraining">Years of Training</Label>
              <Input
                id="edit-yearsTraining"
                type="number"
                value={editForm.yearsTraining}
                onChange={(e) => setEditForm({ ...editForm, yearsTraining: e.target.value })}
                data-testid="input-edit-yearsTraining"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCoachDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEditCoach} disabled={editCoachMutation.isPending} data-testid="button-save-edit">
              {editCoachMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

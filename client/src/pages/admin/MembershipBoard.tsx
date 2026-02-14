import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Check, X, Calendar, Pencil, Trash2, CreditCard, Search, ArrowLeft, ChevronDown, ChevronRight, Users, UserPlus } from "lucide-react";
import { Link } from "wouter";

function formatPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysRemainingColor(days: number): string {
  if (days <= 0) return "text-muted-foreground";
  if (days < 30) return "text-red-500";
  if (days <= 60) return "text-amber-500";
  return "text-green-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Active</Badge>;
    case "PENDING":
      return <Badge variant="secondary" className="no-default-hover-elevate">Pending</Badge>;
    case "EXPIRED":
      return <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate">Expired</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive" className="no-default-hover-elevate">Cancelled</Badge>;
    case "APPROVED":
      return <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive" className="no-default-hover-elevate">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

function getPaymentBadge(status: string) {
  switch (status) {
    case "PAID":
      return <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Paid</Badge>;
    case "UNPAID":
      return <Badge variant="destructive" className="no-default-hover-elevate">Unpaid</Badge>;
    case "PARTIAL":
      return <Badge variant="secondary" className="no-default-hover-elevate">Partial</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status || "N/A"}</Badge>;
  }
}

interface MembershipRequest {
  id: number;
  userId: number;
  clubId: number;
  planId: number;
  status: string;
  prorationAmount: number | null;
  createdAt: string;
  fullName: string;
  planName: string;
}

interface ClubMembership {
  id: number;
  userId: number;
  clubId: number;
  planId: number;
  status: string;
  startDate: string;
  endDate: string;
  paymentStatus: string;
  fullName: string;
  planName: string;
}

interface MembershipPlan {
  id: number;
  clubId: number;
  name: string;
  annualPrice: number;
  defaultSessionFee: number;
  isDefault: boolean;
}

export default function MembershipBoard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  const isOwner = user?.role === "OWNER";

  const [activeTab, setActiveTab] = useState("requests");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);

  const [approveDialog, setApproveDialog] = useState<{ requestId: number } | null>(null);
  const [approveStartDate, setApproveStartDate] = useState("");
  const [approveEndDate, setApproveEndDate] = useState("");

  const [rejectDialog, setRejectDialog] = useState<{ requestId: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [cancelDialog, setCancelDialog] = useState<{ membershipId: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [editDatesDialog, setEditDatesDialog] = useState<{ membershipId: number; startDate: string; endDate: string } | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [bulkAction, setBulkAction] = useState<string>("");

  const [plansOpen, setPlansOpen] = useState(false);
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planSessionFee, setPlanSessionFee] = useState("");
  const [planIsDefault, setPlanIsDefault] = useState(false);

  const [editPlanDialog, setEditPlanDialog] = useState<MembershipPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPrice, setEditPlanPrice] = useState("");
  const [editPlanSessionFee, setEditPlanSessionFee] = useState("");
  const [editPlanIsDefault, setEditPlanIsDefault] = useState(false);

  const [addMembershipDialog, setAddMembershipDialog] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState<string>("");
  const [addMemberPlanId, setAddMemberPlanId] = useState<string>("");
  const [addMemberStartDate, setAddMemberStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addMemberPaymentStatus, setAddMemberPaymentStatus] = useState<string>("UNPAID");
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const clubId = selectedClubId || (myAdminClubs && myAdminClubs.length > 0 ? myAdminClubs[0].id.toString() : "");

  const requestsUrl = clubId ? `/api/clubs/${clubId}/membership-requests` : null;
  const { data: requests = [], isLoading: requestsLoading } = useQuery<MembershipRequest[]>({
    queryKey: [requestsUrl],
    enabled: !!requestsUrl && activeTab === "requests",
  });

  const membershipsParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);
    return params.toString();
  }, [statusFilter, searchQuery]);

  const membershipsUrl = clubId ? `/api/clubs/${clubId}/memberships${membershipsParams ? `?${membershipsParams}` : ""}` : null;
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery<ClubMembership[]>({
    queryKey: [membershipsUrl],
    enabled: !!membershipsUrl && activeTab === "active",
  });

  const plansUrl = clubId ? `/api/clubs/${clubId}/membership-plans` : null;
  const { data: plans = [], isLoading: plansLoading } = useQuery<MembershipPlan[]>({
    queryKey: [plansUrl],
    enabled: !!plansUrl,
  });

  const { data: clubMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && addMembershipDialog,
  });

  const addMembershipExpiryDate = useMemo(() => {
    if (!addMemberStartDate) return "";
    const start = new Date(addMemberStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 365);
    return format(end, "yyyy-MM-dd");
  }, [addMemberStartDate]);

  const filteredClubMembers = useMemo(() => {
    if (!addMemberSearch) return clubMembers;
    const lower = addMemberSearch.toLowerCase();
    return clubMembers.filter((m: any) => {
      const name = m.user?.fullName || m.fullName || "";
      return name.toLowerCase().includes(lower);
    });
  }, [clubMembers, addMemberSearch]);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => r.fullName?.toLowerCase().includes(lower));
    }
    return filtered;
  }, [requests, statusFilter, searchQuery]);

  const filteredMemberships = useMemo(() => {
    let filtered = memberships;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.fullName?.toLowerCase().includes(lower));
    }
    return filtered;
  }, [memberships, searchQuery]);

  const invalidateMemberships = () => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && (
          key.includes("/membership-requests") ||
          key.includes("/memberships") ||
          key.includes("/membership-plans")
        );
      },
    });
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, startDate, endDate }: { id: number; startDate: string; endDate: string }) => {
      await apiRequest("PATCH", `/api/membership-requests/${id}/approve`, { startDate, endDate });
    },
    onSuccess: () => {
      invalidateMemberships();
      setApproveDialog(null);
      toast({ title: "Request Approved", description: "Membership request has been approved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve request.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiRequest("PATCH", `/api/membership-requests/${id}/reject`, { reason });
    },
    onSuccess: () => {
      invalidateMemberships();
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Request Rejected", description: "Membership request has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject request.", variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/activate`, {});
    },
    onSuccess: () => {
      invalidateMemberships();
      toast({ title: "Membership Activated", description: "Membership has been activated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to activate membership.", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      invalidateMemberships();
      setCancelDialog(null);
      setCancelReason("");
      toast({ title: "Membership Cancelled", description: "Membership has been cancelled." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel membership.", variant: "destructive" });
    },
  });

  const editDatesMutation = useMutation({
    mutationFn: async ({ id, startDate, endDate }: { id: number; startDate: string; endDate: string }) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/dates`, { startDate, endDate });
    },
    onSuccess: () => {
      invalidateMemberships();
      setEditDatesDialog(null);
      toast({ title: "Dates Updated", description: "Membership dates have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update dates.", variant: "destructive" });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ membershipIds, action }: { membershipIds: number[]; action: string }) => {
      await apiRequest("POST", `/api/clubs/${clubId}/memberships/bulk-action`, { membershipIds, action });
    },
    onSuccess: () => {
      invalidateMemberships();
      setSelectedMemberships([]);
      setBulkAction("");
      toast({ title: "Bulk Action Complete", description: "The selected memberships have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Bulk action failed.", variant: "destructive" });
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: { name: string; annualPrice: number; defaultSessionFee: number; isDefault: boolean }) => {
      await apiRequest("POST", `/api/clubs/${clubId}/membership-plans`, data);
    },
    onSuccess: () => {
      invalidateMemberships();
      setCreatePlanDialog(false);
      setPlanName("");
      setPlanPrice("");
      setPlanSessionFee("");
      setPlanIsDefault(false);
      toast({ title: "Plan Created", description: "Membership plan has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create plan.", variant: "destructive" });
    },
  });

  const editPlanMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; annualPrice: number; defaultSessionFee: number; isDefault: boolean }) => {
      await apiRequest("PATCH", `/api/clubs/${clubId}/membership-plans/${id}`, data);
    },
    onSuccess: () => {
      invalidateMemberships();
      setEditPlanDialog(null);
      toast({ title: "Plan Updated", description: "Membership plan has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update plan.", variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clubs/${clubId}/membership-plans/${id}`);
    },
    onSuccess: () => {
      invalidateMemberships();
      toast({ title: "Plan Deleted", description: "Membership plan has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete plan.", variant: "destructive" });
    },
  });

  const addMembershipMutation = useMutation({
    mutationFn: async (data: { userId: number; planId: number; startDate: string; paymentStatus: string }) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/memberships/add`, data);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Failed to add membership" }));
        throw new Error(errData.message || "Failed to add membership");
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateMemberships();
      setAddMembershipDialog(false);
      setAddMemberUserId("");
      setAddMemberPlanId("");
      setAddMemberStartDate(format(new Date(), "yyyy-MM-dd"));
      setAddMemberPaymentStatus("UNPAID");
      setAddMemberSearch("");
      toast({ title: "Membership Added", description: "The membership has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add membership.", variant: "destructive" });
    },
  });

  const handleApprove = (requestId: number) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const nextYear = format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd");
    setApproveStartDate(today);
    setApproveEndDate(nextYear);
    setApproveDialog({ requestId });
  };

  const handleReject = (requestId: number) => {
    setRejectReason("");
    setRejectDialog({ requestId });
  };

  const handleEditDates = (membership: ClubMembership) => {
    setEditStartDate(membership.startDate ? format(new Date(membership.startDate), "yyyy-MM-dd") : "");
    setEditEndDate(membership.endDate ? format(new Date(membership.endDate), "yyyy-MM-dd") : "");
    setEditDatesDialog({ membershipId: membership.id, startDate: membership.startDate, endDate: membership.endDate });
  };

  const handleCancel = (membershipId: number) => {
    setCancelReason("");
    setCancelDialog({ membershipId });
  };

  const handleSelectAll = () => {
    if (selectedMemberships.length === filteredMemberships.length) {
      setSelectedMemberships([]);
    } else {
      setSelectedMemberships(filteredMemberships.map((m) => m.id));
    }
  };

  const handleSelectMembership = (id: number) => {
    setSelectedMemberships((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedMemberships.length === 0) return;
    bulkActionMutation.mutate({ membershipIds: selectedMemberships, action: bulkAction });
  };

  const handleCreatePlan = () => {
    const annualPrice = Math.round(parseFloat(planPrice) * 100);
    const defaultSessionFee = Math.round(parseFloat(planSessionFee) * 100);
    if (isNaN(annualPrice) || isNaN(defaultSessionFee) || !planName.trim()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createPlanMutation.mutate({ name: planName.trim(), annualPrice, defaultSessionFee, isDefault: planIsDefault });
  };

  const handleEditPlan = () => {
    if (!editPlanDialog) return;
    const annualPrice = Math.round(parseFloat(editPlanPrice) * 100);
    const defaultSessionFee = Math.round(parseFloat(editPlanSessionFee) * 100);
    if (isNaN(annualPrice) || isNaN(defaultSessionFee) || !editPlanName.trim()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    editPlanMutation.mutate({ id: editPlanDialog.id, name: editPlanName.trim(), annualPrice, defaultSessionFee, isDefault: editPlanIsDefault });
  };

  const openEditPlan = (plan: MembershipPlan) => {
    setEditPlanName(plan.name);
    setEditPlanPrice(formatPounds(plan.annualPrice));
    setEditPlanSessionFee(formatPounds(plan.defaultSessionFee));
    setEditPlanIsDefault(plan.isDefault);
    setEditPlanDialog(plan);
  };

  const requestStatusOptions = ["all", "PENDING", "APPROVED", "REJECTED"];
  const activeStatusOptions = ["all", "ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"];

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN" && (!myAdminClubs || myAdminClubs.length === 0))) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must be an Admin to access this page.</p>
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
          <h1 className="text-2xl font-display font-bold flex items-center gap-2 flex-wrap">
            <CreditCard className="h-6 w-6 text-primary" />
            Membership Board
          </h1>
          <p className="text-muted-foreground">Manage club membership requests, active memberships, and plans</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={clubId} onValueChange={(val) => { setSelectedClubId(val); setSelectedMemberships([]); }}>
              <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
                <SelectValue placeholder="Select Club" />
              </SelectTrigger>
              <SelectContent>
                {(isOwner ? myAdminClubs : myAdminClubs)?.map((club: any) => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {(activeTab === "requests" ? requestStatusOptions : activeStatusOptions).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All Statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-members"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setStatusFilter("all"); setSelectedMemberships([]); }}>
        <TabsList data-testid="tabs-membership">
          <TabsTrigger value="requests" data-testid="tab-requests">Membership Requests</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active Memberships</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-requests-count">
                Membership Requests ({filteredRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!clubId ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a club to view membership requests</p>
                  </div>
                </div>
              ) : requestsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-requests" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No membership requests found</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Proration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-request-user-${req.id}`}>{req.fullName}</span>
                          </TableCell>
                          <TableCell data-testid={`text-request-plan-${req.id}`}>{req.planName}</TableCell>
                          <TableCell data-testid={`text-request-date-${req.id}`}>
                            {req.createdAt ? format(new Date(req.createdAt), "dd MMM yyyy") : "N/A"}
                          </TableCell>
                          <TableCell data-testid={`text-request-proration-${req.id}`}>
                            {req.prorationAmount != null ? `£${formatPounds(req.prorationAmount)}` : "N/A"}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>
                            {req.status === "PENDING" && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(req.id)}
                                  data-testid={`button-approve-${req.id}`}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(req.id)}
                                  data-testid={`button-reject-${req.id}`}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
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

        <TabsContent value="active">
          {selectedMemberships.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-sm text-muted-foreground">{selectedMemberships.length} selected</span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[180px]" data-testid="select-bulk-action">
                  <SelectValue placeholder="Bulk Action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cancel">Cancel Selected</SelectItem>
                  {isOwner && <SelectItem value="delete">Delete Selected</SelectItem>}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkActionMutation.isPending}
                data-testid="button-apply-bulk"
              >
                {bulkActionMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Apply
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg" data-testid="text-memberships-count">
                Active Memberships ({filteredMemberships.length})
              </CardTitle>
              {clubId && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAddMemberUserId("");
                    setAddMemberPlanId(plans.length > 0 ? plans[0].id.toString() : "");
                    setAddMemberStartDate(format(new Date(), "yyyy-MM-dd"));
                    setAddMemberPaymentStatus("UNPAID");
                    setAddMemberSearch("");
                    setAddMembershipDialog(true);
                  }}
                  data-testid="button-add-membership"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Membership
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!clubId ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a club to view memberships</p>
                  </div>
                </div>
              ) : membershipsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-memberships" />
                </div>
              ) : filteredMemberships.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No memberships found</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedMemberships.length > 0 && selectedMemberships.length === filteredMemberships.length}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMemberships.map((membership) => {
                        const daysRemaining = membership.endDate ? getDaysRemaining(membership.endDate) : 0;
                        const daysColor = getDaysRemainingColor(daysRemaining);

                        return (
                          <TableRow key={membership.id} data-testid={`row-membership-${membership.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMemberships.includes(membership.id)}
                                onCheckedChange={() => handleSelectMembership(membership.id)}
                                data-testid={`checkbox-membership-${membership.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium" data-testid={`text-membership-user-${membership.id}`}>
                                {membership.fullName}
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-membership-plan-${membership.id}`}>{membership.planName}</TableCell>
                            <TableCell data-testid={`text-membership-start-${membership.id}`}>
                              {membership.startDate ? format(new Date(membership.startDate), "dd MMM yyyy") : "N/A"}
                            </TableCell>
                            <TableCell data-testid={`text-membership-end-${membership.id}`}>
                              {membership.endDate ? format(new Date(membership.endDate), "dd MMM yyyy") : "N/A"}
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${daysColor}`} data-testid={`text-membership-days-${membership.id}`}>
                                {daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? "Expires today" : "Expired"}
                              </span>
                            </TableCell>
                            <TableCell>{getStatusBadge(membership.status)}</TableCell>
                            <TableCell>{getPaymentBadge(membership.paymentStatus)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {membership.status === "PENDING" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => activateMutation.mutate(membership.id)}
                                    disabled={activateMutation.isPending}
                                    data-testid={`button-activate-${membership.id}`}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Activate
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDates(membership)}
                                  data-testid={`button-edit-dates-${membership.id}`}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancel(membership.id)}
                                  data-testid={`button-cancel-${membership.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {clubId && (
        <Collapsible open={plansOpen} onOpenChange={setPlansOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  {plansOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  Membership Plans
                  <Button
                    size="sm"
                    className="ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlanName("");
                      setPlanPrice("");
                      setPlanSessionFee("");
                      setPlanIsDefault(false);
                      setCreatePlanDialog(true);
                    }}
                    data-testid="button-create-plan"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Plan
                  </Button>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {plansLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-plans" />
                  </div>
                ) : plans.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    <p>No membership plans yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Annual Price</TableHead>
                          <TableHead>Session Fee</TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map((plan) => (
                          <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                            <TableCell>
                              <span className="font-medium" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</span>
                            </TableCell>
                            <TableCell data-testid={`text-plan-price-${plan.id}`}>£{formatPounds(plan.annualPrice)}</TableCell>
                            <TableCell data-testid={`text-plan-fee-${plan.id}`}>£{formatPounds(plan.defaultSessionFee)}</TableCell>
                            <TableCell>
                              {plan.isDefault ? (
                                <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Default</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditPlan(plan)}
                                  data-testid={`button-edit-plan-${plan.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deletePlanMutation.mutate(plan.id)}
                                  disabled={deletePlanMutation.isPending}
                                  data-testid={`button-delete-plan-${plan.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <Dialog open={!!approveDialog} onOpenChange={(open) => !open && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Membership Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-start">Start Date</Label>
              <Input
                id="approve-start"
                type="date"
                value={approveStartDate}
                onChange={(e) => setApproveStartDate(e.target.value)}
                data-testid="input-approve-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve-end">End Date</Label>
              <Input
                id="approve-end"
                type="date"
                value={approveEndDate}
                onChange={(e) => setApproveEndDate(e.target.value)}
                data-testid="input-approve-end-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)} data-testid="button-approve-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => approveDialog && approveMutation.mutate({ id: approveDialog.requestId, startDate: approveStartDate, endDate: approveEndDate })}
              disabled={approveMutation.isPending || !approveStartDate || !approveEndDate}
              data-testid="button-approve-confirm"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Membership Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason</Label>
              <Input
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-reject-cancel">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ id: rejectDialog.requestId, reason: rejectReason })}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              data-testid="button-reject-confirm"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason</Label>
              <Input
                id="cancel-reason"
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)} data-testid="button-cancel-dialog-cancel">
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelDialog && cancelMutation.mutate({ id: cancelDialog.membershipId, reason: cancelReason })}
              disabled={cancelMutation.isPending || !cancelReason.trim()}
              data-testid="button-cancel-confirm"
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Cancel Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDatesDialog} onOpenChange={(open) => !open && setEditDatesDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership Dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date</Label>
              <Input
                id="edit-start"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                data-testid="input-edit-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date</Label>
              <Input
                id="edit-end"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                data-testid="input-edit-end-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDatesDialog(null)} data-testid="button-edit-dates-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => editDatesDialog && editDatesMutation.mutate({ id: editDatesDialog.membershipId, startDate: editStartDate, endDate: editEndDate })}
              disabled={editDatesMutation.isPending || !editStartDate || !editEndDate}
              data-testid="button-edit-dates-confirm"
            >
              {editDatesMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createPlanDialog} onOpenChange={setCreatePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Membership Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                placeholder="e.g. Annual Membership"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                data-testid="input-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Annual Price (£)</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                data-testid="input-plan-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-session-fee">Default Session Fee (£)</Label>
              <Input
                id="plan-session-fee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={planSessionFee}
                onChange={(e) => setPlanSessionFee(e.target.value)}
                data-testid="input-plan-session-fee"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="plan-default"
                checked={planIsDefault}
                onCheckedChange={setPlanIsDefault}
                data-testid="switch-plan-default"
              />
              <Label htmlFor="plan-default">Set as default plan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePlanDialog(false)} data-testid="button-create-plan-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending}
              data-testid="button-create-plan-confirm"
            >
              {createPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPlanDialog} onOpenChange={(open) => !open && setEditPlanDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Membership Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plan-name">Plan Name</Label>
              <Input
                id="edit-plan-name"
                value={editPlanName}
                onChange={(e) => setEditPlanName(e.target.value)}
                data-testid="input-edit-plan-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan-price">Annual Price (£)</Label>
              <Input
                id="edit-plan-price"
                type="number"
                step="0.01"
                value={editPlanPrice}
                onChange={(e) => setEditPlanPrice(e.target.value)}
                data-testid="input-edit-plan-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan-session-fee">Default Session Fee (£)</Label>
              <Input
                id="edit-plan-session-fee"
                type="number"
                step="0.01"
                value={editPlanSessionFee}
                onChange={(e) => setEditPlanSessionFee(e.target.value)}
                data-testid="input-edit-plan-session-fee"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-plan-default"
                checked={editPlanIsDefault}
                onCheckedChange={setEditPlanIsDefault}
                data-testid="switch-edit-plan-default"
              />
              <Label htmlFor="edit-plan-default">Set as default plan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanDialog(null)} data-testid="button-edit-plan-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleEditPlan}
              disabled={editPlanMutation.isPending}
              data-testid="button-edit-plan-confirm"
            >
              {editPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addMembershipDialog} onOpenChange={setAddMembershipDialog}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Membership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-10"
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  data-testid="input-add-member-search"
                />
              </div>
              <div className="border rounded-md max-h-[180px] overflow-y-auto">
                {filteredClubMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                ) : (
                  filteredClubMembers.map((member: any) => {
                    const userId = member.user?.id || member.userId;
                    const name = member.user?.fullName || member.fullName || "Unknown";
                    const isSelected = addMemberUserId === String(userId);
                    return (
                      <div
                        key={userId}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate ${isSelected ? "bg-primary/10" : ""}`}
                        onClick={() => setAddMemberUserId(String(userId))}
                        data-testid={`member-option-${userId}`}
                      >
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                        <span className="text-sm truncate">{name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-member-plan">Membership Plan</Label>
              <Select value={addMemberPlanId} onValueChange={setAddMemberPlanId}>
                <SelectTrigger data-testid="select-add-member-plan">
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - £{formatPounds(plan.annualPrice)}/year
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-member-start-date">Start Date</Label>
              <Input
                id="add-member-start-date"
                type="date"
                value={addMemberStartDate}
                onChange={(e) => setAddMemberStartDate(e.target.value)}
                data-testid="input-add-member-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date (auto-calculated)</Label>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium" data-testid="text-add-member-expiry">
                  {addMembershipExpiryDate ? format(new Date(addMembershipExpiryDate), "dd MMM yyyy") : "Select a start date"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">365 days</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={addMemberPaymentStatus} onValueChange={setAddMemberPaymentStatus}>
                <SelectTrigger data-testid="select-add-member-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMembershipDialog(false)} data-testid="button-add-membership-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!addMemberUserId) {
                  toast({ title: "Please select a member", variant: "destructive" });
                  return;
                }
                if (!addMemberPlanId) {
                  toast({ title: "Please select a membership plan", variant: "destructive" });
                  return;
                }
                if (!addMemberStartDate) {
                  toast({ title: "Please select a start date", variant: "destructive" });
                  return;
                }
                addMembershipMutation.mutate({
                  userId: Number(addMemberUserId),
                  planId: Number(addMemberPlanId),
                  startDate: addMemberStartDate,
                  paymentStatus: addMemberPaymentStatus,
                });
              }}
              disabled={addMembershipMutation.isPending}
              data-testid="button-add-membership-confirm"
            >
              {addMembershipMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

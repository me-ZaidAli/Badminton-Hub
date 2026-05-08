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
import { Loader2, Plus, Check, X, Calendar, Pencil, Trash2, CreditCard, Search, ArrowLeft, ChevronDown, ChevronRight, Users, UserPlus, Tag, ExternalLink, ClipboardList } from "lucide-react";
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

function getStatusBadge(status: string, rejectionReason?: string | null) {
  if (status === "REJECTED" && rejectionReason === "MOVED_TO_TRIAL") {
    return <Badge variant="default" className="bg-blue-500 no-default-hover-elevate">Trial</Badge>;
  }
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

function getPaymentBadge(status: string | undefined | null) {
  const normalized = (status || "UNPAID").toUpperCase();
  switch (normalized) {
    case "PAID":
      return <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Paid</Badge>;
    case "UNPAID":
      return <Badge variant="destructive" className="no-default-hover-elevate">Unpaid</Badge>;
    case "PARTIAL":
      return <Badge variant="secondary" className="no-default-hover-elevate">Partial</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status || "Unpaid"}</Badge>;
  }
}

interface MembershipRequest {
  id: number;
  userId: number;
  clubId: number;
  planId: number;
  status: string;
  rejectionReason: string | null;
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
  paymentConfirmed?: boolean;
  fullName: string;
  planName: string;
  planAnnualPrice?: number;
  proratedPrice?: number;
}

interface MembershipPlan {
  id: number;
  clubId: number;
  name: string;
  annualPrice: number;
  defaultSessionFee: number;
  defaultDurationDays: number;
  isDefault: boolean;
}

interface DiscountCodeAssignment {
  id: number;
  userId: number;
  fullName?: string;
}

interface DiscountCode {
  id: number;
  clubId: number;
  code: string;
  description?: string;
  discountPercent?: number;
  shopName?: string;
  shopUrl?: string;
  validUntil?: string;
  appliesToAll?: boolean;
  assignments?: DiscountCodeAssignment[];
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
  const [activePlanFilter, setActivePlanFilter] = useState<string>("all");

  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);

  const [approveDialog, setApproveDialog] = useState<{ requestId: number } | null>(null);
  const [approveStartDate, setApproveStartDate] = useState("");
  const [approveEndDate, setApproveEndDate] = useState("");

  const [rejectDialog, setRejectDialog] = useState<{ requestId: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [trialDialog, setTrialDialog] = useState<{ requestId: number; fullName: string } | null>(null);

  const [cancelDialog, setCancelDialog] = useState<{ membershipId: number } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [editDatesDialog, setEditDatesDialog] = useState<{ membershipId: number; startDate: string; endDate: string } | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [bulkAction, setBulkAction] = useState<string>("");

  const [payMethodDialog, setPayMethodDialog] = useState<{ id: number; fullName: string; planName: string; price: number } | null>(null);
  const [payMethod, setPayMethod] = useState<"external" | "wallet">("external");

  const [plansOpen, setPlansOpen] = useState(false);
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planSessionFee, setPlanSessionFee] = useState("");
  const [planDurationDays, setPlanDurationDays] = useState<string>("365");
  const [planIsDefault, setPlanIsDefault] = useState(false);

  const [editPlanDialog, setEditPlanDialog] = useState<MembershipPlan | null>(null);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPrice, setEditPlanPrice] = useState("");
  const [editPlanSessionFee, setEditPlanSessionFee] = useState("");
  const [editPlanDurationDays, setEditPlanDurationDays] = useState<string>("365");
  const [editPlanIsDefault, setEditPlanIsDefault] = useState(false);

  const [editMembershipDialog, setEditMembershipDialog] = useState<ClubMembership | null>(null);
  const [editMembershipPlanId, setEditMembershipPlanId] = useState("");
  const [editMembershipStatus, setEditMembershipStatus] = useState("");
  const [editMembershipPayment, setEditMembershipPayment] = useState(false);
  const [editMembershipStartDate, setEditMembershipStartDate] = useState("");
  const [editMembershipEndDate, setEditMembershipEndDate] = useState("");

  const [addMembershipDialog, setAddMembershipDialog] = useState(false);
  const [addMemberUserIds, setAddMemberUserIds] = useState<string[]>([]);
  const [addMemberPlanId, setAddMemberPlanId] = useState<string>("");
  const [addMemberStartDate, setAddMemberStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addMemberDurationDays, setAddMemberDurationDays] = useState<string>("365");
  const [addMemberPaymentStatus, setAddMemberPaymentStatus] = useState<string>("UNPAID");
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const [createDiscountDialog, setCreateDiscountDialog] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountDescription, setDiscountDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountShopName, setDiscountShopName] = useState("");
  const [discountShopUrl, setDiscountShopUrl] = useState("");
  const [discountValidUntil, setDiscountValidUntil] = useState("");

  const [editDiscountDialog, setEditDiscountDialog] = useState<DiscountCode | null>(null);
  const [editDiscountCode, setEditDiscountCode] = useState("");
  const [editDiscountDescription, setEditDiscountDescription] = useState("");
  const [editDiscountPercent, setEditDiscountPercent] = useState("");
  const [editDiscountShopName, setEditDiscountShopName] = useState("");
  const [editDiscountShopUrl, setEditDiscountShopUrl] = useState("");
  const [editDiscountValidUntil, setEditDiscountValidUntil] = useState("");

  const [assignDiscountDialog, setAssignDiscountDialog] = useState<DiscountCode | null>(null);
  const [assignAppliesToAll, setAssignAppliesToAll] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [assignMemberSearch, setAssignMemberSearch] = useState("");

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

  const discountCodesUrl = clubId ? `/api/clubs/${clubId}/discount-codes` : null;
  const { data: discountCodes = [], isLoading: discountCodesLoading } = useQuery<DiscountCode[]>({
    queryKey: [discountCodesUrl],
    enabled: !!discountCodesUrl && activeTab === "discounts",
  });

  const { data: clubMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && (addMembershipDialog || !!assignDiscountDialog),
  });

  const addMembershipExpiryDate = useMemo(() => {
    if (!addMemberStartDate) return "";
    const days = parseInt(addMemberDurationDays) || 365;
    const start = new Date(addMemberStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return format(end, "yyyy-MM-dd");
  }, [addMemberStartDate, addMemberDurationDays]);

  const filteredClubMembers = useMemo(() => {
    const activeMemberUserIds = new Set(
      memberships
        .filter((m) => m.status === "ACTIVE" || m.status === "APPROVED" || m.status === "PENDING")
        .map((m) => m.userId)
    );
    let filtered = clubMembers.filter((m: any) => {
      const userId = m.user?.id || m.userId;
      return !activeMemberUserIds.has(userId);
    });
    if (addMemberSearch) {
      const lower = addMemberSearch.toLowerCase();
      filtered = filtered.filter((m: any) => {
        const name = m.user?.fullName || m.fullName || "";
        return name.toLowerCase().includes(lower);
      });
    }
    return filtered;
  }, [clubMembers, addMemberSearch, memberships]);

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
    let filtered = memberships.map((m) => ({
      ...m,
      paymentStatus: m.paymentStatus || (m.paymentConfirmed ? "PAID" : "UNPAID"),
    }));
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.fullName?.toLowerCase().includes(lower));
    }
    return filtered;
  }, [memberships, searchQuery]);

  const uniquePlanNames = useMemo(() => {
    const names = [...new Set(filteredMemberships.map(m => m.planName).filter(Boolean))];
    return names;
  }, [filteredMemberships]);

  const planFilteredMemberships = useMemo(() => {
    if (activePlanFilter === "all") return filteredMemberships;
    return filteredMemberships.filter(m => m.planName === activePlanFilter);
  }, [filteredMemberships, activePlanFilter]);

  const membershipSummary = useMemo(() => {
    const getMembershipFee = (m: ClubMembership) => m.proratedPrice ?? m.planAnnualPrice ?? 0;
    const totalRevenue = memberships.reduce((sum, m) => sum + getMembershipFee(m), 0);
    const paidAmount = memberships.filter((m) => m.paymentConfirmed || m.paymentStatus === "PAID").reduce((sum, m) => sum + getMembershipFee(m), 0);
    const unpaidAmount = totalRevenue - paidAmount;
    const paidCount = memberships.filter((m) => m.paymentConfirmed || m.paymentStatus === "PAID").length;
    const unpaidCount = memberships.length - paidCount;
    return { totalRevenue, paidAmount, unpaidAmount, paidCount, unpaidCount };
  }, [memberships]);

  const filteredAssignMembers = useMemo(() => {
    if (!assignMemberSearch) return clubMembers;
    const lower = assignMemberSearch.toLowerCase();
    return clubMembers.filter((m: any) => {
      const name = m.user?.fullName || m.fullName || "";
      return name.toLowerCase().includes(lower);
    });
  }, [clubMembers, assignMemberSearch]);

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

  const invalidateDiscountCodes = () => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && key.includes("/discount-codes");
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

  const moveToTrialMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/membership-requests/${id}/move-to-trial`, {});
    },
    onSuccess: () => {
      invalidateMemberships();
      queryClient.invalidateQueries({ predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === "string" && key.includes("trial");
      }});
      setTrialDialog(null);
      toast({ title: "Moved to Trial", description: "Player has been added to the trial list. They will be notified to book a trial session." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to move to trial list.", variant: "destructive" });
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
    mutationFn: async ({ id, ...data }: { id: number; name: string; annualPrice: number; defaultSessionFee: number; defaultDurationDays: number; isDefault: boolean }) => {
      await apiRequest("PATCH", `/api/membership-plans/${id}`, data);
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
      await apiRequest("DELETE", `/api/membership-plans/${id}`);
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
    mutationFn: async (data: { userIds: number[]; planId: number; startDate: string; durationDays: number; paymentStatus: string }) => {
      const results: { userId: number; success: boolean; error?: string }[] = [];
      for (const userId of data.userIds) {
        try {
          const res = await apiRequest("POST", `/api/clubs/${clubId}/memberships/add`, {
            userId,
            planId: data.planId,
            startDate: data.startDate,
            durationDays: data.durationDays,
            paymentStatus: data.paymentStatus,
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ message: "Failed" }));
            results.push({ userId, success: false, error: errData.message });
          } else {
            results.push({ userId, success: true });
          }
        } catch (err: any) {
          results.push({ userId, success: false, error: err.message });
        }
      }
      const failures = results.filter(r => !r.success);
      if (failures.length > 0 && failures.length === data.userIds.length) {
        throw new Error(failures[0].error || "Failed to add memberships");
      }
      return { results, successCount: results.filter(r => r.success).length, failCount: failures.length };
    },
    onSuccess: (data) => {
      invalidateMemberships();
      setAddMembershipDialog(false);
      setAddMemberUserIds([]);
      setAddMemberPlanId("");
      setAddMemberStartDate(format(new Date(), "yyyy-MM-dd"));
      setAddMemberDurationDays("365");
      setAddMemberPaymentStatus("UNPAID");
      setAddMemberSearch("");
      if (data.failCount > 0) {
        toast({ title: "Partially Added", description: `${data.successCount} memberships created, ${data.failCount} failed (may already have active memberships).` });
      } else {
        toast({ title: "Memberships Added", description: `${data.successCount} membership${data.successCount > 1 ? "s" : ""} created successfully.` });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add memberships.", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, paymentConfirmed, paymentMethod }: { id: number; paymentConfirmed: boolean; paymentMethod?: "external" | "wallet" }) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/payment`, { paymentConfirmed, paymentMethod });
    },
    onSuccess: (_d, vars) => {
      invalidateMemberships();
      setPayMethodDialog(null);
      toast({
        title: "Payment Updated",
        description: vars.paymentMethod === "wallet"
          ? "Marked paid and amount deducted from member's wallet."
          : vars.paymentMethod === "external"
            ? "Marked paid via external bank transfer."
            : "Payment status has been updated.",
      });
    },
    onError: (error: any) => {
      const msg = String(error?.message || "Failed to update payment.").replace(/^\d+:\s*/, "");
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const editDetailsMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; planId?: number; status?: string; startDate?: string; endDate?: string; paymentConfirmed?: boolean }) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/details`, data);
    },
    onSuccess: () => {
      invalidateMemberships();
      setEditMembershipDialog(null);
      toast({ title: "Membership Updated", description: "Membership details have been saved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update membership.", variant: "destructive" });
    },
  });

  const createDiscountMutation = useMutation({
    mutationFn: async (data: { code: string; description?: string; discountPercent?: number; shopName?: string; shopUrl?: string; validUntil?: string }) => {
      await apiRequest("POST", `/api/clubs/${clubId}/discount-codes`, data);
    },
    onSuccess: () => {
      invalidateDiscountCodes();
      setCreateDiscountDialog(false);
      setDiscountCode("");
      setDiscountDescription("");
      setDiscountPercent("");
      setDiscountShopName("");
      setDiscountShopUrl("");
      setDiscountValidUntil("");
      toast({ title: "Discount Code Created", description: "The discount code has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create discount code.", variant: "destructive" });
    },
  });

  const editDiscountMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; code: string; description?: string; discountPercent?: number; shopName?: string; shopUrl?: string; validUntil?: string }) => {
      await apiRequest("PATCH", `/api/discount-codes/${id}`, data);
    },
    onSuccess: () => {
      invalidateDiscountCodes();
      setEditDiscountDialog(null);
      toast({ title: "Discount Code Updated", description: "The discount code has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update discount code.", variant: "destructive" });
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discount-codes/${id}`);
    },
    onSuccess: () => {
      invalidateDiscountCodes();
      toast({ title: "Discount Code Deleted", description: "The discount code has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete discount code.", variant: "destructive" });
    },
  });

  const assignDiscountMutation = useMutation({
    mutationFn: async ({ id, userIds, appliesToAll }: { id: number; userIds?: number[]; appliesToAll?: boolean }) => {
      await apiRequest("POST", `/api/discount-codes/${id}/assign`, { userIds, appliesToAll });
    },
    onSuccess: () => {
      invalidateDiscountCodes();
      setAssignDiscountDialog(null);
      setAssignUserIds([]);
      setAssignAppliesToAll(false);
      setAssignMemberSearch("");
      toast({ title: "Assignment Updated", description: "The discount code assignment has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign discount code.", variant: "destructive" });
    },
  });

  const openEditDiscount = (dc: DiscountCode) => {
    setEditDiscountCode(dc.code);
    setEditDiscountDescription(dc.description || "");
    setEditDiscountPercent(dc.discountPercent?.toString() || "");
    setEditDiscountShopName(dc.shopName || "");
    setEditDiscountShopUrl(dc.shopUrl || "");
    setEditDiscountValidUntil(dc.validUntil ? format(new Date(dc.validUntil), "yyyy-MM-dd") : "");
    setEditDiscountDialog(dc);
  };

  const openAssignDiscount = (dc: DiscountCode) => {
    setAssignAppliesToAll(dc.appliesToAll || false);
    setAssignUserIds((dc.assignments || []).map((a) => String(a.userId)));
    setAssignMemberSearch("");
    setAssignDiscountDialog(dc);
  };

  const openEditMembership = (membership: ClubMembership) => {
    setEditMembershipPlanId(membership.planId?.toString() || "");
    setEditMembershipStatus(membership.status);
    setEditMembershipPayment(membership.paymentStatus === "PAID");
    setEditMembershipStartDate(membership.startDate ? format(new Date(membership.startDate), "yyyy-MM-dd") : "");
    setEditMembershipEndDate(membership.endDate ? format(new Date(membership.endDate), "yyyy-MM-dd") : "");
    setEditMembershipDialog(membership);
  };

  const handleSaveEditMembership = () => {
    if (!editMembershipDialog) return;
    const updates: Record<string, any> = { id: editMembershipDialog.id };

    if (editMembershipPlanId && Number(editMembershipPlanId) !== editMembershipDialog.planId) {
      updates.planId = Number(editMembershipPlanId);
    }
    if (editMembershipStatus !== editMembershipDialog.status) {
      updates.status = editMembershipStatus;
    }
    const currentPaid = editMembershipDialog.paymentStatus === "PAID";
    if (editMembershipPayment !== currentPaid) {
      updates.paymentConfirmed = editMembershipPayment;
    }
    if (editMembershipStartDate) {
      const origStart = editMembershipDialog.startDate ? format(new Date(editMembershipDialog.startDate), "yyyy-MM-dd") : "";
      if (editMembershipStartDate !== origStart) updates.startDate = editMembershipStartDate;
    }
    if (editMembershipEndDate) {
      const origEnd = editMembershipDialog.endDate ? format(new Date(editMembershipDialog.endDate), "yyyy-MM-dd") : "";
      if (editMembershipEndDate !== origEnd) updates.endDate = editMembershipEndDate;
    }

    if (Object.keys(updates).length <= 1) {
      toast({ title: "No changes", description: "No changes were detected.", variant: "destructive" });
      return;
    }
    editDetailsMutation.mutate(updates as any);
  };

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

  const handleMoveToTrial = (requestId: number, fullName: string) => {
    setTrialDialog({ requestId, fullName });
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
    const visibleIds = planFilteredMemberships.map((m) => m.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedMemberships.includes(id));
    if (allVisibleSelected) {
      setSelectedMemberships((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedMemberships((prev) => {
        const existing = new Set(prev);
        visibleIds.forEach((id) => existing.add(id));
        return Array.from(existing);
      });
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
    const durationDays = parseInt(planDurationDays) || 365;
    createPlanMutation.mutate({ name: planName.trim(), annualPrice, defaultSessionFee, defaultDurationDays: durationDays, isDefault: planIsDefault });
  };

  const handleEditPlan = () => {
    if (!editPlanDialog) return;
    const annualPrice = Math.round(parseFloat(editPlanPrice) * 100);
    const defaultSessionFee = Math.round(parseFloat(editPlanSessionFee) * 100);
    if (isNaN(annualPrice) || isNaN(defaultSessionFee) || !editPlanName.trim()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    const durationDays = parseInt(editPlanDurationDays) || 365;
    editPlanMutation.mutate({ id: editPlanDialog.id, name: editPlanName.trim(), annualPrice, defaultSessionFee, defaultDurationDays: durationDays, isDefault: editPlanIsDefault });
  };

  const openEditPlan = (plan: MembershipPlan) => {
    setEditPlanName(plan.name);
    setEditPlanPrice(formatPounds(plan.annualPrice));
    setEditPlanSessionFee(formatPounds(plan.defaultSessionFee));
    setEditPlanDurationDays(String(plan.defaultDurationDays || 365));
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
          <TabsTrigger value="discounts" data-testid="tab-discounts">
            <Tag className="h-4 w-4 mr-1" />
            Discount Codes
            {discountCodes.length > 0 && (
              <Badge variant="secondary" className="ml-1 no-default-hover-elevate">{discountCodes.length}</Badge>
            )}
          </TabsTrigger>
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
                          <TableCell>{getStatusBadge(req.status, req.rejectionReason)}</TableCell>
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
                                  variant="outline"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                                  onClick={() => handleMoveToTrial(req.id, req.fullName)}
                                  data-testid={`button-trial-${req.id}`}
                                >
                                  <ClipboardList className="h-4 w-4 mr-1" />
                                  Trial
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
                  <SelectItem value="mark_paid">Mark as Paid</SelectItem>
                  <SelectItem value="mark_unpaid">Mark as Unpaid</SelectItem>
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

          {clubId && memberships.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    £{formatPounds(membershipSummary.totalRevenue)}
                  </div>
                  <div className="text-xs text-muted-foreground">{memberships.length} memberships</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Collected</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-collected-revenue">
                    £{formatPounds(membershipSummary.paidAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground">{membershipSummary.paidCount} paid</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                  <div className="text-2xl font-bold text-red-500" data-testid="text-outstanding-revenue">
                    £{formatPounds(membershipSummary.unpaidAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground">{membershipSummary.unpaidCount} unpaid</div>
                </CardContent>
              </Card>
            </div>
          )}

          {uniquePlanNames.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <Tabs value={activePlanFilter} onValueChange={setActivePlanFilter}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-plan-all">
                    All
                    <Badge variant="secondary" className="ml-1 no-default-hover-elevate">{filteredMemberships.length}</Badge>
                  </TabsTrigger>
                  {uniquePlanNames.map((name) => {
                    const count = filteredMemberships.filter(m => m.planName === name).length;
                    return (
                      <TabsTrigger key={name} value={name} data-testid={`tab-plan-${name}`}>
                        {name}
                        <Badge variant="secondary" className="ml-1 no-default-hover-elevate">{count}</Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg" data-testid="text-memberships-count">
                Active Memberships ({planFilteredMemberships.length})
              </CardTitle>
              {clubId && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAddMemberUserIds([]);
                    setAddMemberPlanId(plans.length > 0 ? plans[0].id.toString() : "");
                    setAddMemberStartDate(format(new Date(), "yyyy-MM-dd"));
                    setAddMemberDurationDays("365");
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
              ) : planFilteredMemberships.length === 0 ? (
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
                            checked={planFilteredMemberships.length > 0 && planFilteredMemberships.every((m) => selectedMemberships.includes(m.id))}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planFilteredMemberships.map((membership) => {
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
                            <TableCell data-testid={`text-membership-fee-${membership.id}`}>
                              <span className="font-medium">
                                £{formatPounds(membership.proratedPrice ?? membership.planAnnualPrice ?? 0)}
                              </span>
                            </TableCell>
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
                                {membership.paymentStatus !== "PAID" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setPayMethod("external");
                                      setPayMethodDialog({
                                        id: membership.id,
                                        fullName: membership.fullName,
                                        planName: membership.planName,
                                        price: membership.proratedPrice ?? membership.planAnnualPrice ?? 0,
                                      });
                                    }}
                                    disabled={markPaidMutation.isPending}
                                    data-testid={`button-mark-paid-${membership.id}`}
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                                {membership.paymentStatus === "PAID" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markPaidMutation.mutate({ id: membership.id, paymentConfirmed: false })}
                                    disabled={markPaidMutation.isPending}
                                    data-testid={`button-mark-unpaid-${membership.id}`}
                                  >
                                    Mark Unpaid
                                  </Button>
                                )}
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
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditMembership(membership)}
                                  title="Edit membership"
                                  data-testid={`button-edit-membership-${membership.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleCancel(membership.id)}
                                  title="Cancel membership"
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
        <TabsContent value="discounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-lg" data-testid="text-discounts-count">
                Discount Codes ({discountCodes.length})
              </CardTitle>
              <Button size="sm" onClick={() => setCreateDiscountDialog(true)} data-testid="button-add-discount">
                <Plus className="h-4 w-4 mr-1" />
                Add Code
              </Button>
            </CardHeader>
            <CardContent>
              {!clubId ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a club to view discount codes</p>
                  </div>
                </div>
              ) : discountCodesLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-discounts" />
                </div>
              ) : discountCodes.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No discount codes found</p>
                    <p className="text-sm mt-1">Create your first discount code to get started</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {discountCodes.map((dc) => (
                    <Card key={dc.id} className="hover-elevate" data-testid={`card-discount-${dc.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="no-default-hover-elevate font-mono" data-testid={`text-discount-code-${dc.id}`}>
                                {dc.code}
                              </Badge>
                              {dc.discountPercent != null && dc.discountPercent > 0 && (
                                <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`text-discount-percent-${dc.id}`}>
                                  {dc.discountPercent}% off
                                </Badge>
                              )}
                            </div>
                            {dc.description && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-discount-desc-${dc.id}`}>{dc.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openEditDiscount(dc)} data-testid={`button-edit-discount-${dc.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteDiscountMutation.mutate(dc.id)} disabled={deleteDiscountMutation.isPending} data-testid={`button-delete-discount-${dc.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {(dc.shopName || dc.shopUrl) && (
                          <div className="flex items-center gap-2 text-sm">
                            {dc.shopName && <span className="font-medium" data-testid={`text-discount-shop-${dc.id}`}>{dc.shopName}</span>}
                            {dc.shopUrl && (
                              <a href={dc.shopUrl} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1" data-testid={`link-discount-shop-${dc.id}`}>
                                <ExternalLink className="h-3 w-3" />
                                Visit
                              </a>
                            )}
                          </div>
                        )}

                        {dc.validUntil && (
                          <div className="text-sm text-muted-foreground" data-testid={`text-discount-valid-${dc.id}`}>
                            Valid until: {format(new Date(dc.validUntil), "dd MMM yyyy")}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1 border-t">
                          <div className="text-sm" data-testid={`text-discount-assigned-${dc.id}`}>
                            {dc.appliesToAll ? (
                              <Badge variant="default" className="bg-green-500 no-default-hover-elevate">All Members</Badge>
                            ) : dc.assignments && dc.assignments.length > 0 ? (
                              <span className="text-muted-foreground">
                                {dc.assignments.map((a) => a.fullName || `User #${a.userId}`).join(", ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openAssignDiscount(dc)} data-testid={`button-assign-discount-${dc.id}`}>
                            <Users className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                          <TableHead>Duration</TableHead>
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
                            <TableCell data-testid={`text-plan-duration-${plan.id}`}>{plan.defaultDurationDays || 365} days</TableCell>
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

      <Dialog open={!!trialDialog} onOpenChange={(open) => !open && setTrialDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Trial List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to move <span className="font-semibold text-foreground">{trialDialog?.fullName}</span> to the trial list?
            </p>
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                The player will be notified to book a trial session before they can join the club. Their membership request will be put on hold until the trial is completed and evaluated.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialog(null)} data-testid="button-trial-cancel">
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => trialDialog && moveToTrialMutation.mutate(trialDialog.requestId)}
              disabled={moveToTrialMutation.isPending}
              data-testid="button-trial-confirm"
            >
              {moveToTrialMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <ClipboardList className="h-4 w-4 mr-1" />
              Move to Trial
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
            <div className="space-y-2">
              <Label>Default Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={["30","60","90","180","365"].includes(planDurationDays) ? planDurationDays : "custom"} onValueChange={(v) => setPlanDurationDays(v === "custom" ? "custom" : v)}>
                  <SelectTrigger className="flex-1" data-testid="select-plan-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                    <SelectItem value="60">60 days (2 months)</SelectItem>
                    <SelectItem value="90">90 days (3 months)</SelectItem>
                    <SelectItem value="180">180 days (6 months)</SelectItem>
                    <SelectItem value="365">365 days (1 year)</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {!["30","60","90","180","365"].includes(planDurationDays) && (
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    className="w-24"
                    placeholder="Days"
                    value={planDurationDays === "custom" ? "" : planDurationDays}
                    onChange={(e) => setPlanDurationDays(e.target.value || "custom")}
                    data-testid="input-plan-custom-duration"
                  />
                )}
              </div>
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
            <div className="space-y-2">
              <Label>Default Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={["30","60","90","180","365"].includes(editPlanDurationDays) ? editPlanDurationDays : "custom"} onValueChange={(v) => setEditPlanDurationDays(v === "custom" ? "custom" : v)}>
                  <SelectTrigger className="flex-1" data-testid="select-edit-plan-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                    <SelectItem value="60">60 days (2 months)</SelectItem>
                    <SelectItem value="90">90 days (3 months)</SelectItem>
                    <SelectItem value="180">180 days (6 months)</SelectItem>
                    <SelectItem value="365">365 days (1 year)</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {!["30","60","90","180","365"].includes(editPlanDurationDays) && (
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    className="w-24"
                    placeholder="Days"
                    value={editPlanDurationDays === "custom" ? "" : editPlanDurationDays}
                    onChange={(e) => setEditPlanDurationDays(e.target.value || "custom")}
                    data-testid="input-edit-plan-custom-duration"
                  />
                )}
              </div>
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
              <Label>Select Members</Label>
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
              {filteredClubMembers.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{filteredClubMembers.length} members available</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allIds = filteredClubMembers.map((m: any) => String(m.user?.id || m.userId));
                        setAddMemberUserIds(prev => {
                          const existing = new Set(prev);
                          allIds.forEach((id: string) => existing.add(id));
                          return Array.from(existing);
                        });
                      }}
                      data-testid="button-select-all-members"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddMemberUserIds([])}
                      data-testid="button-clear-all-members"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              <div className="border rounded-md max-h-[160px] overflow-y-auto">
                {filteredClubMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                ) : (
                  filteredClubMembers.map((member: any) => {
                    const userId = member.user?.id || member.userId;
                    const name = member.user?.fullName || member.fullName || "Unknown";
                    const isSelected = addMemberUserIds.includes(String(userId));
                    return (
                      <div
                        key={userId}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate ${isSelected ? "bg-primary/10" : ""}`}
                        onClick={() => {
                          setAddMemberUserIds(prev =>
                            prev.includes(String(userId))
                              ? prev.filter(id => id !== String(userId))
                              : [...prev, String(userId)]
                          );
                        }}
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

            {addMemberUserIds.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Members ({addMemberUserIds.length})</Label>
                <div className="border rounded-md p-2 space-y-1 max-h-[120px] overflow-y-auto">
                  {addMemberUserIds.map((uid) => {
                    const member = clubMembers.find((m: any) => String(m.user?.id || m.userId) === uid);
                    const name = member?.user?.fullName || member?.fullName || "Unknown";
                    return (
                      <div
                        key={uid}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50"
                        data-testid={`selected-member-${uid}`}
                      >
                        <span className="text-sm truncate">{name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setAddMemberUserIds(prev => prev.filter(id => id !== uid))}
                          data-testid={`remove-member-${uid}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add-member-plan">Membership Plan</Label>
              <Select value={addMemberPlanId} onValueChange={(val) => {
                setAddMemberPlanId(val);
                const selectedPlan = plans.find((p) => p.id.toString() === val);
                if (selectedPlan?.defaultDurationDays) {
                  setAddMemberDurationDays(String(selectedPlan.defaultDurationDays));
                }
              }}>
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
              <Label>Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={addMemberDurationDays} onValueChange={setAddMemberDurationDays}>
                  <SelectTrigger className="flex-1" data-testid="select-add-member-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days (1 month)</SelectItem>
                    <SelectItem value="60">60 days (2 months)</SelectItem>
                    <SelectItem value="90">90 days (3 months)</SelectItem>
                    <SelectItem value="180">180 days (6 months)</SelectItem>
                    <SelectItem value="365">365 days (1 year)</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {!["30", "60", "90", "180", "365"].includes(addMemberDurationDays) && (
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    className="w-24"
                    placeholder="Days"
                    value={addMemberDurationDays === "custom" ? "" : addMemberDurationDays}
                    onChange={(e) => setAddMemberDurationDays(e.target.value || "custom")}
                    data-testid="input-add-member-custom-duration"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium" data-testid="text-add-member-expiry">
                  {addMembershipExpiryDate ? format(new Date(addMembershipExpiryDate), "dd MMM yyyy") : "Select a start date"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{parseInt(addMemberDurationDays) || 0} days</span>
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
                if (addMemberUserIds.length === 0) {
                  toast({ title: "Please select at least one member", variant: "destructive" });
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
                  userIds: addMemberUserIds.map(Number),
                  planId: Number(addMemberPlanId),
                  startDate: addMemberStartDate,
                  durationDays: parseInt(addMemberDurationDays) || 365,
                  paymentStatus: addMemberPaymentStatus,
                });
              }}
              disabled={addMembershipMutation.isPending}
              data-testid="button-add-membership-confirm"
            >
              {addMembershipMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Membership{addMemberUserIds.length > 1 ? `s (${addMemberUserIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMembershipDialog} onOpenChange={(open) => !open && setEditMembershipDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Membership
            </DialogTitle>
          </DialogHeader>
          {editMembershipDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium" data-testid="text-edit-membership-name">{editMembershipDialog.fullName}</p>
              </div>

              <div className="space-y-2">
                <Label>Membership Plan</Label>
                <Select value={editMembershipPlanId} onValueChange={setEditMembershipPlanId}>
                  <SelectTrigger data-testid="select-edit-membership-plan">
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
                <Label>Status</Label>
                <Select value={editMembershipStatus} onValueChange={setEditMembershipStatus}>
                  <SelectTrigger data-testid="select-edit-membership-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Status</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    id="edit-membership-payment"
                    checked={editMembershipPayment}
                    onCheckedChange={setEditMembershipPayment}
                    data-testid="switch-edit-membership-payment"
                  />
                  <Label htmlFor="edit-membership-payment" className="cursor-pointer">
                    {editMembershipPayment ? (
                      <Badge variant="default" className="bg-green-500 no-default-hover-elevate">Paid</Badge>
                    ) : (
                      <Badge variant="destructive" className="no-default-hover-elevate">Unpaid</Badge>
                    )}
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-membership-start">Start Date</Label>
                  <Input
                    id="edit-membership-start"
                    type="date"
                    value={editMembershipStartDate}
                    onChange={(e) => setEditMembershipStartDate(e.target.value)}
                    data-testid="input-edit-membership-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-membership-end">End Date</Label>
                  <Input
                    id="edit-membership-end"
                    type="date"
                    value={editMembershipEndDate}
                    onChange={(e) => setEditMembershipEndDate(e.target.value)}
                    data-testid="input-edit-membership-end"
                  />
                </div>
              </div>
              {editMembershipStartDate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const selectedPlan = plans.find((p) => p.id.toString() === editMembershipPlanId);
                    const duration = selectedPlan?.defaultDurationDays || 365;
                    const start = new Date(editMembershipStartDate);
                    start.setDate(start.getDate() + duration);
                    setEditMembershipEndDate(format(start, "yyyy-MM-dd"));
                  }}
                  data-testid="button-recalculate-end-date"
                >
                  Recalculate end date from plan duration ({(() => {
                    const selectedPlan = plans.find((p) => p.id.toString() === editMembershipPlanId);
                    return selectedPlan?.defaultDurationDays || 365;
                  })()} days)
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMembershipDialog(null)} data-testid="button-edit-membership-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditMembership}
              disabled={editDetailsMutation.isPending}
              data-testid="button-edit-membership-confirm"
            >
              {editDetailsMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDiscountDialog} onOpenChange={setCreateDiscountDialog}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Create Discount Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-code">Code</Label>
              <Input
                id="discount-code"
                placeholder="e.g. SUMMER20"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                data-testid="input-discount-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-description">Description</Label>
              <Input
                id="discount-description"
                placeholder="Optional description..."
                value={discountDescription}
                onChange={(e) => setDiscountDescription(e.target.value)}
                data-testid="input-discount-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-percent">Discount %</Label>
              <Input
                id="discount-percent"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                data-testid="input-discount-percent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-shop-name">Shop Name</Label>
              <Input
                id="discount-shop-name"
                placeholder="e.g. Yonex Pro Shop"
                value={discountShopName}
                onChange={(e) => setDiscountShopName(e.target.value)}
                data-testid="input-discount-shop-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-shop-url">Shop URL</Label>
              <Input
                id="discount-shop-url"
                placeholder="https://..."
                value={discountShopUrl}
                onChange={(e) => setDiscountShopUrl(e.target.value)}
                data-testid="input-discount-shop-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-valid-until">Valid Until</Label>
              <Input
                id="discount-valid-until"
                type="date"
                value={discountValidUntil}
                onChange={(e) => setDiscountValidUntil(e.target.value)}
                data-testid="input-discount-valid-until"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDiscountDialog(false)} data-testid="button-create-discount-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!discountCode.trim()) {
                  toast({ title: "Please enter a code", variant: "destructive" });
                  return;
                }
                createDiscountMutation.mutate({
                  code: discountCode.trim(),
                  description: discountDescription || undefined,
                  discountPercent: discountPercent ? Number(discountPercent) : undefined,
                  shopName: discountShopName || undefined,
                  shopUrl: discountShopUrl || undefined,
                  validUntil: discountValidUntil || undefined,
                });
              }}
              disabled={createDiscountMutation.isPending}
              data-testid="button-create-discount-confirm"
            >
              {createDiscountMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDiscountDialog} onOpenChange={(open) => !open && setEditDiscountDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Discount Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-discount-code">Code</Label>
              <Input
                id="edit-discount-code"
                value={editDiscountCode}
                onChange={(e) => setEditDiscountCode(e.target.value)}
                data-testid="input-edit-discount-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discount-description">Description</Label>
              <Input
                id="edit-discount-description"
                value={editDiscountDescription}
                onChange={(e) => setEditDiscountDescription(e.target.value)}
                data-testid="input-edit-discount-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discount-percent">Discount %</Label>
              <Input
                id="edit-discount-percent"
                type="number"
                min="0"
                max="100"
                value={editDiscountPercent}
                onChange={(e) => setEditDiscountPercent(e.target.value)}
                data-testid="input-edit-discount-percent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discount-shop-name">Shop Name</Label>
              <Input
                id="edit-discount-shop-name"
                value={editDiscountShopName}
                onChange={(e) => setEditDiscountShopName(e.target.value)}
                data-testid="input-edit-discount-shop-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discount-shop-url">Shop URL</Label>
              <Input
                id="edit-discount-shop-url"
                value={editDiscountShopUrl}
                onChange={(e) => setEditDiscountShopUrl(e.target.value)}
                data-testid="input-edit-discount-shop-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discount-valid-until">Valid Until</Label>
              <Input
                id="edit-discount-valid-until"
                type="date"
                value={editDiscountValidUntil}
                onChange={(e) => setEditDiscountValidUntil(e.target.value)}
                data-testid="input-edit-discount-valid-until"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDiscountDialog(null)} data-testid="button-edit-discount-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editDiscountDialog || !editDiscountCode.trim()) {
                  toast({ title: "Please enter a code", variant: "destructive" });
                  return;
                }
                editDiscountMutation.mutate({
                  id: editDiscountDialog.id,
                  code: editDiscountCode.trim(),
                  description: editDiscountDescription || undefined,
                  discountPercent: editDiscountPercent ? Number(editDiscountPercent) : undefined,
                  shopName: editDiscountShopName || undefined,
                  shopUrl: editDiscountShopUrl || undefined,
                  validUntil: editDiscountValidUntil || undefined,
                });
              }}
              disabled={editDiscountMutation.isPending}
              data-testid="button-edit-discount-confirm"
            >
              {editDiscountMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignDiscountDialog} onOpenChange={(open) => !open && setAssignDiscountDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Discount Code
            </DialogTitle>
          </DialogHeader>
          {assignDiscountDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium" data-testid="text-assign-discount-code">{assignDiscountDialog.code}</p>
                {assignDiscountDialog.description && (
                  <p className="text-xs text-muted-foreground mt-1">{assignDiscountDialog.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="assign-all-members"
                  checked={assignAppliesToAll}
                  onCheckedChange={setAssignAppliesToAll}
                  data-testid="switch-assign-all-members"
                />
                <Label htmlFor="assign-all-members" className="cursor-pointer">Assign to all members</Label>
              </div>

              {!assignAppliesToAll && (
                <>
                  <div className="space-y-2">
                    <Label>Select Members</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        className="pl-10"
                        value={assignMemberSearch}
                        onChange={(e) => setAssignMemberSearch(e.target.value)}
                        data-testid="input-assign-member-search"
                      />
                    </div>
                    <div className="border rounded-md max-h-[160px] overflow-y-auto">
                      {filteredAssignMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                      ) : (
                        filteredAssignMembers.map((member: any) => {
                          const userId = member.user?.id || member.userId;
                          const name = member.user?.fullName || member.fullName || "Unknown";
                          const isSelected = assignUserIds.includes(String(userId));
                          return (
                            <div
                              key={userId}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate ${isSelected ? "bg-primary/10" : ""}`}
                              onClick={() => {
                                setAssignUserIds(prev =>
                                  prev.includes(String(userId))
                                    ? prev.filter(id => id !== String(userId))
                                    : [...prev, String(userId)]
                                );
                              }}
                              data-testid={`assign-member-option-${userId}`}
                            >
                              {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                              <span className="text-sm truncate">{name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {assignUserIds.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Members ({assignUserIds.length})</Label>
                      <div className="border rounded-md p-2 space-y-1 max-h-[120px] overflow-y-auto">
                        {assignUserIds.map((uid) => {
                          const member = clubMembers.find((m: any) => String(m.user?.id || m.userId) === uid);
                          const name = member?.user?.fullName || member?.fullName || "Unknown";
                          return (
                            <div
                              key={uid}
                              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/50"
                              data-testid={`assign-selected-member-${uid}`}
                            >
                              <span className="text-sm truncate">{name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => setAssignUserIds(prev => prev.filter(id => id !== uid))}
                                data-testid={`assign-remove-member-${uid}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDiscountDialog(null)} data-testid="button-assign-discount-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!assignDiscountDialog) return;
                assignDiscountMutation.mutate({
                  id: assignDiscountDialog.id,
                  appliesToAll: assignAppliesToAll,
                  userIds: assignAppliesToAll ? undefined : assignUserIds.map(Number),
                });
              }}
              disabled={assignDiscountMutation.isPending}
              data-testid="button-assign-discount-confirm"
            >
              {assignDiscountMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payMethodDialog} onOpenChange={(o) => { if (!o) setPayMethodDialog(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-payment-method">
          <DialogHeader>
            <DialogTitle>Mark Membership Paid</DialogTitle>
          </DialogHeader>
          {payMethodDialog && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium" data-testid="text-pay-method-member">{payMethodDialog.fullName}</div>
                <div className="text-xs text-muted-foreground">{payMethodDialog.planName}</div>
                {payMethodDialog.price > 0 && (
                  <div className="text-xs mt-1">Amount: <span className="font-semibold">£{formatPounds(payMethodDialog.price)}</span></div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Payment method</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod("external")}
                    className={`text-left rounded-md border p-3 hover-elevate ${payMethod === "external" ? "border-primary ring-1 ring-primary" : ""}`}
                    data-testid="option-pay-external"
                  >
                    <div className="text-sm font-medium">External bank transfer</div>
                    <div className="text-xs text-muted-foreground">Marks paid only — no wallet change. Counts toward club income.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("wallet")}
                    disabled={payMethodDialog.price <= 0}
                    className={`text-left rounded-md border p-3 hover-elevate ${payMethod === "wallet" ? "border-primary ring-1 ring-primary" : ""} ${payMethodDialog.price <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid="option-pay-wallet"
                  >
                    <div className="text-sm font-medium">Member's wallet credit</div>
                    <div className="text-xs text-muted-foreground">
                      {payMethodDialog.price > 0
                        ? `Deducts £${formatPounds(payMethodDialog.price)} from member's wallet credit.`
                        : "Membership has no price; wallet payment unavailable."}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayMethodDialog(null)} data-testid="button-pay-method-cancel">Cancel</Button>
            <Button
              onClick={() => {
                if (!payMethodDialog) return;
                markPaidMutation.mutate({ id: payMethodDialog.id, paymentConfirmed: true, paymentMethod: payMethod });
              }}
              disabled={markPaidMutation.isPending || !payMethodDialog || (payMethod === "wallet" && payMethodDialog.price <= 0)}
              data-testid="button-pay-method-confirm"
            >
              {markPaidMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

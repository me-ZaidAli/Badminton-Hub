import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Calendar, CreditCard, ShoppingBag, Clock, AlertTriangle, X, User, Shield } from "lucide-react";

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryColor(days: number): string {
  if (days <= 0) return "text-muted-foreground";
  if (days < 30) return "text-red-500";
  if (days <= 60) return "text-amber-500";
  return "text-green-500";
}

function getExpiryBorderColor(days: number): string {
  if (days <= 0) return "border-muted-foreground/30";
  if (days < 30) return "border-red-500/30";
  if (days <= 60) return "border-amber-500/30";
  return "border-green-500/30";
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

interface Membership {
  id: number;
  userId: number;
  clubId: number;
  planId: number;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  paymentConfirmed: boolean;
  proratedPrice?: number;
  prorationFactor?: string;
  cancelledAt?: string;
  cancelReason?: string;
  planName?: string;
  planAnnualPrice?: number;
  planDefaultSessionFee?: number;
  clubName?: string;
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

interface MembershipRequest {
  id: number;
  userId: number;
  clubId: number;
  planId: number;
  status: string;
  prorationAmount: number | null;
  createdAt: string;
  planName?: string;
  clubName?: string;
}

interface MerchandiseItem {
  id: number;
  clubId: number;
  name: string;
  price: number;
  sizes: string[] | null;
  includedInMembership: boolean;
  description?: string;
}

interface MerchandiseOrder {
  id: number;
  merchandiseId: number;
  size: string | null;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  merchandiseName?: string;
}

interface PlayerProfile {
  id: number;
  clubId: number;
  clubName?: string;
}

export default function Memberships() {
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMembershipId, setCancelMembershipId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderItem, setOrderItem] = useState<MerchandiseItem | null>(null);
  const [orderSize, setOrderSize] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
  });

  const { data: playerProfilesData } = useQuery<any[]>({
    queryKey: ["/api/player-profiles"],
    enabled: !!user,
  });

  const playerProfiles: PlayerProfile[] = useMemo(() => {
    if (playerProfilesData && playerProfilesData.length > 0) {
      return playerProfilesData.map((p: any) => ({
        id: p.id,
        clubId: p.clubId,
        clubName: p.club?.name || `Club ${p.clubId}`,
      }));
    }
    const profiles = userData?.playerProfiles || [];
    return profiles.map((p: any) => ({
      id: p.id,
      clubId: p.clubId,
      clubName: p.club?.name || p.clubName || `Club ${p.clubId}`,
    }));
  }, [playerProfilesData, userData]);
  const clubIds = useMemo(() => {
    const ids = new Set<number>();
    playerProfiles.forEach((p: PlayerProfile) => ids.add(p.clubId));
    return Array.from(ids);
  }, [playerProfiles]);

  const { data: adminClubs } = useQuery<any[]>({
    queryKey: ["/api/my-admin-clubs"],
    enabled: !!user,
  });

  const allClubs = useMemo(() => {
    const clubMap = new Map<number, { id: number; name: string }>();
    playerProfiles.forEach((p: any) => {
      if (p.clubId) {
        clubMap.set(p.clubId, { id: p.clubId, name: p.clubName || `Club ${p.clubId}` });
      }
    });
    adminClubs?.forEach((c: any) => {
      if (!clubMap.has(c.id)) {
        clubMap.set(c.id, { id: c.id, name: c.name });
      }
    });
    return Array.from(clubMap.values());
  }, [playerProfiles, adminClubs]);

  const activeClubId = selectedClubId || (allClubs.length > 0 ? allClubs[0].id.toString() : "");
  const activeClubName = allClubs.find((c) => c.id.toString() === activeClubId)?.name || "";

  const { data: myMemberships = [], isLoading: membershipsLoading } = useQuery<Membership[]>({
    queryKey: ["/api/my-memberships"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const activeMembership = useMemo(() => {
    if (!activeClubId) return null;
    return myMemberships.find(
      (m) => m.clubId === parseInt(activeClubId) && (m.status === "ACTIVE" || m.status === "APPROVED" || m.status === "PENDING")
    ) || null;
  }, [myMemberships, activeClubId]);

  const { data: plans = [], isLoading: plansLoading } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/clubs", activeClubId, "membership-plans"],
    enabled: !!activeClubId,
  });

  const { data: myRequests = [], isLoading: requestsLoading } = useQuery<MembershipRequest[]>({
    queryKey: ["/api/my-membership-requests"],
    enabled: !!user,
  });

  const clubRequests = useMemo(() => {
    if (!activeClubId) return [];
    return myRequests.filter((r) => r.clubId === parseInt(activeClubId));
  }, [myRequests, activeClubId]);

  const pendingRequests = useMemo(() => {
    return clubRequests.filter((r) => r.status === "PENDING");
  }, [clubRequests]);

  const { data: merchandise = [], isLoading: merchLoading } = useQuery<MerchandiseItem[]>({
    queryKey: ["/api/clubs", activeClubId, "merchandise"],
    enabled: !!activeClubId,
  });

  const { data: myOrders = [], isLoading: ordersLoading } = useQuery<MerchandiseOrder[]>({
    queryKey: ["/api/my-merchandise-orders"],
    enabled: !!user,
  });

  const selectedPlan = plans.find((p) => p.id.toString() === selectedPlanId);

  const proratedEstimate = useMemo(() => {
    if (!selectedPlan) return null;
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const daysLeft = Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = selectedPlan.annualPrice / 365;
    return Math.round(dailyRate * daysLeft);
  }, [selectedPlan]);

  const requestMembershipMutation = useMutation({
    mutationFn: async (data: { clubId: number; planId: number }) => {
      await apiRequest("POST", "/api/membership-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-membership-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-memberships"] });
      setRequestDialogOpen(false);
      setSelectedPlanId("");
      toast({
        title: "Request Submitted",
        description: "Your membership request has been submitted. An admin will review it once payment is made.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit request.", variant: "destructive" });
    },
  });

  const cancelMembershipMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiRequest("PATCH", `/api/club-memberships/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-memberships"] });
      setCancelDialogOpen(false);
      setCancelMembershipId(null);
      setCancelReason("");
      toast({ title: "Membership Cancelled", description: "Your membership has been cancelled." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel membership.", variant: "destructive" });
    },
  });

  const orderMerchandiseMutation = useMutation({
    mutationFn: async (data: { merchandiseId: number; size: string; quantity: number; clubId: number }) => {
      await apiRequest("POST", "/api/merchandise-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchandise-orders"] });
      setOrderDialogOpen(false);
      setOrderItem(null);
      setOrderSize("");
      setOrderQuantity("1");
      toast({ title: "Order Placed", description: "Your merchandise order has been placed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to place order.", variant: "destructive" });
    },
  });

  const handleRequestMembership = () => {
    if (!selectedPlanId || !activeClubId) return;
    requestMembershipMutation.mutate({
      clubId: parseInt(activeClubId),
      planId: parseInt(selectedPlanId),
    });
  };

  const handleCancelMembership = () => {
    if (cancelMembershipId === null) return;
    cancelMembershipMutation.mutate({ id: cancelMembershipId, reason: cancelReason });
  };

  const handleOrderMerchandise = () => {
    if (!orderItem || !activeClubId) return;
    const qty = parseInt(orderQuantity);
    if (isNaN(qty) || qty < 1) return;
    orderMerchandiseMutation.mutate({
      merchandiseId: orderItem.id,
      size: orderSize || "",
      quantity: qty,
      clubId: parseInt(activeClubId),
    });
  };

  const openCancelDialog = (membershipId: number) => {
    setCancelMembershipId(membershipId);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const openOrderDialog = (item: MerchandiseItem) => {
    setOrderItem(item);
    setOrderSize(item.sizes && item.sizes.length > 0 ? item.sizes[0] : "");
    setOrderQuantity("1");
    setOrderDialogOpen(true);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loader-page" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
            <p className="text-muted-foreground mb-4">Please log in to manage your memberships.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profilesReady = !!playerProfilesData || !!userData;
  if (allClubs.length === 0 && !membershipsLoading && profilesReady) {
    return (
      <div className="container max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-no-clubs">No Clubs Found</h2>
            <p className="text-muted-foreground">You need to join a club before you can manage memberships.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = activeMembership?.endDate ? getDaysRemaining(activeMembership.endDate) : null;

  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-page-title">
          <CreditCard className="h-6 w-6 text-primary" />
          My Memberships
        </h1>
        <p className="text-muted-foreground mt-1">Manage your club memberships and merchandise</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Club</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={activeClubId}
            onValueChange={(val) => setSelectedClubId(val)}
          >
            <SelectTrigger data-testid="select-club">
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              {allClubs.map((club) => (
                <SelectItem key={club.id} value={club.id.toString()} data-testid={`select-club-option-${club.id}`}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {membershipsLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" data-testid="loader-memberships" />
        </div>
      ) : activeMembership ? (
        <>
          <Card className="overflow-visible relative" data-testid="card-member-card">
            <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-md ${
              activeMembership.status === "ACTIVE" ? "bg-green-500" :
              activeMembership.status === "PENDING" ? "bg-amber-500" :
              activeMembership.status === "EXPIRING" ? "bg-amber-500" : "bg-muted-foreground"
            }`} />
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={userData?.profilePictureUrl || ""} alt={userData?.fullName || userData?.username || ""} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {(userData?.fullName || userData?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-lg font-bold truncate" data-testid="text-member-name">
                        {userData?.fullName || userData?.username || "Member"}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-member-email">
                        {userData?.email || ""}
                      </p>
                    </div>
                    <div data-testid="badge-membership-status">
                      {getStatusBadge(activeMembership.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid="text-club-name">
                      {activeMembership.clubName || activeClubName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 dark:bg-muted/20 rounded-md p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Plan</p>
                    <p className="font-semibold text-sm" data-testid="text-plan-name">{activeMembership.planName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Member ID</p>
                    <p className="font-semibold text-sm font-mono" data-testid="text-member-id">#{String(activeMembership.id).padStart(5, "0")}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Valid From</p>
                  <p className="font-medium text-sm" data-testid="text-start-date">
                    {activeMembership.startDate ? format(new Date(activeMembership.startDate), "dd MMM yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Valid Until</p>
                  <p className="font-medium text-sm" data-testid="text-end-date">
                    {activeMembership.endDate ? format(new Date(activeMembership.endDate), "dd MMM yyyy") : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Annual Price</p>
                  <p className="font-medium text-sm" data-testid="text-annual-price">
                    {activeMembership.planAnnualPrice != null ? formatPounds(activeMembership.planAnnualPrice) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Amount Due</p>
                  <p className="font-medium text-sm" data-testid="text-prorated-price">
                    {activeMembership.proratedPrice != null ? formatPounds(activeMembership.proratedPrice) : "N/A"}
                  </p>
                </div>
              </div>

              <Separator className="mb-4" />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Payment</p>
                    <div data-testid="badge-payment-status">
                      {getPaymentBadge(activeMembership.paymentConfirmed ? "PAID" : "UNPAID")}
                    </div>
                  </div>
                  {daysRemaining !== null && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Expires In</p>
                      <p className={`font-bold text-sm ${getExpiryColor(daysRemaining)}`} data-testid="text-expiry-days">
                        {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openCancelDialog(activeMembership.id)}
                  data-testid="button-cancel-membership"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>

              {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && (
                <div className="flex items-center gap-1 mt-3 text-amber-500 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Expiring soon - contact your club admin to renew</span>
                </div>
              )}

              {activeMembership.status === "PENDING" && (
                <div className="flex items-center gap-1 mt-3 text-amber-500 text-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Awaiting payment confirmation from your club admin</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-6">
            <div className="text-center mb-4">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-1" data-testid="text-no-membership">No Active Membership</h3>
              <p className="text-muted-foreground text-sm">
                You don't have an active membership for {activeClubName || "this club"}.
              </p>
            </div>
            {pendingRequests.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center">You have a pending request below.</p>
            ) : plansLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-plans">No membership plans available for this club yet.</p>
            ) : (
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium text-muted-foreground">Available Plans</p>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-md border p-4 space-y-2 hover-elevate cursor-pointer"
                    onClick={() => { setSelectedPlanId(plan.id.toString()); setRequestDialogOpen(true); }}
                    data-testid={`plan-card-${plan.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</span>
                        {plan.isDefault && <Badge variant="secondary" className="text-xs no-default-hover-elevate">Default</Badge>}
                      </div>
                      <span className="font-bold text-sm text-primary" data-testid={`text-plan-price-${plan.id}`}>{formatPounds(plan.annualPrice)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span data-testid={`text-plan-fee-${plan.id}`}>Session fee: {formatPounds(plan.defaultSessionFee)}</span>
                      <span data-testid={`text-plan-duration-${plan.id}`}>Duration: {plan.defaultDurationDays || 365} days</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(clubRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Membership Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {clubRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 py-2 flex-wrap"
                    data-testid={`request-row-${req.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-request-plan-${req.id}`}>
                        {req.planName || `Plan #${req.planId}`}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-request-date-${req.id}`}>
                        Requested: {req.createdAt ? format(new Date(req.createdAt), "dd MMM yyyy") : "N/A"}
                      </p>
                      {req.prorationAmount != null && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-request-proration-${req.id}`}>
                          Prorated: {formatPounds(req.prorationAmount)}
                        </p>
                      )}
                    </div>
                    <div data-testid={`badge-request-status-${req.id}`}>
                      {getStatusBadge(req.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5" />
            Club Merchandise
          </CardTitle>
        </CardHeader>
        <CardContent>
          {merchLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" data-testid="loader-merchandise" />
            </div>
          ) : merchandise.length === 0 ? (
            <p className="text-muted-foreground text-center py-4" data-testid="text-no-merchandise">
              No merchandise available for this club.
            </p>
          ) : (
            <div className="space-y-3">
              {merchandise.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 flex-wrap"
                  data-testid={`merch-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid={`text-merch-name-${item.id}`}>{item.name}</p>
                      {item.includedInMembership && (
                        <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-merch-included-${item.id}`}>
                          Included in Membership
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-merch-price-${item.id}`}>
                      {formatPounds(item.price)}
                    </p>
                    {item.sizes && item.sizes.length > 0 && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-merch-sizes-${item.id}`}>
                        Sizes: {item.sizes.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openOrderDialog(item)}
                    data-testid={`button-order-merch-${item.id}`}
                  >
                    <ShoppingBag className="h-4 w-4 mr-1" />
                    Order
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {myOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-2 py-2 flex-wrap"
                    data-testid={`order-row-${order.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-order-name-${order.id}`}>
                        {order.merchandiseName || `Item #${order.merchandiseId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.size && `Size: ${order.size} · `}
                        Qty: {order.quantity} · {formatPounds(order.totalPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-order-date-${order.id}`}>
                        {order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy") : "N/A"}
                      </p>
                    </div>
                    <div data-testid={`badge-order-status-${order.id}`}>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Request Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Select a membership plan for {activeClubName}</p>
              {plansLoading ? (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans available for this club.</p>
              ) : (
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger data-testid="select-plan">
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()} data-testid={`select-plan-option-${plan.id}`}>
                        {plan.name} - {formatPounds(plan.annualPrice)}/year
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedPlan && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Annual Price</span>
                    <span className="font-medium" data-testid="text-plan-annual-price">{formatPounds(selectedPlan.annualPrice)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Default Session Fee</span>
                    <span className="font-medium" data-testid="text-plan-session-fee">{formatPounds(selectedPlan.defaultSessionFee)}</span>
                  </div>
                  {proratedEstimate !== null && (
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Prorated Estimate</span>
                      <span className="font-medium text-primary" data-testid="text-prorated-estimate">{formatPounds(proratedEstimate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialogOpen(false)}
              data-testid="button-cancel-request-dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestMembership}
              disabled={!selectedPlanId || requestMembershipMutation.isPending}
              data-testid="button-submit-request"
            >
              {requestMembershipMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Cancel Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel your membership? This action cannot be undone.
            </p>
            <div>
              <p className="text-sm font-medium mb-1">Reason (optional)</p>
              <Input
                placeholder="Why are you cancelling?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              data-testid="button-cancel-cancel-dialog"
            >
              Keep Membership
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelMembership}
              disabled={cancelMembershipMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              {cancelMembershipMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Order {orderItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {orderItem && (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-medium" data-testid="text-order-item-price">{formatPounds(orderItem.price)}</span>
                </div>
                {orderItem.sizes && orderItem.sizes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Size</p>
                    <Select value={orderSize} onValueChange={setOrderSize}>
                      <SelectTrigger data-testid="select-order-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {orderItem.sizes.map((size) => (
                          <SelectItem key={size} value={size} data-testid={`select-size-option-${size}`}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-1">Quantity</p>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    data-testid="input-order-quantity"
                  />
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold" data-testid="text-order-total">
                    {formatPounds(orderItem.price * (parseInt(orderQuantity) || 1))}
                  </span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderDialogOpen(false)}
              data-testid="button-cancel-order-dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={handleOrderMerchandise}
              disabled={orderMerchandiseMutation.isPending || !orderItem}
              data-testid="button-confirm-order"
            >
              {orderMerchandiseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

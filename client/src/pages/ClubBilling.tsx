import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Crown, Clock, AlertTriangle, Check, X, CreditCard, Building2 } from "lucide-react";

export default function ClubBilling() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  const { data: clubs, isLoading: clubsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-admin-clubs"],
    enabled: !!user,
  });

  const activeClubId = selectedClubId || clubs?.[0]?.id;

  const { data: planData, isLoading: planLoading } = useQuery<{
    planType: string;
    planStatus: string;
    premiumEndDate: string | null;
    premiumStartDate: string | null;
    sportTypes: string[];
  }>({
    queryKey: ["/api/clubs", activeClubId, "plan"],
    enabled: !!activeClubId,
  });

  const requestPremium = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/clubs/${activeClubId}/request-premium`);
    },
    onSuccess: () => {
      toast({ title: "Upgrade Requested", description: "Your premium upgrade request has been submitted. We'll activate it once payment is confirmed." });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", activeClubId, "plan"] });
    },
    onError: (error: Error) => {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    },
  });

  const activeClub = clubs?.find((c: any) => c.id === activeClubId);

  if (clubsLoading) {
    return (
      <div className="p-6 space-y-4" data-testid="billing-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="p-6" data-testid="billing-no-clubs">
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You don't manage any clubs yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const planStatus = planData?.planStatus || "FREE";

  const statusConfig: Record<string, { bg: string; icon: typeof Crown; title: string; description: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
    FREE: {
      bg: "bg-muted",
      icon: CreditCard,
      title: "Free Plan",
      description: "You're on the free plan. Includes session creation, attendance tracking, basic member management, and club settings.",
      badgeVariant: "secondary",
    },
    PENDING_ACTIVATION: {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      icon: Clock,
      title: "Upgrade Pending",
      description: "Your premium upgrade request is being processed. We'll activate your plan once payment is confirmed.",
      badgeVariant: "outline",
    },
    ACTIVE_PREMIUM: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      icon: Crown,
      title: "Premium Plan",
      description: "You're on the premium plan with access to all features.",
      badgeVariant: "default",
    },
    SUSPENDED: {
      bg: "bg-red-50 dark:bg-red-950/30",
      icon: AlertTriangle,
      title: "Plan Suspended",
      description: "Your plan has been suspended. Please contact the platform administrator to resolve this.",
      badgeVariant: "destructive",
    },
  };

  const config = statusConfig[planStatus] || statusConfig.FREE;
  const StatusIcon = config.icon;

  const freeFeatures = ["Session creation", "Attendance tracking", "Basic member list", "Club settings"];
  const premiumFeatures = [
    "Everything in Free",
    "Rankings",
    "Performance analytics",
    "Match generation",
    "Financial tracking",
    "Exports",
    "Junior management",
    "Coach dashboards",
    "League management",
    "Referrals",
    "Rewards",
    "Inventory",
    "Advanced reports",
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="billing-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold" data-testid="billing-title">Billing & Plan</h1>
        {clubs.length > 1 && (
          <Select
            value={String(activeClubId)}
            onValueChange={(val) => setSelectedClubId(Number(val))}
          >
            <SelectTrigger className="w-[200px]" data-testid="select-club-trigger">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={String(club.id)} data-testid={`select-club-${club.id}`}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {planLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card className={config.bg} data-testid="plan-status-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <StatusIcon className="h-8 w-8" />
              <div>
                <CardTitle className="text-xl" data-testid="plan-title">{config.title}</CardTitle>
                <CardDescription className="mt-1" data-testid="plan-description">{config.description}</CardDescription>
              </div>
            </div>
            <Badge variant={config.badgeVariant} data-testid="plan-badge">{planStatus.replace(/_/g, " ")}</Badge>
          </CardHeader>
          {planStatus === "ACTIVE_PREMIUM" && planData && (
            <CardContent data-testid="plan-dates">
              <div className="flex flex-wrap gap-4 text-sm">
                {planData.premiumStartDate && (
                  <span data-testid="plan-start-date">
                    Started: {new Date(planData.premiumStartDate).toLocaleDateString()}
                  </span>
                )}
                {planData.premiumEndDate && (
                  <span data-testid="plan-end-date">
                    Expires: {new Date(planData.premiumEndDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {(planStatus === "FREE" || planStatus === "SUSPENDED") && (
        <div className="flex justify-center">
          <Button
            onClick={() => requestPremium.mutate()}
            disabled={requestPremium.isPending}
            data-testid="button-request-premium"
          >
            <Crown className="mr-2 h-4 w-4" />
            {requestPremium.isPending ? "Requesting..." : "Request Premium Upgrade"}
          </Button>
        </div>
      )}

      {(planStatus === "PENDING_ACTIVATION" || planStatus === "ACTIVE_PREMIUM") && (
        <Card data-testid="bank-transfer-card">
          <CardHeader>
            <CardTitle className="text-lg">Payment Instructions</CardTitle>
            <CardDescription>Transfer your subscription fee via bank transfer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium" data-testid="transfer-amount">Transfer £10.00 to:</p>
            <div className="rounded-md bg-muted p-4 space-y-1 text-sm" data-testid="bank-details">
              <p>Please contact the platform administrator for bank transfer details.</p>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="transfer-reference">
              Reference: <span className="font-medium">{activeClub?.name || `Club #${activeClubId}`}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card data-testid="feature-comparison-card">
        <CardHeader>
          <CardTitle className="text-lg">Feature Comparison</CardTitle>
          <CardDescription>See what's included in each plan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="feature-comparison-table">
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">Premium (£10/month)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freeFeatures.map((feature) => (
                <TableRow key={feature} data-testid={`feature-row-${feature.toLowerCase().replace(/\s+/g, "-")}`}>
                  <TableCell>{feature}</TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-green-600" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-green-600" /></TableCell>
                </TableRow>
              ))}
              {premiumFeatures.filter(f => f !== "Everything in Free").map((feature) => (
                <TableRow key={feature} data-testid={`feature-row-${feature.toLowerCase().replace(/\s+/g, "-")}`}>
                  <TableCell>{feature}</TableCell>
                  <TableCell className="text-center"><X className="h-4 w-4 mx-auto text-muted-foreground" /></TableCell>
                  <TableCell className="text-center"><Check className="h-4 w-4 mx-auto text-green-600" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
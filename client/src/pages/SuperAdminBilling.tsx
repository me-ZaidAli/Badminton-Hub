import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, CreditCard, Save } from "lucide-react";
import { format } from "date-fns";

interface BillingClub {
  id: number;
  name: string;
  slug: string;
  status: string;
  planType: string;
  planStatus: string;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  premiumPaymentReference: string | null;
  sportTypes: string[] | null;
  createdAt: string;
}

function getPlanStatusBadge(planStatus: string) {
  switch (planStatus) {
    case "FREE":
      return <Badge variant="secondary" data-testid="badge-plan-free">Free</Badge>;
    case "PENDING_ACTIVATION":
      return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" data-testid="badge-plan-pending">Pending Activation</Badge>;
    case "ACTIVE_PREMIUM":
      return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30" data-testid="badge-plan-active">Active Premium</Badge>;
    case "SUSPENDED":
      return <Badge variant="destructive" data-testid="badge-plan-suspended">Suspended</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-plan-unknown">{planStatus}</Badge>;
  }
}

export default function SuperAdminBilling() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRefs, setEditingRefs] = useState<Record<number, string>>({});

  const { data: clubs, isLoading } = useQuery<BillingClub[]>({
    queryKey: ["/api/super-admin/clubs/billing"],
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({
      clubId,
      data,
    }: {
      clubId: number;
      data: Record<string, unknown>;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/super-admin/clubs/${clubId}/plan`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/super-admin/clubs/billing"],
      });
      toast({ title: "Plan updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredClubs = (clubs || []).filter((club) =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleActivatePremium = (clubId: number) => {
    const now = new Date().toISOString();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    updatePlanMutation.mutate({
      clubId,
      data: {
        planStatus: "ACTIVE_PREMIUM",
        premiumStartDate: now,
        premiumEndDate: oneYearFromNow.toISOString(),
      },
    });
  };

  const handleSuspend = (clubId: number) => {
    updatePlanMutation.mutate({
      clubId,
      data: { planStatus: "SUSPENDED" },
    });
  };

  const handleRevertToFree = (clubId: number) => {
    updatePlanMutation.mutate({
      clubId,
      data: { planStatus: "FREE" },
    });
  };

  const handleSavePaymentRef = (clubId: number) => {
    const ref = editingRefs[clubId];
    if (ref === undefined) return;
    updatePlanMutation.mutate({
      clubId,
      data: { premiumPaymentReference: ref },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <CreditCard className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Club Billing Management
        </h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clubs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-clubs"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Payment Ref</TableHead>
                <TableHead>Sports</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No clubs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClubs.map((club) => (
                  <TableRow key={club.id} data-testid={`row-club-${club.id}`}>
                    <TableCell className="font-medium" data-testid={`text-club-name-${club.id}`}>
                      {club.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-status-${club.id}`}>
                        {club.status}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`badge-plan-status-${club.id}`}>
                      {getPlanStatusBadge(club.planStatus || "FREE")}
                    </TableCell>
                    <TableCell data-testid={`text-start-date-${club.id}`}>
                      {club.premiumStartDate
                        ? format(new Date(club.premiumStartDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-end-date-${club.id}`}>
                      {club.premiumEndDate
                        ? format(new Date(club.premiumEndDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          value={
                            editingRefs[club.id] !== undefined
                              ? editingRefs[club.id]
                              : club.premiumPaymentReference || ""
                          }
                          onChange={(e) =>
                            setEditingRefs((prev) => ({
                              ...prev,
                              [club.id]: e.target.value,
                            }))
                          }
                          placeholder="Payment ref"
                          className="w-32"
                          data-testid={`input-payment-ref-${club.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSavePaymentRef(club.id)}
                          disabled={
                            editingRefs[club.id] === undefined ||
                            updatePlanMutation.isPending
                          }
                          data-testid={`button-save-ref-${club.id}`}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(club.sportTypes || []).map((sport) => (
                          <Badge
                            key={sport}
                            variant="outline"
                            className="text-xs"
                            data-testid={`badge-sport-${club.id}-${sport}`}
                          >
                            {sport}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleActivatePremium(club.id)}
                          disabled={
                            club.planStatus === "ACTIVE_PREMIUM" ||
                            updatePlanMutation.isPending
                          }
                          data-testid={`button-activate-${club.id}`}
                        >
                          {updatePlanMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : null}
                          Activate Premium
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSuspend(club.id)}
                          disabled={
                            club.planStatus === "SUSPENDED" ||
                            updatePlanMutation.isPending
                          }
                          data-testid={`button-suspend-${club.id}`}
                        >
                          Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevertToFree(club.id)}
                          disabled={
                            club.planStatus === "FREE" ||
                            updatePlanMutation.isPending
                          }
                          data-testid={`button-revert-free-${club.id}`}
                        >
                          Revert to Free
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
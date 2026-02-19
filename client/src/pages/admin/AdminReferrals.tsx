import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import {
  Gift, Check, X, Clock, UserPlus, TrendingUp,
  Loader2, ChevronRight, AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AdminReferral {
  id: number;
  code: string;
  referrerId: number;
  referrerName: string;
  referrerEmail: string;
  referredName: string | null;
  referredEmail: string | null;
  referredUserId: number | null;
  referredUserName: string | null;
  clubId: number | null;
  clubName: string | null;
  status: string;
  creditAwarded: number | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  rejectedReason: string | null;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", className: "bg-green-500 text-white no-default-hover-elevate" };
    case "PENDING":
      return { label: "Pending", className: "bg-amber-500 text-white no-default-hover-elevate" };
    case "APPROVED":
      return { label: "Approved", className: "bg-blue-500 text-white no-default-hover-elevate" };
    case "REJECTED":
      return { label: "Rejected", className: "bg-red-500 text-white no-default-hover-elevate" };
    case "EXPIRED":
      return { label: "Expired", className: "no-default-hover-elevate" };
    case "USED":
      return { label: "Used", className: "no-default-hover-elevate" };
    default:
      return { label: status, className: "no-default-hover-elevate" };
  }
}

export default function AdminReferrals() {
  const { data: user } = useUser();
  const { data: myAdminClubs = [] } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [rejectDialog, setRejectDialog] = useState<AdminReferral | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: referrals = [], isLoading } = useQuery<AdminReferral[]>({
    queryKey: ["/api/admin/referrals", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const res = await fetch(`/api/admin/referrals?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      toast({ title: "Referral Approved", description: "The referrer has been awarded credit." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve referral.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Referral Rejected", description: "The referral has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject referral.", variant: "destructive" });
    },
  });

  const pendingCount = referrals.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Referrals"
        description="Review, approve, or reject referral submissions"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-referral-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter === "PENDING" && pendingCount > 0 && (
          <Badge className="bg-amber-500 text-white no-default-hover-elevate">{pendingCount} pending</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No referrals found</p>
            <p className="text-sm mt-1">No referrals matching the selected filter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {referrals.map((ref) => {
            const statusConfig = getStatusConfig(ref.status);
            return (
              <Card key={ref.id} data-testid={`admin-referral-${ref.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono font-bold text-sm">{ref.code}</code>
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        {ref.creditAwarded && ref.creditAwarded > 0 && (
                          <Badge variant="secondary" className="no-default-hover-elevate">+{"\u00A3"}{(ref.creditAwarded / 100).toFixed(2)}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Referrer:</span>
                          <span className="font-medium truncate">{ref.referrerName}</span>
                        </div>
                        {ref.referredName || ref.referredUserName ? (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Referred:</span>
                            <span className="font-medium truncate">{ref.referredUserName || ref.referredName}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-xs">Not yet used</div>
                        )}
                      </div>
                      {ref.clubName && (
                        <p className="text-xs text-muted-foreground">Club: {ref.clubName}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Created {format(new Date(ref.createdAt), "dd MMM yyyy")}</span>
                        {ref.usedAt && (
                          <span>Used {formatDistanceToNow(new Date(ref.usedAt), { addSuffix: true })}</span>
                        )}
                      </div>
                      {ref.rejectedReason && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Reason: {ref.rejectedReason}
                        </div>
                      )}
                    </div>
                    {ref.status === "PENDING" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(ref.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-referral-${ref.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectDialog(ref);
                            setRejectReason("");
                          }}
                          data-testid={`button-reject-referral-${ref.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Referral</DialogTitle>
            <DialogDescription>
              Rejecting referral code <code className="font-mono">{rejectDialog?.code}</code> from {rejectDialog?.referrerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-reject-cancel">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDialog) {
                  rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-confirm"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
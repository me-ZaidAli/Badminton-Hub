import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gift, Trophy, CreditCard, Ticket, Search, Loader2, ArrowLeft, CheckCircle, Clock, Star, Users, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface RewardEntry {
  id: number;
  playerId: number;
  clubId: number;
  rewardType: string;
  sourceId: number | null;
  sourceMilestone: number | null;
  description: string;
  credits: number;
  gifts: string | null;
  freeSessions: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  clubName: string;
  playerName: string;
  playerEmail: string;
}

interface DashboardData {
  rewards: RewardEntry[];
  summary: {
    total: number;
    available: number;
    used: number;
    requested: number;
    totalCreditsIssued: number;
    totalFreeSessionsIssued: number;
  };
}

export default function RewardsDashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailReward, setDetailReward] = useState<RewardEntry | null>(null);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/admin/rewards-dashboard"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/admin/rewards/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards-dashboard"] });
      toast({ title: "Status Updated", description: "Reward status has been updated." });
      setDetailReward(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status.", variant: "destructive" });
    },
  });

  const rewards = data?.rewards || [];
  const summary = data?.summary || { total: 0, available: 0, used: 0, requested: 0, totalCreditsIssued: 0, totalFreeSessionsIssued: 0 };

  const filtered = rewards.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.rewardType !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (r.playerName || "").toLowerCase().includes(term) ||
        (r.playerEmail || "").toLowerCase().includes(term) ||
        (r.clubName || "").toLowerCase().includes(term) ||
        (r.description || "").toLowerCase().includes(term);
    }
    return true;
  });

  const rewardTypes = [...new Set(rewards.map(r => r.rewardType))];

  function formatGBP(pence: number) {
    return `\u00A3${(pence / 100).toFixed(2)}`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "AVAILABLE": return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-status-available">Available</Badge>;
      case "USED": return <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-status-used">Used</Badge>;
      case "REQUESTED": return <Badge className="bg-amber-500 text-white no-default-hover-elevate" data-testid="badge-status-requested">Requested</Badge>;
      default: return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    }
  }

  function getTypeBadge(type: string) {
    const colors: Record<string, string> = {
      REFERRAL: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300/30",
      SESSION_ATTENDANCE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300/30",
      ANNIVERSARY: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300/30",
      POINTS: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-300/30",
      GRADE: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300/30",
      GIFT: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-300/30",
      MANUAL: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300/30",
    };
    return <Badge variant="outline" className={`no-default-hover-elevate ${colors[type] || ""}`}>{type.replace(/_/g, " ")}</Badge>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="loading-rewards-dashboard">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="rewards-dashboard">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold" data-testid="text-rewards-dashboard-title">Rewards Dashboard</h1>
          <p className="text-sm text-muted-foreground">View and manage all rewards claimed by players</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50" data-testid="card-total-rewards">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rewards</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-total-rewards">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="card-available-rewards">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="value-available-rewards">{summary.available}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="card-used-rewards">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Used</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-used-rewards">{summary.used}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="card-requested-rewards">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Requested</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="value-requested-rewards">{summary.requested}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50" data-testid="card-total-credits">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits Issued</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-total-credits">{formatGBP(summary.totalCreditsIssued)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            All Claimed Rewards
          </CardTitle>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search player, club, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-rewards"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="USED">Used</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {rewardTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No rewards found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((reward) => {
                    const valueParts: string[] = [];
                    if (reward.credits > 0) valueParts.push(formatGBP(reward.credits));
                    if (reward.freeSessions > 0) valueParts.push(`${reward.freeSessions} session${reward.freeSessions > 1 ? "s" : ""}`);
                    if (reward.gifts) valueParts.push(reward.gifts);
                    return (
                      <TableRow
                        key={reward.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setDetailReward(reward)}
                        data-testid={`row-reward-${reward.id}`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{reward.playerName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{reward.playerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{reward.clubName || "N/A"}</TableCell>
                        <TableCell>{getTypeBadge(reward.rewardType)}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{reward.description}</TableCell>
                        <TableCell className="text-sm font-medium">{valueParts.join(" + ") || "-"}</TableCell>
                        <TableCell>{getStatusBadge(reward.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(reward.createdAt), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">Showing {filtered.length} of {rewards.length} rewards</p>
        </CardContent>
      </Card>

      <Dialog open={detailReward !== null} onOpenChange={(open) => !open && setDetailReward(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reward Details</DialogTitle>
          </DialogHeader>
          {detailReward && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Player</p>
                  <p className="font-medium">{detailReward.playerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Club</p>
                  <p className="font-medium">{detailReward.clubName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  {getTypeBadge(detailReward.rewardType)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  {getStatusBadge(detailReward.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="font-medium">{detailReward.description}</p>
                </div>
                {detailReward.credits > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Credits</p>
                    <p className="font-medium text-emerald-600">{formatGBP(detailReward.credits)}</p>
                  </div>
                )}
                {detailReward.freeSessions > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs">Free Sessions</p>
                    <p className="font-medium">{detailReward.freeSessions}</p>
                  </div>
                )}
                {detailReward.gifts && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Gifts</p>
                    <p className="font-medium">{detailReward.gifts}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p>{format(new Date(detailReward.createdAt), "dd MMM yyyy HH:mm")}</p>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Update Status</p>
                <div className="flex gap-2">
                  {detailReward.status !== "AVAILABLE" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailReward.id, status: "AVAILABLE" })} disabled={updateStatusMutation.isPending} data-testid="button-mark-available">
                      Available
                    </Button>
                  )}
                  {detailReward.status !== "USED" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailReward.id, status: "USED" })} disabled={updateStatusMutation.isPending} data-testid="button-mark-used">
                      Mark Used
                    </Button>
                  )}
                  {detailReward.status !== "REQUESTED" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailReward.id, status: "REQUESTED" })} disabled={updateStatusMutation.isPending} data-testid="button-mark-requested">
                      Requested
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailReward(null)} data-testid="button-close-reward-detail">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

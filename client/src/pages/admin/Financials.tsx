import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format, isToday, startOfDay } from "date-fns";
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Users,
  Calendar,
  Clock,
  History,
} from "lucide-react";

interface FinancialEntry {
  signupId: number;
  sessionId: number;
  playerId: number;
  fee: number;
  paymentStatus: "PAID" | "UNPAID";
  signupTime: string;
  sessionTitle: string;
  sessionDate: string;
  clubId: number;
  clubName: string;
  playerName: string;
  playerEmail: string;
}

export default function Financials() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"session" | "player">("session");
  const [timeTab, setTimeTab] = useState<"upcoming" | "past">("upcoming");
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [editingFee, setEditingFee] = useState<number | null>(null);
  const [feeInputValue, setFeeInputValue] = useState("");

  const { data: financialData = [], isLoading: isLoadingFinancial } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/admin/financial-summary"],
  });

  const { isLoading: isLoadingSignups } = useQuery({
    queryKey: ["/api/admin/signups"],
  });

  const isLoading = isLoadingFinancial || isLoadingSignups;

  const updatePayment = useMutation({
    mutationFn: async ({ sessionId, signupId, status }: { sessionId: number; signupId: number; status: "PAID" | "UNPAID" }) => {
      await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${signupId}/payment`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signups"] });
    },
  });

  const updateFee = useMutation({
    mutationFn: async ({ signupId, fee }: { signupId: number; fee: number }) => {
      await apiRequest("PATCH", `/api/admin/signups/${signupId}/fee`, { fee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signups"] });
      toast({ title: "Fee Updated", description: "The fee has been updated successfully." });
      setEditingFee(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update fee.", variant: "destructive" });
    },
  });

  const handleTogglePayment = (entry: FinancialEntry) => {
    const newStatus = entry.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    updatePayment.mutate(
      { sessionId: entry.sessionId, signupId: entry.signupId, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "PAID" ? "Marked as Paid" : "Marked as Unpaid",
            description: `Payment status updated for ${entry.playerName}.`,
          });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive" });
        },
      }
    );
  };

  const handleStartEditFee = (entry: FinancialEntry) => {
    setEditingFee(entry.signupId);
    setFeeInputValue((entry.fee / 100).toFixed(2));
  };

  const handleSaveFee = (signupId: number) => {
    const pence = Math.round(parseFloat(feeInputValue) * 100);
    if (isNaN(pence) || pence < 0) {
      toast({ title: "Invalid Fee", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    updateFee.mutate({ signupId, fee: pence });
  };

  const handleCancelEditFee = () => {
    setEditingFee(null);
    setFeeInputValue("");
  };

  const baseFilteredData = financialData.filter((entry) => {
    if (selectedClubId !== "all" && entry.clubId !== Number(selectedClubId)) return false;
    if (paymentFilter !== "all" && entry.paymentStatus !== paymentFilter.toUpperCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!entry.playerName.toLowerCase().includes(q) && !entry.sessionTitle.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredData = useMemo(() => {
    const today = startOfDay(new Date());
    return baseFilteredData.filter((entry) => {
      if (!entry.sessionDate) return timeTab === "upcoming";
      const sessionDate = startOfDay(new Date(entry.sessionDate));
      if (timeTab === "upcoming") {
        return sessionDate >= today;
      } else {
        return sessionDate < today;
      }
    });
  }, [baseFilteredData, timeTab]);

  const upcomingCount = useMemo(() => {
    const today = startOfDay(new Date());
    return baseFilteredData.filter((e) => {
      if (!e.sessionDate) return true;
      return startOfDay(new Date(e.sessionDate)) >= today;
    }).length;
  }, [baseFilteredData]);

  const pastCount = useMemo(() => {
    const today = startOfDay(new Date());
    return baseFilteredData.filter((e) => {
      if (!e.sessionDate) return false;
      return startOfDay(new Date(e.sessionDate)) < today;
    }).length;
  }, [baseFilteredData]);

  const uniqueClubs = Array.from(
    new Map(financialData.map((e) => [e.clubId, { id: e.clubId, name: e.clubName }])).values()
  );

  const totalRevenue = filteredData.reduce((sum, e) => sum + (e.fee || 0), 0);
  const paidTotal = filteredData.filter((e) => e.paymentStatus === "PAID").reduce((sum, e) => sum + (e.fee || 0), 0);
  const unpaidTotal = filteredData.filter((e) => e.paymentStatus === "UNPAID").reduce((sum, e) => sum + (e.fee || 0), 0);
  const collectionRate = totalRevenue > 0 ? ((paidTotal / totalRevenue) * 100).toFixed(1) : "0.0";

  const toggleSessionExpand = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const togglePlayerExpand = (email: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const sessionGroups = useMemo(() => {
    const groups = filteredData.reduce<Record<number, FinancialEntry[]>>((acc, entry) => {
      if (!acc[entry.sessionId]) acc[entry.sessionId] = [];
      acc[entry.sessionId].push(entry);
      return acc;
    }, {});

    const sortedEntries = Object.entries(groups).sort(([, aEntries], [, bEntries]) => {
      const aDate = aEntries[0]?.sessionDate ? new Date(aEntries[0].sessionDate) : new Date(0);
      const bDate = bEntries[0]?.sessionDate ? new Date(bEntries[0].sessionDate) : new Date(0);
      const aIsToday = isToday(aDate);
      const bIsToday = isToday(bDate);

      if (timeTab === "upcoming") {
        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        return aDate.getTime() - bDate.getTime();
      } else {
        return bDate.getTime() - aDate.getTime();
      }
    });

    return Object.fromEntries(sortedEntries);
  }, [filteredData, timeTab]);

  const playerGroups = filteredData.reduce<Record<string, FinancialEntry[]>>((acc, entry) => {
    if (!acc[entry.playerEmail]) acc[entry.playerEmail] = [];
    acc[entry.playerEmail].push(entry);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <DollarSign className="h-6 w-6 text-green-500" />
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground">Track revenue, payments and outstanding fees.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              £{(totalRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filteredData.length} signups</p>
          </CardContent>
        </Card>

        <Card data-testid="card-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-collected">
              £{(paidTotal / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.filter((e) => e.paymentStatus === "PAID").length} paid
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-outstanding">
              £{(unpaidTotal / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.filter((e) => e.paymentStatus === "UNPAID").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-collection-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-collection-rate">
              {collectionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paid vs total</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2" data-testid="time-tab-buttons">
        <Button
          variant={timeTab === "upcoming" ? "default" : "outline"}
          onClick={() => setTimeTab("upcoming")}
          data-testid="button-tab-upcoming"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Upcoming
          {upcomingCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 no-default-hover-elevate no-default-active-elevate">
              {upcomingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={timeTab === "past" ? "default" : "outline"}
          onClick={() => setTimeTab("past")}
          data-testid="button-tab-past"
        >
          <History className="h-4 w-4 mr-1" />
          Past
          {pastCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 no-default-hover-elevate no-default-active-elevate">
              {pastCount}
            </Badge>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search player or session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="w-[180px]" data-testid="select-club-filter">
                  <SelectValue placeholder="All Clubs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {uniqueClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-payment-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "session" ? "default" : "outline"}
                onClick={() => setViewMode("session")}
                data-testid="button-view-session"
              >
                <Calendar className="h-4 w-4 mr-1" />
                By Session
              </Button>
              <Button
                variant={viewMode === "player" ? "default" : "outline"}
                onClick={() => setViewMode("player")}
                data-testid="button-view-player"
              >
                <Users className="h-4 w-4 mr-1" />
                By Player
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "session" ? (
        <div className="space-y-3">
          {Object.keys(sessionGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {timeTab === "upcoming" ? "No upcoming sessions with financial data." : "No past sessions with financial data."}
              </CardContent>
            </Card>
          ) : (
            Object.entries(sessionGroups).map(([sessionIdStr, entries]) => {
              const sessionId = Number(sessionIdStr);
              const first = entries[0];
              const sessionPaid = entries.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
              const sessionUnpaid = entries.filter((e) => e.paymentStatus === "UNPAID").reduce((s, e) => s + (e.fee || 0), 0);
              const sessionTotal = sessionPaid + sessionUnpaid;
              const isExpanded = expandedSessions.has(sessionId);
              const sessionIsToday = first.sessionDate ? isToday(new Date(first.sessionDate)) : false;

              return (
                <Card key={sessionId} data-testid={`card-session-${sessionId}`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSessionExpand(sessionId)}
                    data-testid={`button-expand-session-${sessionId}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base" data-testid={`text-session-title-${sessionId}`}>
                              {first.sessionTitle}
                            </CardTitle>
                            {sessionIsToday && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-today-${sessionId}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Today
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {first.sessionDate
                              ? format(new Date(first.sessionDate), "MMM d, yyyy")
                              : "N/A"}{" "}
                            &middot; {first.clubName} &middot; {entries.length} players
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`text-session-total-${sessionId}`}>
                          Total: £{(sessionTotal / 100).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                          Paid: £{(sessionPaid / 100).toFixed(2)}
                        </Badge>
                        {sessionUnpaid > 0 && (
                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                            Unpaid: £{(sessionUnpaid / 100).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Player</TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => (
                              <TableRow key={entry.signupId} data-testid={`row-signup-${entry.signupId}`}>
                                <TableCell className="font-medium" data-testid={`text-player-name-${entry.signupId}`}>
                                  {entry.playerName}
                                </TableCell>
                                <TableCell>
                                  {editingFee === entry.signupId ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm">£</span>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={feeInputValue}
                                        onChange={(e) => setFeeInputValue(e.target.value)}
                                        className="w-24"
                                        data-testid={`input-fee-${entry.signupId}`}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSaveFee(entry.signupId);
                                          if (e.key === "Escape") handleCancelEditFee();
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveFee(entry.signupId)}
                                        disabled={updateFee.isPending}
                                        data-testid={`button-save-fee-${entry.signupId}`}
                                      >
                                        {updateFee.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditFee}
                                        data-testid={`button-cancel-fee-${entry.signupId}`}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium" data-testid={`text-fee-${entry.signupId}`}>
                                        £{((entry.fee || 0) / 100).toFixed(2)}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleStartEditFee(entry)}
                                        data-testid={`button-edit-fee-${entry.signupId}`}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {entry.paymentStatus === "PAID" ? (
                                    <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${entry.signupId}`}>
                                      PAID
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${entry.signupId}`}>
                                      UNPAID
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant={entry.paymentStatus === "PAID" ? "outline" : "default"}
                                    onClick={() => handleTogglePayment(entry)}
                                    disabled={updatePayment.isPending}
                                    data-testid={`button-toggle-payment-${entry.signupId}`}
                                  >
                                    {updatePayment.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : entry.paymentStatus === "PAID" ? (
                                      "Mark Unpaid"
                                    ) : (
                                      "Mark Paid"
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.keys(playerGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {timeTab === "upcoming" ? "No upcoming sessions with financial data." : "No past sessions with financial data."}
              </CardContent>
            </Card>
          ) : (
            Object.entries(playerGroups).map(([email, entries]) => {
              const first = entries[0];
              const playerTotalSpent = entries.reduce((s, e) => s + (e.fee || 0), 0);
              const playerTotalPaid = entries.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
              const playerTotalUnpaid = entries.filter((e) => e.paymentStatus === "UNPAID").reduce((s, e) => s + (e.fee || 0), 0);
              const isExpanded = expandedPlayers.has(email);

              return (
                <Card key={email} data-testid={`card-player-${email}`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => togglePlayerExpand(email)}
                    data-testid={`button-expand-player-${email}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base" data-testid={`text-player-heading-${email}`}>
                            {first.playerName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5" data-testid={`text-player-email-${email}`}>
                            {email} &middot; {entries.length} sessions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`text-player-total-${email}`}>
                          Total: £{(playerTotalSpent / 100).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                          Paid: £{(playerTotalPaid / 100).toFixed(2)}
                        </Badge>
                        {playerTotalUnpaid > 0 && (
                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                            Unpaid: £{(playerTotalUnpaid / 100).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Session</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Club</TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => (
                              <TableRow key={entry.signupId} data-testid={`row-player-signup-${entry.signupId}`}>
                                <TableCell className="font-medium" data-testid={`text-session-name-${entry.signupId}`}>
                                  {entry.sessionTitle}
                                </TableCell>
                                <TableCell>
                                  {entry.sessionDate
                                    ? format(new Date(entry.sessionDate), "MMM d, yyyy")
                                    : "N/A"}
                                </TableCell>
                                <TableCell>{entry.clubName}</TableCell>
                                <TableCell>
                                  <span className="font-medium" data-testid={`text-player-fee-${entry.signupId}`}>
                                    £{((entry.fee || 0) / 100).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {entry.paymentStatus === "PAID" ? (
                                    <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-player-status-${entry.signupId}`}>
                                      PAID
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-player-status-${entry.signupId}`}>
                                      UNPAID
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant={entry.paymentStatus === "PAID" ? "outline" : "default"}
                                    onClick={() => handleTogglePayment(entry)}
                                    disabled={updatePayment.isPending}
                                    data-testid={`button-player-toggle-payment-${entry.signupId}`}
                                  >
                                    {updatePayment.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : entry.paymentStatus === "PAID" ? (
                                      "Mark Unpaid"
                                    ) : (
                                      "Mark Paid"
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

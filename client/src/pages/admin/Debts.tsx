import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  PoundSterling, Search, Download, Plus, Pencil, Trash2, RotateCcw, Send,
  AlertCircle, CheckCircle, Clock, TrendingDown, Users, Receipt, Loader2,
} from "lucide-react";
import { format } from "date-fns";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const dateStr = (d: any) => d ? format(new Date(d), "dd MMM yyyy") : "—";

type PlayerRow = {
  userId: number; clubId: number; playerName: string; playerEmail: string; clubName: string;
  totalCharges: number; totalPayments: number; totalOwed: number; overdueAmount: number;
  lastPaymentDate: string | null; lastChargeDate: string | null;
  status: "PAID" | "PARTIAL" | "OVERDUE";
};

type Summary = {
  totalOutstanding: number; totalCollectedThisMonth: number; totalOverdue: number;
  playersWithDebt: number; averageDebt: number;
};

export default function DebtsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === "OWNER";

  const [tab, setTab] = useState("overview");
  const [clubFilter, setClubFilter] = useState<string>("all");
  const [overdueDays, setOverdueDays] = useState("14");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "owed" | "overdue" | "lastPayment">("owed");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drillTarget, setDrillTarget] = useState<{ userId: number; clubId: number; playerName: string } | null>(null);

  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState<{ userId: number; clubId: number; playerName: string; outstanding: number } | null>(null);
  const [bulkChargeOpen, setBulkChargeOpen] = useState(false);
  const [confirmSettleOpen, setConfirmSettleOpen] = useState<{ userId: number; clubId: number; playerName: string; outstanding: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "charge" | "payment"; id: number } | null>(null);

  const clubsQ = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/debts/clubs"] });
  const summaryQ = useQuery<Summary>({
    queryKey: ["/api/debts/summary", clubFilter, overdueDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubFilter !== "all") params.set("clubId", clubFilter);
      params.set("overdueDays", overdueDays);
      const r = await fetch(`/api/debts/summary?${params}`, { credentials: "include" });
      return r.json();
    },
  });
  const playersQ = useQuery<PlayerRow[]>({
    queryKey: ["/api/debts/players", clubFilter, overdueDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubFilter !== "all") params.set("clubId", clubFilter);
      params.set("overdueDays", overdueDays);
      const r = await fetch(`/api/debts/players?${params}`, { credentials: "include" });
      return r.json();
    },
  });
  const txQ = useQuery<any[]>({
    queryKey: ["/api/debts/transactions", clubFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubFilter !== "all") params.set("clubId", clubFilter);
      const r = await fetch(`/api/debts/transactions?${params}`, { credentials: "include" });
      return r.json();
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/debts/") });
  };

  const filteredPlayers = useMemo(() => {
    let rows = playersQ.data || [];
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(r => r.playerName.toLowerCase().includes(s) || r.playerEmail.toLowerCase().includes(s) || r.clubName.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") rows = rows.filter(r => r.status === statusFilter);
    rows = [...rows].sort((a, b) => {
      let va: any, vb: any;
      switch (sortBy) {
        case "name": va = a.playerName; vb = b.playerName; break;
        case "owed": va = a.totalOwed; vb = b.totalOwed; break;
        case "overdue": va = a.overdueAmount; vb = b.overdueAmount; break;
        case "lastPayment": va = a.lastPaymentDate || ""; vb = b.lastPaymentDate || ""; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [playersQ.data, search, statusFilter, sortBy, sortDir]);

  const pageRows = filteredPlayers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));

  const toggleSel = (k: string) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const toggleAllOnPage = () => {
    const allSelected = pageRows.every(r => selected.has(`${r.userId}-${r.clubId}`));
    const next = new Set(selected);
    pageRows.forEach(r => {
      const k = `${r.userId}-${r.clubId}`;
      if (allSelected) next.delete(k); else next.add(k);
    });
    setSelected(next);
  };

  // ---- Mutations ----
  const addChargeMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/debts/charges", data),
    onSuccess: () => { toast({ title: "Charge added" }); setAddChargeOpen(false); invalidateAll(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const addPaymentMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/debts/payments", data),
    onSuccess: () => { toast({ title: "Payment recorded" }); setAddPaymentOpen(null); invalidateAll(); if (drillTarget) refetchDrill(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const settleMut = useMutation({
    mutationFn: (t: { userId: number; clubId: number; method: string }) => apiRequest("POST", `/api/debts/players/${t.userId}/${t.clubId}/settle`, { method: t.method }),
    onSuccess: () => { toast({ title: "Marked as paid" }); setConfirmSettleOpen(null); invalidateAll(); if (drillTarget) refetchDrill(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (d: { kind: "charge" | "payment"; id: number }) => apiRequest("DELETE", `/api/debts/${d.kind === "charge" ? "charges" : "payments"}/${d.id}`),
    onSuccess: () => { toast({ title: "Deleted" }); setConfirmDelete(null); invalidateAll(); if (drillTarget) refetchDrill(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const bulkMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/debts/bulk", data),
    onSuccess: (_, vars: any) => {
      toast({ title: vars.action === "ADD_CHARGE" ? "Bulk charges added" : vars.action === "MARK_PAID" ? "Marked all as paid" : "Reminders queued" });
      setBulkChargeOpen(false); setSelected(new Set()); invalidateAll();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ---- Drill panel ----
  const drillQ = useQuery<any>({
    queryKey: ["/api/debts/players", drillTarget?.userId, drillTarget?.clubId],
    queryFn: async () => {
      const r = await fetch(`/api/debts/players/${drillTarget!.userId}/${drillTarget!.clubId}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!drillTarget,
  });
  const refetchDrill = () => queryClient.invalidateQueries({ queryKey: ["/api/debts/players", drillTarget?.userId, drillTarget?.clubId] });

  const eligibleQ = useQuery<{ userId: number; clubId: number; fullName: string; email: string; clubName: string }[]>({
    queryKey: ["/api/debts/eligible-players", clubFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clubFilter !== "all") params.set("clubId", clubFilter);
      const r = await fetch(`/api/debts/eligible-players?${params}`, { credentials: "include" });
      return r.json();
    },
    enabled: addChargeOpen,
  });

  const exportCsv = () => {
    const rows = filteredPlayers;
    const headers = ["Player", "Email", "Club", "Total Owed (£)", "Overdue (£)", "Last Payment", "Status"];
    const lines = [headers.join(",")];
    rows.forEach(r => {
      lines.push([
        `"${r.playerName.replace(/"/g, '""')}"`,
        `"${r.playerEmail}"`,
        `"${r.clubName.replace(/"/g, '""')}"`,
        (r.totalOwed / 100).toFixed(2),
        (r.overdueAmount / 100).toFixed(2),
        r.lastPaymentDate ? format(new Date(r.lastPaymentDate), "yyyy-MM-dd") : "",
        r.status,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `debts-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ s }: { s: string }) => {
    if (s === "PAID") return <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 no-default-hover-elevate"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
    if (s === "PARTIAL") return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 no-default-hover-elevate"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
    return <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 no-default-hover-elevate"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-debts-title">
            <PoundSterling className="h-7 w-7 text-emerald-500" />
            Debt &amp; Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isOwner ? "Manage debts across all clubs" : "Manage debts for your clubs"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCsv} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" />Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddChargeOpen(true)} data-testid="button-add-charge">
            <Plus className="h-4 w-4 mr-1" />Add Charge
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {(clubsQ.data?.length || 0) > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Club</Label>
            <Select value={clubFilter} onValueChange={(v) => { setClubFilter(v); setPage(0); }}>
              <SelectTrigger className="w-48 h-9" data-testid="select-club-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clubs</SelectItem>
                {clubsQ.data?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Overdue after (days)</Label>
          <Input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} className="w-20 h-9" data-testid="input-overdue-days" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="players" data-testid="tab-players">Players</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <SummaryCard icon={TrendingDown} label="Total Outstanding" value={fmt(summaryQ.data?.totalOutstanding || 0)} color="text-red-500" testId="card-total-outstanding" />
            <SummaryCard icon={CheckCircle} label="Collected (this month)" value={fmt(summaryQ.data?.totalCollectedThisMonth || 0)} color="text-green-500" testId="card-collected" />
            <SummaryCard icon={AlertCircle} label="Total Overdue" value={fmt(summaryQ.data?.totalOverdue || 0)} color="text-orange-500" testId="card-total-overdue" />
            <SummaryCard icon={Users} label="Players in Debt" value={String(summaryQ.data?.playersWithDebt || 0)} color="text-amber-500" testId="card-players-debt" />
            <SummaryCard icon={Receipt} label="Avg Debt / Player" value={fmt(summaryQ.data?.averageDebt || 0)} color="text-cyan-500" testId="card-avg-debt" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Debtors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(playersQ.data || []).filter(r => r.totalOwed > 0).sort((a, b) => b.totalOwed - a.totalOwed).slice(0, 5).map(r => (
                  <div key={`${r.userId}-${r.clubId}`} className="flex items-center justify-between p-3 rounded-md border hover-elevate cursor-pointer" onClick={() => setDrillTarget({ userId: r.userId, clubId: r.clubId, playerName: r.playerName })} data-testid={`row-top-debtor-${r.userId}`}>
                    <div>
                      <div className="font-medium text-sm">{r.playerName}</div>
                      <div className="text-xs text-muted-foreground">{r.clubName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-500">{fmt(r.totalOwed)}</div>
                      <StatusBadge s={r.status} />
                    </div>
                  </div>
                ))}
                {(playersQ.data || []).filter(r => r.totalOwed > 0).length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">No outstanding debts. </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLAYERS */}
        <TabsContent value="players" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search player or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" data-testid="input-search-players" />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-36 h-9" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40 h-9" data-testid="select-sort-by"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owed">Sort: Total Owed</SelectItem>
                    <SelectItem value="overdue">Sort: Overdue</SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="lastPayment">Sort: Last Payment</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} data-testid="button-toggle-sort-dir">
                  {sortDir === "asc" ? "↑" : "↓"}
                </Button>
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                  <span className="text-sm font-medium">{selected.size} selected</span>
                  <Button size="sm" variant="outline" onClick={() => setBulkChargeOpen(true)} data-testid="button-bulk-add-charge">
                    <Plus className="h-3 w-3 mr-1" />Add Charge
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ action: "MARK_PAID", targets: [...selected].map(s => { const [u, c] = s.split("-").map(Number); return { userId: u, clubId: c }; }), payload: { method: "OTHER" } })} data-testid="button-bulk-mark-paid">
                    <CheckCircle className="h-3 w-3 mr-1" />Mark Paid
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ action: "SEND_REMINDER", targets: [...selected].map(s => { const [u, c] = s.split("-").map(Number); return { userId: u, clubId: c }; }) })} data-testid="button-bulk-reminder">
                    <Send className="h-3 w-3 mr-1" />Send Reminder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={pageRows.length > 0 && pageRows.every(r => selected.has(`${r.userId}-${r.clubId}`))} onCheckedChange={toggleAllOnPage} data-testid="checkbox-select-all" />
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead className="text-right">Total Owed</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playersQ.isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : pageRows.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No players found.</TableCell></TableRow>
                    ) : pageRows.map(r => {
                      const k = `${r.userId}-${r.clubId}`;
                      const isHigh = r.totalOwed >= 5000;
                      return (
                        <TableRow key={k} className={isHigh ? "bg-red-500/5" : ""} data-testid={`row-player-${r.userId}-${r.clubId}`}>
                          <TableCell><Checkbox checked={selected.has(k)} onCheckedChange={() => toggleSel(k)} data-testid={`checkbox-player-${r.userId}`} /></TableCell>
                          <TableCell className="cursor-pointer" onClick={() => setDrillTarget({ userId: r.userId, clubId: r.clubId, playerName: r.playerName })}>
                            <div className="font-medium hover:underline">{r.playerName}</div>
                            <div className="text-xs text-muted-foreground">{r.playerEmail}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.clubName}</TableCell>
                          <TableCell className={`text-right font-semibold ${r.totalOwed > 0 ? "text-red-500" : ""}`}>{fmt(r.totalOwed)}</TableCell>
                          <TableCell className={`text-right ${r.overdueAmount > 0 ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>{fmt(r.overdueAmount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{dateStr(r.lastPaymentDate)}</TableCell>
                          <TableCell><StatusBadge s={r.status} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Quick add payment" onClick={() => setAddPaymentOpen({ userId: r.userId, clubId: r.clubId, playerName: r.playerName, outstanding: r.totalOwed })} data-testid={`button-quick-payment-${r.userId}`}>
                                <PoundSterling className="h-3.5 w-3.5" />
                              </Button>
                              {r.totalOwed > 0 && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="Mark as paid" onClick={() => setConfirmSettleOpen({ userId: r.userId, clubId: r.clubId, playerName: r.playerName, outstanding: r.totalOwed })} data-testid={`button-mark-paid-${r.userId}`}>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} • {filteredPlayers.length} players</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} data-testid="button-prev-page">Prev</Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} data-testid="button-next-page">Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTIONS */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(txQ.data || []).slice(0, 200).map(t => (
                      <TableRow key={t.id} data-testid={`row-tx-${t.id}`}>
                        <TableCell className="text-sm">{dateStr(t.date)}</TableCell>
                        <TableCell>
                          {t.type === "CHARGE"
                            ? <Badge variant="outline" className="border-red-500/40 text-red-500 no-default-hover-elevate">Charge</Badge>
                            : <Badge variant="outline" className="border-green-500/40 text-green-500 no-default-hover-elevate">Payment</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{t.playerName}</TableCell>
                        <TableCell className="text-sm">{t.clubName}</TableCell>
                        <TableCell className="text-sm">
                          {t.description}
                          {t.category && <span className="ml-2 text-xs text-muted-foreground">[{t.category}]</span>}
                          {t.method && <span className="ml-2 text-xs text-muted-foreground">via {t.method}</span>}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${t.type === "CHARGE" ? "text-red-500" : "text-green-500"}`}>
                          {t.type === "CHARGE" ? "+" : "−"}{fmt(t.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setConfirmDelete({ kind: t.type === "CHARGE" ? "charge" : "payment", id: t.refId })} data-testid={`button-delete-tx-${t.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!txQ.data || txQ.data.length === 0) && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DRILL PANEL */}
      <Sheet open={!!drillTarget} onOpenChange={(o) => !o && setDrillTarget(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drillTarget?.playerName}</SheetTitle>
          </SheetHeader>
          {drillQ.data && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-3 gap-2">
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Charges</div><div className="text-lg font-bold text-red-500">{fmt(drillQ.data.totalCharges)}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Payments</div><div className="text-lg font-bold text-green-500">{fmt(drillQ.data.totalPayments)}</div></CardContent></Card>
                <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-lg font-bold">{fmt(drillQ.data.outstandingBalance)}</div></CardContent></Card>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => drillTarget && setAddPaymentOpen({ ...drillTarget, outstanding: drillQ.data.outstandingBalance })} data-testid="button-drill-add-payment">
                  <Plus className="h-3 w-3 mr-1" />Add Payment
                </Button>
                {drillQ.data.outstandingBalance > 0 && (
                  <Button size="sm" variant="outline" onClick={() => drillTarget && setConfirmSettleOpen({ ...drillTarget, outstanding: drillQ.data.outstandingBalance })} data-testid="button-drill-settle">
                    <CheckCircle className="h-3 w-3 mr-1" />Mark all paid
                  </Button>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Charges</h3>
                <div className="space-y-1">
                  {drillQ.data.charges.length === 0 ? <div className="text-sm text-muted-foreground">No charges.</div> : drillQ.data.charges.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded border text-sm" data-testid={`drill-charge-${c.id}`}>
                      <div>
                        <div className="font-medium">{c.description}</div>
                        <div className="text-xs text-muted-foreground">{dateStr(c.chargeDate)} • {c.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-500">{fmt(c.amount)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setConfirmDelete({ kind: "charge", id: c.id })} data-testid={`button-drill-delete-charge-${c.id}`}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Payments</h3>
                <div className="space-y-1">
                  {drillQ.data.payments.length === 0 ? <div className="text-sm text-muted-foreground">No payments.</div> : drillQ.data.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm" data-testid={`drill-payment-${p.id}`}>
                      <div>
                        <div className="font-medium">{p.notes || "Payment"}</div>
                        <div className="text-xs text-muted-foreground">{dateStr(p.paymentDate)} • {p.method}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-500">{fmt(p.amount)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setConfirmDelete({ kind: "payment", id: p.id })} data-testid={`button-drill-delete-payment-${p.id}`}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <NotesSection userId={drillTarget!.userId} clubId={drillTarget!.clubId} notes={drillQ.data.notes || []} onChange={refetchDrill} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ADD CHARGE DIALOG */}
      <AddChargeDialog open={addChargeOpen} onClose={() => setAddChargeOpen(false)} eligible={eligibleQ.data || []} onSubmit={(d) => addChargeMut.mutate(d)} pending={addChargeMut.isPending} prefill={drillTarget ? { userId: drillTarget.userId, clubId: drillTarget.clubId } : undefined} />

      {/* ADD PAYMENT DIALOG */}
      <AddPaymentDialog open={!!addPaymentOpen} target={addPaymentOpen} onClose={() => setAddPaymentOpen(null)} onSubmit={(d) => addPaymentMut.mutate(d)} pending={addPaymentMut.isPending} />

      {/* BULK CHARGE DIALOG */}
      <BulkChargeDialog open={bulkChargeOpen} onClose={() => setBulkChargeOpen(false)} count={selected.size} onSubmit={(payload) => bulkMut.mutate({ action: "ADD_CHARGE", targets: [...selected].map(s => { const [u, c] = s.split("-").map(Number); return { userId: u, clubId: c }; }), payload })} pending={bulkMut.isPending} />

      {/* SETTLE CONFIRM */}
      <Dialog open={!!confirmSettleOpen} onOpenChange={(o) => !o && setConfirmSettleOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark all as paid?</DialogTitle>
            <DialogDescription>
              This will record a payment of {confirmSettleOpen ? fmt(confirmSettleOpen.outstanding) : ""} for {confirmSettleOpen?.playerName}, settling all outstanding charges.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSettleOpen(null)} data-testid="button-cancel-settle">Cancel</Button>
            <Button onClick={() => confirmSettleOpen && settleMut.mutate({ ...confirmSettleOpen, method: "OTHER" })} disabled={settleMut.isPending} data-testid="button-confirm-settle">
              {settleMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.kind}?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)} disabled={deleteMut.isPending} data-testid="button-confirm-delete">
              {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, testId }: any) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-bold mt-1">{value}</div>
          </div>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function AddChargeDialog({ open, onClose, eligible, onSubmit, pending, prefill }: any) {
  const [userId, setUserId] = useState<string>("");
  const [clubId, setClubId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [chargeDate, setChargeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const reset = () => {
    setUserId(prefill?.userId ? String(prefill.userId) : "");
    setClubId(prefill?.clubId ? String(prefill.clubId) : "");
    setAmount(""); setDescription(""); setCategory("OTHER"); setChargeDate(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Charge</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!prefill && (
            <div>
              <Label>Player</Label>
              <Select value={userId ? `${userId}-${clubId}` : ""} onValueChange={(v) => { const [u, c] = v.split("-"); setUserId(u); setClubId(c); }}>
                <SelectTrigger data-testid="select-charge-player"><SelectValue placeholder="Select player" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {eligible.map((p: any) => <SelectItem key={`${p.userId}-${p.clubId}`} value={`${p.userId}-${p.clubId}`}>{p.fullName} • {p.clubName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (£)</Label><Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-charge-amount" /></div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-charge-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SESSION">Session</SelectItem>
                  <SelectItem value="MEMBERSHIP">Membership</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-charge-description" /></div>
          <div><Label>Date</Label><Input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} data-testid="input-charge-date" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !amount || !description || (!prefill && !userId)} onClick={() => {
            const pence = Math.round(parseFloat(amount) * 100);
            onSubmit({
              userId: Number(prefill?.userId || userId),
              clubId: Number(prefill?.clubId || clubId),
              amount: pence, description, category,
              chargeDate: new Date(chargeDate).toISOString(),
            });
          }} data-testid="button-submit-charge">
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPaymentDialog({ open, target, onClose, onSubmit, pending }: any) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setAmount(""); setNotes(""); setMethod("CASH"); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{target ? `${target.playerName} — Outstanding: ${fmt(target.outstanding)}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-payment-amount" />
              {target && target.outstanding > 0 && (
                <Button size="sm" variant="ghost" className="h-7 mt-1 text-xs" onClick={() => setAmount((target.outstanding / 100).toFixed(2))}>Use full outstanding</Button>
              )}
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Date</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} data-testid="input-payment-date" /></div>
          <div><Label>Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-payment-notes" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !amount || !target} onClick={() => {
            onSubmit({
              userId: target.userId, clubId: target.clubId,
              amount: Math.round(parseFloat(amount) * 100),
              method, notes: notes || null,
              paymentDate: new Date(paymentDate).toISOString(),
            });
          }} data-testid="button-submit-payment">
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkChargeDialog({ open, onClose, count, onSubmit, pending }: any) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Charge to {count} players</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (£)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-bulk-amount" /></div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-bulk-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SESSION">Session</SelectItem>
                  <SelectItem value="MEMBERSHIP">Membership</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-bulk-description" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !amount || !description} onClick={() => onSubmit({ amount: Math.round(parseFloat(amount) * 100), description, category })} data-testid="button-submit-bulk-charge">
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Apply to {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesSection({ userId, clubId, notes, onChange }: { userId: number; clubId: number; notes: any[]; onChange: () => void }) {
  const [text, setText] = useState("");
  const { toast } = useToast();
  const addMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/debts/notes", { userId, clubId, note: text }),
    onSuccess: () => { setText(""); onChange(); toast({ title: "Note added" }); },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/debts/notes/${id}`),
    onSuccess: () => onChange(),
  });
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">Admin Notes</h3>
      <div className="space-y-1 mb-2">
        {notes.length === 0 ? <div className="text-sm text-muted-foreground">No notes.</div> : notes.map(n => (
          <div key={n.id} className="flex items-start justify-between p-2 rounded border text-sm" data-testid={`note-${n.id}`}>
            <div>
              <div>{n.note}</div>
              <div className="text-xs text-muted-foreground">{dateStr(n.createdAt)}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => delMut.mutate(n.id)} data-testid={`button-delete-note-${n.id}`}><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note..." className="min-h-[60px]" data-testid="input-new-note" />
        <Button size="sm" disabled={!text.trim() || addMut.isPending} onClick={() => addMut.mutate()} data-testid="button-add-note">
          <Plus className="h-3 w-3 mr-1" />Add
        </Button>
      </div>
    </div>
  );
}

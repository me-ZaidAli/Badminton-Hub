import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Shirt, Package, MoreHorizontal, CheckCircle2, Eye, Loader2, Plus, Users, Search, X, Trash2, CreditCard, Filter } from "lucide-react";
import { format } from "date-fns";
import chaoticaImg from "@assets/image_1775147617249.png";
import slasherImg from "@assets/image_1775147642411.png";
import strikerImg from "@assets/image_1775250192402.png";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const MODELS = [
  { id: "chaotica", name: "Chaotica", image: chaoticaImg },
  { id: "slasher", name: "Slasher", image: slasherImg },
  { id: "striker", name: "Striker", image: strikerImg },
];
function modelLabel(m: string) { return MODELS.find(x => x.id === m)?.name || m; }
function modelImg(m: string) { return MODELS.find(x => x.id === m)?.image || chaoticaImg; }

function collectionBadge(status: string) {
  switch (status) {
    case "not_ready": return <Badge variant="secondary">Not Ready</Badge>;
    case "ready": return <Badge className="bg-emerald-500 text-white">Ready</Badge>;
    case "player_confirmed": return <Badge className="bg-amber-500 text-white">Player Confirmed</Badge>;
    case "collected": return <Badge className="bg-blue-500 text-white">Collected</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function paymentBadge(status: string) {
  return status === "paid"
    ? <Badge className="bg-emerald-500 text-white">Paid</Badge>
    : <Badge variant="secondary">Pending</Badge>;
}

export default function TshirtManager() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newPrintedName, setNewPrintedName] = useState("");
  const [newPlayerUserId, setNewPlayerUserId] = useState("");
  const [newPayment, setNewPayment] = useState("pending");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const { data: myClubs } = useQuery<any[]>({
    queryKey: ["/api/my-clubs"],
    enabled: !!user,
  });

  const clubId = selectedClubId ? Number(selectedClubId) : myClubs?.[0]?.id;

  const { data: tshirtList, isLoading: tshirtsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tshirts", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/tshirts${clubId ? `?clubId=${clubId}` : ""}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!user,
  });

  const { data: requestList, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tshirt-requests", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/tshirt-requests${clubId ? `?clubId=${clubId}` : ""}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!user,
  });

  const { data: batchList } = useQuery<any[]>({
    queryKey: ["/api/admin/tshirt-batches", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/tshirt-batches${clubId ? `?clubId=${clubId}` : ""}`);
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!user,
  });

  const { data: playerList } = useQuery<any[]>({
    queryKey: ["/api/admin/player-search", playerSearch, clubId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/player-search?q=${encodeURIComponent(playerSearch || "*")}${clubId ? `&clubId=${clubId}` : ""}`);
      if (!r.ok) throw new Error("Failed to search");
      return r.json();
    },
    enabled: !!user && createOpen && !!clubId,
  });

  const filteredTshirts = useMemo(() => {
    if (!tshirtList) return [];
    return tshirtList.filter((shirt: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = shirt.playerName?.toLowerCase().includes(q);
        const matchesPrinted = shirt.printedName?.toLowerCase().includes(q);
        const matchesSize = shirt.size?.toLowerCase().includes(q);
        if (!matchesName && !matchesPrinted && !matchesSize) return false;
      }
      if (filterModel !== "all" && (shirt.model || "chaotica") !== filterModel) return false;
      if (filterSize !== "all" && shirt.size !== filterSize) return false;
      if (filterPayment !== "all" && shirt.paymentStatus !== filterPayment) return false;
      if (filterStatus !== "all" && shirt.collectionStatus !== filterStatus) return false;
      return true;
    });
  }, [tshirtList, searchQuery, filterModel, filterSize, filterPayment, filterStatus]);

  const hasActiveFilters = searchQuery || filterModel !== "all" || filterSize !== "all" || filterPayment !== "all" || filterStatus !== "all";

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/tshirts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      setCreateOpen(false);
      setNewModel("");
      setNewSize("");
      setNewPrintedName("");
      setNewPlayerUserId("");
      toast({ title: "T-shirt record created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markReadyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/tshirts/${id}/mark-ready`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      toast({ title: "T-shirt marked as ready" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const confirmCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/tshirts/${id}/confirm-collection`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      toast({ title: "Collection confirmed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/tshirt-batches", { clubId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirt-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirt-batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      toast({ title: "Batch created successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/tshirts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      toast({ title: "T-shirt updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/tshirts/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      setDeleteTarget(null);
      toast({ title: "T-shirt deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      const res = await apiRequest("POST", "/api/admin/tshirts/bulk-action", { ids, action });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      setSelectedIds(new Set());
      const labels: Record<string, string> = {
        mark_paid: "marked as paid",
        mark_ready: "marked as ready",
        confirm_collection: "marked as collected",
        delete: "deleted",
      };
      toast({ title: `${vars.ids.length} t-shirt(s) ${labels[vars.action] || "updated"}` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingRequests = requestList?.filter(r => r.status === "pending") || [];
  const canCreateBatch = pendingRequests.length >= 10;

  const allFilteredIds = filteredTshirts.map((s: any) => s.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id: number) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterModel("all");
    setFilterSize("all");
    setFilterPayment("all");
    setFilterStatus("all");
  }

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shirt className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">T-Shirt Manager</h1>
            <p className="text-sm text-muted-foreground">Manage club t-shirts, requests, and batches</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {myClubs && myClubs.length > 1 && (
            <Select value={selectedClubId || String(myClubs[0]?.id || "")} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-48" data-testid="select-club-filter">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {myClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-tshirt"><Plus className="h-4 w-4 mr-2" />Add T-Shirt</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create T-Shirt Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MODELS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNewModel(m.id)}
                        className={`relative rounded-lg border-2 p-2 transition-all ${
                          newModel === m.id
                            ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20"
                            : "border-border hover:border-blue-300"
                        }`}
                        data-testid={`admin-model-select-${m.id}`}
                      >
                        {newModel === m.id && (
                          <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-blue-500" />
                        )}
                        <img src={m.image} alt={m.name} className="w-full aspect-square object-contain rounded mb-1" />
                        <p className="text-xs font-semibold text-center">{m.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Input
                    placeholder="Search players..."
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                    data-testid="input-player-search"
                  />
                  {playerList && playerList.length > 0 && playerSearch && (
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {playerList.slice(0, 20).map((p: any) => (
                        <button
                          key={p.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${String(p.id) === newPlayerUserId ? "bg-primary/10 font-semibold" : ""}`}
                          onClick={() => {
                            setNewPlayerUserId(String(p.id));
                            setNewPrintedName(p.fullName);
                            setPlayerSearch(p.fullName);
                          }}
                          data-testid={`button-select-player-${p.id}`}
                        >
                          {p.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Select value={newSize} onValueChange={setNewSize}>
                    <SelectTrigger data-testid="select-new-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Printed Name</Label>
                  <Input value={newPrintedName} onChange={e => setNewPrintedName(e.target.value)} data-testid="input-new-printed-name" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={newPayment} onValueChange={setNewPayment}>
                    <SelectTrigger data-testid="select-new-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={!newModel || !newPlayerUserId || !newSize || !newPrintedName || createMutation.isPending}
                  onClick={() => createMutation.mutate({
                    userId: Number(newPlayerUserId),
                    clubId,
                    model: newModel,
                    size: newSize,
                    printedName: newPrintedName,
                    paymentStatus: newPayment,
                  })}
                  data-testid="button-save-tshirt"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create T-Shirt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="tshirts">
        <TabsList data-testid="tabs-tshirt-manager">
          <TabsTrigger value="tshirts" data-testid="tab-tshirts">
            <Shirt className="h-3.5 w-3.5 mr-1.5" />T-Shirts ({tshirtList?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-requests">
            <Package className="h-3.5 w-3.5 mr-1.5" />Requests ({requestList?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="batches" data-testid="tab-batches">
            <Users className="h-3.5 w-3.5 mr-1.5" />Batches ({batchList?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tshirts" className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name, printed name, or size..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-tshirt-search"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger className="w-32" data-testid="filter-model">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSize} onValueChange={setFilterSize}>
                <SelectTrigger className="w-28" data-testid="filter-size">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-32" data-testid="filter-payment">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_ready">Not Ready</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="player_confirmed">Player Confirmed</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 px-3" data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>

          {someSelected && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg" data-testid="bulk-action-bar">
              <Badge variant="secondary" className="font-semibold">{selectedIds.size} selected</Badge>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkActionMutation.mutate({ ids: selectedArray, action: "mark_paid" })}
                disabled={bulkActionMutation.isPending}
                data-testid="bulk-mark-paid"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />Mark Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkActionMutation.mutate({ ids: selectedArray, action: "mark_ready" })}
                disabled={bulkActionMutation.isPending}
                data-testid="bulk-mark-ready"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />Mark Ready
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkActionMutation.mutate({ ids: selectedArray, action: "confirm_collection" })}
                disabled={bulkActionMutation.isPending}
                data-testid="bulk-confirm-collection"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Mark Collected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={bulkActionMutation.isPending}
                data-testid="bulk-delete"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
              </Button>
              {bulkActionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {tshirtsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !tshirtList || tshirtList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shirt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No t-shirt records yet</p>
                </div>
              ) : filteredTshirts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No t-shirts match your filters</p>
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">Clear filters</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Printed Name</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTshirts.map((shirt: any) => (
                      <TableRow key={shirt.id} className={selectedIds.has(shirt.id) ? "bg-primary/5" : ""} data-testid={`row-tshirt-${shirt.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(shirt.id)}
                            onCheckedChange={() => toggleSelect(shirt.id)}
                            data-testid={`checkbox-tshirt-${shirt.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{shirt.playerName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img src={modelImg(shirt.model)} alt={modelLabel(shirt.model)} className="w-8 h-8 object-contain rounded" />
                            <span className="text-xs font-medium">{modelLabel(shirt.model)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{shirt.size}</TableCell>
                        <TableCell>{shirt.printedName}</TableCell>
                        <TableCell>{paymentBadge(shirt.paymentStatus)}</TableCell>
                        <TableCell>{collectionBadge(shirt.collectionStatus)}</TableCell>
                        <TableCell>{shirt.batchId ? `#${shirt.batchId}` : "—"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${shirt.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {shirt.collectionStatus === "not_ready" && (
                                <DropdownMenuItem onClick={() => markReadyMutation.mutate(shirt.id)} data-testid={`action-mark-ready-${shirt.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />Mark Ready
                                </DropdownMenuItem>
                              )}
                              {(shirt.collectionStatus === "player_confirmed" || shirt.collectionStatus === "ready") && (
                                <DropdownMenuItem onClick={() => confirmCollectionMutation.mutate(shirt.id)} data-testid={`action-confirm-${shirt.id}`}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />Confirm Collection
                                </DropdownMenuItem>
                              )}
                              {shirt.paymentStatus === "pending" && (
                                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: shirt.id, data: { paymentStatus: "paid" } })} data-testid={`action-mark-paid-${shirt.id}`}>
                                  <CreditCard className="h-4 w-4 mr-2" />Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {shirt.isActive && (
                                <DropdownMenuItem
                                  onClick={() => updateMutation.mutate({ id: shirt.id, data: { isActive: false } })}
                                  data-testid={`action-deactivate-${shirt.id}`}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => { setDeleteTarget(shirt.id); setDeleteConfirmOpen(true); }}
                                data-testid={`action-delete-${shirt.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {filteredTshirts.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                  <span>Showing {filteredTshirts.length} of {tshirtList?.length || 0} t-shirts</span>
                  {someSelected && <span>{selectedIds.size} selected</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="space-y-4">
            {canCreateBatch && (
              <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{pendingRequests.length} pending requests ready for batching</p>
                    <p className="text-xs text-muted-foreground">Minimum 10 requests required to create a batch</p>
                  </div>
                  <Button
                    onClick={() => createBatchMutation.mutate()}
                    disabled={createBatchMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="button-create-batch"
                  >
                    {createBatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                    Create Batch
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-0">
                {requestsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : !requestList || requestList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No t-shirt requests yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Printed Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Requested</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestList.map((req: any) => (
                        <TableRow key={req.id} data-testid={`row-request-${req.id}`}>
                          <TableCell className="font-medium">{req.playerName}</TableCell>
                          <TableCell>{req.size}</TableCell>
                          <TableCell>{req.printedName}</TableCell>
                          <TableCell>
                            {req.status === "pending" && <Badge variant="secondary">Pending</Badge>}
                            {req.status === "batched" && <Badge className="bg-violet-500 text-white">Batched</Badge>}
                            {req.status === "in_production" && <Badge className="bg-blue-500 text-white">In Production</Badge>}
                          </TableCell>
                          <TableCell>{req.batchId ? `#${req.batchId}` : "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(req.createdAt), "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!batchList || batchList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No batches created yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchList.map((batch: any) => (
                      <TableRow key={batch.id} data-testid={`row-batch-${batch.id}`}>
                        <TableCell className="font-medium">#{batch.id}</TableCell>
                        <TableCell>{batch.requestCount}</TableCell>
                        <TableCell><Badge variant="outline">{batch.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(batch.createdAt), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete T-Shirt Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this t-shirt record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); setDeleteConfirmOpen(false); }}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} T-Shirt Record{selectedIds.size > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} t-shirt record{selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { bulkActionMutation.mutate({ ids: selectedArray, action: "delete" }); setBulkDeleteConfirmOpen(false); }}
              data-testid="button-confirm-bulk-delete"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

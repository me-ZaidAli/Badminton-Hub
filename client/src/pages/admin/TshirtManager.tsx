import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Shirt, Package, MoreHorizontal, CheckCircle2, Eye, Loader2, Plus, Users } from "lucide-react";
import { format } from "date-fns";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

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
  const [newSize, setNewSize] = useState("");
  const [newPrintedName, setNewPrintedName] = useState("");
  const [newPlayerUserId, setNewPlayerUserId] = useState("");
  const [newPayment, setNewPayment] = useState("pending");
  const [playerSearch, setPlayerSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");

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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/tshirts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tshirts"] });
      setCreateOpen(false);
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

  const pendingRequests = requestList?.filter(r => r.status === "pending") || [];
  const canCreateBatch = pendingRequests.length >= 10;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
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
                  disabled={!newPlayerUserId || !newSize || !newPrintedName || createMutation.isPending}
                  onClick={() => createMutation.mutate({
                    userId: Number(newPlayerUserId),
                    clubId,
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

        <TabsContent value="tshirts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {tshirtsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !tshirtList || tshirtList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shirt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No t-shirt records yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Printed Name</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tshirtList.map((shirt: any) => (
                      <TableRow key={shirt.id} data-testid={`row-tshirt-${shirt.id}`}>
                        <TableCell className="font-medium">{shirt.playerName}</TableCell>
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
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {shirt.isActive && (
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => updateMutation.mutate({ id: shirt.id, data: { isActive: false } })}
                                  data-testid={`action-deactivate-${shirt.id}`}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </div>
  );
}

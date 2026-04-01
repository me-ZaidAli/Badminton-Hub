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
import { Shirt, Package, CheckCircle2, Clock, Loader2, ArrowLeft, Send } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

function statusBadge(status: string) {
  switch (status) {
    case "not_ready": return <Badge variant="secondary" data-testid="badge-status-not-ready">Not Ready</Badge>;
    case "ready": return <Badge className="bg-emerald-500 text-white" data-testid="badge-status-ready">Ready for Collection</Badge>;
    case "player_confirmed": return <Badge className="bg-amber-500 text-white" data-testid="badge-status-confirmed">Awaiting Admin Confirmation</Badge>;
    case "collected": return <Badge className="bg-blue-500 text-white" data-testid="badge-status-collected">Collected</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function requestStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="secondary" data-testid="badge-request-pending">Pending</Badge>;
    case "batched": return <Badge className="bg-violet-500 text-white" data-testid="badge-request-batched">Batched</Badge>;
    case "in_production": return <Badge className="bg-blue-500 text-white" data-testid="badge-request-production">In Production</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function TshirtPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [size, setSize] = useState("");
  const [printedName, setPrintedName] = useState("");

  const { data: myClubs } = useQuery<any[]>({
    queryKey: ["/api/my-clubs"],
    enabled: !!user,
  });

  const { data: myTshirts, isLoading: tshirtsLoading } = useQuery<any[]>({
    queryKey: ["/api/tshirts/my"],
    enabled: !!user,
  });

  const { data: myRequests, isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/tshirts/my-requests"],
    enabled: !!user,
  });

  const confirmMutation = useMutation({
    mutationFn: async (tshirtId: number) => {
      const res = await apiRequest("POST", `/api/tshirts/${tshirtId}/confirm-collection`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tshirts/my"] });
      toast({ title: "Collection confirmed!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const requestMutation = useMutation({
    mutationFn: async (data: { size: string; printedName: string; clubId: number }) => {
      const res = await apiRequest("POST", "/api/tshirts/request", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tshirts/my-requests"] });
      setSize("");
      setPrintedName("");
      toast({ title: "Request submitted!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user) return null;

  const activeTshirts = myTshirts?.filter(t => t.isActive) || [];
  const activeRequests = myRequests?.filter(r => r.status === "pending" || r.status === "batched" || r.status === "in_production") || [];
  const hasActiveTshirt = activeTshirts.length > 0;
  const hasPendingRequest = activeRequests.length > 0;
  const primaryClubId = myClubs && myClubs.length > 0 ? myClubs[0].id : null;

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Shirt className="h-5 w-5 text-blue-500" />
          <h1 className="text-xl font-bold">Club T-Shirt</h1>
        </div>
      </div>

      {tshirtsLoading || requestsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {activeTshirts.map((shirt: any) => (
            <Card key={shirt.id} className="border-blue-500/20" data-testid={`tshirt-card-${shirt.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-blue-500" />
                    My T-Shirt
                  </CardTitle>
                  {statusBadge(shirt.collectionStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-semibold" data-testid="text-tshirt-size">{shirt.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Printed Name</p>
                    <p className="font-semibold" data-testid="text-tshirt-name">{shirt.printedName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <Badge variant={shirt.paymentStatus === "paid" ? "default" : "secondary"} data-testid="badge-payment">
                      {shirt.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                  {shirt.collectedAt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <p className="text-sm" data-testid="text-collected-date">{format(new Date(shirt.collectedAt), "dd MMM yyyy, HH:mm")}</p>
                    </div>
                  )}
                </div>

                {shirt.collectionStatus === "ready" && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => confirmMutation.mutate(shirt.id)}
                    disabled={confirmMutation.isPending}
                    data-testid="button-confirm-collection"
                  >
                    {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    I've Collected My T-Shirt
                  </Button>
                )}

                {shirt.collectionStatus === "player_confirmed" && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3" data-testid="status-pending-admin">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Waiting for admin to confirm your collection</span>
                  </div>
                )}

                {shirt.collectionStatus === "collected" && (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3" data-testid="status-collected">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Collection confirmed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {activeRequests.map((req: any) => (
            <Card key={req.id} className="border-violet-500/20" data-testid={`request-card-${req.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-violet-500" />
                    T-Shirt Request
                  </CardTitle>
                  {requestStatusBadge(req.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-semibold">{req.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Printed Name</p>
                    <p className="font-semibold">{req.printedName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!hasActiveTshirt && !hasPendingRequest && primaryClubId && (
            <Card className="border-dashed border-2" data-testid="tshirt-request-form">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-blue-500" />
                  Request Club T-Shirt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="size" data-testid="select-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printedName">Printed Name</Label>
                  <Input
                    id="printedName"
                    value={printedName}
                    onChange={e => setPrintedName(e.target.value)}
                    placeholder="Name to print on your t-shirt"
                    data-testid="input-printed-name"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!size || !printedName || requestMutation.isPending}
                  onClick={() => requestMutation.mutate({ size, printedName, clubId: primaryClubId })}
                  data-testid="button-submit-request"
                >
                  {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          )}

          {!hasActiveTshirt && !hasPendingRequest && !primaryClubId && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shirt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Join a club to request a t-shirt</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

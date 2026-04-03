import { useState, useMemo } from "react";
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
import { Shirt, Package, CheckCircle2, Clock, Loader2, ArrowLeft, Send, Building2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import chaoticaImg from "@assets/image_1775147617249.png";
import slasherImg from "@assets/image_1775147642411.png";
import modelsShowcaseImg from "@assets/Screenshot_20260403_232959_Replit_1775255409511.jpg";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const MODELS = [
  { id: "chaotica", name: "Chaotica", image: chaoticaImg, description: "Grey camo pattern with red collar" },
  { id: "slasher", name: "Slasher", image: slasherImg, description: "Black and teal tiger stripe design" },
];

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

function modelLabel(model: string) {
  const m = MODELS.find(m => m.id === model);
  return m ? m.name : model;
}

export default function TshirtPage() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("");
  const [size, setSize] = useState("");
  const [printedName, setPrintedName] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");

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
    mutationFn: async (data: { model: string; size: string; printedName: string; clubId: number }) => {
      const res = await apiRequest("POST", "/api/tshirts/request", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tshirts/my-requests"] });
      setSelectedModel("");
      setSize("");
      setPrintedName("");
      toast({ title: "Request submitted!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tshirtClubs = useMemo(() => {
    if (!myClubs) return [];
    return myClubs.filter((c: any) => c.providesClubTShirts);
  }, [myClubs]);

  const activeClubId = useMemo(() => {
    if (selectedClubId) return parseInt(selectedClubId);
    if (tshirtClubs.length > 0) return tshirtClubs[0].id;
    return null;
  }, [selectedClubId, tshirtClubs]);

  const activeClub = useMemo(() => {
    return tshirtClubs.find((c: any) => c.id === activeClubId) || null;
  }, [tshirtClubs, activeClubId]);

  if (!user) return null;

  const activeTshirts = (myTshirts || []).filter((t: any) => t.isActive && t.clubId === activeClubId);
  const activeRequests = (myRequests || []).filter((r: any) =>
    (r.status === "pending" || r.status === "batched" || r.status === "in_production") && r.clubId === activeClubId
  );

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

      {tshirtClubs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shirt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No clubs with t-shirts available</p>
            <p className="text-sm mt-1">Join a club that offers t-shirts to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {tshirtClubs.length > 1 && (
            <Card className="border-blue-500/20" data-testid="club-selector-card">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <Label className="text-sm font-medium whitespace-nowrap">Select Club</Label>
                  <Select
                    value={String(activeClubId || "")}
                    onValueChange={(val) => {
                      setSelectedClubId(val);
                      setSelectedModel("");
                      setSize("");
                      setPrintedName("");
                    }}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-club">
                      <SelectValue placeholder="Choose a club" />
                    </SelectTrigger>
                    <SelectContent>
                      {tshirtClubs.map((club: any) => (
                        <SelectItem key={club.id} value={String(club.id)}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {tshirtClubs.length === 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Building2 className="h-4 w-4" />
              <span>{activeClub?.name}</span>
            </div>
          )}

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
                    {shirt.model && (
                      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        <img
                          src={MODELS.find(m => m.id === shirt.model)?.image || chaoticaImg}
                          alt={modelLabel(shirt.model)}
                          className="w-16 h-16 object-contain rounded"
                        />
                        <div>
                          <p className="text-xs text-muted-foreground">Model</p>
                          <p className="font-semibold" data-testid="text-tshirt-model">{modelLabel(shirt.model)}</p>
                        </div>
                      </div>
                    )}
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
                      {req.model && (
                        <div className="col-span-2 flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                          <img
                            src={MODELS.find(m => m.id === req.model)?.image || chaoticaImg}
                            alt={modelLabel(req.model)}
                            className="w-12 h-12 object-contain rounded"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">Model</p>
                            <p className="font-semibold text-sm">{modelLabel(req.model)}</p>
                          </div>
                        </div>
                      )}
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

              {activeClubId && (
                <Card className="border-dashed border-2" data-testid="tshirt-request-form">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shirt className="h-4 w-4 text-blue-500" />
                      Request {activeClub?.name} T-Shirt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-xl overflow-hidden border border-border" data-testid="models-showcase">
                      <img
                        src={modelsShowcaseImg}
                        alt="Models wearing the club kit"
                        className="w-full object-cover"
                      />
                    </div>

                    <div className="rounded-lg bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border border-blue-500/20 p-4 space-y-2" data-testid="tshirt-info-banner">
                      <h3 className="font-bold text-sm">2025/26 Season Models</h3>
                      <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">&#8226;</span>
                          <span>Non-members can purchase the club t-shirt at <strong className="text-foreground">{"\u00A3"}23</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">&#8226;</span>
                          <span>Want to become a member? It's straightforward — send in the membership start-up fee of <strong className="text-foreground">{"\u00A3"}45</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">&#8226;</span>
                          <span>We order in batches, so once we receive <strong className="text-foreground">10+ requests</strong> we will place the order</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <Label>Choose Your Model</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {MODELS.map(model => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => setSelectedModel(model.id)}
                            className={`relative rounded-xl border-2 p-3 transition-all text-left ${
                              selectedModel === model.id
                                ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
                                : "border-border hover:border-blue-300 hover:bg-muted/50"
                            }`}
                            data-testid={`model-select-${model.id}`}
                          >
                            {selectedModel === model.id && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                              </div>
                            )}
                            <img
                              src={model.image}
                              alt={model.name}
                              className="w-full aspect-square object-contain rounded-lg mb-2"
                            />
                            <p className="font-bold text-sm text-center">{model.name}</p>
                            <p className="text-[11px] text-muted-foreground text-center mt-0.5">{model.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
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
                      disabled={!selectedModel || !size || !printedName || requestMutation.isPending}
                      onClick={() => requestMutation.mutate({ model: selectedModel, size, printedName, clubId: activeClubId! })}
                      data-testid="button-submit-request"
                    >
                      {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Request
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeTshirts.length === 0 && activeRequests.length === 0 && !activeClubId && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Shirt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Select a club to view and request t-shirts</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

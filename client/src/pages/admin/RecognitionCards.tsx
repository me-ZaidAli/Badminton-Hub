import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Award, Search, Gift, XCircle, ChevronDown, ChevronRight, CreditCard, LayoutGrid, List, User } from "lucide-react";
import { format } from "date-fns";
import { MetalCardFront, getMetalMaterial, CARD_ICONS } from "@/components/MetalCard";

type CardRecord = {
  id: number;
  name: string;
  description: string;
  cardCategory: string;
  designConfig: { gradient: string; textColor: string; accentColor: string; pattern?: string } | null;
  isActive: boolean;
};

type IssuedCardRecord = {
  id: number;
  userId: number;
  cardId: number;
  customReason: string | null;
  rarityLevel: string;
  serialNumber: string;
  issuedAt: string;
  revokedAt: string | null;
  cardName: string;
  cardDescription: string;
  cardCategory: string;
  designConfig: any;
  recipientName: string;
  recipientEmail: string;
  issuerName: string | null;
};

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  standard: { label: "Standard", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  rare: { label: "Rare", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  epic: { label: "Epic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  legendary: { label: "Legendary", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  mythic: { label: "Mythic", color: "bg-gradient-to-r from-rose-500 to-purple-500 text-white" },
};

export default function RecognitionCards() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"gallery" | "issued">("gallery");
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedRarity, setSelectedRarity] = useState("standard");
  const [customReason, setCustomReason] = useState("");
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<number>>(new Set());
  const [issuedSearchQuery, setIssuedSearchQuery] = useState("");
  const [preIssueUserId, setPreIssueUserId] = useState<number | null>(null);

  const { data: cardTypes, isLoading: cardsLoading } = useQuery<CardRecord[]>({ queryKey: ["/api/admin/cards"] });
  const { data: allUsers } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: allIssuedCards, isLoading: issuedLoading, isError: issuedError } = useQuery<IssuedCardRecord[]>({
    queryKey: ["/api/admin/all-issued-cards"],
    enabled: activeTab === "issued",
  });

  const issueMutation = useMutation({
    mutationFn: async (data: { userId: number; cardId: number; customReason: string; rarityLevel: string }) => {
      await apiRequest("POST", "/api/admin/user-cards", data);
    },
    onSuccess: () => {
      toast({ title: "Card Issued", description: "Recognition card has been awarded successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-cards"] });
      setIssueDialogOpen(false);
      resetIssueForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/user-cards/${id}/revoke`);
    },
    onSuccess: () => {
      toast({ title: "Card Revoked", description: "Recognition card has been revoked." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-cards"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetIssueForm = () => {
    setSelectedUserId(null);
    setSelectedCardId("");
    setSelectedRarity("standard");
    setCustomReason("");
    setSearchQuery("");
    setPreIssueUserId(null);
  };

  const openIssueForUser = (userId: number) => {
    const user = allUsers?.find((u: any) => u.id === userId);
    setPreIssueUserId(userId);
    setSelectedUserId(userId);
    setSearchQuery(user?.fullName || "");
    setIssueDialogOpen(true);
  };

  const filteredUsers = allUsers?.filter((u: any) =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10) || [];

  const togglePlayer = (userId: number) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const groupedByPlayer = (() => {
    if (!allIssuedCards) return [];
    const map = new Map<number, { userId: number; name: string; email: string; cards: IssuedCardRecord[] }>();
    for (const card of allIssuedCards) {
      if (!map.has(card.userId)) {
        map.set(card.userId, { userId: card.userId, name: card.recipientName, email: card.recipientEmail, cards: [] });
      }
      map.get(card.userId)!.cards.push(card);
    }
    let groups = Array.from(map.values());
    if (issuedSearchQuery) {
      const q = issuedSearchQuery.toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  })();

  const totalIssued = allIssuedCards?.length || 0;
  const totalActive = allIssuedCards?.filter(c => !c.revokedAt).length || 0;

  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-recognition-cards-title">
            <Award className="h-6 w-6 text-amber-500" />
            Recognition Cards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Award recognition cards to players for character, leadership, and contribution</p>
        </div>
        <Button onClick={() => { resetIssueForm(); setIssueDialogOpen(true); }} data-testid="button-issue-card">
          <Gift className="h-4 w-4 mr-2" />
          Issue Card
        </Button>
      </div>

      <div className="flex gap-1 border-b" data-testid="tabs-recognition">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors bg-transparent ${activeTab === "gallery" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("gallery")}
          data-testid="tab-gallery"
        >
          <LayoutGrid className="h-4 w-4" />
          Card Gallery
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors bg-transparent ${activeTab === "issued" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("issued")}
          data-testid="tab-issued"
        >
          <List className="h-4 w-4" />
          Issued Cards
          {totalIssued > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1" data-testid="badge-issued-count">{totalIssued}</Badge>
          )}
        </button>
      </div>

      {activeTab === "gallery" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {cardTypes?.map((card) => (
            <div key={card.id} className="space-y-2">
              <button
                className="w-full bg-transparent border-0 p-0 cursor-pointer"
                onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
                data-testid={`button-card-preview-${card.id}`}
              >
                <div className="relative" style={{ aspectRatio: "1.586", borderRadius: "20px" }} data-testid={`card-visual-${card.id}`}>
                  <MetalCardFront
                    cardId={card.id}
                    cardName={card.name}
                    pattern={card.designConfig?.pattern}
                    size="compact"
                  />
                </div>
              </button>
              {expandedCardId === card.id && (
                <div className="p-2 bg-muted/50 rounded-lg text-xs space-y-1" data-testid={`card-details-${card.id}`}>
                  <p className="text-muted-foreground leading-relaxed">{card.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-[9px]">{card.cardCategory === "admin_gifted" ? "Admin Gifted" : card.cardCategory}</Badge>
                    <Badge variant={card.isActive ? "default" : "secondary"} className="text-[9px]">{card.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "issued" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name or email..."
                value={issuedSearchQuery}
                onChange={(e) => setIssuedSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-issued"
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
              <span data-testid="text-total-issued">{totalIssued} total</span>
              <span data-testid="text-total-active">{totalActive} active</span>
              <span>{totalIssued - totalActive} revoked</span>
            </div>
          </div>

          {issuedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : issuedError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-10 w-10 mx-auto text-destructive/50 mb-3" />
                <p className="text-sm text-muted-foreground">Failed to load issued cards. Please try again.</p>
              </CardContent>
            </Card>
          ) : groupedByPlayer.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {issuedSearchQuery ? "No players match your search" : "No cards have been issued yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2" data-testid="list-issued-players">
              {groupedByPlayer.map((group) => {
                const isExpanded = expandedPlayers.has(group.userId);
                const activeCards = group.cards.filter(c => !c.revokedAt);
                const revokedCards = group.cards.filter(c => c.revokedAt);

                return (
                  <Card key={group.userId} className="overflow-hidden" data-testid={`player-group-${group.userId}`}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 bg-transparent text-left transition-colors hover:bg-muted/50"
                      onClick={() => togglePlayer(group.userId)}
                      data-testid={`button-toggle-player-${group.userId}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{group.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px]" data-testid={`badge-player-cards-${group.userId}`}>
                          {activeCards.length} active
                        </Badge>
                        {revokedCards.length > 0 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {revokedCards.length} revoked
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); openIssueForUser(group.userId); }}
                          data-testid={`button-issue-to-${group.userId}`}
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Issue
                        </Button>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-2" data-testid={`player-cards-${group.userId}`}>
                        {group.cards.map((uc) => {
                          const rarity = RARITY_LABELS[uc.rarityLevel] || RARITY_LABELS.standard;
                          const mat = getMetalMaterial(uc.cardId);
                          const pattern = uc.designConfig?.pattern || "";
                          const IconComp = CARD_ICONS[pattern] || Award;

                          return (
                            <div
                              key={uc.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${uc.revokedAt ? "opacity-60 bg-muted/30" : ""}`}
                              data-testid={`issued-card-${uc.id}`}
                            >
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  background: mat.base,
                                  boxShadow: `${mat.edgeHighlight}, 0 4px 8px rgba(0,0,0,0.3)`,
                                }}
                              >
                                <IconComp className="h-5 w-5" style={{ color: mat.textMain }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{uc.cardName}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
                                  {uc.revokedAt && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {uc.serialNumber} · Issued {format(new Date(uc.issuedAt), "dd MMM yyyy")}
                                  {uc.issuerName && ` by ${uc.issuerName}`}
                                </p>
                                {uc.customReason && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{uc.customReason}</p>}
                                {uc.revokedAt && <p className="text-xs text-destructive mt-0.5">Revoked {format(new Date(uc.revokedAt), "dd MMM yyyy")}</p>}
                              </div>
                              {!uc.revokedAt && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive shrink-0"
                                  onClick={() => revokeMutation.mutate(uc.id)}
                                  disabled={revokeMutation.isPending}
                                  data-testid={`button-revoke-${uc.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Revoke</span>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={issueDialogOpen} onOpenChange={(open) => { if (!open) { setIssueDialogOpen(false); resetIssueForm(); } }}>
        <DialogContent className="bg-background" data-testid="dialog-issue-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Issue Recognition Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Player</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-player"
                  disabled={!!preIssueUserId}
                />
              </div>
              {searchQuery && filteredUsers.length > 0 && !selectedUserId && (
                <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                  {filteredUsers.map((u: any) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 text-sm bg-transparent transition-colors"
                      onClick={() => { setSelectedUserId(u.id); setSearchQuery(u.fullName); }}
                      data-testid={`option-user-${u.id}`}
                    >
                      {u.fullName} <span className="text-muted-foreground">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && !preIssueUserId && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => { setSelectedUserId(null); setSearchQuery(""); }} data-testid="button-clear-selection">
                  Clear selection
                </Button>
              )}
            </div>

            <div>
              <Label>Card Type</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger data-testid="trigger-card-type">
                  <SelectValue placeholder="Select a card to award" />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes?.filter(c => c.isActive).map((c) => {
                    const mat = getMetalMaterial(c.id);
                    const pat = c.designConfig?.pattern || "";
                    const Ic = CARD_ICONS[pat] || Award;
                    return (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center"
                            style={{ background: mat.base, boxShadow: mat.edgeHighlight }}
                          >
                            <Ic className="h-3 w-3" style={{ color: mat.textMain }} />
                          </div>
                          {c.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedCardId && cardTypes && (
                <div className="mt-3 flex justify-center">
                  <div className="relative" style={{ width: "180px", aspectRatio: "1.586", borderRadius: "20px" }}>
                    <MetalCardFront
                      cardId={cardTypes.find(c => String(c.id) === selectedCardId)!.id}
                      cardName={cardTypes.find(c => String(c.id) === selectedCardId)!.name}
                      pattern={cardTypes.find(c => String(c.id) === selectedCardId)!.designConfig?.pattern}
                      size="normal"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Rarity Level</Label>
              <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                <SelectTrigger data-testid="trigger-rarity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RARITY_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Personal Note (Optional)</Label>
              <Textarea
                placeholder="Add a personal message for the player..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-custom-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIssueDialogOpen(false); resetIssueForm(); }} data-testid="button-cancel-issue">Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedUserId || !selectedCardId) {
                  toast({ title: "Missing Fields", description: "Please select a player and card type.", variant: "destructive" });
                  return;
                }
                issueMutation.mutate({ userId: selectedUserId, cardId: parseInt(selectedCardId), customReason, rarityLevel: selectedRarity });
              }}
              disabled={!selectedUserId || !selectedCardId || issueMutation.isPending}
              data-testid="button-confirm-issue"
            >
              {issueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Award Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

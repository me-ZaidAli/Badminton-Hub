import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Award, Search, Gift, XCircle, ChevronDown, ChevronRight, CreditCard,
  LayoutGrid, User, Clock, PoundSterling, ArrowUpDown, AlertTriangle, CheckCircle,
  Timer, Zap, ShieldCheck, History
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
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
  expiresAt: string | null;
  cardIsActive: boolean;
  weeklyCreditValue: number;
  cardName: string;
  cardDescription: string;
  cardCategory: string;
  designConfig: any;
  recipientName: string;
  recipientEmail: string;
  issuerName: string | null;
};

const RARITY_LABELS: Record<string, { label: string; color: string; defaultCredit: number }> = {
  standard: { label: "Standard", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", defaultCredit: 1 },
  rare: { label: "Rare", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", defaultCredit: 2 },
  epic: { label: "Epic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", defaultCredit: 3.5 },
  legendary: { label: "Legendary", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", defaultCredit: 5 },
  mythic: { label: "Mythic", color: "bg-gradient-to-r from-rose-500 to-purple-500 text-white", defaultCredit: 7.5 },
};

function getCardStatus(card: IssuedCardRecord): "active" | "expired" | "revoked" {
  if (card.revokedAt) return "revoked";
  if (card.expiresAt && isPast(new Date(card.expiresAt))) return "expired";
  if (!card.cardIsActive) return "expired";
  return "active";
}

export default function RecognitionCards() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"gallery" | "active" | "expired" | "dashboard">("gallery");
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
  const [weeklyCreditInput, setWeeklyCreditInput] = useState("");

  const { data: cardTypes, isLoading: cardsLoading } = useQuery<CardRecord[]>({ queryKey: ["/api/admin/cards"] });
  const { data: allUsers } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: allIssuedCards, isLoading: issuedLoading, isError: issuedError } = useQuery<IssuedCardRecord[]>({
    queryKey: ["/api/admin/all-issued-cards"],
  });
  const { data: creditTransactions } = useQuery<any[]>({
    queryKey: ["/api/admin/card-credit-transactions"],
  });

  const issueMutation = useMutation({
    mutationFn: async (data: { userId: number; cardId: number; customReason: string; rarityLevel: string; weeklyCreditValue?: number }) => {
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

  const updateCreditMutation = useMutation({
    mutationFn: async ({ id, weeklyCreditValue }: { id: number; weeklyCreditValue: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/user-cards/${id}/weekly-credit`, { weeklyCreditValue });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Credit Value Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const issueCreditMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/user-cards/${id}/issue-credit`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Credit Issued", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/card-credit-transactions"] });
    },
    onError: (err: any) => {
      toast({ title: "Cannot Issue Credit", description: err.message, variant: "destructive" });
    },
  });

  const resetIssueForm = () => {
    setSelectedUserId(null);
    setSelectedCardId("");
    setSelectedRarity("standard");
    setCustomReason("");
    setSearchQuery("");
    setPreIssueUserId(null);
    setWeeklyCreditInput(String(RARITY_LABELS.standard.defaultCredit));
  };

  const poundsToDb = (pounds: string) => Math.round(parseFloat(pounds || "0") * 100);
  const dbToPounds = (pence: number) => (pence / 100).toFixed(2);

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

  const nonRevokedCards = useMemo(() => (allIssuedCards || []).filter(c => !c.revokedAt), [allIssuedCards]);
  const activeCards = useMemo(() => nonRevokedCards.filter(c => getCardStatus(c) === "active"), [nonRevokedCards]);
  const expiredCards = useMemo(() => nonRevokedCards.filter(c => getCardStatus(c) === "expired"), [nonRevokedCards]);

  const totalCreditsIssued = useMemo(() => creditTransactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0, [creditTransactions]);
  const weeklyLiability = useMemo(() => activeCards.filter(c => c.weeklyCreditValue > 0).reduce((sum, c) => sum + c.weeklyCreditValue, 0), [activeCards]);

  const groupCards = (cards: IssuedCardRecord[], search: string) => {
    const map = new Map<number, { userId: number; name: string; email: string; cards: IssuedCardRecord[] }>();
    for (const card of cards) {
      if (!map.has(card.userId)) {
        map.set(card.userId, { userId: card.userId, name: card.recipientName, email: card.recipientEmail, cards: [] });
      }
      map.get(card.userId)!.cards.push(card);
    }
    let groups = Array.from(map.values());
    if (search) {
      const q = search.toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q));
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  };

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-green-200 dark:border-green-800/40">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Cards</span>
          </div>
          <p className="text-xl font-black text-green-600 dark:text-green-400" data-testid="text-header-active">{activeCards.length}</p>
        </Card>
        <Card className="p-3 border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center gap-2 mb-1">
            <History className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Expired Cards</span>
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400" data-testid="text-header-expired">{expiredCards.length}</p>
        </Card>
        <Card className="p-3 border-emerald-200 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 mb-1">
            <PoundSterling className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Issued</span>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400" data-testid="text-header-credits-issued">£{(totalCreditsIssued / 100).toFixed(2)}</p>
        </Card>
        <Card className="p-3 border-violet-200 dark:border-violet-800/40">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-violet-500" />
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Weekly Owed</span>
          </div>
          <p className="text-xl font-black text-violet-600 dark:text-violet-400" data-testid="text-header-weekly-owed">£{(weeklyLiability / 100).toFixed(2)}</p>
        </Card>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto" data-testid="tabs-recognition">
        {[
          { key: "gallery" as const, label: "Card Gallery", icon: LayoutGrid, count: 0 },
          { key: "active" as const, label: "Active Cards", icon: CheckCircle, count: activeCards.length },
          { key: "expired" as const, label: "Expired Cards", icon: History, count: expiredCards.length },
          { key: "dashboard" as const, label: "Credits & Weekly Run", icon: PoundSterling, count: 0 },
        ].map(tab => (
          <button
            key={tab.key}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors bg-transparent whitespace-nowrap ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 border">
            <h3 className="font-semibold text-sm mb-2">Default Credit Values by Rarity</h3>
            <p className="text-xs text-muted-foreground mb-3">These values are automatically suggested when issuing a new card based on its rarity level.</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(RARITY_LABELS).map(([key, val]) => (
                <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background border">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${val.color}`}>{val.label}</span>
                  <span className="text-sm font-bold text-foreground">£{(val.defaultCredit / 100).toFixed(2)}</span>
                  <span className="text-[9px] text-muted-foreground">per week</span>
                </div>
              ))}
            </div>
          </div>
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
        </div>
      )}

      {activeTab === "active" && (
        <CardListView
          cards={activeCards}
          statusLabel="active"
          isLoading={issuedLoading}
          isError={issuedError}
          searchQuery={issuedSearchQuery}
          setSearchQuery={setIssuedSearchQuery}
          expandedPlayers={expandedPlayers}
          togglePlayer={togglePlayer}
          openIssueForUser={openIssueForUser}
          revokeMutation={revokeMutation}
          groupCards={groupCards}
          showRevoke
        />
      )}

      {activeTab === "expired" && (
        <CardListView
          cards={expiredCards}
          statusLabel="expired"
          isLoading={issuedLoading}
          isError={issuedError}
          searchQuery={issuedSearchQuery}
          setSearchQuery={setIssuedSearchQuery}
          expandedPlayers={expandedPlayers}
          togglePlayer={togglePlayer}
          openIssueForUser={openIssueForUser}
          revokeMutation={revokeMutation}
          groupCards={groupCards}
          showRevoke={false}
        />
      )}

      {activeTab === "dashboard" && (
        <CreditsDashboard
          activeCards={activeCards}
          allIssuedCards={nonRevokedCards}
          isLoading={issuedLoading}
          updateCreditMutation={updateCreditMutation}
          issueCreditMutation={issueCreditMutation}
          creditTransactions={creditTransactions || []}
          totalCreditsIssued={totalCreditsIssued}
          weeklyLiability={weeklyLiability}
          toast={toast}
        />
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
              <Select
                value={selectedRarity}
                onValueChange={(val) => {
                  setSelectedRarity(val);
                  const rarityConfig = RARITY_LABELS[val];
                  if (rarityConfig) {
                    setWeeklyCreditInput(String(rarityConfig.defaultCredit));
                  }
                }}
              >
                <SelectTrigger data-testid="trigger-rarity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RARITY_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label} (default £{(val.defaultCredit / 100).toFixed(2)}/wk)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Weekly Credit Value (pence)</Label>
              <Input
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 200 = £2.00"
                value={weeklyCreditInput}
                onChange={(e) => setWeeklyCreditInput(e.target.value)}
                data-testid="input-weekly-credit"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {weeklyCreditInput && parseInt(weeklyCreditInput) > 0
                  ? `= £${(parseInt(weeklyCreditInput) / 100).toFixed(2)} per week while card is active`
                  : "Leave empty for no credit reward"}
              </p>
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
                issueMutation.mutate({
                  userId: selectedUserId,
                  cardId: parseInt(selectedCardId),
                  customReason,
                  rarityLevel: selectedRarity,
                  weeklyCreditValue: weeklyCreditInput ? parseInt(weeklyCreditInput) : 0,
                });
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

function CardListView({
  cards, statusLabel, isLoading, isError, searchQuery, setSearchQuery,
  expandedPlayers, togglePlayer, openIssueForUser, revokeMutation, groupCards, showRevoke,
}: {
  cards: IssuedCardRecord[];
  statusLabel: string;
  isLoading: boolean;
  isError: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  expandedPlayers: Set<number>;
  togglePlayer: (id: number) => void;
  openIssueForUser: (id: number) => void;
  revokeMutation: any;
  groupCards: (cards: IssuedCardRecord[], search: string) => any[];
  showRevoke: boolean;
}) {
  const grouped = groupCards(cards, searchQuery);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players by name or email..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid={`input-search-${statusLabel}`}
          />
        </div>
        <span className="text-sm text-muted-foreground shrink-0">{cards.length} {statusLabel} cards</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-10 w-10 mx-auto text-destructive/50 mb-3" />
            <p className="text-sm text-muted-foreground">Failed to load cards. Please try again.</p>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No players match your search" : `No ${statusLabel} cards`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2" data-testid={`list-${statusLabel}-players`}>
          {grouped.map((group: any) => {
            const isExpanded = expandedPlayers.has(group.userId);
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
                    <Badge variant="secondary" className="text-[10px]">{group.cards.length} cards</Badge>
                    {showRevoke && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e: any) => { e.stopPropagation(); openIssueForUser(group.userId); }}
                        data-testid={`button-issue-to-${group.userId}`}
                      >
                        <Gift className="h-3 w-3 mr-1" />
                        Issue
                      </Button>
                    )}
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-2" data-testid={`player-cards-${group.userId}`}>
                    {group.cards.map((uc: IssuedCardRecord) => {
                      const rarity = RARITY_LABELS[uc.rarityLevel] || RARITY_LABELS.standard;
                      const mat = getMetalMaterial(uc.cardId);
                      const pattern = uc.designConfig?.pattern || "";
                      const IconComp = CARD_ICONS[pattern] || Award;
                      const status = getCardStatus(uc);

                      return (
                        <div
                          key={uc.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${status !== "active" ? "opacity-60 bg-muted/30" : ""}`}
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
                              {status === "expired" && <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Expired</Badge>}
                              {status === "revoked" && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
                              {status === "active" && <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {uc.serialNumber} · Issued {format(new Date(uc.issuedAt), "dd MMM yyyy")}
                              {uc.issuerName && ` by ${uc.issuerName}`}
                            </p>
                            {uc.expiresAt && (
                              <p className={`text-xs mt-0.5 ${status === "expired" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {status === "expired"
                                  ? `Expired ${format(new Date(uc.expiresAt), "dd MMM yyyy")}`
                                  : `Expires ${formatDistanceToNow(new Date(uc.expiresAt), { addSuffix: true })}`}
                              </p>
                            )}
                            {uc.weeklyCreditValue > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                <PoundSterling className="h-3 w-3 inline mr-1" />
                                £{(uc.weeklyCreditValue / 100).toFixed(2)}/week credit
                              </p>
                            )}
                            {uc.customReason && <p className="text-xs text-muted-foreground italic mt-0.5">{uc.customReason}</p>}
                          </div>
                          {showRevoke && status === "active" && (
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
  );
}

function CreditsDashboard({
  activeCards, allIssuedCards, isLoading, updateCreditMutation, issueCreditMutation,
  creditTransactions, totalCreditsIssued, weeklyLiability, toast,
}: {
  activeCards: IssuedCardRecord[];
  allIssuedCards: IssuedCardRecord[];
  isLoading: boolean;
  updateCreditMutation: any;
  issueCreditMutation: any;
  creditTransactions: any[];
  totalCreditsIssued: number;
  weeklyLiability: number;
  toast: any;
}) {
  const [selectedForWeekly, setSelectedForWeekly] = useState<Set<number>>(new Set());
  const [editingCreditId, setEditingCreditId] = useState<number | null>(null);
  const [editCreditValue, setEditCreditValue] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("");
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [batchResults, setBatchResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const eligibleCards = useMemo(() => {
    return activeCards
      .filter(c => c.weeklyCreditValue > 0)
      .filter(c => {
        if (rarityFilter !== "all" && c.rarityLevel !== rarityFilter) return false;
        if (userFilter) {
          const q = userFilter.toLowerCase();
          if (!c.recipientName.toLowerCase().includes(q) && !c.recipientEmail.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.weeklyCreditValue || 0) - (a.weeklyCreditValue || 0));
  }, [activeCards, rarityFilter, userFilter]);

  const selectedTotal = useMemo(() => {
    let total = 0;
    for (const card of eligibleCards) {
      if (selectedForWeekly.has(card.id)) {
        total += card.weeklyCreditValue;
      }
    }
    return total;
  }, [eligibleCards, selectedForWeekly]);

  const toggleCardSelection = (id: number) => {
    setSelectedForWeekly(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedForWeekly(new Set(eligibleCards.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedForWeekly(new Set());
  };

  const runWeeklyCredits = async () => {
    if (selectedForWeekly.size === 0) {
      toast({ title: "No Cards Selected", description: "Please select at least one card to issue credits.", variant: "destructive" });
      return;
    }
    setIsRunningBatch(true);
    setBatchResults(null);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const eligibleIds = new Set(eligibleCards.map(c => c.id));
    const toProcess = Array.from(selectedForWeekly).filter(id => eligibleIds.has(id));

    for (const cardId of toProcess) {
      try {
        await apiRequest("POST", `/api/admin/user-cards/${cardId}/issue-credit`);
        success++;
      } catch (err: any) {
        failed++;
        const card = eligibleCards.find(c => c.id === cardId);
        errors.push(`${card?.recipientName || "Unknown"} (${card?.cardName || ""}): ${err.message}`);
      }
    }

    setBatchResults({ success, failed, errors });
    setIsRunningBatch(false);
    setSelectedForWeekly(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/card-credit-transactions"] });

    if (success > 0) {
      toast({ title: "Weekly Credits Issued", description: `${success} credit(s) issued successfully${failed > 0 ? `, ${failed} failed` : ""}` });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-teal-500/10 dark:from-emerald-500/5 dark:via-green-500/3 dark:to-teal-500/5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-sm">Weekly Credit Run</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">
            {eligibleCards.length} eligible cards
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select which active cards should receive their weekly credit this week. Each card can only be credited once per week.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by player..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-9"
              data-testid="input-weekly-filter"
            />
          </div>
          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger className="w-[140px]" data-testid="trigger-weekly-rarity">
              <SelectValue placeholder="Rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarity</SelectItem>
              {Object.entries(RARITY_LABELS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {eligibleCards.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <PoundSterling className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No active cards with credit values set</p>
              <p className="text-xs text-muted-foreground mt-1">Issue cards with weekly credit values to use this feature</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAll} data-testid="button-select-all">
                Select All
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={deselectAll} data-testid="button-deselect-all">
                Deselect All
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {selectedForWeekly.size} selected · Total: <span className="font-bold text-emerald-600 dark:text-emerald-400">£{(selectedTotal / 100).toFixed(2)}</span>
              </span>
            </div>

            <div className="rounded-xl border overflow-hidden bg-background">
              <div className="max-h-[400px] overflow-y-auto">
                {eligibleCards.map((uc) => {
                  const rarity = RARITY_LABELS[uc.rarityLevel] || RARITY_LABELS.standard;
                  const mat = getMetalMaterial(uc.cardId);
                  const pattern = uc.designConfig?.pattern || "";
                  const IconComp = CARD_ICONS[pattern] || Award;
                  const isSelected = selectedForWeekly.has(uc.id);
                  const isEditing = editingCreditId === uc.id;

                  return (
                    <div
                      key={uc.id}
                      className={`flex items-center gap-3 p-3 border-b last:border-0 transition-colors ${isSelected ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/30"}`}
                      data-testid={`weekly-card-${uc.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCardSelection(uc.id)}
                        data-testid={`checkbox-${uc.id}`}
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: mat.base,
                          boxShadow: `${mat.edgeHighlight}, 0 2px 4px rgba(0,0,0,0.2)`,
                        }}
                      >
                        <IconComp className="h-4 w-4" style={{ color: mat.textMain }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{uc.recipientName}</span>
                          <span className="text-xs text-muted-foreground">· {uc.cardName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
                        </div>
                        {uc.expiresAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                            Expires {formatDistanceToNow(new Date(uc.expiresAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="50"
                              value={editCreditValue}
                              onChange={(e) => setEditCreditValue(e.target.value)}
                              className="h-7 w-20 text-xs"
                              placeholder="pence"
                              data-testid={`input-edit-credit-${uc.id}`}
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              disabled={updateCreditMutation.isPending}
                              onClick={() => {
                                const val = parseInt(editCreditValue) || 0;
                                updateCreditMutation.mutate({ id: uc.id, weeklyCreditValue: val });
                                setEditingCreditId(null);
                              }}
                              data-testid={`button-save-credit-${uc.id}`}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setEditingCreditId(null)}>
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            className="text-sm font-bold bg-transparent hover:underline cursor-pointer text-emerald-600 dark:text-emerald-400"
                            onClick={() => {
                              setEditingCreditId(uc.id);
                              setEditCreditValue(String(uc.weeklyCreditValue || 0));
                            }}
                            data-testid={`button-edit-credit-${uc.id}`}
                          >
                            £{(uc.weeklyCreditValue / 100).toFixed(2)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-bold">{selectedForWeekly.size} cards</span>
                <span className="text-muted-foreground"> · Total: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">£{(selectedTotal / 100).toFixed(2)}</span>
              </div>
              <Button
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold border-0"
                disabled={selectedForWeekly.size === 0 || isRunningBatch}
                onClick={runWeeklyCredits}
                data-testid="button-run-weekly-credits"
              >
                {isRunningBatch ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Issue Weekly Credits
              </Button>
            </div>

            {batchResults && (
              <Card className={`mt-3 ${batchResults.failed > 0 ? "border-amber-300 dark:border-amber-700" : "border-green-300 dark:border-green-700"}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {batchResults.failed === 0 ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-bold">
                      {batchResults.success} issued, {batchResults.failed} failed
                    </span>
                  </div>
                  {batchResults.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {batchResults.errors.map((err, i) => (
                        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">{err}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {creditTransactions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-amber-500" />
            Credit Transaction History
          </h3>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm" data-testid="table-credit-transactions">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-bold text-xs uppercase text-muted-foreground">Player</th>
                  <th className="text-left p-3 font-bold text-xs uppercase text-muted-foreground">Card</th>
                  <th className="text-left p-3 font-bold text-xs uppercase text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-bold text-xs uppercase text-muted-foreground">Issued By</th>
                  <th className="text-left p-3 font-bold text-xs uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {creditTransactions.slice(0, 30).map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0" data-testid={`transaction-row-${t.id}`}>
                    <td className="p-3 font-medium">{t.recipientName}</td>
                    <td className="p-3 text-muted-foreground">{t.cardName}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">£{(t.amount / 100).toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">{t.issuerName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(t.createdAt), "dd MMM yyyy HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

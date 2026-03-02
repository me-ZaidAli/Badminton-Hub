import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Award, Search, Gift, XCircle, Users } from "lucide-react";
import { format } from "date-fns";

type CardRecord = {
  id: number;
  name: string;
  description: string;
  cardCategory: string;
  designConfig: { gradient: string; textColor: string; accentColor: string; pattern?: string } | null;
  isActive: boolean;
};

type UserCardRecord = {
  id: number;
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
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedRarity, setSelectedRarity] = useState("standard");
  const [customReason, setCustomReason] = useState("");
  const [viewUserId, setViewUserId] = useState<number | null>(null);

  const { data: cardTypes, isLoading: cardsLoading } = useQuery<CardRecord[]>({ queryKey: ["/api/admin/cards"] });
  const { data: allUsers } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: userCardsList } = useQuery<UserCardRecord[]>({
    queryKey: ["/api/admin/user-cards", viewUserId],
    enabled: viewUserId !== null,
  });

  const issueMutation = useMutation({
    mutationFn: async (data: { userId: number; cardId: number; customReason: string; rarityLevel: string }) => {
      await apiRequest("POST", "/api/admin/user-cards", data);
    },
    onSuccess: () => {
      toast({ title: "Card Issued", description: "Recognition card has been awarded successfully." });
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
  };

  const filteredUsers = allUsers?.filter((u: any) =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10) || [];

  if (cardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-recognition-cards-title">
            <Award className="h-6 w-6 text-amber-500" />
            Recognition Cards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Award recognition cards to players for character, leadership, and contribution</p>
        </div>
        <Button onClick={() => setIssueDialogOpen(true)} data-testid="button-issue-card">
          <Gift className="h-4 w-4 mr-2" />
          Issue Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cardTypes?.map((card) => {
          const gradient = card.designConfig?.gradient || "from-gray-500 to-gray-700";
          return (
            <Card key={card.id} className="overflow-hidden" data-testid={`card-type-${card.id}`}>
              <div className={`bg-gradient-to-r ${gradient} p-3`}>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-white" />
                  <span className="text-white font-semibold text-sm">{card.name}</span>
                </div>
              </div>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-[10px]">{card.cardCategory}</Badge>
                  <Badge variant={card.isActive ? "default" : "secondary"} className="text-[10px]">{card.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            View Player Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select onValueChange={(v) => setViewUserId(parseInt(v))} data-testid="select-view-user">
              <SelectTrigger className="w-full" data-testid="trigger-view-user">
                <SelectValue placeholder="Select a player to view their cards" />
              </SelectTrigger>
              <SelectContent>
                {allUsers?.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {viewUserId && userCardsList && (
            <div className="space-y-2">
              {userCardsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No cards issued to this player yet</p>
              ) : (
                userCardsList.map((uc) => {
                  const rarity = RARITY_LABELS[uc.rarityLevel] || RARITY_LABELS.standard;
                  return (
                    <div key={uc.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`user-card-${uc.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{uc.cardName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
                          {uc.revokedAt && <Badge variant="destructive" className="text-[10px]">Revoked</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {uc.serialNumber} · Issued {format(new Date(uc.issuedAt), "dd MMM yyyy")}
                          {uc.issuerName && ` by ${uc.issuerName}`}
                        </p>
                        {uc.customReason && <p className="text-xs text-muted-foreground italic mt-0.5">{uc.customReason}</p>}
                      </div>
                      {!uc.revokedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => revokeMutation.mutate(uc.id)}
                          disabled={revokeMutation.isPending}
                          data-testid={`button-revoke-${uc.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
              {selectedUserId && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => { setSelectedUserId(null); setSearchQuery(""); }}>
                  Clear selection
                </Button>
              )}
            </div>

            <div>
              <Label>Card Type</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId} data-testid="select-card-type">
                <SelectTrigger data-testid="trigger-card-type">
                  <SelectValue placeholder="Select a card to award" />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes?.filter(c => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rarity Level</Label>
              <Select value={selectedRarity} onValueChange={setSelectedRarity} data-testid="select-rarity">
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

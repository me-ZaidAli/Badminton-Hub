import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, CreditCard, Users, Shield, Crown, Sparkles, ChevronLeft,
  Loader2, CheckCircle, XCircle, Filter, Gift, Award, LayoutGrid, List,
  User, ChevronDown, ChevronRight, Star
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { MetalCardFront, getMetalMaterial, CARD_ICONS } from "@/components/MetalCard";

interface UserWithProfiles {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  city?: string;
  country?: string;
  blackCardAccess?: boolean;
  profilePictureUrl?: string;
  playerProfiles: {
    id: number;
    clubId: number;
    clubRole: string;
    grade?: string;
    club?: { name: string };
  }[];
}

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

type TabType = "cards" | "assign" | "assigned";

export default function BlackCardManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("cards");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "OWNER" | "ADMIN" | "PLAYER">("all");

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedRarity, setSelectedRarity] = useState("standard");
  const [customReason, setCustomReason] = useState("");
  const [preIssueUserId, setPreIssueUserId] = useState<number | null>(null);

  const [issuedSearchQuery, setIssuedSearchQuery] = useState("");
  const [expandedPlayers, setExpandedPlayers] = useState<Set<number>>(new Set());
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  const { data: allUsers, isLoading: usersLoading } = useQuery<UserWithProfiles[]>({
    queryKey: ["/api/users"],
  });

  const { data: cardTypes, isLoading: cardsLoading } = useQuery<CardRecord[]>({
    queryKey: ["/api/admin/cards"],
  });

  const { data: allIssuedCards, isLoading: issuedLoading, isError: issuedError } = useQuery<IssuedCardRecord[]>({
    queryKey: ["/api/admin/all-issued-cards"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: number; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/black-card`, {
        blackCardAccess: enabled,
      });
      if (!res.ok) throw new Error("Failed to update Black Card access");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: variables.enabled ? "Black Card Granted" : "Black Card Revoked",
        description: variables.enabled
          ? "User now has access to Ultra Exclusive themes"
          : "Ultra Exclusive theme access has been removed",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Black Card access", variant: "destructive" });
    },
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
    setPlayerSearchQuery("");
    setPreIssueUserId(null);
  };

  const openIssueForUser = (userId: number) => {
    const u = allUsers?.find((u) => u.id === userId);
    setPreIssueUserId(userId);
    setSelectedUserId(userId);
    setPlayerSearchQuery(u?.fullName || "");
    setIssueDialogOpen(true);
  };

  const openIssueForCard = (cardId: number) => {
    resetIssueForm();
    setSelectedCardId(String(cardId));
    setIssueDialogOpen(true);
  };

  const filteredAssignUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !u.fullName?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q) &&
          !u.city?.toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter === "active" && !u.blackCardAccess) return false;
      if (statusFilter === "inactive" && u.blackCardAccess) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      return true;
    });
  }, [allUsers, searchQuery, statusFilter, roleFilter]);

  const dialogFilteredUsers = useMemo(() => {
    if (!allUsers || !playerSearchQuery) return [];
    return allUsers.filter((u) =>
      u.fullName?.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(playerSearchQuery.toLowerCase())
    ).slice(0, 10);
  }, [allUsers, playerSearchQuery]);

  const togglePlayer = (userId: number) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const groupedByPlayer = useMemo(() => {
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
  }, [allIssuedCards, issuedSearchQuery]);

  const totalHolders = allUsers?.filter((u) => u.blackCardAccess).length || 0;
  const totalMembers = allUsers?.length || 0;
  const totalIssued = allIssuedCards?.length || 0;
  const totalActive = allIssuedCards?.filter(c => !c.revokedAt).length || 0;

  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Access restricted to Admins and Owners.</p>
      </div>
    );
  }

  const TABS: { id: TabType; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: "cards", label: "All Cards", icon: LayoutGrid },
    { id: "assign", label: "Black Card Access", icon: Crown },
    { id: "assigned", label: "Assigned Cards", icon: List, badge: totalActive },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2" data-testid="text-black-card-title">
            <CreditCard className="h-7 w-7" />
            Card Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all recognition cards, Black Card access, and player awards
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Shield className="h-4 w-4 mr-2" />
          {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Card Types</span>
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold" data-testid="value-card-types">{cardTypes?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Black Card Holders</span>
              <Crown className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-500" data-testid="value-holders-count">{totalHolders}</div>
            <p className="text-[10px] text-muted-foreground">of {totalMembers}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Cards Issued</span>
              <Gift className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-500" data-testid="value-issued-count">{totalIssued}</div>
            <p className="text-[10px] text-muted-foreground">{totalActive} active</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Exclusive Themes</span>
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-sm font-medium text-purple-400 leading-tight">3 Ultra Exclusive</div>
            <p className="text-[10px] text-muted-foreground">Black Card only</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b" data-testid="tabs-card-management">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors bg-transparent ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">{tab.badge}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {cardTypes?.length || 0} recognition cards available. Tap a card to see details or assign it.
            </p>
            <Button size="sm" onClick={() => { resetIssueForm(); setIssueDialogOpen(true); }} data-testid="button-issue-card-top">
              <Gift className="h-4 w-4 mr-2" />
              Issue Card
            </Button>
          </div>

          {cardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {cardTypes?.map((card) => {
                const isExpanded = expandedCardId === card.id;
                const issuedCount = allIssuedCards?.filter(ic => ic.cardId === card.id && !ic.revokedAt).length || 0;

                return (
                  <div key={card.id} className="space-y-2" data-testid={`card-type-${card.id}`}>
                    <button
                      className="w-full bg-transparent border-0 p-0 cursor-pointer group"
                      onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                      data-testid={`button-card-preview-${card.id}`}
                    >
                      <div className="relative" style={{ aspectRatio: "1.586", borderRadius: "20px" }}>
                        <MetalCardFront
                          cardId={card.id}
                          cardName={card.name}
                          pattern={card.designConfig?.pattern}
                          size="compact"
                        />
                        {issuedCount > 0 && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {issuedCount}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="px-1">
                      <p className="text-xs font-medium truncate">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{issuedCount} assigned</p>
                    </div>

                    {isExpanded && (
                      <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-2 border border-border/50" data-testid={`card-details-${card.id}`}>
                        <p className="text-muted-foreground leading-relaxed">{card.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px]">
                            {card.cardCategory === "admin_gifted" ? "Admin Gifted" : card.cardCategory}
                          </Badge>
                          <Badge variant={card.isActive ? "default" : "secondary"} className="text-[9px]">
                            {card.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); openIssueForCard(card.id); }}
                          data-testid={`button-assign-card-${card.id}`}
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Assign to Player
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "assign" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            <div className="relative overflow-hidden rounded-2xl mx-auto w-full" data-testid="card-black-card-showcase"
              style={{
                background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 30%, #1e1e1e 50%, #252525 70%, #1a1a1a 100%)",
                boxShadow: "0 0 0 2px #b8860b, 0 0 0 3px rgba(184,134,11,0.3), 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)",
                aspectRatio: "1.586",
                maxWidth: "380px",
              }}>
              <div className="absolute inset-0 rounded-2xl" style={{
                background: "repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)",
              }} />
              <div className="absolute inset-0 rounded-2xl" style={{
                background: "radial-gradient(ellipse at 30% 20%, rgba(184,134,11,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.05) 0%, transparent 40%)",
              }} />
              <div className="absolute inset-[2px] rounded-2xl border border-amber-700/20" />
              <div className="relative h-full flex flex-col justify-between p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold tracking-[0.08em]" style={{ color: "#c5a044" }}>BLACK CARD</p>
                    <p className="text-[10px] uppercase tracking-[0.25em] mt-0.5 font-medium" style={{ color: "#9a7d2e" }}>Titanium Gold Member</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
                    background: "linear-gradient(135deg, #c5a044, #8b6914)",
                    boxShadow: "0 2px 8px rgba(184,134,11,0.3)",
                  }}>
                    <Crown className="h-4 w-4" style={{ color: "#1a1a1a" }} />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-[9px] uppercase tracking-[0.2em] font-medium" style={{ color: "#7a6420" }}>Ultra Exclusive Access</p>
                  <p className="text-[10px] font-mono tracking-wider" style={{ color: "#9a7d2e" }}>
                    {totalHolders} HOLDER{totalHolders !== 1 ? "S" : ""}
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-border/40 content-center">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Black Card unlocks</p>
                  <div className="text-sm font-medium text-purple-400">Midnight Neon · Cosmic Elite · Phantom Luxe</div>
                  <p className="text-[10px] text-muted-foreground mt-1">Invite-only Ultra Exclusive tier themes</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Access control</p>
                  <p className="text-[11px] text-muted-foreground">Only OWNER can grant or revoke Black Card access using the toggle below.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-black-card-filters">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-members"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-44" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="active">Black Card Holders</SelectItem>
                    <SelectItem value="inactive">No Black Card</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-role-filter">
                    <Shield className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="PLAYER">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredAssignUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No members match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5" data-testid="list-black-card-members">
              {filteredAssignUsers.map((member) => (
                <Card key={member.id} className="border-border/40" data-testid={`row-member-${member.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        {member.profilePictureUrl ? (
                          <AvatarImage src={member.profilePictureUrl} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {member.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                            {member.fullName}
                          </p>
                          {member.blackCardAccess && (
                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] hidden sm:flex">{member.role}</Badge>
                        {member.blackCardAccess ? (
                          <Badge className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white border-0 text-[10px]" data-testid={`badge-black-card-active-${member.id}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground" data-testid={`badge-black-card-inactive-${member.id}`}>
                            None
                          </Badge>
                        )}
                        {user?.role === "OWNER" ? (
                          <Switch
                            checked={!!member.blackCardAccess}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ userId: member.id, enabled: checked })
                            }
                            disabled={toggleMutation.isPending}
                            data-testid={`switch-black-card-${member.id}`}
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Owner only</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "assigned" && (
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
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span data-testid="text-total-issued">{totalIssued} total</span>
                <span className="text-emerald-500" data-testid="text-total-active">{totalActive} active</span>
                {totalIssued - totalActive > 0 && (
                  <span className="text-destructive/70">{totalIssued - totalActive} revoked</span>
                )}
              </div>
              <Button size="sm" onClick={() => { resetIssueForm(); setIssueDialogOpen(true); }} data-testid="button-issue-card-assigned">
                <Gift className="h-4 w-4 mr-1" />
                Issue
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { resetIssueForm(); setIssueDialogOpen(true); }}
                  data-testid="button-issue-first-card"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Issue First Card
                </Button>
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
                        <p className="text-[11px] text-muted-foreground truncate">{group.email}</p>
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
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {uc.serialNumber} · Issued {format(new Date(uc.issuedAt), "dd MMM yyyy")}
                                  {uc.issuerName && ` by ${uc.issuerName}`}
                                </p>
                                {uc.customReason && <p className="text-[11px] text-muted-foreground italic mt-0.5 truncate">{uc.customReason}</p>}
                                {uc.revokedAt && <p className="text-[11px] text-destructive mt-0.5">Revoked {format(new Date(uc.revokedAt), "dd MMM yyyy")}</p>}
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
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-player"
                  disabled={!!preIssueUserId}
                />
              </div>
              {playerSearchQuery && dialogFilteredUsers.length > 0 && !selectedUserId && (
                <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                  {dialogFilteredUsers.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 text-sm bg-transparent transition-colors hover:bg-muted/50"
                      onClick={() => { setSelectedUserId(u.id); setPlayerSearchQuery(u.fullName); }}
                      data-testid={`option-user-${u.id}`}
                    >
                      {u.fullName} <span className="text-muted-foreground">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUserId && !preIssueUserId && (
                <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => { setSelectedUserId(null); setPlayerSearchQuery(""); }} data-testid="button-clear-selection">
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
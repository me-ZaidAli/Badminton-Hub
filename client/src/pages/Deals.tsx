import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tag, Search, Plus, Pencil, Trash2, ExternalLink, Clock, Building2,
  Percent, Copy, Check, Loader2, X, ShoppingBag, Gift,
  Calendar, AlertTriangle, MoreVertical, Eye, EyeOff,
  Utensils, Dumbbell, Wrench, ShoppingCart, Star, Flame, Sparkles,
  Timer, Heart, ChevronLeft, Zap, Crown, ArrowRight,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isPast, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const DEAL_CATEGORIES = [
  { id: "all", label: "All Deals", icon: ShoppingBag, gradient: "from-violet-600 to-indigo-700", emoji: "🛍️" },
  { id: "food", label: "Food & Drink", icon: Utensils, gradient: "from-orange-500 to-red-600", emoji: "🍕" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, gradient: "from-emerald-500 to-teal-600", emoji: "💪" },
  { id: "services", label: "Services", icon: Wrench, gradient: "from-blue-500 to-cyan-600", emoji: "🔧" },
  { id: "equipment", label: "Equipment", icon: ShoppingCart, gradient: "from-amber-500 to-orange-600", emoji: "🏸" },
  { id: "wellness", label: "Wellness", icon: Heart, gradient: "from-pink-500 to-rose-600", emoji: "🧘" },
  { id: "travel", label: "Travel", icon: Star, gradient: "from-sky-500 to-blue-600", emoji: "✈️" },
  { id: "other", label: "Other", icon: Gift, gradient: "from-purple-500 to-fuchsia-600", emoji: "🎁" },
] as const;

const FILTER_CHIPS = [
  { id: "all", label: "All" },
  { id: "10plus", label: "10%+" },
  { id: "20plus", label: "20%+" },
  { id: "50plus", label: "50%+" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "new", label: "New" },
] as const;

interface DiscountCodeItem {
  id: number;
  clubId: number;
  code: string;
  description: string | null;
  discountPercent: number | null;
  shopName: string | null;
  shopUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  assignments?: Array<{ id: number; userId: number | null; appliesToAll: boolean; fullName: string | null }>;
}

interface MemberDeal {
  codeId: number;
  code: string;
  description: string | null;
  discountPercent: number | null;
  shopName: string | null;
  shopUrl: string | null;
  imageUrl: string | null;
  category: string | null;
  validUntil: string | null;
  clubId: number;
  clubName: string | null;
}

interface MemberDiscountGroup {
  clubId: number;
  clubName: string;
  codes: MemberDeal[];
}

function CountdownTimer({ validUntil }: { validUntil: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(validUntil);
  if (isPast(target)) return <span className="text-red-400 font-semibold">Expired</span>;

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  if (days > 30) return <span>Expires {format(target, "dd MMM yyyy")}</span>;

  return (
    <div className="flex items-center gap-1.5">
      <Timer className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
      <div className="flex gap-1 font-mono text-xs font-bold">
        {days > 0 && <span className="bg-white/10 dark:bg-white/5 px-1.5 py-0.5 rounded">{days}d</span>}
        <span className="bg-white/10 dark:bg-white/5 px-1.5 py-0.5 rounded">{hours}h</span>
        <span className="bg-white/10 dark:bg-white/5 px-1.5 py-0.5 rounded">{minutes}m</span>
      </div>
    </div>
  );
}

export default function Deals() {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [selectedAdminClub, setSelectedAdminClub] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [savedDeals, setSavedDeals] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("saved_deals");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DiscountCodeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPercent, setFormPercent] = useState("");
  const [formShopName, setFormShopName] = useState("");
  const [formShopUrl, setFormShopUrl] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formCategory, setFormCategory] = useState("other");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formClubId, setFormClubId] = useState<string>("");
  const [formAppliesToAll, setFormAppliesToAll] = useState(true);

  const canManage = adminClubs && adminClubs.length > 0;
  const managedClubIds = useMemo(() => new Set(adminClubs?.map((c: any) => c.id) || []), [adminClubs]);

  const { data: memberDeals = [], isLoading: memberLoading } = useQuery<MemberDiscountGroup[]>({
    queryKey: ["/api/my-discount-codes"],
  });

  const adminClubId = selectedAdminClub === "all" ? adminClubs?.[0]?.id : Number(selectedAdminClub);
  const adminQueryUrl = adminClubId ? `/api/clubs/${adminClubId}/discount-codes` : null;

  const { data: adminDeals = [], isLoading: adminLoading } = useQuery<DiscountCodeItem[]>({
    queryKey: [adminQueryUrl],
    enabled: !!adminQueryUrl && activeTab === "manage",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clubs/${data.clubId}/discount-codes`, data);
      return res.json();
    },
    onSuccess: (newCode: any) => {
      if (formAppliesToAll) {
        assignMutation.mutate({ codeId: newCode.id, appliesToAll: true, userIds: [] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Created", description: "New discount has been added." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/discount-codes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Updated", description: "Discount has been updated." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discount-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Deleted", description: "Discount has been removed." });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ codeId, appliesToAll, userIds }: { codeId: number; appliesToAll: boolean; userIds: number[] }) => {
      const res = await apiRequest("POST", `/api/discount-codes/${codeId}/assign`, { appliesToAll, userIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDeal(null);
    setFormCode("");
    setFormDescription("");
    setFormPercent("");
    setFormShopName("");
    setFormShopUrl("");
    setFormImageUrl("");
    setFormCategory("other");
    setFormValidUntil("");
    setFormIsActive(true);
    setFormClubId("");
    setFormAppliesToAll(true);
  };

  const openCreate = () => {
    closeDialog();
    if (adminClubs && adminClubs.length > 0) {
      setFormClubId(String(adminClubs[0].id));
    }
    setDialogOpen(true);
  };

  const openEdit = (deal: DiscountCodeItem) => {
    setEditingDeal(deal);
    setFormCode(deal.code);
    setFormDescription(deal.description || "");
    setFormPercent(deal.discountPercent ? String(deal.discountPercent) : "");
    setFormShopName(deal.shopName || "");
    setFormShopUrl(deal.shopUrl || "");
    setFormImageUrl(deal.imageUrl || "");
    setFormCategory(deal.category || "other");
    setFormValidUntil(deal.validUntil ? format(new Date(deal.validUntil), "yyyy-MM-dd") : "");
    setFormIsActive(deal.isActive);
    setFormClubId(String(deal.clubId));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim()) {
      toast({ title: "Error", description: "Code is required.", variant: "destructive" });
      return;
    }
    const payload: any = {
      code: formCode.trim().toUpperCase(),
    };
    if (formDescription.trim()) payload.description = formDescription.trim();
    if (formPercent) payload.discountPercent = parseInt(formPercent);
    if (formShopName.trim()) payload.shopName = formShopName.trim();
    if (formShopUrl.trim()) payload.shopUrl = formShopUrl.trim();
    if (formImageUrl.trim()) payload.imageUrl = formImageUrl.trim();
    payload.category = formCategory;
    if (formValidUntil) payload.validUntil = formValidUntil;
    if (editingDeal) {
      if (!formDescription.trim()) payload.description = null;
      if (!formPercent) payload.discountPercent = null;
      if (!formShopName.trim()) payload.shopName = null;
      if (!formShopUrl.trim()) payload.shopUrl = null;
      if (!formImageUrl.trim()) payload.imageUrl = null;
      if (!formValidUntil) payload.validUntil = null;
      payload.isActive = formIsActive;
      updateMutation.mutate({ id: editingDeal.id, ...payload });
    } else {
      payload.clubId = parseInt(formClubId);
      createMutation.mutate(payload);
    }
  };

  const copyCode = useCallback((code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast({ title: "Copied ✅", description: `Code "${code}" copied to clipboard.` });
    setTimeout(() => setCopiedCode(null), 2000);
  }, [toast]);

  const toggleSaved = useCallback((id: number) => {
    setSavedDeals(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      localStorage.setItem("saved_deals", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const allMemberCodes = useMemo(() => {
    return memberDeals.flatMap(g => g.codes.map(c => ({ ...c, clubName: g.clubName })));
  }, [memberDeals]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allMemberCodes.length };
    allMemberCodes.forEach(c => {
      const cat = c.category || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allMemberCodes]);

  const filteredMemberCodes = useMemo(() => {
    let codes = allMemberCodes;
    if (selectedCategory && selectedCategory !== "all") {
      codes = codes.filter(c => (c.category || "other") === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      codes = codes.filter(c =>
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.shopName && c.shopName.toLowerCase().includes(q)) ||
        (c.clubName && c.clubName.toLowerCase().includes(q))
      );
    }
    if (activeFilter === "10plus") codes = codes.filter(c => (c.discountPercent || 0) >= 10);
    else if (activeFilter === "20plus") codes = codes.filter(c => (c.discountPercent || 0) >= 20);
    else if (activeFilter === "50plus") codes = codes.filter(c => (c.discountPercent || 0) >= 50);
    else if (activeFilter === "expiring") {
      codes = codes.filter(c => c.validUntil && !isPast(new Date(c.validUntil)) && differenceInDays(new Date(c.validUntil), new Date()) <= 14);
    } else if (activeFilter === "new") {
      codes = codes.filter(c => {
        if (!c.validUntil) return true;
        return !isPast(new Date(c.validUntil));
      });
      codes = codes.slice(0, 10);
    }
    return codes;
  }, [allMemberCodes, selectedCategory, searchQuery, activeFilter]);

  const featuredDeal = useMemo(() => {
    if (filteredMemberCodes.length === 0) return null;
    const withDiscount = filteredMemberCodes.filter(c => (c.discountPercent || 0) >= 20 && c.validUntil && !isPast(new Date(c.validUntil)));
    if (withDiscount.length > 0) return withDiscount[0];
    return filteredMemberCodes[0];
  }, [filteredMemberCodes]);

  const filteredAdminDeals = useMemo(() => {
    if (!searchQuery.trim()) return adminDeals;
    const q = searchQuery.toLowerCase();
    return adminDeals.filter(d =>
      d.code.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.shopName && d.shopName.toLowerCase().includes(q))
    );
  }, [adminDeals, searchQuery]);

  if (selectedCategory === null && activeTab === "browse") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent" data-testid="text-deals-title">
                  Deals & Offers
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Exclusive discounts from your clubs
                </p>
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <Button onClick={() => { setActiveTab("manage"); setSelectedCategory("all"); }} variant="outline" size="sm" data-testid="button-manage-deals">
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Manage
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {memberLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
            </div>
          ) : allMemberCodes.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Gift className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold">No Deals Available</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    There are no active discounts or offers for your clubs right now. Check back later!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {DEAL_CATEGORIES.map((cat, index) => {
                const count = categoryCounts[cat.id] || 0;
                if (cat.id !== "all" && count === 0) return null;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <button
                      className={`relative w-full h-40 sm:h-48 rounded-3xl overflow-hidden bg-gradient-to-br ${cat.gradient} shadow-lg hover:shadow-xl transition-shadow group cursor-pointer`}
                      onClick={() => setSelectedCategory(cat.id)}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <motion.div
                        className="absolute top-3 right-3 text-4xl sm:text-5xl opacity-30 group-hover:opacity-50 transition-opacity"
                        animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                      >
                        {cat.emoji}
                      </motion.div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-1">
                          <cat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" />
                          <span className="text-white font-bold text-base sm:text-lg">{cat.label}</span>
                        </div>
                        <p className="text-white/70 text-xs sm:text-sm">
                          {cat.id === "all" ? `${count} deals available` : `${count} deal${count !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div className="absolute top-3 left-3">
                        <div className="backdrop-blur-sm bg-white/15 rounded-full px-2.5 py-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-white/90" />
                          <span className="text-white text-[10px] font-semibold uppercase tracking-wider">
                            {cat.id === "all" ? "Browse" : "Explore"}
                          </span>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {canManage ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {activeTab === "browse" && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-back-categories"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Categories
                  </motion.button>
                )}
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent"
                  data-testid="text-deals-title"
                >
                  {activeTab === "manage" ? "Manage Deals" : (
                    selectedCategory && selectedCategory !== "all"
                      ? DEAL_CATEGORIES.find(c => c.id === selectedCategory)?.label || "Deals"
                      : "All Deals"
                  )}
                </motion.h1>
              </div>
              <div className="flex items-center gap-2">
                <TabsList className="bg-muted/50 backdrop-blur-sm" data-testid="tabs-deals">
                  <TabsTrigger value="browse" data-testid="tab-browse">
                    <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                    Browse
                  </TabsTrigger>
                  <TabsTrigger value="manage" data-testid="tab-manage">
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Manage
                  </TabsTrigger>
                </TabsList>
                {activeTab === "manage" && (
                  <Button onClick={openCreate} size="sm" className="bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-md" data-testid="button-add-deal">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Deal
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="browse" className="mt-4 space-y-4">
              <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
              <PremiumDealsGrid
                codes={filteredMemberCodes}
                isLoading={memberLoading}
                copiedCode={copiedCode}
                onCopy={copyCode}
                flippedCard={flippedCard}
                setFlippedCard={setFlippedCard}
                savedDeals={savedDeals}
                toggleSaved={toggleSaved}
                featuredDeal={featuredDeal}
              />
            </TabsContent>

            <TabsContent value="manage" className="mt-4 space-y-4">
              <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              {adminClubs && adminClubs.length > 1 && (
                <Select value={selectedAdminClub} onValueChange={setSelectedAdminClub}>
                  <SelectTrigger className="w-64 backdrop-blur-sm bg-card/50" data-testid="select-admin-club">
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <AdminDealsView
                deals={filteredAdminDeals}
                isLoading={adminLoading}
                onEdit={openEdit}
                onDelete={setDeleteConfirmId}
                onToggleActive={(deal) => updateMutation.mutate({ id: deal.id, isActive: !deal.isActive })}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-categories"
              >
                <ChevronLeft className="h-4 w-4" />
                Categories
              </motion.button>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent"
                data-testid="text-deals-title"
              >
                {selectedCategory && selectedCategory !== "all"
                  ? DEAL_CATEGORIES.find(c => c.id === selectedCategory)?.label || "Deals"
                  : "All Deals"}
              </motion.h1>
            </div>
            <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <FilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
            <PremiumDealsGrid
              codes={filteredMemberCodes}
              isLoading={memberLoading}
              copiedCode={copiedCode}
              onCopy={copyCode}
              flippedCard={flippedCard}
              setFlippedCard={setFlippedCard}
              savedDeals={savedDeals}
              toggleSaved={toggleSaved}
              featuredDeal={featuredDeal}
            />
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
            <DialogDescription>
              {editingDeal ? "Update the discount or offer details." : "Create a new discount code or offer for your members."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingDeal && adminClubs && adminClubs.length > 1 && (
              <div className="space-y-1.5">
                <Label>Club</Label>
                <Select value={formClubId} onValueChange={setFormClubId}>
                  <SelectTrigger data-testid="select-form-club">
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g. SUMMER25"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  data-testid="input-form-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 20"
                  value={formPercent}
                  onChange={(e) => setFormPercent(e.target.value)}
                  data-testid="input-form-percent"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger data-testid="select-form-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_CATEGORIES.filter(c => c.id !== "all").map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the offer..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                data-testid="input-form-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shop / Brand Name</Label>
                <Input
                  placeholder="e.g. Yonex UK"
                  value={formShopName}
                  onChange={(e) => setFormShopName(e.target.value)}
                  data-testid="input-form-shop-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shop URL</Label>
                <Input
                  placeholder="https://..."
                  value={formShopUrl}
                  onChange={(e) => setFormShopUrl(e.target.value)}
                  data-testid="input-form-shop-url"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                placeholder="https://... (product or brand image)"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                data-testid="input-form-image-url"
              />
              {isSafeUrl(formImageUrl) && (
                <div className="relative mt-2 rounded-2xl overflow-hidden border border-border/50 h-32">
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                    onClick={() => setFormImageUrl("")}
                    data-testid="button-clear-image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  data-testid="input-form-valid-until"
                />
              </div>
              {editingDeal && (
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formIsActive}
                      onCheckedChange={setFormIsActive}
                      data-testid="switch-form-active"
                    />
                    <Label className="text-sm">{formIsActive ? "Active" : "Inactive"}</Label>
                  </div>
                </div>
              )}
            </div>
            {!editingDeal && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={formAppliesToAll}
                  onCheckedChange={setFormAppliesToAll}
                  data-testid="switch-form-applies-all"
                />
                <Label className="text-sm">Available to all club members</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-deal">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-primary to-violet-600"
              data-testid="button-save-deal"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingDeal ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StickySearchBar({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 pt-1 pb-2 bg-gradient-to-b from-background via-background to-transparent"
    >
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search deals, brands, or discounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 pr-10 h-12 rounded-2xl border-border/40 bg-card/80 backdrop-blur-lg shadow-sm focus:shadow-md focus:border-primary/50 transition-all text-sm"
          data-testid="input-search-deals"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function FilterChips({ activeFilter, setActiveFilter }: { activeFilter: string; setActiveFilter: (v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
    >
      {FILTER_CHIPS.map((chip) => (
        <motion.button
          key={chip.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveFilter(chip.id)}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeFilter === chip.id
              ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/25"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground backdrop-blur-sm"
          }`}
          data-testid={`chip-filter-${chip.id}`}
        >
          {chip.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

function PremiumDealsGrid({ codes, isLoading, copiedCode, onCopy, flippedCard, setFlippedCard, savedDeals, toggleSaved, featuredDeal }: {
  codes: MemberDeal[];
  isLoading: boolean;
  copiedCode: number | null;
  onCopy: (code: string, id: number) => void;
  flippedCard: number | null;
  setFlippedCard: (id: number | null) => void;
  savedDeals: Set<number>;
  toggleSaved: (id: number) => void;
  featuredDeal: MemberDeal | null;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="h-10 w-10 text-primary/60" />
        </motion.div>
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-dashed border-2 rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Gift className="h-16 w-16 text-muted-foreground/30 mb-4" />
            </motion.div>
            <h3 className="text-xl font-bold">No deals found</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Try adjusting your search or filters to find more deals.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const regularDeals = featuredDeal ? codes.filter(c => c.codeId !== featuredDeal.codeId) : codes;

  return (
    <div className="space-y-5">
      {featuredDeal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FeaturedDealCard
            deal={featuredDeal}
            copiedCode={copiedCode}
            onCopy={onCopy}
            isSaved={savedDeals.has(featuredDeal.codeId)}
            onToggleSave={() => toggleSaved(featuredDeal.codeId)}
          />
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="grid gap-4 sm:grid-cols-2">
          {regularDeals.map((deal, index) => (
            <motion.div
              key={deal.codeId}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              layout
            >
              <FlippableDealCard
                deal={deal}
                copiedCode={copiedCode}
                onCopy={onCopy}
                isFlipped={flippedCard === deal.codeId}
                onFlip={() => setFlippedCard(flippedCard === deal.codeId ? null : deal.codeId)}
                isSaved={savedDeals.has(deal.codeId)}
                onToggleSave={() => toggleSaved(deal.codeId)}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

function FeaturedDealCard({ deal, copiedCode, onCopy, isSaved, onToggleSave }: {
  deal: MemberDeal;
  copiedCode: number | null;
  onCopy: (code: string, id: number) => void;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const isExpired = deal.validUntil && isPast(new Date(deal.validUntil));
  const catInfo = DEAL_CATEGORIES.find(c => c.id === (deal.category || "other")) || DEAL_CATEGORIES[DEAL_CATEGORIES.length - 1];

  return (
    <Card className="overflow-hidden rounded-3xl border-0 shadow-xl relative group" data-testid={`card-featured-deal-${deal.codeId}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${catInfo.gradient} opacity-90`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      {isSafeUrl(deal.imageUrl) && (
        <div className="absolute inset-0">
          <img
            src={deal.imageUrl!}
            alt={deal.shopName || deal.code}
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <CardContent className="relative z-10 p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="backdrop-blur-sm bg-white/15 rounded-full px-3 py-1 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Featured</span>
            </div>
            <Badge className="bg-white/15 backdrop-blur-sm border-white/20 text-white text-[10px]">
              <Building2 className="h-3 w-3 mr-0.5" />
              {deal.clubName}
            </Badge>
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onToggleSave}
            className="backdrop-blur-sm bg-white/15 rounded-full p-2 hover:bg-white/25 transition-colors"
            data-testid={`button-save-featured-${deal.codeId}`}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-red-400 text-red-400" : "text-white/80"}`} />
          </motion.button>
        </div>

        <div className="space-y-3">
          {deal.shopName && (
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{deal.shopName}</h2>
          )}
          {deal.discountPercent && (
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black">{deal.discountPercent}%</span>
              <span className="text-xl font-bold opacity-80">OFF</span>
            </div>
          )}
          {deal.description && (
            <p className="text-white/80 text-sm max-w-md">{deal.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCopy(deal.code, deal.codeId)}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-2xl px-5 py-3 transition-all"
            data-testid={`button-copy-featured-${deal.codeId}`}
          >
            <span className="font-mono font-bold tracking-widest text-sm">{deal.code}</span>
            <AnimatePresence mode="wait">
              {copiedCode === deal.codeId ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="h-4 w-4 text-green-300" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Copy className="h-4 w-4 text-white/70" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {isSafeUrl(deal.shopUrl) && (
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href={deal.shopUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-gray-900 font-semibold rounded-2xl px-5 py-3 text-sm shadow-lg hover:shadow-xl transition-all"
              data-testid={`link-shop-featured-${deal.codeId}`}
              onClick={(e) => e.stopPropagation()}
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </motion.a>
          )}
        </div>

        {deal.validUntil && !isExpired && (
          <div className="mt-4 flex items-center gap-2 text-white/70 text-xs">
            <CountdownTimer validUntil={deal.validUntil} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlippableDealCard({ deal, copiedCode, onCopy, isFlipped, onFlip, isSaved, onToggleSave }: {
  deal: MemberDeal;
  copiedCode: number | null;
  onCopy: (code: string, id: number) => void;
  isFlipped: boolean;
  onFlip: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const isExpired = deal.validUntil && isPast(new Date(deal.validUntil));
  const catInfo = DEAL_CATEGORIES.find(c => c.id === (deal.category || "other")) || DEAL_CATEGORIES[DEAL_CATEGORIES.length - 1];
  const daysLeft = deal.validUntil && !isExpired ? differenceInDays(new Date(deal.validUntil), new Date()) : null;

  return (
    <div className="perspective-1000" style={{ perspective: "1000px" }}>
      <motion.div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        <div
          className={`${isFlipped ? "pointer-events-none" : ""}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <Card
            className={`overflow-hidden rounded-3xl border border-border/30 bg-card/80 backdrop-blur-lg shadow-md hover:shadow-lg transition-all duration-300 ${isExpired ? "opacity-60" : ""}`}
            data-testid={`card-deal-${deal.codeId}`}
          >
            {isSafeUrl(deal.imageUrl) && (
              <div className="relative h-36 overflow-hidden">
                <img
                  src={deal.imageUrl!}
                  alt={deal.shopName || deal.code}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {deal.discountPercent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute top-3 right-3 bg-gradient-to-r ${catInfo.gradient} text-white rounded-2xl px-3 py-1.5 text-sm font-black shadow-lg`}
                  >
                    {deal.discountPercent}% OFF
                  </motion.div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {daysLeft !== null && daysLeft <= 3 && (
                    <div className="backdrop-blur-sm bg-red-500/80 text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {daysLeft === 0 ? "Last Day!" : `${daysLeft}d left`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isSafeUrl(deal.imageUrl) && (
              <div className={`relative h-20 bg-gradient-to-br ${catInfo.gradient} overflow-hidden`}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20 text-white">
                  <catInfo.icon className="h-16 w-16" />
                </div>
                {deal.discountPercent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl px-3 py-1.5 text-sm font-black"
                  >
                    {deal.discountPercent}% OFF
                  </motion.div>
                )}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {daysLeft !== null && daysLeft <= 3 && (
                    <div className="backdrop-blur-sm bg-red-500/80 text-white rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {daysLeft === 0 ? "Last Day!" : `${daysLeft}d left`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  {deal.shopName && (
                    <h3 className="font-bold text-sm truncate">{deal.shopName}</h3>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">
                      <Building2 className="h-2.5 w-2.5 mr-0.5" />
                      {deal.clubName}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">
                      {catInfo.emoji} {catInfo.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
                    className="p-1.5 rounded-full hover:bg-muted/80 transition-colors"
                    data-testid={`button-save-${deal.codeId}`}
                  >
                    <Heart className={`h-3.5 w-3.5 transition-colors ${isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={onFlip}
                    className="p-1.5 rounded-full hover:bg-muted/80 transition-colors"
                    data-testid={`button-flip-${deal.codeId}`}
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.button>
                </div>
              </div>

              {deal.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
              )}

              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 bg-muted/40 backdrop-blur-sm rounded-2xl px-3.5 py-2.5 cursor-pointer hover:bg-muted/70 transition-all border border-border/30"
                onClick={() => onCopy(deal.code, deal.codeId)}
                data-testid={`button-copy-code-${deal.codeId}`}
              >
                <span className="font-mono text-sm font-bold tracking-widest flex-1">{deal.code}</span>
                <AnimatePresence mode="wait">
                  {copiedCode === deal.codeId ? (
                    <motion.div key="copied" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1 text-green-500">
                      <Check className="h-4 w-4" />
                      <span className="text-[10px] font-semibold">Copied ✅</span>
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  {deal.validUntil ? (
                    isExpired ? (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Expired
                      </span>
                    ) : (
                      <CountdownTimer validUntil={deal.validUntil} />
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> No expiry
                    </span>
                  )}
                </div>

                {isSafeUrl(deal.shopUrl) && (
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    href={deal.shopUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
                    data-testid={`link-shop-${deal.codeId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Shop Now
                    <ArrowRight className="h-3 w-3" />
                  </motion.a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div
          className={`absolute top-0 left-0 w-full ${isFlipped ? "" : "pointer-events-none"}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <Card className="overflow-hidden rounded-3xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-lg h-full" data-testid={`card-deal-back-${deal.codeId}`}>
            <div className={`h-2 bg-gradient-to-r ${catInfo.gradient}`} />
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{deal.shopName || deal.code}</h3>
                  {deal.discountPercent && (
                    <div className="flex items-center gap-1 mt-1">
                      <Percent className="h-4 w-4 text-primary" />
                      <span className="text-2xl font-black text-primary">{deal.discountPercent}%</span>
                      <span className="text-sm font-semibold text-muted-foreground">OFF</span>
                    </div>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={onFlip}
                  className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`button-flip-back-${deal.codeId}`}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {deal.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{deal.description}</p>
              )}

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{deal.clubName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{catInfo.emoji} {catInfo.label}</span>
                </div>
                {deal.validUntil && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{isExpired ? "Expired" : `Valid until ${format(new Date(deal.validUntil), "dd MMM yyyy")}`}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onCopy(deal.code, deal.codeId)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-all ${
                    copiedCode === deal.codeId ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  data-testid={`button-copy-back-${deal.codeId}`}
                >
                  {copiedCode === deal.codeId ? (
                    <><Check className="h-4 w-4" /> Copied ✅</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copy Code</>
                  )}
                </motion.button>
                {isSafeUrl(deal.shopUrl) && (
                  <motion.a
                    whileTap={{ scale: 0.95 }}
                    href={deal.shopUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                    data-testid={`link-shop-back-${deal.codeId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Shop Now <ExternalLink className="h-3.5 w-3.5" />
                  </motion.a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

function AdminDealsView({ deals, isLoading, onEdit, onDelete, onToggleActive }: {
  deals: DiscountCodeItem[];
  isLoading: boolean;
  onEdit: (deal: DiscountCodeItem) => void;
  onDelete: (id: number) => void;
  onToggleActive: (deal: DiscountCodeItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <Card className="border-dashed border-2 rounded-3xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">No Deals Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first discount or offer for your club members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {deals.map((deal, index) => {
        const isExpired = deal.validUntil && isPast(new Date(deal.validUntil));
        const assignedTo = deal.assignments?.filter(a => a.appliesToAll) || [];
        const isGlobal = assignedTo.length > 0;
        const catInfo = DEAL_CATEGORIES.find(c => c.id === (deal.category || "other")) || DEAL_CATEGORIES[DEAL_CATEGORIES.length - 1];
        return (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card
              className={`rounded-2xl border border-border/30 overflow-hidden ${!deal.isActive ? "opacity-50" : ""}`}
              data-testid={`card-admin-deal-${deal.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {isSafeUrl(deal.imageUrl) ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/30 flex-shrink-0 shadow-sm">
                      <img
                        src={deal.imageUrl!}
                        alt={deal.code}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 bg-gradient-to-br ${catInfo.gradient} flex items-center justify-center shadow-sm`}>
                      <catInfo.icon className="h-6 w-6 text-white/80" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm tracking-wider">{deal.code}</span>
                      {deal.discountPercent && (
                        <Badge className="bg-gradient-to-r from-primary to-violet-600 text-white border-0 text-[10px]">{deal.discountPercent}% OFF</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">
                        {catInfo.emoji} {catInfo.label}
                      </Badge>
                      {!deal.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          <EyeOff className="h-3 w-3 mr-0.5" />Inactive
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />Expired
                        </Badge>
                      )}
                      {isGlobal && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">All Members</Badge>
                      )}
                    </div>
                    {deal.shopName && (
                      <p className="text-sm font-medium text-muted-foreground mt-0.5">{deal.shopName}</p>
                    )}
                    {deal.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{deal.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      {deal.validUntil && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          Until {format(new Date(deal.validUntil), "dd MMM yyyy")}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        Created {format(new Date(deal.createdAt), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl" data-testid={`button-deal-menu-${deal.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={() => onEdit(deal)} data-testid={`button-edit-deal-${deal.id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleActive(deal)} data-testid={`button-toggle-deal-${deal.id}`}>
                        {deal.isActive ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                        {deal.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(deal.id)}
                        className="text-red-600"
                        data-testid={`button-delete-deal-${deal.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, Building2, Users, Calendar, MapPin, Crown, CreditCard,
  Activity, Settings, ShieldCheck, Sparkles, ChevronRight, Lock,
  TrendingUp, Trophy, Megaphone, GraduationCap, Baby, Award, Tag,
  Mail, Bell, ImageIcon, Type, Share2, FileText, BarChart3, Package,
  Swords, Gift, Palette, Loader2, CheckCircle2, AlertTriangle, Clock,
  PoundSterling, ExternalLink, ArrowUpRight, Shirt,
} from "lucide-react";
import { format } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ClubRow = {
  id: number;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  status?: string;
  planType?: string;
  planStatus?: string;
  premiumStartDate?: string | null;
  premiumEndDate?: string | null;
  premiumPaymentReference?: string | null;
  sportTypes?: string[] | null;
  isActive?: boolean;
  createdAt?: string;
};

type PlanInfo = {
  planType: string;
  planStatus: string;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  sportTypes: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Platform feature catalogue (mirrors features described in replit.md)
// ─────────────────────────────────────────────────────────────────────────────
type FeatureDef = {
  key: string;
  label: string;
  description: string;
  category: string;
  icon: any;
  premium: boolean;
};

const PLATFORM_FEATURES: FeatureDef[] = [
  // Performance
  { key: "rankings", label: "Rankings", description: "Dynamic player rankings & leaderboard", category: "Performance", icon: Trophy, premium: true },
  { key: "player_intelligence", label: "Player Intelligence", description: "Advanced analytics & charts", category: "Performance", icon: Activity, premium: true },
  { key: "ai_reports", label: "AI Reports", description: "Auto-generated coach/parent/admin reports", category: "Performance", icon: Sparkles, premium: true },
  // Sessions / Matches
  { key: "match_engine", label: "Smart Match Engine", description: "AI-powered match generation", category: "Sessions & Matches", icon: Swords, premium: true },
  { key: "tournaments", label: "Tournaments", description: "Bracket & group tournaments", category: "Sessions & Matches", icon: Award, premium: false },
  { key: "league", label: "League Management", description: "Fixtures, teams & results", category: "Sessions & Matches", icon: Swords, premium: true },
  // Operations
  { key: "memberships", label: "Memberships", description: "Plans, requests & approvals", category: "Operations", icon: Users, premium: false },
  { key: "financials", label: "Financials", description: "Revenue & payment tracking", category: "Operations", icon: PoundSterling, premium: true },
  { key: "merchandise", label: "Merchandise", description: "Club shop & order management", category: "Operations", icon: Shirt, premium: false },
  { key: "inventory", label: "Inventory & Expenses", description: "Stock & supply tracking", category: "Operations", icon: Package, premium: true },
  { key: "incident_reports", label: "Incident Reports", description: "Track and resolve incidents", category: "Operations", icon: ShieldCheck, premium: true },
  { key: "exports", label: "CSV Exports", description: "Data export tools", category: "Operations", icon: FileText, premium: true },
  // Engagement
  { key: "rewards", label: "Rewards System", description: "Player attendance & milestone rewards", category: "Engagement", icon: Award, premium: true },
  { key: "referrals", label: "Refer & Earn", description: "Club-scoped referral programme", category: "Engagement", icon: Gift, premium: true },
  { key: "deals", label: "Deals & Offers", description: "Member exclusive deals", category: "Engagement", icon: Tag, premium: false },
  { key: "community", label: "Community Hub", description: "Events, food experiences, reviews", category: "Engagement", icon: Sparkles, premium: false },
  // Communication
  { key: "messaging", label: "In-App Messaging", description: "Internal chat & inbox", category: "Communication", icon: Mail, premium: true },
  { key: "announcements", label: "Announcements", description: "Club-wide broadcasts", category: "Communication", icon: Megaphone, premium: true },
  { key: "notifications_advanced", label: "Advanced Notifications", description: "Schedule & template system", category: "Communication", icon: Bell, premium: true },
  // Programs
  { key: "junior_management", label: "Junior Management", description: "Skills, exercises & parent dashboards", category: "Programs", icon: Baby, premium: true },
  { key: "coach_directory", label: "Coach Directory & Lessons", description: "Public coach profiles & lesson booking", category: "Programs", icon: GraduationCap, premium: true },
  // Customisation
  { key: "themes", label: "Premium Themes", description: "64-theme premium collection", category: "Customisation", icon: Palette, premium: true },
  { key: "backgrounds", label: "Custom Backgrounds", description: "Branded backgrounds", category: "Customisation", icon: ImageIcon, premium: true },
  { key: "typography", label: "Typography Studio", description: "Font customisation", category: "Customisation", icon: Type, premium: true },
  { key: "social_media", label: "Social Media Studio", description: "Generated social posts", category: "Customisation", icon: Share2, premium: true },
];

const FEATURE_CATEGORIES = [
  "Performance",
  "Sessions & Matches",
  "Operations",
  "Engagement",
  "Communication",
  "Programs",
  "Customisation",
];

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
function planBadge(planStatus?: string) {
  switch (planStatus) {
    case "ACTIVE_PREMIUM":
      return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" data-testid="badge-plan-active">Premium</Badge>;
    case "PENDING_ACTIVATION":
      return <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30" data-testid="badge-plan-pending">Pending</Badge>;
    case "SUSPENDED":
      return <Badge className="bg-red-500/15 text-red-300 border-red-500/30" data-testid="badge-plan-suspended">Suspended</Badge>;
    default:
      return <Badge className="bg-white/10 text-white/70 border-white/15" data-testid="badge-plan-free">Free</Badge>;
  }
}

function KpiCard({ label, value, icon: Icon, accent, loading }: { label: string; value: React.ReactNode; icon: any; accent: string; loading?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{label}</p>
          {loading ? <Skeleton className="h-7 w-16 bg-white/10" /> : <p className="text-2xl font-bold text-white tabular-nums">{value}</p>}
        </div>
        <div className={`rounded-xl p-2 ring-1 ring-white/10 ${accent}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "", ...rest }: any) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ClubControlCenter() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const isOwner = user?.role === "OWNER";

  // OWNER: full clubs+billing list. ADMIN: only clubs they manage.
  const { data: ownerClubsRaw, isLoading: ownerLoading } = useQuery<ClubRow[]>({
    queryKey: ["/api/super-admin/clubs/billing"],
    enabled: !!user && isOwner,
  });
  const { data: adminClubs, isLoading: adminLoading } = useMyAdminClubs(!!user && !isOwner);

  const allClubs: ClubRow[] = useMemo(() => {
    if (isOwner) return ownerClubsRaw || [];
    return (adminClubs || []) as ClubRow[];
  }, [isOwner, ownerClubsRaw, adminClubs]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const filteredClubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allClubs;
    return allClubs.filter(c => c.name.toLowerCase().includes(q));
  }, [allClubs, searchQuery]);

  // Auto-select first club
  useEffect(() => {
    if (selectedClubId === null && allClubs.length > 0) {
      setSelectedClubId(allClubs[0].id);
    }
  }, [allClubs, selectedClubId]);

  const selectedClub = useMemo(
    () => allClubs.find(c => c.id === selectedClubId) || null,
    [allClubs, selectedClubId]
  );

  // Per-club detailed data
  const { data: planInfo } = useQuery<PlanInfo>({
    queryKey: ["/api/clubs", selectedClubId, "plan"],
    enabled: !!selectedClubId,
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ["/api/clubs", selectedClubId, "members"],
    enabled: !!selectedClubId,
  });

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["/api/clubs", selectedClubId, "sessions"],
    enabled: !!selectedClubId,
  });

  const { data: venues } = useQuery<any[]>({
    queryKey: ["/api/clubs", selectedClubId, "venues"],
    enabled: !!selectedClubId,
  });

  const { data: clubDetail } = useQuery<any>({
    queryKey: ["/api/clubs", selectedClubId],
    enabled: !!selectedClubId,
  });

  const { data: featureOverridesData } = useQuery<{ featureOverrides: Record<string, boolean> }>({
    queryKey: ["/api/clubs", selectedClubId, "feature-overrides"],
    enabled: !!selectedClubId,
  });

  const overrides = featureOverridesData?.featureOverrides || {};

  const planStatus = planInfo?.planStatus || selectedClub?.planStatus || "FREE";
  const isPremium = planStatus === "ACTIVE_PREMIUM";
  const isPending = planStatus === "PENDING_ACTIVATION";
  const isSuspended = planStatus === "SUSPENDED";

  // ── Mutations ────────────────────────────────────────────────────────────
  const requestPremium = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/clubs/${selectedClubId}/request-premium`),
    onSuccess: () => {
      toast({ title: "Upgrade requested", description: "We will activate your premium plan once payment is confirmed." });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", selectedClubId, "plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/clubs/billing"] });
    },
    onError: (e: any) => toast({ title: "Request failed", description: e.message, variant: "destructive" }),
  });

  const updateOwnerPlan = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${selectedClubId}/plan`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Plan updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/clubs/billing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", selectedClubId, "plan"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const saveFeatureOverrides = useMutation({
    mutationFn: async (next: Record<string, boolean>) => {
      const res = await apiRequest("PATCH", `/api/clubs/${selectedClubId}/feature-overrides`, { featureOverrides: next });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", selectedClubId, "feature-overrides"] });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });

  const toggleFeature = (key: string, value: boolean) => {
    if (!isOwner) {
      toast({ title: "Owner only", description: "Only platform owners can toggle features.", variant: "destructive" });
      return;
    }
    const next = { ...overrides, [key]: value };
    saveFeatureOverrides.mutate(next);
  };

  const handleActivatePremium = () => {
    const now = new Date().toISOString();
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    updateOwnerPlan.mutate({ planStatus: "ACTIVE_PREMIUM", premiumStartDate: now, premiumEndDate: oneYear.toISOString() });
  };

  const isLoadingClubs = isOwner ? ownerLoading : adminLoading;
  const noClubs = !isLoadingClubs && allClubs.length === 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Ambient gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-6 lg:py-8">
        {/* Page header */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" data-testid="control-center-header">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isOwner ? "Super Admin" : "Admin"}</span>
              <ChevronRight className="h-3 w-3" />
              <span>Club Control Center</span>
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Club Control Center
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {isOwner ? "Manage every club, plan, billing record and feature toggle in one place." : "Manage your clubs, plan, billing and active features."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedClub && (
              <Link href={`/admin/club/${selectedClub.id}`}>
                <Button variant="outline" size="sm" className="bg-white/5 border-white/15 text-white hover:bg-white/10" data-testid="link-club-dashboard">
                  Open club dashboard <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </header>

        {noClubs ? (
          <GlassCard className="p-12 text-center" data-testid="empty-no-clubs">
            <Building2 className="mx-auto h-12 w-12 text-white/30" />
            <p className="mt-3 text-white/70">You don't manage any clubs yet.</p>
            <Link href="/create-club">
              <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white" data-testid="link-create-club">
                Create a club
              </Button>
            </Link>
          </GlassCard>
        ) : (
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-[280px_1fr]">
            {/* ── Left rail: club list + search ──────────────────────────── */}
            <aside className="space-y-3" data-testid="club-rail">
              <GlassCard className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isOwner ? "Search all clubs…" : "Search your clubs…"}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-emerald-400/50"
                    data-testid="input-search-clubs"
                  />
                </div>
              </GlassCard>

              <GlassCard className="overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    {isOwner ? "All clubs" : "Your clubs"}
                  </span>
                  <span className="text-[11px] text-white/40 tabular-nums">{filteredClubs.length}</span>
                </div>
                <div className="max-h-[60vh] lg:max-h-[calc(100vh-260px)] overflow-y-auto p-1.5">
                  {isLoadingClubs ? (
                    <div className="space-y-2 p-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}
                    </div>
                  ) : filteredClubs.length === 0 ? (
                    <p className="text-xs text-white/40 italic px-3 py-4 text-center">No matches</p>
                  ) : (
                    filteredClubs.map(club => {
                      const active = club.id === selectedClubId;
                      return (
                        <button
                          key={club.id}
                          onClick={() => setSelectedClubId(club.id)}
                          className={`w-full text-left rounded-xl px-2.5 py-2.5 mb-1 transition-all flex items-center gap-3 ${active ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/15 ring-1 ring-emerald-400/40 shadow-[0_4px_20px_rgba(16,185,129,0.15)]" : "hover:bg-white/5"}`}
                          data-testid={`button-club-${club.id}`}
                        >
                          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                            {club.logoUrl ? <AvatarImage src={club.logoUrl} alt={club.name} /> : null}
                            <AvatarFallback className="bg-slate-800 text-white text-xs font-semibold">
                              {club.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate" data-testid={`text-club-name-${club.id}`}>{club.name}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              {planBadge(club.planStatus)}
                              {club.status === "PAUSED" && <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">Paused</Badge>}
                            </div>
                          </div>
                          {active && <ChevronRight className="h-4 w-4 text-emerald-300 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </GlassCard>
            </aside>

            {/* ── Main content ───────────────────────────────────────────── */}
            <main className="space-y-4 lg:space-y-6 min-w-0" data-testid="control-center-main">
              {selectedClub ? (
                <>
                  {/* Selected club header strip */}
                  <GlassCard className="p-4 sm:p-5" data-testid="club-header-strip">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <Avatar className="h-14 w-14 ring-2 ring-white/10">
                        {selectedClub.logoUrl ? <AvatarImage src={selectedClub.logoUrl} alt={selectedClub.name} /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-600 text-white font-bold">
                          {selectedClub.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-white truncate" data-testid="text-selected-club">{selectedClub.name}</h2>
                          {planBadge(planStatus)}
                          {selectedClub.status && selectedClub.status !== "APPROVED" && (
                            <Badge className="bg-white/10 text-white/70 border-white/15">{selectedClub.status}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">
                          {(planInfo?.sportTypes || selectedClub.sportTypes || []).join(" · ") || "Multi-sport"} · ID #{selectedClub.id}
                        </p>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Top KPI bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="kpi-bar">
                    <KpiCard label="Plan" value={planStatus === "ACTIVE_PREMIUM" ? "Premium" : planStatus === "PENDING_ACTIVATION" ? "Pending" : planStatus === "SUSPENDED" ? "Suspended" : "Free"} icon={Crown} accent="bg-amber-500/30" />
                    <KpiCard label="Members" value={members?.length ?? "—"} icon={Users} accent="bg-emerald-500/30" loading={!members && !!selectedClubId} />
                    <KpiCard label="Sessions" value={sessions?.length ?? "—"} icon={Calendar} accent="bg-cyan-500/30" loading={!sessions && !!selectedClubId} />
                    <KpiCard label="Venues" value={venues?.length ?? "—"} icon={MapPin} accent="bg-violet-500/30" loading={!venues && !!selectedClubId} />
                  </div>

                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" data-testid="control-tabs">
                    <TabsList className="bg-white/5 border border-white/10 backdrop-blur-xl p-1 h-auto flex-wrap">
                      <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-overview">
                        <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Overview
                      </TabsTrigger>
                      <TabsTrigger value="features" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-features">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Features
                      </TabsTrigger>
                      <TabsTrigger value="billing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-billing">
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Billing
                      </TabsTrigger>
                      <TabsTrigger value="usage" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-usage">
                        <Activity className="h-3.5 w-3.5 mr-1.5" /> Usage
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg px-3 py-1.5 text-xs sm:text-sm" data-testid="tab-settings">
                        <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
                      </TabsTrigger>
                    </TabsList>

                    {/* ── Overview ──────────────────────────────────────── */}
                    <TabsContent value="overview" className="space-y-4 mt-0">
                      <GlassCard className="p-5" data-testid="card-overview-summary">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-white/50">Quick summary</p>
                            <p className="mt-1 text-white/80">
                              {selectedClub.name} is on the <span className="font-semibold text-white">{isPremium ? "Premium" : "Free"}</span> plan
                              {isPremium && planInfo?.premiumEndDate ? <> · renews <span className="font-semibold">{format(new Date(planInfo.premiumEndDate), "dd MMM yyyy")}</span></> : null}.
                            </p>
                          </div>
                          {!isPremium && !isPending && (
                            <Button onClick={() => setActiveTab("billing")} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90" data-testid="button-go-upgrade">
                              <Crown className="h-4 w-4 mr-2" /> Upgrade
                            </Button>
                          )}
                        </div>
                      </GlassCard>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Drill-down</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="overview-drilldown">
                          <DrillTile href={`/admin/club/${selectedClub.id}`} label="Club Dashboard" icon={Building2} accent="from-emerald-500/30 to-emerald-700/10" testId="drill-dashboard" />
                          <DrillTile href="/admin/players" label="Members" icon={Users} accent="from-cyan-500/30 to-cyan-700/10" testId="drill-members" />
                          <DrillTile href="/admin/venues" label="Venues" icon={MapPin} accent="from-violet-500/30 to-violet-700/10" testId="drill-venues" />
                          <DrillTile href="/sessions" label="Sessions" icon={Calendar} accent="from-blue-500/30 to-blue-700/10" testId="drill-sessions" />
                          <DrillTile href="/admin/financials" label="Financials" icon={PoundSterling} accent="from-amber-500/30 to-amber-700/10" testId="drill-financials" />
                          <DrillTile href="/admin/memberships" label="Memberships" icon={CreditCard} accent="from-pink-500/30 to-pink-700/10" testId="drill-memberships" />
                          <DrillTile href="/admin/merchandise" label="Merchandise" icon={Shirt} accent="from-rose-500/30 to-rose-700/10" testId="drill-merch" />
                          {isOwner && <DrillTile href="/admin/clubs" label="God-mode Edit" icon={ShieldCheck} accent="from-red-500/30 to-red-700/10" testId="drill-godmode" />}
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Features ──────────────────────────────────────── */}
                    <TabsContent value="features" className="space-y-4 mt-0" data-testid="tab-content-features">
                      <GlassCard className="p-4 sm:p-5">
                        <div className="flex items-start gap-3 flex-wrap">
                          <div className="rounded-xl bg-emerald-500/15 p-2 ring-1 ring-emerald-500/30">
                            <Sparkles className="h-4 w-4 text-emerald-300" />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <p className="font-semibold text-white">Per-club feature toggles</p>
                            <p className="text-xs text-white/60 mt-0.5">
                              {isOwner
                                ? "Override any feature for this club. Premium-only features remain locked unless the club is on Premium or you explicitly enable them here."
                                : "Read-only view. Premium features are locked behind your plan — upgrade in the Billing tab to unlock."}
                            </p>
                          </div>
                        </div>
                      </GlassCard>

                      {FEATURE_CATEGORIES.map(cat => {
                        const items = PLATFORM_FEATURES.filter(f => f.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <GlassCard key={cat} className="p-4 sm:p-5" data-testid={`feature-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">{cat}</p>
                            <div className="grid sm:grid-cols-2 gap-2.5">
                              {items.map(feat => {
                                const planEnabled = !feat.premium || isPremium;
                                const overrideValue = overrides[feat.key];
                                const effective = overrideValue !== undefined ? overrideValue : planEnabled;
                                const locked = feat.premium && !isPremium && overrideValue !== true;
                                return (
                                  <div
                                    key={feat.key}
                                    className={`relative rounded-xl border p-3 flex items-start gap-3 transition-colors ${effective ? "border-emerald-500/25 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}
                                    data-testid={`feature-row-${feat.key}`}
                                  >
                                    <div className={`rounded-lg p-2 ring-1 ring-white/10 ${effective ? "bg-emerald-500/20" : "bg-white/10"}`}>
                                      <feat.icon className={`h-4 w-4 ${effective ? "text-emerald-300" : "text-white/60"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-semibold text-white">{feat.label}</p>
                                        {feat.premium && (
                                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                                            <Crown className="h-2.5 w-2.5 mr-0.5" /> Premium
                                          </Badge>
                                        )}
                                        {locked && <Lock className="h-3 w-3 text-white/40" />}
                                      </div>
                                      <p className="text-xs text-white/60 mt-0.5 leading-snug">{feat.description}</p>
                                    </div>
                                    <Switch
                                      checked={effective}
                                      disabled={!isOwner || saveFeatureOverrides.isPending}
                                      onCheckedChange={(v) => toggleFeature(feat.key, v)}
                                      className="data-[state=checked]:bg-emerald-500"
                                      data-testid={`toggle-${feat.key}`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </GlassCard>
                        );
                      })}

                      {!isOwner && (
                        <p className="text-xs text-white/50 italic px-1">
                          Only platform owners can change feature overrides. Contact your platform owner to adjust per-club access.
                        </p>
                      )}
                    </TabsContent>

                    {/* ── Billing ───────────────────────────────────────── */}
                    <TabsContent value="billing" className="space-y-4 mt-0" data-testid="tab-content-billing">
                      <GlassCard className="p-5" data-testid="card-current-plan">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2.5 ring-1 ring-white/10 ${isPremium ? "bg-emerald-500/20" : isPending ? "bg-amber-500/20" : isSuspended ? "bg-red-500/20" : "bg-white/10"}`}>
                              {isPremium ? <Crown className="h-5 w-5 text-emerald-300" /> : isPending ? <Clock className="h-5 w-5 text-amber-300" /> : isSuspended ? <AlertTriangle className="h-5 w-5 text-red-300" /> : <CreditCard className="h-5 w-5 text-white/70" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {isPremium ? "Premium plan active" : isPending ? "Upgrade pending" : isSuspended ? "Plan suspended" : "Free plan"}
                              </p>
                              <p className="text-xs text-white/60 mt-0.5">
                                {isPremium
                                  ? "All premium features available."
                                  : isPending
                                  ? "Awaiting payment confirmation by platform admin."
                                  : isSuspended
                                  ? "Contact platform admin to restore access."
                                  : "Includes session creation, attendance, basic members & club settings."}
                              </p>
                              {isPremium && (
                                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/50">
                                  {planInfo?.premiumStartDate && <span>Started {format(new Date(planInfo.premiumStartDate), "dd MMM yyyy")}</span>}
                                  {planInfo?.premiumEndDate && <span>Renews {format(new Date(planInfo.premiumEndDate), "dd MMM yyyy")}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          {!isPremium && !isPending && !isOwner && (
                            <Button onClick={() => requestPremium.mutate()} disabled={requestPremium.isPending} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white" data-testid="button-request-premium">
                              {requestPremium.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                              Request Premium
                            </Button>
                          )}
                        </div>

                        {isOwner && (
                          <div className="mt-4 pt-4 border-t border-white/10" data-testid="owner-billing-controls">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Owner controls</p>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={handleActivatePremium} disabled={isPremium || updateOwnerPlan.isPending} className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30" data-testid="button-activate-premium">
                                Activate Premium (1 yr)
                              </Button>
                              <Button size="sm" onClick={() => updateOwnerPlan.mutate({ planStatus: "SUSPENDED" })} disabled={isSuspended || updateOwnerPlan.isPending} className="bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30" data-testid="button-suspend">
                                Suspend
                              </Button>
                              <Button size="sm" onClick={() => updateOwnerPlan.mutate({ planStatus: "FREE" })} disabled={planStatus === "FREE" || updateOwnerPlan.isPending} className="bg-white/5 text-white hover:bg-white/10 border border-white/15" data-testid="button-revert-free">
                                Revert to Free
                              </Button>
                              <Link href="/super-admin/billing">
                                <Button size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10" data-testid="link-full-billing">
                                  Full billing console <ExternalLink className="ml-1.5 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </GlassCard>

                      <GlassCard className="p-5" data-testid="card-plan-comparison">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Plan limits & permissions</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm font-semibold text-white">Free</p>
                            <p className="text-[11px] text-white/50 mt-0.5">£0 / month</p>
                            <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                              {["Session creation", "Attendance tracking", "Basic member list", "Club settings", "Tournaments (basic)"].map(t => (
                                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {t}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
                            <div className="flex items-center gap-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-300" />
                              <p className="text-sm font-semibold text-white">Premium</p>
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5">£10 / month</p>
                            <ul className="mt-3 space-y-1.5 text-xs text-white/70">
                              {["Everything in Free", "Rankings & analytics", "Smart match engine", "Financials & exports", "League & rewards", "AI reports & inventory", "Premium themes & branding"].map(t => (
                                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {t}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </GlassCard>

                      {(selectedClub.premiumPaymentReference || isOwner) && (
                        <GlassCard className="p-5" data-testid="card-payment-history">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Payment record</p>
                          <div className="text-sm text-white/80">
                            <p>Payment reference: <span className="font-mono">{selectedClub.premiumPaymentReference || "—"}</span></p>
                            {planInfo?.premiumStartDate && <p className="text-xs text-white/50 mt-1">Last activation: {format(new Date(planInfo.premiumStartDate), "dd MMM yyyy")}</p>}
                          </div>
                        </GlassCard>
                      )}
                    </TabsContent>

                    {/* ── Usage ─────────────────────────────────────────── */}
                    <TabsContent value="usage" className="space-y-4 mt-0" data-testid="tab-content-usage">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard label="Total members" value={members?.length ?? "—"} icon={Users} accent="bg-emerald-500/30" />
                        <KpiCard label="Total sessions" value={sessions?.length ?? "—"} icon={Calendar} accent="bg-cyan-500/30" />
                        <KpiCard label="Active venues" value={venues?.length ?? "—"} icon={MapPin} accent="bg-violet-500/30" />
                        <KpiCard label="Sport types" value={(planInfo?.sportTypes || selectedClub.sportTypes || []).length || 1} icon={Trophy} accent="bg-amber-500/30" />
                      </div>

                      <GlassCard className="p-5" data-testid="card-recent-sessions">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Recent sessions</p>
                          <Link href="/sessions">
                            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 h-7 px-2 text-xs">
                              View all <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                        {!sessions ? (
                          <Skeleton className="h-24 w-full bg-white/5" />
                        ) : sessions.length === 0 ? (
                          <p className="text-sm text-white/50 italic">No sessions yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.slice(0, 5).map((s: any) => (
                              <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2" data-testid={`session-row-${s.id}`}>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{s.title || s.name || `Session #${s.id}`}</p>
                                  <p className="text-[11px] text-white/50">{s.date ? format(new Date(s.date), "EEE dd MMM · HH:mm") : ""}</p>
                                </div>
                                {s.status && <Badge className="bg-white/10 text-white/70 border-white/15 text-[10px]">{s.status}</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </GlassCard>

                      <GlassCard className="p-5" data-testid="card-venues-list">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Venues</p>
                          <Link href="/admin/venues">
                            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 h-7 px-2 text-xs">
                              Manage <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                        {!venues ? (
                          <Skeleton className="h-16 w-full bg-white/5" />
                        ) : venues.length === 0 ? (
                          <p className="text-sm text-white/50 italic">No venues configured.</p>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {venues.slice(0, 6).map((v: any) => (
                              <div key={v.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2" data-testid={`venue-row-${v.id}`}>
                                <p className="text-sm font-medium text-white truncate">{v.name}</p>
                                <p className="text-[11px] text-white/50 truncate">{v.address || "—"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </GlassCard>
                    </TabsContent>

                    {/* ── Settings ──────────────────────────────────────── */}
                    <TabsContent value="settings" className="space-y-4 mt-0" data-testid="tab-content-settings">
                      <GlassCard className="p-5" data-testid="card-settings-summary">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Club details</p>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">Slug</dt><dd className="font-mono text-white">{selectedClub.slug || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">Status</dt><dd className="text-white">{selectedClub.status || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">City</dt><dd className="text-white">{clubDetail?.city || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">Postcode</dt><dd className="text-white">{clubDetail?.postcode || "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">Created</dt><dd className="text-white">{selectedClub.createdAt ? format(new Date(selectedClub.createdAt), "dd MMM yyyy") : "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-white/5 py-1.5">
                            <dt className="text-white/50">Sports</dt><dd className="text-white">{(planInfo?.sportTypes || selectedClub.sportTypes || []).join(", ") || "—"}</dd>
                          </div>
                        </dl>
                      </GlassCard>

                      <div className="grid sm:grid-cols-2 gap-3" data-testid="settings-deeplinks">
                        <DrillTile href={`/admin/club/${selectedClub.id}`} label="Open club dashboard" icon={Building2} accent="from-emerald-500/30 to-emerald-700/10" testId="settings-link-dashboard" />
                        <DrillTile href="/admin/venues" label="Venues & courts" icon={MapPin} accent="from-violet-500/30 to-violet-700/10" testId="settings-link-venues" />
                        <DrillTile href={`/club-admin/${selectedClub.id}/organizers`} label="Staff & organisers" icon={ShieldCheck} accent="from-cyan-500/30 to-cyan-700/10" testId="settings-link-staff" />
                        <DrillTile href="/admin/announcements" label="Announcements" icon={Megaphone} accent="from-blue-500/30 to-blue-700/10" testId="settings-link-announce" />
                        {isOwner && <DrillTile href="/admin/clubs" label="Edit / pause / archive" icon={Settings} accent="from-red-500/30 to-red-700/10" testId="settings-link-godmode" />}
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <GlassCard className="p-12 text-center" data-testid="no-club-selected">
                  <Building2 className="mx-auto h-10 w-10 text-white/30" />
                  <p className="mt-3 text-white/60">Select a club from the list to begin.</p>
                </GlassCard>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drill-down tile
// ─────────────────────────────────────────────────────────────────────────────
function DrillTile({ href, label, icon: Icon, accent, testId }: { href: string; label: string; icon: any; accent: string; testId: string }) {
  return (
    <Link href={href}>
      <a className={`group relative block overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${accent} p-3 hover:border-white/25 hover:-translate-y-0.5 transition-all`} data-testid={testId}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-white/10 p-2 ring-1 ring-white/10">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-white flex-1">{label}</p>
          <ChevronRight className="h-4 w-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>
      </a>
    </Link>
  );
}

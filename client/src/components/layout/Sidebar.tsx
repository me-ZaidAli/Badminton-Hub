import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoPath from "@assets/image_1770381062912_optimized.png";
import { PwaInstallBanner, PwaInstallButton } from "@/components/PwaInstallPrompt";
import { useState } from "react";
import { 
  Calendar, 
  CalendarCheck,
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu,
  X,
  User,
  Zap,
  Building2,
  Mail,
  Trophy,
  Bell,
  Megaphone,
  Ticket,
  Gift,
  Award,
  BookOpen,
  FileText,
  Swords,
  LayoutDashboard,
  Baby,
  Heart,
  Rocket,
  Palette,
  Lock,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface BadgeCounts {
  notifications: number;
  tickets: number;
  messages: number;
  announcements: number;
  pendingRewards: number;
  upcomingSessions: number;
  pendingMemberships: number;
  outstandingPayments: number;
  myOutstandingPayments: number;
  pendingReferrals: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  group: string;
  badgeKey?: keyof BadgeCounts;
  secondaryBadgeKey?: keyof BadgeCounts;
  isGodMode?: boolean;
  premiumOnly?: boolean;
  hidden?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

function useBadgeCounts() {
  const { data: user } = useUser();
  return useQuery<BadgeCounts>({
    queryKey: ["/api/badge-counts"],
    enabled: !!user,
    refetchInterval: 30000,
  });
}

function useNavGroups(): { groups: NavGroup[]; isPremium: boolean; planStatus: string } {
  const { data: user } = useUser();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const isOrganiserOnly = useIsOrganiserOnly(!!user);
  const adminClubId = useAdminClubId();
  const { isPremium, planStatus, isSuperAdmin } = useClubPlan(adminClubId);

  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main" },

    { href: "/sessions", label: "Sessions", icon: Calendar, group: "activity", badgeKey: "upcomingSessions" },
    { href: "/my-sessions", label: "My Sessions", icon: CalendarCheck, group: "activity", badgeKey: "myOutstandingPayments" },
    { href: "/juniors", label: "Juniors", icon: Baby, group: "activity", hidden: !isAdminOrOwner && !(user as any)?.hasChildren },
    { href: "/league", label: "League", icon: Swords, group: "activity", premiumOnly: true },
    { href: "/rankings", label: "Rankings", icon: Trophy, group: "activity", premiumOnly: true },

    { href: "/clubs", label: "Clubs", icon: Building2, group: "club", badgeKey: "pendingMemberships" },
    { href: "/referrals", label: "Refer & Earn", icon: Gift, group: "club", badgeKey: "pendingReferrals", premiumOnly: true },
    { href: "/rewards", label: "My Rewards", icon: Award, group: "club", badgeKey: "pendingRewards", premiumOnly: true },

    { href: "/announcements", label: "Announcements", icon: Megaphone, group: "comms", badgeKey: "announcements" },
    { href: "/notifications", label: "Notifications", icon: Bell, group: "comms", badgeKey: "notifications", secondaryBadgeKey: "pendingRewards" as keyof BadgeCounts },
    { href: "/inbox", label: "Inbox", icon: Mail, group: "comms", badgeKey: "messages" },
    { href: "/tickets", label: isAdminOrOwner ? "Tickets" : "My Tickets", icon: Ticket, group: "comms", badgeKey: "tickets" },

    { href: "/themes", label: "Themes", icon: Palette, group: "info", premiumOnly: true },
    { href: "/guide", label: "User Guide", icon: BookOpen, group: "info" },
    { href: "/terms-conditions", label: "Terms & Conditions", icon: FileText, group: "info" },
  ];

  if (user?.role === "OWNER") {
    items.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck, group: "admin", badgeKey: "pendingMemberships", secondaryBadgeKey: "outstandingPayments" });
    items.push({ href: "/super-admin/god-mode", label: "God Mode", icon: Zap, group: "godmode", isGodMode: true });
  } else if (user?.role === "ADMIN") {
    const panelLabel = isOrganiserOnly ? "Organiser Dashboard" : "Admin Panel";
    items.push({ href: "/admin", label: panelLabel, icon: ShieldCheck, group: "admin", badgeKey: "pendingMemberships", secondaryBadgeKey: "outstandingPayments" });
    items.push({ href: "/admin/billing", label: "Billing & Plan", icon: CreditCard, group: "admin" });
  }

  const showPremium = isPremium || isSuperAdmin;
  const filteredItems = items.filter(item => {
    if (item.hidden) return false;
    if (!item.premiumOnly) return true;
    return showPremium;
  });

  const groupOrder = ["main", "activity", "club", "comms", "info", "admin", "godmode"];
  const groupLabels: Record<string, string> = {
    main: "",
    activity: "Activity",
    club: "My Club",
    comms: "Communication",
    info: "Help & Info",
    admin: "Management",
    godmode: "Super Admin",
  };

  const groups: NavGroup[] = [];
  for (const key of groupOrder) {
    const groupItems = filteredItems.filter(i => i.group === key);
    if (groupItems.length > 0) {
      groups.push({ key, label: groupLabels[key], items: groupItems });
    }
  }

  return { groups, isPremium: showPremium, planStatus };
}

function DonationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "bank" | "done">("form");

  const { data: bankDetails } = useQuery<{
    bankName: string | null;
    bankAccountName: string | null;
    bankSortCode: string | null;
    bankAccountNumber: string | null;
    bankReference: string | null;
  }>({
    queryKey: ["/api/donation-bank-details"],
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/donations", {
        amount: parseFloat(amount),
        paymentDate: paymentDate || null,
        reference: reference || null,
        message: message || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/donations"] });
      setStep("done");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit donation. Please try again.", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setStep("form");
    setAmount("");
    setPaymentDate("");
    setReference("");
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-amber-500" />
            Support Platform Development
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We are building the most structured racket sports performance ecosystem in the region. We continuously invest in improving analytics, training tools, and competition systems to give every player a better experience.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setAmount("10")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  amount === "10"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/50"
                )}
                data-testid="button-tier-supporter"
              >
                <span className="text-lg">🥉</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">Supporter</span>
                  <span className="text-xs text-muted-foreground ml-2">{"\u00A3"}10</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Helps maintain app infrastructure</p>
                </div>
              </button>
              <button
                onClick={() => setAmount("25")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  amount === "25"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/50"
                )}
                data-testid="button-tier-partner"
              >
                <span className="text-lg">🥈</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">Performance Partner</span>
                  <span className="text-xs text-muted-foreground ml-2">{"\u00A3"}25</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Supports new features & analytics improvements</p>
                </div>
              </button>
              <button
                onClick={() => setAmount("50")}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  amount === "50"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border hover:border-amber-500/50"
                )}
                data-testid="button-tier-elite"
              >
                <span className="text-lg">🥇</span>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">Elite Backer</span>
                  <span className="text-xs text-muted-foreground ml-2">{"\u00A3"}50+</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Supports platform expansion & competition systems</p>
                </div>
              </button>
            </div>

            <div>
              <Label className="text-xs">Custom Contribution ({"\u00A3"})</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={!["10", "25", "50"].includes(amount) ? amount : ""}
                onChange={e => setAmount(e.target.value)}
                onFocus={() => { if (["10", "25", "50"].includes(amount)) setAmount(""); }}
                data-testid="input-support-amount"
              />
            </div>

            <div>
              <Label className="text-xs">When will you make the transfer?</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                data-testid="input-payment-date"
              />
            </div>

            <div>
              <Label className="text-xs">Your transfer reference (optional)</Label>
              <Input
                placeholder="e.g. Your Name - Support"
                value={reference}
                onChange={e => setReference(e.target.value)}
                data-testid="input-support-reference"
              />
            </div>

            <div>
              <Label className="text-xs">Message (optional)</Label>
              <Textarea
                placeholder="Any message you'd like to share..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                data-testid="input-support-message"
              />
            </div>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!amount || parseFloat(amount) < 1}
              onClick={() => setStep("bank")}
              data-testid="button-continue-to-bank"
            >
              Continue
            </Button>
          </div>
        )}

        {step === "bank" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please make a bank transfer of <span className="font-bold text-foreground">{"\u00A3"}{parseFloat(amount).toFixed(2)}</span> using the details below{paymentDate && <> on <span className="font-bold text-foreground">{new Date(paymentDate).toLocaleDateString("en-GB")}</span></>}:
            </p>

            <div className="rounded-xl border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account Name</span>
                <span className="font-medium text-foreground">{bankDetails?.bankAccountName || "Club Master"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sort Code</span>
                <span className="font-mono font-medium text-foreground">{bankDetails?.bankSortCode || "04-06-05"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-mono font-medium text-foreground">{bankDetails?.bankAccountNumber || "29999001"}</span>
              </div>
              {(reference || bankDetails?.bankReference) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-medium text-foreground">{reference || bankDetails?.bankReference}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              After making the transfer, click "Confirm" below. An admin will verify your contribution once it arrives.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")} data-testid="button-back-to-form">
                Back
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                data-testid="button-confirm-support"
              >
                {submitMutation.isPending ? "Submitting..." : "Confirm Contribution"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Rocket className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Thank You!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your contribution of {"\u00A3"}{parseFloat(amount).toFixed(2)} has been recorded. Every contribution helps us improve ranking systems, performance dashboards, and training analytics.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full" data-testid="button-close-support">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DonationCard({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <div className={cn(
        "rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/15 dark:to-orange-500/15",
        compact ? "p-3 mx-2 mb-2" : "p-3 mx-3 mb-2"
      )} data-testid="support-cta-card">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <Rocket className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">
              Support Platform Development
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              We are building the most structured racket sports performance ecosystem in the region.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors shadow-sm"
                data-testid="button-support"
              >
                <Rocket className="h-3 w-3" />
                Support
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-dismiss-support"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
      <DonationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

function BadgeCount({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground" data-testid="badge-count">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const { groups: navGroups, isPremium, planStatus } = useNavGroups();
  const { data: badgeCounts } = useBadgeCounts();

  const planBadgeLabel = planStatus === "ACTIVE_PREMIUM" ? "Premium" : planStatus === "PENDING_ACTIVATION" ? "Pending" : planStatus === "SUSPENDED" ? "Suspended" : "Free Plan";
  const planBadgeColor = planStatus === "ACTIVE_PREMIUM" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : planStatus === "PENDING_ACTIVATION" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : planStatus === "SUSPENDED" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-muted text-muted-foreground border-border";

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border shadow-xl fixed left-0 top-0 hidden md:flex">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img src={logoPath} alt="Club Master" className="h-10 w-10 rounded-xl shadow-lg group-hover:shadow-primary/25 transition-all object-contain" />
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight text-foreground">Club Master</h1>
                {(user?.role === "ADMIN" || user?.role === "OWNER") && (
                  <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${planBadgeColor}`} data-testid="badge-plan-status">
                    {planBadgeLabel}
                  </span>
                )}
              </div>
            </div>
          </Link>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {navGroups.map((group) => (
          <div key={group.key} className={cn(group.key !== "main" && "mt-3")}>
            {group.key === "admin" ? (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-2" data-testid="section-admin-panel">
                <span className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400" data-testid="label-admin-section">
                  <ShieldCheck className="w-3 h-3" /> {group.label}
                </span>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                  const badgeCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-emerald-600 text-white shadow-md"
                            : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <BadgeCount count={badgeCount} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : group.key === "godmode" ? (
              <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-2" data-testid="section-god-mode">
                <span className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive" data-testid="label-super-admin-section">
                  <Zap className="w-3 h-3" /> Super Admin
                </span>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-destructive text-destructive-foreground shadow-md"
                            : "text-destructive hover:bg-destructive/15"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : group.key === "main" ? (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-foreground hover:bg-muted"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "")} />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
                <span className="flex items-center px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60" data-testid={`label-section-${group.key}`}>
                  {group.label}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                    const primaryCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                    const secondaryCount = item.secondaryBadgeKey && badgeCounts ? badgeCounts[item.secondaryBadgeKey] : 0;
                    const badgeCount = primaryCount + secondaryCount;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                          <span className="truncate">{item.label}</span>
                          <BadgeCount count={badgeCount} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      <PwaInstallBanner />
      <DonationCard />

      <div className="p-4 border-t border-border/50 bg-muted/20">
        {user ? (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
              <AvatarFallback className="text-xs">{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : null}
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 justify-start text-muted-foreground h-8 text-xs"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Sign Out
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function MobileTopNav() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const { groups: navGroups } = useNavGroups();
  const { data: badgeCounts } = useBadgeCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="md:hidden sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border/40">
        <Link href="/dashboard">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-mobile-home">
            <img src={logoPath} alt="Club Master" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg">Club Master</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="bg-white dark:bg-card border-b border-border shadow-lg max-h-[80vh] overflow-y-auto" data-testid="mobile-dropdown-menu">
          <div className="px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {user.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-foreground">{user.fullName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
          </div>
          <div className="py-2 px-2 space-y-2">
            {navGroups.map((group) => (
              <div key={group.key}>
                {group.key === "admin" ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-2" data-testid="mobile-section-admin-panel">
                    <span className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" /> {group.label}
                    </span>
                    {group.items.map((item) => {
                      const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3",
                              isActive ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-700 dark:text-emerald-400"
                            )}
                            size="sm"
                            onClick={() => setMenuOpen(false)}
                            data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                ) : group.key === "godmode" ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-2" data-testid="mobile-section-god-mode">
                    <span className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
                      <Zap className="w-3 h-3" /> Super Admin
                    </span>
                    {group.items.map((item) => {
                      const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? "destructive" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3",
                              !isActive && "text-destructive"
                            )}
                            size="sm"
                            onClick={() => setMenuOpen(false)}
                            data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                ) : group.key === "main" ? (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start gap-3 font-semibold"
                            size="sm"
                            onClick={() => setMenuOpen(false)}
                            data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <span className="flex items-center px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {group.label}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                        const primaryCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                        const secondaryCount = item.secondaryBadgeKey && badgeCounts ? badgeCounts[item.secondaryBadgeKey] : 0;
                        const badgeCount = primaryCount + secondaryCount;
                        return (
                          <Link key={item.href} href={item.href}>
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className="w-full justify-start gap-3"
                              size="sm"
                              onClick={() => setMenuOpen(false)}
                              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.label}
                              {badgeCount > 0 && (
                                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                  {badgeCount > 99 ? "99+" : badgeCount}
                                </span>
                              )}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <DonationCard compact />
          <div className="px-2 pb-1">
            <PwaInstallButton compact />
          </div>
          <div className="border-t border-border/40 p-2 space-y-1">
            <Link href="/profile">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                size="sm"
                onClick={() => setMenuOpen(false)}
                data-testid="mobile-nav-profile"
              >
                <User className="w-4 h-4" />
                My Profile
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive"
              size="sm"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              data-testid="mobile-nav-logout"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

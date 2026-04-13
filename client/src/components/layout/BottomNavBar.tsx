import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import {
  Activity,
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
  Palette,
  ImageIcon,
  Type,
  Share2,
  CreditCard,
  GripVertical,
  Check,
  RotateCcw,
  Shield,
  UserCheck,
  Lightbulb,
  Shirt,
  Tag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavGroups, useBadgeCounts } from "@/components/layout/Sidebar";

const ALL_NAV_OPTIONS: { id: string; label: string; href: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "my-insights", label: "My Insights", href: "/my-insights", icon: Lightbulb },
  { id: "sessions", label: "Sessions", href: "/sessions", icon: Calendar },
  { id: "my-sessions", label: "My Sessions", href: "/my-sessions", icon: CalendarCheck },
  { id: "clubs", label: "Clubs", href: "/clubs", icon: Building2 },
  { id: "merchandise", label: "Merchandise", href: "/merchandise", icon: Shirt },
  { id: "deals", label: "Deals & Offers", href: "/deals", icon: Tag },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
  { id: "announcements", label: "Announcements", href: "/announcements", icon: Megaphone },
  { id: "inbox", label: "Inbox", href: "/inbox", icon: Mail },
  { id: "tickets", label: "Tickets", href: "/tickets", icon: Ticket },
  { id: "incidents", label: "Incidents", href: "/incidents", icon: Shield },
  { id: "rankings", label: "Rankings", href: "/rankings", icon: Trophy },
  { id: "tournaments", label: "Tournaments", href: "/tournaments", icon: Award },
  { id: "league", label: "League", href: "/league", icon: Swords },
  { id: "player-intel", label: "Player Intel", href: "/player-intelligence", icon: Activity },
  { id: "juniors", label: "Juniors", href: "/juniors", icon: Baby },
  { id: "referrals", label: "Refer & Earn", href: "/referrals", icon: Gift },
  { id: "rewards", label: "My Rewards", href: "/rewards", icon: Award },
  { id: "themes", label: "Themes", href: "/themes", icon: Palette },
  { id: "backgrounds", label: "Backgrounds", href: "/backgrounds", icon: ImageIcon },
  { id: "typography", label: "Typography", href: "/typography", icon: Type },
  { id: "social-media", label: "Social Media", href: "/social-media", icon: Share2 },
  { id: "community", label: "Community Hub", href: "/community", icon: Sparkles },
  { id: "profile", label: "Profile", href: "/profile", icon: User },
  { id: "admin", label: "Admin Panel", href: "/admin", icon: ShieldCheck },
  { id: "guide", label: "User Guide", href: "/guide", icon: BookOpen },
];

const DEFAULT_ITEMS = ["dashboard", "sessions", "notifications", "profile"];

function useBottomNavItems() {
  const { data: user } = useUser();

  const items = useMemo(() => {
    if (!user) return DEFAULT_ITEMS;
    const raw = (user as any).bottomNavItems;
    if (!raw) return DEFAULT_ITEMS;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
    } catch {}
    return DEFAULT_ITEMS;
  }, [user]);

  return items;
}

export function BottomNavBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useUser();
  const selectedItems = useBottomNavItems();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: trialData } = useQuery({
    queryKey: ["/api/trial-players/me"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/trial-players/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!user) return null;

  const isActiveTrial = trialData && trialData.status !== "APPROVED" && trialData.status !== "REJECTED" && trialData.status !== "REDIRECTED";

  if (isActiveTrial) {
    const trialNavItems = [
      { id: "trial", label: "Trial", icon: LayoutDashboard, href: "/trial-dashboard" },
      { id: "notifications", label: "Alerts", icon: Bell, href: "/notifications" },
    ];
    return (
      <>
        <div className="md:hidden h-16" />
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40" data-testid="bottom-nav-bar">
          <div className="flex items-center justify-around h-16 px-1">
            {trialNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.id} href={item.href}>
                  <button className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 px-2 rounded-xl transition-all", isActive ? "text-primary" : "text-muted-foreground")} data-testid={`bottom-nav-${item.id}`}>
                    <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn("text-[10px] leading-tight", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  const navItems = selectedItems
    .map((id: string) => ALL_NAV_OPTIONS.find((o) => o.id === id))
    .filter(Boolean) as typeof ALL_NAV_OPTIONS;

  return (
    <>
      <div className="md:hidden h-16" />
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40"
        data-testid="bottom-nav-bar"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(`${item.href}/`));
            return (
              <Link key={item.id} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 px-2 rounded-xl transition-all",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      isActive && "scale-110"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "font-bold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 px-2 rounded-xl text-muted-foreground"
                data-testid="bottom-nav-more"
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] leading-tight font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0 pb-0">
              <FullMenuSheet onClose={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}

function FullMenuSheet({ onClose }: { onClose: () => void }) {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const { groups: navGroups } = useNavGroups();
  const { data: badgeCounts } = useBadgeCounts();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-4 pb-3 border-b border-border/40">
        <SheetTitle className="text-left text-lg">Menu</SheetTitle>
        <SheetDescription className="sr-only">Full navigation menu</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.key || group.label}>
            {group.key === "admin" ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-2">
                <span className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> {group.label}
                </span>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                  const primaryCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                  const secondaryCount = item.secondaryBadgeKey && badgeCounts ? badgeCounts[item.secondaryBadgeKey] : 0;
                  const badgeCount = primaryCount + secondaryCount;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        onClick={onClose}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                          isActive ? "bg-emerald-600 text-white font-semibold" : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                        )}
                        data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 text-white px-1.5 text-[10px] font-bold">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>
            ) : group.key === "godmode" ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-2">
                <span className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  <Zap className="w-3 h-3" /> Super Admin
                </span>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        onClick={onClose}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                          isActive ? "bg-destructive text-destructive-foreground font-semibold" : "text-destructive hover:bg-destructive/15"
                        )}
                        data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
                {group.label && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2">
                    {group.label}
                  </span>
                )}
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(`${item.href}/`));
                    const primaryCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                    const secondaryCount = item.secondaryBadgeKey && badgeCounts ? badgeCounts[item.secondaryBadgeKey] : 0;
                    const badgeCount = primaryCount + secondaryCount;
                    return (
                      <Link key={item.href} href={item.href}>
                        <button
                          onClick={onClose}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground hover:bg-muted/50"
                          )}
                          data-testid={`menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {badgeCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border/40 px-3 py-2 space-y-1">
        <Link href="/profile">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted/50"
            data-testid="menu-profile"
          >
            <User className="h-4.5 w-4.5" />
            <span className="flex-1 text-left">My Profile</span>
          </button>
        </Link>
        <Link href="/bottom-nav-settings">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/50"
            data-testid="menu-customize-nav"
          >
            <Settings className="h-4.5 w-4.5" />
            <span className="flex-1 text-left">Customise Bottom Menu</span>
          </button>
        </Link>
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10"
          data-testid="menu-sign-out"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span className="flex-1 text-left">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function BottomNavSettings() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const currentItems = useBottomNavItems();
  const [selected, setSelected] = useState<string[]>(currentItems);
  useEffect(() => {
    setSelected(currentItems);
  }, [currentItems.join(",")]);

  const saveMutation = useMutation({
    mutationFn: async (items: string[]) => {
      const res = await apiRequest("PATCH", "/api/user/display-preferences", {
        bottomNavItems: items,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Saved", description: "Bottom menu updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    },
  });

  const toggleItem = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length <= 1) return;
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length >= 4) {
        toast({ title: "Maximum 4 items", description: "Remove one first to add another.", variant: "destructive" });
        return;
      }
      setSelected([...selected, id]);
    }
  };

  const resetToDefault = () => {
    setSelected(DEFAULT_ITEMS);
  };

  const hasChanges = JSON.stringify(selected) !== JSON.stringify(currentItems);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-customize-title">Customise Bottom Menu</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose up to 4 shortcuts for your bottom navigation bar. The "More" button always stays for accessing the full menu.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4" data-slot="card">
        <h3 className="text-sm font-semibold mb-3">Preview</h3>
        <div className="flex items-center justify-around bg-background rounded-xl border border-border/40 py-3 px-2">
          {selected
            .map((id) => ALL_NAV_OPTIONS.find((o) => o.id === id))
            .filter(Boolean)
            .map((item: any) => (
              <div key={item.id} className="flex flex-col items-center gap-0.5">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-[10px] text-primary font-bold">{item.label}</span>
              </div>
            ))}
          <div className="flex flex-col items-center gap-0.5">
            <Menu className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">More</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2" data-slot="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Select Items ({selected.length}/4)</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="text-xs h-7 gap-1"
            data-testid="button-reset-nav"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        {ALL_NAV_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          const idx = selected.indexOf(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggleItem(option.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                isSelected
                  ? "bg-primary/10 border border-primary/30"
                  : "border border-transparent hover:bg-muted/50"
              )}
              data-testid={`option-${option.id}`}
            >
              <option.icon className={cn("h-4.5 w-4.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("flex-1 text-sm", isSelected && "font-semibold")}>{option.label}</span>
              {isSelected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-20 md:bottom-4">
        <Button
          className="w-full"
          size="lg"
          disabled={!hasChanges || saveMutation.isPending}
          onClick={() => saveMutation.mutate(selected)}
          data-testid="button-save-nav"
        >
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

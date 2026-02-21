import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import logoPath from "@assets/image_1770381062912_optimized.png";
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
  Shield,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface BadgeCounts {
  notifications: number;
  tickets: number;
  messages: number;
  announcements: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
  group: string;
  badgeKey?: keyof BadgeCounts;
  isGodMode?: boolean;
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

function useNavGroups(): NavGroup[] {
  const { data: user } = useUser();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const isOrganiserOnly = useIsOrganiserOnly(!!user);

  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  const items: NavItem[] = [
    { href: "/sessions", label: "Sessions", icon: Calendar, group: "activity" },
    { href: "/my-sessions", label: "My Sessions", icon: CalendarCheck, group: "activity" },
    { href: "/rankings", label: "Rankings", icon: Trophy, group: "activity" },

    { href: "/clubs", label: "Clubs", icon: Building2, group: "club" },
    { href: "/referrals", label: "Refer & Earn", icon: Gift, group: "club" },
    { href: "/rewards", label: "My Rewards", icon: Award, group: "club" },

    { href: "/announcements", label: "Announcements", icon: Megaphone, group: "comms", badgeKey: "announcements" },
    { href: "/notifications", label: "Notifications", icon: Bell, group: "comms", badgeKey: "notifications" },
    { href: "/inbox", label: "Inbox", icon: Mail, group: "comms", badgeKey: "messages" },
    { href: "/tickets", label: isAdminOrOwner ? "Tickets" : "My Tickets", icon: Ticket, group: "comms", badgeKey: "tickets" },

    { href: "/guide", label: "User Guide", icon: BookOpen, group: "info" },
    { href: "/terms-conditions", label: "Terms & Conditions", icon: FileText, group: "info" },
  ];

  if (user?.role === "OWNER") {
    items.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck, group: "admin" });
    items.push({ href: "/super-admin/god-mode", label: "God Mode", icon: Zap, group: "godmode", isGodMode: true });
    items.push({ href: "/super-admin/referrals", label: "Referral Programs", icon: Gift, group: "godmode" });
  } else if (user?.role === "ADMIN") {
    const panelLabel = isOrganiserOnly ? "Organiser Dashboard" : "Admin Panel";
    items.push({ href: "/admin", label: panelLabel, icon: ShieldCheck, group: "admin" });
  }

  const groupOrder = ["activity", "club", "comms", "info", "admin", "godmode"];
  const groupLabels: Record<string, string> = {
    activity: "Activity",
    club: "Club",
    comms: "Communication",
    info: "Help & Info",
    admin: "Management",
    godmode: "Super Admin",
  };

  const groups: NavGroup[] = [];
  for (const key of groupOrder) {
    const groupItems = items.filter(i => i.group === key);
    if (groupItems.length > 0) {
      groups.push({ key, label: groupLabels[key], items: groupItems });
    }
  }

  return groups;
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
  const navGroups = useNavGroups();
  const { data: badgeCounts } = useBadgeCounts();

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border shadow-xl fixed left-0 top-0 hidden md:flex">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer group">
              <img src={logoPath} alt="Club Master" className="h-10 w-10 rounded-xl shadow-lg group-hover:shadow-primary/25 transition-all object-contain" />
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight text-foreground">Club Master</h1>
              </div>
            </div>
          </Link>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.key}>
            {group.key === "admin" ? (
              <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-2" data-testid="section-admin-panel">
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
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                        <BadgeCount count={badgeCount} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : group.key === "godmode" ? (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-2" data-testid="section-god-mode">
                <span className="flex items-center gap-1.5 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-destructive" data-testid="label-super-admin-section">
                  <Zap className="w-3 h-3" /> Super Admin
                </span>
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-destructive text-destructive-foreground shadow-sm"
                            : "text-destructive hover:bg-destructive/15"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <>
                <span className="flex items-center px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70" data-testid={`label-section-${group.key}`}>
                  {group.label}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                    const badgeCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer group",
                            isActive
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
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

      <div className="p-4 border-t border-border/50 bg-muted/20">
        {user ? (
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
              <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
            <Link href="/profile">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : null}
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex-1 justify-start text-muted-foreground"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
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
  const navGroups = useNavGroups();
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
          <div className="py-2 px-2 space-y-3">
            {navGroups.map((group) => (
              <div key={group.key}>
                {group.key === "admin" ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-2" data-testid="mobile-section-admin-panel">
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
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-2" data-testid="mobile-section-god-mode">
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
                ) : (
                  <>
                    <span className="flex items-center px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group.label}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
                        const badgeCount = item.badgeKey && badgeCounts ? badgeCounts[item.badgeKey] : 0;
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

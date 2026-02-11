import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useClubs, useMyAdminClubs } from "@/hooks/use-clubs";
import logoPath from "@assets/image_1770381062912.png";
import { useState } from "react";
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  Building2,
  MapPin,
  Home,
  Upload,
  BarChart3,
  Trophy,
  DollarSign,
  Search,
  Mail,
  KeyRound,
  Menu,
  X,
  User,
  Zap,
  Shield,
  CreditCard,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  section?: string;
}

function useNavItems(): NavItem[] {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  const isSuperAdmin = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const ownedClubs = clubs?.filter(club => club.ownerId === user?.id) || [];
  const isClubOwner = ownedClubs.length > 0;
  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sessions", label: "Sessions", icon: Calendar },
  ];

  if (isSuperAdmin || isClubOwner || hasClubAdminAccess) {
    navItems.push({ href: "/club-admin", label: "My Club", icon: Building2 });
  }

  if (isSuperAdmin || isClubOwner || hasClubAdminAccess) {
    navItems.push({ href: "/admin/venues", label: "Venues", icon: MapPin });
  }

  navItems.push({ href: "/memberships", label: "Memberships", icon: CreditCard });


  if (user?.role === "OWNER") {
    navItems.push({ href: "/super-admin", label: "God's Mode", icon: Shield, section: "super-admin" });
    navItems.push({ href: "/super-admin/users", label: "Users Control", icon: Users, section: "super-admin" });
    navItems.push({ href: "/super-admin/clubs", label: "Clubs Control", icon: Building2, section: "super-admin" });
    navItems.push({ href: "/super-admin/sessions", label: "Sessions Control", icon: Calendar, section: "super-admin" });
    navItems.push({ href: "/all-rankings", label: "All Rankings", icon: Trophy, section: "super-admin" });
    navItems.push({ href: "/admin/members", label: "Members", icon: Users, section: "super-admin" });
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck, section: "super-admin" });
    navItems.push({ href: "/admin/club-approvals", label: "Club Approvals", icon: Building2, section: "super-admin" });
    navItems.push({ href: "/admin/password-resets", label: "Password Resets", icon: KeyRound, section: "super-admin" });
    navItems.push({ href: "/admin/messages", label: "Messages", icon: Mail, section: "super-admin" });
    navItems.push({ href: "/admin/analytics", label: "Analytics", icon: BarChart3, section: "super-admin" });
    navItems.push({ href: "/admin/financials", label: "Financials", icon: DollarSign, section: "super-admin" });
    navItems.push({ href: "/admin/inventory", label: "Inventory", icon: Package, section: "super-admin" });
    navItems.push({ href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, section: "super-admin" });
    navItems.push({ href: "/admin/import-members", label: "Import Members", icon: Upload, section: "super-admin" });
  } else if (user?.role === "ADMIN") {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck, section: "admin" });
    navItems.push({ href: "/admin/members", label: "Members", icon: Users, section: "admin" });
    navItems.push({ href: "/all-rankings", label: "All Rankings", icon: Trophy, section: "admin" });
    navItems.push({ href: "/admin/password-resets", label: "Password Resets", icon: KeyRound, section: "admin" });
    navItems.push({ href: "/admin/financials", label: "Financials", icon: DollarSign, section: "admin" });
    navItems.push({ href: "/admin/inventory", label: "Inventory", icon: Package, section: "admin" });
    navItems.push({ href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, section: "admin" });
    navItems.push({ href: "/admin/import-members", label: "Import Members", icon: Upload, section: "admin" });
  }

  if (!isSuperAdmin && !isAdmin && (isClubOwner || hasClubAdminAccess)) {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck, section: "club-admin" });
    navItems.push({ href: "/admin/members", label: "Members", icon: Users, section: "club-admin" });
    navItems.push({ href: "/admin/password-resets", label: "Password Resets", icon: KeyRound, section: "club-admin" });
    navItems.push({ href: "/admin/financials", label: "Financials", icon: DollarSign, section: "club-admin" });
    navItems.push({ href: "/admin/inventory", label: "Inventory", icon: Package, section: "club-admin" });
    navItems.push({ href: "/admin/membership-board", label: "Membership Board", icon: CreditCard, section: "club-admin" });
    navItems.push({ href: "/admin/import-members", label: "Import Members", icon: Upload, section: "club-admin" });
  }

  return navItems;
}

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const navItems = useNavItems();

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border shadow-xl fixed left-0 top-0 hidden md:flex">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link href="/">
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, idx) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
          const prevItem = idx > 0 ? navItems[idx - 1] : null;
          const showSectionDivider = item.section === "super-admin" && prevItem?.section !== "super-admin";
          return (
            <div key={item.href}>
              {showSectionDivider && (
                <div className="pt-3 pb-1 px-4 mt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5" data-testid="label-super-admin-section">
                    <Zap className="w-3 h-3" /> God's Mode
                  </span>
                </div>
              )}
              {item.section === "admin" && (!prevItem || prevItem.section !== "admin") && (
                <div className="pt-3 pb-1 px-4 mt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5" data-testid="label-admin-section">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                </div>
              )}
              {item.section === "club-admin" && (!prevItem || prevItem.section !== "club-admin") && (
                <div className="pt-3 pb-1 px-4 mt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5" data-testid="label-club-admin-section">
                    <Shield className="w-3 h-3" /> Club Admin
                  </span>
                </div>
              )}
              <Link href={item.href}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    item.section === "super-admin" && !isActive && "text-muted-foreground/80"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </div>
              </Link>
            </div>
          );
        })}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : null}
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex-1 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
            onClick={() => logout()}
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
  const navItems = useNavItems();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="md:hidden sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border/40">
        <Link href="/">
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
          <div className="py-2 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(`${item.href}/`));
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
                  </Button>
                </Link>
              );
            })}
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

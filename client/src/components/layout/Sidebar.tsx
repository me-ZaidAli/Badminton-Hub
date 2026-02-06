import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useClubs, useMyAdminClubs } from "@/hooks/use-clubs";
import logoPath from "@assets/image_1770381062912.png";
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Building2,
  MapPin,
  Home,
  UserCog,
  FolderKanban,
  Upload,
  BarChart3,
  Trophy,
  DollarSign,
  GraduationCap,
  Search,
  Mail,
  KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const { data: clubs } = useClubs();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  const isOrganiser = user?.role === "ORGANISER";
  const isSuperAdmin = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const ownedClubs = clubs?.filter(club => club.ownerId === user?.id) || [];
  const isClubOwner = ownedClubs.length > 0;
  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;

  const navItems = isOrganiser ? [
    { href: "/", label: "Home", icon: Home },
    { href: "/organizer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sessions", label: "Sessions", icon: Calendar },
  ] : [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sessions", label: "Sessions", icon: Calendar },
    { href: "/rankings", label: "Rankings", icon: Activity },
    { href: "/players", label: "Players", icon: Users },
  ];

  if (isSuperAdmin || isClubOwner) {
    navItems.push({ href: "/club-admin", label: "My Club", icon: Building2 });
  }

  // Show Venues to platform super admins, club owners, or club admins
  if (isSuperAdmin || isClubOwner || hasClubAdminAccess) {
    navItems.push({ href: "/admin/venues", label: "Venues", icon: MapPin });
  }

  navItems.push({ href: "/explore/coaches", label: "Coaches", icon: GraduationCap });
  navItems.push({ href: "/find-coach", label: "Find a Coach", icon: Search });

  if (user?.role === "OWNER") {
    navItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck });
    navItems.push({ href: "/admin/clubs-management", label: "Clubs Management", icon: FolderKanban });
    navItems.push({ href: "/admin/club-approvals", label: "Club Approvals", icon: Building2 });
    navItems.push({ href: "/admin/club-admins", label: "Club Admins", icon: UserCog });
    navItems.push({ href: "/admin/coaches", label: "Coach Management", icon: GraduationCap });
    navItems.push({ href: "/admin/password-resets", label: "Password Resets", icon: KeyRound });
    navItems.push({ href: "/admin/messages", label: "Messages", icon: Mail });
    navItems.push({ href: "/admin/analytics", label: "Analytics", icon: BarChart3 });
    navItems.push({ href: "/admin/rankings", label: "All Rankings", icon: Trophy });
    navItems.push({ href: "/admin/financials", label: "Financials", icon: DollarSign });
    navItems.push({ href: "/admin/import-members", label: "Import Members", icon: Upload });
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border shadow-xl fixed left-0 top-0 hidden md:flex">
      {/* Brand */}
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

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
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
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const isOrganiser = user?.role === "ORGANISER";
  const isSuperAdmin = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const ownedClubs = clubs?.filter(club => club.ownerId === user?.id) || [];
  const isClubOwner = ownedClubs.length > 0;
  const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;

  const navItems = isOrganiser ? [
    { href: "/", icon: Home },
    { href: "/organizer", icon: LayoutDashboard },
    { href: "/sessions", icon: Calendar },
  ] : [
    { href: "/", icon: Home },
    { href: "/dashboard", icon: LayoutDashboard },
    { href: "/sessions", icon: Calendar },
  ];

  if (isSuperAdmin || isClubOwner) {
    navItems.push({ href: "/club-admin", icon: Building2 });
  }

  // Show Venues to platform super admins, club owners, or club admins
  if (isSuperAdmin || isClubOwner || hasClubAdminAccess) {
    navItems.push({ href: "/admin/venues", icon: MapPin });
  }

  if (isSuperAdmin) {
    navItems.push({ href: "/admin/clubs-management", icon: FolderKanban });
  }
  if (isAdmin) {
    navItems.push({ href: "/admin", icon: ShieldCheck });
  }
  
  // Always add Profile for mobile
  navItems.push({ href: "/profile", icon: Users });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-2 md:hidden z-50 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "p-3 rounded-xl transition-all active:scale-95",
              isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}>
              <item.icon className="h-6 w-6" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

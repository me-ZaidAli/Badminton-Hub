import { Link, useLocation, Redirect } from "wouter";
import logoPath from "@assets/image_1770381062912_optimized.png";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Menu, X, Mail, LayoutDashboard, User, LogOut, Shield, ShieldCheck, Download } from "lucide-react";
import { useState } from "react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePwaInstall } from "@/components/PwaInstallPrompt";

const publicNavItems = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Clubs", href: "/explore/clubs", icon: Search },
  { label: "Sessions", href: "/explore/sessions", icon: Calendar },
  { label: "Contact", href: "/contact", icon: Mail },
];

function useNavItems() {
  const { data: user } = useUser();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);

  if (user) {
    const items = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Clubs", href: "/explore/clubs", icon: Search },
      { label: "Sessions", href: "/explore/sessions", icon: Calendar },
      { label: "Contact", href: "/contact", icon: Mail },
    ];

    const hasClubAdminAccess = (myAdminClubs?.length ?? 0) > 0;

    if (user.role === "OWNER") {
      if (hasClubAdminAccess) {
        items.push({ label: "Admin Panel", href: "/admin", icon: ShieldCheck });
      }
      items.push({ label: "God's Mode", href: "/super-admin", icon: Shield });
    } else if (user.role === "ADMIN") {
      items.push({ label: "Admin Panel", href: "/admin", icon: ShieldCheck });
    }

    return items;
  }

  return publicNavItems;
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: user } = useUser();
  const logout = useLogout();
  const navItems = useNavItems();
  const { canInstall, isInstalled, install } = usePwaInstall();

  if (user && location === "/") {
    return <Redirect to="/dashboard" />;
  }

  const logoHref = user ? "/dashboard" : "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href={logoHref}>
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
              <img src={logoPath} alt="Club Master" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-display font-bold text-xl">Club Master</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" data-testid="nav-public">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid={`nav-${item.label.toLowerCase().replace(/['\s]/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {canInstall && !isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex gap-2"
                onClick={install}
                data-testid="button-install-pwa-header"
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
            )}
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-2" data-testid="button-go-profile">
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-sign-in">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="button-join">Join Club</Button>
                </Link>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-white dark:bg-card px-4 py-3 space-y-1" data-testid="mobile-nav-menu">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && item.href !== "/dashboard" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(/['\s]/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {user ? (
              <div className="border-t border-border/40 pt-2 mt-2 space-y-1">
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-nav-profile"
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout.mutate();
                  }}
                  data-testid="mobile-nav-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="border-t border-border/40 pt-2 mt-2 space-y-1">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-nav-signin"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    className="w-full justify-start gap-2"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="mobile-nav-join"
                  >
                    Join Club
                  </Button>
                </Link>
              </div>
            )}
            {canInstall && !isInstalled && (
              <div className="border-t border-border/40 pt-2 mt-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    install();
                  }}
                  data-testid="mobile-nav-install-pwa"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="py-8 border-t border-border text-center text-muted-foreground text-sm space-y-2">
        <p>Club Master - Badminton Club Management Platform</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/policy">
            <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-policy">Policies</span>
          </Link>
          <Link href="/contact">
            <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-contact-footer">Contact Us</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

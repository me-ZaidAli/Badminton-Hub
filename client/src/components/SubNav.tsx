import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import {
  Search, BookOpen, GraduationCap, Trophy, Wallet as WalletIcon, Users, User as UserIcon,
  Award, Settings,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  match?: (path: string) => boolean;
  show?: boolean;
};

function NavStrip({ items, variant }: { items: Item[]; variant: "default" | "bsl" }) {
  const [loc] = useLocation();
  const visible = items.filter((i) => i.show !== false);
  const isBsl = variant === "bsl";
  return (
    <nav
      className={
        isBsl
          ? "sticky top-16 md:top-0 z-30 backdrop-blur-md border-b border-cyan-400/20 bg-[hsla(222,55%,4%,0.85)]"
          : "sticky top-16 md:top-0 z-30 backdrop-blur-md border-b border-border bg-background/85"
      }
      data-testid={`subnav-${variant}`}
    >
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-thin">
          {visible.map((it) => {
            const active = it.match ? it.match(loc) : loc === it.href;
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href}>
                <a
                  className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    isBsl
                      ? active
                        ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                        : "border-cyan-400/20 text-cyan-200/70 hover:bg-cyan-500/10 hover:text-cyan-100"
                      : active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`subnav-link-${it.href.replace(/[^a-z0-9]+/gi, "-")}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{it.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function CoachSubNav() {
  const { data: user } = useUser();
  const u = user as any;
  const isCoachish = u && (u.role === "COACH" || (u.secondaryRoles ?? []).includes("COACH") || u.role === "OWNER" || u.role === "ADMIN");
  const items: Item[] = [
    { href: "/find-coach", label: "Find a Coach", icon: Search, match: (p) => p === "/find-coach" || p.startsWith("/coach/") },
    { href: "/my-lessons", label: "My Lessons", icon: BookOpen },
    { href: "/coach-dashboard", label: "Coach Dashboard", icon: GraduationCap, show: !!isCoachish },
  ];
  return <NavStrip items={items} variant="default" />;
}

export function BslSubNav() {
  const { data: user } = useUser();
  const u = user as any;
  const isAdmin = u && (u.role === "OWNER" || u.role === "ADMIN");
  const items: Item[] = [
    { href: "/bsl", label: "League", icon: Trophy, match: (p) => p === "/bsl" },
    { href: "/bsl/prizes", label: "Prize Vault", icon: Award },
    { href: "/bsl/wallet", label: "Wallet", icon: WalletIcon, show: !!u },
    { href: "/bsl/my-club", label: "My Club", icon: Users, show: !!u },
    { href: "/bsl/profile", label: "My Profile", icon: UserIcon, show: !!u },
    { href: "/bsl/admin", label: "Admin", icon: Settings, show: u?.role === "OWNER", match: (p) => p.startsWith("/bsl/admin") },
  ];
  return <NavStrip items={items} variant="bsl" />;
}

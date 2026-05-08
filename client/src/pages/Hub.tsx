import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ChevronRight } from "lucide-react";
import { useNavGroups, useBadgeCounts } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

interface HubProps {
  groupKeys: string[];
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}

const ACCENT_BG: Record<string, string> = {
  primary: "bg-primary/10",
  amber: "bg-amber-500/10",
  emerald: "bg-emerald-500/10",
  sky: "bg-sky-500/10",
  violet: "bg-violet-500/10",
  rose: "bg-rose-500/10",
};

const ACCENT_TEXT: Record<string, string> = {
  primary: "text-primary",
  amber: "text-amber-500",
  emerald: "text-emerald-500",
  sky: "text-sky-500",
  violet: "text-violet-500",
  rose: "text-rose-500",
};

const GROUP_ACCENT: Record<string, string> = {
  activity: "primary",
  club: "amber",
  comms: "sky",
  design: "violet",
  info: "emerald",
};

export default function Hub({ groupKeys, title, description, icon: Icon, accent = "primary" }: HubProps) {
  const { groups, isPremium } = useNavGroups();
  const { data: badgeCounts } = useBadgeCounts();

  const visibleGroups = groups.filter(g => groupKeys.includes(g.key));

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-2xl p-3", ACCENT_BG[accent])}>
          <Icon className={cn("h-6 w-6", ACCENT_TEXT[accent])} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-hub-title">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>

      {visibleGroups.map(group => {
        const groupAccent = GROUP_ACCENT[group.key] || accent;
        const tileBg = ACCENT_BG[groupAccent];
        const tileText = ACCENT_TEXT[groupAccent];

        return (
          <section key={group.key} className="space-y-3" data-testid={`hub-section-${group.key}`}>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border/50" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                {group.label}
              </p>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {group.items.map(item => {
                const primaryCount = item.badgeKey && badgeCounts ? (badgeCounts as any)[item.badgeKey] || 0 : 0;
                const secondaryCount = item.secondaryBadgeKey && badgeCounts ? (badgeCounts as any)[item.secondaryBadgeKey] || 0 : 0;
                const badgeCount = primaryCount + secondaryCount;
                const isLocked = item.premiumOnly && !isPremium;

                return (
                  <Link key={item.href} href={item.href}>
                    <Card
                      className="group relative aspect-square border border-border/50 bg-gradient-to-br from-card to-card/70 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden"
                      data-testid={`tile-hub-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full gap-2.5">
                        <div className={cn("rounded-2xl p-3.5 sm:p-4 group-hover:scale-110 transition-transform duration-300 shadow-sm relative", tileBg)}>
                          <item.icon className={cn("w-6 h-6 sm:w-7 sm:h-7", tileText)} />
                          {isLocked && (
                            <Lock className="absolute -top-1.5 -right-1.5 h-4 w-4 text-amber-500 bg-background rounded-full p-0.5" />
                          )}
                          {badgeCount > 0 && !isLocked && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] sm:text-sm font-semibold text-foreground leading-tight line-clamp-2">
                          {item.label}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      {visibleGroups.length === 0 && (
        <div className="text-center py-16 text-muted-foreground" data-testid="text-hub-empty">
          <ChevronRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nothing available here yet.</p>
        </div>
      )}
    </div>
  );
}

import { useIsAnyClubPremium, useClubPlan, useAdminClubId } from "@/hooks/use-club-plan";
import { useUser } from "@/hooks/use-auth";
import { Crown, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function PremiumFeatureGate({ 
  children, 
  featureName,
  description,
}: { 
  children: React.ReactNode;
  featureName: string;
  description?: string;
}) {
  const { data: user } = useUser();
  const adminClubId = useAdminClubId();
  const { isSuperAdmin } = useClubPlan(adminClubId);
  const isPremium = useIsAnyClubPremium();
  const isAdminRole = user?.role === "OWNER" || user?.role === "ADMIN";
  const hasAccess = isPremium || isSuperAdmin || isAdminRole;

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none select-none opacity-30 blur-[2px] overflow-hidden max-h-[60vh]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
        <div className="max-w-md mx-auto text-center p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/40 shadow-xl" data-testid="premium-gate-overlay">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">{featureName}</h3>
          <p className="text-sm text-muted-foreground mb-1">
            <Lock className="h-3.5 w-3.5 inline mr-1" />
            Premium Feature
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mt-3 mb-6">
              {description}
            </p>
          )}
          {!description && (
            <p className="text-sm text-muted-foreground mt-3 mb-6">
              Upgrade your club to Premium to unlock {featureName.toLowerCase()} and many more powerful features.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg" data-testid="button-upgrade-premium">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

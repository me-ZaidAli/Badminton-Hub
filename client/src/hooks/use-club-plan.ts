import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";

interface ClubPlan {
  planType: string;
  planStatus: string;
  premiumStartDate: string | null;
  premiumEndDate: string | null;
  sportTypes: string[];
}

export function useClubPlan(clubId: number | null | undefined) {
  const { data: user } = useUser();
  const isSuperAdmin = user?.role === "OWNER";

  const { data: plan, isLoading } = useQuery<ClubPlan>({
    queryKey: ["/api/clubs", clubId, "plan"],
    enabled: !!clubId && !!user,
  });

  const isPremium = isSuperAdmin || plan?.planStatus === "ACTIVE_PREMIUM";
  const isFree = !isSuperAdmin && (!plan || plan.planStatus === "FREE");
  const isPending = plan?.planStatus === "PENDING_ACTIVATION";
  const isSuspended = plan?.planStatus === "SUSPENDED";

  return {
    plan,
    isLoading,
    isPremium,
    isFree,
    isPending,
    isSuspended,
    isSuperAdmin,
    planStatus: plan?.planStatus || "FREE",
    sportTypes: plan?.sportTypes || ["badminton"],
  };
}

export function useAdminClubId() {
  const { data: adminClubs } = useQuery<any[]>({
    queryKey: ["/api/my-admin-clubs"],
  });
  return adminClubs?.[0]?.id || null;
}

export function useIsAnyClubPremium() {
  const { data: user } = useUser();
  const isSuperAdmin = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN";

  const approvedClubIds: number[] = (user?.playerProfiles || [])
    .filter((p: any) => p.membershipStatus === "APPROVED")
    .map((p: any) => p.clubId);

  const plan0 = useClubPlan(approvedClubIds[0] ?? null);
  const plan1 = useClubPlan(approvedClubIds[1] ?? null);
  const plan2 = useClubPlan(approvedClubIds[2] ?? null);
  const plan3 = useClubPlan(approvedClubIds[3] ?? null);
  const plan4 = useClubPlan(approvedClubIds[4] ?? null);

  const plans = [plan0, plan1, plan2, plan3, plan4];
  const anyClubPremium = plans.some(p => p.isPremium);

  return isSuperAdmin || isAdmin || anyClubPremium;
}

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

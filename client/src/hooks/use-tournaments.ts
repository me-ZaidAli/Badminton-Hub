import { useQuery, useMutation } from "@tanstack/react-query";
import { Tournament, TournamentCategory, TournamentTeam, TournamentMatch, TournamentStanding, TournamentCourt, TournamentPlayerStat } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useTournaments(clubId?: number) {
  return useQuery<Tournament[]>({
    queryKey: clubId ? ["/api/tournaments", `clubId=${clubId}`] : ["/api/tournaments"],
    queryFn: async () => {
      const url = clubId ? `/api/tournaments?clubId=${clubId}` : "/api/tournaments";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tournaments");
      return res.json();
    },
  });
}

export function useTournament(id: number) {
  return useQuery<Tournament & { categories: TournamentCategory[]; venue: any; club: any; registrationCount: number }>({
    queryKey: ["/api/tournaments", id],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tournament");
      return res.json();
    },
    enabled: !!id,
  });
}

export function usePublicTournament(id: number) {
  return useQuery<Tournament & { categories: TournamentCategory[]; venue: any; club: any }>({
    queryKey: ["/api/public/tournaments", id],
    queryFn: async () => {
      const res = await fetch(`/api/public/tournaments/${id}`);
      if (!res.ok) throw new Error("Tournament not found");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useTournamentCategories(tournamentId: number) {
  return useQuery<TournamentCategory[]>({
    queryKey: ["/api/tournaments", tournamentId, "categories"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/categories`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentTeams(categoryId: number) {
  return useQuery<(TournamentTeam & { player1: any; player2?: any })[]>({
    queryKey: ["/api/tournament-categories", categoryId, "teams"],
    queryFn: async () => {
      const res = await fetch(`/api/tournament-categories/${categoryId}/teams`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!categoryId,
  });
}

export function useTournamentMatches(categoryId: number) {
  return useQuery<(TournamentMatch & { teamA?: any; teamB?: any })[]>({
    queryKey: ["/api/tournament-categories", categoryId, "matches"],
    queryFn: async () => {
      const res = await fetch(`/api/tournament-categories/${categoryId}/matches`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
    enabled: !!categoryId,
  });
}

export function useTournamentStandings(categoryId: number) {
  return useQuery<TournamentStanding[]>({
    queryKey: ["/api/tournament-categories", categoryId, "standings"],
    queryFn: async () => {
      const res = await fetch(`/api/tournament-categories/${categoryId}/standings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch standings");
      return res.json();
    },
    enabled: !!categoryId,
  });
}

export function useTournamentRegistrations(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "registrations"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/registrations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch registrations");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentAllPlayers(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "all-players"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/all-players`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentPlayerPool(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "player-pool"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/player-pool`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player pool");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentPairs(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "pairs"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/pairs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pairs");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentPairRequests(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "pair-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/pair-requests`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pair requests");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentWaitlist(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "waitlist"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/waitlist`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch waitlist");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useCreateTournament() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tournaments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useUpdateTournament() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/tournaments/${id}`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.id] });
    },
  });
}

export function useDeleteTournament() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tournaments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: async ({ tournamentId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/categories`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId] });
    },
  });
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/tournament-categories/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tournament-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useRegisterTeam() {
  return useMutation({
    mutationFn: async ({ categoryId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/teams`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "teams"] });
    },
  });
}

export function useDeleteTeam() {
  return useMutation({
    mutationFn: async ({ teamId, categoryId }: { teamId: number; categoryId: number }) => {
      await apiRequest("DELETE", `/api/tournament-teams/${teamId}`);
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "standings"] });
    },
  });
}

export function useUpdateTeam() {
  return useMutation({
    mutationFn: async ({ teamId, ...data }: { teamId: number; player1Id?: number; player2Id?: number; seedNumber?: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-teams/${teamId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useBulkAssignGroups() {
  return useMutation({
    mutationFn: async ({ assignments }: { assignments: { teamId: number; groupNumber: number; subGroupNumber: number }[] }) => {
      const res = await apiRequest("PATCH", `/api/tournament-teams/bulk-assign-group`, { assignments });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useAssignTeamGroup() {
  return useMutation({
    mutationFn: async ({ teamId, groupNumber, subGroupNumber }: { teamId: number; groupNumber: number; subGroupNumber: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-teams/${teamId}/assign-group`, { groupNumber, subGroupNumber });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useWithdrawRegistration() {
  return useMutation({
    mutationFn: async ({ id, tournamentId }: { id: number; tournamentId: number }) => {
      await apiRequest("DELETE", `/api/tournament-registrations/${id}`);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "player-pool"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "pair-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "all-players"] });
    },
  });
}

export function useAutoPopulateTeams() {
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/auto-populate-teams`);
      return res.json();
    },
    onSuccess: (_data: any, categoryId: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "teams"] });
    },
  });
}

export function useGenerateMatches() {
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/generate-matches`);
      return res.json();
    },
    onSuccess: (_data: any, categoryId: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "standings"] });
    },
  });
}

export function useScoreMatch() {
  return useMutation({
    mutationFn: async ({ matchId, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/tournament-matches/${matchId}/score`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories"] });
    },
  });
}

export function useAddGroupMatch() {
  return useMutation({
    mutationFn: async ({ categoryId, teamAId, teamBId, groupNumber, subGroupNumber }: { categoryId: number; teamAId: number; teamBId: number; groupNumber?: number; subGroupNumber?: number }) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/add-group-match`, { teamAId, teamBId, groupNumber, subGroupNumber });
      return res.json();
    },
    onSuccess: (_data: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", vars.categoryId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", vars.categoryId, "standings"] });
    },
  });
}

export function useAdvanceWinners() {
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/advance-winners`);
      return res.json();
    },
    onSuccess: (_data: any, categoryId: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "standings"] });
    },
  });
}

export function useRegisterForTournament() {
  return useMutation({
    mutationFn: async ({ tournamentId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/register`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "all-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId] });
    },
  });
}

export function useUpdateRegistration() {
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/tournament-registrations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useSendPairRequest() {
  return useMutation({
    mutationFn: async ({ tournamentId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/pair-requests`, data);
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "pair-requests"] });
    },
  });
}

export function useAdminCreatePair() {
  return useMutation({
    mutationFn: async ({ tournamentId, player1Id, player2Id, pairName }: { tournamentId: number; player1Id: number; player2Id: number; pairName?: string }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/admin-create-pair`, { player1Id, player2Id, pairName });
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "pairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "pair-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "player-pool"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "registrations"] });
    },
  });
}

export function useUpdatePairName() {
  return useMutation({
    mutationFn: async ({ tournamentId, pairId, pairName }: { tournamentId: number; pairId: number; pairName: string }) => {
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}/pair-name`, { pairId, pairName });
      return res.json();
    },
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", variables.tournamentId, "pairs"] });
    },
  });
}

export function useRespondPairRequest() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tournament-pair-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"], type: "all" });
    },
  });
}

export function useTournamentIsAdmin(tournamentId: number) {
  return useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/tournaments", tournamentId, "is-admin"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/is-admin`, { credentials: "include" });
      if (!res.ok) return { isAdmin: false };
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentAdmins(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "admins"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/admins`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useTournamentEligibleAdmins(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "eligible-admins"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/eligible-admins`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useAddTournamentAdmin() {
  return useMutation({
    mutationFn: async ({ tournamentId, userId }: { tournamentId: number; userId: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/admins`, { userId });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "eligible-admins"] });
    },
  });
}

export function useRemoveTournamentAdmin() {
  return useMutation({
    mutationFn: async ({ tournamentId, adminId }: { tournamentId: number; adminId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournamentId}/admins/${adminId}`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "eligible-admins"] });
    },
  });
}

export function useSeedDemoPlayers() {
  return useMutation({
    mutationFn: async ({ tournamentId, count }: { tournamentId: number; count?: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/seed-demo-players`, { count: count || 20 });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "player-pool"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "all-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useClearDemoPlayers() {
  return useMutation({
    mutationFn: async ({ tournamentId }: { tournamentId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournaments/${tournamentId}/demo-players`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "player-pool"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "all-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useTournamentFinances(tournamentId: number) {
  return useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId, "finances"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/finances`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useConfirmTournamentPayment() {
  return useMutation({
    mutationFn: async ({ tournamentId, paymentMethod }: { tournamentId: number; paymentMethod?: string }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/confirm-payment`, { paymentMethod });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "finances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useUpdateTournamentPayment() {
  return useMutation({
    mutationFn: async ({ tournamentId, regId, paymentStatus }: { tournamentId: number; regId: number; paymentStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/tournaments/${tournamentId}/payment/${regId}`, { paymentStatus });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "finances"] });
    },
  });
}

export function useTournamentPrizesQuery(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "prizes"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/prizes`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useCreatePrize() {
  return useMutation({
    mutationFn: async ({ tournamentId, ...data }: { tournamentId: number; title: string; description?: string; categoryId?: number; placement: number; prizeValue?: string; prizeType?: string; iconType?: string }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/prizes`, data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "prizes"] });
    },
  });
}

export function useUpdatePrize() {
  return useMutation({
    mutationFn: async ({ prizeId, tournamentId, ...data }: { prizeId: number; tournamentId: number; [key: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/tournament-prizes/${prizeId}`, data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "prizes"] });
    },
  });
}

export function useDeletePrize() {
  return useMutation({
    mutationFn: async ({ prizeId, tournamentId }: { prizeId: number; tournamentId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournament-prizes/${prizeId}`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "prizes"] });
    },
  });
}

export function useTournamentCourts(tournamentId: number) {
  return useQuery<TournamentCourt[]>({
    queryKey: ["/api/tournaments", tournamentId, "courts"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/courts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch courts");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useCreateCourt() {
  return useMutation({
    mutationFn: async ({ tournamentId, name }: { tournamentId: number; name?: string }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/courts`, { name });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "courts"] });
    },
  });
}

export function useUpdateCourt() {
  return useMutation({
    mutationFn: async ({ courtId, tournamentId, ...data }: { courtId: number; tournamentId: number; name?: string; isActive?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tournament-courts/${courtId}`, data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "courts"] });
    },
  });
}

export function useDeleteCourt() {
  return useMutation({
    mutationFn: async ({ courtId, tournamentId }: { courtId: number; tournamentId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournament-courts/${courtId}`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
    },
  });
}

export function useAssignMatchCourt() {
  return useMutation({
    mutationFn: async ({ matchId, courtId, tournamentId }: { matchId: number; courtId: number | null; tournamentId: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-matches/${matchId}/assign-court`, { courtId });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "courts"] });
    },
  });
}

export function useUpdateMatchStatus() {
  return useMutation({
    mutationFn: async ({ matchId, status, tournamentId }: { matchId: number; status: string; tournamentId: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-matches/${matchId}/status`, { status });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
    },
  });
}

export function useUpdateMatchTeamNames() {
  return useMutation({
    mutationFn: async ({ matchId, teamAName, teamBName, tournamentId }: { matchId: number; teamAName?: string; teamBName?: string; tournamentId: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-matches/${matchId}/team-names`, { teamAName, teamBName });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
    },
  });
}

export function useSwapMatchPlayers() {
  return useMutation({
    mutationFn: async ({ matchId, teamAId, teamBId, tournamentId }: { matchId: number; teamAId?: number; teamBId?: number; tournamentId: number }) => {
      const res = await apiRequest("PATCH", `/api/tournament-matches/${matchId}/swap-players`, { teamAId, teamBId });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
    },
  });
}

export function useCourtView(tournamentId: number, courtId: number) {
  return useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId, "court-view", courtId],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/court-view/${courtId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch court view");
      return res.json();
    },
    enabled: !!tournamentId && !!courtId,
    refetchInterval: 10000,
  });
}

export function useAllCourtsView(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "court-view-all"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/court-view-all`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch all courts view");
      return res.json();
    },
    enabled: !!tournamentId,
    refetchInterval: 10000,
  });
}

export function useTournamentPlayerStats(tournamentId: number, categoryId?: number) {
  return useQuery<(TournamentPlayerStat & { playerName: string })[]>({
    queryKey: ["/api/tournaments", tournamentId, "player-stats", categoryId],
    queryFn: async () => {
      const url = categoryId
        ? `/api/tournaments/${tournamentId}/player-stats?categoryId=${categoryId}`
        : `/api/tournaments/${tournamentId}/player-stats`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player stats");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useRecalculateStats() {
  return useMutation({
    mutationFn: async ({ tournamentId }: { tournamentId: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/recalculate-stats`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "player-stats"] });
    },
  });
}

export function useRestartTournament() {
  return useMutation({
    mutationFn: async ({ tournamentId }: { tournamentId: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/restart`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "player-stats"] });
    },
  });
}

export function useTournamentGroups(tournamentId: number) {
  return useQuery<any[]>({
    queryKey: ["/api/tournaments", tournamentId, "groups"],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/groups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!tournamentId,
  });
}

export function useCreateTournamentGroup() {
  return useMutation({
    mutationFn: async ({ tournamentId, ...data }: { tournamentId: number; name: string; categoryId?: number; maxPairs?: number; startTime?: string; venueId?: number; hallName?: string; courtName?: string; groupOrder?: number }) => {
      const res = await apiRequest("POST", `/api/tournaments/${tournamentId}/groups`, data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "groups"] });
    },
  });
}

export function useUpdateTournamentGroup() {
  return useMutation({
    mutationFn: async ({ groupId, tournamentId, ...data }: { groupId: number; tournamentId: number; name?: string; maxPairs?: number; startTime?: string | null; venueId?: number | null; hallName?: string | null; courtName?: string | null; groupOrder?: number; categoryId?: number | null }) => {
      const res = await apiRequest("PATCH", `/api/tournament-groups/${groupId}`, data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "groups"] });
    },
  });
}

export function useDeleteTournamentGroup() {
  return useMutation({
    mutationFn: async ({ groupId }: { groupId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournament-groups/${groupId}`);
      return res.json();
    },
    onSuccess: (_, _vars, context) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
  });
}

export function useAddPairToGroup() {
  return useMutation({
    mutationFn: async ({ groupId, teamId, pairRequestId, tournamentId }: { groupId: number; teamId?: number; pairRequestId?: number; tournamentId: number }) => {
      const body: any = {};
      if (pairRequestId) body.pairRequestId = pairRequestId;
      else if (teamId) body.teamId = teamId;
      const res = await apiRequest("POST", `/api/tournament-groups/${groupId}/pairs`, body);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "groups"] });
    },
  });
}

export function useRemovePairFromGroup() {
  return useMutation({
    mutationFn: async ({ pairId, tournamentId }: { pairId: number; tournamentId: number }) => {
      const res = await apiRequest("DELETE", `/api/tournament-group-pairs/${pairId}`);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", vars.tournamentId, "groups"] });
    },
  });
}

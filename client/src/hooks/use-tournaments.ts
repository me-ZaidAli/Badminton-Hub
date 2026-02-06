import { useQuery, useMutation } from "@tanstack/react-query";
import { Tournament, TournamentCategory, TournamentTeam, TournamentMatch, TournamentStanding } from "@shared/schema";
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
  return useQuery<Tournament & { categories: TournamentCategory[]; venue: any; club: any }>({
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
  return useQuery<TournamentMatch[]>({
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
    onSuccess: (_data, variables) => {
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
    onSuccess: (_data, variables) => {
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "teams"] });
    },
  });
}

export function useDeleteTeam() {
  return useMutation({
    mutationFn: async ({ teamId, categoryId }: { teamId: number; categoryId: number }) => {
      await apiRequest("DELETE", `/api/tournament-teams/${teamId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", variables.categoryId, "standings"] });
    },
  });
}

export function useGenerateMatches() {
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/generate-matches`);
      return res.json();
    },
    onSuccess: (_data, categoryId) => {
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

export function useAdvanceWinners() {
  return useMutation({
    mutationFn: async (categoryId: number) => {
      const res = await apiRequest("POST", `/api/tournament-categories/${categoryId}/advance-winners`);
      return res.json();
    },
    onSuccess: (_data, categoryId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-categories", categoryId, "matches"] });
    },
  });
}

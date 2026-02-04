import { useQuery, useMutation } from "@tanstack/react-query";
import { Club } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useClubs() {
  return useQuery<Club[]>({
    queryKey: ["/api/clubs"],
    queryFn: async () => {
      const res = await fetch("/api/clubs");
      if (!res.ok) throw new Error("Failed to fetch clubs");
      return res.json();
    },
  });
}

export function useClub(id: number | null) {
  return useQuery<Club>({
    queryKey: ["/api/clubs", id],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${id}`);
      if (!res.ok) throw new Error("Failed to fetch club");
      return res.json();
    },
    enabled: id !== null,
  });
}

export type LeaderboardPlayer = {
  id: number;
  fullName: string;
  gender: string | null;
  category: string | null;
  rankingPoints: number;
  matchesPlayed: number;
  matchesWon: number;
};

export function useLeaderboard(clubId: number | null) {
  return useQuery<LeaderboardPlayer[]>({
    queryKey: ["/api/leaderboard", clubId],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard/${clubId}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    enabled: clubId !== null,
  });
}

export function useCreateClub() {
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/clubs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
    },
  });
}

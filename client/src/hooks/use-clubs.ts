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

// Get clubs the current user belongs to (with approved membership)
export function useMyClubs() {
  return useQuery<Club[]>({
    queryKey: ["/api/my-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/my-clubs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch my clubs");
      }
      return res.json();
    },
  });
}

export function useMySessionClubs(isAuthenticated: boolean = false) {
  return useQuery<Club[]>({
    queryKey: ["/api/my-session-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/my-session-clubs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch session clubs");
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });
}

// Get clubs where the current user has admin access (club OWNER or ADMIN role)
// Pass isAuthenticated=true when user is logged in to enable the query
export function useMyAdminClubs(isAuthenticated: boolean = false) {
  return useQuery<Club[]>({
    queryKey: ["/api/my-admin-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/my-admin-clubs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch admin clubs");
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });
}

export interface UserClubRole {
  clubId: number;
  clubRole: string;
}

export function useUserClubRoles(isAuthenticated: boolean = false) {
  return useQuery<UserClubRole[]>({
    queryKey: ["/api/user/club-roles"],
    queryFn: async () => {
      const res = await fetch("/api/user/club-roles", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch club roles");
      }
      return res.json();
    },
    enabled: isAuthenticated,
  });
}

export function useIsOrganiserOnly(isAuthenticated: boolean = false) {
  const { data: user } = useQuery<any>({ queryKey: ["/api/user"], enabled: isAuthenticated });
  const { data: clubRoles } = useUserClubRoles(isAuthenticated);
  if (user?.role === "OWNER" || user?.role === "ADMIN") return false;
  if (!clubRoles || clubRoles.length === 0) return false;
  const hasAdminOrOwner = clubRoles.some(r => r.clubRole === "ADMIN" || r.clubRole === "OWNER");
  const hasOrganiser = clubRoles.some(r => r.clubRole === "ORGANISER");
  return hasOrganiser && !hasAdminOrOwner;
}

// Get all clubs for super admin (includes pending/inactive clubs)
export function useAllClubsForAdmin(enabled: boolean = false) {
  return useQuery<Club[]>({
    queryKey: ["/api/admin/clubs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/clubs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return [];
        throw new Error("Failed to fetch admin clubs");
      }
      return res.json();
    },
    enabled,
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
  grade?: string | null;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winPercentage: number;
  setsWon: number;
  pointsWon: number;
  clubId?: number;
  clubName?: string;
  isJunior?: boolean;
  clubRole?: string;
  hasAccount?: boolean;
  nickname?: string | null;
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

export type LeaderboardFilters = {
  clubId?: number;
  category?: string;
  gender?: string;
  matchType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useFilteredLeaderboard(filters: LeaderboardFilters) {
  const params = new URLSearchParams();
  if (filters.clubId) params.set("clubId", filters.clubId.toString());
  if (filters.category) params.set("category", filters.category);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.matchType) params.set("matchType", filters.matchType);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();

  return useQuery<LeaderboardPlayer[]>({
    queryKey: ["/api/leaderboard", filters],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });
}

export type DetailedPlayerStats = {
  id: number;
  fullName: string;
  category: string | null;
  grade?: string | null;
  gender: string | null;
  clubId: number;
  clubName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRatio: number;
  recentForm: boolean[];
  isJunior: boolean;
  matchHistory: {
    id: number;
    sessionId: number;
    sessionTitle: string;
    scoreA: number | null;
    scoreB: number | null;
    isTeamA: boolean;
    won: boolean;
    completedAt: string | null;
    opponent1: string;
    opponent2: string | null;
    partner: string | null;
    playersPerSide: number;
  }[];
};

export function useDetailedPlayerStats(profileId: number | null, filters?: { dateFrom?: string; dateTo?: string; matchType?: string }) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.matchType) params.set("matchType", filters.matchType);
  const qs = params.toString();

  return useQuery<DetailedPlayerStats>({
    queryKey: ["/api/players", profileId, "detailed-stats", filters],
    queryFn: async () => {
      const res = await fetch(`/api/players/${profileId}/detailed-stats${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch player stats");
      return res.json();
    },
    enabled: profileId !== null,
  });
}

export function useSessionLeaderboard(sessionId: number | null) {
  return useQuery<LeaderboardPlayer[]>({
    queryKey: ["/api/sessions", sessionId, "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch session leaderboard");
      return res.json();
    },
    enabled: sessionId !== null,
    refetchInterval: 5000,
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

export type PersonalMatchHistory = {
  id: number;
  completedAt: string | null;
  scoreA: number | null;
  scoreB: number | null;
  isTeamA: boolean;
  won: boolean;
};

export type PersonalRankingData = {
  profile: {
    id: number;
    fullName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    category: string | null;
  };
  matchHistory: PersonalMatchHistory[];
};

export function usePersonalRanking(clubId: number | null) {
  return useQuery<PersonalRankingData>({
    queryKey: ["/api/personal-ranking", clubId],
    queryFn: async () => {
      const res = await fetch(`/api/personal-ranking/${clubId}`, {
        credentials: "include"
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to view personal ranking");
        if (res.status === 404) throw new Error("No profile in this club");
        throw new Error("Failed to fetch personal ranking");
      }
      return res.json();
    },
    enabled: clubId !== null,
  });
}

export function useMyTournamentClubs(enabled: boolean = true) {
  return useQuery<Club[]>({
    queryKey: ["/api/my-session-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/my-session-clubs", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to fetch tournament clubs");
      }
      return res.json();
    },
    enabled,
  });
}

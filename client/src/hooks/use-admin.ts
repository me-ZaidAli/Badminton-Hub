import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useAnnouncements() {
  return useQuery({
    queryKey: [api.announcements.list.path],
    queryFn: async () => {
      const res = await fetch(api.announcements.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return api.announcements.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string; visibleTo: "ALL" | "PLAYERS" | "ADMINS" }) => {
      const res = await apiRequest(api.announcements.create.method, api.announcements.create.path, data);
      return api.announcements.create.responses[201].parse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.announcements.list.path] });
    },
  });
}

export function useAllSignups() {
  return useQuery({
    queryKey: ["/api/admin/signups"],
    queryFn: async () => {
      const res = await fetch("/api/admin/signups", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signups");
      return res.json();
    },
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, signupId, status }: { sessionId: number; signupId: number; status: "PAID" | "UNPAID" }) => {
      const res = await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${signupId}/payment`, { status });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signups"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/player-session-history"
      });
    },
  });
}

export function usePlayerSessionHistory(playerId: number | null) {
  return useQuery({
    queryKey: ["/api/player-session-history", playerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/players/${playerId}/sessions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch player session history");
      return res.json();
    },
    enabled: !!playerId,
  });
}

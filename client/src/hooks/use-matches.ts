import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSessionMatches(sessionId: number) {
  return useQuery({
    queryKey: [api.matches.list.path, sessionId],
    queryFn: async () => {
      const url = buildUrl(api.matches.list.path, { sessionId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return api.matches.list.responses[200].parse(await res.json());
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll for live scores
  });
}

export function useGenerateMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, mode }: { sessionId: number, mode: "COMPETITIVE" | "SOCIAL" }) => {
      const url = buildUrl(api.matches.generate.path, { sessionId });
      const res = await fetch(url, {
        method: api.matches.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, roundNumber: 1 }), // simplified for now
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate matches");
      return api.matches.generate.responses[201].parse(await res.json());
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
      toast({ title: "Matches Generated", description: "Players have been assigned to courts." });
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number, scoreA?: number, scoreB?: number, isCompleted?: boolean }) => {
      const url = buildUrl(api.matches.update.path, { id });
      const res = await fetch(url, {
        method: api.matches.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update match");
      return api.matches.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      // We don't have sessionId directly in the response to invalidate efficiently without fetching,
      // but query key structure allows fuzzy invalidation if needed.
    },
  });
}

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
    },
  });
}

export function useStartMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, courtNumber }: { matchId: number; courtNumber: number }) => {
      const res = await fetch(`/api/matches/${matchId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtNumber }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Started", description: "Timer is now running." });
    },
  });
}

export function useCompleteMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, scoreA, scoreB }: { matchId: number; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/matches/${matchId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA, scoreB }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete match");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Completed", description: "Scores have been recorded." });
    },
  });
}

export function useSwapPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, position, newPlayerId }: { matchId: number; position: string; newPlayerId: number }) => {
      const res = await fetch(`/api/matches/${matchId}/swap-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, newPlayerId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to swap player");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Player Swapped", description: "Match lineup updated." });
    },
  });
}

export function useAutoGenerateMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, numberOfMatches, courtsToUse }: { sessionId: number; numberOfMatches: number; courtsToUse: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/auto-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberOfMatches, courtsToUse }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate matches");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
      toast({ title: "Matches Generated", description: "New matches added to queue." });
    },
  });
}

export function useEditMatchScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, scoreA, scoreB }: { matchId: number; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/matches/${matchId}/edit-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA, scoreB }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to edit match score");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Score Updated", description: "Match score has been corrected." });
    },
  });
}

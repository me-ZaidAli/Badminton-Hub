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
    refetchInterval: 3000,
    staleTime: 0,
  });
}

export function useGenerateMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, mode }: { sessionId: number, mode: "COMPETITIVE" | "SOCIAL" | "TRAINING" }) => {
      const url = buildUrl(api.matches.generate.path, { sessionId });
      const res = await fetch(url, {
        method: api.matches.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, roundNumber: 1 }),
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to complete match");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Completed", description: "Scores have been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot Complete Match", description: error.message, variant: "destructive" });
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
    mutationFn: async ({ sessionId, numberOfMatches, courtsToUse, matchGenderType }: { sessionId: number; numberOfMatches: number; courtsToUse: number; matchGenderType?: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/auto-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberOfMatches, courtsToUse, matchGenderType }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate matches");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
      toast({ title: "Matches Generated", description: "New matches added to queue." });
    },
  });
}

export function useSmartGenerateMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, mode, queueTargetSize, genderType, isAutoGenerate }: { sessionId: number; mode: "SOCIAL" | "COMPETITIVE"; queueTargetSize: number; genderType?: string; isAutoGenerate?: boolean }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/smart-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, queueTargetSize, genderType, isAutoGenerate }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate matches");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (data?.status !== "waiting" && data?.status !== "full") {
        queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", vars.sessionId, "leaderboard"] });
      }
    },
  });
}

export function useHandlePause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, pausedPlayerId }: { sessionId: number; pausedPlayerId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/handle-pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausedPlayerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to handle pause");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
    },
  });
}

export function useHandleResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, resumedPlayerId, mode, genderType }: { sessionId: number; resumedPlayerId: number; mode?: string; genderType?: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/handle-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumedPlayerId, mode, genderType }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to handle resume");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
    },
  });
}

export function useUpdateMatchTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, pointsToPlayTo }: { matchId: number; pointsToPlayTo: number }) => {
      const res = await fetch(`/api/matches/${matchId}/points-target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsToPlayTo }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update points target");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Points Target Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useReshuffleMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, mode, genderType }: { matchId: number; mode?: string; genderType?: string }) => {
      const res = await fetch(`/api/matches/${matchId}/reshuffle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, genderType }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to reshuffle match");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Reshuffled", description: "New player combination generated." });
    },
    onError: (error: Error) => {
      toast({ title: "Reshuffle Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteQueuedMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, mode, genderType }: { matchId: number; mode?: string; genderType?: string }) => {
      const params = new URLSearchParams();
      if (mode) params.set("mode", mode);
      if (genderType) params.set("genderType", genderType);
      const res = await fetch(`/api/matches/${matchId}/queued?${params.toString()}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete queued match");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Removed", description: "A replacement match has been generated." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useEditMatchScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, scoreA, scoreB, setScores }: { matchId: number; scoreA: number; scoreB: number; setScores?: { scoreA: number; scoreB: number }[] }) => {
      const res = await fetch(`/api/matches/${matchId}/edit-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA, scoreB, setScores }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to edit match score");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Score Updated", description: "Match score has been corrected." });
    },
  });
}

export function usePlayerEnterScore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, scoreA, scoreB }: { matchId: number; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/matches/${matchId}/player-score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA, scoreB }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to enter score");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Score Entered", description: "Match score has been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot Enter Score", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId }: { matchId: number }) => {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete match");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Deleted", description: "The match has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useEndSet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId, setNumber, scoreA, scoreB }: { matchId: number; setNumber: number; scoreA: number; scoreB: number }) => {
      const res = await fetch(`/api/matches/${matchId}/end-set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setNumber, scoreA, scoreB }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to end set");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      if (data.matchCompleted) {
        toast({ title: "Match Completed", description: "All sets have been played and scores recorded." });
      } else {
        const completedSet = (data.currentSet || 2) - 1;
        toast({ title: `Set ${completedSet} Recorded`, description: `Set score saved. Ready for set ${data.currentSet}.` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Cannot End Set", description: error.message, variant: "destructive" });
    },
  });
}

export function useCancelLiveMatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ matchId }: { matchId: number }) => {
      const res = await fetch(`/api/matches/${matchId}/cancel-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to cancel live match");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Match Cancelled", description: "The live match has been cancelled and the court is now free." });
    },
    onError: (error: Error) => {
      toast({ title: "Cancel Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useTrimQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, targetSize }: { sessionId: number; targetSize: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/trim-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetSize }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to trim queue");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
    },
  });
}

export function useClearQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/clear-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to clear queue");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", vars.sessionId] });
      toast({ title: "Queue Cleared", description: `${data.deleted} queued match${data.deleted !== 1 ? 'es' : ''} removed.` });
    },
    onError: (error: Error) => {
      toast({ title: "Clear Failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useStopAllMatches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: number }) => {
      const res = await fetch(`/api/sessions/${sessionId}/matches/stop-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to stop all matches");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path, vars.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", vars.sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", vars.sessionId, "leaderboard"] });
      toast({ title: "All Matches Stopped", description: `${data.deletedQueued} queued matches removed. ${data.frozenLive} live matches need score entry.` });
    },
    onError: (error: Error) => {
      toast({ title: "Stop Failed", description: error.message, variant: "destructive" });
    },
  });
}

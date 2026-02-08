import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertSession } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSessions() {
  return useQuery({
    queryKey: [api.sessions.list.path],
    queryFn: async () => {
      const res = await fetch(api.sessions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return api.sessions.list.responses[200].parse(await res.json());
    },
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: [api.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch session");
      return api.sessions.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useSessionSignups(sessionId: number) {
  return useQuery({
    queryKey: [api.sessions.signups.path, sessionId],
    queryFn: async () => {
      const url = buildUrl(api.sessions.signups.path, { id: sessionId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch signups");
      return api.sessions.signups.responses[200].parse(await res.json());
    },
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: InsertSession) => {
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create session");
      return api.sessions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Created", description: "Players can now sign up." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create session.", variant: "destructive" });
    }
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: number; updates: { courtsAvailable?: number; maxPlayers?: number; matchMode?: string; status?: string; shuttleTubesUsed?: number; allowedCategories?: string[]; courtNames?: string[]; liveStreamUrl?: string; autoGenerateActive?: boolean } }) => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update session");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Updated", description: "Settings have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update session.", variant: "destructive" });
    }
  });
}

export function useJoinSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const url = buildUrl(api.sessions.join.path, { id: sessionId });
      const res = await fetch(url, {
        method: api.sessions.join.method,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to join");
      }
      return api.sessions.join.responses[201].parse(await res.json());
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Joined!", description: "You are signed up for this session." });
    },
    onError: (err) => {
      toast({ title: "Could not join", description: err.message, variant: "destructive" });
    }
  });
}

export function useWithdrawSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const url = buildUrl(api.sessions.withdraw.path, { id: sessionId });
      const res = await fetch(url, {
        method: api.sessions.withdraw.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to withdraw");
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Withdrawn", description: "You have been removed from the session." });
    },
  });
}

export function useAdminAddPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await fetch(`/api/admin/sessions/${sessionId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add player");
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Player Added", description: "Player has been added to the session." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useAdminRemovePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await fetch(`/api/admin/sessions/${sessionId}/players/${playerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to remove player");
      }
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Player Removed", description: "Player has been removed from the session." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete session");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Session Deleted", description: "The session has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useToggleGender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, signupId, gender }: { sessionId: number; signupId: number; gender: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/signups/${signupId}/gender`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update gender");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
    },
  });
}

export function useTogglePause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, signupId, isPaused }: { sessionId: number; signupId: number; isPaused: boolean }) => {
      const res = await fetch(`/api/sessions/${sessionId}/signups/${signupId}/pause`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaused }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update pause status");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
    },
  });
}

export function useSetPairGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, signupId, pairGroupId }: { sessionId: number; signupId: number; pairGroupId: number | null }) => {
      const res = await fetch(`/api/sessions/${sessionId}/signups/${signupId}/pair`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairGroupId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to set pair");
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
    },
  });
}

export function useAddGuestPlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ sessionId, fullName, gender, category }: { sessionId: number; fullName: string; gender?: string; category?: string }) => {
      const res = await fetch(`/api/sessions/${sessionId}/guest-player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, gender, category }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add guest player");
      }
      return res.json();
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.signups.path, sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Player Added", description: "New player has been added to the session." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useDeleteSessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sessionIds: number[]) => {
      const res = await fetch(`/api/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete sessions");
      }
      return res.json();
    },
    onSuccess: (_, sessionIds) => {
      queryClient.invalidateQueries({ queryKey: [api.sessions.list.path] });
      toast({ title: "Sessions Deleted", description: `${sessionIds.length} sessions have been removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

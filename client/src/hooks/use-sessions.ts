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
      toast({ title: "Withdrawn", description: "You have been removed from the session." });
    },
  });
}

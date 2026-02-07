import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function usePendingUsers() {
  return useQuery({
    queryKey: ["/api/admin/pending-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pending-users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch players");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: { fullName: string; email: string; password?: string; role?: string; gender?: string; category?: string }) => {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create player");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Player Created", description: "New player has been added." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: {
      id: number;
      fullName?: string;
      email?: string;
      role?: string;
      gender?: string;
      category?: string;
      rankingPoints?: number;
      phone?: string | null;
      dateOfBirth?: string | null;
      isJunior?: boolean;
      parentGuardianName?: string | null;
      parentGuardianEmail?: string | null;
      password?: string;
      clubId?: number;
    }) => {
      const { id, ...updates } = data;
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update player");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "Player Updated", description: "Changes have been saved." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

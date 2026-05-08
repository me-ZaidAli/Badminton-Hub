import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUser } from "@shared/routes";
import { z } from "zod";

export function useUser() {
  return useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
  });
}

export class LoginError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, opts?: { code?: string; status?: number }) {
    super(message);
    this.name = "LoginError";
    this.code = opts?.code;
    this.status = opts?.status;
  }
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: z.infer<typeof api.auth.login.input>) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new LoginError(data?.message || "Invalid email or password", {
          code: data?.code,
          status: res.status,
        });
      }
      const userData = await res.json();
      queryClient.setQueryData(["/api/auth/me"], userData);
      const meRes = await fetch(api.auth.me.path, { credentials: "include" });
      if (meRes.ok) {
        const fullUser = await meRes.json();
        queryClient.setQueryData(["/api/auth/me"], fullUser);
      }
      return userData;
    },
  });
}

export function useReopenAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/auth/reopen-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.username, password: credentials.password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to reopen account");
      }
      const userData = await res.json();
      queryClient.setQueryData(["/api/auth/me"], userData);
      const meRes = await fetch(api.auth.me.path, { credentials: "include" });
      if (meRes.ok) {
        const fullUser = await meRes.json();
        queryClient.setQueryData(["/api/auth/me"], fullUser);
      }
      return userData;
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.auth.register.input>) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
    // Auto-login logic would usually happen here or user redirects to login
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      queryClient.clear();
      window.location.href = "/";
    },
  });
}

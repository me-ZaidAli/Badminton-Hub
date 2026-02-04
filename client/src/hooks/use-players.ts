import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

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

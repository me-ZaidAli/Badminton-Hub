import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Venue, InsertVenue } from "@shared/schema";

export function useVenues(clubId: number | null | undefined) {
  return useQuery<Venue[]>({
    queryKey: ["/api/clubs", clubId, "venues"],
    queryFn: async () => {
      if (!clubId) return [];
      const res = await fetch(`/api/clubs/${clubId}/venues`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch venues");
      return res.json();
    },
    enabled: !!clubId,
  });
}

export function useCreateVenue(clubId: number) {
  return useMutation({
    mutationFn: async (venue: Omit<InsertVenue, "clubId">) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/venues`, venue);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "venues"] });
    },
  });
}

export function useUpdateVenue(clubId: number | null | undefined) {
  return useMutation({
    mutationFn: async ({ venueId, updates }: { venueId: number; updates: Partial<Venue> }) => {
      const res = await apiRequest("PATCH", `/api/venues/${venueId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "venues"] });
    },
  });
}

export function useDeleteVenue(clubId: number | null | undefined) {
  return useMutation({
    mutationFn: async (venueId: number) => {
      const res = await apiRequest("DELETE", `/api/venues/${venueId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "venues"] });
    },
  });
}

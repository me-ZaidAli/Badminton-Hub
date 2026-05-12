import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";

export default function CoachProfile() {
  const { toast } = useToast();
  const { data: coach } = useUser();
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/coaches/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPhotoPreview(data.url);
      await apiRequest("PATCH", "/api/coaches/me", { profilePhoto: data.url });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({ title: "Photo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return null;
}

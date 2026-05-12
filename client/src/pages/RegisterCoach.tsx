import { useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RegisterCoach() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
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
      toast({ title: "Photo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return null;
}

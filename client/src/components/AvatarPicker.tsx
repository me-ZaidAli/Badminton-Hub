import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const AVATAR_PRESETS = [
  { id: "avatar-male-1", label: "Athletic Guy", url: "/avatars/avatar-male-1.png" },
  { id: "avatar-male-2", label: "Cool Player", url: "/avatars/avatar-male-2.png" },
  { id: "avatar-male-3", label: "Smart Coach", url: "/avatars/avatar-male-3.png" },
  { id: "avatar-male-4", label: "Sport Star", url: "/avatars/avatar-male-4.png" },
  { id: "avatar-male-5", label: "Veteran Pro", url: "/avatars/avatar-male-5.png" },
  { id: "avatar-female-1", label: "Athletic Girl", url: "/avatars/avatar-female-1.png" },
  { id: "avatar-female-2", label: "Sharp Player", url: "/avatars/avatar-female-2.png" },
  { id: "avatar-female-3", label: "Power Player", url: "/avatars/avatar-female-3.png" },
  { id: "avatar-female-4", label: "Star Athlete", url: "/avatars/avatar-female-4.png" },
  { id: "avatar-female-5", label: "Pro Player", url: "/avatars/avatar-female-5.png" },
];

export function getAvatarUrl(selectedAvatar: string | null | undefined): string | null {
  if (!selectedAvatar) return null;
  const preset = AVATAR_PRESETS.find(a => a.id === selectedAvatar);
  return preset ? preset.url : null;
}

export { AVATAR_PRESETS };

export default function AvatarPicker({
  currentAvatar,
  trigger,
}: {
  currentAvatar: string | null | undefined;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentAvatar || null);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelected(currentAvatar || null);
    }
    setOpen(newOpen);
  };
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async (avatarId: string | null) => {
      const res = await apiRequest("POST", "/api/user/selected-avatar", { selectedAvatar: avatarId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Avatar updated", description: "Your 3D avatar has been saved." });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save avatar.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-open-avatar-picker">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Choose 3D Avatar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-avatar-picker">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Choose Your 3D Avatar
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-2">
          {AVATAR_PRESETS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => setSelected(avatar.id)}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                selected === avatar.id
                  ? "border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  : "border-border/40 hover:border-cyan-400/50"
              }`}
              data-testid={`button-avatar-${avatar.id}`}
            >
              <img
                src={avatar.url}
                alt={avatar.label}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              {selected === avatar.id && (
                <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                  <div className="bg-cyan-400 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              <p className="text-[10px] text-center py-1 text-muted-foreground truncate px-1">{avatar.label}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          {currentAvatar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveMutation.mutate(null)}
              disabled={saveMutation.isPending}
              data-testid="button-remove-avatar"
            >
              Remove Avatar
            </Button>
          )}
          <Button
            onClick={() => saveMutation.mutate(selected)}
            disabled={saveMutation.isPending || selected === currentAvatar}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            data-testid="button-save-avatar"
          >
            {saveMutation.isPending ? "Saving..." : "Save Avatar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

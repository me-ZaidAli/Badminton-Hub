import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ImagePlus, Loader2, Pencil, Plus, X } from "lucide-react";
import { MetalCardFront, CARD_ICONS } from "@/components/MetalCard";
import { createCardSchema, cardIconPatterns, type CardIconPattern, type CardRecord, type CreateCardInput } from "@shared/schema";
import type { CreateCardDialogProps } from "./CreateCardDialog.types";

const CATEGORY_LABELS: Record<CreateCardInput["cardCategory"], string> = {
  admin_gifted: "Admin Gifted",
  milestone: "Milestone",
};

export function CreateCardDialog({ open, onOpenChange, cardToEdit }: CreateCardDialogProps) {
  const { toast } = useToast();
  const isEditing = Boolean(cardToEdit);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cardCategory, setCardCategory] = useState<CreateCardInput["cardCategory"]>("admin_gifted");
  const [pattern, setPattern] = useState<CardIconPattern>("stars");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(cardToEdit?.name ?? "");
    setDescription(cardToEdit?.description ?? "");
    setCardCategory(cardToEdit?.cardCategory === "milestone" ? "milestone" : "admin_gifted");
    setPattern(cardIconPatterns.find((iconPattern) => iconPattern === cardToEdit?.designConfig?.pattern) ?? "stars");
    setIsActive(cardToEdit?.isActive ?? true);
    setImageUrl(cardToEdit?.designConfig?.imageUrl);
  }, [open, cardToEdit]);

  const closeDialog = () => {
    onOpenChange(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (cardInput: CreateCardInput): Promise<CardRecord> => {
      const response = cardToEdit
        ? await apiRequest("PUT", `/api/admin/cards/${cardToEdit.id}`, cardInput)
        : await apiRequest("POST", "/api/admin/cards", cardInput);
      return response.json();
    },
    onSuccess: (savedCard) => {
      toast(isEditing
        ? { title: "Card Updated", description: `"${savedCard.name}" has been saved.` }
        : { title: "Card Created", description: `"${savedCard.name}" has been added to the card gallery.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-issued-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-cards"] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: isEditing ? "Could not update card" : "Could not create card", description: error.message, variant: "destructive" });
    },
  });

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const response = await fetch("/api/admin/cards/upload-image", { method: "POST", body: formData, credentials: "include" });
      const responseBody: { imageUrl?: string; message?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !responseBody.imageUrl) throw new Error(responseBody.message ?? "Upload failed");
      setImageUrl(responseBody.imageUrl);
    } catch (error) {
      toast({ title: "Artwork upload failed", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    const parsed = createCardSchema.safeParse({ name, description, cardCategory, pattern, imageUrl, isActive });
    if (!parsed.success) {
      toast({ title: "Check the card details", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); }}>
      <DialogContent className="bg-background max-h-[90vh] overflow-y-auto" data-testid="dialog-create-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Pencil className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5 text-amber-500" />}
            {isEditing ? "Edit Card Type" : "New Card Type"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Changes apply to every copy of this card that has already been issued."
              : "Add a new recognition card to the gallery so it can be issued to players."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="mx-auto w-56">
            <div className="relative" style={{ aspectRatio: "1.586", borderRadius: "20px" }} data-testid="card-create-preview">
              {/* cardId 0 has no built-in artwork, so a new card without an upload previews the default metal material. */}
              <MetalCardFront cardId={cardToEdit?.id ?? 0} cardName={name.trim() || "Card Name"} pattern={pattern} imageUrl={imageUrl} size="compact" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Artwork (optional)</Label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageSelected}
              data-testid="input-create-card-image"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
                data-testid="button-upload-card-image"
              >
                {isUploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                {imageUrl ? "Replace artwork" : "Upload artwork"}
              </Button>
              {imageUrl && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setImageUrl(undefined)} aria-label="Remove artwork" data-testid="button-remove-card-image">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Landscape PNG, JPEG or WebP, up to 5MB. Around 1586×1000 works best. The artwork is shown as-is, so include the card title in the design like the built-in cards.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-card-name">Name</Label>
            <Input
              id="create-card-name"
              value={name}
              maxLength={60}
              placeholder="e.g. Smash Specialist"
              onChange={(event) => setName(event.target.value)}
              data-testid="input-create-card-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-card-description">Description</Label>
            <Textarea
              id="create-card-description"
              value={description}
              maxLength={500}
              rows={3}
              placeholder="What is this card awarded for?"
              onChange={(event) => setDescription(event.target.value)}
              data-testid="input-create-card-description"
            />
            <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={cardCategory} onValueChange={(value) => setCardCategory(value as CreateCardInput["cardCategory"])}>
              <SelectTrigger data-testid="select-create-card-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([categoryValue, categoryLabel]) => (
                  <SelectItem key={categoryValue} value={categoryValue}>{categoryLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {cardIconPatterns.map((iconPattern) => {
                const IconComponent = CARD_ICONS[iconPattern];
                const isSelected = pattern === iconPattern;
                return (
                  <button
                    key={iconPattern}
                    type="button"
                    title={iconPattern}
                    aria-label={`Icon ${iconPattern}`}
                    aria-pressed={isSelected}
                    onClick={() => setPattern(iconPattern)}
                    className={`flex items-center justify-center h-10 rounded-md border transition-colors ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    data-testid={`button-create-card-icon-${iconPattern}`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-card-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
              data-testid="checkbox-create-card-active"
            />
            <Label htmlFor="create-card-active" className="cursor-pointer">Active (available to issue)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={saveMutation.isPending} data-testid="button-cancel-create-card">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || isUploadingImage || !name.trim() || !description.trim()}
            data-testid="button-submit-create-card"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {isEditing ? "Save Changes" : "Create Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

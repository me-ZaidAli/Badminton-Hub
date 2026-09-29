import type { CardRecord } from "@shared/schema";

export interface EditableCard {
  id: number;
  name: string;
  description: string;
  cardCategory: string;
  rarityLevel: CardRecord["rarityLevel"];
  weeklyCreditValue: number;
  designConfig: { pattern?: string; imageUrl?: string } | null;
  isActive: boolean;
}

export interface CreateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardToEdit?: EditableCard | null;
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CreditCard, Award, ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type UserCard = {
  id: number;
  cardId: number;
  customReason: string | null;
  rarityLevel: string;
  serialNumber: string;
  issuedAt: string;
  revokedAt: string | null;
  cardName: string;
  cardDescription: string;
  cardCategory: string;
  designConfig: {
    gradient: string;
    textColor: string;
    accentColor: string;
    pattern?: string;
  } | null;
  issuerName: string | null;
};

const RARITY_CONFIG: Record<string, { label: string; border: string; glow: string; badge: string }> = {
  standard: { label: "Standard", border: "border-zinc-400", glow: "", badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  rare: { label: "Rare", border: "border-blue-400", glow: "shadow-blue-500/20 shadow-lg", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  epic: { label: "Epic", border: "border-purple-400", glow: "shadow-purple-500/30 shadow-xl", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  legendary: { label: "Legendary", border: "border-amber-400", glow: "shadow-amber-500/40 shadow-xl", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  mythic: { label: "Mythic", border: "border-rose-400", glow: "shadow-rose-500/50 shadow-2xl", badge: "bg-gradient-to-r from-rose-500 to-purple-500 text-white" },
};

function CardPatternOverlay({ pattern }: { pattern?: string }) {
  if (!pattern) return null;
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.08] pointer-events-none select-none">
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full border-2 border-current" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full border-2 border-current" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rotate-45 border border-current" />
    </div>
  );
}

function RecognitionCard3D({ card, onClick, compact = false }: { card: UserCard; onClick?: () => void; compact?: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = RARITY_CONFIG[card.rarityLevel] || RARITY_CONFIG.standard;
  const gradient = card.designConfig?.gradient || "from-gray-500 to-gray-700";
  const textColor = card.designConfig?.textColor || "text-white";

  const handleClick = () => {
    if (onClick) onClick();
    else setIsFlipped(!isFlipped);
  };

  const cardHeight = compact ? "h-44" : "h-56";
  const cardWidth = compact ? "w-32" : "w-44";

  return (
    <div className={`${cardWidth} ${cardHeight} cursor-pointer`} style={{ perspective: "1000px" }} onClick={handleClick} data-testid={`card-recognition-${card.id}`}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} ${rarity.border} border-2 ${rarity.glow} p-3 flex flex-col justify-between backface-hidden`}
          style={{ backfaceVisibility: "hidden" }}>
          <CardPatternOverlay pattern={card.designConfig?.pattern} />
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <Award className={`h-5 w-5 ${textColor}`} />
              <span className={`text-[10px] font-mono ${textColor} opacity-70`}>{card.serialNumber}</span>
            </div>
          </div>
          <div className="relative z-10 text-center">
            <p className={`text-sm font-bold ${textColor} leading-tight`}>{card.cardName}</p>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold ${rarity.badge}`}>
                {rarity.label}
              </span>
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <span className={`text-[9px] ${textColor} opacity-60`}>{format(new Date(card.issuedAt), "MMM yyyy")}</span>
            <Sparkles className={`h-3 w-3 ${textColor} opacity-50`} />
          </div>
        </div>

        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} ${rarity.border} border-2 ${rarity.glow} p-3 flex flex-col justify-between`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <CardPatternOverlay pattern={card.designConfig?.pattern} />
          <div className="relative z-10">
            <p className={`text-[10px] font-semibold ${textColor} mb-1`}>About this Card</p>
            <p className={`text-[9px] ${textColor} opacity-80 leading-relaxed line-clamp-4`}>{card.cardDescription}</p>
          </div>
          <div className="relative z-10 space-y-1">
            {card.customReason && (
              <div>
                <p className={`text-[9px] font-semibold ${textColor} opacity-70`}>Reason</p>
                <p className={`text-[9px] ${textColor} opacity-80 line-clamp-2`}>{card.customReason}</p>
              </div>
            )}
            {card.issuerName && (
              <p className={`text-[9px] ${textColor} opacity-60`}>Awarded by {card.issuerName}</p>
            )}
            <p className={`text-[9px] ${textColor} opacity-50`}>{format(new Date(card.issuedAt), "dd MMM yyyy")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FullScreenCardCarousel({ cards: cardList, initialIndex, open, onClose }: { cards: UserCard[]; initialIndex: number; open: boolean; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cardList[currentIndex];
  if (!currentCard) return null;

  const rarity = RARITY_CONFIG[currentCard.rarityLevel] || RARITY_CONFIG.standard;
  const gradient = currentCard.designConfig?.gradient || "from-gray-500 to-gray-700";
  const textColor = currentCard.designConfig?.textColor || "text-white";

  const goNext = () => { setIsFlipped(false); setCurrentIndex((i) => (i + 1) % cardList.length); };
  const goPrev = () => { setIsFlipped(false); setCurrentIndex((i) => (i - 1 + cardList.length) % cardList.length); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 bg-black/95 border-none overflow-hidden" data-testid="dialog-card-carousel">
        <div className="relative flex flex-col items-center justify-center min-h-[480px] p-6">
          <Button variant="ghost" size="icon" className="absolute top-3 right-3 text-white/70 z-50" onClick={onClose} data-testid="button-close-carousel">
            <X className="h-5 w-5" />
          </Button>

          <div className="text-center mb-4">
            <p className="text-white/50 text-xs">{currentIndex + 1} of {cardList.length}</p>
          </div>

          <div className="relative flex items-center gap-4">
            {cardList.length > 1 && (
              <Button variant="ghost" size="icon" className="text-white/60 shrink-0" onClick={goPrev} data-testid="button-carousel-prev">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <div className="w-72 h-96" style={{ perspective: "1200px" }} onClick={() => setIsFlipped(!isFlipped)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                  animate={{ opacity: 1, scale: 1, rotateY: isFlipped ? 180 : 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotateY: 30 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="relative w-full h-full cursor-pointer"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} ${rarity.border} border-3 ${rarity.glow} p-6 flex flex-col justify-between`}
                    style={{ backfaceVisibility: "hidden" }}>
                    <CardPatternOverlay pattern={currentCard.designConfig?.pattern} />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start">
                        <Award className={`h-8 w-8 ${textColor}`} />
                        <span className={`text-xs font-mono ${textColor} opacity-70`}>{currentCard.serialNumber}</span>
                      </div>
                    </div>
                    <div className="relative z-10 text-center space-y-2">
                      <p className={`text-xl font-bold ${textColor} leading-tight`}>{currentCard.cardName}</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${rarity.badge}`}>
                        {rarity.label}
                      </span>
                    </div>
                    <div className="relative z-10 flex justify-between items-end">
                      <span className={`text-xs ${textColor} opacity-60`}>{format(new Date(currentCard.issuedAt), "dd MMM yyyy")}</span>
                      <Sparkles className={`h-5 w-5 ${textColor} opacity-50`} />
                    </div>
                    <p className={`text-[10px] ${textColor} opacity-40 text-center mt-1`}>Tap to flip</p>
                  </div>

                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} ${rarity.border} border-3 ${rarity.glow} p-6 flex flex-col justify-between`}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <CardPatternOverlay pattern={currentCard.designConfig?.pattern} />
                    <div className="relative z-10">
                      <p className={`text-sm font-bold ${textColor} mb-2`}>About this Card</p>
                      <p className={`text-sm ${textColor} opacity-85 leading-relaxed`}>{currentCard.cardDescription}</p>
                    </div>
                    <div className="relative z-10 space-y-2 mt-4">
                      {currentCard.customReason && (
                        <div className={`p-2 rounded-lg bg-white/10`}>
                          <p className={`text-xs font-semibold ${textColor} opacity-70`}>Personal Note</p>
                          <p className={`text-sm ${textColor} opacity-90`}>{currentCard.customReason}</p>
                        </div>
                      )}
                      {currentCard.issuerName && (
                        <p className={`text-xs ${textColor} opacity-60`}>Awarded by {currentCard.issuerName}</p>
                      )}
                      <p className={`text-xs ${textColor} opacity-50`}>{format(new Date(currentCard.issuedAt), "dd MMMM yyyy")}</p>
                    </div>
                    <p className={`text-[10px] ${textColor} opacity-40 text-center mt-1`}>Tap to flip</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {cardList.length > 1 && (
              <Button variant="ghost" size="icon" className="text-white/60 shrink-0" onClick={goNext} data-testid="button-carousel-next">
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {cardList.length > 1 && (
            <div className="flex gap-1.5 mt-4">
              {cardList.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-white scale-125" : "bg-white/30"}`}
                  onClick={() => { setIsFlipped(false); setCurrentIndex(i); }}
                  data-testid={`button-carousel-dot-${i}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PremiumWallet() {
  const { data: myCards, isLoading } = useQuery<UserCard[]>({ queryKey: ["/api/my-cards"] });
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (isLoading) {
    return (
      <Card data-testid="card-premium-wallet-loading">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!myCards || myCards.length === 0) return null;

  const openCarousel = (index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
  };

  const rarityOrder = ["mythic", "legendary", "epic", "rare", "standard"];
  const sorted = [...myCards].sort((a, b) => rarityOrder.indexOf(a.rarityLevel) - rarityOrder.indexOf(b.rarityLevel));

  return (
    <>
      <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/30" data-testid="card-premium-wallet">
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-500/5 dark:via-yellow-500/3 dark:to-amber-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-sm">Recognition Cards</h3>
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-card-count">{myCards.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-amber-600 dark:text-amber-400" onClick={() => openCarousel(0)} data-testid="button-view-all-cards">
            View All
          </Button>
        </div>
        <CardContent className="pt-3 pb-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {sorted.map((card, index) => (
              <div key={card.id} className="shrink-0">
                <RecognitionCard3D card={card} compact onClick={() => openCarousel(index)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <FullScreenCardCarousel
        cards={sorted}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
      />
    </>
  );
}

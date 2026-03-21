import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, CreditCard, Award, ChevronLeft, ChevronRight, X, Clock, PoundSterling } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { MetalCardFront, MetalCardBack } from "@/components/MetalCard";

type UserCard = {
  id: number;
  cardId: number;
  customReason: string | null;
  rarityLevel: string;
  serialNumber: string;
  issuedAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
  cardIsActive: boolean;
  weeklyCreditValue: number;
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

const RARITY_CONFIG: Record<string, { label: string }> = {
  standard: { label: "Standard" },
  rare: { label: "Rare" },
  epic: { label: "Epic" },
  legendary: { label: "Legendary" },
  mythic: { label: "Mythic" },
};

function RecognitionCard3D({ card, onClick, compact = false }: { card: UserCard; onClick?: () => void; compact?: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rarity = RARITY_CONFIG[card.rarityLevel] || RARITY_CONFIG.standard;

  const handleClick = () => {
    if (onClick) onClick();
    else setIsFlipped(!isFlipped);
  };

  const cardWidth = compact ? "w-36" : "w-48";
  const size = compact ? "compact" : "normal";

  return (
    <div
      className={`${cardWidth} cursor-pointer`}
      style={{ perspective: "1000px", aspectRatio: "1.586" }}
      onClick={handleClick}
      data-testid={`card-recognition-${card.id}`}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <MetalCardFront
          cardId={card.cardId}
          cardName={card.cardName}
          serialNumber={card.serialNumber}
          pattern={card.designConfig?.pattern}
          size={size}
        />
        <MetalCardBack
          cardId={card.cardId}
          cardName={card.cardName}
          description={card.cardDescription}
          customReason={card.customReason}
          issuerName={card.issuerName}
          issuedAt={format(new Date(card.issuedAt), "dd MMM yyyy")}
          rarityLabel={rarity.label}
          cardCategory={card.cardCategory}
          size={size}
        />
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

  const goNext = () => { setIsFlipped(false); setCurrentIndex((i) => (i + 1) % cardList.length); };
  const goPrev = () => { setIsFlipped(false); setCurrentIndex((i) => (i - 1 + cardList.length) % cardList.length); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 bg-black/95 border-none overflow-hidden max-h-[95vh]" data-testid="dialog-card-carousel">
        <div className="relative flex flex-col items-center justify-center min-h-[520px] p-4 sm:p-6 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <Button variant="ghost" size="icon" className="absolute top-3 right-3 text-white/70 z-50" onClick={onClose} data-testid="button-close-carousel">
            <X className="h-5 w-5" />
          </Button>

          <div className="text-center mb-3">
            <p className="text-white/50 text-xs">{currentIndex + 1} of {cardList.length}</p>
          </div>

          <div className="relative flex items-center gap-2 sm:gap-4 w-full justify-center">
            {cardList.length > 1 && (
              <Button variant="ghost" size="icon" className="text-white/60 shrink-0" onClick={goPrev} data-testid="button-carousel-prev">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <motion.div
              className="cursor-pointer"
              style={{ perspective: "1200px" }}
              onClick={() => setIsFlipped(!isFlipped)}
              animate={{
                width: "280px",
                height: isFlipped ? "440px" : "176px",
              }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotateX: isFlipped ? 180 : 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="relative w-full h-full"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <MetalCardFront
                    cardId={currentCard.cardId}
                    cardName={currentCard.cardName}
                    serialNumber={currentCard.serialNumber}
                    pattern={currentCard.designConfig?.pattern}
                    size="large"
                  />
                  <MetalCardBack
                    cardId={currentCard.cardId}
                    cardName={currentCard.cardName}
                    description={currentCard.cardDescription}
                    customReason={currentCard.customReason}
                    issuerName={currentCard.issuerName}
                    issuedAt={format(new Date(currentCard.issuedAt), "dd MMMM yyyy")}
                    rarityLabel={rarity.label}
                    cardCategory={currentCard.cardCategory}
                    size="large"
                    vertical
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {cardList.length > 1 && (
              <Button variant="ghost" size="icon" className="text-white/60 shrink-0" onClick={goNext} data-testid="button-carousel-next">
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          <p className="text-white/30 text-[10px] mt-3">Tap card to flip</p>

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
  const { data: myCardCredits } = useQuery<any[]>({ queryKey: ["/api/my-card-credits"] });
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

  const hasCards = myCards && myCards.length > 0;

  const openCarousel = (index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
  };

  const rarityOrder = ["mythic", "legendary", "epic", "rare", "standard"];
  const sorted = hasCards ? [...myCards].sort((a, b) => rarityOrder.indexOf(a.rarityLevel) - rarityOrder.indexOf(b.rarityLevel)) : [];

  return (
    <>
      <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/30" data-testid="card-premium-wallet">
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-500/5 dark:via-yellow-500/3 dark:to-amber-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-sm">Recognition Cards</h3>
            {hasCards && <Badge variant="secondary" className="text-[10px]" data-testid="badge-card-count">{myCards.length}</Badge>}
          </div>
          {hasCards && (
            <Button variant="ghost" size="sm" className="text-xs text-amber-600 dark:text-amber-400" onClick={() => openCarousel(0)} data-testid="button-view-all-cards">
              View All
            </Button>
          )}
        </div>
        <CardContent className="pt-4 pb-5 px-4">
          {hasCards ? (
            <div className="space-y-3">
              <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
                {sorted.map((card, index) => {
                  const isExpired = card.expiresAt ? isPast(new Date(card.expiresAt)) : false;
                  const isActive = card.cardIsActive && !isExpired;
                  return (
                    <div key={card.id} className="shrink-0 space-y-1">
                      <div className="relative">
                        <RecognitionCard3D card={card} compact onClick={() => openCarousel(index)} />
                        {!isActive && (
                          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center pointer-events-none">
                            <Badge className="text-[9px] bg-amber-500/90 text-white border-0">Expired</Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        {isActive && card.expiresAt && (
                          <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(card.expiresAt), { addSuffix: false })} left
                          </p>
                        )}
                        {isActive && card.weeklyCreditValue > 0 && (
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                            £{(card.weeklyCreditValue / 100).toFixed(2)}/wk
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {myCardCredits && myCardCredits.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <PoundSterling className="h-3 w-3 text-emerald-500" />
                    Recent Card Rewards
                  </p>
                  <div className="space-y-1">
                    {myCardCredits.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs" data-testid={`card-credit-${t.id}`}>
                        <span className="text-muted-foreground">{t.cardName}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+£{(t.amount / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2" data-testid="text-no-cards">
              <Award className="h-10 w-10 mx-auto text-amber-400/40" />
              <p className="text-sm text-muted-foreground">No recognition cards yet</p>
              <p className="text-xs text-muted-foreground/70">Cards are awarded by admins to recognise character, leadership, and contribution</p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasCards && (
        <FullScreenCardCarousel
          cards={sorted}
          initialIndex={carouselIndex}
          open={carouselOpen}
          onClose={() => setCarouselOpen(false)}
        />
      )}
    </>
  );
}

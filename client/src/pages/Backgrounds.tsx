import { BACKGROUND_OPTIONS, useBackground } from "@/hooks/use-background";
import { Check, ImageIcon, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Backgrounds() {
  const { backgroundId, setBackground } = useBackground();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-backgrounds-title">
            <ImageIcon className="h-6 w-6" />
            Backgrounds
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a background wallpaper for your dashboard
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {BACKGROUND_OPTIONS.map((bg) => {
          const isSelected = backgroundId === bg.id;
          return (
            <button
              key={bg.id}
              onClick={() => setBackground(bg.id)}
              className={`group relative rounded-2xl overflow-hidden border-2 transition-all aspect-[4/3] cursor-pointer ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 scale-[1.03]"
                  : "border-border/40 hover:border-border hover:scale-[1.02]"
              }`}
              data-testid={`bg-option-${bg.id}`}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: bg.id === "none"
                    ? "hsl(var(--background))"
                    : bg.preview,
                }}
              />
              {bg.css && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: bg.css }}
                />
              )}
              <div className={`absolute inset-0 flex flex-col items-center justify-end pb-2 transition-opacity ${
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}>
                <span className="text-[10px] font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] px-2 text-center leading-tight">
                  {bg.label}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
              )}
              {bg.id === "none" && !isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-medium">None</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2" data-testid="text-preview-title">Preview</h3>
          <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video">
            {backgroundId !== "none" && (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    background: BACKGROUND_OPTIONS.find(b => b.id === backgroundId)?.preview || "",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: BACKGROUND_OPTIONS.find(b => b.id === backgroundId)?.css || "",
                  }}
                />
              </>
            )}
            {backgroundId === "none" && (
              <div className="absolute inset-0 bg-background" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-2 p-4 w-3/4 max-w-md">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-lg bg-card/60 backdrop-blur-sm border border-border/30 p-3 aspect-square" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

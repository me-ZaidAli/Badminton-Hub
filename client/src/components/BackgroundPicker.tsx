import { BACKGROUND_OPTIONS, useBackground } from "@/hooks/use-background";
import { Check, ImageIcon } from "lucide-react";

export function BackgroundPicker() {
  const { backgroundId, setBackground } = useBackground();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Dashboard Background</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {BACKGROUND_OPTIONS.map((bg) => {
          const isSelected = backgroundId === bg.id;
          return (
            <button
              key={bg.id}
              onClick={() => setBackground(bg.id)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/3] ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 scale-105"
                  : "border-border/50 hover:border-border hover:scale-[1.02]"
              }`}
              title={bg.label}
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
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              {bg.id === "none" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] text-muted-foreground font-medium">OFF</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Choose a background that appears behind your dashboard
      </p>
    </div>
  );
}

import { Sun, Moon, Eye, Palette, Contrast, CircleOff, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, DISPLAY_MODES, type DisplayMode } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODE_ICONS: Record<DisplayMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  "premium-gold": Crown,
  sepia: Palette,
  migraine: Eye,
  "high-contrast": Contrast,
  grayscale: CircleOff,
};

export function ThemeToggle() {
  const { displayMode, reducedMotion, setDisplayMode, setReducedMotion } = useTheme();
  const CurrentIcon = MODE_ICONS[displayMode] || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-theme-toggle"
        >
          <CurrentIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Display Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DISPLAY_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode.value];
          return (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => setDisplayMode(mode.value)}
              className={displayMode === mode.value ? "bg-muted" : ""}
              data-testid={`menu-display-mode-${mode.value}`}
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{mode.label}</span>
                <span className="text-xs text-muted-foreground">{mode.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setReducedMotion(!reducedMotion)}
          data-testid="menu-reduced-motion-toggle"
        >
          <Zap className="h-4 w-4 mr-2 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Reduced Motion {reducedMotion ? "(On)" : "(Off)"}</span>
            <span className="text-xs text-muted-foreground">Disable animations independently</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

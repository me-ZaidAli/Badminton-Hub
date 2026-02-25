import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export const DISPLAY_MODES = [
  { value: "light", label: "Light Mode", description: "Standard bright theme" },
  { value: "dark", label: "Dark Mode", description: "Dark background, lighter text" },
  { value: "premium-gold", label: "Premium Black & Gold", description: "Luxurious dark theme with metallic gold accents" },
  { value: "sepia", label: "Sepia / Warm Mode", description: "Reduced blue light, cream tones" },
  { value: "migraine", label: "Migraine-Friendly", description: "Low stimulation, no harsh contrast or animations" },
  { value: "high-contrast", label: "High Contrast", description: "Maximum readability with strong contrast" },
  { value: "grayscale", label: "Grayscale", description: "No color, fully desaturated" },
] as const;

export type DisplayMode = typeof DISPLAY_MODES[number]["value"];

const THEME_CLASSES: Record<DisplayMode, string> = {
  light: "",
  dark: "dark",
  "premium-gold": "premium-gold",
  sepia: "sepia",
  migraine: "migraine",
  "high-contrast": "high-contrast",
  grayscale: "grayscale",
};

const ALL_THEME_CLASSES = ["dark", "premium-gold", "sepia", "migraine", "high-contrast", "grayscale", "reduced-motion"];

function getInitialMode(): DisplayMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("displayMode") as DisplayMode | null;
    if (stored && stored in THEME_CLASSES) return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  }
  return "light";
}

function getInitialReducedMotion(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("reducedMotion");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return false;
}

interface ThemeContextType {
  displayMode: DisplayMode;
  reducedMotion: boolean;
  setDisplayMode: (mode: DisplayMode) => void;
  setReducedMotion: (enabled: boolean) => void;
  syncFromUser: (mode: DisplayMode, motion: boolean, userId?: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyThemeClasses(mode: DisplayMode, reducedMotion: boolean) {
  const root = document.documentElement;
  ALL_THEME_CLASSES.forEach(cls => root.classList.remove(cls));
  const themeClass = THEME_CLASSES[mode];
  if (themeClass) root.classList.add(themeClass);
  if (reducedMotion || mode === "migraine") root.classList.add("reduced-motion");
}

export { ThemeContext };

export function useThemeProvider() {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(getInitialMode);
  const [reducedMotion, setReducedMotionState] = useState<boolean>(getInitialReducedMotion);
  const syncedUserIdRef = useRef<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (prefs: { displayMode: DisplayMode; reducedMotion: boolean }) => {
      await apiRequest("PATCH", "/api/user/display-preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    const effectiveMotion = mode === "migraine" ? true : reducedMotion;
    setDisplayModeState(mode);
    if (mode === "migraine") {
      setReducedMotionState(true);
      localStorage.setItem("reducedMotion", "true");
    }
    localStorage.setItem("displayMode", mode);
    applyThemeClasses(mode, effectiveMotion);
    saveMutation.mutate({ displayMode: mode, reducedMotion: effectiveMotion });
  }, [reducedMotion]);

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem("reducedMotion", String(enabled));
    applyThemeClasses(displayMode, enabled);
    saveMutation.mutate({ displayMode, reducedMotion: enabled });
  }, [displayMode]);

  const syncFromUser = useCallback((mode: DisplayMode, motion: boolean, userId?: number) => {
    if (userId !== undefined && syncedUserIdRef.current === userId) return;
    if (userId !== undefined) syncedUserIdRef.current = userId;

    const effectiveMode = (mode && mode in THEME_CLASSES) ? mode : "light";
    const effectiveMotion = effectiveMode === "migraine" ? true : motion;

    setDisplayModeState(effectiveMode);
    setReducedMotionState(effectiveMotion);
    localStorage.setItem("displayMode", effectiveMode);
    localStorage.setItem("reducedMotion", String(effectiveMotion));
    applyThemeClasses(effectiveMode, effectiveMotion);
  }, []);

  useEffect(() => {
    applyThemeClasses(displayMode, reducedMotion);
  }, []);

  return { displayMode, reducedMotion, setDisplayMode, setReducedMotion, syncFromUser };
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const [displayMode, setDisplayMode] = useState<DisplayMode>(getInitialMode);
    const [reducedMotion, setReducedMotion] = useState<boolean>(getInitialReducedMotion);
    return {
      theme: displayMode === "dark" ? "dark" as const : "light" as const,
      displayMode,
      reducedMotion,
      setDisplayMode: (mode: DisplayMode) => {
        const effectiveMotion = mode === "migraine" ? true : reducedMotion;
        setDisplayMode(mode);
        if (mode === "migraine") {
          setReducedMotion(true);
          localStorage.setItem("reducedMotion", "true");
        }
        localStorage.setItem("displayMode", mode);
        applyThemeClasses(mode, effectiveMotion);
      },
      setReducedMotion: (enabled: boolean) => {
        setReducedMotion(enabled);
        localStorage.setItem("reducedMotion", String(enabled));
        applyThemeClasses(displayMode, enabled);
      },
      toggleTheme: () => {
        const next = displayMode === "dark" ? "light" : "dark";
        setDisplayMode(next);
        localStorage.setItem("displayMode", next);
        applyThemeClasses(next, reducedMotion);
      },
      syncFromUser: () => {},
    };
  }
  return {
    theme: ctx.displayMode === "dark" ? "dark" as const : "light" as const,
    displayMode: ctx.displayMode,
    reducedMotion: ctx.reducedMotion,
    setDisplayMode: ctx.setDisplayMode,
    setReducedMotion: ctx.setReducedMotion,
    toggleTheme: () => ctx.setDisplayMode(ctx.displayMode === "dark" ? "light" : "dark"),
    syncFromUser: ctx.syncFromUser,
  };
}

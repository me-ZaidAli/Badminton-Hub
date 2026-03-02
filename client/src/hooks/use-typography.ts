import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type FontCategory = "free" | "sport" | "modern" | "luxury" | "blackcard";
export type FontTier = "free" | "premium" | "blackcard";
export type FontMode = "all" | "headings";

export interface FontOption {
  id: string;
  label: string;
  family: string;
  category: FontCategory;
  tier: FontTier;
  weights: string;
  description: string;
}

export const FONT_CATEGORIES: { id: FontCategory | "all"; label: string }[] = [
  { id: "all", label: "All Fonts" },
  { id: "free", label: "Free Fonts" },
  { id: "sport", label: "Sport & Performance" },
  { id: "modern", label: "Modern & Tech" },
  { id: "luxury", label: "Elegant & Luxury" },
  { id: "blackcard", label: "Black Card Exclusive" },
];

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    family: "'Inter', sans-serif",
    category: "free",
    tier: "free",
    weights: "400;500;600;700;800",
    description: "Clean modern UI",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "'Poppins', sans-serif",
    category: "free",
    tier: "free",
    weights: "400;500;600;700;800",
    description: "Geometric friendly",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "'Montserrat', sans-serif",
    category: "free",
    tier: "free",
    weights: "400;500;600;700;800",
    description: "Bold structured",
  },
  {
    id: "lato",
    label: "Lato",
    family: "'Lato', sans-serif",
    category: "free",
    tier: "free",
    weights: "400;700;900",
    description: "Smooth readable",
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    family: "'Bebas Neue', sans-serif",
    category: "sport",
    tier: "premium",
    weights: "400",
    description: "Tall sporty headline",
  },
  {
    id: "oswald",
    label: "Oswald",
    family: "'Oswald', sans-serif",
    category: "sport",
    tier: "premium",
    weights: "400;500;600;700",
    description: "Condensed athletic",
  },
  {
    id: "rajdhani",
    label: "Rajdhani",
    family: "'Rajdhani', sans-serif",
    category: "sport",
    tier: "premium",
    weights: "400;500;600;700",
    description: "Futuristic performance",
  },
  {
    id: "teko",
    label: "Teko",
    family: "'Teko', sans-serif",
    category: "sport",
    tier: "premium",
    weights: "400;500;600;700",
    description: "Strong compact scoreboard",
  },
  {
    id: "orbitron",
    label: "Orbitron",
    family: "'Orbitron', sans-serif",
    category: "modern",
    tier: "premium",
    weights: "400;500;600;700;800",
    description: "Digital sci-fi display",
  },
  {
    id: "exo-2",
    label: "Exo 2",
    family: "'Exo 2', sans-serif",
    category: "modern",
    tier: "premium",
    weights: "400;500;600;700;800",
    description: "Sleek tech aesthetic",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: "'Space Grotesk', sans-serif",
    category: "modern",
    tier: "premium",
    weights: "400;500;600;700",
    description: "Futuristic minimal",
  },
  {
    id: "sora",
    label: "Sora",
    family: "'Sora', sans-serif",
    category: "modern",
    tier: "premium",
    weights: "400;500;600;700;800",
    description: "Sharp clean innovation",
  },
  {
    id: "playfair-display",
    label: "Playfair Display",
    family: "'Playfair Display', serif",
    category: "luxury",
    tier: "premium",
    weights: "400;500;600;700;800",
    description: "Elegant high-contrast serif",
  },
  {
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    family: "'Cormorant Garamond', serif",
    category: "luxury",
    tier: "premium",
    weights: "400;500;600;700",
    description: "Refined editorial serif",
  },
  {
    id: "cinzel",
    label: "Cinzel",
    family: "'Cinzel', serif",
    category: "luxury",
    tier: "premium",
    weights: "400;500;600;700;800",
    description: "Roman-inspired prestige",
  },
  {
    id: "dm-serif-display",
    label: "DM Serif Display",
    family: "'DM Serif Display', serif",
    category: "luxury",
    tier: "premium",
    weights: "400",
    description: "Classy premium headings",
  },
  {
    id: "neue-machina",
    label: "Neue Machina",
    family: "'Space Grotesk', sans-serif",
    category: "blackcard",
    tier: "blackcard",
    weights: "400;500;600;700",
    description: "Ultra-modern luxury tech",
  },
  {
    id: "clash-display",
    label: "Clash Display",
    family: "'Sora', sans-serif",
    category: "blackcard",
    tier: "blackcard",
    weights: "400;500;600;700",
    description: "Bold fashion-forward premium",
  },
  {
    id: "eurostile-extended",
    label: "Eurostile Extended",
    family: "'Exo 2', sans-serif",
    category: "blackcard",
    tier: "blackcard",
    weights: "400;500;600;700;800",
    description: "Elite futuristic corporate",
  },
  {
    id: "noir-pro",
    label: "Noir Pro Style",
    family: "'Montserrat', sans-serif",
    category: "blackcard",
    tier: "blackcard",
    weights: "400;500;600;700;800",
    description: "Ultra-minimal high-end",
  },
];

const GOOGLE_FONTS_FAMILIES = [
  "Inter:wght@400;500;600;700;800",
  "Poppins:wght@400;500;600;700;800",
  "Montserrat:wght@400;500;600;700;800",
  "Lato:wght@400;700;900",
  "Bebas+Neue",
  "Oswald:wght@400;500;600;700",
  "Rajdhani:wght@400;500;600;700",
  "Teko:wght@400;500;600;700",
  "Orbitron:wght@400;500;600;700;800",
  "Exo+2:wght@400;500;600;700;800",
  "Space+Grotesk:wght@400;500;600;700",
  "Sora:wght@400;500;600;700;800",
  "Playfair+Display:wght@400;500;600;700;800",
  "Cormorant+Garamond:wght@400;500;600;700",
  "Cinzel:wght@400;500;600;700;800",
  "DM+Serif+Display",
];

let fontsLinkEl: HTMLLinkElement | null = null;
let fontStyleEl: HTMLStyleElement | null = null;

function ensureFontsLoaded() {
  if (fontsLinkEl) return;
  fontsLinkEl = document.createElement("link");
  fontsLinkEl.rel = "stylesheet";
  fontsLinkEl.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS_FAMILIES.map(f => `family=${f}`).join("&")}&display=swap`;
  document.head.appendChild(fontsLinkEl);
}

function applyFontToDOM(fontId: string, mode: FontMode) {
  const option = FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[0];

  ensureFontsLoaded();

  if (!fontStyleEl) {
    fontStyleEl = document.createElement("style");
    fontStyleEl.id = "app-font-override";
    document.head.appendChild(fontStyleEl);
  }

  if (fontId === "inter" && mode === "all") {
    fontStyleEl.textContent = "";
    document.documentElement.removeAttribute("data-font");
    return;
  }

  document.documentElement.setAttribute("data-font", fontId);

  if (mode === "all") {
    fontStyleEl.textContent = `
      html[data-font] body {
        font-family: ${option.family} !important;
      }
    `;
  } else {
    fontStyleEl.textContent = `
      html[data-font] h1,
      html[data-font] h2,
      html[data-font] h3,
      html[data-font] h4,
      html[data-font] h5,
      html[data-font] h6,
      html[data-font] .text-2xl,
      html[data-font] .text-3xl,
      html[data-font] .text-4xl,
      html[data-font] .text-5xl {
        font-family: ${option.family} !important;
      }
    `;
  }
}

function getInitialFont(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("fontFamily") || "inter";
  }
  return "inter";
}

function getInitialFontMode(): FontMode {
  if (typeof window !== "undefined") {
    return (localStorage.getItem("fontMode") as FontMode) || "all";
  }
  return "all";
}

const initialFont = getInitialFont();
const initialMode = getInitialFontMode();
if (typeof window !== "undefined" && initialFont !== "inter") {
  applyFontToDOM(initialFont, initialMode);
} else if (typeof window !== "undefined") {
  ensureFontsLoaded();
}

export function useTypography() {
  const [fontId, setFontIdState] = useState<string>(initialFont);
  const [fontMode, setFontModeState] = useState<FontMode>(initialMode);

  const saveMutation = useMutation({
    mutationFn: async (data: { fontFamily?: string; fontMode?: string }) => {
      await apiRequest("PATCH", "/api/user/display-preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  useEffect(() => {
    applyFontToDOM(fontId, fontMode);
  }, [fontId, fontMode]);

  const setFont = useCallback((id: string) => {
    setFontIdState(id);
    localStorage.setItem("fontFamily", id);
    saveMutation.mutate({ fontFamily: id });
  }, []);

  const setMode = useCallback((mode: FontMode) => {
    setFontModeState(mode);
    localStorage.setItem("fontMode", mode);
    saveMutation.mutate({ fontMode: mode });
  }, []);

  const syncFromUser = useCallback((font: string | null | undefined, mode: string | null | undefined) => {
    const effectiveFont = font || "inter";
    const effectiveMode = (mode as FontMode) || "all";
    if (effectiveFont !== localStorage.getItem("fontFamily") || effectiveMode !== localStorage.getItem("fontMode")) {
      setFontIdState(effectiveFont);
      setFontModeState(effectiveMode);
      localStorage.setItem("fontFamily", effectiveFont);
      localStorage.setItem("fontMode", effectiveMode);
      applyFontToDOM(effectiveFont, effectiveMode);
    }
  }, []);

  const currentFont = FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[0];

  return {
    fontId,
    fontMode,
    setFont,
    setMode,
    syncFromUser,
    currentFont,
  };
}

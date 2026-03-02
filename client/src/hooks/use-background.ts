import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface BackgroundOption {
  id: string;
  label: string;
  preview: string;
  css: string;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: "none",
    label: "None",
    preview: "linear-gradient(135deg, hsl(var(--background)), hsl(var(--background)))",
    css: "",
  },
  {
    id: "aurora-mesh",
    label: "Aurora Mesh",
    preview: "linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)",
    css: "radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(236, 72, 153, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(34, 211, 238, 0.1) 0%, transparent 45%)",
  },
  {
    id: "midnight-glow",
    label: "Midnight Glow",
    preview: "linear-gradient(135deg, #020617, #1e3a5f, #020617)",
    css: "radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(14, 165, 233, 0.06) 0%, transparent 40%)",
  },
  {
    id: "emerald-forest",
    label: "Emerald Forest",
    preview: "linear-gradient(135deg, #022c22, #065f46, #022c22)",
    css: "radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(52, 211, 153, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 10% 90%, rgba(6, 95, 70, 0.15) 0%, transparent 50%)",
  },
  {
    id: "sunset-warm",
    label: "Sunset Warm",
    preview: "linear-gradient(135deg, #1c1917, #431407, #1c1917)",
    css: "radial-gradient(ellipse at 60% 30%, rgba(251, 146, 60, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(244, 63, 94, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 90% 60%, rgba(217, 119, 6, 0.06) 0%, transparent 40%)",
  },
  {
    id: "cosmic-purple",
    label: "Cosmic Purple",
    preview: "linear-gradient(135deg, #1a0533, #3b0764, #1a0533)",
    css: "radial-gradient(ellipse at 25% 25%, rgba(168, 85, 247, 0.14) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(192, 132, 252, 0.06) 0%, transparent 55%)",
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    preview: "linear-gradient(135deg, #1c1917, #78350f, #1c1917)",
    css: "radial-gradient(ellipse at 40% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(212, 175, 55, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 10% 80%, rgba(180, 83, 9, 0.1) 0%, transparent 50%)",
  },
  {
    id: "ocean-depth",
    label: "Ocean Depth",
    preview: "linear-gradient(135deg, #0c1220, #164e63, #0c1220)",
    css: "radial-gradient(ellipse at 50% 10%, rgba(6, 182, 212, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 15% 60%, rgba(20, 184, 166, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 80%, rgba(8, 145, 178, 0.1) 0%, transparent 50%)",
  },
  {
    id: "rose-garden",
    label: "Rose Garden",
    preview: "linear-gradient(135deg, #1c1017, #4c0519, #1c1017)",
    css: "radial-gradient(ellipse at 30% 30%, rgba(244, 63, 94, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(236, 72, 153, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 50% 90%, rgba(190, 24, 93, 0.1) 0%, transparent 50%)",
  },
  {
    id: "northern-lights",
    label: "Northern Lights",
    preview: "linear-gradient(135deg, #0a0a1a, #1a2e44, #0a1a2a)",
    css: "radial-gradient(ellipse at 20% 10%, rgba(34, 211, 238, 0.1) 0%, transparent 40%), radial-gradient(ellipse at 60% 40%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 90% 20%, rgba(52, 211, 153, 0.06) 0%, transparent 35%)",
  },
  {
    id: "steel-grid",
    label: "Steel Grid",
    preview: "linear-gradient(135deg, #18181b, #27272a, #18181b)",
    css: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)",
  },
  {
    id: "diamond-mesh",
    label: "Diamond Mesh",
    preview: "linear-gradient(135deg, #1e1b4b, #312e81, #1e1b4b)",
    css: "repeating-linear-gradient(45deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px), repeating-linear-gradient(-45deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px)",
  },
  {
    id: "soft-cream",
    label: "Soft Cream",
    preview: "linear-gradient(135deg, #fef3c7, #fde68a, #fef3c7)",
    css: "radial-gradient(ellipse at 30% 20%, rgba(217, 119, 6, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(180, 83, 9, 0.04) 0%, transparent 45%)",
  },
  {
    id: "pastel-sky",
    label: "Pastel Sky",
    preview: "linear-gradient(135deg, #e0f2fe, #bfdbfe, #ddd6fe)",
    css: "radial-gradient(ellipse at 40% 30%, rgba(96, 165, 250, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(167, 139, 250, 0.06) 0%, transparent 45%)",
  },
  {
    id: "mint-breeze",
    label: "Mint Breeze",
    preview: "linear-gradient(135deg, #ecfdf5, #d1fae5, #ecfdf5)",
    css: "radial-gradient(ellipse at 25% 25%, rgba(52, 211, 153, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(16, 185, 129, 0.04) 0%, transparent 45%)",
  },
];

function getInitialBackground(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("dashboardBackground") || "none";
  }
  return "none";
}

function applyBackgroundToDOM(id: string) {
  const option = BACKGROUND_OPTIONS.find(b => b.id === id) || BACKGROUND_OPTIONS[0];
  const el = document.documentElement;
  if (id === "none" || !option.css) {
    el.removeAttribute("data-bg");
    el.style.removeProperty("--app-bg-base");
    el.style.removeProperty("--app-bg-overlay");
  } else {
    el.setAttribute("data-bg", id);
    el.style.setProperty("--app-bg-base", option.preview);
    el.style.setProperty("--app-bg-overlay", option.css);
  }
}

const initialBg = getInitialBackground();
if (typeof window !== "undefined" && initialBg !== "none") {
  applyBackgroundToDOM(initialBg);
}

export function useBackground() {
  const [backgroundId, setBackgroundIdState] = useState<string>(initialBg);

  const saveMutation = useMutation({
    mutationFn: async (bg: string) => {
      await apiRequest("PATCH", "/api/user/display-preferences", { dashboardBackground: bg });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  useEffect(() => {
    applyBackgroundToDOM(backgroundId);
  }, [backgroundId]);

  const setBackground = useCallback((id: string) => {
    setBackgroundIdState(id);
    localStorage.setItem("dashboardBackground", id);
    applyBackgroundToDOM(id);
    saveMutation.mutate(id);
  }, []);

  const syncFromUser = useCallback((bg: string | null | undefined) => {
    const effective = bg || "none";
    if (effective !== localStorage.getItem("dashboardBackground")) {
      setBackgroundIdState(effective);
      localStorage.setItem("dashboardBackground", effective);
      applyBackgroundToDOM(effective);
    }
  }, []);

  const currentBackground = BACKGROUND_OPTIONS.find(b => b.id === backgroundId) || BACKGROUND_OPTIONS[0];

  return {
    backgroundId,
    setBackground,
    syncFromUser,
    currentBackground,
    backgroundCss: currentBackground.css,
  };
}

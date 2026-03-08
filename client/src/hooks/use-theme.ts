import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface ThemeModeInfo {
  value: string;
  label: string;
  description: string;
  grade?: "Standard" | "Accessibility" | "Premium" | "Elite" | "Signature" | "Ultra Exclusive" | "Metallic Comet" | "Royal Duty";
  colorFamily?: string;
  isAmoled?: boolean;
  isRankLocked?: boolean;
  requiredRank?: "all" | "top10" | "champion";
  isBlackCard?: boolean;
  accentHex?: string;
  gradientStart?: string;
  gradientEnd?: string;
  chartColors?: string[];
}

export const DISPLAY_MODES: readonly ThemeModeInfo[] = [
  { value: "light", label: "Light Mode", description: "Standard bright theme", grade: "Standard" },
  { value: "dark", label: "Dark Mode", description: "Dark background, lighter text", grade: "Standard" },
  { value: "premium-gold", label: "Premium Black & Gold", description: "Luxurious dark theme with metallic gold accents", grade: "Standard", colorFamily: "Gold", accentHex: "#D4AF37", gradientStart: "#1a1a2e", gradientEnd: "#D4AF37", chartColors: ["#D4AF37", "#B8941F", "#8B7320", "#E6C555", "#6B5B1F"] },
  { value: "ultra-premium", label: "Ultra-Premium Charcoal & Gold", description: "Elite charcoal black with brushed metallic gold accents", grade: "Standard", colorFamily: "Gold", accentHex: "#C6A75E", gradientStart: "#050505", gradientEnd: "#C6A75E", chartColors: ["#C6A75E", "#9E843A", "#7A6428", "#DCC07A", "#584C1E"] },
  { value: "green-glow", label: "Green Glowing", description: "Futuristic neon green with transparent glowing textures", grade: "Standard", colorFamily: "Emerald", accentHex: "#00FF88", gradientStart: "#0a0f0a", gradientEnd: "#00FF88", chartColors: ["#00FF88", "#00CC6A", "#009950", "#33FFaa", "#006633"] },
  { value: "sepia", label: "Sepia / Warm Mode", description: "Reduced blue light, cream tones", grade: "Accessibility" },
  { value: "migraine", label: "Migraine-Friendly", description: "Low stimulation, no harsh contrast or animations", grade: "Accessibility" },
  { value: "high-contrast", label: "High Contrast", description: "Maximum readability with strong contrast", grade: "Accessibility" },
  { value: "grayscale", label: "Grayscale", description: "No color, fully desaturated", grade: "Accessibility" },
  { value: "obsidian-gold", label: "Obsidian Gold", description: "Deep charcoal with brushed gold and matte black cards", grade: "Premium", colorFamily: "Gold", requiredRank: "all", accentHex: "#C6A75E", gradientStart: "#0F0F10", gradientEnd: "#C6A75E", chartColors: ["#C6A75E", "#A8894A", "#8A6C36", "#D4B96E", "#6B5028"] },
  { value: "platinum-ice", label: "Platinum Ice", description: "Icy silver and steel grey with glassmorphism cards", grade: "Premium", colorFamily: "Platinum", requiredRank: "all", accentHex: "#D9E1E8", gradientStart: "#2F3A45", gradientEnd: "#D9E1E8", chartColors: ["#B0BEC5", "#90A4AE", "#78909C", "#CFD8DC", "#607D8B"] },
  { value: "emerald-performance", label: "Emerald Performance", description: "Deep emerald with bright green glow effects", grade: "Premium", colorFamily: "Emerald", requiredRank: "all", accentHex: "#1DB954", gradientStart: "#0E3B2E", gradientEnd: "#1DB954", chartColors: ["#1DB954", "#17A34A", "#0F8C3E", "#4ADE80", "#0A7030"] },
  { value: "sapphire-velocity", label: "Sapphire Velocity", description: "Midnight navy with sapphire neon data visualisation", grade: "Elite", colorFamily: "Sapphire", isRankLocked: true, requiredRank: "top10", accentHex: "#1F6FFF", gradientStart: "#0A1F3C", gradientEnd: "#1F6FFF", chartColors: ["#1F6FFF", "#4D8FFF", "#82B1FF", "#0040CC", "#003399"] },
  { value: "crimson-prestige", label: "Crimson Prestige", description: "Wine red with rose-gold accents and bold styling", grade: "Elite", colorFamily: "Crimson", isRankLocked: true, requiredRank: "top10", accentHex: "#E8A87C", gradientStart: "#5B0F1A", gradientEnd: "#E8A87C", chartColors: ["#E8A87C", "#C0392B", "#E74C3C", "#D4956B", "#922B21"] },
  { value: "royal-amethyst", label: "Royal Amethyst", description: "Dark violet with cosmic gradients and royal purple", grade: "Signature", colorFamily: "Amethyst", isRankLocked: true, requiredRank: "champion", accentHex: "#7A3FFF", gradientStart: "#2B0F3A", gradientEnd: "#7A3FFF", chartColors: ["#7A3FFF", "#9B6BFF", "#5C2BD9", "#B794FF", "#4A1FB3"] },
  { value: "carbon-titanium", label: "Carbon Titanium", description: "Industrial grey with titanium fintech flat design", grade: "Premium", colorFamily: "Silver", requiredRank: "all", accentHex: "#8E9AA6", gradientStart: "#1C1F24", gradientEnd: "#8E9AA6", chartColors: ["#8E9AA6", "#6B7A89", "#4A5568", "#ADB9C6", "#3D4A59"] },
  { value: "arctic-blue", label: "Arctic Blue", description: "Cool blue with icy cyan bright data visualisation", grade: "Elite", colorFamily: "Blue", isRankLocked: true, requiredRank: "top10", accentHex: "#2EC4FF", gradientStart: "#102A43", gradientEnd: "#2EC4FF", chartColors: ["#2EC4FF", "#00B4D8", "#0096C7", "#72EFFF", "#0077B6"] },
  { value: "sunset-copper", label: "Sunset Copper", description: "Espresso brown with warm copper gradients", grade: "Signature", colorFamily: "Copper", isRankLocked: true, requiredRank: "champion", accentHex: "#B87333", gradientStart: "#1A1410", gradientEnd: "#B87333", chartColors: ["#B87333", "#D4944A", "#8B5E28", "#E6A85C", "#6B4520"] },
  { value: "midnight-neon", label: "Midnight Neon", description: "Ultra-dark with cyan and magenta neon glow effects", grade: "Ultra Exclusive", colorFamily: "Neon", isBlackCard: true, accentHex: "#00F5FF", gradientStart: "#08090D", gradientEnd: "#FF2DA6", chartColors: ["#00F5FF", "#FF2DA6", "#7B61FF", "#FFE156", "#00FF88"] },
  { value: "amoled-black", label: "AMOLED Black", description: "True black for OLED screens, energy-efficient gold accents", grade: "Premium", colorFamily: "Onyx", isAmoled: true, requiredRank: "all", accentHex: "#D4AF37", gradientStart: "#000000", gradientEnd: "#D4AF37", chartColors: ["#D4AF37", "#C0392B", "#2ECC71", "#3498DB", "#9B59B6"] },
  { value: "neon-circuit", label: "Neon Circuit", description: "True black with cyan, magenta & lime neon lines, holographic charts", grade: "Premium", colorFamily: "Neon", isAmoled: true, requiredRank: "all", accentHex: "#00F5FF", gradientStart: "#000000", gradientEnd: "#FF2DA6", chartColors: ["#00F5FF", "#FF2DA6", "#39FF14", "#FFE156", "#7B61FF"] },
  { value: "hologram-matrix", label: "Hologram Matrix", description: "Deep black with digital green/blue holographic charts, futuristic typography", grade: "Premium", colorFamily: "Emerald", isAmoled: true, requiredRank: "all", accentHex: "#00FF41", gradientStart: "#050508", gradientEnd: "#00D4FF", chartColors: ["#00FF41", "#00D4FF", "#7B61FF", "#FFE156", "#FF6B6B"] },
  { value: "cyber-pulse", label: "Cyber Pulse", description: "Black with electric blue pulses, pulsing animated line charts", grade: "Premium", colorFamily: "Sapphire", isAmoled: true, requiredRank: "all", accentHex: "#0080FF", gradientStart: "#080810", gradientEnd: "#0080FF", chartColors: ["#0080FF", "#00BFFF", "#4D8FFF", "#82B1FF", "#0040CC"] },
  { value: "titanium-noir", label: "Titanium Noir", description: "True black with brushed titanium accents, metallic reflections", grade: "Premium", colorFamily: "Silver", isAmoled: true, requiredRank: "all", accentHex: "#8E9AAF", gradientStart: "#000000", gradientEnd: "#8E9AAF", chartColors: ["#8E9AAF", "#B0BEC5", "#6B7A89", "#CFD8DC", "#4A5568"] },
  { value: "rose-gold-elite", label: "Rose Gold Elite", description: "Warm black with rose gold highlights, copper-gold charts", grade: "Premium", colorFamily: "Copper", requiredRank: "all", accentHex: "#B76E79", gradientStart: "#0A0808", gradientEnd: "#D4A574", chartColors: ["#B76E79", "#D4A574", "#E8A87C", "#C48B65", "#8B5E5E"] },
  { value: "diamond-graphite", label: "Diamond Graphite", description: "Graphite black with diamond sparkle accents, shimmer KPIs", grade: "Premium", colorFamily: "Platinum", requiredRank: "all", accentHex: "#E8E8E8", gradientStart: "#0C0C0E", gradientEnd: "#E8E8E8", chartColors: ["#E8E8E8", "#B0BEC5", "#90A4AE", "#CFD8DC", "#78909C"] },
  { value: "aurora-borealis", label: "Aurora Borealis", description: "Dark sky gradients with green/purple aurora streaks, glowing KPIs", grade: "Elite", colorFamily: "Emerald", isRankLocked: true, requiredRank: "top10", accentHex: "#00FF88", gradientStart: "#050510", gradientEnd: "#8B5CF6", chartColors: ["#00FF88", "#8B5CF6", "#06B6D4", "#A78BFA", "#34D399"] },
  { value: "volcanic-ember", label: "Volcanic Ember", description: "Ash black with molten orange/red gradients, fiery heat-map charts", grade: "Elite", colorFamily: "Crimson", isRankLocked: true, requiredRank: "top10", accentHex: "#FF6B00", gradientStart: "#0A0806", gradientEnd: "#FF3D00", chartColors: ["#FF6B00", "#FF3D00", "#FF8F00", "#D84315", "#FFB300"] },
  { value: "deep-ocean", label: "Deep Ocean", description: "Midnight navy with teal/cyan gradients, bioluminescent KPI glow", grade: "Elite", colorFamily: "Sapphire", isRankLocked: true, requiredRank: "top10", accentHex: "#00BCD4", gradientStart: "#040810", gradientEnd: "#008B8B", chartColors: ["#00BCD4", "#008B8B", "#26C6DA", "#0097A7", "#4DD0E1"] },
  { value: "jungle-vibe", label: "Jungle Vibe", description: "Deep forest green with bright leaf accents, organic radar charts", grade: "Elite", colorFamily: "Emerald", isRankLocked: true, requiredRank: "top10", accentHex: "#4CAF50", gradientStart: "#060D06", gradientEnd: "#2E7D32", chartColors: ["#4CAF50", "#2E7D32", "#81C784", "#1B5E20", "#A5D6A7"] },
  { value: "adrenaline-rush", label: "Adrenaline Rush", description: "Dark backgrounds with red/orange accents, high-energy pulsing KPIs", grade: "Signature", colorFamily: "Crimson", isRankLocked: true, requiredRank: "champion", accentHex: "#FF1744", gradientStart: "#080404", gradientEnd: "#FF6D00", chartColors: ["#FF1744", "#FF6D00", "#FF5252", "#FF9100", "#D50000"] },
  { value: "velocity-chrome", label: "Velocity Chrome", description: "Sleek silver/steel with neon blue, speed-line overlays", grade: "Signature", colorFamily: "Platinum", isRankLocked: true, requiredRank: "champion", accentHex: "#2196F3", gradientStart: "#0A0A0E", gradientEnd: "#C0C0C0", chartColors: ["#2196F3", "#C0C0C0", "#64B5F6", "#90A4AE", "#1976D2"] },
  { value: "circuit-court", label: "Circuit Court", description: "Stadium-inspired black with court-marking overlays, high-vis KPIs", grade: "Signature", colorFamily: "Gold", isRankLocked: true, requiredRank: "champion", accentHex: "#FFD600", gradientStart: "#080808", gradientEnd: "#FFD600", chartColors: ["#FFD600", "#F5F5F5", "#FFC107", "#FFAB00", "#FFD740"] },
  { value: "cosmic-elite", label: "Cosmic Elite", description: "Space-inspired black with violet/cyan gradients, futuristic KPI effects", grade: "Ultra Exclusive", colorFamily: "Amethyst", isBlackCard: true, accentHex: "#7C4DFF", gradientStart: "#040408", gradientEnd: "#18FFFF", chartColors: ["#7C4DFF", "#18FFFF", "#B388FF", "#84FFFF", "#651FFF"] },
  { value: "phantom-luxe", label: "Phantom Luxe", description: "Layered glass panels, muted metallic accents, soft ambient KPI glows", grade: "Ultra Exclusive", colorFamily: "Platinum", isBlackCard: true, accentHex: "#9E9E9E", gradientStart: "#060608", gradientEnd: "#9E9E9E", chartColors: ["#9E9E9E", "#BDBDBD", "#757575", "#E0E0E0", "#616161"] },
  { value: "obsidian-gold-ultra", label: "Obsidian Gold", description: "True AMOLED black with brushed gold accents and carbon fiber cards", grade: "Metallic Comet", colorFamily: "Gold", isAmoled: true, accentHex: "#D4AF37", gradientStart: "#000000", gradientEnd: "#D4AF37", chartColors: ["#D4AF37", "#C9A961", "#8B7320", "#E6C555", "#A89040"] },
  { value: "mint-prestige", label: "Mint Prestige", description: "Soft pastels of mint, lavender, and peach with floating sparkles", grade: "Metallic Comet", colorFamily: "Mint", accentHex: "#A8E6CF", gradientStart: "#F0FFF4", gradientEnd: "#C3AED6", chartColors: ["#A8E6CF", "#C3AED6", "#FFD3B6", "#98D1C8", "#DDA0DD"] },
  { value: "crystal-court", label: "Crystal Court", description: "Frosted glass cards with light-reflective surfaces and parallax depth", grade: "Metallic Comet", colorFamily: "Platinum", accentHex: "#B0C4DE", gradientStart: "#1a2332", gradientEnd: "#B0C4DE", chartColors: ["#B0C4DE", "#87CEEB", "#6495ED", "#4682B4", "#ADD8E6"] },
  { value: "phosphor-elite", label: "Phosphor Elite", description: "Retro-tech terminal with neon green UI and digital flicker effects", grade: "Metallic Comet", colorFamily: "Emerald", isAmoled: true, accentHex: "#00FF41", gradientStart: "#0a0a0a", gradientEnd: "#00FF41", chartColors: ["#00FF41", "#FFB000", "#00CC33", "#FF8C00", "#33FF66"] },
  { value: "adaptive-pro", label: "Adaptive Pro", description: "Dynamic shifting gradients that flow between warm and cool palettes", grade: "Metallic Comet", colorFamily: "Neon", accentHex: "#FF6B35", gradientStart: "#004E92", gradientEnd: "#FF6B35", chartColors: ["#FF6B35", "#004E92", "#00B4D8", "#FF8C42", "#0077B6"] },
  { value: "royal-indigo", label: "Royal Indigo", description: "Deep indigo and navy with embossed icons and soft purple glow", grade: "Metallic Comet", colorFamily: "Amethyst", accentHex: "#6366F1", gradientStart: "#1a1040", gradientEnd: "#6366F1", chartColors: ["#6366F1", "#818CF8", "#4F46E5", "#A78BFA", "#312E81"] },
  { value: "champagne-pearl", label: "Champagne Pearl", description: "Creamy off-white with pearl-reflective cards and script typography", grade: "Royal Duty", colorFamily: "Gold", accentHex: "#C9A96E", gradientStart: "#FFF8F0", gradientEnd: "#C9A96E", chartColors: ["#C9A96E", "#D4B88C", "#A8875A", "#E6D5B8", "#8B7348"] },
  { value: "coral-luxe", label: "Coral Luxe", description: "Warm peach and blush with rose-gold metallic accents", grade: "Royal Duty", colorFamily: "Copper", accentHex: "#B76E79", gradientStart: "#FFE8D6", gradientEnd: "#B76E79", chartColors: ["#B76E79", "#E8A87C", "#D4956B", "#C08090", "#A05A68"] },
  { value: "arctic-frost", label: "Arctic Frost", description: "Icy pastel blues with frosted glass panels and silver shimmer", grade: "Royal Duty", colorFamily: "Blue", accentHex: "#94A3B8", gradientStart: "#EFF6FF", gradientEnd: "#94A3B8", chartColors: ["#94A3B8", "#60A5FA", "#3B82F6", "#BAE6FD", "#2563EB"] },
  { value: "retro-cream-tech", label: "Retro Cream-Tech", description: "Vintage cream with warm grid overlays and retro pixel accents", grade: "Royal Duty", colorFamily: "Gold", accentHex: "#FF8C42", gradientStart: "#FFF8E7", gradientEnd: "#FF8C42", chartColors: ["#FF8C42", "#66BB6A", "#FFA726", "#43A047", "#E65100"] },
  { value: "lavender-opulence", label: "Lavender Opulence", description: "Soft lavender with frosted glass and platinum highlights", grade: "Royal Duty", colorFamily: "Amethyst", accentHex: "#8B5CF6", gradientStart: "#F3F0FF", gradientEnd: "#8B5CF6", chartColors: ["#8B5CF6", "#A78BFA", "#7C3AED", "#C4B5FD", "#6D28D9"] },
  { value: "champagne-mint", label: "Champagne Mint Modern", description: "Mint and champagne cream with embossed metallic icons", grade: "Royal Duty", colorFamily: "Mint", accentHex: "#34D399", gradientStart: "#F0FFF4", gradientEnd: "#34D399", chartColors: ["#34D399", "#C9A96E", "#6EE7B7", "#D4B88C", "#10B981"] },
  { value: "tropical-dawn", label: "Tropical Dawn", description: "Soft coral and pale yellow with frosted glass and sunbeam animations", grade: "Signature", colorFamily: "Copper", isRankLocked: true, requiredRank: "champion", accentHex: "#FF6F61", gradientStart: "#FFF0ED", gradientEnd: "#87CEEB", chartColors: ["#FF6F61", "#FFD700", "#87CEEB", "#FFA07A", "#F0E68C"] },
  { value: "savanna-breeze", label: "Savanna Breeze", description: "Warm sand and ochre with earthy textures and gentle sway", grade: "Signature", colorFamily: "Gold", isRankLocked: true, requiredRank: "champion", accentHex: "#CC8400", gradientStart: "#F5E6C8", gradientEnd: "#CC8400", chartColors: ["#CC8400", "#808000", "#D2B48C", "#DAA520", "#8B7D3C"] },
  { value: "rainforest-canopy", label: "Rainforest Canopy", description: "Pale green layers with translucent glass panels and floating particles", grade: "Signature", colorFamily: "Emerald", isRankLocked: true, requiredRank: "champion", accentHex: "#66BB6A", gradientStart: "#E8F5E9", gradientEnd: "#80CBC4", chartColors: ["#66BB6A", "#80CBC4", "#A5D6A7", "#4DB6AC", "#388E3C"] },
  { value: "misty-bamboo", label: "Misty Bamboo", description: "Mint and ivory with bamboo-textured frosted cards", grade: "Signature", colorFamily: "Mint", isRankLocked: true, requiredRank: "champion", accentHex: "#00A86B", gradientStart: "#F0FFF0", gradientEnd: "#00A86B", chartColors: ["#00A86B", "#98D8A8", "#2E8B57", "#7BC8A4", "#228B22"] },
  { value: "tropical-lagoon", label: "Tropical Lagoon", description: "Turquoise and aqua with curved glass boxes and ripple effects", grade: "Signature", colorFamily: "Blue", isRankLocked: true, requiredRank: "champion", accentHex: "#00BCD4", gradientStart: "#E0F7FA", gradientEnd: "#00BCD4", chartColors: ["#00BCD4", "#4DD0E1", "#0097A7", "#80DEEA", "#00838F"] },
  { value: "sunset-savannah", label: "Sunset Savannah", description: "Pale peach and apricot with layered translucent boxes and warm glow", grade: "Signature", colorFamily: "Copper", isRankLocked: true, requiredRank: "champion", accentHex: "#FF8C69", gradientStart: "#FFECD2", gradientEnd: "#FF8C69", chartColors: ["#FF8C69", "#FFCBA4", "#E6E0F8", "#DDA0DD", "#FF7F50"] },
  { value: "obsidian-frost", label: "Obsidian Frost™", description: "True transparent glass boxes with 35px blur, icy blue accents and neo-tactile clay buttons", grade: "Premium", colorFamily: "Blue", accentHex: "#4DB8E8", gradientStart: "#0F1420", gradientEnd: "#4DB8E8", chartColors: ["#4DB8E8", "#3DA0C0", "#2D7A96", "#67D0F0", "#1F5570"] },
  { value: "neon-apex", label: "Neon Apex™", description: "AMOLED fintech dashboard with neon lime, purple, cyan accents and bold 56px metrics", grade: "Premium", colorFamily: "Neon", isAmoled: true, accentHex: "#84CC16", gradientStart: "#0F1115", gradientEnd: "#84CC16", chartColors: ["#84CC16", "#A855F7", "#06B6D4", "#F97316", "#F59E0B"] },
  { value: "sage-horizon", label: "Sage Horizon™", description: "Calm editorial aesthetic with sage, dusty rose, warm sand and floating glass panels", grade: "Premium", colorFamily: "Emerald", accentHex: "#5A9A6E", gradientStart: "#EFF2ED", gradientEnd: "#5A9A6E", chartColors: ["#5A9A6E", "#C48B8B", "#C6A050", "#6B8898", "#7AB88A"] },
  { value: "prism-forge", label: "Prism Forge™", description: "Luminous multi-stop gradients with skeuomorphic depth, glow pulse and parallax tilt", grade: "Premium", colorFamily: "Amethyst", accentHex: "#9B5DE5", gradientStart: "#14091C", gradientEnd: "#F97316", chartColors: ["#9B5DE5", "#E84393", "#F97316", "#00BCD4", "#3B82F6"] },
  { value: "vector-legacy", label: "Vector Legacy™", description: "Bold teal and charcoal flat structure with strong grid, large counters and clean icons", grade: "Premium", colorFamily: "Blue", accentHex: "#0D9488", gradientStart: "#F5F5F5", gradientEnd: "#0D9488", chartColors: ["#0D9488", "#334155", "#14B8A6", "#64748B", "#5EEAD4"] },
  { value: "frosted-titanium", label: "Frosted Titanium", description: "True glassmorphism with 36px blur, transparent cards, inner highlight strokes and deep charcoal gradients", grade: "Premium", colorFamily: "Platinum", accentHex: "#4A9EC5", gradientStart: "#141A22", gradientEnd: "#4A9EC5", chartColors: ["#4A9EC5", "#3D8BA8", "#2E6A80", "#5CB8E0", "#1F5060"] },
  { value: "midnight-voltage", label: "Midnight Voltage", description: "AMOLED performance dashboard with neon lime, cyan, violet and coral accents on ultra-dark base", grade: "Premium", colorFamily: "Neon", isAmoled: true, accentHex: "#84CC16", gradientStart: "#0F1115", gradientEnd: "#84CC16", chartColors: ["#84CC16", "#06B6D4", "#8B5CF6", "#F97316", "#F59E0B"] },
  { value: "solstice-calm", label: "Solstice Calm", description: "Muted sage, sand, rose and slate with floating panels and calm editorial typography", grade: "Premium", colorFamily: "Emerald", accentHex: "#5A9A6E", gradientStart: "#EFF2ED", gradientEnd: "#5A9A6E", chartColors: ["#5A9A6E", "#C48B6B", "#B87878", "#5A7A8A", "#6B9A50"] },
  { value: "aurora-pulse", label: "Aurora Pulse", description: "Energetic purple-magenta-orange gradients with glow pulse hover effects and lifted glass cards", grade: "Premium", colorFamily: "Amethyst", accentHex: "#9B5DE5", gradientStart: "#140E1C", gradientEnd: "#E84393", chartColors: ["#9B5DE5", "#E84393", "#F97316", "#06B6D4", "#3B82F6"] },
  { value: "atlas-grid", label: "Atlas Grid", description: "Structured flat retro-modern with bold teal, charcoal, crisp strokes and large numeric counters", grade: "Premium", colorFamily: "Blue", accentHex: "#0D9488", gradientStart: "#F5F5F5", gradientEnd: "#0D9488", chartColors: ["#0D9488", "#334155", "#14B8A6", "#64748B", "#5EEAD4"] },
  { value: "liquid-glass", label: "Liquid Glass", description: "Translucent frosted glass panels with liquid reflections, soft edge glow, and fluid depth on a dark surface", grade: "Premium", colorFamily: "Platinum", accentHex: "#90B4CE", gradientStart: "#0E1117", gradientEnd: "#90B4CE", chartColors: ["#90B4CE", "#6A9AB5", "#4A7A96", "#B0D4E8", "#3A6278"] },
] as const;

export type DisplayMode = string;

const THEME_CLASSES: Record<string, string[]> = {
  light: [],
  dark: ["dark"],
  "premium-gold": ["dark", "premium-gold"],
  "ultra-premium": ["dark", "ultra-premium"],
  "green-glow": ["dark", "green-glow"],
  sepia: ["sepia"],
  migraine: ["migraine"],
  "high-contrast": ["high-contrast"],
  grayscale: ["grayscale"],
  "obsidian-gold": ["dark", "obsidian-gold"],
  "platinum-ice": ["dark", "platinum-ice"],
  "emerald-performance": ["dark", "emerald-performance"],
  "sapphire-velocity": ["dark", "sapphire-velocity"],
  "crimson-prestige": ["dark", "crimson-prestige"],
  "royal-amethyst": ["dark", "royal-amethyst"],
  "carbon-titanium": ["dark", "carbon-titanium"],
  "arctic-blue": ["dark", "arctic-blue"],
  "sunset-copper": ["dark", "sunset-copper"],
  "midnight-neon": ["dark", "midnight-neon"],
  "amoled-black": ["dark", "amoled-black"],
  "neon-circuit": ["dark", "neon-circuit"],
  "hologram-matrix": ["dark", "hologram-matrix"],
  "cyber-pulse": ["dark", "cyber-pulse"],
  "titanium-noir": ["dark", "titanium-noir"],
  "rose-gold-elite": ["dark", "rose-gold-elite"],
  "diamond-graphite": ["dark", "diamond-graphite"],
  "aurora-borealis": ["dark", "aurora-borealis"],
  "volcanic-ember": ["dark", "volcanic-ember"],
  "deep-ocean": ["dark", "deep-ocean"],
  "jungle-vibe": ["dark", "jungle-vibe"],
  "adrenaline-rush": ["dark", "adrenaline-rush"],
  "velocity-chrome": ["dark", "velocity-chrome"],
  "circuit-court": ["dark", "circuit-court"],
  "cosmic-elite": ["dark", "cosmic-elite"],
  "phantom-luxe": ["dark", "phantom-luxe"],
  "obsidian-gold-ultra": ["dark", "obsidian-gold-ultra"],
  "mint-prestige": ["mint-prestige"],
  "crystal-court": ["dark", "crystal-court"],
  "phosphor-elite": ["dark", "phosphor-elite"],
  "adaptive-pro": ["dark", "adaptive-pro"],
  "royal-indigo": ["dark", "royal-indigo"],
  "champagne-pearl": ["champagne-pearl"],
  "coral-luxe": ["coral-luxe"],
  "arctic-frost": ["arctic-frost"],
  "retro-cream-tech": ["retro-cream-tech"],
  "lavender-opulence": ["lavender-opulence"],
  "champagne-mint": ["champagne-mint"],
  "tropical-dawn": ["tropical-dawn"],
  "savanna-breeze": ["savanna-breeze"],
  "rainforest-canopy": ["rainforest-canopy"],
  "misty-bamboo": ["misty-bamboo"],
  "tropical-lagoon": ["tropical-lagoon"],
  "sunset-savannah": ["sunset-savannah"],
  "obsidian-frost": ["dark", "obsidian-frost"],
  "neon-apex": ["dark", "neon-apex"],
  "sage-horizon": ["sage-horizon"],
  "prism-forge": ["dark", "prism-forge"],
  "vector-legacy": ["vector-legacy"],
  "frosted-titanium": ["dark", "frosted-titanium"],
  "midnight-voltage": ["dark", "midnight-voltage"],
  "solstice-calm": ["solstice-calm"],
  "aurora-pulse": ["dark", "aurora-pulse"],
  "atlas-grid": ["atlas-grid"],
  "liquid-glass": ["dark", "liquid-glass"],
};

const ALL_THEME_CLASSES = [
  "dark", "premium-gold", "ultra-premium", "green-glow",
  "sepia", "migraine", "high-contrast", "grayscale", "reduced-motion",
  "obsidian-gold", "platinum-ice", "emerald-performance", "sapphire-velocity",
  "crimson-prestige", "royal-amethyst", "carbon-titanium", "arctic-blue",
  "sunset-copper", "midnight-neon", "amoled-black",
  "neon-circuit", "hologram-matrix", "cyber-pulse", "titanium-noir",
  "rose-gold-elite", "diamond-graphite", "aurora-borealis", "volcanic-ember",
  "deep-ocean", "jungle-vibe", "adrenaline-rush", "velocity-chrome",
  "circuit-court", "cosmic-elite", "phantom-luxe",
  "obsidian-gold-ultra", "mint-prestige", "crystal-court",
  "phosphor-elite", "adaptive-pro", "royal-indigo",
  "champagne-pearl", "coral-luxe", "arctic-frost",
  "retro-cream-tech", "lavender-opulence", "champagne-mint",
  "tropical-dawn", "savanna-breeze", "rainforest-canopy",
  "misty-bamboo", "tropical-lagoon", "sunset-savannah",
  "obsidian-frost", "neon-apex", "sage-horizon", "prism-forge", "vector-legacy",
  "frosted-titanium", "midnight-voltage", "solstice-calm", "aurora-pulse", "atlas-grid",
  "liquid-glass",
];

const DARK_THEMES = new Set([
  "dark", "premium-gold", "ultra-premium", "green-glow",
  "obsidian-gold", "platinum-ice", "emerald-performance", "sapphire-velocity",
  "crimson-prestige", "royal-amethyst", "carbon-titanium", "arctic-blue",
  "sunset-copper", "midnight-neon", "amoled-black",
  "neon-circuit", "hologram-matrix", "cyber-pulse", "titanium-noir",
  "rose-gold-elite", "diamond-graphite", "aurora-borealis", "volcanic-ember",
  "deep-ocean", "jungle-vibe", "adrenaline-rush", "velocity-chrome",
  "circuit-court", "cosmic-elite", "phantom-luxe",
  "obsidian-gold-ultra", "crystal-court",
  "phosphor-elite", "adaptive-pro", "royal-indigo",
  "obsidian-frost", "neon-apex", "prism-forge",
  "frosted-titanium", "midnight-voltage", "aurora-pulse",
  "liquid-glass",
]);

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
  root.classList.add("theme-transitioning");
  ALL_THEME_CLASSES.forEach(cls => root.classList.remove(cls));
  const themeClasses = THEME_CLASSES[mode] || [];
  themeClasses.forEach(cls => root.classList.add(cls));
  if (reducedMotion || mode === "migraine") root.classList.add("reduced-motion");
  setTimeout(() => root.classList.remove("theme-transitioning"), 350);
}

export { ThemeContext, THEME_CLASSES, ALL_THEME_CLASSES, DARK_THEMES };

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
      theme: DARK_THEMES.has(displayMode) ? "dark" as const : "light" as const,
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
    theme: DARK_THEMES.has(ctx.displayMode) ? "dark" as const : "light" as const,
    displayMode: ctx.displayMode,
    reducedMotion: ctx.reducedMotion,
    setDisplayMode: ctx.setDisplayMode,
    setReducedMotion: ctx.setReducedMotion,
    toggleTheme: () => ctx.setDisplayMode(ctx.displayMode === "dark" ? "light" : "dark"),
    syncFromUser: ctx.syncFromUser,
  };
}

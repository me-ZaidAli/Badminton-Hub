import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const NATURE_IMAGES = [
  "/backgrounds/bg-aurora-mountains.png",
  "/backgrounds/bg-dark-forest.png",
  "/backgrounds/bg-dark-waterfall.png",
  "/backgrounds/bg-desert-twilight.png",
  "/backgrounds/bg-ocean-storm.png",
  "/backgrounds/bg-bamboo-dusk.png",
  "/backgrounds/bg-thunderstorm.png",
  "/backgrounds/bg-cosmic-nebula.png",
];

const ROTATION_MS = 12000;
const FADE_MS = 2200;

interface DashboardBannerProps {
  /** Height of the banner band in vh. */
  heightVh?: number;
  /** Optional headline shown over the banner. */
  title?: string;
  /** Optional subtitle. */
  subtitle?: string;
  /** Show subscribe / gift premium CTA buttons. */
  showCtas?: boolean;
}

export default function DashboardBanner({
  heightVh = 28,
  title = "Welcome to your Club Master Dashboard",
  subtitle = "Your daily racket-sports home — schedule, training and updates in one place.",
  showCtas = true,
}: DashboardBannerProps) {
  const [idx, setIdx] = useState(0);

  // Generate particle positions ONCE per mount (avoid re-randomising on re-render)
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map(() => ({
        size: Math.random() * 12 + 5,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 4,
        duration: Math.random() * 4 + 5,
      })),
    [],
  );

  useEffect(() => {
    NATURE_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % NATURE_IMAGES.length), ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ height: `${heightVh}vh`, minHeight: 240 }}
      data-testid="dashboard-banner"
    >
      {/* Cross-fading image stack */}
      {NATURE_IMAGES.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === idx ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
            willChange: "opacity",
          }}
          aria-hidden={i !== idx}
          data-testid={`banner-image-${i}`}
        />
      ))}

      {/* Discord Nitro-style colour wash on top of the photos */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/55 via-[#EB459E]/45 to-[#7289DA]/55 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bg-white/30 rounded-full dashboard-banner-particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Headline + CTAs */}
      {(title || subtitle || showCtas) && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          {title && (
            <h1
              className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
              data-testid="text-banner-title"
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/90 max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              data-testid="text-banner-subtitle"
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
        {NATURE_IMAGES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes dashboard-banner-float {
          0%   { transform: translateY(0)   scale(1);   opacity: 0.3; }
          50%  { transform: translateY(-22px) scale(1.2); opacity: 0.85; }
          100% { transform: translateY(0)   scale(1);   opacity: 0.3; }
        }
        .dashboard-banner-particle {
          animation: dashboard-banner-float infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

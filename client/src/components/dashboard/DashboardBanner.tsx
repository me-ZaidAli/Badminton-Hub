import { useEffect, useState } from "react";

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

const ROTATION_MS = 20000;
const FADE_MS = 2200;

interface DashboardBannerProps {
  /** Height of the banner band in vh. */
  heightVh?: number;
}

export default function DashboardBanner({ heightVh = 32 }: DashboardBannerProps) {
  const [idx, setIdx] = useState(0);

  // Preload all images once
  useEffect(() => {
    NATURE_IMAGES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Cycle index every ROTATION_MS
  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % NATURE_IMAGES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative -mx-3 sm:-mx-4 lg:-mx-6 -mt-2 mb-[-3rem] sm:mb-[-3.5rem] lg:mb-[-4rem] overflow-hidden"
      style={{ height: `${heightVh}vh`, minHeight: 220 }}
      data-testid="dashboard-banner"
    >
      {/* Image stack — cross-fade */}
      {NATURE_IMAGES.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-center bg-cover ease-in-out"
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

      {/* Cinematic overlays for legibility + brand tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-background pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-900/15 via-transparent to-cyan-500/10 pointer-events-none mix-blend-overlay" />

      {/* Soft bottom mask so the next-row tiles "rise" out of the banner */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </div>
  );
}

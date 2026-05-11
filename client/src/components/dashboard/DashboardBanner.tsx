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

const ROTATION_MS = 7000;
const FADE_MS = 1800;

interface DashboardBannerProps {
  children: React.ReactNode;
  /** Height of the hero region in vh. Tiles begin near the bottom of this band. */
  heightVh?: number;
}

export default function DashboardBanner({ children, heightVh = 60 }: DashboardBannerProps) {
  const [idx, setIdx] = useState(0);

  // Preload all images
  useEffect(() => {
    NATURE_IMAGES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Cycle index
  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % NATURE_IMAGES.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative -mx-3 sm:-mx-4 lg:-mx-6 -mt-2" data-testid="dashboard-banner">
      {/* Image stack — cross-fades between layers */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: `${heightVh}vh` }}
      >
        {NATURE_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-center bg-cover transition-opacity ease-in-out"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === idx ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              willChange: "opacity",
            }}
            aria-hidden={i !== idx}
            data-testid={`banner-image-${i}`}
          />
        ))}

        {/* Cinematic gradient overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-slate-950/95 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-900/15 via-transparent to-cyan-500/10 pointer-events-none mix-blend-overlay" />

        {/* Subtle film grain */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Tiles overlay sitting near the bottom — like a hero banner */}
        <div className="relative z-10 flex flex-col justify-end min-h-[inherit] px-3 sm:px-4 lg:px-6 pt-32 sm:pt-40 lg:pt-48 pb-4 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}

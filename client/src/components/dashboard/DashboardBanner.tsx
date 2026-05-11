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

export default function DashboardBanner({ heightVh = 28 }: DashboardBannerProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    NATURE_IMAGES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % NATURE_IMAGES.length), ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ height: `${heightVh}vh`, minHeight: 200 }}
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

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-900/15 via-transparent to-cyan-500/10 pointer-events-none mix-blend-overlay" />
    </div>
  );
}

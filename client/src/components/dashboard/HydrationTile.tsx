import { useEffect, useMemo, useRef, useState } from "react";
import { GlassWater, Minus, Plus, Trophy, Sparkles } from "lucide-react";

interface HydrationTileProps {
  cups: number;
  setCups: (updater: (c: number) => number) => void;
  goal: number;
}

export function HydrationTile({ cups, setCups, goal }: HydrationTileProps) {
  const completedBottles = Math.floor(cups / goal);
  const cupsInCurrent = cups - completedBottles * goal;
  const totalBottles = Math.max(1, completedBottles + (cupsInCurrent > 0 || completedBottles === 0 ? 1 : 0));
  const goalReached = cups >= goal;

  // One-shot celebration when crossing a goal threshold
  const [celebrate, setCelebrate] = useState(false);
  const lastBottlesRef = useRef(completedBottles);
  useEffect(() => {
    if (completedBottles > lastBottlesRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2400);
      lastBottlesRef.current = completedBottles;
      return () => clearTimeout(t);
    }
    lastBottlesRef.current = completedBottles;
  }, [completedBottles]);

  // Render up to 4 bottle icons (after that, just show count)
  const bottleSlots = Math.min(4, totalBottles);
  const bottles = useMemo(() => {
    const arr: { fillPct: number; complete: boolean }[] = [];
    for (let i = 0; i < bottleSlots; i++) {
      const isCurrent = i === completedBottles && cupsInCurrent > 0;
      const isComplete = i < completedBottles;
      arr.push({
        fillPct: isComplete ? 100 : isCurrent ? Math.round((cupsInCurrent / goal) * 100) : 0,
        complete: isComplete,
      });
    }
    return arr;
  }, [bottleSlots, completedBottles, cupsInCurrent, goal]);

  const overallPctOfCurrent = Math.round((cupsInCurrent / goal) * 100);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-sky-900/40 via-cyan-900/25 to-blue-950/60 p-4 shadow-2xl"
      data-testid="hero-hydration"
    >
      {/* Ambient water glows */}
      <div className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-12 w-52 h-52 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

      {/* Celebration burst */}
      {celebrate && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-emerald-400/30 via-transparent to-transparent animate-pulse" />
          <div className="relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-emerald-500/95 shadow-2xl shadow-emerald-500/50 border border-emerald-200/40 animate-[pop_0.4s_ease-out]">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-5 h-5 text-amber-200" />
              <span className="text-sm font-extrabold text-white tracking-wide">WELL DONE!</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <span className="text-[10px] text-white/90 font-semibold">Bottle {completedBottles} smashed</span>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-cyan-200/85 font-bold">
            <GlassWater className="w-3 h-3" /><span>Hydration</span>
          </div>
          <div className="flex items-center gap-1.5">
            {completedBottles > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-full px-1.5 py-0.5">
                <Trophy className="w-3 h-3" />×{completedBottles}
              </span>
            )}
            <span className="text-[9px] text-white/45 uppercase tracking-wider">Goal {goal}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {/* Bottles row */}
          <div className="flex items-end gap-1.5 shrink-0">
            {bottles.map((b, i) => (
              <RealisticBottle key={i} fillPct={b.fillPct} complete={b.complete} />
            ))}
            {totalBottles > 4 && (
              <span className="text-[10px] font-bold text-cyan-100/80 self-end pb-1">+{totalBottles - 4}</span>
            )}
          </div>

          {/* Right: counter + buttons */}
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-extrabold text-white tabular-nums leading-none" data-testid="text-hydration-cups">
              {cups}<span className="text-sm text-white/50">/{goal}</span>
            </div>
            <div className="text-[10px] text-cyan-100/80 mt-0.5">
              {goalReached
                ? completedBottles === 1 && cupsInCurrent === 0
                  ? "Goal hit! Keep it flowing"
                  : `${completedBottles} bottle${completedBottles > 1 ? "s" : ""} done · ${cupsInCurrent}/${goal} into next`
                : `${cupsInCurrent} cup${cupsInCurrent === 1 ? "" : "s"} (${overallPctOfCurrent}%)`}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => setCups((c) => Math.max(0, c - 1))}
                disabled={cups === 0}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white"
                data-testid="button-hydration-minus"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCups((c) => Math.min(80, c + 1))}
                className="flex-1 h-7 rounded-full bg-gradient-to-r from-cyan-400/45 to-sky-500/45 hover:from-cyan-400/60 hover:to-sky-500/60 border border-cyan-300/40 text-[11px] font-bold text-white inline-flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/20"
                data-testid="button-hydration-plus"
              >
                <Plus className="w-3.5 h-3.5" /> Cup
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes wave { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

/** Hyper-realistic SVG water bottle with glass highlights, water gradient, meniscus, cap and reflections. */
function RealisticBottle({ fillPct, complete }: { fillPct: number; complete: boolean }) {
  const uid = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  const clampedPct = Math.max(0, Math.min(100, fillPct));
  // Bottle interior: x 6..26 (w 20), y 14..58 (h 44). Water rises from bottom.
  const waterTop = 58 - (44 * clampedPct) / 100;
  return (
    <div className="relative w-9 h-[88px]" title={complete ? "Complete!" : `${clampedPct}%`}>
      <svg viewBox="0 0 32 88" className="w-full h-full drop-shadow-[0_4px_8px_rgba(56,189,248,0.35)]">
        <defs>
          {/* Glass body gradient (cool blue-white subtle) */}
          <linearGradient id={`glass-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="35%" stopColor="rgba(186,230,253,0.18)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.18)" />
          </linearGradient>
          {/* Water gradient: cyan at top → deep blue at bottom */}
          <linearGradient id={`water-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          {/* Cap gradient — brushed metal */}
          <linearGradient id={`cap-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          {/* Highlight gradient for left edge */}
          <linearGradient id={`hi-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          {/* Bottle silhouette clip — defines glass interior shape */}
          <clipPath id={`bottle-${uid}`}>
            <path d="M12 10 h8 v4 q0 1.5 1 3 q5 5 5 11 v33 q0 5 -5 5 h-10 q-5 0 -5 -5 v-33 q0 -6 5 -11 q1 -1.5 1 -3 z" />
          </clipPath>
        </defs>

        {/* Cap with thread ridges */}
        <rect x="11" y="2" width="10" height="2" rx="1" fill={`url(#cap-${uid})`} />
        <rect x="10.5" y="4" width="11" height="6" rx="1.5" fill={`url(#cap-${uid})`} stroke="rgba(0,0,0,0.3)" strokeWidth="0.4" />
        <line x1="11" y1="5.2" x2="21" y2="5.2" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
        <line x1="11" y1="6.6" x2="21" y2="6.6" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
        <line x1="11" y1="8" x2="21" y2="8" stroke="rgba(0,0,0,0.25)" strokeWidth="0.3" />
        {/* Cap top highlight */}
        <ellipse cx="14" cy="5" rx="2.5" ry="0.6" fill="rgba(255,255,255,0.6)" />

        {/* Bottle glass shell */}
        <path
          d="M12 10 h8 v4 q0 1.5 1 3 q5 5 5 11 v33 q0 5 -5 5 h-10 q-5 0 -5 -5 v-33 q0 -6 5 -11 q1 -1.5 1 -3 z"
          fill={`url(#glass-${uid})`}
          stroke="rgba(186,230,253,0.55)"
          strokeWidth="0.7"
        />

        {/* Water inside bottle */}
        {clampedPct > 0 && (
          <g clipPath={`url(#bottle-${uid})`}>
            <rect x="0" y={waterTop} width="32" height={88 - waterTop} fill={`url(#water-${uid})`} />
            {/* Animated wave on meniscus (only if not full) */}
            {clampedPct < 100 && (
              <g style={{ animation: "wave 2.6s linear infinite" }}>
                <path
                  d={`M -32 ${waterTop} q 8 -2.5 16 0 t 16 0 t 16 0 t 16 0 t 16 0 v 6 h -96 z`}
                  fill="rgba(255,255,255,0.35)"
                />
              </g>
            )}
            {/* Subtle highlight stripe in water */}
            <rect x="9" y={waterTop + 2} width="1.4" height={86 - waterTop} fill="rgba(255,255,255,0.35)" rx="0.7" />
            {/* Tiny bubbles */}
            {clampedPct > 15 && (
              <>
                <circle cx="14" cy={Math.max(waterTop + 8, 30)} r="0.7" fill="rgba(255,255,255,0.7)" />
                <circle cx="20" cy={Math.max(waterTop + 14, 40)} r="0.5" fill="rgba(255,255,255,0.6)" />
                <circle cx="17" cy={Math.max(waterTop + 22, 50)} r="0.6" fill="rgba(255,255,255,0.5)" />
              </>
            )}
          </g>
        )}

        {/* Glass left-edge highlight (over water for realism) */}
        <path
          d="M11.5 16 q-3 4 -3 9 v32"
          fill="none"
          stroke={`url(#hi-${uid})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Right-edge subtle highlight */}
        <path d="M23 18 v36" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" strokeLinecap="round" />
        {/* Bottom shadow oval */}
        <ellipse cx="16" cy="65" rx="6" ry="0.9" fill="rgba(0,0,0,0.35)" />

        {/* Completion ring */}
        {complete && (
          <>
            <circle cx="22" cy="14" r="4" fill="#10b981" stroke="white" strokeWidth="0.8" />
            <path d="M20 14 l1.4 1.4 l3 -3" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}

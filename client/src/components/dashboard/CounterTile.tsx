import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trophy, Sparkles, type LucideIcon } from "lucide-react";

interface CounterTileProps {
  count: number;
  setCount: (updater: (c: number) => number) => void;
  goal: number;
  max: number;
  label: string;
  unitLabel: string;
  icon: LucideIcon;
  accentClass: string;
  gradientClass: string;
  glowAClass: string;
  glowBClass: string;
  iconColorClass: string;
  iconBgEmptyClass: string;
  iconBgFillClass: string;
  testId: string;
}

export function CounterTile({
  count,
  setCount,
  goal,
  max,
  label,
  unitLabel,
  icon: Icon,
  accentClass,
  gradientClass,
  glowAClass,
  glowBClass,
  iconColorClass,
  iconBgEmptyClass,
  iconBgFillClass,
  testId,
}: CounterTileProps) {
  const completed = Math.floor(count / goal);
  const inCurrent = count - completed * goal;
  const goalReached = count >= goal;
  const slots = Math.min(goal, 8);

  const [celebrate, setCelebrate] = useState(false);
  const lastRef = useRef(completed);
  useEffect(() => {
    if (completed > lastRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2200);
      lastRef.current = completed;
      return () => clearTimeout(t);
    }
    lastRef.current = completed;
  }, [completed]);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${accentClass} bg-gradient-to-br ${gradientClass} p-4 shadow-2xl`}
      data-testid={testId}
    >
      <div className={`absolute -top-12 -right-10 w-44 h-44 rounded-full ${glowAClass} blur-3xl pointer-events-none`} />
      <div className={`absolute -bottom-16 -left-12 w-52 h-52 rounded-full ${glowBClass} blur-3xl pointer-events-none`} />

      {celebrate && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl bg-emerald-500/95 shadow-2xl shadow-emerald-500/50 border border-emerald-200/40 animate-[pop_0.4s_ease-out]">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-5 h-5 text-amber-200" />
              <span className="text-sm font-extrabold text-white tracking-wide">WELL DONE!</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <span className="text-[10px] text-white/90 font-semibold">{label} goal × {completed}</span>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] ${iconColorClass} font-bold`}>
            <Icon className="w-3 h-3" /><span>{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {completed > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-200 bg-amber-500/15 border border-amber-400/30 rounded-full px-1.5 py-0.5">
                <Trophy className="w-3 h-3" />×{completed}
              </span>
            )}
            <span className="text-[9px] text-white/45 uppercase tracking-wider">Goal {goal}</span>
          </div>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <div className="text-3xl font-black text-white tabular-nums leading-none" data-testid={`${testId}-count`}>
            {count}
          </div>
          <div className="text-[10px] text-white/60 mb-0.5">{unitLabel}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: slots }).map((_, i) => {
            const isFilled = i < inCurrent || goalReached;
            return (
              <div
                key={i}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                  isFilled
                    ? `${iconBgFillClass} border-white/30 shadow-md`
                    : `${iconBgEmptyClass} border-white/10`
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isFilled ? "text-white" : "text-white/30"}`} />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCount(c => Math.max(0, c - 1))}
            className="flex-1 h-9 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 transition-colors disabled:opacity-40"
            disabled={count <= 0}
            data-testid={`${testId}-minus`}
            aria-label={`Remove one ${label}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCount(c => Math.min(max, c + 1))}
            className="flex-1 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white font-bold transition-colors disabled:opacity-40"
            disabled={count >= max}
            data-testid={`${testId}-plus`}
            aria-label={`Add one ${label}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

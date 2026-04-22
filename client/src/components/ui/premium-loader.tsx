import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function GlobalRouteProgress() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    if (active) {
      setVisible(true);
      setProgress((p) => (p < 10 ? 12 : p));
      interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          const inc = p < 40 ? 6 : p < 70 ? 3 : 1.2;
          return Math.min(90, p + inc);
        });
      }, 220);
    } else {
      setProgress(100);
      hideTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 380);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
          data-testid="global-route-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Loading content"
        >
          <div className="h-[3px] w-full bg-transparent overflow-hidden">
            <motion.div
              className="h-full origin-left"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, hsl(217 91% 60%), hsl(280 91% 65%), hsl(142 76% 45%))",
                boxShadow:
                  "0 0 14px hsl(217 91% 60% / 0.65), 0 0 24px hsl(280 91% 65% / 0.45)",
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
          <div className="relative h-0">
            <motion.div
              className="absolute top-[-3px] h-[3px] w-24"
              style={{
                left: `calc(${progress}% - 96px)`,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
                filter: "blur(1px)",
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PremiumLoader({
  label = "Loading…",
  sublabel,
  size = 96,
  className = "",
}: {
  label?: string;
  sublabel?: string;
  size?: number;
  className?: string;
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const reduce = useReducedMotion();
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}
      data-testid="premium-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(217 91% 60% / 0.25) 0%, transparent 70%)",
          }}
          animate={reduce ? undefined : { scale: [0.85, 1.1, 0.85], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: reduce ? 0 : Infinity, ease: "easeInOut" }}
        />
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="premiumLoaderGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(217 91% 60%)" />
              <stop offset="50%" stopColor="hsl(280 91% 65%)" />
              <stop offset="100%" stopColor="hsl(142 76% 45%)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted) / 0.4)"
            strokeWidth={stroke}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#premiumLoaderGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: reduce ? circumference * 0.4 : circumference }}
            animate={reduce ? { strokeDashoffset: circumference * 0.4 } : {
              strokeDashoffset: [
                circumference,
                circumference * 0.15,
                circumference,
              ],
            }}
            transition={{ duration: 1.6, repeat: reduce ? 0 : Infinity, ease: "easeInOut" }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 2.4, repeat: reduce ? 0 : Infinity, ease: "linear" }}
        >
          <Loader2
            className="text-primary/80"
            style={{ width: size * 0.32, height: size * 0.32 }}
          />
        </motion.div>
      </div>
      {label && (
        <motion.div
          className="text-sm font-semibold text-foreground/90"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.div>
      )}
      {sublabel && (
        <div className="text-xs text-muted-foreground">{sublabel}</div>
      )}
      <div className="flex items-center gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PremiumLoaderInline({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      data-testid="premium-loader-inline"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-4 w-4 text-primary" />
      </motion.div>
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {label}
      </motion.span>
    </div>
  );
}

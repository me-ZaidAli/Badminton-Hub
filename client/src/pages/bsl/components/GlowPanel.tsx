import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { BSL } from "./BSLPalette";

type Tone = "gold" | "cyan" | "neutral";
interface Props extends Omit<HTMLMotionProps<"div">, "title"> {
  title?: ReactNode;
  subtitle?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  icon?: ReactNode;
  noPadding?: boolean;
  children: ReactNode;
}

export function GlowPanel({
  title, subtitle, tone = "neutral", action, icon, noPadding, children, className = "", ...rest
}: Props) {
  const accent = tone === "gold" ? BSL.gold : tone === "cyan" ? BSL.cyan : "transparent";
  const ringTone = tone === "gold" ? "hsla(42,95%,55%,0.45)" : tone === "cyan" ? "hsla(195,100%,60%,0.45)" : "hsla(255,255%,255%,0.10)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={`group relative rounded-2xl overflow-hidden backdrop-blur-xl ${className}`}
      style={{
        background: "linear-gradient(140deg, hsla(222,40%,18%,0.85) 0%, hsla(222,45%,10%,0.92) 100%)",
        border: `1px solid ${ringTone}`,
        boxShadow: `0 24px 60px -20px hsla(222,80%,2%,0.85), inset 0 1px 0 hsla(0,0%,100%,0.05)`,
      }}
      data-testid={`panel-${typeof title === "string" ? title.toLowerCase().replace(/\s+/g, "-") : "glow"}`}
      {...rest}
    >
      {/* Top edge accent */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.7 }}
      />
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: accent === "transparent" ? BSL.cyan : accent }}
      />
      {(title || action) && (
        <div className="relative flex items-center justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                style={{ background: `${accent === "transparent" ? BSL.cyan : accent}22`, color: accent === "transparent" ? BSL.cyan : accent }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <div className="text-sm font-bold uppercase tracking-[0.18em] text-white truncate">{title}</div>}
              {subtitle && <div className="text-xs mt-0.5" style={{ color: BSL.muted }}>{subtitle}</div>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "relative px-5 pt-4 pb-5"}>{children}</div>
    </motion.div>
  );
}

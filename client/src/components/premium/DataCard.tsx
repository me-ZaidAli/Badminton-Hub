import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DataCardProps extends Omit<HTMLMotionProps<"div">, "ref" | "title"> {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  glowAccent?: "lime" | "purple" | "coral" | "cyan" | "amber";
  children?: React.ReactNode;
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors = {
  up: "text-emerald-500",
  down: "text-red-500",
  neutral: "text-muted-foreground",
};

const glowClasses = {
  lime: "glow-lime",
  purple: "glow-purple",
  coral: "glow-coral",
  cyan: "glow-cyan",
  amber: "glow-amber",
};

export function DataCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  glowAccent,
  className,
  children,
  ...props
}: DataCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;

  return (
    <motion.div
      data-testid={`data-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-slot="card"
      className={cn(
        "rounded-[20px] border border-white/[0.08] p-6 relative",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{
        y: -2,
        scale: 1.01,
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
      }}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground font-medium" data-testid="data-card-title">
          {title}
        </p>
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "text-4xl font-extrabold tracking-tight",
              glowAccent && glowClasses[glowAccent]
            )}
            data-testid="data-card-value"
          >
            {value}
          </span>
          {trend && TrendIcon && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", trendColors[trend])} data-testid="data-card-trend">
              <TrendIcon className="h-4 w-4" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1" data-testid="data-card-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

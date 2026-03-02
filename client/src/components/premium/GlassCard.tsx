import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?: "default" | "elevated" | "subtle" | "frosted";
  hoverLift?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

export function GlassCard({
  variant = "default",
  hoverLift = true,
  glowColor,
  className,
  children,
  ...props
}: GlassCardProps) {
  const variants = {
    default: "glass-card",
    elevated: "glass-card glass-card-elevated",
    subtle: "glass-card glass-card-subtle",
    frosted: "glass-card glass-card-frosted",
  };

  return (
    <motion.div
      data-testid="glass-card"
      data-slot="card"
      className={cn(
        "rounded-[20px] border border-white/[0.08] p-6 relative",
        variants[variant],
        className
      )}
      whileHover={hoverLift ? {
        y: -2,
        scale: 1.005,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      } : undefined}
      style={glowColor ? {
        boxShadow: `0 8px 32px ${glowColor}20, inset 0 1px 0 rgba(255,255,255,0.06)`
      } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

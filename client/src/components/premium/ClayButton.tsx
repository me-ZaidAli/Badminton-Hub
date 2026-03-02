import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface ClayButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "default" | "muted" | "warm" | "cool";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const variantStyles = {
  default: "clay-btn-default",
  muted: "clay-btn-muted",
  warm: "clay-btn-warm",
  cool: "clay-btn-cool",
};

const sizeMap = {
  default: "min-h-10 px-5 py-2.5 text-sm",
  sm: "min-h-8 px-4 py-1.5 text-xs",
  lg: "min-h-12 px-8 py-3 text-base",
};

export function ClayButton({
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: ClayButtonProps) {
  return (
    <motion.button
      data-testid={`clay-btn-${variant}`}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-2xl font-semibold",
        "clay-button",
        variantStyles[variant],
        sizeMap[size],
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      whileHover={{
        y: -1,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
      }}
      whileTap={{
        scale: 0.98,
        y: 1,
        transition: { duration: 0.1 }
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

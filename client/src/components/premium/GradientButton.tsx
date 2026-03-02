import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "cosmic" | "ember" | "ocean" | "aurora";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const gradientMap = {
  primary: "from-primary via-primary/80 to-primary",
  cosmic: "from-violet-600 via-fuchsia-500 to-orange-400",
  ember: "from-red-600 via-orange-500 to-amber-400",
  ocean: "from-cyan-600 via-blue-500 to-indigo-400",
  aurora: "from-emerald-500 via-teal-400 to-cyan-300",
};

const sizeMap = {
  default: "min-h-9 px-6 py-2 text-sm",
  sm: "min-h-8 px-4 py-1.5 text-xs",
  lg: "min-h-12 px-8 py-3 text-base",
};

export function GradientButton({
  variant = "primary",
  size = "default",
  className,
  children,
  ...props
}: GradientButtonProps) {
  return (
    <motion.button
      data-testid={`gradient-btn-${variant}`}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white overflow-hidden",
        "bg-gradient-to-br shadow-lg",
        gradientMap[variant],
        sizeMap[size],
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
        aria-hidden="true"
      />
    </motion.button>
  );
}

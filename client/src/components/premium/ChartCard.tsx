import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChartCardProps extends Omit<HTMLMotionProps<"div">, "ref" | "title"> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  className,
  children,
  ...props
}: ChartCardProps) {
  return (
    <motion.div
      data-testid="chart-card"
      data-slot="card"
      className={cn(
        "rounded-[20px] border border-white/[0.08] relative",
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 pt-6 pb-2">
          {title && (
            <h3 className="text-sm font-semibold text-foreground" data-testid="chart-card-title">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="chart-card-subtitle">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="p-6 pt-2">
        {children}
      </div>
    </motion.div>
  );
}

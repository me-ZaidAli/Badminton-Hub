import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

interface ExpandableChartDialogProps {
  title: string;
  description?: string;
  children: ReactNode;
  expandedChart: ReactNode;
  footer?: ReactNode;
}

export function ExpandableChartDialog({
  title,
  description,
  children,
  expandedChart,
  footer,
}: ExpandableChartDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="relative group"
        data-testid={`expandable-chart-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm h-7 w-7 shadow-sm border"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          data-testid={`button-expand-${title.replace(/\s+/g, "-").toLowerCase()}`}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[95vw] w-[98vw] sm:w-[95vw] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="min-h-[50vh] sm:min-h-[60vh]">
            {expandedChart}
          </div>
          {footer && <div className="pt-4 border-t">{footer}</div>}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface KpiDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function KpiDetailDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: KpiDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

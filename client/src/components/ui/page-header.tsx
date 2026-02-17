import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-8 fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-sm sm:text-base text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

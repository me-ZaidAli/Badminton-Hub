import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, ShieldCheck, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

type Person = { id: number; fullName: string } | null | undefined;

interface SessionTeamBadgesProps {
  coordinator?: Person;
  organiser?: Person;
  coach?: Person;
  size?: "sm" | "md";
  className?: string;
  sessionId?: number | string;
}

const ROLE_STYLES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string; ring: string }> = {
  coordinator: {
    label: "Coordinator",
    icon: Crown,
    chip: "bg-amber-500/25 text-amber-900 dark:text-amber-100 border-amber-400/60",
    ring: "ring-2 ring-amber-400/70",
  },
  organiser: {
    label: "Organiser",
    icon: ShieldCheck,
    chip: "bg-blue-500/25 text-blue-900 dark:text-blue-100 border-blue-400/60",
    ring: "ring-2 ring-blue-400/60",
  },
  coach: {
    label: "Coach",
    icon: GraduationCap,
    chip: "bg-violet-500/25 text-violet-900 dark:text-violet-50 border-violet-400/60",
    ring: "ring-2 ring-violet-400/60",
  },
};

export function SessionTeamBadges({
  coordinator,
  organiser,
  coach,
  size = "sm",
  className,
  sessionId,
}: SessionTeamBadgesProps) {
  const items = [
    coordinator ? { key: "coordinator", person: coordinator } : null,
    organiser ? { key: "organiser", person: organiser } : null,
    coach ? { key: "coach", person: coach } : null,
  ].filter(Boolean) as { key: keyof typeof ROLE_STYLES | string; person: { id: number; fullName: string } }[];

  if (items.length === 0) return null;

  const avatarSize = size === "md" ? "h-7 w-7" : "h-6 w-6";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-testid={sessionId ? `team-badges-${sessionId}` : "team-badges"}
    >
      {items.map(({ key, person }) => {
        const style = ROLE_STYLES[key as string];
        const Icon = style.icon;
        return (
          <div
            key={key as string}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold",
              style.chip,
              textSize,
            )}
            data-testid={`team-badge-${key}-${sessionId ?? person.id}`}
            title={`${style.label}: ${person.fullName}`}
          >
            <Avatar className={cn(avatarSize, style.ring)}>
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${person.fullName}`} />
              <AvatarFallback className="text-[10px] font-bold">
                {person.fullName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Icon className="h-3.5 w-3.5" />
            <span>{style.label}</span>
            <span className="opacity-90 truncate max-w-[120px]">{person.fullName.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

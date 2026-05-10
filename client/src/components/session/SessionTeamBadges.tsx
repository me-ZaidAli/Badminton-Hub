import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, ShieldCheck, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Person = { id: number; fullName: string } | null | undefined;

interface SessionTeamBadgesProps {
  coordinator?: Person;
  organiser?: Person;
  coach?: Person;
  coordinators?: Person[];
  organisers?: Person[];
  coaches?: Person[];
  supportCoaches?: Person[];
  size?: "sm" | "md";
  className?: string;
  sessionId?: number | string;
}

// White text on a near-opaque dark chip with a bright role-coloured icon and
// ring. Guarantees readable contrast on any background (light, dark, navy).
const ROLE_STYLES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; chip: string; ring: string; iconColor: string }> = {
  coordinator: {
    label: "Coordinator",
    icon: Crown,
    chip: "bg-slate-900/85 text-white border-amber-400/80 shadow-sm",
    ring: "ring-2 ring-amber-300",
    iconColor: "text-amber-300",
  },
  organiser: {
    label: "Organiser",
    icon: ShieldCheck,
    chip: "bg-slate-900/85 text-white border-amber-300/80 shadow-sm",
    ring: "ring-2 ring-amber-200",
    iconColor: "text-amber-200",
  },
  coach: {
    label: "Coach",
    icon: GraduationCap,
    chip: "bg-slate-900/85 text-white border-yellow-400/80 shadow-sm",
    ring: "ring-2 ring-yellow-300",
    iconColor: "text-yellow-300",
  },
  supportCoach: {
    label: "Support Coach",
    icon: Sparkles,
    chip: "bg-slate-900/85 text-white border-white/70 shadow-sm",
    ring: "ring-2 ring-white/80",
    iconColor: "text-white",
  },
};

export function SessionTeamBadges({
  coordinator,
  organiser,
  coach,
  coordinators,
  organisers,
  coaches,
  supportCoaches,
  size = "sm",
  className,
  sessionId,
}: SessionTeamBadgesProps) {
  const norm = (arr: Person[] | undefined, single: Person | undefined): Person[] => {
    const ok = (p: any): p is Person => !!p && typeof p.fullName === "string" && p.fullName.length > 0;
    if (Array.isArray(arr) && arr.length > 0) return arr.filter(ok);
    return ok(single) ? [single] : [];
  };
  const coordList = norm(coordinators, coordinator);
  const orgList = norm(organisers, organiser);
  const coachList = norm(coaches, coach);
  const supportList = norm(supportCoaches, undefined);

  const items = [
    ...coordList.map((p) => ({ key: "coordinator", person: p! })),
    ...orgList.map((p) => ({ key: "organiser", person: p! })),
    ...coachList.map((p) => ({ key: "coach", person: p! })),
    ...supportList.map((p) => ({ key: "supportCoach", person: p! })),
  ];

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
            <Icon className={cn("h-3.5 w-3.5", style.iconColor)} />
            <span className="text-white">{style.label}</span>
            <span className="text-white/90 truncate max-w-[120px]">{person.fullName.split(" ")[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

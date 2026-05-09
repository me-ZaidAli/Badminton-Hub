import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MemberOption = {
  id: number;
  userId: number;
  fullName: string;
  email?: string | null;
  teamRoles?: string[];
};

type Member = {
  id: number;
  userId: number;
  teamRoles?: string[] | null;
  user: { id: number; fullName: string; email?: string | null };
};

interface MemberSelectorProps {
  clubId: number | null | undefined;
  values: number[];
  onChange: (userIds: number[]) => void;
  placeholder?: string;
  preferredRole?: "COACH" | "SUPPORT_COACH" | "ORGANISER" | "COORDINATOR";
  testId?: string;
}

export function MemberSelector({
  clubId,
  values,
  onChange,
  placeholder = "Add a club member",
  preferredRole,
  testId,
}: MemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
    enabled: !!clubId,
  });

  const selectedSet = useMemo(() => new Set(values || []), [values]);

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    const list = members.filter((m) => m.user);
    if (!preferredRole) return list;
    return [...list].sort((a, b) => {
      const ar = (a.teamRoles || []).includes(preferredRole) ? 0 : 1;
      const br = (b.teamRoles || []).includes(preferredRole) ? 0 : 1;
      return ar - br;
    });
  }, [members, preferredRole]);

  const selectedMembers = useMemo(
    () => (members || []).filter((m) => selectedSet.has(m.userId)),
    [members, selectedSet],
  );

  const toggle = (userId: number) => {
    if (selectedSet.has(userId)) {
      onChange((values || []).filter((id) => id !== userId));
    } else {
      onChange([...(values || []), userId]);
    }
  };

  const remove = (userId: number) => {
    onChange((values || []).filter((id) => id !== userId));
  };

  return (
    <div className="space-y-2 mt-2">
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid={`${testId ?? "select-member"}-chips`}>
          {selectedMembers.map((m) => (
            <span
              key={m.userId}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1 pr-2 py-0.5 text-xs"
              data-testid={`${testId ?? "select-member"}-chip-${m.userId}`}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.user.fullName}`} />
                <AvatarFallback className="text-[9px]">{m.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[140px]">{m.user.fullName}</span>
              <button
                type="button"
                className="hover-elevate rounded-full p-0.5"
                onClick={() => remove(m.userId)}
                aria-label={`Remove ${m.user.fullName}`}
                data-testid={`${testId ?? "select-member"}-remove-${m.userId}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!clubId}
            className="w-full justify-between"
            data-testid={testId ?? "select-member"}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              {isLoading ? "Loading members..." : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                {sortedMembers.map((m) => {
                  const hasPreferred = preferredRole && (m.teamRoles || []).includes(preferredRole);
                  const isSelected = selectedSet.has(m.userId);
                  return (
                    <CommandItem
                      key={m.userId}
                      value={`${m.user.fullName} ${m.user.email ?? ""}`}
                      onSelect={() => {
                        toggle(m.userId);
                      }}
                      data-testid={`option-member-${m.userId}`}
                    >
                      <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.user.fullName}`} />
                        <AvatarFallback>{m.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">{m.user.fullName}</span>
                        {m.user.email && (
                          <span className="text-xs text-muted-foreground truncate">{m.user.email}</span>
                        )}
                      </div>
                      {hasPreferred && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-primary">
                          {preferredRole}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

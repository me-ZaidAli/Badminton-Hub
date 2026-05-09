import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
  value: number | null | undefined;
  onChange: (userId: number | null) => void;
  placeholder?: string;
  preferredRole?: "COACH" | "ORGANISER" | "COORDINATOR";
  testId?: string;
}

export function MemberSelector({
  clubId,
  value,
  onChange,
  placeholder = "Select a club member",
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

  const selected = members?.find((m) => m.userId === value);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={!clubId}
            className="w-full justify-between mt-2"
            data-testid={testId ?? "select-member"}
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selected.user.fullName}`} />
                  <AvatarFallback>{selected.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">{selected.user.fullName}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{isLoading ? "Loading members..." : placeholder}</span>
            )}
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
                  return (
                    <CommandItem
                      key={m.userId}
                      value={`${m.user.fullName} ${m.user.email ?? ""}`}
                      onSelect={() => {
                        onChange(m.userId);
                        setOpen(false);
                      }}
                      data-testid={`option-member-${m.userId}`}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === m.userId ? "opacity-100" : "opacity-0")} />
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
      {value != null && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-2 h-9 w-9 shrink-0"
          onClick={() => onChange(null)}
          data-testid={`${testId ?? "select-member"}-clear`}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

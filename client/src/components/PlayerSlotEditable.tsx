import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, UserPlus, Trophy, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Player = {
  id: number;
  fullName: string;
  category: string | null;
};

type MatchPlayer = {
  id: number;
  user?: { fullName: string } | null;
  fullName?: string;
  category: string | null;
  matchesPlayed?: number | null;
};

export type PlayerSlotEditableProps = {
  player: MatchPlayer | null;
  position: string;
  matchId: number;
  availablePlayers: Player[];
  isOrganiser: boolean;
  onSwap: (matchId: number, position: string, newPlayerId: number) => void;
  variant?: "court" | "queue" | "compact";
  team?: "A" | "B";
  isBusy?: boolean;
  sessionMatchCount?: number;
  achievements?: Record<number, { trophy?: boolean; fire?: boolean }>;
  className?: string;
  showMatchCount?: boolean;
  sessionMatchCounts?: Record<number, number>;
};

export function PlayerSlotEditable({
  player,
  position,
  matchId,
  availablePlayers,
  isOrganiser,
  onSwap,
  variant = "queue",
  team = "A",
  isBusy,
  sessionMatchCount,
  achievements,
  className,
  showMatchCount,
  sessionMatchCounts,
}: PlayerSlotEditableProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPlayers = availablePlayers.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const playerName = player?.user?.fullName || player?.fullName || null;
  const playerId = player?.id;

  const sortedFilteredPlayers = [...filteredPlayers].sort((a, b) => (sessionMatchCounts?.[a.id] ?? 0) - (sessionMatchCounts?.[b.id] ?? 0));

  if (variant === "court") {
    return <CourtVariant
      player={player}
      playerName={playerName}
      position={position}
      team={team}
      isOrganiser={isOrganiser}
      open={open}
      setOpen={setOpen}
      search={search}
      setSearch={setSearch}
      filteredPlayers={sortedFilteredPlayers}
      playerId={playerId}
      matchId={matchId}
      onSwap={onSwap}
      sessionMatchCounts={sessionMatchCounts}
    />;
  }

  if (variant === "compact") {
    return <CompactVariant
      player={player}
      playerName={playerName}
      position={position}
      matchId={matchId}
      isOrganiser={isOrganiser}
      open={open}
      setOpen={setOpen}
      search={search}
      setSearch={setSearch}
      filteredPlayers={sortedFilteredPlayers}
      playerId={playerId}
      onSwap={onSwap}
      isBusy={isBusy}
      sessionMatchCount={sessionMatchCount}
      showMatchCount={showMatchCount}
      className={className}
      sessionMatchCounts={sessionMatchCounts}
    />;
  }

  return <QueueVariant
    player={player}
    playerName={playerName}
    position={position}
    matchId={matchId}
    isOrganiser={isOrganiser}
    open={open}
    setOpen={setOpen}
    search={search}
    setSearch={setSearch}
    filteredPlayers={sortedFilteredPlayers}
    playerId={playerId}
    onSwap={onSwap}
    isBusy={isBusy}
    sessionMatchCount={sessionMatchCount}
    achievements={achievements}
    sessionMatchCounts={sessionMatchCounts}
  />;
}

function PlayerSearchDialog({
  open,
  onOpenChange,
  title,
  search,
  setSearch,
  filteredPlayers,
  currentPlayerId,
  matchId,
  position,
  onSwap,
  sessionMatchCounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  search: string;
  setSearch: (s: string) => void;
  filteredPlayers: Player[];
  currentPlayerId?: number;
  matchId: number;
  position: string;
  onSwap: (matchId: number, position: string, newPlayerId: number) => void;
  sessionMatchCounts?: Record<number, number>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Select a player to assign to this slot. They will be removed from any other active match.</DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search players..." value={search} onValueChange={setSearch} data-testid={`input-search-player-${position}`} />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup>
              {filteredPlayers.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.fullName}
                  onSelect={() => {
                    onSwap(matchId, position, p.id);
                    onOpenChange(false);
                    setSearch("");
                  }}
                  data-testid={`select-player-${p.id}`}
                >
                  <Check className={cn("mr-2 h-4 w-4", currentPlayerId === p.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{p.fullName} ({p.category || "?"})</span>
                  <span className="text-xs text-muted-foreground ml-2 tabular-nums" data-testid={`swap-count-${p.id}`}>{sessionMatchCounts?.[p.id] ?? 0}g</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CourtVariant({
  player,
  playerName,
  position,
  team,
  isOrganiser,
  open,
  setOpen,
  search,
  setSearch,
  filteredPlayers,
  playerId,
  matchId,
  onSwap,
  sessionMatchCounts,
}: any) {
  const teamStyles = team === "A"
    ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
    : "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100";

  const hoverStyles = team === "A"
    ? "hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-100/60 dark:hover:bg-blue-900/40"
    : "hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-900/40";

  if (!player) {
    return (
      <>
        <div
          onClick={() => isOrganiser && setOpen(true)}
          className={cn(
            "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-center transition-all min-w-0 border-dashed",
            teamStyles,
            isOrganiser && cn("cursor-pointer", hoverStyles)
          )}
          data-testid={`player-slot-${position}`}
        >
          <div className="flex items-center justify-center gap-1 text-xs font-medium opacity-70">
            <UserPlus className="w-3 h-3" />
            <span>+ Add Player</span>
          </div>
        </div>
        <PlayerSearchDialog
          open={open}
          onOpenChange={setOpen}
          title="Add Player"
          search={search}
          setSearch={setSearch}
          filteredPlayers={filteredPlayers}
          matchId={matchId}
          position={position}
          onSwap={onSwap}
          sessionMatchCounts={sessionMatchCounts}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => isOrganiser && setOpen(true)}
        className={cn(
          "px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-center transition-all min-w-0",
          teamStyles,
          isOrganiser && cn("cursor-pointer", hoverStyles)
        )}
        data-testid={`player-slot-${position}`}
      >
        <div className="font-semibold text-xs sm:text-sm truncate">{playerName || "Unknown"}</div>
        <Badge variant="outline" className={cn("text-xs mt-1", team === "A" ? "border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" : "border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300")}>{player.category || "?"}</Badge>
      </div>
      <PlayerSearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Swap Player"
        search={search}
        setSearch={setSearch}
        filteredPlayers={filteredPlayers}
        currentPlayerId={playerId}
        matchId={matchId}
        position={position}
        onSwap={onSwap}
        sessionMatchCounts={sessionMatchCounts}
      />
    </>
  );
}

function QueueVariant({
  player,
  playerName,
  position,
  matchId,
  isOrganiser,
  open,
  setOpen,
  search,
  setSearch,
  filteredPlayers,
  playerId,
  onSwap,
  isBusy,
  sessionMatchCount,
  achievements,
  sessionMatchCounts,
}: any) {
  if (!player) {
    return (
      <>
        <Badge
          variant="outline"
          className={cn(
            "text-xs py-1 border-dashed",
            isOrganiser ? "cursor-pointer hover:bg-primary/10" : "opacity-50"
          )}
          onClick={() => isOrganiser && setOpen(true)}
          data-testid={`queue-player-empty-${matchId}-${position}`}
        >
          + Add Player
        </Badge>
        <PlayerSearchDialog
          open={open}
          onOpenChange={setOpen}
          title="Add Player"
          search={search}
          setSearch={setSearch}
          filteredPlayers={filteredPlayers}
          matchId={matchId}
          position={position}
          onSwap={onSwap}
          sessionMatchCounts={sessionMatchCounts}
        />
      </>
    );
  }

  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          "text-xs py-1 max-w-full truncate inline-flex items-center gap-0.5",
          isOrganiser && "cursor-pointer hover:bg-primary/10",
          isBusy && "border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
        )}
        onClick={() => isOrganiser && setOpen(true)}
        data-testid={`queue-player-${matchId}-${position}`}
        title={isBusy ? "This player is already in another live or queued match" : undefined}
      >
        <span className="truncate">{playerName || "Unknown"}</span>
        {sessionMatchCount != null && <span className="text-muted-foreground text-[10px] shrink-0">({sessionMatchCount})</span>}
        {achievements && playerId && achievements[playerId]?.trophy && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
        {achievements && playerId && achievements[playerId]?.fire && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
      </Badge>
      <PlayerSearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Swap Player"
        search={search}
        setSearch={setSearch}
        filteredPlayers={filteredPlayers}
        currentPlayerId={playerId}
        matchId={matchId}
        position={position}
        onSwap={onSwap}
        sessionMatchCounts={sessionMatchCounts}
      />
    </>
  );
}

function CompactVariant({
  player,
  playerName,
  position,
  matchId,
  isOrganiser,
  open,
  setOpen,
  search,
  setSearch,
  filteredPlayers,
  playerId,
  onSwap,
  isBusy,
  sessionMatchCount,
  showMatchCount,
  className,
  sessionMatchCounts,
}: any) {
  const busyClass = isBusy ? "text-red-500 dark:text-red-400 animate-pulse" : "";

  if (!player) {
    if (!isOrganiser) {
      return <span className={cn(className, "text-muted-foreground opacity-50 text-xs italic")}>Empty</span>;
    }
    return (
      <>
        <span
          role="button"
          tabIndex={0}
          className={cn(className, "cursor-pointer text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors")}
          onClick={(e: any) => { e.stopPropagation(); setOpen(true); }}
          onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
          data-testid={`compact-add-${position}-${matchId}`}
        >
          <span className="inline-flex items-center gap-0.5 text-xs italic opacity-70">
            <UserPlus className="w-3 h-3" /> Add Player
          </span>
        </span>
        <PlayerSearchDialog
          open={open}
          onOpenChange={setOpen}
          title="Add Player"
          search={search}
          setSearch={setSearch}
          filteredPlayers={filteredPlayers}
          matchId={matchId}
          position={position}
          onSwap={onSwap}
          sessionMatchCounts={sessionMatchCounts}
        />
      </>
    );
  }

  const matchCount = sessionMatchCount ?? null;
  const nameWithCount = showMatchCount && matchCount != null ? (
    <>{playerName} <span className="text-gray-400 dark:text-zinc-500 font-normal text-[10px] sm:text-[11px]">({matchCount})</span></>
  ) : playerName || "Unknown";

  if (!isOrganiser) {
    return <span className={cn(className, busyClass)} title={isBusy ? "This player is in multiple live/queued matches" : undefined}>{nameWithCount}</span>;
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className={cn(className, busyClass, "cursor-pointer hover:underline hover:text-amber-600 dark:hover:text-amber-400 transition-colors")}
        onClick={(e: any) => { e.stopPropagation(); setOpen(true); }}
        onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
        data-testid={`compact-swap-${position}-${matchId}`}
      >
        {nameWithCount}
      </span>
      <PlayerSearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Swap Player"
        search={search}
        setSearch={setSearch}
        filteredPlayers={filteredPlayers}
        currentPlayerId={playerId}
        matchId={matchId}
        position={position}
        onSwap={onSwap}
        sessionMatchCounts={sessionMatchCounts}
      />
    </>
  );
}

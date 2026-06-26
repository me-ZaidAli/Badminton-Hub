import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trophy, Users, Trash2, Wand2, ChevronUp, ChevronDown,
  GripVertical, Swords, Loader2, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useTournamentPlan,
  useCreateGroup, useUpdateGroup, useDeleteGroup,
  useCreateEntry, useMoveEntry, useDeleteEntry,
  useAutoGenerateGroupMatches, useDeletePlannedMatch, useReorderPlannedMatches,
  useStartTournament,
} from "@/hooks/use-matches";

interface Props {
  sessionId: number;
  onClose: () => void;
}

export function SessionTournamentPlanner({ sessionId, onClose }: Props) {
  const { toast } = useToast();
  const { data: plan, isLoading } = useTournamentPlan(sessionId);

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const createEntry = useCreateEntry();
  const moveEntry = useMoveEntry();
  const deleteEntry = useDeleteEntry();
  const autoGen = useAutoGenerateGroupMatches();
  const deletePlanned = useDeletePlannedMatch();
  const reorderPlanned = useReorderPlannedMatches();
  const startTournament = useStartTournament();

  const [selected, setSelected] = useState<number[]>([]);
  const [draggingEntryId, setDraggingEntryId] = useState<number | null>(null);

  const playersPerSide = plan?.playersPerSide ?? 2;
  const isDoubles = playersPerSide >= 2;

  const attendeeMap = useMemo(() => {
    const m = new Map<number, { fullName: string; grade: string | null }>();
    (plan?.attendees || []).forEach(a => m.set(a.profileId, { fullName: a.fullName, grade: a.grade }));
    return m;
  }, [plan]);

  const usedPlayerIds = useMemo(() => {
    const s = new Set<number>();
    (plan?.entries || []).forEach(e => { s.add(e.player1Id); if (e.player2Id) s.add(e.player2Id); });
    return s;
  }, [plan]);

  const pool = useMemo(
    () => (plan?.attendees || []).filter(a => !usedPlayerIds.has(a.profileId)),
    [plan, usedPlayerIds],
  );

  const unassignedEntries = useMemo(
    () => (plan?.entries || []).filter(e => e.groupId == null),
    [plan],
  );

  const entryLabel = (e: { player1Id: number; player2Id: number | null }) => {
    const p1 = attendeeMap.get(e.player1Id)?.fullName || `#${e.player1Id}`;
    if (!e.player2Id) return p1;
    const p2 = attendeeMap.get(e.player2Id)?.fullName || `#${e.player2Id}`;
    return `${p1} & ${p2}`;
  };

  const teamLabel = (p1: number | null, p2: number | null) => {
    const a = p1 ? attendeeMap.get(p1)?.fullName || `#${p1}` : "TBD";
    if (!p2) return a;
    const b = attendeeMap.get(p2)?.fullName || `#${p2}`;
    return `${a} & ${b}`;
  };

  const toggleSelect = (profileId: number) => {
    setSelected(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId],
    );
  };

  const handleAddSingles = () => {
    selected.forEach(pid => createEntry.mutate({ sessionId, player1Id: pid, groupId: null }));
    setSelected([]);
  };

  const handleAddPair = () => {
    if (selected.length !== 2) {
      toast({ title: "Pick exactly two players for a pair", variant: "destructive" });
      return;
    }
    createEntry.mutate({ sessionId, player1Id: selected[0], player2Id: selected[1], groupId: null });
    setSelected([]);
  };

  const dropOnGroup = (groupId: number | null) => {
    if (draggingEntryId == null) return;
    moveEntry.mutate({ sessionId, entryId: draggingEntryId, groupId });
    setDraggingEntryId(null);
  };

  const handleReorder = (groupId: number, matchId: number, dir: -1 | 1) => {
    const groupMatches = (plan?.plannedMatches || [])
      .filter(m => m.groupId === groupId)
      .sort((a, b) => (a.plannedOrder || 0) - (b.plannedOrder || 0));
    const idx = groupMatches.findIndex(m => m.id === matchId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= groupMatches.length) return;
    const ids = groupMatches.map(m => m.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorderPlanned.mutate({ sessionId, orderedIds: ids });
  };

  const totalPlanned = plan?.plannedMatches.length || 0;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm overflow-y-auto" data-testid="tournament-planner">
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tournament Planner</h2>
              <p className="text-xs text-white/50">Plan pairs, groups &amp; matches before play</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => startTournament.mutate({ sessionId } as any, { onSuccess: onClose })}
              disabled={totalPlanned === 0 || startTournament.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              data-testid="button-start-tournament"
            >
              {startTournament.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
              Start Tournament
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white" data-testid="button-close-planner">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-white/60">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading plan…
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-4 sm:p-6">
            {/* Pool + team builder */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-white text-sm">Players ({pool.length})</h3>
                </div>
                {pool.length === 0 ? (
                  <p className="text-xs text-white/40 py-4 text-center">All players are placed.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pool.map(p => {
                      const isSel = selected.includes(p.profileId);
                      return (
                        <button
                          key={p.profileId}
                          onClick={() => toggleSelect(p.profileId)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isSel
                              ? "bg-cyan-500/30 border-cyan-400 text-white"
                              : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                          }`}
                          data-testid={`chip-player-${p.profileId}`}
                        >
                          {p.fullName}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {isDoubles && (
                    <Button
                      size="sm" className="flex-1" onClick={handleAddPair}
                      disabled={selected.length !== 2 || createEntry.isPending}
                      data-testid="button-add-pair"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add pair
                    </Button>
                  )}
                  <Button
                    size="sm" variant={isDoubles ? "outline" : "default"} className="flex-1"
                    onClick={handleAddSingles}
                    disabled={selected.length === 0 || createEntry.isPending}
                    data-testid="button-add-single"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add single{selected.length > 1 ? "s" : ""}
                  </Button>
                </div>
              </div>

              {/* Unassigned teams tray */}
              <div
                className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 min-h-[100px]"
                onDragOver={e => e.preventDefault()}
                onDrop={() => dropOnGroup(null)}
                data-testid="tray-unassigned"
              >
                <h3 className="font-semibold text-white text-sm mb-3">Teams to place ({unassignedEntries.length})</h3>
                <div className="space-y-2">
                  {unassignedEntries.map(e => (
                    <EntryCard
                      key={e.id} label={entryLabel(e)}
                      onDragStart={() => setDraggingEntryId(e.id)}
                      onDelete={() => deleteEntry.mutate({ sessionId, entryId: e.id })}
                    />
                  ))}
                  {unassignedEntries.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-2">Build pairs/singles, then drag them into a court below.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Groups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Court Groups</h3>
                <Button
                  size="sm" variant="outline"
                  onClick={() => createGroup.mutate({ sessionId } as any)}
                  disabled={createGroup.isPending}
                  data-testid="button-add-group"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add group
                </Button>
              </div>

              {(plan?.groups.length || 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/40 text-sm">
                  No groups yet. Add a group for each court, then drag teams in.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {plan!.groups.map(g => {
                      const groupEntries = plan!.entries.filter(e => e.groupId === g.id);
                      const groupMatches = plan!.plannedMatches
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) => (a.plannedOrder || 0) - (b.plannedOrder || 0));
                      return (
                        <motion.div
                          key={g.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col"
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => dropOnGroup(g.id)}
                          data-testid={`group-${g.id}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              defaultValue={g.name}
                              onBlur={e => {
                                if (e.target.value.trim() && e.target.value !== g.name)
                                  updateGroup.mutate({ sessionId, groupId: g.id, name: e.target.value.trim() });
                              }}
                              className="h-8 bg-white/5 border-white/10 text-white text-sm font-semibold"
                              data-testid={`input-group-name-${g.id}`}
                            />
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-white/40 hover:text-red-400 shrink-0"
                              onClick={() => deleteGroup.mutate({ sessionId, groupId: g.id })}
                              data-testid={`button-delete-group-${g.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-white/50">Court</span>
                            <Input
                              type="number" min={1}
                              defaultValue={g.courtNumber ?? ""}
                              onBlur={e => {
                                const v = e.target.value === "" ? null : Number(e.target.value);
                                if (v !== g.courtNumber)
                                  updateGroup.mutate({ sessionId, groupId: g.id, courtNumber: v });
                              }}
                              className="h-7 w-16 bg-white/5 border-white/10 text-white text-xs"
                              data-testid={`input-group-court-${g.id}`}
                            />
                          </div>

                          {/* Entries */}
                          <div className="space-y-2 mb-3 min-h-[40px]">
                            {groupEntries.map(e => (
                              <EntryCard
                                key={e.id} label={entryLabel(e)}
                                onDragStart={() => setDraggingEntryId(e.id)}
                                onDelete={() => deleteEntry.mutate({ sessionId, entryId: e.id })}
                              />
                            ))}
                            {groupEntries.length === 0 && (
                              <p className="text-xs text-white/30 text-center py-2 border border-dashed border-white/10 rounded-lg">Drag teams here</p>
                            )}
                          </div>

                          <Button
                            size="sm" variant="secondary" className="w-full mb-3"
                            onClick={() => autoGen.mutate({ sessionId, groupId: g.id })}
                            disabled={groupEntries.length < 2 || autoGen.isPending}
                            data-testid={`button-autogen-${g.id}`}
                          >
                            <Wand2 className="w-3.5 h-3.5 mr-1" /> Auto round-robin
                          </Button>

                          {/* Planned matches */}
                          {groupMatches.length > 0 && (
                            <div className="space-y-1.5 border-t border-white/10 pt-2">
                              <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
                                <Swords className="w-3.5 h-3.5" /> {groupMatches.length} matches
                              </div>
                              {groupMatches.map((m, i) => (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-1.5 text-xs bg-white/5 rounded-lg px-2 py-1.5"
                                  data-testid={`planned-match-${m.id}`}
                                >
                                  <span className="text-white/40 w-4">{i + 1}</span>
                                  <span className="flex-1 text-white/85 truncate">
                                    {teamLabel(m.teamAPlayer1Id, m.teamAPlayer2Id)}
                                    <span className="text-white/40"> vs </span>
                                    {teamLabel(m.teamBPlayer1Id, m.teamBPlayer2Id)}
                                  </span>
                                  <button onClick={() => handleReorder(g.id, m.id, -1)} disabled={i === 0} className="text-white/40 hover:text-white disabled:opacity-20" data-testid={`button-match-up-${m.id}`}>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleReorder(g.id, m.id, 1)} disabled={i === groupMatches.length - 1} className="text-white/40 hover:text-white disabled:opacity-20" data-testid={`button-match-down-${m.id}`}>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deletePlanned.mutate({ sessionId, matchId: m.id })} className="text-white/40 hover:text-red-400" data-testid={`button-delete-match-${m.id}`}>
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryCard({ label, onDragStart, onDelete }: { label: string; onDragStart: () => void; onDelete: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 bg-white/10 hover:bg-white/15 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing border border-white/10"
      data-testid="entry-card"
    >
      <GripVertical className="w-4 h-4 text-white/30 shrink-0" />
      <span className="flex-1 text-sm text-white/90 truncate">{label}</span>
      <button onClick={onDelete} className="text-white/30 hover:text-red-400 shrink-0" data-testid="button-delete-entry">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

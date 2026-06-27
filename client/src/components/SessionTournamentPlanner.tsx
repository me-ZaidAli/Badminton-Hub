import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Trophy, Users, Trash2, Wand2, ChevronUp, ChevronDown,
  GripVertical, Swords, Loader2, Play, Undo2, ListOrdered, ArrowRightCircle,
  Shuffle, Hand, Layers, Zap, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useTournamentPlan,
  useCreateGroup, useUpdateGroup, useDeleteGroup,
  useCreateEntry, useMoveEntry, useDeleteEntry,
  useAutoGenerateGroupMatches, useDeletePlannedMatch, useReorderPlannedMatches,
  useStartTournament,
  useCreateStage, useUpdateStage, useDeleteStage, useRestartStage, useAdvanceStage, useStageStandings,
  type SessionStage,
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
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const restartStage = useRestartStage();

  const [selected, setSelected] = useState<number[]>([]);
  const [draggingEntryId, setDraggingEntryId] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);

  const stages = plan?.stages || [];

  // Default to the latest non-completed stage (or just the last one).
  useEffect(() => {
    if (!stages.length) return;
    if (selectedStageId != null && stages.some(s => s.id === selectedStageId)) return;
    const open = [...stages].reverse().find(s => s.status !== "COMPLETED");
    setSelectedStageId((open || stages[stages.length - 1]).id);
  }, [stages, selectedStageId]);

  const selectedStage = stages.find(s => s.id === selectedStageId) || null;

  const playersPerSide = plan?.playersPerSide ?? 2;
  const isDoubles = playersPerSide >= 2;

  const attendeeMap = useMemo(() => {
    const m = new Map<number, { fullName: string; grade: string | null }>();
    (plan?.attendees || []).forEach(a => m.set(a.profileId, { fullName: a.fullName, grade: a.grade }));
    return m;
  }, [plan]);

  // Entries/groups/matches scoped to the selected stage.
  const stageGroups = useMemo(
    () => (plan?.groups || []).filter(g => g.stageId === selectedStageId)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id),
    [plan, selectedStageId],
  );
  const stageEntries = useMemo(
    () => (plan?.entries || []).filter(e => e.stageId === selectedStageId),
    [plan, selectedStageId],
  );
  // Show a planned match whenever its group is visible in the selected stage.
  // Groups are reliably stage-scoped (createGroup always stamps stageId), so
  // keying off group membership keeps matches visible even if a match row's own
  // stageId drifts (e.g. legacy rows created before multi-stage). A planned
  // match must NEVER disappear from the planner unless the user deletes it.
  const stageGroupIds = useMemo(
    () => new Set(stageGroups.map(g => g.id)),
    [stageGroups],
  );
  const stagePlanned = useMemo(
    () => (plan?.plannedMatches || []).filter(m =>
      m.groupId != null ? stageGroupIds.has(m.groupId) : m.stageId === selectedStageId,
    ),
    [plan, stageGroupIds, selectedStageId],
  );

  // Matches already released into the live flow (QUEUED / LIVE / COMPLETED).
  // Shown read-only under their group so a generated match never appears to
  // vanish from the planner once the tournament has started.
  const stageReleased = useMemo(
    () => (plan?.releasedMatches || []).filter(m =>
      m.groupId != null && stageGroupIds.has(m.groupId),
    ),
    [plan, stageGroupIds],
  );

  // Safety net: planned matches that would render under NO stage at all — their
  // group no longer exists, or (group-less) their stageId points to no real
  // stage. These must never silently vanish; surface them so the organiser can
  // see and delete them deliberately rather than losing them.
  const orphanPlanned = useMemo(() => {
    const allGroupIds = new Set((plan?.groups || []).map(g => g.id));
    const allStageIds = new Set((plan?.stages || []).map(s => s.id));
    return (plan?.plannedMatches || []).filter(m =>
      m.groupId != null
        ? !allGroupIds.has(m.groupId)
        : m.stageId == null || !allStageIds.has(m.stageId),
    );
  }, [plan]);

  // A player is "used" only within the selected stage.
  const usedPlayerIds = useMemo(() => {
    const s = new Set<number>();
    stageEntries.forEach(e => { s.add(e.player1Id); if (e.player2Id) s.add(e.player2Id); });
    return s;
  }, [stageEntries]);

  const pool = useMemo(
    () =>
      (plan?.attendees || [])
        .filter(a => !usedPlayerIds.has(a.profileId))
        .sort((a, b) =>
          (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" }),
        ),
    [plan, usedPlayerIds],
  );

  const unassignedEntries = useMemo(
    () => stageEntries.filter(e => e.groupId == null),
    [stageEntries],
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
    selected.forEach(pid => createEntry.mutate({ sessionId, player1Id: pid, groupId: null, stageId: selectedStageId ?? undefined }));
    setSelected([]);
  };

  const handleAddPair = () => {
    if (selected.length !== 2) {
      toast({ title: "Pick exactly two players for a pair", variant: "destructive" });
      return;
    }
    createEntry.mutate({ sessionId, player1Id: selected[0], player2Id: selected[1], groupId: null, stageId: selectedStageId ?? undefined });
    setSelected([]);
  };

  const dropOnGroup = (groupId: number | null) => {
    if (draggingEntryId == null) return;
    moveEntry.mutate({ sessionId, entryId: draggingEntryId, groupId });
    setDraggingEntryId(null);
  };

  const handleReorder = (groupId: number, matchId: number, dir: -1 | 1) => {
    const groupMatches = stagePlanned
      .filter(m => m.groupId === groupId)
      .sort((a, b) => (a.plannedOrder || 0) - (b.plannedOrder || 0));
    const idx = groupMatches.findIndex(m => m.id === matchId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= groupMatches.length) return;
    const ids = groupMatches.map(m => m.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorderPlanned.mutate({ sessionId, orderedIds: ids });
  };

  const stagePlannedCount = stagePlanned.length;

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
              <p className="text-xs text-white/50">Plan stages, groups &amp; matches before play</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => startTournament.mutate({ sessionId, stageId: selectedStageId ?? undefined } as any, { onSuccess: onClose })}
              disabled={stagePlannedCount === 0 || startTournament.isPending || !selectedStage}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              data-testid="button-start-tournament"
            >
              {startTournament.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
              Start {selectedStage ? selectedStage.name : "Stage"}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white" data-testid="button-close-planner">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stage tabs */}
        {!isLoading && (
          <div className="flex items-center gap-2 flex-wrap px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02]">
            {stages.map(s => {
              const active = s.id === selectedStageId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStageId(s.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    active
                      ? "bg-amber-500/20 border-amber-400/60 text-white"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                  data-testid={`tab-stage-${s.id}`}
                >
                  <Trophy className="w-3.5 h-3.5 opacity-70" />
                  {s.name}
                  <StageStatusPill status={s.status} />
                </button>
              );
            })}
            <Button
              size="sm" variant="outline"
              onClick={() => createStage.mutate({ sessionId })}
              disabled={createStage.isPending}
              data-testid="button-add-stage"
            >
              <Plus className="w-4 h-4 mr-1" /> Stage
            </Button>
          </div>
        )}

        {/* Stage toolbar */}
        {!isLoading && selectedStage && (
          <div className="flex items-center gap-3 flex-wrap px-4 sm:px-6 py-3 border-b border-white/10">
            <Input
              key={`name-${selectedStage.id}`}
              defaultValue={selectedStage.name}
              onBlur={e => {
                const v = e.target.value.trim();
                if (v && v !== selectedStage.name) updateStage.mutate({ sessionId, stageId: selectedStage.id, name: v });
              }}
              className="h-8 w-44 bg-white/5 border-white/10 text-white text-sm font-semibold"
              data-testid="input-stage-name"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Teams advancing per group</span>
              <Input
                key={`adv-${selectedStage.id}`}
                type="number" min={1}
                defaultValue={selectedStage.advanceCount}
                onBlur={e => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  if (v !== selectedStage.advanceCount) updateStage.mutate({ sessionId, stageId: selectedStage.id, advanceCount: v });
                }}
                className="h-8 w-16 bg-white/5 border-white/10 text-white text-sm"
                data-testid="input-stage-advance-count"
              />
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => setShowAdvance(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              data-testid="button-open-advance"
            >
              <ArrowRightCircle className="w-4 h-4 mr-1.5" /> Advance to next stage
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => {
                if (confirm(`Restart "${selectedStage.name}"? All matches in this stage (including completed ones) will be deleted and the round-robin re-created. The same pairs are kept.`)) {
                  restartStage.mutate({ sessionId, stageId: selectedStage.id });
                }
              }}
              disabled={restartStage.isPending}
              className="border-amber-400/40 text-amber-300 hover:bg-amber-500/10"
              data-testid="button-restart-stage"
            >
              {restartStage.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
              Restart stage
            </Button>
            {stages.length > 1 && (
              <Button
                size="sm" variant="ghost"
                onClick={() => {
                  if (confirm(`Delete stage "${selectedStage.name}"? Its groups and planned matches will be removed.`)) {
                    deleteStage.mutate({ sessionId, stageId: selectedStage.id }, {
                      onSuccess: () => setSelectedStageId(null),
                    });
                  }
                }}
                className="text-white/50 hover:text-red-400"
                data-testid="button-delete-stage"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete stage
              </Button>
            )}
          </div>
        )}

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
                      mode="dissolve"
                      onDragStart={() => setDraggingEntryId(e.id)}
                      onAction={() => deleteEntry.mutate({ sessionId, entryId: e.id })}
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
                  onClick={() => createGroup.mutate({ sessionId, stageId: selectedStageId ?? undefined })}
                  disabled={createGroup.isPending || !selectedStage}
                  data-testid="button-add-group"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add group
                </Button>
              </div>

              {stageGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/40 text-sm">
                  No groups in this stage yet. Add a group for each court, then drag teams in.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {stageGroups.map(g => {
                      const groupEntries = stageEntries.filter(e => e.groupId === g.id);
                      const groupMatches = stagePlanned
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) => (a.plannedOrder || 0) - (b.plannedOrder || 0));
                      const groupReleased = stageReleased
                        .filter(m => m.groupId === g.id)
                        .sort((a, b) =>
                          (a.queuePosition ?? a.plannedOrder ?? 0) - (b.queuePosition ?? b.plannedOrder ?? 0),
                        );
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
                                mode="return"
                                onDragStart={() => setDraggingEntryId(e.id)}
                                onAction={() => moveEntry.mutate({ sessionId, entryId: e.id, groupId: null })}
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

                          {/* Released matches (already in the live flow) — read-only */}
                          {groupReleased.length > 0 && (
                            <div className="space-y-1.5 border-t border-white/10 pt-2 mt-2">
                              <div className="flex items-center gap-1.5 text-xs text-cyan-300/70 mb-1">
                                <Swords className="w-3.5 h-3.5" /> {groupReleased.length} in play
                              </div>
                              {groupReleased.map(m => {
                                const badge =
                                  m.status === "LIVE" ? { label: "Live", cls: "bg-emerald-500/20 text-emerald-300" }
                                  : m.status === "COMPLETED" ? { label: "Done", cls: "bg-white/10 text-white/50" }
                                  : { label: "Queued", cls: "bg-cyan-500/20 text-cyan-300" };
                                return (
                                  <div
                                    key={m.id}
                                    className="flex items-center gap-1.5 text-xs bg-white/[0.03] rounded-lg px-2 py-1.5"
                                    data-testid={`released-match-${m.id}`}
                                  >
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${badge.cls}`} data-testid={`status-released-match-${m.id}`}>
                                      {badge.label}
                                    </span>
                                    <span className="flex-1 text-white/70 truncate">
                                      {teamLabel(m.teamAPlayer1Id, m.teamAPlayer2Id)}
                                      <span className="text-white/30"> vs </span>
                                      {teamLabel(m.teamBPlayer1Id, m.teamBPlayer2Id)}
                                    </span>
                                    {m.status === "COMPLETED" && (
                                      <span className="text-white/60 font-medium shrink-0" data-testid={`score-released-match-${m.id}`}>
                                        {m.scoreA ?? 0}–{m.scoreB ?? 0}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Standings for the selected stage */}
              {selectedStage && stageGroups.length > 0 && (
                <StageStandingsPanel
                  sessionId={sessionId}
                  stage={selectedStage}
                  teamLabel={teamLabel}
                />
              )}

              {/* Recovery panel: planned matches that no longer belong to any
                  visible group/stage are surfaced here so they are never lost
                  silently — the organiser can delete them deliberately. */}
              {orphanPlanned.length > 0 && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3" data-testid="orphan-planned-panel">
                  <div className="text-xs font-medium text-amber-300/90 mb-2">
                    Recovered matches ({orphanPlanned.length}) — not tied to a current group
                  </div>
                  <div className="flex flex-col gap-1">
                    {orphanPlanned.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 text-xs bg-white/5 rounded-lg px-2 py-1.5"
                        data-testid={`orphan-planned-match-${m.id}`}
                      >
                        <span className="flex-1 text-white/85 truncate">
                          {teamLabel(m.teamAPlayer1Id, m.teamAPlayer2Id)}
                          <span className="text-white/40"> vs </span>
                          {teamLabel(m.teamBPlayer1Id, m.teamBPlayer2Id)}
                        </span>
                        <button onClick={() => deletePlanned.mutate({ sessionId, matchId: m.id })} className="text-white/40 hover:text-red-400" data-testid={`button-delete-orphan-match-${m.id}`}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAdvance && selectedStage && (
        <AdvanceDialog
          sessionId={sessionId}
          stage={selectedStage}
          defaultGroupCount={Math.max(1, stageGroups.length)}
          onClose={() => setShowAdvance(false)}
          onAdvanced={(newStageId) => { setShowAdvance(false); setSelectedStageId(newStageId); }}
        />
      )}
    </div>
  );
}

function StageStatusPill({ status }: { status: SessionStage["status"] }) {
  const map: Record<SessionStage["status"], string> = {
    PLANNING: "bg-white/10 text-white/60",
    ACTIVE: "bg-emerald-500/20 text-emerald-300",
    COMPLETED: "bg-amber-500/20 text-amber-300",
  };
  const label = status === "PLANNING" ? "Planning" : status === "ACTIVE" ? "Live" : "Done";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[status]}`}>{label}</span>;
}

function StageStandingsPanel({
  sessionId, stage, teamLabel,
}: {
  sessionId: number;
  stage: SessionStage;
  teamLabel: (p1: number | null, p2: number | null) => string;
}) {
  const { data: standings, isLoading } = useStageStandings(sessionId, stage.id);
  if (isLoading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-white/50 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading standings…
      </div>
    );
  }
  const hasResults = (standings || []).some(g => g.standings.some(s => s.matchesPlayed > 0));
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ListOrdered className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-white">Standings — {stage.name}</h3>
      </div>
      {!hasResults ? (
        <p className="text-xs text-white/40">No completed matches yet. Standings appear once results come in.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(standings || []).map(g => (
            <div key={g.groupId} className="rounded-2xl border border-white/10 bg-white/5 p-3" data-testid={`standings-group-${g.groupId}`}>
              <h4 className="text-sm font-semibold text-white mb-2">{g.groupName}</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/40 text-left">
                    <th className="font-medium pb-1">#</th>
                    <th className="font-medium pb-1">Team</th>
                    <th className="font-medium pb-1 text-center">P</th>
                    <th className="font-medium pb-1 text-center">W</th>
                    <th className="font-medium pb-1 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {g.standings.map(s => (
                    <tr
                      key={s.entryId}
                      className={s.advancing ? "text-emerald-300" : "text-white/80"}
                      data-testid={`standings-row-${s.entryId}`}
                    >
                      <td className="py-0.5">{s.rank}</td>
                      <td className="py-0.5 truncate max-w-[120px]">{teamLabel(s.player1Id, s.player2Id)}</td>
                      <td className="py-0.5 text-center">{s.matchesPlayed}</td>
                      <td className="py-0.5 text-center">{s.matchesWon}</td>
                      <td className="py-0.5 text-center">{s.pointsWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-emerald-400/70 mt-2">Top {g.advanceCount} (green) advance.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdvanceDialog({
  sessionId, stage, defaultGroupCount, onClose, onAdvanced,
}: {
  sessionId: number;
  stage: SessionStage;
  defaultGroupCount: number;
  onClose: () => void;
  onAdvanced: (newStageId: number) => void;
}) {
  const advance = useAdvanceStage();
  const [mode, setMode] = useState<"RANDOMISE" | "HIERARCHICAL" | "DESTRUCTION" | "MANUAL">("RANDOMISE");
  const [name, setName] = useState("");
  const [groupCount, setGroupCount] = useState(defaultGroupCount);
  const [advanceCount, setAdvanceCount] = useState(2);

  const showGroupCount = mode === "RANDOMISE" || mode === "DESTRUCTION";
  const modeBlurb: Record<typeof mode, string> = {
    RANDOMISE: "Shuffle advancing teams across new court groups.",
    HIERARCHICAL: "Group by finishing position — all 1st places together, all 2nd places together, and so on (strong vs strong).",
    DESTRUCTION: "Balanced snake seeding — the strongest meet the weakest in each group (1 vs 4, 2 vs 3).",
    MANUAL: "Drop advancing teams into the new stage's tray to place by hand.",
  };

  const submit = () => {
    advance.mutate(
      {
        sessionId,
        stageId: stage.id,
        mode,
        name: name.trim() || undefined,
        advanceCount,
        groupCount: showGroupCount ? groupCount : undefined,
      },
      {
        onSuccess: (data: any) => {
          if (data?.stage?.id) onAdvanced(data.stage.id);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose} data-testid="advance-dialog">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ArrowRightCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Advance from {stage.name}</h3>
        </div>
        <p className="text-xs text-white/50">
          The top {stage.advanceCount} team{stage.advanceCount === 1 ? "" : "s"} from each group in
          this stage move into a brand-new stage. Adjust “Teams advancing per group” in the toolbar first.
        </p>

        <div>
          <label className="text-xs text-white/60 mb-1 block">New stage name</label>
          <Input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Semi Finals"
            className="bg-white/5 border-white/10 text-white"
            data-testid="input-new-stage-name"
          />
        </div>

        <div>
          <label className="text-xs text-white/60 mb-2 block">How to place advancing teams</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("RANDOMISE")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                mode === "RANDOMISE" ? "bg-cyan-500/20 border-cyan-400 text-white" : "bg-white/5 border-white/10 text-white/70"
              }`}
              data-testid="button-mode-randomise"
            >
              <Shuffle className="w-4 h-4" /> Randomise
            </button>
            <button
              onClick={() => setMode("HIERARCHICAL")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                mode === "HIERARCHICAL" ? "bg-cyan-500/20 border-cyan-400 text-white" : "bg-white/5 border-white/10 text-white/70"
              }`}
              data-testid="button-mode-hierarchical"
            >
              <Layers className="w-4 h-4" /> Hierarchical
            </button>
            <button
              onClick={() => setMode("DESTRUCTION")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                mode === "DESTRUCTION" ? "bg-cyan-500/20 border-cyan-400 text-white" : "bg-white/5 border-white/10 text-white/70"
              }`}
              data-testid="button-mode-destruction"
            >
              <Zap className="w-4 h-4" /> Destruction
            </button>
            <button
              onClick={() => setMode("MANUAL")}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                mode === "MANUAL" ? "bg-cyan-500/20 border-cyan-400 text-white" : "bg-white/5 border-white/10 text-white/70"
              }`}
              data-testid="button-mode-manual"
            >
              <Hand className="w-4 h-4" /> Manual
            </button>
          </div>
          <p className="text-[11px] text-white/40 mt-1.5">
            {modeBlurb[mode]}
          </p>
        </div>

        {showGroupCount && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Number of groups</label>
            <Input
              type="number" min={1}
              value={groupCount} onChange={e => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
              className="h-8 w-20 bg-white/5 border-white/10 text-white"
              data-testid="input-advance-group-count"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs text-white/60">Teams advancing per group (next stage)</label>
          <Input
            type="number" min={1}
            value={advanceCount} onChange={e => setAdvanceCount(Math.max(1, Number(e.target.value) || 1))}
            className="h-8 w-20 bg-white/5 border-white/10 text-white"
            data-testid="input-next-advance-count"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-white/70" data-testid="button-cancel-advance">Cancel</Button>
          <Button
            onClick={submit}
            disabled={advance.isPending}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
            data-testid="button-confirm-advance"
          >
            {advance.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ArrowRightCircle className="w-4 h-4 mr-1.5" />}
            Advance teams
          </Button>
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  label, onDragStart, onAction, mode,
}: {
  label: string;
  onDragStart: () => void;
  onAction: () => void;
  mode: "dissolve" | "return";
}) {
  const isReturn = mode === "return";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 bg-white/10 hover:bg-white/15 rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing border border-white/10"
      data-testid="entry-card"
    >
      <GripVertical className="w-4 h-4 text-white/30 shrink-0" />
      <span className="flex-1 text-sm text-white/90 truncate">{label}</span>
      <button
        onClick={onAction}
        title={isReturn ? "Return team to “Teams to place”" : "Dissolve team (split players back to pool)"}
        aria-label={isReturn ? "Return team to Teams to place" : "Dissolve team"}
        className={`shrink-0 ${isReturn ? "text-white/30 hover:text-cyan-400" : "text-white/30 hover:text-red-400"}`}
        data-testid={isReturn ? "button-return-entry" : "button-delete-entry"}
      >
        {isReturn ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

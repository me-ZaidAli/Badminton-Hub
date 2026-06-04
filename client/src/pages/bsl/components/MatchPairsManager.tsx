import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2, UserMinus, Users, Swords } from "lucide-react";
import { GlowPanel } from "./GlowPanel";
import { ActionButton } from "./ActionButton";
import { BSL } from "./BSLPalette";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATS = ["MD", "WD", "XD"] as const;
type Cat = typeof CATS[number];
const CAT_LABEL: Record<string, string> = { MD: "Men's Doubles", WD: "Women's Doubles", XD: "Mixed Doubles" };

type FixtureRow = {
  id: number;
  side: "home" | "away";
  opponentName: string;
  division: string | null;
  category: string | null;
  date: string | null;
  venue: string | null;
  status: string;
  myPairCount: number;
};

// Shared "Match Pairs" panel used by both the club owner page and the admin
// club manager. Lets a manager pick one of their club's matches and build pairs
// just for THAT match (scoped by bslFixtureId on the create call). Those pairs
// only surface on the matching fixture's setup screen.
export function MatchPairsManager({
  clubId,
  roster,
  primaryDivision,
}: {
  clubId: number;
  roster: any[];
  primaryDivision: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fixturesKey = ["/api/bsl/clubs", clubId, "fixtures"];
  const { data: fixturesData, isLoading: fixturesLoading } = useQuery<{ fixtures: FixtureRow[] }>({
    queryKey: fixturesKey,
    queryFn: async () => (await fetch(`/api/bsl/clubs/${clubId}/fixtures`, { credentials: "include" })).json(),
    enabled: Number.isFinite(clubId),
  });
  const fixtures = fixturesData?.fixtures || [];
  const selected = fixtures.find(f => f.id === selectedId) || null;

  const pairsKey = ["/api/bsl/clubs", clubId, "fixtures", selectedId, "pairs"];
  const { data: pairsData, isLoading: pairsLoading } = useQuery<{ fixture: any; teams: any[] }>({
    queryKey: pairsKey,
    queryFn: async () => (await fetch(`/api/bsl/clubs/${clubId}/fixtures/${selectedId}/pairs`, { credentials: "include" })).json(),
    enabled: Number.isFinite(clubId) && selectedId != null,
  });
  const teams: any[] = pairsData?.teams || [];
  const fixtureDivision: string | null = pairsData?.fixture?.division ?? selected?.division ?? null;

  const inv = () => {
    qc.invalidateQueries({ queryKey: pairsKey });
    qc.invalidateQueries({ queryKey: fixturesKey });
  };
  const onErr = (title: string) => (e: any) =>
    toast({ title, description: (e?.message || "Error").replace(/^\d+:\s*/, ""), variant: "destructive" });

  const createPair = useMutation({
    mutationFn: async (cat: Cat) =>
      (await apiRequest("POST", `/api/bsl/clubs/${clubId}/teams`, { category: cat, bslFixtureId: selectedId })).json(),
    onSuccess: () => { inv(); toast({ title: "Pair added to match" }); },
    onError: onErr("Couldn't add pair"),
  });
  const deletePair = useMutation({
    mutationFn: async (teamId: number) => (await apiRequest("DELETE", `/api/bsl/teams/${teamId}/manage`)).json(),
    onSuccess: () => { inv(); toast({ title: "Pair removed" }); },
    onError: onErr("Couldn't remove pair"),
  });
  const addMember = useMutation({
    mutationFn: async (vars: { teamId: number; playerId: number }) =>
      (await apiRequest("POST", `/api/bsl/teams/${vars.teamId}/members`, { bslPlayerId: vars.playerId })).json(),
    onSuccess: () => { inv(); toast({ title: "Player added" }); },
    onError: onErr("Couldn't add player"),
  });
  const removeMember = useMutation({
    mutationFn: async (vars: { teamId: number; playerId: number }) =>
      (await apiRequest("DELETE", `/api/bsl/teams/${vars.teamId}/members/${vars.playerId}`)).json(),
    onSuccess: () => { inv(); toast({ title: "Player removed" }); },
    onError: onErr("Couldn't remove player"),
  });
  const busy = createPair.isPending || deletePair.isPending || addMember.isPending || removeMember.isPending;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "Date TBC";

  return (
    <GlowPanel
      title="Match Pairs"
      subtitle="Pick a match, then build the pairs that play in it. These show on that match's setup screen only."
      tone="cyan"
      icon={<Swords className="h-4 w-4" />}
    >
      {fixturesLoading ? (
        <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>Loading matches…</div>
      ) : fixtures.length === 0 ? (
        <div className="py-6 text-center text-sm" style={{ color: BSL.muted }} data-testid="text-no-matches">
          No matches scheduled for your club yet.
        </div>
      ) : (
        <>
          {/* Match picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {fixtures.map(f => {
              const active = f.id === selectedId;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedId(f.id)}
                  className="text-left rounded-xl p-3 transition"
                  style={{
                    background: active ? `${BSL.cyan}1f` : BSL.cardSoft,
                    border: `1px solid ${active ? BSL.cyan : BSL.border}`,
                  }}
                  data-testid={`button-pick-match-${f.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold truncate">
                      {f.side === "home" ? "vs" : "@"} {f.opponentName}
                    </div>
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${BSL.muted}22`, color: BSL.muted }}
                    >
                      {f.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: BSL.muted }}>
                    <CalendarDays className="h-3 w-3" /> {fmtDate(f.date)}
                    {f.division ? <span style={{ color: BSL.gold }}>· {f.division}</span> : null}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: f.myPairCount > 0 ? BSL.success : BSL.faint }}>
                    {f.myPairCount > 0 ? `${f.myPairCount} pair${f.myPairCount === 1 ? "" : "s"} built` : "No pairs built yet"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected match pair builder */}
          {selected == null ? (
            <div className="py-6 text-center text-sm" style={{ color: BSL.muted }} data-testid="text-pick-a-match">
              Pick a match above to set up its pairs.
            </div>
          ) : pairsLoading ? (
            <div className="py-6 text-center text-sm" style={{ color: BSL.muted }}>Loading pairs…</div>
          ) : (
            <div>
              <div className="mb-3 text-xs" style={{ color: BSL.muted }}>
                Building pairs for <span className="font-bold" style={{ color: BSL.cyan }}>{selected.side === "home" ? "vs" : "@"} {selected.opponentName}</span>
                {fixtureDivision ? <> · <span style={{ color: BSL.gold }}>{fixtureDivision}</span></> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {CATS.map(cat => (
                  <MatchCategoryColumn
                    key={cat}
                    cat={cat}
                    division={fixtureDivision || primaryDivision}
                    primaryDivision={primaryDivision}
                    teams={teams.filter(t => t.category === cat)}
                    roster={roster}
                    busy={busy}
                    onCreatePair={() => createPair.mutate(cat)}
                    onDeletePair={(teamId: number) => { if (window.confirm("Remove this pair from the match?")) deletePair.mutate(teamId); }}
                    onAddMember={(teamId: number, playerId: number) => addMember.mutate({ teamId, playerId })}
                    onRemoveMember={(teamId: number, playerId: number) => removeMember.mutate({ teamId, playerId })}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </GlowPanel>
  );
}

function MatchCategoryColumn({
  cat, division, primaryDivision, teams, roster, busy, onCreatePair, onDeletePair, onAddMember, onRemoveMember,
}: {
  cat: Cat;
  division: string;
  primaryDivision: string;
  teams: any[];
  roster: any[];
  busy: boolean;
  onCreatePair: () => void;
  onDeletePair: (teamId: number) => void;
  onAddMember: (teamId: number, playerId: number) => void;
  onRemoveMember: (teamId: number, playerId: number) => void;
}) {
  // Players already in a pair for this match+category — dedupe the dropdown.
  const placed = useMemo(() => {
    const s = new Set<number>();
    for (const t of teams) for (const id of (t.members || [])) s.add(id);
    return s;
  }, [teams]);
  // Eligible = registered for this category AND in this match's division
  // (players with no division fall back to the club's primary division).
  const eligible = roster.filter((p: any) => {
    if (!(p.categories || []).includes(cat)) return false;
    const playerDiv = p.division || primaryDivision;
    return playerDiv === division;
  });
  const nameOf = (p: any) => p?.displayName || p?.user?.name || `Player #${p?.id}`;

  return (
    <div className="rounded-xl p-3" style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}` }} data-testid={`match-column-${cat}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-black uppercase tracking-widest" style={{ color: BSL.cyan }}>{cat}</div>
          <div className="text-[10px]" style={{ color: BSL.muted }}>{CAT_LABEL[cat]}</div>
        </div>
        <ActionButton variant="cyan" onClick={onCreatePair} disabled={busy} icon={<Plus className="h-3 w-3" />} data-testid={`button-add-match-pair-${cat}`}>Pair</ActionButton>
      </div>
      {teams.length === 0 ? (
        <div className="py-4 text-center text-xs" style={{ color: BSL.faint }}>No pairs yet.</div>
      ) : (
        <div className="space-y-3">
          {teams.map((t: any) => {
            const members = (t.members || []).map((id: number) => roster.find((p: any) => p.id === id)).filter(Boolean);
            const options = eligible.filter((p: any) => !placed.has(p.id) && !members.some((m: any) => m.id === p.id));
            return (
              <div key={t.id} className="rounded-lg p-2" style={{ background: BSL.bg, border: `1px solid ${BSL.border}` }} data-testid={`match-pair-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold">{t.name}</div>
                  <button
                    onClick={() => onDeletePair(t.id)}
                    disabled={busy}
                    className="p-1 rounded disabled:opacity-50"
                    style={{ color: BSL.danger }}
                    title="Remove pair"
                    data-testid={`button-delete-match-pair-${t.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-1">
                  {members.length === 0 ? (
                    <div className="text-[10px]" style={{ color: BSL.faint }}>No players yet.</div>
                  ) : members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between text-xs rounded px-2 py-1" style={{ background: BSL.cardSoft }} data-testid={`match-pair-member-${t.id}-${m.id}`}>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" style={{ color: BSL.cyan }} /> {nameOf(m)}</span>
                      <button onClick={() => onRemoveMember(t.id, m.id)} disabled={busy} className="disabled:opacity-50" style={{ color: BSL.muted }} title="Remove player" data-testid={`button-remove-match-member-${t.id}-${m.id}`}>
                        <UserMinus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {members.length < 2 && (
                  <select
                    value=""
                    onChange={e => { const pid = Number(e.target.value); if (pid) onAddMember(t.id, pid); }}
                    disabled={busy || options.length === 0}
                    className="w-full mt-2 px-2 py-1.5 rounded-lg text-xs disabled:opacity-50"
                    style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                    data-testid={`select-add-match-member-${t.id}`}
                  >
                    <option value="" style={{ background: BSL.card }}>{options.length === 0 ? "No eligible players" : "Add player…"}</option>
                    {options.map((p: any) => (
                      <option key={p.id} value={p.id} style={{ background: BSL.card, color: "white" }}>{nameOf(p)}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

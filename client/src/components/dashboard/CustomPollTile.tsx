import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Vote, Loader2, Check, ChevronLeft, ChevronRight, Sparkles, Users } from "lucide-react";

type ActivePoll = {
  id: number;
  title: string;
  question: string;
  options: string[];
  allowMultiple: boolean;
  audience: "ALL" | "SELECTED";
  expiresAt: string | null;
  myVote: number[] | null;
  counts: number[];
  total: number;
};

export function CustomPollTile() {
  const { data: polls = [], isLoading } = useQuery<ActivePoll[]>({
    queryKey: ["/api/custom-polls/active"],
    refetchInterval: 60_000,
  });

  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState<number[]>([]);

  const poll = polls[idx % Math.max(1, polls.length)] || null;

  const respond = useMutation({
    mutationFn: async ({ pollId, optionIndices }: { pollId: number; optionIndices: number[] }) =>
      apiRequest("POST", `/api/custom-polls/${pollId}/respond`, { optionIndices }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-polls/active"] });
      setDraft([]);
    },
  });

  const isMulti = poll?.allowMultiple ?? false;
  const hasVoted = (poll?.myVote?.length ?? 0) > 0;
  const isExpired = !!(poll?.expiresAt && new Date(poll.expiresAt) < new Date());
  const locked = isExpired;

  const toggle = (i: number) => {
    if (!poll || locked) return;
    if (isMulti) setDraft(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i]);
    else respond.mutate({ pollId: poll.id, optionIndices: [i] });
  };

  const submitMulti = () => {
    if (!poll || draft.length === 0) return;
    respond.mutate({ pollId: poll.id, optionIndices: draft });
  };

  const maxVotes = useMemo(() => poll ? Math.max(1, ...poll.counts) : 1, [poll]);

  // Hide entirely when there's nothing to show — keep all hooks above this line
  if (polls.length === 0) return null;

  return (
    <div
      className="relative col-span-1 md:col-span-2 lg:col-span-3 overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-600/25 via-violet-700/30 to-indigo-900/40 p-5 shadow-2xl"
      data-testid="hero-custom-poll"
    >
      {/* Glow halos */}
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-fuchsia-500/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-12 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,114,182,0.15),transparent_55%)] pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/40">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-200/90 font-bold">Club poll</span>
                {poll?.audience === "ALL" && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/30 text-amber-200">All clubs</span>
                )}
                {isExpired && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 border border-red-400/30 text-red-200">Closed</span>
                )}
              </div>
              {poll && <h3 className="text-sm font-extrabold text-white truncate" data-testid="text-poll-title">{poll.title}</h3>}
            </div>
          </div>
          {polls.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setIdx(i => (i - 1 + polls.length) % polls.length); setDraft([]); }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition"
                data-testid="button-poll-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-white/65 tabular-nums font-bold px-1">{idx + 1}/{polls.length}</span>
              <button
                onClick={() => { setIdx(i => (i + 1) % polls.length); setDraft([]); }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition"
                data-testid="button-poll-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="mt-6 flex items-center gap-2 text-white/55">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading polls…</span>
          </div>
        ) : !poll ? (
          <div className="mt-6 flex flex-col items-center justify-center text-center py-4">
            <Sparkles className="w-8 h-8 text-fuchsia-300/60 mb-2" />
            <p className="text-sm text-white/80 font-semibold">No active polls right now</p>
            <p className="text-[11px] text-white/55 mt-0.5">Your club can post polls here.</p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-base font-semibold text-white leading-snug" data-testid="text-poll-question">{poll.question}</p>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {poll.options.map((opt, i) => {
                const count = poll.counts[i] || 0;
                const pct = poll.total > 0 ? Math.round((count / poll.total) * 100) : 0;
                const widthPct = (count / maxVotes) * 100;
                const mine = poll.myVote?.includes(i) ?? false;
                const drafted = draft.includes(i);
                const showResults = hasVoted;
                return (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    disabled={respond.isPending}
                    className={`group relative w-full text-left rounded-xl border overflow-hidden transition px-3.5 py-2.5 ${
                      mine
                        ? "border-fuchsia-300/70 bg-fuchsia-500/15 ring-1 ring-fuchsia-300/40"
                        : drafted
                        ? "border-violet-300/60 bg-violet-500/15"
                        : "border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/25"
                    } ${respond.isPending ? "opacity-60 cursor-wait" : ""}`}
                    data-testid={`button-custom-poll-option-${i}`}
                  >
                    {showResults && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-700 ${mine ? "bg-gradient-to-r from-fuchsia-400/40 to-fuchsia-500/10" : "bg-white/10"}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {mine && <Check className="w-3.5 h-3.5 text-fuchsia-200 shrink-0" />}
                        {drafted && !mine && <div className="w-3.5 h-3.5 rounded border-2 border-violet-200 bg-violet-300 shrink-0" />}
                        <span className={`text-sm font-semibold truncate ${mine ? "text-white" : "text-white/90"}`}>{opt}</span>
                      </div>
                      {showResults && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-white/55 tabular-nums">{count}</span>
                          <span className="text-xs font-bold text-white tabular-nums">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-white/65">
                <Users className="w-3.5 h-3.5" />
                <span className="tabular-nums" data-testid="text-poll-total">{poll.total}</span>
                <span>{poll.total === 1 ? "response" : "responses"}</span>
                {isMulti && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white/10 text-[9px] uppercase tracking-wider">multi-select</span>}
                {hasVoted && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-400/20 border border-emerald-300/30 text-[9px] uppercase tracking-wider text-emerald-200">You voted</span>}
              </div>
              {isMulti && !hasVoted && (
                <button
                  onClick={submitMulti}
                  disabled={draft.length === 0 || respond.isPending}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white shadow-lg shadow-fuchsia-500/30 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  data-testid="button-submit-poll"
                >
                  {respond.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Submit {draft.length > 0 && `(${draft.length})`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

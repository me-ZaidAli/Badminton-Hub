import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useAllCourtsView } from "@/hooks/use-tournaments";
import { useTournament } from "@/hooks/use-tournaments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Timer, ChevronLeft, Maximize, Monitor, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CourtCard({ courtData }: { courtData: any }) {
  const { court, liveMatch, nextMatch, allMatches } = courtData;
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!liveMatch) { setTimer(0); return; }
    setTimer(0);
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [liveMatch?.id]);

  const finishedCount = (allMatches || []).filter((m: any) => m.status === "FINISHED").length;
  const totalCount = (allMatches || []).length;

  return (
    <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm overflow-hidden flex flex-col" data-testid={`court-card-${court.id}`}>
      <div className="px-4 py-3 border-b border-gray-700/40 flex items-center justify-between bg-gray-800/40">
        <h3 className="text-lg font-black text-amber-400 tracking-tight">{court.name}</h3>
        <div className="flex items-center gap-2">
          {liveMatch && (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse">
              <CircleDot className="h-2.5 w-2.5 mr-1" />LIVE
            </Badge>
          )}
          {totalCount > 0 && (
            <span className="text-[10px] text-gray-500 font-bold">{finishedCount}/{totalCount} done</span>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {liveMatch ? (
          <div className="rounded-xl bg-gradient-to-r from-red-950/30 via-gray-800/40 to-red-950/30 border border-red-500/20 p-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-bold text-[10px] uppercase tracking-widest">NOW PLAYING</span>
              <Badge variant="outline" className="ml-2 border-gray-600 text-gray-400 text-[10px]">
                {liveMatch.categoryName}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center min-w-0">
                <p className="text-sm md:text-base font-black text-white truncate" data-testid={`court-${court.id}-team-a`}>
                  {liveMatch.teamAPlayers?.join(" & ") || "Team A"}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 px-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-2xl md:text-3xl font-black">
                  {(liveMatch.scores && liveMatch.scores.length > 0) ? (
                    liveMatch.scores.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-gray-600 text-sm mx-0.5">/</span>}
                        <span className={cn(s.scoreA > s.scoreB ? "text-green-400" : "text-white")}>{s.scoreA}</span>
                        <span className="text-gray-600 text-lg">-</span>
                        <span className={cn(s.scoreB > s.scoreA ? "text-green-400" : "text-white")}>{s.scoreB}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <span className="text-white">0</span>
                      <span className="text-gray-600 text-lg">-</span>
                      <span className="text-white">0</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Timer className="h-3 w-3" />
                  <span className="font-mono text-xs">{formatTime(timer)}</span>
                </div>
              </div>
              <div className="flex-1 text-center min-w-0">
                <p className="text-sm md:text-base font-black text-white truncate" data-testid={`court-${court.id}-team-b`}>
                  {liveMatch.teamBPlayers?.join(" & ") || "Team B"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-800/30 border border-gray-700/30 p-6 text-center">
            <Monitor className="h-8 w-8 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-500 text-sm font-medium">No match in progress</p>
          </div>
        )}

        {nextMatch && !liveMatch && (
          <div className="rounded-xl bg-gray-800/20 border border-gray-700/20 p-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 text-center">Up Next</p>
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-gray-300 font-bold truncate">
                {nextMatch.teamAPlayers?.join(" & ") || "TBD"}
              </span>
              <span className="text-gray-600 font-bold text-xs">vs</span>
              <span className="text-gray-300 font-bold truncate">
                {nextMatch.teamBPlayers?.join(" & ") || "TBD"}
              </span>
            </div>
          </div>
        )}

        {allMatches && allMatches.length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1">Match Schedule</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {allMatches.map((m: any) => (
                <div key={m.id} className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs",
                  m.status === "LIVE" ? "bg-red-950/20 border border-red-500/20" :
                  m.status === "FINISHED" ? "bg-gray-800/20 opacity-50" :
                  "bg-gray-800/10"
                )}>
                  <Badge variant="outline" className={cn(
                    "text-[8px] px-1 py-0 border font-bold flex-shrink-0",
                    m.status === "LIVE" ? "border-red-500/40 text-red-400" :
                    m.status === "FINISHED" ? "border-green-600/40 text-green-500" :
                    "border-gray-600/40 text-gray-500"
                  )}>
                    {m.status === "LIVE" ? "LIVE" : m.status === "FINISHED" ? "DONE" : "TBD"}
                  </Badge>
                  <span className="text-gray-300 font-medium truncate flex-1">
                    {m.teamAPlayers?.join(" & ") || "TBD"}
                  </span>
                  <span className="text-gray-600 text-[10px]">vs</span>
                  <span className="text-gray-300 font-medium truncate flex-1 text-right">
                    {m.teamBPlayers?.join(" & ") || "TBD"}
                  </span>
                  {m.scores && m.scores.length > 0 && (
                    <span className="text-gray-400 font-mono text-[10px] flex-shrink-0">
                      {m.scores.map((s: any) => `${s.scoreA}-${s.scoreB}`).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TournamentCourtView() {
  const [, params] = useRoute("/tournaments/:id/court-view");
  const tournamentId = Number(params?.id);
  const { data: tournament } = useTournament(tournamentId);
  const { data: courtsData, isLoading } = useAllCourtsView(tournamentId);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
      </div>
    );
  }

  const courts = courtsData || [];
  const liveCount = courts.filter(c => c.liveMatch).length;
  const gridCols = courts.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
                   courts.length <= 4 ? "grid-cols-1 md:grid-cols-2" :
                   "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white", isFullscreen && "fixed inset-0 z-50")}>
      <div className="p-4 md:p-6 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a href={`/tournaments/${tournamentId}`} className="text-gray-400 hover:text-white transition-colors" data-testid="link-back-tournament">
              <ChevronLeft className="h-6 w-6" />
            </a>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight" data-testid="text-tournament-name">{tournament.name}</h1>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Live Court View
                {liveCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse ml-1">
                    {liveCount} live
                  </Badge>
                )}
              </p>
            </div>
          </div>

          <Button variant="outline" size="icon" onClick={toggleFullscreen} className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700" data-testid="button-fullscreen">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          </div>
        )}

        {!isLoading && courts.length === 0 && (
          <div className="text-center py-24 text-gray-400">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">No courts configured for this tournament.</p>
            <p className="text-sm mt-2">Add courts from the Courts tab to use Court View.</p>
          </div>
        )}

        {!isLoading && courts.length > 0 && (
          <div className={cn("grid gap-4", gridCols)}>
            {courts.map((courtData: any) => (
              <CourtCard key={courtData.court.id} courtData={courtData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

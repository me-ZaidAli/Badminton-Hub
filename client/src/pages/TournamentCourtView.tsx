import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useCourtView, useTournamentCourts } from "@/hooks/use-tournaments";
import { useTournament } from "@/hooks/use-tournaments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, Timer, ChevronLeft, Maximize, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TournamentCourtView() {
  const [, params] = useRoute("/tournaments/:id/court-view");
  const tournamentId = Number(params?.id);
  const { data: tournament } = useTournament(tournamentId);
  const { data: courts } = useTournamentCourts(tournamentId);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const activeCourts = courts?.filter(c => c.isActive) || [];

  useEffect(() => {
    if (activeCourts.length > 0 && !selectedCourtId) {
      setSelectedCourtId(activeCourts[0].id);
    }
  }, [activeCourts, selectedCourtId]);

  const { data: courtViewData, isLoading } = useCourtView(
    tournamentId,
    selectedCourtId || 0
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (courtViewData?.liveMatch) {
      if (!timerRunning) {
        setTimerRunning(true);
      }
    } else {
      setTimerRunning(false);
      setTimer(0);
    }
  }, [courtViewData?.liveMatch?.id]);

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

  const liveMatch = courtViewData?.liveMatch;
  const nextMatch = courtViewData?.nextMatch;
  const standings = courtViewData?.standings || {};
  const court = courtViewData?.court;

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white", isFullscreen && "fixed inset-0 z-50")}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a href={`/tournaments/${tournamentId}`} className="text-gray-400 hover:text-white transition-colors" data-testid="link-back-tournament">
              <ChevronLeft className="h-6 w-6" />
            </a>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight" data-testid="text-tournament-name">{tournament.name}</h1>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Live Court View
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeCourts.length > 0 && (
              <Select value={selectedCourtId?.toString() || ""} onValueChange={(v) => setSelectedCourtId(Number(v))}>
                <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-white" data-testid="select-court">
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {activeCourts.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} data-testid={`court-option-${c.id}`}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="icon" onClick={toggleFullscreen} className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700" data-testid="button-fullscreen">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          </div>
        )}

        {!isLoading && !selectedCourtId && (
          <div className="text-center py-24 text-gray-400">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">No courts configured for this tournament.</p>
            <p className="text-sm mt-2">Add courts from the Admin tab to use Court View.</p>
          </div>
        )}

        {!isLoading && selectedCourtId && court && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-black text-amber-400 tracking-tight" data-testid="text-court-name">
                {court.name}
              </h2>
            </div>

            {liveMatch ? (
              <Card className="bg-gradient-to-r from-red-950/40 via-gray-900 to-red-950/40 border-red-500/30 overflow-hidden">
                <CardContent className="p-6 md:p-10">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 font-bold text-sm uppercase tracking-widest">LIVE</span>
                    <Badge variant="outline" className="ml-4 border-gray-600 text-gray-300">
                      {liveMatch.categoryName}
                    </Badge>
                    {liveMatch.groupNumber && (
                      <Badge variant="outline" className="border-gray-600 text-gray-300">
                        Group {liveMatch.groupNumber}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-4 md:gap-10">
                    <div className="flex-1 text-right">
                      <h3 className="text-2xl md:text-4xl font-black text-white" data-testid="text-team-a-name">
                        {liveMatch.teamAName || liveMatch.teamAPlayers?.join(" & ") || "Team A"}
                      </h3>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3 text-4xl md:text-6xl font-black">
                        {(liveMatch.scores && liveMatch.scores.length > 0) ? (
                          liveMatch.scores.map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-gray-600 text-2xl mx-1">/</span>}
                              <span className={cn(s.scoreA > s.scoreB ? "text-green-400" : "text-white")}>{s.scoreA}</span>
                              <span className="text-gray-600">-</span>
                              <span className={cn(s.scoreB > s.scoreA ? "text-green-400" : "text-white")}>{s.scoreB}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <span className="text-white">0</span>
                            <span className="text-gray-600">-</span>
                            <span className="text-white">0</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Timer className="h-4 w-4" />
                        <span className="font-mono text-lg">{formatTime(timer)}</span>
                      </div>
                    </div>

                    <div className="flex-1 text-left">
                      <h3 className="text-2xl md:text-4xl font-black text-white" data-testid="text-team-b-name">
                        {liveMatch.teamBName || liveMatch.teamBPlayers?.join(" & ") || "Team B"}
                      </h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900/50 border-gray-700/50">
                <CardContent className="p-10 text-center">
                  <p className="text-gray-500 text-lg">No match currently live on this court</p>
                </CardContent>
              </Card>
            )}

            {nextMatch && (
              <Card className="bg-gray-900/30 border-gray-700/30">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">UP NEXT</span>
                    <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
                      {nextMatch.categoryName}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-6 text-lg md:text-xl">
                    <span className="text-gray-300 font-bold" data-testid="text-next-team-a">
                      {nextMatch.teamAName || nextMatch.teamAPlayers?.join(" & ") || "TBD"}
                    </span>
                    <span className="text-gray-600 font-bold">vs</span>
                    <span className="text-gray-300 font-bold" data-testid="text-next-team-b">
                      {nextMatch.teamBName || nextMatch.teamBPlayers?.join(" & ") || "TBD"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {Object.keys(standings).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(standings).map(([groupNum, groupStandings]: [string, any[]]) => (
                  <Card key={groupNum} className="bg-gray-900/30 border-gray-700/30">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Trophy className="h-4 w-4" /> Group {groupNum} Standings
                      </h4>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase">
                            <th className="text-left py-1 px-2">#</th>
                            <th className="text-left py-1 px-2">Team</th>
                            <th className="text-center py-1 px-2">P</th>
                            <th className="text-center py-1 px-2">W</th>
                            <th className="text-center py-1 px-2">L</th>
                            <th className="text-center py-1 px-2">PD</th>
                            <th className="text-center py-1 px-2">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupStandings.map((s: any, idx: number) => (
                            <tr key={s.id} className={cn("border-t border-gray-800", idx < 2 && "bg-green-950/20")}>
                              <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                              <td className="py-2 px-2 font-bold text-white">{s.playerNames?.join(" & ") || `Team ${s.teamId}`}</td>
                              <td className="py-2 px-2 text-center text-gray-300">{s.matchesPlayed}</td>
                              <td className="py-2 px-2 text-center text-green-400">{s.matchesWon}</td>
                              <td className="py-2 px-2 text-center text-red-400">{s.matchesLost}</td>
                              <td className="py-2 px-2 text-center text-gray-300">{s.pointsFor - s.pointsAgainst}</td>
                              <td className="py-2 px-2 text-center font-bold text-amber-400">{s.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {courtViewData?.allMatches && courtViewData.allMatches.length > 0 && (
              <Card className="bg-gray-900/30 border-gray-700/30">
                <CardContent className="p-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">All Matches on {court.name}</h4>
                  <div className="space-y-2">
                    {courtViewData.allMatches.map((m: any) => (
                      <div key={m.id} className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        m.status === "LIVE" ? "bg-red-950/20 border-red-500/30" :
                        m.status === "FINISHED" ? "bg-gray-800/30 border-gray-700/30 opacity-70" :
                        "bg-gray-800/20 border-gray-700/20"
                      )}>
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            m.status === "LIVE" ? "border-red-500 text-red-400" :
                            m.status === "FINISHED" ? "border-green-600 text-green-400" :
                            "border-gray-600 text-gray-400"
                          )}>
                            {m.status}
                          </Badge>
                          <span className="text-white font-bold">
                            {m.teamAName || m.teamAPlayers?.join(" & ") || "TBD"}
                          </span>
                          <span className="text-gray-600">vs</span>
                          <span className="text-white font-bold">
                            {m.teamBName || m.teamBPlayers?.join(" & ") || "TBD"}
                          </span>
                        </div>
                        {m.scores && m.scores.length > 0 && (
                          <span className="text-gray-300 font-mono text-sm">
                            {m.scores.map((s: any) => `${s.scoreA}-${s.scoreB}`).join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
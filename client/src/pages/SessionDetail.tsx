import { useState } from "react";
import { useParams } from "wouter";
import { useSession, useSessionSignups, useJoinSession, useWithdrawSession, useAdminAddPlayer, useAdminRemovePlayer } from "@/hooks/use-sessions";
import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSessionMatches, useGenerateMatches } from "@/hooks/use-matches";
import { format } from "date-fns";
import { Loader2, Users, Trophy, UserPlus, X } from "lucide-react";

export default function SessionDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: user } = useUser();
  const { data: session, isLoading: isLoadingSession } = useSession(id);
  const { data: signups, isLoading: isLoadingSignups } = useSessionSignups(id);
  const { data: allPlayers } = usePlayers();
  const { mutate: join, isPending: isJoining } = useJoinSession();
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdrawSession();
  const { mutate: adminAddPlayer, isPending: isAdding } = useAdminAddPlayer();
  const { mutate: adminRemovePlayer } = useAdminRemovePlayer();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const isSignedUp = signups?.some(s => s.playerId === user?.playerProfile?.id);
  const isOrganiser = ["OWNER", "ADMIN", "ORGANISER"].includes(user?.role || "");
  
  const signedUpPlayerIds = new Set(signups?.map(s => s.playerId) || []);
  // allPlayers returns users with playerProfile, filter those with profiles
  const availablePlayers = allPlayers
    ?.filter(u => u.playerProfile && !signedUpPlayerIds.has(u.playerProfile.id))
    .map(u => ({ 
      id: u.playerProfile!.id, 
      fullName: u.fullName, 
      gender: u.playerProfile!.gender, 
      category: u.playerProfile!.category 
    })) || [];

  const handleAddPlayer = () => {
    if (selectedPlayerId) {
      adminAddPlayer({ sessionId: id, playerId: Number(selectedPlayerId) }, {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedPlayerId("");
        }
      });
    }
  };

  if (isLoadingSession || isLoadingSignups) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline">{session.matchMode}</Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{session.status}</Badge>
          </div>
          <h1 className="text-4xl font-display font-bold mb-2">{session.title}</h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(session.date), "EEEE, MMMM do")} • {session.startTime}
          </p>
        </div>

        <Card className="min-w-[300px] border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex justify-between mb-4">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-bold">{signups?.length} / {session.maxPlayers}</span>
            </div>
            {isSignedUp ? (
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => withdraw(id)}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </Button>
            ) : (
              <Button 
                className="w-full shadow-lg shadow-primary/25" 
                onClick={() => join(id)}
                disabled={isJoining || (signups?.length || 0) >= session.maxPlayers}
              >
                {isJoining ? "Joining..." : "Join Session"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="signups" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-muted/50 p-1">
          <TabsTrigger value="signups" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" /> Players ({signups?.length})
          </TabsTrigger>
          <TabsTrigger value="matches" className="px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Trophy className="w-4 h-4 mr-2" /> Courts & Matches
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="signups" className="mt-6">
          {isOrganiser && (
            <div className="mb-4 flex justify-end">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-player">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Player to Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                      <SelectTrigger data-testid="select-player">
                        <SelectValue placeholder="Select a player..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlayers.map(player => (
                          <SelectItem key={player.id} value={String(player.id)}>
                            {player.fullName} ({player.gender || "?"} - {player.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      className="w-full" 
                      onClick={handleAddPlayer} 
                      disabled={!selectedPlayerId || isAdding}
                      data-testid="button-confirm-add-player"
                    >
                      {isAdding ? "Adding..." : "Add to Session"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signups?.map((signup) => (
              <div key={signup.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm" data-testid={`signup-${signup.id}`}>
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${signup.player.user.fullName}`} />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{signup.player.user.fullName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs h-5">{signup.player.gender || "?"}</Badge>
                      <Badge variant="outline" className="text-xs h-5">Rank {signup.player.rankingPoints}</Badge>
                      <span className="text-xs text-muted-foreground">Level {signup.player.category}</span>
                    </div>
                  </div>
                </div>
                {isOrganiser && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => adminRemovePlayer({ sessionId: id, playerId: signup.playerId })}
                    data-testid={`button-remove-player-${signup.playerId}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <MatchesView sessionId={id} isOrganiser={isOrganiser} matchMode={session.matchMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchesView({ sessionId, isOrganiser, matchMode }: { sessionId: number, isOrganiser: boolean, matchMode: "COMPETITIVE" | "SOCIAL" }) {
  const { data: matches, isLoading } = useSessionMatches(sessionId);
  const { mutate: generate, isPending: isGenerating } = useGenerateMatches();

  if (isLoading) return <div className="p-8 text-center">Loading matches...</div>;

  return (
    <div>
      {isOrganiser && (
        <div className="mb-6 flex justify-end">
          <Button 
            onClick={() => generate({ sessionId, mode: matchMode })} 
            disabled={isGenerating}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isGenerating ? "Generating..." : "Generate Next Round"}
          </Button>
        </div>
      )}

      {!matches || matches.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-xl">
          <p className="text-muted-foreground">No matches generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden border-border/60">
              <div className="bg-muted/40 p-2 text-center text-sm font-medium border-b border-border/60">
                Court {match.courtNumber}
              </div>
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Team A */}
                  <div className="flex-1 p-4 border-r border-border/40">
                    <div className="space-y-2 mb-4">
                      <div className="font-semibold text-sm">{match.teamAPlayer1.user.fullName}</div>
                      {match.teamAPlayer2 && <div className="font-semibold text-sm">{match.teamAPlayer2.user.fullName}</div>}
                    </div>
                    <div className="text-3xl font-bold font-display text-center text-primary">{match.scoreA || 0}</div>
                  </div>

                  {/* VS */}
                  <div className="flex items-center justify-center px-2 bg-muted/10 text-xs font-bold text-muted-foreground">VS</div>

                  {/* Team B */}
                  <div className="flex-1 p-4">
                    <div className="space-y-2 mb-4 text-right">
                      <div className="font-semibold text-sm">{match.teamBPlayer1.user.fullName}</div>
                      {match.teamBPlayer2 && <div className="font-semibold text-sm">{match.teamBPlayer2.user.fullName}</div>}
                    </div>
                    <div className="text-3xl font-bold font-display text-center text-secondary">{match.scoreB || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

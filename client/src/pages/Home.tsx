import { Link } from "wouter";
import logoPath from "@assets/image_1770381062912.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Trophy, Users, Calendar, Clock, MapPin } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useClubs, useLeaderboard } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  
  // Set default club when clubs load (in useEffect to avoid render-time state update)
  useEffect(() => {
    if (clubs?.length && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [clubs, selectedClubId]);
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(selectedClubId);
  const topPlayers = leaderboard?.slice(0, 10) || [];

  // Fetch public sessions for selected club
  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/public/clubs", selectedClubId, "sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/public/clubs/${selectedClubId}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
    enabled: selectedClubId !== null,
  });

  // Filter to upcoming sessions
  const upcomingSessions = sessions?.filter(s => s.status === "UPCOMING").slice(0, 5) || [];

  if (user) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="Club Master" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">Club Master</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="font-bold shadow-lg shadow-primary/20">Join Club</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 lg:py-32 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Elevate Your <span className="text-gradient">Badminton</span> Game
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              The professional platform for club management, session scheduling, and competitive ranking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/rankings">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="py-24 bg-muted/30" data-testid="section-leaderboard">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Club Leaderboard</h2>
              <p className="text-muted-foreground text-lg">See how players are ranked across our clubs</p>
            </div>
            
            <Card className="overflow-hidden border-border/50" data-testid="card-public-leaderboard">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Top Players
                  </CardTitle>
                  {clubs && clubs.length > 1 && (
                    <Select 
                      value={selectedClubId?.toString() || ""} 
                      onValueChange={(v) => setSelectedClubId(Number(v))}
                    >
                      <SelectTrigger className="w-48" data-testid="select-club">
                        <SelectValue placeholder="Select Club" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map(club => (
                          <SelectItem key={club.id} value={club.id.toString()}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <CardDescription>Ranked by Elo points</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-green-600 p-6 min-h-[400px]">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[2px] h-full bg-white/30" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30 pointer-events-none" />
                  <div className="absolute top-2 bottom-2 left-2 right-2 border-2 border-white/40 pointer-events-none" />
                  <div className="absolute top-2 bottom-2 left-2 right-[calc(50%-1px)] border-r-0 border-2 border-white/20 pointer-events-none" />
                  <div className="absolute top-2 bottom-2 right-2 left-[calc(50%+1px)] border-l-0 border-2 border-white/20 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center gap-2 py-4">
                    {leaderboardLoading ? (
                      <div className="text-white/80 text-sm py-8">Loading leaderboard...</div>
                    ) : topPlayers.length > 0 ? (
                      topPlayers.map((player, index) => (
                        <div 
                          key={player.id} 
                          className="flex items-center gap-3 bg-background/95 rounded-lg px-4 py-2 shadow-lg w-full max-w-md"
                          data-testid={`public-leaderboard-player-${player.id}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? "bg-amber-500 text-white" : 
                            index === 1 ? "bg-gray-400 text-white" : 
                            index === 2 ? "bg-amber-700 text-white" : 
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{player.fullName}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs py-0">{player.category || "?"}</Badge>
                              <span>{player.matchesWon}W / {player.matchesPlayed}P</span>
                            </div>
                          </div>
                          <div className="text-right font-bold text-primary">{player.rankingPoints}</div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-background/90 rounded-lg px-6 py-8 text-center">
                        <p className="text-muted-foreground">No players ranked yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center mt-8">
              <Link href="/rankings">
                <Button variant="outline" size="lg" className="rounded-full">
                  View Full Rankings <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Sessions Section */}
        <section className="py-24" data-testid="section-public-sessions">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Upcoming Sessions</h2>
              <p className="text-muted-foreground text-lg">View and join badminton sessions at our clubs</p>
            </div>
            
            <Card className="overflow-hidden border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Sessions
                  </CardTitle>
                  {clubs && clubs.length > 1 && (
                    <Select 
                      value={selectedClubId?.toString() || ""} 
                      onValueChange={(v) => setSelectedClubId(Number(v))}
                    >
                      <SelectTrigger className="w-48" data-testid="select-club-sessions">
                        <SelectValue placeholder="Select Club" />
                      </SelectTrigger>
                      <SelectContent>
                        {clubs.map(club => (
                          <SelectItem key={club.id} value={club.id.toString()}>
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <CardDescription>Click on a session to see more details</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="text-muted-foreground text-sm py-8 text-center">Loading sessions...</div>
                ) : upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <Link key={session.id} href={`/public/session/${session.id}`}>
                        <div 
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                          data-testid={`public-session-${session.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{session.title}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(session.date), "EEE, MMM d")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {session.startTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {session.courtsAvailable} courts
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{session.matchMode}</Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming sessions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Calendar}
                title="Smart Scheduling" 
                description="Book sessions, manage attendance, and automate waitlists effortlessly."
              />
              <FeatureCard 
                icon={Trophy}
                title="Live Rankings" 
                description="Track your performance with Elo-style ratings and detailed match statistics."
              />
              <FeatureCard 
                icon={Users}
                title="Club Community" 
                description="Connect with players, find partners, and manage membership tiers."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border text-center text-muted-foreground">
        <p>© 2024 Club Master. Built for champions.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border hover-card-effect">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

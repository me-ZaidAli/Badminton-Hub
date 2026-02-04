import { useUser } from "@/hooks/use-auth";
import { useSessions } from "@/hooks/use-sessions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, Trophy, Zap, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();

  // Mock stats - in real app, fetch from stats endpoint
  const stats = [
    { label: "Matches Played", value: user?.playerProfile?.matchesPlayed || 0, icon: Zap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Matches Won", value: user?.playerProfile?.matchesWon || 0, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Rank Points", value: user?.playerProfile?.rankingPoints || 1000, icon: AlertCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const upcomingSessions = sessions?.filter(s => new Date(s.date) > new Date()).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader 
        title={`Welcome back, ${user?.fullName.split(' ')[0]}!`}
        description="Here's what's happening at the club today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">+2.5% from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming Sessions</h2>
          <Link href="/sessions">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4">
            {upcomingSessions?.map((session) => (
              <Card key={session.id} className="group hover-card-effect cursor-pointer border-border/50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl text-primary font-bold">
                      <span className="text-xs uppercase">{format(new Date(session.date), "MMM")}</span>
                      <span className="text-2xl">{format(new Date(session.date), "d")}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{session.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {session.startTime}
                        </span>
                        <span>•</span>
                        <span>{session.courtsAvailable} Courts</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/sessions/${session.id}`}>
                    <Button>Join Session</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {(!upcomingSessions || upcomingSessions.length === 0) && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

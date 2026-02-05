import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Calendar, Clock, Users, ArrowRight, Loader2, Shield } from "lucide-react";

export default function OrganizerDashboard() {
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  const { data: profiles } = useQuery<any[]>({
    queryKey: ["/api/player-profiles"],
    enabled: !!user,
  });

  const clubId = selectedClubId || profiles?.[0]?.clubId;

  const { data: sessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  const clubSessions = sessions?.filter(s => s.clubId === clubId && s.status === "UPCOMING") || [];

  if (!user) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (user.role !== "ORGANISER") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Organizer
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground">Manage sessions and matches for your club</p>
        </div>
        {profiles && profiles.length > 1 && (
          <Select 
            value={clubId?.toString() || ""} 
            onValueChange={(v) => setSelectedClubId(Number(v))}
          >
            <SelectTrigger className="w-48" data-testid="select-organizer-club">
              <SelectValue placeholder="Select Club" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map(p => (
                <SelectItem key={p.clubId} value={p.clubId.toString()}>
                  {p.club?.name || `Club ${p.clubId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>
            Click on a session to manage signups and matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : clubSessions.length > 0 ? (
            <div className="space-y-3">
              {clubSessions.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                    data-testid={`organizer-session-${session.id}`}
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
                          <Users className="w-4 h-4" />
                          {session.signupCount || 0} / {session.maxPlayers}
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
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming sessions</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover-elevate" onClick={() => clubSessions[0] && navigate(`/sessions/${clubSessions[0].id}`)}>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Manage Players</p>
                <p className="text-xs text-muted-foreground">View and manage session signups</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => clubSessions[0] && navigate(`/sessions/${clubSessions[0].id}`)}>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Run Matches</p>
                <p className="text-xs text-muted-foreground">Start and complete matches</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => clubSessions[0] && navigate(`/sessions/${clubSessions[0].id}`)}>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Track Time</p>
                <p className="text-xs text-muted-foreground">Monitor match durations</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

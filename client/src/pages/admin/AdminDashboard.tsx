import { Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { usePlayers } from "@/hooks/use-players";
import { useSessions } from "@/hooks/use-sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, Shield, ArrowRight, Activity } from "lucide-react";

export default function AdminDashboard() {
  const { data: user } = useUser();
  const { data: players } = usePlayers();
  const { data: sessions } = useSessions();

  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || isOwner;

  const totalPlayers = players?.length || 0;
  const upcomingSessions = sessions?.filter(s => new Date(s.date) >= new Date()).length || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage your club, sessions, and members.</p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Shield className="h-4 w-4 mr-2" />
          {user?.role}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPlayers}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingSessions}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {sessions?.filter(s => {
                const today = new Date().toDateString();
                return new Date(s.date).toDateString() === today;
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold capitalize">{user?.role?.toLowerCase()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 hover-elevate cursor-pointer">
          <Link href="/admin/users">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View all members, update roles, and manage player profiles.
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-border/50 hover-elevate cursor-pointer">
          <Link href="/admin/financials">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Financials
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track payments, view unpaid sessions, and manage fees.
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="border-border/50 hover-elevate cursor-pointer">
          <Link href="/sessions">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Session Management
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create and manage sessions, handle signups and attendance.
              </p>
            </CardContent>
          </Link>
        </Card>

        {isAdmin && (
          <Card className="border-border/50 hover-elevate cursor-pointer">
            <Link href="/admin/announcements">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Announcements
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Post announcements and updates to club members.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

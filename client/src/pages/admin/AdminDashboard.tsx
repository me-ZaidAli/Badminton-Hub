import { Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { usePlayers, usePendingUsers } from "@/hooks/use-players";
import { useSessions } from "@/hooks/use-sessions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, Shield, ArrowRight, Activity, UserPlus, CalendarPlus, UserCheck, Download } from "lucide-react";
import { useState } from "react";

export default function AdminDashboard() {
  const { data: user } = useUser();
  const { data: players } = usePlayers();
  const { data: sessions } = useSessions();
  const { data: pendingUsers } = usePendingUsers();
  const { toast } = useToast();
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [downloadingAttendance, setDownloadingAttendance] = useState(false);

  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || isOwner;

  const handleExport = async (type: "users" | "attendance") => {
    const setLoading = type === "users" ? setDownloadingUsers : setDownloadingAttendance;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export/${type}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `export_${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: "Could not download the export file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPlayers = players?.length || 0;
  const upcomingSessions = sessions?.filter(s => new Date(s.date) >= new Date()).length || 0;
  const pendingCount = pendingUsers?.length || 0;

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
          <Link href="/admin/players">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-purple-500" />
                  Player Management
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Add new players and edit their profiles and details.
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

        <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-calendar-import">
          <Link href="/admin/calendar">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 text-teal-500" />
                  Calendar Import
                </span>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Import sessions from Google Calendar automatically.
              </p>
            </CardContent>
          </Link>
        </Card>

        {isAdmin && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-user-approval">
            <Link href="/admin/approvals">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-cyan-500" />
                    User Approval
                    {pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-1 text-xs px-2 py-0.5" data-testid="badge-pending-count">
                        {pendingCount}
                      </Badge>
                    )}
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Review and approve new member registrations.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}
      </div>

      {isOwner && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold">Export Data</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Export All Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download a CSV file with all user details including name, email, club membership, role, category, and ranking stats.
                </p>
                <Button
                  onClick={() => handleExport("users")}
                  disabled={downloadingUsers}
                  data-testid="button-export-users"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingUsers ? "Downloading..." : "Download Users CSV"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Export Attendance History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Download a CSV file with all users and their session attendance history, including session dates, payment status, and fees.
                </p>
                <Button
                  onClick={() => handleExport("attendance")}
                  disabled={downloadingAttendance}
                  data-testid="button-export-attendance"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingAttendance ? "Downloading..." : "Download Attendance CSV"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

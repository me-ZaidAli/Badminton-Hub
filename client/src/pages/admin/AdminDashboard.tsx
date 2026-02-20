import { Link } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { usePlayers, usePendingUsers } from "@/hooks/use-players";
import { useSessions } from "@/hooks/use-sessions";
import { useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, DollarSign, Shield, ArrowRight, Activity, UserPlus, UserCheck, Download, Building2, Trophy, Upload, CreditCard, Gift, BarChart3, Bell } from "lucide-react";
import { useState } from "react";

interface ClubSummary {
  clubId: number;
  clubName: string;
  status: string;
  totalPlayers: number;
  totalSessions: number;
  totalMatches: number;
  totalRevenue: number;
}

interface AnalyticsData {
  clubs: ClubSummary[];
  totals: {
    totalClubs: number;
    totalPlayers: number;
    totalSessions: number;
    totalMatches: number;
    completedMatches: number;
    totalRevenue: number;
    paidRevenue: number;
  };
}

export default function AdminDashboard() {
  const { data: user } = useUser();
  const { data: players } = usePlayers();
  const { data: sessions } = useSessions();
  const { data: pendingUsers } = usePendingUsers();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [downloadingAttendance, setDownloadingAttendance] = useState(false);

  const isOwner = user?.role === "OWNER";
  const isOrganiserOnly = useIsOrganiserOnly(!!user);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: !!user,
  });

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

  const totalPlayers = analytics?.totals?.totalPlayers ?? players?.length ?? 0;
  const totalClubs = analytics?.totals?.totalClubs ?? 0;
  const totalSessions = analytics?.totals?.totalSessions ?? sessions?.length ?? 0;
  const totalMatches = analytics?.totals?.totalMatches ?? 0;
  const upcomingSessions = sessions?.filter(s => new Date(s.date) >= new Date()).length || 0;
  const pendingCount = pendingUsers?.length || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-dashboard-title">{isOrganiserOnly ? "Organiser Dashboard" : "Admin Panel"}</h1>
          <p className="text-muted-foreground">
            {`Overview of your managed club${(myAdminClubs?.length ?? 0) > 1 ? 's' : ''}.`}
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Shield className="h-4 w-4 mr-2" />
          {isOrganiserOnly ? "ORGANISER" : user?.role}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50" data-testid="card-total-clubs">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-9 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold" data-testid="value-total-clubs">{totalClubs}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-total-members">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-9 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold" data-testid="value-total-members">{totalPlayers}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-total-sessions">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-9 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold" data-testid="value-total-sessions">{totalSessions}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-total-matches">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="h-9 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold" data-testid="value-total-matches">{totalMatches}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="card-pending-approvals">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-pending-approvals">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {!isOrganiserOnly && (
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
        )}

        {!isOrganiserOnly && (
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
        )}

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

        {(myAdminClubs?.length ?? 0) > 0 && (
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

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-referral-management">
            <Link href="/admin/referrals">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-emerald-500" />
                    Referral Management
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Review and approve referral submissions, award credits.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-notification-management">
            <Link href="/admin/notifications">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-500" />
                    Notification Settings
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configure automated reminders, notification schedules, bank details, and view delivery logs.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-acquisition-analytics">
            <Link href="/admin/acquisition-analytics">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Acquisition & KPI Analytics
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track user acquisition channels, conversion rates, retention, and growth metrics.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-attendance-rewards">
            <Link href="/admin/attendance-rewards">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    Rewards
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configure session attendance milestone rewards for players.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-membership-management">
            <Link href="/admin/memberships">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-teal-500" />
                    Membership Management
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage membership plans, requests, and payment status.
                </p>
              </CardContent>
            </Link>
          </Card>
        )}

        {!isOrganiserOnly && (
          <Card className="border-border/50 hover-elevate cursor-pointer" data-testid="card-import-members">
            <Link href="/admin/import-members">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-indigo-500" />
                    Import Members
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Bulk upload members via CSV or add them manually.
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

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import { Users, Calendar, DollarSign, Shield, Activity, UserPlus, UserCheck, Download, Building2, Trophy, Upload, CreditCard, BarChart3, Bell, Award, Share2, Swords, Megaphone, Baby, Target } from "lucide-react";
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

interface AdminTile {
  href: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
}

function AdminTileCard({ tile }: { tile: AdminTile }) {
  return (
    <Link href={tile.href}>
      <Card className="group border-border/40 hover:border-border hover:shadow-md transition-all duration-200 cursor-pointer h-full" data-testid={`card-admin-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardContent className="p-4 flex items-start gap-3.5">
          <div className={`${tile.bg} rounded-xl p-2.5 shrink-0 group-hover:scale-105 transition-transform`}>
            <tile.icon className={`w-5 h-5 ${tile.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{tile.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tile.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
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
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);

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

  const peopleSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/players", label: "Player Management", description: "Add, edit, and manage player profiles", icon: UserPlus, color: "text-purple-500", bg: "bg-purple-500/10" }] : []),
    { href: "/sessions", label: "Session Management", description: "Create sessions, manage signups and attendance", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
    ...(!isOrganiserOnly ? [{ href: "/admin/inactive-members", label: "Inactive Members", description: "Re-engage or manage inactive players", icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/import-members", label: "Import Members", description: "Bulk upload members via CSV", icon: Upload, color: "text-indigo-500", bg: "bg-indigo-500/10" }] : []),
  ];

  const financeSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/financials", label: "Financials", description: "Track payments, fees, and revenue", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/memberships", label: "Memberships", description: "Manage plans, requests, and payments", icon: CreditCard, color: "text-teal-500", bg: "bg-teal-500/10" }] : []),
    { href: "/admin/league", label: "League Management", description: "Fixtures, teams, and results", icon: Swords, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  const rewardsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/rewards", label: "Club Rewards", description: "Anniversary, milestone, and referral rewards", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/rewards-dashboard", label: "Rewards Dashboard", description: "View all claimed rewards", icon: Award, color: "text-pink-500", bg: "bg-pink-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/referrals", label: "Referral Management", description: "Review submissions and award credits", icon: Share2, color: "text-emerald-500", bg: "bg-emerald-500/10" }] : []),
  ];

  const analyticsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/acquisition-analytics", label: "Acquisition & KPI", description: "Track growth, channels, and retention", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/attendance-analytics", label: "Attendance Analytics", description: "Session attendance and engagement metrics", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" }] : []),
  ];

  const juniorsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/juniors", label: "Juniors Hub", description: "Manage junior players, families, and sessions", icon: Baby, color: "text-pink-500", bg: "bg-pink-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/coach/juniors/skills", label: "Coach Skills Analytics", description: "Aggregate skill insights, trends, and AI reports", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" }] : []),
  ];

  const commsSections: AdminTile[] = [
    ...((myAdminClubs?.length ?? 0) > 0 ? [{ href: "/admin/announcements", label: "Announcements", description: "Post updates to club members", icon: Megaphone, color: "text-orange-500", bg: "bg-orange-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/notifications", label: "Notification Settings", description: "Reminders, schedules, and delivery logs", icon: Bell, color: "text-indigo-500", bg: "bg-indigo-500/10" }] : []),
  ];

  const allSections = [
    { label: "People & Sessions", tiles: peopleSections },
    { label: "Finance & Memberships", tiles: financeSections },
    { label: "Juniors & Coaching", tiles: juniorsSections },
    { label: "Rewards & Referrals", tiles: rewardsSections },
    { label: "Analytics & Insights", tiles: analyticsSections },
    { label: "Communication", tiles: commsSections },
  ].filter(s => s.tiles.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-dashboard-title">{isOrganiserOnly ? "Organiser Dashboard" : "Admin Panel"}</h1>
          <p className="text-muted-foreground mt-1">
            {`Overview of your managed club${(myAdminClubs?.length ?? 0) > 1 ? 's' : ''}.`}
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Shield className="h-4 w-4 mr-2" />
          {isOrganiserOnly ? "ORGANISER" : user?.role}
        </Badge>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-total-clubs" onClick={() => setKpiDetail("total-clubs")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total Clubs</span>
              <Building2 className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {analyticsLoading ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-clubs">{totalClubs}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-total-members" onClick={() => setKpiDetail("total-members")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Players</span>
              <Users className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {analyticsLoading ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-members">{totalPlayers}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-total-sessions" onClick={() => setKpiDetail("total-sessions")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Sessions</span>
              <Calendar className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {analyticsLoading ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-sessions">{totalSessions}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-total-matches" onClick={() => setKpiDetail("total-matches")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Matches</span>
              <Trophy className="h-4 w-4 text-muted-foreground/60" />
            </div>
            {analyticsLoading ? (
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-matches">{totalMatches}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-pending-approvals" onClick={() => setKpiDetail("pending-approvals")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Pending</span>
              <UserCheck className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="text-2xl font-bold" data-testid="value-pending-approvals">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {allSections.map(section => (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border/50" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{section.label}</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.tiles.map(tile => (
                <AdminTileCard key={tile.href} tile={tile} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <KpiDetailDialog
        open={kpiDetail !== null}
        onOpenChange={(open) => { if (!open) setKpiDetail(null); }}
        title={
          kpiDetail === "total-clubs" ? "All Clubs" :
          kpiDetail === "total-members" ? "Players by Club" :
          kpiDetail === "total-sessions" ? "Sessions by Club" :
          kpiDetail === "total-matches" ? "Matches by Club" :
          kpiDetail === "pending-approvals" ? "Pending Approvals" : ""
        }
        description={
          kpiDetail === "total-clubs" ? `${totalClubs} clubs registered` :
          kpiDetail === "total-members" ? `${totalPlayers} total players across all clubs` :
          kpiDetail === "total-sessions" ? `${totalSessions} total sessions, ${upcomingSessions} upcoming` :
          kpiDetail === "total-matches" ? `${totalMatches} total matches played` :
          kpiDetail === "pending-approvals" ? `${pendingCount} users awaiting approval` : undefined
        }
      >
        {kpiDetail === "total-clubs" && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Club Name</TableHead><TableHead className="text-right">Players</TableHead><TableHead className="text-right">Sessions</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {analytics?.clubs?.map((club) => (
                <TableRow key={club.clubId}>
                  <TableCell className="font-medium">{club.clubName}</TableCell>
                  <TableCell className="text-right">{club.totalPlayers}</TableCell>
                  <TableCell className="text-right">{club.totalSessions}</TableCell>
                  <TableCell><Badge variant={club.status === "APPROVED" ? "default" : "secondary"}>{club.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {kpiDetail === "total-members" && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Club Name</TableHead><TableHead className="text-right">Players</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {analytics?.clubs?.map((club) => (
                <TableRow key={club.clubId}>
                  <TableCell className="font-medium">{club.clubName}</TableCell>
                  <TableCell className="text-right">{club.totalPlayers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {kpiDetail === "total-sessions" && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Club Name</TableHead><TableHead className="text-right">Sessions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {analytics?.clubs?.map((club) => (
                <TableRow key={club.clubId}>
                  <TableCell className="font-medium">{club.clubName}</TableCell>
                  <TableCell className="text-right">{club.totalSessions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {kpiDetail === "total-matches" && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Club Name</TableHead><TableHead className="text-right">Total Matches</TableHead><TableHead className="text-right">Revenue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {analytics?.clubs?.map((club) => (
                <TableRow key={club.clubId}>
                  <TableCell className="font-medium">{club.clubName}</TableCell>
                  <TableCell className="text-right">{club.totalMatches}</TableCell>
                  <TableCell className="text-right">{club.totalRevenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {kpiDetail === "pending-approvals" && (
          pendingUsers && pendingUsers.length > 0 ? (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pendingUsers.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No pending approvals</p>
          )
        )}
      </KpiDetailDialog>

      {isOwner && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/50" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">Data Export</p>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border/40">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="bg-primary/10 rounded-xl p-2.5 shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Export All Users</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Download CSV with all user details, club memberships, and stats.</p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => handleExport("users")}
                    disabled={downloadingUsers}
                    data-testid="button-export-users"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {downloadingUsers ? "Downloading..." : "Download CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Export Attendance</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Download CSV with attendance history, dates, and payment status.</p>
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => handleExport("attendance")}
                    disabled={downloadingAttendance}
                    data-testid="button-export-attendance"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {downloadingAttendance ? "Downloading..." : "Download CSV"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

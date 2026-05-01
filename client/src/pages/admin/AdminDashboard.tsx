import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { usePlayers, usePendingUsers } from "@/hooks/use-players";
import { useSessions } from "@/hooks/use-sessions";
import { useMyAdminClubs, useIsOrganiserOnly } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import { Users, Calendar, PoundSterling, Shield, Activity, UserPlus, UserCheck, Download, Building2, Trophy, Upload, CreditCard, BarChart3, Bell, Award, Share2, Swords, Megaphone, Baby, Target, Sparkles, Loader2, TrendingUp, Crown, FlaskConical, MapPin, Settings, Settings2, ChevronRight, Shirt, Package, AlertCircle, ShoppingBag, Inbox, ScrollText, ScanText } from "lucide-react";
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
      <Card
        className="group relative aspect-square border border-border/50 bg-gradient-to-br from-card to-card/70 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden"
        data-testid={`card-admin-${tile.label.toLowerCase().replace(/\s+/g, '-')}`}
        title={tile.description}
      >
        <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center text-center h-full gap-2.5">
          <div className={`${tile.bg} rounded-2xl p-3.5 sm:p-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
            <tile.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${tile.color}`} />
          </div>
          <p className="text-[12px] sm:text-sm font-semibold text-foreground leading-tight line-clamp-2">{tile.label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function AIReportsSection({ clubs }: { clubs: any[] }) {
  const { toast } = useToast();
  const [reportClubId, setReportClubId] = useState<string>(clubs[0]?.id ? String(clubs[0].id) : "");
  const [activeReport, setActiveReport] = useState<{ type: string; data: any } | null>(null);

  const financeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-report/finances", { clubId: Number(reportClubId) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => { setActiveReport({ type: "finances", data }); toast({ title: "Finance Report Ready" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-report/matches", { clubId: Number(reportClubId) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => { setActiveReport({ type: "matches", data }); toast({ title: "Match Report Ready" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const attendanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-report/attendance", { clubId: Number(reportClubId) });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => { setActiveReport({ type: "attendance", data }); toast({ title: "Attendance Report Ready" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (clubs.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/50" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">AI Reports</p>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">Generate AI-powered insights for</span>
          <Select value={reportClubId} onValueChange={setReportClubId}>
            <SelectTrigger data-testid="select-ai-report-club" className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Select Club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-border/40 hover:border-green-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-green-500/10 rounded-xl p-2.5 shrink-0">
                <PoundSterling className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Financial Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Revenue, payments, and collection analysis</p>
                <Button
                  data-testid="button-ai-finance-report"
                  size="sm"
                  className="mt-2"
                  onClick={() => financeMutation.mutate()}
                  disabled={financeMutation.isPending || !reportClubId}
                >
                  {financeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 hover:border-blue-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
                <Swords className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Match Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Match activity, player engagement, and stats</p>
                <Button
                  data-testid="button-ai-match-report"
                  size="sm"
                  className="mt-2"
                  onClick={() => matchMutation.mutate()}
                  disabled={matchMutation.isPending || !reportClubId}
                >
                  {matchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 hover:border-emerald-500/30 transition-colors">
            <CardContent className="p-4 flex items-start gap-3.5">
              <div className="bg-emerald-500/10 rounded-xl p-2.5 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Attendance Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">Attendance rates, no-shows, and engagement</p>
                <Button
                  data-testid="button-ai-attendance-report"
                  size="sm"
                  className="mt-2"
                  onClick={() => attendanceMutation.mutate()}
                  disabled={attendanceMutation.isPending || !reportClubId}
                >
                  {attendanceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!activeReport} onOpenChange={() => setActiveReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {activeReport?.type === "finances" ? "Financial AI Report" : activeReport?.type === "matches" ? "Match AI Report" : "Attendance AI Report"}
            </DialogTitle>
            <DialogDescription>
              AI-generated analysis for the last 30 days — {activeReport?.data?.report?.createdAt ? new Date(activeReport.data.report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "today"}
            </DialogDescription>
          </DialogHeader>
          {activeReport && (
            <div className="space-y-5">
              {activeReport.type === "finances" && activeReport.data.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-green-500">£{((activeReport.data.stats.totalIncome || 0) / 100).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total Income</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-blue-500">£{((activeReport.data.stats.paidAmount || 0) / 100).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Collected</p>
                  </div>
                  <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-orange-500">£{((activeReport.data.stats.pendingAmount || 0) / 100).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Outstanding</p>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-purple-500">{activeReport.data.stats.collectionRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p>
                  </div>
                </div>
              )}

              {activeReport.type === "matches" && activeReport.data.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-blue-500">{activeReport.data.stats.completedMatches}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
                  </div>
                  <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-purple-500">{activeReport.data.stats.uniquePlayers}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Players</p>
                  </div>
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-green-500">{activeReport.data.stats.doublesMatches}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Doubles</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-amber-500">{activeReport.data.stats.avgMatchesPerSession}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Avg/Session</p>
                  </div>
                </div>
              )}

              {activeReport.type === "attendance" && activeReport.data.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-emerald-500">{activeReport.data.stats.attendanceRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Attendance</p>
                  </div>
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-red-500">{activeReport.data.stats.noShowRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">No-Show Rate</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-blue-500">{activeReport.data.stats.activeMembers}/{activeReport.data.stats.totalMembers}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Active Members</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                    <p className="text-lg font-bold text-amber-500">{activeReport.data.stats.fillRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Fill Rate</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Analysis
                </p>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {activeReport.data.report?.aiSummary}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function HistoricalImportButton() {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed-historical-sessions");
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Historical Import Complete",
        description: data.message || `${data.sessionsCreated} sessions, ${data.signupsCreated} signups created`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>{result?.message}</p>
            {result?.sessionsCreated !== undefined && <p>Sessions created: {result.sessionsCreated}</p>}
            {result?.signupsCreated !== undefined && <p>Signups created: {result.signupsCreated}</p>}
            {(result?.unmatchedNames?.length > 0) && (
              <div>
                <p className="font-medium mt-2">Unmatched names ({result.unmatchedNames.length}):</p>
                <p className="text-muted-foreground">{result.unmatchedNames.join(", ")}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Button
        data-testid="button-import-historical"
        size="sm"
        variant="outline"
        onClick={() => importMutation.mutate()}
        disabled={importMutation.isPending}
      >
        {importMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
        {importMutation.isPending ? "Importing..." : "Import Historical Data"}
      </Button>
    </>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
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
    { href: "/admin/trials", label: "Trial Players", description: "Manage trial registrations, evaluations, and decisions", icon: UserCheck, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    ...(!isOrganiserOnly ? [{ href: "/admin/inactive-members", label: "Inactive Members", description: "Re-engage or manage inactive players", icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/import-members", label: "Import Members", description: "Bulk upload members via CSV", icon: Upload, color: "text-indigo-500", bg: "bg-indigo-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/merchandise", label: "Merchandise Manager", description: "Products, orders, stock, and payments", icon: ShoppingBag, color: "text-violet-500", bg: "bg-violet-500/10" }] : []),
  ];

  const financeSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/financials", label: "Financials", description: "Track payments, fees, and revenue", icon: PoundSterling, color: "text-green-500", bg: "bg-green-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/debts", label: "Debts & Payments", description: "Track player debts, charges, and collections", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/memberships", label: "Memberships", description: "Manage plans, requests, and payments", icon: CreditCard, color: "text-teal-500", bg: "bg-teal-500/10" }] : []),
    { href: "/admin/league", label: "League Management", description: "Fixtures, teams, and results", icon: Swords, color: "text-blue-500", bg: "bg-blue-500/10" },
    ...(!isOrganiserOnly ? [{ href: "/admin/inventory", label: "Inventory & Expenses", description: "Track stock, supplies, and club expenses", icon: Package, color: "text-cyan-500", bg: "bg-cyan-500/10" }] : []),
  ];

  const rewardsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/rewards", label: "Club Rewards", description: "Anniversary, milestone, and referral rewards", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/rewards-dashboard", label: "Rewards Dashboard", description: "View all claimed rewards", icon: Award, color: "text-pink-500", bg: "bg-pink-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/referrals", label: "Referral Management", description: "Review submissions and award credits", icon: Share2, color: "text-emerald-500", bg: "bg-emerald-500/10" }] : []),
  ];

  const analyticsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/acquisition-analytics", label: "Acquisition & KPI", description: "Track growth, channels, and retention", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/attendance-analytics", label: "Attendance Analytics", description: "Session attendance and engagement metrics", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/match-engine-lab", label: "Match Engine Lab", description: "Stress-test the matchmaking algorithm in a sandbox", icon: FlaskConical, color: "text-indigo-500", bg: "bg-indigo-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/match-engine-settings", label: "Engine Control Panel", description: "Configure matchmaking algorithm settings and presets", icon: Settings2, color: "text-violet-500", bg: "bg-violet-500/10" }] : []),
  ];

  const juniorsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/juniors", label: "Juniors Hub", description: "Manage junior players, families, and sessions", icon: Baby, color: "text-pink-500", bg: "bg-pink-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/coach/juniors/skills", label: "Coach Skills Analytics", description: "Aggregate skill insights, trends, and AI reports", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" }] : []),
  ];

  const exclusiveSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/recognition-cards", label: "Recognition Cards", description: "Award and manage player recognition cards", icon: Award, color: "text-rose-500", bg: "bg-rose-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/black-card", label: "Black Card Management", description: "Grant Ultra Exclusive access to members", icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10" }] : []),
  ];

  const commsSections: AdminTile[] = [
    ...((myAdminClubs?.length ?? 0) > 0 ? [{ href: "/admin/announcements", label: "Announcements", description: "Post updates to club members", icon: Megaphone, color: "text-orange-500", bg: "bg-orange-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/notifications", label: "Notification Settings", description: "Reminders, schedules, and delivery logs", icon: Bell, color: "text-indigo-500", bg: "bg-indigo-500/10" }] : []),
  ];

  const clubSettingsSections: AdminTile[] = [
    { href: "/admin/control-center", label: "Club Control Center", description: "Unified hub for clubs, plans, billing & feature toggles", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { href: "/admin/venues", label: "Venues & Courts", description: "Manage venues, halls, and court setup", icon: MapPin, color: "text-red-500", bg: "bg-red-500/10" },
  ];

  // Admin Tools — secondary management utilities surfaced as tiles inside the
  // Admin Panel so they don't clutter the sidebar.
  const adminToolsSections: AdminTile[] = [
    ...(!isOrganiserOnly ? [{ href: "/admin/inbox", label: "Admin Inbox", description: "Pending requests, payments, orders, and tickets in one place", icon: Inbox, color: "text-emerald-500", bg: "bg-emerald-500/10" }] : []),
    ...(!isOrganiserOnly ? [{ href: "/admin/audit-log", label: "Audit Log", description: "Searchable history of admin actions across your clubs", icon: ScrollText, color: "text-slate-500", bg: "bg-slate-500/10" }] : []),
    { href: "/admin/grading", label: "Grading Progress", description: "Review automatic skill promotions and demotions", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
    { href: "/admin/ai-match-input", label: "AI Match Input", description: "Upload score sheets and extract matches with AI vision", icon: ScanText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  const allSections = [
    { label: "People & Sessions", tiles: peopleSections },
    { label: "Finance & Memberships", tiles: financeSections },
    { label: "Club Settings", tiles: clubSettingsSections },
    { label: "Juniors & Coaching", tiles: juniorsSections },
    { label: "Rewards & Referrals", tiles: rewardsSections },
    { label: "Analytics & Insights", tiles: analyticsSections },
    { label: "Communication", tiles: commsSections },
    { label: "Admin Tools", tiles: adminToolsSections },
    { label: "Exclusive Access", tiles: exclusiveSections },
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
        <div className="flex items-center gap-2">
          {user?.role === "OWNER" && (
            <HistoricalImportButton />
          )}
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Shield className="h-4 w-4 mr-2" />
            {isOrganiserOnly ? "ORGANISER" : user?.role}
          </Badge>
        </div>
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

      {myAdminClubs && myAdminClubs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border/50" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">My Clubs</p>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myAdminClubs.map((club: any) => (
              <Card key={club.id} className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" data-testid={`card-my-club-${club.id}`} onClick={() => navigate(`/admin/club/${club.id}`)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl p-2.5 shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{club.name}</p>
                    <p className="text-xs text-muted-foreground">View club dashboard</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {allSections.map(section => (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border/50" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">{section.label}</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                <TableRow key={club.clubId} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/club/${club.clubId}`)}>
                  <TableCell className="font-medium text-primary">{club.clubName}</TableCell>
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

      {!isOrganiserOnly && <AIReportsSection clubs={myAdminClubs || []} />}

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

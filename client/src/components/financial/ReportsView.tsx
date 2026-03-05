import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Printer,
  Building2,
  Users,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { type FinancialViewProps, type FinancialEntry, formatPounds } from "./types";

type PeriodMode = "monthly" | "quarterly" | "yearly";
type SortDir = "asc" | "desc";

function getPeriodKey(dateStr: string, mode: PeriodMode): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (mode === "monthly") return format(d, "yyyy-MM");
  if (mode === "quarterly") return `${y}-Q${Math.floor(m / 3) + 1}`;
  return `${y}`;
}

function getPeriodLabel(dateStr: string, mode: PeriodMode): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (mode === "monthly") return format(d, "MMM yyyy");
  if (mode === "quarterly") return `Q${Math.floor(m / 3) + 1} ${y}`;
  return `${y}`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openPrintView(title: string, tableHtml: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
      .total-row { font-weight: 700; background: #f0f0f0 !important; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>${title}</h1>${tableHtml}
    <script>window.print();</script>
  </body></html>`);
  win.document.close();
}

export default function ReportsView({ filteredData, dashboardData }: FinancialViewProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");
  const [revSortDir, setRevSortDir] = useState<SortDir>("desc");

  const revenueSummary = useMemo(() => {
    const periods: Record<string, { key: string; label: string; revenue: number; collected: number; outstanding: number; signups: number }> = {};
    filteredData.forEach(entry => {
      const key = getPeriodKey(entry.sessionDate, periodMode);
      const label = getPeriodLabel(entry.sessionDate, periodMode);
      if (!periods[key]) periods[key] = { key, label, revenue: 0, collected: 0, outstanding: 0, signups: 0 };
      periods[key].revenue += entry.fee || 0;
      periods[key].signups++;
      if (entry.paymentStatus === "PAID") periods[key].collected += entry.fee || 0;
      else periods[key].outstanding += entry.fee || 0;
    });
    const sorted = Object.values(periods).sort((a, b) =>
      revSortDir === "desc" ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)
    );
    return sorted;
  }, [filteredData, periodMode, revSortDir]);

  const clubRevenue = useMemo(() => {
    const clubs: Record<number, { name: string; revenue: number; collected: number; outstanding: number; signups: number }> = {};
    filteredData.forEach(entry => {
      if (!clubs[entry.clubId]) clubs[entry.clubId] = { name: entry.clubName, revenue: 0, collected: 0, outstanding: 0, signups: 0 };
      clubs[entry.clubId].revenue += entry.fee || 0;
      clubs[entry.clubId].signups++;
      if (entry.paymentStatus === "PAID") clubs[entry.clubId].collected += entry.fee || 0;
      else clubs[entry.clubId].outstanding += entry.fee || 0;
    });
    return Object.values(clubs).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const membershipSummary = useMemo(() => {
    const plans: Record<string, { planName: string; count: number; revenue: number; paid: number; unpaid: number }> = {};
    filteredData.forEach(entry => {
      if (!entry.membershipPlanName) return;
      const key = entry.membershipPlanName;
      if (!plans[key]) plans[key] = { planName: key, count: 0, revenue: 0, paid: 0, unpaid: 0 };
      plans[key].count++;
      const fee = entry.membershipSessionFee ?? entry.fee ?? 0;
      plans[key].revenue += fee;
      if (entry.paymentStatus === "PAID") plans[key].paid += fee;
      else plans[key].unpaid += fee;
    });
    return Object.values(plans).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  const sessionSummary = useMemo(() => {
    const sessions: Record<number, { title: string; date: string; club: string; type: string; revenue: number; collected: number; signups: number }> = {};
    filteredData.forEach(entry => {
      if (!sessions[entry.sessionId]) sessions[entry.sessionId] = {
        title: entry.sessionTitle,
        date: entry.sessionDate,
        club: entry.clubName,
        type: entry.sessionType || "OPEN",
        revenue: 0,
        collected: 0,
        signups: 0,
      };
      sessions[entry.sessionId].revenue += entry.fee || 0;
      sessions[entry.sessionId].signups++;
      if (entry.paymentStatus === "PAID") sessions[entry.sessionId].collected += entry.fee || 0;
    });
    return Object.values(sessions).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredData]);

  const playerSummary = useMemo(() => {
    const players: Record<number, { name: string; email: string; revenue: number; paid: number; sessions: number }> = {};
    filteredData.forEach(entry => {
      if (!players[entry.playerUserId]) players[entry.playerUserId] = { name: entry.playerName, email: entry.playerEmail, revenue: 0, paid: 0, sessions: 0 };
      players[entry.playerUserId].revenue += entry.fee || 0;
      players[entry.playerUserId].sessions++;
      if (entry.paymentStatus === "PAID") players[entry.playerUserId].paid += entry.fee || 0;
    });
    return Object.values(players).sort((a, b) => b.revenue - a.revenue).slice(0, 25);
  }, [filteredData]);

  const exportRevenueCsv = useCallback(() => {
    downloadCsv(
      `revenue-summary-${periodMode}.csv`,
      ["Period", "Revenue", "Collected", "Outstanding", "Signups", "Collection Rate"],
      revenueSummary.map(r => [
        r.label,
        `£${formatPounds(r.revenue)}`,
        `£${formatPounds(r.collected)}`,
        `£${formatPounds(r.outstanding)}`,
        String(r.signups),
        `${r.revenue > 0 ? ((r.collected / r.revenue) * 100).toFixed(1) : "0.0"}%`,
      ])
    );
  }, [revenueSummary, periodMode]);

  const exportClubCsv = useCallback(() => {
    downloadCsv(
      "club-revenue.csv",
      ["Club", "Revenue", "Collected", "Outstanding", "Signups"],
      clubRevenue.map(c => [
        c.name,
        `£${formatPounds(c.revenue)}`,
        `£${formatPounds(c.collected)}`,
        `£${formatPounds(c.outstanding)}`,
        String(c.signups),
      ])
    );
  }, [clubRevenue]);

  const exportSessionCsv = useCallback(() => {
    downloadCsv(
      "session-summary.csv",
      ["Session", "Date", "Club", "Type", "Revenue", "Collected", "Signups", "Avg/Player"],
      sessionSummary.map(s => [
        s.title,
        format(new Date(s.date), "dd/MM/yyyy"),
        s.club,
        s.type,
        `£${formatPounds(s.revenue)}`,
        `£${formatPounds(s.collected)}`,
        String(s.signups),
        `£${formatPounds(s.signups > 0 ? s.revenue / s.signups : 0)}`,
      ])
    );
  }, [sessionSummary]);

  const exportPlayerCsv = useCallback(() => {
    downloadCsv(
      "player-summary.csv",
      ["Player", "Email", "Revenue", "Paid", "Sessions", "Collection Rate"],
      playerSummary.map(p => [
        p.name,
        p.email,
        `£${formatPounds(p.revenue)}`,
        `£${formatPounds(p.paid)}`,
        String(p.sessions),
        `${p.revenue > 0 ? ((p.paid / p.revenue) * 100).toFixed(1) : "0.0"}%`,
      ])
    );
  }, [playerSummary]);

  const printReport = useCallback(() => {
    const revTotal = revenueSummary.reduce((s, r) => s + r.revenue, 0);
    const colTotal = revenueSummary.reduce((s, r) => s + r.collected, 0);
    const outTotal = revenueSummary.reduce((s, r) => s + r.outstanding, 0);
    const sigTotal = revenueSummary.reduce((s, r) => s + r.signups, 0);

    let html = `<table><tr><th>Period</th><th>Revenue</th><th>Collected</th><th>Outstanding</th><th>Signups</th><th>Rate</th></tr>`;
    revenueSummary.forEach(r => {
      const rate = r.revenue > 0 ? ((r.collected / r.revenue) * 100).toFixed(1) : "0.0";
      html += `<tr><td>${r.label}</td><td>£${formatPounds(r.revenue)}</td><td>£${formatPounds(r.collected)}</td><td>£${formatPounds(r.outstanding)}</td><td>${r.signups}</td><td>${rate}%</td></tr>`;
    });
    html += `<tr class="total-row"><td>Total</td><td>£${formatPounds(revTotal)}</td><td>£${formatPounds(colTotal)}</td><td>£${formatPounds(outTotal)}</td><td>${sigTotal}</td><td>${revTotal > 0 ? ((colTotal / revTotal) * 100).toFixed(1) : "0.0"}%</td></tr></table>`;

    if (clubRevenue.length > 0) {
      html += `<br/><h2>Club Revenue</h2><table><tr><th>Club</th><th>Revenue</th><th>Collected</th><th>Outstanding</th></tr>`;
      clubRevenue.forEach(c => {
        html += `<tr><td>${c.name}</td><td>£${formatPounds(c.revenue)}</td><td>£${formatPounds(c.collected)}</td><td>£${formatPounds(c.outstanding)}</td></tr>`;
      });
      html += `</table>`;
    }

    openPrintView("Financial Report - Revenue Summary", html);
  }, [revenueSummary, clubRevenue]);

  const revTotals = useMemo(() => ({
    revenue: revenueSummary.reduce((s, r) => s + r.revenue, 0),
    collected: revenueSummary.reduce((s, r) => s + r.collected, 0),
    outstanding: revenueSummary.reduce((s, r) => s + r.outstanding, 0),
    signups: revenueSummary.reduce((s, r) => s + r.signups, 0),
  }), [revenueSummary]);

  const clubTotals = useMemo(() => ({
    revenue: clubRevenue.reduce((s, c) => s + c.revenue, 0),
    collected: clubRevenue.reduce((s, c) => s + c.collected, 0),
    outstanding: clubRevenue.reduce((s, c) => s + c.outstanding, 0),
    signups: clubRevenue.reduce((s, c) => s + c.signups, 0),
  }), [clubRevenue]);

  const SortIcon = revSortDir === "desc" ? ChevronDown : ChevronUp;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-reports-title">
          <FileText className="h-5 w-5" />
          Financial Reports
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={printReport} data-testid="button-print-report">
            <Printer className="h-4 w-4 mr-1.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      <Card data-testid="card-revenue-summary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Revenue Summary
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {(["monthly", "quarterly", "yearly"] as PeriodMode[]).map(mode => (
                <Button
                  key={mode}
                  size="sm"
                  variant={periodMode === mode ? "default" : "outline"}
                  onClick={() => setPeriodMode(mode)}
                  data-testid={`button-period-${mode}`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={exportRevenueCsv} data-testid="button-export-revenue-csv">
                <Download className="h-4 w-4 mr-1.5" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => setRevSortDir(d => d === "desc" ? "asc" : "desc")}
                    data-testid="button-sort-period"
                  >
                    <span className="flex items-center gap-1">
                      Period <SortIcon className="h-3.5 w-3.5" />
                    </span>
                  </TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead>Collection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueSummary.map((row, i) => {
                  const rate = row.revenue > 0 ? ((row.collected / row.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={row.key} data-testid={`row-revenue-${i}`}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="font-bold">£{formatPounds(row.revenue)}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(row.collected)}</TableCell>
                      <TableCell className={row.outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                        £{formatPounds(row.outstanding)}
                      </TableCell>
                      <TableCell>{row.signups}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(parseFloat(rate), 100)}%` }} />
                          </div>
                          <span className="text-sm tabular-nums">{rate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {revenueSummary.length > 0 && (
                  <TableRow className="font-bold border-t-2" data-testid="row-revenue-total">
                    <TableCell>Total</TableCell>
                    <TableCell>£{formatPounds(revTotals.revenue)}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(revTotals.collected)}</TableCell>
                    <TableCell className={revTotals.outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                      £{formatPounds(revTotals.outstanding)}
                    </TableCell>
                    <TableCell>{revTotals.signups}</TableCell>
                    <TableCell>
                      {revTotals.revenue > 0 ? ((revTotals.collected / revTotals.revenue) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                  </TableRow>
                )}
                {revenueSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No revenue data for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-club-revenue">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Club Revenue
            </CardTitle>
            <Button size="sm" variant="outline" onClick={exportClubCsv} data-testid="button-export-club-csv">
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead>Collection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubRevenue.map((club, i) => {
                  const rate = club.revenue > 0 ? ((club.collected / club.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={i} data-testid={`row-club-${i}`}>
                      <TableCell className="font-medium">{club.name}</TableCell>
                      <TableCell className="font-bold">£{formatPounds(club.revenue)}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(club.collected)}</TableCell>
                      <TableCell className={club.outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                        £{formatPounds(club.outstanding)}
                      </TableCell>
                      <TableCell>{club.signups}</TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">{rate}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {clubRevenue.length > 0 && (
                  <TableRow className="font-bold border-t-2" data-testid="row-club-total">
                    <TableCell>Total</TableCell>
                    <TableCell>£{formatPounds(clubTotals.revenue)}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(clubTotals.collected)}</TableCell>
                    <TableCell className={clubTotals.outstanding > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                      £{formatPounds(clubTotals.outstanding)}
                    </TableCell>
                    <TableCell>{clubTotals.signups}</TableCell>
                    <TableCell>
                      {clubTotals.revenue > 0 ? ((clubTotals.collected / clubTotals.revenue) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                  </TableRow>
                )}
                {clubRevenue.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No club data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {membershipSummary.length > 0 && (
        <Card data-testid="card-membership-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Membership Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Unpaid</TableHead>
                    <TableHead>Collection Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membershipSummary.map((plan, i) => {
                    const rate = plan.revenue > 0 ? ((plan.paid / plan.revenue) * 100).toFixed(1) : "0.0";
                    return (
                      <TableRow key={i} data-testid={`row-membership-${i}`}>
                        <TableCell className="font-medium">
                          <Badge variant="secondary">{plan.planName}</Badge>
                        </TableCell>
                        <TableCell>{plan.count}</TableCell>
                        <TableCell className="font-bold">£{formatPounds(plan.revenue)}</TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(plan.paid)}</TableCell>
                        <TableCell className={plan.unpaid > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}>
                          £{formatPounds(plan.unpaid)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm tabular-nums">{rate}%</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-session-summary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Session Summary
            </CardTitle>
            <Button size="sm" variant="outline" onClick={exportSessionCsv} data-testid="button-export-session-csv">
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Signups</TableHead>
                  <TableHead>Avg/Player</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionSummary.slice(0, 50).map((session, i) => {
                  const avg = session.signups > 0 ? session.revenue / session.signups : 0;
                  return (
                    <TableRow key={i} data-testid={`row-session-${i}`}>
                      <TableCell className="font-medium max-w-[200px] truncate">{session.title}</TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">{format(new Date(session.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{session.club}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.type === "OPEN" ? "Open" : session.type === "JUNIORS_ONLY" ? "Juniors" : session.type}</Badge>
                      </TableCell>
                      <TableCell className="font-bold">£{formatPounds(session.revenue)}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(session.collected)}</TableCell>
                      <TableCell>{session.signups}</TableCell>
                      <TableCell className="tabular-nums">£{formatPounds(avg)}</TableCell>
                    </TableRow>
                  );
                })}
                {sessionSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No session data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {sessionSummary.length > 50 && (
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-session-count">
              Showing 50 of {sessionSummary.length} sessions. Export CSV for full data.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-player-summary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Contributors
            </CardTitle>
            <Button size="sm" variant="outline" onClick={exportPlayerCsv} data-testid="button-export-player-csv">
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Collection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerSummary.map((player, i) => {
                  const rate = player.revenue > 0 ? ((player.paid / player.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={i} data-testid={`row-player-${i}`}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{player.email}</TableCell>
                      <TableCell className="font-bold">£{formatPounds(player.revenue)}</TableCell>
                      <TableCell className="text-green-600 dark:text-green-400">£{formatPounds(player.paid)}</TableCell>
                      <TableCell>{player.sessions}</TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">{rate}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {playerSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No player data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

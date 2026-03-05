import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Building2,
  Zap,
  Calendar,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, addDays, isAfter, isBefore } from "date-fns";
import type { FinancialViewProps, FinancialEntry } from "./types";
import { formatPounds } from "./types";

interface Insight {
  type: "positive" | "warning" | "alert";
  icon: ReactNode;
  title: string;
  description: string;
  value?: string;
}

function getInsightColor(type: Insight["type"]) {
  switch (type) {
    case "positive":
      return "text-green-600 dark:text-green-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "alert":
      return "text-red-600 dark:text-red-400";
  }
}

function getInsightBg(type: Insight["type"]) {
  switch (type) {
    case "positive":
      return "bg-green-500/10";
    case "warning":
      return "bg-amber-500/10";
    case "alert":
      return "bg-red-500/10";
  }
}

function getInsightBadgeVariant(type: Insight["type"]): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "positive":
      return "default";
    case "warning":
      return "secondary";
    case "alert":
      return "destructive";
  }
}

export default function SmartInsights({ filteredData, dashboardData }: FinancialViewProps) {
  const insights = useMemo(() => {
    const result: Insight[] = [];
    if (!filteredData.length) return result;

    const now = new Date();
    const currentMonth = format(now, "yyyy-MM");
    const lastMonth = format(addDays(new Date(now.getFullYear(), now.getMonth(), 1), -1), "yyyy-MM");

    const byMonth: Record<string, FinancialEntry[]> = {};
    filteredData.forEach((entry) => {
      const key = format(new Date(entry.sessionDate), "yyyy-MM");
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(entry);
    });

    const currentMonthRevenue = (byMonth[currentMonth] || []).reduce((s, e) => s + (e.fee || 0), 0);
    const lastMonthRevenue = (byMonth[lastMonth] || []).reduce((s, e) => s + (e.fee || 0), 0);

    if (lastMonthRevenue > 0) {
      const growthPct = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      if (growthPct > 0) {
        result.push({
          type: "positive",
          icon: <TrendingUp className="h-4 w-4" />,
          title: "Revenue Growth",
          description: `Revenue is up ${growthPct.toFixed(1)}% compared to last month (£${formatPounds(lastMonthRevenue)} → £${formatPounds(currentMonthRevenue)}).`,
          value: `+${growthPct.toFixed(1)}%`,
        });
      } else if (growthPct < -10) {
        result.push({
          type: "alert",
          icon: <TrendingDown className="h-4 w-4" />,
          title: "Revenue Decline",
          description: `Revenue has dropped ${Math.abs(growthPct).toFixed(1)}% compared to last month (£${formatPounds(lastMonthRevenue)} → £${formatPounds(currentMonthRevenue)}).`,
          value: `${growthPct.toFixed(1)}%`,
        });
      } else if (growthPct < 0) {
        result.push({
          type: "warning",
          icon: <TrendingDown className="h-4 w-4" />,
          title: "Revenue Dip",
          description: `Revenue is slightly down ${Math.abs(growthPct).toFixed(1)}% compared to last month.`,
          value: `${growthPct.toFixed(1)}%`,
        });
      }
    } else if (currentMonthRevenue > 0) {
      result.push({
        type: "positive",
        icon: <ArrowUpRight className="h-4 w-4" />,
        title: "New Revenue This Month",
        description: `£${formatPounds(currentMonthRevenue)} generated this month with no prior month data to compare.`,
        value: `£${formatPounds(currentMonthRevenue)}`,
      });
    }

    const totalRevenue = filteredData.reduce((s, e) => s + (e.fee || 0), 0);
    const outstandingAmount = filteredData
      .filter((e) => e.paymentStatus !== "PAID")
      .reduce((s, e) => s + (e.fee || 0), 0);

    if (totalRevenue > 0) {
      const outstandingPct = (outstandingAmount / totalRevenue) * 100;
      if (outstandingPct > 30) {
        result.push({
          type: "alert",
          icon: <AlertTriangle className="h-4 w-4" />,
          title: "High Outstanding Balances",
          description: `${outstandingPct.toFixed(1)}% of revenue (£${formatPounds(outstandingAmount)}) remains uncollected. Consider sending payment reminders.`,
          value: `£${formatPounds(outstandingAmount)}`,
        });
      } else if (outstandingPct > 15) {
        result.push({
          type: "warning",
          icon: <AlertTriangle className="h-4 w-4" />,
          title: "Outstanding Balances",
          description: `${outstandingPct.toFixed(1)}% of revenue (£${formatPounds(outstandingAmount)}) is still outstanding.`,
          value: `£${formatPounds(outstandingAmount)}`,
        });
      } else if (outstandingPct <= 15 && outstandingPct > 0) {
        result.push({
          type: "positive",
          icon: <CheckCircle className="h-4 w-4" />,
          title: "Healthy Collection",
          description: `Only ${outstandingPct.toFixed(1)}% outstanding. Collection rate is strong.`,
          value: `${(100 - outstandingPct).toFixed(1)}%`,
        });
      }
    }

    const sessionMap: Record<string, { title: string; revenue: number; signups: number; paid: number; clubName: string }> = {};
    filteredData.forEach((entry) => {
      const key = `${entry.sessionId}`;
      if (!sessionMap[key])
        sessionMap[key] = { title: entry.sessionTitle, revenue: 0, signups: 0, paid: 0, clubName: entry.clubName };
      sessionMap[key].revenue += entry.fee || 0;
      sessionMap[key].signups++;
      if (entry.paymentStatus === "PAID") sessionMap[key].paid += entry.fee || 0;
    });

    const sessions = Object.values(sessionMap);
    const lowMarginSessions = sessions.filter((s) => {
      if (s.revenue === 0) return false;
      const collectionRate = (s.paid / s.revenue) * 100;
      return collectionRate < 50 && s.signups >= 2;
    });

    if (lowMarginSessions.length > 0) {
      const names = lowMarginSessions
        .slice(0, 3)
        .map((s) => s.title)
        .join(", ");
      result.push({
        type: "warning",
        icon: <Target className="h-4 w-4" />,
        title: "Low-Margin Sessions",
        description: `${lowMarginSessions.length} session(s) have collection rates below 50%: ${names}${lowMarginSessions.length > 3 ? ` and ${lowMarginSessions.length - 3} more` : ""}. Consider reviewing pricing or payment enforcement.`,
        value: `${lowMarginSessions.length} sessions`,
      });
    }

    const clubMap: Record<number, { name: string; revenue: number; collected: number }> = {};
    filteredData.forEach((entry) => {
      if (!clubMap[entry.clubId]) clubMap[entry.clubId] = { name: entry.clubName, revenue: 0, collected: 0 };
      clubMap[entry.clubId].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") clubMap[entry.clubId].collected += entry.fee || 0;
    });

    const clubs = Object.values(clubMap).sort((a, b) => b.revenue - a.revenue);
    if (clubs.length > 0) {
      const topClub = clubs[0];
      const topClubPct = totalRevenue > 0 ? ((topClub.revenue / totalRevenue) * 100).toFixed(1) : "0";
      result.push({
        type: "positive",
        icon: <Building2 className="h-4 w-4" />,
        title: "Top Performing Club",
        description: `${topClub.name} leads with £${formatPounds(topClub.revenue)} revenue (${topClubPct}% of total).`,
        value: `£${formatPounds(topClub.revenue)}`,
      });
    }

    const paidTotal = filteredData.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
    const sortedMonths = Object.keys(byMonth).sort();
    if (sortedMonths.length >= 2) {
      const recentMonths = sortedMonths.slice(-3);
      const collectionRates = recentMonths.map((m) => {
        const entries = byMonth[m];
        const rev = entries.reduce((s, e) => s + (e.fee || 0), 0);
        const paid = entries.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
        return rev > 0 ? (paid / rev) * 100 : 0;
      });

      if (collectionRates.length >= 2) {
        const latest = collectionRates[collectionRates.length - 1];
        const previous = collectionRates[collectionRates.length - 2];
        const diff = latest - previous;

        if (diff > 5) {
          result.push({
            type: "positive",
            icon: <ArrowUpRight className="h-4 w-4" />,
            title: "Collection Rate Improving",
            description: `Collection rate improved by ${diff.toFixed(1)}pp (${previous.toFixed(1)}% → ${latest.toFixed(1)}%).`,
            value: `+${diff.toFixed(1)}pp`,
          });
        } else if (diff < -5) {
          result.push({
            type: "warning",
            icon: <ArrowDownRight className="h-4 w-4" />,
            title: "Collection Rate Declining",
            description: `Collection rate dropped by ${Math.abs(diff).toFixed(1)}pp (${previous.toFixed(1)}% → ${latest.toFixed(1)}%). Monitor payment follow-ups.`,
            value: `${diff.toFixed(1)}pp`,
          });
        }
      }
    }

    return result;
  }, [filteredData, dashboardData]);

  const forecast = useMemo(() => {
    if (!filteredData.length) return null;

    const now = new Date();
    const thirtyDaysAhead = addDays(now, 30);

    const upcomingSessions = filteredData.filter((entry) => {
      const d = new Date(entry.sessionDate);
      return isAfter(d, now) && isBefore(d, thirtyDaysAhead);
    });

    if (upcomingSessions.length === 0) {
      const sortedMonths = Object.keys(
        filteredData.reduce<Record<string, number>>((acc, e) => {
          const key = format(new Date(e.sessionDate), "yyyy-MM");
          acc[key] = (acc[key] || 0) + (e.fee || 0);
          return acc;
        }, {})
      ).sort();

      if (sortedMonths.length >= 2) {
        const monthlyRevenues = sortedMonths.map((m) =>
          filteredData
            .filter((e) => format(new Date(e.sessionDate), "yyyy-MM") === m)
            .reduce((s, e) => s + (e.fee || 0), 0)
        );
        const avgMonthly = monthlyRevenues.reduce((a, b) => a + b, 0) / monthlyRevenues.length;
        return {
          predictedRevenue: avgMonthly,
          basis: "historical average",
          sessions: 0,
        };
      }
      return null;
    }

    const predictedRevenue = upcomingSessions.reduce((s, e) => s + (e.fee || 0), 0);
    const uniqueSessions = new Set(upcomingSessions.map((e) => e.sessionId)).size;

    return {
      predictedRevenue,
      basis: "upcoming sessions",
      sessions: uniqueSessions,
    };
  }, [filteredData]);

  if (insights.length === 0 && !forecast) {
    return null;
  }

  return (
    <Card data-testid="card-smart-insights">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length > 0 && (
          <div className="space-y-3" data-testid="insights-list">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-md ${getInsightBg(insight.type)}`}
                data-testid={`insight-item-${i}`}
              >
                <div className={`mt-0.5 ${getInsightColor(insight.type)}`}>{insight.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium text-sm ${getInsightColor(insight.type)}`} data-testid={`insight-title-${i}`}>
                      {insight.title}
                    </span>
                    {insight.value && (
                      <Badge variant={getInsightBadgeVariant(insight.type)} className="text-xs" data-testid={`insight-value-${i}`}>
                        {insight.value}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5" data-testid={`insight-description-${i}`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {forecast && (
          <div className="border-t pt-4 mt-4" data-testid="revenue-forecast">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">30-Day Revenue Forecast</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold tabular-nums" data-testid="forecast-amount">
                  £{formatPounds(forecast.predictedRevenue)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground" data-testid="forecast-basis">
                {forecast.basis === "upcoming sessions" ? (
                  <>
                    Based on {forecast.sessions} upcoming session{forecast.sessions !== 1 ? "s" : ""} in the next 30 days
                  </>
                ) : (
                  <>Based on historical monthly average</>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

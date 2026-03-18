import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Users, Calendar, Trophy, PoundSterling, Search, Loader2, Building2, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ClubAnalytics {
  clubId: number;
  clubName: string;
  status: string;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
  totalMatches: number;
  completedMatches: number;
  totalSignups: number;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  avgMatchesPerSession: number;
}

interface AnalyticsTotals {
  totalClubs: number;
  totalPlayers: number;
  totalSessions: number;
  totalMatches: number;
  completedMatches: number;
  totalSignups: number;
  totalRevenue: number;
  paidRevenue: number;
}

interface AnalyticsData {
  clubs: ClubAnalytics[];
  totals: AnalyticsTotals;
}

export default function Analytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const selectedClubTotals = useMemo(() => {
    if (!data) return null;
    if (selectedClubId === "all") return data.totals;
    const club = data.clubs.find(c => String(c.clubId) === selectedClubId);
    if (!club) return data.totals;
    return {
      totalClubs: 1,
      totalPlayers: club.totalPlayers,
      totalSessions: club.totalSessions,
      totalMatches: club.totalMatches,
      completedMatches: club.completedMatches,
      totalSignups: club.totalSignups,
      totalRevenue: club.totalRevenue,
      paidRevenue: club.paidRevenue,
    };
  }, [data, selectedClubId]);

  const displayClubs = useMemo(() => {
    if (!data?.clubs) return [];
    let clubs = data.clubs;
    if (selectedClubId !== "all") {
      clubs = clubs.filter(c => String(c.clubId) === selectedClubId);
    }
    if (searchQuery) {
      clubs = clubs.filter(c => c.clubName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return clubs;
  }, [data, selectedClubId, searchQuery]);

  const chartData = displayClubs.map((club) => ({
    name: club.clubName.length > 15 ? club.clubName.substring(0, 15) + "..." : club.clubName,
    revenue: club.totalRevenue / 100,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="error-message">
        <p className="text-destructive">Failed to load analytics data.</p>
      </div>
    );
  }

  const totals = selectedClubTotals;
  const selectedClubName = selectedClubId === "all"
    ? "All Clubs"
    : data?.clubs.find(c => String(c.clubId) === selectedClubId)?.clubName || "All Clubs";

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <PageHeader
          title="Platform Analytics"
          description="Comprehensive statistics across all clubs."
        />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-[220px]" data-testid="select-analytics-club">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {data?.clubs.map((club) => (
                <SelectItem key={club.clubId} value={String(club.clubId)}>
                  {club.clubName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClubId !== "all" && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm" data-testid="badge-selected-club">
            <Building2 className="h-3 w-3 mr-1" />
            Showing: {selectedClubName}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card data-testid="card-total-clubs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedClubId === "all" ? "Total Clubs" : "Club"}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-clubs">
              {totals?.totalClubs ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-players">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-players">
              {totals?.totalPlayers ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-sessions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-sessions">
              {totals?.totalSessions ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-matches">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-matches">
              {totals?.totalMatches ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <PoundSterling className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-revenue">
              £{((totals?.paidRevenue ?? 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid="value-total-revenue-breakdown">
              of £{((totals?.totalRevenue ?? 0) / 100).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue {selectedClubId === "all" ? "per Club" : `- ${selectedClubName}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `£${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toFixed(2)}`, "Revenue"]}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No club data available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-club-table">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Club Breakdown
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-clubs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Players</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Matches</TableHead>
                  <TableHead className="text-right">Revenue (£)</TableHead>
                  <TableHead className="text-right">Avg Matches/Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayClubs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-clubs">
                      {searchQuery ? "No clubs match your search." : "No club data available."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayClubs.map((club) => (
                    <TableRow key={club.clubId} data-testid={`row-club-${club.clubId}`}>
                      <TableCell className="font-medium" data-testid={`text-club-name-${club.clubId}`}>
                        {club.clubName}
                      </TableCell>
                      <TableCell data-testid={`badge-club-status-${club.clubId}`}>
                        <Badge variant={club.status === "APPROVED" ? "default" : "secondary"}>
                          {club.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-club-players-${club.clubId}`}>
                        {club.totalPlayers}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-club-sessions-${club.clubId}`}>
                        {club.totalSessions}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-club-matches-${club.clubId}`}>
                        {club.completedMatches}/{club.totalMatches}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-club-revenue-${club.clubId}`}>
                        £{(club.totalRevenue / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-club-avg-matches-${club.clubId}`}>
                        {club.avgMatchesPerSession?.toFixed(1) ?? "0.0"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

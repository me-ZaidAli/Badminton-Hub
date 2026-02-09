import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy, Search, RotateCcw, Target,
  Flame, Star, Award, Zap, Medal, Loader2, Pencil, X,
  Users, TrendingUp, MapPin, ChevronDown, ChevronUp, Filter
} from "lucide-react";

interface RankingPlayer {
  profileId: number;
  userId: number;
  clubId: number;
  clubName: string;
  clubCity: string | null;
  clubCountry: string | null;
  fullName: string;
  email?: string;
  phone?: string | null;
  gender: string;
  category: string;
  matchesPlayed: number;
  matchesWon: number;
  playerStatus: string;
  clubRole: string;
  membershipStatus?: string;
  emailVerified?: boolean;
  isJunior?: boolean;
  userCountry?: string | null;
  userCity?: string | null;
  userRegion?: string | null;
  createdAt?: string | null;
}

function getQuarterDates(year: number, quarter: number): { dateFrom: string; dateTo: string } {
  const startMonth = (quarter - 1) * 3;
  return {
    dateFrom: new Date(year, startMonth, 1).toISOString(),
    dateTo: new Date(year, startMonth + 3, 0, 23, 59, 59).toISOString(),
  };
}

function getCurrentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function getTimePeriodDates(period: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (period === "all") return {};
  if (period === "last30") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { dateFrom: d.toISOString() };
  }
  if (period === "thisMonth") {
    return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (period === "thisSeason") {
    return getQuarterDates(now.getFullYear(), getCurrentQuarter());
  }
  if (period.startsWith("Q")) {
    const parts = period.split("-");
    return getQuarterDates(parseInt(parts[1]), parseInt(parts[0].replace("Q", "")));
  }
  return {};
}

function getSeasonOptions() {
  const currentYear = new Date().getFullYear();
  const currentQ = getCurrentQuarter();
  const options: { value: string; label: string }[] = [];
  for (let y = currentYear; y >= currentYear - 1; y--) {
    const maxQ = y === currentYear ? currentQ : 4;
    for (let q = maxQ; q >= 1; q--) {
      options.push({
        value: `Q${q}-${y}`,
        label: `Q${q} ${y} (${["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"][q - 1]})`,
      });
    }
  }
  return options;
}

function getAchievements(player: { matchesWon: number; matchesPlayed: number; winPercentage: number }): { icon: any; label: string; color: string }[] {
  const badges: { icon: any; label: string; color: string }[] = [];
  if (player.matchesWon >= 5) badges.push({ icon: Flame, label: "5+ Wins", color: "text-orange-500" });
  if (player.matchesPlayed >= 10) badges.push({ icon: Star, label: "10+ Matches", color: "text-amber-500" });
  if (player.winPercentage >= 75 && player.matchesPlayed >= 4) badges.push({ icon: Award, label: "Top Performer", color: "text-purple-500" });
  if (player.matchesWon >= 1 && player.matchesPlayed <= 3) badges.push({ icon: Zap, label: "First Win", color: "text-green-500" });
  if (player.winPercentage === 100 && player.matchesPlayed >= 3) badges.push({ icon: Medal, label: "Undefeated", color: "text-yellow-500" });
  return badges;
}

function PlayerProfileDialog({
  player,
  open,
  onOpenChange,
  isAdmin,
}: {
  player: (RankingPlayer & { matchesLost: number; winPercentage: number; rank: number }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: "",
    gender: "MALE",
    category: "D",
    clubRole: "PLAYER",
    email: "",
    phone: "",
  });

  const startEditing = () => {
    if (player) {
      setEditData({
        fullName: player.fullName || "",
        gender: player.gender || "MALE",
        category: player.category || "D",
        clubRole: player.clubRole || "PLAYER",
        email: player.email || "",
        phone: player.phone || "",
      });
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      if (!player) throw new Error("No player selected");
      await apiRequest("PATCH", `/api/clubs/${player.clubId}/members/${player.profileId}`, {
        fullName: data.fullName,
        gender: data.gender,
        category: data.category,
        clubRole: data.clubRole,
      });
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rankings"] });
      setEditing(false);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setEditing(false);
    onOpenChange(isOpen);
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
              <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <span data-testid="text-profile-name">{player.fullName}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">Rank #{player.rank}</Badge>
                {player.clubRole && player.clubRole !== "PLAYER" && (
                  <Badge variant="secondary" className="text-[10px]">{player.clubRole}</Badge>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>Player profile and ranking details</DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editData.fullName}
                onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                data-testid="input-edit-fullName"
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={editData.gender} onValueChange={(v) => setEditData({ ...editData, gender: v })}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade / Level</Label>
              <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Grade A</SelectItem>
                  <SelectItem value="B">Grade B</SelectItem>
                  <SelectItem value="C">Grade C</SelectItem>
                  <SelectItem value="D">Grade D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Club Role</Label>
              <Select value={editData.clubRole} onValueChange={(v) => setEditData({ ...editData, clubRole: v })}>
                <SelectTrigger data-testid="select-edit-clubRole">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAYER">Player</SelectItem>
                  <SelectItem value="COACH">Coach</SelectItem>
                  <SelectItem value="ORGANISER">Organiser</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={cancelEditing} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !editData.fullName.trim()}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ProfileField label="Name" value={player.fullName} testId="text-view-name" />
              <ProfileField label="Email" value={player.email || "N/A"} testId="text-view-email" />
              <ProfileField label="Phone" value={player.phone || "N/A"} testId="text-view-phone" />
              <ProfileField label="Sex" value={player.gender === "MALE" ? "Male" : player.gender === "FEMALE" ? "Female" : player.gender || "N/A"} testId="text-view-gender" />
              <ProfileField label="Age Group" value={player.isJunior ? "Junior" : "Adult"} testId="text-view-agegroup" />
              <ProfileField label="Grade" value={player.category ? `Grade ${player.category}` : "N/A"} testId="text-view-grade" />
              <ProfileField label="Club" value={player.clubName} testId="text-view-club" />
              <ProfileField label="Club Role" value={player.clubRole} testId="text-view-clubrole" />
              <ProfileField label="Country" value={player.userCountry || player.clubCountry || "N/A"} testId="text-view-country" />
              <ProfileField label="City" value={player.userCity || player.clubCity || "N/A"} testId="text-view-city" />
              <ProfileField label="Region" value={player.userRegion || "N/A"} testId="text-view-region" />
              <ProfileField label="Membership" value={player.membershipStatus || "N/A"} testId="text-view-membership" />
              <ProfileField label="Verified" value={player.emailVerified ? "Yes" : "No"} testId="text-view-verified" />
              <ProfileField label="Status" value={player.playerStatus} testId="text-view-status" />
              <ProfileField label="Joined" value={player.createdAt ? new Date(player.createdAt).toLocaleDateString() : "N/A"} testId="text-view-joined" />
            </div>

            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold mb-2">Ranking Info</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-bold" data-testid="text-view-played">{player.matchesPlayed}</div>
                  <div className="text-xs text-muted-foreground">Played</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className="text-lg font-bold">
                    <span className="text-green-600" data-testid="text-view-won">{player.matchesWon}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-red-500" data-testid="text-view-lost">{player.matchesLost}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">W / L</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-md">
                  <div className={`text-lg font-bold ${player.winPercentage >= 50 ? "text-green-600" : "text-muted-foreground"}`} data-testid="text-view-winpct">
                    {player.winPercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win %</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {isAdmin && (
                <Button onClick={startEditing} data-testid="button-edit-profile">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-profile">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileField({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium truncate" data-testid={testId}>{value}</div>
    </div>
  );
}

export default function AllRankings() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [matchType, setMatchType] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [profilePlayer, setProfilePlayer] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";
  const seasonOptions = useMemo(() => getSeasonOptions(), []);
  const timeDates = useMemo(() => getTimePeriodDates(timePeriod), [timePeriod]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (clubFilter !== "all") params.set("clubId", clubFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (genderFilter !== "all" && genderFilter !== "JUNIOR") params.set("gender", genderFilter);
    if (cityFilter !== "all") params.set("city", cityFilter);
    if (countryFilter !== "all") params.set("country", countryFilter);
    if (timeDates.dateFrom) params.set("dateFrom", timeDates.dateFrom);
    if (timeDates.dateTo) params.set("dateTo", timeDates.dateTo);
    return params.toString();
  }, [clubFilter, categoryFilter, genderFilter, cityFilter, countryFilter, timeDates]);

  const { data: baselineRankings } = useQuery<RankingPlayer[]>({
    queryKey: ["/api/admin/rankings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rankings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rankings");
      return res.json();
    },
  });

  const { data: rankings, isLoading } = useQuery<RankingPlayer[]>({
    queryKey: ["/api/admin/rankings", queryParams],
    queryFn: async () => {
      const url = queryParams ? `/api/admin/rankings?${queryParams}` : "/api/admin/rankings";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rankings");
      return res.json();
    },
  });

  const uniqueClubs = useMemo(() => {
    const data = baselineRankings || rankings || [];
    return Array.from(new Map(data.map((p) => [p.clubId, { id: p.clubId, name: p.clubName }])).values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [baselineRankings, rankings]);

  const uniqueCities = useMemo(() => {
    const data = baselineRankings || rankings || [];
    const cities = new Set<string>();
    data.forEach(p => {
      if (p.userCity) cities.add(p.userCity);
      if (p.clubCity) cities.add(p.clubCity);
    });
    return Array.from(cities).sort();
  }, [baselineRankings, rankings]);

  const uniqueCountries = useMemo(() => {
    const data = baselineRankings || rankings || [];
    const countries = new Set<string>();
    data.forEach(p => {
      if (p.userCountry) countries.add(p.userCountry);
      if (p.clubCountry) countries.add(p.clubCountry);
    });
    return Array.from(countries).sort();
  }, [baselineRankings, rankings]);

  const enrichedRankings = useMemo(() => {
    if (!rankings) return [];
    return rankings.map((p) => ({
      ...p,
      matchesLost: p.matchesPlayed - p.matchesWon,
      winPercentage: p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0,
    }));
  }, [rankings]);

  const filtered = useMemo(() => {
    let result = enrichedRankings;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          p.clubName.toLowerCase().includes(q)
      );
    }

    if (ageGroupFilter === "junior") {
      result = result.filter(p => p.isJunior);
    } else if (ageGroupFilter === "adult") {
      result = result.filter(p => !p.isJunior);
    }

    if (membershipFilter !== "all") {
      result = result.filter(p => p.membershipStatus === membershipFilter);
    }

    if (verifiedFilter !== "all") {
      const isVerified = verifiedFilter === "verified";
      result = result.filter(p => p.emailVerified === isVerified);
    }

    if (genderFilter === "JUNIOR") {
      result = result.filter(p => p.isJunior);
    }

    return result.sort(
      (a, b) =>
        b.matchesWon - a.matchesWon ||
        b.winPercentage - a.winPercentage ||
        b.matchesPlayed - a.matchesPlayed
    );
  }, [enrichedRankings, searchQuery, ageGroupFilter, membershipFilter, verifiedFilter, genderFilter]);

  const rankedList = useMemo(() => {
    let currentRank = 0;
    let lastWins = -1;
    let lastPct = -1;
    return filtered.map((player, index) => {
      const isTied = player.matchesWon === lastWins && player.winPercentage === lastPct;
      if (!isTied) currentRank = index + 1;
      lastWins = player.matchesWon;
      lastPct = player.winPercentage;
      return { ...player, rank: currentRank, isTied };
    });
  }, [filtered]);

  const totalPlayers = rankedList.length;
  const totalMatches = totalPlayers > 0 ? rankedList.reduce((sum, p) => sum + p.matchesPlayed, 0) : 0;
  const avgWinRate = totalPlayers > 0 ? Math.round(rankedList.reduce((sum, p) => sum + p.winPercentage, 0) / totalPlayers) : 0;

  const hasActiveFilters =
    searchQuery.trim() ||
    clubFilter !== "all" ||
    categoryFilter !== "all" ||
    genderFilter !== "all" ||
    ageGroupFilter !== "all" ||
    cityFilter !== "all" ||
    countryFilter !== "all" ||
    membershipFilter !== "all" ||
    verifiedFilter !== "all" ||
    matchType !== "all" ||
    timePeriod !== "all";

  const activeFilterCount = [
    clubFilter !== "all",
    categoryFilter !== "all",
    genderFilter !== "all",
    ageGroupFilter !== "all",
    cityFilter !== "all",
    countryFilter !== "all",
    membershipFilter !== "all",
    verifiedFilter !== "all",
    matchType !== "all",
    timePeriod !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery("");
    setClubFilter("all");
    setCategoryFilter("all");
    setGenderFilter("all");
    setAgeGroupFilter("all");
    setCityFilter("all");
    setCountryFilter("all");
    setMembershipFilter("all");
    setVerifiedFilter("all");
    setMatchType("all");
    setTimePeriod("all");
  };

  const openProfile = (player: any) => {
    setProfilePlayer(player);
    setProfileOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Rankings"
        description="Advanced player rankings with full profile management for administrators."
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or club..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-rankings"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{activeFilterCount}</Badge>
              )}
              {filtersExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset All
              </Button>
            )}
          </div>

          {filtersExpanded && (
            <div className="border-t border-border pt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger data-testid="select-filter-country">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {uniqueCountries.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger data-testid="select-filter-city">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sex</Label>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger data-testid="select-filter-gender">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Age Group</Label>
                  <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
                    <SelectTrigger data-testid="select-filter-agegroup">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="junior">Juniors</SelectItem>
                      <SelectItem value="adult">Adults</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Grade / Level</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-filter-category">
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="A">Grade A</SelectItem>
                      <SelectItem value="B">Grade B</SelectItem>
                      <SelectItem value="C">Grade C</SelectItem>
                      <SelectItem value="D">Grade D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Club</Label>
                  <Select value={clubFilter} onValueChange={setClubFilter}>
                    <SelectTrigger data-testid="select-filter-club">
                      <SelectValue placeholder="All Clubs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs</SelectItem>
                      {uniqueClubs.map((club) => (
                        <SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Membership Status</Label>
                  <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                    <SelectTrigger data-testid="select-filter-membership">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="APPROVED">Active</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Verified</Label>
                  <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                    <SelectTrigger data-testid="select-filter-verified">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Match Type</Label>
                  <Select value={matchType} onValueChange={setMatchType}>
                    <SelectTrigger data-testid="select-filter-matchtype">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="SINGLES">Singles</SelectItem>
                      <SelectItem value="DOUBLES">Doubles</SelectItem>
                      <SelectItem value="MIXED">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time Period</Label>
                  <Select value={timePeriod} onValueChange={setTimePeriod}>
                    <SelectTrigger data-testid="select-filter-timeperiod">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="last30">Last 30 Days</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="thisSeason">This Season</SelectItem>
                      {seasonOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total Players</div>
              <div className="text-2xl font-bold" data-testid="text-total-players">{totalPlayers}</div>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total Matches</div>
              <div className="text-2xl font-bold" data-testid="text-total-matches">{totalMatches}</div>
            </div>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Avg Win Rate</div>
              <div className="text-2xl font-bold" data-testid="text-avg-winrate">{avgWinRate}%</div>
            </div>
            <Trophy className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[70px] text-center">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="hidden md:table-cell">Club</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="text-center w-[80px]">Grade</TableHead>
              <TableHead className="text-right w-[70px]">Played</TableHead>
              <TableHead className="text-right w-[90px]">W / L</TableHead>
              <TableHead className="text-right w-[80px]">Win %</TableHead>
              <TableHead className="hidden xl:table-cell w-[130px]">Achievements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell className="h-14"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell><div className="w-32 h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="hidden md:table-cell"><div className="w-20 h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell className="hidden lg:table-cell" />
                  <TableCell colSpan={5} />
                </TableRow>
              ))
            ) : rankedList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No players found</p>
                  <p className="text-sm mt-1">
                    {hasActiveFilters ? "Try adjusting your filters to see more results." : "No match data available yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rankedList.map((player) => {
                const achievements = getAchievements(player);
                const isNewEntry = player.matchesPlayed <= 3;
                const location = [player.userCity || player.clubCity, player.userCountry || player.clubCountry].filter(Boolean).join(", ");

                return (
                  <TableRow
                    key={`${player.profileId}-${player.clubId}`}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => openProfile(player)}
                    data-testid={`ranking-row-${player.profileId}`}
                  >
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        {player.rank <= 3 ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            player.rank === 1 ? "bg-amber-500 text-white" :
                            player.rank === 2 ? "bg-gray-400 text-white" :
                            "bg-amber-700 text-white"
                          }`}>
                            {player.rank}
                          </div>
                        ) : (
                          <span className={`text-lg font-bold ${player.isTied ? "text-muted-foreground" : "text-foreground"}`}>
                            {player.isTied ? `=${player.rank}` : player.rank}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                          <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold truncate flex items-center gap-1.5" data-testid={`text-player-name-${player.profileId}`}>
                            {player.fullName}
                            {isNewEntry && (
                              <Badge variant="secondary" className="text-[10px] py-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                New
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {player.gender === "MALE" ? "M" : player.gender === "FEMALE" ? "F" : ""}
                            {player.isJunior && " / Junior"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground truncate">{player.clubName}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">{player.category || "?"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{player.matchesPlayed}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="text-green-600">{player.matchesWon}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-red-500">{player.matchesLost}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold text-lg ${player.winPercentage >= 50 ? "text-green-600" : "text-muted-foreground"}`}>
                        {player.winPercentage}%
                      </span>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-1">
                        {achievements.slice(0, 3).map((a, i) => (
                          <div key={i} title={a.label}>
                            <a.icon className={`w-4 h-4 ${a.color}`} />
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {rankedList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground px-1">
          <span>{rankedList.length} player{rankedList.length !== 1 ? "s" : ""} ranked</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/40" />
              <span>New Entry (3 or fewer matches)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono">=</span>
              <span>Tied rank</span>
            </div>
          </div>
        </div>
      )}

      <PlayerProfileDialog
        player={profilePlayer}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        isAdmin={isAdmin}
      />
    </div>
  );
}

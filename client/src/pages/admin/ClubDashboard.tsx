import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import {
  ArrowLeft, Users, MapPin, Calendar, PoundSterling, Crown,
  Search, Building2, CheckCircle, Clock, XCircle, Loader2,
  Shield, Settings, Trophy, Activity, CreditCard, Star,
  ChevronRight, UserPlus, Mail, Phone, BarChart3, Zap
} from "lucide-react";
import { format } from "date-fns";

export default function ClubDashboard() {
  const params = useParams<{ clubId: string }>();
  const clubId = Number(params.clubId);
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const { data: myAdminClubs, isLoading: adminClubsLoading } = useMyAdminClubs(!!user);
  const [activeTab, setActiveTab] = useState("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");

  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMIN" || isOwner;
  const hasClubAccess = isOwner || myAdminClubs?.some((c: any) => c.id === clubId);

  const { data: club, isLoading: clubLoading } = useQuery<any>({
    queryKey: ["/api/clubs", clubId],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}`);
      if (!res.ok) throw new Error("Failed to load club");
      return res.json();
    },
    enabled: !!clubId,
  });

  const { data: members, isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && !!hasClubAccess,
  });

  const { data: venues, isLoading: venuesLoading } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "venues"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/venues`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && !!hasClubAccess,
  });

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/sessions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && !!hasClubAccess,
  });

  const { data: planData } = useQuery<any>({
    queryKey: ["/api/clubs", clubId, "plan"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/plan`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clubId && !!hasClubAccess,
  });

  const { data: membershipRequests } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "membership-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/membership-requests`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clubId && !!hasClubAccess,
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = [...members];
    if (memberSearch.trim()) {
      const q = memberSearch.trim().toLowerCase();
      result = result.filter((m: any) =>
        (m.fullName || m.user?.fullName || "").toLowerCase().includes(q) ||
        (m.email || m.user?.email || "").toLowerCase().includes(q)
      );
    }
    if (memberRoleFilter !== "all") {
      result = result.filter((m: any) => m.clubRole === memberRoleFilter);
    }
    if (memberStatusFilter !== "all") {
      result = result.filter((m: any) => m.status === memberStatusFilter);
    }
    return result;
  }, [members, memberSearch, memberRoleFilter, memberStatusFilter]);

  const totalMembers = members?.length || 0;
  const activeMembers = members?.filter((m: any) => m.status === "ACTIVE").length || 0;
  const adminCount = members?.filter((m: any) => m.clubRole === "ADMIN" || m.clubRole === "OWNER").length || 0;
  const organiserCount = members?.filter((m: any) => m.clubRole === "ORGANISER").length || 0;
  const pendingRequests = membershipRequests?.filter((r: any) => r.status === "PENDING").length || 0;
  const totalVenues = venues?.length || 0;
  const totalCourts = venues?.reduce((sum: number, v: any) => sum + (v.courtNames?.length || 0), 0) || 0;
  const upcomingSessions = sessions?.filter((s: any) => new Date(s.date) >= new Date()).length || 0;
  const completedSessions = sessions?.filter((s: any) => s.status === "COMPLETED").length || 0;
  const isPremium = planData?.plan === "PREMIUM" || planData?.planStatus === "PREMIUM";
  const planLabel = isPremium ? "Premium" : "Basic (Free)";

  if (clubLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Club not found</h2>
        <p className="text-muted-foreground mt-2">This club does not exist or you don't have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clubs")} data-testid="button-back-to-clubs">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clubs
        </Button>
      </div>
    );
  }

  if (adminClubsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasClubAccess) {
    return (
      <div className="text-center py-20">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You need admin access to manage this club.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clubs")} data-testid="button-back-to-clubs-denied">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clubs
        </Button>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      OWNER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      ORGANISER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PLAYER: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return <Badge className={`text-[10px] ${styles[role] || styles.PLAYER} no-default-hover-elevate no-default-active-elevate`}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "ACTIVE") return <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    if (status === "SUSPENDED") return <Badge variant="outline" className="text-red-600 border-red-300 text-[10px] no-default-hover-elevate no-default-active-elevate"><XCircle className="h-3 w-3 mr-1" />Suspended</Badge>;
    if (status === "PENDING") return <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    return <Badge variant="outline" className="text-gray-600 text-[10px] no-default-hover-elevate no-default-active-elevate">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(isOwner ? "/super-admin/god-mode" : "/clubs")} data-testid="button-back-club-dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold truncate" data-testid="text-club-dashboard-title">{club.name}</h1>
            {isPremium ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white no-default-hover-elevate no-default-active-elevate">
                <Crown className="h-3 w-3 mr-1" /> Premium
              </Badge>
            ) : (
              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">Basic</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[club.city, club.postcode].filter(Boolean).join(", ") || "Club Dashboard"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("members")} data-testid="kpi-total-members">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Members</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold" data-testid="value-total-members">{totalMembers}</div>
            <p className="text-[10px] text-muted-foreground">{activeMembers} active</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("members")} data-testid="kpi-admins">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Staff</span>
              <Shield className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-bold">{adminCount + organiserCount}</div>
            <p className="text-[10px] text-muted-foreground">{adminCount} admin, {organiserCount} org</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("venues")} data-testid="kpi-venues">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Venues</span>
              <MapPin className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-xl font-bold">{totalVenues}</div>
            <p className="text-[10px] text-muted-foreground">{totalCourts} court{totalCourts !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("sessions")} data-testid="kpi-sessions">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Sessions</span>
              <Calendar className="h-3.5 w-3.5 text-green-500" />
            </div>
            <div className="text-xl font-bold">{upcomingSessions}</div>
            <p className="text-[10px] text-muted-foreground">{completedSessions} completed</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="kpi-pending">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Pending</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600">{pendingRequests}</div>
            <p className="text-[10px] text-muted-foreground">join request{pendingRequests !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("billing")} data-testid="kpi-plan">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">Plan</span>
              {isPremium ? <Crown className="h-3.5 w-3.5 text-amber-500" /> : <CreditCard className="h-3.5 w-3.5 text-slate-500" />}
            </div>
            <div className={`text-sm font-bold ${isPremium ? "text-amber-600" : ""}`}>{planLabel}</div>
            <p className="text-[10px] text-muted-foreground">{isPremium ? "All features" : "Limited"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <Link href="/admin/players" data-testid="link-manage-players">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Player Management</p>
                <p className="text-[10px] text-muted-foreground">Add & manage players</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/venues" data-testid="link-manage-venues">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Venues & Courts</p>
                <p className="text-[10px] text-muted-foreground">Manage locations</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/financials" data-testid="link-manage-financials">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <PoundSterling className="h-4 w-4 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Financials</p>
                <p className="text-[10px] text-muted-foreground">Payments & revenue</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/memberships" data-testid="link-manage-memberships">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-teal-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Memberships</p>
                <p className="text-[10px] text-muted-foreground">Plans & requests</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="text-xs flex-1 min-w-[80px]" data-testid="tab-overview">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs flex-1 min-w-[80px]" data-testid="tab-members">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Members
            {totalMembers > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1 no-default-hover-elevate no-default-active-elevate">{totalMembers}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="venues" className="text-xs flex-1 min-w-[80px]" data-testid="tab-venues">
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> Venues
            {totalVenues > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1 no-default-hover-elevate no-default-active-elevate">{totalVenues}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs flex-1 min-w-[80px]" data-testid="tab-sessions">
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs flex-1 min-w-[80px]" data-testid="tab-billing">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Club Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium" data-testid="text-club-name">{club.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sport</p>
                  <p className="text-sm font-medium">{club.sportType || "Badminton"}</p>
                </div>
                {club.address && (
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{club.address}</p>
                  </div>
                )}
                {club.city && (
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="text-sm font-medium">{club.city}</p>
                  </div>
                )}
                {club.postcode && (
                  <div>
                    <p className="text-xs text-muted-foreground">Postcode</p>
                    <p className="text-sm font-medium">{club.postcode}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">{club.status || "Active"}</p>
                </div>
                {club.sessionFee != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Session Fee</p>
                    <p className="text-sm font-medium">{"\u00A3"}{(club.sessionFee / 100).toFixed(2)}</p>
                  </div>
                )}
                {club.description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{club.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeMembers}</p>
                    <p className="text-xs text-muted-foreground">Active Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{upcomingSessions}</p>
                    <p className="text-xs text-muted-foreground">Upcoming Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalVenues}</p>
                    <p className="text-xs text-muted-foreground">Venues ({totalCourts} courts)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-testid="input-member-search"
              />
            </div>
            <Select value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs" data-testid="select-member-role">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ORGANISER">Organiser</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
              </SelectContent>
            </Select>
            <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs" data-testid="select-member-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
              {filteredMembers.length} of {totalMembers}
            </Badge>
          </div>

          {membersLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading members...</p>
              </CardContent>
            </Card>
          ) : filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                {totalMembers > 0 ? "No members match your filters." : "No members found."}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Grade</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member: any, idx: number) => (
                        <TableRow key={member.id || idx} data-testid={`row-member-${member.id || idx}`}>
                          <TableCell className="text-sm font-medium">{member.fullName || member.user?.fullName || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{member.email || member.user?.email || "—"}</TableCell>
                          <TableCell>{getRoleBadge(member.clubRole || "PLAYER")}</TableCell>
                          <TableCell className="text-xs">{member.category || member.grade || "—"}</TableCell>
                          <TableCell>{getStatusBadge(member.status || "ACTIVE")}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {member.joinedAt ? format(new Date(member.joinedAt), "MMM d, yyyy") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="venues" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Venues & Courts</h3>
            <Link href="/admin/venues">
              <Button size="sm" variant="outline" className="text-xs" data-testid="button-manage-venues">
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Manage Venues
              </Button>
            </Link>
          </div>

          {venuesLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !venues || venues.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                No venues set up yet.
                <div className="mt-3">
                  <Link href="/admin/venues">
                    <Button size="sm" data-testid="button-add-venue-empty">Add Venue</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {venues.map((venue: any) => (
                <Card key={venue.id} data-testid={`card-venue-${venue.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                          <p className="text-sm font-semibold truncate">{venue.name}</p>
                          {venue.isDefault && <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">Default</Badge>}
                        </div>
                        {venue.address && <p className="text-xs text-muted-foreground mt-1">{venue.address}</p>}
                        {(venue.city || venue.postcode) && (
                          <p className="text-xs text-muted-foreground">{[venue.city, venue.postcode].filter(Boolean).join(", ")}</p>
                        )}
                      </div>
                    </div>
                    {venue.courtNames && venue.courtNames.length > 0 && (
                      <div className="mt-3 pt-2 border-t">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5">Courts ({venue.courtNames.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {venue.courtNames.map((court: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{court}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sessions</h3>
            <Link href="/sessions">
              <Button size="sm" variant="outline" className="text-xs" data-testid="button-manage-sessions">
                <Calendar className="h-3.5 w-3.5 mr-1.5" /> All Sessions
              </Button>
            </Link>
          </div>

          {!sessions || sessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                No sessions found for this club.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Time</TableHead>
                        <TableHead className="text-xs">Players</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.slice(0, 20).map((session: any) => (
                        <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                          <TableCell className="text-sm font-medium">{session.title || "Untitled"}</TableCell>
                          <TableCell className="text-xs">{session.date ? format(new Date(session.date), "MMM d, yyyy") : "—"}</TableCell>
                          <TableCell className="text-xs">{session.startTime || "—"}</TableCell>
                          <TableCell className="text-xs">{session.signupCount ?? "—"} / {session.maxPlayers ?? "—"}</TableCell>
                          <TableCell>
                            {session.status === "COMPLETED" ? (
                              <Badge variant="outline" className="text-green-600 text-[10px] no-default-hover-elevate no-default-active-elevate">Completed</Badge>
                            ) : session.status === "ACTIVE" ? (
                              <Badge variant="outline" className="text-blue-600 text-[10px] no-default-hover-elevate no-default-active-elevate">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 text-[10px] no-default-hover-elevate no-default-active-elevate">{session.status || "Upcoming"}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Club Billing & Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${isPremium ? "bg-gradient-to-br from-amber-500 to-yellow-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                  {isPremium ? <Crown className="h-7 w-7 text-white" /> : <CreditCard className="h-7 w-7 text-gray-500" />}
                </div>
                <div>
                  <p className="text-lg font-bold">{planLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPremium ? "Full access to all premium features" : "Basic features included. Upgrade for more."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Plan Status</p>
                  <div className="flex items-center gap-2">
                    {isPremium ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">{isPremium ? "Active Premium" : "Free Tier"}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Features</p>
                  <p className="text-sm font-medium">{isPremium ? "All features unlocked" : "Limited features"}</p>
                </div>
              </div>

              {!isPremium && isOwner && (
                <div className="p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Upgrade to Premium</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Unlock advanced features, analytics, rewards, and more.</p>
                    </div>
                    <Link href="/admin/billing">
                      <Button size="sm" className="shrink-0 ml-auto" data-testid="button-upgrade-plan">
                        <Zap className="h-3.5 w-3.5 mr-1.5" /> Upgrade
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link href="/admin/billing">
                  <Button variant="outline" className="w-full" data-testid="button-go-billing">
                    <Settings className="h-4 w-4 mr-2" /> Manage Billing & Plan Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

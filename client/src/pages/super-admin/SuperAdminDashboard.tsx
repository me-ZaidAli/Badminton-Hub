import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Building2, Calendar, Trophy, DollarSign,
  Shield, ArrowRight, Activity, AlertCircle, Loader2, UserCheck,
  Clock, CheckCircle, XCircle, Zap
} from "lucide-react";

interface SuperAdminStats {
  users: {
    total: number;
    byRole: { OWNER: number; ADMIN: number; ORGANISER?: number; COACH?: number; PLAYER: number };
    pendingApprovals: number;
    closedAccounts: number;
  };
  clubs: {
    total: number;
    byStatus: { APPROVED: number; PENDING: number; REJECTED: number };
    pendingApprovals: number;
  };
  sessions: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
  };
  matches: {
    total: number;
    live: number;
    completed: number;
  };
  coaches?: {
    total: number;
    active: number;
    suspended: number;
  };
  memberships: {
    totalProfiles: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  financials: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
  };
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<SuperAdminStats>({
    queryKey: ["/api/super-admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Users",
      value: stats.users.total,
      icon: Users,
      href: "/super-admin/users",
      color: "text-blue-500",
      detail: `${stats.users.pendingApprovals} pending`,
      badge: stats.users.pendingApprovals > 0 ? stats.users.pendingApprovals : null,
    },
    {
      title: "Clubs",
      value: stats.clubs.total,
      icon: Building2,
      href: "/super-admin/clubs",
      color: "text-emerald-500",
      detail: `${stats.clubs.byStatus.APPROVED} active`,
      badge: stats.clubs.pendingApprovals > 0 ? stats.clubs.pendingApprovals : null,
    },
    {
      title: "Sessions",
      value: stats.sessions.total,
      icon: Calendar,
      href: "/super-admin/sessions",
      color: "text-violet-500",
      detail: `${stats.sessions.active} live, ${stats.sessions.upcoming} upcoming`,
      badge: stats.sessions.active > 0 ? stats.sessions.active : null,
    },
    {
      title: "Matches",
      value: stats.matches.total,
      icon: Trophy,
      href: "/super-admin/sessions",
      color: "text-amber-500",
      detail: `${stats.matches.live} live, ${stats.matches.completed} completed`,
      badge: stats.matches.live > 0 ? stats.matches.live : null,
    },
    {
      title: "Revenue",
      value: `£${((stats.financials.paidRevenue || 0) / 100).toFixed(0)}`,
      icon: DollarSign,
      href: "/admin/financials",
      color: "text-green-500",
      detail: `£${((stats.financials.unpaidRevenue || 0) / 100).toFixed(0)} unpaid`,
      badge: null,
    },
  ];

  return (
    <div className="space-y-8" data-testid="super-admin-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" data-testid="text-super-admin-title">
            <Shield className="w-8 h-8 text-primary" />
            God's Mode Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Global system overview with full control access.</p>
        </div>
        <Badge variant="destructive" className="text-sm py-1.5 px-4" data-testid="badge-god-mode">
          <Zap className="h-4 w-4 mr-2" />
          GOD MODE
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover-elevate cursor-pointer relative" data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.detail}</p>
                {card.badge && (
                  <Badge variant="secondary" className="absolute top-3 right-12 text-xs">
                    {card.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-users-breakdown">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.users.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={role === "OWNER" ? "destructive" : "outline"} className="text-xs min-w-[80px] justify-center">
                      {role}
                    </Badge>
                  </div>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between text-muted-foreground text-sm">
                <span>Closed accounts</span>
                <span>{stats.users.closedAccounts}</span>
              </div>
            </div>
            <Link href="/super-admin/users">
              <Button variant="outline" className="w-full mt-4 gap-2" data-testid="button-manage-users">
                Manage All Users <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-clubs-breakdown">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              Clubs Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Approved</span>
                </div>
                <span className="font-semibold">{stats.clubs.byStatus.APPROVED}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Pending Approval</span>
                </div>
                <span className="font-semibold">{stats.clubs.byStatus.PENDING}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Rejected</span>
                </div>
                <span className="font-semibold">{stats.clubs.byStatus.REJECTED}</span>
              </div>
            </div>
            <Link href="/super-admin/clubs">
              <Button variant="outline" className="w-full mt-4 gap-2" data-testid="button-manage-clubs">
                Manage All Clubs <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-actions">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/approvals">
                <div className="flex items-center justify-between py-2 hover-elevate rounded-md px-2 cursor-pointer" data-testid="link-pending-users">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">User Approvals</span>
                  </div>
                  <Badge variant={stats.users.pendingApprovals > 0 ? "destructive" : "secondary"}>
                    {stats.users.pendingApprovals}
                  </Badge>
                </div>
              </Link>
              <Link href="/admin/club-approvals">
                <div className="flex items-center justify-between py-2 hover-elevate rounded-md px-2 cursor-pointer" data-testid="link-pending-clubs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">Club Approvals</span>
                  </div>
                  <Badge variant={stats.clubs.pendingApprovals > 0 ? "destructive" : "secondary"}>
                    {stats.clubs.pendingApprovals}
                  </Badge>
                </div>
              </Link>
              <div className="flex items-center justify-between py-2 px-2" data-testid="link-pending-memberships">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  <span className="text-sm">Pending Join Requests</span>
                </div>
                <Badge variant={stats.memberships.pending > 0 ? "destructive" : "secondary"}>
                  {stats.memberships.pending}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/super-admin/users">
                <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-users">
                  <Users className="w-4 h-4" /> Users
                </Button>
              </Link>
              <Link href="/super-admin/clubs">
                <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-clubs">
                  <Building2 className="w-4 h-4" /> Clubs
                </Button>
              </Link>
              <Link href="/super-admin/sessions">
                <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-sessions">
                  <Calendar className="w-4 h-4" /> Sessions
                </Button>
              </Link>
              <Link href="/all-rankings">
                <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-rankings">
                  <Trophy className="w-4 h-4" /> Rankings
                </Button>
              </Link>
              <Link href="/admin/financials">
                <Button variant="outline" className="w-full gap-2 justify-start" data-testid="button-quick-financials">
                  <DollarSign className="w-4 h-4" /> Financials
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

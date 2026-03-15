import { useState } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Users,
  Calendar,
  CreditCard,
  Trophy,
  BarChart3,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Star,
  Flame,
  Zap,
  Crown,
  Activity,
  DollarSign,
  PieChart,
  UserCheck,
  Gamepad2,
  LayoutDashboard,
  Medal,
  Target,
  Eye,
} from "lucide-react";

const DEMO_BANNER_TEXT = "DEMO DATA";

const DEMO_TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "sessions", label: "Sessions", icon: Calendar },
  { key: "matches", label: "Live Matches", icon: Gamepad2 },
  { key: "players", label: "Players", icon: Users },
  { key: "finances", label: "Finances", icon: CreditCard },
  { key: "rankings", label: "Rankings", icon: Trophy },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
] as const;

type DemoTab = typeof DEMO_TABS[number]["key"];

const DUMMY_SESSIONS = [
  { id: 1, title: "Wednesday Social Doubles", club: "Smashton Badminton Club", date: "Wed, 19 Mar 2026", time: "19:00", duration: 120, venue: "Springfield Sports Centre", city: "Manchester", players: 14, max: 16, status: "UPCOMING", mode: "SOCIAL" },
  { id: 2, title: "Friday Competitive Night", club: "Smashton Badminton Club", date: "Fri, 21 Mar 2026", time: "19:30", duration: 150, venue: "Springfield Sports Centre", city: "Manchester", players: 22, max: 24, status: "UPCOMING", mode: "COMPETITIVE" },
  { id: 3, title: "Beginners Welcome Session", club: "NetPlay Academy", date: "Sat, 22 Mar 2026", time: "10:00", duration: 90, venue: "Greenfield Leisure Centre", city: "Birmingham", players: 8, max: 12, status: "UPCOMING", mode: "TRAINING" },
  { id: 4, title: "Mixed Doubles League", club: "Shuttle Kings", date: "Sun, 23 Mar 2026", time: "14:00", duration: 180, venue: "Olympic Court Arena", city: "London", players: 16, max: 16, status: "UPCOMING", mode: "COMPETITIVE" },
  { id: 5, title: "Junior Training Camp", club: "NetPlay Academy", date: "Mon, 24 Mar 2026", time: "16:00", duration: 60, venue: "Greenfield Leisure Centre", city: "Birmingham", players: 6, max: 10, status: "UPCOMING", mode: "TRAINING" },
  { id: 6, title: "Thursday Night Smash", club: "Shuttle Kings", date: "Thu, 27 Mar 2026", time: "20:00", duration: 120, venue: "Olympic Court Arena", city: "London", players: 18, max: 20, status: "UPCOMING", mode: "SOCIAL" },
];

const DUMMY_LIVE_MATCHES = [
  { court: 1, teamA: ["Sarah Chen", "Tom Wright"], teamB: ["Alex Kumar", "Priya Patel"], scoreA: 18, scoreB: 15, elapsed: "14:32", status: "LIVE" },
  { court: 2, teamA: ["James Wilson", "Emma Davis"], teamB: ["Chris Taylor", "Lisa Park"], scoreA: 21, scoreB: 17, elapsed: "22:10", status: "COMPLETED" },
  { court: 3, teamA: ["Raj Singh", "Maria Garcia"], teamB: ["David Brown", "Amy Nguyen"], scoreA: 11, scoreB: 9, elapsed: "08:45", status: "LIVE" },
];

const DUMMY_QUEUED = [
  { position: 1, teamA: ["Oliver Jones", "Sophie Martin"], teamB: ["Liam White", "Chloe Green"] },
  { position: 2, teamA: ["Ethan Clark", "Mia Johnson"], teamB: ["Noah Lee", "Ava Robinson"] },
];

const DUMMY_PLAYERS = [
  { name: "Sarah Chen", grade: "A1", gender: "F", matches: 47, wins: 38, status: "Active", role: "Player" },
  { name: "Tom Wright", grade: "A2", gender: "M", matches: 52, wins: 35, status: "Active", role: "Admin" },
  { name: "Alex Kumar", grade: "B1", gender: "M", matches: 33, wins: 22, status: "Active", role: "Player" },
  { name: "Priya Patel", grade: "B2", gender: "F", matches: 28, wins: 16, status: "Active", role: "Player" },
  { name: "James Wilson", grade: "A1", gender: "M", matches: 61, wins: 49, status: "Active", role: "Player" },
  { name: "Emma Davis", grade: "B1", gender: "F", matches: 19, wins: 11, status: "Active", role: "Player" },
  { name: "Chris Taylor", grade: "C1", gender: "M", matches: 12, wins: 5, status: "Active", role: "Player" },
  { name: "Lisa Park", grade: "A3", gender: "F", matches: 40, wins: 28, status: "Active", role: "Player" },
  { name: "David Brown", grade: "C2", gender: "M", matches: 8, wins: 3, status: "Trial", role: "Player" },
  { name: "Amy Nguyen", grade: "B2", gender: "F", matches: 25, wins: 15, status: "Active", role: "Player" },
];

const DUMMY_FINANCIALS = [
  { name: "Sarah Chen", session: "Wednesday Social Doubles", fee: 9, paid: true, method: "Card" },
  { name: "Tom Wright", session: "Wednesday Social Doubles", fee: 9, paid: true, method: "Cash" },
  { name: "Alex Kumar", session: "Wednesday Social Doubles", fee: 9, paid: false, method: "-" },
  { name: "Priya Patel", session: "Friday Competitive Night", fee: 12, paid: true, method: "Transfer" },
  { name: "James Wilson", session: "Friday Competitive Night", fee: 12, paid: true, method: "Card" },
  { name: "Emma Davis", session: "Friday Competitive Night", fee: 12, paid: false, method: "-" },
  { name: "Chris Taylor", session: "Beginners Welcome Session", fee: 6, paid: true, method: "Cash" },
  { name: "Lisa Park", session: "Friday Competitive Night", fee: 12, paid: true, method: "Card" },
];

const DUMMY_RANKINGS = [
  { rank: 1, name: "James Wilson", grade: "A1", wins: 49, losses: 12, points: 159, winRate: 80, badges: ["champion", "flame", "star"] },
  { rank: 2, name: "Sarah Chen", grade: "A1", wins: 38, losses: 9, points: 123, winRate: 81, badges: ["sharpshooter", "flame"] },
  { rank: 3, name: "Lisa Park", grade: "A3", wins: 28, losses: 12, points: 96, winRate: 70, badges: ["star"] },
  { rank: 4, name: "Tom Wright", grade: "A2", wins: 35, losses: 17, points: 122, winRate: 67, badges: ["ironman", "flame"] },
  { rank: 5, name: "Alex Kumar", grade: "B1", wins: 22, losses: 11, points: 77, winRate: 67, badges: ["rising"] },
  { rank: 6, name: "Priya Patel", grade: "B2", wins: 16, losses: 12, points: 60, winRate: 57, badges: [] },
  { rank: 7, name: "Amy Nguyen", grade: "B2", wins: 15, losses: 10, points: 55, winRate: 60, badges: ["zap"] },
  { rank: 8, name: "Emma Davis", grade: "B1", wins: 11, losses: 8, points: 41, winRate: 58, badges: [] },
];

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (grade.startsWith("B")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
}

function modeColor(mode: string) {
  if (mode === "COMPETITIVE") return "border-amber-400 text-amber-600 dark:border-amber-600 dark:text-amber-400";
  if (mode === "TRAINING") return "border-violet-400 text-violet-600 dark:border-violet-600 dark:text-violet-400";
  return "border-blue-400 text-blue-600 dark:border-blue-600 dark:text-blue-400";
}

function DemoBanner() {
  return (
    <div className="bg-amber-500 text-black text-center py-2 px-4 text-sm font-bold tracking-wider" data-testid="demo-banner">
      {DEMO_BANNER_TEXT} — This page shows sample data to demonstrate the platform. <Link href="/register"><span className="underline cursor-pointer" data-testid="link-demo-banner-register">Create your free club</span></Link> to use with real data.
    </div>
  );
}

export default function Demo() {
  const [activeTab, setActiveTab] = useState<DemoTab>("dashboard");

  return (
    <PublicLayout>
      <DemoBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-demo-title">
            Platform Demo
          </h1>
          <p className="text-muted-foreground">
            Explore how BadmintonHub works with sample data. All information below is fictional.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-border/60 pb-4" data-testid="demo-tab-bar" role="tablist" aria-label="Demo sections">
          {DEMO_TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${activeTab}`}>
          {activeTab === "dashboard" && <DemoDashboard />}
          {activeTab === "sessions" && <DemoSessions />}
          {activeTab === "matches" && <DemoMatches />}
          {activeTab === "players" && <DemoPlayers />}
          {activeTab === "finances" && <DemoFinances />}
          {activeTab === "rankings" && <DemoRankings />}
          {activeTab === "analytics" && <DemoAnalytics />}
        </div>

        <div className="mt-12 text-center py-10 border-t border-border/40">
          <h2 className="text-2xl font-bold mb-3">Ready to try it for real?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Create your free club and start managing sessions, players, and finances today.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-8" data-testid="button-demo-cta">
              Create Your Free Club <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-3">No credit card required.</p>
        </div>
      </div>
    </PublicLayout>
  );
}

function DemoKpi({ label, value, trend, trendUp, icon: Icon }: { label: string; value: string; trend?: string; trendUp?: boolean; icon: any }) {
  return (
    <Card className="p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </Card>
  );
}

function SampleBadge() {
  return <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-[10px] ml-2">Sample</Badge>;
}

function DemoDashboard() {
  return (
    <div className="space-y-8" data-testid="demo-dashboard">
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-1">Welcome back, Demo User <SampleBadge /></h2>
        <p className="text-muted-foreground text-sm">Smashton Badminton Club · Premium Plan</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoKpi label="Total Sessions" value="156" trend="+12% vs last month" trendUp icon={Calendar} />
        <DemoKpi label="Active Members" value="84" trend="+5 this month" trendUp icon={Users} />
        <DemoKpi label="Matches Played" value="1,247" trend="+8% vs last month" trendUp icon={Gamepad2} />
        <DemoKpi label="Revenue (MTD)" value="£2,340" trend="+15% vs last month" trendUp icon={DollarSign} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Your Upcoming Sessions <SampleBadge /></h3>
        <div className="space-y-3">
          {DUMMY_SESSIONS.slice(0, 3).map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{s.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${modeColor(s.mode)}`}>{s.mode}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.players}/{s.max}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.venue}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="text-xs h-8" disabled data-testid={`button-demo-withdraw-${s.id}`}>Withdraw</Button>
                  <Button size="sm" className="text-xs h-8" disabled data-testid={`button-demo-view-${s.id}`}>View</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Refer &amp; Earn <SampleBadge /></h3>
            <p className="text-sm text-muted-foreground">Invite friends to join your club and earn £4 credit for each approved referral.</p>
          </div>
          <Button variant="outline" size="sm" disabled data-testid="button-demo-share-invite">Share Invite Link</Button>
        </div>
      </Card>
    </div>
  );
}

function DemoSessions() {
  return (
    <div className="space-y-6" data-testid="demo-sessions">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Session Schedule <SampleBadge /></h2>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-xs">6 sessions</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DUMMY_SESSIONS.map(s => {
          const spotsLeft = s.max - s.players;
          return (
            <Card key={s.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`demo-session-${s.id}`}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">{s.title}</h3>
                    <p className="text-xs text-primary font-medium mt-0.5">{s.club}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${modeColor(s.mode)}`}>{s.mode}</Badge>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" /><span>{s.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /><span>{s.time} · {s.duration} mins</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /><span>{s.venue}, {s.city}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{s.players}/{s.max}</span>
                  </div>
                  <Progress value={(s.players / s.max) * 100} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  <span className={`text-xs font-medium ${
                    spotsLeft === 0 ? "text-red-500" : spotsLeft <= 3 ? "text-orange-500" : "text-green-600 dark:text-green-400"
                  }`}>
                    {spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                  </span>
                  <Button size="sm" className="text-xs h-7" disabled data-testid={`button-demo-signup-${s.id}`}>
                    {spotsLeft === 0 ? "Join Waitlist" : "Sign Up"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DemoMatches() {
  return (
    <div className="space-y-8" data-testid="demo-matches">
      <div>
        <h2 className="text-xl font-bold mb-1">Live Match View <SampleBadge /></h2>
        <p className="text-sm text-muted-foreground">Wednesday Social Doubles — Smashton Badminton Club</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DemoKpi label="Live Matches" value="2" icon={Activity} />
        <DemoKpi label="Completed" value="1" icon={CheckCircle2} />
        <DemoKpi label="In Queue" value="2" icon={Clock} />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Courts <SampleBadge /></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DUMMY_LIVE_MATCHES.map((m, i) => (
            <Card key={i} className={`overflow-hidden ${m.status === "LIVE" ? "ring-2 ring-green-500/30" : ""}`} data-testid={`demo-court-${m.court}`}>
              <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between ${
                m.status === "LIVE" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted/50 text-muted-foreground"
              }`}>
                <span>Court {m.court}</span>
                <span className="flex items-center gap-1">
                  {m.status === "LIVE" && <Activity className="w-3 h-3 animate-pulse" />}
                  {m.status === "LIVE" ? m.elapsed : "Final"}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-center flex-1">
                    <p className="text-xs font-medium mb-1">{m.teamA[0]}</p>
                    <p className="text-xs text-muted-foreground">{m.teamA[1]}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3">
                    <span className={`text-2xl font-bold ${m.scoreA > m.scoreB ? "text-green-600" : ""}`}>{m.scoreA}</span>
                    <span className="text-muted-foreground text-sm">-</span>
                    <span className={`text-2xl font-bold ${m.scoreB > m.scoreA ? "text-green-600" : ""}`}>{m.scoreB}</span>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs font-medium mb-1">{m.teamB[0]}</p>
                    <p className="text-xs text-muted-foreground">{m.teamB[1]}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Match Queue <SampleBadge /></h3>
        <div className="space-y-3">
          {DUMMY_QUEUED.map(q => (
            <Card key={q.position} className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">#{q.position}</div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm"><span className="font-medium">{q.teamA[0]}</span> &amp; <span className="font-medium">{q.teamA[1]}</span></span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="text-sm"><span className="font-medium">{q.teamB[0]}</span> &amp; <span className="font-medium">{q.teamB[1]}</span></span>
                </div>
                <Badge variant="secondary" className="text-[10px]">Waiting</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoPlayers() {
  return (
    <div className="space-y-6" data-testid="demo-players">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Player Management <SampleBadge /></h2>
        <Badge variant="secondary">{DUMMY_PLAYERS.length} members</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoKpi label="Total Members" value="84" icon={Users} />
        <DemoKpi label="Active Players" value="78" icon={UserCheck} />
        <DemoKpi label="Avg Win Rate" value="62%" icon={Target} />
        <DemoKpi label="New This Month" value="5" trend="+2 vs last month" trendUp icon={TrendingUp} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="demo-player-table">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="pb-3 font-medium text-muted-foreground">Player</th>
              <th className="pb-3 font-medium text-muted-foreground">Grade</th>
              <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Gender</th>
              <th className="pb-3 font-medium text-muted-foreground">Matches</th>
              <th className="pb-3 font-medium text-muted-foreground">Wins</th>
              <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Win %</th>
              <th className="pb-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_PLAYERS.map((p, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {p.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.role === "Admin" && <span className="text-[10px] text-primary font-medium">Admin</span>}
                    </div>
                  </div>
                </td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(p.grade)}`}>{p.grade}</span></td>
                <td className="py-3 hidden sm:table-cell text-muted-foreground">{p.gender === "M" ? "Male" : "Female"}</td>
                <td className="py-3">{p.matches}</td>
                <td className="py-3">{p.wins}</td>
                <td className="py-3 hidden md:table-cell">{p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0}%</td>
                <td className="py-3">
                  <Badge variant={p.status === "Active" ? "secondary" : "outline"} className={`text-[10px] ${
                    p.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "text-amber-600"
                  }`}>{p.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemoFinances() {
  const totalPledged = DUMMY_FINANCIALS.reduce((sum, f) => sum + f.fee, 0);
  const totalPaid = DUMMY_FINANCIALS.filter(f => f.paid).reduce((sum, f) => sum + f.fee, 0);
  const totalUnpaid = totalPledged - totalPaid;

  return (
    <div className="space-y-6" data-testid="demo-finances">
      <h2 className="text-xl font-bold">Financial Dashboard <SampleBadge /></h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoKpi label="Total Pledged" value={`£${totalPledged}`} icon={DollarSign} />
        <DemoKpi label="Received" value={`£${totalPaid}`} icon={CheckCircle2} />
        <DemoKpi label="Outstanding" value={`£${totalUnpaid}`} icon={AlertCircle} />
        <DemoKpi label="Collection Rate" value={`${Math.round((totalPaid / totalPledged) * 100)}%`} trend="+3% vs last month" trendUp icon={PieChart} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Breakdown <SampleBadge /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="demo-finance-table">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Player</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Session</th>
                  <th className="pb-3 font-medium text-muted-foreground">Fee</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Method</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_FINANCIALS.map((f, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3 font-medium">{f.name}</td>
                    <td className="py-3 hidden sm:table-cell text-muted-foreground text-xs">{f.session}</td>
                    <td className="py-3">£{f.fee}</td>
                    <td className="py-3">
                      {f.paid ? (
                        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-red-300 text-red-600">Unpaid</Badge>
                      )}
                    </td>
                    <td className="py-3 hidden md:table-cell text-muted-foreground">{f.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DemoRankings() {
  const badgeIcon = (b: string) => {
    switch (b) {
      case "champion": return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
      case "sharpshooter": return <Target className="w-3.5 h-3.5 text-red-500" />;
      case "flame": return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case "star": return <Star className="w-3.5 h-3.5 text-purple-500" />;
      case "ironman": return <Medal className="w-3.5 h-3.5 text-gray-500" />;
      case "rising": return <Zap className="w-3.5 h-3.5 text-green-500" />;
      case "zap": return <Zap className="w-3.5 h-3.5 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8" data-testid="demo-rankings">
      <h2 className="text-xl font-bold">Player Rankings <SampleBadge /></h2>

      <div className="flex items-end justify-center gap-4 mb-8">
        {[1, 0, 2].map(idx => {
          const p = DUMMY_RANKINGS[idx];
          const heights = ["h-28", "h-36", "h-24"];
          const bgColors = ["bg-yellow-100 dark:bg-yellow-900/20", "bg-yellow-50 dark:bg-yellow-900/10", "bg-orange-50 dark:bg-orange-900/10"];
          return (
            <div key={p.rank} className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mx-auto mb-2">
                {p.name.split(" ").map(n => n[0]).join("")}
              </div>
              <p className="text-sm font-semibold mb-1">{p.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{p.wins}W · {p.winRate}%</p>
              <div className={`${heights[idx === 0 ? 1 : idx === 1 ? 0 : 2]} w-24 rounded-t-lg ${bgColors[idx === 0 ? 1 : idx === 1 ? 0 : 2]} flex items-center justify-center border border-border/40`}>
                <div className="text-center">
                  <Crown className={`w-5 h-5 mx-auto mb-1 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-orange-500"}`} />
                  <span className="text-lg font-bold">{p.rank}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="demo-ranking-table">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="pb-3 font-medium text-muted-foreground w-12">#</th>
              <th className="pb-3 font-medium text-muted-foreground">Player</th>
              <th className="pb-3 font-medium text-muted-foreground">Grade</th>
              <th className="pb-3 font-medium text-muted-foreground">W/L</th>
              <th className="pb-3 font-medium text-muted-foreground hidden sm:table-cell">Win %</th>
              <th className="pb-3 font-medium text-muted-foreground">Points</th>
              <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Badges</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_RANKINGS.map(p => (
              <tr key={p.rank} className={`border-b border-border/30 ${p.rank <= 3 ? "bg-primary/5" : ""}`}>
                <td className="py-3 font-bold text-primary">{p.rank}</td>
                <td className="py-3 font-medium">{p.name}</td>
                <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gradeColor(p.grade)}`}>{p.grade}</span></td>
                <td className="py-3">{p.wins}/{p.losses}</td>
                <td className="py-3 hidden sm:table-cell">{p.winRate}%</td>
                <td className="py-3 font-semibold">{p.points}</td>
                <td className="py-3 hidden md:table-cell">
                  <div className="flex gap-1">
                    {p.badges.map((b, i) => <span key={i} title={b}>{badgeIcon(b)}</span>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DemoAnalytics() {
  const barData = [
    { label: "Jan", value: 82 },
    { label: "Feb", value: 95 },
    { label: "Mar", value: 78 },
    { label: "Apr", value: 110 },
    { label: "May", value: 124 },
    { label: "Jun", value: 98 },
  ];
  const maxVal = Math.max(...barData.map(d => d.value));

  const sessionData = [
    { label: "Social", value: 45, color: "bg-blue-500" },
    { label: "Competitive", value: 35, color: "bg-amber-500" },
    { label: "Training", value: 20, color: "bg-violet-500" },
  ];

  return (
    <div className="space-y-8" data-testid="demo-analytics">
      <h2 className="text-xl font-bold">Analytics Dashboard <SampleBadge /></h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoKpi label="Total Sessions" value="156" trend="+12%" trendUp icon={Calendar} />
        <DemoKpi label="Total Revenue" value="£14,820" trend="+18%" trendUp icon={DollarSign} />
        <DemoKpi label="Avg Players/Session" value="14.2" trend="+0.8" trendUp icon={Users} />
        <DemoKpi label="Fill Rate" value="78%" trend="-2%" trendUp={false} icon={PieChart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Monthly Signups <SampleBadge /></h3>
          <div className="flex items-end gap-3 h-40">
            {barData.map(d => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">{d.value}</span>
                <div
                  className="w-full bg-primary/80 rounded-t-md transition-all"
                  style={{ height: `${(d.value / maxVal) * 100}%` }}
                />
                <span className="text-xs text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Session Types <SampleBadge /></h3>
          <div className="space-y-4 mt-6">
            {sessionData.map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{d.label}</span>
                  <span className="font-medium">{d.value}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${d.color} rounded-full transition-all`} style={{ width: `${d.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Top Performing Sessions <SampleBadge /></h3>
        <div className="space-y-3">
          {[
            { name: "Friday Competitive Night", avg: 22, fill: 92 },
            { name: "Thursday Night Smash", avg: 18, fill: 90 },
            { name: "Wednesday Social Doubles", avg: 14, fill: 88 },
            { name: "Mixed Doubles League", avg: 16, fill: 100 },
            { name: "Beginners Welcome Session", avg: 8, fill: 67 },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm font-medium w-8 text-muted-foreground">#{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.avg} avg · {s.fill}% fill</span>
                </div>
                <Progress value={s.fill} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">AI Insight <SampleBadge /></h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your Friday Competitive Night sessions consistently hit 90%+ capacity. Consider adding a second Friday session or increasing court count to reduce waitlist pressure. Revenue per player is 33% higher in competitive sessions compared to social ones.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
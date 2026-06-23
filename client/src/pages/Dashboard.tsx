import { useState, useMemo, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useClubs } from "@/hooks/use-clubs";
import { useClubPlan } from "@/hooks/use-club-plan";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link, Redirect, useLocation } from "wouter";
import { format, isFuture, isPast, startOfMonth, subMonths, endOfMonth, isWithinInterval, formatDistanceToNow } from "date-fns";
import {
  Calendar, Trophy, Zap, Users, Clock, Loader2, ChevronRight, ChevronLeft, Activity, Megaphone, Eye, LogOut,
  MapPin, Swords, Crown, Medal, ArrowUpRight, ArrowDownRight, Sparkles, Target, MessageSquare,
  Newspaper, Tag, ExternalLink, Heart, MessageCircle, Flame, Star, TrendingUp, type LucideIcon,
} from "lucide-react";
import heroAction from "@assets/stock_images/badminton_hero_3.jpg";
import heroCourt from "@assets/stock_images/badminton_hero_1.jpg";
import heroFeathers from "@assets/stock_images/badminton_hero_5.jpg";
import heroRacket from "@assets/stock_images/badminton_hero_2.jpg";

const GOLD = "#EAB308";
const HERO_IMAGES = [heroAction, heroCourt, heroFeathers, heroRacket];

type Deal = { brand: string; offer: string; url: string; category: string; imageUrl?: string; sponsored?: boolean };
type NewsItem = { title: string; source: string; url: string; summary: string; publishedAt?: string; imageUrl?: string };
type CommunityPost = { id: number; content: string; images?: string[]; createdAt: string; authorName: string; likeCount: number; commentCount: number };

function GlassCard({ children, className = "", testId }: { children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, action }: { icon?: LucideIcon; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid place-items-center h-9 w-9 rounded-xl shrink-0" style={{ background: "rgba(234,179,8,0.12)", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.3)" }}>
            <Icon className="h-4.5 w-4.5" style={{ color: GOLD }} />
          </span>
        )}
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-sm text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: clubs } = useClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  useEffect(() => {
    if (!selectedClubId) {
      if (user?.playerProfile?.clubId) {
        setSelectedClubId(user.playerProfile.clubId.toString());
      } else if (clubs && clubs.length > 0) {
        setSelectedClubId(clubs[0].id.toString());
      }
    }
  }, [user?.playerProfile?.clubId, selectedClubId, clubs]);

  if (userLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Loading..." description="Please wait while we load your dashboard." />
      </div>
    );
  }

  const playerProfile = user?.playerProfile;
  const playerProfiles = user?.playerProfiles || [];
  const membershipStatus = playerProfile?.membershipStatus;
  const isPlatformAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const hasClubAdminRole = playerProfiles.some((p: any) => p.clubRole === "ADMIN" || p.clubRole === "OWNER");
  const hasApprovedMembership = playerProfiles.some((p: any) => p.membershipStatus === "APPROVED");
  const canAccessDashboard = isPlatformAdmin || hasClubAdminRole || hasApprovedMembership;

  if (!canAccessDashboard) {
    if (membershipStatus === "PENDING") return <Redirect to="/pending-approval" />;
    if (membershipStatus === "REJECTED") return <Redirect to="/clubs" />;
    if (!playerProfile) return <Redirect to="/clubs" />;
  }

  const firstApprovedProfile = playerProfiles.find((p: any) => p.membershipStatus === "APPROVED");
  const effectiveClubId = selectedClubId
    ? Number(selectedClubId)
    : (playerProfile?.clubId || firstApprovedProfile?.clubId || null);

  return (
    <DashboardContent
      user={user!}
      clubs={clubs || []}
      effectiveClubId={effectiveClubId}
      onClubChange={setSelectedClubId}
    />
  );
}

function DashboardContent({
  user,
  clubs,
  effectiveClubId,
  onClubChange,
}: {
  user: any;
  clubs: any[];
  effectiveClubId: number | null;
  onClubChange: (v: string) => void;
}) {
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isPremium } = useClubPlan(effectiveClubId);

  const { data: mySessions, isLoading: mySessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/my-sessions"],
    staleTime: 60_000,
  });
  const { data: activity } = useQuery<{ totalSessions: number; sessionsThisMonth: number; totalSpent: number }>({
    queryKey: ["/api/my-session-activity"],
    enabled: !!user,
  });
  const { data: allAnnouncements } = useQuery<any[]>({ queryKey: ["/api/announcements"] });
  const { data: archivedAnnouncementIds } = useQuery<number[]>({ queryKey: ["/api/announcements/my-archives"], enabled: !!user });
  const { data: dealsData, isLoading: dealsLoading } = useQuery<{ deals: Deal[] }>({ queryKey: ["/api/daily-content/deals"], staleTime: 30 * 60_000 });
  const { data: newsData, isLoading: newsLoading } = useQuery<{ items: NewsItem[] }>({ queryKey: ["/api/daily-content/news"], staleTime: 30 * 60_000 });
  const { data: communityPosts } = useQuery<CommunityPost[]>({
    queryKey: [`/api/community/posts?clubId=${effectiveClubId}`],
    enabled: !!effectiveClubId,
  });

  const withdrawMutation = useMutation({
    mutationFn: async (sessionId: number) => { await apiRequest("POST", `/api/sessions/${sessionId}/withdraw`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-session-activity"] });
      setSelectedSession(null);
      toast({ title: "Withdrawn", description: "You have been removed from this session." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to withdraw", variant: "destructive" }),
  });

  const firstName = (user?.fullName || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const clubName = useMemo(() => clubs.find((c) => c.id === effectiveClubId)?.name || "Your Club", [clubs, effectiveClubId]);

  const profile = user?.playerProfile;
  const grade = profile?.grade || profile?.category || "—";
  const matchesPlayed = profile?.matchesPlayed ?? 0;
  const matchesWon = profile?.matchesWon ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;

  const activeAnnouncements = useMemo(() => {
    const archivedSet = new Set(archivedAnnouncementIds || []);
    return (allAnnouncements || []).filter(
      (a) => !archivedSet.has(a.id) && (a.clubId == null || a.clubId === effectiveClubId),
    );
  }, [allAnnouncements, archivedAnnouncementIds, effectiveClubId]);

  const mySessionsList = useMemo(() => mySessions || [], [mySessions]);
  const myUpcomingSessions = useMemo(() => {
    return mySessionsList
      .filter((s) => isFuture(new Date(s.sessionDate)) || s.sessionStatus === "ACTIVE")
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  }, [mySessionsList]);
  const myUpcomingCount = myUpcomingSessions.length;
  const nextSession = myUpcomingSessions[0] || null;

  const sessionsThisMonth = useMemo(() => {
    if (typeof activity?.sessionsThisMonth === "number") return activity.sessionsThisMonth;
    const monthStart = startOfMonth(new Date());
    return mySessionsList.filter((s) => new Date(s.sessionDate) >= monthStart).length;
  }, [activity, mySessionsList]);

  const sessionsThisMonthChange = useMemo(() => {
    const now = new Date();
    const lastStart = startOfMonth(subMonths(now, 1));
    const lastEnd = endOfMonth(subMonths(now, 1));
    const lastMonth = mySessionsList.filter((s) => isWithinInterval(new Date(s.sessionDate), { start: lastStart, end: lastEnd })).length;
    if (lastMonth === 0) return sessionsThisMonth > 0 ? 100 : 0;
    return Math.round(((sessionsThisMonth - lastMonth) / lastMonth) * 100);
  }, [mySessionsList, sessionsThisMonth]);

  const deals = dealsData?.deals || [];
  const news = newsData?.items || [];
  const featuredNews = news[0] || null;
  const trendingNews = news.slice(1, 4);
  const posts = (communityPosts || []).slice(0, 5);

  // rotating hero background
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), 6500);
    return () => clearInterval(id);
  }, []);

  const dealsScrollRef = useRef<HTMLDivElement>(null);
  const scrollDeals = (dir: number) => {
    dealsScrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const quickActions: { label: string; desc: string; href: string; icon: LucideIcon; from: string; to: string }[] = [
    { label: "Join Session", desc: "Book your next game", href: "/sessions", icon: Zap, from: "#f59e0b", to: "#ea580c" },
    { label: "View Rankings", desc: "See where you stand", href: "/rankings", icon: Trophy, from: "#6366f1", to: "#8b5cf6" },
    { label: "Enter Tournament", desc: "Compete for glory", href: "/tournaments", icon: Swords, from: "#06b6d4", to: "#3b82f6" },
    { label: "Community Hub", desc: "Connect with members", href: "/community", icon: Users, from: "#10b981", to: "#059669" },
  ];

  function discountPct(offer: string): string | null {
    const m = offer.match(/(\d{1,2})\s*%/);
    return m ? `${m[1]}% OFF` : null;
  }

  return (
    <div className="rounded-3xl text-white overflow-hidden -mx-1 sm:mx-0" style={{ background: "#0B0F17" }} data-testid="dashboard-premium">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* club selector */}
      {clubs.length > 1 && (
        <div className="flex justify-end px-4 sm:px-6 lg:px-8 pt-4">
          <Select value={effectiveClubId?.toString() || ""} onValueChange={onClubChange}>
            <SelectTrigger className="w-[200px] h-9 bg-white/5 border-white/10 text-white" data-testid="select-dashboard-club">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (<SelectItem key={club.id} value={club.id.toString()}>{club.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8 space-y-10">
        {/* 1. HERO */}
        <section className="relative rounded-3xl overflow-hidden border border-white/10 min-h-[420px] sm:min-h-[460px] lg:min-h-[480px] flex" data-testid="section-hero">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDuration: "1200ms" }}
            >
              <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(11,15,23,0.95) 0%, rgba(11,15,23,0.78) 38%, rgba(11,15,23,0.35) 75%, rgba(11,15,23,0.2) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(11,15,23,0.85) 0%, rgba(11,15,23,0) 45%)" }} />

          <div className="relative z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-12 w-full">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70 mb-4">
              <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} /> {clubName}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]" data-testid="text-greeting">
              {greeting},<br className="sm:hidden" /> <span style={{ color: GOLD }}>{firstName}</span>
            </h1>
            <div className="mt-3">
              <Badge className="border text-xs font-semibold gap-1.5" style={{ background: "rgba(234,179,8,0.15)", color: GOLD, borderColor: "rgba(234,179,8,0.4)" }}>
                <Crown className="w-3.5 h-3.5" /> {isPremium ? "Premium Member" : "Basic Member"}
              </Badge>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" style={{ color: GOLD }} /><strong className="font-bold">{myUpcomingCount}</strong> Upcoming {myUpcomingCount === 1 ? "Session" : "Sessions"}</span>
              <span className="flex items-center gap-2"><Tag className="w-4 h-4" style={{ color: GOLD }} /><strong className="font-bold">{deals.length}</strong> {deals.length === 1 ? "Deal" : "Deals"} Today</span>
              <span className="flex items-center gap-2"><Newspaper className="w-4 h-4" style={{ color: GOLD }} /><strong className="font-bold">{news.length}</strong> News {news.length === 1 ? "Story" : "Stories"}</span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" className="h-12 px-7 font-bold border-0 text-black hover:opacity-90" style={{ background: GOLD }} onClick={() => navigate("/sessions")} data-testid="button-join-session">
                <Zap className="w-4 h-4 mr-2" /> Join Session
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 font-bold bg-white/10 border-white/25 text-white hover:bg-white/20 backdrop-blur" onClick={() => navigate("/my-sessions")} data-testid="button-view-schedule">
                <Calendar className="w-4 h-4 mr-2" /> View Schedule
              </Button>
            </div>
          </div>

          {/* image dots */}
          <div className="absolute bottom-5 right-6 z-10 flex gap-1.5">
            {HERO_IMAGES.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === heroIdx ? "w-6" : "w-1.5 bg-white/30"}`} style={i === heroIdx ? { background: GOLD } : undefined} />
            ))}
          </div>
        </section>

        {/* 2. DEALS & OFFERS */}
        <section>
          <SectionHeading
            icon={Tag}
            title="Deals & Offers"
            subtitle="AI-curated badminton gear deals, updated daily"
            action={
              <div className="hidden sm:flex gap-2">
                <Button size="icon" variant="outline" className="h-9 w-9 bg-white/5 border-white/15 text-white hover:bg-white/10" onClick={() => scrollDeals(-1)} data-testid="button-deals-prev"><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" className="h-9 w-9 bg-white/5 border-white/15 text-white hover:bg-white/10" onClick={() => scrollDeals(1)} data-testid="button-deals-next"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            }
          />
          {dealsLoading ? (
            <div className="flex gap-4">{[0, 1, 2].map((i) => <div key={i} className="min-w-[280px] h-72 rounded-2xl bg-white/5 animate-pulse" />)}</div>
          ) : deals.length > 0 ? (
            <div ref={dealsScrollRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
              {deals.map((deal, i) => {
                const pct = discountPct(deal.offer);
                return (
                  <a
                    key={i}
                    href={deal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group min-w-[260px] max-w-[280px] sm:min-w-[280px] snap-start"
                    data-testid={`deal-card-${i}`}
                  >
                    <GlassCard className="overflow-hidden h-full transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-white/25 group-hover:shadow-[0_20px_60px_rgba(234,179,8,0.12)]">
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                        {deal.imageUrl ? (
                          <img src={deal.imageUrl} alt={deal.offer} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
                        ) : (
                          <div className="w-full h-full grid place-items-center"><Tag className="w-12 h-12 text-white/15" /></div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          {pct && <Badge className="border-0 text-black font-bold text-[11px]" style={{ background: GOLD }}>{pct}</Badge>}
                          {deal.sponsored && <Badge className="border text-[10px] font-semibold gap-1" style={{ background: "rgba(234,179,8,0.2)", color: GOLD, borderColor: "rgba(234,179,8,0.4)" }}><Star className="w-3 h-3" /> Sponsor</Badge>}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{deal.category}</div>
                        <div className="font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">{deal.offer}</div>
                        <div className="text-sm text-white/50 mt-1">by {deal.brand}</div>
                        <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: GOLD }}>
                          View Deal <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </GlassCard>
                  </a>
                );
              })}
            </div>
          ) : (
            <GlassCard className="p-8 text-center"><Tag className="h-8 w-8 mx-auto mb-2 text-white/30" /><p className="text-sm text-white/50">No deals available right now.</p></GlassCard>
          )}
        </section>

        {/* 3. UPCOMING SESSION */}
        <section>
          <SectionHeading
            icon={Calendar}
            title="Your Next Session"
            action={<Link href="/my-sessions"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-all-sessions">All sessions <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>}
          />
          {mySessionsLoading ? (
            <GlassCard className="h-44 animate-pulse" />
          ) : nextSession ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10" data-testid="card-next-session">
              <img src={heroCourt} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(11,15,23,0.96) 30%, rgba(11,15,23,0.7) 100%)" }} />
              <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl border border-white/15 bg-white/[0.06] shrink-0 backdrop-blur">
                  <span className="text-[11px] uppercase tracking-wider text-white/50">{format(new Date(nextSession.sessionDate), "MMM")}</span>
                  <span className="text-3xl font-bold leading-none mt-0.5" style={{ color: GOLD }}>{format(new Date(nextSession.sessionDate), "d")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl sm:text-2xl font-bold truncate">{nextSession.sessionTitle}</h3>
                    {nextSession.sessionStatus === "ACTIVE" && <Badge className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/40 text-[10px]">Live</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" style={{ color: GOLD }} />{format(new Date(nextSession.sessionDate), "EEE, dd MMM yyyy")}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" style={{ color: GOLD }} />{nextSession.sessionStartTime}</span>
                    {(nextSession.venueName || nextSession.clubName) && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: GOLD }} />{nextSession.venueName || nextSession.clubName}</span>}
                    {typeof nextSession.courtsAvailable === "number" && <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" style={{ color: GOLD }} />{nextSession.courtsAvailable} courts</span>}
                    {typeof nextSession.confirmedCount === "number" && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" style={{ color: GOLD }} />{nextSession.confirmedCount}{typeof nextSession.maxPlayers === "number" ? ` / ${nextSession.maxPlayers}` : ""} registered</span>}
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0">
                  <Button className="font-bold border-0 text-black hover:opacity-90" style={{ background: GOLD }} onClick={() => navigate(`/sessions/${nextSession.sessionId}`)} data-testid="button-view-next-session"><Eye className="w-4 h-4 mr-2" /> View Session</Button>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setSelectedSession(nextSession)} data-testid="button-withdraw-next-session"><LogOut className="w-4 h-4 mr-2" /> Withdraw</Button>
                </div>
              </div>
            </div>
          ) : (
            <GlassCard className="p-10 text-center" testId="empty-next-session">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-white/30" />
              <p className="font-semibold text-lg">No upcoming sessions</p>
              <p className="text-sm text-white/50 mt-1">Browse what's on and book your next game.</p>
              <Button className="mt-5 font-bold border-0 text-black hover:opacity-90" style={{ background: GOLD }} onClick={() => navigate("/sessions")} data-testid="button-browse-sessions">Browse Sessions</Button>
            </GlassCard>
          )}
        </section>

        {/* 4. BADMINTON NEWS */}
        <section>
          <SectionHeading icon={Newspaper} title="Badminton News" subtitle="AI-aggregated from across the badminton world" />
          {newsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><div className="h-80 rounded-2xl bg-white/5 animate-pulse" /><div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div></div>
          ) : featuredNews ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <a href={featuredNews.url} target="_blank" rel="noopener noreferrer" className="group" data-testid="news-featured">
                <GlassCard className="overflow-hidden h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/25">
                  <div className="relative h-56 sm:h-64 overflow-hidden bg-white/[0.04]">
                    {featuredNews.imageUrl ? (
                      <img src={featuredNews.imageUrl} alt={featuredNews.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><Newspaper className="w-16 h-16 text-white/10" /></div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(11,15,23,0.9) 0%, rgba(11,15,23,0) 60%)" }} />
                    <Badge className="absolute top-3 left-3 border-0 text-black font-bold text-[10px]" style={{ background: GOLD }}>FEATURED</Badge>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                      <span className="font-semibold text-white/60">{featuredNews.source}</span>
                      {featuredNews.publishedAt && <><span>·</span><span>{featuredNews.publishedAt}</span></>}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold leading-snug line-clamp-2">{featuredNews.title}</h3>
                    <p className="text-sm text-white/50 mt-2 line-clamp-2">{featuredNews.summary}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: GOLD }}>Read More <ArrowUpRight className="w-4 h-4" /></div>
                  </div>
                </GlassCard>
              </a>
              <div className="flex flex-col gap-3">
                {trendingNews.length > 0 ? trendingNews.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="group flex-1" data-testid={`news-trending-${i}`}>
                    <GlassCard className="p-3 h-full flex gap-3 items-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-white/25">
                      <div className="h-20 w-24 rounded-xl overflow-hidden shrink-0 bg-white/[0.04]">
                        {n.imageUrl ? <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget.style.display = "none"); }} /> : <div className="w-full h-full grid place-items-center"><Newspaper className="w-7 h-7 text-white/10" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-1"><TrendingUp className="w-3 h-3" style={{ color: GOLD }} /><span className="font-medium text-white/60">{n.source}</span></div>
                        <div className="font-semibold text-sm leading-snug line-clamp-2">{n.title}</div>
                      </div>
                    </GlassCard>
                  </a>
                )) : <GlassCard className="p-6 text-center text-sm text-white/50 flex-1 grid place-items-center">More stories coming soon.</GlassCard>}
              </div>
            </div>
          ) : (
            <GlassCard className="p-8 text-center"><Newspaper className="h-8 w-8 mx-auto mb-2 text-white/30" /><p className="text-sm text-white/50">No news available right now.</p></GlassCard>
          )}
        </section>

        {/* 5. QUICK ACTIONS */}
        <section>
          <SectionHeading icon={Zap} title="Quick Actions" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <GlassCard className="group relative overflow-hidden p-5 sm:p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25" testId={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-40 transition-opacity duration-300 group-hover:opacity-70" style={{ background: `radial-gradient(circle, ${action.to}, transparent 70%)` }} />
                    <div className="relative">
                      <div className="grid place-items-center h-12 w-12 rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${action.from}, ${action.to})` }}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-bold text-sm sm:text-base">{action.label}</div>
                      <div className="text-xs text-white/50 mt-0.5">{action.desc}</div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 6 + 7. ANNOUNCEMENTS + PERFORMANCE */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* announcements timeline */}
          <div className="lg:col-span-2">
            <SectionHeading icon={Megaphone} title="Club Announcements" action={<Link href="/announcements"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-view-all-announcements">View All <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>} />
            {activeAnnouncements.length > 0 ? (
              <GlassCard className="p-5 sm:p-6">
                <div className="relative pl-6">
                  <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" />
                  <div className="space-y-6">
                    {activeAnnouncements.slice(0, 3).map((a) => (
                      <Link key={a.id} href="/announcements">
                        <div className="relative group cursor-pointer" data-testid={`announcement-${a.id}`}>
                          <span className="absolute -left-[22px] top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0B0F17]" style={{ background: GOLD }} />
                          <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                            <span>{format(new Date(a.createdAt), "MMM d, yyyy")}</span>
                            {a.author?.fullName && <><span>·</span><span>{a.author.fullName}</span></>}
                          </div>
                          <div className="font-semibold group-hover:text-white transition-colors">{a.title}</div>
                          <p className="text-sm text-white/50 line-clamp-2 mt-0.5">{a.content}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-8 text-center" testId="empty-announcements"><Megaphone className="h-8 w-8 mx-auto mb-2 text-white/30" /><p className="text-sm text-white/50">No announcements right now.</p></GlassCard>
            )}
          </div>

          {/* performance snapshot */}
          <div>
            <SectionHeading icon={Target} title="Performance" />
            <div className="space-y-3">
              <GlassCard className="p-5" testId="kpi-sessions-month">
                <div className="flex items-center justify-between mb-3"><span className="text-xs uppercase tracking-wider text-white/40">Sessions This Month</span><Calendar className="w-4 h-4 text-white/30" /></div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{sessionsThisMonth}</span>
                  {sessionsThisMonthChange !== 0 && (
                    <Badge className={`text-[10px] gap-0.5 border ${sessionsThisMonthChange > 0 ? "text-emerald-200 bg-emerald-500/15 border-emerald-300/30" : "text-rose-200 bg-rose-500/15 border-rose-300/30"}`}>
                      {sessionsThisMonthChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(sessionsThisMonthChange)}%
                    </Badge>
                  )}
                </div>
              </GlassCard>
              <Link href="/rankings">
                <GlassCard className="p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25" testId="kpi-ranking">
                  <div className="flex items-center justify-between mb-3"><span className="text-xs uppercase tracking-wider text-white/40">Current Ranking</span><Medal className="w-4 h-4 text-white/30" /></div>
                  <div className="flex items-baseline gap-2"><span className="text-3xl font-bold tabular-nums">Grade {grade}</span></div>
                </GlassCard>
              </Link>
              <GlassCard className="p-5" testId="kpi-win-rate">
                <div className="flex items-center justify-between mb-3"><span className="text-xs uppercase tracking-wider text-white/40">Win Rate</span><Trophy className="w-4 h-4 text-white/30" /></div>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-bold tabular-nums" style={{ color: GOLD }}>{winRate}</span><span className="text-lg font-semibold text-white/40">%</span></div>
                <p className="text-xs text-white/40 mt-1">{matchesWon} of {matchesPlayed} matches won</p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* 8. COMMUNITY ACTIVITY */}
        <section>
          <SectionHeading icon={MessageSquare} title="Community Activity" subtitle="What's happening at your club" action={<Link href="/community"><Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10" data-testid="button-view-community">Open Community <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>} />
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {posts.slice(0, 4).map((p) => (
                <Link key={p.id} href="/community">
                  <GlassCard className="group p-4 h-full flex gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25" testId={`community-post-${p.id}`}>
                    <div className="grid place-items-center h-10 w-10 rounded-full shrink-0 font-bold text-sm text-black" style={{ background: GOLD }}>
                      {(p.authorName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-white/40 mb-0.5">
                        <span className="font-semibold text-white/80">{p.authorName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                      </div>
                      <p className="text-sm text-white/70 line-clamp-2">{p.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.likeCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.commentCount}</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/community">
              <GlassCard className="group p-10 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-white/25" testId="empty-community">
                <div className="grid place-items-center h-14 w-14 rounded-2xl mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(234,179,8,0.12)", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.3)" }}>
                  <MessageSquare className="h-7 w-7" style={{ color: GOLD }} />
                </div>
                <p className="font-semibold text-lg">Join the conversation</p>
                <p className="text-sm text-white/50 mt-1 max-w-sm mx-auto">Be the first to post, share match results and connect with fellow members.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: GOLD }}>Open Community <ChevronRight className="w-4 h-4" /></span>
              </GlassCard>
            </Link>
          )}
        </section>
      </div>

      {/* Session withdraw dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="sm:max-w-[400px]">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedSession.sessionTitle}</DialogTitle>
                <DialogDescription className="text-xs">
                  {format(new Date(selectedSession.sessionDate), "EEE, dd MMM yyyy")} at {selectedSession.sessionStartTime}
                  {selectedSession.clubName && ` - ${selectedSession.clubName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full justify-start gap-2" onClick={() => { const id = selectedSession.sessionId; setSelectedSession(null); navigate(`/sessions/${id}`); }} data-testid="button-view-session-popup"><Eye className="h-4 w-4" /> View Session</Button>
                <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => withdrawMutation.mutate(selectedSession.sessionId)} disabled={withdrawMutation.isPending} data-testid="button-withdraw-popup">
                  {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Withdraw from Session
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

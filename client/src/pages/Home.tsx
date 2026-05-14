import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Users,
  Calendar,
  Search,
  Activity,
  CreditCard,
  Gamepad2,
  Check,
  Star,
  Clock,
  MapPin,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isAfter, startOfToday } from "date-fns";
import heroPath from "@assets/bpg_20260217_093920_0000_1771321177372.png";
import playersPath from "@assets/landing-players.png";
import organisersPath from "@assets/image_1771422277330.png";
import sessionsPath from "@assets/landing-sessions.png";
import paymentsPath from "@assets/image_1771423821388.png";
import venuesPath from "@assets/landing-venues.png";
import adminPath from "@assets/landing-admin.png";

const PREVIEW_TABS = [
  { key: "sessions", label: "Sessions", icon: Calendar },
  { key: "matches", label: "Matches", icon: Gamepad2 },
  { key: "players", label: "Players", icon: Users },
  { key: "finances", label: "Finances", icon: CreditCard },
] as const;

type PreviewTab = typeof PREVIEW_TABS[number]["key"];

const PREVIEW_IMAGES: Record<PreviewTab, { src: string; alt: string }> = {
  sessions: { src: sessionsPath, alt: "Session scheduling dashboard" },
  matches: { src: organisersPath, alt: "Match organization view" },
  players: { src: playersPath, alt: "Player management interface" },
  finances: { src: paymentsPath, alt: "Financial tracking dashboard" },
};

export default function Home() {
  const [activePreview, setActivePreview] = useState<PreviewTab>("sessions");

  const { data: allSessions } = useQuery<any[]>({
    queryKey: ["/api/public/all-sessions"],
    refetchInterval: 30000,
  });

  const { data: playSessions } = useQuery<any[]>({
    queryKey: ["/api/public/play-sessions"],
    staleTime: 30000,
  });

  const liveSessions = useMemo(() => {
    return allSessions?.filter(s => s.liveMatchCount > 0) || [];
  }, [allSessions]);

  const upcomingSessions = useMemo(() => {
    if (!playSessions) return [];
    const today = startOfToday();
    return playSessions
      .filter(s => {
        const d = parseISO(s.date);
        return isAfter(d, today) && s.status !== "COMPLETED" && s.status !== "CANCELLED";
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [playSessions]);

  const recentSessions = useMemo(() => {
    if (!playSessions) return [];
    return playSessions
      .filter(s => s.status === "COMPLETED")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [playSessions]);

  const displaySessions = upcomingSessions.length > 0 ? upcomingSessions : recentSessions;

  useEffect(() => {
    document.title = "BadmintonHub | Club Management Software by Dragon Badminton Club – BPG Ltd";
    const setMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta("description", "BadmintonHub is the all-in-one platform to schedule sessions, manage players, organise matches, and track finances. Developed by Dragon Badminton Club – BPG Ltd.");
    setMeta("author", "Dragon Badminton Club – BPG Ltd");
    setMeta("og:title", "BadmintonHub | Club Management Software by Dragon Badminton Club – BPG Ltd", true);
    setMeta("og:description", "Schedule sessions, manage players, organise matches, and track club finances — all in one place. Built by Dragon Badminton Club – BPG Ltd.", true);
    setMeta("og:type", "website", true);
  }, []);

  return (
    <PublicLayout>
      {/* ===== 1. HERO SECTION ===== */}
      <section className="relative w-full overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0">
          <img
            src={heroPath}
            alt="Badminton players in action on indoor court"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-white mb-6 leading-[1.1]"
              data-testid="text-hero-headline"
            >
              Schedule sessions, manage players,{" "}
              <span className="text-primary">organise matches, and track club finances</span>
              {" "}— all in one place.
            </h1>
            <p
              className="text-lg md:text-xl text-white/80 mb-10 leading-relaxed max-w-xl"
              data-testid="text-hero-subheading"
            >
              Built and continuously improved by{" "}
              <a
                href="https://dragon-bpgbadminton.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                data-testid="link-dragon-hero"
              >
                Dragon Badminton Club – BPG Ltd
              </a>.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-start gap-3">
              <Link href="/register">
                <Button size="lg" className="rounded-md text-base px-8" data-testid="button-hero-get-started">
                  Create Your Free Club <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-md bg-white/10 backdrop-blur-sm border-white/20 text-white text-base"
                  data-testid="button-hero-see-demo"
                >
                  <Eye className="mr-2 h-5 w-5" /> See Live Demo
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-md text-white/80 hover:text-white text-base"
                  data-testid="button-hero-how-it-works"
                >
                  How It Works
                </Button>
              </a>
            </div>
            <p className="text-white/50 text-sm mt-4">No credit card required</p>
          </div>
        </div>
      </section>

      {/* ===== LIVE SESSIONS BANNER ===== */}
      {liveSessions.length > 0 && (
        <section className="py-4 bg-green-500/5 border-b border-green-500/10" data-testid="section-live-preview">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-green-500/10 rounded-md flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-sm" data-testid="text-live-count">
                  {liveSessions.length} Live Session{liveSessions.length !== 1 ? "s" : ""} right now
                </p>
              </div>
            </div>
            <Link href="/explore/sessions">
              <Button variant="outline" size="sm" data-testid="button-view-live">
                Watch Live <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ===== UPCOMING SESSIONS SECTION ===== */}
      {displaySessions.length > 0 && (
        <section className="py-16 lg:py-20 border-b border-border/40" data-testid="section-upcoming-sessions">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-2" data-testid="text-sessions-title">
                  {upcomingSessions.length > 0 ? "Upcoming Sessions" : "Recent Sessions"}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {upcomingSessions.length > 0
                    ? "Find a session and join a game near you."
                    : "See what's been happening across clubs."}
                </p>
              </div>
              <Link href="/play">
                <Button variant="outline" className="shrink-0" data-testid="button-view-all-sessions">
                  View All Sessions <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displaySessions.map(session => {
                const sessionDate = parseISO(session.date);
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const dayName = dayNames[sessionDate.getDay()];
                const spotsLeft = Math.max(0, session.maxPlayers - session.signupCount);
                const isFull = spotsLeft === 0;
                const isUpcoming = isAfter(sessionDate, startOfToday());

                return (
                  <Card
                    key={session.id}
                    className="overflow-hidden border-border/60 hover:shadow-md transition-shadow"
                    data-testid={`card-home-session-${session.id}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate">
                            {session.title || "Club Session"}
                          </h3>
                          <p className="text-xs text-primary font-medium mt-0.5">{session.clubName}</p>
                        </div>
                        {isUpcoming ? (
                          <Badge variant="secondary" className="text-[10px] shrink-0 px-2">Upcoming</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] shrink-0 px-2 text-muted-foreground">Completed</Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{dayName}, {format(sessionDate, "d MMM yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{session.startTime} · {session.durationMinutes} mins</span>
                        </div>
                        {session.clubCity && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{session.clubCity}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={`text-xs font-medium ${
                            isFull ? "text-red-500" : spotsLeft <= 3 ? "text-orange-500" : "text-green-600 dark:text-green-400"
                          }`}>
                            {isFull ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                          </span>
                        </div>
                        {isUpcoming && !isFull && (
                          <Link href="/register">
                            <Button size="sm" variant="outline" className="h-7 text-xs px-3" data-testid={`button-join-home-${session.id}`}>
                              Join
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== 2. FEATURE HIGHLIGHTS (4-card grid) ===== */}
      <section className="py-20 lg:py-24" id="features" data-testid="section-feature-highlights">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-features-title">
              Everything You Need to Run a Club
            </h2>
            <p className="text-muted-foreground text-lg" data-testid="text-features-subtitle">
              Replace spreadsheets, group chats, and manual tracking with one purpose-built platform developed from real club experience by the team behind{" "}
              <a
                href="https://dragon-bpgbadminton.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                data-testid="link-dragon-intro"
              >
                Dragon Badminton Club – BPG Ltd
              </a>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              testId="feature-scheduling"
              image={sessionsPath}
              imageAlt="Badminton club session management software by Dragon Badminton Club"
              title="Session Scheduling"
              description="Create sessions and manage attendance easily."
              icon={Calendar}
            />
            <FeatureCard
              testId="feature-matches"
              image={organisersPath}
              imageAlt="BadmintonHub advanced match engine developed by Dragon Badminton Club – BPG Ltd"
              title="Match Organisation"
              description="Featuring our advanced custom-built match engine, designed and developed by Dragon Badminton Club – BPG Ltd to automate game organisation, rotations, and scoring with unmatched flexibility and accuracy."
              icon={Gamepad2}
            />
            <FeatureCard
              testId="feature-players"
              image={playersPath}
              imageAlt="Player management interface"
              title="Player Management"
              description="Manage members, guests, and skill levels."
              icon={Users}
            />
            <FeatureCard
              testId="feature-finances"
              image={paymentsPath}
              imageAlt="Club finance tracking"
              title="Club Finances"
              description="Track payments, balances, and guest fees."
              icon={CreditCard}
            />
          </div>
        </div>
      </section>

      {/* ===== 3. PRODUCT PREVIEW / INTERACTIVE DASHBOARD ===== */}
      <section className="py-20 lg:py-24 bg-muted/30" data-testid="section-product-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-preview-title">
              See BadmintonHub in Action
            </h2>
            <p className="text-muted-foreground text-lg" data-testid="text-preview-subtitle">
              Explore how your club can schedule sessions, organize matches, track players, and manage finances — all in one platform.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {PREVIEW_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActivePreview(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activePreview === tab.key
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
                data-testid={`button-preview-${tab.key}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-border/60 shadow-lg bg-card">
              <div className="bg-muted/50 border-b border-border/40 px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  BadmintonHub — {PREVIEW_TABS.find(t => t.key === activePreview)?.label}
                </span>
              </div>
              <div className="relative overflow-hidden">
                {PREVIEW_TABS.map(tab => (
                  <img
                    key={tab.key}
                    src={PREVIEW_IMAGES[tab.key].src}
                    alt={PREVIEW_IMAGES[tab.key].alt}
                    className={`w-full h-auto transition-opacity duration-300 ${
                      activePreview === tab.key ? "opacity-100" : "opacity-0 absolute inset-0"
                    }`}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-3">
              Unlock full features with{" "}
              <a href="#pricing" className="text-primary hover:underline font-medium">
                Premium
              </a>
            </p>
          </div>

          <div className="text-center mt-10">
            <Link href="/register">
              <Button size="lg" className="rounded-md text-base px-8" data-testid="button-preview-cta">
                Create Your Free Club <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-3">No credit card required</p>
          </div>
        </div>
      </section>

      {/* ===== 4. HOW IT WORKS ===== */}
      <section className="py-20 lg:py-24" id="how-it-works" data-testid="section-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-hiw-title">
              Get Started in 3 Steps
            </h2>
            <p className="text-muted-foreground text-lg">
              From signup to running sessions in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <HowItWorksStep
              step={1}
              title="Create your club"
              description="Sign up for free and set up your club profile with venues, courts, and basic info."
              image={adminPath}
              imageAlt="Club creation and admin setup"
              testId="step-1"
            />
            <HowItWorksStep
              step={2}
              title="Invite players and schedule sessions"
              description="Add members, set up recurring sessions, and let players manage their own attendance."
              image={sessionsPath}
              imageAlt="Session scheduling with player signups"
              testId="step-2"
            />
            <HowItWorksStep
              step={3}
              title="Run matches and track club activity"
              description="Organize matches, track payments, and see your club's activity at a glance."
              image={organisersPath}
              imageAlt="Match tracking and club activity dashboard"
              testId="step-3"
            />
          </div>
        </div>
      </section>

      {/* ===== 5. PRICING SECTION ===== */}
      <section className="py-20 lg:py-24 bg-muted/30" id="pricing" data-testid="section-pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when your club grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* FREE tier */}
            <Card className="p-8 border-border/60 relative" data-testid="card-pricing-free">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">£0</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Up to 20 members",
                  "2 admins",
                  "Session scheduling",
                  "Match tracking",
                  "Basic finances",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full" size="lg" data-testid="button-pricing-free">
                  Start Free
                </Button>
              </Link>
            </Card>

            {/* PREMIUM tier */}
            <Card
              className="p-8 border-primary/40 relative ring-2 ring-primary/20 shadow-lg"
              data-testid="card-pricing-premium"
            >
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                Most Popular
              </Badge>
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Premium</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">£19</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
                <p className="text-sm text-primary font-medium mt-1">
                  or £180/year <span className="text-green-600 dark:text-green-400">(Save £48)</span>
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Unlimited members",
                  "Unlimited admins",
                  "Unlimited sessions",
                  "Guest management",
                  "Advanced finances",
                  "Reports & analytics",
                  "Data export",
                  "Full access to the proprietary advanced match engine developed by Dragon Badminton Club – BPG Ltd",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full" size="lg" data-testid="button-pricing-premium">
                  Upgrade to Premium <Star className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8" data-testid="text-pricing-note">
            Most badminton clubs upgrade once they exceed 20 members.
          </p>
        </div>
      </section>

      {/* ===== 6. SCREENSHOTS SECTION ===== */}
      <section className="py-20 lg:py-24" data-testid="section-screenshots">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid="text-screenshots-title">
              Everything Your Club Needs in One App
            </h2>
            <p className="text-muted-foreground text-lg">
              From session scheduling to finance tracking, see the tools that power badminton clubs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { src: sessionsPath, alt: "Session scheduling and management", label: "Session Management" },
              { src: organisersPath, alt: "Organiser dashboard with live view", label: "Organiser Dashboard" },
              { src: playersPath, alt: "Player profiles and attendance", label: "Player Profiles" },
              { src: paymentsPath, alt: "Payment tracking per session", label: "Payment Tracking" },
              { src: venuesPath, alt: "Venue and court setup", label: "Venue Management" },
              { src: adminPath, alt: "Admin tools and governance", label: "Admin Tools" },
            ].map((screenshot, i) => (
              <div
                key={i}
                className="group rounded-xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-shadow bg-card"
                data-testid={`screenshot-${i}`}
              >
                <div className="overflow-hidden">
                  <img
                    src={screenshot.src}
                    alt={screenshot.alt}
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3 border-t border-border/40">
                  <p className="text-sm font-medium">{screenshot.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EXPLORE LINKS ===== */}
      <section className="py-16 bg-muted/30 border-t border-border/40" data-testid="section-explore-links">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3" data-testid="text-explore-title">Explore</h2>
            <p className="text-muted-foreground text-lg" data-testid="text-explore-description">Browse clubs and sessions without signing in</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/explore/clubs">
              <Card className="p-6 hover-elevate cursor-pointer h-full" data-testid="card-explore-clubs">
                <div className="h-12 w-12 bg-primary/10 rounded-md flex items-center justify-center mb-4 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Find Clubs</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">Search for clubs near you with map and list views.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  Browse Clubs <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
            <Link href="/play">
              <Card className="p-6 hover-elevate cursor-pointer h-full" data-testid="card-explore-sessions">
                <div className="h-12 w-12 bg-primary/10 rounded-md flex items-center justify-center mb-4 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Find Sessions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">Discover upcoming sessions and find a game near you.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  Browse Sessions <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 7. FINAL CTA ===== */}
      <section className="py-20 lg:py-28 relative overflow-hidden" data-testid="section-closing-cta">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl md:text-4xl font-display font-bold mb-5"
            data-testid="text-closing-headline"
          >
            Start Managing Your Club the Easy Way
          </h2>
          <p
            className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-2xl mx-auto"
            data-testid="text-closing-description"
          >
            Join badminton clubs already using BadmintonHub to schedule sessions, organize matches, and manage their finances without the hassle.
          </p>
          <Link href="/register">
            <Button size="lg" className="rounded-md text-base px-8" data-testid="button-closing-cta">
              Create Your Free Club <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">No credit card required.</p>
        </div>
      </section>

      {/* ===== ABOUT BADMINTONHUB ===== */}
      <section className="py-16 lg:py-20 border-t border-border/40 bg-muted/20" id="about" data-testid="section-about">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-center" data-testid="text-about-title">
            About BadmintonHub
          </h2>
          <div className="space-y-5 text-muted-foreground text-base md:text-lg leading-relaxed">
            <p data-testid="text-about-paragraph-1">
              BadmintonHub is a product built by{" "}
              <a
                href="https://dragon-bpgbadminton.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                data-testid="link-dragon-about-1"
              >
                Dragon Badminton Club – BPG Ltd
              </a>
              {" "}— the same team behind Birmingham&apos;s inclusive community club and performance pathway programmes. Every feature is shaped by real-world experience running sessions, leagues, and tournaments, so you get tools that actually work for badminton.
            </p>
            <p data-testid="text-about-paragraph-2">
              We created this platform to help clubs everywhere operate at the same professional standard we use at{" "}
              <a
                href="https://dragon-bpgbadminton.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
                data-testid="link-dragon-about-2"
              >
                Dragon Badminton Club
              </a>, making administration easier so organisers can focus on growing the sport and building great communities.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({
  testId,
  image,
  imageAlt,
  title,
  description,
  icon: Icon,
}: {
  testId: string;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow border-border/60 group"
      data-testid={testId}
    >
      <div className="overflow-hidden aspect-[16/10]">
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-8 w-8 bg-primary/10 rounded-md flex items-center justify-center text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}

function HowItWorksStep({
  step,
  title,
  description,
  image,
  imageAlt,
  testId,
}: {
  step: number;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  testId: string;
}) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className="rounded-xl overflow-hidden border border-border/50 shadow-sm mb-6">
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-3">
        {step}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}
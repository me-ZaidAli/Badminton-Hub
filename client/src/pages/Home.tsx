import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Users,
  Calendar,
  Search,
  Activity,
  Zap,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  MapPin,
  ShieldCheck,
  UserCheck,
  Bell,
  ListChecks,
  Receipt,
  Building2,
  Lock,
} from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import heroPath from "@assets/bpg_20260217_093920_0000_1771321177372.png";
import playersPath from "@assets/landing-players.png";
import organisersPath from "@assets/image_1771422277330.png";
import sessionsPath from "@assets/landing-sessions.png";
import paymentsPath from "@assets/image_1771423821388.png";
import venuesPath from "@assets/landing-venues.png";
import adminPath from "@assets/landing-admin.png";

export default function Home() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();

  const { data: allSessions } = useQuery<any[]>({
    queryKey: ["/api/public/all-sessions"],
    refetchInterval: 30000,
  });

  const liveSessions = useMemo(() => {
    return allSessions?.filter(s => s.liveMatchCount > 0) || [];
  }, [allSessions]);

  return (
    <PublicLayout>
      <section className="relative w-full overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0">
          <img
            src={heroPath}
            alt="Indoor badminton court with players in action"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 lg:py-44">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-white mb-6 leading-tight" data-testid="text-hero-headline">
              Run Your Badminton Club <span className="text-primary">Smarter</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 leading-relaxed max-w-xl" data-testid="text-hero-subheading">
              All-in-one session, member, venue, and payment management built specifically for badminton and racket sports.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-start gap-3">
              <Link href="/register">
                <Button size="lg" className="rounded-md" data-testid="button-hero-get-started">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="rounded-md bg-white/10 backdrop-blur-sm border-white/20 text-white" data-testid="button-hero-how-it-works">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-border/40" data-testid="section-stats">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value={clubs?.length || 0} label="Active Clubs" testId="stat-clubs" />
            <StatCard value={allSessions?.length || 0} label="Sessions" testId="stat-sessions" />
            <StatCard value={liveSessions.length} label="Live Now" testId="stat-live" accent />
            <StatCard value="100+" label="Players" testId="stat-players" />
          </div>
        </div>
      </section>

      {liveSessions.length > 0 && (
        <section className="py-10 bg-green-500/5 border-b border-green-500/10" data-testid="section-live-preview">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 rounded-md flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold" data-testid="text-live-count">{liveSessions.length} Live Session{liveSessions.length !== 1 ? "s" : ""}</p>
                <p className="text-sm text-muted-foreground">Matches happening right now</p>
              </div>
            </div>
            <Link href="/explore/sessions">
              <Button variant="outline" data-testid="button-view-live">
                View Live Sessions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      <div id="features">
        <FeatureSection
          testId="section-players"
          badge="For Players"
          title="Designed for Players"
          description="Take control of your session participation with self-service tools that keep you informed and organised."
          points={[
            { icon: UserCheck, text: "Join or cancel sessions independently" },
            { icon: ListChecks, text: "Automatically join waiting lists when sessions are full" },
            { icon: Bell, text: "Receive session invitations and updates in real time" },
            { icon: CheckCircle2, text: "Clear visibility of attendance and payment status" },
          ]}
          imageSrc={playersPath}
          imageAlt="Player session management interface"
          reverse={false}
        />

        <FeatureSection
          testId="section-organisers"
          badge="For Organisers"
          title="Built for Organisers"
          description="Stop chasing spreadsheets. Get a real-time view of who's coming, who's paid, and who's waiting."
          points={[
            { icon: Users, text: "Live view of confirmed players, waiting lists, and invitations" },
            { icon: Zap, text: "Automatic waiting list promotion" },
            { icon: CreditCard, text: "Integrated payment tracking per session" },
            { icon: ClipboardList, text: "No spreadsheets or manual follow-ups" },
          ]}
          imageSrc={organisersPath}
          imageAlt="Organiser dashboard with player management"
          reverse
        />

        <FeatureSection
          testId="section-sessions"
          badge="Session Management"
          title="Smart Session & Attendance Management"
          description="Four clear participation states give everyone visibility into who's in, who's waiting, and who's been invited."
          points={[
            { icon: ListChecks, text: "Player-controlled participation statuses" },
            { icon: CheckCircle2, text: "Invited, Confirmed, Waiting List, and Not Attending states" },
            { icon: Bell, text: "Automatic notifications when sessions are created" },
            { icon: Calendar, text: "Full session overview in one click" },
          ]}
          imageSrc={sessionsPath}
          imageAlt="Session attendance management interface"
          reverse={false}
        />

        <FeatureSection
          testId="section-payments"
          badge="Payments"
          title="Simple, Transparent Payments"
          description="Track every payment at the session level. No more guessing who owes what."
          points={[
            { icon: Receipt, text: "Session-level finance panel" },
            { icon: CreditCard, text: "Track paid and unpaid players" },
            { icon: ClipboardList, text: "Record payment methods and notes" },
            { icon: ShieldCheck, text: "Admin override for full control" },
          ]}
          imageSrc={paymentsPath}
          imageAlt="Payment tracking dashboard"
          reverse
        />

        <FeatureSection
          testId="section-venues"
          badge="Venues"
          title="Manage Venues and Courts with Ease"
          description="Centralise your venue information and reuse it across sessions without re-entering details."
          points={[
            { icon: Building2, text: "Centralised venue management" },
            { icon: MapPin, text: "Court capacity per session" },
            { icon: Calendar, text: "Reusable venues across sessions" },
          ]}
          imageSrc={venuesPath}
          imageAlt="Venue and court management interface"
          reverse={false}
        />

        <FeatureSection
          testId="section-admin"
          badge="Admin Tools"
          title="Powerful Admin Control"
          description="Full governance over members, sessions, and venues with simple, intuitive controls."
          points={[
            { icon: ShieldCheck, text: "Full control over members, sessions, and venues" },
            { icon: ClipboardList, text: "Edit everything via simple pop-ups" },
            { icon: Lock, text: 'Super Admin "God Mode" with unrestricted access' },
            { icon: Users, text: "Seamlessly manage single or multiple clubs" },
          ]}
          imageSrc={adminPath}
          imageAlt="Admin governance control panel"
          reverse
        />
      </div>

      <section className="py-16 bg-muted/30" data-testid="section-explore-links">
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
                <p className="text-muted-foreground leading-relaxed mb-4">Search for badminton clubs near you with map and list views.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  Browse Clubs <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
            <Link href="/explore/sessions">
              <Card className="p-6 hover-elevate cursor-pointer h-full" data-testid="card-explore-sessions">
                <div className="h-12 w-12 bg-primary/10 rounded-md flex items-center justify-center mb-4 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Club Sessions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">View upcoming and live sessions across all clubs.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  View Sessions <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 relative overflow-hidden" data-testid="section-closing-cta">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-5" data-testid="text-closing-headline">
            Built for How Badminton Clubs Really Operate
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-2xl mx-auto" data-testid="text-closing-description">
            From grassroots clubs to multi-venue operations, Club Master helps you fill courts fairly, reduce admin workload, and keep players informed.
          </p>
          <Link href="/register">
            <Button size="lg" className="rounded-md" data-testid="button-closing-cta">
              Start Managing Your Club Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

function StatCard({ value, label, testId, accent }: { value: string | number; label: string; testId: string; accent?: boolean }) {
  return (
    <div className="text-center" data-testid={testId}>
      <div className={`text-3xl font-bold ${accent ? "text-green-600 dark:text-green-400" : "text-primary"}`}>{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

interface FeaturePoint {
  icon: any;
  text: string;
}

function FeatureSection({
  testId,
  badge,
  title,
  description,
  points,
  imageSrc,
  imageAlt,
  reverse,
}: {
  testId: string;
  badge: string;
  title: string;
  description: string;
  points: FeaturePoint[];
  imageSrc: string;
  imageAlt: string;
  reverse: boolean;
}) {
  return (
    <section className="py-16 lg:py-20" data-testid={testId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col flex-wrap ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-16`}>
          <div className="flex-1 w-full">
            <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary mb-3" data-testid={`badge-${testId}`}>
              {badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4" data-testid={`text-${testId}-title`}>{title}</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed" data-testid={`text-${testId}-description`}>{description}</p>
            <ul className="space-y-3">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-3" data-testid={`text-${testId}-point-${i}`}>
                  <div className="h-6 w-6 mt-0.5 flex-shrink-0 text-primary">
                    <point.icon className="h-5 w-5" />
                  </div>
                  <span className="text-foreground/90">{point.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full">
            <div className="rounded-md overflow-hidden border border-border/50 shadow-sm">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

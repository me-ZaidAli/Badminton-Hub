import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy, Users, Calendar, Search, Activity } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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
      <section className="py-20 lg:py-28 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Elevate Your <span className="text-gradient">Badminton</span> Game
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            Find clubs, watch live matches, track rankings, and join sessions - all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link href="/register">
              <Button size="lg" className="rounded-full" data-testid="button-get-started">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-primary" data-testid="stat-clubs">{clubs?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Active Clubs</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-primary" data-testid="stat-sessions">{allSessions?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-live">{liveSessions.length}</div>
              <div className="text-sm text-muted-foreground">Live Now</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-primary" data-testid="stat-players">100+</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30" data-testid="section-explore-links">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Explore</h2>
            <p className="text-muted-foreground text-lg">Browse clubs, sessions, and rankings without signing in</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/explore/clubs">
              <Card className="p-6 hover-elevate cursor-pointer h-full" data-testid="card-explore-clubs">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
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
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Club Sessions</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">View upcoming and live sessions across all clubs.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  View Sessions <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
            <Link href="/explore/rankings">
              <Card className="p-6 hover-elevate cursor-pointer h-full" data-testid="card-explore-rankings">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                  <Trophy className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Club Rankings</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">See player leaderboards and rankings for each club.</p>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  View Rankings <ArrowRight className="ml-1 w-4 h-4" />
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {liveSessions.length > 0 && (
        <section className="py-12 bg-green-500/5 border-y border-green-500/10" data-testid="section-live-preview">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-2 rounded-full mb-4">
              <Activity className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-semibold">{liveSessions.length} Live Session{liveSessions.length !== 1 ? "s" : ""}</span>
            </div>
            <h2 className="text-2xl font-display font-bold mb-4">Matches Happening Now</h2>
            <p className="text-muted-foreground mb-6">Watch live scores and follow the action in real time</p>
            <Link href="/explore/sessions">
              <Button variant="outline" size="lg" data-testid="button-view-live">
                View Live Sessions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Why Club Master?</h2>
            <p className="text-muted-foreground text-lg">Everything you need for your badminton club</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Calendar}
              title="Smart Scheduling"
              description="Book sessions, manage attendance, and automate court allocation effortlessly."
            />
            <FeatureCard
              icon={Trophy}
              title="Live Rankings"
              description="Track your performance with competitive rankings and detailed match statistics."
            />
            <FeatureCard
              icon={Users}
              title="Club Community"
              description="Connect with players, find partners, and manage membership across multiple clubs."
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Play?</h2>
          <p className="text-muted-foreground text-lg mb-8">Join Club Master and start tracking your badminton journey today.</p>
          <Link href="/register">
            <Button size="lg" className="rounded-full" data-testid="button-cta-register">
              Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <Card className="p-6">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

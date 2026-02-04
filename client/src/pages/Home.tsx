import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Users, Calendar } from "lucide-react";
import { useUser } from "@/hooks/use-auth";

export default function Home() {
  const { data: user } = useUser();

  if (user) {
    // Redirect logic handled in App router or component redirect
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary to-secondary rounded-lg" />
            <span className="font-display font-bold text-xl">SmashClub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="font-bold shadow-lg shadow-primary/20">Join Club</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 lg:py-32 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              Elevate Your <span className="text-gradient">Badminton</span> Game
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              The professional platform for club management, session scheduling, and competitive ranking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/public-rankings">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Calendar}
                title="Smart Scheduling" 
                description="Book sessions, manage attendance, and automate waitlists effortlessly."
              />
              <FeatureCard 
                icon={Trophy}
                title="Live Rankings" 
                description="Track your performance with Elo-style ratings and detailed match statistics."
              />
              <FeatureCard 
                icon={Users}
                title="Club Community" 
                description="Connect with players, find partners, and manage membership tiers."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border text-center text-muted-foreground">
        <p>© 2024 SmashClub. Built for champions.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border hover-card-effect">
      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

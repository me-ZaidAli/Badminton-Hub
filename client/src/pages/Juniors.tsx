import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Baby,
  Users,
  Star,
  Shield,
  Heart,
  Zap,
  Target,
  Gamepad2,
  Calendar,
  MapPin,
  Clock,
  PoundSterling,
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Dumbbell,
  Brain,
  Trophy,
  Smile,
  Eye,
  Plus,
  Building2,
  Award,
  Video,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";

function JuniorHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 md:p-12 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-4 left-12 w-24 h-24 rounded-full bg-yellow-300/30 blur-xl" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/15 blur-lg" />
      </div>
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
            <Baby className="h-8 w-8" />
          </div>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-3 py-1">
            All Abilities Welcome
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3" data-testid="text-juniors-title">
          Junior Badminton
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed">
          Welcome to our junior programme! Whether your child is picking up a racket for the very first 
          time or already dreaming of competitive play, they'll find a place here.
        </p>
        <p className="text-white/80 leading-relaxed max-w-2xl">
          Our friendly, experienced coaches create sessions where every young player feels welcome, 
          supported, and excited to play. We focus on having fun, making friends, and building real 
          badminton skills — all at a pace that suits each child. Come along, give it a try, and 
          watch their confidence grow on and off the court!
        </p>
      </div>
    </div>
  );
}

function WhatWeDoSection() {
  const features = [
    {
      icon: Target,
      title: "Technical Coaching",
      description: "Age-appropriate coaching covering footwork, grips, and strokes tailored to each player's level.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Dumbbell,
      title: "Movement & Agility",
      description: "Developing coordination, agility, and movement skills essential for badminton and general fitness.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Brain,
      title: "Game Understanding",
      description: "Building tactical awareness and game intelligence through structured drills and guided play.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: Trophy,
      title: "Structured Match Play",
      description: "Confidence-building through organised match play, helping players apply skills in real game situations.",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: Smile,
      title: "Fun & Engaging",
      description: "Fun, engaging drills and activities that keep juniors motivated, active, and loving the sport.",
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      icon: Users,
      title: "Grouped by Ability",
      description: "Sessions are grouped by age and ability so every player gets the right level of challenge and support.",
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-500/10 rounded-lg p-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold" data-testid="text-what-we-do">What We Do</h2>
      </div>
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Our sessions focus on long-term player development in a fun and supportive environment. 
        Here's what your child can expect:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, i) => (
          <Card key={i} className="border hover:shadow-md transition-shadow" data-testid={`card-feature-${i}`}>
            <CardContent className="p-5">
              <div className={`${feature.bg} rounded-lg p-2.5 w-fit mb-3`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PricingSection() {
  const plans = [
    {
      title: "Group Sessions",
      price: "£15",
      unit: "per session",
      description: "Weekly junior group sessions with structured coaching, drills, and match play.",
      features: ["Expert coaching", "Age-grouped sessions", "Weekly schedule", "All equipment provided"],
      highlight: true,
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      title: "1-to-1 Coaching",
      price: "£25",
      unit: "per hour",
      description: "Personalised one-on-one coaching sessions. Available on request and agreed one week in advance.",
      features: ["Personalised coaching", "Flexible scheduling", "Individual attention", "Tailored development"],
      highlight: false,
      icon: Star,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      title: "Match Sessions",
      price: "£8",
      unit: "per session",
      description: "Competitive match practice sessions to apply skills in real game scenarios.",
      features: ["Competitive play", "Skill application", "Performance tracking", "Fun environment"],
      highlight: false,
      icon: Gamepad2,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-500/10 rounded-lg p-2">
          <PoundSterling className="h-5 w-5 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold" data-testid="text-pricing">Pricing</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Our pricing is designed to be accessible, flexible, and great value for quality coaching.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan, i) => (
          <Card
            key={i}
            className={`relative overflow-hidden ${plan.highlight ? "border-emerald-500 shadow-lg ring-1 ring-emerald-500/20" : ""}`}
            data-testid={`card-pricing-${i}`}
          >
            {plan.highlight && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            )}
            <CardContent className="p-6">
              <div className={`${plan.iconBg} rounded-lg p-2.5 w-fit mb-4`}>
                <plan.icon className={`h-5 w-5 ${plan.iconColor}`} />
              </div>
              <h3 className="font-bold text-lg mb-1">{plan.title}</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/{plan.unit}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plan.description}</p>
              <ul className="space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SafeguardingSection() {
  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-safeguarding">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="bg-blue-500/10 rounded-xl p-3 shrink-0">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3" data-testid="text-safeguarding">Safeguarding & Player Welfare</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Player safety and wellbeing are our top priority. All junior sessions adhere to 
              Badminton England safeguarding policies. Parents and guardians can be confident 
              their children are in a safe, inclusive, and respectful environment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: CheckCircle, text: "DBS-checked coaches" },
                { icon: Shield, text: "Safeguarding-trained staff" },
                { icon: Heart, text: "Clear codes of conduct" },
                { icon: Eye, text: "Safe & inclusive environment" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <item.icon className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 italic">
              We advise parents and guardians to remain at the session until your child is familiar 
              with the new environment and feels comfortable.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JuniorSessionsSection() {
  const { data: sessions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });
  const { data: user } = useUser();

  const juniorSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s: any) => s.sessionType === "JUNIORS_ONLY" && s.status !== "CANCELLED")
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  const ageGroupLabels: Record<string, string> = {
    "7-10": "7–10 years",
    "10-12": "10–12 years",
    "13-15": "13–15 years",
    "16-18": "16–18 years",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-teal-500/10 rounded-lg p-2">
          <Calendar className="h-5 w-5 text-teal-500" />
        </div>
        <h2 className="text-2xl font-bold" data-testid="text-junior-sessions">Junior Sessions</h2>
        <Badge variant="secondary" className="ml-auto">
          {juniorSessions.length} session{juniorSessions.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : juniorSessions.length === 0 ? (
        <Card className="border-dashed" data-testid="card-no-junior-sessions">
          <CardContent className="p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No Junior Sessions Available</h3>
            <p className="text-sm text-muted-foreground">
              There are currently no junior sessions scheduled. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {juniorSessions.map((session: any) => {
            const sessionDate = new Date(session.date);
            const isPast = session.status === "COMPLETED";
            const isLive = session.status === "ACTIVE";
            const spotsLeft = session.maxPlayers - (session.signupCount || 0);

            return (
              <Card
                key={session.id}
                className={`overflow-hidden transition-shadow hover:shadow-md ${isPast ? "opacity-70" : ""}`}
                data-testid={`card-junior-session-${session.id}`}
              >
                <div className={`h-1 ${isLive ? "bg-gradient-to-r from-green-400 to-emerald-400" : isPast ? "bg-gray-300" : "bg-gradient-to-r from-teal-400 to-cyan-400"}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{session.title || "Junior Session"}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(sessionDate, "EEE, d MMM yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {session.startTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {isLive && <Badge className="bg-green-500 text-white">Live</Badge>}
                      {isPast && <Badge variant="secondary">Completed</Badge>}
                      {!isLive && !isPast && <Badge variant="outline">Upcoming</Badge>}
                    </div>
                  </div>

                  {session.venue && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{session.venue.name}{session.venue.city ? `, ${session.venue.city}` : ""}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                      <Baby className="h-3 w-3 mr-1" /> Juniors
                    </Badge>
                    {session.juniorAgeGroups?.map((ag: string) => (
                      <Badge key={ag} variant="secondary" className="text-xs">
                        {ageGroupLabels[ag] || ag}
                      </Badge>
                    ))}
                    {session.sessionFee != null && (
                      <Badge variant="outline" className="text-xs">
                        £{(session.sessionFee / 100).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className={`font-medium ${spotsLeft <= 3 && spotsLeft > 0 ? "text-amber-600" : spotsLeft <= 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left` : "Full"}
                      </span>
                      <span className="text-muted-foreground ml-1">/ {session.maxPlayers} max</span>
                    </div>
                    {!isPast && user && (
                      <Link href={`/sessions/${session.id}`}>
                        <Button size="sm" variant="default" data-testid={`button-view-session-${session.id}`}>
                          View & Sign Up
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniGauge({ value, size = 48 }: { value: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : value >= 25 ? "#3b82f6" : "#6b7280";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke="hsl(var(--muted))" fill="none" opacity={0.3} />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} stroke={color} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{value}%</span>
      </div>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IMPROVER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PERFORMANCE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SQUAD: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  COMPETITION_READY: "bg-red-500/15 text-red-400 border-red-500/30",
};
const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: "Beginner",
  IMPROVER: "Improver",
  PERFORMANCE: "Performance",
  SQUAD: "Squad",
  COMPETITION_READY: "Competition Ready",
};

function ChildProfileCard({ junior, onEdit, onDelete, onAddToClub, hasClubs }: { junior: any; onEdit: () => void; onDelete: () => void; onAddToClub: () => void; hasClubs: boolean }) {
  const { data: profileData } = useQuery<any>({
    queryKey: ["/api/junior-profiles", String(junior.id)],
    enabled: !!junior.id,
  });

  const profile = profileData?.profiles?.[0] || null;
  const achievements = profileData?.achievements || [];
  const videos = profileData?.videos || [];
  const progress = profileData?.progress || [];

  const skillPercent = profile?.overallSkillPercentage || 0;
  const attendance = profile?.attendancePercentage || 0;
  const effortRating = profile?.effortRating || 0;
  const coachRating = profile?.coachRating || 0;
  const level = profile?.juniorLevel || "BEGINNER";
  const skillsAssessed = progress.filter((p: any) => p.percentage > 0).length;

  return (
    <Card className="overflow-hidden group" data-testid={`card-child-${junior.id}`}>
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full p-2.5">
              <Baby className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg" data-testid={`text-child-name-${junior.id}`}>{junior.fullName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {junior.dateOfBirth && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(junior.dateOfBirth), "d MMM yyyy")}
                  </span>
                )}
                <Badge className={`text-[10px] py-0 h-5 border ${LEVEL_COLORS[level]}`} data-testid={`badge-level-${junior.id}`}>
                  {LEVEL_NAMES[level]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`button-edit-child-${junior.id}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} data-testid={`button-delete-child-${junior.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/40" data-testid={`stat-skill-${junior.id}`}>
            <MiniGauge value={skillPercent} size={44} />
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Skills</span>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/40" data-testid={`stat-attendance-${junior.id}`}>
            <div className="text-lg font-bold text-emerald-500">{attendance}%</div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Attend.</span>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/40" data-testid={`stat-effort-${junior.id}`}>
            <div className="flex items-center gap-0.5">
              <Star className={`h-4 w-4 ${effortRating >= 1 ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              <span className="text-lg font-bold">{effortRating}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Effort</span>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-muted/40" data-testid={`stat-coach-${junior.id}`}>
            <div className="flex items-center gap-0.5">
              <Star className={`h-4 w-4 ${coachRating >= 1 ? "text-emerald-400 fill-emerald-400" : "text-muted-foreground/30"}`} />
              <span className="text-lg font-bold">{coachRating}</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Coach</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm" data-testid={`info-assessed-${junior.id}`}>
            <BarChart3 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-xs"><strong>{skillsAssessed}</strong> skills</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm" data-testid={`info-awards-${junior.id}`}>
            <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs"><strong>{achievements.length}</strong> award{achievements.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm" data-testid={`info-videos-${junior.id}`}>
            <Video className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-xs"><strong>{videos.length}</strong> video{videos.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/10 mb-4" data-testid={`info-fees-${junior.id}`}>
          <div className="flex items-center gap-2 mb-2">
            <PoundSterling className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Session Fees</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-bold">£15</p>
              <p className="text-[10px] text-muted-foreground">Group</p>
            </div>
            <div>
              <p className="text-sm font-bold">£25</p>
              <p className="text-[10px] text-muted-foreground">1-to-1</p>
            </div>
            <div>
              <p className="text-sm font-bold">£8</p>
              <p className="text-[10px] text-muted-foreground">Match</p>
            </div>
          </div>
        </div>

        {(junior.emergencyContact || junior.medicalNotes) && (
          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            {junior.emergencyContact && (
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Emergency:</span>
                <p className="font-medium mt-0.5">{junior.emergencyContact}</p>
              </div>
            )}
            {junior.medicalNotes && (
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground">Medical:</span>
                <p className="font-medium mt-0.5">{junior.medicalNotes}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/juniors/dashboard/${junior.id}`}>
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600" data-testid={`button-view-dashboard-${junior.id}`}>
              <Activity className="h-3.5 w-3.5 mr-1" />
              Full Dashboard
            </Button>
          </Link>
          {hasClubs && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddToClub}
              data-testid={`button-add-to-club-${junior.id}`}
            >
              <Building2 className="h-3.5 w-3.5 mr-1" />
              Add to Club
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyChildrenSection() {
  const { data: user } = useUser();
  const { toast } = useToast();

  const { data: juniors, isLoading } = useQuery<any[]>({
    queryKey: ["/api/juniors"],
    enabled: !!user,
  });

  const { data: profiles } = useQuery<any[]>({
    queryKey: ["/api/player-profiles"],
    enabled: !!user,
  });

  const parentClubs = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter((p: any) => p.membershipStatus === "APPROVED").map((p: any) => ({
      clubId: p.clubId,
      clubName: p.club?.name || `Club ${p.clubId}`,
    }));
  }, [profiles]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJunior, setEditingJunior] = useState<any>(null);
  const [deletingJuniorId, setDeletingJuniorId] = useState<number | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "MALE",
    emergencyContact: "",
    medicalNotes: "",
  });

  const [addToClubDialog, setAddToClubDialog] = useState<{ juniorId: number; juniorName: string } | null>(null);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("C3");

  const resetForm = () => setForm({ fullName: "", dateOfBirth: "", gender: "MALE", emergencyContact: "", medicalNotes: "" });

  const openAdd = () => {
    setEditingJunior(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (junior: any) => {
    setEditingJunior(junior);
    setForm({
      fullName: junior.fullName || "",
      dateOfBirth: junior.dateOfBirth ? new Date(junior.dateOfBirth).toISOString().split("T")[0] : "",
      gender: junior.gender || "MALE",
      emergencyContact: junior.emergencyContact || "",
      medicalNotes: junior.medicalNotes || "",
    });
    setDialogOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/juniors", data);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Child Added", description: "Your child's account has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/juniors/${id}`, data);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Child Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setDialogOpen(false);
      setEditingJunior(null);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/juniors/${id}`);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
    },
    onSuccess: () => {
      toast({ title: "Child Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setDeletingJuniorId(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addToClubMutation = useMutation({
    mutationFn: async ({ juniorId, clubId, grade }: { juniorId: number; clubId: number; grade: string }) => {
      const res = await apiRequest("POST", `/api/juniors/${juniorId}/clubs/${clubId}`, { grade });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Added to Club" });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setAddToClubDialog(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const payload = {
      fullName: form.fullName,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender,
      emergencyContact: form.emergencyContact || undefined,
      medicalNotes: form.medicalNotes || undefined,
    };
    if (editingJunior) {
      editMutation.mutate({ id: editingJunior.id, data: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-pink-500/10 rounded-lg p-2">
            <Heart className="h-5 w-5 text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold" data-testid="text-my-children">My Children</h2>
          {juniors && (
            <Badge variant="secondary">{juniors.length}</Badge>
          )}
        </div>
        <Button onClick={openAdd} data-testid="button-add-child">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !juniors || juniors.length === 0 ? (
        <Card className="border-dashed" data-testid="card-no-children">
          <CardContent className="p-8 text-center">
            <Baby className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No Children Added Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your child's profile to sign them up for junior sessions and manage their account.
            </p>
            <Button onClick={openAdd} variant="outline" data-testid="button-add-first-child">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {juniors.map((junior: any) => (
            <ChildProfileCard
              key={junior.id}
              junior={junior}
              onEdit={() => openEdit(junior)}
              onDelete={() => setDeletingJuniorId(junior.id)}
              onAddToClub={() => {
                setAddToClubDialog({ juniorId: junior.id, juniorName: junior.fullName });
                setSelectedClubId("");
                setSelectedGrade("C3");
              }}
              hasClubs={parentClubs.length > 0}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingJunior(null); resetForm(); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-child-form">
          <DialogHeader>
            <DialogTitle>{editingJunior ? "Edit Child" : "Add New Child"}</DialogTitle>
            <DialogDescription>
              {editingJunior ? "Update your child's details below." : "Fill in your child's details to create their profile."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-name" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="child-name"
                value={form.fullName}
                onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Your child's full name"
                className="mt-1"
                data-testid="input-child-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="child-dob" className="text-sm font-medium">Date of Birth</Label>
                <Input
                  id="child-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className="mt-1"
                  data-testid="input-child-dob"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="mt-1" data-testid="select-child-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="child-emergency" className="text-sm font-medium">Emergency Contact</Label>
              <Input
                id="child-emergency"
                value={form.emergencyContact}
                onChange={(e) => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                placeholder="Emergency contact name and phone number"
                className="mt-1"
                data-testid="input-child-emergency"
              />
            </div>
            <div>
              <Label htmlFor="child-medical" className="text-sm font-medium">Medical Notes</Label>
              <Textarea
                id="child-medical"
                value={form.medicalNotes}
                onChange={(e) => setForm(f => ({ ...f, medicalNotes: e.target.value }))}
                placeholder="Any allergies, medical conditions, or special requirements..."
                className="mt-1 min-h-[80px]"
                data-testid="input-child-medical"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingJunior(null); resetForm(); }} data-testid="button-cancel-child">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.fullName.trim() || addMutation.isPending || editMutation.isPending}
              data-testid="button-save-child"
            >
              {(addMutation.isPending || editMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingJunior ? "Save Changes" : "Add Child"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingJuniorId} onOpenChange={(open) => { if (!open) setDeletingJuniorId(null); }}>
        <AlertDialogContent data-testid="dialog-delete-child">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Child</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this child's account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-child">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingJuniorId) deleteMutation.mutate(deletingJuniorId); }}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-child"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!addToClubDialog} onOpenChange={(open) => { if (!open) setAddToClubDialog(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-add-to-club">
          <DialogHeader>
            <DialogTitle>Add to Club</DialogTitle>
            <DialogDescription>
              {addToClubDialog ? `Add ${addToClubDialog.juniorName} to one of your clubs.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Select Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="mt-1" data-testid="select-club-for-child">
                  <SelectValue placeholder="Choose a club..." />
                </SelectTrigger>
                <SelectContent>
                  {parentClubs.map((c: any) => (
                    <SelectItem key={c.clubId} value={String(c.clubId)}>{c.clubName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Starting Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="mt-1" data-testid="select-grade-for-child">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToClubDialog(null)} data-testid="button-cancel-club-add">Cancel</Button>
            <Button
              disabled={!selectedClubId || addToClubMutation.isPending}
              onClick={() => {
                if (addToClubDialog && selectedClubId) {
                  addToClubMutation.mutate({ juniorId: addToClubDialog.juniorId, clubId: Number(selectedClubId), grade: selectedGrade });
                }
              }}
              data-testid="button-confirm-club-add"
            >
              {addToClubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add to Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Juniors() {
  return (
    <div className="space-y-8 pb-8">
      <JuniorHero />
      <MyChildrenSection />
      <JuniorSessionsSection />
      <WhatWeDoSection />
      <PricingSection />
      <SafeguardingSection />
    </div>
  );
}

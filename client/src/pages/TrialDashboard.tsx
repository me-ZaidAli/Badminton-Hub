import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  CheckCircle2, Circle, Clock, Calendar, MapPin, User, Building2,
  Loader2, ArrowRight, Star, AlertTriangle, XCircle, Trophy, ClipboardCheck,
  Timer, Dumbbell, Target, Heart, Users, Handshake
} from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { useState, useEffect } from "react";

interface SuggestedExercise {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number | null;
  reps: number | null;
  sets: number | null;
  equipment: string | null;
}

interface TrialDetails {
  id: number;
  userId: number;
  clubId: number;
  referralId: number | null;
  status: string;
  assignedSessionId: number | null;
  observerUserId: number | null;
  selfAssessedLevel: string | null;
  experience: string | null;
  preferredDays: string[] | null;
  adminNotes: string | null;
  statusMessage: string | null;
  finalDecision: string | null;
  createdAt: string;
  updatedAt: string;
  clubName: string | null;
  observerName: string | null;
  session: {
    id: number;
    title: string;
    date: string;
    startTime: string;
    endTime: string | null;
    venueName: string | null;
    venueAddress: string | null;
    venuePostcode: string | null;
    matchMode: string | null;
  } | null;
  evaluation: {
    technicalLevel: number;
    tacticalUnderstanding: number;
    movementFootwork: number;
    matchAwareness: number;
    communicationAttitude: number;
    overallScore: string;
    recommendation: string;
    adminOverrideDecision: string | null;
    notes: string | null;
  } | null;
  suggestedExercises: SuggestedExercise[];
}

function SessionCountdown({ sessionDate, startTime }: { sessionDate: string; startTime: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = format(new Date(sessionDate), "yyyy-MM-dd");
  const target = new Date(`${dateStr}T${startTime || "00:00"}`);

  if (isPast(target)) {
    return (
      <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20" data-testid="countdown-past">
        <p className="text-sm font-medium text-primary">Your trial session has started or already taken place</p>
      </div>
    );
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  return (
    <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20" data-testid="countdown-timer">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Your trial starts in</p>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{days}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Days</p>
        </div>
        <span className="text-2xl text-muted-foreground/40 font-light">:</span>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{hours}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Hours</p>
        </div>
        <span className="text-2xl text-muted-foreground/40 font-light">:</span>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{minutes}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Minutes</p>
        </div>
      </div>
    </div>
  );
}

const STAGES = [
  { key: "PENDING", label: "Registration Complete", icon: CheckCircle2 },
  { key: "PENDING_ACTIVE", label: "Trial Pending", icon: Clock },
  { key: "SCHEDULED", label: "Trial Scheduled", icon: Calendar },
  { key: "ATTENDED", label: "Trial Attended", icon: ClipboardCheck },
  { key: "EVALUATED", label: "Evaluation", icon: Star },
  { key: "FINAL", label: "Decision", icon: Trophy },
];

function getStageIndex(status: string): number {
  switch (status) {
    case "PENDING": return 1;
    case "SCHEDULED": return 2;
    case "ATTENDED": return 3;
    case "EVALUATED": return 4;
    case "APPROVED":
    case "REDIRECTED":
    case "REJECTED": return 5;
    default: return 0;
  }
}

export default function TrialDashboard() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: trial, isLoading } = useQuery<TrialDetails>({
    queryKey: ["/api/trial-players/me"],
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trial-players/confirm-join");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Welcome!", description: "You are now a full club member." });
      queryClient.invalidateQueries({ queryKey: ["/api/trial-players/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setTimeout(() => setLocation("/dashboard"), 1500);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" data-testid="loader-trial-dashboard" />
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold" data-testid="text-no-trial">No Trial Record Found</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have an active trial registration. If you believe this is an error, please contact the club administrator.
        </p>
      </div>
    );
  }

  const currentStageIndex = getStageIndex(trial.status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Trial Dashboard"
        description={trial.clubName ? `Your trial journey with ${trial.clubName}` : "Track your trial progress"}
      />

      <Card data-testid="card-progress-tracker">
        <CardHeader>
          <CardTitle className="text-lg">Progress Tracker</CardTitle>
          <CardDescription>Follow your trial onboarding journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-1">
            {STAGES.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const StageIcon = stage.icon;

              let statusColor = "text-muted-foreground";
              let bgColor = "bg-muted";
              let lineColor = "bg-muted";

              if (isCompleted) {
                statusColor = "text-emerald-500";
                bgColor = "bg-emerald-500/10";
                lineColor = "bg-emerald-500";
              } else if (isCurrent) {
                statusColor = "text-primary";
                bgColor = "bg-primary/10";
              }

              let stageLabel = stage.label;
              if (index === 5 && currentStageIndex >= 5) {
                if (trial.finalDecision === "APPROVED") stageLabel = "Approved";
                else if (trial.finalDecision === "REDIRECTED") stageLabel = "Redirected";
                else if (trial.finalDecision === "REJECTED") stageLabel = "Not Approved";
              }

              return (
                <div key={stage.key} className="flex items-start gap-3" data-testid={`stage-${stage.key}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bgColor}`}>
                      {isCompleted ? (
                        <CheckCircle2 className={`w-5 h-5 ${statusColor}`} />
                      ) : isCurrent ? (
                        <StageIcon className={`w-5 h-5 ${statusColor}`} />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                    {index < STAGES.length - 1 && (
                      <div className={`w-0.5 h-8 ${isCompleted ? lineColor : "bg-muted"}`} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`text-sm font-medium ${isCurrent ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                      {stageLabel}
                    </p>
                    {isCurrent && (
                      <Badge variant="outline" className="mt-1 text-xs" data-testid="badge-current-stage">
                        Current Stage
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-trial-details">
        <CardHeader>
          <CardTitle className="text-lg">Trial Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3" data-testid="text-club-name">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Club</p>
                <p className="text-sm font-medium">{trial.clubName || "Not assigned"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3" data-testid="text-trial-status">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={trial.status === "APPROVED" ? "default" : trial.status === "REJECTED" ? "destructive" : "secondary"}
                  data-testid="badge-trial-status"
                >
                  {trial.status}
                </Badge>
              </div>
            </div>

            {trial.selfAssessedLevel && (
              <div className="flex items-center gap-3" data-testid="text-self-level">
                <Star className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Self-Assessed Level</p>
                  <p className="text-sm font-medium capitalize">{trial.selfAssessedLevel.toLowerCase()}</p>
                </div>
              </div>
            )}

            {trial.observerName && (
              <div className="flex items-center gap-3" data-testid="text-observer-name">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Observer</p>
                  <p className="text-sm font-medium">{trial.observerName}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {trial.session && (
        <Card data-testid="card-session-info" className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Your Trial Session
            </CardTitle>
            <CardDescription>
              We're looking forward to seeing you play! Here are all the details for your trial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SessionCountdown sessionDate={trial.session.date} startTime={trial.session.startTime} />

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="font-semibold text-base" data-testid="text-session-title">{trial.session.title}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium" data-testid="text-session-date">
                      {trial.session.date ? format(new Date(trial.session.date), "EEEE, d MMMM yyyy") : "Date TBC"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium" data-testid="text-session-time">
                      {trial.session.startTime || "TBC"}
                      {trial.session.endTime ? ` - ${trial.session.endTime}` : ""}
                    </p>
                  </div>
                </div>

                {trial.session.venueName && (
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium" data-testid="text-session-venue">{trial.session.venueName}</p>
                      {(trial.session.venueAddress || trial.session.venuePostcode) && (
                        <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-session-address">
                          {[trial.session.venueAddress, trial.session.venuePostcode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {trial.session.matchMode && (
                  <div className="flex items-start gap-2.5">
                    <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Format</p>
                      <p className="text-sm font-medium capitalize">{trial.session.matchMode.toLowerCase()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {trial.session && (trial.status === "SCHEDULED" || trial.status === "PENDING") && (
        <Card data-testid="card-trial-expectations">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              What to Expect & How to Prepare
            </CardTitle>
            <CardDescription>
              Here's what we'll be looking for during your trial. Don't worry - just play your best and enjoy the session!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Play at Your Level</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show us you can play at the level you've assessed yourself at ({trial.selfAssessedLevel?.toLowerCase() || "your level"}). Demonstrate consistent technique, shot placement, and court awareness.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Know the Rules</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Demonstrate a good understanding of the rules of the game, including scoring, serving, and court rotations. If you're unsure about anything, don't hesitate to ask.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Handshake className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Partner Coordination</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In doubles, show that you can communicate and coordinate effectively with your partner. Good positioning, calling shots, and supporting each other are key.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Attitude & Sportsmanship</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A positive attitude goes a long way! Be kind and respectful to all players, encourage others, and show good sportsmanship whether you win or lose.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Be Part of the Team</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Our club is a community. Introduce yourself, be friendly, and show that you'd be a great addition to the group. We value players who lift everyone around them.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Tip:</span> Arrive 10-15 minutes early, bring water, and wear appropriate sports clothing and non-marking court shoes. Most importantly - have fun!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {trial.session && trial.suggestedExercises && trial.suggestedExercises.length > 0 && (trial.status === "SCHEDULED" || trial.status === "PENDING") && (
        <Card data-testid="card-suggested-exercises">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Warm-Up Exercises
            </CardTitle>
            <CardDescription>
              Try these exercises before your trial to get yourself warmed up and ready to play.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trial.suggestedExercises.map((ex) => (
                <div key={ex.id} className="p-3 rounded-md border bg-card space-y-1.5" data-testid={`exercise-${ex.id}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                      {ex.difficulty.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{ex.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                    {ex.durationMinutes && <span>{ex.durationMinutes} min</span>}
                    {ex.reps && ex.sets && <span>{ex.sets} x {ex.reps} reps</span>}
                    {ex.category && <Badge variant="secondary" className="text-[9px] capitalize h-4">{ex.category.toLowerCase()}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trial.evaluation && (
        <Card data-testid="card-evaluation">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Evaluation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Technical", value: trial.evaluation.technicalLevel },
                { label: "Tactical", value: trial.evaluation.tacticalUnderstanding },
                { label: "Movement", value: trial.evaluation.movementFootwork },
                { label: "Match Awareness", value: trial.evaluation.matchAwareness },
                { label: "Communication", value: trial.evaluation.communicationAttitude },
              ].map((cat) => (
                <div key={cat.label} className="text-center p-3 rounded-md bg-muted/50" data-testid={`score-${cat.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <p className="text-2xl font-bold text-foreground">{cat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.label}</p>
                </div>
              ))}
              <div className="text-center p-3 rounded-md bg-primary/10" data-testid="score-overall">
                <p className="text-2xl font-bold text-primary">{parseFloat(trial.evaluation.overallScore).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Overall</p>
              </div>
            </div>
            {trial.evaluation.notes && (
              <div className="p-3 rounded-md bg-muted/30" data-testid="text-eval-notes">
                <p className="text-xs text-muted-foreground mb-1">Evaluator Notes</p>
                <p className="text-sm">{trial.evaluation.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {trial.statusMessage && (
        <Card data-testid="card-status-message">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Message from Admin</p>
                <p className="text-sm" data-testid="text-admin-message">{trial.statusMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {trial.finalDecision === "APPROVED" && (
        <Card className="border-emerald-500/30" data-testid="card-approved">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Congratulations!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your trial has been approved. Click below to confirm and join the club as a full member.
                </p>
              </div>
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                data-testid="button-join-club"
              >
                {joinMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Join Club
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {trial.finalDecision === "REDIRECTED" && (
        <Card className="border-amber-500/30" data-testid="card-redirected">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ArrowRight className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Redirected to BPG Training</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Based on your evaluation, we recommend joining our Beginner Programme Group (BPG) to help you develop your skills further. This will prepare you to join the club at a competitive level in the future.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Link href="/clubs">
                  <Button variant="default" data-testid="button-browse-clubs-redirected">
                    <Building2 className="w-4 h-4 mr-2" />
                    Browse Clubs
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" data-testid="button-go-dashboard-redirected">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {trial.finalDecision === "REJECTED" && (
        <Card className="border-destructive/30" data-testid="card-rejected">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Application Not Successful</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Thank you for your interest. Unfortunately, we are unable to offer a place at this time. We encourage you to continue developing your skills and try again in the future.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Link href="/clubs">
                  <Button variant="default" data-testid="button-browse-clubs-rejected">
                    <Building2 className="w-4 h-4 mr-2" />
                    Browse Clubs
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" data-testid="button-go-dashboard-rejected">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

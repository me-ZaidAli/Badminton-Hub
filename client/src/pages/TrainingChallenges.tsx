import { useUser } from "@/hooks/use-auth";
import { ExerciseChallengePanel } from "@/pages/Juniors";
import { Dumbbell } from "lucide-react";

export default function TrainingChallenges() {
  const { data: user } = useUser();
  const isAdmin = !!user && ((user as any).role === "OWNER" || (user as any).role === "ADMIN");
  const selfAsParticipant = user
    ? [{ id: (user as any).id, fullName: (user as any).fullName || (user as any).username || "Me" }]
    : [];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-3 bg-orange-500/10">
          <Dumbbell className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Training Challenges</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly exercise programs, drills and tutorials. Track what you've completed.
          </p>
        </div>
      </div>
      <ExerciseChallengePanel isAdmin={isAdmin} juniors={selfAsParticipant} isSelfView />
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { GraduationCap, Loader2, Search, BookOpen, Settings, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-auth";

const FindCoach = lazy(() => import("@/pages/FindCoach"));
const MyLessons = lazy(() => import("@/pages/MyLessons"));
const CoachDashboard = lazy(() => import("@/pages/CoachDashboard"));
const MyTrainingProfile = lazy(() => import("@/pages/MyTrainingProfile"));

const Fallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
  </div>
);

export default function Coaching() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: user } = useUser();
  const u = user as any;
  const isCoachish = u && (u.role === "COACH" || (u.secondaryRoles ?? []).includes("COACH") || u.role === "OWNER" || u.role === "ADMIN");

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const tab = params.get("tab") || "find";

  useEffect(() => {
    document.title = "Coaching | Club Master";
  }, []);

  const onTabChange = (v: string) => {
    const next = new URLSearchParams(search);
    next.set("tab", v);
    setLocation(`/coaching?${next.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-2xl p-3 bg-violet-500/15 border border-violet-400/30 shadow-[0_0_24px_rgba(167,139,250,0.25)]">
            <GraduationCap className="h-6 w-6 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-coaching-title">Coaching</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Find a coach, track your lessons, and manage your dashboard.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="bg-zinc-900/70 border border-violet-400/20 backdrop-blur p-1 rounded-full flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="find" data-testid="tab-coaching-find" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_14px_rgba(167,139,250,0.45)]">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Find a Coach
            </TabsTrigger>
            <TabsTrigger value="lessons" data-testid="tab-coaching-lessons" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_14px_rgba(167,139,250,0.45)]">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> My Lessons
            </TabsTrigger>
            <TabsTrigger value="training-profile" data-testid="tab-coaching-training-profile" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_14px_rgba(167,139,250,0.45)]">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> My Training Profile
            </TabsTrigger>
            {isCoachish && (
              <TabsTrigger value="dashboard" data-testid="tab-coaching-dashboard" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_14px_rgba(167,139,250,0.45)]">
                <Settings className="w-3.5 h-3.5 mr-1.5" /> Coach Dashboard
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="find" className="mt-4">
            <Suspense fallback={<Fallback />}><FindCoach /></Suspense>
          </TabsContent>
          <TabsContent value="lessons" className="mt-4">
            <Suspense fallback={<Fallback />}><MyLessons /></Suspense>
          </TabsContent>
          <TabsContent value="training-profile" className="mt-4">
            <Suspense fallback={<Fallback />}><MyTrainingProfile /></Suspense>
          </TabsContent>
          {isCoachish && (
            <TabsContent value="dashboard" className="mt-4">
              <Suspense fallback={<Fallback />}><CoachDashboard /></Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

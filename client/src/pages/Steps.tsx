import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footprints, Flame, TrendingUp, Target, Calendar as CalendarIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

interface StepsSummary {
  todaySteps: number;
  weekTotal: number;
  weekAvg: number;
  monthTotal: number;
  monthAvg: number;
  streak: number;
  last7: Array<{ date: string; steps: number }>;
  last30: Array<{ date: string; steps: number }>;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Steps() {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(todayISO());
  const [stepsInput, setStepsInput] = useState<string>("");
  const [goal, setGoal] = useState<number>(() => {
    if (typeof window === "undefined") return 10000;
    const stored = Number(localStorage.getItem("stepsGoal") || 10000);
    return Number.isFinite(stored) && stored > 0 ? stored : 10000;
  });

  const summaryQuery = useQuery<StepsSummary>({ queryKey: ["/api/steps/me/summary"] });

  useEffect(() => {
    if (summaryQuery.data && date === todayISO()) {
      setStepsInput(String(summaryQuery.data.todaySteps || ""));
    }
  }, [summaryQuery.data, date]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { date: string; steps: number }) => {
      const res = await apiRequest("POST", "/api/steps/me", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/steps/me/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/steps/me"] });
      toast({ title: "Steps saved", description: "Keep moving!" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save", description: err?.message ?? "Unknown error", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const n = Number(stepsInput);
    if (!Number.isFinite(n) || n < 0) {
      toast({ title: "Invalid number", description: "Enter a step count between 0 and 200,000.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ date, steps: Math.round(n) });
  };

  const handleGoalChange = (v: string) => {
    const n = Math.max(1000, Math.min(50000, Number(v) || 10000));
    setGoal(n);
    localStorage.setItem("stepsGoal", String(n));
  };

  const chartData = useMemo(
    () =>
      (summaryQuery.data?.last7 ?? []).map((r) => ({
        label: format(parseISO(r.date), "EEE"),
        steps: r.steps,
        date: r.date,
      })),
    [summaryQuery.data],
  );

  const todayPct = summaryQuery.data ? Math.min(100, Math.round((summaryQuery.data.todaySteps / goal) * 100)) : 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center gap-3" data-testid="header-steps">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Footprints className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Steps Tracker</h1>
          <p className="text-sm text-muted-foreground">Log your daily steps and watch your streak grow.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card data-testid="card-today">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Footprints className="h-4 w-4" /> Today
            </div>
            <div className="text-3xl font-bold text-foreground mt-1" data-testid="text-today-steps">
              {(summaryQuery.data?.todaySteps ?? 0).toLocaleString()}
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${todayPct}%` }}
                data-testid="bar-today-progress"
              />
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{todayPct}% of {goal.toLocaleString()} goal</div>
          </CardContent>
        </Card>
        <Card data-testid="card-streak">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Flame className="h-4 w-4" /> Streak
            </div>
            <div className="text-3xl font-bold text-foreground mt-1" data-testid="text-streak">
              {summaryQuery.data?.streak ?? 0} <span className="text-base font-normal text-muted-foreground">days</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Consecutive days logged</div>
          </CardContent>
        </Card>
        <Card data-testid="card-week-avg">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <TrendingUp className="h-4 w-4" /> 7-day avg
            </div>
            <div className="text-3xl font-bold text-foreground mt-1" data-testid="text-week-avg">
              {(summaryQuery.data?.weekAvg ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Total {(summaryQuery.data?.weekTotal ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-month-avg">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Target className="h-4 w-4" /> 30-day avg
            </div>
            <div className="text-3xl font-bold text-foreground mt-1" data-testid="text-month-avg">
              {(summaryQuery.data?.monthAvg ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Total {(summaryQuery.data?.monthTotal ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-log-steps">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CalendarIcon className="h-5 w-5" /> Log steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="step-date" className="text-foreground">Date</Label>
              <Input
                id="step-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-step-date"
              />
            </div>
            <div>
              <Label htmlFor="step-count" className="text-foreground">Steps</Label>
              <Input
                id="step-count"
                type="number"
                inputMode="numeric"
                min={0}
                max={200000}
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                placeholder="0"
                data-testid="input-step-count"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-steps"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <Label htmlFor="goal" className="text-foreground">Daily goal</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                id="goal"
                type="number"
                min={1000}
                max={50000}
                step={500}
                value={goal}
                onChange={(e) => handleGoalChange(e.target.value)}
                className="max-w-[180px]"
                data-testid="input-goal"
              />
              <span className="text-xs text-muted-foreground">steps/day (saved on this device)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-week-chart">
        <CardHeader>
          <CardTitle className="text-foreground">This week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(v: any) => [Number(v).toLocaleString(), "Steps"]}
                />
                <Bar dataKey="steps" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

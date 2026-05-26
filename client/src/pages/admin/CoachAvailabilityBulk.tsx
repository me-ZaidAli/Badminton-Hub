import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Zap, Sun, Copy, Repeat, Trash2, Loader2, CheckCircle2, ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";

const DAYS = [
  { dow: 1, short: "Mon", long: "Monday" },
  { dow: 2, short: "Tue", long: "Tuesday" },
  { dow: 3, short: "Wed", long: "Wednesday" },
  { dow: 4, short: "Thu", long: "Thursday" },
  { dow: 5, short: "Fri", long: "Friday" },
  { dow: 6, short: "Sat", long: "Saturday" },
  { dow: 0, short: "Sun", long: "Sunday" },
];

type CoachRow = {
  id: number;
  userId: number;
  status: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};
type RuleRow = {
  id: number;
  coachId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isFlexible: boolean;
};
type OverrideRow = {
  id: number;
  coachId: number;
  date: string;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};
type Snapshot = {
  coachId: number;
  rules: RuleRow[];
  overrides: OverrideRow[];
  defaultPricePence: number;
  holidayMode: boolean;
};

function coachLabel(c: CoachRow) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return name || c.email || `Coach #${c.id}`;
}

export default function CoachAvailabilityBulkPage() {
  const { toast } = useToast();
  const [coachId, setCoachId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<null | "WEEKLY_RULES" | "FUTURE_OVERRIDES" | "BOTH">(null);

  // Standard week form
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [stdStart, setStdStart] = useState("17:00");
  const [stdEnd, setStdEnd] = useState("22:00");
  const [stdFlexible, setStdFlexible] = useState(true);
  const [stdPrice, setStdPrice] = useState<string>("15.00");

  // Copy day
  const [copySource, setCopySource] = useState<number>(1);
  const [copyTargets, setCopyTargets] = useState<number[]>([2, 3, 4, 5]);

  const coachesQuery = useQuery<CoachRow[]>({
    queryKey: ["/api/admin/coach-availability/coaches"],
  });
  const snapshotQuery = useQuery<Snapshot>({
    queryKey: ["/api/admin/coach-availability", coachId, "snapshot"],
    enabled: !!coachId,
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/admin/coach-availability/${coachId}/snapshot`);
      return r.json();
    },
  });

  const invalidateSnap = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-availability", coachId, "snapshot"] });

  const standardWeekMut = useMutation({
    mutationFn: async () => {
      const pricePence = stdPrice.trim() ? Math.round(parseFloat(stdPrice) * 100) : undefined;
      const r = await apiRequest("POST", `/api/admin/coach-availability/${coachId}/standard-week`, {
        days: selectedDays,
        startTime: stdStart,
        endTime: stdEnd,
        isFlexible: stdFlexible,
        replaceExisting: true,
        ...(typeof pricePence === "number" && Number.isFinite(pricePence) ? { defaultPricePence: pricePence } : {}),
      });
      return r.json();
    },
    onSuccess: (d: any) => {
      toast({ title: "Standard week applied", description: `Set ${d.applied} day(s) ${stdStart}–${stdEnd}` });
      invalidateSnap();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" }),
  });

  const fullDayMut = useMutation({
    mutationFn: async (dow: number) => {
      const r = await apiRequest("POST", `/api/admin/coach-availability/${coachId}/full-day`, {
        dayOfWeek: dow, startTime: "08:00", endTime: "22:00",
      });
      return r.json();
    },
    onSuccess: (_d, dow) => {
      toast({ title: "Full day set", description: `${DAYS.find((x) => x.dow === dow)?.long} 08:00–22:00 (flexible)` });
      invalidateSnap();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" }),
  });

  const copyMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/coach-availability/${coachId}/copy-day`, {
        sourceDay: copySource, targetDays: copyTargets, replaceExisting: true,
      });
      return r.json();
    },
    onSuccess: (d: any) => {
      toast({ title: "Copied", description: `Copied to ${d.copiedTo} day(s)` });
      invalidateSnap();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" }),
  });

  const repeatMut = useMutation({
    mutationFn: async (weeks: 1 | 2 | 4) => {
      const r = await apiRequest("POST", `/api/admin/coach-availability/${coachId}/repeat-week`, { weeks });
      return r.json();
    },
    onSuccess: (d: any, weeks) => {
      toast({ title: "Repeated", description: `Locked in ${d.inserted} window(s) across ${weeks} week(s)` });
      invalidateSnap();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" }),
  });

  const clearMut = useMutation({
    mutationFn: async (scope: "WEEKLY_RULES" | "FUTURE_OVERRIDES" | "BOTH") => {
      const r = await apiRequest("POST", `/api/admin/coach-availability/${coachId}/clear`, { scope });
      return r.json();
    },
    onSuccess: (_d, scope) => {
      toast({ title: "Cleared", description: scope.replace("_", " ").toLowerCase() });
      setShowClearConfirm(null);
      invalidateSnap();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" }),
  });

  // Group rules by day for display
  const rulesByDay = useMemo(() => {
    const m = new Map<number, RuleRow[]>();
    for (const d of DAYS) m.set(d.dow, []);
    for (const r of snapshotQuery.data?.rules ?? []) {
      const arr = m.get(r.dayOfWeek) ?? [];
      arr.push(r);
      m.set(r.dayOfWeek, arr);
    }
    return m;
  }, [snapshotQuery.data]);

  const toggleDay = (dow: number, list: number[], set: (v: number[]) => void) => {
    set(list.includes(dow) ? list.filter((d) => d !== dow) : [...list, dow]);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto space-y-6" data-testid="page-coach-availability-bulk">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Admin
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Coach Availability — Bulk Tools</h1>
        </div>
        <Badge variant="outline" className="text-xs">Admin / Super Admin only</Badge>
      </div>

      {/* Coach picker */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select coach</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={coachId ? String(coachId) : ""} onValueChange={(v) => setCoachId(Number(v))}>
            <SelectTrigger className="w-full sm:w-96" data-testid="select-coach">
              <SelectValue placeholder="Pick a coach…" />
            </SelectTrigger>
            <SelectContent>
              {(coachesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)} data-testid={`select-coach-${c.id}`}>
                  {coachLabel(c)} {c.status !== "APPROVED" && <span className="ml-2 text-xs text-muted-foreground">({c.status})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <AnimatePresence>
        {coachId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* 1. STANDARD WEEK */}
            <Card className="border-2 border-primary/40 shadow-lg shadow-primary/10 overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-primary" />
                  Set standard week hours
                  <Badge className="ml-2 text-[10px]">FASTEST</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Set your usual working hours for all selected days in 1 click.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Working days</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map((d) => {
                      const active = selectedDays.includes(d.dow);
                      return (
                        <button
                          key={d.dow}
                          type="button"
                          onClick={() => toggleDay(d.dow, selectedDays, setSelectedDays)}
                          data-testid={`btn-stdday-${d.short.toLowerCase()}`}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30 scale-105"
                              : "bg-card text-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {active ? "✓ " : ""}{d.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="std-start" className="text-xs uppercase tracking-wider text-muted-foreground">Start</Label>
                    <Input id="std-start" type="time" value={stdStart} onChange={(e) => setStdStart(e.target.value)} data-testid="input-std-start" />
                  </div>
                  <div>
                    <Label htmlFor="std-end" className="text-xs uppercase tracking-wider text-muted-foreground">End</Label>
                    <Input id="std-end" type="time" value={stdEnd} onChange={(e) => setStdEnd(e.target.value)} data-testid="input-std-end" />
                  </div>
                  <div>
                    <Label htmlFor="std-price" className="text-xs uppercase tracking-wider text-muted-foreground">Default £/hour</Label>
                    <Input id="std-price" type="number" step="0.01" min="0" value={stdPrice} onChange={(e) => setStdPrice(e.target.value)} placeholder="15.00" data-testid="input-std-price" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg">
                  <div>
                    <Label htmlFor="std-flex" className="font-medium cursor-pointer">Flexible window (player picks duration)</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Green = full flexible. Off = fixed slots.</p>
                  </div>
                  <Switch id="std-flex" checked={stdFlexible} onCheckedChange={setStdFlexible} data-testid="switch-std-flexible" />
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all"
                  onClick={() => standardWeekMut.mutate()}
                  disabled={!selectedDays.length || standardWeekMut.isPending}
                  data-testid="button-apply-standard-week"
                >
                  {standardWeekMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Apply to {selectedDays.length} selected day{selectedDays.length === 1 ? "" : "s"}
                </Button>
              </CardContent>
            </Card>

            {/* 2. CURRENT WEEK SNAPSHOT */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>This week's setup</span>
                  {snapshotQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                  {DAYS.map((d) => {
                    const rules = rulesByDay.get(d.dow) ?? [];
                    const flexible = rules.some((r) => r.isFlexible);
                    const fixed = rules.some((r) => !r.isFlexible);
                    const closed = rules.length === 0;
                    const tone = closed
                      ? "bg-muted/30 border-border/60 text-muted-foreground"
                      : flexible
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-sky-500/50 bg-sky-500/10";
                    return (
                      <div
                        key={d.dow}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${tone}`}
                        data-testid={`day-card-${d.short.toLowerCase()}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-bold uppercase tracking-wider">{d.short}</div>
                          {closed ? (
                            <span className="text-[10px]">⚫</span>
                          ) : flexible ? (
                            <span className="text-[10px]">🟢</span>
                          ) : (
                            <span className="text-[10px]">🔵</span>
                          )}
                        </div>
                        {closed ? (
                          <div className="text-xs italic">Closed</div>
                        ) : (
                          <div className="space-y-1">
                            {rules.map((r) => (
                              <div key={r.id} className="text-xs font-medium">
                                {r.startTime}–{r.endTime}
                                {r.isFlexible && <span className="ml-1 text-[10px] opacity-70">flex</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="w-full mt-2 h-7 text-xs"
                          onClick={() => fullDayMut.mutate(d.dow)}
                          disabled={fullDayMut.isPending}
                          data-testid={`button-fullday-${d.short.toLowerCase()}`}
                        >
                          <Sun className="h-3 w-3 mr-1" /> Full day
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3. COPY DAY → DAYS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4 text-primary" /> Copy day to days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Source day</Label>
                    <Select value={String(copySource)} onValueChange={(v) => setCopySource(Number(v))}>
                      <SelectTrigger data-testid="select-copy-source"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d.dow} value={String(d.dow)}>{d.long}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target days</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DAYS.filter((d) => d.dow !== copySource).map((d) => {
                        const active = copyTargets.includes(d.dow);
                        return (
                          <button
                            key={d.dow}
                            type="button"
                            onClick={() => toggleDay(d.dow, copyTargets, setCopyTargets)}
                            data-testid={`btn-copyday-${d.short.toLowerCase()}`}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-foreground border-border hover:border-primary/50"
                            }`}
                          >
                            {d.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full hover:-translate-y-0.5 transition-all"
                  onClick={() => copyMut.mutate()}
                  disabled={!copyTargets.length || copyMut.isPending}
                  data-testid="button-copy-day"
                >
                  {copyMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy {DAYS.find((d) => d.dow === copySource)?.long} → {copyTargets.length} day(s)
                </Button>
              </CardContent>
            </Card>

            {/* 4. REPEAT WEEKS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" /> Repeat this week
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Lock in this week's schedule as date-specific entries for the next N weeks. Future rule edits won't overwrite them.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 4].map((w) => (
                  <Button
                    key={w}
                    variant="outline"
                    className="h-14 hover:-translate-y-0.5 hover:border-primary transition-all"
                    onClick={() => repeatMut.mutate(w as 1 | 2 | 4)}
                    disabled={repeatMut.isPending}
                    data-testid={`button-repeat-${w}w`}
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Next {w} week{w === 1 ? "" : "s"}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* 5. CLEAR */}
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" /> Clear schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowClearConfirm("WEEKLY_RULES")} data-testid="button-clear-weekly">
                  Clear weekly rules
                </Button>
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowClearConfirm("FUTURE_OVERRIDES")} data-testid="button-clear-future">
                  Clear all future
                </Button>
                <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowClearConfirm("BOTH")} data-testid="button-clear-both">
                  Clear everything
                </Button>
              </CardContent>
            </Card>

            {/* Locked-in future overrides preview */}
            {snapshotQuery.data && snapshotQuery.data.overrides.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Locked-in future ({snapshotQuery.data.overrides.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">
                    Date-specific overrides (from Repeat). These take precedence over weekly rules.
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {snapshotQuery.data.overrides.slice(0, 50).map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-xs py-1 border-b border-border/30">
                        <span className="font-mono">{o.date}</span>
                        <span>{o.isClosed ? "Closed" : `${o.startTime}–${o.endTime}`}</span>
                      </div>
                    ))}
                    {snapshotQuery.data.overrides.length > 50 && (
                      <div className="text-xs text-muted-foreground pt-2">…and {snapshotQuery.data.overrides.length - 50} more</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm clear dialog */}
      <Dialog open={!!showClearConfirm} onOpenChange={(o) => !o && setShowClearConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm clear</DialogTitle>
            <DialogDescription>
              {showClearConfirm === "WEEKLY_RULES" && "Removes ALL weekly rules. Locked-in future overrides stay."}
              {showClearConfirm === "FUTURE_OVERRIDES" && "Removes ALL future date-specific overrides. Weekly rules stay."}
              {showClearConfirm === "BOTH" && "Removes weekly rules AND future overrides. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClearConfirm(null)} data-testid="button-clear-cancel">Cancel</Button>
            <Button variant="destructive"
              onClick={() => showClearConfirm && clearMut.mutate(showClearConfirm)}
              disabled={clearMut.isPending}
              data-testid="button-clear-confirm">
              {clearMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

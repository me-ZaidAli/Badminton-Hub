import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Calculator, TrendingUp, TrendingDown, RotateCcw, PoundSterling } from "lucide-react";

interface Settings {
  id: number;
  membershipFeePence: number;
  memberSessionPricePence: number;
  nonMemberSessionPricePence: number;
  memberPercentage: number;
  numberOfMembers: number;
  expectedPlayersPerSession: number;
  sessionsPerWeek: number;
  weeksPerYear: number;
  hallCostPerSessionPence: number;
  shuttlecocksCostPerSessionPence: number;
  tshirtCostPence: number;
  oldMembershipFeePence: number | null;
  oldMemberSessionPricePence: number | null;
  oldNonMemberSessionPricePence: number | null;
  updatedAt: string;
}

const fmtGBP = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(pence / 100);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

interface CalcInputs {
  membershipFeePence: number;
  memberSessionPricePence: number;
  nonMemberSessionPricePence: number;
  memberPercentage: number;
  numberOfMembers: number;
  expectedPlayersPerSession: number;
  sessionsPerWeek: number;
  weeksPerYear: number;
  hallCostPerSessionPence: number;
  shuttlecocksCostPerSessionPence: number;
  tshirtCostPence: number;
}

function runCalcs(i: CalcInputs) {
  const totalSessions = i.sessionsPerWeek * i.weeksPerYear;
  const memberPct = i.memberPercentage / 100;
  const nonMemberPct = 1 - memberPct;

  // Income
  const membershipIncome = i.numberOfMembers * i.membershipFeePence;
  const tshirtsCost = i.numberOfMembers * i.tshirtCostPence;
  const netMembershipIncome = membershipIncome - tshirtsCost;
  const sessionIncomePerSession =
    i.expectedPlayersPerSession * memberPct * i.memberSessionPricePence +
    i.expectedPlayersPerSession * nonMemberPct * i.nonMemberSessionPricePence;
  const annualSessionIncome = sessionIncomePerSession * totalSessions;
  const totalGrossIncome = membershipIncome + annualSessionIncome;

  // Costs
  const variableCostPerSession = i.hallCostPerSessionPence + i.shuttlecocksCostPerSessionPence;
  const totalAnnualVariableCost = variableCostPerSession * totalSessions;
  const totalAnnualCosts = totalAnnualVariableCost + tshirtsCost;

  // Profit
  const netAnnualProfit = totalGrossIncome - totalAnnualCosts;
  const netMonthlyProfit = netAnnualProfit / 12;
  const netProfitPerSession = totalSessions > 0 ? netAnnualProfit / totalSessions : 0;

  // Player benefits
  const savingPerSession = i.nonMemberSessionPricePence - i.memberSessionPricePence;
  const effectiveMembershipCost = i.membershipFeePence - i.tshirtCostPence;
  const breakEvenMonths = (sessionsPerMonth: number) => {
    const monthlySaving = savingPerSession * sessionsPerMonth;
    if (monthlySaving <= 0) return Infinity;
    return effectiveMembershipCost / monthlySaving;
  };
  const annualSavingForMember = savingPerSession * totalSessions - i.membershipFeePence;

  return {
    totalSessions,
    membershipIncome,
    tshirtsCost,
    netMembershipIncome,
    sessionIncomePerSession,
    annualSessionIncome,
    totalGrossIncome,
    variableCostPerSession,
    totalAnnualVariableCost,
    totalAnnualCosts,
    netAnnualProfit,
    netMonthlyProfit,
    netProfitPerSession,
    savingPerSession,
    effectiveMembershipCost,
    breakEven1: breakEvenMonths(4),
    breakEven2: breakEvenMonths(8),
    breakEven3: breakEvenMonths(12),
    annualSavingForMember,
  };
}

function NumberPound({
  label, valuePence, onChange, "data-testid": testId,
}: { label: string; valuePence: number; onChange: (v: number) => void; "data-testid"?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <PoundSterling className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          type="number"
          min={0}
          step="0.01"
          value={(valuePence / 100).toString()}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.round(n * 100));
          }}
          className="pl-7"
          data-testid={testId}
        />
      </div>
    </div>
  );
}

function NumberPlain({
  label, value, onChange, suffix, min = 0, max, "data-testid": testId,
}: { label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number; "data-testid"?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}{suffix ? <span className="text-muted-foreground/70 ml-1">({suffix})</span> : null}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={String(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, max !== undefined ? Math.min(max, n) : n));
        }}
        data-testid={testId}
      />
    </div>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "good" | "bad" | "neutral" }) {
  const color = accent === "good" ? "text-emerald-500" : accent === "bad" ? "text-rose-500" : "text-foreground";
  return (
    <Card className="premium-tile-flat">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className={`text-2xl font-extrabold mt-1 ${color}`} data-testid={`stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{value}</div>
        {sub ? <div className="text-xs text-muted-foreground mt-0.5">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

export default function ClubFinanceCalculator() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/super-admin/club-finance-calculator"],
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  useEffect(() => { if (settings && !draft) setDraft(settings); }, [settings, draft]);

  const update = (patch: Partial<Settings>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Settings>) => {
      const r = await apiRequest("PUT", "/api/super-admin/club-finance-calculator", payload);
      return r.json();
    },
    onSuccess: (row) => {
      queryClient.setQueryData(["/api/super-admin/club-finance-calculator"], row);
      setDraft(row);
      toast({ title: "Saved", description: "Calculator settings updated." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const current = useMemo(() => (draft ? runCalcs(draft) : null), [draft]);
  const old = useMemo(() => {
    if (!draft) return null;
    const has = draft.oldMembershipFeePence != null && draft.oldMemberSessionPricePence != null && draft.oldNonMemberSessionPricePence != null;
    if (!has) return null;
    return runCalcs({
      ...draft,
      membershipFeePence: draft.oldMembershipFeePence ?? draft.membershipFeePence,
      memberSessionPricePence: draft.oldMemberSessionPricePence ?? draft.memberSessionPricePence,
      nonMemberSessionPricePence: draft.oldNonMemberSessionPricePence ?? draft.nonMemberSessionPricePence,
    });
  }, [draft]);

  if (isLoading || !draft || !current) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    );
  }

  const profitClass = current.netAnnualProfit >= 0 ? "good" : "bad";
  const summaryText = (() => {
    const lines: string[] = [];
    lines.push(
      `With current pricing: Membership ${fmtGBP(draft.membershipFeePence)}, Member session ${fmtGBP(draft.memberSessionPricePence)}, Non-member session ${fmtGBP(draft.nonMemberSessionPricePence)}.`,
    );
    lines.push(
      `Across ${current.totalSessions} sessions/year and ${draft.numberOfMembers} members, the club ${current.netAnnualProfit >= 0 ? "profits" : "loses"} ${fmtGBP(Math.abs(current.netAnnualProfit))}/year (${fmtGBP(current.netMonthlyProfit)}/month).`,
    );
    if (current.savingPerSession > 0) {
      const m = current.breakEven2;
      const months = Number.isFinite(m) ? m.toFixed(1) : "—";
      lines.push(
        `Members save ${fmtGBP(current.savingPerSession)} per session and recover their cost in ~${months} months if playing twice a week.`,
      );
    }
    if (old) {
      const profitDiff = current.netAnnualProfit - old.netAnnualProfit;
      const pct = old.netAnnualProfit !== 0 ? (profitDiff / Math.abs(old.netAnnualProfit)) * 100 : 0;
      lines.push(
        `Compared to old prices, club profit ${profitDiff >= 0 ? "increases" : "decreases"} by ${fmtGBP(Math.abs(profitDiff))} (${fmtPct(pct)}) per year.`,
      );
    }
    return lines.join(" ");
  })();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6" data-testid="page-club-finance-calculator">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Club Finance Calculator</h1>
            <p className="text-sm text-muted-foreground">Live model — every change recalculates instantly. Save when you're happy.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => settings && setDraft(settings)} disabled={saveMutation.isPending} data-testid="button-revert">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Revert
          </Button>
          <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator" data-testid="tab-calculator">Calculator</TabsTrigger>
          <TabsTrigger value="benefits" data-testid="tab-benefits">Player Benefits</TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">Old vs New</TabsTrigger>
        </TabsList>

        {/* === CALCULATOR === */}
        <TabsContent value="calculator" className="space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing inputs</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <NumberPound label="Membership fee / year" valuePence={draft.membershipFeePence} onChange={(v) => update({ membershipFeePence: v })} data-testid="input-membership-fee" />
                <NumberPound label="Member session price" valuePence={draft.memberSessionPricePence} onChange={(v) => update({ memberSessionPricePence: v })} data-testid="input-member-session-price" />
                <NumberPound label="Non-member session price" valuePence={draft.nonMemberSessionPricePence} onChange={(v) => update({ nonMemberSessionPricePence: v })} data-testid="input-non-member-session-price" />
                <NumberPlain label="% members per session" value={draft.memberPercentage} onChange={(v) => update({ memberPercentage: v })} suffix="0–100" min={0} max={100} data-testid="input-member-pct" />
                <NumberPlain label="Number of members" value={draft.numberOfMembers} onChange={(v) => update({ numberOfMembers: v })} data-testid="input-number-of-members" />
                <NumberPlain label="Expected players / session" value={draft.expectedPlayersPerSession} onChange={(v) => update({ expectedPlayersPerSession: v })} data-testid="input-players-per-session" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operational defaults</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <NumberPlain label="Sessions / week" value={draft.sessionsPerWeek} onChange={(v) => update({ sessionsPerWeek: v })} min={0} max={14} data-testid="input-sessions-per-week" />
                <NumberPlain label="Weeks / year" value={draft.weeksPerYear} onChange={(v) => update({ weeksPerYear: v })} min={0} max={53} data-testid="input-weeks-per-year" />
                <NumberPound label="Hall cost / session" valuePence={draft.hallCostPerSessionPence} onChange={(v) => update({ hallCostPerSessionPence: v })} data-testid="input-hall-cost" />
                <NumberPound label="Shuttlecocks / session" valuePence={draft.shuttlecocksCostPerSessionPence} onChange={(v) => update({ shuttlecocksCostPerSessionPence: v })} data-testid="input-shuttle-cost" />
                <NumberPound label="T-shirt cost (each)" valuePence={draft.tshirtCostPence} onChange={(v) => update({ tshirtCostPence: v })} data-testid="input-tshirt-cost" />
                <div className="text-xs text-muted-foreground self-end">
                  Total sessions/year = <span className="font-bold text-foreground" data-testid="text-total-sessions">{current.totalSessions}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Headline tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Annual income" value={fmtGBP(current.totalGrossIncome)} sub={`${fmtGBP(current.annualSessionIncome)} sessions + ${fmtGBP(current.membershipIncome)} memberships`} />
            <StatTile label="Annual costs" value={fmtGBP(current.totalAnnualCosts)} sub={`${fmtGBP(current.totalAnnualVariableCost)} hall+shuttles + ${fmtGBP(current.tshirtsCost)} t-shirts`} />
            <StatTile label="Net annual profit" value={fmtGBP(current.netAnnualProfit)} accent={profitClass} sub={`${fmtGBP(current.netMonthlyProfit)} / month`} />
            <StatTile label="Profit per session" value={fmtGBP(current.netProfitPerSession)} accent={profitClass} sub={`Across ${current.totalSessions} sessions`} />
          </div>

          {/* Income / Costs detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Income breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Membership income ({draft.numberOfMembers} × {fmtGBP(draft.membershipFeePence)})</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.membershipIncome)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-muted-foreground">− T-shirts to members</TableCell><TableCell className="text-right font-mono text-muted-foreground">−{fmtGBP(current.tshirtsCost)}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Net membership income</TableCell><TableCell className="text-right font-mono font-medium">{fmtGBP(current.netMembershipIncome)}</TableCell></TableRow>
                    <TableRow><TableCell>Session income / session</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.sessionIncomePerSession)}</TableCell></TableRow>
                    <TableRow><TableCell>Annual session income (× {current.totalSessions})</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.annualSessionIncome)}</TableCell></TableRow>
                    <TableRow className="border-t-2"><TableCell className="font-bold">Total gross income</TableCell><TableCell className="text-right font-mono font-bold">{fmtGBP(current.totalGrossIncome)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Costs breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>T-shirts (fixed, {draft.numberOfMembers} × {fmtGBP(draft.tshirtCostPence)})</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.tshirtsCost)}</TableCell></TableRow>
                    <TableRow><TableCell>Variable / session (hall + shuttles)</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.variableCostPerSession)}</TableCell></TableRow>
                    <TableRow><TableCell>Annual variable (× {current.totalSessions})</TableCell><TableCell className="text-right font-mono">{fmtGBP(current.totalAnnualVariableCost)}</TableCell></TableRow>
                    <TableRow className="border-t-2"><TableCell className="font-bold">Total annual costs</TableCell><TableCell className="text-right font-mono font-bold">{fmtGBP(current.totalAnnualCosts)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Plain-English summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Summary explanation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90" data-testid="text-summary">{summaryText}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PLAYER BENEFITS === */}
        <TabsContent value="benefits" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Saving per session" value={fmtGBP(current.savingPerSession)} accent={current.savingPerSession > 0 ? "good" : "neutral"} />
            <StatTile label="Effective membership cost" value={fmtGBP(current.effectiveMembershipCost)} sub={`${fmtGBP(draft.membershipFeePence)} − ${fmtGBP(draft.tshirtCostPence)} t-shirt`} />
            <StatTile label="Annual saving (member)" value={fmtGBP(current.annualSavingForMember)} accent={current.annualSavingForMember >= 0 ? "good" : "bad"} sub={`Plays all ${current.totalSessions} sessions`} />
            <StatTile label="Months to break even (2/wk)" value={Number.isFinite(current.breakEven2) ? `${current.breakEven2.toFixed(1)} mo` : "n/a"} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Time to recover membership cost</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Play frequency</TableHead>
                    <TableHead>Sessions / month</TableHead>
                    <TableHead>Monthly saving</TableHead>
                    <TableHead className="text-right">Months to break even</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: "1 session / week", per: 4, br: current.breakEven1 },
                    { label: "2 sessions / week", per: 8, br: current.breakEven2 },
                    { label: "3 sessions / week", per: 12, br: current.breakEven3 },
                  ].map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.per}</TableCell>
                      <TableCell className="font-mono">{fmtGBP(current.savingPerSession * row.per)}</TableCell>
                      <TableCell className="text-right font-mono">{Number.isFinite(row.br) ? `${row.br.toFixed(1)} months` : "Never"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {Number.isFinite(current.breakEven2) ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-6">
                <p className="text-sm">
                  <span className="font-semibold text-emerald-500">After ~{current.breakEven2.toFixed(1)} months</span> of playing twice a week, a member starts making pure savings of{" "}
                  <span className="font-semibold">{fmtGBP(current.savingPerSession * 8)}/month</span>.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* === OLD VS NEW === */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Old prices (for comparison)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberPound label="Old membership fee / year" valuePence={draft.oldMembershipFeePence ?? 0} onChange={(v) => update({ oldMembershipFeePence: v })} data-testid="input-old-membership" />
              <NumberPound label="Old member session price" valuePence={draft.oldMemberSessionPricePence ?? 0} onChange={(v) => update({ oldMemberSessionPricePence: v })} data-testid="input-old-member-price" />
              <NumberPound label="Old non-member session price" valuePence={draft.oldNonMemberSessionPricePence ?? 0} onChange={(v) => update({ oldNonMemberSessionPricePence: v })} data-testid="input-old-non-member-price" />
            </CardContent>
          </Card>

          {old ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Difference (New − Old)</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Old</TableHead>
                        <TableHead className="text-right">New</TableHead>
                        <TableHead className="text-right">Δ £</TableHead>
                        <TableHead className="text-right">Δ %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { label: "Membership income", oldV: old.membershipIncome, newV: current.membershipIncome },
                        { label: "Annual session income", oldV: old.annualSessionIncome, newV: current.annualSessionIncome },
                        { label: "Total gross income", oldV: old.totalGrossIncome, newV: current.totalGrossIncome },
                        { label: "Net annual profit", oldV: old.netAnnualProfit, newV: current.netAnnualProfit },
                      ].map((row) => {
                        const diff = row.newV - row.oldV;
                        const pct = row.oldV !== 0 ? (diff / Math.abs(row.oldV)) * 100 : 0;
                        const positive = diff >= 0;
                        return (
                          <TableRow key={row.label}>
                            <TableCell className="font-medium">{row.label}</TableCell>
                            <TableCell className="text-right font-mono">{fmtGBP(row.oldV)}</TableCell>
                            <TableCell className="text-right font-mono">{fmtGBP(row.newV)}</TableCell>
                            <TableCell className={`text-right font-mono ${positive ? "text-emerald-500" : "text-rose-500"}`}>
                              {positive ? "+" : "−"}{fmtGBP(Math.abs(diff))}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className={positive ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}>
                                {positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {fmtPct(pct)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader><CardTitle className="text-base">Comparison summary</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed" data-testid="text-comparison-summary">
                    By changing prices, club profit{" "}
                    <span className={current.netAnnualProfit - old.netAnnualProfit >= 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                      {current.netAnnualProfit - old.netAnnualProfit >= 0 ? "increases" : "decreases"} by {fmtGBP(Math.abs(current.netAnnualProfit - old.netAnnualProfit))}
                      {old.netAnnualProfit !== 0
                        ? ` (${fmtPct(((current.netAnnualProfit - old.netAnnualProfit) / Math.abs(old.netAnnualProfit)) * 100)})`
                        : ""}
                    </span>{" "}
                    per year.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Enter all three old prices above to see the comparison.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

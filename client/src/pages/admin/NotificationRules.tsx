import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2, Save, Send, BarChart3, Eye } from "lucide-react";

type Rule = {
  id: number;
  ruleKey: string;
  enabled: boolean;
  category: string;
  title: string;
  message: string;
  settings: Record<string, any>;
  updatedAt: string;
};

// Friendly labels keyed by ruleKey. Falls back to a humanized version of the key.
const LABELS: Record<string, string> = {
  paymentReceived: "Payment received",
  paymentRequested: "Payment requested",
  paymentReminder: "Payment reminder",
  paymentFailed: "Payment failed",
  paymentRefunded: "Refund issued",
  creditAdded: "Credit added",
  debtChargeAdded: "New charge added",
  waitlistPromoted: "Waiting list promotion",
  newSessionMatchingLevel: "New session at user's level",
  postSessionUnpaidReminder: "Unpaid reminder after session",
  sessionInvited: "Session invitation",
  sessionBooked: "Session booking confirmed",
  sessionCancelled: "Session cancelled",
  sessionReactivated: "Session reactivated",
  sessionReminder: "Session reminder",
  attendanceMarked: "Attendance marked",
  rewardsPointsAdded: "Points added",
  rewardsBadgeEarned: "Badge earned",
  rewardsRedeemed: "Reward redeemed",
  rewardsExpiring: "Points expiring",
  accountCreated: "Account created (welcome)",
  accountPasswordChanged: "Password changed",
  accountRoleChanged: "Role changed",
  membershipApproved: "Membership approved",
  membershipRejected: "Membership rejected",
  membershipExpiring: "Membership expiring",
  membershipLeft: "Member left club",
  bslClubApproved: "BSL club approved",
  bslFixturePublished: "BSL fixture published",
  bslMatchReminder: "BSL match reminder",
  bslResultsSubmitted: "BSL results submitted",
  bslWalletApproved: "BSL wallet top-up approved",
  tournamentPublished: "Tournament published",
  tournamentMatchScored: "Tournament match scored",
  announcementPosted: "Club announcement",
  profileIncomplete: "Profile incomplete reminder",
};

function humanize(key: string): string {
  return LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function extractPlaceholders(template: string): string[] {
  const set = new Set<string>();
  template.replace(/\{(\w+)\}/g, (_m, k) => { set.add(`{${k}}`); return ""; });
  return Array.from(set);
}

function RuleEditor({ rule }: { rule: Rule }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [title, setTitle] = useState(rule.title);
  const [message, setMessage] = useState(rule.message);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [showStats, setShowStats] = useState(false);
  const label = humanize(rule.ruleKey);
  const placeholders = Array.from(new Set([...extractPlaceholders(title), ...extractPlaceholders(message)]));

  useEffect(() => {
    setEnabled(rule.enabled);
    setTitle(rule.title);
    setMessage(rule.message);
  }, [rule.id, rule.updatedAt]);

  const renderPreview = (tpl: string) =>
    tpl.replace(/\{(\w+)\}/g, (_m, k) => (previewVars[k] && previewVars[k].length > 0 ? previewVars[k] : `{${k}}`));

  const save = useMutation({
    mutationFn: async (patch: Partial<Pick<Rule, "enabled" | "title" | "message">>) => {
      const res = await apiRequest("PATCH", `/api/admin/notification-rules/${rule.ruleKey}`, patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-rules"] });
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const test = useMutation({
    mutationFn: async () => {
      const vars: Record<string, string> = {};
      for (const ph of placeholders) {
        const k = ph.replace(/[{}]/g, "");
        if (previewVars[k]) vars[k] = previewVars[k];
      }
      const res = await apiRequest("POST", `/api/admin/notification-rules/${rule.ruleKey}/test`, { vars });
      return res.json();
    },
    onSuccess: () => toast({ title: "Test sent", description: "Check your push + in-app inbox." }),
    onError: (e: any) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const stats = useQuery<{ days: number; byChannel: Record<string, { total: number; sends: number }> }>({
    queryKey: ["/api/admin/notification-rules", rule.ruleKey, "stats"],
    enabled: showStats,
  });

  const dirty = enabled !== rule.enabled || title !== rule.title || message !== rule.message;

  return (
    <Card data-testid={`card-rule-${rule.ruleKey}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{label}</CardTitle>
          <p className="text-xs text-muted-foreground font-mono">{rule.ruleKey}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={enabled ? "default" : "secondary"} data-testid={`badge-status-${rule.ruleKey}`}>
            {enabled ? "On" : "Off"}
          </Badge>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => {
              setEnabled(v);
              save.mutate({ enabled: v });
            }}
            disabled={save.isPending}
            data-testid={`switch-${rule.ruleKey}`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor={`title-${rule.ruleKey}`}>Title</Label>
          <Input
            id={`title-${rule.ruleKey}`}
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            data-testid={`input-title-${rule.ruleKey}`}
          />
        </div>
        <div>
          <Label htmlFor={`msg-${rule.ruleKey}`}>Message</Label>
          <Textarea
            id={`msg-${rule.ruleKey}`}
            value={message}
            maxLength={600}
            rows={3}
            onChange={(e) => setMessage(e.target.value)}
            data-testid={`input-message-${rule.ruleKey}`}
          />
        </div>
        {placeholders.length > 0 && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Preview values
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {placeholders.map((p) => {
                const k = p.replace(/[{}]/g, "");
                return (
                  <div key={p}>
                    <Label className="text-xs font-mono">{p}</Label>
                    <Input
                      value={previewVars[k] || ""}
                      onChange={(e) => setPreviewVars(v => ({ ...v, [k]: e.target.value }))}
                      placeholder={`Sample ${k}`}
                      data-testid={`input-var-${rule.ruleKey}-${k}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="rounded bg-muted/50 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Preview
              </div>
              <div className="font-medium" data-testid={`text-preview-title-${rule.ruleKey}`}>{renderPreview(title)}</div>
              <div className="text-muted-foreground" data-testid={`text-preview-message-${rule.ruleKey}`}>{renderPreview(message)}</div>
            </div>
          </div>
        )}

        {showStats && (
          <div className="rounded-md border p-3 space-y-2" data-testid={`stats-${rule.ruleKey}`}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last 30 days
            </div>
            {stats.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(["push", "inapp", "email"] as const).map(ch => (
                  <div key={ch} className="rounded bg-muted/50 p-2 text-center">
                    <div className="text-xs uppercase text-muted-foreground">{ch}</div>
                    <div className="text-lg font-semibold" data-testid={`stat-${rule.ruleKey}-${ch}-total`}>
                      {stats.data?.byChannel?.[ch]?.total ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.data?.byChannel?.[ch]?.sends ?? 0} sends
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStats(s => !s)}
            data-testid={`button-stats-${rule.ruleKey}`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showStats ? "Hide stats" : "Stats"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={test.isPending}
            onClick={() => test.mutate()}
            data-testid={`button-test-${rule.ruleKey}`}
          >
            {test.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Test send to me
          </Button>
          <Button
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate({ title, message })}
            data-testid={`button-save-${rule.ruleKey}`}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationRules() {
  const { data, isLoading, error } = useQuery<Rule[]>({ queryKey: ["/api/admin/notification-rules"], retry: false });
  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Automatic notifications</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Control the wording and on/off state for the reminders the app sends automatically.
        Users can still mute individual reminder types from their own notification settings.
      </p>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center" data-testid="state-loading"><Loader2 className="animate-spin" /></div>
      ) : error ? (
        <Card data-testid="state-error">
          <CardContent className="py-6 text-sm text-destructive">
            Couldn't load reminder rules: {(error as any)?.message || "Unknown error"}
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card data-testid="state-empty">
          <CardContent className="py-6 text-sm text-muted-foreground">
            No reminder rules configured yet. Restart the server to seed the defaults.
          </CardContent>
        </Card>
      ) : (
        (() => {
          const grouped = new Map<string, Rule[]>();
          for (const r of data) {
            const cat = r.category || "General";
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat)!.push(r);
          }
          const ORDER = ["Account", "Membership", "Sessions", "Payments", "Rewards", "League (BSL)", "Tournaments", "Communication", "Profile", "General"];
          const cats = Array.from(grouped.keys()).sort((a, b) => {
            const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          });
          return (
            <div className="space-y-8">
              {cats.map((cat) => {
                const rules = grouped.get(cat)!;
                const onCount = rules.filter(r => r.enabled).length;
                return (
                  <section key={cat} data-testid={`section-${cat}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold">{cat}</h2>
                      <Badge variant="outline" data-testid={`badge-cat-count-${cat}`}>
                        {onCount}/{rules.length} on
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {rules.map((r) => <RuleEditor key={r.id} rule={r} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          );
        })()
      )}
    </div>
  );
}

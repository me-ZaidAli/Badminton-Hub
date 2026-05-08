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
import { Bell, Loader2, Save } from "lucide-react";

type Rule = {
  id: number;
  ruleKey: string;
  enabled: boolean;
  title: string;
  message: string;
  settings: Record<string, any>;
  updatedAt: string;
};

const META: Record<string, { label: string; description: string; placeholders: string[] }> = {
  paymentReceived: {
    label: "Payment received",
    description: "Sent when an admin marks a session payment as paid.",
    placeholders: ["{sessionTitle}", "{date}"],
  },
  waitlistPromoted: {
    label: "Waiting list promotion",
    description: "Sent when a user is moved from the waiting list into a confirmed spot.",
    placeholders: ["{sessionTitle}", "{date}"],
  },
  newSessionMatchingLevel: {
    label: "New session at user's level",
    description: "Sent to club members whose grade matches a newly created session.",
    placeholders: ["{sessionTitle}", "{date}"],
  },
  postSessionUnpaidReminder: {
    label: "Unpaid reminder after session",
    description: "Sent hourly for finished sessions where payment is still UNPAID (deduped per signup).",
    placeholders: ["{sessionTitle}", "{date}"],
  },
};

function RuleEditor({ rule }: { rule: Rule }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [title, setTitle] = useState(rule.title);
  const [message, setMessage] = useState(rule.message);
  const meta = META[rule.ruleKey] || { label: rule.ruleKey, description: "", placeholders: [] };

  useEffect(() => {
    setEnabled(rule.enabled);
    setTitle(rule.title);
    setMessage(rule.message);
  }, [rule.id, rule.updatedAt]);

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

  const dirty = enabled !== rule.enabled || title !== rule.title || message !== rule.message;

  return (
    <Card data-testid={`card-rule-${rule.ruleKey}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
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
        {meta.placeholders.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Available placeholders:{" "}
            {meta.placeholders.map((p) => (
              <code key={p} className="mr-2 rounded bg-muted px-1.5 py-0.5">{p}</code>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-1">
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
        <div className="space-y-4">
          {data.map((r) => <RuleEditor key={r.id} rule={r} />)}
        </div>
      )}
    </div>
  );
}

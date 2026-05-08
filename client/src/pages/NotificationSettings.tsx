import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellRing, Loader2, AlertTriangle, Smartphone, Inbox, Mail } from "lucide-react";
import {
  initOneSignal,
  isPushOptedIn,
  requestPushPermission,
  getOneSignalSubscriptionId,
} from "@/lib/oneSignal";

type Channel = "push" | "inapp" | "email";
type CategoryPrefs = Record<string, Partial<Record<Channel, boolean>>>;

type Prefs = {
  paymentReceived: boolean;
  waitlistPromoted: boolean;
  newSessionMatchingLevel: boolean;
  postSessionUnpaidReminder: boolean;
  adminAnnouncement: boolean;
  categoryPrefs: CategoryPrefs;
  isSubscribed: boolean;
};

const CATEGORY_ORDER = [
  "Account", "Membership", "Sessions", "Payments", "Rewards",
  "League (BSL)", "Tournaments", "Communication", "Profile", "General",
];

const CATEGORY_DESC: Record<string, string> = {
  Account: "Sign-up confirmations, password and role changes.",
  Membership: "Joining, leaving, approvals and expiry.",
  Sessions: "Invites, cancellations, level matches and reminders.",
  Payments: "Receipts, requests, reminders, refunds and credits.",
  Rewards: "Points earned, badges unlocked and redemptions.",
  "League (BSL)": "Birmingham Super League fixtures, results and wallet.",
  Tournaments: "Tournament openings and match results.",
  Communication: "Club-wide announcements.",
  Profile: "Reminders to complete missing profile information.",
  General: "Everything else.",
};

const CHANNELS: { id: Channel; label: string; icon: any }[] = [
  { id: "push",  label: "Push",   icon: Smartphone },
  { id: "inapp", label: "In-app", icon: Inbox },
  { id: "email", label: "Email",  icon: Mail },
];

function isOn(prefs: CategoryPrefs, cat: string, ch: Channel): boolean {
  return prefs?.[cat]?.[ch] !== false;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [browserOptedIn, setBrowserOptedIn] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [permState, setPermState] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const refreshPermState = () => {
    if (typeof Notification !== "undefined") setPermState(Notification.permission);
  };

  const { data: prefs, isLoading } = useQuery<Prefs>({
    queryKey: ["/api/notifications/preferences"],
  });

  const { data: serverCategories } = useQuery<string[]>({
    queryKey: ["/api/notifications/categories"],
  });

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) return;
    (async () => {
      await initOneSignal(appId);
      setBrowserOptedIn(isPushOptedIn());
      refreshPermState();
    })();
  }, []);

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const res = await apiRequest("PATCH", "/api/notifications/preferences", patch);
      return res.json();
    },
    onMutate: async (patch: any) => {
      // Optimistic merge
      await queryClient.cancelQueries({ queryKey: ["/api/notifications/preferences"] });
      const prev = queryClient.getQueryData<Prefs>(["/api/notifications/preferences"]);
      if (prev) {
        const next: Prefs = { ...prev };
        if (patch.categoryPrefs) {
          next.categoryPrefs = { ...(prev.categoryPrefs || {}) };
          for (const [cat, ch] of Object.entries(patch.categoryPrefs as CategoryPrefs)) {
            next.categoryPrefs[cat] = { ...(next.categoryPrefs[cat] || {}), ...(ch || {}) };
          }
        }
        Object.assign(next, Object.fromEntries(
          Object.entries(patch).filter(([k]) => k !== "categoryPrefs")
        ));
        queryClient.setQueryData(["/api/notifications/preferences"], next);
      }
      return { prev };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/notifications/preferences"], ctx.prev);
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });

  const setChannel = (cat: string, ch: Channel, value: boolean) => {
    update.mutate({ categoryPrefs: { [cat]: { [ch]: value } } });
  };

  const setCategoryAll = (cat: string, value: boolean) => {
    update.mutate({ categoryPrefs: { [cat]: { push: value, inapp: value, email: value } } });
  };

  const enablePush = async () => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      toast({ title: "Push not configured", variant: "destructive" });
      return;
    }
    setEnabling(true);
    try {
      await initOneSignal(appId);
      const ok = await requestPushPermission();
      setBrowserOptedIn(ok);
      refreshPermState();
      if (ok) {
        const subId = getOneSignalSubscriptionId();
        if (subId) {
          await apiRequest("POST", "/api/notifications/register", { oneSignalPlayerId: subId, platform: "web" });
        }
        toast({ title: "Push enabled", description: "You'll start receiving notifications." });
      } else {
        const blocked = typeof Notification !== "undefined" && Notification.permission === "denied";
        toast({
          title: blocked ? "Notifications are blocked" : "Permission not granted",
          description: blocked
            ? "Tap the lock icon in your browser's address bar and allow notifications, then try again."
            : "Please allow notifications when your browser asks.",
          variant: "destructive",
        });
      }
    } finally {
      setEnabling(false);
    }
  };

  if (isLoading || !prefs) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const categories = (serverCategories && serverCategories.length > 0)
    ? [...serverCategories].sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a); const bi = CATEGORY_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : CATEGORY_ORDER;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Notifications</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Push notifications on this device
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Status</div>
              <div className="text-sm text-muted-foreground">Receive instant alerts on this device.</div>
            </div>
            {browserOptedIn ? (
              <Badge variant="default" data-testid="badge-push-status">Enabled</Badge>
            ) : permState === "denied" ? (
              <Badge variant="destructive" data-testid="badge-push-blocked">Blocked</Badge>
            ) : (
              <Button onClick={enablePush} disabled={enabling} data-testid="button-enable-push">
                {enabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enable push
              </Button>
            )}
          </div>

          {permState === "denied" && !browserOptedIn && (
            <div
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-3"
              data-testid="banner-push-blocked"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-destructive">Notifications are blocked by your browser</div>
                  <div className="text-muted-foreground mt-1">
                    Open this site's permissions for{" "}
                    <span className="font-mono">{typeof window !== "undefined" ? window.location.hostname : "this site"}</span>
                    , set Notifications to Allow, then reload.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => window.location.reload()} data-testid="button-reload-page">
                  Reload page
                </Button>
                <Button size="sm" variant="outline" onClick={enablePush} disabled={enabling} data-testid="button-retry-enable-push">
                  {enabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Try again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you're told about, and how</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick how you want each kind of update delivered. Toggles save automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_repeat(3,80px)_60px] gap-2 items-center pb-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Category</div>
            {CHANNELS.map(c => (
              <div key={c.id} className="text-center flex flex-col items-center gap-1">
                <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </div>
            ))}
            <div className="text-center">All</div>
          </div>

          {categories.map((cat) => {
            const allOn = CHANNELS.every(c => isOn(prefs.categoryPrefs || {}, cat, c.id));
            return (
              <div
                key={cat}
                className="grid grid-cols-[1fr_repeat(3,60px)_60px] sm:grid-cols-[1fr_repeat(3,80px)_60px] gap-2 items-center py-3 border-b last:border-0"
                data-testid={`row-cat-${cat}`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate" data-testid={`text-cat-${cat}`}>{cat}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{CATEGORY_DESC[cat] || ""}</div>
                </div>
                {CHANNELS.map((c) => (
                  <div key={c.id} className="flex justify-center">
                    <Switch
                      checked={isOn(prefs.categoryPrefs || {}, cat, c.id)}
                      onCheckedChange={(v) => setChannel(cat, c.id, v)}
                      disabled={update.isPending}
                      data-testid={`switch-${cat}-${c.id}`}
                    />
                  </div>
                ))}
                <div className="flex justify-center">
                  <Switch
                    checked={allOn}
                    onCheckedChange={(v) => setCategoryAll(cat, v)}
                    disabled={update.isPending}
                    data-testid={`switch-${cat}-all`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

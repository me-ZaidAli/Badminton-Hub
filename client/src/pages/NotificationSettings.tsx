import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellRing, Loader2 } from "lucide-react";
import {
  initOneSignal,
  isPushOptedIn,
  requestPushPermission,
  getOneSignalSubscriptionId,
} from "@/lib/oneSignal";

type Prefs = {
  paymentReceived: boolean;
  waitlistPromoted: boolean;
  newSessionMatchingLevel: boolean;
  postSessionUnpaidReminder: boolean;
  adminAnnouncement: boolean;
  isSubscribed: boolean;
};

const ITEMS: { key: keyof Prefs; title: string; desc: string }[] = [
  { key: "paymentReceived", title: "Payment received", desc: "When an admin confirms your session payment." },
  { key: "waitlistPromoted", title: "A spot opens up", desc: "When you're moved off the waiting list into a session." },
  { key: "newSessionMatchingLevel", title: "New session at your level", desc: "When a new session is created that fits your skill grade." },
  { key: "postSessionUnpaidReminder", title: "Unpaid reminder after session", desc: "Polite reminder if you haven't paid for a finished session." },
  { key: "adminAnnouncement", title: "Club announcements", desc: "Important broadcasts from your club admin or the app team." },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const [browserOptedIn, setBrowserOptedIn] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const { data: prefs, isLoading } = useQuery<Prefs>({
    queryKey: ["/api/notifications/preferences"],
  });

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) return;
    (async () => {
      await initOneSignal(appId);
      setBrowserOptedIn(isPushOptedIn());
    })();
  }, []);

  const update = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      const res = await apiRequest("PATCH", "/api/notifications/preferences", patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

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

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Notifications</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Push notifications
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
            ) : (
              <Button onClick={enablePush} disabled={enabling} data-testid="button-enable-push">
                {enabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enable push
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you'll be told about</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ITEMS.map(item => (
            <div key={item.key} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
              <div>
                <div className="font-medium" data-testid={`text-pref-${item.key}`}>{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </div>
              <Switch
                checked={!!prefs[item.key]}
                onCheckedChange={(v) => update.mutate({ [item.key]: v } as any)}
                disabled={update.isPending}
                data-testid={`switch-pref-${item.key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

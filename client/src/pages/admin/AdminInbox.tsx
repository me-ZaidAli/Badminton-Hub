import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox, UserPlus, CreditCard, Coins, ShoppingBag, LifeBuoy,
  AlertTriangle, GraduationCap, Sparkles, Gift, RefreshCw, ChevronRight,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

type InboxItem = Record<string, any>;
type InboxGroup = {
  key: string;
  label: string;
  link: string;
  count: number;
  items: InboxItem[];
};
type InboxResponse = {
  totalCount: number;
  groups: InboxGroup[];
  generatedAt: string;
};

const GROUP_ICONS: Record<string, React.ElementType> = {
  joinRequests: UserPlus,
  outstandingPayments: CreditCard,
  creditRequests: Coins,
  newOrders: ShoppingBag,
  tickets: LifeBuoy,
  incidents: AlertTriangle,
  trials: GraduationCap,
  lessons: Sparkles,
  referrals: Gift,
};

const GROUP_TINTS: Record<string, string> = {
  joinRequests: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-300",
  outstandingPayments: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-300",
  creditRequests: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-300",
  newOrders: "from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-300",
  tickets: "from-indigo-500/15 to-indigo-500/5 text-indigo-600 dark:text-indigo-300",
  incidents: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-300",
  trials: "from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-300",
  lessons: "from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-300",
  referrals: "from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-300",
};

function describeItem(groupKey: string, it: InboxItem): string {
  switch (groupKey) {
    case "joinRequests":
      return `${it.userName || "Someone"} → ${it.clubName}`;
    case "outstandingPayments":
      return `${it.userName} owes for ${it.sessionTitle || "session"}${it.sessionDate ? ` (${format(new Date(it.sessionDate), "dd MMM")})` : ""}`;
    case "creditRequests":
      return `${it.userName} requested ${it.credits ?? "?"} credits${it.description ? ` — ${it.description}` : ""}`;
    case "newOrders":
      return `${it.userName} ordered ${it.quantity}× ${it.productName}`;
    case "tickets":
      return `${it.userName}: ${it.subject}`;
    case "incidents":
      return `${it.incidentType}${it.severity ? ` (${it.severity})` : ""} — by ${it.userName}`;
    case "trials":
      return `${it.userName} — status: ${it.status}`;
    case "lessons":
      return `${it.userName} requested a lesson`;
    case "referrals":
      return `${it.userName || it.referredName || it.referredEmail || "Referred user"}`;
    default:
      return it.userName || `#${it.id}`;
  }
}

function ItemRow({ groupKey, item }: { groupKey: string; item: InboxItem }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 px-1 border-b last:border-b-0" data-testid={`row-inbox-${groupKey}-${item.id}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{describeItem(groupKey, item)}</div>
        <div className="text-xs text-muted-foreground">
          {item.clubName ? <span>{item.clubName} · </span> : null}
          {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ""}
        </div>
      </div>
    </li>
  );
}

export default function AdminInbox() {
  const [tab, setTab] = useState("all");
  const inboxQ = useQuery<InboxResponse>({ queryKey: ["/api/admin/inbox"] });

  const groups = inboxQ.data?.groups ?? [];
  // If the currently-selected tab disappears (e.g. its count drops to 0 after a refresh),
  // fall back to "all" so the Tabs component never holds an invalid value.
  useEffect(() => {
    if (tab !== "all" && !groups.some((g) => g.key === tab && g.count > 0)) {
      setTab("all");
    }
  }, [groups, tab]);
  const visibleGroups = useMemo(() =>
    tab === "all" ? groups : groups.filter((g) => g.key === tab),
    [groups, tab]);

  return (
    <div className="container max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-inbox-title">Admin Inbox</h1>
            <p className="text-sm text-muted-foreground">Everything pending across your clubs in one place.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inboxQ.data && (
            <Badge variant="secondary" className="text-base" data-testid="badge-inbox-total">
              {inboxQ.data.totalCount} item{inboxQ.data.totalCount === 1 ? "" : "s"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/inbox"] })} data-testid="button-refresh-inbox">
            <RefreshCw className={`w-4 h-4 mr-2 ${inboxQ.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      {inboxQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : inboxQ.isError ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Couldn't load the inbox.</CardContent></Card>
      ) : (
        <>
          {/* Summary chips */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-inbox-summary">
            {groups.map((g) => {
              const Icon = GROUP_ICONS[g.key] || Inbox;
              const tint = GROUP_TINTS[g.key] || "from-muted to-muted/40 text-foreground";
              return (
                <Card key={g.key} className={`overflow-hidden bg-gradient-to-br ${tint} border-transparent`} data-testid={`card-inbox-${g.key}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-md bg-background/60 p-2"><Icon className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-wider opacity-80">{g.label}</div>
                      <div className="text-2xl font-bold leading-tight">{g.count}</div>
                    </div>
                    <Link href={g.link}>
                      <Button size="sm" variant="ghost" className="bg-background/40 hover:bg-background/70" data-testid={`button-open-${g.key}`}>
                        Open <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Tabbed item details */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" data-testid="tab-inbox-all">All</TabsTrigger>
              {groups.filter((g) => g.count > 0).map((g) => (
                <TabsTrigger key={g.key} value={g.key} data-testid={`tab-inbox-${g.key}`}>
                  {g.label} <Badge variant="secondary" className="ml-2">{g.count}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={tab} className="mt-4 space-y-4">
              {visibleGroups.filter((g) => g.count > 0).length === 0 ? (
                <Card><CardContent className="p-10 text-center text-muted-foreground">
                  Nothing pending here. Nice work.
                </CardContent></Card>
              ) : (
                visibleGroups.filter((g) => g.count > 0).map((g) => {
                  const Icon = GROUP_ICONS[g.key] || Inbox;
                  return (
                    <Card key={g.key}>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Icon className="w-4 h-4" /> {g.label}
                          <Badge variant="secondary" className="ml-1">{g.count}</Badge>
                        </CardTitle>
                        <Link href={g.link}>
                          <Button size="sm" variant="outline" data-testid={`button-jump-${g.key}`}>Open</Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="divide-y">
                          {g.items.slice(0, 10).map((it) => <ItemRow key={`${g.key}-${it.id}`} groupKey={g.key} item={it} />)}
                        </ul>
                        {g.items.length > 10 && (
                          <div className="text-xs text-muted-foreground pt-2 text-center">+ {g.items.length - 10} more</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

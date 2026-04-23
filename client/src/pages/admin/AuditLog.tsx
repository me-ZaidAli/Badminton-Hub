import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollText, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type AuditRow = {
  id: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  clubId: number | null;
  metadata: any;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  clubName: string | null;
};

type AuditResponse = {
  total: number;
  limit: number;
  offset: number;
  rows: AuditRow[];
  facets: { actions: string[]; targetTypes: string[] };
};

const SINCE_OPTIONS = [
  { value: "1", label: "Last 24h" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("ALL");
  const [targetType, setTargetType] = useState<string>("ALL");
  const [sinceDays, setSinceDays] = useState<string>("30");
  const [offset, setOffset] = useState(0);
  const [openRow, setOpenRow] = useState<AuditRow | null>(null);

  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String(offset));
  params.set("sinceDays", sinceDays);
  if (action !== "ALL") params.set("action", action);
  if (targetType !== "ALL") params.set("targetType", targetType);
  if (search.trim()) params.set("search", search.trim());

  const auditQ = useQuery<AuditResponse>({
    queryKey: ["/api/admin/audit-logs", { offset, sinceDays, action, targetType, search: search.trim() }],
    queryFn: async () => {
      const r = await fetch(`/api/admin/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load audit logs");
      return r.json();
    },
  });

  const total = auditQ.data?.total ?? 0;
  const rows = auditQ.data?.rows ?? [];
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPage = () => setOffset(0);

  return (
    <div className="container max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-audit-title">Audit Log</h1>
            <p className="text-sm text-muted-foreground">A trail of sensitive admin actions across your clubs.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => auditQ.refetch()} data-testid="button-refresh-audit">
          <RefreshCw className={`w-4 h-4 mr-2 ${auditQ.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Search</label>
              <Input
                placeholder="Search action or target type"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                data-testid="input-audit-search"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Action</label>
              <Select value={action} onValueChange={(v) => { setAction(v); resetPage(); }}>
                <SelectTrigger data-testid="select-audit-action"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All actions</SelectItem>
                  {(auditQ.data?.facets.actions ?? []).map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Target type</label>
              <Select value={targetType} onValueChange={(v) => { setTargetType(v); resetPage(); }}>
                <SelectTrigger data-testid="select-audit-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All targets</SelectItem>
                  {(auditQ.data?.facets.targetTypes ?? []).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs text-muted-foreground mb-1 block">Range</label>
              <Select value={sinceDays} onValueChange={(v) => { setSinceDays(v); resetPage(); }}>
                <SelectTrigger data-testid="select-audit-since"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SINCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(action !== "ALL" || targetType !== "ALL" || search.trim()) && (
              <Button variant="ghost" size="sm" onClick={() => { setAction("ALL"); setTargetType("ALL"); setSearch(""); resetPage(); }} data-testid="button-clear-filters">
                <Filter className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {auditQ.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : auditQ.isError ? (
            <div className="p-6 text-sm text-destructive">Couldn't load audit logs.</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground" data-testid="text-audit-empty">
              No audit entries match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-testid={`row-audit-${r.id}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.createdAt), "dd MMM yy, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.actorName || `User #${r.actorId}`}</div>
                      {r.actorEmail && <div className="text-xs text-muted-foreground">{r.actorEmail}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.action}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {r.targetType}{r.targetId != null ? ` #${r.targetId}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.clubName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpenRow(r)} data-testid={`button-view-audit-${r.id}`}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground" data-testid="text-audit-pagination">
          Showing {rows.length === 0 ? 0 : offset + 1}–{offset + rows.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={offset === 0 || auditQ.isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} data-testid="button-audit-prev">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {lastPage}</span>
          <Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= total || auditQ.isFetching} onClick={() => setOffset(offset + PAGE_SIZE)} data-testid="button-audit-next">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit entry #{openRow?.id}</SheetTitle>
          </SheetHeader>
          {openRow && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">When</div>
                  <div>{format(new Date(openRow.createdAt), "dd MMM yyyy 'at' HH:mm:ss")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Actor</div>
                  <div>{openRow.actorName || `User #${openRow.actorId}`}</div>
                  {openRow.actorEmail && <div className="text-xs text-muted-foreground">{openRow.actorEmail}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Action</div>
                  <div><Badge variant="secondary">{openRow.action}</Badge></div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div>{openRow.targetType}{openRow.targetId != null ? ` #${openRow.targetId}` : ""}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Club</div>
                  <div>{openRow.clubName || "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Metadata</div>
                <pre className="text-xs bg-muted rounded p-3 overflow-x-auto" data-testid="text-audit-metadata">
                  {openRow.metadata ? JSON.stringify(openRow.metadata, null, 2) : "(none)"}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Calendar, Search, Loader2, Pencil, CheckCircle, XCircle,
  Clock, ChevronLeft, ChevronRight, Zap, Shield, Users, Trophy,
  Activity, Building2, Eye
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface SessionRecord {
  id: number;
  clubId: number;
  title: string;
  date: string;
  startTime: string;
  status?: string;
  maxPlayers: number;
  courtsAvailable: number;
  matchMode: string;
  clubName: string;
  clubCity?: string;
  playerCount: number;
  matchCount: number;
  liveMatchCount: number;
  completedMatchCount: number;
}

export default function SuperAdminSessions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editSession, setEditSession] = useState<SessionRecord | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const pageSize = 25;

  const { data: allSessions, isLoading } = useQuery<SessionRecord[]>({
    queryKey: ["/api/super-admin/sessions"],
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/sessions/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setEditSession(null);
      toast({ title: "Session Updated", description: "Session has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update session", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!allSessions) return [];
    return allSessions.filter(s => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.clubName.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "ALL" && (s.status || "UPCOMING") !== statusFilter) return false;
      return true;
    });
  }, [allSessions, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openEdit = (session: SessionRecord) => {
    setEditSession(session);
    setEditForm({
      title: session.title,
      status: session.status || "UPCOMING",
      maxPlayers: session.maxPlayers,
      courtsAvailable: session.courtsAvailable,
    });
  };

  const handleSaveEdit = () => {
    if (!editSession) return;
    updateSessionMutation.mutate({ id: editSession.id, updates: editForm });
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
      case "LIVE":
        return <Badge variant="default" className="text-xs">Live</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="text-xs">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="super-admin-sessions">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/super-admin">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-sessions-title">
              <Calendar className="w-6 h-6 text-violet-500" />
              Sessions & Matches Control
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Global session management with score override capabilities.</p>
        </div>
        <Badge variant="destructive" className="text-xs py-1 px-3">
          <Zap className="h-3 w-3 mr-1" /> Super Admin
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions or clubs..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search-sessions"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-session-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="ACTIVE">Live</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            Showing {paginated.length} of {filtered.length} sessions
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((session) => (
                  <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                    <TableCell>
                      <div className="font-medium text-sm">{session.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        {session.clubName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(session.date), "dd MMM yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">{session.startTime}</div>
                    </TableCell>
                    <TableCell>{statusBadge(session.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {session.playerCount}/{session.maxPlayers}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{session.matchCount} total</span>
                        {session.liveMatchCount > 0 && (
                          <Badge variant="default" className="text-[10px] py-0">{session.liveMatchCount} live</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-session-${session.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(session)} data-testid={`button-edit-session-${session.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {(session.status === "UPCOMING" || session.status === "ACTIVE") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateSessionMutation.mutate({ id: session.id, updates: { status: "CANCELLED" } })}
                            className="text-destructive"
                            data-testid={`button-cancel-session-${session.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sessions found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editSession} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Edit Session — Super Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2">
              You are performing a Super Admin action.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title</Label>
                <Input
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                  data-testid="input-edit-session-title"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editForm.status || ""} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-edit-session-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                    <SelectItem value="ACTIVE">Active / Live</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Players</Label>
                <Input
                  type="number"
                  value={editForm.maxPlayers || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, maxPlayers: parseInt(e.target.value) || 0 }))}
                  data-testid="input-edit-session-max-players"
                />
              </div>
              <div>
                <Label>Courts Available</Label>
                <Input
                  type="number"
                  value={editForm.courtsAvailable || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, courtsAvailable: parseInt(e.target.value) || 0 }))}
                  data-testid="input-edit-session-courts"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateSessionMutation.isPending} data-testid="button-save-session-edit">
              {updateSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

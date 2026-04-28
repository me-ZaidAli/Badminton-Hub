import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  UserX, Clock, AlertTriangle, MessageSquare, Trash2, Eye,
  StickyNote, Search, ChevronLeft, ChevronRight, Loader2,
  Users, Shield, MoreVertical, X
} from "lucide-react";
import { Link } from "wouter";

interface InactiveMember {
  userId: number;
  name: string;
  email: string;
  clubName: string;
  clubId: number;
  lastAttendance: string | null;
  daysInactive: number;
  membershipStatus: "ACTIVE" | "EXPIRED" | "PENDING";
  deletionScheduledAt: string | null;
}

type InactiveMembersResponse = InactiveMember[];

type SortField = "name" | "email" | "clubName" | "lastAttendance" | "daysInactive" | "membershipStatus";
type SortDir = "asc" | "desc";

const THRESHOLD_PRESETS = [30, 60, 90];
const PAGE_SIZE = 20;

function getDaysUntilDeletion(scheduledAt: string): number {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function InactiveMembers() {
  const { toast } = useToast();

  const [threshold, setThreshold] = useState(30);
  const [customThreshold, setCustomThreshold] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [clubId, setClubId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("daysInactive");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [messageModal, setMessageModal] = useState<InactiveMember | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageClubId, setMessageClubId] = useState("");

  const [noteModal, setNoteModal] = useState<InactiveMember | null>(null);
  const [noteText, setNoteText] = useState("");

  const [deletionModal, setDeletionModal] = useState<InactiveMember | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  const [cancelDeletionModal, setCancelDeletionModal] = useState<InactiveMember | null>(null);

  const [permanentDeleteModal, setPermanentDeleteModal] = useState<InactiveMember | null>(null);
  const [permanentDeleteReason, setPermanentDeleteReason] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState<"selected" | "all">("selected");
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");

  const activeThreshold = isCustom ? (parseInt(customThreshold) || 30) : threshold;

  const queryParams = new URLSearchParams();
  queryParams.set("threshold", String(activeThreshold));
  if (clubId !== "all") queryParams.set("clubId", clubId);

  const { data, isLoading } = useQuery<InactiveMembersResponse>({
    queryKey: ["/api/admin/inactive-members", activeThreshold, clubId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/inactive-members?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inactive members");
      return res.json();
    },
  });

  const clubsQuery = useQuery<{ clubId: number; clubName: string }[]>({
    queryKey: ["/api/clubs", "inactive-filter"],
    queryFn: async () => {
      const res = await fetch("/api/clubs", { credentials: "include" });
      if (!res.ok) return [];
      const d = await res.json();
      if (!Array.isArray(d)) return [];
      return d.map((c: any) => ({ clubId: c.id, clubName: c.name }));
    },
  });

  const { data: currentUser } = useQuery<{ id: number; role: string }>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const isOwner = currentUser?.role === "OWNER";

  const filteredAndSorted = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    let filtered = [...data] as InactiveMember[];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "email": cmp = a.email.localeCompare(b.email); break;
        case "clubName": cmp = a.clubName.localeCompare(b.clubName); break;
        case "lastAttendance":
          cmp = (a.lastAttendance || "").localeCompare(b.lastAttendance || "");
          break;
        case "daysInactive": cmp = a.daysInactive - b.daysInactive; break;
        case "membershipStatus": cmp = a.membershipStatus.localeCompare(b.membershipStatus); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [data, searchQuery, sortField, sortDir]);

  const totalFiltered = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedMembers = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingDeletionMembers = Array.isArray(data) ? data.filter((m) => m.deletionScheduledAt) : [];

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleThresholdPreset(val: number) {
    setIsCustom(false);
    setThreshold(val);
    setPage(1);
  }

  function handleCustomThreshold() {
    setIsCustom(true);
    setPage(1);
  }

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageModal) return;
      await apiRequest("POST", `/api/admin/inactive-members/${messageModal.userId}/message`, {
        subject: messageSubject,
        body: messageBody,
        clubId: messageClubId ? parseInt(messageClubId) : undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully" });
      setMessageModal(null);
      setMessageSubject("");
      setMessageBody("");
      setMessageClubId("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteModal) return;
      await apiRequest("POST", `/api/admin/inactive-members/${noteModal.userId}/add-note`, {
        note: noteText,
      });
    },
    onSuccess: () => {
      toast({ title: "Note added successfully" });
      setNoteModal(null);
      setNoteText("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add note", description: err.message, variant: "destructive" });
    },
  });

  const scheduleDeletionMutation = useMutation({
    mutationFn: async () => {
      if (!deletionModal) return;
      await apiRequest("POST", `/api/admin/inactive-members/${deletionModal.userId}/schedule-deletion`, {
        reason: deletionReason,
      });
    },
    onSuccess: () => {
      toast({ title: "Deletion scheduled", description: "Member will be deleted in 3 days." });
      setDeletionModal(null);
      setDeletionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inactive-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to schedule deletion", description: err.message, variant: "destructive" });
    },
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: async () => {
      if (!cancelDeletionModal) return;
      await apiRequest("POST", `/api/admin/inactive-members/${cancelDeletionModal.userId}/cancel-deletion`);
    },
    onSuccess: () => {
      toast({ title: "Deletion cancelled" });
      setCancelDeletionModal(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inactive-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to cancel deletion", description: err.message, variant: "destructive" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!permanentDeleteModal) return;
      await apiRequest("DELETE", `/api/admin/inactive-members/${permanentDeleteModal.userId}`, {
        reason: permanentDeleteReason,
      });
    },
    onSuccess: () => {
      toast({ title: "Member permanently deleted" });
      setPermanentDeleteModal(null);
      setPermanentDeleteReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inactive-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete member", description: err.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (payload: { userIds: number[]; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/inactive-members/bulk-delete`, payload);
      return res.json() as Promise<{ deletedCount: number }>;
    },
    onSuccess: (data) => {
      toast({ title: `${data.deletedCount} member${data.deletedCount === 1 ? "" : "s"} permanently deleted` });
      setBulkDeleteOpen(false);
      setBulkDeleteReason("");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inactive-members"] });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk delete failed", description: err.message, variant: "destructive" });
    },
  });

  const visibleSelectableIds = pagedMembers.map((m) => m.userId);
  const allVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedIds.has(id));
  const allFilteredIds = filteredAndSorted.map((m) => m.userId);

  function togglePageSelection(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleSelectableIds.forEach((id) => next.add(id));
      else visibleSelectableIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(allFilteredIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openBulkDelete(scope: "selected" | "all") {
    setBulkDeleteScope(scope);
    setBulkDeleteReason("");
    setBulkDeleteOpen(true);
  }

  const bulkDeleteIds = bulkDeleteScope === "all" ? allFilteredIds : Array.from(selectedIds);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "default";
      case "EXPIRED": return "destructive";
      case "PENDING": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inactive Members"
        description="Manage members who haven't attended sessions recently."
      />

      {pendingDeletionMembers.length > 0 && (
        <Card className="border-destructive" data-testid="banner-pending-deletion">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-destructive">
                  {pendingDeletionMembers.length} member{pendingDeletionMembers.length > 1 ? "s" : ""} pending deletion
                </p>
                {pendingDeletionMembers.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-2 flex-wrap" data-testid={`pending-deletion-item-${m.userId}`}>
                    <span className="text-sm">
                      {m.name} - Deletion in {getDaysUntilDeletion(m.deletionScheduledAt!)} days
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelDeletionModal(m)}
                      data-testid={`button-cancel-deletion-banner-${m.userId}`}
                    >
                      Cancel Deletion
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-filters">
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Inactivity Threshold</label>
              <div className="flex items-center gap-2 flex-wrap">
                {THRESHOLD_PRESETS.map((val) => (
                  <Button
                    key={val}
                    variant={!isCustom && threshold === val ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleThresholdPreset(val)}
                    data-testid={`button-threshold-${val}`}
                  >
                    {val === 90 ? "90+" : val} days
                  </Button>
                ))}
                <Button
                  variant={isCustom ? "default" : "outline"}
                  size="sm"
                  onClick={handleCustomThreshold}
                  data-testid="button-threshold-custom"
                >
                  Custom
                </Button>
                {isCustom && (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Days"
                    value={customThreshold}
                    onChange={(e) => { setCustomThreshold(e.target.value); setPage(1); }}
                    className="w-24"
                    data-testid="input-custom-threshold"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Club</label>
                <Select value={clubId} onValueChange={(v) => { setClubId(v); setPage(1); }}>
                  <SelectTrigger data-testid="select-filter-club">
                    <SelectValue placeholder="All clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {Array.isArray(clubsQuery.data) && clubsQuery.data.map((c) => (
                      <SelectItem key={c.clubId} value={String(c.clubId)}>
                        {c.clubName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-inactive">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inactive</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-total-inactive">{Array.isArray(data) ? data.length : 0}</div>
            <p className="text-xs text-muted-foreground mt-1">members inactive {activeThreshold}+ days</p>
          </CardContent>
        </Card>
        <Card data-testid="card-pending-deletion">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deletion</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-pending-deletion">{pendingDeletionMembers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">scheduled for removal</p>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-inactive">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Days Inactive</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="value-avg-inactive">{Array.isArray(data) && data.length > 0 ? Math.round(data.reduce((sum, m) => sum + (m.daysInactive ?? 0), 0) / data.length) : 0}</div>
            <p className="text-xs text-muted-foreground mt-1">average inactivity period</p>
          </CardContent>
        </Card>
      </div>

      {isOwner && (selectedIds.size > 0 || filteredAndSorted.length > 0) && (
        <Card className="border-destructive/40 bg-destructive/5" data-testid="bar-bulk-actions">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="font-medium">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : `${filteredAndSorted.length} member${filteredAndSorted.length === 1 ? "" : "s"} shown`}
                </span>
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
                {filteredAndSorted.length > 0 && selectedIds.size < filteredAndSorted.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={selectAllFiltered}
                    data-testid="button-select-all-filtered"
                  >
                    Select all {filteredAndSorted.length}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => openBulkDelete("selected")}
                  data-testid="button-bulk-delete-selected"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={filteredAndSorted.length === 0}
                  onClick={() => openBulkDelete("all")}
                  data-testid="button-bulk-delete-all"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All ({filteredAndSorted.length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-members-table">
        <CardContent className="pt-4">
          {pagedMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="empty-state">
              <Users className="h-10 w-10 mb-3" />
              <p className="text-sm">No inactive members found for the selected criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isOwner && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                            onCheckedChange={(c) => togglePageSelection(c === true)}
                            data-testid="checkbox-select-page"
                            aria-label="Select all on this page"
                          />
                        </TableHead>
                      )}
                      <TableHead className="cursor-pointer" onClick={() => handleSort("name")} data-testid="sort-name">
                        Name {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("email")} data-testid="sort-email">
                        Email {sortField === "email" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("clubName")} data-testid="sort-club">
                        Club {sortField === "clubName" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("lastAttendance")} data-testid="sort-last-attendance">
                        Last Attendance {sortField === "lastAttendance" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("daysInactive")} data-testid="sort-days-inactive">
                        Days Inactive {sortField === "daysInactive" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("membershipStatus")} data-testid="sort-status">
                        Status {sortField === "membershipStatus" && (sortDir === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead>Deletion</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedMembers.map((member) => (
                      <TableRow key={member.userId} data-testid={`row-member-${member.userId}`} data-state={selectedIds.has(member.userId) ? "selected" : undefined}>
                        {isOwner && (
                          <TableCell className="w-10">
                            <Checkbox
                              checked={selectedIds.has(member.userId)}
                              onCheckedChange={(c) => toggleRow(member.userId, c === true)}
                              data-testid={`checkbox-row-${member.userId}`}
                              aria-label={`Select ${member.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Link href={`/admin/players/${member.userId}`} className="text-primary hover:underline" data-testid={`link-profile-${member.userId}`}>
                            {member.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>{member.clubName}</TableCell>
                        <TableCell>
                          {member.lastAttendance
                            ? new Date(member.lastAttendance).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell className="font-medium">{member.daysInactive}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(member.membershipStatus)} data-testid={`badge-status-${member.userId}`}>
                            {member.membershipStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.deletionScheduledAt ? (
                            <span className="text-sm text-destructive font-medium" data-testid={`deletion-status-${member.userId}`}>
                              Deletion in {getDaysUntilDeletion(member.deletionScheduledAt)} days
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${member.userId}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => { setMessageModal(member); setMessageClubId(String(member.clubId)); }}
                                data-testid={`action-message-${member.userId}`}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setNoteModal(member)}
                                data-testid={`action-note-${member.userId}`}
                              >
                                <StickyNote className="h-4 w-4 mr-2" />
                                Add Note
                              </DropdownMenuItem>
                              {!member.deletionScheduledAt ? (
                                <DropdownMenuItem
                                  onClick={() => setDeletionModal(member)}
                                  data-testid={`action-schedule-deletion-${member.userId}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Mark for Deletion
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setCancelDeletionModal(member)}
                                  data-testid={`action-cancel-deletion-${member.userId}`}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Cancel Deletion
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/players/${member.userId}`} data-testid={`action-view-profile-${member.userId}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              {isOwner && (
                                <DropdownMenuItem
                                  onClick={() => setPermanentDeleteModal(member)}
                                  className="text-destructive"
                                  data-testid={`action-permanent-delete-${member.userId}`}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Permanently Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!messageModal} onOpenChange={(open) => { if (!open) setMessageModal(null); }}>
        <DialogContent data-testid="modal-send-message">
          <DialogHeader>
            <DialogTitle>Send Message to {messageModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject"
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body</label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your message..."
                rows={5}
                data-testid="input-message-body"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Club</label>
              <Select value={messageClubId} onValueChange={setMessageClubId}>
                <SelectTrigger data-testid="select-message-club">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(clubsQuery.data) && clubsQuery.data.map((c) => (
                    <SelectItem key={c.clubId} value={String(c.clubId)}>
                      {c.clubName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={sendMessageMutation.isPending || !messageSubject.trim() || !messageBody.trim()}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteModal} onOpenChange={(open) => { if (!open) setNoteModal(null); }}>
        <DialogContent data-testid="modal-add-note">
          <DialogHeader>
            <DialogTitle>Add Note for {noteModal?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-1 block">Note</label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note..."
              rows={4}
              data-testid="input-note-text"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => addNoteMutation.mutate()}
              disabled={addNoteMutation.isPending || !noteText.trim()}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletionModal} onOpenChange={(open) => { if (!open) setDeletionModal(null); }}>
        <AlertDialogContent data-testid="modal-schedule-deletion">
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule Deletion for {deletionModal?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              This will schedule the member for deletion after a 3-day countdown period.
              During this time, the deletion can be cancelled. After 3 days, the member's
              account and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason (required)</label>
            <Textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Provide a reason for deletion..."
              rows={3}
              data-testid="input-deletion-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-schedule-deletion">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => scheduleDeletionMutation.mutate()}
              disabled={scheduleDeletionMutation.isPending || !deletionReason.trim()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-schedule-deletion"
            >
              {scheduleDeletionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Schedule Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelDeletionModal} onOpenChange={(open) => { if (!open) setCancelDeletionModal(null); }}>
        <AlertDialogContent data-testid="modal-cancel-deletion">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the scheduled deletion for {cancelDeletionModal?.name}?
              The member will remain in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-dismiss-cancel-deletion">Dismiss</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDeletionMutation.mutate()}
              disabled={cancelDeletionMutation.isPending}
              data-testid="button-confirm-cancel-deletion"
            >
              {cancelDeletionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open) setBulkDeleteOpen(false); }}>
        <AlertDialogContent data-testid="modal-bulk-delete">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently delete {bulkDeleteIds.length} member{bulkDeleteIds.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>WARNING:</strong> This action is irreversible. {bulkDeleteScope === "all"
                ? `You are about to delete every member currently shown by your filters (${bulkDeleteIds.length} total).`
                : `You are about to delete ${bulkDeleteIds.length} selected member${bulkDeleteIds.length === 1 ? "" : "s"}.`}
              {" "}Their accounts and player profiles will be archived and removed from member lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason (required)</label>
            <Textarea
              value={bulkDeleteReason}
              onChange={(e) => setBulkDeleteReason(e.target.value)}
              placeholder={`Provide a reason for deleting ${bulkDeleteIds.length} member${bulkDeleteIds.length === 1 ? "" : "s"}...`}
              rows={3}
              data-testid="input-bulk-delete-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate({ userIds: bulkDeleteIds, reason: bulkDeleteReason })}
              disabled={bulkDeleteMutation.isPending || !bulkDeleteReason.trim() || bulkDeleteIds.length === 0}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanently Delete {bulkDeleteIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!permanentDeleteModal} onOpenChange={(open) => { if (!open) setPermanentDeleteModal(null); }}>
        <AlertDialogContent data-testid="modal-permanent-delete">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>WARNING:</strong> This action is irreversible. You are about to permanently
              delete {permanentDeleteModal?.name}'s account and all associated data including
              attendance records, memberships, and messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason (required)</label>
            <Textarea
              value={permanentDeleteReason}
              onChange={(e) => setPermanentDeleteReason(e.target.value)}
              placeholder="Provide a reason for permanent deletion..."
              rows={3}
              data-testid="input-permanent-delete-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-permanent-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentDeleteMutation.mutate()}
              disabled={permanentDeleteMutation.isPending || !permanentDeleteReason.trim()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-permanent-delete"
            >
              {permanentDeleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

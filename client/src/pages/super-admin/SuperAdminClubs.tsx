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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Building2, Search, Loader2, Pencil, Trash2, CheckCircle, XCircle,
  Clock, ChevronLeft, ChevronRight, Zap, Shield, UserPlus, ArrowRightLeft, MapPin, Users
} from "lucide-react";
import { Link } from "wouter";

interface ClubRecord {
  id: number;
  name: string;
  slug: string;
  description?: string;
  ownerId?: number;
  status: string;
  isActive: boolean;
  city?: string;
  postcode?: string;
  country?: string;
  address?: string;
  createdAt: string;
  contactFullName?: string;
  contactPhone?: string;
}

interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function SuperAdminClubs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editClub, setEditClub] = useState<ClubRecord | null>(null);
  const [deleteClub, setDeleteClub] = useState<ClubRecord | null>(null);
  const [transferClub, setTransferClub] = useState<ClubRecord | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  const pageSize = 25;

  const { data: allClubs, isLoading } = useQuery<ClubRecord[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: allUsers } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/clubs/${data.id}/status`, { status: data.status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({ title: "Club Updated", description: "Club status has been changed." });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (clubId: number) => {
      await apiRequest("DELETE", `/api/admin/clubs/${clubId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setDeleteClub(null);
      toast({ title: "Club Deleted", description: "Club has been removed from the system." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete club", variant: "destructive" });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (data: { clubId: number; newOwnerId: number }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/clubs/${data.clubId}/transfer`, { newOwnerId: data.newOwnerId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setTransferClub(null);
      setNewOwnerId("");
      toast({ title: "Ownership Transferred", description: "Club ownership has been transferred." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to transfer ownership", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!allClubs) return [];
    return allClubs.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.city || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      return true;
    });
  }, [allClubs, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getOwnerName = (ownerId?: number) => {
    if (!ownerId || !allUsers) return "—";
    const owner = allUsers.find(u => u.id === ownerId);
    return owner?.fullName || `User #${ownerId}`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge variant="outline" className="text-xs text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "PENDING": return <Badge variant="outline" className="text-xs text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "REJECTED": return <Badge variant="outline" className="text-xs text-red-600"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
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
    <div className="space-y-6" data-testid="super-admin-clubs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/super-admin">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-clubs-title">
              <Building2 className="w-6 h-6 text-emerald-500" />
              Clubs Control
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Global club management with full override capabilities.</p>
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
                placeholder="Search clubs by name or city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search-clubs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-club-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            Showing {paginated.length} of {filtered.length} clubs
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((club) => (
                  <TableRow key={club.id} data-testid={`row-club-${club.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{club.name}</div>
                        <div className="text-xs text-muted-foreground">{club.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getOwnerName(club.ownerId)}</span>
                    </TableCell>
                    <TableCell>{statusBadge(club.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {[club.city, club.country].filter(Boolean).join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {club.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ id: club.id, status: "APPROVED" })}
                              data-testid={`button-approve-club-${club.id}`}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ id: club.id, status: "REJECTED" })}
                              data-testid={`button-reject-club-${club.id}`}
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setTransferClub(club)} data-testid={`button-transfer-club-${club.id}`}>
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteClub(club)}
                          className="text-destructive"
                          data-testid={`button-delete-club-${club.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No clubs found matching your filters.
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

      <Dialog open={!!transferClub} onOpenChange={(open) => { if (!open) { setTransferClub(null); setNewOwnerId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Transfer Club Ownership
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2">
              You are performing a Super Admin action.
            </p>
            <p className="text-sm">
              Transfer <strong>{transferClub?.name}</strong> to a new owner.
            </p>
            <div>
              <Label>New Owner</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger data-testid="select-new-owner">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.filter(u => u.id !== transferClub?.ownerId).map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferClub(null); setNewOwnerId(""); }}>Cancel</Button>
            <Button
              onClick={() => transferClub && newOwnerId && transferOwnershipMutation.mutate({ clubId: transferClub.id, newOwnerId: parseInt(newOwnerId) })}
              disabled={!newOwnerId || transferOwnershipMutation.isPending}
              data-testid="button-confirm-transfer"
            >
              {transferOwnershipMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteClub} onOpenChange={(open) => !open && setDeleteClub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteClub?.name}</strong> and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClub && deleteClubMutation.mutate(deleteClub.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-club"
            >
              {deleteClubMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

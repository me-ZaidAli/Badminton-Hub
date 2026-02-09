import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, Search, Shield, Loader2, Pencil, Trash2, Key, UserCheck, Ban,
  ChevronLeft, ChevronRight, Filter, Download, Zap, CheckCircle, XCircle, Clock
} from "lucide-react";
import { Link } from "wouter";

interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: string;
  emailVerified: boolean;
  accountStatus: string;
  phone?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
  isJunior?: boolean;
  parentGuardianName?: string;
  parentGuardianEmail?: string;
  continent?: string;
  region?: string;
  closedAt?: string;
  createdAt: string;
}

export default function SuperAdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRecord>>({});
  const pageSize = 25;

  const { data: allUsers, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/super-admin/users/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setEditUser(null);
      toast({ title: "User Updated", description: "User profile has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      setDeleteUser(null);
      toast({ title: "User Deleted", description: "User account has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/super-admin/users/${userId}/reset-password`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Password Reset Link Generated", description: `Reset link: ${data.resetLink}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (data: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${data.id}/role`, { role: data.role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/stats"] });
      toast({ title: "Role Updated", description: "User role has been changed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to change role", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => {
      if (search && !u.fullName.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && u.accountStatus !== statusFilter) return false;
      if (verifiedFilter === "VERIFIED" && !u.emailVerified) return false;
      if (verifiedFilter === "UNVERIFIED" && u.emailVerified) return false;
      return true;
    });
  }, [allUsers, search, roleFilter, statusFilter, verifiedFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openEdit = (user: UserRecord) => {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      city: user.city || "",
      country: user.country || "",
      region: user.region || "",
      continent: user.continent || "",
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
      isJunior: user.isJunior || false,
      parentGuardianName: user.parentGuardianName || "",
      parentGuardianEmail: user.parentGuardianEmail || "",
      emailVerified: user.emailVerified,
      accountStatus: user.accountStatus,
    });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const updates = { ...editForm };
    if (updates.dateOfBirth) {
      updates.dateOfBirth = new Date(updates.dateOfBirth).toISOString();
    } else {
      updates.dateOfBirth = undefined;
    }
    updateUserMutation.mutate({ id: editUser.id, updates });
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER": return "destructive" as const;
      case "ADMIN": return "default" as const;
      default: return "outline" as const;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case "PENDING": return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case "REJECTED": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return null;
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
    <div className="space-y-6" data-testid="super-admin-users">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/super-admin">
              <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-users-title">
              <Users className="w-6 h-6 text-blue-500" />
              Users Control
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-10">Global user management with unrestricted access.</p>
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
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ORGANISER">Organiser</SelectItem>
                <SelectItem value="COACH">Coach</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-verified-filter">
                <SelectValue placeholder="Verified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="UNVERIFIED">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            Showing {paginated.length} of {filtered.length} users
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <button
                            type="button"
                            className="font-medium text-sm cursor-pointer hover:text-primary transition-colors text-left"
                            onClick={() => openEdit(user)}
                            data-testid={`link-user-name-${user.id}`}
                          >
                            {user.fullName}
                          </button>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)} className="text-xs">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(user.accountStatus)}
                        <span className="text-xs capitalize">{user.accountStatus?.toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-xs text-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-red-500">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {[user.city, user.country].filter(Boolean).join(", ") || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)} data-testid={`button-edit-user-${user.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resetPasswordMutation.mutate(user.id)}
                          disabled={resetPasswordMutation.isPending}
                          data-testid={`button-reset-pwd-${user.id}`}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteUser(user)}
                          className="text-destructive"
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
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

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Edit User — Super Admin
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="space-y-6 py-2 pr-1">
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-md px-3 py-2">
                You are performing a Super Admin action.
              </p>

              <div>
                <h3 className="text-sm font-semibold mb-3">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input value={editForm.fullName || ""} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} data-testid="input-edit-name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={editForm.email || ""} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} data-testid="input-edit-email" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={editForm.phone || ""} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-edit-phone" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input value={editForm.city || ""} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
                  </div>
                  <div>
                    <Label>Region</Label>
                    <Input value={editForm.region || ""} onChange={(e) => setEditForm(f => ({ ...f, region: e.target.value }))} data-testid="input-edit-region" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={editForm.country || ""} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} data-testid="input-edit-country" />
                  </div>
                  <div>
                    <Label>Continent</Label>
                    <Input value={editForm.continent || ""} onChange={(e) => setEditForm(f => ({ ...f, continent: e.target.value }))} data-testid="input-edit-continent" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Personal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={editForm.dateOfBirth || ""}
                      onChange={(e) => setEditForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                      data-testid="input-edit-dob"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={!!editForm.isJunior}
                      onChange={(e) => setEditForm(f => ({ ...f, isJunior: e.target.checked }))}
                      id="isJunior"
                      data-testid="checkbox-edit-junior"
                    />
                    <Label htmlFor="isJunior">Is Junior</Label>
                  </div>
                  <div>
                    <Label>Parent/Guardian Name</Label>
                    <Input value={editForm.parentGuardianName || ""} onChange={(e) => setEditForm(f => ({ ...f, parentGuardianName: e.target.value }))} data-testid="input-edit-parent-name" />
                  </div>
                  <div>
                    <Label>Parent/Guardian Email</Label>
                    <Input value={editForm.parentGuardianEmail || ""} onChange={(e) => setEditForm(f => ({ ...f, parentGuardianEmail: e.target.value }))} data-testid="input-edit-parent-email" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Account</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select value={editForm.role || ""} onValueChange={(v) => setEditForm(f => ({ ...f, role: v }))}>
                      <SelectTrigger data-testid="select-edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner (Super Admin)</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="ORGANISER">Organiser</SelectItem>
                        <SelectItem value="COACH">Coach</SelectItem>
                        <SelectItem value="PLAYER">Player</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Account Status</Label>
                    <Select value={editForm.accountStatus || ""} onValueChange={(v) => setEditForm(f => ({ ...f, accountStatus: v }))}>
                      <SelectTrigger data-testid="select-edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={!!editForm.emailVerified}
                      onChange={(e) => setEditForm(f => ({ ...f, emailVerified: e.target.checked }))}
                      id="emailVerified"
                      data-testid="checkbox-edit-verified"
                    />
                    <Label htmlFor="emailVerified">Email Verified</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending} data-testid="button-save-user-edit">
              {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteUser?.fullName}</strong> ({deleteUser?.email}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

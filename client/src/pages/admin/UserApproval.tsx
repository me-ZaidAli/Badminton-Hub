import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Loader2, UserCheck, UserX, Users, Clock, CheckSquare } from "lucide-react";

interface PendingUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  emailVerified: boolean;
  accountStatus: string;
  createdAt: string;
  playerProfile: {
    id: number;
    gender: string | null;
    category: string;
    rankingPoints: number;
  } | null;
}

export default function UserApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const { data: pendingUsers, isLoading } = useQuery<PendingUser[]>({
    queryKey: ["/api/admin/pending-users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Approved", description: "The user can now access the platform." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reject user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Rejected", description: "The user's request has been declined." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action }: { action: "approve" | "reject" }) => {
      return apiRequest("POST", "/api/admin/users/bulk-action", {
        userIds: Array.from(selectedIds),
        action,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      const count = selectedIds.size;
      setSelectedIds(new Set());
      toast({
        title: variables.action === "approve" ? "Users Approved" : "Users Rejected",
        description: `${count} user(s) have been ${variables.action}d.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!pendingUsers) return;
    if (selectedIds.size === pendingUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingUsers.map(u => u.id)));
    }
  };

  const allSelected = pendingUsers && pendingUsers.length > 0 && selectedIds.size === pendingUsers.length;

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">User Approval</h1>
        <p className="text-muted-foreground">Review and approve new member registrations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingUsers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-selected-count">{selectedIds.size}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pending Registrations
              </CardTitle>
              <CardDescription>New users waiting for approval</CardDescription>
            </div>
            {pendingUsers && pendingUsers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected || false}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
                {selectedIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => bulkActionMutation.mutate({ action: "approve" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-approve-all"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Approve All ({selectedIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => bulkActionMutation.mutate({ action: "reject" })}
                      disabled={bulkActionMutation.isPending}
                      data-testid="button-reject-all"
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Reject All ({selectedIds.size})
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!pendingUsers || pendingUsers.length === 0 ? (
            <div className="py-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending registrations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between gap-4 p-4 border rounded-md"
                  data-testid={`pending-user-${user.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelect(user.id)}
                      data-testid={`checkbox-user-${user.id}`}
                    />
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`} />
                      <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {user.emailVerified ? "Email Verified" : "Email Not Verified"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Registered {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => rejectMutation.mutate(user.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-${user.id}`}
                    >
                      <UserX className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(user.id)}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-${user.id}`}
                    >
                      <UserCheck className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, CheckCircle, XCircle, Clock, MapPin, Users, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { format } from "date-fns";
import type { Club } from "@shared/schema";

export default function ClubApprovals() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; clubId: number | null; action: string; clubName: string }>({ 
    open: false, 
    clubId: null, 
    action: "", 
    clubName: "" 
  });

  const { data: clubs, isLoading } = useQuery<Club[]>({
    queryKey: ["/api/admin/clubs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/clubs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clubs");
      return res.json();
    },
    enabled: user?.role === "OWNER",
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ clubId, status }: { clubId: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/clubs/${clubId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      toast({ title: "Success", description: `Club ${confirmDialog.action === "APPROVED" ? "approved" : "rejected"} successfully` });
      setConfirmDialog({ open: false, clubId: null, action: "", clubName: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update club status", variant: "destructive" });
    },
  });

  const pendingClubs = clubs?.filter(c => c.status === "PENDING") || [];
  const approvedClubs = clubs?.filter(c => c.status === "APPROVED") || [];
  const rejectedClubs = clubs?.filter(c => c.status === "REJECTED") || [];

  const openConfirmDialog = (clubId: number, action: string, clubName: string) => {
    setConfirmDialog({ open: true, clubId, action, clubName });
  };

  const handleConfirm = () => {
    if (confirmDialog.clubId && confirmDialog.action) {
      updateStatusMutation.mutate({ clubId: confirmDialog.clubId, status: confirmDialog.action });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "APPROVED": return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "REJECTED": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (user?.role !== "OWNER") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must have God's Mode access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Club Approvals
          </h1>
          <p className="text-muted-foreground">Review and approve club registration requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingClubs.length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedClubs.length}</p>
                <p className="text-sm text-muted-foreground">Approved Clubs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedClubs.length}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Club Requests ({pendingClubs.length})
          </CardTitle>
          <CardDescription>Clubs awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : pendingClubs.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No pending club requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingClubs.map((club) => (
                    <TableRow key={club.id} data-testid={`row-pending-club-${club.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{club.name}</p>
                            <p className="text-xs text-muted-foreground">{club.description || "No description"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {club.city ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {club.city}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {club.isRegisteredWithBE ? (
                          <Badge variant="outline" className="text-xs">BE: {club.beRegistrationNumber}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not registered</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {club.hasCompetitions && <Badge variant="secondary" className="text-xs">Competitions</Badge>}
                          {club.hasSocialGames && <Badge variant="secondary" className="text-xs">Social</Badge>}
                          {club.providesTraining && <Badge variant="secondary" className="text-xs">Training</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {club.createdAt ? format(new Date(club.createdAt), "MMM d, yyyy") : "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => openConfirmDialog(club.id, "APPROVED", club.name)}
                            data-testid={`button-approve-${club.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => openConfirmDialog(club.id, "REJECTED", club.name)}
                            data-testid={`button-reject-${club.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approved Clubs ({approvedClubs.length})
          </CardTitle>
          <CardDescription>Active clubs on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedClubs.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-muted-foreground">
              No approved clubs yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedClubs.map((club) => (
                    <TableRow key={club.id} data-testid={`row-approved-club-${club.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{club.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {club.city || <span className="text-muted-foreground">Not specified</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(club.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openConfirmDialog(club.id, "REJECTED", club.name)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {rejectedClubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejected Clubs ({rejectedClubs.length})
            </CardTitle>
            <CardDescription>Previously rejected club requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedClubs.map((club) => (
                    <TableRow key={club.id} data-testid={`row-rejected-club-${club.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{club.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {club.city || <span className="text-muted-foreground">Not specified</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(club.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openConfirmDialog(club.id, "APPROVED", club.name)}
                        >
                          Reconsider
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "APPROVED" ? "Approve Club" : "Reject Club"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.action === "APPROVED" ? "approve" : "reject"} "{confirmDialog.clubName}"?
              {confirmDialog.action === "APPROVED" 
                ? " The club will become visible to users and can start accepting members."
                : " The club will not be visible to users."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={confirmDialog.action === "REJECTED" ? "bg-destructive text-destructive-foreground" : ""}
            >
              {confirmDialog.action === "APPROVED" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

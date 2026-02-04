import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Check, X, Shield, User, Clock, Loader2 } from "lucide-react";
import { PlayerProfile, User as UserType } from "@shared/schema";

type MemberWithUser = PlayerProfile & { user: UserType };

export default function ClubAdmin() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // Find clubs where user is owner or admin
  const ownedClubs = clubs?.filter(club => club.ownerId === user?.id) || [];
  const clubId = selectedClubId ?? ownedClubs[0]?.id ?? null;

  const { data: members, isLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!clubId,
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: number; updates: { membershipStatus?: string; clubRole?: string } }) => {
      const res = await apiRequest("PATCH", `/api/clubs/${clubId}/members/${profileId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members"] });
      toast({ title: "Member updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingMembers = members?.filter(m => m.membershipStatus === "PENDING") || [];
  const approvedMembers = members?.filter(m => m.membershipStatus === "APPROVED") || [];
  const rejectedMembers = members?.filter(m => m.membershipStatus === "REJECTED") || [];

  const handleApprove = (profileId: number) => {
    updateMemberMutation.mutate({ profileId, updates: { membershipStatus: "APPROVED" } });
  };

  const handleReject = (profileId: number) => {
    updateMemberMutation.mutate({ profileId, updates: { membershipStatus: "REJECTED" } });
  };

  const handleRoleChange = (profileId: number, role: string) => {
    updateMemberMutation.mutate({ profileId, updates: { clubRole: role } });
  };

  if (!ownedClubs.length && user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return (
      <div className="space-y-8">
        <PageHeader title="Club Admin" description="You don't own any clubs." />
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Create a club to start managing members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Club Admin" 
        description="Manage your club members and approve join requests."
      />

      {ownedClubs.length > 1 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Club:</label>
          <Select value={clubId?.toString() || ""} onValueChange={(v) => setSelectedClubId(Number(v))}>
            <SelectTrigger className="w-[250px]" data-testid="select-club">
              <SelectValue placeholder="Select a club..." />
            </SelectTrigger>
            <SelectContent>
              {ownedClubs.map(club => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingMembers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="w-4 h-4" />
            Approved ({approvedMembers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="w-4 h-4" />
            Rejected ({rejectedMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Join Requests</CardTitle>
              <CardDescription>Review and approve new member requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pendingMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMembers.map(member => (
                      <TableRow key={member.id} data-testid={`pending-member-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user.fullName}`} />
                              <AvatarFallback>{member.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.user.fullName}</div>
                              <div className="text-sm text-muted-foreground">{member.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.gender || "Not specified"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(member.id)} data-testid={`approve-${member.id}`}>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(member.id)} data-testid={`reject-${member.id}`}>
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Members</CardTitle>
              <CardDescription>Manage member roles and permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : approvedMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No approved members yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedMembers.map(member => (
                      <TableRow key={member.id} data-testid={`approved-member-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user.fullName}`} />
                              <AvatarFallback>{member.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.user.fullName}</div>
                              <div className="text-sm text-muted-foreground">{member.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={member.clubRole || "PLAYER"} 
                            onValueChange={(role) => handleRoleChange(member.id, role)}
                          >
                            <SelectTrigger className="w-[120px]" data-testid={`role-select-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLAYER">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  Player
                                </div>
                              </SelectItem>
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="OWNER">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  Owner
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-medium">{member.rankingPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Members</CardTitle>
              <CardDescription>Members whose requests were rejected.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : rejectedMembers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No rejected members.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedMembers.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user.fullName}`} />
                              <AvatarFallback>{member.user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.user.fullName}</div>
                              <div className="text-sm text-muted-foreground">{member.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(member.id)}>
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

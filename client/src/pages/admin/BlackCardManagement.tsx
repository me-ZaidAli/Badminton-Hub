import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Search, CreditCard, Users, Shield, Crown, Sparkles, ChevronLeft,
  Loader2, CheckCircle, XCircle, Filter
} from "lucide-react";
import { Link } from "wouter";

interface UserWithProfiles {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  city?: string;
  country?: string;
  blackCardAccess?: boolean;
  profilePictureUrl?: string;
  playerProfiles: {
    id: number;
    clubId: number;
    clubRole: string;
    grade?: string;
    club?: { name: string };
  }[];
}

export default function BlackCardManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "OWNER" | "ADMIN" | "PLAYER">("all");

  const { data: allUsers, isLoading } = useQuery<UserWithProfiles[]>({
    queryKey: ["/api/users"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: number; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/black-card`, {
        blackCardAccess: enabled,
      });
      if (!res.ok) throw new Error("Failed to update Black Card access");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: variables.enabled ? "Black Card Granted" : "Black Card Revoked",
        description: variables.enabled
          ? "User now has access to Ultra Exclusive themes"
          : "Ultra Exclusive theme access has been removed",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update Black Card access", variant: "destructive" });
    },
  });

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !u.fullName?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q) &&
          !u.city?.toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter === "active" && !u.blackCardAccess) return false;
      if (statusFilter === "inactive" && u.blackCardAccess) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      return true;
    });
  }, [allUsers, searchQuery, statusFilter, roleFilter]);

  const totalHolders = allUsers?.filter((u) => u.blackCardAccess).length || 0;
  const totalMembers = allUsers?.length || 0;

  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Access restricted to Admins and Owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2" data-testid="text-black-card-title">
            <CreditCard className="h-7 w-7" />
            Black Card Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Grant or revoke Ultra Exclusive Black Card access for members
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1 px-3">
          <Shield className="h-4 w-4 mr-2" />
          {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-2xl mx-auto w-full" data-testid="card-black-card-showcase"
          style={{
            background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 30%, #1e1e1e 50%, #252525 70%, #1a1a1a 100%)",
            boxShadow: "0 0 0 2px #b8860b, 0 0 0 3px rgba(184,134,11,0.3), 0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)",
            aspectRatio: "1.586",
            maxWidth: "420px",
          }}>
          <div className="absolute inset-0 rounded-2xl" style={{
            background: "repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px)",
          }} />
          <div className="absolute inset-0 rounded-2xl" style={{
            background: "radial-gradient(ellipse at 30% 20%, rgba(184,134,11,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(184,134,11,0.05) 0%, transparent 40%)",
          }} />
          <div className="absolute inset-[2px] rounded-2xl border border-amber-700/20" />
          <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg sm:text-xl font-bold tracking-[0.08em]" style={{ color: "#c5a044" }}>
                  BLACK CARD
                </p>
                <p className="text-[11px] uppercase tracking-[0.25em] mt-0.5 font-medium" style={{ color: "#9a7d2e" }}>
                  Titanium Gold Member
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: "linear-gradient(135deg, #c5a044, #8b6914)",
                boxShadow: "0 2px 8px rgba(184,134,11,0.3)",
              }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
                  <path d="M12 2L6 8H2L5 14L3 22H21L19 14L22 8H18L12 2Z" fill="#1a1a1a" stroke="#1a1a1a" />
                  <path d="M7 8L12 3L17 8" stroke="#2a2a2a" strokeWidth="1" />
                  <rect x="8" y="12" width="8" height="4" rx="0.5" fill="#2a2a2a" />
                </svg>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <svg viewBox="0 0 60 36" className="w-14 h-auto" fill="none">
                  <path d="M10 30L20 15L30 25L40 10L50 20" stroke="#c5a044" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M22 8L30 2L38 8" stroke="#c5a044" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <path d="M26 8L30 4L34 8" stroke="#9a7d2e" strokeWidth="1" strokeLinecap="round" fill="none" />
                  <circle cx="30" cy="2" r="1.5" fill="#c5a044" />
                </svg>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: "#7a6420" }}>
                  Ultra Exclusive Access
                </p>
                <p className="text-[11px] font-mono tracking-wider" style={{ color: "#9a7d2e" }}>
                  {totalHolders} HOLDER{totalHolders !== 1 ? "S" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 content-center">
          <Card className="border-border/40" data-testid="card-black-card-holders">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Black Card Holders</span>
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-500" data-testid="value-holders-count">{totalHolders}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of {totalMembers} total members</p>
            </CardContent>
          </Card>
          <Card className="border-border/40" data-testid="card-exclusive-themes">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Exclusive Themes</span>
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-sm font-medium text-purple-400">Midnight Neon · Cosmic Elite · Phantom Luxe</div>
              <p className="text-xs text-muted-foreground mt-1">Invite-only Ultra Exclusive tier</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card data-testid="card-black-card-filters">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-44" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Black Card Holders</SelectItem>
                <SelectItem value="inactive">No Black Card</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-36" data-testid="select-role-filter">
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="PLAYER">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-members-table">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No members match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Clubs</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Black Card</TableHead>
                    <TableHead className="text-center w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((member) => (
                    <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {member.profilePictureUrl ? (
                              <AvatarImage src={member.profilePictureUrl} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {member.fullName
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                                {member.fullName}
                              </p>
                              {member.blackCardAccess && (
                                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {member.playerProfiles?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate">
                          {[member.city, member.country].filter(Boolean).join(", ") || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.blackCardAccess ? (
                          <Badge className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white border-0 text-xs" data-testid={`badge-black-card-active-${member.id}`}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground" data-testid={`badge-black-card-inactive-${member.id}`}>
                            <XCircle className="h-3 w-3 mr-1" />
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user?.role === "OWNER" ? (
                          <Switch
                            checked={!!member.blackCardAccess}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ userId: member.id, enabled: checked })
                            }
                            disabled={toggleMutation.isPending}
                            data-testid={`switch-black-card-${member.id}`}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Owner only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

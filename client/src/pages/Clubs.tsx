import { useState } from "react";
import { Link } from "wouter";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClubMap } from "@/components/ui/club-map";
import { Users, MapPin, Search, Plus, ArrowRight, List, LayoutGrid, Map, CheckCircle, Clock, XCircle, Loader2, Building2 } from "lucide-react";

type Membership = {
  clubId: number;
  clubName: string;
  membershipStatus: string;
  profileId: number;
};

function getMembershipStatus(memberships: Membership[] | undefined, clubId: number) {
  if (!memberships) return null;
  return memberships.find(m => m.clubId === clubId) || null;
}

function MembershipBadge({ membership }: { membership: Membership | null }) {
  if (!membership) {
    return (
      <Badge variant="outline" className="text-xs" data-testid="badge-not-member">
        Not a member
      </Badge>
    );
  }
  if (membership.membershipStatus === "APPROVED") {
    return (
      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-accepted">
        <CheckCircle className="w-3 h-3 mr-1" />
        Member
      </Badge>
    );
  }
  if (membership.membershipStatus === "PENDING") {
    return (
      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-pending">
        <Clock className="w-3 h-3 mr-1" />
        Pending Approval
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="badge-rejected">
      <XCircle className="w-3 h-3 mr-1" />
      Rejected
    </Badge>
  );
}

export default function Clubs() {
  const { data: user } = useUser();
  const { data: clubs, isLoading } = useClubs();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const { data: memberships } = useQuery<Membership[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { clubId: number }) => {
      const res = await apiRequest("POST", "/api/clubs/join", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join club");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Join request submitted",
        description: "The club admin will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] });
      setJoinDialogOpen(false);
      setSelectedClub(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredClubs = clubs?.filter(club => {
    const query = searchQuery.toLowerCase();
    return (
      club.name.toLowerCase().includes(query) ||
      club.description?.toLowerCase().includes(query) ||
      club.city?.toLowerCase().includes(query) ||
      club.postcode?.toLowerCase().includes(query) ||
      club.address?.toLowerCase().includes(query) ||
      club.country?.toLowerCase().includes(query)
    );
  }) || [];

  const clubsWithLocation = filteredClubs.filter(c => c.latitude && c.longitude);

  const handleClubClick = (club: any) => {
    if (user) {
      setSelectedClub(club);
    }
  };

  const handleJoinRequest = () => {
    if (!selectedClub || !user) return;
    joinMutation.mutate({ clubId: selectedClub.id });
  };

  const getJoinButtonState = (clubId: number) => {
    const membership = getMembershipStatus(memberships, clubId);
    if (!membership) return "join";
    if (membership.membershipStatus === "APPROVED") return "member";
    if (membership.membershipStatus === "PENDING") return "pending";
    return "rejected";
  };

  return (
    <div className="min-h-screen bg-background">
      {!user && (
        <header className="border-b bg-card px-6 py-4 flex justify-between items-center flex-wrap gap-2">
          <Link href="/">
            <span className="text-xl font-bold text-primary cursor-pointer">Club Master</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </div>
        </header>
      )}

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <PageHeader 
          title="Browse Clubs" 
          description="Find a badminton club near you. Search by name, city, postcode, or country."
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by club name, city, postcode, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clubs"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant={viewMode === "grid" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "map" ? "default" : "outline"} 
              size="icon"
              onClick={() => setViewMode("map")}
              data-testid="button-view-map"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {user && user.role === "OWNER" && (
            <Link href="/create-club">
              <Button data-testid="button-create-club">
                <Plus className="w-4 h-4 mr-2" />
                Create Club
              </Button>
            </Link>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredClubs.length} club{filteredClubs.length !== 1 ? 's' : ''} found
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-4 w-48 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No clubs found matching your search." : "No clubs available yet."}
              </p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try a different city, postcode, or club name.
                </p>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "map" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredClubs.map(club => {
                  const membership = getMembershipStatus(memberships, club.id);
                  return (
                    <Card
                      key={club.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleClubClick(club)}
                      data-testid={`club-card-${club.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{club.name}</h3>
                            {(club.city || club.postcode) && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {[club.city, club.postcode, club.country].filter(Boolean).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {user && <MembershipBadge membership={membership} />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            <div className="lg:sticky lg:top-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Club Locations
                  </CardTitle>
                  <CardDescription>
                    {clubsWithLocation.length} club{clubsWithLocation.length !== 1 ? 's' : ''} shown on map
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px]">
                    <ClubMap clubs={clubsWithLocation} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {filteredClubs.map(club => {
              const membership = getMembershipStatus(memberships, club.id);
              return (
                <Card
                  key={club.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleClubClick(club)}
                  data-testid={`club-card-${club.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="h-10 w-10 rounded object-contain" />
                          ) : (
                            <Building2 className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{club.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[club.city, club.postcode, club.country].filter(Boolean).join(", ") || club.slug}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {user && <MembershipBadge membership={membership} />}
                        <Button size="sm" variant="outline" data-testid={`button-view-club-${club.id}`}>
                          View
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map(club => {
              const membership = getMembershipStatus(memberships, club.id);
              return (
                <Card
                  key={club.id}
                  className="hover-elevate transition-all cursor-pointer"
                  onClick={() => handleClubClick(club)}
                  data-testid={`club-card-${club.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="h-8 w-8 rounded object-contain" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{club.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[club.city, club.postcode].filter(Boolean).join(", ") || club.slug}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {club.description || "A great place to play badminton and meet fellow players."}
                    </p>
                    {club.country && (
                      <p className="text-xs text-muted-foreground">{club.country}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {user ? (
                        <MembershipBadge membership={membership} />
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>Open for members</span>
                        </div>
                      )}
                      {!user && (
                        <Link href="/register">
                          <Button size="sm" variant="outline">
                            Register to Join
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedClub} onOpenChange={(open) => { if (!open) { setSelectedClub(null); } }}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-club-detail">
          {selectedClub && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {selectedClub.logoUrl ? (
                      <img src={selectedClub.logoUrl} alt={selectedClub.name} className="h-10 w-10 rounded object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <DialogTitle>{selectedClub.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[selectedClub.city, selectedClub.postcode, selectedClub.country].filter(Boolean).join(", ") || "Location not set"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {selectedClub.description && (
                  <p className="text-sm text-muted-foreground">{selectedClub.description}</p>
                )}

                {selectedClub.address && (
                  <div className="text-sm">
                    <span className="font-medium">Address:</span>{" "}
                    <span className="text-muted-foreground">{selectedClub.address}</span>
                  </div>
                )}

                {selectedClub.playerLevels && selectedClub.playerLevels.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Levels:</span>
                    {selectedClub.playerLevels.map((level: string) => (
                      <Badge key={level} variant="outline" className="text-xs capitalize">{level}</Badge>
                    ))}
                  </div>
                )}

                {selectedClub.sessionFee != null && (
                  <div className="text-sm">
                    <span className="font-medium">Session Fee:</span>{" "}
                    <span className="text-muted-foreground">£{(selectedClub.sessionFee / 100).toFixed(2)}</span>
                  </div>
                )}

                {user && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium">Your Status:</span>
                      {selectedClub.ownerId === user.id ? (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid="badge-owner">
                          <Building2 className="w-3 h-3 mr-1" />
                          Club Owner
                        </Badge>
                      ) : (
                        <MembershipBadge membership={getMembershipStatus(memberships, selectedClub.id)} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-3">
                {user && (() => {
                  const isOwner = selectedClub.ownerId === user.id;
                  if (isOwner) {
                    return (
                      <Link href="/dashboard">
                        <Button className="w-full sm:w-auto" data-testid="button-owner-dashboard">
                          <Building2 className="w-4 h-4 mr-2" />
                          Manage Club
                        </Button>
                      </Link>
                    );
                  }
                  const state = getJoinButtonState(selectedClub.id);
                  if (state === "member") {
                    return (
                      <Link href="/dashboard">
                        <Button className="w-full sm:w-auto" data-testid="button-go-dashboard">
                          Go to Dashboard
                        </Button>
                      </Link>
                    );
                  }
                  if (state === "pending") {
                    return (
                      <Button disabled className="w-full sm:w-auto" data-testid="button-join-pending">
                        <Clock className="w-4 h-4 mr-2" />
                        Request Sent (Pending Approval)
                      </Button>
                    );
                  }
                  return (
                    <Button
                      onClick={handleJoinRequest}
                      disabled={joinMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-request-join"
                    >
                      {joinMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Request to Join Club
                        </>
                      )}
                    </Button>
                  );
                })()}
                {!user && (
                  <Link href="/register">
                    <Button data-testid="button-register-join">
                      Register to Join
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

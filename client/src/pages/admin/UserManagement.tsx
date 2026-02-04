import { usePlayers } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Shield, Mail, Trophy } from "lucide-react";
import { Link } from "wouter";

export default function UserManagement() {
  const { data: user } = useUser();
  const { data: players, isLoading } = usePlayers();

  const isOwner = user?.role === "OWNER";

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER": return "destructive";
      case "ADMIN": return "default";
      case "ORGANISER": return "secondary";
      case "COACH": return "outline";
      default: return "outline";
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "A": return "text-green-500";
      case "B": return "text-blue-500";
      case "C": return "text-orange-500";
      case "D": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground">View and manage all club members.</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">All Members ({players?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading members...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players?.map((player) => (
                    <TableRow key={player.id} data-testid={`row-user-${player.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                            <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{player.fullName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {player.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(player.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {player.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getCategoryColor(player.playerProfile?.category || null)}`}>
                          {player.playerProfile?.category || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {player.playerProfile ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span>{player.playerProfile.matchesWon}/{player.playerProfile.matchesPlayed}</span>
                            <span className="text-muted-foreground">
                              ({player.playerProfile.matchesPlayed > 0 
                                ? Math.round((player.playerProfile.matchesWon / player.playerProfile.matchesPlayed) * 100) 
                                : 0}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No profile</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={player.emailVerified ? "default" : "outline"}>
                          {player.emailVerified ? "Verified" : "Pending"}
                        </Badge>
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

import { usePlayers, useUpdatePlayer } from "@/hooks/use-players";
import { useUser } from "@/hooks/use-auth";
import { useClubs } from "@/hooks/use-clubs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trophy, Search, Users, Pencil, Loader2, Phone, Mail, Calendar, Shield, Building2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

type PlayerData = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  isJunior?: boolean;
  parentGuardianName?: string | null;
  parentGuardianEmail?: string | null;
  playerProfile?: {
    id: number;
    clubId: number;
    gender: string | null;
    category: string | null;
    rankingPoints: number;
    matchesPlayed: number;
    matchesWon: number;
  } | null;
};

export default function Players() {
  const { data: user } = useUser();
  const { data: players, isLoading } = usePlayers();
  const { data: clubs } = useClubs();
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [editPlayer, setEditPlayer] = useState<PlayerData | null>(null);
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "ORGANISER";

  const filteredPlayers = players?.filter((p: any) => {
    const matchesSearch = p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesClub = selectedClubId === "all" || 
      p.playerProfile?.clubId === Number(selectedClubId);
    const matchesCategory = categoryFilter === "all" ||
      p.playerProfile?.category === categoryFilter;
    const matchesGender = genderFilter === "all" ||
      p.playerProfile?.gender === genderFilter;
    return matchesSearch && matchesClub && matchesCategory && matchesGender;
  });

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "A": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "B": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "C": return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      case "D": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Players
          </h1>
          <p className="text-muted-foreground">Browse all club members.{isAdmin ? " Click the edit icon to update player details." : ""}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search players..." 
              className="pl-10" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-players"
            />
          </div>
          {clubs && clubs.length > 0 && (
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="A">Category A</SelectItem>
              <SelectItem value="B">Category B</SelectItem>
              <SelectItem value="C">Category C</SelectItem>
              <SelectItem value="D">Category D</SelectItem>
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-gender-filter">
              <SelectValue placeholder="All Genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredPlayers?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No players found matching "{search}"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers?.map((player: any) => (
            <Card key={player.id} className="border-border/50 hover-elevate relative" data-testid={`card-player-${player.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
                    <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{player.fullName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={getCategoryColor(player.playerProfile?.category || null)}>
                        {player.playerProfile?.category || "N/A"}
                      </Badge>
                      {player.playerProfile && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {player.playerProfile.rankingPoints} pts
                        </span>
                      )}
                      {player.isJunior && (
                        <Badge variant="secondary" className="text-[10px] py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                          Junior
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditPlayer(player)}
                      data-testid={`button-edit-player-${player.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {player.playerProfile && (
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Matches</span>
                    <span className="font-medium">
                      {player.playerProfile.matchesWon} / {player.playerProfile.matchesPlayed}
                      <span className="text-muted-foreground ml-1">
                        ({player.playerProfile.matchesPlayed > 0 
                          ? Math.round((player.playerProfile.matchesWon / player.playerProfile.matchesPlayed) * 100) 
                          : 0}%)
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editPlayer && (
        <EditPlayerDialog
          player={editPlayer}
          clubs={clubs || []}
          open={!!editPlayer}
          onOpenChange={(open) => { if (!open) setEditPlayer(null); }}
        />
      )}
    </div>
  );
}

function EditPlayerDialog({
  player,
  clubs,
  open,
  onOpenChange,
}: {
  player: PlayerData;
  clubs: { id: number; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutate: updatePlayer, isPending } = useUpdatePlayer();
  
  const [fullName, setFullName] = useState(player.fullName);
  const [email, setEmail] = useState(player.email);
  const [phone, setPhone] = useState(player.phone || "");
  const [gender, setGender] = useState(player.playerProfile?.gender || "");
  const [category, setCategory] = useState(player.playerProfile?.category || "D");
  const [clubId, setClubId] = useState(player.playerProfile?.clubId?.toString() || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : ""
  );
  const [isJunior, setIsJunior] = useState(player.isJunior || false);
  const [parentGuardianName, setParentGuardianName] = useState(player.parentGuardianName || "");
  const [parentGuardianEmail, setParentGuardianEmail] = useState(player.parentGuardianEmail || "");
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    const updates: any = { id: player.id };
    
    if (fullName !== player.fullName) updates.fullName = fullName;
    if (email !== player.email) updates.email = email;
    if (phone !== (player.phone || "")) updates.phone = phone || null;
    if (gender !== (player.playerProfile?.gender || "")) updates.gender = gender;
    if (category !== (player.playerProfile?.category || "D")) updates.category = category;
    if (clubId && Number(clubId) !== player.playerProfile?.clubId) updates.clubId = Number(clubId);
    
    const origDob = player.dateOfBirth ? format(new Date(player.dateOfBirth), "yyyy-MM-dd") : "";
    if (dateOfBirth !== origDob) updates.dateOfBirth = dateOfBirth || null;
    
    if (isJunior !== (player.isJunior || false)) updates.isJunior = isJunior;
    if (parentGuardianName !== (player.parentGuardianName || "")) updates.parentGuardianName = parentGuardianName || null;
    if (parentGuardianEmail !== (player.parentGuardianEmail || "")) updates.parentGuardianEmail = parentGuardianEmail || null;
    if (newPassword.trim()) updates.password = newPassword;

    updatePlayer(updates, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Player
          </DialogTitle>
          <DialogDescription>
            Update {player.fullName}'s details. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`} />
              <AvatarFallback>{player.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{player.fullName}</p>
              <p className="text-sm text-muted-foreground">{player.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="input-edit-fullname"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-edit-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xxx xxxxxx"
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dob">Date of Birth</Label>
              <Input
                id="edit-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                data-testid="input-edit-dob"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category / Grade</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Category A</SelectItem>
                  <SelectItem value="B">Category B</SelectItem>
                  <SelectItem value="C">Category C</SelectItem>
                  <SelectItem value="D">Category D</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Club</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger data-testid="select-edit-club">
                <SelectValue placeholder="Select club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map(club => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <div>
              <Label htmlFor="edit-isJunior" className="font-medium">Junior Player</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Under 18 years old</p>
            </div>
            <Switch
              id="edit-isJunior"
              checked={isJunior}
              onCheckedChange={setIsJunior}
              data-testid="switch-edit-junior"
            />
          </div>

          {isJunior && (
            <div className="grid grid-cols-2 gap-4 pl-3 border-l-2 border-primary/30">
              <div className="space-y-1.5">
                <Label htmlFor="edit-guardian-name">Parent/Guardian Name</Label>
                <Input
                  id="edit-guardian-name"
                  value={parentGuardianName}
                  onChange={(e) => setParentGuardianName(e.target.value)}
                  placeholder="Guardian name"
                  data-testid="input-edit-guardian-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-guardian-email">Parent/Guardian Email</Label>
                <Input
                  id="edit-guardian-email"
                  type="email"
                  value={parentGuardianEmail}
                  onChange={(e) => setParentGuardianEmail(e.target.value)}
                  placeholder="guardian@email.com"
                  data-testid="input-edit-guardian-email"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Reset Password</Label>
            <Input
              id="edit-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              data-testid="input-edit-password"
            />
            <p className="text-xs text-muted-foreground">Only fill this if you want to change the player's password.</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-player">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

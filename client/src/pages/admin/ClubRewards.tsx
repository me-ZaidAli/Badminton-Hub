import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Trophy, Users, Loader2, ArrowLeft, PartyPopper, Target, TrendingUp, Award } from "lucide-react";
import { Link } from "wouter";
import { AttendanceRewardsPanel } from "./AttendanceRewards";
import { PointsRewardsPanel } from "./PointsRewards";
import { GradeRewardsPanel } from "./GradeRewards";

interface AnniversarySettings {
  id: number;
  clubId: number;
  isActive: boolean;
  credits: number;
  gifts: string;
  message: string;
}

interface ReferralProgram {
  id: number;
  clubId: number;
  name: string;
  isActive: boolean;
  referrerReward: number;
  refereeReward: number;
  description?: string;
}

function AnniversaryRewardsTab({ clubId }: { clubId: number }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formCreditsGBP, setFormCreditsGBP] = useState("");
  const [formGifts, setFormGifts] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: settings, isLoading } = useQuery<AnniversarySettings | null>({
    queryKey: ["/api/clubs", clubId, "anniversary-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/anniversary-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch anniversary settings");
      const data = await res.json();
      return data || null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { isActive: boolean; credits: number; gifts: string; message: string }) => {
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/anniversary-settings`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "anniversary-settings"] });
      setEditing(false);
      toast({ title: "Saved", description: "Anniversary reward settings have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    },
  });

  function startEditing() {
    setFormCreditsGBP(settings ? (settings.credits / 100).toFixed(2) : "0.00");
    setFormGifts(settings?.gifts ?? "");
    setFormMessage(settings?.message ?? "");
    setFormIsActive(settings?.isActive ?? true);
    setEditing(true);
  }

  function handleSave() {
    const creditsPence = Math.round(parseFloat(formCreditsGBP || "0") * 100);
    saveMutation.mutate({
      isActive: formIsActive,
      credits: creditsPence,
      gifts: formGifts,
      message: formMessage,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-anniversary">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings && !editing) {
    return (
      <Card data-testid="card-no-anniversary">
        <CardContent className="py-8 text-center space-y-3">
          <PartyPopper className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No anniversary reward settings configured yet.</p>
          <p className="text-sm text-muted-foreground">
            Set up anniversary rewards to automatically celebrate members on their club join anniversary.
          </p>
          <Button onClick={startEditing} data-testid="button-setup-anniversary">
            <Gift className="h-4 w-4 mr-2" />
            Set Up Anniversary Rewards
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4" data-testid="anniversary-form">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-amber-500" />
              Anniversary Reward Settings
            </CardTitle>
            <CardDescription>Configure what members receive on their club anniversary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="anniversary-active">Active</Label>
              <Switch
                id="anniversary-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                data-testid="switch-anniversary-active"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anniversary-credits">Credits (GBP)</Label>
              <Input
                id="anniversary-credits"
                type="number"
                min={0}
                step={0.01}
                value={formCreditsGBP}
                onChange={(e) => setFormCreditsGBP(e.target.value)}
                placeholder="0.00"
                data-testid="input-anniversary-credits"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anniversary-gifts">Gifts</Label>
              <Input
                id="anniversary-gifts"
                type="text"
                value={formGifts}
                onChange={(e) => setFormGifts(e.target.value)}
                placeholder="e.g. Free shuttlecocks, Club t-shirt"
                data-testid="input-anniversary-gifts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anniversary-message">Anniversary Message</Label>
              <Textarea
                id="anniversary-message"
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="Happy anniversary! Thank you for being a valued member of our club."
                className="min-h-[80px]"
                data-testid="input-anniversary-message"
              />
            </div>

            {formMessage && (
              <Card className="border-border/50" data-testid="card-message-preview">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Message Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <PartyPopper className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-message-preview">{formMessage}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <Button variant="outline" onClick={() => setEditing(false)} data-testid="button-cancel-anniversary">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-anniversary">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="anniversary-settings-view">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold" data-testid="text-anniversary-title">Anniversary Rewards</h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-anniversary-description">
            Members receive these rewards on their club join anniversary. The anniversary resets every year, so rewards are given annually on each anniversary date.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={settings!.isActive ? "default" : "secondary"}
            className={settings!.isActive ? "bg-green-600 text-white no-default-hover-elevate" : "no-default-hover-elevate"}
            data-testid="badge-anniversary-status"
          >
            {settings!.isActive ? "Active" : "Inactive"}
          </Badge>
          <Button variant="outline" onClick={startEditing} data-testid="button-edit-anniversary">
            Edit Settings
          </Button>
        </div>
      </div>

      <Card className="border-border/50" data-testid="card-anniversary-details">
        <CardContent className="pt-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1" data-testid="text-anniversary-credits">
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="font-medium">{`\u00A3${(settings!.credits / 100).toFixed(2)}`}</p>
            </div>
            {settings!.gifts && (
              <div className="space-y-1" data-testid="text-anniversary-gifts">
                <p className="text-sm text-muted-foreground">Gifts</p>
                <p className="font-medium">{settings!.gifts}</p>
              </div>
            )}
          </div>
          {settings!.message && (
            <div className="space-y-1 pt-2 border-t" data-testid="text-anniversary-message">
              <p className="text-sm text-muted-foreground">Anniversary Message</p>
              <div className="flex items-start gap-3 mt-1">
                <PartyPopper className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{settings!.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReferralProgramsTab({ clubId }: { clubId: number }) {
  const { data: programs, isLoading } = useQuery<ReferralProgram[]>({
    queryKey: ["/api/clubs", clubId, "referral-programs"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/referral-programs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referral programs");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-referrals">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <Card data-testid="card-no-referrals">
        <CardContent className="py-8 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No referral programs configured for this club.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Referral programs can be managed from the Referral Management section.
          </p>
        </CardContent>
      </Card>
    );
  }

  function formatGBP(pence: number): string {
    return `\u00A3${(pence / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-4" data-testid="referral-programs-list">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-bold" data-testid="text-referrals-title">Referral Programs</h2>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="text-referrals-description">
          Active referral programs for this club.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {programs.map((program) => (
          <Card key={program.id} className="border-border/50" data-testid={`card-referral-${program.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-base" data-testid={`text-referral-name-${program.id}`}>
                {program.name}
              </CardTitle>
              <Badge
                variant={program.isActive ? "default" : "secondary"}
                className={program.isActive ? "bg-green-600 text-white no-default-hover-elevate" : "no-default-hover-elevate"}
                data-testid={`badge-referral-status-${program.id}`}
              >
                {program.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {program.description && (
                <p className="text-muted-foreground" data-testid={`text-referral-desc-${program.id}`}>
                  {program.description}
                </p>
              )}
              <div className="flex items-center justify-between gap-2" data-testid={`text-referrer-reward-${program.id}`}>
                <span className="text-muted-foreground">Referrer Reward</span>
                <span className="font-medium">{formatGBP(program.referrerReward)}</span>
              </div>
              <div className="flex items-center justify-between gap-2" data-testid={`text-referee-reward-${program.id}`}>
                <span className="text-muted-foreground">Referee Reward</span>
                <span className="font-medium">{formatGBP(program.refereeReward)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ClubRewardsPage() {
  const { data: user } = useUser();
  const { data: myAdminClubs } = useMyAdminClubs(!!user);
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  const clubs = myAdminClubs || [];
  const effectiveClubId = selectedClubId ? Number(selectedClubId) : (clubs.length > 0 ? clubs[0].id : null);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Club Rewards</h1>
          <p className="text-sm text-muted-foreground">Manage anniversary, attendance, referral, points and badge rewards</p>
        </div>
        {clubs.length > 1 && (
          <Select value={selectedClubId || String(effectiveClubId)} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-56" data-testid="select-club-filter">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={String(club.id)} data-testid={`select-club-option-${club.id}`}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!effectiveClubId ? (
        <Card data-testid="card-no-clubs">
          <CardContent className="py-8 text-center text-muted-foreground">
            No clubs found. You need admin access to a club to manage rewards.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="anniversary" data-testid="tabs-rewards">
          <TabsList className="grid w-full grid-cols-5" data-testid="tabs-list">
            <TabsTrigger value="anniversary" data-testid="tab-anniversary" className="text-xs px-1">
              <PartyPopper className="h-3.5 w-3.5 mr-1" />
              Anniversary
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance" className="text-xs px-1">
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals" className="text-xs px-1">
              <Users className="h-3.5 w-3.5 mr-1" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="points" data-testid="tab-points" className="text-xs px-1">
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Points
            </TabsTrigger>
            <TabsTrigger value="grades" data-testid="tab-badges" className="text-xs px-1">
              <Award className="h-3.5 w-3.5 mr-1" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anniversary" className="mt-4" data-testid="tab-content-anniversary">
            <AnniversaryRewardsTab clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-4" data-testid="tab-content-attendance">
            <AttendanceRewardsPanel clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="referrals" className="mt-4" data-testid="tab-content-referrals">
            <ReferralProgramsTab clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="points" className="mt-4" data-testid="tab-content-points">
            <PointsRewardsPanel clubId={effectiveClubId} />
          </TabsContent>

          <TabsContent value="grades" className="mt-4" data-testid="tab-content-grades">
            <GradeRewardsPanel clubId={effectiveClubId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default ClubRewardsPage;

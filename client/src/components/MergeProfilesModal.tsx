import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search, ArrowRight, ArrowLeft, Check, AlertTriangle, Merge, User, Mail, Trophy, Star, Shield, History } from "lucide-react";

interface MergeProfilesModalProps {
  open: boolean;
  onClose: () => void;
  clubId?: number;
  preselectedProfileId?: number;
}

interface ProfileData {
  profileId: number;
  userId: number;
  fullName: string;
  email: string;
  gender: string | null;
  category: string | null;
  grade: string | null;
  clubRole: string;
  membershipStatus: string;
  playerStatus: string;
  matchesPlayed: number;
  matchesWon: number;
  rankingPoints: number;
  profilePictureUrl: string | null;
  accountStatus: string;
  memberships: any[];
}

interface PreviewData {
  primary: ProfileData;
  secondary: ProfileData;
  counts: {
    sessionsToReassign: number;
    matchesToReassign: number;
    creditEntriesToReassign: number;
    tournamentsToReassign: number;
    duplicateSignupsToRemove: number;
  };
  clubName: string;
  sameUser: boolean;
}

type Step = "search" | "compare" | "choose" | "preview" | "confirm";

export function MergeProfilesModal({ open, onClose, clubId, preselectedProfileId }: MergeProfilesModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("search");
  const [selectedClubId, setSelectedClubId] = useState<number | undefined>(clubId);
  const [searchPrimary, setSearchPrimary] = useState("");
  const [searchSecondary, setSearchSecondary] = useState("");
  const [primaryProfileId, setPrimaryProfileId] = useState<number | null>(preselectedProfileId || null);
  const [secondaryProfileId, setSecondaryProfileId] = useState<number | null>(null);
  const [keepUserId, setKeepUserId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (open) {
      setStep("search");
      setPrimaryProfileId(preselectedProfileId || null);
      setSecondaryProfileId(null);
      setKeepUserId(null);
      setPreview(null);
      setSearchPrimary("");
      setSearchSecondary("");
      if (clubId) setSelectedClubId(clubId);
    }
  }, [open, preselectedProfileId, clubId]);

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
    enabled: open && !clubId,
  });

  const { data: clubMembers, isLoading: membersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/club-players", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId) return [];
      const res = await apiRequest("GET", `/api/admin/clubs/${selectedClubId}/players`);
      return res.json();
    },
    enabled: open && !!selectedClubId,
  });

  const previewMutation = useMutation({
    mutationFn: async (data: { primaryProfileId: number; secondaryProfileId: number }) => {
      const res = await apiRequest("POST", "/api/admin/merge-profiles/preview", data);
      return res.json();
    },
    onSuccess: (data: PreviewData) => {
      setPreview(data);
      setKeepUserId(data.primary.userId);
      setStep("compare");
    },
    onError: (err: any) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (data: { primaryProfileId: number; secondaryProfileId: number; keepUserId: number }) => {
      const res = await apiRequest("POST", "/api/admin/merge-profiles/execute", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Profiles merged", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merge-logs"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Merge failed", description: err.message, variant: "destructive" });
    },
  });

  const filteredForPrimary = (clubMembers || []).filter((m: any) => {
    const name = (m.user?.fullName || m.fullName || "").toLowerCase();
    const email = (m.user?.email || m.email || "").toLowerCase();
    return (name.includes(searchPrimary.toLowerCase()) || email.includes(searchPrimary.toLowerCase()));
  });

  const filteredForSecondary = (clubMembers || []).filter((m: any) => {
    const id = m.id || m.profileId;
    if (id === primaryProfileId) return false;
    const name = (m.user?.fullName || m.fullName || "").toLowerCase();
    const email = (m.user?.email || m.email || "").toLowerCase();
    return (name.includes(searchSecondary.toLowerCase()) || email.includes(searchSecondary.toLowerCase()));
  });

  const handleNext = () => {
    if (step === "search") {
      if (!primaryProfileId || !secondaryProfileId) {
        toast({ title: "Select both profiles", description: "Please select a primary and secondary profile to merge.", variant: "destructive" });
        return;
      }
      previewMutation.mutate({ primaryProfileId, secondaryProfileId });
    } else if (step === "compare") {
      setStep("choose");
    } else if (step === "choose") {
      setStep("preview");
    } else if (step === "preview") {
      setStep("confirm");
    } else if (step === "confirm") {
      if (!primaryProfileId || !secondaryProfileId || !keepUserId) return;
      executeMutation.mutate({ primaryProfileId, secondaryProfileId, keepUserId });
    }
  };

  const handleBack = () => {
    if (step === "compare") setStep("search");
    else if (step === "choose") setStep("compare");
    else if (step === "preview") setStep("choose");
    else if (step === "confirm") setStep("preview");
  };

  const stepLabels: Record<Step, string> = {
    search: "Select Profiles",
    compare: "Compare",
    choose: "Choose Primary",
    preview: "Preview Changes",
    confirm: "Confirm Merge",
  };

  const stepOrder: Step[] = ["search", "compare", "choose", "preview", "confirm"];
  const currentIndex = stepOrder.indexOf(step);

  const renderProfileCard = (profile: ProfileData, label: string, highlight?: boolean) => (
    <Card className={highlight ? "border-2 border-primary" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={label === "Primary" ? "default" : "secondary"}>{label}</Badge>
          <span className="font-medium text-sm" data-testid={`text-merge-${label.toLowerCase()}-name`}>{profile.fullName}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <span className="truncate">{profile.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span>{profile.clubRole}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-muted-foreground" />
            <span>Grade: {profile.grade || profile.category || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-muted-foreground" />
            <span>{profile.matchesWon}W / {profile.matchesPlayed - profile.matchesWon}L</span>
          </div>
          <div>Status: {profile.membershipStatus}</div>
          <div>Points: {profile.rankingPoints}</div>
          {profile.gender && <div>Gender: {profile.gender}</div>}
          <div>Account: {profile.accountStatus}</div>
        </div>
        {profile.memberships?.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Memberships: {profile.memberships.length}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-merge-modal-title">
            <Merge className="w-5 h-5" />
            Merge Player Profiles
          </DialogTitle>
          <DialogDescription>
            Merge two player profiles within the same club. All data from the secondary profile will be transferred to the primary.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {stepOrder.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <Badge
                variant={i <= currentIndex ? "default" : "outline"}
                className="text-xs"
              >
                {i + 1}. {stepLabels[s]}
              </Badge>
              {i < stepOrder.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === "search" && (
          <div className="space-y-4">
            {!clubId && (
              <div>
                <Label>Select Club</Label>
                <Select
                  value={selectedClubId?.toString() || ""}
                  onValueChange={(v) => {
                    setSelectedClubId(parseInt(v));
                    setPrimaryProfileId(null);
                    setSecondaryProfileId(null);
                  }}
                >
                  <SelectTrigger data-testid="select-merge-club">
                    <SelectValue placeholder="Choose a club..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(clubs || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedClubId && (
              <>
                <div>
                  <Label className="mb-1 block">Primary Profile (will be kept)</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchPrimary}
                      onChange={(e) => setSearchPrimary(e.target.value)}
                      className="pl-8"
                      data-testid="input-merge-search-primary"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {membersLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : filteredForPrimary.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No members found</p>
                    ) : (
                      filteredForPrimary.map((m: any) => {
                        const id = m.id || m.profileId;
                        const name = m.user?.fullName || m.fullName || "Unknown";
                        const email = m.user?.email || m.email || "";
                        return (
                          <button
                            key={id}
                            onClick={() => setPrimaryProfileId(id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between hover-elevate ${primaryProfileId === id ? "bg-primary/10 border border-primary" : ""}`}
                            data-testid={`button-merge-select-primary-${id}`}
                          >
                            <span>{name} <span className="text-muted-foreground text-xs">({email})</span></span>
                            {primaryProfileId === id && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Secondary Profile (will be absorbed)</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchSecondary}
                      onChange={(e) => setSearchSecondary(e.target.value)}
                      className="pl-8"
                      data-testid="input-merge-search-secondary"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {membersLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : filteredForSecondary.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No members found</p>
                    ) : (
                      filteredForSecondary.map((m: any) => {
                        const id = m.id || m.profileId;
                        const name = m.user?.fullName || m.fullName || "Unknown";
                        const email = m.user?.email || m.email || "";
                        return (
                          <button
                            key={id}
                            onClick={() => setSecondaryProfileId(id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between hover-elevate ${secondaryProfileId === id ? "bg-destructive/10 border border-destructive" : ""}`}
                            data-testid={`button-merge-select-secondary-${id}`}
                          >
                            <span>{name} <span className="text-muted-foreground text-xs">({email})</span></span>
                            {secondaryProfileId === id && <Check className="w-4 h-4 text-destructive" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === "compare" && preview && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compare both profiles in <strong>{preview.clubName}</strong>. The secondary profile will be absorbed into the primary.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderProfileCard(preview.primary, "Primary", true)}
              {renderProfileCard(preview.secondary, "Secondary")}
            </div>
            {preview.sameUser && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs">Both profiles belong to the same user account. Only the profile records will be merged.</p>
              </div>
            )}
          </div>
        )}

        {step === "choose" && preview && (
          <div className="space-y-4">
            {!preview.sameUser ? (
              <>
                <p className="text-sm text-muted-foreground">
                  The profiles have different user accounts. Which account should be kept as the login for the merged profile?
                </p>
                <RadioGroup
                  value={keepUserId?.toString() || ""}
                  onValueChange={(v) => setKeepUserId(parseInt(v))}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3 border rounded-md p-3 hover-elevate">
                    <RadioGroupItem value={preview.primary.userId.toString()} id="keep-primary" />
                    <Label htmlFor="keep-primary" className="cursor-pointer space-y-1">
                      <div className="font-medium">{preview.primary.fullName}</div>
                      <div className="text-xs text-muted-foreground">{preview.primary.email}</div>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 border rounded-md p-3 hover-elevate">
                    <RadioGroupItem value={preview.secondary.userId.toString()} id="keep-secondary" />
                    <Label htmlFor="keep-secondary" className="cursor-pointer space-y-1">
                      <div className="font-medium">{preview.secondary.fullName}</div>
                      <div className="text-xs text-muted-foreground">{preview.secondary.email}</div>
                    </Label>
                  </div>
                </RadioGroup>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Both profiles share the same user account ({preview.primary.email}). No account choice is needed.
              </div>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <p className="text-sm font-medium">What will happen when you merge:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span>Session signups to reassign</span>
                <Badge variant="secondary" data-testid="text-merge-sessions-count">{preview.counts.sessionsToReassign}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span>Matches to reassign</span>
                <Badge variant="secondary" data-testid="text-merge-matches-count">{preview.counts.matchesToReassign}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span>Credit entries to reassign</span>
                <Badge variant="secondary">{preview.counts.creditEntriesToReassign}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span>Tournament entries to reassign</span>
                <Badge variant="secondary">{preview.counts.tournamentsToReassign}</Badge>
              </div>
              {preview.counts.duplicateSignupsToRemove > 0 && (
                <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-md">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    Duplicate signups to remove
                  </span>
                  <Badge variant="secondary">{preview.counts.duplicateSignupsToRemove}</Badge>
                </div>
              )}
            </div>
            <div className="border rounded-md p-3 space-y-1 text-xs">
              <p><strong>Primary profile</strong>: {preview.primary.fullName} (ID: {preview.primary.profileId})</p>
              <p><strong>Secondary profile</strong>: {preview.secondary.fullName} (ID: {preview.secondary.profileId}) &mdash; will be soft-deleted</p>
              <p><strong>Kept account</strong>: {keepUserId === preview.primary.userId ? preview.primary.email : preview.secondary.email}</p>
              <p><strong>Stats</strong>: Will be recalculated from match history</p>
              <p><strong>Ranking points</strong>: Combined ({preview.primary.rankingPoints} + {preview.secondary.rankingPoints})</p>
            </div>
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-md p-4">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium">This action cannot be undone.</p>
                <p className="text-xs text-muted-foreground">
                  "{preview.secondary.fullName}" will be permanently absorbed into "{preview.primary.fullName}".
                  All match history, session signups, credits, and tournament data will be transferred.
                  A full audit log will be created.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2 flex-wrap">
          {step !== "search" && (
            <Button variant="outline" onClick={handleBack} disabled={executeMutation.isPending} data-testid="button-merge-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={executeMutation.isPending} data-testid="button-merge-cancel">
            Cancel
          </Button>
          {step === "confirm" ? (
            <Button
              variant="destructive"
              onClick={handleNext}
              disabled={executeMutation.isPending}
              data-testid="button-merge-execute"
            >
              {executeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Merging...</>
              ) : (
                <><Merge className="w-4 h-4 mr-1" /> Confirm Merge</>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={previewMutation.isPending || (step === "search" && (!primaryProfileId || !secondaryProfileId))}
              data-testid="button-merge-next"
            >
              {previewMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Loading...</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MergeLogsPanel() {
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/merge-logs"],
  });

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No merge history yet.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log: any) => {
        const details = log.mergeDetails || {};
        return (
          <Card key={log.id}>
            <CardContent className="p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{details.primaryUserName || `Profile #${log.primaryProfileId}`}</span>
                <ArrowLeft className="w-3 h-3" />
                <span className="text-muted-foreground">{details.secondaryUserName || `Profile #${log.secondaryProfileId}`}</span>
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                <span>Club: {details.clubName || "Unknown"}</span>
                <span>By: {log.mergedByName || `User #${log.mergedByUserId}`}</span>
                <span>Sessions: {details.sessionsReassigned || 0}</span>
                <span>Matches: {details.matchesReassigned || 0}</span>
                <span>Credits: {details.creditEntriesReassigned || 0}</span>
                <span>Duplicates removed: {details.duplicateSignupsRemoved || 0}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
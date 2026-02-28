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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search, ArrowRight, ArrowLeft, Check, AlertTriangle, Merge, User, Mail, Trophy, Star, Shield, Building2, CreditCard, Calendar, Globe, Phone, MapPin, KeyRound } from "lucide-react";

interface GlobalMergeModalProps {
  open: boolean;
  onClose: () => void;
}

interface UserResult {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  nickname: string | null;
  dateOfBirth: string | null;
  role: string;
  accountStatus: string;
  profilePictureUrl: string | null;
  createdAt: string;
  profiles: ProfileInfo[];
  totalMatches: number;
  totalWins: number;
  totalCredits: number;
  clubCount: number;
}

interface ProfileInfo {
  profileId: number;
  clubId: number;
  clubName: string;
  grade: string | null;
  gender: string | null;
  category: string | null;
  clubRole: string;
  membershipStatus: string;
  playerStatus: string;
  matchesPlayed: number;
  matchesWon: number;
  rankingPoints: number;
  credits: number;
  sessions?: number;
  matches?: number;
}

interface PreviewData {
  keepUser: UserResult & { profiles: ProfileInfo[] };
  removeUser: UserResult & { profiles: ProfileInfo[] };
  transferCounts: {
    sessions: number;
    matches: number;
    creditEntries: number;
    memberships: number;
    messages: number;
    donations: number;
    tickets: number;
  };
  recommendation: "keep" | "remove";
  overlappingClubs: { clubId: number; keepProfileId: number; removeProfileId: number }[];
  uniqueToRemove: { clubId: number; profileId: number }[];
}

interface FieldSelection {
  email: "keep" | "remove";
  password: "keep" | "remove";
  phone: "keep" | "remove";
  nickname: "keep" | "remove";
  city: "keep" | "remove";
  country: "keep" | "remove";
}

type Step = "search" | "compare" | "choose" | "preview" | "confirm";

function formatPounds(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function GlobalMergeModal({ open, onClose }: GlobalMergeModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("search");
  const [searchKeep, setSearchKeep] = useState("");
  const [searchRemove, setSearchRemove] = useState("");
  const [keepUserId, setKeepUserId] = useState<number | null>(null);
  const [removeUserId, setRemoveUserId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmedKeepId, setConfirmedKeepId] = useState<number | null>(null);
  const [fieldSelections, setFieldSelections] = useState<FieldSelection>({
    email: "keep",
    password: "keep",
    phone: "keep",
    nickname: "keep",
    city: "keep",
    country: "keep",
  });

  useEffect(() => {
    if (open) {
      setStep("search");
      setKeepUserId(null);
      setRemoveUserId(null);
      setPreview(null);
      setSearchKeep("");
      setSearchRemove("");
      setConfirmedKeepId(null);
      setFieldSelections({ email: "keep", password: "keep", phone: "keep", nickname: "keep", city: "keep", country: "keep" });
    }
  }, [open]);

  const { data: keepResults, isLoading: keepLoading } = useQuery<UserResult[]>({
    queryKey: ["/api/admin/global-users/search", searchKeep],
    queryFn: async () => {
      if (searchKeep.length < 2) return [];
      const res = await apiRequest("GET", `/api/admin/global-users/search?q=${encodeURIComponent(searchKeep)}`);
      return res.json();
    },
    enabled: open && searchKeep.length >= 2,
  });

  const { data: removeResults, isLoading: removeLoading } = useQuery<UserResult[]>({
    queryKey: ["/api/admin/global-users/search", searchRemove],
    queryFn: async () => {
      if (searchRemove.length < 2) return [];
      const res = await apiRequest("GET", `/api/admin/global-users/search?q=${encodeURIComponent(searchRemove)}`);
      return res.json();
    },
    enabled: open && searchRemove.length >= 2,
  });

  const previewMutation = useMutation({
    mutationFn: async (data: { keepUserId: number; removeUserId: number }) => {
      const res = await apiRequest("POST", "/api/admin/global-merge/preview", data);
      return res.json();
    },
    onSuccess: (data: PreviewData) => {
      setPreview(data);
      setConfirmedKeepId(data.recommendation === "keep" ? data.keepUser.id : data.removeUser.id);
      setFieldSelections({ email: "keep", password: "keep", phone: "keep", nickname: "keep", city: "keep", country: "keep" });
      setStep("compare");
    },
    onError: (err: any) => {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (data: { keepUserId: number; removeUserId: number; keepEmail?: string; keepPasswordFromUserId?: number; keepPhone?: string; keepNickname?: string; keepCity?: string; keepCountry?: string }) => {
      const res = await apiRequest("POST", "/api/admin/global-merge/execute", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Accounts merged", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-users/search"] });
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

  const filteredKeep = (keepResults || []).filter((u) => u.id !== removeUserId);
  const filteredRemove = (removeResults || []).filter((u) => u.id !== keepUserId);

  const getFinalKeep = () => preview && confirmedKeepId === preview.keepUser.id ? preview.keepUser : preview?.removeUser;
  const getFinalRemove = () => preview && confirmedKeepId === preview.keepUser.id ? preview.removeUser : preview?.keepUser;

  const handleNext = () => {
    if (step === "search") {
      if (!keepUserId || !removeUserId) {
        toast({ title: "Select both accounts", description: "Please select two accounts to merge.", variant: "destructive" });
        return;
      }
      previewMutation.mutate({ keepUserId, removeUserId });
    } else if (step === "compare") {
      setStep("choose");
    } else if (step === "choose") {
      if (!confirmedKeepId) {
        toast({ title: "Select which account to keep", variant: "destructive" });
        return;
      }
      setStep("preview");
    } else if (step === "preview") {
      setStep("confirm");
    } else if (step === "confirm") {
      if (!confirmedKeepId || !preview) return;
      const finalKeep = confirmedKeepId;
      const finalRemove = confirmedKeepId === preview.keepUser.id ? preview.removeUser.id : preview.keepUser.id;
      const keepU = getFinalKeep();
      const removeU = getFinalRemove();

      const payload: any = { keepUserId: finalKeep, removeUserId: finalRemove };
      if (fieldSelections.email === "remove" && removeU) {
        payload.keepEmail = removeU.email;
      }
      if (fieldSelections.password === "remove") {
        payload.keepPasswordFromUserId = finalRemove;
      }
      if (fieldSelections.phone === "remove") {
        payload.keepPhone = "remove";
      }
      if (fieldSelections.nickname === "remove") {
        payload.keepNickname = "remove";
      }
      if (fieldSelections.city === "remove") {
        payload.keepCity = "remove";
      }
      if (fieldSelections.country === "remove") {
        payload.keepCountry = "remove";
      }
      executeMutation.mutate(payload);
    }
  };

  const handleBack = () => {
    if (step === "compare") setStep("search");
    else if (step === "choose") setStep("compare");
    else if (step === "preview") setStep("choose");
    else if (step === "confirm") setStep("preview");
  };

  const stepLabels: Record<Step, string> = {
    search: "Select Accounts",
    compare: "Compare",
    choose: "Choose Details to Keep",
    preview: "Preview Changes",
    confirm: "Confirm Merge",
  };
  const stepOrder: Step[] = ["search", "compare", "choose", "preview", "confirm"];
  const currentIndex = stepOrder.indexOf(step);

  const renderUserSearchCard = (user: UserResult, isSelected: boolean, variant: "keep" | "remove") => (
    <button
      key={user.id}
      onClick={() => variant === "keep" ? setKeepUserId(user.id) : setRemoveUserId(user.id)}
      className={`w-full text-left px-3 py-2 rounded-md text-sm hover-elevate ${
        isSelected
          ? variant === "keep" ? "bg-primary/10 border border-primary" : "bg-destructive/10 border border-destructive"
          : "border border-transparent"
      }`}
      data-testid={`button-global-merge-select-${variant}-${user.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{user.fullName}</span>
            {user.role === "OWNER" && <Badge variant="default" className="text-[10px] px-1">OWNER</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {user.clubCount} club{user.clubCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {user.totalMatches} matches
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              £{formatPounds(user.totalCredits)}
            </span>
          </div>
          {user.profiles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {user.profiles.map((p) => (
                <Badge key={p.profileId} variant="outline" className="text-[10px] px-1">
                  {p.clubName} ({p.grade || "N/A"})
                </Badge>
              ))}
            </div>
          )}
        </div>
        {isSelected && <Check className={`w-4 h-4 shrink-0 ${variant === "keep" ? "text-primary" : "text-destructive"}`} />}
      </div>
    </button>
  );

  const renderUserDetailCard = (user: any, label: string, isRecommended: boolean) => (
    <Card className={isRecommended ? "border-2 border-primary" : ""}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={label === "Account A" ? "default" : "secondary"}>{label}</Badge>
          {isRecommended && <Badge className="bg-green-600 text-white text-[10px]">Recommended to keep</Badge>}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm" data-testid={`text-global-merge-${label.toLowerCase().replace(" ", "-")}-name`}>{user.fullName}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <span>{user.role}</span>
            </div>
            {user.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{user.phone}</div>}
            {user.nickname && <div>Nickname: {user.nickname}</div>}
            {user.city && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{user.city}</div>}
            {user.country && <div>Country: {user.country}</div>}
            {user.dateOfBirth && <div>DOB: {new Date(user.dateOfBirth).toLocaleDateString()}</div>}
            <div>Status: {user.accountStatus}</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              Joined: {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Club Profiles ({user.profiles.length})</p>
          {user.profiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">No club profiles</p>
          ) : (
            user.profiles.map((p: ProfileInfo) => (
              <div key={p.profileId} className="bg-muted/50 rounded-md p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {p.clubName}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{p.clubRole}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                  <span>Grade: {p.grade || "N/A"}</span>
                  <span>Status: {p.membershipStatus}</span>
                  <span>Gender: {p.gender || "N/A"}</span>
                  <span className="flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5" />
                    {p.matchesWon}W/{(p.matchesPlayed || 0) - (p.matchesWon || 0)}L
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" />
                    {p.rankingPoints} pts
                  </span>
                  <span className="flex items-center gap-0.5">
                    <CreditCard className="w-2.5 h-2.5" />
                    £{formatPounds(p.credits)}
                  </span>
                  {p.sessions !== undefined && <span>Sessions: {p.sessions}</span>}
                  {p.matches !== undefined && <span>Matches: {p.matches}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between text-xs border-t pt-2">
          <span className="text-muted-foreground">Totals:</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3" /> {user.totalMatches} matches
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> £{formatPounds(user.totalCredits)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFieldSelector = (
    fieldKey: keyof FieldSelection,
    label: string,
    icon: any,
    keepValue: string | null,
    removeValue: string | null
  ) => {
    const Icon = icon;
    const keepDisplay = keepValue || "N/A";
    const removeDisplay = removeValue || "N/A";
    const bothSame = keepValue === removeValue;
    const keepUser = getFinalKeep();
    const removeUser = getFinalRemove();

    return (
      <div className="border rounded-md p-3 space-y-2" data-testid={`field-selector-${fieldKey}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          {bothSame && <Badge variant="outline" className="text-[10px]">Same</Badge>}
        </div>
        <RadioGroup
          value={fieldSelections[fieldKey]}
          onValueChange={(v) => setFieldSelections(prev => ({ ...prev, [fieldKey]: v as "keep" | "remove" }))}
          className="space-y-1"
        >
          <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${fieldSelections[fieldKey] === "keep" ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
            <RadioGroupItem value="keep" id={`field-${fieldKey}-keep`} data-testid={`radio-field-${fieldKey}-keep`} />
            <Label htmlFor={`field-${fieldKey}-keep`} className="cursor-pointer flex-1 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{keepDisplay}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{keepUser?.fullName}</Badge>
            </Label>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${fieldSelections[fieldKey] === "remove" ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
            <RadioGroupItem value="remove" id={`field-${fieldKey}-remove`} data-testid={`radio-field-${fieldKey}-remove`} />
            <Label htmlFor={`field-${fieldKey}-remove`} className="cursor-pointer flex-1 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{removeDisplay}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{removeUser?.fullName}</Badge>
            </Label>
          </div>
        </RadioGroup>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-global-merge-title">
            <Globe className="w-5 h-5" />
            Global Account Merge
          </DialogTitle>
          <DialogDescription className="text-sm break-words">
            Merge two user accounts across all clubs. All data from the removed account will be transferred to the kept account.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center justify-between gap-1">
            {stepOrder.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= currentIndex
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="hidden sm:inline text-xs text-muted-foreground truncate">{stepLabels[s]}</span>
                </div>
                {i < stepOrder.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="sm:hidden text-xs text-muted-foreground mt-1.5 text-center font-medium">
            Step {currentIndex + 1}: {stepLabels[step]}
          </p>
        </div>

        {step === "search" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Account A (initial selection)</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email (min 2 chars)..."
                  value={searchKeep}
                  onChange={(e) => setSearchKeep(e.target.value)}
                  className="pl-8"
                  data-testid="input-global-merge-search-keep"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {keepLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : searchKeep.length < 2 ? (
                  <p className="text-xs text-muted-foreground p-2">Type at least 2 characters to search</p>
                ) : filteredKeep.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No users found</p>
                ) : (
                  filteredKeep.map((u) => renderUserSearchCard(u, keepUserId === u.id, "keep"))
                )}
              </div>
            </div>

            <div>
              <Label className="mb-1 block">Account B (to compare)</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email (min 2 chars)..."
                  value={searchRemove}
                  onChange={(e) => setSearchRemove(e.target.value)}
                  className="pl-8"
                  data-testid="input-global-merge-search-remove"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {removeLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : searchRemove.length < 2 ? (
                  <p className="text-xs text-muted-foreground p-2">Type at least 2 characters to search</p>
                ) : filteredRemove.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No users found</p>
                ) : (
                  filteredRemove.map((u) => renderUserSearchCard(u, removeUserId === u.id, "remove"))
                )}
              </div>
            </div>
          </div>
        )}

        {step === "compare" && preview && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compare both accounts across all clubs. The system recommends keeping the account with more match history and credits.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderUserDetailCard(preview.keepUser, "Account A", preview.recommendation === "keep")}
              {renderUserDetailCard(preview.removeUser, "Account B", preview.recommendation === "remove")}
            </div>

            {preview.overlappingClubs.length > 0 && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Overlapping club profiles detected</p>
                  <p className="text-xs text-muted-foreground">
                    Both accounts have profiles in {preview.overlappingClubs.length} club(s). These will be merged (match history, sessions, credits combined into the kept profile).
                  </p>
                </div>
              </div>
            )}

            {preview.uniqueToRemove.length > 0 && (
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
                <Building2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {preview.uniqueToRemove.length} club profile(s) will be transferred to the kept account (no overlap).
                </p>
              </div>
            )}
          </div>
        )}

        {step === "choose" && preview && (() => {
          const keepUser = getFinalKeep();
          const removeUser = getFinalRemove();
          if (!keepUser || !removeUser) return null;
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose which account to keep, then select which details (email, password, etc.) to use for the final merged account.
              </p>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Which account to keep?</Label>
                <RadioGroup
                  value={confirmedKeepId?.toString() || ""}
                  onValueChange={(v) => {
                    setConfirmedKeepId(parseInt(v));
                    setFieldSelections({ email: "keep", password: "keep", phone: "keep", nickname: "keep", city: "keep", country: "keep" });
                  }}
                  className="space-y-2"
                >
                  {[preview.keepUser, preview.removeUser].map((user, idx) => {
                    const isRecommended = (idx === 0 && preview.recommendation === "keep") || (idx === 1 && preview.recommendation === "remove");
                    return (
                      <div key={user.id} className={`flex items-center gap-3 border rounded-md p-3 hover-elevate ${confirmedKeepId === user.id ? "border-primary bg-primary/5" : ""}`}>
                        <RadioGroupItem value={user.id.toString()} id={`keep-global-${user.id}`} data-testid={`radio-global-merge-keep-${user.id}`} />
                        <Label htmlFor={`keep-global-${user.id}`} className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">({user.email})</span>
                            {isRecommended && <Badge className="bg-green-600 text-white text-[10px]">Recommended</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{user.profiles.length} club(s)</span>
                            <span>{user.totalMatches} matches</span>
                            <span>£{formatPounds(user.totalCredits)}</span>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {confirmedKeepId && (() => {
                  const removeCandidate = confirmedKeepId === preview.keepUser.id ? preview.removeUser : preview.keepUser;
                  if (removeCandidate.role === "OWNER") {
                    return (
                      <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-md p-3">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-xs text-destructive">
                          Warning: {removeCandidate.fullName} has the OWNER (super admin) role. You cannot remove an OWNER account. Please select this account to keep, or change their role first.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {confirmedKeepId && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium">Choose which details to keep</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For each field below, select which account's value to use for the merged account.
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {renderFieldSelector("email", "Email Address", Mail, keepUser?.email || null, removeUser?.email || null)}
                    {renderFieldSelector("password", "Password", KeyRound, keepUser ? "(from " + keepUser.fullName + ")" : null, removeUser ? "(from " + removeUser.fullName + ")" : null)}
                    {renderFieldSelector("phone", "Phone", Phone, keepUser?.phone || null, removeUser?.phone || null)}
                    {renderFieldSelector("nickname", "Nickname", User, keepUser?.nickname || null, removeUser?.nickname || null)}
                    {renderFieldSelector("city", "City", MapPin, keepUser?.city || null, removeUser?.city || null)}
                    {renderFieldSelector("country", "Country", Globe, keepUser?.country || null, removeUser?.country || null)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Keeping: {getFinalKeep()?.fullName} ({getFinalKeep()?.email})</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium">Removing: {getFinalRemove()?.fullName} ({getFinalRemove()?.email})</span>
            </div>

            {(fieldSelections.email === "remove" || fieldSelections.password === "remove" || fieldSelections.phone === "remove" || fieldSelections.nickname === "remove" || fieldSelections.city === "remove" || fieldSelections.country === "remove") && (
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-primary">Details overrides from removed account:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {fieldSelections.email === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <Mail className="w-3 h-3" /> Email: {getFinalRemove()?.email}
                    </div>
                  )}
                  {fieldSelections.password === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <KeyRound className="w-3 h-3" /> Password from: {getFinalRemove()?.fullName}
                    </div>
                  )}
                  {fieldSelections.phone === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <Phone className="w-3 h-3" /> Phone: {getFinalRemove()?.phone || "N/A"}
                    </div>
                  )}
                  {fieldSelections.nickname === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <User className="w-3 h-3" /> Nickname: {getFinalRemove()?.nickname || "N/A"}
                    </div>
                  )}
                  {fieldSelections.city === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <MapPin className="w-3 h-3" /> City: {getFinalRemove()?.city || "N/A"}
                    </div>
                  )}
                  {fieldSelections.country === "remove" && (
                    <div className="flex items-center gap-1 bg-primary/5 rounded p-1.5">
                      <Globe className="w-3 h-3" /> Country: {getFinalRemove()?.country || "N/A"}
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm font-medium">Data to be transferred:</p>
            <div className="space-y-2 text-sm">
              {[
                { label: "Session signups", count: preview.transferCounts.sessions },
                { label: "Match records", count: preview.transferCounts.matches },
                { label: "Credit entries", count: `£${formatPounds(preview.transferCounts.creditEntries)}` },
                { label: "Club memberships", count: preview.transferCounts.memberships },
                { label: "Messages", count: preview.transferCounts.messages },
                { label: "Donations", count: preview.transferCounts.donations },
                { label: "Support tickets", count: preview.transferCounts.tickets },
              ].map(({ label, count }) => (
                <div key={label} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <span>{label}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>

            {preview.overlappingClubs.length > 0 && (
              <div className="border rounded-md p-3 space-y-1 text-xs">
                <p className="font-medium">Club profile merges ({preview.overlappingClubs.length}):</p>
                {preview.overlappingClubs.map((oc) => {
                  const keepP = (getFinalKeep() as any)?.profiles?.find((p: ProfileInfo) => p.clubId === oc.clubId);
                  const removeP = (getFinalRemove() as any)?.profiles?.find((p: ProfileInfo) => p.clubId === oc.clubId);
                  return (
                    <div key={oc.clubId} className="bg-muted/30 rounded p-2">
                      <span className="font-medium">{keepP?.clubName || removeP?.clubName || `Club #${oc.clubId}`}</span>
                      <div className="grid grid-cols-2 gap-1 mt-1 text-muted-foreground">
                        <span>Keep: {keepP?.matchesPlayed || 0} matches, £{formatPounds(keepP?.credits || 0)}</span>
                        <span>Absorb: {removeP?.matchesPlayed || 0} matches, £{formatPounds(removeP?.credits || 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {preview.uniqueToRemove.length > 0 && (
              <div className="border rounded-md p-3 text-xs">
                <p className="font-medium">Profiles to transfer (no overlap): {preview.uniqueToRemove.length}</p>
                <p className="text-muted-foreground">These club profiles will be reassigned to the kept account.</p>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-md p-4">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium">This action cannot be undone.</p>
                <p className="text-xs text-muted-foreground">
                  "{getFinalRemove()?.fullName}" ({getFinalRemove()?.email}) will be permanently absorbed into
                  "{getFinalKeep()?.fullName}" ({getFinalKeep()?.email}).
                </p>
                <p className="text-xs text-muted-foreground">
                  All match history, session signups, credits, memberships, messages, donations, and tickets will be transferred.
                  The removed account will be deactivated. A full audit log will be created.
                </p>
                {(fieldSelections.email === "remove" || fieldSelections.password === "remove") && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <p className="font-medium mb-1">Custom field overrides:</p>
                    {fieldSelections.email === "remove" && <p>Email will be changed to: {getFinalRemove()?.email}</p>}
                    {fieldSelections.password === "remove" && <p>Password will be taken from: {getFinalRemove()?.fullName}</p>}
                    {fieldSelections.phone === "remove" && <p>Phone will be: {getFinalRemove()?.phone || "N/A"}</p>}
                    {fieldSelections.nickname === "remove" && <p>Nickname will be: {getFinalRemove()?.nickname || "N/A"}</p>}
                    {fieldSelections.city === "remove" && <p>City will be: {getFinalRemove()?.city || "N/A"}</p>}
                    {fieldSelections.country === "remove" && <p>Country will be: {getFinalRemove()?.country || "N/A"}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2 flex-wrap">
          {step !== "search" && (
            <Button variant="outline" onClick={handleBack} disabled={executeMutation.isPending} data-testid="button-global-merge-back">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={executeMutation.isPending} data-testid="button-global-merge-cancel">
            Cancel
          </Button>
          {step === "confirm" ? (
            <Button
              variant="destructive"
              onClick={handleNext}
              disabled={executeMutation.isPending}
              data-testid="button-global-merge-execute"
            >
              {executeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Merging...</>
              ) : (
                <><Merge className="w-4 h-4 mr-1" /> Confirm Global Merge</>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={
                previewMutation.isPending ||
                (step === "search" && (!keepUserId || !removeUserId)) ||
                (step === "choose" && (!confirmedKeepId || (preview && (() => {
                  const removeCandidate = confirmedKeepId === preview.keepUser.id ? preview.removeUser : preview.keepUser;
                  return removeCandidate.role === "OWNER";
                })())))
              }
              data-testid="button-global-merge-next"
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
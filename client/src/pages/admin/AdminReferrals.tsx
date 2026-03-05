import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import {
  Gift, Check, X, Clock, UserPlus, TrendingUp, Settings,
  Loader2, AlertCircle, Building2, Save, BarChart3, Plus, Pencil, Trash2, ChevronRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AdminReferral {
  id: number;
  code: string;
  referrerId: number;
  referrerName: string;
  referrerEmail: string;
  referredName: string | null;
  referredEmail: string | null;
  friendLevel: string | null;
  friendExperience: string | null;
  referredUserId: number | null;
  referredUserName: string | null;
  clubId: number | null;
  clubName: string | null;
  status: string;
  creditAwarded: number | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
}

interface ClubAnalytics {
  clubId: number;
  clubName: string;
  settings: {
    isActive: boolean;
    creditAmountPence: number;
    premiumThresholdPence: number;
    championThresholdPence: number;
    codeExpiryDays: number;
  };
  stats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    approvalRate: number;
    totalCreditsIssued: number;
  };
}

function getStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", className: "bg-green-500 text-white no-default-hover-elevate" };
    case "PENDING":
      return { label: "Pending", className: "bg-amber-500 text-white no-default-hover-elevate" };
    case "APPROVED":
      return { label: "Approved", className: "bg-blue-500 text-white no-default-hover-elevate" };
    case "REJECTED":
      return { label: "Rejected", className: "bg-red-500 text-white no-default-hover-elevate" };
    case "EXPIRED":
      return { label: "Expired", className: "no-default-hover-elevate" };
    case "USED":
      return { label: "Used", className: "no-default-hover-elevate" };
    default:
      return { label: status, className: "no-default-hover-elevate" };
  }
}

function ClubSettingsPanel({ clubId, clubName }: { clubId: number; clubName: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/clubs", clubId, "referral-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/referral-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [premiumThreshold, setPremiumThreshold] = useState("");
  const [championThreshold, setChampionThreshold] = useState("");
  const [expiryDays, setExpiryDays] = useState("");

  const effectiveActive = isActive !== null ? isActive : settings?.isActive ?? true;
  const effectiveCredit = creditAmount || (settings ? String(settings.creditAmountPence / 100) : "4");
  const effectivePremium = premiumThreshold || (settings ? String(settings.premiumThresholdPence / 100) : "8");
  const effectiveChampion = championThreshold || (settings ? String(settings.championThresholdPence / 100) : "16");
  const effectiveExpiry = expiryDays || (settings ? String(settings.codeExpiryDays) : "30");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const credit = parseFloat(effectiveCredit);
      const premium = parseFloat(effectivePremium);
      const champion = parseFloat(effectiveChampion);
      const expiry = parseInt(effectiveExpiry);
      if (isNaN(credit) || credit < 0) throw new Error("Credit amount must be a valid positive number");
      if (isNaN(premium) || premium < 0) throw new Error("Premium threshold must be a valid positive number");
      if (isNaN(champion) || champion < 0) throw new Error("Champion threshold must be a valid positive number");
      if (isNaN(expiry) || expiry < 1 || expiry > 365) throw new Error("Expiry days must be between 1 and 365");
      const res = await apiRequest("PUT", `/api/clubs/${clubId}/referral-settings`, {
        isActive: effectiveActive,
        creditAmountPence: Math.round(credit * 100),
        premiumThresholdPence: Math.round(premium * 100),
        championThresholdPence: Math.round(champion * 100),
        codeExpiryDays: expiry,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "referral-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      setCreditAmount("");
      setPremiumThreshold("");
      setChampionThreshold("");
      setExpiryDays("");
      setIsActive(null);
      toast({ title: "Settings Saved", description: `Referral settings updated for ${clubName}.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card data-testid={`card-settings-${clubId}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Referral Program Settings
        </CardTitle>
        <CardDescription>Configure the referral program for {clubName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Program Active</Label>
            <p className="text-xs text-muted-foreground">Enable or disable the referral program</p>
          </div>
          <Switch
            checked={effectiveActive}
            onCheckedChange={(v) => setIsActive(v)}
            data-testid={`switch-active-${clubId}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Credit Per Referral</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="0.50"
                min="0"
                value={effectiveCredit}
                onChange={(e) => setCreditAmount(e.target.value)}
                data-testid={`input-credit-${clubId}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Code Expiry (days)</Label>
            <Input
              type="number"
              min="1"
              max="365"
              value={effectiveExpiry}
              onChange={(e) => setExpiryDays(e.target.value)}
              data-testid={`input-expiry-${clubId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Premium Threshold</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="1"
                min="0"
                value={effectivePremium}
                onChange={(e) => setPremiumThreshold(e.target.value)}
                data-testid={`input-premium-${clubId}`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Champion Threshold</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{"\u00A3"}</span>
              <Input
                type="number"
                step="1"
                min="0"
                value={effectiveChampion}
                onChange={(e) => setChampionThreshold(e.target.value)}
                data-testid={`input-champion-${clubId}`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid={`button-save-settings-${clubId}`}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ReferralLevel {
  level: number;
  referralsRequired: number;
  credits: number;
  gifts: string;
  freeSessions: number;
  unlockDescription: string;
}

interface ReferralProgram {
  id: number;
  clubId: number;
  clubName?: string;
  name: string;
  description: string;
  isActive: boolean;
  levels: ReferralLevel[];
}

const emptyLevel: ReferralLevel = {
  level: 1,
  referralsRequired: 1,
  credits: 0,
  gifts: "",
  freeSessions: 0,
  unlockDescription: "",
};

function ReferralProgramsPanel({ adminClubs }: { adminClubs: any[] }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ReferralProgram | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ReferralProgram | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formClubId, setFormClubId] = useState("");
  const [formLevels, setFormLevels] = useState<ReferralLevel[]>([{ ...emptyLevel }]);

  const { data: allPrograms = [], isLoading } = useQuery<ReferralProgram[]>({
    queryKey: ["/api/admin/all-referral-programs"],
    queryFn: async () => {
      const results: ReferralProgram[] = [];
      for (const club of adminClubs) {
        try {
          const res = await fetch(`/api/clubs/${club.id}/referral-programs`, { credentials: "include" });
          if (res.ok) {
            const programs = await res.json();
            results.push(...programs.map((p: any) => ({ ...p, clubName: club.name })));
          }
        } catch {}
      }
      return results;
    },
    enabled: adminClubs.length > 0,
  });

  function openCreateDialog() {
    setEditingProgram(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setFormClubId(adminClubs.length === 1 ? String(adminClubs[0].id) : "");
    setFormLevels([{ ...emptyLevel }]);
    setDialogOpen(true);
  }

  function openEditDialog(program: ReferralProgram) {
    setEditingProgram(program);
    setFormName(program.name);
    setFormDescription(program.description);
    setFormIsActive(program.isActive);
    setFormClubId(String(program.clubId));
    setFormLevels(
      program.levels && program.levels.length > 0
        ? program.levels.map((l) => ({ ...l, credits: l.credits / 100 }))
        : [{ ...emptyLevel }]
    );
    setDialogOpen(true);
  }

  function addLevel() {
    const nextLevel = formLevels.length > 0 ? Math.max(...formLevels.map((l) => l.level)) + 1 : 1;
    setFormLevels([...formLevels, { ...emptyLevel, level: nextLevel }]);
  }

  function removeLevel(index: number) {
    if (formLevels.length <= 1) return;
    setFormLevels(formLevels.filter((_, i) => i !== index));
  }

  function updateLevel(index: number, field: keyof ReferralLevel, value: string | number) {
    setFormLevels(
      formLevels.map((l, i) =>
        i === index ? { ...l, [field]: value } : l
      )
    );
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const clubId = Number(formClubId);
      if (!clubId) throw new Error("Please select a club");
      if (!formName.trim()) throw new Error("Program name is required");
      const res = await apiRequest("POST", `/api/clubs/${clubId}/referral-programs`, {
        name: formName.trim(),
        description: formDescription.trim(),
        isActive: formIsActive,
        levels: formLevels.map(l => ({ ...l, credits: Math.round(l.credits * 100) })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-referral-programs"] });
      setDialogOpen(false);
      toast({ title: "Program Created", description: "Referral program has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create program.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProgram) throw new Error("No program selected");
      if (!formName.trim()) throw new Error("Program name is required");
      const res = await apiRequest("PUT", `/api/referral-programs/${editingProgram.id}`, {
        name: formName.trim(),
        description: formDescription.trim(),
        isActive: formIsActive,
        levels: formLevels.map(l => ({ ...l, credits: Math.round(l.credits * 100) })),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-referral-programs"] });
      setDialogOpen(false);
      toast({ title: "Program Updated", description: "Referral program has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update program.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/referral-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-referral-programs"] });
      setDeleteConfirm(null);
      toast({ title: "Program Deleted", description: "Referral program has been deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete program.", variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (editingProgram) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold" data-testid="text-programs-title">Referral Programs</h2>
          <p className="text-sm text-muted-foreground">Create and manage multi-level referral programs for your clubs</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-program">
          <Plus className="h-4 w-4 mr-1" />
          Create Program
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-programs" />
        </div>
      ) : allPrograms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium" data-testid="text-no-programs">No referral programs found</p>
            <p className="text-sm mt-1">Create a referral program for a club to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allPrograms.map((program) => (
            <Card key={program.id} data-testid={`card-program-${program.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <Gift className="h-4 w-4 shrink-0" />
                      {program.name}
                      <Badge
                        className={
                          program.isActive
                            ? "bg-green-500 text-white no-default-hover-elevate"
                            : "no-default-hover-elevate"
                        }
                      >
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {program.clubName || `Club #${program.clubId}`}
                    </CardDescription>
                    {program.description && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-description-${program.id}`}>
                        {program.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(program)}
                      data-testid={`button-edit-program-${program.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(program)}
                      data-testid={`button-delete-program-${program.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {program.levels && program.levels.length > 0 && (
                <CardContent className="pt-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Reward Levels
                  </div>
                  <div className="space-y-2">
                    {program.levels
                      .sort((a, b) => a.level - b.level)
                      .map((lvl) => (
                        <div
                          key={lvl.level}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/30 text-sm flex-wrap"
                          data-testid={`level-${program.id}-${lvl.level}`}
                        >
                          <div className="flex items-center gap-1 font-medium shrink-0">
                            <ChevronRight className="h-3 w-3" />
                            Level {lvl.level}
                          </div>
                          <span className="text-muted-foreground">
                            {lvl.referralsRequired} referral{lvl.referralsRequired !== 1 ? "s" : ""}
                          </span>
                          {lvl.credits > 0 && (
                            <Badge variant="secondary" className="no-default-hover-elevate">
                              {"\u00A3"}{(lvl.credits / 100).toFixed(2)}
                            </Badge>
                          )}
                          {lvl.freeSessions > 0 && (
                            <Badge variant="secondary" className="no-default-hover-elevate">
                              {lvl.freeSessions} free session{lvl.freeSessions !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {lvl.gifts && (
                            <Badge variant="secondary" className="no-default-hover-elevate">
                              {lvl.gifts}
                            </Badge>
                          )}
                          {lvl.unlockDescription && (
                            <span className="text-xs text-muted-foreground">{lvl.unlockDescription}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {editingProgram ? "Edit Referral Program" : "Create Referral Program"}
            </DialogTitle>
            <DialogDescription>
              {editingProgram
                ? "Update the referral program details and reward levels."
                : "Set up a new referral program for a club with reward levels."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editingProgram && (
              <div className="space-y-1.5">
                <Label>Club</Label>
                <Select value={formClubId} onValueChange={setFormClubId}>
                  <SelectTrigger data-testid="select-program-club">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((club: any) => (
                      <SelectItem key={club.id} value={String(club.id)}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Program Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Refer a Friend"
                data-testid="input-program-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the program"
                data-testid="input-program-description"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this program</p>
              </div>
              <Switch
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                data-testid="switch-program-active"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-sm font-semibold">Reward Levels</Label>
                <Button size="sm" variant="outline" onClick={addLevel} data-testid="button-add-level">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Level
                </Button>
              </div>

              {formLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-md border border-border space-y-3"
                  data-testid={`form-level-${idx}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Level {lvl.level}</span>
                    {formLevels.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeLevel(idx)}
                        data-testid={`button-remove-level-${idx}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Level Number</Label>
                      <Input
                        type="number"
                        min="1"
                        value={lvl.level}
                        onChange={(e) => updateLevel(idx, "level", parseInt(e.target.value) || 1)}
                        data-testid={`input-level-number-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Referrals Required</Label>
                      <Input
                        type="number"
                        min="1"
                        value={lvl.referralsRequired}
                        onChange={(e) => updateLevel(idx, "referralsRequired", parseInt(e.target.value) || 1)}
                        data-testid={`input-referrals-required-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Credits ({"\u00A3"})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={lvl.credits}
                        onChange={(e) => updateLevel(idx, "credits", parseFloat(e.target.value) || 0)}
                        data-testid={`input-credits-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Free Sessions</Label>
                      <Input
                        type="number"
                        min="0"
                        value={lvl.freeSessions}
                        onChange={(e) => updateLevel(idx, "freeSessions", parseInt(e.target.value) || 0)}
                        data-testid={`input-free-sessions-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gifts</Label>
                      <Input
                        value={lvl.gifts}
                        onChange={(e) => updateLevel(idx, "gifts", e.target.value)}
                        placeholder="e.g. T-shirt"
                        data-testid={`input-gifts-${idx}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unlock Description</Label>
                      <Input
                        value={lvl.unlockDescription}
                        onChange={(e) => updateLevel(idx, "unlockDescription", e.target.value)}
                        placeholder="Description"
                        data-testid={`input-unlock-description-${idx}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-program">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-program">
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingProgram ? "Update Program" : "Create Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-delete-title">Delete Referral Program</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminReferrals() {
  const { data: user } = useUser();
  const { data: myAdminClubs = [] } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [clubFilter, setClubFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<AdminReferral | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("referrals");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createClubId, setCreateClubId] = useState("");
  const [createReferrerId, setCreateReferrerId] = useState("");
  const [createReferredId, setCreateReferredId] = useState("");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [referredSearch, setReferredSearch] = useState("");

  const clubFilterParam = clubFilter !== "all" ? Number(clubFilter) : undefined;

  const { data: referrals = [], isLoading } = useQuery<AdminReferral[]>({
    queryKey: ["/api/admin/referrals", statusFilter, clubFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (clubFilterParam) params.append("clubId", String(clubFilterParam));
      const res = await fetch(`/api/admin/referrals?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<ClubAnalytics[]>({
    queryKey: ["/api/admin/referrals/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      toast({ title: "Referral Approved", description: "The referrer has been awarded credit." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve referral.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/referrals/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Referral Rejected", description: "The referral has been rejected." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject referral.", variant: "destructive" });
    },
  });

  const selectedCreateClubId = createClubId ? Number(createClubId) : null;
  const { data: clubMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", selectedCreateClubId, "memberships"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${selectedCreateClubId}/memberships`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCreateClubId && createDialogOpen,
  });

  const memberUsers = clubMembers
    .filter((m: any) => m.membershipStatus === "APPROVED" && m.user)
    .map((m: any) => ({ id: m.user.id, fullName: m.user.fullName, email: m.user.email }));

  const filteredReferrers = memberUsers.filter((u: any) =>
    !referrerSearch || u.fullName.toLowerCase().includes(referrerSearch.toLowerCase())
  );

  const filteredReferred = memberUsers.filter((u: any) =>
    u.id !== Number(createReferrerId) &&
    (!referredSearch || u.fullName.toLowerCase().includes(referredSearch.toLowerCase()))
  );

  const createReferralMutation = useMutation({
    mutationFn: async () => {
      if (!createClubId || !createReferrerId) throw new Error("Please select a club and referrer");
      const res = await apiRequest("POST", "/api/admin/referrals/create", {
        referrerId: Number(createReferrerId),
        referredUserId: createReferredId ? Number(createReferredId) : null,
        clubId: Number(createClubId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/analytics"] });
      setCreateDialogOpen(false);
      setCreateClubId("");
      setCreateReferrerId("");
      setCreateReferredId("");
      setReferrerSearch("");
      setReferredSearch("");
      toast({ title: "Referral Created", description: "The referral has been created and is ready to be approved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create referral.", variant: "destructive" });
    },
  });

  const pendingCount = referrals.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Referrals"
        description="Review referrals, manage club settings, and view analytics"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="referrals" className="flex items-center gap-1.5" data-testid="tab-referrals">
            <Gift className="h-3.5 w-3.5" />
            Referrals
            {pendingCount > 0 && <Badge className="bg-amber-500 text-white no-default-hover-elevate ml-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5" data-testid="tab-analytics">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="programs" className="flex items-center gap-1.5" data-testid="tab-programs">
            <Plus className="h-3.5 w-3.5" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5" data-testid="tab-settings">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-referral-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              {myAdminClubs.length > 1 && (
                <Select value={clubFilter} onValueChange={setClubFilter}>
                  <SelectTrigger className="w-48" data-testid="select-referral-club-filter">
                    <SelectValue placeholder="Filter by club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {myAdminClubs.map((club: any) => (
                      <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {statusFilter === "PENDING" && pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white no-default-hover-elevate">{pendingCount} pending</Badge>
              )}
            </div>
            <Button
              onClick={() => {
                setCreateClubId(myAdminClubs.length === 1 ? String(myAdminClubs[0].id) : "");
                setCreateReferrerId("");
                setCreateReferredId("");
                setReferrerSearch("");
                setReferredSearch("");
                setCreateDialogOpen(true);
              }}
              data-testid="button-create-referral"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Create Referral
            </Button>
          </div>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : referrals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No referrals found</p>
                <p className="text-sm mt-1">No referrals matching the selected filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => {
                const statusConfig = getStatusConfig(ref.status);
                return (
                  <Card key={ref.id} data-testid={`admin-referral-${ref.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono font-bold text-sm">{ref.code}</code>
                            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                            {ref.creditAwarded && ref.creditAwarded > 0 && (
                              <Badge variant="secondary" className="no-default-hover-elevate">+{"\u00A3"}{(ref.creditAwarded / 100).toFixed(2)}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Referrer:</span>
                              <span className="font-medium truncate">{ref.referrerName}</span>
                            </div>
                            {ref.referredName || ref.referredUserName ? (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Referred:</span>
                                <span className="font-medium truncate">{ref.referredUserName || ref.referredName}</span>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs">Not yet used</div>
                            )}
                          </div>
                          {(ref.friendLevel || ref.friendExperience) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              {ref.friendLevel && (
                                <span>Level: <span className="font-medium text-foreground">{ref.friendLevel}</span></span>
                              )}
                              {ref.friendExperience && (
                                <span>Experience: <span className="font-medium text-foreground">{ref.friendExperience}</span></span>
                              )}
                            </div>
                          )}
                          {ref.clubName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {ref.clubName}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>Created {format(new Date(ref.createdAt), "dd MMM yyyy")}</span>
                            {ref.usedAt && (
                              <span>Used {formatDistanceToNow(new Date(ref.usedAt), { addSuffix: true })}</span>
                            )}
                          </div>
                          {ref.rejectionReason && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              Reason: {ref.rejectionReason}
                            </div>
                          )}
                        </div>
                        {ref.status === "PENDING" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(ref.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-referral-${ref.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectDialog(ref);
                                setRejectReason("");
                              }}
                              data-testid={`button-reject-referral-${ref.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : analytics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No analytics data</p>
                <p className="text-sm mt-1">Referral analytics will appear once clubs have referrals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {analytics.map((a) => (
                <Card key={a.clubId} data-testid={`analytics-club-${a.clubId}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {a.clubName}
                      {!a.settings.isActive && (
                        <Badge variant="secondary" className="no-default-hover-elevate">Program Paused</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {"\u00A3"}{(a.settings.creditAmountPence / 100).toFixed(2)} per referral | {a.settings.codeExpiryDays} day expiry
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-bold">{a.stats.total}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Approved</div>
                        <div className="text-lg font-bold text-green-600">{a.stats.approved}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Pending</div>
                        <div className="text-lg font-bold text-amber-500">{a.stats.pending}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Rejected</div>
                        <div className="text-lg font-bold text-red-500">{a.stats.rejected}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Approval Rate</div>
                        <div className="text-lg font-bold">{a.stats.approvalRate}%</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-muted/30">
                        <div className="text-xs text-muted-foreground">Credits Issued</div>
                        <div className="text-lg font-bold">{"\u00A3"}{(a.stats.totalCreditsIssued / 100).toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <ReferralProgramsPanel adminClubs={myAdminClubs} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {myAdminClubs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Settings className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No clubs to manage</p>
              </CardContent>
            </Card>
          ) : (
            myAdminClubs.map((club: any) => (
              <ClubSettingsPanel key={club.id} clubId={club.id} clubName={club.name} />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Referral</DialogTitle>
            <DialogDescription>
              Rejecting referral code <code className="font-mono">{rejectDialog?.code}</code> from {rejectDialog?.referrerName}
              {rejectDialog?.clubName && <> for {rejectDialog.clubName}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-reject-cancel">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDialog) {
                  rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason });
                }
              }}
              disabled={rejectMutation.isPending}
              data-testid="button-reject-confirm"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Reject Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Referral
            </DialogTitle>
            <DialogDescription>
              Manually create a referral on behalf of a club member. The referral will be created in Pending status so you can approve it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Club</Label>
              <Select
                value={createClubId}
                onValueChange={(v) => {
                  setCreateClubId(v);
                  setCreateReferrerId("");
                  setCreateReferredId("");
                  setReferrerSearch("");
                  setReferredSearch("");
                }}
              >
                <SelectTrigger data-testid="select-create-club">
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {myAdminClubs.map((club: any) => (
                    <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCreateClubId && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Referrer (who referred)</Label>
                  <Input
                    placeholder="Search members..."
                    value={referrerSearch}
                    onChange={(e) => setReferrerSearch(e.target.value)}
                    data-testid="input-search-referrer"
                  />
                  {createReferrerId && (
                    <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-md px-3 py-1.5">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{memberUsers.find((u: any) => u.id === Number(createReferrerId))?.fullName}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => setCreateReferrerId("")} data-testid="button-clear-referrer">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {!createReferrerId && referrerSearch && (
                    <div className="max-h-32 overflow-y-auto border rounded-md">
                      {filteredReferrers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No members found</div>
                      ) : (
                        filteredReferrers.slice(0, 10).map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => {
                              setCreateReferrerId(String(u.id));
                              setReferrerSearch("");
                            }}
                            data-testid={`option-referrer-${u.id}`}
                          >
                            <span className="font-medium">{u.fullName}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Referred Person (who was referred)</Label>
                  <Input
                    placeholder="Search members..."
                    value={referredSearch}
                    onChange={(e) => setReferredSearch(e.target.value)}
                    data-testid="input-search-referred"
                  />
                  {createReferredId && (
                    <div className="flex items-center gap-2 text-sm bg-green-500/10 rounded-md px-3 py-1.5">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-medium">{memberUsers.find((u: any) => u.id === Number(createReferredId))?.fullName}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => setCreateReferredId("")} data-testid="button-clear-referred">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {!createReferredId && referredSearch && (
                    <div className="max-h-32 overflow-y-auto border rounded-md">
                      {filteredReferred.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No members found</div>
                      ) : (
                        filteredReferred.slice(0, 10).map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => {
                              setCreateReferredId(String(u.id));
                              setReferredSearch("");
                            }}
                            data-testid={`option-referred-${u.id}`}
                          >
                            <span className="font-medium">{u.fullName}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Optional - leave empty if the referred person hasn't joined yet</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-create-referral-cancel">Cancel</Button>
            <Button
              onClick={() => createReferralMutation.mutate()}
              disabled={!createClubId || !createReferrerId || createReferralMutation.isPending}
              data-testid="button-create-referral-confirm"
            >
              {createReferralMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
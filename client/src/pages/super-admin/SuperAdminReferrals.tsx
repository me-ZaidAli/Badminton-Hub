import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Gift, Plus, Pencil, Trash2, Loader2, ChevronRight, Building2 } from "lucide-react";

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

interface Club {
  id: number;
  name: string;
}

const emptyLevel: ReferralLevel = {
  level: 1,
  referralsRequired: 1,
  credits: 0,
  gifts: "",
  freeSessions: 0,
  unlockDescription: "",
};

export default function SuperAdminReferrals() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ReferralProgram | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ReferralProgram | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formClubId, setFormClubId] = useState("");
  const [formLevels, setFormLevels] = useState<ReferralLevel[]>([{ ...emptyLevel }]);

  const { data: programs = [], isLoading } = useQuery<ReferralProgram[]>({
    queryKey: ["/api/super-admin/referral-programs"],
  });

  const { data: clubs = [] } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  function openCreateDialog() {
    setEditingProgram(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setFormClubId("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/referral-programs"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/referral-programs"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/referral-programs"] });
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
    <div className="space-y-6">
      <PageHeader
        title="Referral Programs"
        description="Manage referral programs across all clubs"
        action={
          <Button onClick={openCreateDialog} data-testid="button-create-program">
            <Plus className="h-4 w-4 mr-1" />
            Create Program
          </Button>
        }
      />

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="loading-programs" />
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium" data-testid="text-no-programs">No referral programs found</p>
            <p className="text-sm mt-1">Create a referral program for a club to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
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
                  <SelectTrigger data-testid="select-club">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
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

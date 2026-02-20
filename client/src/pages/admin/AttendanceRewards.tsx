import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Pencil, Trash2, Loader2, Target, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface RewardConfig {
  credits: number;
  gifts: string;
  freeSessions: number;
}

interface AttendanceReward {
  id: number;
  clubId: number;
  sessionsRequired: number;
  rewardConfig: RewardConfig;
  isActive: boolean;
}

interface RewardFormData {
  sessionsRequired: number;
  credits: number;
  gifts: string;
  freeSessions: number;
  isActive: boolean;
}

const defaultFormData: RewardFormData = {
  sessionsRequired: 10,
  credits: 0,
  gifts: "",
  freeSessions: 0,
  isActive: true,
};

export function AttendanceRewardsPanel({ clubId }: { clubId: number }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<AttendanceReward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: rewards, isLoading } = useQuery<AttendanceReward[]>({
    queryKey: ["/api/clubs", clubId, "attendance-rewards"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/attendance-rewards`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance rewards");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: RewardFormData) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/attendance-rewards`, {
        sessionsRequired: data.sessionsRequired,
        rewardConfig: {
          credits: Math.round(data.credits * 100),
          gifts: data.gifts,
          freeSessions: data.freeSessions,
        },
        isActive: data.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "attendance-rewards"] });
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Reward Created", description: "Attendance reward milestone has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create reward.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RewardFormData }) => {
      const res = await apiRequest("PUT", `/api/attendance-rewards/${id}`, {
        sessionsRequired: data.sessionsRequired,
        rewardConfig: {
          credits: Math.round(data.credits * 100),
          gifts: data.gifts,
          freeSessions: data.freeSessions,
        },
        isActive: data.isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "attendance-rewards"] });
      setDialogOpen(false);
      setEditingReward(null);
      setFormData(defaultFormData);
      toast({ title: "Reward Updated", description: "Attendance reward milestone has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update reward.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/attendance-rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "attendance-rewards"] });
      setDeleteConfirmId(null);
      toast({ title: "Reward Deleted", description: "Attendance reward milestone has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete reward.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const reward = rewards?.find(r => r.id === id);
      if (!reward) throw new Error("Reward not found");
      const res = await apiRequest("PUT", `/api/attendance-rewards/${id}`, {
        sessionsRequired: reward.sessionsRequired,
        rewardConfig: reward.rewardConfig,
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "attendance-rewards"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to toggle reward.", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingReward(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEdit(reward: AttendanceReward) {
    setEditingReward(reward);
    setFormData({
      sessionsRequired: reward.sessionsRequired,
      credits: (reward.rewardConfig.credits ?? 0) / 100,
      gifts: reward.rewardConfig.gifts ?? "",
      freeSessions: reward.rewardConfig.freeSessions ?? 0,
      isActive: reward.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (formData.sessionsRequired < 1) {
      toast({ title: "Validation Error", description: "Sessions required must be at least 1.", variant: "destructive" });
      return;
    }
    if (editingReward) {
      updateMutation.mutate({ id: editingReward.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function formatGBP(pence: number): string {
    return `\u00A3${(pence / 100).toFixed(2)}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-rewards">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedRewards = [...(rewards || [])].sort((a, b) => a.sessionsRequired - b.sessionsRequired);

  return (
    <div className="space-y-4" data-testid="attendance-rewards-panel">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold" data-testid="text-rewards-title">Attendance Rewards</h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-rewards-description">
            Set milestones for session attendance. When a player attends the specified number of sessions, they automatically earn the configured reward. Milestones repeat indefinitely.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-reward">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {sortedRewards.length === 0 ? (
        <Card data-testid="card-no-rewards">
          <CardContent className="py-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No attendance reward milestones configured yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Milestone" to create your first reward.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRewards.map((reward) => (
            <Card key={reward.id} data-testid={`card-reward-${reward.id}`} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {reward.sessionsRequired} Sessions
                </CardTitle>
                <Badge
                  variant={reward.isActive ? "default" : "secondary"}
                  className={reward.isActive ? "bg-green-600 text-white no-default-hover-elevate" : "no-default-hover-elevate"}
                  data-testid={`badge-status-${reward.id}`}
                >
                  {reward.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5 text-sm">
                  {reward.rewardConfig.credits > 0 && (
                    <div className="flex items-center justify-between gap-2" data-testid={`text-credits-${reward.id}`}>
                      <span className="text-muted-foreground">Credits</span>
                      <span className="font-medium">{formatGBP(reward.rewardConfig.credits)}</span>
                    </div>
                  )}
                  {reward.rewardConfig.freeSessions > 0 && (
                    <div className="flex items-center justify-between gap-2" data-testid={`text-free-sessions-${reward.id}`}>
                      <span className="text-muted-foreground">Free Sessions</span>
                      <span className="font-medium">{reward.rewardConfig.freeSessions}</span>
                    </div>
                  )}
                  {reward.rewardConfig.gifts && (
                    <div className="flex items-center justify-between gap-2" data-testid={`text-gifts-${reward.id}`}>
                      <span className="text-muted-foreground">Gifts</span>
                      <span className="font-medium text-right max-w-[60%] truncate">{reward.rewardConfig.gifts}</span>
                    </div>
                  )}
                  {!reward.rewardConfig.credits && !reward.rewardConfig.freeSessions && !reward.rewardConfig.gifts && (
                    <p className="text-muted-foreground text-xs italic">No reward details configured</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t">
                  <Switch
                    checked={reward.isActive}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: reward.id, isActive: checked })}
                    data-testid={`switch-active-${reward.id}`}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(reward)}
                      data-testid={`button-edit-${reward.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(reward.id)}
                      data-testid={`button-delete-${reward.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-reward-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingReward ? "Edit Reward Milestone" : "Add Reward Milestone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sessionsRequired">Sessions Required</Label>
              <Input
                id="sessionsRequired"
                type="number"
                min={1}
                value={formData.sessionsRequired}
                onChange={(e) => setFormData({ ...formData, sessionsRequired: parseInt(e.target.value) || 0 })}
                data-testid="input-sessions-required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Credits (£)</Label>
              <Input
                id="credits"
                type="number"
                min={0}
                step="0.01"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })}
                data-testid="input-credits"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gifts">Gifts</Label>
              <Input
                id="gifts"
                type="text"
                placeholder="e.g. Free shuttlecocks, Club t-shirt"
                value={formData.gifts}
                onChange={(e) => setFormData({ ...formData, gifts: e.target.value })}
                data-testid="input-gifts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeSessions">Free Sessions</Label>
              <Input
                id="freeSessions"
                type="number"
                min={0}
                value={formData.freeSessions}
                onChange={(e) => setFormData({ ...formData, freeSessions: parseInt(e.target.value) || 0 })}
                data-testid="input-free-sessions"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-form-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-reward">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReward ? "Save Changes" : "Create Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle>Delete Reward Milestone</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this attendance reward milestone? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AttendanceRewardsPage() {
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
          <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Attendance Rewards</h1>
          <p className="text-sm text-muted-foreground">Configure session attendance milestone rewards</p>
        </div>
        {clubs.length > 1 && (
          <Select value={selectedClubId || String(effectiveClubId)} onValueChange={setSelectedClubId}>
            <SelectTrigger className="w-56" data-testid="select-club-filter">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {clubs.map((club: any) => (
                <SelectItem key={club.id} value={String(club.id)}>{club.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!effectiveClubId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No clubs found. You need admin access to a club to manage attendance rewards.
          </CardContent>
        </Card>
      ) : (
        <AttendanceRewardsPanel clubId={effectiveClubId} />
      )}
    </div>
  );
}

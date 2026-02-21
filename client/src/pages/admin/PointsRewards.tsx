import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface RewardConfig {
  credits: number;
  gifts: string;
  freeSessions: number;
}

interface PointsReward {
  id: number;
  clubId: number;
  pointsRequired: number;
  rewardConfig: RewardConfig;
  isActive: boolean;
}

interface FormData {
  pointsRequired: number;
  credits: number;
  gifts: string;
  freeSessions: number;
  isActive: boolean;
}

const defaultFormData: FormData = {
  pointsRequired: 50,
  credits: 0,
  gifts: "",
  freeSessions: 0,
  isActive: true,
};

export function PointsRewardsPanel({ clubId }: { clubId: number }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<PointsReward | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: rewards, isLoading } = useQuery<PointsReward[]>({
    queryKey: ["/api/clubs", clubId, "points-rewards"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/points-rewards`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch points rewards");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/points-rewards`, {
        pointsRequired: data.pointsRequired,
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
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "points-rewards"] });
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Reward Created", description: "Points milestone reward has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create reward.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await apiRequest("PUT", `/api/points-rewards/${id}`, {
        pointsRequired: data.pointsRequired,
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
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "points-rewards"] });
      setDialogOpen(false);
      setEditingReward(null);
      setFormData(defaultFormData);
      toast({ title: "Reward Updated", description: "Points milestone reward has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update reward.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/points-rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "points-rewards"] });
      setDeleteConfirmId(null);
      toast({ title: "Reward Deleted", description: "Points milestone reward has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete reward.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const reward = rewards?.find(r => r.id === id);
      if (!reward) throw new Error("Reward not found");
      const res = await apiRequest("PUT", `/api/points-rewards/${id}`, {
        pointsRequired: reward.pointsRequired,
        rewardConfig: reward.rewardConfig,
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "points-rewards"] });
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

  function openEdit(reward: PointsReward) {
    setEditingReward(reward);
    setFormData({
      pointsRequired: reward.pointsRequired,
      credits: (reward.rewardConfig.credits ?? 0) / 100,
      gifts: reward.rewardConfig.gifts ?? "",
      freeSessions: reward.rewardConfig.freeSessions ?? 0,
      isActive: reward.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (formData.pointsRequired < 1) {
      toast({ title: "Validation Error", description: "Points required must be at least 1.", variant: "destructive" });
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
      <div className="flex items-center justify-center p-8" data-testid="loading-points-rewards">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedRewards = [...(rewards || [])].sort((a, b) => a.pointsRequired - b.pointsRequired);

  return (
    <div className="space-y-4" data-testid="points-rewards-panel">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold" data-testid="text-points-rewards-title">Points Milestone Rewards</h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-points-rewards-description">
            Reward players when they reach ranking point milestones.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-points-reward">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {sortedRewards.length === 0 ? (
        <Card data-testid="card-no-points-rewards">
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No points milestone rewards configured.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add milestones to reward players when they accumulate ranking points from matches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedRewards.map((reward) => {
            const config = reward.rewardConfig;
            const rewardParts: string[] = [];
            if (config.credits > 0) rewardParts.push(formatGBP(config.credits));
            if (config.freeSessions > 0) rewardParts.push(`${config.freeSessions} free session${config.freeSessions > 1 ? "s" : ""}`);
            if (config.gifts) rewardParts.push(config.gifts);

            return (
              <Card key={reward.id} className="border-border/50" data-testid={`card-points-reward-${reward.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base" data-testid={`text-points-milestone-${reward.id}`}>
                    {reward.pointsRequired} Points
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reward.isActive}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: reward.id, isActive: checked })}
                      data-testid={`switch-points-active-${reward.id}`}
                    />
                    <Badge
                      variant={reward.isActive ? "default" : "secondary"}
                      className={reward.isActive ? "bg-green-600 text-white no-default-hover-elevate" : "no-default-hover-elevate"}
                    >
                      {reward.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {rewardParts.length > 0 && (
                    <p className="font-medium text-emerald-600 dark:text-emerald-400" data-testid={`text-points-reward-value-${reward.id}`}>
                      {rewardParts.join(" + ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(reward)} data-testid={`button-edit-points-${reward.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(reward.id)} data-testid={`button-delete-points-${reward.id}`}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingReward(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit Points Milestone" : "Add Points Milestone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="points-required">Points Required</Label>
              <Input id="points-required" type="number" min={1} value={formData.pointsRequired} onChange={(e) => setFormData({ ...formData, pointsRequired: Number(e.target.value) })} data-testid="input-points-required" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-credits">Credits (GBP)</Label>
              <Input id="points-credits" type="number" min={0} step={0.01} value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })} data-testid="input-points-credits" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-gifts">Gifts</Label>
              <Input id="points-gifts" type="text" value={formData.gifts} onChange={(e) => setFormData({ ...formData, gifts: e.target.value })} placeholder="e.g. Club t-shirt, shuttlecocks" data-testid="input-points-gifts" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-sessions">Free Sessions</Label>
              <Input id="points-sessions" type="number" min={0} value={formData.freeSessions} onChange={(e) => setFormData({ ...formData, freeSessions: Number(e.target.value) })} data-testid="input-points-free-sessions" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="points-active">Active</Label>
              <Switch id="points-active" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} data-testid="switch-points-form-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-points">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-points">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReward ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Points Milestone?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this points milestone reward. Players who already earned it will keep their rewards.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete-points">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-points">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

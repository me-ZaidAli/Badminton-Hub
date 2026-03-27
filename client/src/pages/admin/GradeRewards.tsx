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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Plus, Pencil, Trash2, Loader2, Zap, Flame, Star, Sparkles, Medal, Trophy, Shield, Crown } from "lucide-react";

const ALL_BADGES = [
  { id: "first_win", name: "First Win", icon: Zap, color: "#22c55e", criteria: "Win your first match" },
  { id: "5_wins", name: "5+ Wins", icon: Flame, color: "#f97316", criteria: "Win 5 or more matches" },
  { id: "10_matches", name: "10+ Matches", icon: Star, color: "#eab308", criteria: "Play 10 or more matches" },
  { id: "rising_star", name: "Rising Star", icon: Sparkles, color: "#ec4899", criteria: "3+ wins with 60%+ win rate" },
  { id: "top_performer", name: "Top Performer", icon: Medal, color: "#a855f7", criteria: "75%+ win rate (4+ matches)" },
  { id: "undefeated", name: "Undefeated", icon: Trophy, color: "#d97706", criteria: "10 consecutive wins" },
  { id: "iron_player", name: "Iron Player", icon: Shield, color: "#3b82f6", criteria: "Play 20+ matches" },
  { id: "champion", name: "Champion", icon: Crown, color: "#f59e0b", criteria: "15+ wins with 70%+ win rate" },
];

interface RewardConfig {
  credits: number;
  gifts: string;
  freeSessions: number;
}

interface BadgeReward {
  id: number;
  clubId: number;
  badge: string;
  rewardConfig: RewardConfig;
  isActive: boolean;
}

interface FormData {
  badge: string;
  credits: number;
  gifts: string;
  freeSessions: number;
  isActive: boolean;
}

const defaultFormData: FormData = {
  badge: "first_win",
  credits: 0,
  gifts: "",
  freeSessions: 0,
  isActive: true,
};

export function GradeRewardsPanel({ clubId }: { clubId: number }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<BadgeReward | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: rewards, isLoading } = useQuery<BadgeReward[]>({
    queryKey: ["/api/clubs", clubId, "badge-rewards"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/badge-rewards`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch badge rewards");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/badge-rewards`, {
        badge: data.badge,
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
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "badge-rewards"] });
      setDialogOpen(false);
      setFormData(defaultFormData);
      toast({ title: "Reward Created", description: "Badge achievement reward has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create reward.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const res = await apiRequest("PUT", `/api/badge-rewards/${id}`, {
        badge: data.badge,
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
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "badge-rewards"] });
      setDialogOpen(false);
      setEditingReward(null);
      setFormData(defaultFormData);
      toast({ title: "Reward Updated", description: "Badge achievement reward has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update reward.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/badge-rewards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "badge-rewards"] });
      setDeleteConfirmId(null);
      toast({ title: "Reward Deleted", description: "Badge achievement reward has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete reward.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const reward = rewards?.find(r => r.id === id);
      if (!reward) throw new Error("Reward not found");
      const res = await apiRequest("PUT", `/api/badge-rewards/${id}`, {
        badge: reward.badge,
        rewardConfig: reward.rewardConfig,
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "badge-rewards"] });
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

  function openEdit(reward: BadgeReward) {
    setEditingReward(reward);
    setFormData({
      badge: reward.badge,
      credits: (reward.rewardConfig.credits ?? 0) / 100,
      gifts: reward.rewardConfig.gifts ?? "",
      freeSessions: reward.rewardConfig.freeSessions ?? 0,
      isActive: reward.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.badge) {
      toast({ title: "Validation Error", description: "Please select a badge.", variant: "destructive" });
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

  function getBadgeInfo(badgeId: string) {
    return ALL_BADGES.find(b => b.id === badgeId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="loading-badge-rewards">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const badgeOrder = ALL_BADGES.map(b => b.id);
  const sortedRewards = [...(rewards || [])].sort((a, b) => badgeOrder.indexOf(a.badge) - badgeOrder.indexOf(b.badge));

  return (
    <div className="space-y-4" data-testid="badge-rewards-panel">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold" data-testid="text-badge-rewards-title">Badge Achievement Rewards</h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-badge-rewards-description">
            Reward players when they earn specific achievement badges. Each reward is given once per badge earned and is automatically issued when the badge criteria is met.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-badge-reward">
          <Plus className="h-4 w-4 mr-2" />
          Add Badge Reward
        </Button>
      </div>

      {sortedRewards.length === 0 ? (
        <Card data-testid="card-no-badge-rewards">
          <CardContent className="py-8 text-center">
            <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No badge achievement rewards configured.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add rewards to incentivize players to earn badges through match performance.
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
            const badgeInfo = getBadgeInfo(reward.badge);
            const BadgeIcon = badgeInfo?.icon || Award;

            return (
              <Card key={reward.id} className="border-border/50" data-testid={`card-badge-reward-${reward.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <BadgeIcon className="h-5 w-5" style={{ color: badgeInfo?.color || "#888" }} />
                    <CardTitle className="text-base" data-testid={`text-badge-value-${reward.id}`}>
                      {badgeInfo?.name || reward.badge}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reward.isActive}
                      onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: reward.id, isActive: checked })}
                      data-testid={`switch-badge-active-${reward.id}`}
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
                  {badgeInfo && (
                    <p className="text-xs text-muted-foreground">{badgeInfo.criteria}</p>
                  )}
                  {rewardParts.length > 0 && (
                    <p className="font-medium text-emerald-600 dark:text-emerald-400" data-testid={`text-badge-reward-value-${reward.id}`}>
                      {rewardParts.join(" + ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(reward)} data-testid={`button-edit-badge-${reward.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(reward.id)} data-testid={`button-delete-badge-${reward.id}`}>
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
            <DialogTitle>{editingReward ? "Edit Badge Reward" : "Add Badge Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge-select">Badge</Label>
              <Select value={formData.badge} onValueChange={(value) => setFormData({ ...formData, badge: value })}>
                <SelectTrigger data-testid="select-badge">
                  <SelectValue placeholder="Select badge" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_BADGES.map(b => {
                    const Icon = b.icon;
                    return (
                      <SelectItem key={b.id} value={b.id} data-testid={`select-badge-${b.id}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: b.color }} />
                          <span>{b.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {formData.badge && (() => {
                const info = getBadgeInfo(formData.badge);
                return info ? (
                  <p className="text-xs text-muted-foreground mt-1">{info.criteria}</p>
                ) : null;
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-credits">Rewards (GBP)</Label>
              <Input id="badge-credits" type="number" min={0} step={0.01} value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })} data-testid="input-badge-credits" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-gifts">Gifts</Label>
              <Input id="badge-gifts" type="text" value={formData.gifts} onChange={(e) => setFormData({ ...formData, gifts: e.target.value })} placeholder="e.g. Club t-shirt, medal" data-testid="input-badge-gifts" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-sessions">Free Sessions</Label>
              <Input id="badge-sessions" type="number" min={0} value={formData.freeSessions} onChange={(e) => setFormData({ ...formData, freeSessions: Number(e.target.value) })} data-testid="input-badge-free-sessions" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="badge-active">Active</Label>
              <Switch id="badge-active" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} data-testid="switch-badge-form-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-badge">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-badge">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReward ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Badge Reward?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this badge achievement reward. Players who already earned it will keep their rewards.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete-badge">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-badge">
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, FolderPlus,
  BookOpen, Flame, Dumbbell, Footprints, Crosshair, Send, Swords, Shield, Target, Brain, Users,
  Trophy, Star, Zap, Activity, Heart, Eye, Lightbulb, Music, Palette, Move
} from "lucide-react";

const GOLD = "#D4AF37";
const CARD_BG = "#1A1A1A";

const ICON_OPTIONS: { value: string; icon: any; label: string }[] = [
  { value: "BookOpen", icon: BookOpen, label: "Book" },
  { value: "Flame", icon: Flame, label: "Flame" },
  { value: "Dumbbell", icon: Dumbbell, label: "Dumbbell" },
  { value: "Footprints", icon: Footprints, label: "Footprints" },
  { value: "Crosshair", icon: Crosshair, label: "Crosshair" },
  { value: "Send", icon: Send, label: "Send" },
  { value: "Swords", icon: Swords, label: "Swords" },
  { value: "Shield", icon: Shield, label: "Shield" },
  { value: "Target", icon: Target, label: "Target" },
  { value: "Brain", icon: Brain, label: "Brain" },
  { value: "Users", icon: Users, label: "Users" },
  { value: "Trophy", icon: Trophy, label: "Trophy" },
  { value: "Star", icon: Star, label: "Star" },
  { value: "Zap", icon: Zap, label: "Zap" },
  { value: "Activity", icon: Activity, label: "Activity" },
  { value: "Heart", icon: Heart, label: "Heart" },
  { value: "Eye", icon: Eye, label: "Eye" },
  { value: "Lightbulb", icon: Lightbulb, label: "Lightbulb" },
  { value: "Music", icon: Music, label: "Music" },
  { value: "Palette", icon: Palette, label: "Palette" },
  { value: "Move", icon: Move, label: "Move" },
];

const ICON_MAP: Record<string, any> = Object.fromEntries([
  ...ICON_OPTIONS.map(o => [o.value, o.icon]),
  ...ICON_OPTIONS.map(o => [o.value.toLowerCase(), o.icon]),
  ["book", BookOpen],
]);

interface Skill {
  id: number;
  categoryId: number;
  name: string;
  displayOrder: number;
  clubId: number | null;
}

interface Category {
  id: number;
  name: string;
  displayOrder: number;
  iconName: string | null;
  clubId: number | null;
}

export function PlayerSkillCategoryManager({ clubId }: { clubId: number | null }) {
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: "add" | "edit"; category?: Category }>({ open: false, mode: "add" });
  const [skillDialog, setSkillDialog] = useState<{ open: boolean; mode: "add" | "edit"; categoryId?: number; skill?: Skill }>({ open: false, mode: "add" });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "skill"; id: number; name: string } | null>(null);

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("Target");
  const [skillName, setSkillName] = useState("");

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/players/skill-categories", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skill-categories${clubId ? `?clubId=${clubId}` : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/players/skills", clubId],
    queryFn: async () => {
      const r = await fetch(`/api/players/skills${clubId ? `?clubId=${clubId}` : ""}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/players/skill-categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/players/skills"] });
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; iconName: string; clubId?: number | null }) => {
      const res = await apiRequest("POST", "/api/players/skill-categories", data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setCategoryDialog({ open: false, mode: "add" });
      setCatName("");
      setCatIcon("Target");
      toast({ title: "Category created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; iconName?: string }) => {
      const res = await apiRequest("PATCH", `/api/players/skill-categories/${id}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setCategoryDialog({ open: false, mode: "add" });
      toast({ title: "Category updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/players/skill-categories/${id}`);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast({ title: "Category deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createSkillMutation = useMutation({
    mutationFn: async (data: { name: string; categoryId: number; clubId?: number | null }) => {
      const res = await apiRequest("POST", "/api/players/skills", data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setSkillDialog({ open: false, mode: "add" });
      setSkillName("");
      toast({ title: "Skill added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string }) => {
      const res = await apiRequest("PATCH", `/api/players/skills/${id}`, data);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setSkillDialog({ open: false, mode: "add" });
      toast({ title: "Skill updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/players/skills/${id}`);
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setDeleteTarget(null);
      toast({ title: "Skill deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openEditCategory = (cat: Category) => {
    setCatName(cat.name);
    setCatIcon(cat.iconName || "Target");
    setCategoryDialog({ open: true, mode: "edit", category: cat });
  };

  const openAddSkill = (categoryId: number) => {
    setSkillName("");
    setSkillDialog({ open: true, mode: "add", categoryId });
  };

  const openEditSkill = (skill: Skill) => {
    setSkillName(skill.name);
    setSkillDialog({ open: true, mode: "edit", skill });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FolderPlus size={20} style={{ color: GOLD }} />
          Skill Categories & Skills
        </h3>
        <Button
          onClick={() => {
            setCatName("");
            setCatIcon("Target");
            setCategoryDialog({ open: true, mode: "add" });
          }}
          className="text-black font-semibold"
          style={{ background: GOLD }}
          size="sm"
          data-testid="button-add-category"
        >
          <Plus size={14} className="mr-1" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl p-8 border border-white/5 text-center" style={{ background: CARD_BG }}>
          <p className="text-gray-500">No skill categories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const catSkills = skills.filter(s => s.categoryId === cat.id);
            const isExpanded = expandedCategory === cat.id;
            const IconComp = ICON_MAP[cat.iconName || "Target"] || Target;

            return (
              <div key={cat.id} className="rounded-xl border border-white/5 overflow-hidden" style={{ background: CARD_BG }} data-testid={`manage-category-${cat.id}`}>
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    data-testid={`button-expand-category-${cat.id}`}
                  >
                    <div className="rounded-lg p-2 shrink-0" style={{ background: GOLD + "15" }}>
                      <IconComp className="h-5 w-5" style={{ color: GOLD }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-white truncate block">{cat.name}</span>
                      <span className="text-xs text-gray-500">{catSkills.length} skill{catSkills.length !== 1 ? "s" : ""}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {cat.clubId && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Custom</Badge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-white/10"
                      onClick={() => openEditCategory(cat)}
                      data-testid={`button-edit-category-${cat.id}`}
                    >
                      <Pencil size={14} style={{ color: GOLD }} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                      data-testid={`button-delete-category-${cat.id}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-2">
                    {catSkills.map((skill) => (
                      <div key={skill.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]" data-testid={`manage-skill-${skill.id}`}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
                        <span className="flex-1 text-sm text-white truncate">{skill.name}</span>
                        {skill.clubId && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Custom</Badge>}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-white/10"
                          onClick={() => openEditSkill(skill)}
                          data-testid={`button-edit-skill-${skill.id}`}
                        >
                          <Pencil size={12} style={{ color: GOLD }} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => setDeleteTarget({ type: "skill", id: skill.id, name: skill.name })}
                          data-testid={`button-delete-skill-${skill.id}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2 border border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                      onClick={() => openAddSkill(cat.id)}
                      data-testid={`button-add-skill-${cat.id}`}
                    >
                      <Plus size={14} className="mr-1" /> Add Skill
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={categoryDialog.open} onOpenChange={(open) => { if (!open) setCategoryDialog({ open: false, mode: "add" }); }}>
        <DialogContent className="max-w-sm border-white/10 text-white" style={{ background: "#1E1E1E" }}>
          <DialogHeader>
            <DialogTitle>{categoryDialog.mode === "add" ? "Add Category" : "Edit Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-300">Category Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Serving Technique"
                className="mt-1 bg-white/5 border-white/10 text-white"
                data-testid="input-category-name"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-300">Icon</Label>
              <div className="grid grid-cols-7 gap-1.5 mt-2">
                {ICON_OPTIONS.map((opt) => {
                  const IC = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setCatIcon(opt.value)}
                      className={`p-2 rounded-lg transition-colors ${catIcon === opt.value ? "bg-amber-500/20 ring-1 ring-amber-500/50" : "bg-white/5 hover:bg-white/10"}`}
                      title={opt.label}
                      data-testid={`icon-option-${opt.value}`}
                    >
                      <IC size={16} className={catIcon === opt.value ? "text-amber-400" : "text-gray-400"} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full text-black font-semibold"
              style={{ background: GOLD }}
              disabled={!catName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending}
              onClick={() => {
                if (categoryDialog.mode === "edit" && categoryDialog.category) {
                  updateCategoryMutation.mutate({ id: categoryDialog.category.id, name: catName.trim(), iconName: catIcon });
                } else {
                  createCategoryMutation.mutate({ name: catName.trim(), iconName: catIcon, clubId });
                }
              }}
              data-testid="button-save-category"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {categoryDialog.mode === "add" ? "Create Category" : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillDialog.open} onOpenChange={(open) => { if (!open) setSkillDialog({ open: false, mode: "add" }); }}>
        <DialogContent className="max-w-sm border-white/10 text-white" style={{ background: "#1E1E1E" }}>
          <DialogHeader>
            <DialogTitle>{skillDialog.mode === "add" ? "Add Skill" : "Edit Skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-gray-300">Skill Name</Label>
              <Input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Backhand Low Serve"
                className="mt-1 bg-white/5 border-white/10 text-white"
                data-testid="input-skill-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full text-black font-semibold"
              style={{ background: GOLD }}
              disabled={!skillName.trim() || createSkillMutation.isPending || updateSkillMutation.isPending}
              onClick={() => {
                if (skillDialog.mode === "edit" && skillDialog.skill) {
                  updateSkillMutation.mutate({ id: skillDialog.skill.id, name: skillName.trim() });
                } else if (skillDialog.categoryId) {
                  createSkillMutation.mutate({ name: skillName.trim(), categoryId: skillDialog.categoryId, clubId });
                }
              }}
              data-testid="button-save-skill"
            >
              {(createSkillMutation.isPending || updateSkillMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {skillDialog.mode === "add" ? "Add Skill" : "Update Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-white/10 text-white" style={{ background: "#1E1E1E" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Skill"}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === "category" && " This will also delete all skills in this category."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-gray-300 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteTarget?.type === "category") {
                  deleteCategoryMutation.mutate(deleteTarget.id);
                } else if (deleteTarget?.type === "skill") {
                  deleteSkillMutation.mutate(deleteTarget.id);
                }
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

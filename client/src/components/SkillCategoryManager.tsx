import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, Loader2, FolderPlus,
  BookOpen, Flame, Dumbbell, Footprints, Crosshair, Send, Swords, Shield, Target, Brain, Users,
  Trophy, Star, Calendar, Zap, Gamepad2, Activity, Heart, Eye, Lightbulb, Music, Palette
} from "lucide-react";

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
  { value: "Gamepad2", icon: Gamepad2, label: "Gamepad" },
  { value: "Activity", icon: Activity, label: "Activity" },
  { value: "Heart", icon: Heart, label: "Heart" },
  { value: "Eye", icon: Eye, label: "Eye" },
  { value: "Lightbulb", icon: Lightbulb, label: "Lightbulb" },
  { value: "Music", icon: Music, label: "Music" },
  { value: "Palette", icon: Palette, label: "Palette" },
];

const ICON_MAP: Record<string, any> = Object.fromEntries(ICON_OPTIONS.map(o => [o.value, o.icon]));

interface Skill {
  id: number;
  categoryId: number;
  name: string;
  displayOrder: number;
}

interface Category {
  id: number;
  name: string;
  displayOrder: number;
  iconName: string | null;
  skills: Skill[];
}

export function SkillCategoryManager() {
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: "add" | "edit"; category?: Category }>({ open: false, mode: "add" });
  const [skillDialog, setSkillDialog] = useState<{ open: boolean; mode: "add" | "edit"; categoryId?: number; skill?: Skill }>({ open: false, mode: "add" });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "skill"; id: number; name: string } | null>(null);

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("Target");
  const [skillName, setSkillName] = useState("");

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/junior-skills/categories"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; iconName: string }) => {
      return apiRequest("POST", "/api/admin/junior-skills/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setCategoryDialog({ open: false, mode: "add" });
      toast({ title: "Category created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; iconName: string }) => {
      return apiRequest("PATCH", `/api/admin/junior-skills/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setCategoryDialog({ open: false, mode: "add" });
      toast({ title: "Category updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/junior-skills/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setDeleteTarget(null);
      toast({ title: "Category deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createSkillMutation = useMutation({
    mutationFn: async (data: { categoryId: number; name: string }) => {
      return apiRequest("POST", "/api/admin/junior-skills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setSkillDialog({ open: false, mode: "add" });
      toast({ title: "Skill added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string }) => {
      return apiRequest("PATCH", `/api/admin/junior-skills/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setSkillDialog({ open: false, mode: "add" });
      toast({ title: "Skill updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/junior-skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/junior-skills/categories"] });
      setDeleteTarget(null);
      toast({ title: "Skill deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openAddCategory() {
    setCatName("");
    setCatIcon("Target");
    setCategoryDialog({ open: true, mode: "add" });
  }

  function openEditCategory(cat: Category) {
    setCatName(cat.name);
    setCatIcon(cat.iconName || "Target");
    setCategoryDialog({ open: true, mode: "edit", category: cat });
  }

  function openAddSkill(categoryId: number) {
    setSkillName("");
    setSkillDialog({ open: true, mode: "add", categoryId });
  }

  function openEditSkill(skill: Skill) {
    setSkillName(skill.name);
    setSkillDialog({ open: true, mode: "edit", skill });
  }

  function handleCategorySave() {
    if (!catName.trim()) return;
    if (categoryDialog.mode === "edit" && categoryDialog.category) {
      updateCategoryMutation.mutate({ id: categoryDialog.category.id, name: catName.trim(), iconName: catIcon });
    } else {
      createCategoryMutation.mutate({ name: catName.trim(), iconName: catIcon });
    }
  }

  function handleSkillSave() {
    if (!skillName.trim()) return;
    if (skillDialog.mode === "edit" && skillDialog.skill) {
      updateSkillMutation.mutate({ id: skillDialog.skill.id, name: skillName.trim() });
    } else if (skillDialog.categoryId) {
      createSkillMutation.mutate({ categoryId: skillDialog.categoryId, name: skillName.trim() });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCategoryMutation.mutate(deleteTarget.id);
    } else {
      deleteSkillMutation.mutate(deleteTarget.id);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalSkills = (categories || []).reduce((acc, cat) => acc + (cat.skills?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-base" data-testid="text-skill-manager-title">Skill Categories & Skills</h3>
          <p className="text-xs text-muted-foreground">{categories?.length || 0} categories, {totalSkills} skills</p>
        </div>
        <Button size="sm" onClick={openAddCategory} data-testid="button-add-category">
          <FolderPlus className="h-4 w-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      <div className="space-y-2">
        {(categories || []).map((cat) => {
          const isExpanded = expandedCategory === cat.id;
          const IconComp = ICON_MAP[cat.iconName || ""] || Target;
          return (
            <Card key={cat.id} className="overflow-hidden" data-testid={`card-category-${cat.id}`}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                data-testid={`button-toggle-category-${cat.id}`}
              >
                <IconComp className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{cat.skills?.length || 0}</Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(cat)} data-testid={`button-edit-category-${cat.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })} data-testid={`button-delete-category-${cat.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-muted/10 space-y-2">
                  {(cat.skills || []).map((skill) => (
                    <div key={skill.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border" data-testid={`row-skill-${skill.id}`}>
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-sm">{skill.name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSkill(skill)} data-testid={`button-edit-skill-${skill.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "skill", id: skill.id, name: skill.name })} data-testid={`button-delete-skill-${skill.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openAddSkill(cat.id)} data-testid={`button-add-skill-${cat.id}`}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Skill to {cat.name}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-category-dialog-title">{categoryDialog.mode === "edit" ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Footwork, Strategy"
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-7 gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex items-center justify-center h-9 w-full rounded-md border transition-colors ${catIcon === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                      onClick={() => setCatIcon(opt.value)}
                      title={opt.label}
                      data-testid={`icon-option-${opt.value}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: "add" })} data-testid="button-cancel-category">Cancel</Button>
            <Button onClick={handleCategorySave} disabled={!catName.trim() || createCategoryMutation.isPending || updateCategoryMutation.isPending} data-testid="button-save-category">
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {categoryDialog.mode === "edit" ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillDialog.open} onOpenChange={(open) => setSkillDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-skill-dialog-title">{skillDialog.mode === "edit" ? "Edit Skill" : "Add Skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Skill Name</Label>
              <Input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Drop shot, Smash, Clear"
                data-testid="input-skill-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialog({ open: false, mode: "add" })} data-testid="button-cancel-skill">Cancel</Button>
            <Button onClick={handleSkillSave} disabled={!skillName.trim() || createSkillMutation.isPending || updateSkillMutation.isPending} data-testid="button-save-skill">
              {(createSkillMutation.isPending || updateSkillMutation.isPending) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {skillDialog.mode === "edit" ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Skill"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category"
                ? `This will permanently delete "${deleteTarget?.name}" and all its skills, including any player progress data linked to them. This cannot be undone.`
                : `This will permanently delete the skill "${deleteTarget?.name}" and any player progress data linked to it. This cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              {(deleteCategoryMutation.isPending || deleteSkillMutation.isPending) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

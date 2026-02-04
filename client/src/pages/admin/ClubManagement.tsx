import { useState } from "react";
import { useClubs } from "@/hooks/use-clubs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ClubManagement() {
  const { data: clubs, isLoading } = useClubs();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", slug: "", description: "" });

  const handleCreateClub = async () => {
    try {
      const res = await fetch("/api/admin/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClub),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to create club");
      toast({ title: "Club Created", description: "New club has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      setDialogOpen(false);
      setNewClub({ name: "", slug: "", description: "" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to create club", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Club Management" 
          description="Manage clubs in the platform."
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-club">
              <Plus className="w-4 h-4 mr-2" />
              Add Club
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Club</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Club Name</Label>
                <Input 
                  id="name"
                  placeholder="e.g., Downtown Badminton Club"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  data-testid="input-club-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input 
                  id="slug"
                  placeholder="e.g., downtown-badminton"
                  value={newClub.slug}
                  onChange={(e) => setNewClub({ ...newClub, slug: e.target.value })}
                  data-testid="input-club-slug"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  placeholder="Brief description of the club..."
                  value={newClub.description}
                  onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                  data-testid="input-club-description"
                />
              </div>
              <Button className="w-full" onClick={handleCreateClub} data-testid="button-create-club">
                Create Club
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 w-32 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))
        ) : clubs?.map(club => (
          <Card key={club.id} data-testid={`card-club-${club.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {club.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{club.description || "No description"}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>/{club.slug}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

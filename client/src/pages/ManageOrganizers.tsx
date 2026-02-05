import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, UserPlus, Users, Mail, Shield, ArrowLeft } from "lucide-react";
import { useClubs } from "@/hooks/use-clubs";

export default function ManageOrganizers() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const clubId = Number(params.clubId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { data: clubs } = useClubs();
  const club = clubs?.find(c => c.id === clubId);

  const { data: organizers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/clubs", clubId, "organizers"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/organizers`);
      if (!res.ok) throw new Error("Failed to fetch organizers");
      return res.json();
    },
    enabled: !!clubId,
  });

  const createOrganizerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", `/api/clubs/${clubId}/organizers`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create organizer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Organizer created", description: "The organizer can now log in and manage sessions." });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs", clubId, "organizers"] });
      setIsDialogOpen(false);
      setFormData({ fullName: "", email: "", password: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create organizer",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    createOrganizerMutation.mutate(formData);
  };

  if (!clubId) {
    return <div className="p-6 text-center text-muted-foreground">Invalid club</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/club-admin")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Manage Organizers</h1>
          <p className="text-muted-foreground">{club?.name || "Club"}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Organizers
            </CardTitle>
            <CardDescription>
              Organizers can log in to manage sessions and matches for your club
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-organizer">
                <UserPlus className="w-4 h-4 mr-2" /> Add Organizer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organizer</DialogTitle>
                <DialogDescription>
                  Create a new user account with organizer permissions for this club.
                  They will be able to manage sessions and matches.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
                    data-testid="input-organizer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="organizer@club.com"
                    data-testid="input-organizer-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="At least 6 characters"
                    data-testid="input-organizer-password"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOrganizerMutation.isPending} data-testid="button-submit-organizer">
                    {createOrganizerMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Organizer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : organizers && organizers.length > 0 ? (
            <div className="space-y-3">
              {organizers.map((org: any) => (
                <div 
                  key={org.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  data-testid={`organizer-${org.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${org.user.fullName}`} />
                      <AvatarFallback>{org.user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{org.user.fullName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {org.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Organizer
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No organizers yet</p>
              <p className="text-sm">Add an organizer to help manage your club sessions</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">What can organizers do?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• View and manage session signups</li>
            <li>• Create and edit matches</li>
            <li>• Start and complete matches</li>
            <li>• Swap players in matches</li>
            <li>• Edit match scores</li>
            <li>• Track shuttle tube usage</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Settings, Shield, Loader2, XCircle, ArrowLeft, MapPin, Phone, Calendar, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profiles } = useQuery<any[]>({
    queryKey: ["/api/player-profiles"],
    enabled: !!user,
  });
  const { data: memberships } = useQuery<{ clubId: number; clubName: string; membershipStatus: string }[]>({
    queryKey: ["/api/user/memberships"],
    enabled: !!user,
  });
  const logout = useLogout();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    city: "",
    country: "",
  });
  const [closeReason, setCloseReason] = useState("");

  const profile = profiles?.[0];

  const isProfileComplete = !!(user?.fullName && user.fullName.trim().length >= 2);

  const updateUserProfileMutation = useMutation({
    mutationFn: async (data: { fullName?: string; phone?: string; dateOfBirth?: string; city?: string; country?: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/player-profiles"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeAccountMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", "/api/account/close", { reason });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to close account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Closed", description: "Your account has been closed. You will now be signed out." });
      queryClient.clear();
      navigate("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = () => {
    logout.mutate();
    navigate("/");
  };

  const startEditing = () => {
    setEditForm({
      fullName: user?.fullName || "",
      phone: (user as any)?.phone || "",
      dateOfBirth: (user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toISOString().split("T")[0] : "",
      city: (user as any)?.city || "",
      country: (user as any)?.country || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateUserProfileMutation.mutate({
      fullName: editForm.fullName,
      phone: editForm.phone,
      dateOfBirth: editForm.dateOfBirth || undefined,
      city: editForm.city,
      country: editForm.country,
    });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
            <p className="text-muted-foreground mb-4">Please log in to view your profile.</p>
            <Button onClick={() => navigate("/login")} data-testid="button-login">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </Link>
      </div>

      {!isProfileComplete && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Complete your profile</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please fill in your name and details below before requesting to join a club.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.fullName || "New User"}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="capitalize">{user.role.toLowerCase()}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium" data-testid="text-email">{user.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <p className="font-medium" data-testid="text-phone">{(user as any)?.phone || "Not set"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date of Birth
                </Label>
                <p className="font-medium" data-testid="text-dob">
                  {(user as any)?.dateOfBirth ? new Date((user as any).dateOfBirth).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> City
                </Label>
                <p className="font-medium" data-testid="text-city">{(user as any)?.city || "Not set"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Country
                </Label>
                <p className="font-medium" data-testid="text-country">{(user as any)?.country || "Not set"}</p>
              </div>
            </div>
            {profile && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{profile.category || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Gender</Label>
                  <p className="font-medium">{profile.gender || "Not set"}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {memberships && memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Club Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {memberships.map((m) => (
                <div key={m.clubId} className="flex items-center justify-between py-2" data-testid={`membership-${m.clubId}`}>
                  <span className="font-medium">{m.clubName}</span>
                  <Badge
                    variant={m.membershipStatus === "APPROVED" ? "default" : m.membershipStatus === "PENDING" ? "secondary" : "destructive"}
                    data-testid={`badge-membership-status-${m.clubId}`}
                  >
                    {m.membershipStatus === "APPROVED" ? "Member" : m.membershipStatus === "PENDING" ? "Pending" : m.membershipStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Your full name"
                  data-testid="input-fullname"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="Your phone number"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  data-testid="input-dob"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Your city"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    placeholder="Your country"
                    data-testid="input-country"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSave}
                  disabled={updateUserProfileMutation.isPending || !editForm.fullName.trim()}
                  data-testid="button-save-profile"
                >
                  {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={startEditing} data-testid="button-edit-profile">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Sign Out
          </CardTitle>
          <CardDescription>Log out of your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Close Account
          </CardTitle>
          <CardDescription>Permanently close your account. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-close-account">
                <XCircle className="h-4 w-4 mr-2" />
                Close My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to close your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently close your account. You will be signed out and will no longer be able to log in. Your data will be archived for administrative purposes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <Label htmlFor="closeReason">Reason (optional)</Label>
                <Input
                  id="closeReason"
                  placeholder="Tell us why you're leaving..."
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  data-testid="input-close-reason"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-close">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground"
                  onClick={() => closeAccountMutation.mutate(closeReason)}
                  disabled={closeAccountMutation.isPending}
                  data-testid="button-confirm-close"
                >
                  {closeAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Yes, Close My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

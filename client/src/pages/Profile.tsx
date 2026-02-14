import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUploadProfilePicture } from "@/hooks/use-sessions";
import { LogOut, User, Settings, Shield, Loader2, XCircle, ArrowLeft, MapPin, Phone, Calendar, AlertCircle, Camera, Wallet, TrendingUp, TrendingDown, History, CreditCard, Eye, EyeOff, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { mutate: uploadProfilePicture, isPending: isUploadingPic } = useUploadProfilePicture();
  const profilePicInputRef = useRef<HTMLInputElement>(null);
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

  const { data: creditBalances, isLoading: creditsLoading } = useQuery<{ clubId: number; clubName: string; balance: number }[]>({
    queryKey: ["/api/my-credits"],
    enabled: !!user,
  });
  const { data: creditHistory, isLoading: historyLoading } = useQuery<{
    id: number;
    clubId: number;
    amount: number;
    reason: string;
    linkedSessionId: number | null;
    attendanceStatus: string | null;
    createdAt: string;
    clubName: string;
    sessionTitle: string | null;
    sessionDate: string | null;
  }[]>({
    queryKey: ["/api/my-credits/history"],
    enabled: !!user,
  });

  const { data: outstandingPayments, isLoading: outstandingLoading } = useQuery<{
    signupId: number;
    sessionId: number;
    playerId: number;
    fee: number;
    paymentStatus: string;
    paymentMethod: string | null;
    paymentNotes: string | null;
    signupStatus: string;
    signupTime: string;
    sessionTitle: string;
    sessionDate: string;
    clubId: number;
    clubName: string;
  }[]>({
    queryKey: ["/api/my-outstanding-payments"],
    enabled: !!user,
  });

  const [showFullHistory, setShowFullHistory] = useState(false);
  const [privacyNickname, setPrivacyNickname] = useState("");
  const [privacyShowPublicName, setPrivacyShowPublicName] = useState(false);
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false);

  const [juniorDialogOpen, setJuniorDialogOpen] = useState(false);
  const [editingJunior, setEditingJunior] = useState<any>(null);
  const [deletingJuniorId, setDeletingJuniorId] = useState<number | null>(null);
  const [juniorForm, setJuniorForm] = useState({
    fullName: "",
    dateOfBirth: "",
    emergencyContact: "",
    medicalNotes: "",
  });

  const { data: juniors, isLoading: juniorsLoading } = useQuery<any[]>({
    queryKey: ["/api/juniors"],
    enabled: !!user,
  });

  const addJuniorMutation = useMutation({
    mutationFn: async (data: { fullName: string; dateOfBirth?: string; emergencyContact?: string; medicalNotes?: string }) => {
      const res = await apiRequest("POST", "/api/juniors", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add junior");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Junior added", description: "Junior account has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setJuniorDialogOpen(false);
      resetJuniorForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editJuniorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { fullName: string; dateOfBirth?: string; emergencyContact?: string; medicalNotes?: string } }) => {
      const res = await apiRequest("PATCH", `/api/juniors/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update junior");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Junior updated", description: "Junior account has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setJuniorDialogOpen(false);
      setEditingJunior(null);
      resetJuniorForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteJuniorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/juniors/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete junior");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Junior removed", description: "Junior account has been deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/juniors"] });
      setDeletingJuniorId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetJuniorForm = () => {
    setJuniorForm({ fullName: "", dateOfBirth: "", emergencyContact: "", medicalNotes: "" });
  };

  const openAddJuniorDialog = () => {
    setEditingJunior(null);
    resetJuniorForm();
    setJuniorDialogOpen(true);
  };

  const openEditJuniorDialog = (junior: any) => {
    setEditingJunior(junior);
    setJuniorForm({
      fullName: junior.fullName || "",
      dateOfBirth: junior.dateOfBirth ? new Date(junior.dateOfBirth).toISOString().split("T")[0] : "",
      emergencyContact: junior.emergencyContact || "",
      medicalNotes: junior.medicalNotes || "",
    });
    setJuniorDialogOpen(true);
  };

  const handleSaveJunior = () => {
    const payload = {
      fullName: juniorForm.fullName,
      dateOfBirth: juniorForm.dateOfBirth || undefined,
      emergencyContact: juniorForm.emergencyContact || undefined,
      medicalNotes: juniorForm.medicalNotes || undefined,
    };
    if (editingJunior) {
      editJuniorMutation.mutate({ id: editingJunior.id, data: payload });
    } else {
      addJuniorMutation.mutate(payload);
    }
  };

  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: { nickname?: string; showPublicName?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update privacy settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Privacy settings updated", description: "Your display preferences have been saved and will apply immediately." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingPrivacy(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const startEditingPrivacy = () => {
    setPrivacyNickname((user as any)?.nickname || "");
    setPrivacyShowPublicName((user as any)?.showPublicName || false);
    setIsEditingPrivacy(true);
  };

  const handleSavePrivacy = () => {
    updatePrivacyMutation.mutate({
      nickname: privacyNickname || undefined,
      showPublicName: privacyShowPublicName,
    });
  };

  const { data: clubMemberships } = useQuery<any[]>({
    queryKey: ["/api/my-memberships"],
    enabled: !!user,
  });

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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/account/close");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Deleted", description: "Your account has been permanently deleted. You can create a new account anytime." });
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
            <div className="relative">
              <Avatar className="h-16 w-16">
                {(user as any).profilePictureUrl ? (
                  <AvatarImage src={(user as any).profilePictureUrl} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-sm"
                onClick={() => profilePicInputRef.current?.click()}
                disabled={isUploadingPic}
                data-testid="button-upload-profile-pic"
              >
                {isUploadingPic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={profilePicInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadProfilePicture({ file });
                    e.target.value = "";
                  }
                }}
                data-testid="input-profile-pic"
              />
            </div>
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

      {clubMemberships && clubMemberships.filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING").length > 0 && (
        <Card data-testid="card-membership-expiry">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Active Memberships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clubMemberships!
                .filter((m: any) => m.status === "ACTIVE" || m.status === "EXPIRING")
                .map((m: any) => {
                  const daysRemaining = Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const colorClass = daysRemaining <= 0 ? "text-muted-foreground" : daysRemaining < 30 ? "text-red-600" : daysRemaining <= 60 ? "text-amber-500" : "text-green-600";
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-4 py-2" data-testid={`membership-expiry-${m.id}`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{m.clubName}</span>
                        <span className="text-sm text-muted-foreground">{m.planName}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${colorClass}`} data-testid={`text-days-remaining-${m.id}`}>
                          {daysRemaining <= 0 ? "EXPIRED" : `${daysRemaining} days`}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          expires {format(new Date(m.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-3">
              <Link href="/memberships">
                <Button variant="outline" size="sm" data-testid="button-view-memberships">View All Memberships</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {(creditsLoading || memberships) && (
        <Card data-testid="card-credit-balance">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Credit Balance
            </CardTitle>
            <CardDescription>Your available credit across clubs</CardDescription>
          </CardHeader>
          <CardContent>
            {creditsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <div className="space-y-3">
              {(() => {
                const balanceMap = new Map((creditBalances || []).map(cb => [cb.clubId, cb]));
                const allClubs = new Map<number, { clubId: number; clubName: string; balance: number }>();
                (memberships || []).forEach(m => {
                  if (!allClubs.has(m.clubId)) {
                    const existing = balanceMap.get(m.clubId);
                    allClubs.set(m.clubId, existing || { clubId: m.clubId, clubName: m.clubName, balance: 0 });
                  }
                });
                (creditBalances || []).forEach(cb => {
                  if (!allClubs.has(cb.clubId)) allClubs.set(cb.clubId, cb);
                });
                return Array.from(allClubs.values()).map((cb) => (
                  <div key={cb.clubId} className="flex items-center justify-between py-2" data-testid={`credit-balance-${cb.clubId}`}>
                    <span className="font-medium">{cb.clubName}</span>
                    <span className={`text-lg font-bold ${Number(cb.balance) > 0 ? "text-green-600" : Number(cb.balance) < 0 ? "text-red-600" : "text-muted-foreground"}`} data-testid={`text-credit-amount-${cb.clubId}`}>
                      {Number(cb.balance) > 0 ? "+" : ""}£{(Math.abs(Number(cb.balance)) / 100).toFixed(2)}
                    </span>
                  </div>
                ));
              })()}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {creditHistory && creditHistory.length > 0 && (
        <Card data-testid="card-credit-history">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Credit History
            </CardTitle>
            <CardDescription>Your credit transaction log (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showFullHistory ? creditHistory : creditHistory.slice(0, 5)).map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-credit-${entry.id}`}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">{entry.clubName}</TableCell>
                      <TableCell>
                        <span className={`font-medium flex items-center gap-1 ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.amount >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {entry.amount >= 0 ? "+" : ""}£{(Math.abs(entry.amount) / 100).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{entry.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.sessionTitle || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {creditHistory.length > 5 && (
              <div className="mt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFullHistory(!showFullHistory)}
                  data-testid="button-toggle-credit-history"
                >
                  {showFullHistory ? "Show Less" : `Show All (${creditHistory.length})`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(outstandingLoading || (outstandingPayments && outstandingPayments.length > 0)) && (
        <Card data-testid="card-outstanding-payments">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Outstanding Payments
            </CardTitle>
            <CardDescription>Unpaid session fees that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {outstandingLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const grouped = (outstandingPayments || []).reduce((acc, p) => {
                    if (!acc[p.clubName]) acc[p.clubName] = [];
                    acc[p.clubName].push(p);
                    return acc;
                  }, {} as Record<string, typeof outstandingPayments>);
                  return Object.entries(grouped).map(([clubName, payments]) => {
                    const total = (payments || []).reduce((sum, p) => sum + p.fee, 0);
                    return (
                      <div key={clubName} className="space-y-2" data-testid={`outstanding-club-${clubName}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{clubName}</span>
                          <Badge variant="secondary" data-testid={`badge-outstanding-total-${clubName}`}>
                            Total: £{(total / 100).toFixed(2)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {(payments || []).map((p) => (
                            <div key={p.signupId} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50" data-testid={`outstanding-item-${p.signupId}`}>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{p.sessionTitle}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(p.sessionDate), "MMM d, yyyy")}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-amber-600" data-testid={`text-outstanding-fee-${p.signupId}`}>
                                £{(p.fee / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy &amp; Display Settings
          </CardTitle>
          <CardDescription>Control how your name appears on public leaderboards and sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingPrivacy ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname / Display Name</Label>
                <Input
                  id="nickname"
                  value={privacyNickname}
                  onChange={(e) => setPrivacyNickname(e.target.value)}
                  placeholder="Enter a nickname (optional)"
                  data-testid="input-nickname"
                />
                <p className="text-xs text-muted-foreground">
                  If set, your nickname will be shown instead of your real name on public views.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="showPublicName" className="font-medium flex items-center gap-1.5">
                    {privacyShowPublicName ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    Show my name publicly
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, your {privacyNickname ? "nickname" : "name"} will be visible on public leaderboards and session pages.
                    When disabled, your name will appear blurred to other visitors.
                  </p>
                </div>
                <Switch
                  id="showPublicName"
                  checked={privacyShowPublicName}
                  onCheckedChange={setPrivacyShowPublicName}
                  data-testid="switch-show-public-name"
                />
              </div>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">How it works:</span>{" "}
                  {privacyShowPublicName
                    ? privacyNickname
                      ? `Your nickname "${privacyNickname}" will be shown on public rankings and sessions.`
                      : "Your real name will be shown on public rankings and sessions."
                    : "Your name will appear blurred on public rankings and sessions. Club admins can still see your real name internally."
                  }
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleSavePrivacy}
                  disabled={updatePrivacyMutation.isPending}
                  data-testid="button-save-privacy"
                >
                  {updatePrivacyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Privacy Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditingPrivacy(false)}
                  data-testid="button-cancel-privacy"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nickname</Label>
                  <p className="font-medium" data-testid="text-nickname">{(user as any)?.nickname || "Not set"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Public Name Visibility</Label>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(user as any)?.showPublicName ? (
                      <Badge variant="default" data-testid="badge-public-name-visible">
                        <Eye className="h-3 w-3 mr-1" />
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid="badge-public-name-blurred">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Blurred
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={startEditingPrivacy} variant="outline" data-testid="button-edit-privacy">
                <Settings className="h-4 w-4 mr-2" />
                Edit Display Settings
              </Button>
            </div>
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

      <Card data-testid="card-junior-accounts">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Junior Accounts
              </CardTitle>
              <CardDescription>Manage your children's accounts</CardDescription>
            </div>
            <Button onClick={openAddJuniorDialog} data-testid="button-add-junior">
              <Plus className="h-4 w-4 mr-2" />
              Add Junior
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {juniorsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : juniors && juniors.length > 0 ? (
            <div className="space-y-3">
              {juniors.map((junior: any) => (
                <div
                  key={junior.id}
                  className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
                  data-testid={`junior-row-${junior.id}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" data-testid={`text-junior-name-${junior.id}`}>{junior.fullName}</span>
                    {junior.dateOfBirth && (
                      <span className="text-sm text-muted-foreground" data-testid={`text-junior-dob-${junior.id}`}>
                        DOB: {format(new Date(junior.dateOfBirth), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditJuniorDialog(junior)}
                      data-testid={`button-edit-junior-${junior.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingJuniorId(junior.id)}
                      data-testid={`button-delete-junior-${junior.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-juniors">No junior accounts added yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={juniorDialogOpen} onOpenChange={(open) => { if (!open) { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); } }}>
        <DialogContent className="bg-background" data-testid="dialog-junior-form">
          <DialogHeader>
            <DialogTitle>{editingJunior ? "Edit Junior" : "Add Junior"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="juniorFullName">Full Name *</Label>
              <Input
                id="juniorFullName"
                value={juniorForm.fullName}
                onChange={(e) => setJuniorForm({ ...juniorForm, fullName: e.target.value })}
                placeholder="Child's full name"
                data-testid="input-junior-fullname"
              />
            </div>
            <div>
              <Label htmlFor="juniorDob">Date of Birth</Label>
              <Input
                id="juniorDob"
                type="date"
                value={juniorForm.dateOfBirth}
                onChange={(e) => setJuniorForm({ ...juniorForm, dateOfBirth: e.target.value })}
                data-testid="input-junior-dob"
              />
            </div>
            <div>
              <Label htmlFor="juniorEmergency">Emergency Contact</Label>
              <Input
                id="juniorEmergency"
                value={juniorForm.emergencyContact}
                onChange={(e) => setJuniorForm({ ...juniorForm, emergencyContact: e.target.value })}
                placeholder="Emergency contact number"
                data-testid="input-junior-emergency"
              />
            </div>
            <div>
              <Label htmlFor="juniorMedical">Medical Notes</Label>
              <Textarea
                id="juniorMedical"
                value={juniorForm.medicalNotes}
                onChange={(e) => setJuniorForm({ ...juniorForm, medicalNotes: e.target.value })}
                placeholder="Any medical conditions or allergies"
                data-testid="input-junior-medical"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setJuniorDialogOpen(false); setEditingJunior(null); resetJuniorForm(); }}
              data-testid="button-cancel-junior"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveJunior}
              disabled={!juniorForm.fullName.trim() || addJuniorMutation.isPending || editJuniorMutation.isPending}
              data-testid="button-save-junior"
            >
              {(addJuniorMutation.isPending || editJuniorMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingJunior ? "Save Changes" : "Add Junior"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingJuniorId !== null} onOpenChange={(open) => { if (!open) setDeletingJuniorId(null); }}>
        <AlertDialogContent className="bg-background" data-testid="dialog-delete-junior">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Junior Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this junior account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-junior">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (deletingJuniorId) deleteJuniorMutation.mutate(deletingJuniorId); }}
              disabled={deleteJuniorMutation.isPending}
              data-testid="button-confirm-delete-junior"
            >
              {deleteJuniorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>Permanently delete your account and all associated data. You can create a new account in the future.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-account">
                <XCircle className="h-4 w-4 mr-2" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your data, including match history, club memberships, and session signups. You will be signed out immediately. You can create a new account in the future using the same email.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground"
                  onClick={() => deleteAccountMutation.mutate()}
                  disabled={deleteAccountMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteAccountMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Yes, Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

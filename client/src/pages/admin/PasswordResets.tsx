import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Loader2, KeyRound, Copy, Clock, Search, UserCog, Eye, EyeOff,
  Link as LinkIcon, ShieldCheck, AlertCircle
} from "lucide-react";

interface PasswordReset {
  id: number;
  fullName: string;
  email: string;
  passwordResetToken: string;
  passwordResetExpiry: string;
}

interface SearchUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function PasswordResets() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: resets, isLoading } = useQuery<PasswordReset[]>({
    queryKey: ["/api/admin/password-resets"],
  });

  const { data: searchResults, isFetching: isSearching } = useQuery<SearchUser[]>({
    queryKey: ["/api/admin/search-users", searchQuery],
    queryFn: async () => {
      if (searchQuery.trim().length < 2) return [];
      const res = await fetch(`/api/admin/search-users?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const generateResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/admin/generate-reset", { email });
      return res.json();
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/reset-password/${data.token}`;
      setGeneratedLink(link);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-resets"] });
      toast({
        title: "Reset Link Generated",
        description: `A password reset link has been created for ${data.fullName}. Copy it and share with the user.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed",
        description: err.message || "Could not generate reset link",
        variant: "destructive",
      });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/set-password", { userId, password });
      return res.json();
    },
    onSuccess: (data) => {
      setNewPassword("");
      setSelectedUser(null);
      setSearchQuery("");
      setGeneratedLink(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/password-resets"] });
      toast({
        title: "Password Updated",
        description: data.message,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed",
        description: err.message || "Could not set password",
        variant: "destructive",
      });
    },
  });

  function copyResetLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link Copied",
        description: "The reset link has been copied to your clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: `Reset link: ${link}`,
        variant: "destructive",
      });
    });
  }

  const handleSelectUser = useCallback((user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setGeneratedLink(null);
    setNewPassword("");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <KeyRound className="h-6 w-6" />
          Password Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Search for any user to generate a reset link or set their password directly.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Reset a User's Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length < 2) {
                  setSelectedUser(null);
                  setGeneratedLink(null);
                }
              }}
              className="pl-9"
              data-testid="input-search-user"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchResults && searchResults.length > 0 && !selectedUser && (
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 p-3 text-left hover-elevate"
                  onClick={() => handleSelectUser(user)}
                  data-testid={`button-select-user-${user.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim().length >= 2 && searchResults && searchResults.length === 0 && !isSearching && !selectedUser && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md">
              <AlertCircle className="h-4 w-4" />
              No users found matching "{searchQuery}"
            </div>
          )}

          {selectedUser && (
            <Card className="bg-muted/30">
              <CardContent className="py-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedUser.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium" data-testid="text-selected-user-name">{selectedUser.fullName}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-selected-user-email">{selectedUser.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setGeneratedLink(null);
                      setNewPassword("");
                    }}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Option 1: Generate Reset Link
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creates a link the user can use to set their own password. Valid for 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => generateResetMutation.mutate(selectedUser.email)}
                      disabled={generateResetMutation.isPending}
                      data-testid="button-generate-reset-link"
                    >
                      {generateResetMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="mr-2 h-4 w-4" />
                      )}
                      Generate Reset Link
                    </Button>
                    {generatedLink && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-background border rounded-md">
                          <Input
                            readOnly
                            value={generatedLink}
                            className="text-xs border-0 p-0 h-auto focus-visible:ring-0"
                            data-testid="input-generated-link"
                          />
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => copyResetLink(generatedLink)}
                          data-testid="button-copy-generated-link"
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Option 2: Set Password Directly
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Set a new password immediately. Share it with the user securely.
                    </p>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="New password (min 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                        data-testid="input-set-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setPasswordMutation.mutate({
                        userId: selectedUser.id,
                        password: newPassword,
                      })}
                      disabled={setPasswordMutation.isPending || newPassword.length < 6}
                      data-testid="button-set-password"
                    >
                      {setPasswordMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}
                      Set Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Reset Requests
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Users who requested a password reset from the login page. Copy the link and share it with them.
        </p>

        {!resets || resets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <KeyRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-lg font-medium" data-testid="text-no-resets">No pending reset requests</p>
              <p className="text-muted-foreground text-sm mt-1">
                When users request a password reset from the login page, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {resets.map((reset) => {
              const expiresAt = new Date(reset.passwordResetExpiry);
              const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
              const resetLink = `${window.location.origin}/reset-password/${reset.passwordResetToken}`;

              return (
                <Card key={reset.id} data-testid={`card-reset-${reset.id}`}>
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {reset.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium" data-testid={`text-name-${reset.id}`}>{reset.fullName}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-email-${reset.id}`}>{reset.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Expires in {hoursLeft}h ({format(expiresAt, "PPp")})
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyResetLink(resetLink)}
                        data-testid={`button-copy-link-${reset.id}`}
                      >
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        Copy Link
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSelectUser({
                          id: reset.id,
                          fullName: reset.fullName,
                          email: reset.email,
                          role: "",
                        })}
                        data-testid={`button-manage-${reset.id}`}
                      >
                        <UserCog className="mr-2 h-3.5 w-3.5" />
                        Set Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

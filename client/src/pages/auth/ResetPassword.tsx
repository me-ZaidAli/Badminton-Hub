import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const { data: validation, isLoading: validating } = useQuery<{ valid: boolean; fullName?: string }>({
    queryKey: ["/api/reset-password/validate", token],
    queryFn: async () => {
      const res = await fetch("/api/reset-password/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return res.json();
    },
    enabled: !!token,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/reset-password", { token, password });
      const data = await res.json();
      setSuccess(true);
      toast({ title: "Success", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="text-reset-success">Password Reset Complete</CardTitle>
            <CardDescription className="text-base">
              Your password has been updated successfully. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full" data-testid="button-go-to-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="text-reset-invalid">
              {token ? "Link Expired" : "Password Reset"}
            </CardTitle>
            <CardDescription className="text-base">
              {token
                ? "This reset link has expired or is invalid. Please contact your club administrator to get a new one."
                : "To reset your password, please contact your club administrator. They can generate a reset link for you from the admin panel."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2" data-testid="text-reset-instructions">
              <p className="font-medium text-foreground">How to get your password reset:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Contact your club admin or owner</li>
                <li>Ask them to reset your password from the admin panel</li>
                <li>They will share a reset link with you</li>
                <li>Open the link and set your new password</li>
              </ol>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <KeyRound className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-reset-title">Set New Password</CardTitle>
          <CardDescription className="text-base">
            {validation.fullName ? `Hi ${validation.fullName}, enter` : "Enter"} your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={6}
                data-testid="input-confirm-password"
              />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-destructive" data-testid="text-password-mismatch">Passwords do not match</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
              data-testid="button-reset-password"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

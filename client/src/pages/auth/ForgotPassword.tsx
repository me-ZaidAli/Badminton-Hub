import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="text-forgot-sent">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              If an account exists with that email address, we've sent a password reset link. Please check your inbox and spam folder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2" data-testid="text-reset-help">
              <p className="font-medium text-foreground">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email</li>
                <li>Wait a few minutes and try again</li>
                <li>Contact your club admin if the problem persists</li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setSent(false); setEmail(""); }}
              data-testid="button-try-again"
            >
              Try Another Email
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
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
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-forgot-title">Forgot Your Password?</CardTitle>
          <CardDescription className="text-base">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoFocus
                data-testid="input-forgot-email"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !email.trim()}
              data-testid="button-send-reset"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Reset Link
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full" data-testid="button-back-to-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

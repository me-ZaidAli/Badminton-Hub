import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <ShieldAlert className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-forgot-title">Forgot Your Password?</CardTitle>
          <CardDescription className="text-base">
            To reset your password, please contact your club administrator. They can generate a password reset link for you.
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

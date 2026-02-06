import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Loader2, KeyRound, Copy, Clock } from "lucide-react";

interface PasswordReset {
  id: number;
  fullName: string;
  email: string;
  passwordResetToken: string;
  passwordResetExpiry: string;
}

export default function PasswordResets() {
  const { toast } = useToast();

  const { data: resets, isLoading } = useQuery<PasswordReset[]>({
    queryKey: ["/api/admin/password-resets"],
  });

  function copyResetLink(token: string) {
    const url = `${window.location.origin}/reset-password/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied",
        description: "The reset link has been copied to your clipboard. Share it with the user.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: `Reset link: ${url}`,
        variant: "destructive",
      });
    });
  }

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
          Password Resets
        </h1>
        <p className="text-muted-foreground mt-1">
          Users who have requested a password reset. Copy the reset link and share it with them.
        </p>
      </div>

      {!resets || resets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <KeyRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg font-medium" data-testid="text-no-resets">No pending password reset requests</p>
            <p className="text-muted-foreground text-sm mt-1">
              When users request a password reset, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resets.map((reset) => {
            const expiresAt = new Date(reset.passwordResetExpiry);
            const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

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
                  <Button
                    variant="outline"
                    onClick={() => copyResetLink(reset.passwordResetToken)}
                    data-testid={`button-copy-link-${reset.id}`}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Reset Link
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Search, LogOut, Building2, RefreshCw } from "lucide-react";
import { useLogout, useUser } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

export default function PendingApproval() {
  const { mutate: logout } = useLogout();
  const { data: user } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasApproved = user?.playerProfiles?.some(
      (p: any) => p.membershipStatus === "APPROVED"
    ) || user?.playerProfile?.membershipStatus === "APPROVED";
    if (hasApproved) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Membership Pending</CardTitle>
          <CardDescription className="text-base">
            Your request to join the club is being reviewed. You'll receive access once a club administrator approves your membership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
            This usually takes a few hours. Please check back later or contact the club administrator if you have questions.
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] })}
              data-testid="button-check-status"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
            <Link href="/clubs">
              <Button variant="outline" className="w-full" data-testid="button-browse-clubs">
                <Search className="w-4 h-4 mr-2" />
                Browse Other Clubs
              </Button>
            </Link>
            <Link href="/create-club">
              <Button variant="outline" className="w-full" data-testid="button-create-own-club">
                <Building2 className="w-4 h-4 mr-2" />
                Start Your Own Club
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => logout()}
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

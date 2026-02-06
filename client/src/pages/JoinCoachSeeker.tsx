import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GraduationCap, CreditCard, CheckCircle, Shield, Users, MapPin, Phone, Loader2 } from "lucide-react";

export default function JoinCoachSeeker() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const { data: membership, isLoading: membershipLoading, error: membershipError } = useQuery<any>({
    queryKey: ["/api/coach-seeker/me"],
    enabled: !!user,
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach-seeker/join");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your membership request has been submitted. An admin will contact you soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-seeker/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit membership request",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach-seeker/cancel");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Membership Cancelled",
        description: "Your coach seeker membership has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coach-seeker/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel membership",
        variant: "destructive",
      });
    },
  });

  if (userLoading || membershipLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Not Logged In</h2>
            <p className="text-muted-foreground mb-4">Please log in to join as a coach seeker.</p>
            <Button onClick={() => navigate("/login")} data-testid="button-login">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = membership?.status;

  if (status === "ACTIVE") {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold" data-testid="text-active-membership">
              You already have an active membership
            </h2>
            <p className="text-muted-foreground">
              You have full access to the coach directory.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link href="/find-coach">
                <Button data-testid="link-find-coach">
                  <Users className="w-4 h-4 mr-2" />
                  Find a Coach
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                data-testid="button-cancel-membership"
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Membership"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-yellow-500" />
            <h2 className="text-xl font-semibold" data-testid="text-pending-membership">
              Membership Pending
            </h2>
            <Badge variant="secondary" data-testid="badge-pending">Pending Approval</Badge>
            <p className="text-muted-foreground" data-testid="text-pending-message">
              Your membership is pending admin approval. Admin will contact you to arrange payment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle data-testid="text-heading">Find a Badminton Coach</CardTitle>
              <CardDescription>
                Get access to qualified badminton coaches in your area
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">What you get</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Full Coach Directory</p>
                  <p className="text-sm text-muted-foreground">
                    Access to our complete directory of qualified badminton coaches
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Contact Details</p>
                  <p className="text-sm text-muted-foreground">
                    Get direct contact details for coaches to arrange sessions
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Location-Based Search</p>
                  <p className="text-sm text-muted-foreground">
                    Find coaches near you with location-based search
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertTitle data-testid="text-pricing">Pricing</AlertTitle>
              <AlertDescription data-testid="text-pricing-detail">
                <span className="font-semibold">£10 per month</span> - Cancel anytime
              </AlertDescription>
            </Alert>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-lg">How it works</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">1</Badge>
                <p className="text-sm">Sign up below</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">2</Badge>
                <p className="text-sm">Admin will contact you to arrange payment</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">3</Badge>
                <p className="text-sm">Once confirmed, access full coach directory</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure & Flexible</AlertTitle>
              <AlertDescription>
                Your membership can be cancelled at any time. No long-term commitments.
              </AlertDescription>
            </Alert>
          </div>

          <Button
            className="w-full"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            data-testid="button-join-now"
          >
            {joinMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Join Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

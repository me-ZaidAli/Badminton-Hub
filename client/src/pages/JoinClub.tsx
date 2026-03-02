import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Club } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Check, Loader2, MapPin, ScrollText, ShieldCheck, Gift, CheckCircle2, XCircle } from "lucide-react";
import { SocialLinksDisplay } from "@/components/SocialLinks";

export default function JoinClub() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<{ valid: boolean; referrerName?: string; message?: string } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const { data: club, isLoading: clubLoading } = useQuery<Club>({
    queryKey: ["/api/clubs", id],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${id}`);
      if (!res.ok) throw new Error("Club not found");
      return res.json();
    },
    enabled: !!id,
  });

  const hasPolicies = !!(club?.clubPolicies || club?.clubStandards);

  async function validateReferralCode(code: string) {
    if (!code.trim()) {
      setReferralStatus(null);
      return;
    }
    setValidatingCode(true);
    try {
      const res = await fetch(`/api/referrals/validate/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setReferralStatus(data);
    } catch {
      setReferralStatus({ valid: false, message: "Failed to validate code" });
    } finally {
      setValidatingCode(false);
    }
  }

  const joinMutation = useMutation({
    mutationFn: async (data: { clubId: number; referralCode?: string }) => {
      const res = await apiRequest("POST", "/api/clubs/join", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join club");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Join request submitted",
        description: referralStatus?.valid
          ? "Your referral code has been applied. The club admin will review your request."
          : "The club admin will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/pending-approval");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJoin = () => {
    if (!id) return;
    if (hasPolicies && !policiesAccepted) {
      toast({
        title: "Please accept policies",
        description: "You must agree to the club policies and standards before joining.",
        variant: "destructive",
      });
      return;
    }
    const payload: { clubId: number; referralCode?: string } = { clubId: Number(id) };
    if (referralCode.trim() && referralStatus?.valid) {
      payload.referralCode = referralCode.trim();
    }
    joinMutation.mutate(payload);
  };

  if (clubLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="space-y-8">
        <PageHeader title="Club Not Found" description="This club doesn't exist." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader 
        title={`Join ${club.name}`} 
        description="Review club details and submit your request to join."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-club-name">
            <Users className="w-5 h-5" />
            {club.name}
          </CardTitle>
          <CardDescription data-testid="text-club-description">
            {club.description || "A great place to play and meet fellow players."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {club.city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-club-location">
              <MapPin className="w-4 h-4" />
              {[club.address, club.city, club.postcode].filter(Boolean).join(", ")}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {club.sessionFee != null && (
              <Badge variant="outline" data-testid="badge-session-fee">
                Session: {"\u00A3"}{(club.sessionFee / 100).toFixed(2)}
              </Badge>
            )}
            {club.hasMembership && club.membershipFee != null && (
              <Badge variant="outline" data-testid="badge-membership-fee">
                Membership: {"\u00A3"}{(club.membershipFee / 100).toFixed(2)}/yr
              </Badge>
            )}
            {club.hasCompetitions && (
              <Badge variant="outline" data-testid="badge-competitions">Competitions</Badge>
            )}
            {club.hasSocialGames && (
              <Badge variant="outline" data-testid="badge-social-games">Social Games</Badge>
            )}
            {club.providesTraining && (
              <Badge variant="outline" data-testid="badge-training">Training Available</Badge>
            )}
          </div>

          <SocialLinksDisplay links={(club as any).socialLinks || []} variant="buttons" />
        </CardContent>
      </Card>

      {hasPolicies && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="w-5 h-5" />
              Club Policies & Standards
            </CardTitle>
            <CardDescription>
              Please review the following before requesting to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {club.clubPolicies && (
              <div data-testid="section-club-policies">
                <h4 className="text-sm font-medium mb-2">Club Policies</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                  {club.clubPolicies}
                </div>
              </div>
            )}

            {club.clubStandards && (
              <div data-testid="section-club-standards">
                <h4 className="text-sm font-medium mb-2">Standards & Expectations</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                  {club.clubStandards}
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 pt-2 border-t">
              <Checkbox
                id="accept-policies"
                checked={policiesAccepted}
                onCheckedChange={(checked) => setPoliciesAccepted(checked === true)}
                data-testid="checkbox-accept-policies"
              />
              <label
                htmlFor="accept-policies"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and agree to the club policies and standards listed above
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="w-5 h-5" />
            Referral Code
          </CardTitle>
          <CardDescription>
            Were you referred by an existing member? Enter their referral code below (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="referral-code">Referral Code</Label>
            <div className="flex gap-2">
              <Input
                id="referral-code"
                placeholder="e.g. REF-A1B2C3D4"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  if (!e.target.value.trim()) setReferralStatus(null);
                }}
                className="flex-1"
                data-testid="input-referral-code"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => validateReferralCode(referralCode)}
                disabled={!referralCode.trim() || validatingCode}
                data-testid="button-validate-referral"
              >
                {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>

          {referralStatus && (
            <div
              className={`flex items-center gap-2 text-sm rounded-md p-3 ${
                referralStatus.valid
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-destructive/10 text-destructive"
              }`}
              data-testid="text-referral-status"
            >
              {referralStatus.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Valid referral from <strong>{referralStatus.referrerName}</strong></span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{referralStatus.message || "Invalid referral code"}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="bg-muted/50 rounded-md p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              What happens next?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Your request will be sent to the club admin
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                Once approved, you'll have access to the club
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                You can sign up for sessions and track rankings
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleJoin}
            className="w-full"
            disabled={joinMutation.isPending || (hasPolicies && !policiesAccepted)}
            data-testid="button-submit-join"
          >
            {joinMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Join Request"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

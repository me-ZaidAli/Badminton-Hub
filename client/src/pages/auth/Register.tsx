import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff, Shield, KeyRound, Gift, Check, Loader2, Megaphone, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ACQUISITION_OPTIONS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "WEBSITE", label: "Website" },
  { value: "WORD_OF_MOUTH", label: "Word of Mouth" },
  { value: "LEISURE_CENTRE", label: "Leisure Centre" },
  { value: "SAW_SESSION", label: "Saw a Session Running" },
  { value: "THROUGH_COACH", label: "Through a Coach" },
  { value: "REFERRAL", label: "Referral Link / Code" },
  { value: "OTHER", label: "Other" },
] as const;

const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  nickname: z.string().optional(),
  showPublicName: z.boolean().default(false),
  username: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  dateOfBirth: z.string().optional(),
  isJunior: z.boolean().default(false),
  parentGuardianName: z.string().optional(),
  parentGuardianEmail: z.string().optional(),
  acquisitionSource: z.string().min(1, "Please tell us how you heard about us"),
  acquisitionSourceOther: z.string().optional(),
  confirmAccurate: z.boolean().refine(val => val === true, { message: "You must confirm your information is accurate" }),
  acceptTerms: z.boolean().refine(val => val === true, { message: "You must agree to the Terms & Conditions" }),
  acceptPrivacy: z.boolean().refine(val => val === true, { message: "You must agree to the Privacy Policy" }),
  parentalConsent: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.isJunior) {
      return !!data.parentGuardianName && data.parentGuardianName.length >= 2;
    }
    return true;
  },
  { message: "Parent/guardian name is required for junior accounts", path: ["parentGuardianName"] }
).refine(
  (data) => {
    if (data.isJunior) {
      return !!data.parentGuardianEmail && data.parentGuardianEmail.includes("@");
    }
    return true;
  },
  { message: "A valid parent/guardian email is required for junior accounts", path: ["parentGuardianEmail"] }
).refine(
  (data) => {
    if (data.isJunior) {
      return data.parentalConsent === true;
    }
    return true;
  },
  { message: "Parental consent is required for junior accounts", path: ["parentalConsent"] }
).refine(
  (data) => {
    if (data.acquisitionSource === "OTHER") {
      return !!data.acquisitionSourceOther && data.acquisitionSourceOther.trim().length > 0;
    }
    return true;
  },
  { message: "Please tell us how you heard about us", path: ["acquisitionSourceOther"] }
);

export default function Register() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimFullName, setClaimFullName] = useState("");
  const [showClaimPassword, setShowClaimPassword] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralReferrer, setReferralReferrer] = useState("");
  const [referralClubName, setReferralClubName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
      validateReferralCode(ref);
    }
  }, [searchString]);

  async function validateReferralCode(code: string) {
    if (!code.trim()) {
      setReferralValid(null);
      setReferralReferrer("");
      setReferralClubName("");
      return;
    }
    setReferralValidating(true);
    try {
      const res = await fetch(`/api/referrals/validate/${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await res.json();
      setReferralValid(data.valid);
      setReferralReferrer(data.referrerName || "");
      setReferralClubName(data.clubName || "");
    } catch {
      setReferralValid(false);
    } finally {
      setReferralValidating(false);
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      nickname: "",
      showPublicName: false,
      username: "",
      password: "",
      dateOfBirth: "",
      isJunior: false,
      parentGuardianName: "",
      parentGuardianEmail: "",
      acquisitionSource: "",
      acquisitionSourceOther: "",
      confirmAccurate: false,
      acceptTerms: false,
      acceptPrivacy: false,
      parentalConsent: false,
    },
  });

  const isJunior = form.watch("isJunior");
  const acquisitionSource = form.watch("acquisitionSource");

  useEffect(() => {
    if (referralCode.trim() && referralValid === true) {
      form.setValue("acquisitionSource", "REFERRAL");
    }
  }, [referralValid, referralCode]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const acceptedPolicies = ["TERMS_CONDITIONS", "PRIVACY_POLICY"];
    if (values.isJunior) {
      acceptedPolicies.push("JUNIOR_PARENTAL_CONSENT");
    }

    const effectiveSource = referralCode.trim() ? "REFERRAL" : values.acquisitionSource;

    fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: values.fullName,
        nickname: values.nickname || undefined,
        showPublicName: values.showPublicName,
        email: values.username,
        password: values.password,
        dateOfBirth: values.dateOfBirth || undefined,
        isJunior: values.isJunior,
        parentGuardianName: values.isJunior ? values.parentGuardianName : undefined,
        parentGuardianEmail: values.isJunior ? values.parentGuardianEmail : undefined,
        acquisitionSource: effectiveSource,
        acquisitionSourceOther: effectiveSource === "OTHER" ? values.acquisitionSourceOther : undefined,
        acceptedPolicies,
      }),
      credentials: "include"
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.code === "EMAIL_EXISTS") {
            if (data?.canClaim) {
              setClaimEmail(values.username);
              setClaimFullName(values.fullName);
              setClaimPassword("");
              setShowClaimDialog(true);
              return;
            }
            throw new Error("An account with this email already exists. Please sign in instead.");
          }
          throw new Error(data?.message || "Registration failed");
        }
        if (referralCode.trim()) {
          try {
            await fetch("/api/referrals/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: referralCode.trim().toUpperCase() }),
              credentials: "include",
            });
          } catch {}
        }
        toast({ title: "Account created", description: "Welcome! Complete your profile and browse clubs to get started." });
        setLocation("/clubs");
      })
      .catch(err => {
        console.error(err);
        toast({ title: "Registration failed", description: err.message || "Please check your details and try again.", variant: "destructive" });
      });
  }

  function handleClaimAccount() {
    if (!claimPassword || claimPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setClaimPending(true);
    fetch("/api/auth/claim-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: claimEmail,
        password: claimPassword,
        fullName: claimFullName || undefined,
      }),
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Failed to claim account");
        }
        toast({ title: "Account claimed", description: "Your password has been set. You can now log in." });
        setShowClaimDialog(false);
        setLocation("/login");
      })
      .catch(err => {
        toast({ title: "Claim failed", description: err.message, variant: "destructive" });
      })
      .finally(() => setClaimPending(false));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Join Club Master and start playing today</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-full-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-md border border-border bg-muted/50 p-3 space-y-3" data-testid="text-privacy-notice">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Sessions and rankings are publicly visible. By default, your name will be blurred on public views to protect your privacy. You can opt in below to display your name publicly.
                  </span>
                </div>
                <FormField
                  control={form.control}
                  name="showPublicName"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-show-public-name"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer text-sm">
                          I agree to display my name publicly on rankings and session lists
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          If unchecked, your name will be blurred on public pages but visible within your club's internal system.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Display name for public views" {...field} data-testid="input-nickname" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        If set, your nickname will be shown instead of your full name on public leaderboards and session lists.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 chars"
                          {...field}
                          className="pr-10"
                          data-testid="input-password"
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-birth" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Once set, this cannot be changed by you. Some clubs offer birthday rewards, so adding your date of birth is recommended.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isJunior"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-junior"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        This is a junior account (player under 18)
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Must be registered by a parent or guardian
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {isJunior && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Shield className="h-4 w-4" />
                      Parent / Guardian Details
                    </div>
                    <FormField
                      control={form.control}
                      name="parentGuardianName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} data-testid="input-parent-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentGuardianEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent/Guardian Email</FormLabel>
                          <FormControl>
                            <Input placeholder="parent@example.com" {...field} data-testid="input-parent-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentalConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-parental-consent"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer text-sm">
                              I confirm I am the parent or legal guardian of this junior player and I consent
                              to their account being created in accordance with the{" "}
                              <Link href="/junior-consent-policy" className="text-primary underline" target="_blank">
                                Junior &amp; Parental Consent Policy
                              </Link>
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Megaphone className="h-4 w-4 text-primary" />
                  How did you hear about us?
                </div>
                <FormField
                  control={form.control}
                  name="acquisitionSource"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          if (val !== "OTHER") {
                            form.setValue("acquisitionSourceOther", "");
                          }
                        }}
                        value={field.value}
                        disabled={!!referralCode.trim() && referralValid === true}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-acquisition-source">
                            <SelectValue placeholder="Please select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACQUISITION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} data-testid={`select-item-${opt.value.toLowerCase()}`}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {acquisitionSource === "OTHER" && (
                  <FormField
                    control={form.control}
                    name="acquisitionSourceOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Please tell us more..."
                            className="resize-none text-sm"
                            rows={2}
                            {...field}
                            data-testid="input-acquisition-other"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {referralCode.trim() && referralValid === true && (
                  <p className="text-xs text-muted-foreground">Automatically set to "Referral" because you have a valid referral code</p>
                )}
              </div>

              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Gift className="h-4 w-4 text-primary" />
                  Referral Code (optional)
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. REF-A1B2C3D4"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value);
                      setReferralValid(null);
                    }}
                    onBlur={() => validateReferralCode(referralCode)}
                    className="font-mono"
                    data-testid="input-referral-code"
                  />
                  {referralValidating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                  {!referralValidating && referralValid === true && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
                {referralValid === true && referralReferrer && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-green-500 text-white no-default-hover-elevate text-xs">Valid</Badge>
                    <span className="text-xs text-muted-foreground">Referred by {referralReferrer}</span>
                    {referralClubName && (
                      <span className="text-xs text-muted-foreground">for {referralClubName}</span>
                    )}
                  </div>
                )}
                {referralValid === false && (
                  <p className="text-xs text-destructive">Invalid or expired referral code</p>
                )}
                <p className="text-xs text-muted-foreground">Have a referral code? Enter it here to reward your friend</p>
              </div>

              <div className="space-y-3 border rounded-md p-4">
                <p className="text-sm font-medium">Required agreements</p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <Link href="/terms-conditions" target="_blank" className="text-sm text-primary underline font-medium" data-testid="link-view-terms">
                    View Terms &amp; Conditions
                  </Link>
                  <span className="text-xs text-muted-foreground">(opens in new tab)</span>
                </div>
                <FormField
                  control={form.control}
                  name="confirmAccurate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-accurate"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          I confirm that the information I have provided is accurate and up to date
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          I have read and agree to the{" "}
                          <Link href="/terms-conditions" className="text-primary underline" target="_blank">
                            Club Terms &amp; Conditions
                          </Link>{" "}
                          (Version 1 &ndash; 20/02/2026)
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acceptPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-privacy"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="cursor-pointer text-sm font-normal">
                          I agree to the{" "}
                          <Link href="/privacy-policy" className="text-primary underline" target="_blank">
                            Privacy Policy
                          </Link>{" "}
                          and consent to my data being processed for club management, session booking, and communication purposes
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                {form.formState.errors.confirmAccurate && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmAccurate.message}</p>
                )}
                {form.formState.errors.acceptTerms && (
                  <p className="text-sm text-destructive">{form.formState.errors.acceptTerms.message}</p>
                )}
                {form.formState.errors.acceptPrivacy && (
                  <p className="text-sm text-destructive">{form.formState.errors.acceptPrivacy.message}</p>
                )}
              </div>

              <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                After creating your account, complete your profile and browse clubs to request membership.
              </div>

              <Button type="submit" className="w-full font-semibold" disabled={isPending} data-testid="button-create-account">
                {isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent data-testid="dialog-claim-account">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Claim Your Account
            </DialogTitle>
            <DialogDescription>
              An account with the email <span className="font-semibold">{claimEmail}</span> already exists.
              Set a password below to claim it and log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={claimFullName}
                onChange={(e) => setClaimFullName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-claim-fullname"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Set Password</label>
              <div className="relative">
                <Input
                  type={showClaimPassword ? "text" : "password"}
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="pr-10"
                  data-testid="input-claim-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowClaimPassword(!showClaimPassword)}
                >
                  {showClaimPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>Cancel</Button>
            <Button onClick={handleClaimAccount} disabled={claimPending} data-testid="button-claim-account">
              {claimPending ? "Claiming..." : "Claim Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

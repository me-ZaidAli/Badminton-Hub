import { useState } from "react";
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
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Shield, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
);

export default function Register() {
  const [, setLocation] = useLocation();
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimFullName, setClaimFullName] = useState("");
  const [showClaimPassword, setShowClaimPassword] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const { toast } = useToast();

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
      confirmAccurate: false,
      acceptTerms: false,
      acceptPrivacy: false,
      parentalConsent: false,
    },
  });

  const isJunior = form.watch("isJunior");

  function onSubmit(values: z.infer<typeof formSchema>) {
    const acceptedPolicies = ["TERMS_CONDITIONS", "PRIVACY_POLICY"];
    if (values.isJunior) {
      acceptedPolicies.push("JUNIOR_PARENTAL_CONSENT");
    }

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

              <div className="space-y-3 border rounded-md p-4">
                <p className="text-sm font-medium">Required agreements</p>
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
                          I agree to the{" "}
                          <Link href="/terms-conditions" className="text-primary underline" target="_blank">
                            Terms &amp; Conditions
                          </Link>{" "}
                          of using the Club Master app
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

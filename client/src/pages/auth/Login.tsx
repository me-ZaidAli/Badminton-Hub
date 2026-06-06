import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useReopenAccount, LoginError } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useSearch } from "wouter";
import { Eye, EyeOff, AlertCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  username: z.string().min(1, "Email/Username is required"),
  password: z.string().min(1, "Password is required"),
});

function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  try {
    const decoded = decodeURIComponent(raw);
    // Only allow internal redirects that begin with a single forward slash
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {}
  return "/dashboard";
}

export default function Login() {
  const search = useSearch();
  const nextUrl = safeNext(new URLSearchParams(search).get("next"));
  const { mutate: login, isPending } = useLogin();
  const { mutate: reopenAccount, isPending: isReopening } = useReopenAccount();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [closedCredentials, setClosedCredentials] = useState<{ username: string; password: string } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError(null);
    setErrorCode(null);
    setClosedCredentials(null);
    login(values, {
      // Full-page nav (not wouter setLocation): the destination is usually a
      // lazy route, and a client-side wouter navigation goes through
      // useSyncExternalStore which React can't defer — suspending there throws
      // the "suspended on synchronous input" overlay. A hard load mounts the
      // destination fresh and guarantees a freshly-fetched session.
      onSuccess: () => window.location.assign(nextUrl),
      onError: (error: any) => {
        const code: string | undefined = error instanceof LoginError ? error.code : error?.code;
        if (code === "ACCOUNT_CLOSED") {
          setErrorCode("ACCOUNT_CLOSED");
          setClosedCredentials({ username: values.username, password: values.password });
          setLoginError(
            "Your account is currently closed. You can reopen it instantly with the button below — your data, sessions, and history will be restored."
          );
          return;
        }
        if (code === "ACCOUNT_MERGED") {
          setErrorCode("ACCOUNT_MERGED");
          setLoginError(error.message || "This account has been merged into another account.");
          return;
        }
        setLoginError(error.message || "Invalid email or password");
      },
    });
  }

  function handleReopen() {
    if (!closedCredentials) return;
    reopenAccount(closedCredentials, {
      onSuccess: () => {
        toast({
          title: "Welcome back!",
          description: "Your account has been reopened.",
        });
        window.location.assign(nextUrl);
      },
      onError: (error: any) => {
        setLoginError(error?.message || "Failed to reopen account. Please try again or contact your club administrator.");
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} className="h-11" />
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
                          placeholder="••••••••" 
                          {...field} 
                          className="h-11 pr-10"
                          data-testid="input-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-11 w-10 hover:bg-transparent"
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
              {loginError && (
                <div
                  className={`flex flex-col gap-2 p-3 rounded-md text-sm ${
                    errorCode === "ACCOUNT_CLOSED"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      : "bg-destructive/10 text-destructive"
                  }`}
                  data-testid="text-login-error"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                  {errorCode === "ACCOUNT_CLOSED" && closedCredentials && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10 mt-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-200 font-semibold gap-2"
                      onClick={handleReopen}
                      disabled={isReopening}
                      data-testid="button-reopen-account"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isReopening ? "Reopening account..." : "Reopen my account"}
                    </Button>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full h-11 font-semibold" disabled={isPending || isReopening} data-testid="button-login-submit">
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href={nextUrl !== "/dashboard" ? `/register?next=${encodeURIComponent(nextUrl)}` : "/register"} className="text-primary hover:underline font-medium">
              Join now
            </Link>
          </div>
          <div className="mt-3 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-home">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

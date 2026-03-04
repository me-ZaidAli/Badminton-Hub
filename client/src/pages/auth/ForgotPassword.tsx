import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      setSubmitted(true);
      toast({
        title: "Request Sent",
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold" data-testid="text-reset-submitted">Reset Request Sent</CardTitle>
            <CardDescription>
              If an account with that email exists, a password reset link has been sent to your email. Please check your inbox (and spam folder) for the reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        {...field}
                        className="h-11"
                        data-testid="input-forgot-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isSubmitting}
                data-testid="button-send-reset"
              >
                {isSubmitting ? "Sending..." : "Send Reset Request"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-login">
              <ArrowLeft className="inline mr-1 h-3 w-3" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

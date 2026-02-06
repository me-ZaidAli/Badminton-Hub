import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, GraduationCap, Loader2, Info, CheckCircle } from "lucide-react";

const registerCoachSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(5, "Phone number is required"),
  location: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  postcode: z.string().min(3, "Postcode is required"),
  areaCoverage: z.string().optional(),
  bio: z.string().optional(),
  qualifications: z.string().optional(),
  badmintonEnglandCert: z.boolean().default(false),
  yearsTraining: z.coerce.number().min(0).optional(),
  professionalCareer: z.string().optional(),
  experience: z.string().optional(),
});

type RegisterCoachFormData = z.infer<typeof registerCoachSchema>;

export default function RegisterCoach() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();

  const { data: existingCoach, isLoading: coachLoading, error: coachError } = useQuery<any>({
    queryKey: ["/api/coaches/me"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<RegisterCoachFormData>({
    resolver: zodResolver(registerCoachSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      city: "",
      postcode: "",
      areaCoverage: "",
      bio: "",
      qualifications: "",
      badmintonEnglandCert: false,
      yearsTraining: 0,
      professionalCareer: "",
      experience: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        ...form.getValues(),
        fullName: user.fullName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterCoachFormData) => {
      const res = await apiRequest("POST", "/api/coaches/register", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted",
        description: "Your coach profile has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      navigate("/coaches/me");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register as coach",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: RegisterCoachFormData) {
    registerMutation.mutate(data);
  }

  if (userLoading || coachLoading) {
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
            <p className="text-muted-foreground mb-4">Please log in to register as a coach.</p>
            <Button onClick={() => navigate("/login")} data-testid="button-login">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasExistingProfile = existingCoach && !coachError;

  if (hasExistingProfile) {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-already-registered">
              Already Registered as Coach
            </h2>
            <p className="text-muted-foreground mb-4">
              You have already registered as a coach. You can view or edit your profile.
            </p>
            <Button onClick={() => navigate("/coaches/me")} data-testid="button-view-profile">
              View Coach Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-6"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Complete the form below to register as a badminton coach. Your profile will be visible to players looking for coaching.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Register as Coach</CardTitle>
              <CardDescription>
                Fill in your details to create your coach profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <h3 className="font-semibold text-lg">Personal Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your full name"
                            data-testid="input-full-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="e.g., 07700 900000"
                          data-testid="input-phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6 space-y-6">
                <h3 className="font-semibold text-lg">Location</h3>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your address"
                          data-testid="input-location"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., London"
                            data-testid="input-city"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., SW1A 1AA"
                            data-testid="input-postcode"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="areaCoverage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area of Coverage</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., South London, Surrey"
                          data-testid="input-area-coverage"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6 space-y-6">
                <h3 className="font-semibold text-lg">About You</h3>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio / About</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell players about yourself, your coaching style, and what you offer..."
                          className="resize-none"
                          rows={4}
                          data-testid="input-bio"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6 space-y-6">
                <h3 className="font-semibold text-lg">Qualifications & Experience</h3>

                <FormField
                  control={form.control}
                  name="qualifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualifications</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Level 2 Badminton England Coach, UKCC Level 3..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-qualifications"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="badmintonEnglandCert"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-be-certified"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Badminton England Certified</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          I hold a valid Badminton England coaching certification
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsTraining"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Training Experience</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="e.g., 5"
                          data-testid="input-years-training"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="professionalCareer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Career Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your professional badminton career, competitions, achievements..."
                          className="resize-none"
                          rows={4}
                          data-testid="input-professional-career"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Summary</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Summarize your coaching experience and specialties..."
                          className="resize-none"
                          rows={4}
                          data-testid="input-experience"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  data-testid="button-submit"
                >
                  {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Register as Coach
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

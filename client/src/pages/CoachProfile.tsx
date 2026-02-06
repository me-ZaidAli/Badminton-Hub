import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GraduationCap, Loader2, Pencil, X } from "lucide-react";

const coachProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(5, "Phone number is required"),
  bio: z.string().optional(),
  location: z.string().optional(),
  city: z.string().min(2, "City is required"),
  postcode: z.string().min(3, "Postcode is required"),
  areaCoverage: z.string().optional(),
  qualifications: z.string().optional(),
  badmintonEnglandCert: z.boolean().default(false),
  yearsTraining: z.coerce.number().min(0).optional(),
  professionalCareer: z.string().optional(),
  experience: z.string().optional(),
});

type CoachProfileFormData = z.infer<typeof coachProfileSchema>;

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export default function CoachProfile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: coach, isLoading: coachLoading, error: coachError } = useQuery<any>({
    queryKey: ["/api/coaches/me"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<CoachProfileFormData>({
    resolver: zodResolver(coachProfileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      bio: "",
      location: "",
      city: "",
      postcode: "",
      areaCoverage: "",
      qualifications: "",
      badmintonEnglandCert: false,
      yearsTraining: 0,
      professionalCareer: "",
      experience: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CoachProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/coaches/me", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your coach profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update coach profile",
        variant: "destructive",
      });
    },
  });

  function startEditing() {
    if (coach) {
      form.reset({
        fullName: coach.fullName || "",
        email: coach.email || "",
        phone: coach.phone || "",
        bio: coach.bio || "",
        location: coach.location || "",
        city: coach.city || "",
        postcode: coach.postcode || "",
        areaCoverage: coach.areaCoverage || "",
        qualifications: coach.qualifications || "",
        badmintonEnglandCert: coach.badmintonEnglandCert || false,
        yearsTraining: coach.yearsTraining || 0,
        professionalCareer: coach.professionalCareer || "",
        experience: coach.experience || "",
      });
    }
    setIsEditing(true);
  }

  function onSubmit(data: CoachProfileFormData) {
    updateMutation.mutate(data);
  }

  if (userLoading || coachLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noProfile = !coach || coachError;

  if (noProfile) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-no-profile">
              No Coach Profile Found
            </h2>
            <p className="text-muted-foreground mb-4">
              You haven't registered as a coach yet. Register to create your profile.
            </p>
            <Link href="/register-coach">
              <Button data-testid="link-register-coach">Register as Coach</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container max-w-3xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={() => setIsEditing(false)}
          className="mb-6"
          data-testid="button-cancel-edit"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Editing
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Edit Coach Profile</CardTitle>
                <CardDescription>Update your coaching details</CardDescription>
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
                        <FormLabel>Address</FormLabel>
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
                    disabled={updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
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

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8 space-y-6">
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
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle data-testid="text-coach-name">{coach.fullName}</CardTitle>
                <CardDescription>Coach Profile</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={statusVariant[coach.status] || "secondary"}
                data-testid="badge-status"
              >
                {coach.status}
              </Badge>
              <Button onClick={startEditing} data-testid="button-edit">
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium" data-testid="text-full-name">{coach.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-email">{coach.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium" data-testid="text-phone">{coach.phone || "Not provided"}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-lg">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium" data-testid="text-location">{coach.location || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium" data-testid="text-city">{coach.city || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Postcode</p>
                <p className="font-medium" data-testid="text-postcode">{coach.postcode || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area Coverage</p>
                <p className="font-medium" data-testid="text-area-coverage">{coach.areaCoverage || "Not provided"}</p>
              </div>
            </div>
          </div>

          {coach.bio && (
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">About</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-bio">{coach.bio}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-lg">Qualifications & Experience</h3>
            {coach.qualifications && (
              <div>
                <p className="text-sm text-muted-foreground">Qualifications</p>
                <p className="font-medium whitespace-pre-wrap" data-testid="text-qualifications">{coach.qualifications}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Badminton England Certified</p>
                <p className="font-medium" data-testid="text-be-cert">
                  {coach.badmintonEnglandCert ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Years of Training</p>
                <p className="font-medium" data-testid="text-years-training">
                  {coach.yearsTraining != null ? coach.yearsTraining : "Not provided"}
                </p>
              </div>
            </div>
            {coach.professionalCareer && (
              <div>
                <p className="text-sm text-muted-foreground">Professional Career</p>
                <p className="font-medium whitespace-pre-wrap" data-testid="text-professional-career">{coach.professionalCareer}</p>
              </div>
            )}
            {coach.experience && (
              <div>
                <p className="text-sm text-muted-foreground">Experience Summary</p>
                <p className="font-medium whitespace-pre-wrap" data-testid="text-experience">{coach.experience}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

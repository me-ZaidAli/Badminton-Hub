import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCreateClub } from "@/hooks/use-clubs";
import { ArrowLeft, Building2, Loader2, Trophy, Users, GraduationCap, Clock, PoundSterling, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AGE_GROUPS = [
  { id: "junior", label: "Junior (Under 18)" },
  { id: "adult", label: "Adult (18-55)" },
  { id: "senior", label: "Senior (55+)" },
  { id: "mixed", label: "Mixed Age Groups" },
];

const createClubSchema = z.object({
  name: z.string().min(3, "Club name must be at least 3 characters").max(50, "Club name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  address: z.string().max(200, "Address must be less than 200 characters").optional(),
  city: z.string().max(100, "City must be less than 100 characters").optional(),
  postcode: z.string().max(20, "Postcode must be less than 20 characters").optional(),
  isRegisteredWithBE: z.boolean().default(false),
  beRegistrationNumber: z.string().max(50, "Registration number too long").optional(),
  hasCompetitions: z.boolean().default(false),
  hasSocialGames: z.boolean().default(false),
  socialGameTimings: z.string().max(200, "Timings description too long").optional(),
  providesTraining: z.boolean().default(false),
  trainingDetails: z.string().max(500, "Training details too long").optional(),
  sessionFee: z.string().optional(),
  hasMembership: z.boolean().default(false),
  membershipFee: z.string().optional(),
  ageGroups: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.isRegisteredWithBE && !data.beRegistrationNumber) {
    return false;
  }
  return true;
}, {
  message: "Registration number is required when registered with Badminton England",
  path: ["beRegistrationNumber"],
}).refine((data) => {
  if (data.hasSocialGames && !data.socialGameTimings) {
    return false;
  }
  return true;
}, {
  message: "Please provide social game timings",
  path: ["socialGameTimings"],
}).refine((data) => {
  if (data.hasMembership && !data.membershipFee) {
    return false;
  }
  return true;
}, {
  message: "Please provide the membership fee",
  path: ["membershipFee"],
});

type CreateClubFormData = z.infer<typeof createClubSchema>;

export default function CreateClub() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createClub = useCreateClub();

  const form = useForm<CreateClubFormData>({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      postcode: "",
      isRegisteredWithBE: false,
      beRegistrationNumber: "",
      hasCompetitions: false,
      hasSocialGames: false,
      socialGameTimings: "",
      providesTraining: false,
      trainingDetails: "",
      sessionFee: "",
      hasMembership: false,
      membershipFee: "",
      ageGroups: [],
    },
  });

  const isRegisteredWithBE = form.watch("isRegisteredWithBE");
  const hasSocialGames = form.watch("hasSocialGames");
  const providesTraining = form.watch("providesTraining");
  const hasMembership = form.watch("hasMembership");

  async function onSubmit(data: CreateClubFormData) {
    try {
      const submitData = {
        ...data,
        sessionFee: data.sessionFee ? Math.round(parseFloat(data.sessionFee) * 100) : undefined,
        membershipFee: data.membershipFee ? Math.round(parseFloat(data.membershipFee) * 100) : undefined,
      };
      await createClub.mutateAsync(submitData);
      toast({
        title: "Club Request Submitted!",
        description: `Your club "${data.name}" has been submitted for review. A platform administrator will review your request and you will be notified once approved.`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create club",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your club request will be reviewed by a platform administrator before it becomes active. 
            This process typically takes 1-2 business days.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Create a New Club</CardTitle>
                <CardDescription>
                  Fill out the details below to register your badminton club
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Basic Information
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Downtown Badminton Club"
                            data-testid="input-club-name"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a unique name for your club
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell players about your club, its history, and what makes it special..."
                            className="resize-none"
                            rows={4}
                            data-testid="input-club-description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6 space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Registration & Affiliation
                  </h3>

                  <FormField
                    control={form.control}
                    name="isRegisteredWithBE"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Registered with Badminton England</FormLabel>
                          <FormDescription>
                            Is your club officially registered with Badminton England?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-be-registered"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isRegisteredWithBE && (
                    <FormField
                      control={form.control}
                      name="beRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Badminton England Registration Number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., BE12345"
                              data-testid="input-be-registration"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="hasCompetitions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Participates in Competitions</FormLabel>
                          <FormDescription>
                            Does your club participate in leagues, tournaments, or other competitions?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-competitions"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6 space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Club Activities
                  </h3>

                  <FormField
                    control={form.control}
                    name="hasSocialGames"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Social Games Sessions</FormLabel>
                          <FormDescription>
                            Does your club offer casual/social badminton sessions?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-social-games"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasSocialGames && (
                    <FormField
                      control={form.control}
                      name="socialGameTimings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Games Schedule *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Sundays 2pm-5pm, Wednesdays 7pm-9pm"
                              data-testid="input-social-timings"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            When are your social sessions typically held?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="providesTraining"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Training Sessions</FormLabel>
                          <FormDescription>
                            Does your club provide coaching or training sessions?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-training"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {providesTraining && (
                    <FormField
                      control={form.control}
                      name="trainingDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Training Details</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your training sessions, coaching availability, skill levels catered for..."
                              className="resize-none"
                              rows={3}
                              data-testid="input-training-details"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="border-t pt-6 space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Target Players
                  </h3>

                  <FormField
                    control={form.control}
                    name="ageGroups"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Age Groups</FormLabel>
                          <FormDescription>
                            Which age groups does your club cater to?
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {AGE_GROUPS.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="ageGroups"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(field.value?.filter((v) => v !== item.id));
                                      }}
                                      data-testid={`checkbox-age-${item.id}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6 space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <PoundSterling className="w-5 h-5" />
                    Fees
                  </h3>

                  <FormField
                    control={form.control}
                    name="sessionFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Fee (per session)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g., 5.00"
                              className="pl-7"
                              data-testid="input-session-fee"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          How much do players pay per session?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasMembership"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Membership Required</FormLabel>
                          <FormDescription>
                            Does your club require annual membership?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-membership"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasMembership && (
                    <FormField
                      control={form.control}
                      name="membershipFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Membership Fee *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g., 30.00"
                                className="pl-7"
                                data-testid="input-membership-fee"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Annual membership fee in GBP
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="border-t pt-6 space-y-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Location
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Adding a location helps players find your club on the map
                  </p>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 123 Sports Center Drive"
                              data-testid="input-club-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., London"
                                data-testid="input-club-city"
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
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., SW1A 1AA"
                                data-testid="input-club-postcode"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createClub.isPending}
                    data-testid="button-create-club"
                  >
                    {createClub.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit for Approval"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">What happens next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your club request will be reviewed by a platform administrator</li>
            <li>• Once approved, you become the owner with full admin access</li>
            <li>• A player profile is automatically created for you</li>
            <li>• You can then create sessions, manage matches, and invite players</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

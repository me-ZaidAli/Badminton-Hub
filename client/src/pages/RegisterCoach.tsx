import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, GraduationCap, Loader2, Info, CheckCircle, Upload, Camera } from "lucide-react";

const SPECIALISM_OPTIONS = [
  "Singles", "Doubles", "Mixed Doubles",
  "Juniors", "Adults", "Beginners", "Intermediate", "Advanced", "Performance"
];

const COACHING_FOCUS_OPTIONS = [
  "Footwork", "Technique", "Tactics & Match Play",
  "Fitness & Conditioning", "Mental Game", "Stroke Development",
  "Net Play", "Deception", "Serve & Return"
];

const SESSION_TYPE_OPTIONS = [
  "Group Sessions", "Private Lessons", "Squad Training", "Match Analysis",
  "Video Analysis", "Online Coaching"
];

const AGE_GROUP_OPTIONS = [
  "U10", "U12", "U14", "U16", "U18", "Adults", "Seniors (50+)"
];

const registerCoachSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(5, "Phone number is required"),
  profilePhoto: z.string().optional(),
  roleTitle: z.string().optional(),
  location: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  postcode: z.string().min(3, "Postcode is required"),
  googleMapsUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  areaCoverage: z.string().optional(),
  availability: z.string().optional(),
  bio: z.string().optional(),
  coachingCertifications: z.string().optional(),
  safeguardingDbs: z.string().optional(),
  firstAidCert: z.boolean().default(false),
  cpdTraining: z.string().optional(),
  languagesSpoken: z.string().optional(),
  qualifications: z.string().optional(),
  badmintonEnglandCert: z.boolean().default(false),
  yearsTraining: z.coerce.number().min(0).optional(),
  playingExperience: z.string().optional(),
  specialism: z.array(z.string()).default([]),
  coachingPhilosophy: z.string().optional(),
  preferredGroupSize: z.string().optional(),
  coachingFocus: z.array(z.string()).default([]),
  sessionTypesOffered: z.array(z.string()).default([]),
  sessionPrices: z.string().optional(),
  ageGroupsCoached: z.array(z.string()).default([]),
  equipmentProvided: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  professionalCareer: z.string().optional(),
  experience: z.string().optional(),
  achievements: z.string().optional(),
  playersDeveloped: z.string().optional(),
  tournamentsWon: z.string().optional(),
  teamsCoached: z.string().optional(),
  testimonials: z.string().optional(),
});

type RegisterCoachFormData = z.infer<typeof registerCoachSchema>;

function MultiCheckboxField({ options, value, onChange, testIdPrefix }: {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <Badge
            key={option}
            variant={selected ? "default" : "outline"}
            className={`cursor-pointer toggle-elevate ${selected ? "toggle-elevated" : ""}`}
            onClick={() => {
              if (selected) onChange(value.filter(v => v !== option));
              else onChange([...value, option]);
            }}
            data-testid={`${testIdPrefix}-${option.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {option}
          </Badge>
        );
      })}
    </div>
  );
}

export default function RegisterCoach() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingCoach, isLoading: coachLoading, error: coachError } = useQuery<any>({
    queryKey: ["/api/coaches/me"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<RegisterCoachFormData>({
    resolver: zodResolver(registerCoachSchema),
    defaultValues: {
      fullName: "", email: "", phone: "", profilePhoto: "", roleTitle: "",
      location: "", city: "", postcode: "", googleMapsUrl: "", areaCoverage: "", availability: "",
      bio: "", coachingCertifications: "", safeguardingDbs: "", firstAidCert: false,
      cpdTraining: "", languagesSpoken: "", qualifications: "", badmintonEnglandCert: false,
      yearsTraining: 0, playingExperience: "", specialism: [], coachingPhilosophy: "",
      preferredGroupSize: "", coachingFocus: [], sessionTypesOffered: [], sessionPrices: "",
      ageGroupsCoached: [], equipmentProvided: "", cancellationPolicy: "",
      professionalCareer: "", experience: "", achievements: "", playersDeveloped: "",
      tournamentsWon: "", teamsCoached: "", testimonials: "",
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

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/coaches/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      form.setValue("profilePhoto", data.url);
      setPhotoPreview(data.url);
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterCoachFormData) => {
      const res = await apiRequest("POST", "/api/coaches/register", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Registration Submitted", description: "Your coach profile has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: ["/api/coaches/me"] });
      navigate("/coaches/me");
    },
    onError: (error: Error) => {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
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
            <Button onClick={() => navigate("/login")} data-testid="button-login">Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasExistingProfile = existingCoach && !coachError;

  if (hasExistingProfile) {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-already-registered">Already Registered as Coach</h2>
            <p className="text-muted-foreground mb-4">You have already registered as a coach. You can view or edit your profile.</p>
            <Button onClick={() => navigate("/coaches/me")} data-testid="button-view-profile">View Coach Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Complete the form below to register as a badminton coach. Your profile will be reviewed by an admin before going live.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Register as Coach</CardTitle>
              <CardDescription>Fill in your details to create your coach profile</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Core Information</h3>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      {photoPreview ? (
                        <AvatarImage src={photoPreview} alt="Profile" />
                      ) : null}
                      <AvatarFallback className="text-2xl">{form.watch("fullName")?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                      data-testid="input-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      data-testid="button-upload-photo"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl><Input placeholder="Your full name" data-testid="input-full-name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl><Input type="email" placeholder="your@email.com" data-testid="input-email" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl><Input type="tel" placeholder="07700 900000" data-testid="input-phone" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="roleTitle" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role / Title</FormLabel>
                          <FormControl><Input placeholder="e.g. Head Coach, Junior Coach" data-testid="input-role-title" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <FormField control={form.control} name="yearsTraining" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Coaching Experience</FormLabel>
                    <FormControl><Input type="number" min={0} placeholder="e.g. 5" data-testid="input-years-training" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio / About</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell players about yourself, your coaching style, and what you offer..." className="resize-none" rows={4} data-testid="input-bio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Location & Availability</h3>

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coaching Location(s) *</FormLabel>
                    <FormControl><Input placeholder="Where you coach (venue names, addresses)" data-testid="input-location" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl><Input placeholder="e.g. Birmingham" data-testid="input-city" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="postcode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode *</FormLabel>
                      <FormControl><Input placeholder="e.g. B1 1AA" data-testid="input-postcode" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="googleMapsUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps Link</FormLabel>
                    <FormControl><Input placeholder="e.g. https://maps.google.com/..." data-testid="input-google-maps-url" {...field} /></FormControl>
                    <FormDescription>Paste your Google Maps location link so students can find you easily</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="areaCoverage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area of Coverage</FormLabel>
                    <FormControl><Input placeholder="e.g. West Midlands, South Birmingham" data-testid="input-area-coverage" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="availability" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability (Days & Times)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Mon-Fri evenings 6-9pm, Sat mornings 9am-12pm" className="resize-none" rows={3} data-testid="input-availability" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Qualifications & Credentials</h3>

                <FormField control={form.control} name="coachingCertifications" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coaching Certifications</FormLabel>
                    <FormDescription>e.g. Badminton England Level 1/2/3, BWF Certification</FormDescription>
                    <FormControl>
                      <Textarea placeholder="List your coaching certifications..." className="resize-none" rows={3} data-testid="input-coaching-certifications" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="badmintonEnglandCert" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-be-certified" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Badminton England Certified</FormLabel>
                      <p className="text-sm text-muted-foreground">I hold a valid Badminton England coaching certification</p>
                    </div>
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="safeguardingDbs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Safeguarding / DBS Status</FormLabel>
                      <FormControl><Input placeholder="e.g. Enhanced DBS - valid" data-testid="input-safeguarding-dbs" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="firstAidCert" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-first-aid" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>First Aid Certified</FormLabel>
                        <p className="text-sm text-muted-foreground">I hold a valid first aid certificate</p>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="cpdTraining" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPD / Ongoing Training</FormLabel>
                    <FormControl><Input placeholder="Recent training courses or CPD activities" data-testid="input-cpd-training" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="languagesSpoken" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Languages Spoken</FormLabel>
                    <FormControl><Input placeholder="e.g. English, Urdu, Mandarin" data-testid="input-languages-spoken" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="qualifications" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Qualifications</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any other relevant qualifications..." className="resize-none" rows={3} data-testid="input-qualifications" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Playing & Coaching Background</h3>

                <FormField control={form.control} name="playingExperience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Playing Experience</FormLabel>
                    <FormDescription>e.g. County, League, National, University level</FormDescription>
                    <FormControl>
                      <Textarea placeholder="Describe your playing experience..." className="resize-none" rows={3} data-testid="input-playing-experience" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="specialism" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialism</FormLabel>
                    <FormDescription>Select all that apply</FormDescription>
                    <FormControl>
                      <MultiCheckboxField options={SPECIALISM_OPTIONS} value={field.value || []} onChange={field.onChange} testIdPrefix="tag-specialism" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="coachingPhilosophy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coaching Philosophy</FormLabel>
                    <FormDescription>How you coach, what you focus on</FormDescription>
                    <FormControl>
                      <Textarea placeholder="Describe your coaching approach and philosophy..." className="resize-none" rows={4} data-testid="input-coaching-philosophy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="professionalCareer" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Career Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your professional badminton career..." className="resize-none" rows={4} data-testid="input-professional-career" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Coaching Style & Preferences</h3>

                <FormField control={form.control} name="preferredGroupSize" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Group Size</FormLabel>
                    <FormControl><Input placeholder="e.g. 1-to-1, Small groups (2-4), Large groups (5+)" data-testid="input-preferred-group-size" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="coachingFocus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coaching Focus Areas</FormLabel>
                    <FormDescription>Select all that apply</FormDescription>
                    <FormControl>
                      <MultiCheckboxField options={COACHING_FOCUS_OPTIONS} value={field.value || []} onChange={field.onChange} testIdPrefix="tag-focus" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="sessionTypesOffered" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Types Offered</FormLabel>
                    <FormDescription>Select all that apply</FormDescription>
                    <FormControl>
                      <MultiCheckboxField options={SESSION_TYPE_OPTIONS} value={field.value || []} onChange={field.onChange} testIdPrefix="tag-session-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Practical / Booking Info</h3>

                <FormField control={form.control} name="sessionPrices" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Types & Prices</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. 1-to-1: £30/hr, Group (4): £15/hr per person" className="resize-none" rows={3} data-testid="input-session-prices" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ageGroupsCoached" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age Groups Coached</FormLabel>
                    <FormControl>
                      <MultiCheckboxField options={AGE_GROUP_OPTIONS} value={field.value || []} onChange={field.onChange} testIdPrefix="tag-age-group" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="equipmentProvided" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Provided</FormLabel>
                    <FormControl><Input placeholder="e.g. Shuttlecocks, rackets for beginners" data-testid="input-equipment-provided" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="cancellationPolicy" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Policy</FormLabel>
                    <FormControl><Input placeholder="e.g. 24 hours notice required" data-testid="input-cancellation-policy" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-6">
                <h3 className="font-semibold text-lg border-b pb-2">Achievements & Highlights</h3>

                <FormField control={form.control} name="achievements" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notable Achievements</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Your notable coaching or playing achievements..." className="resize-none" rows={3} data-testid="input-achievements" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="playersDeveloped" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Players Developed</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notable players you have coached or developed..." className="resize-none" rows={3} data-testid="input-players-developed" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tournamentsWon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournaments Won</FormLabel>
                      <FormControl>
                        <Textarea placeholder="List tournaments..." className="resize-none" rows={3} data-testid="input-tournaments-won" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="teamsCoached" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teams Coached</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Teams you have coached..." className="resize-none" rows={3} data-testid="input-teams-coached" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="testimonials" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Testimonials / Success Stories</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any testimonials from players or success stories..." className="resize-none" rows={4} data-testid="input-testimonials" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="experience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Summary</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Summarize your coaching experience..." className="resize-none" rows={4} data-testid="input-experience" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={registerMutation.isPending} data-testid="button-submit">
                  {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Register as Coach
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} data-testid="button-cancel">
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

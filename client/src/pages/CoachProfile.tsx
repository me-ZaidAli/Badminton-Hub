import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, GraduationCap, Loader2, Pencil, X, Camera,
  MapPin, Phone, Mail, Clock, Award, Users, Target, BookOpen, Trophy
} from "lucide-react";

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

const coachProfileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(5, "Phone number is required"),
  profilePhoto: z.string().optional(),
  roleTitle: z.string().optional(),
  location: z.string().optional(),
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
  servicesDescription: z.string().optional(),
  videoLinks: z.array(z.string()).default([]),
  websiteLinks: z.array(z.string()).default([]),
  preferredVenueIds: z.array(z.number()).default([]),
  preferredAreas: z.array(z.string()).default([]),
});

type VenueOption = { id: number; name: string; city: string | null; address: string; clubName: string | null };
const linesToList = (s: string) => s.split(/\n+/).map((l) => l.trim()).filter(Boolean);
const listToLines = (a?: string[] | null) => (a ?? []).join("\n");

type CoachProfileFormData = z.infer<typeof coachProfileSchema>;

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

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

function InfoField({ label, value, testId }: { label: string; value?: string | null; testId: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium whitespace-pre-wrap" data-testid={testId}>{value}</p>
    </div>
  );
}

function ArrayBadges({ label, items, testId }: { label: string; items?: string[] | null; testId: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1" data-testid={testId}>
        {items.map((item) => (
          <Badge key={item} variant="secondary" data-testid={`${testId}-${item.toLowerCase().replace(/\s+/g, "-")}`}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function CoachProfile() {
  const [, navigate] = useLocation();
  const { data: user, isLoading: userLoading } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: coach, isLoading: coachLoading, error: coachError } = useQuery<any>({
    queryKey: ["/api/coaches/me"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<CoachProfileFormData>({
    resolver: zodResolver(coachProfileSchema),
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
      servicesDescription: "", videoLinks: [], websiteLinks: [],
      preferredVenueIds: [], preferredAreas: [],
    },
  });

  const { data: allVenues = [] } = useQuery<VenueOption[]>({
    queryKey: ["/api/venues/all"],
    enabled: !!user,
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

  function startEditing() {
    if (coach) {
      form.reset({
        fullName: coach.fullName || "",
        email: coach.email || "",
        phone: coach.phone || "",
        profilePhoto: coach.profilePhoto || "",
        roleTitle: coach.roleTitle || "",
        bio: coach.bio || "",
        location: coach.location || "",
        city: coach.city || "",
        postcode: coach.postcode || "",
        googleMapsUrl: (coach as any).googleMapsUrl || "",
        areaCoverage: coach.areaCoverage || "",
        availability: coach.availability || "",
        coachingCertifications: coach.coachingCertifications || "",
        safeguardingDbs: coach.safeguardingDbs || "",
        firstAidCert: coach.firstAidCert || false,
        cpdTraining: coach.cpdTraining || "",
        languagesSpoken: coach.languagesSpoken || "",
        qualifications: coach.qualifications || "",
        badmintonEnglandCert: coach.badmintonEnglandCert || false,
        yearsTraining: coach.yearsTraining || 0,
        playingExperience: coach.playingExperience || "",
        specialism: coach.specialism || [],
        coachingPhilosophy: coach.coachingPhilosophy || "",
        preferredGroupSize: coach.preferredGroupSize || "",
        coachingFocus: coach.coachingFocus || [],
        sessionTypesOffered: coach.sessionTypesOffered || [],
        sessionPrices: coach.sessionPrices || "",
        ageGroupsCoached: coach.ageGroupsCoached || [],
        equipmentProvided: coach.equipmentProvided || "",
        cancellationPolicy: coach.cancellationPolicy || "",
        professionalCareer: coach.professionalCareer || "",
        experience: coach.experience || "",
        achievements: coach.achievements || "",
        playersDeveloped: coach.playersDeveloped || "",
        tournamentsWon: coach.tournamentsWon || "",
        teamsCoached: coach.teamsCoached || "",
        testimonials: coach.testimonials || "",
        servicesDescription: coach.servicesDescription || "",
        videoLinks: coach.videoLinks || [],
        websiteLinks: coach.websiteLinks || [],
        preferredVenueIds: coach.preferredVenueIds || [],
        preferredAreas: coach.preferredAreas || [],
      });
      setPhotoPreview(coach.profilePhoto || null);
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
              <div className="p-2 bg-primary/10 rounded-md">
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
                  <h3 className="font-semibold text-lg border-b pb-2">Core Information</h3>

                  {/* PROMINENT PROFILE PHOTO BLOCK */}
                  <div className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10 p-5 relative overflow-hidden" data-testid="block-profile-photo">
                    <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-violet-500/25 blur-3xl" />
                    <div className="relative flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative shrink-0 group">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-60 blur-md group-hover:opacity-90 transition" />
                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-[3px] border-white/40 bg-slate-900 shadow-xl">
                          {(photoPreview || form.watch("profilePhoto")) ? (
                            <img
                              src={photoPreview || form.watch("profilePhoto")}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              data-testid="img-photo-preview"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white bg-gradient-to-br from-violet-600 to-fuchsia-600">
                              {form.watch("fullName")?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-violet-500 hover:bg-violet-400 text-white flex items-center justify-center shadow-lg ring-2 ring-background"
                          data-testid="button-photo-camera"
                          aria-label="Upload photo"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        </button>
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
                      </div>
                      <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                        <div>
                          <h4 className="font-bold text-base">Profile Photo</h4>
                          <p className="text-xs text-muted-foreground">Shown on the coach finder, your public profile, and bookings. Square, head-and-shoulders works best.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-violet-500 hover:bg-violet-400 text-white"
                            data-testid="button-upload-photo"
                          >
                            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                            {uploading ? "Uploading…" : "Upload from device"}
                          </Button>
                          {(photoPreview || form.watch("profilePhoto")) && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => { form.setValue("profilePhoto", ""); setPhotoPreview(null); }}
                              data-testid="button-remove-photo"
                            >
                              <X className="h-4 w-4 mr-2" />Remove
                            </Button>
                          )}
                        </div>
                        <FormField control={form.control} name="profilePhoto" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">Or paste a photo URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://example.com/photo.jpg"
                                value={field.value || ""}
                                onChange={(e) => { field.onChange(e.target.value); setPhotoPreview(e.target.value || null); }}
                                data-testid="input-photo-url"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
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
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="Your address" data-testid="input-location" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl><Input placeholder="e.g., London" data-testid="input-city" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="postcode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode *</FormLabel>
                        <FormControl><Input placeholder="e.g., SW1A 1AA" data-testid="input-postcode" {...field} /></FormControl>
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
                      <FormLabel>Area of Coverage (summary)</FormLabel>
                      <FormControl><Input placeholder="e.g., South London, Surrey" data-testid="input-area-coverage" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="preferredAreas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Areas / Cities</FormLabel>
                      <FormDescription>One area or city per line — e.g. "Birmingham", "Solihull B91"</FormDescription>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={"Birmingham\nSolihull\nWest Bromwich"}
                          value={listToLines(field.value)}
                          onChange={(e) => field.onChange(linesToList(e.target.value))}
                          data-testid="input-preferred-areas"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="preferredVenueIds" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Venues</FormLabel>
                      <FormDescription>Pick the venues you can teach at. Players can only book lessons at one of these venues (they may suggest an alternative, but you choose).</FormDescription>
                      <FormControl>
                        <div className="rounded-md border p-3 max-h-64 overflow-y-auto space-y-1" data-testid="venue-picker">
                          {allVenues.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No venues available yet — ask a club admin to add venues to the system.</p>
                          ) : (
                            allVenues.map((v) => {
                              const checked = (field.value || []).includes(v.id);
                              return (
                                <label
                                  key={v.id}
                                  className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                                  data-testid={`venue-option-${v.id}`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) => {
                                      const cur = field.value || [];
                                      field.onChange(c ? [...cur, v.id] : cur.filter((id: number) => id !== v.id));
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{v.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {[v.address, v.city].filter(Boolean).join(", ")}
                                      {v.clubName ? ` · ${v.clubName}` : ""}
                                    </p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </FormControl>
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
                        <Textarea placeholder="Describe your professional sporting career..." className="resize-none" rows={4} data-testid="input-professional-career" {...field} />
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
                        <Textarea placeholder="e.g. 1-to-1: GBP30/hr, Group (4): GBP15/hr per person" className="resize-none" rows={3} data-testid="input-session-prices" {...field} />
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
                      <FormControl><Input placeholder="e.g. Rackets, balls for beginners" data-testid="input-equipment-provided" {...field} /></FormControl>
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
                  <h3 className="font-semibold text-lg border-b pb-2">Services, Links & Videos</h3>

                  <FormField control={form.control} name="servicesDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description of Services</FormLabel>
                      <FormDescription>Tell players what you offer — formats, packages, what's included, what to expect.</FormDescription>
                      <FormControl>
                        <Textarea rows={5} placeholder="1-to-1 technical lessons, junior squad coaching, video review packages…" data-testid="input-services-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="websiteLinks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website / Social Links</FormLabel>
                      <FormDescription>One URL per line — your site, Instagram, Facebook, LinkedIn, etc.</FormDescription>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={"https://mywebsite.com\nhttps://instagram.com/yourhandle"}
                          value={listToLines(field.value)}
                          onChange={(e) => field.onChange(linesToList(e.target.value))}
                          data-testid="input-website-links"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="videoLinks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Links</FormLabel>
                      <FormDescription>One video URL per line — YouTube, Vimeo, Instagram Reel, etc.</FormDescription>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={"https://youtu.be/abcd1234\nhttps://vimeo.com/12345"}
                          value={listToLines(field.value)}
                          onChange={(e) => field.onChange(linesToList(e.target.value))}
                          data-testid="input-video-links"
                        />
                      </FormControl>
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

      {!coach.profilePhoto && (
        <div className="mb-4 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-4 flex items-center gap-4 flex-wrap" data-testid="banner-missing-photo">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Camera className="w-6 h-6 text-amber-300" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-amber-100">Add a profile photo</p>
            <p className="text-xs text-amber-200/80">Your photo appears on the coach finder hero, your public profile, and every booking. Coaches with photos get up to 3× more enquiries.</p>
          </div>
          <Button onClick={startEditing} className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold" data-testid="button-add-photo-banner">
            <Camera className="w-4 h-4 mr-2" />Upload now
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 opacity-50 blur-sm" />
                <Avatar className="relative h-20 w-20 border-2 border-white/30 shadow-lg">
                  {coach.profilePhoto ? (
                    <AvatarImage src={coach.profilePhoto} alt={coach.fullName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-black">{coach.fullName?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <CardTitle data-testid="text-coach-name">{coach.fullName}</CardTitle>
                {coach.roleTitle && (
                  <CardDescription data-testid="text-role-title">{coach.roleTitle}</CardDescription>
                )}
                {!coach.roleTitle && <CardDescription>Coach Profile</CardDescription>}
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
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium" data-testid="text-full-name">{coach.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium" data-testid="text-email">{coach.email}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium" data-testid="text-phone">{coach.phone || "Not provided"}</p>
                </div>
              </div>
              {coach.yearsTraining != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Years of Experience</p>
                  <p className="font-medium" data-testid="text-years-training">{coach.yearsTraining}</p>
                </div>
              )}
              {coach.languagesSpoken && (
                <div>
                  <p className="text-sm text-muted-foreground">Languages Spoken</p>
                  <p className="font-medium" data-testid="text-languages-spoken">{coach.languagesSpoken}</p>
                </div>
              )}
            </div>
          </div>

          {coach.bio && (
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">About</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-bio">{coach.bio}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Location & Availability</h3>
            </div>
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
            {coach.availability && (
              <div>
                <p className="text-sm text-muted-foreground">Availability</p>
                <div className="flex items-start gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="font-medium whitespace-pre-wrap" data-testid="text-availability">{coach.availability}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Qualifications & Credentials</h3>
            </div>
            <InfoField label="Coaching Certifications" value={coach.coachingCertifications} testId="text-coaching-certifications" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Badminton England Certified</p>
                <p className="font-medium" data-testid="text-be-cert">
                  {coach.badmintonEnglandCert ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">First Aid Certified</p>
                <p className="font-medium" data-testid="text-first-aid-cert">
                  {coach.firstAidCert ? "Yes" : "No"}
                </p>
              </div>
              {coach.safeguardingDbs && (
                <div>
                  <p className="text-sm text-muted-foreground">Safeguarding / DBS</p>
                  <p className="font-medium" data-testid="text-safeguarding-dbs">{coach.safeguardingDbs}</p>
                </div>
              )}
              {coach.cpdTraining && (
                <div>
                  <p className="text-sm text-muted-foreground">CPD / Ongoing Training</p>
                  <p className="font-medium" data-testid="text-cpd-training">{coach.cpdTraining}</p>
                </div>
              )}
            </div>
            <InfoField label="Other Qualifications" value={coach.qualifications} testId="text-qualifications" />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Playing & Coaching Background</h3>
            </div>
            <InfoField label="Playing Experience" value={coach.playingExperience} testId="text-playing-experience" />
            <ArrayBadges label="Specialism" items={coach.specialism} testId="badges-specialism" />
            <InfoField label="Coaching Philosophy" value={coach.coachingPhilosophy} testId="text-coaching-philosophy" />
            <InfoField label="Professional Career" value={coach.professionalCareer} testId="text-professional-career" />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Coaching Style & Preferences</h3>
            </div>
            {coach.preferredGroupSize && (
              <div>
                <p className="text-sm text-muted-foreground">Preferred Group Size</p>
                <p className="font-medium" data-testid="text-preferred-group-size">{coach.preferredGroupSize}</p>
              </div>
            )}
            <ArrayBadges label="Coaching Focus Areas" items={coach.coachingFocus} testId="badges-coaching-focus" />
            <ArrayBadges label="Session Types Offered" items={coach.sessionTypesOffered} testId="badges-session-types" />
          </div>

          {(coach.servicesDescription || (coach.websiteLinks?.length) || (coach.videoLinks?.length) || (coach.preferredAreas?.length) || (coach.preferredVenueIds?.length)) ? (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-lg">Services, Links & Venues</h3>
              <InfoField label="Description of Services" value={coach.servicesDescription} testId="text-services-description" />
              <ArrayBadges label="Preferred Areas" items={coach.preferredAreas} testId="badges-preferred-areas" />
              {coach.preferredVenueIds?.length ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Preferred Venues</p>
                  <ul className="space-y-1" data-testid="list-preferred-venues">
                    {(coach.preferredVenueIds as number[])
                      .map((id) => allVenues.find((v) => v.id === id))
                      .filter(Boolean)
                      .map((v) => (
                        <li key={v!.id} className="text-sm font-medium">
                          • {v!.name} <span className="text-muted-foreground font-normal">— {[v!.address, v!.city].filter(Boolean).join(", ")}{v!.clubName ? ` · ${v!.clubName}` : ""}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {coach.websiteLinks?.length ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Website / Social</p>
                  <ul className="space-y-1" data-testid="list-website-links">
                    {(coach.websiteLinks as string[]).map((u) => (
                      <li key={u}><a className="text-sm text-primary underline break-all" href={u} target="_blank" rel="noreferrer">{u}</a></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {coach.videoLinks?.length ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Videos</p>
                  <ul className="space-y-1" data-testid="list-video-links">
                    {(coach.videoLinks as string[]).map((u) => (
                      <li key={u}><a className="text-sm text-primary underline break-all" href={u} target="_blank" rel="noreferrer">{u}</a></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-lg">Practical / Booking Info</h3>
            <InfoField label="Session Prices" value={coach.sessionPrices} testId="text-session-prices" />
            <ArrayBadges label="Age Groups Coached" items={coach.ageGroupsCoached} testId="badges-age-groups" />
            <InfoField label="Equipment Provided" value={coach.equipmentProvided} testId="text-equipment-provided" />
            <InfoField label="Cancellation Policy" value={coach.cancellationPolicy} testId="text-cancellation-policy" />
          </div>

          {(coach.achievements || coach.playersDeveloped || coach.tournamentsWon || coach.teamsCoached || coach.testimonials || coach.experience) && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Achievements & Highlights</h3>
              </div>
              <InfoField label="Notable Achievements" value={coach.achievements} testId="text-achievements" />
              <InfoField label="Players Developed" value={coach.playersDeveloped} testId="text-players-developed" />
              <InfoField label="Tournaments Won" value={coach.tournamentsWon} testId="text-tournaments-won" />
              <InfoField label="Teams Coached" value={coach.teamsCoached} testId="text-teams-coached" />
              <InfoField label="Testimonials" value={coach.testimonials} testId="text-testimonials" />
              <InfoField label="Experience Summary" value={coach.experience} testId="text-experience" />
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

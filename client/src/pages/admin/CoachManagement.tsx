import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Search, MoreHorizontal, CheckCircle, XCircle, Ban, Pencil, Trash2, Users, GraduationCap, CreditCard, Clock, ShieldAlert, Loader2, UserX, Plus, Camera } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

type Coach = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  location: string | null;
  areaCoverage: string | null;
  badmintonEnglandCert: boolean;
  qualifications: string | null;
  yearsTraining: number | null;
  professionalCareer: string | null;
  experience: string | null;
  status: string;
  bio: string | null;
  profilePhoto: string | null;
  roleTitle: string | null;
  availability: string | null;
  coachingCertifications: string | null;
  safeguardingDbs: string | null;
  firstAidCert: boolean;
  cpdTraining: string | null;
  languagesSpoken: string | null;
  playingExperience: string | null;
  specialism: string[] | null;
  coachingPhilosophy: string | null;
  preferredGroupSize: string | null;
  coachingFocus: string[] | null;
  sessionTypesOffered: string[] | null;
  sessionPrices: string | null;
  ageGroupsCoached: string[] | null;
  equipmentProvided: string | null;
  cancellationPolicy: string | null;
  achievements: string | null;
  playersDeveloped: string | null;
  tournamentsWon: string | null;
  teamsCoached: string | null;
  testimonials: string | null;
  insuranceExpiry: string | null;
  linkedClubIds: number[] | null;
};

type CoachSeeker = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  paidUntil: string | null;
  fullName: string | null;
  telephone: string | null;
  email: string | null;
  timePlaying: string | null;
  preferredTrainingLocation: string | null;
  sessionPreference: string | null;
  joinedAt: string | null;
};

type CoachFormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  postcode: string;
  location: string;
  areaCoverage: string;
  bio: string;
  qualifications: string;
  yearsTraining: string;
  profilePhoto: string;
  roleTitle: string;
  availability: string;
  coachingCertifications: string;
  safeguardingDbs: string;
  firstAidCert: boolean;
  cpdTraining: string;
  languagesSpoken: string;
  playingExperience: string;
  specialism: string[];
  coachingPhilosophy: string;
  preferredGroupSize: string;
  coachingFocus: string[];
  sessionTypesOffered: string[];
  sessionPrices: string;
  ageGroupsCoached: string[];
  equipmentProvided: string;
  cancellationPolicy: string;
  professionalCareer: string;
  experience: string;
  achievements: string;
  playersDeveloped: string;
  tournamentsWon: string;
  teamsCoached: string;
  testimonials: string;
  badmintonEnglandCert: boolean;
  insuranceExpiry: string;
};

const emptyFormState: CoachFormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  postcode: "",
  location: "",
  areaCoverage: "",
  bio: "",
  qualifications: "",
  yearsTraining: "",
  profilePhoto: "",
  roleTitle: "",
  availability: "",
  coachingCertifications: "",
  safeguardingDbs: "",
  firstAidCert: false,
  cpdTraining: "",
  languagesSpoken: "",
  playingExperience: "",
  specialism: [],
  coachingPhilosophy: "",
  preferredGroupSize: "",
  coachingFocus: [],
  sessionTypesOffered: [],
  sessionPrices: "",
  ageGroupsCoached: [],
  equipmentProvided: "",
  cancellationPolicy: "",
  professionalCareer: "",
  experience: "",
  achievements: "",
  playersDeveloped: "",
  tournamentsWon: "",
  teamsCoached: "",
  testimonials: "",
  badmintonEnglandCert: false,
  insuranceExpiry: "",
};

function coachToFormState(coach: Coach): CoachFormState {
  return {
    fullName: coach.fullName || "",
    email: coach.email || "",
    phone: coach.phone || "",
    city: coach.city || "",
    postcode: coach.postcode || "",
    location: coach.location || "",
    areaCoverage: coach.areaCoverage || "",
    bio: coach.bio || "",
    qualifications: coach.qualifications || "",
    yearsTraining: coach.yearsTraining?.toString() || "",
    profilePhoto: coach.profilePhoto || "",
    roleTitle: coach.roleTitle || "",
    availability: coach.availability || "",
    coachingCertifications: coach.coachingCertifications || "",
    safeguardingDbs: coach.safeguardingDbs || "",
    firstAidCert: coach.firstAidCert || false,
    cpdTraining: coach.cpdTraining || "",
    languagesSpoken: coach.languagesSpoken || "",
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
    badmintonEnglandCert: coach.badmintonEnglandCert || false,
    insuranceExpiry: coach.insuranceExpiry || "",
  };
}

function formStateToPayload(form: CoachFormState): Record<string, unknown> {
  return {
    fullName: form.fullName,
    email: form.email,
    phone: form.phone || null,
    city: form.city || null,
    postcode: form.postcode || null,
    location: form.location || null,
    areaCoverage: form.areaCoverage || null,
    bio: form.bio || null,
    qualifications: form.qualifications || null,
    yearsTraining: form.yearsTraining ? parseInt(form.yearsTraining) : null,
    profilePhoto: form.profilePhoto || null,
    roleTitle: form.roleTitle || null,
    availability: form.availability || null,
    coachingCertifications: form.coachingCertifications || null,
    safeguardingDbs: form.safeguardingDbs || null,
    firstAidCert: form.firstAidCert,
    cpdTraining: form.cpdTraining || null,
    languagesSpoken: form.languagesSpoken || null,
    playingExperience: form.playingExperience || null,
    specialism: form.specialism.length > 0 ? form.specialism : null,
    coachingPhilosophy: form.coachingPhilosophy || null,
    preferredGroupSize: form.preferredGroupSize || null,
    coachingFocus: form.coachingFocus.length > 0 ? form.coachingFocus : null,
    sessionTypesOffered: form.sessionTypesOffered.length > 0 ? form.sessionTypesOffered : null,
    sessionPrices: form.sessionPrices || null,
    ageGroupsCoached: form.ageGroupsCoached.length > 0 ? form.ageGroupsCoached : null,
    equipmentProvided: form.equipmentProvided || null,
    cancellationPolicy: form.cancellationPolicy || null,
    professionalCareer: form.professionalCareer || null,
    experience: form.experience || null,
    achievements: form.achievements || null,
    playersDeveloped: form.playersDeveloped || null,
    tournamentsWon: form.tournamentsWon || null,
    teamsCoached: form.teamsCoached || null,
    testimonials: form.testimonials || null,
    badmintonEnglandCert: form.badmintonEnglandCert,
    insuranceExpiry: form.insuranceExpiry || null,
  };
}

function MultiSelectBadges({ options, value, onChange, testIdPrefix }: {
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
            data-testid={`${testIdPrefix}-${option.toLowerCase().replace(/\s+/g, "-").replace(/[()&+]/g, "")}`}
          >
            {option}
          </Badge>
        );
      })}
    </div>
  );
}

function CoachFormFields({ form, setForm, photoUploading, onPhotoUpload, fileInputRef, testIdPrefix }: {
  form: CoachFormState;
  setForm: (f: CoachFormState) => void;
  photoUploading: boolean;
  onPhotoUpload: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-border">
            {form.profilePhoto ? (
              <AvatarImage src={form.profilePhoto} alt="Profile" />
            ) : null}
            <AvatarFallback className="text-xl">{form.fullName?.charAt(0) || "?"}</AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhotoUpload(f);
            }}
            data-testid={`${testIdPrefix}-input-photo-upload`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            data-testid={`${testIdPrefix}-button-upload-photo`}
          >
            {photoUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
            {photoUploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Core Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              data-testid={`${testIdPrefix}-input-fullName`}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid={`${testIdPrefix}-input-email`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid={`${testIdPrefix}-input-phone`}
            />
          </div>
          <div className="space-y-2">
            <Label>Role Title</Label>
            <Input
              placeholder="e.g. Head Coach"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
              data-testid={`${testIdPrefix}-input-roleTitle`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Location</h3>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            data-testid={`${testIdPrefix}-input-location`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              data-testid={`${testIdPrefix}-input-city`}
            />
          </div>
          <div className="space-y-2">
            <Label>Postcode</Label>
            <Input
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              data-testid={`${testIdPrefix}-input-postcode`}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Area of Coverage</Label>
          <Input
            value={form.areaCoverage}
            onChange={(e) => setForm({ ...form, areaCoverage: e.target.value })}
            data-testid={`${testIdPrefix}-input-areaCoverage`}
          />
        </div>
        <div className="space-y-2">
          <Label>Availability</Label>
          <Textarea
            className="resize-none"
            value={form.availability}
            onChange={(e) => setForm({ ...form, availability: e.target.value })}
            data-testid={`${testIdPrefix}-input-availability`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Bio & About</h3>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            className="resize-none"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            data-testid={`${testIdPrefix}-input-bio`}
          />
        </div>
        <div className="space-y-2">
          <Label>Languages Spoken</Label>
          <Input
            value={form.languagesSpoken}
            onChange={(e) => setForm({ ...form, languagesSpoken: e.target.value })}
            data-testid={`${testIdPrefix}-input-languagesSpoken`}
          />
        </div>
        <div className="space-y-2">
          <Label>Coaching Philosophy</Label>
          <Textarea
            className="resize-none"
            value={form.coachingPhilosophy}
            onChange={(e) => setForm({ ...form, coachingPhilosophy: e.target.value })}
            data-testid={`${testIdPrefix}-input-coachingPhilosophy`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Qualifications & Certifications</h3>
        <div className="space-y-2">
          <Label>Qualifications</Label>
          <Textarea
            className="resize-none"
            value={form.qualifications}
            onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
            data-testid={`${testIdPrefix}-input-qualifications`}
          />
        </div>
        <div className="space-y-2">
          <Label>Years of Training</Label>
          <Input
            type="number"
            value={form.yearsTraining}
            onChange={(e) => setForm({ ...form, yearsTraining: e.target.value })}
            data-testid={`${testIdPrefix}-input-yearsTraining`}
          />
        </div>
        <div className="space-y-2">
          <Label>Coaching Certifications</Label>
          <Textarea
            className="resize-none"
            value={form.coachingCertifications}
            onChange={(e) => setForm({ ...form, coachingCertifications: e.target.value })}
            data-testid={`${testIdPrefix}-input-coachingCertifications`}
          />
        </div>
        <div className="space-y-2">
          <Label>Safeguarding / DBS</Label>
          <Input
            value={form.safeguardingDbs}
            onChange={(e) => setForm({ ...form, safeguardingDbs: e.target.value })}
            data-testid={`${testIdPrefix}-input-safeguardingDbs`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={form.firstAidCert}
            onCheckedChange={(checked) => setForm({ ...form, firstAidCert: !!checked })}
            data-testid={`${testIdPrefix}-checkbox-firstAidCert`}
          />
          <Label>First Aid Certificate</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={form.badmintonEnglandCert}
            onCheckedChange={(checked) => setForm({ ...form, badmintonEnglandCert: !!checked })}
            data-testid={`${testIdPrefix}-checkbox-badmintonEnglandCert`}
          />
          <Label>Badminton England Certified</Label>
        </div>
        <div className="space-y-2">
          <Label>CPD Training</Label>
          <Input
            value={form.cpdTraining}
            onChange={(e) => setForm({ ...form, cpdTraining: e.target.value })}
            data-testid={`${testIdPrefix}-input-cpdTraining`}
          />
        </div>
        <div className="space-y-2">
          <Label>Insurance Expiry</Label>
          <Input
            type="date"
            value={form.insuranceExpiry}
            onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
            data-testid={`${testIdPrefix}-input-insuranceExpiry`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Specialism & Focus</h3>
        <div className="space-y-2">
          <Label>Specialism</Label>
          <MultiSelectBadges
            options={SPECIALISM_OPTIONS}
            value={form.specialism}
            onChange={(val) => setForm({ ...form, specialism: val })}
            testIdPrefix={`${testIdPrefix}-specialism`}
          />
        </div>
        <div className="space-y-2">
          <Label>Coaching Focus</Label>
          <MultiSelectBadges
            options={COACHING_FOCUS_OPTIONS}
            value={form.coachingFocus}
            onChange={(val) => setForm({ ...form, coachingFocus: val })}
            testIdPrefix={`${testIdPrefix}-coaching-focus`}
          />
        </div>
        <div className="space-y-2">
          <Label>Playing Experience</Label>
          <Textarea
            className="resize-none"
            value={form.playingExperience}
            onChange={(e) => setForm({ ...form, playingExperience: e.target.value })}
            data-testid={`${testIdPrefix}-input-playingExperience`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Sessions & Pricing</h3>
        <div className="space-y-2">
          <Label>Session Types Offered</Label>
          <MultiSelectBadges
            options={SESSION_TYPE_OPTIONS}
            value={form.sessionTypesOffered}
            onChange={(val) => setForm({ ...form, sessionTypesOffered: val })}
            testIdPrefix={`${testIdPrefix}-session-type`}
          />
        </div>
        <div className="space-y-2">
          <Label>Age Groups Coached</Label>
          <MultiSelectBadges
            options={AGE_GROUP_OPTIONS}
            value={form.ageGroupsCoached}
            onChange={(val) => setForm({ ...form, ageGroupsCoached: val })}
            testIdPrefix={`${testIdPrefix}-age-group`}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preferred Group Size</Label>
            <Input
              value={form.preferredGroupSize}
              onChange={(e) => setForm({ ...form, preferredGroupSize: e.target.value })}
              data-testid={`${testIdPrefix}-input-preferredGroupSize`}
            />
          </div>
          <div className="space-y-2">
            <Label>Session Prices</Label>
            <Input
              value={form.sessionPrices}
              onChange={(e) => setForm({ ...form, sessionPrices: e.target.value })}
              data-testid={`${testIdPrefix}-input-sessionPrices`}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Equipment Provided</Label>
          <Input
            value={form.equipmentProvided}
            onChange={(e) => setForm({ ...form, equipmentProvided: e.target.value })}
            data-testid={`${testIdPrefix}-input-equipmentProvided`}
          />
        </div>
        <div className="space-y-2">
          <Label>Cancellation Policy</Label>
          <Textarea
            className="resize-none"
            value={form.cancellationPolicy}
            onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })}
            data-testid={`${testIdPrefix}-input-cancellationPolicy`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-base border-b pb-2">Experience & Career</h3>
        <div className="space-y-2">
          <Label>Professional Career</Label>
          <Textarea
            className="resize-none"
            value={form.professionalCareer}
            onChange={(e) => setForm({ ...form, professionalCareer: e.target.value })}
            data-testid={`${testIdPrefix}-input-professionalCareer`}
          />
        </div>
        <div className="space-y-2">
          <Label>Experience</Label>
          <Textarea
            className="resize-none"
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            data-testid={`${testIdPrefix}-input-experience`}
          />
        </div>
        <div className="space-y-2">
          <Label>Achievements</Label>
          <Textarea
            className="resize-none"
            value={form.achievements}
            onChange={(e) => setForm({ ...form, achievements: e.target.value })}
            data-testid={`${testIdPrefix}-input-achievements`}
          />
        </div>
        <div className="space-y-2">
          <Label>Players Developed</Label>
          <Textarea
            className="resize-none"
            value={form.playersDeveloped}
            onChange={(e) => setForm({ ...form, playersDeveloped: e.target.value })}
            data-testid={`${testIdPrefix}-input-playersDeveloped`}
          />
        </div>
        <div className="space-y-2">
          <Label>Tournaments Won</Label>
          <Textarea
            className="resize-none"
            value={form.tournamentsWon}
            onChange={(e) => setForm({ ...form, tournamentsWon: e.target.value })}
            data-testid={`${testIdPrefix}-input-tournamentsWon`}
          />
        </div>
        <div className="space-y-2">
          <Label>Teams Coached</Label>
          <Textarea
            className="resize-none"
            value={form.teamsCoached}
            onChange={(e) => setForm({ ...form, teamsCoached: e.target.value })}
            data-testid={`${testIdPrefix}-input-teamsCoached`}
          />
        </div>
        <div className="space-y-2">
          <Label>Testimonials</Label>
          <Textarea
            className="resize-none"
            value={form.testimonials}
            onChange={(e) => setForm({ ...form, testimonials: e.target.value })}
            data-testid={`${testIdPrefix}-input-testimonials`}
          />
        </div>
      </div>
    </div>
  );
}

export default function CoachManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("coaches");

  const [coachSearch, setCoachSearch] = useState("");
  const [selectedCoaches, setSelectedCoaches] = useState<number[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [addCoachDialogOpen, setAddCoachDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<CoachFormState>({ ...emptyFormState });
  const [addPhotoUploading, setAddPhotoUploading] = useState(false);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const [editCoachDialogOpen, setEditCoachDialogOpen] = useState(false);
  const [editCoach, setEditCoach] = useState<Coach | null>(null);
  const [editForm, setEditForm] = useState<CoachFormState>({ ...emptyFormState });
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [seekerSearch, setSeekerSearch] = useState("");
  const [selectedSeekers, setSelectedSeekers] = useState<number[]>([]);
  const [editingSeekerData, setEditingSeekerData] = useState<CoachSeeker | null>(null);
  const [seekerBulkDialogOpen, setSeekerBulkDialogOpen] = useState(false);
  const [pendingSeekerBulkAction, setPendingSeekerBulkAction] = useState<string | null>(null);

  const [suspendUserDialogOpen, setSuspendUserDialogOpen] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState<number | null>(null);

  const { data: coaches, isLoading: coachesLoading } = useQuery<Coach[]>({
    queryKey: ["/api/admin/coaches"],
    enabled: user?.role === "OWNER",
  });

  const { data: seekers, isLoading: seekersLoading } = useQuery<CoachSeeker[]>({
    queryKey: ["/api/admin/coach-seekers"],
    enabled: user?.role === "OWNER",
  });

  const addCoachMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("POST", "/api/admin/coaches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setAddCoachDialogOpen(false);
      setAddForm({ ...emptyFormState });
      toast({ title: "Success", description: "Coach added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const coachActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      return apiRequest("PATCH", `/api/admin/coaches/${id}`, { status: action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      toast({ title: "Success", description: "Coach status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCoachMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/coaches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      toast({ title: "Success", description: "Coach deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editCoachMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/coaches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setEditCoachDialogOpen(false);
      setEditCoach(null);
      toast({ title: "Success", description: "Coach updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const coachBulkActionMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      return apiRequest("POST", "/api/admin/coaches/bulk-action", { ids, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setSelectedCoaches([]);
      toast({ title: "Success", description: "Bulk action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return apiRequest("POST", "/api/admin/coaches/bulk-delete", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      setSelectedCoaches([]);
      setBulkDeleteDialogOpen(false);
      toast({ title: "Success", description: "Selected coaches deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seekerActionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/coach-seekers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      toast({ title: "Success", description: "Coach seeker updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seekerBulkActionMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      return apiRequest("POST", "/api/admin/coach-seekers/bulk-action", { ids, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      setSelectedSeekers([]);
      toast({ title: "Success", description: "Bulk action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/admin/users/${userId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coach-seekers"] });
      setSuspendUserDialogOpen(false);
      setSuspendUserId(null);
      toast({ title: "User Suspended", description: "All rights have been removed from this user." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (
    file: File,
    setUploading: (v: boolean) => void,
    setForm: (f: CoachFormState) => void,
    currentForm: CoachFormState
  ) => {
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
      setForm({ ...currentForm, profilePhoto: data.url });
      toast({ title: "Photo uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filteredCoaches = coaches?.filter((c) => {
    const q = coachSearch.toLowerCase();
    if (!q) return true;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.postcode || "").toLowerCase().includes(q)
    );
  }) || [];

  const filteredSeekers = seekers?.filter((s) => {
    const q = seekerSearch.toLowerCase();
    if (!q) return true;
    return (
      s.userName.toLowerCase().includes(q) ||
      s.userEmail.toLowerCase().includes(q)
    );
  }) || [];

  const pendingCount = coaches?.filter((c) => c.status === "PENDING").length || 0;
  const approvedCount = coaches?.filter((c) => c.status === "APPROVED").length || 0;
  const rejectedCount = coaches?.filter((c) => c.status === "REJECTED").length || 0;
  const suspendedCount = coaches?.filter((c) => c.status === "SUSPENDED").length || 0;

  const handleCoachSelectAll = () => {
    if (selectedCoaches.length === filteredCoaches.length) {
      setSelectedCoaches([]);
    } else {
      setSelectedCoaches(filteredCoaches.map((c) => c.id));
    }
  };

  const handleCoachSelect = (id: number) => {
    setSelectedCoaches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCoachBulkAction = (action: string) => {
    setPendingBulkAction(action);
    setBulkDialogOpen(true);
  };

  const confirmCoachBulkAction = () => {
    if (pendingBulkAction && selectedCoaches.length > 0) {
      coachBulkActionMutation.mutate({ ids: selectedCoaches, action: pendingBulkAction });
    }
    setBulkDialogOpen(false);
    setPendingBulkAction(null);
  };

  const handleSeekerSelectAll = () => {
    if (selectedSeekers.length === filteredSeekers.length) {
      setSelectedSeekers([]);
    } else {
      setSelectedSeekers(filteredSeekers.map((s) => s.id));
    }
  };

  const handleSeekerSelect = (id: number) => {
    setSelectedSeekers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSeekerBulkAction = (action: string) => {
    setPendingSeekerBulkAction(action);
    setSeekerBulkDialogOpen(true);
  };

  const confirmSeekerBulkAction = () => {
    if (pendingSeekerBulkAction && selectedSeekers.length > 0) {
      seekerBulkActionMutation.mutate({ ids: selectedSeekers, action: pendingSeekerBulkAction });
    }
    setSeekerBulkDialogOpen(false);
    setPendingSeekerBulkAction(null);
  };

  const openEditCoachDialog = (coach: Coach) => {
    setEditCoach(coach);
    setEditForm(coachToFormState(coach));
    setEditCoachDialogOpen(true);
  };

  const handleSaveEditCoach = () => {
    if (!editCoach) return;
    editCoachMutation.mutate({
      id: editCoach.id,
      data: formStateToPayload(editForm),
    });
  };

  const handleSaveAddCoach = () => {
    addCoachMutation.mutate(formStateToPayload(addForm));
  };

  const getCoachStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" data-testid={`badge-status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-500" data-testid={`badge-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "SUSPENDED":
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}><Ban className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeekerStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" data-testid={`badge-seeker-status-${status}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "ACTIVE":
        return <Badge className="bg-green-500" data-testid={`badge-seeker-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "SUSPENDED":
        return <Badge variant="secondary" data-testid={`badge-seeker-status-${status}`}><Ban className="w-3 h-3 mr-1" />Suspended</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" data-testid={`badge-seeker-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleConfirmPayment = (seeker: CoachSeeker) => {
    const paidUntil = new Date();
    paidUntil.setDate(paidUntil.getDate() + 30);
    seekerActionMutation.mutate({
      id: seeker.id,
      data: { status: "ACTIVE", paidUntil: paidUntil.toISOString() },
    });
  };

  if (user?.role !== "OWNER") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive" data-testid="text-access-denied">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must have God's Mode access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2" data-testid="text-page-title">
            <GraduationCap className="h-6 w-6 text-primary" />
            Coach Management
          </h1>
          <p className="text-muted-foreground">Manage coaches and coach seeker memberships</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="coaches" data-testid="tab-coaches">
            <GraduationCap className="w-4 h-4 mr-2" />
            Coach Management
          </TabsTrigger>
          <TabsTrigger value="seekers" data-testid="tab-seekers">
            <Users className="w-4 h-4 mr-2" />
            Coach Seeker Memberships
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coaches" className="mt-6 space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-pending">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-approved">{approvedCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-rejected">{rejectedCount}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Suspended</CardTitle>
                <Ban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="count-suspended">{suspendedCount}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, city, postcode..."
                className="pl-10"
                value={coachSearch}
                onChange={(e) => setCoachSearch(e.target.value)}
                data-testid="input-search-coaches"
              />
            </div>

            <Button onClick={() => { setAddForm({ ...emptyFormState }); setAddCoachDialogOpen(true); }} data-testid="button-add-coach">
              <Plus className="h-4 w-4 mr-1" />
              Add Coach
            </Button>

            {selectedCoaches.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedCoaches.length} selected</span>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("APPROVED")} data-testid="button-bulk-approve">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("REJECTED")} data-testid="button-bulk-reject">
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All Selected
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCoachBulkAction("SUSPENDED")} data-testid="button-bulk-suspend">
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend All Selected
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)} data-testid="button-bulk-delete">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete All Selected
                </Button>
              </div>
            )}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-coaches-count">
                Coaches ({filteredCoaches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coachesLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : filteredCoaches.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No coaches found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCoaches.length === filteredCoaches.length && filteredCoaches.length > 0}
                            onCheckedChange={handleCoachSelectAll}
                            data-testid="checkbox-select-all-coaches"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Postcode</TableHead>
                        <TableHead>BE Cert</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoaches.map((coach) => (
                        <TableRow key={coach.id} data-testid={`row-coach-${coach.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCoaches.includes(coach.id)}
                              onCheckedChange={() => handleCoachSelect(coach.id)}
                              data-testid={`checkbox-coach-${coach.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-coach-name-${coach.id}`}>{coach.fullName}</span>
                          </TableCell>
                          <TableCell data-testid={`text-coach-role-${coach.id}`}>{coach.roleTitle || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-email-${coach.id}`}>{coach.email}</TableCell>
                          <TableCell data-testid={`text-coach-phone-${coach.id}`}>{coach.phone || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-city-${coach.id}`}>{coach.city || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-postcode-${coach.id}`}>{coach.postcode || "-"}</TableCell>
                          <TableCell data-testid={`text-coach-cert-${coach.id}`}>{coach.badmintonEnglandCert ? "Yes" : "No"}</TableCell>
                          <TableCell>{getCoachStatusBadge(coach.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-coach-actions-${coach.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {coach.status !== "APPROVED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "APPROVED" })}
                                    data-testid={`action-approve-coach-${coach.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {coach.status !== "REJECTED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "REJECTED" })}
                                    data-testid={`action-reject-coach-${coach.id}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                )}
                                {coach.status !== "SUSPENDED" && (
                                  <DropdownMenuItem
                                    onClick={() => coachActionMutation.mutate({ id: coach.id, action: "SUSPENDED" })}
                                    data-testid={`action-suspend-coach-${coach.id}`}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openEditCoachDialog(coach)}
                                  data-testid={`action-edit-coach-${coach.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteCoachMutation.mutate(coach.id)}
                                  data-testid={`action-delete-coach-${coach.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seekers" className="mt-6 space-y-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={seekerSearch}
                onChange={(e) => setSeekerSearch(e.target.value)}
                data-testid="input-search-seekers"
              />
            </div>

            {selectedSeekers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{selectedSeekers.length} selected</span>
                <Button variant="outline" size="sm" onClick={() => handleSeekerBulkAction("ACTIVE")} data-testid="button-bulk-approve-seekers">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSeekerBulkAction("SUSPENDED")} data-testid="button-bulk-suspend-seekers">
                  <Ban className="h-4 w-4 mr-1" />
                  Suspend All
                </Button>
              </div>
            )}
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-seekers-count">
                Coach Seekers ({filteredSeekers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seekersLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : filteredSeekers.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No coach seekers found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedSeekers.length === filteredSeekers.length && filteredSeekers.length > 0}
                            onCheckedChange={handleSeekerSelectAll}
                            data-testid="checkbox-select-all-seekers"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Until</TableHead>
                        <TableHead className="w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSeekers.map((seeker) => (
                        <TableRow key={seeker.id} data-testid={`row-seeker-${seeker.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSeekers.includes(seeker.id)}
                              onCheckedChange={() => handleSeekerSelect(seeker.id)}
                              data-testid={`checkbox-seeker-${seeker.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium" data-testid={`text-seeker-name-${seeker.id}`}>{seeker.fullName || seeker.userName}</span>
                              <p className="text-xs text-muted-foreground">{seeker.userName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-sm" data-testid={`text-seeker-email-${seeker.id}`}>{seeker.email || seeker.userEmail}</p>
                              {seeker.telephone && (
                                <p className="text-xs text-muted-foreground" data-testid={`text-seeker-phone-${seeker.id}`}>{seeker.telephone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              {seeker.timePlaying && <p data-testid={`text-seeker-time-${seeker.id}`}>Playing: {seeker.timePlaying}</p>}
                              {seeker.preferredTrainingLocation && <p data-testid={`text-seeker-location-${seeker.id}`}>Location: {seeker.preferredTrainingLocation}</p>}
                              {seeker.sessionPreference && <p data-testid={`text-seeker-pref-${seeker.id}`}>Preference: {seeker.sessionPreference}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{getSeekerStatusBadge(seeker.status)}</TableCell>
                          <TableCell data-testid={`text-seeker-paid-${seeker.id}`}>
                            {seeker.paidUntil ? new Date(seeker.paidUntil).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-seeker-actions-${seeker.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setEditingSeekerData(seeker)}
                                    data-testid={`action-edit-seeker-${seeker.id}`}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmPayment(seeker)}
                                    data-testid={`action-confirm-payment-${seeker.id}`}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Confirm Payment
                                  </DropdownMenuItem>
                                  {seeker.status !== "SUSPENDED" && (
                                    <DropdownMenuItem
                                      onClick={() => seekerActionMutation.mutate({ id: seeker.id, data: { status: "SUSPENDED" } })}
                                      data-testid={`action-suspend-seeker-${seeker.id}`}
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Suspend
                                    </DropdownMenuItem>
                                  )}
                                  {seeker.status !== "CANCELLED" && (
                                    <DropdownMenuItem
                                      onClick={() => seekerActionMutation.mutate({ id: seeker.id, data: { status: "CANCELLED" } })}
                                      data-testid={`action-cancel-seeker-${seeker.id}`}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setSuspendUserId(seeker.userId);
                                  setSuspendUserDialogOpen(true);
                                }}
                                data-testid={`button-suspend-user-${seeker.id}`}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Suspend User
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set {selectedCoaches.length} coach(es) to {pendingBulkAction}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCoachBulkAction} data-testid="button-confirm-bulk">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Coaches</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedCoaches.length} coach(es)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => bulkDeleteMutation.mutate(selectedCoaches)}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seekerBulkDialogOpen} onOpenChange={setSeekerBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to set {selectedSeekers.length} seeker(s) to {pendingSeekerBulkAction}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-seeker-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSeekerBulkAction} data-testid="button-confirm-seeker-bulk">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={suspendUserDialogOpen} onOpenChange={setSuspendUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all rights from this user by setting their account status to REJECTED. This action is serious and affects their entire account. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend-user">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => suspendUserId && suspendUserMutation.mutate(suspendUserId)}
              data-testid="button-confirm-suspend-user"
            >
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addCoachDialogOpen} onOpenChange={setAddCoachDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Coach</DialogTitle>
            <DialogDescription>Create a new coach profile with all details</DialogDescription>
          </DialogHeader>
          <CoachFormFields
            form={addForm}
            setForm={setAddForm}
            photoUploading={addPhotoUploading}
            onPhotoUpload={(file) => handlePhotoUpload(file, setAddPhotoUploading, setAddForm, addForm)}
            fileInputRef={addFileInputRef as React.RefObject<HTMLInputElement>}
            testIdPrefix="add"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCoachDialogOpen(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button onClick={handleSaveAddCoach} disabled={addCoachMutation.isPending} data-testid="button-save-add">
              {addCoachMutation.isPending ? "Adding..." : "Add Coach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCoachDialogOpen} onOpenChange={setEditCoachDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>Update coach details</DialogDescription>
          </DialogHeader>
          <CoachFormFields
            form={editForm}
            setForm={setEditForm}
            photoUploading={editPhotoUploading}
            onPhotoUpload={(file) => handlePhotoUpload(file, setEditPhotoUploading, setEditForm, editForm)}
            fileInputRef={editFileInputRef as React.RefObject<HTMLInputElement>}
            testIdPrefix="edit"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCoachDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEditCoach} disabled={editCoachMutation.isPending} data-testid="button-save-edit">
              {editCoachMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSeekerData} onOpenChange={(open) => { if (!open) setEditingSeekerData(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Coach Seeker</DialogTitle>
            <DialogDescription>Update seeker registration details</DialogDescription>
          </DialogHeader>
          {editingSeekerData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seeker-fullName">Full Name</Label>
                <Input
                  id="seeker-fullName"
                  value={editingSeekerData.fullName || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, fullName: e.target.value })}
                  data-testid="input-edit-seeker-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seeker-telephone">Telephone</Label>
                <Input
                  id="seeker-telephone"
                  value={editingSeekerData.telephone || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, telephone: e.target.value })}
                  data-testid="input-edit-seeker-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seeker-email">Email</Label>
                <Input
                  id="seeker-email"
                  type="email"
                  value={editingSeekerData.email || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, email: e.target.value })}
                  data-testid="input-edit-seeker-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seeker-timePlaying">Time Playing</Label>
                <Input
                  id="seeker-timePlaying"
                  value={editingSeekerData.timePlaying || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, timePlaying: e.target.value })}
                  data-testid="input-edit-seeker-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seeker-location">Preferred Training Location</Label>
                <Input
                  id="seeker-location"
                  value={editingSeekerData.preferredTrainingLocation || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, preferredTrainingLocation: e.target.value })}
                  data-testid="input-edit-seeker-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seeker-session">Session Preference</Label>
                <Input
                  id="seeker-session"
                  value={editingSeekerData.sessionPreference || ""}
                  onChange={(e) => setEditingSeekerData({ ...editingSeekerData, sessionPreference: e.target.value })}
                  data-testid="input-edit-seeker-pref"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSeekerData(null)} data-testid="button-cancel-edit-seeker">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSeekerData) {
                  seekerActionMutation.mutate({
                    id: editingSeekerData.id,
                    data: {
                      fullName: editingSeekerData.fullName,
                      telephone: editingSeekerData.telephone,
                      email: editingSeekerData.email,
                      timePlaying: editingSeekerData.timePlaying,
                      preferredTrainingLocation: editingSeekerData.preferredTrainingLocation,
                      sessionPreference: editingSeekerData.sessionPreference,
                    },
                  });
                  setEditingSeekerData(null);
                }
              }}
              disabled={seekerActionMutation.isPending}
              data-testid="button-save-edit-seeker"
            >
              {seekerActionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Users,
  MapPin,
  Calendar,
  FileText,
  BarChart3,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
  Archive,
  Upload,
  Paperclip,
  Image,
  Trash2,
} from "lucide-react";

const SEVERITY_OPTIONS = ["MINOR", "MODERATE", "SERIOUS", "EMERGENCY"] as const;
const STATUS_OPTIONS = ["PENDING_REVIEW", "UNDER_INVESTIGATION", "CLOSED"] as const;

const LOCATIONS = ["Court 1", "Court 2", "Court 3", "Lobby", "Changing Room", "Parking Lot", "Other"];
const INCIDENT_TYPES = ["Slip / Fall", "Collision (Player)", "Collision (Equipment)", "Equipment Failure", "Medical Condition", "Other"];
const REPORTER_ROLES = ["Member", "Coach", "Admin", "Other"];

const BODY_PARTS = [
  "Head", "Face", "Neck", "Shoulder", "Arm", "Elbow", "Forearm", "Wrist",
  "Hand/Fingers", "Back", "Chest", "Abdomen", "Hip", "Thigh", "Knee",
  "Lower Leg", "Ankle", "Foot/Toes", "Other",
];

const INJURY_TYPES = [
  "Twist / Sprain", "Sprain / Strain", "Bruise / Contusion", "Cut / Laceration",
  "Fracture / Break", "Dislocation", "Jammed Finger", "Concussion / Head Injury",
  "Shoulder Strain / Rotator Cuff", "Muscle Tear / Pull", "Other",
];

const IMMEDIATE_ACTIONS = [
  "First Aid Administered", "Session Paused", "Session Stopped",
  "Emergency Services Called", "Member Sent Home", "Other",
];

const FOLLOWUP_ACTIONS = [
  "Equipment Checked", "Court Condition Checked", "Player Debrief",
  "Medical Follow-Up", "Insurance Filed", "Other",
];

function severityColor(severity: string) {
  switch (severity) {
    case "MINOR": return "secondary";
    case "MODERATE": return "outline";
    case "SERIOUS": return "outline";
    case "EMERGENCY": return "destructive";
    default: return "secondary";
  }
}

function severityClassName(severity: string) {
  switch (severity) {
    case "MINOR": return "";
    case "MODERATE": return "border-amber-500 text-amber-700 dark:text-amber-400";
    case "SERIOUS": return "border-orange-500 text-orange-700 dark:text-orange-400";
    case "EMERGENCY": return "";
    default: return "";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "PENDING_REVIEW": return <Clock className="h-3 w-3" />;
    case "UNDER_INVESTIGATION": return <Search className="h-3 w-3" />;
    case "CLOSED": return <CheckCircle className="h-3 w-3" />;
    default: return null;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING_REVIEW": return "Pending Review";
    case "UNDER_INVESTIGATION": return "Under Investigation";
    case "CLOSED": return "Closed";
    default: return status;
  }
}

interface AffectedMember {
  memberId: number;
  memberName: string;
  bodyParts: string[];
  injuryTypes: string[];
  notes: string;
}

interface IncidentFormData {
  clubId: number | null;
  sessionId: number | null;
  reporterRole: string;
  contactInfo: string;
  date: string;
  time: string;
  location: string;
  locationOther: string;
  type: string;
  typeOther: string;
  description: string;
  affectedMembers: AffectedMember[];
  severity: string;
  medicalAttentionRequired: boolean;
  hospitalCalled: boolean;
  immediateActions: string[];
  immediateActionsOther: string;
  followupActions: string[];
  followupActionsOther: string;
  attachments: string[];
}

const initialFormData: IncidentFormData = {
  clubId: null,
  sessionId: null,
  reporterRole: "Member",
  contactInfo: "",
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  location: "",
  locationOther: "",
  type: "",
  typeOther: "",
  description: "",
  affectedMembers: [],
  severity: "",
  medicalAttentionRequired: false,
  hospitalCalled: false,
  immediateActions: [],
  immediateActionsOther: "",
  followupActions: [],
  followupActionsOther: "",
  attachments: [],
};

export default function IncidentReports() {
  const { toast } = useToast();
  const { data: user, isLoading: userLoading } = useQuery<any>({ queryKey: ["/api/user"] });
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<IncidentFormData>({ ...initialFormData });

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterClub, setFilterClub] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list");

  const { data: myClubs = [] } = useQuery<any[]>({ queryKey: ["/api/my-clubs"] });
  const { data: incidents = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/incidents"] });

  const { data: clubSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", `?clubId=${formData.clubId}`],
    enabled: !!formData.clubId,
  });

  const { data: sessionSignups = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions", formData.sessionId, "signups"],
    enabled: !!formData.sessionId,
  });

  const { data: clubMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs", formData.clubId, "members-list"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${formData.clubId}/members-list`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!formData.clubId,
  });

  const analyticsClubId = filterClub !== "ALL" ? filterClub : myClubs?.[0]?.id;
  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/incidents/analytics", analyticsClubId],
    enabled: isAdmin && !!analyticsClubId,
  });

  const filteredIncidents = useMemo(() => {
    let result = [...(incidents || [])];
    if (filterStatus !== "ALL") result = result.filter((i: any) => i.status === filterStatus);
    if (filterSeverity !== "ALL") result = result.filter((i: any) => i.severity === filterSeverity);
    if (filterClub !== "ALL") result = result.filter((i: any) => String(i.clubId) === filterClub);
    if (searchQuery) result = result.filter((i: any) => i.reportNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [incidents, filterStatus, filterSeverity, filterClub, searchQuery]);

  const [uploadingFiles, setUploadingFiles] = useState(false);

  async function handleFileUpload(files: FileList) {
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("files", f));
      const res = await fetch("/api/incidents/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...data.urls] }));
      toast({ title: "Uploaded", description: `${data.urls.length} file(s) uploaded.` });
    } catch (err: any) {
      toast({ title: "Upload Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFiles(false);
    }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        location: formData.location === "Other" ? formData.locationOther : formData.location,
        incidentType: formData.type === "Other" ? formData.typeOther : formData.type,
        incidentDate: formData.date,
        incidentTime: formData.time,
        reporterContact: formData.contactInfo,
        hospitalAmbulanceCalled: formData.hospitalCalled,
        followUpActions: formData.followupActions.includes("Other")
          ? [...formData.followupActions.filter(a => a !== "Other"), formData.followupActionsOther].filter(Boolean)
          : formData.followupActions,
        immediateActions: formData.immediateActions.includes("Other")
          ? [...formData.immediateActions.filter(a => a !== "Other"), formData.immediateActionsOther].filter(Boolean)
          : formData.immediateActions,
        affectedMembers: formData.affectedMembers.map(m => ({
          userId: m.memberId,
          injuredBodyParts: m.bodyParts,
          injuryTypes: m.injuryTypes,
          notes: m.notes,
        })),
        attachments: formData.attachments.length > 0 ? formData.attachments : null,
      };
      const res = await apiRequest("POST", "/api/incidents", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Incident Reported", description: "Your incident report has been submitted successfully." });
      setReportDialogOpen(false);
      setStep(1);
      setFormData({ ...initialFormData });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to submit report", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/incidents/${selectedIncident.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({ title: "Updated", description: "Incident report updated." });
      setDetailDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
    },
  });

  const [adminNotes, setAdminNotes] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  function openDetail(incident: any) {
    setSelectedIncident(incident);
    setAdminNotes(incident.adminNotes || "");
    setAdminStatus(incident.status || "PENDING_REVIEW");
    setDetailDialogOpen(true);
  }

  function toggleAffectedMember(memberId: number, memberName: string) {
    setFormData(prev => {
      const exists = prev.affectedMembers.find(m => m.memberId === memberId);
      if (exists) {
        return { ...prev, affectedMembers: prev.affectedMembers.filter(m => m.memberId !== memberId) };
      }
      return {
        ...prev,
        affectedMembers: [...prev.affectedMembers, { memberId, memberName, bodyParts: [], injuryTypes: [], notes: "" }],
      };
    });
  }

  function updateAffectedMember(memberId: number, field: keyof AffectedMember, value: any) {
    setFormData(prev => ({
      ...prev,
      affectedMembers: prev.affectedMembers.map(m =>
        m.memberId === memberId ? { ...m, [field]: value } : m
      ),
    }));
  }

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  }

  const canProceedStep1 = formData.clubId && formData.reporterRole;
  const canProceedStep2 = formData.location && formData.type && formData.description.length >= 10;
  const canProceedStep3 = formData.affectedMembers.length > 0;
  const canSubmit = formData.severity;

  const pendingCount = incidents?.filter((i: any) => i.status === "PENDING_REVIEW").length || 0;
  const seriousCount = incidents?.filter((i: any) => i.severity === "SERIOUS" || i.severity === "EMERGENCY").length || 0;

  const membersList = (clubMembers || []).map((m: any) => ({ id: m.userId || m.id, name: m.fullName || m.user?.fullName || `Member ${m.userId || m.id}` }));

  const [memberSearch, setMemberSearch] = useState("");
  const filteredMembers = membersList.filter((m: any) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Incident Reports</h1>
        </div>
        <Button onClick={() => { setReportDialogOpen(true); setStep(1); setFormData({ ...initialFormData }); }} data-testid="button-report-incident">
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {isAdmin && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-incident-view">
            <TabsTrigger value="list" data-testid="tab-list">Reports</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {renderListView()}
          </TabsContent>
          <TabsContent value="analytics">
            {renderAnalyticsView()}
          </TabsContent>
        </Tabs>
      )}

      {!isAdmin && renderListView()}

      {renderReportDialog()}
      {renderDetailDialog()}
    </div>
  );

  function renderListView() {
    return (
      <div className="space-y-4">
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-incidents">{incidents?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Serious / Emergency</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-serious-count">{seriousCount}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by report number..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-incidents"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                  <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-severity">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Severities</SelectItem>
                  <SelectItem value="MINOR">Minor</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="SERIOUS">Serious</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
              {myClubs && myClubs.length > 1 && (
                <Select value={filterClub} onValueChange={setFilterClub}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-club">
                    <SelectValue placeholder="Club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Clubs</SelectItem>
                    {myClubs.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No incident reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredIncidents.map((incident: any) => (
              <Card
                key={incident.id}
                className="hover-elevate cursor-pointer"
                onClick={() => openDetail(incident)}
                data-testid={`card-incident-${incident.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold" data-testid={`text-report-number-${incident.id}`}>
                            {incident.reportNumber || `INC-${incident.id}`}
                          </span>
                          <Badge variant={severityColor(incident.severity)} className={severityClassName(incident.severity)} data-testid={`badge-severity-${incident.id}`}>
                            {incident.severity}
                          </Badge>
                          <Badge variant="outline" className="gap-1" data-testid={`badge-status-${incident.id}`}>
                            {statusIcon(incident.status)}
                            {statusLabel(incident.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {(incident.incidentDate || incident.date) ? new Date(incident.incidentDate || incident.date).toLocaleDateString() : "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {incident.location || "Unknown"}
                          </span>
                          <span>{incident.incidentType || incident.type}</span>
                          {incident.affectedMembers?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {incident.affectedMembers.length} affected
                            </span>
                          )}
                          {incident.reporterName && <span>by {incident.reporterName}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAnalyticsView() {
    if (!analytics) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-analytics-total">{analytics.totalIncidents || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm" data-testid="text-severity-breakdown">
                {analytics.bySeverity ? Object.entries(analytics.bySeverity).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                )) : <span className="text-muted-foreground">No data</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Common Body Parts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm" data-testid="text-body-parts-breakdown">
                {analytics.commonBodyParts?.slice(0, 5).map((item: any) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                )) || <span className="text-muted-foreground">No data</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Common Injury Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm" data-testid="text-injury-types-breakdown">
                {analytics.commonInjuryTypes?.slice(0, 5).map((item: any) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                )) || <span className="text-muted-foreground">No data</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Location Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm" data-testid="text-location-breakdown">
                {analytics.locationBreakdown?.map((item: any) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                )) || <span className="text-muted-foreground">No data</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Incident Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm" data-testid="text-type-breakdown">
                {analytics.typeBreakdown?.map((item: any) => (
                  <div key={item.name} className="flex justify-between">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                )) || <span className="text-muted-foreground">No data</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {analytics.repeatIncidents?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Repeat Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2" data-testid="text-repeat-incidents">
                {analytics.repeatIncidents.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{item.memberName}</span>
                    <Badge variant="secondary">{item.count} incidents</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  function renderReportDialog() {
    return (
      <Dialog open={reportDialogOpen} onOpenChange={(v) => { setReportDialogOpen(v); if (!v) { setStep(1); setFormData({ ...initialFormData }); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Report Incident - Step {step} of 4
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Provide reporter information"}
              {step === 2 && "Describe the incident details"}
              {step === 3 && "Select affected members and injuries"}
              {step === 4 && "Set severity and actions taken"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          <div className="flex justify-between gap-2 pt-4 border-t">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-prev-step">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : <div />}
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
                data-testid="button-next-step"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit || submitMutation.isPending}
                data-testid="button-submit-incident"
              >
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Report
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Club *</Label>
          <Select
            value={formData.clubId ? String(formData.clubId) : ""}
            onValueChange={v => setFormData(prev => ({ ...prev, clubId: parseInt(v), sessionId: null }))}
          >
            <SelectTrigger data-testid="select-club">
              <SelectValue placeholder="Select club" />
            </SelectTrigger>
            <SelectContent>
              {myClubs?.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Session (optional)</Label>
          <Select
            value={formData.sessionId ? String(formData.sessionId) : "none"}
            onValueChange={v => setFormData(prev => ({ ...prev, sessionId: v === "none" ? null : parseInt(v) }))}
          >
            <SelectTrigger data-testid="select-session">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No session</SelectItem>
              {clubSessions?.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.title} - {new Date(s.date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Reporter Name</Label>
          <Select
            value={user?.id ? String(user.id) : ""}
            disabled
          >
            <SelectTrigger data-testid="select-reporter-name">
              <SelectValue placeholder={user?.fullName || "Current user"} />
            </SelectTrigger>
            <SelectContent>
              {user && <SelectItem value={String(user.id)}>{user.fullName}</SelectItem>}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Report is filed under your account</p>
        </div>

        <div className="space-y-2">
          <Label>Reporter Role *</Label>
          <div className="grid grid-cols-2 gap-2">
            {REPORTER_ROLES.map(role => (
              <button
                key={role}
                type="button"
                className={`p-3 rounded-md border text-sm text-left transition-colors ${
                  formData.reporterRole === role
                    ? "border-primary bg-primary/10 glass-selection-active"
                    : "border-border"
                }`}
                onClick={() => setFormData(prev => ({ ...prev, reporterRole: role }))}
                data-testid={`button-role-${role.toLowerCase()}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Contact Info (optional)</Label>
          <Input
            placeholder="Phone or email"
            value={formData.contactInfo}
            onChange={e => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
            data-testid="input-contact-info"
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              data-testid="input-incident-date"
            />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={formData.time}
              onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
              data-testid="input-incident-time"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location *</Label>
          <Select
            value={formData.location}
            onValueChange={v => setFormData(prev => ({ ...prev, location: v }))}
          >
            <SelectTrigger data-testid="select-location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map(l => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.location === "Other" && (
            <Input
              placeholder="Specify location"
              value={formData.locationOther}
              onChange={e => setFormData(prev => ({ ...prev, locationOther: e.target.value }))}
              data-testid="input-location-other"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Incident Type *</Label>
          <Select
            value={formData.type}
            onValueChange={v => setFormData(prev => ({ ...prev, type: v }))}
          >
            <SelectTrigger data-testid="select-incident-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.type === "Other" && (
            <Input
              placeholder="Specify incident type"
              value={formData.typeOther}
              onChange={e => setFormData(prev => ({ ...prev, typeOther: e.target.value }))}
              data-testid="input-type-other"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Description * (min 10 characters)</Label>
          <Textarea
            placeholder="Describe what happened..."
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            data-testid="input-description"
          />
          <p className="text-xs text-muted-foreground">{formData.description.length}/10 min characters</p>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Select Affected Members</Label>
          <Input
            placeholder="Search members..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            data-testid="input-search-members"
          />
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-2">
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {formData.clubId ? "No members found" : "Select a club first"}
            </p>
          ) : (
            filteredMembers.map((m: any) => (
              <label
                key={m.id}
                className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                data-testid={`checkbox-member-${m.id}`}
              >
                <Checkbox
                  checked={formData.affectedMembers.some(am => am.memberId === m.id)}
                  onCheckedChange={() => toggleAffectedMember(m.id, m.name)}
                />
                <span className="text-sm">{m.name}</span>
              </label>
            ))
          )}
        </div>

        {formData.affectedMembers.length > 0 && (
          <div className="space-y-3">
            <Label>Injury Details for Each Member</Label>
            {formData.affectedMembers.map(member => (
              <Card key={member.memberId}>
                <CardHeader
                  className="cursor-pointer py-3 px-4"
                  onClick={() => {
                    setExpandedMembers(prev => {
                      const next = new Set(prev);
                      if (next.has(member.memberId)) next.delete(member.memberId);
                      else next.add(member.memberId);
                      return next;
                    });
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{member.memberName}</span>
                    {expandedMembers.has(member.memberId) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedMembers.has(member.memberId) && (
                  <CardContent className="pt-0 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Body Parts Affected</Label>
                      <div className="flex flex-wrap gap-2">
                        {BODY_PARTS.map(bp => (
                          <label key={bp} className="flex items-center gap-1.5 text-xs" data-testid={`checkbox-bodypart-${member.memberId}-${bp}`}>
                            <Checkbox
                              checked={member.bodyParts.includes(bp)}
                              onCheckedChange={() => updateAffectedMember(member.memberId, "bodyParts", toggleArrayItem(member.bodyParts, bp))}
                            />
                            {bp}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Injury Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {INJURY_TYPES.map(it => (
                          <label key={it} className="flex items-center gap-1.5 text-xs" data-testid={`checkbox-injury-${member.memberId}-${it}`}>
                            <Checkbox
                              checked={member.injuryTypes.includes(it)}
                              onCheckedChange={() => updateAffectedMember(member.memberId, "injuryTypes", toggleArrayItem(member.injuryTypes, it))}
                            />
                            {it}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Notes</Label>
                      <Input
                        placeholder="Additional notes for this member..."
                        value={member.notes}
                        onChange={e => updateAffectedMember(member.memberId, "notes", e.target.value)}
                        data-testid={`input-member-notes-${member.memberId}`}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Severity *</Label>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITY_OPTIONS.map(sev => {
              const colors: Record<string, string> = {
                MINOR: "border-muted-foreground/30",
                MODERATE: "border-amber-500",
                SERIOUS: "border-orange-500",
                EMERGENCY: "border-destructive",
              };
              const bgColors: Record<string, string> = {
                MINOR: "bg-muted/50",
                MODERATE: "bg-amber-500/10",
                SERIOUS: "bg-orange-500/10",
                EMERGENCY: "bg-destructive/10",
              };
              return (
                <button
                  key={sev}
                  type="button"
                  className={`p-3 rounded-md border-2 text-sm text-left transition-colors ${
                    formData.severity === sev
                      ? `${colors[sev]} ${bgColors[sev]} glass-selection-active`
                      : "border-border"
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, severity: sev }))}
                  data-testid={`button-severity-${sev.toLowerCase()}`}
                >
                  <div className="font-medium">{sev.charAt(0) + sev.slice(1).toLowerCase()}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label>Medical Attention Required</Label>
          <Switch
            checked={formData.medicalAttentionRequired}
            onCheckedChange={v => setFormData(prev => ({ ...prev, medicalAttentionRequired: v }))}
            data-testid="switch-medical-attention"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label>Hospital / Ambulance Called</Label>
          <Switch
            checked={formData.hospitalCalled}
            onCheckedChange={v => setFormData(prev => ({ ...prev, hospitalCalled: v }))}
            data-testid="switch-hospital-called"
          />
        </div>

        <div className="space-y-2">
          <Label>Immediate Actions Taken</Label>
          <div className="space-y-1">
            {IMMEDIATE_ACTIONS.map(action => (
              <label key={action} className="flex items-center gap-2 text-sm" data-testid={`checkbox-immediate-${action}`}>
                <Checkbox
                  checked={formData.immediateActions.includes(action)}
                  onCheckedChange={() => setFormData(prev => ({ ...prev, immediateActions: toggleArrayItem(prev.immediateActions, action) }))}
                />
                {action}
              </label>
            ))}
          </div>
          {formData.immediateActions.includes("Other") && (
            <Input
              placeholder="Specify other action..."
              value={formData.immediateActionsOther}
              onChange={e => setFormData(prev => ({ ...prev, immediateActionsOther: e.target.value }))}
              data-testid="input-immediate-other"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Follow-up Actions</Label>
          <div className="space-y-1">
            {FOLLOWUP_ACTIONS.map(action => (
              <label key={action} className="flex items-center gap-2 text-sm" data-testid={`checkbox-followup-${action}`}>
                <Checkbox
                  checked={formData.followupActions.includes(action)}
                  onCheckedChange={() => setFormData(prev => ({ ...prev, followupActions: toggleArrayItem(prev.followupActions, action) }))}
                />
                {action}
              </label>
            ))}
          </div>
          {formData.followupActions.includes("Other") && (
            <Input
              placeholder="Specify other follow-up..."
              value={formData.followupActionsOther}
              onChange={e => setFormData(prev => ({ ...prev, followupActionsOther: e.target.value }))}
              data-testid="input-followup-other"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Attachments (photos, documents)</Label>
          <div
            className="glass-upload-zone p-6 text-center cursor-pointer"
            onClick={() => document.getElementById("incident-file-input")?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-active"); }}
            onDragLeave={e => { e.currentTarget.classList.remove("drag-active"); }}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove("drag-active"); if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files); }}
            data-testid="upload-zone-attachments"
          >
            {uploadingFiles ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click or drag files here</p>
                <p className="text-xs text-muted-foreground mt-1">Images and documents up to 10MB (max 5 files)</p>
              </>
            )}
          </div>
          <input
            id="incident-file-input"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={e => { if (e.target.files) handleFileUpload(e.target.files); e.target.value = ""; }}
          />
          {formData.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.attachments.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg border overflow-hidden" data-testid={`attachment-preview-${idx}`}>
                  {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={url} alt={`Attachment ${idx + 1}`} className="h-16 w-16 object-cover" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-muted">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                    data-testid={`button-remove-attachment-${idx}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDetailDialog() {
    if (!selectedIncident) return null;

    return (
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedIncident.reportNumber || `INC-${selectedIncident.id}`}
            </DialogTitle>
            <DialogDescription>Incident report details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={severityColor(selectedIncident.severity)} className={severityClassName(selectedIncident.severity)}>
                {selectedIncident.severity}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {statusIcon(selectedIncident.status)}
                {statusLabel(selectedIncident.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-medium" data-testid="text-detail-date">{(selectedIncident.incidentDate || selectedIncident.date) ? new Date(selectedIncident.incidentDate || selectedIncident.date).toLocaleDateString() : "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time</span>
                <p className="font-medium" data-testid="text-detail-time">{selectedIncident.incidentTime || selectedIncident.time || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium" data-testid="text-detail-location">{selectedIncident.location || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium" data-testid="text-detail-type">{selectedIncident.incidentType || selectedIncident.type || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Reporter Role</span>
                <p className="font-medium">{selectedIncident.reporterRole || "N/A"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Medical Attention</span>
                <p className="font-medium">{selectedIncident.medicalAttentionRequired ? "Yes" : "No"}</p>
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="text-sm mt-1" data-testid="text-detail-description">{selectedIncident.description}</p>
            </div>

            {selectedIncident.affectedMembers?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Affected Members</span>
                <div className="space-y-2 mt-1">
                  {selectedIncident.affectedMembers.map((m: any, idx: number) => (
                    <Card key={idx}>
                      <CardContent className="py-2 px-3 text-sm">
                        <p className="font-medium">{m.memberName || `Member ${m.memberId}`}</p>
                        {m.bodyParts?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.bodyParts.map((bp: string) => (
                              <Badge key={bp} variant="secondary">{bp}</Badge>
                            ))}
                          </div>
                        )}
                        {m.injuryTypes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.injuryTypes.map((it: string) => (
                              <Badge key={it} variant="outline">{it}</Badge>
                            ))}
                          </div>
                        )}
                        {m.notes && <p className="text-muted-foreground mt-1">{m.notes}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedIncident.immediateActions?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Immediate Actions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedIncident.immediateActions.map((a: string) => (
                    <Badge key={a} variant="secondary">{a}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedIncident.followupActions?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Follow-up Actions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedIncident.followupActions.map((a: string) => (
                    <Badge key={a} variant="secondary">{a}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedIncident.attachments?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Attachments ({selectedIncident.attachments.length})
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedIncident.attachments.map((url: string, idx: number) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block" data-testid={`link-attachment-${idx}`}>
                      {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={url} alt={`Attachment ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="h-20 w-20 flex flex-col items-center justify-center rounded-lg border bg-muted hover:bg-muted/80 transition-colors">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Document</span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-sm">Admin Actions</h3>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={adminStatus} onValueChange={setAdminStatus}>
                    <SelectTrigger data-testid="select-admin-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                      <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes..."
                    data-testid="input-admin-notes"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => updateMutation.mutate({ status: adminStatus, adminNotes })}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-admin-changes"
                  >
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateMutation.mutate({ status: "CLOSED", adminNotes, archived: true })}
                    disabled={updateMutation.isPending}
                    data-testid="button-archive-incident"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Loader2,
  UserCheck,
  ClipboardCheck,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  Star,
  Users,
  TrendingDown,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

type TrialPlayerData = {
  id: number;
  userId: number;
  clubId: number;
  referralId: number | null;
  status: string;
  assignedSessionId: number | null;
  observerUserId: number | null;
  selfAssessedLevel: string | null;
  experience: string | null;
  preferredDays: string[] | null;
  adminNotes: string | null;
  statusMessage: string | null;
  finalDecision: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  clubName: string;
  sessionTitle: string | null;
  sessionDate: string | null;
  sessionStartTime: string | null;
  observerName: string | null;
  evaluation: {
    id: number;
    technicalLevel: number;
    tacticalUnderstanding: number;
    movementFootwork: number;
    matchAwareness: number;
    communicationAttitude: number;
    overallScore: string;
    recommendation: string;
    adminOverrideDecision: string | null;
    notes: string | null;
  } | null;
};

type SessionRecommendation = {
  sessionId: number;
  title: string;
  date: string;
  startTime: string;
  matchMode: string | null;
  venueName: string;
  maxPlayers: number | null;
  score: number;
};

type FunnelData = {
  funnel: {
    registered: number;
    referralLinked: number;
    scheduled: number;
    completed: number;
    passed: number;
    joined: number;
  };
  topReferrers: { name: string; total: number; passed: number }[];
};

type SortField = "userName" | "clubName" | "status" | "sessionDate" | "createdAt" | "overallScore";
type SortDir = "asc" | "desc";

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING": return "secondary";
    case "SCHEDULED": return "default";
    case "ATTENDED": return "default";
    case "EVALUATED": return "default";
    case "APPROVED": return "default";
    case "REDIRECTED": return "secondary";
    case "REJECTED": return "destructive";
    default: return "secondary";
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function TrialManagement() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clubFilter, setClubFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [assignModal, setAssignModal] = useState<TrialPlayerData | null>(null);
  const [evaluateModal, setEvaluateModal] = useState<TrialPlayerData | null>(null);
  const [decideModal, setDecideModal] = useState<{ trial: TrialPlayerData; decision: string } | null>(null);
  const [attendConfirm, setAttendConfirm] = useState<TrialPlayerData | null>(null);
  const [showFunnel, setShowFunnel] = useState(false);

  const { data: trialPlayers, isLoading } = useQuery<TrialPlayerData[]>({
    queryKey: ["/api/admin/trial-players"],
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ["/api/admin/trial-players/referral-funnel"],
    enabled: showFunnel,
  });

  const clubs = useMemo(() => {
    if (!trialPlayers) return [];
    const seen = new Set<number>();
    return trialPlayers
      .filter(t => { if (seen.has(t.clubId)) return false; seen.add(t.clubId); return true; })
      .map(t => ({ id: t.clubId, name: t.clubName }));
  }, [trialPlayers]);

  const filtered = useMemo(() => {
    if (!trialPlayers) return [];
    let result = [...trialPlayers];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }
    if (clubFilter !== "all") {
      result = result.filter(t => t.clubId === parseInt(clubFilter));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "userName": cmp = a.userName.localeCompare(b.userName); break;
        case "clubName": cmp = a.clubName.localeCompare(b.clubName); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "sessionDate":
          cmp = (a.sessionDate || "").localeCompare(b.sessionDate || "");
          break;
        case "createdAt": cmp = a.createdAt.localeCompare(b.createdAt); break;
        case "overallScore":
          cmp = parseFloat(a.evaluation?.overallScore || "0") - parseFloat(b.evaluation?.overallScore || "0");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [trialPlayers, search, statusFilter, clubFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  const statusCounts = useMemo(() => {
    if (!trialPlayers) return {};
    const counts: Record<string, number> = {};
    trialPlayers.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  }, [trialPlayers]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="trial-management-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Trial Command Center</h1>
          <p className="text-sm text-muted-foreground">Manage trial player lifecycle from registration to decision</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFunnel(!showFunnel)}
          data-testid="button-toggle-funnel"
        >
          <TrendingDown className="h-4 w-4 mr-2" />
          {showFunnel ? "Hide" : "Show"} Referral Funnel
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {["PENDING", "SCHEDULED", "ATTENDED", "EVALUATED", "APPROVED", "REDIRECTED", "REJECTED"].map(status => (
          <Card
            key={status}
            className={`cursor-pointer hover-elevate ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            data-testid={`card-status-${status.toLowerCase()}`}
          >
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold" data-testid={`text-count-${status.toLowerCase()}`}>
                {statusCounts[status] || 0}
              </div>
              <div className="text-xs text-muted-foreground">{getStatusLabel(status)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showFunnel && (
        <Card data-testid="card-referral-funnel">
          <CardHeader>
            <CardTitle className="text-lg">Referral Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : funnelData ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "Registered", value: funnelData.funnel.registered },
                    { label: "Referral Linked", value: funnelData.funnel.referralLinked },
                    { label: "Scheduled", value: funnelData.funnel.scheduled },
                    { label: "Completed", value: funnelData.funnel.completed },
                    { label: "Passed", value: funnelData.funnel.passed },
                    { label: "Joined", value: funnelData.funnel.joined },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className="flex flex-col items-center" data-testid={`funnel-step-${step.label.toLowerCase().replace(/\s/g, "-")}`}>
                        <div className="text-xl font-bold">{step.value}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{step.label}</div>
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    </div>
                  ))}
                </div>

                {funnelData.topReferrers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Top Referrers</h4>
                    <div className="space-y-1">
                      {funnelData.topReferrers.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm" data-testid={`text-referrer-${i}`}>
                          <span>{r.name}</span>
                          <span className="text-muted-foreground">{r.passed}/{r.total} passed</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["PENDING", "SCHEDULED", "ATTENDED", "EVALUATED", "APPROVED", "REDIRECTED", "REJECTED"].map(s => (
              <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-full sm:w-44" data-testid="select-club-filter">
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {clubs.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("userName")} data-testid="th-player-name">
                    Player <SortIcon field="userName" />
                  </TableHead>
                  <TableHead>Referral</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("clubName")} data-testid="th-club">
                    Club <SortIcon field="clubName" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("status")} data-testid="th-status">
                    Status <SortIcon field="status" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("sessionDate")} data-testid="th-session">
                    Session <SortIcon field="sessionDate" />
                  </TableHead>
                  <TableHead>Observer</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("overallScore")} data-testid="th-score">
                    Score <SortIcon field="overallScore" />
                  </TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No trial players found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(trial => (
                    <TableRow key={trial.id} data-testid={`row-trial-${trial.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-name-${trial.id}`}>{trial.userName}</div>
                          <div className="text-xs text-muted-foreground">{trial.userEmail}</div>
                          {trial.selfAssessedLevel && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">{trial.selfAssessedLevel}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" data-testid={`text-referral-${trial.id}`}>
                          {trial.referralId ? "Yes" : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" data-testid={`text-club-${trial.id}`}>{trial.clubName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(trial.status) as any} data-testid={`badge-status-${trial.id}`}>
                          {getStatusLabel(trial.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {trial.sessionTitle ? (
                          <div className="text-sm" data-testid={`text-session-${trial.id}`}>
                            <div>{trial.sessionTitle}</div>
                            {trial.sessionDate && (
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(trial.sessionDate), "dd MMM yyyy")}
                                {trial.sessionStartTime && ` ${trial.sessionStartTime}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm" data-testid={`text-observer-${trial.id}`}>
                          {trial.observerName || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {trial.evaluation ? (
                          <div className="text-sm" data-testid={`text-score-${trial.id}`}>
                            <div className="font-semibold">{trial.evaluation.overallScore}/10</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {trial.evaluation.recommendation}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {trial.finalDecision ? (
                          <Badge
                            variant={trial.finalDecision === "APPROVED" ? "default" : trial.finalDecision === "REJECTED" ? "destructive" : "secondary"}
                            data-testid={`badge-decision-${trial.id}`}
                          >
                            {getStatusLabel(trial.finalDecision)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TrialActions trial={trial} onAssign={() => setAssignModal(trial)} onEvaluate={() => setEvaluateModal(trial)} onDecide={(d) => setDecideModal({ trial, decision: d })} onAttend={() => setAttendConfirm(trial)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {assignModal && (
        <AssignSessionModal
          trial={assignModal}
          onClose={() => setAssignModal(null)}
        />
      )}

      {evaluateModal && (
        <EvaluationModal
          trial={evaluateModal}
          onClose={() => setEvaluateModal(null)}
        />
      )}

      {decideModal && (
        <DecisionConfirmDialog
          trial={decideModal.trial}
          decision={decideModal.decision}
          onClose={() => setDecideModal(null)}
        />
      )}

      {attendConfirm && (
        <MarkAttendedDialog
          trial={attendConfirm}
          onClose={() => setAttendConfirm(null)}
        />
      )}
    </div>
  );
}

function TrialActions({
  trial,
  onAssign,
  onEvaluate,
  onDecide,
  onAttend,
}: {
  trial: TrialPlayerData;
  onAssign: () => void;
  onEvaluate: () => void;
  onDecide: (d: string) => void;
  onAttend: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {(trial.status === "PENDING" || trial.status === "SCHEDULED") && (
        <Button size="sm" variant="outline" onClick={onAssign} data-testid={`button-assign-${trial.id}`}>
          <Calendar className="h-3 w-3 mr-1" />
          Assign
        </Button>
      )}
      {trial.status === "SCHEDULED" && (
        <Button size="sm" variant="outline" onClick={onAttend} data-testid={`button-attend-${trial.id}`}>
          <UserCheck className="h-3 w-3 mr-1" />
          Attended
        </Button>
      )}
      {(trial.status === "ATTENDED" || trial.status === "SCHEDULED") && (
        <Button size="sm" variant="outline" onClick={onEvaluate} data-testid={`button-evaluate-${trial.id}`}>
          <ClipboardCheck className="h-3 w-3 mr-1" />
          Evaluate
        </Button>
      )}
      {!trial.finalDecision && (
        <div className="flex gap-1">
          <Button size="sm" onClick={() => onDecide("APPROVED")} data-testid={`button-approve-${trial.id}`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Approve
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onDecide("REDIRECTED")} data-testid={`button-redirect-${trial.id}`}>
            <ArrowRight className="h-3 w-3 mr-1" />
            Redirect
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDecide("REJECTED")} data-testid={`button-reject-${trial.id}`}>
            <XCircle className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function AssignSessionModal({ trial, onClose }: { trial: TrialPlayerData; onClose: () => void }) {
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const { data: recommendations, isLoading } = useQuery<SessionRecommendation[]>({
    queryKey: ["/api/admin/trial-players", trial.id, "session-recommendations"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/trial-players/${trial.id}/session-recommendations`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/trial-players/${trial.id}/assign-session`, {
        sessionId: parseInt(selectedSessionId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-players"] });
      toast({ title: "Session Assigned", description: `Session assigned to ${trial.userName}` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to assign session", variant: "destructive" });
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-assign-session">
        <DialogHeader>
          <DialogTitle>Assign Session to {trial.userName}</DialogTitle>
          <DialogDescription>
            Level: {trial.selfAssessedLevel || "Not specified"} | Preferred days: {trial.preferredDays?.join(", ") || "None"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recommendations && recommendations.length > 0 ? (
              recommendations.map(rec => (
                <div
                  key={rec.sessionId}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedSessionId === String(rec.sessionId) ? "border-primary bg-primary/5" : "hover-elevate"}`}
                  onClick={() => setSelectedSessionId(String(rec.sessionId))}
                  data-testid={`session-rec-${rec.sessionId}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{rec.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rec.date ? format(new Date(rec.date), "EEE, dd MMM yyyy") : "No date"} {rec.startTime && `at ${rec.startTime}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rec.venueName}{rec.clubName ? ` · ${rec.clubName}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {rec.score > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="h-3 w-3 mr-0.5" />
                          Match: {rec.score}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming sessions found. Create a session first.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-assign">Cancel</Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedSessionId || assignMutation.isPending}
            data-testid="button-confirm-assign"
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EvaluationModal({ trial, onClose }: { trial: TrialPlayerData; onClose: () => void }) {
  const { toast } = useToast();
  const [technical, setTechnical] = useState(5);
  const [tactical, setTactical] = useState(5);
  const [movement, setMovement] = useState(5);
  const [matchAwareness, setMatchAwareness] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [notes, setNotes] = useState("");

  const avg = ((technical + tactical + movement + matchAwareness + communication) / 5).toFixed(1);
  const recommendation = parseFloat(avg) >= 8
    ? "Recommended for club membership"
    : parseFloat(avg) >= 5
    ? "Recommended for training programme"
    : "Not suitable at this time";

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/trial-players/${trial.id}/evaluate`, {
        technicalLevel: technical,
        tacticalUnderstanding: tactical,
        movementFootwork: movement,
        matchAwareness,
        communicationAttitude: communication,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-players"] });
      toast({ title: "Evaluation Submitted", description: `Evaluation for ${trial.userName} recorded` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to submit evaluation", variant: "destructive" });
    },
  });

  const sliders = [
    { label: "Technical Level", value: technical, setter: setTechnical },
    { label: "Tactical Understanding", value: tactical, setter: setTactical },
    { label: "Movement & Footwork", value: movement, setter: setMovement },
    { label: "Match Awareness", value: matchAwareness, setter: setMatchAwareness },
    { label: "Communication & Attitude", value: communication, setter: setCommunication },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="dialog-evaluate">
        <DialogHeader>
          <DialogTitle>Evaluate {trial.userName}</DialogTitle>
          <DialogDescription>Score each category from 1 to 10</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sliders.map(s => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{s.label}</Label>
                <span className="text-sm font-semibold" data-testid={`text-slider-value-${s.label.replace(/\s/g, "-").toLowerCase()}`}>
                  {s.value}
                </span>
              </div>
              <Slider
                value={[s.value]}
                min={1}
                max={10}
                step={1}
                onValueChange={v => s.setter(v[0])}
                data-testid={`slider-${s.label.replace(/\s/g, "-").toLowerCase()}`}
              />
            </div>
          ))}

          <div className="rounded-md border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-lg font-bold" data-testid="text-overall-score">{avg}/10</span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-recommendation">{recommendation}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional observations..."
              rows={3}
              data-testid="input-eval-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-evaluate">Cancel</Button>
          <Button
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
            data-testid="button-submit-evaluation"
          >
            {evaluateMutation.isPending ? "Submitting..." : "Submit Evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionConfirmDialog({ trial, decision, onClose }: { trial: TrialPlayerData; decision: string; onClose: () => void }) {
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState("");

  const decideMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/trial-players/${trial.id}/decide`, {
        decision,
        statusMessage: statusMessage || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-players"] });
      toast({ title: "Decision Recorded", description: `${trial.userName} has been ${decision.toLowerCase()}` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to record decision", variant: "destructive" });
    },
  });

  const labels: Record<string, { title: string; description: string }> = {
    APPROVED: { title: "Approve Trial Player", description: `Approve ${trial.userName} as a full club member?` },
    REDIRECTED: { title: "Redirect to Training", description: `Redirect ${trial.userName} to training programme?` },
    REJECTED: { title: "Reject Trial Player", description: `Reject ${trial.userName}'s trial application?` },
  };

  const info = labels[decision] || { title: "Decision", description: "" };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent data-testid="dialog-decide">
        <AlertDialogHeader>
          <AlertDialogTitle>{info.title}</AlertDialogTitle>
          <AlertDialogDescription>{info.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label className="text-sm">Custom message (optional)</Label>
          <Textarea
            value={statusMessage}
            onChange={e => setStatusMessage(e.target.value)}
            placeholder="Optional message to the player..."
            rows={2}
            data-testid="input-decision-message"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-decide">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => decideMutation.mutate()}
            disabled={decideMutation.isPending}
            className={decision === "REJECTED" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            data-testid="button-confirm-decide"
          >
            {decideMutation.isPending ? "Processing..." : `Confirm ${getStatusLabel(decision)}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MarkAttendedDialog({ trial, onClose }: { trial: TrialPlayerData; onClose: () => void }) {
  const { toast } = useToast();

  const attendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/admin/trial-players/${trial.id}/mark-attended`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trial-players"] });
      toast({ title: "Marked Attended", description: `${trial.userName} marked as attended` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to mark attended", variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent data-testid="dialog-attend">
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as Attended</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm that {trial.userName} attended their trial session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-attend">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => attendMutation.mutate()}
            disabled={attendMutation.isPending}
            data-testid="button-confirm-attend"
          >
            {attendMutation.isPending ? "Processing..." : "Confirm Attended"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

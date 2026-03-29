import { useState, useMemo, useCallback, useEffect } from "react";
import { KpiDetailDialog } from "@/components/ExpandableChartDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format, isToday, startOfDay } from "date-fns";
import {
  PoundSterling,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Users,
  Calendar,
  Clock,
  X,
  Plus,
  CreditCard,
  Percent,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Package,
  Trash2,
  History,
  Building2,
  ArrowDownAZ,
  ArrowUpDown,
  AlertTriangle,
  CheckSquare,
  Square,
  UserPlus,
  Heart,
  Bell,
  Send,
  Mail,
  Crown,
  BarChart3,
  LayoutDashboard,
  Activity,
  FileText,
  Target,
  Lightbulb,
  Hash,
  Check,
  List,
  Gift,
  Award,
  Star,
  RotateCcw,
} from "lucide-react";
import FinancialAnalyticsView from "@/components/FinancialAnalyticsView";
import ProfitabilityView from "@/components/financial/ProfitabilityView";
import CashflowView from "@/components/financial/CashflowView";
import ReportsView from "@/components/financial/ReportsView";
import SmartInsights from "@/components/financial/SmartInsights";

interface FinancialEntry {
  signupId: number;
  sessionId: number;
  playerId: number;
  fee: number;
  paymentStatus: "PAID" | "UNPAID" | "PENDING";
  paymentMethod?: "CARD" | "BANK_TRANSFER" | "CASH" | "ONLINE" | "MEMBERSHIP_CREDIT" | "NONE" | null;
  signupStatus?: "CONFIRMED" | "WAITING" | "CANCELLED" | null;
  verifiedByAdmin?: boolean | null;
  attendanceStatus: string;
  attendanceNote: string | null;
  partialPercentage: number | null;
  policyMet: boolean | null;
  signupTime: string;
  sessionTitle: string;
  sessionDate: string;
  sessionType: string;
  matchMode: string;
  sessionFee: number;
  invoiceNumber: string | null;
  clubId: number;
  clubName: string;
  clubSessionFee: number | null;
  playerName: string;
  playerEmail: string;
  playerUserId: number | null;
  membershipStatus: string | null;
  membershipPlanName: string | null;
  membershipSessionFee: number | null;
  creditApplied?: number;
  paymentNotes?: string | null;
}

type AttendanceStatus =
  | "ATTENDED"
  | "NOT_ATTENDED"
  | "PARTIAL_ATTENDANCE"
  | "LATE_ARRIVAL"
  | "NO_SHOW"
  | "JUSTIFIED_CANCELLATION"
  | "SICKNESS"
  | "EMERGENCY"
  | "SESSION_ABANDONED"
  | "OTHER";

const ALL_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "ATTENDED",
  "NOT_ATTENDED",
  "PARTIAL_ATTENDANCE",
  "LATE_ARRIVAL",
  "NO_SHOW",
  "JUSTIFIED_CANCELLATION",
  "SICKNESS",
  "EMERGENCY",
  "SESSION_ABANDONED",
  "OTHER",
];

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  ATTENDED: "Attended",
  NOT_ATTENDED: "Not Attended",
  PARTIAL_ATTENDANCE: "Partial Attendance",
  LATE_ARRIVAL: "Late Arrival",
  NO_SHOW: "No Show",
  JUSTIFIED_CANCELLATION: "Justified Cancellation",
  SICKNESS: "Sickness",
  EMERGENCY: "Emergency",
  SESSION_ABANDONED: "Session Abandoned",
  OTHER: "Other",
};

const ABANDONED_REASONS = ["Venue issue", "Coach issue", "Safety issue", "Weather", "Other"];


function formatPounds(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface DonationRecord {
  id: number;
  userId: number;
  amount: number;
  paymentDate: string | null;
  reference: string | null;
  message: string | null;
  status: "PLEDGED" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
  confirmedByAdminId?: number;
  confirmedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  fullName: string | null;
  email: string | null;
}

interface BankDetailsForm {
  bankName: string;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  bankReference: string;
}

function DonationsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: currentUser } = useQuery<{ role: string }>({ queryKey: ["/api/user"] });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editBankOpen, setEditBankOpen] = useState(false);
  const [editDonationId, setEditDonationId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  const { data: allDonations, isLoading } = useQuery<DonationRecord[]>({
    queryKey: ["/api/donations"],
  });

  const { data: bankDetails } = useQuery<BankDetailsForm>({
    queryKey: ["/api/donation-bank-details"],
  });

  const [bankForm, setBankForm] = useState<BankDetailsForm>({
    bankName: "", bankAccountName: "", bankSortCode: "", bankAccountNumber: "", bankReference: "",
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data: BankDetailsForm) => {
      const res = await apiRequest("PUT", "/api/admin/donation-bank-details", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/donation-bank-details"] });
      setEditBankOpen(false);
      toast({ title: "Bank details updated" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes: string }) => {
      const res = await apiRequest("PATCH", `/api/donations/${id}/status`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/donations"] });
      setEditDonationId(null);
      toast({ title: "Donation status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/donations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/donations"] });
      toast({ title: "Donation deleted" });
    },
  });

  const filtered = useMemo(() => {
    if (!allDonations) return [];
    if (statusFilter === "all") return allDonations;
    return allDonations.filter(d => d.status === statusFilter);
  }, [allDonations, statusFilter]);

  const summary = useMemo(() => {
    if (!allDonations) return { total: 0, received: 0, pending: 0, cancelled: 0, count: 0 };
    return {
      total: allDonations.reduce((s, d) => s + d.amount, 0),
      received: allDonations.filter(d => d.status === "RECEIVED").reduce((s, d) => s + d.amount, 0),
      pending: allDonations.filter(d => d.status === "PLEDGED" || d.status === "CONFIRMED").reduce((s, d) => s + d.amount, 0),
      cancelled: allDonations.filter(d => d.status === "CANCELLED").reduce((s, d) => s + d.amount, 0),
      count: allDonations.length,
    };
  }, [allDonations]);

  const statusColor = (s: string) => {
    switch (s) {
      case "RECEIVED": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
      case "CONFIRMED": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "PLEDGED": return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "CANCELLED": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          Donations
        </h2>
        <Button variant="outline" size="sm" onClick={() => {
          setBankForm({
            bankName: bankDetails?.bankName || "",
            bankAccountName: bankDetails?.bankAccountName || "",
            bankSortCode: bankDetails?.bankSortCode || "",
            bankAccountNumber: bankDetails?.bankAccountNumber || "",
            bankReference: bankDetails?.bankReference || "",
          });
          setEditBankOpen(true);
        }} data-testid="button-edit-bank-details">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit Bank Details
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card data-testid="card-total-donations">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pledged</p>
            <p className="text-xl font-bold">{"\u00A3"}{formatPounds(summary.total)}</p>
            <p className="text-[10px] text-muted-foreground">{summary.count} donations</p>
          </CardContent>
        </Card>
        <Card data-testid="card-received-donations">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-xl font-bold text-green-600">{"\u00A3"}{formatPounds(summary.received)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-pending-donations">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-amber-600">{"\u00A3"}{formatPounds(summary.pending)}</p>
          </CardContent>
        </Card>
        <Card data-testid="card-cancelled-donations">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="text-xl font-bold text-red-600">{"\u00A3"}{formatPounds(summary.cancelled)}</p>
          </CardContent>
        </Card>
      </div>

      {bankDetails && (
        <Card data-testid="card-bank-details-display">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">DONATION BANK DETAILS</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Account Name:</span>
                <span className="ml-1 font-medium">{bankDetails.bankAccountName || "Not set"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sort Code:</span>
                <span className="ml-1 font-mono font-medium">{bankDetails.bankSortCode || "Not set"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Account No:</span>
                <span className="ml-1 font-mono font-medium">{bankDetails.bankAccountNumber || "Not set"}</span>
              </div>
              {bankDetails.bankReference && (
                <div>
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="ml-1 font-medium">{bankDetails.bankReference}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-donation-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PLEDGED">Pledged</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading donations...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Heart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No donations yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id} data-testid={`row-donation-${d.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{d.fullName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{d.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{"\u00A3"}{formatPounds(d.amount)}</TableCell>
                    <TableCell className="text-sm">
                      {d.paymentDate ? format(new Date(d.paymentDate), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{d.reference || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(d.status)} data-testid={`badge-status-${d.id}`}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{d.message || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(d.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {d.status !== "RECEIVED" && d.status !== "CANCELLED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            title="Mark as Received"
                            onClick={() => updateStatusMutation.mutate({ id: d.id, status: "RECEIVED", adminNotes: d.adminNotes || "" })}
                            data-testid={`button-receive-${d.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit Status"
                          onClick={() => {
                            setEditDonationId(d.id);
                            setEditStatus(d.status);
                            setEditNotes(d.adminNotes || "");
                          }}
                          data-testid={`button-edit-donation-${d.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {currentUser?.role === "OWNER" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            title="Delete"
                            onClick={() => {
                              if (confirm("Delete this donation record?")) deleteMutation.mutate(d.id);
                            }}
                            data-testid={`button-delete-donation-${d.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={editBankOpen} onOpenChange={setEditBankOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Donation Bank Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Bank / Account Name</Label>
              <Input value={bankForm.bankAccountName} onChange={e => setBankForm(p => ({ ...p, bankAccountName: e.target.value }))} data-testid="input-edit-account-name" />
            </div>
            <div>
              <Label className="text-xs">Sort Code</Label>
              <Input value={bankForm.bankSortCode} onChange={e => setBankForm(p => ({ ...p, bankSortCode: e.target.value }))} placeholder="e.g. 04-06-05" data-testid="input-edit-sort-code" />
            </div>
            <div>
              <Label className="text-xs">Account Number</Label>
              <Input value={bankForm.bankAccountNumber} onChange={e => setBankForm(p => ({ ...p, bankAccountNumber: e.target.value }))} data-testid="input-edit-account-number" />
            </div>
            <div>
              <Label className="text-xs">Default Payment Reference</Label>
              <Input value={bankForm.bankReference} onChange={e => setBankForm(p => ({ ...p, bankReference: e.target.value }))} placeholder="e.g. DONATION - [Name]" data-testid="input-edit-bank-reference" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBankOpen(false)}>Cancel</Button>
            <Button onClick={() => updateBankMutation.mutate(bankForm)} disabled={updateBankMutation.isPending} data-testid="button-save-bank-details">
              {updateBankMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDonationId !== null} onOpenChange={() => setEditDonationId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Donation Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-donation-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLEDGED">Pledged</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Admin Notes</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} data-testid="input-edit-admin-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDonationId(null)}>Cancel</Button>
            <Button
              onClick={() => editDonationId && updateStatusMutation.mutate({ id: editDonationId, status: editStatus, adminNotes: editNotes })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-save-donation-status"
            >
              {updateStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Financials() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [sessionType, setSessionType] = useState<string>("all");
  const [matchMode, setMatchMode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"session" | "player" | "credits" | "memberships" | "manage-credits" | "donations">("session");
  const [dashboardView, setDashboardView] = useState<"classic" | "analytics" | "profitability" | "cashflow" | "reports" | "sessions" | "credits">(() => {
    try {
      const saved = localStorage.getItem("financialDashboardView");
      if (saved && ["classic", "analytics", "profitability", "cashflow", "reports", "sessions", "credits"].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return "sessions";
  });

  useEffect(() => {
    try { localStorage.setItem("financialDashboardView", dashboardView); } catch {}
  }, [dashboardView]);
  const [sessionTimeTab, setSessionTimeTab] = useState<"all" | "upcoming" | "outstanding" | "past" | "missing-invoice">("upcoming");
  const [sessionSortOrder, setSessionSortOrder] = useState<"recent" | "oldest" | "az">("oldest");

  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

  const [editingFee, setEditingFee] = useState<number | null>(null);
  const [feeInputValue, setFeeInputValue] = useState("");

  const [attendanceModal, setAttendanceModal] = useState<{
    entry: FinancialEntry;
    newStatus: AttendanceStatus;
    step: number;
    policyMet?: boolean;
    partialPercent?: number;
    abandonedReason?: string;
    completionLevel?: string;
  } | null>(null);

  const [addCreditDialog, setAddCreditDialog] = useState<{
    sessionId: number;
    entries: FinancialEntry[];
  } | null>(null);
  const [creditSelectedPlayers, setCreditSelectedPlayers] = useState<number[]>([]);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  const [useCreditDialog, setUseCreditDialog] = useState<{
    entry: FinancialEntry;
    balance: number;
  } | null>(null);
  const [useCreditAmount, setUseCreditAmount] = useState("");

  const [deleteSessionDialog, setDeleteSessionDialog] = useState<{
    sessionId: number;
    sessionTitle: string;
  } | null>(null);

  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  const [bulkFeeSessionId, setBulkFeeSessionId] = useState<number | null>(null);
  const [bulkFeeAmount, setBulkFeeAmount] = useState("");
  const [invoiceEditSessionId, setInvoiceEditSessionId] = useState<number | null>(null);
  const [invoiceEditValue, setInvoiceEditValue] = useState("");
  const [sortPlayersAlpha, setSortPlayersAlpha] = useState(false);
  const [sessionPaymentView, setSessionPaymentView] = useState<"all" | "paid" | "unpaid" | "grouped">("all");
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  const [creditSearchQuery, setCreditSearchQuery] = useState("");
  const [expandedCreditPlayers, setExpandedCreditPlayers] = useState<Set<string>>(new Set());

  const [creditSubTab, setCreditSubTab] = useState<"history" | "pending" | "analytics">("history");
  const [rewardDetailFilter, setRewardDetailFilter] = useState<"AVAILABLE" | "REQUESTED" | "USED" | "all" | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [approveDialog, setApproveDialog] = useState<{
    ticketId: number;
    playerName: string;
    amount: number;
    subject: string;
    description: string | null;
  } | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveReason, setApproveReason] = useState("");
  const [declineDialog, setDeclineDialog] = useState<{
    ticketId: number;
    playerName: string;
    subject: string;
  } | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const [editCreditDialog, setEditCreditDialog] = useState<{
    id: number;
    amount: number;
    reason: string;
    linkedSignupId?: number | null;
    sessionFee?: number | null;
    playerName?: string;
  } | null>(null);
  const [editCreditAmount, setEditCreditAmount] = useState("");
  const [editCreditReason, setEditCreditReason] = useState("");
  const [deleteCreditDialog, setDeleteCreditDialog] = useState<{
    id: number;
    amount: number;
    playerName: string;
    reason: string;
  } | null>(null);

  const [removePlayerDialog, setRemovePlayerDialog] = useState<{
    entry: FinancialEntry;
  } | null>(null);

  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());

  const [adjustCreditDialog, setAdjustCreditDialog] = useState<{
    userId: number;
    clubId: number;
    playerName: string;
    currentBalance: number;
    sessionId?: number;
    signupId?: number;
  } | null>(null);
  const [adjustCreditAmount, setAdjustCreditAmount] = useState("");
  const [adjustCreditReason, setAdjustCreditReason] = useState("");
  const [adjustCreditType, setAdjustCreditType] = useState<"add" | "deduct">("add");

  const [mcPlayerSearch, setMcPlayerSearch] = useState("");
  const [mcSelectedPlayer, setMcSelectedPlayer] = useState<{ id: number; fullName: string; email: string } | null>(null);
  const [mcSelectedClubId, setMcSelectedClubId] = useState<string>("");
  const [mcActionType, setMcActionType] = useState<"credit" | "debit" | "fix">("credit");
  const [mcAmount, setMcAmount] = useState("");
  const [mcReason, setMcReason] = useState("");
  const [mcFixBalance, setMcFixBalance] = useState("");

  const [addPlayerDialog, setAddPlayerDialog] = useState<{
    sessionId: number;
    clubId: number;
    sessionTitle: string;
    sessionFee: number;
  } | null>(null);
  const [addPlayerMode, setAddPlayerMode] = useState<"existing" | "new">("existing");
  const [addPlayerSearch, setAddPlayerSearch] = useState("");
  const [addPlayerSelectedId, setAddPlayerSelectedId] = useState<number | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerGender, setNewPlayerGender] = useState("MALE");

  const [revenueClubDialog, setRevenueClubDialog] = useState<{ clubId: number; clubName: string } | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<"month" | "quarter" | "year">("month");
  const [outstandingDialogOpen, setOutstandingDialogOpen] = useState(false);
  const [finKpiDetail, setFinKpiDetail] = useState<string | null>(null);
  const [outstandingEditingFee, setOutstandingEditingFee] = useState<number | null>(null);
  const [outstandingFeeValue, setOutstandingFeeValue] = useState("");

  const financialQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    if (sessionType !== "all") params.append("sessionType", sessionType);
    if (matchMode !== "all") params.append("matchMode", matchMode);
    if (searchQuery) params.append("search", searchQuery);
    const qs = params.toString();
    return `/api/admin/financial-summary${qs ? `?${qs}` : ""}`;
  }, [selectedClubId, sessionType, matchMode, searchQuery]);

  const { data: financialData = [], isLoading } = useQuery<FinancialEntry[]>({
    queryKey: [financialQueryUrl],
  });

  const dashboardQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    if (sessionType !== "all") params.append("sessionType", sessionType);
    const qs = params.toString();
    return `/api/admin/financial-dashboard${qs ? `?${qs}` : ""}`;
  }, [selectedClubId, sessionType]);

  interface MembershipMember {
    id: number;
    userId: number;
    clubId: number;
    fullName: string;
    email: string;
    planName: string;
    planPrice: number;
    status: string;
    paymentStatus: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    isOverdue: boolean;
  }

  const { data: dashboardData } = useQuery<{
    sessionIncome: number;
    sessionPaid: number;
    sessionPending: number;
    sessionOutstanding: number;
    inventorySales: number;
    inventoryPurchases: number;
    generalExpenses: number;
    totalIncome: number;
    totalExpenses: number;
    netRevenue: number;
    stockUsed: number;
    collectionRate: string;
    membershipTotalRevenue: number;
    membershipPaid: number;
    membershipUnpaid: number;
    membershipOverdue: number;
    membershipActiveCount: number;
    membershipMembers: MembershipMember[];
  }>({ queryKey: [dashboardQueryUrl] });

  const creditSummaryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    const qs = params.toString();
    return `/api/admin/credit-summary${qs ? `?${qs}` : ""}`;
  }, [selectedClubId]);

  const { data: creditSummary } = useQuery<{
    totalOutstanding: number;
    totalIssued: number;
    totalRedeemed: number;
    totalHeld: number;
    rewardsUnclaimed?: number;
    rewardsUnclaimedCount?: number;
    rewardsRequested?: number;
    rewardsRequestedCount?: number;
    rewardsIssued?: number;
    rewardsUsed?: number;
  }>({ queryKey: [creditSummaryUrl] });

  interface CreditHistoryEntry {
    id: number;
    source?: string;
    userId: number;
    clubId: number;
    amount: number;
    reason: string;
    linkedSessionId: number | null;
    linkedSignupId: number | null;
    attendanceStatus: string | null;
    createdAt: string;
    clubName: string;
    sessionTitle: string | null;
    sessionDate: string | null;
    sessionFee: number | null;
    playerName: string;
    playerEmail: string;
    createdByName: string;
  }

  const creditHistoryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    const qs = params.toString();
    return `/api/admin/credit-history${qs ? `?${qs}` : ""}`;
  }, [selectedClubId]);

  const { data: creditHistory = [], isLoading: creditLoading } = useQuery<CreditHistoryEntry[]>({
    queryKey: ["/api/admin/credit-history", selectedClubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClubId !== "all") params.append("clubId", selectedClubId);
      const qs = params.toString();
      const url = `/api/admin/credit-history${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) return [];
        throw new Error("Failed to fetch credit history");
      }
      return res.json();
    },
  });

  interface PendingCreditRequest {
    id: number;
    ticketNumber: string;
    subject: string;
    description: string | null;
    status: string;
    creditAmount: number | null;
    clubId: number;
    createdByUserId: number;
    linkedSessionId: number | null;
    createdAt: string;
    playerName: string;
    playerEmail: string;
    clubName: string;
    sessionTitle: string | null;
    sessionDate: string | null;
  }

  const pendingCreditUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    const qs = params.toString();
    return `/api/admin/pending-credit-requests${qs ? `?${qs}` : ""}`;
  }, [selectedClubId]);

  const { data: pendingCreditRequests = [], isLoading: pendingCreditLoading } = useQuery<PendingCreditRequest[]>({
    queryKey: [pendingCreditUrl],
  });

  interface PendingReward {
    id: number;
    playerId: number;
    clubId: number;
    rewardType: string;
    description: string;
    credits: number;
    gifts: string | null;
    freeSessions: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    playerName: string;
    clubName: string;
    type: string;
  }

  const { data: pendingRewardsData, isLoading: pendingRewardsLoading } = useQuery<{ rewards: PendingReward[] }>({
    queryKey: ["/api/admin/rewards/pending-tasks"],
  });
  const pendingRewards = pendingRewardsData?.rewards || [];

  interface PlayerRewardEntry {
    id: string;
    playerId: number;
    clubId: number;
    rewardType: string;
    description: string;
    credits: number;
    gifts: string | null;
    freeSessions: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    playerName: string;
    playerEmail: string;
    clubName: string;
  }

  interface PlayerRewardSummary {
    playerId: number;
    playerName: string;
    playerEmail: string;
    available: number;
    availableCount: number;
    used: number;
    usedCount: number;
    requested: number;
    requestedCount: number;
    totalCredits: number;
    totalCount: number;
    byCategory: Record<string, { count: number; credits: number }>;
    rewards: PlayerRewardEntry[];
  }

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rewardSearchQuery, setRewardSearchQuery] = useState("");
  const [rewardSortBy, setRewardSortBy] = useState<"total-desc" | "total-asc" | "name-asc" | "name-desc" | "unclaimed-desc" | "pending-desc" | "claimed-desc" | "count-desc">("total-desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [rewardMinAmount, setRewardMinAmount] = useState("");
  const [rewardMaxAmount, setRewardMaxAmount] = useState("");
  const [rewardMinRewards, setRewardMinRewards] = useState("");
  const [rewardStatusChips, setRewardStatusChips] = useState<Set<string>>(new Set());

  const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    REFERRAL: { label: "Referral", color: "text-blue-600", icon: "🤝" },
    SESSION_ATTENDANCE: { label: "Session Attendance", color: "text-green-600", icon: "📋" },
    ANNIVERSARY: { label: "Anniversary", color: "text-purple-600", icon: "🎉" },
    BIRTHDAY: { label: "Birthday", color: "text-pink-600", icon: "🎂" },
    BADGE_ACHIEVEMENT: { label: "Badge Achievement", color: "text-amber-600", icon: "🏅" },
    GIFT: { label: "Gift", color: "text-teal-600", icon: "🎁" },
    MANUAL: { label: "Manual Award", color: "text-indigo-600", icon: "✍️" },
    POINTS: { label: "Points", color: "text-orange-600", icon: "⭐" },
    GRADE: { label: "Grade Reward", color: "text-cyan-600", icon: "📊" },
    ADMIN_CREDIT: { label: "Admin Credit (Session)", color: "text-slate-600", icon: "💷" },
  };

  const rewardPerPlayerUrl = rewardDetailFilter
    ? `/api/admin/rewards/per-player?clubId=${selectedClubId || "all"}${rewardDetailFilter !== "all" ? `&status=${rewardDetailFilter}` : ""}${selectedCategory ? `&category=${selectedCategory}` : ""}`
    : null;

  const { data: rewardPerPlayerData, isLoading: rewardPerPlayerLoading } = useQuery<{ players: PlayerRewardSummary[]; categoryTotals: Record<string, { count: number; credits: number }> }>({
    queryKey: [rewardPerPlayerUrl],
    queryFn: rewardPerPlayerUrl ? async () => {
      const res = await fetch(rewardPerPlayerUrl);
      if (!res.ok) throw new Error("Failed to fetch reward details");
      return res.json();
    } : undefined,
    enabled: !!rewardPerPlayerUrl,
  });
  const rewardPlayers = rewardPerPlayerData?.players || [];
  const categoryTotals = rewardPerPlayerData?.categoryTotals || {};

  const allCategoriesUrl = rewardDetailFilter
    ? `/api/admin/rewards/per-player?clubId=${selectedClubId || "all"}${rewardDetailFilter !== "all" ? `&status=${rewardDetailFilter}` : ""}`
    : null;
  const { data: allCategoriesData } = useQuery<{ categoryTotals: Record<string, { count: number; credits: number }> }>({
    queryKey: [allCategoriesUrl, "categories-only"],
    queryFn: allCategoriesUrl ? async () => {
      const res = await fetch(allCategoriesUrl);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    } : undefined,
    enabled: !!allCategoriesUrl && !!selectedCategory,
  });
  const allCategoryTotals = selectedCategory ? (allCategoriesData?.categoryTotals || categoryTotals) : categoryTotals;

  const filteredSortedPlayers = useMemo(() => {
    let result = [...rewardPlayers];
    if (rewardSearchQuery.trim()) {
      const q = rewardSearchQuery.trim().toLowerCase();
      result = result.filter(p =>
        (p.playerName || "").toLowerCase().includes(q) ||
        (p.playerEmail || "").toLowerCase().includes(q)
      );
    }
    if (rewardStatusChips.size > 0) {
      result = result.filter(p => {
        if (rewardStatusChips.has("unclaimed") && p.availableCount > 0) return true;
        if (rewardStatusChips.has("pending") && p.requestedCount > 0) return true;
        if (rewardStatusChips.has("claimed") && p.usedCount > 0) return true;
        return false;
      });
    }
    const minAmt = rewardMinAmount ? parseFloat(rewardMinAmount) * 100 : null;
    const maxAmt = rewardMaxAmount ? parseFloat(rewardMaxAmount) * 100 : null;
    const minCount = rewardMinRewards ? parseInt(rewardMinRewards, 10) : null;
    if (minAmt !== null) result = result.filter(p => p.totalCredits >= minAmt);
    if (maxAmt !== null) result = result.filter(p => p.totalCredits <= maxAmt);
    if (minCount !== null) result = result.filter(p => p.totalCount >= minCount);
    switch (rewardSortBy) {
      case "total-desc": result.sort((a, b) => b.totalCredits - a.totalCredits); break;
      case "total-asc": result.sort((a, b) => a.totalCredits - b.totalCredits); break;
      case "name-asc": result.sort((a, b) => (a.playerName || "").localeCompare(b.playerName || "")); break;
      case "name-desc": result.sort((a, b) => (b.playerName || "").localeCompare(a.playerName || "")); break;
      case "unclaimed-desc": result.sort((a, b) => b.available - a.available); break;
      case "pending-desc": result.sort((a, b) => b.requested - a.requested); break;
      case "claimed-desc": result.sort((a, b) => b.used - a.used); break;
      case "count-desc": result.sort((a, b) => b.totalCount - a.totalCount); break;
    }
    return result;
  }, [rewardPlayers, rewardSearchQuery, rewardSortBy, rewardStatusChips, rewardMinAmount, rewardMaxAmount, rewardMinRewards]);

  const hasActiveAdvancedFilters = rewardMinAmount !== "" || rewardMaxAmount !== "" || rewardMinRewards !== "" || rewardStatusChips.size > 0;

  const approveRewardMutation = useMutation({
    mutationFn: async ({ rewardId, action }: { rewardId: number; action: "approve" | "decline" }) => {
      const res = await apiRequest("POST", `/api/admin/rewards/${rewardId}/${action}`);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/rewards/pending-tasks"] });
      qc.invalidateQueries({ queryKey: [creditSummaryUrl] });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/credit-history") });
      toast({ title: variables.action === "approve" ? "Reward approved" : "Reward declined", description: variables.action === "approve" ? "The reward has been approved." : "The reward request has been declined." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to process reward", variant: "destructive" });
    },
  });

  const approveCreditMutation = useMutation({
    mutationFn: async ({ ticketId, amount, reason }: { ticketId: number; amount: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/approve-credit`, { amount, reason });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [pendingCreditUrl] });
      qc.invalidateQueries({ queryKey: [creditHistoryUrl] });
      qc.invalidateQueries({ queryKey: [creditSummaryUrl] });
      toast({ title: "Credit approved", description: "The credit has been added to the player's wallet." });
      setApproveDialog(null);
      setApproveAmount("");
      setApproveReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to approve credit", variant: "destructive" });
    },
  });

  const declineCreditMutation = useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/decline-credit`, { reason });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [pendingCreditUrl] });
      toast({ title: "Request declined", description: "The credit request has been declined." });
      setDeclineDialog(null);
      setDeclineReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to decline credit", variant: "destructive" });
    },
  });

  const creditAnalytics = useMemo(() => {
    if (creditHistory.length === 0) return null;
    let totalAdded = 0;
    let totalUsed = 0;
    let addedCount = 0;
    let usedCount = 0;
    const playerBalances: Record<string, { name: string; balance: number; userId: number }> = {};
    const monthlyData: Record<string, { month: string; added: number; used: number }> = {};
    const reasonCounts: Record<string, number> = {};

    creditHistory.forEach((e) => {
      if (e.amount > 0) { totalAdded += e.amount; addedCount++; }
      else { totalUsed += Math.abs(e.amount); usedCount++; }

      const pKey = `${e.userId}`;
      if (!playerBalances[pKey]) playerBalances[pKey] = { name: e.playerName, balance: 0, userId: e.userId };
      playerBalances[pKey].balance += e.amount;

      if (e.createdAt) {
        const m = format(new Date(e.createdAt), "yyyy-MM");
        if (!monthlyData[m]) monthlyData[m] = { month: m, added: 0, used: 0 };
        if (e.amount > 0) monthlyData[m].added += e.amount;
        else monthlyData[m].used += Math.abs(e.amount);
      }

      const r = e.reason || "Unknown";
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    const topHolders = Object.values(playerBalances)
      .filter(p => p.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const recentMonths = Object.values(monthlyData)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6)
      .reverse();

    return {
      totalAdded,
      totalUsed,
      netOutstanding: totalAdded - totalUsed,
      addedCount,
      usedCount,
      totalTransactions: creditHistory.length,
      avgCreditIssued: addedCount > 0 ? Math.round(totalAdded / addedCount) : 0,
      avgCreditUsed: usedCount > 0 ? Math.round(totalUsed / usedCount) : 0,
      redemptionRate: totalAdded > 0 ? ((totalUsed / totalAdded) * 100).toFixed(1) : "0.0",
      topHolders,
      topReasons,
      recentMonths,
      uniquePlayers: Object.keys(playerBalances).length,
    };
  }, [creditHistory]);

  const creditPlayerGroups = useMemo(() => {
    const filtered = creditSearchQuery
      ? creditHistory.filter((e) =>
          e.playerName.toLowerCase().includes(creditSearchQuery.toLowerCase()) ||
          e.playerEmail.toLowerCase().includes(creditSearchQuery.toLowerCase())
        )
      : creditHistory;

    const groups: Record<string, { playerName: string; playerEmail: string; userId: number; entries: CreditHistoryEntry[]; totalAdded: number; totalUsed: number; balance: number }> = {};
    filtered.forEach((entry) => {
      const key = `${entry.userId}-${entry.clubId}`;
      if (!groups[key]) {
        groups[key] = { playerName: entry.playerName, playerEmail: entry.playerEmail, userId: entry.userId, entries: [], totalAdded: 0, totalUsed: 0, balance: 0 };
      }
      groups[key].entries.push(entry);
      if (entry.amount > 0) groups[key].totalAdded += entry.amount;
      else groups[key].totalUsed += Math.abs(entry.amount);
      groups[key].balance += entry.amount;
    });
    return groups;
  }, [creditHistory, creditSearchQuery]);

  const { data: mcSearchResults = [] } = useQuery<{ id: number; fullName: string; email: string }[]>({
    queryKey: ["/api/admin/player-search", mcPlayerSearch],
    queryFn: async () => {
      const res = await fetch(`/api/admin/player-search?q=${encodeURIComponent(mcPlayerSearch)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: viewMode === "manage-credits" && mcPlayerSearch.length >= 2 && !mcSelectedPlayer,
  });

  const { data: mcPlayerClubs = [], isLoading: mcClubsLoading } = useQuery<{ clubId: number; clubName: string; balance: number }[]>({
    queryKey: ["/api/admin/player-credits", mcSelectedPlayer?.id],
    enabled: viewMode === "manage-credits" && !!mcSelectedPlayer,
  });

  const mcSelectedClub = mcPlayerClubs.find((c) => String(c.clubId) === mcSelectedClubId);

  const { data: mcPlayerHistory = [] } = useQuery<CreditHistoryEntry[]>({
    queryKey: ["/api/admin/credit-history", mcSelectedPlayer?.id, mcSelectedClubId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mcSelectedClubId) params.append("clubId", mcSelectedClubId);
      if (mcSelectedPlayer) params.append("userId", String(mcSelectedPlayer.id));
      const res = await fetch(`/api/admin/credit-history?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: viewMode === "manage-credits" && !!mcSelectedPlayer && !!mcSelectedClubId,
  });

  const filteredData = useMemo(() => {
    if (paymentFilter === "all") return financialData;
    return financialData.filter((e) => e.paymentStatus === paymentFilter.toUpperCase());
  }, [financialData, paymentFilter]);

  const uniqueClubs = useMemo(() => {
    return Array.from(
      new Map(financialData.map((e) => [e.clubId, { id: e.clubId, name: e.clubName }])).values()
    );
  }, [financialData]);

  const uniqueClubIds = useMemo(() => uniqueClubs.map(c => c.id), [uniqueClubs]);

  const { data: allCreditBalances = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/credits/all-club-balances", ...uniqueClubIds],
    queryFn: async () => {
      if (uniqueClubIds.length === 0) return {};
      const balanceMap: Record<string, number> = {};
      await Promise.all(
        uniqueClubIds.map(async (cId) => {
          try {
            const res = await fetch(`/api/credits/club/${cId}/balances`, { credentials: "include" });
            if (res.ok) {
              const data: { userId: number; balance: number }[] = await res.json();
              data.forEach(({ userId, balance }) => {
                const key = `${userId}-${cId}`;
                balanceMap[key] = (balanceMap[key] || 0) + balance;
              });
            }
          } catch {}
        })
      );
      return balanceMap;
    },
    enabled: uniqueClubIds.length > 0,
  });

  const getCreditBalance = (userId: number, clubId: number): number => {
    return allCreditBalances[`${userId}-${clubId}`] || 0;
  };

  const totalRevenue = useMemo(() => filteredData.reduce((sum, e) => sum + (e.fee || 0), 0), [filteredData]);
  const paidTotal = useMemo(() => filteredData.filter((e) => e.paymentStatus === "PAID").reduce((sum, e) => sum + (e.fee || 0), 0), [filteredData]);
  const pendingTotal = useMemo(() => filteredData.filter((e) => e.paymentStatus === "PENDING").reduce((sum, e) => sum + (e.fee || 0), 0), [filteredData]);
  const unpaidTotal = useMemo(() => filteredData.filter((e) => e.paymentStatus === "UNPAID").reduce((sum, e) => sum + (e.fee || 0), 0), [filteredData]);
  const collectionRate = totalRevenue > 0 ? ((paidTotal / totalRevenue) * 100).toFixed(1) : "0.0";

  const outstandingByPlayer = useMemo(() => {
    const unpaidEntries = filteredData.filter((e) => e.paymentStatus === "UNPAID" || e.paymentStatus === "PENDING");
    const groups: Record<string, { playerName: string; playerEmail: string; playerUserId: number | null; totalOwed: number; sessions: { signupId: number; sessionId: number; sessionTitle: string; sessionDate: string; clubName: string; fee: number; paymentStatus: string }[] }> = {};
    unpaidEntries.forEach((entry) => {
      const key = `${entry.playerUserId}`;
      if (!groups[key]) {
        groups[key] = { playerName: entry.playerName, playerEmail: entry.playerEmail, playerUserId: entry.playerUserId, totalOwed: 0, sessions: [] };
      }
      groups[key].totalOwed += entry.fee || 0;
      groups[key].sessions.push({ signupId: entry.signupId, sessionId: entry.sessionId, sessionTitle: entry.sessionTitle, sessionDate: entry.sessionDate, clubName: entry.clubName, fee: entry.fee, paymentStatus: entry.paymentStatus });
    });
    return Object.values(groups).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [filteredData]);
  const outstandingTotal = useMemo(() => unpaidTotal + pendingTotal, [unpaidTotal, pendingTotal]);

  const sessionGroups = useMemo(() => {
    const groups: Record<number, FinancialEntry[]> = {};
    filteredData.forEach((entry) => {
      if (!groups[entry.sessionId]) groups[entry.sessionId] = [];
      groups[entry.sessionId].push(entry);
    });
    const sorted = Object.entries(groups).sort(([, a], [, b]) => {
      const aDate = a[0]?.sessionDate ? new Date(a[0].sessionDate).getTime() : 0;
      const bDate = b[0]?.sessionDate ? new Date(b[0].sessionDate).getTime() : 0;
      return bDate - aDate;
    });
    return Object.fromEntries(sorted);
  }, [filteredData]);

  const { upcomingSessionGroups, outstandingSessionGroups, pastSessionGroups, missingInvoiceSessionGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming: Record<number, FinancialEntry[]> = {};
    const outstanding: Record<number, FinancialEntry[]> = {};
    const past: Record<number, FinancialEntry[]> = {};
    const missingInvoice: Record<number, FinancialEntry[]> = {};
    Object.entries(sessionGroups).forEach(([sessionIdStr, entries]) => {
      const sessionDate = entries[0]?.sessionDate ? startOfDay(new Date(entries[0].sessionDate)) : null;
      if (!sessionDate || sessionDate >= today) {
        upcoming[Number(sessionIdStr)] = entries;
      } else {
        const hasOutstanding = entries.some((e) => e.paymentStatus === "UNPAID" || e.paymentStatus === "PENDING");
        if (hasOutstanding) {
          outstanding[Number(sessionIdStr)] = entries;
        } else {
          past[Number(sessionIdStr)] = entries;
        }
        const hasInvoice = entries[0]?.invoiceNumber;
        if (!hasInvoice) {
          missingInvoice[Number(sessionIdStr)] = entries;
        }
      }
    });
    return { upcomingSessionGroups: upcoming, outstandingSessionGroups: outstanding, pastSessionGroups: past, missingInvoiceSessionGroups: missingInvoice };
  }, [sessionGroups]);

  const activeSessionGroupsList = useMemo(() => {
    const base = sessionTimeTab === "all" ? sessionGroups : sessionTimeTab === "upcoming" ? upcomingSessionGroups : sessionTimeTab === "outstanding" ? outstandingSessionGroups : sessionTimeTab === "missing-invoice" ? missingInvoiceSessionGroups : pastSessionGroups;
    const entries: [string, FinancialEntry[]][] = Object.entries(base);
    entries.sort(([, a], [, b]) => {
      if (sessionSortOrder === "az") {
        const aTitle = (a[0]?.sessionTitle || "").toLowerCase();
        const bTitle = (b[0]?.sessionTitle || "").toLowerCase();
        return aTitle.localeCompare(bTitle);
      }
      const aDate = a[0]?.sessionDate ? new Date(a[0].sessionDate).getTime() : 0;
      const bDate = b[0]?.sessionDate ? new Date(b[0].sessionDate).getTime() : 0;
      return sessionSortOrder === "oldest" ? aDate - bDate : bDate - aDate;
    });
    return entries;
  }, [sessionTimeTab, sessionGroups, upcomingSessionGroups, outstandingSessionGroups, pastSessionGroups, missingInvoiceSessionGroups, sessionSortOrder]);

  const playerGroups = useMemo(() => {
    const data = playerSearchQuery
      ? filteredData.filter((e) =>
          e.playerName.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
          (e.playerEmail && e.playerEmail.toLowerCase().includes(playerSearchQuery.toLowerCase()))
        )
      : filteredData;
    const groups: Record<string, FinancialEntry[]> = {};
    data.forEach((entry) => {
      const key = `${entry.playerUserId}-${entry.playerName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredData, playerSearchQuery]);

  const clubRevenueData = useMemo(() => {
    const clubs: Record<number, { clubId: number; clubName: string; totalRevenue: number; totalPaid: number; memberCount: number; members: Record<string, { userId: number | null; name: string; email: string; totalFee: number; paidFee: number; sessions: number }> }> = {};
    filteredData.forEach(entry => {
      if (!clubs[entry.clubId]) {
        clubs[entry.clubId] = { clubId: entry.clubId, clubName: entry.clubName, totalRevenue: 0, totalPaid: 0, memberCount: 0, members: {} };
      }
      const club = clubs[entry.clubId];
      club.totalRevenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") club.totalPaid += entry.fee || 0;
      const memberKey = String(entry.playerUserId ?? "unknown");
      if (!club.members[memberKey]) {
        club.members[memberKey] = { userId: entry.playerUserId, name: entry.playerName, email: entry.playerEmail, totalFee: 0, paidFee: 0, sessions: 0 };
        club.memberCount++;
      }
      club.members[memberKey].totalFee += entry.fee || 0;
      if (entry.paymentStatus === "PAID") club.members[memberKey].paidFee += entry.fee || 0;
      club.members[memberKey].sessions++;
    });
    return Object.values(clubs).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredData]);

  const revenueSummary = useMemo(() => {
    const periods: Record<string, { label: string; revenue: number; paid: number; sessions: number; sortKey: string }> = {};
    financialData.forEach(entry => {
      const date = new Date(entry.sessionDate);
      let key = "";
      let label = "";
      let sortKey = "";
      if (summaryPeriod === "month") {
        key = format(date, "yyyy-MM");
        label = format(date, "MMM yyyy");
        sortKey = key;
      } else if (summaryPeriod === "quarter") {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        key = `${date.getFullYear()}-Q${q}`;
        label = `Q${q} ${date.getFullYear()}`;
        sortKey = `${date.getFullYear()}-${q}`;
      } else {
        key = `${date.getFullYear()}`;
        label = `${date.getFullYear()}`;
        sortKey = key;
      }
      if (!periods[key]) periods[key] = { label, revenue: 0, paid: 0, sessions: 0, sortKey };
      periods[key].revenue += entry.fee || 0;
      if (entry.paymentStatus === "PAID") periods[key].paid += entry.fee || 0;
      periods[key].sessions++;
    });
    return Object.values(periods).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [financialData, summaryPeriod]);

  const updatePayment = useMutation({
    mutationFn: async ({ sessionId, signupId, status }: { sessionId: number; signupId: number; status: "PAID" | "UNPAID" }) => {
      await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${signupId}/payment`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
    },
  });

  const updateFee = useMutation({
    mutationFn: async ({ signupId, fee }: { signupId: number; fee: number }) => {
      await apiRequest("PATCH", `/api/admin/signups/${signupId}/fee`, { fee });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      toast({ title: "Fee Updated", description: "The fee has been updated successfully." });
      setEditingFee(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update fee.", variant: "destructive" });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({
      sessionId,
      signupId,
      attendanceStatus,
      attendanceNote,
      partialPercentage,
      policyMet,
    }: {
      sessionId: number;
      signupId: number;
      attendanceStatus: string;
      attendanceNote?: string;
      partialPercentage?: number;
      policyMet?: boolean;
    }) => {
      await apiRequest("PATCH", `/api/sessions/${sessionId}/signups/${signupId}/attendance`, {
        attendanceStatus,
        attendanceNote,
        partialPercentage,
        policyMet,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
    },
  });

  const sendPaymentConfirmation = useMutation({
    mutationFn: async ({ signupId, sessionId, playerId, immediate }: { signupId: number; sessionId: number; playerId: number; immediate: boolean }) => {
      await apiRequest("POST", "/api/admin/send-payment-confirmation", { signupId, sessionId, playerId, immediate });
    },
    onSuccess: (_, vars) => {
      toast({ title: "Confirmation Sent", description: vars.immediate ? "Payment confirmation sent immediately." : "Payment confirmation will be sent in 15 minutes." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send confirmation.", variant: "destructive" });
    },
  });

  const sendPaymentReminder = useMutation({
    mutationFn: async ({ signupId, sessionId, playerId }: { signupId: number; sessionId: number; playerId: number }) => {
      await apiRequest("POST", "/api/admin/request-payment", { signupId, sessionId, playerId });
    },
    onSuccess: () => {
      toast({ title: "Reminder Sent", description: "Payment reminder sent to player." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send reminder.", variant: "destructive" });
    },
  });

  const bulkPaymentConfirmation = useMutation({
    mutationFn: async ({ entries, immediate }: { entries: { signupId: number; sessionId: number; playerId: number }[]; immediate: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/bulk-payment-confirmation", { entries, immediate });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Bulk Confirmation", description: `Payment confirmations sent to ${data.sent} player(s).` });
      setSelectedEntries(new Set());
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send bulk confirmations.", variant: "destructive" });
    },
  });

  const bulkPaymentReminder = useMutation({
    mutationFn: async ({ entries }: { entries: { signupId: number; sessionId: number; playerId: number }[] }) => {
      const res = await apiRequest("POST", "/api/admin/bulk-payment-reminder", { entries });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Bulk Reminder", description: `Payment reminders sent to ${data.sent} player(s).` });
      setSelectedEntries(new Set());
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send bulk reminders.", variant: "destructive" });
    },
  });

  const createCredit = useMutation({
    mutationFn: async (data: {
      userId: number;
      clubId: number;
      amount: number;
      reason: string;
      linkedSessionId?: number;
      linkedSignupId?: number;
      attendanceStatus?: string;
    }) => {
      await apiRequest("POST", "/api/credits", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
    },
  });

  const [resetCreditConfirm, setResetCreditConfirm] = useState<{ userId: number; clubId: number; playerName: string; currentBalance: number } | null>(null);

  const resetCreditMutation = useMutation({
    mutationFn: async (data: { userId: number; clubId: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/credits/reset", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Credit Reset", description: `Balance reset to £0.00 (was £${((data.previousBalance || 0) / 100).toFixed(2)})` });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/god-mode/wallets") });
      setResetCreditConfirm(null);
      setAdjustCreditDialog(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to reset credit.", variant: "destructive" }),
  });

  const useCredit = useMutation({
    mutationFn: async (data: {
      userId: number;
      clubId: number;
      sessionId: number;
      signupId: number;
      amount: number;
    }) => {
      await apiRequest("POST", "/api/credits/use", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
    },
  });

  const removeFromSession = useMutation({
    mutationFn: async ({ sessionId, signupId }: { sessionId: number; signupId: number }) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}/signups/${signupId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/sessions") });
    },
  });

  const addExistingPlayer = useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: number; playerId: number }) => {
      const res = await apiRequest("POST", `/api/admin/sessions/${sessionId}/players`, { playerId });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/sessions") });
    },
  });

  const addGuestPlayer = useMutation({
    mutationFn: async ({ sessionId, fullName, email, gender }: { sessionId: number; fullName: string; email?: string; gender: string }) => {
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/guest-player`, { fullName, email: email || undefined, gender, forceCreate: true });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial-summary") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/sessions") });
    },
  });

  const { data: addPlayerMembers } = useQuery<any[]>({
    queryKey: ["/api/clubs", addPlayerDialog?.clubId, "members-comprehensive"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${addPlayerDialog!.clubId}/members-comprehensive`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!addPlayerDialog && addPlayerMode === "existing",
  });

  const editCredit = useMutation({
    mutationFn: async (data: { id: number; amount?: number; reason?: string }) => {
      await apiRequest("PATCH", `/api/credits/${data.id}`, { amount: data.amount, reason: data.reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/credit-history") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
    },
  });

  const deleteCredit = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/credits/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/credit-history") });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && ((q.queryKey[0] as string).startsWith("/api/admin/financial-summary") || (q.queryKey[0] as string).startsWith("/api/admin/financial-dashboard")) });
      toast({ title: "Session Deleted", description: "The session has been removed." });
      setDeleteSessionDialog(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete session.", variant: "destructive" });
    },
  });

  const updateInvoiceNumber = useMutation({
    mutationFn: async ({ sessionId, invoiceNumber }: { sessionId: number; invoiceNumber: string }) => {
      await apiRequest("PATCH", `/api/admin/sessions/${sessionId}/invoice-number`, { invoiceNumber });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && ((q.queryKey[0] as string).startsWith("/api/admin/financial-summary") || (q.queryKey[0] as string).startsWith("/api/admin/financial-dashboard")) });
      toast({ title: "Invoice Updated", description: "Invoice number has been saved." });
      setInvoiceEditSessionId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update invoice number.", variant: "destructive" });
    },
  });

  const bulkDeleteSessions = useMutation({
    mutationFn: async (sessionIds: number[]) => {
      await apiRequest("DELETE", `/api/sessions`, { sessionIds });
    },
    onSuccess: (_data, sessionIds) => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && ((q.queryKey[0] as string).startsWith("/api/admin/financial-summary") || (q.queryKey[0] as string).startsWith("/api/admin/financial-dashboard")) });
      toast({ title: "Sessions Deleted", description: `${sessionIds.length} session(s) have been removed.` });
      setSelectedSessions(new Set());
      setBulkDeleteDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete sessions.", variant: "destructive" });
    },
  });

  const toggleSessionSelect = useCallback((sessionId: number) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setSelectedSessions(new Set());
  }, [selectedClubId, sessionType, matchMode, searchQuery]);

  const handleClearFilters = useCallback(() => {
    setSelectedClubId("all");
    setSessionType("all");
    setMatchMode("all");
    setSearchQuery("");
    setPaymentFilter("all");
    setSelectedSessions(new Set());
  }, []);

  const handleTogglePayment = (entry: FinancialEntry) => {
    const newStatus = entry.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    updatePayment.mutate(
      { sessionId: entry.sessionId, signupId: entry.signupId, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "PAID" ? "Marked as Paid" : "Marked as Unpaid",
            description: `Payment status updated for ${entry.playerName}.`,
          });
          if (newStatus === "PAID") {
            sendPaymentConfirmation.mutate({
              signupId: entry.signupId,
              sessionId: entry.sessionId,
              playerId: entry.playerId,
              immediate: false,
            });
          }
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive" });
        },
      }
    );
  };

  const toggleEntrySelection = (signupId: number) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(signupId)) next.delete(signupId);
      else next.add(signupId);
      return next;
    });
  };

  const handleBulkConfirmation = (immediate: boolean) => {
    const entries = filteredData
      .filter(e => selectedEntries.has(e.signupId) && e.paymentStatus === "PAID")
      .map(e => ({ signupId: e.signupId, sessionId: e.sessionId, playerId: e.playerId }));
    if (entries.length === 0) {
      toast({ title: "No paid entries selected", description: "Select entries that are marked as PAID to send confirmations.", variant: "destructive" });
      return;
    }
    bulkPaymentConfirmation.mutate({ entries, immediate });
  };

  const handleBulkReminder = () => {
    const entries = filteredData
      .filter(e => selectedEntries.has(e.signupId) && (e.paymentStatus === "UNPAID" || e.paymentStatus === "PENDING"))
      .map(e => ({ signupId: e.signupId, sessionId: e.sessionId, playerId: e.playerId }));
    if (entries.length === 0) {
      toast({ title: "No unpaid entries selected", description: "Select entries that are UNPAID or PENDING to send reminders.", variant: "destructive" });
      return;
    }
    bulkPaymentReminder.mutate({ entries });
  };

  const handleStartEditFee = (entry: FinancialEntry) => {
    setEditingFee(entry.signupId);
    setFeeInputValue((entry.fee / 100).toFixed(2));
  };

  const handleSaveFee = (signupId: number) => {
    const pence = Math.round(parseFloat(feeInputValue) * 100);
    if (isNaN(pence) || pence < 0) {
      toast({ title: "Invalid Fee", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    updateFee.mutate({ signupId, fee: pence });
  };

  const handleAttendanceChange = (entry: FinancialEntry, newStatus: AttendanceStatus) => {
    if (newStatus === "ATTENDED" || newStatus === "NOT_ATTENDED") {
      updateAttendance.mutate(
        { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus },
        {
          onSuccess: () => {
            toast({ title: "Attendance Updated", description: `${entry.playerName} marked as ${ATTENDANCE_LABELS[newStatus]}.` });
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to update attendance.", variant: "destructive" });
          },
        }
      );
      return;
    }
    setAttendanceModal({ entry, newStatus, step: 1 });
  };

  const handleAttendanceModalAction = (action: string) => {
    if (!attendanceModal) return;
    const { entry, newStatus, step } = attendanceModal;

    if (["NO_SHOW", "JUSTIFIED_CANCELLATION", "SICKNESS", "EMERGENCY", "OTHER"].includes(newStatus)) {
      if (step === 1) {
        if (action === "no") {
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus, policyMet: false },
            {
              onSuccess: () => {
                toast({ title: "Attendance Updated", description: `${entry.playerName} - No credit issued (policy not met).` });
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal({ ...attendanceModal, step: 2, policyMet: true });
        }
      } else if (step === 2) {
        if (action === "confirm") {
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus, policyMet: true },
            {
              onSuccess: () => {
                createCredit.mutate(
                  {
                    userId: entry.playerUserId,
                    clubId: entry.clubId,
                    amount: entry.fee,
                    reason: `Credit for ${ATTENDANCE_LABELS[newStatus as AttendanceStatus]} - ${entry.sessionTitle}`,
                    linkedSessionId: entry.sessionId,
                    linkedSignupId: entry.signupId,
                    attendanceStatus: newStatus,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Credit Created", description: `Credit of £${formatPounds(entry.fee)} issued to ${entry.playerName}.` });
                    },
                    onError: (err: any) => {
                      let msg = "Failed to create credit.";
                      try {
                        const errText = err?.message || "";
                        const jsonPart = errText.includes("{") ? errText.substring(errText.indexOf("{")) : "";
                        if (jsonPart) msg = JSON.parse(jsonPart).message || msg;
                      } catch {}
                      toast({ title: "Error", description: msg, variant: "destructive" });
                    },
                  }
                );
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal(null);
        }
      }
    } else if (newStatus === "PARTIAL_ATTENDANCE") {
      if (step === 1) {
        if (action === "yes") {
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus },
            {
              onSuccess: () => {
                toast({ title: "Attendance Updated", description: `${entry.playerName} - Attended more than 50%, no credit.` });
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal({ ...attendanceModal, step: 2, partialPercent: 30 });
        }
      } else if (step === 2) {
        if (action === "confirm") {
          const percent = attendanceModal.partialPercent || 30;
          const creditAmount = Math.round((entry.fee * percent) / 100);
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus, partialPercentage: percent },
            {
              onSuccess: () => {
                createCredit.mutate(
                  {
                    userId: entry.playerUserId,
                    clubId: entry.clubId,
                    amount: creditAmount,
                    reason: `Partial credit (${percent}%) for ${entry.sessionTitle}`,
                    linkedSessionId: entry.sessionId,
                    linkedSignupId: entry.signupId,
                    attendanceStatus: newStatus,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Partial Credit Created", description: `${percent}% credit (£${formatPounds(creditAmount)}) issued to ${entry.playerName}.` });
                    },
                  }
                );
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal(null);
        }
      }
    } else if (newStatus === "LATE_ARRIVAL") {
      if (step === 1) {
        if (action === "no") {
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus },
            {
              onSuccess: () => {
                toast({ title: "Attendance Updated", description: `${entry.playerName} - Late arrival, no credit (participation not affected).` });
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal({ ...attendanceModal, step: 2, partialPercent: 20 });
        }
      } else if (step === 2) {
        if (action === "confirm") {
          const percent = attendanceModal.partialPercent || 20;
          const creditAmount = Math.round((entry.fee * percent) / 100);
          updateAttendance.mutate(
            { sessionId: entry.sessionId, signupId: entry.signupId, attendanceStatus: newStatus, partialPercentage: percent },
            {
              onSuccess: () => {
                createCredit.mutate(
                  {
                    userId: entry.playerUserId,
                    clubId: entry.clubId,
                    amount: creditAmount,
                    reason: `Late arrival partial credit (${percent}%) for ${entry.sessionTitle}`,
                    linkedSessionId: entry.sessionId,
                    linkedSignupId: entry.signupId,
                    attendanceStatus: newStatus,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Partial Credit Created", description: `${percent}% credit (£${formatPounds(creditAmount)}) issued to ${entry.playerName}.` });
                    },
                  }
                );
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal(null);
        }
      }
    } else if (newStatus === "SESSION_ABANDONED") {
      if (step === 1) {
        if (action === "next") {
          setAttendanceModal({ ...attendanceModal, step: 2 });
        } else {
          setAttendanceModal(null);
        }
      } else if (step === 2) {
        if (action === "confirm") {
          const isLessThanHalf = attendanceModal.completionLevel === "<50%";
          if (isLessThanHalf) {
            updateAttendance.mutate(
              {
                sessionId: entry.sessionId,
                signupId: entry.signupId,
                attendanceStatus: newStatus,
                attendanceNote: `Reason: ${attendanceModal.abandonedReason || "Unknown"}`,
                policyMet: true,
              },
              {
                onSuccess: () => {
                  createCredit.mutate(
                    {
                      userId: entry.playerUserId,
                      clubId: entry.clubId,
                      amount: entry.fee,
                      reason: `Session abandoned (${attendanceModal.abandonedReason}) - full credit for ${entry.sessionTitle}`,
                      linkedSessionId: entry.sessionId,
                      linkedSignupId: entry.signupId,
                      attendanceStatus: newStatus,
                    },
                    {
                      onSuccess: () => {
                        toast({ title: "Full Credit Created", description: `Full credit of £${formatPounds(entry.fee)} issued to ${entry.playerName}.` });
                      },
                    }
                  );
                },
              }
            );
            setAttendanceModal(null);
          } else {
            setAttendanceModal({ ...attendanceModal, step: 3, partialPercent: 30 });
          }
        } else {
          setAttendanceModal(null);
        }
      } else if (step === 3) {
        if (action === "confirm") {
          const percent = attendanceModal.partialPercent || 30;
          const creditAmt = Math.round((entry.fee * percent) / 100);
          updateAttendance.mutate(
            {
              sessionId: entry.sessionId,
              signupId: entry.signupId,
              attendanceStatus: newStatus,
              attendanceNote: `Reason: ${attendanceModal.abandonedReason || "Unknown"}`,
              partialPercentage: percent,
              policyMet: true,
            },
            {
              onSuccess: () => {
                createCredit.mutate(
                  {
                    userId: entry.playerUserId,
                    clubId: entry.clubId,
                    amount: creditAmt,
                    reason: `Session abandoned (${attendanceModal.abandonedReason}) - ${percent}% partial credit for ${entry.sessionTitle}`,
                    linkedSessionId: entry.sessionId,
                    linkedSignupId: entry.signupId,
                    attendanceStatus: newStatus,
                  },
                  {
                    onSuccess: () => {
                      toast({ title: "Partial Credit Created", description: `${percent}% credit (£${formatPounds(creditAmt)}) issued to ${entry.playerName}.` });
                    },
                  }
                );
              },
            }
          );
          setAttendanceModal(null);
        } else {
          setAttendanceModal(null);
        }
      }
    }
  };

  const handleAddCreditSubmit = () => {
    if (!addCreditDialog) return;
    if (creditSelectedPlayers.length === 0) {
      toast({ title: "Select Players", description: "Please select at least one player.", variant: "destructive" });
      return;
    }
    if (!creditReason.trim()) {
      toast({ title: "Reason Required", description: "Please enter a reason for the credit.", variant: "destructive" });
      return;
    }
    const amountPence = Math.round(parseFloat(creditAmount) * 100);
    if (isNaN(amountPence) || amountPence <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }

    const { entries } = addCreditDialog;
    const promises = creditSelectedPlayers.map((playerId) => {
      const entry = entries.find((e) => e.playerId === playerId);
      if (!entry) return;
      return createCredit.mutateAsync({
        userId: entry.playerUserId,
        clubId: entry.clubId,
        amount: amountPence,
        reason: creditReason,
        linkedSessionId: entry.sessionId,
        linkedSignupId: entry.signupId,
      });
    });

    Promise.all(promises)
      .then(() => {
        toast({ title: "Credits Added", description: `Credit of £${formatPounds(amountPence)} added to ${creditSelectedPlayers.length} player(s).` });
        setAddCreditDialog(null);
        setCreditSelectedPlayers([]);
        setCreditAmount("");
        setCreditReason("");
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to add credits.", variant: "destructive" });
      });
  };

  const handleOpenUseCredit = async (entry: FinancialEntry) => {
    try {
      const res = await fetch(`/api/credits/balance?userId=${entry.playerUserId}&clubId=${entry.clubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      const bal = data.balance || 0;
      setUseCreditDialog({ entry, balance: bal });
      const maxApply = entry.fee > 0 ? Math.min(bal, entry.fee) : bal;
      setUseCreditAmount((maxApply / 100).toFixed(2));
    } catch {
      toast({ title: "Error", description: "Failed to fetch credit balance.", variant: "destructive" });
    }
  };

  const handleUseCreditSubmit = () => {
    if (!useCreditDialog) return;
    const { entry, balance } = useCreditDialog;
    const poundsVal = parseFloat(useCreditAmount);
    if (isNaN(poundsVal) || poundsVal <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid credit amount.", variant: "destructive" });
      return;
    }
    const amount = Math.round(poundsVal * 100);
    if (amount > balance) {
      toast({ title: "Invalid Amount", description: "Amount exceeds available credit.", variant: "destructive" });
      return;
    }
    if (entry.fee > 0 && amount > entry.fee) {
      toast({ title: "Invalid Amount", description: "Amount exceeds the session fee.", variant: "destructive" });
      return;
    }

    useCredit.mutate(
      {
        userId: entry.playerUserId,
        clubId: entry.clubId,
        sessionId: entry.sessionId,
        signupId: entry.signupId,
        amount,
      },
      {
        onSuccess: () => {
          toast({ title: "Credit Applied", description: `£${formatPounds(amount)} credit applied for ${entry.playerName}.` });
          setUseCreditDialog(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to use credit.", variant: "destructive" });
        },
      }
    );
  };

  const toggleSessionExpand = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const togglePlayerExpand = (key: string) => {
    setExpandedPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderPlayerRow = (entry: FinancialEntry) => (
    <TableRow key={entry.signupId} data-testid={`row-signup-${entry.signupId}`}>
      <TableCell className="w-8 px-2">
        <input
          type="checkbox"
          checked={selectedEntries.has(entry.signupId)}
          onChange={() => toggleEntrySelection(entry.signupId)}
          className="h-4 w-4 rounded border-muted-foreground/30 cursor-pointer accent-primary"
          data-testid={`checkbox-entry-${entry.signupId}`}
        />
      </TableCell>
      <TableCell className="font-medium" data-testid={`text-player-name-${entry.signupId}`}>
        <div className="flex items-center gap-1.5">
          {entry.membershipStatus === "ACTIVE" && (
            <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" data-testid={`icon-member-${entry.signupId}`} title={`Member: ${entry.membershipPlanName || "Active"}`} />
          )}
          <span>{entry.playerName}</span>
        </div>
      </TableCell>
      <TableCell>
        {editingFee === entry.signupId ? (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm">£</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={feeInputValue}
              onChange={(e) => setFeeInputValue(e.target.value)}
              className="w-24"
              data-testid={`input-fee-${entry.signupId}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveFee(entry.signupId);
                if (e.key === "Escape") { setEditingFee(null); setFeeInputValue(""); }
              }}
            />
            <Button
              size="sm"
              onClick={() => handleSaveFee(entry.signupId)}
              disabled={updateFee.isPending}
              data-testid={`button-save-fee-${entry.signupId}`}
            >
              {updateFee.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditingFee(null); setFeeInputValue(""); }}
              data-testid={`button-cancel-fee-${entry.signupId}`}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="font-medium" data-testid={`text-fee-${entry.signupId}`}>
                £{formatPounds(entry.fee || 0)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleStartEditFee(entry)}
                data-testid={`button-edit-fee-${entry.signupId}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            {entry.membershipStatus === "ACTIVE" && entry.membershipSessionFee != null && entry.fee !== entry.membershipSessionFee && (
              <span className="text-[10px] text-amber-500" data-testid={`text-member-rate-mismatch-${entry.signupId}`}>
                Member rate: £{formatPounds(entry.membershipSessionFee)} ({entry.membershipPlanName})
              </span>
            )}
            {entry.membershipStatus === "ACTIVE" && entry.membershipSessionFee != null && entry.fee === entry.membershipSessionFee && (
              <span className="text-[10px] text-emerald-500" data-testid={`text-member-rate-match-${entry.signupId}`}>
                {entry.membershipPlanName} rate
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {(() => {
            const bal = getCreditBalance(entry.playerUserId, entry.clubId);
            return bal > 0 ? (
              <span className="font-semibold text-green-400" data-testid={`text-credit-balance-${entry.signupId}`}>
                {"\u00A3"}{formatPounds(bal)}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm" data-testid={`text-credit-balance-${entry.signupId}`}>-</span>
            );
          })()}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              const bal = getCreditBalance(entry.playerUserId, entry.clubId);
              setAdjustCreditDialog({
                userId: entry.playerUserId,
                clubId: entry.clubId,
                playerName: entry.playerName,
                currentBalance: bal,
                sessionId: entry.sessionId,
                signupId: entry.signupId,
              });
              setAdjustCreditAmount("");
              setAdjustCreditReason("");
              setAdjustCreditType("add");
            }}
            data-testid={`button-adjust-credit-${entry.signupId}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {entry.paymentStatus === "PAID" ? (
            <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-${entry.signupId}`}>
              <CheckCircle className="h-3 w-3 mr-1" />
              PAID
            </Badge>
          ) : entry.paymentStatus === "PENDING" ? (
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-payment-${entry.signupId}`}>
              <Clock className="h-3 w-3 mr-1" />
              PENDING
            </Badge>
          ) : (
            <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-${entry.signupId}`}>
              <AlertCircle className="h-3 w-3 mr-1" />
              UNPAID
            </Badge>
          )}
          {entry.paymentMethod && entry.paymentMethod !== "NONE" && (
            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid={`badge-method-${entry.signupId}`}>
              {entry.paymentMethod === "CARD" ? <><CreditCard className="h-3 w-3 mr-1" />Card</> :
               entry.paymentMethod === "MEMBERSHIP_CREDIT" ? <><CreditCard className="h-3 w-3 mr-1" />Credit</> :
               <><Building2 className="h-3 w-3 mr-1" />Bank Transfer</>}
            </Badge>
          )}
          {(entry.creditApplied && entry.creditApplied > 0) ? (
            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid={`badge-credit-applied-${entry.signupId}`}>
              <CreditCard className="h-3 w-3 mr-1" />Credit: {"\u00A3"}{formatPounds(entry.creditApplied)}
            </Badge>
          ) : null}
          {entry.verifiedByAdmin && (
            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs bg-green-50 dark:bg-green-950" data-testid={`badge-verified-${entry.signupId}`}>
              <CheckCircle className="h-3 w-3 mr-1" />Verified
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTogglePayment(entry)}
          disabled={updatePayment.isPending}
          data-testid={`button-toggle-payment-${entry.signupId}`}
        >
          {entry.paymentStatus === "PAID" ? "Mark Unpaid" : "Mark Paid"}
        </Button>
      </TableCell>
      <TableCell>
        <Select
          value={entry.attendanceStatus || "NOT_ATTENDED"}
          onValueChange={(val) => handleAttendanceChange(entry, val as AttendanceStatus)}
        >
          <SelectTrigger className="w-[180px]" data-testid={`select-attendance-${entry.signupId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_ATTENDANCE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {ATTENDANCE_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {entry.paymentStatus === "PAID" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950 text-xs"
              onClick={() => sendPaymentConfirmation.mutate({
                signupId: entry.signupId,
                sessionId: entry.sessionId,
                playerId: entry.playerId,
                immediate: true,
              })}
              disabled={sendPaymentConfirmation.isPending}
              data-testid={`button-send-confirmation-${entry.signupId}`}
              title="Send payment confirmation to player"
            >
              <Send className="h-3 w-3 mr-1" />
              Confirm
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs"
              onClick={() => sendPaymentReminder.mutate({
                signupId: entry.signupId,
                sessionId: entry.sessionId,
                playerId: entry.playerId,
              })}
              disabled={sendPaymentReminder.isPending}
              data-testid={`button-send-reminder-${entry.signupId}`}
              title="Send payment reminder to player"
            >
              <Bell className="h-3 w-3 mr-1" />
              Remind
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenUseCredit(entry)}
            data-testid={`button-use-credit-${entry.signupId}`}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Use Credit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setRemovePlayerDialog({ entry })}
            data-testid={`button-remove-player-${entry.signupId}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-page-title">
              <PoundSterling className="h-6 w-6 text-green-500" />
              Financial Dashboard
            </h1>
            <p className="text-muted-foreground">Track revenue, payments and outstanding fees.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-wrap" data-testid="view-switcher">
          <Button
            size="sm"
            variant={dashboardView === "sessions" ? "default" : "ghost"}
            onClick={() => {
              setDashboardView("sessions");
              setSessionTimeTab("upcoming");
              setSessionSortOrder("oldest");
            }}
            className="gap-1.5"
            data-testid="button-sessions-view"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "classic" ? "default" : "ghost"}
            onClick={() => setDashboardView("classic")}
            className="gap-1.5"
            data-testid="button-classic-view"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Classic</span>
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "analytics" ? "default" : "ghost"}
            onClick={() => setDashboardView("analytics")}
            className="gap-1.5"
            data-testid="button-analytics-view"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "profitability" ? "default" : "ghost"}
            onClick={() => setDashboardView("profitability")}
            className="gap-1.5"
            data-testid="button-profitability-view"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Profitability</span>
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "cashflow" ? "default" : "ghost"}
            onClick={() => setDashboardView("cashflow")}
            className="gap-1.5"
            data-testid="button-cashflow-view"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Cashflow</span>
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "credits" ? "default" : "ghost"}
            onClick={() => { setDashboardView("credits"); if (user?.role === "OWNER") setSelectedClubId("all"); }}
            className="gap-1.5 relative"
            data-testid="button-credits-view"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Credits</span>
            {pendingCreditRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">{pendingCreditRequests.length}</span>
            )}
          </Button>
          <Button
            size="sm"
            variant={dashboardView === "reports" ? "default" : "ghost"}
            onClick={() => setDashboardView("reports")}
            className="gap-1.5"
            data-testid="button-reports-view"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </Button>
        </div>
      </div>

      <Card data-testid="card-filter-bar" className={dashboardView === "credits" ? "hidden" : ""}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search session, player, club..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="w-[180px]" data-testid="select-club-filter">
                    <SelectValue placeholder="All Clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {uniqueClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id.toString()}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="w-[160px]" data-testid="select-session-type">
                  <SelectValue placeholder="Session Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="JUNIORS_ONLY">Juniors Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={matchMode} onValueChange={setMatchMode}>
                <SelectTrigger className="w-[160px]" data-testid="select-match-mode">
                  <SelectValue placeholder="Match Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="COMPETITIVE">Competitive</SelectItem>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-payment-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleClearFilters} data-testid="button-clear-filters">
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>

            {dashboardView === "classic" && (
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={viewMode === "session" ? "default" : "outline"}
                  onClick={() => setViewMode("session")}
                  data-testid="button-view-session"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  By Session
                </Button>
                <Button
                  variant={viewMode === "player" ? "default" : "outline"}
                  onClick={() => setViewMode("player")}
                  data-testid="button-view-player"
                >
                  <Users className="h-4 w-4 mr-1" />
                  By Player
                </Button>
                <Button
                  variant={viewMode === "credits" ? "default" : "outline"}
                  onClick={() => setViewMode("credits")}
                  data-testid="button-view-credits"
                >
                  <History className="h-4 w-4 mr-1" />
                  Credit History
                </Button>
                <Button
                  variant={viewMode === "memberships" ? "default" : "outline"}
                  onClick={() => setViewMode("memberships")}
                  data-testid="button-view-memberships"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Memberships
                </Button>
                <Button
                  variant={viewMode === "manage-credits" ? "default" : "outline"}
                  onClick={() => setViewMode("manage-credits")}
                  data-testid="button-view-manage-credits"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Manage Credits
                </Button>
                <Button
                  variant={viewMode === "donations" ? "default" : "outline"}
                  onClick={() => setViewMode("donations")}
                  data-testid="button-view-donations"
                >
                  <Heart className="h-4 w-4 mr-1" />
                  Donations
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {dashboardView !== "classic" && dashboardView !== "sessions" && dashboardView !== "credits" && (
        <SmartInsights filteredData={filteredData} dashboardData={dashboardData} />
      )}

      {dashboardView === "credits" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant={creditSubTab === "history" ? "default" : "outline"} onClick={() => setCreditSubTab("history")} data-testid="button-credit-tab-history-main">
                <History className="h-3.5 w-3.5 mr-1" /> Transaction History
              </Button>
              <Button size="sm" variant={creditSubTab === "pending" ? "default" : "outline"} onClick={() => setCreditSubTab("pending")} className="relative" data-testid="button-credit-tab-pending-main">
                <Clock className="h-3.5 w-3.5 mr-1" /> Pending Requests
                {(pendingCreditRequests.length + pendingRewards.length) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{pendingCreditRequests.length + pendingRewards.length}</span>
                )}
              </Button>
              <Button size="sm" variant={creditSubTab === "analytics" ? "default" : "outline"} onClick={() => setCreditSubTab("analytics")} data-testid="button-credit-tab-analytics-main">
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Analytics
              </Button>
            </div>
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="w-[180px]" data-testid="select-credit-club-filter">
                <SelectValue placeholder="All Clubs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {uniqueClubs.map((club) => (
                  <SelectItem key={club.id} value={club.id.toString()}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {creditSummary && (creditSummary.totalIssued > 0 || creditSummary.totalRedeemed > 0 || (creditSummary.rewardsUnclaimed || 0) > 0) && (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Card
                className={`min-w-0 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "all" ? "ring-2 ring-primary" : ""}`}
                data-testid="card-credit-issued-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "all" ? null : "all"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Issued</CardTitle>
                  <TrendingUp className="h-3 w-3 shrink-0 text-green-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold text-green-600">{"\u00A3"}{formatPounds(creditSummary.totalIssued)}</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Credits + Rewards</p>
                </CardContent>
              </Card>
              <Card
                className={`min-w-0 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "USED" ? "ring-2 ring-green-500" : ""}`}
                data-testid="card-credit-redeemed-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "USED" ? null : "USED"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Redeemed</CardTitle>
                  <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold">{"\u00A3"}{formatPounds(creditSummary.totalRedeemed)}</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Used by members</p>
                </CardContent>
              </Card>
              <Card
                className={`min-w-0 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "AVAILABLE" ? "ring-2 ring-amber-500" : ""}`}
                data-testid="card-credit-held-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "AVAILABLE" ? null : "AVAILABLE"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
                  <CreditCard className="h-3 w-3 shrink-0 text-blue-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold text-blue-600">{"\u00A3"}{formatPounds(creditSummary.totalHeld)}</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Currently held</p>
                </CardContent>
              </Card>
              <Card
                className={`min-w-0 border-amber-200 dark:border-amber-800 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "AVAILABLE" ? "ring-2 ring-amber-500" : ""}`}
                data-testid="card-rewards-unclaimed-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "AVAILABLE" ? null : "AVAILABLE"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400">Rewards Unclaimed</CardTitle>
                  <Gift className="h-3 w-3 shrink-0 text-amber-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold text-amber-600">{"\u00A3"}{formatPounds(creditSummary.rewardsUnclaimed || 0)}</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditSummary.rewardsUnclaimedCount || 0} pending collection</p>
                </CardContent>
              </Card>
              <Card
                className={`min-w-0 border-purple-200 dark:border-purple-800 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "REQUESTED" ? "ring-2 ring-purple-500" : ""}`}
                data-testid="card-rewards-pending-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "REQUESTED" ? null : "REQUESTED"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-purple-600 dark:text-purple-400">Awaiting Approval</CardTitle>
                  <Clock className="h-3 w-3 shrink-0 text-purple-500" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold text-purple-600">{"\u00A3"}{formatPounds(creditSummary.rewardsRequested || 0)}</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditSummary.rewardsRequestedCount || 0} request(s)</p>
                </CardContent>
              </Card>
              <Card
                className={`min-w-0 cursor-pointer transition-all hover:shadow-md ${rewardDetailFilter === "USED" ? "ring-2 ring-green-500" : ""}`}
                data-testid="card-credit-rate-main"
                onClick={() => { setRewardDetailFilter(rewardDetailFilter === "USED" ? null : "USED"); setExpandedPlayerId(null); setSelectedCategory(null); }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Redemption Rate</CardTitle>
                  <Percent className="h-3 w-3 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold">{creditSummary.totalIssued > 0 ? ((creditSummary.totalRedeemed / creditSummary.totalIssued) * 100).toFixed(1) : "0.0"}%</div>
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Redeemed vs issued</p>
                </CardContent>
              </Card>
            </div>
          )}

          {rewardDetailFilter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">
                    {rewardDetailFilter === "AVAILABLE" ? "Players with Unclaimed Rewards" :
                     rewardDetailFilter === "REQUESTED" ? "Players with Pending Approval" :
                     rewardDetailFilter === "USED" ? "Players with Claimed Rewards" :
                     "All Player Rewards & Credits"}
                  </h3>
                  <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                    {filteredSortedPlayers.length !== rewardPlayers.length
                      ? `${filteredSortedPlayers.length} of ${rewardPlayers.length} players`
                      : `${rewardPlayers.length} player${rewardPlayers.length !== 1 ? "s" : ""}`}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {rewardDetailFilter !== "all" && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setRewardDetailFilter("all"); setExpandedPlayerId(null); setSelectedCategory(null); }} data-testid="button-show-all-rewards">
                      Show All Statuses
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setRewardDetailFilter(null); setExpandedPlayerId(null); setSelectedCategory(null); setRewardSearchQuery(""); setRewardMinAmount(""); setRewardMaxAmount(""); setRewardMinRewards(""); setRewardStatusChips(new Set()); setShowAdvancedFilters(false); }} data-testid="button-close-reward-details">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={rewardSearchQuery}
                      onChange={(e) => { setRewardSearchQuery(e.target.value); setExpandedPlayerId(null); }}
                      className="pl-9 h-9 text-sm"
                      data-testid="input-reward-search"
                    />
                    {rewardSearchQuery && (
                      <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setRewardSearchQuery("")}>
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Select value={rewardSortBy} onValueChange={(v: any) => { setRewardSortBy(v); setExpandedPlayerId(null); }}>
                    <SelectTrigger className="w-[180px] h-9 text-xs" data-testid="select-reward-sort">
                      <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total-desc">Highest Total</SelectItem>
                      <SelectItem value="total-asc">Lowest Total</SelectItem>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                      <SelectItem value="name-desc">Name Z-A</SelectItem>
                      <SelectItem value="unclaimed-desc">Most Unclaimed</SelectItem>
                      <SelectItem value="pending-desc">Most Pending</SelectItem>
                      <SelectItem value="claimed-desc">Most Claimed</SelectItem>
                      <SelectItem value="count-desc">Most Rewards</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant={showAdvancedFilters ? "default" : "outline"}
                    className={`h-9 text-xs gap-1.5 ${hasActiveAdvancedFilters && !showAdvancedFilters ? "border-primary text-primary" : ""}`}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    data-testid="button-toggle-advanced-filters"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Filters
                    {hasActiveAdvancedFilters && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] no-default-hover-elevate no-default-active-elevate">
                        {(rewardMinAmount ? 1 : 0) + (rewardMaxAmount ? 1 : 0) + (rewardMinRewards ? 1 : 0) + rewardStatusChips.size}
                      </Badge>
                    )}
                  </Button>
                </div>

                {showAdvancedFilters && (
                  <Card className="border-dashed">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Min Amount (£)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={rewardMinAmount}
                            onChange={(e) => setRewardMinAmount(e.target.value)}
                            className="w-24 h-8 text-xs"
                            data-testid="input-reward-min-amount"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Amount (£)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="999.99"
                            value={rewardMaxAmount}
                            onChange={(e) => setRewardMaxAmount(e.target.value)}
                            className="w-24 h-8 text-xs"
                            data-testid="input-reward-max-amount"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Min Rewards</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={rewardMinRewards}
                            onChange={(e) => setRewardMinRewards(e.target.value)}
                            className="w-20 h-8 text-xs"
                            data-testid="input-reward-min-count"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Has Status</Label>
                          <div className="flex gap-1.5">
                            {([
                              { key: "unclaimed", label: "Unclaimed", color: "text-amber-600 border-amber-300" },
                              { key: "pending", label: "Pending", color: "text-purple-600 border-purple-300" },
                              { key: "claimed", label: "Claimed", color: "text-green-600 border-green-300" },
                            ] as const).map(chip => (
                              <button
                                key={chip.key}
                                className={`px-2 py-1 text-[10px] rounded-md border transition-colors ${
                                  rewardStatusChips.has(chip.key) ? "bg-primary text-primary-foreground border-primary" : chip.color
                                }`}
                                onClick={() => {
                                  const next = new Set(rewardStatusChips);
                                  if (next.has(chip.key)) next.delete(chip.key); else next.add(chip.key);
                                  setRewardStatusChips(next);
                                  setExpandedPlayerId(null);
                                }}
                                data-testid={`chip-status-${chip.key}`}
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {hasActiveAdvancedFilters && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() => { setRewardMinAmount(""); setRewardMaxAmount(""); setRewardMinRewards(""); setRewardStatusChips(new Set()); setExpandedPlayerId(null); }}
                            data-testid="button-clear-advanced-filters"
                          >
                            <X className="h-3 w-3 mr-1" /> Clear All
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {Object.keys(allCategoryTotals).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={selectedCategory === null ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => { setSelectedCategory(null); setExpandedPlayerId(null); }}
                      data-testid="button-category-all"
                    >
                      All Categories
                    </Button>
                    {Object.entries(allCategoryTotals).sort(([,a],[,b]) => b.credits - a.credits).map(([cat, totals]) => {
                      const info = CATEGORY_LABELS[cat] || { label: cat, color: "text-gray-600", icon: "📦" };
                      return (
                        <Button
                          key={cat}
                          size="sm"
                          variant={selectedCategory === cat ? "default" : "outline"}
                          className={`text-xs h-7 ${selectedCategory !== cat ? info.color : ""}`}
                          onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setExpandedPlayerId(null); }}
                          data-testid={`button-category-${cat}`}
                        >
                          <span className="mr-1">{info.icon}</span>
                          {info.label} ({totals.count}) {"\u00A3"}{formatPounds(totals.credits)}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {(rewardSearchQuery || hasActiveAdvancedFilters) && !rewardPerPlayerLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Showing {filteredSortedPlayers.length} of {rewardPlayers.length} players</span>
                  {(rewardSearchQuery || hasActiveAdvancedFilters) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2"
                      onClick={() => { setRewardSearchQuery(""); setRewardMinAmount(""); setRewardMaxAmount(""); setRewardMinRewards(""); setRewardStatusChips(new Set()); }}
                      data-testid="button-clear-all-filters"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}

              {rewardPerPlayerLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading reward details...</p>
                  </CardContent>
                </Card>
              ) : filteredSortedPlayers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    {rewardPlayers.length > 0 ? "No players match your filters." : "No rewards found for this filter."}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredSortedPlayers.map((player) => (
                    <Card
                      key={player.playerId}
                      className={`transition-all ${expandedPlayerId === player.playerId ? "ring-1 ring-primary" : ""}`}
                      data-testid={`card-reward-player-${player.playerId}`}
                    >
                      <CardContent className="p-0">
                        <button
                          className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors rounded-lg"
                          onClick={() => setExpandedPlayerId(expandedPlayerId === player.playerId ? null : player.playerId)}
                          data-testid={`button-expand-player-${player.playerId}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate" data-testid={`text-reward-player-name-${player.playerId}`}>{player.playerName}</p>
                              <p className="text-xs text-muted-foreground truncate">{player.playerEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                            {player.availableCount > 0 && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-available-${player.playerId}`}>
                                <Gift className="h-3 w-3 mr-1" />
                                {player.availableCount} unclaimed ({"\u00A3"}{formatPounds(player.available)})
                              </Badge>
                            )}
                            {player.requestedCount > 0 && (
                              <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-requested-${player.playerId}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {player.requestedCount} pending ({"\u00A3"}{formatPounds(player.requested)})
                              </Badge>
                            )}
                            {player.usedCount > 0 && (
                              <Badge variant="outline" className="text-green-600 border-green-300 text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-used-${player.playerId}`}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {player.usedCount} claimed ({"\u00A3"}{formatPounds(player.used)})
                              </Badge>
                            )}
                            <span className="text-sm font-bold">{"\u00A3"}{formatPounds(player.totalCredits)}</span>
                            {expandedPlayerId === player.playerId ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {expandedPlayerId === player.playerId && (
                          <div className="px-4 pb-4 border-t">
                            <div className="grid grid-cols-3 gap-3 py-3 mb-3 border-b">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Unclaimed</p>
                                <p className="text-sm font-bold text-amber-600">{"\u00A3"}{formatPounds(player.available)}</p>
                                <p className="text-[10px] text-muted-foreground">{player.availableCount} reward{player.availableCount !== 1 ? "s" : ""}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="text-sm font-bold text-purple-600">{"\u00A3"}{formatPounds(player.requested)}</p>
                                <p className="text-[10px] text-muted-foreground">{player.requestedCount} reward{player.requestedCount !== 1 ? "s" : ""}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Claimed</p>
                                <p className="text-sm font-bold text-green-600">{"\u00A3"}{formatPounds(player.used)}</p>
                                <p className="text-[10px] text-muted-foreground">{player.usedCount} reward{player.usedCount !== 1 ? "s" : ""}</p>
                              </div>
                            </div>

                            {Object.keys(player.byCategory || {}).length > 0 && (
                              <div className="flex flex-wrap gap-2 py-2 mb-2 border-b">
                                {Object.entries(player.byCategory || {}).map(([cat, data]) => {
                                  const info = CATEGORY_LABELS[cat] || { label: cat, color: "text-gray-600", icon: "📦" };
                                  return (
                                    <div key={cat} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-muted/50">
                                      <span>{info.icon}</span>
                                      <span className={`font-medium ${info.color}`}>{info.label}</span>
                                      <span className="text-muted-foreground">({data.count}) {"\u00A3"}{formatPounds(data.credits)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="space-y-2">
                              {player.rewards.map((r) => {
                                const catInfo = CATEGORY_LABELS[r.rewardType] || { label: r.rewardType, color: "text-gray-600", icon: "📦" };
                                return (
                                  <div key={r.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-0" data-testid={`row-reward-detail-${r.id}`}>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm">{catInfo.icon}</span>
                                        <span className={`text-sm font-medium ${catInfo.color}`}>{catInfo.label}</span>
                                        {r.status === "AVAILABLE" && (
                                          <Badge variant="outline" className="text-amber-600 text-[10px] no-default-hover-elevate no-default-active-elevate">Unclaimed</Badge>
                                        )}
                                        {r.status === "REQUESTED" && (
                                          <Badge variant="outline" className="text-purple-600 text-[10px] no-default-hover-elevate no-default-active-elevate">Pending</Badge>
                                        )}
                                        {r.status === "USED" && (
                                          <Badge variant="outline" className="text-green-600 text-[10px] no-default-hover-elevate no-default-active-elevate">Claimed</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                        <span>{r.clubName}</span>
                                        <span>{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      {r.credits > 0 && (
                                        <p className="text-sm font-semibold">{"\u00A3"}{formatPounds(r.credits)}</p>
                                      )}
                                      {r.freeSessions > 0 && (
                                        <p className="text-xs text-blue-600">{r.freeSessions} free session{r.freeSessions !== 1 ? "s" : ""}</p>
                                      )}
                                      {r.gifts && (
                                        <p className="text-xs text-green-600"><Gift className="h-3 w-3 inline mr-0.5" />{r.gifts}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {creditSubTab === "pending" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {pendingCreditRequests.length} credit request{pendingCreditRequests.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {pendingRewards.length} reward{pendingRewards.length !== 1 ? "s" : ""} awaiting approval
                  </span>
                </div>
              </div>

              {(pendingCreditLoading || pendingRewardsLoading) ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading pending requests...</p>
                  </CardContent>
                </Card>
              ) : (pendingCreditRequests.length === 0 && pendingRewards.length === 0) ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-pending-credits-main">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No pending requests. All caught up!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingRewards.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Gift className="h-4 w-4 text-amber-500" />
                        Pending Reward Approvals
                      </h4>
                      {pendingRewards.map((pr) => (
                        <Card key={`reward-${pr.id}`} className="border-amber-200 dark:border-amber-800" data-testid={`card-pending-reward-main-${pr.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-semibold text-sm">{pr.playerName}</span>
                                  <Badge variant="outline" className="text-amber-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Award className="h-3 w-3 mr-1" /> {pr.rewardType?.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge variant="outline" className="text-purple-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Clock className="h-3 w-3 mr-1" /> Requested
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1">{pr.description}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                  {pr.credits > 0 && (
                                    <span className="font-medium text-amber-600">
                                      Value: {"\u00A3"}{formatPounds(pr.credits)}
                                    </span>
                                  )}
                                  {pr.freeSessions > 0 && (
                                    <span className="font-medium text-blue-600">
                                      {pr.freeSessions} free session{pr.freeSessions !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {pr.gifts && (
                                    <span className="font-medium text-green-600">
                                      <Gift className="h-3 w-3 inline mr-1" />{pr.gifts}
                                    </span>
                                  )}
                                  <span>{pr.clubName}</span>
                                  <span>Requested: {pr.updatedAt ? format(new Date(pr.updatedAt), "MMM d, yyyy HH:mm") : "N/A"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => approveRewardMutation.mutate({ rewardId: pr.id, action: "approve" })}
                                  disabled={approveRewardMutation.isPending}
                                  data-testid={`button-approve-reward-main-${pr.id}`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {pendingCreditRequests.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        Pending Credit Requests
                      </h4>
                      {pendingCreditRequests.map((pcr) => (
                        <Card key={pcr.id} data-testid={`card-pending-credit-main-${pcr.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-semibold text-sm" data-testid={`text-pending-player-main-${pcr.id}`}>{pcr.playerName}</span>
                                  <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">{pcr.ticketNumber}</Badge>
                                  <Badge variant="outline" className="text-amber-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Clock className="h-3 w-3 mr-1" /> Pending
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{pcr.playerEmail}</p>
                                <p className="text-sm mt-1 font-medium" data-testid={`text-pending-subject-main-${pcr.id}`}>{pcr.subject}</p>
                                {pcr.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[500px] line-clamp-2">{pcr.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                  {pcr.creditAmount && pcr.creditAmount > 0 && (
                                    <span className="font-medium text-blue-600" data-testid={`text-pending-amount-main-${pcr.id}`}>
                                      Requested: {"\u00A3"}{formatPounds(pcr.creditAmount)}
                                    </span>
                                  )}
                                  <span>{pcr.clubName}</span>
                                  {pcr.sessionTitle && <span>Session: {pcr.sessionTitle}</span>}
                                  {pcr.sessionDate && <span>{format(new Date(pcr.sessionDate), "MMM d, yyyy")}</span>}
                                  <span>Submitted: {pcr.createdAt ? format(new Date(pcr.createdAt), "MMM d, yyyy HH:mm") : "N/A"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    setApproveDialog({
                                      ticketId: pcr.id,
                                      playerName: pcr.playerName,
                                      amount: pcr.creditAmount || 0,
                                      subject: pcr.subject,
                                      description: pcr.description,
                                    });
                                    setApproveAmount(pcr.creditAmount ? (pcr.creditAmount / 100).toFixed(2) : "");
                                    setApproveReason("");
                                  }}
                                  data-testid={`button-approve-credit-main-${pcr.id}`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => {
                                    setDeclineDialog({
                                      ticketId: pcr.id,
                                      playerName: pcr.playerName,
                                      subject: pcr.subject,
                                    });
                                    setDeclineReason("");
                                  }}
                                  data-testid={`button-decline-credit-main-${pcr.id}`}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {creditSubTab === "analytics" && (
            <div className="space-y-4">
              {!creditAnalytics ? (
                creditLoading ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading analytics...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-credit-analytics-main">
                      No credit data available for analytics.
                    </CardContent>
                  </Card>
                )
              ) : (
                <>
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Issued</CardTitle>
                        <TrendingUp className="h-3 w-3 shrink-0 text-green-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-green-600">{"\u00A3"}{formatPounds(creditAnalytics.totalAdded)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.addedCount} transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Redeemed</CardTitle>
                        <TrendingDown className="h-3 w-3 shrink-0 text-orange-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-orange-600">{"\u00A3"}{formatPounds(creditAnalytics.totalUsed)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.usedCount} transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
                        <CreditCard className="h-3 w-3 shrink-0 text-blue-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-blue-600">{"\u00A3"}{formatPounds(creditAnalytics.netOutstanding)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.uniquePlayers} player(s)</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Redemption Rate</CardTitle>
                        <Percent className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold">{creditAnalytics.redemptionRate}%</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Redeemed vs issued</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="min-w-0">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Credit Issued</p>
                            <p className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(creditAnalytics.avgCreditIssued)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Credit Redeemed</p>
                            <p className="text-lg font-bold text-orange-600">{"\u00A3"}{formatPounds(creditAnalytics.avgCreditUsed)}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Total Transactions</p>
                          <p className="text-lg font-bold">{creditAnalytics.totalTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {creditAnalytics.topHolders.length > 0 && (
                      <Card className="min-w-0">
                        <CardHeader className="px-3 pt-3 pb-2">
                          <CardTitle className="text-sm font-medium">Top Credit Holders</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="space-y-1.5">
                            {creditAnalytics.topHolders.map((p, i) => (
                              <div key={p.userId} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                                  <span className="truncate max-w-[180px]">{p.name}</span>
                                </span>
                                <span className="font-medium text-blue-600">{"\u00A3"}{formatPounds(p.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {creditAnalytics.recentMonths.length > 0 && (
                    <Card className="min-w-0">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Issued</TableHead>
                                <TableHead>Redeemed</TableHead>
                                <TableHead>Net</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {creditAnalytics.recentMonths.map((m) => (
                                <TableRow key={m.month}>
                                  <TableCell className="font-medium">{format(new Date(m.month + "-01"), "MMM yyyy")}</TableCell>
                                  <TableCell className="text-green-600">{"\u00A3"}{formatPounds(m.added)}</TableCell>
                                  <TableCell className="text-orange-600">{"\u00A3"}{formatPounds(m.used)}</TableCell>
                                  <TableCell className={m.added - m.used > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}>{"\u00A3"}{formatPounds(m.added - m.used)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {creditAnalytics.topReasons.length > 0 && (
                    <Card className="min-w-0">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Top Credit Reasons</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="space-y-1.5">
                          {creditAnalytics.topReasons.map(([reason, count]) => (
                            <div key={reason} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[300px] text-muted-foreground">{reason}</span>
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {creditSubTab === "history" && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by player name or email..."
                    value={creditSearchQuery}
                    onChange={(e) => setCreditSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-credit-search-main"
                  />
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                  {Object.keys(creditPlayerGroups).length} player(s)
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                  {creditHistory.length} transaction(s)
                </Badge>
              </div>

              {creditLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading credit history...</p>
                  </CardContent>
                </Card>
              ) : Object.keys(creditPlayerGroups).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-credits-main">
                    No credit history found.
                  </CardContent>
                </Card>
              ) : (
                Object.entries(creditPlayerGroups).map(([key, group]) => {
                  const isExpanded = expandedCreditPlayers.has(key);
                  return (
                    <Card key={key} data-testid={`card-credit-player-main-${key}`}>
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() => {
                          setExpandedCreditPlayers((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        }}
                        data-testid={`button-expand-credit-main-${key}`}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-base" data-testid={`text-credit-player-name-main-${key}`}>
                                {group.playerName}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">{group.playerEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Added: {"\u00A3"}{formatPounds(group.totalAdded)}
                            </Badge>
                            <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Used: {"\u00A3"}{formatPounds(group.totalUsed)}
                            </Badge>
                            <Badge variant={group.balance > 0 ? "default" : "secondary"} className="no-default-hover-elevate no-default-active-elevate">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Balance: {"\u00A3"}{formatPounds(group.balance)}
                            </Badge>
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                              {group.entries.length} txn(s)
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Reason</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Session</TableHead>
                                  <TableHead>Club</TableHead>
                                  <TableHead>By</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.entries.map((entry) => (
                                  <TableRow key={entry.id} data-testid={`row-credit-main-${entry.id}`}>
                                    <TableCell className="whitespace-nowrap text-sm">
                                      {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        {entry.amount > 0 ? (
                                          <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate w-fit">
                                            <Plus className="h-3 w-3 mr-1" /> Added
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate w-fit">
                                            <TrendingDown className="h-3 w-3 mr-1" /> Used
                                          </Badge>
                                        )}
                                        {entry.source === "reward_ledger" && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate w-fit">Reward</Badge>
                                        )}
                                        {entry.source === "card_credit" && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate w-fit">Card</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`font-medium ${entry.amount > 0 ? "text-green-600" : "text-orange-600"}`}>
                                      {entry.amount > 0 ? "+" : "-"}{"\u00A3"}{formatPounds(Math.abs(entry.amount))}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={entry.reason}>
                                      {entry.reason}
                                    </TableCell>
                                    <TableCell>
                                      {entry.amount > 0 ? (
                                        group.balance <= 0 ? (
                                          <Badge variant="outline" className="text-blue-600 no-default-hover-elevate no-default-active-elevate">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Claimed
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-amber-600 no-default-hover-elevate no-default-active-elevate">
                                            <Clock className="h-3 w-3 mr-1" /> Unclaimed
                                          </Badge>
                                        )
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate no-default-active-elevate">
                                          <CheckCircle className="h-3 w-3 mr-1" /> Applied
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {entry.sessionTitle || "-"}
                                      {entry.sessionDate && (
                                        <span className="block text-xs">{format(new Date(entry.sessionDate), "MMM d, yyyy")}</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{entry.clubName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{entry.createdByName}</TableCell>
                                    <TableCell>
                                      {(!entry.source || entry.source === "credit_ledger") ? (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditCreditDialog({
                                                id: entry.id,
                                                amount: entry.amount,
                                                reason: entry.reason,
                                                linkedSignupId: entry.linkedSignupId,
                                                sessionFee: entry.sessionFee,
                                                playerName: group.playerName,
                                              });
                                              setEditCreditAmount((Math.abs(entry.amount) / 100).toFixed(2));
                                              setEditCreditReason(entry.reason);
                                            }}
                                            data-testid={`button-edit-credit-main-${entry.id}`}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => setDeleteCreditDialog({
                                              id: entry.id,
                                              amount: entry.amount,
                                              playerName: group.playerName,
                                              reason: entry.reason,
                                            })}
                                            data-testid={`button-delete-credit-main-${entry.id}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      ) : dashboardView === "analytics" ? (
        <FinancialAnalyticsView
          filteredData={filteredData}
          dashboardData={dashboardData}
        />
      ) : dashboardView === "profitability" ? (
        <ProfitabilityView filteredData={filteredData} dashboardData={dashboardData} />
      ) : dashboardView === "cashflow" ? (
        <CashflowView filteredData={filteredData} dashboardData={dashboardData} />
      ) : dashboardView === "reports" ? (
        <ReportsView filteredData={filteredData} dashboardData={dashboardData} />
      ) : dashboardView === "sessions" ? (
      <>
      {clubRevenueData.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Revenue by Club
          </h2>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {clubRevenueData.map(club => (
              <Card key={club.clubId} className="hover-elevate cursor-pointer min-w-0" onClick={() => setRevenueClubDialog({ clubId: club.clubId, clubName: club.clubName })} data-testid={`card-club-revenue-sessions-${club.clubId}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium" data-testid={`text-club-name-sessions-${club.clubId}`}>{club.clubName}</CardTitle>
                  <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold" data-testid={`text-club-total-sessions-${club.clubId}`}>{"£"}{formatPounds(club.totalRevenue)}</div>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[9px] sm:text-[11px] text-muted-foreground flex-wrap">
                    <span className="text-green-600" data-testid={`text-club-paid-sessions-${club.clubId}`}>{"£"}{formatPounds(club.totalPaid)} paid</span>
                    <span data-testid={`text-club-members-sessions-${club.clubId}`}>{club.memberCount} members</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      </>
      ) : (
      <>
      <div className="grid gap-2 grid-cols-3 sm:grid-cols-3 md:grid-cols-5">
        <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-total-revenue" onClick={() => setFinKpiDetail("revenue")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Revenue</CardTitle>
            <PoundSterling className="h-3 w-3 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm sm:text-xl font-bold" data-testid="text-total-revenue">
              £{formatPounds(totalRevenue)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{filteredData.length} signups</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-collected" onClick={() => setFinKpiDetail("collected")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Collected</CardTitle>
            <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm sm:text-xl font-bold text-green-600" data-testid="text-collected">
              £{formatPounds(paidTotal)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">
              {filteredData.filter((e) => e.paymentStatus === "PAID").length} paid
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-pending-transfers" onClick={() => setFinKpiDetail("pending")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-3 w-3 shrink-0 text-yellow-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm sm:text-xl font-bold text-yellow-600" data-testid="text-pending-transfers">
              £{formatPounds(pendingTotal)}
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">
              {filteredData.filter((e) => e.paymentStatus === "PENDING").length} awaiting
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-outstanding" onClick={() => setOutstandingDialogOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
            <AlertCircle className="h-3 w-3 shrink-0 text-orange-500" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm sm:text-xl font-bold text-orange-600" data-testid="text-outstanding">
              £{formatPounds(outstandingTotal)}
            </div>
            <div className="flex items-center justify-between gap-1 mt-0.5 flex-wrap">
              <p className="text-[9px] sm:text-[11px] text-muted-foreground">
                {filteredData.filter((e) => e.paymentStatus === "UNPAID" || e.paymentStatus === "PENDING").length} unpaid
              </p>
              {outstandingTotal > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[9px] sm:text-[11px] px-1 sm:px-2"
                  onClick={() => setOutstandingDialogOpen(true)}
                  data-testid="button-view-outstanding"
                >
                  <Search className="h-2.5 w-2.5 mr-0.5" />
                  Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-collection-rate" onClick={() => setFinKpiDetail("collection-rate")}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
            <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Collection</CardTitle>
            <Percent className="h-3 w-3 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-sm sm:text-xl font-bold" data-testid="text-collection-rate">
              {collectionRate}%
            </div>
            <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Paid vs total</p>
          </CardContent>
        </Card>
      </div>

      {dashboardData && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-total-income" onClick={() => setFinKpiDetail("total-income")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Income</CardTitle>
              <TrendingUp className="h-3 w-3 shrink-0 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-green-600" data-testid="text-total-income">
                {"\u00A3"}{formatPounds(dashboardData.totalIncome)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 break-words leading-tight">
                Sessions: {"\u00A3"}{formatPounds(dashboardData.sessionIncome)}
                {dashboardData.inventorySales > 0 && <><br />Sales: {"\u00A3"}{formatPounds(dashboardData.inventorySales)}</>}
                {dashboardData.membershipPaid > 0 && <><br />Memberships: {"\u00A3"}{formatPounds(dashboardData.membershipPaid)}</>}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-total-expenses" onClick={() => setFinKpiDetail("total-expenses")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Expenses</CardTitle>
              <TrendingDown className="h-3 w-3 shrink-0 text-red-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-red-600" data-testid="text-total-expenses-dash">
                {"\u00A3"}{formatPounds(dashboardData.totalExpenses)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5 break-words leading-tight">
                {dashboardData.inventoryPurchases > 0 && <>Inventory: {"\u00A3"}{formatPounds(dashboardData.inventoryPurchases)}</>}
                {dashboardData.generalExpenses > 0 && <><br />General: {"\u00A3"}{formatPounds(dashboardData.generalExpenses)}</>}
                {dashboardData.totalExpenses === 0 && "No expenses"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-net-revenue" onClick={() => setFinKpiDetail("net-revenue")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Net Revenue</CardTitle>
              <PoundSterling className="h-3 w-3 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className={`text-sm sm:text-xl font-bold ${dashboardData.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-revenue">
                {dashboardData.netRevenue < 0 ? "-" : ""}{"\u00A3"}{formatPounds(Math.abs(dashboardData.netRevenue))}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Income minus expenses</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-stock-usage" onClick={() => setFinKpiDetail("stock-usage")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Stock Used</CardTitle>
              <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold" data-testid="text-stock-used">
                {dashboardData.stockUsed}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Items used in sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {dashboardData && dashboardData.membershipActiveCount > 0 && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-membership-revenue" onClick={() => setFinKpiDetail("membership-revenue")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Membership Rev.</CardTitle>
              <CreditCard className="h-3 w-3 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold" data-testid="text-membership-revenue">
                {"\u00A3"}{formatPounds(dashboardData.membershipTotalRevenue)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{dashboardData.membershipActiveCount} active</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-membership-paid" onClick={() => setFinKpiDetail("membership-paid")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Membership Paid</CardTitle>
              <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-green-600" data-testid="text-membership-paid">
                {"\u00A3"}{formatPounds(dashboardData.membershipPaid)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">
                {dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "PAID").length} paid
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-membership-unpaid" onClick={() => setFinKpiDetail("membership-unpaid")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Membership Owed</CardTitle>
              <AlertCircle className="h-3 w-3 shrink-0 text-orange-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-orange-600" data-testid="text-membership-unpaid">
                {"\u00A3"}{formatPounds(dashboardData.membershipUnpaid)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">
                {dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "UNPAID").length} unpaid
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-membership-overdue" onClick={() => setFinKpiDetail("membership-overdue")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Overdue</CardTitle>
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-red-600" data-testid="text-membership-overdue">
                {dashboardData.membershipOverdue}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Unpaid past due</p>
            </CardContent>
          </Card>
        </div>
      )}

      {creditSummary && (creditSummary.totalIssued > 0 || creditSummary.totalRedeemed > 0) && (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-credit-outstanding" onClick={() => setFinKpiDetail("credit-outstanding")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Credits Held</CardTitle>
              <CreditCard className="h-3 w-3 shrink-0 text-blue-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-blue-600" data-testid="text-credit-outstanding">
                {"\u00A3"}{formatPounds(creditSummary.totalHeld)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Currently outstanding</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-credit-issued" onClick={() => setFinKpiDetail("credit-issued")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Credits Issued</CardTitle>
              <TrendingUp className="h-3 w-3 shrink-0 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold text-green-600" data-testid="text-credit-issued">
                {"\u00A3"}{formatPounds(creditSummary.totalIssued)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">All time issued</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover-elevate min-w-0" data-testid="card-credit-redeemed" onClick={() => setFinKpiDetail("credit-redeemed")}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Credits Redeemed</CardTitle>
              <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold" data-testid="text-credit-redeemed">
                {"\u00A3"}{formatPounds(creditSummary.totalRedeemed)}
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Used by members</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate min-w-0" data-testid="card-credit-ratio">
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Redemption Rate</CardTitle>
              <Percent className="h-3 w-3 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-sm sm:text-xl font-bold" data-testid="text-credit-ratio">
                {creditSummary.totalIssued > 0 ? ((creditSummary.totalRedeemed / creditSummary.totalIssued) * 100).toFixed(1) : "0.0"}%
              </div>
              <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Redeemed vs issued</p>
            </CardContent>
          </Card>
        </div>
      )}

      {revenueSummary.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Summary
            </h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant={summaryPeriod === "month" ? "default" : "outline"} onClick={() => setSummaryPeriod("month")} data-testid="button-summary-month">Monthly</Button>
              <Button size="sm" variant={summaryPeriod === "quarter" ? "default" : "outline"} onClick={() => setSummaryPeriod("quarter")} data-testid="button-summary-quarter">Quarterly</Button>
              <Button size="sm" variant={summaryPeriod === "year" ? "default" : "outline"} onClick={() => setSummaryPeriod("year")} data-testid="button-summary-year">Yearly</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Collection Rate</TableHead>
                  <TableHead>Signups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueSummary.map(period => (
                  <TableRow key={period.sortKey} data-testid={`row-summary-${period.sortKey}`}>
                    <TableCell className="font-medium" data-testid={`text-summary-period-${period.sortKey}`}>{period.label}</TableCell>
                    <TableCell className="font-bold" data-testid={`text-summary-revenue-${period.sortKey}`}>{"\u00A3"}{formatPounds(period.revenue)}</TableCell>
                    <TableCell className="text-green-600" data-testid={`text-summary-collected-${period.sortKey}`}>{"\u00A3"}{formatPounds(period.paid)}</TableCell>
                    <TableCell className={period.revenue - period.paid > 0 ? "text-orange-600" : "text-muted-foreground"} data-testid={`text-summary-outstanding-${period.sortKey}`}>{"\u00A3"}{formatPounds(period.revenue - period.paid)}</TableCell>
                    <TableCell data-testid={`text-summary-rate-${period.sortKey}`}>{period.revenue > 0 ? ((period.paid / period.revenue) * 100).toFixed(1) : "0.0"}%</TableCell>
                    <TableCell data-testid={`text-summary-signups-${period.sortKey}`}>{period.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {clubRevenueData.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Revenue by Club
          </h2>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {clubRevenueData.map(club => (
              <Card key={club.clubId} className="hover-elevate cursor-pointer min-w-0" onClick={() => setRevenueClubDialog({ clubId: club.clubId, clubName: club.clubName })} data-testid={`card-club-revenue-${club.clubId}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                  <CardTitle className="text-[10px] sm:text-xs font-medium" data-testid={`text-club-name-${club.clubId}`}>{club.clubName}</CardTitle>
                  <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-sm sm:text-xl font-bold" data-testid={`text-club-total-revenue-${club.clubId}`}>{"\u00A3"}{formatPounds(club.totalRevenue)}</div>
                  <div className="flex items-center justify-between gap-1 mt-1 text-[9px] sm:text-[11px] text-muted-foreground flex-wrap">
                    <span className="text-green-600" data-testid={`text-club-paid-${club.clubId}`}>{"\u00A3"}{formatPounds(club.totalPaid)} paid</span>
                    <span data-testid={`text-club-members-${club.clubId}`}>{club.memberCount} members</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {viewMode === "session" ? null : viewMode === "player" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name or email..."
                value={playerSearchQuery}
                onChange={(e) => setPlayerSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-player-search"
              />
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              {Object.keys(playerGroups).length} player(s)
            </Badge>
          </div>
          {Object.keys(playerGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-players">
                No player data found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            Object.entries(playerGroups).map(([key, entries]) => {
              const first = entries[0];
              const playerPaid = entries.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
              const playerUnpaid = entries.filter((e) => e.paymentStatus === "UNPAID").reduce((s, e) => s + (e.fee || 0), 0);
              const playerTotal = playerPaid + playerUnpaid;
              const isExpanded = expandedPlayers.has(key);

              return (
                <Card key={key} data-testid={`card-player-${first.playerUserId}`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => togglePlayerExpand(key)}
                    data-testid={`button-expand-player-${first.playerUserId}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base" data-testid={`text-player-title-${first.playerUserId}`}>
                            {first.playerName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {first.playerEmail}{" "}/{" "}{entries.length} sessions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`text-player-total-${first.playerUserId}`}>
                          Total: £{formatPounds(playerTotal)}
                        </span>
                        <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                          Paid: £{formatPounds(playerPaid)}
                        </Badge>
                        {playerUnpaid > 0 && (
                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                            Unpaid: £{formatPounds(playerUnpaid)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Session</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Club</TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Credit Bal.</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => (
                              <TableRow key={entry.signupId} data-testid={`row-player-session-${entry.signupId}`}>
                                <TableCell className="font-medium" data-testid={`text-session-name-${entry.signupId}`}>
                                  {entry.sessionTitle}
                                </TableCell>
                                <TableCell data-testid={`text-session-date-${entry.signupId}`}>
                                  {entry.sessionDate ? format(new Date(entry.sessionDate), "MMM d, yyyy") : "N/A"}
                                </TableCell>
                                <TableCell data-testid={`text-club-name-${entry.signupId}`}>
                                  {entry.clubName}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium" data-testid={`text-fee-player-${entry.signupId}`}>
                                      £{formatPounds(entry.fee || 0)}
                                    </span>
                                    {entry.membershipStatus === "ACTIVE" && entry.membershipSessionFee != null && entry.fee !== entry.membershipSessionFee && (
                                      <span className="text-[10px] text-amber-500" data-testid={`text-member-rate-mismatch-player-${entry.signupId}`}>
                                        Member rate: £{formatPounds(entry.membershipSessionFee)} ({entry.membershipPlanName})
                                      </span>
                                    )}
                                    {entry.membershipStatus === "ACTIVE" && entry.membershipSessionFee != null && entry.fee === entry.membershipSessionFee && (
                                      <span className="text-[10px] text-emerald-500" data-testid={`text-member-rate-match-player-${entry.signupId}`}>
                                        {entry.membershipPlanName} rate
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const bal = getCreditBalance(entry.playerUserId, entry.clubId);
                                    return bal > 0 ? (
                                      <span className="font-semibold text-green-400" data-testid={`text-credit-bal-player-${entry.signupId}`}>
                                        {"\u00A3"}{formatPounds(bal)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground text-sm" data-testid={`text-credit-bal-player-${entry.signupId}`}>-</span>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {entry.paymentStatus === "PAID" ? (
                                      <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-player-${entry.signupId}`}>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        PAID
                                      </Badge>
                                    ) : entry.paymentStatus === "PENDING" ? (
                                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-payment-player-${entry.signupId}`}>
                                        <Clock className="h-3 w-3 mr-1" />
                                        PENDING
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-player-${entry.signupId}`}>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        UNPAID
                                      </Badge>
                                    )}
                                    {entry.paymentMethod && entry.paymentMethod !== "NONE" && (
                                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid={`badge-method-player-${entry.signupId}`}>
                                        {entry.paymentMethod === "CARD" ? "Card" : entry.paymentMethod === "MEMBERSHIP_CREDIT" ? "Credit" : "Bank Transfer"}
                                      </Badge>
                                    )}
                                    {(entry.creditApplied && entry.creditApplied > 0) ? (
                                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700" data-testid={`badge-credit-applied-player-${entry.signupId}`}>
                                        <CreditCard className="h-3 w-3 mr-1" />Credit: {"\u00A3"}{formatPounds(entry.creditApplied)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTogglePayment(entry)}
                                    disabled={updatePayment.isPending}
                                    data-testid={`button-toggle-payment-player-${entry.signupId}`}
                                  >
                                    {entry.paymentStatus === "PAID" ? "Mark Unpaid" : "Mark Paid"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : viewMode === "credits" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={creditSubTab === "history" ? "default" : "outline"} onClick={() => setCreditSubTab("history")} data-testid="button-credit-tab-history">
              <History className="h-3.5 w-3.5 mr-1" /> Transaction History
            </Button>
            <Button size="sm" variant={creditSubTab === "pending" ? "default" : "outline"} onClick={() => setCreditSubTab("pending")} className="relative" data-testid="button-credit-tab-pending">
              <Clock className="h-3.5 w-3.5 mr-1" /> Pending Requests
              {(pendingCreditRequests.length + pendingRewards.length) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">{pendingCreditRequests.length + pendingRewards.length}</span>
              )}
            </Button>
            <Button size="sm" variant={creditSubTab === "analytics" ? "default" : "outline"} onClick={() => setCreditSubTab("analytics")} data-testid="button-credit-tab-analytics">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Analytics
            </Button>
          </div>

          {creditSubTab === "pending" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {pendingCreditRequests.length} credit request{pendingCreditRequests.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    {pendingRewards.length} reward{pendingRewards.length !== 1 ? "s" : ""} awaiting approval
                  </span>
                </div>
              </div>

              {(pendingCreditLoading || pendingRewardsLoading) ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading pending requests...</p>
                  </CardContent>
                </Card>
              ) : (pendingCreditRequests.length === 0 && pendingRewards.length === 0) ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-pending-credits">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    No pending requests. All caught up!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingRewards.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Gift className="h-4 w-4 text-amber-500" />
                        Pending Reward Approvals
                      </h4>
                      {pendingRewards.map((pr) => (
                        <Card key={`reward-${pr.id}`} className="border-amber-200 dark:border-amber-800" data-testid={`card-pending-reward-${pr.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-semibold text-sm">{pr.playerName}</span>
                                  <Badge variant="outline" className="text-amber-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Award className="h-3 w-3 mr-1" /> {pr.rewardType?.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge variant="outline" className="text-purple-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Clock className="h-3 w-3 mr-1" /> Requested
                                  </Badge>
                                </div>
                                <p className="text-sm mt-1">{pr.description}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                  {pr.credits > 0 && (
                                    <span className="font-medium text-amber-600">
                                      Value: {"\u00A3"}{formatPounds(pr.credits)}
                                    </span>
                                  )}
                                  {pr.freeSessions > 0 && (
                                    <span className="font-medium text-blue-600">
                                      {pr.freeSessions} free session{pr.freeSessions !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {pr.gifts && (
                                    <span className="font-medium text-green-600">
                                      <Gift className="h-3 w-3 inline mr-1" />{pr.gifts}
                                    </span>
                                  )}
                                  <span>{pr.clubName}</span>
                                  <span>Requested: {pr.updatedAt ? format(new Date(pr.updatedAt), "MMM d, yyyy HH:mm") : "N/A"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => approveRewardMutation.mutate({ rewardId: pr.id, action: "approve" })}
                                  disabled={approveRewardMutation.isPending}
                                  data-testid={`button-approve-reward-${pr.id}`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {pendingCreditRequests.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        Pending Credit Requests
                      </h4>
                      {pendingCreditRequests.map((req) => (
                        <Card key={req.id} data-testid={`card-pending-credit-${req.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-semibold text-sm" data-testid={`text-pending-player-${req.id}`}>{req.playerName}</span>
                                  <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">{req.ticketNumber}</Badge>
                                  <Badge variant="outline" className="text-amber-600 text-xs no-default-hover-elevate no-default-active-elevate">
                                    <Clock className="h-3 w-3 mr-1" /> Pending
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{req.playerEmail}</p>
                                <p className="text-sm mt-1 font-medium" data-testid={`text-pending-subject-${req.id}`}>{req.subject}</p>
                                {req.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[500px] line-clamp-2">{req.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                                  {req.creditAmount && req.creditAmount > 0 && (
                                    <span className="font-medium text-blue-600" data-testid={`text-pending-amount-${req.id}`}>
                                      Requested: {"\u00A3"}{formatPounds(req.creditAmount)}
                                    </span>
                                  )}
                                  <span>{req.clubName}</span>
                                  {req.sessionTitle && <span>Session: {req.sessionTitle}</span>}
                                  {req.sessionDate && <span>{format(new Date(req.sessionDate), "MMM d, yyyy")}</span>}
                                  <span>Submitted: {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy HH:mm") : "N/A"}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    setApproveDialog({
                                      ticketId: req.id,
                                      playerName: req.playerName,
                                      amount: req.creditAmount || 0,
                                      subject: req.subject,
                                      description: req.description,
                                    });
                                    setApproveAmount(req.creditAmount ? (req.creditAmount / 100).toFixed(2) : "");
                                    setApproveReason("");
                                  }}
                                  data-testid={`button-approve-credit-${req.id}`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => {
                                    setDeclineDialog({
                                      ticketId: req.id,
                                      playerName: req.playerName,
                                      subject: req.subject,
                                    });
                                    setDeclineReason("");
                                  }}
                                  data-testid={`button-decline-credit-${req.id}`}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Decline
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {creditSubTab === "analytics" && (
            <div className="space-y-4">
              {!creditAnalytics ? (
                creditLoading ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading analytics...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-credit-analytics">
                      No credit data available for analytics.
                    </CardContent>
                  </Card>
                )
              ) : (
                <>
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                    <Card className="min-w-0" data-testid="card-analytics-total-issued">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Issued</CardTitle>
                        <TrendingUp className="h-3 w-3 shrink-0 text-green-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-green-600">{"\u00A3"}{formatPounds(creditAnalytics.totalAdded)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.addedCount} transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0" data-testid="card-analytics-total-redeemed">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Redeemed</CardTitle>
                        <TrendingDown className="h-3 w-3 shrink-0 text-orange-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-orange-600">{"\u00A3"}{formatPounds(creditAnalytics.totalUsed)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.usedCount} transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0" data-testid="card-analytics-outstanding">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
                        <CreditCard className="h-3 w-3 shrink-0 text-blue-500" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold text-blue-600">{"\u00A3"}{formatPounds(creditAnalytics.netOutstanding)}</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">{creditAnalytics.uniquePlayers} player(s)</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0" data-testid="card-analytics-redemption-rate">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 pb-1 space-y-0 px-3 pt-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">Redemption Rate</CardTitle>
                        <Percent className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="text-sm sm:text-xl font-bold">{creditAnalytics.redemptionRate}%</div>
                        <p className="text-[9px] sm:text-[11px] text-muted-foreground mt-0.5">Redeemed vs issued</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="min-w-0" data-testid="card-analytics-avg">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Credit Issued</p>
                            <p className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(creditAnalytics.avgCreditIssued)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Credit Redeemed</p>
                            <p className="text-lg font-bold text-orange-600">{"\u00A3"}{formatPounds(creditAnalytics.avgCreditUsed)}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Total Transactions</p>
                          <p className="text-lg font-bold">{creditAnalytics.totalTransactions}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {creditAnalytics.topHolders.length > 0 && (
                      <Card className="min-w-0" data-testid="card-analytics-top-holders">
                        <CardHeader className="px-3 pt-3 pb-2">
                          <CardTitle className="text-sm font-medium">Top Credit Holders</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          <div className="space-y-1.5">
                            {creditAnalytics.topHolders.map((p, i) => (
                              <div key={p.userId} className="flex items-center justify-between text-sm" data-testid={`row-top-holder-${p.userId}`}>
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                                  <span className="truncate max-w-[180px]">{p.name}</span>
                                </span>
                                <span className="font-medium text-blue-600">{"\u00A3"}{formatPounds(p.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {creditAnalytics.recentMonths.length > 0 && (
                    <Card className="min-w-0" data-testid="card-analytics-monthly">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Issued</TableHead>
                                <TableHead>Redeemed</TableHead>
                                <TableHead>Net</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {creditAnalytics.recentMonths.map((m) => (
                                <TableRow key={m.month} data-testid={`row-month-${m.month}`}>
                                  <TableCell className="font-medium">{format(new Date(m.month + "-01"), "MMM yyyy")}</TableCell>
                                  <TableCell className="text-green-600">{"\u00A3"}{formatPounds(m.added)}</TableCell>
                                  <TableCell className="text-orange-600">{"\u00A3"}{formatPounds(m.used)}</TableCell>
                                  <TableCell className={m.added - m.used > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}>{"\u00A3"}{formatPounds(m.added - m.used)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {creditAnalytics.topReasons.length > 0 && (
                    <Card className="min-w-0" data-testid="card-analytics-reasons">
                      <CardHeader className="px-3 pt-3 pb-2">
                        <CardTitle className="text-sm font-medium">Top Credit Reasons</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="space-y-1.5">
                          {creditAnalytics.topReasons.map(([reason, count]) => (
                            <div key={reason} className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[300px] text-muted-foreground">{reason}</span>
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {creditSubTab === "history" && (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by player name or email..."
                    value={creditSearchQuery}
                    onChange={(e) => setCreditSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-credit-search"
                  />
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                  {Object.keys(creditPlayerGroups).length} player(s)
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                  {creditHistory.length} transaction(s)
                </Badge>
              </div>

              {creditLoading ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Loading credit history...</p>
                  </CardContent>
                </Card>
              ) : Object.keys(creditPlayerGroups).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-credits">
                    No credit history found.
                  </CardContent>
                </Card>
              ) : (
                Object.entries(creditPlayerGroups).map(([key, group]) => {
                  const isExpanded = expandedCreditPlayers.has(key);
                  return (
                    <Card key={key} data-testid={`card-credit-player-${key}`}>
                      <CardHeader
                        className="cursor-pointer"
                        onClick={() => {
                          setExpandedCreditPlayers((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        }}
                        data-testid={`button-expand-credit-${key}`}
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-base" data-testid={`text-credit-player-name-${key}`}>
                                {group.playerName}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">{group.playerEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-added-${key}`}>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Added: {"\u00A3"}{formatPounds(group.totalAdded)}
                            </Badge>
                            <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-used-${key}`}>
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Used: {"\u00A3"}{formatPounds(group.totalUsed)}
                            </Badge>
                            <Badge variant={group.balance > 0 ? "default" : "secondary"} className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-balance-${key}`}>
                              <CreditCard className="h-3 w-3 mr-1" />
                              Balance: {"\u00A3"}{formatPounds(group.balance)}
                            </Badge>
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                              {group.entries.length} txn(s)
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Reason</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Session</TableHead>
                                  <TableHead>Club</TableHead>
                                  <TableHead>By</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.entries.map((entry) => (
                                  <TableRow key={entry.id} data-testid={`row-credit-${entry.id}`}>
                                    <TableCell className="whitespace-nowrap text-sm">
                                      {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        {entry.amount > 0 ? (
                                          <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate w-fit">
                                            <Plus className="h-3 w-3 mr-1" /> Added
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate w-fit">
                                            <TrendingDown className="h-3 w-3 mr-1" /> Used
                                          </Badge>
                                        )}
                                        {entry.source === "reward_ledger" && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate w-fit">Reward</Badge>
                                        )}
                                        {entry.source === "card_credit" && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate w-fit">Card</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`font-medium ${entry.amount > 0 ? "text-green-600" : "text-orange-600"}`}>
                                      {entry.amount > 0 ? "+" : "-"}{"\u00A3"}{formatPounds(Math.abs(entry.amount))}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={entry.reason}>
                                      {entry.reason}
                                    </TableCell>
                                    <TableCell>
                                      {entry.amount > 0 ? (
                                        group.balance <= 0 ? (
                                          <Badge variant="outline" className="text-blue-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-status-${entry.id}`}>
                                            <CheckCircle className="h-3 w-3 mr-1" /> Claimed
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-amber-600 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-status-${entry.id}`}>
                                            <Clock className="h-3 w-3 mr-1" /> Unclaimed
                                          </Badge>
                                        )
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate no-default-active-elevate" data-testid={`badge-credit-status-${entry.id}`}>
                                          <CheckCircle className="h-3 w-3 mr-1" /> Applied
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {entry.sessionTitle || "-"}
                                      {entry.sessionDate && (
                                        <span className="block text-xs">{format(new Date(entry.sessionDate), "MMM d, yyyy")}</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{entry.clubName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{entry.createdByName}</TableCell>
                                    <TableCell>
                                      {(!entry.source || entry.source === "credit_ledger") ? (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditCreditDialog({
                                                id: entry.id,
                                                amount: entry.amount,
                                                reason: entry.reason,
                                                linkedSignupId: entry.linkedSignupId,
                                                sessionFee: entry.sessionFee,
                                                playerName: group.playerName,
                                              });
                                              setEditCreditAmount((Math.abs(entry.amount) / 100).toFixed(2));
                                              setEditCreditReason(entry.reason);
                                            }}
                                            data-testid={`button-edit-credit-${entry.id}`}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => setDeleteCreditDialog({
                                              id: entry.id,
                                              amount: entry.amount,
                                              playerName: group.playerName,
                                              reason: entry.reason,
                                            })}
                                            data-testid={`button-delete-credit-${entry.id}`}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      ) : viewMode === "manage-credits" ? (
        <div className="space-y-4">
          <Card data-testid="card-manage-credits">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5" />
                Manage Player Credits & Debits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search Player</Label>
                {mcSelectedPlayer ? (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium" data-testid="text-mc-selected-player">{mcSelectedPlayer.fullName}</p>
                      <p className="text-sm text-muted-foreground">{mcSelectedPlayer.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMcSelectedPlayer(null);
                        setMcSelectedClubId("");
                        setMcPlayerSearch("");
                        setMcAmount("");
                        setMcReason("");
                        setMcFixBalance("");
                      }}
                      data-testid="button-mc-clear-player"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Type player name or email (min 2 characters)..."
                      value={mcPlayerSearch}
                      onChange={(e) => setMcPlayerSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-mc-player-search"
                    />
                    {mcSearchResults.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {mcSearchResults.map((player) => (
                          <button
                            key={player.id}
                            className="w-full text-left px-4 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                            onClick={() => {
                              setMcSelectedPlayer(player);
                              setMcPlayerSearch("");
                              setMcSelectedClubId("");
                            }}
                            data-testid={`button-mc-select-player-${player.id}`}
                          >
                            <p className="font-medium text-sm">{player.fullName}</p>
                            <p className="text-xs text-muted-foreground">{player.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {mcSelectedPlayer && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Select Club</Label>
                    {mcClubsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading clubs...
                      </div>
                    ) : mcPlayerClubs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">This player is not a member of any clubs you manage.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {mcPlayerClubs.map((club) => (
                          <button
                            key={club.clubId}
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              mcSelectedClubId === String(club.clubId)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setMcSelectedClubId(String(club.clubId))}
                            data-testid={`button-mc-select-club-${club.clubId}`}
                          >
                            <p className="font-medium text-sm flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {club.clubName}
                            </p>
                            <p className={`text-sm mt-1 font-medium ${club.balance > 0 ? "text-green-600" : club.balance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              Balance: £{formatPounds(Math.abs(club.balance))} {club.balance < 0 ? "(owed)" : ""}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {mcSelectedClubId && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <button
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            mcActionType === "credit" ? "border-green-500 bg-green-500/10" : "border-border hover:border-green-500/50"
                          }`}
                          onClick={() => setMcActionType("credit")}
                          data-testid="button-mc-type-credit"
                        >
                          <Plus className={`h-5 w-5 mx-auto mb-1 ${mcActionType === "credit" ? "text-green-600" : "text-muted-foreground"}`} />
                          <p className="font-medium text-sm">Add Credit</p>
                          <p className="text-xs text-muted-foreground">Add funds to balance</p>
                        </button>
                        <button
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            mcActionType === "debit" ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-orange-500/50"
                          }`}
                          onClick={() => setMcActionType("debit")}
                          data-testid="button-mc-type-debit"
                        >
                          <TrendingDown className={`h-5 w-5 mx-auto mb-1 ${mcActionType === "debit" ? "text-orange-600" : "text-muted-foreground"}`} />
                          <p className="font-medium text-sm">Add Debit</p>
                          <p className="text-xs text-muted-foreground">Deduct from balance</p>
                        </button>
                        <button
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            mcActionType === "fix" ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
                          }`}
                          onClick={() => setMcActionType("fix")}
                          data-testid="button-mc-type-fix"
                        >
                          <Pencil className={`h-5 w-5 mx-auto mb-1 ${mcActionType === "fix" ? "text-blue-600" : "text-muted-foreground"}`} />
                          <p className="font-medium text-sm">Fix Credit</p>
                          <p className="text-xs text-muted-foreground">Set balance to exact amount</p>
                        </button>
                      </div>

                      {mcActionType === "fix" ? (
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">
                              Current Balance: <span className={mcSelectedClub && mcSelectedClub.balance >= 0 ? "text-green-600" : "text-red-600"}>
                                £{formatPounds(Math.abs(mcSelectedClub?.balance || 0))}{(mcSelectedClub?.balance || 0) < 0 ? " (owed)" : ""}
                              </span>
                            </Label>
                          </div>
                          <div>
                            <Label htmlFor="mc-fix-balance" className="text-sm font-medium">New Balance (£)</Label>
                            <Input
                              id="mc-fix-balance"
                              type="number"
                              step="0.01"
                              min="0"
                              value={mcFixBalance}
                              onChange={(e) => setMcFixBalance(e.target.value)}
                              placeholder="e.g. 10.00"
                              data-testid="input-mc-fix-balance"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mc-fix-reason" className="text-sm font-medium">Reason</Label>
                            <Input
                              id="mc-fix-reason"
                              value={mcReason}
                              onChange={(e) => setMcReason(e.target.value)}
                              placeholder="e.g. Balance correction"
                              data-testid="input-mc-fix-reason"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              const targetPence = Math.round(parseFloat(mcFixBalance) * 100);
                              if (isNaN(targetPence) || targetPence < 0) {
                                toast({ title: "Invalid Amount", description: "Please enter a valid balance amount.", variant: "destructive" });
                                return;
                              }
                              if (!mcReason.trim()) {
                                toast({ title: "Reason Required", description: "Please enter a reason.", variant: "destructive" });
                                return;
                              }
                              const currentBalance = mcSelectedClub?.balance || 0;
                              const diff = targetPence - currentBalance;
                              if (diff === 0) {
                                toast({ title: "No Change", description: "The new balance is the same as the current balance." });
                                return;
                              }
                              createCredit.mutate(
                                {
                                  userId: mcSelectedPlayer.id,
                                  clubId: Number(mcSelectedClubId),
                                  amount: diff,
                                  reason: `Balance fix: ${mcReason.trim()} (${diff > 0 ? "+" : ""}£${(diff / 100).toFixed(2)})`,
                                },
                                {
                                  onSuccess: () => {
                                    toast({ title: "Balance Fixed", description: `${mcSelectedPlayer.fullName}'s balance set to £${(targetPence / 100).toFixed(2)}.` });
                                    setMcFixBalance("");
                                    setMcReason("");
                                    qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).includes("credit") });
                                    qc.invalidateQueries({ queryKey: ["/api/admin/player-credits", mcSelectedPlayer.id] });
                                  },
                                  onError: (err: any) => {
                                    toast({ title: "Error", description: err.message || "Failed to fix balance.", variant: "destructive" });
                                  },
                                }
                              );
                            }}
                            disabled={createCredit.isPending}
                            className="w-full sm:w-auto"
                            data-testid="button-mc-submit-fix"
                          >
                            {createCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Fix Balance
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="mc-amount" className="text-sm font-medium">Amount (£)</Label>
                            <Input
                              id="mc-amount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={mcAmount}
                              onChange={(e) => setMcAmount(e.target.value)}
                              placeholder="e.g. 5.00"
                              data-testid="input-mc-amount"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mc-reason" className="text-sm font-medium">Reason</Label>
                            <Input
                              id="mc-reason"
                              value={mcReason}
                              onChange={(e) => setMcReason(e.target.value)}
                              placeholder={mcActionType === "credit" ? "e.g. Session refund, Reward bonus" : "e.g. Equipment purchase, Session charge"}
                              data-testid="input-mc-reason"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              const pence = Math.round(parseFloat(mcAmount) * 100);
                              if (isNaN(pence) || pence <= 0) {
                                toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
                                return;
                              }
                              if (!mcReason.trim()) {
                                toast({ title: "Reason Required", description: "Please enter a reason.", variant: "destructive" });
                                return;
                              }
                              const signedAmount = mcActionType === "debit" ? -pence : pence;
                              createCredit.mutate(
                                {
                                  userId: mcSelectedPlayer.id,
                                  clubId: Number(mcSelectedClubId),
                                  amount: signedAmount,
                                  reason: mcReason.trim(),
                                },
                                {
                                  onSuccess: () => {
                                    toast({
                                      title: mcActionType === "credit" ? "Credit Added" : "Debit Added",
                                      description: `${mcActionType === "credit" ? "Added" : "Deducted"} £${(pence / 100).toFixed(2)} ${mcActionType === "credit" ? "to" : "from"} ${mcSelectedPlayer.fullName}'s balance.`,
                                    });
                                    setMcAmount("");
                                    setMcReason("");
                                    qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).includes("credit") });
                                    qc.invalidateQueries({ queryKey: ["/api/admin/player-credits", mcSelectedPlayer.id] });
                                  },
                                  onError: (err: any) => {
                                    toast({ title: "Error", description: err.message || "Failed to process.", variant: "destructive" });
                                  },
                                }
                              );
                            }}
                            disabled={createCredit.isPending}
                            className={`w-full sm:w-auto ${mcActionType === "debit" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                            data-testid="button-mc-submit"
                          >
                            {createCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            {mcActionType === "credit" ? "Add Credit" : "Add Debit"}
                          </Button>
                        </div>
                      )}

                      {mcPlayerHistory.length > 0 && (
                        <div className="border-t pt-4">
                          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Recent Transactions ({mcPlayerHistory.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Reason</TableHead>
                                  <TableHead>By</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mcPlayerHistory.slice(0, 20).map((entry) => (
                                  <TableRow key={entry.id} data-testid={`row-mc-history-${entry.id}`}>
                                    <TableCell className="whitespace-nowrap text-sm">
                                      {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                      {entry.amount > 0 ? (
                                        <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                                          <Plus className="h-3 w-3 mr-1" /> Credit
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                                          <TrendingDown className="h-3 w-3 mr-1" /> Debit
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className={`font-medium ${entry.amount > 0 ? "text-green-600" : "text-orange-600"}`}>
                                      {entry.amount > 0 ? "+" : "-"}£{formatPounds(Math.abs(entry.amount))}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate" title={entry.reason}>
                                      {entry.reason}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{entry.createdByName}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : viewMode === "donations" ? (
        <DonationsPanel />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Membership Payments
          </h2>

          {!dashboardData ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading membership data...</p>
              </CardContent>
            </Card>
          ) : !dashboardData.membershipMembers || dashboardData.membershipMembers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-memberships">
                No memberships found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Alert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.membershipMembers
                    .sort((a, b) => {
                      if (a.isOverdue && !b.isOverdue) return -1;
                      if (!a.isOverdue && b.isOverdue) return 1;
                      if (a.paymentStatus === "UNPAID" && b.paymentStatus !== "UNPAID") return -1;
                      if (a.paymentStatus !== "UNPAID" && b.paymentStatus === "UNPAID") return 1;
                      return (a.fullName || "").localeCompare(b.fullName || "");
                    })
                    .map((member) => {
                      const dueDate = member.endDate ? new Date(member.endDate) : null;
                      const now = new Date();
                      const isOverdue = member.paymentStatus === "UNPAID" && dueDate && dueDate < now;
                      const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <TableRow
                          key={member.id}
                          className={isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}
                          data-testid={`row-membership-${member.id}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`text-membership-name-${member.id}`}>{member.fullName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-membership-plan-${member.id}`}>
                            {member.planName || "N/A"}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-membership-fee-${member.id}`}>
                            {"\u00A3"}{formatPounds(member.planPrice)}
                          </TableCell>
                          <TableCell>
                            {member.status === "ACTIVE" ? (
                              <Badge variant="default" className="bg-green-500 no-default-hover-elevate" data-testid={`badge-membership-status-${member.id}`}>Active</Badge>
                            ) : member.status === "PENDING" ? (
                              <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-membership-status-${member.id}`}>Pending</Badge>
                            ) : member.status === "EXPIRED" ? (
                              <Badge variant="outline" className="text-muted-foreground no-default-hover-elevate" data-testid={`badge-membership-status-${member.id}`}>Expired</Badge>
                            ) : (
                              <Badge variant="destructive" className="no-default-hover-elevate" data-testid={`badge-membership-status-${member.id}`}>{member.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {member.paymentStatus === "PAID" ? (
                              <Badge variant="default" className="no-default-hover-elevate" data-testid={`badge-membership-payment-${member.id}`}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="no-default-hover-elevate" data-testid={`badge-membership-payment-${member.id}`}>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unpaid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-membership-start-${member.id}`}>
                            {member.startDate ? format(new Date(member.startDate), "dd MMM yyyy") : "N/A"}
                          </TableCell>
                          <TableCell data-testid={`text-membership-due-${member.id}`}>
                            <div>
                              <span className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : daysUntilDue !== null && daysUntilDue <= 30 ? "text-amber-600 font-medium" : ""}`}>
                                {dueDate ? format(dueDate, "dd MMM yyyy") : "N/A"}
                              </span>
                              {daysUntilDue !== null && (
                                <span className={`block text-xs ${daysUntilDue <= 0 ? "text-red-600" : daysUntilDue <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                                  {daysUntilDue <= 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isOverdue && (
                              <div className="flex items-center gap-1 text-red-600" data-testid={`alert-membership-overdue-${member.id}`}>
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs font-semibold">OVERDUE</span>
                              </div>
                            )}
                            {!isOverdue && member.paymentStatus === "UNPAID" && daysUntilDue !== null && daysUntilDue <= 30 && (
                              <div className="flex items-center gap-1 text-amber-600" data-testid={`alert-membership-due-soon-${member.id}`}>
                                <Clock className="h-4 w-4" />
                                <span className="text-xs font-medium">Due Soon</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {(dashboardView === "sessions" || (dashboardView === "classic" && viewMode === "session")) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border-b pb-2 flex-wrap" data-testid="tabs-session-time">
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                size="sm"
                variant={sessionTimeTab === "all" ? "default" : "outline"}
                onClick={() => { setSessionTimeTab("all"); setSelectedSessions(new Set()); }}
                data-testid="button-all-sessions"
              >
                <List className="h-4 w-4 mr-1" />
                All ({Object.keys(sessionGroups).length})
              </Button>
              <Button
                size="sm"
                variant={sessionTimeTab === "upcoming" ? "default" : "outline"}
                onClick={() => { setSessionTimeTab("upcoming"); setSelectedSessions(new Set()); }}
                data-testid="button-upcoming-sessions"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Upcoming ({Object.keys(upcomingSessionGroups).length})
              </Button>
              <Button
                size="sm"
                variant={sessionTimeTab === "outstanding" ? "default" : "outline"}
                onClick={() => { setSessionTimeTab("outstanding"); setSelectedSessions(new Set()); }}
                className={sessionTimeTab !== "outstanding" && Object.keys(outstandingSessionGroups).length > 0 ? "border-orange-300 text-orange-600" : ""}
                data-testid="button-outstanding-sessions"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Outstanding ({Object.keys(outstandingSessionGroups).length})
              </Button>
              <Button
                size="sm"
                variant={sessionTimeTab === "past" ? "default" : "outline"}
                onClick={() => { setSessionTimeTab("past"); setSelectedSessions(new Set()); }}
                data-testid="button-past-sessions"
              >
                <History className="h-4 w-4 mr-1" />
                Past ({Object.keys(pastSessionGroups).length})
              </Button>
              <Button
                size="sm"
                variant={sessionTimeTab === "missing-invoice" ? "default" : "outline"}
                onClick={() => { setSessionTimeTab("missing-invoice"); setSelectedSessions(new Set()); }}
                className={sessionTimeTab !== "missing-invoice" && Object.keys(missingInvoiceSessionGroups).length > 0 ? "border-red-300 text-red-600" : ""}
                data-testid="button-missing-invoice-sessions"
              >
                <FileText className="h-4 w-4 mr-1" />
                Missing Invoice ({Object.keys(missingInvoiceSessionGroups).length})
              </Button>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Select value={sessionSortOrder} onValueChange={(v) => setSessionSortOrder(v as "recent" | "oldest" | "az")}>
                <SelectTrigger className="w-[150px]" data-testid="select-session-sort">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="az">A - Z</SelectItem>
                </SelectContent>
              </Select>
              {activeSessionGroupsList.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allIds = activeSessionGroupsList.map(([id]) => Number(id));
                      if (selectedSessions.size === allIds.length) {
                        setSelectedSessions(new Set());
                      } else {
                        setSelectedSessions(new Set(allIds));
                      }
                    }}
                    data-testid="button-select-all-sessions"
                  >
                    {selectedSessions.size === activeSessionGroupsList.length && selectedSessions.size > 0 ? (
                      <CheckSquare className="h-4 w-4 mr-1" />
                    ) : (
                      <Square className="h-4 w-4 mr-1" />
                    )}
                    {selectedSessions.size > 0 ? `${selectedSessions.size} selected` : "Select All"}
                  </Button>
                  {selectedSessions.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setBulkDeleteDialog(true)}
                      data-testid="button-bulk-delete-sessions"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedSessions.size})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedEntries.size > 0 && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium" data-testid="text-selected-count">
                    {selectedEntries.size} entry{selectedEntries.size !== 1 ? "ies" : ""} selected
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => handleBulkConfirmation(true)}
                      disabled={bulkPaymentConfirmation.isPending}
                      data-testid="button-bulk-send-confirmation"
                    >
                      {bulkPaymentConfirmation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      Send Confirmations
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                      onClick={() => handleBulkReminder()}
                      disabled={bulkPaymentReminder.isPending}
                      data-testid="button-bulk-send-reminder"
                    >
                      {bulkPaymentReminder.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Bell className="h-3 w-3 mr-1" />}
                      Send Reminders
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedEntries(new Set())}
                      data-testid="button-clear-selection"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSessionGroupsList.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-sessions">
                No {sessionTimeTab === "all" ? "" : sessionTimeTab === "upcoming" ? "upcoming" : sessionTimeTab === "outstanding" ? "outstanding" : sessionTimeTab === "missing-invoice" ? "missing invoice" : "past"} sessions found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            activeSessionGroupsList.map(([sessionIdStr, entries]) => {
              const sessionId = Number(sessionIdStr);
              const first = entries[0];
              const sessionPaid = entries.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + (e.fee || 0), 0);
              const sessionUnpaid = entries.filter((e) => e.paymentStatus === "UNPAID").reduce((s, e) => s + (e.fee || 0), 0);
              const sessionTotal = sessionPaid + sessionUnpaid;
              const isExpanded = expandedSessions.has(sessionId);
              const sessionIsToday = first.sessionDate ? isToday(new Date(first.sessionDate)) : false;

              return (
                <Card key={sessionId} data-testid={`card-session-${sessionId}`}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSessionExpand(sessionId)}
                    data-testid={`button-expand-session-${sessionId}`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSessionSelect(sessionId);
                          }}
                          data-testid={`button-select-session-${sessionId}`}
                        >
                          {selectedSessions.has(sessionId) ? (
                            <CheckSquare className="h-5 w-5 text-primary" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base" data-testid={`text-session-title-${sessionId}`}>
                              {first.sessionTitle}
                            </CardTitle>
                            {first.sessionType && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-type-${sessionId}`}>
                                {first.sessionType}
                              </Badge>
                            )}
                            {first.matchMode && (
                              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-mode-${sessionId}`}>
                                {first.matchMode}
                              </Badge>
                            )}
                            {sessionIsToday && (
                              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-today-${sessionId}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Today
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {first.sessionDate ? format(new Date(first.sessionDate), "MMM d, yyyy") : "N/A"}
                            {" "}/{" "}{first.clubName}{" "}/{" "}{entries.length} players
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {invoiceEditSessionId === sessionId ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                <Input
                                  className="h-6 w-36 text-xs px-1.5"
                                  placeholder="Invoice number..."
                                  value={invoiceEditValue}
                                  onChange={(e) => setInvoiceEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateInvoiceNumber.mutate({ sessionId, invoiceNumber: invoiceEditValue });
                                    } else if (e.key === "Escape") {
                                      setInvoiceEditSessionId(null);
                                    }
                                  }}
                                  autoFocus
                                  data-testid={`input-invoice-${sessionId}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateInvoiceNumber.mutate({ sessionId, invoiceNumber: invoiceEditValue });
                                  }}
                                  disabled={updateInvoiceNumber.isPending}
                                  data-testid={`button-save-invoice-${sessionId}`}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={(e) => { e.stopPropagation(); setInvoiceEditSessionId(null); }}
                                  data-testid={`button-cancel-invoice-${sessionId}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInvoiceEditSessionId(sessionId);
                                  setInvoiceEditValue(first.invoiceNumber || "");
                                }}
                                data-testid={`button-edit-invoice-${sessionId}`}
                              >
                                <Hash className="h-3 w-3" />
                                {first.invoiceNumber ? (
                                  <span>Inv: {first.invoiceNumber}</span>
                                ) : (
                                  <span className="italic opacity-60">Add invoice no.</span>
                                )}
                                <Pencil className="h-2.5 w-2.5 opacity-50" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`text-session-total-${sessionId}`}>
                          Total: £{formatPounds(sessionTotal)}
                        </span>
                        <Badge variant="outline" className="text-green-600 no-default-hover-elevate no-default-active-elevate">
                          Paid: £{formatPounds(sessionPaid)}
                        </Badge>
                        {sessionUnpaid > 0 && (
                          <Badge variant="outline" className="text-orange-600 no-default-hover-elevate no-default-active-elevate">
                            Unpaid: £{formatPounds(sessionUnpaid)}
                          </Badge>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSessionDialog({ sessionId, sessionTitle: first.sessionTitle });
                          }}
                          data-testid={`button-delete-session-${sessionId}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 border rounded-md p-0.5" data-testid={`filter-payment-view-${sessionId}`}>
                            <Button size="sm" variant={sessionPaymentView === "all" ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setSessionPaymentView("all"); }} data-testid={`button-view-all-${sessionId}`}>
                              All
                            </Button>
                            <Button size="sm" variant={sessionPaymentView === "paid" ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setSessionPaymentView("paid"); }} data-testid={`button-view-paid-${sessionId}`}>
                              Paid
                            </Button>
                            <Button size="sm" variant={sessionPaymentView === "unpaid" ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setSessionPaymentView("unpaid"); }} data-testid={`button-view-unpaid-${sessionId}`}>
                              Unpaid
                            </Button>
                            <Button size="sm" variant={sessionPaymentView === "grouped" ? "default" : "ghost"} onClick={(e) => { e.stopPropagation(); setSessionPaymentView("grouped"); }} data-testid={`button-view-grouped-${sessionId}`}>
                              Group
                            </Button>
                          </div>
                          {bulkFeeSessionId === sessionId ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">£</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="e.g. 7.50"
                                  value={bulkFeeAmount}
                                  onChange={(e) => setBulkFeeAmount(e.target.value)}
                                  className="w-[100px]"
                                  data-testid={`input-bulk-fee-${sessionId}`}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                disabled={!bulkFeeAmount || parseFloat(bulkFeeAmount) < 0}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const pence = Math.round(parseFloat(bulkFeeAmount) * 100);
                                  if (isNaN(pence) || pence < 0) return;
                                  try {
                                    await apiRequest("PATCH", `/api/admin/sessions/${sessionId}/bulk-fee`, { fee: pence });
                                    toast({ title: "Fees Updated", description: `Applied £${parseFloat(bulkFeeAmount).toFixed(2)} to all ${entries.length} players.` });
                                    qc.invalidateQueries({ queryKey: [financialQueryUrl] });
                                    setBulkFeeSessionId(null);
                                    setBulkFeeAmount("");
                                  } catch (err: any) {
                                    toast({ title: "Error", description: err.message || "Failed to apply bulk fee", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-apply-bulk-fee-${sessionId}`}
                              >
                                Apply to All
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBulkFeeSessionId(null);
                                  setBulkFeeAmount("");
                                }}
                                data-testid={`button-cancel-bulk-fee-${sessionId}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBulkFeeSessionId(sessionId);
                                  setBulkFeeAmount("");
                                }}
                                data-testid={`button-set-standard-rate-${sessionId}`}
                              >
                                <PoundSterling className="h-3 w-3 mr-1" />
                                Set Standard Rate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const updates: Promise<any>[] = [];
                                  for (const entry of entries) {
                                    const targetFee = entry.membershipStatus === "ACTIVE" && entry.membershipSessionFee != null
                                      ? entry.membershipSessionFee
                                      : (entry.sessionFee ?? entry.clubSessionFee ?? 0);
                                    if (entry.fee !== targetFee) {
                                      updates.push(apiRequest("PATCH", `/api/admin/signups/${entry.signupId}/fee`, { fee: targetFee }));
                                    }
                                  }
                                  if (updates.length === 0) {
                                    toast({ title: "No Changes", description: "All fees already match membership rates." });
                                    return;
                                  }
                                  try {
                                    await Promise.all(updates);
                                    toast({ title: "Fees Updated", description: `Applied membership-based rates to ${updates.length} player(s).` });
                                    qc.invalidateQueries({ queryKey: [financialQueryUrl] });
                                  } catch (err: any) {
                                    toast({ title: "Error", description: err.message || "Failed to apply rates", variant: "destructive" });
                                  }
                                }}
                                data-testid={`button-apply-member-rates-${sessionId}`}
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                Apply Member Rates
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddPlayerDialog({
                                sessionId,
                                clubId: first.clubId,
                                sessionTitle: first.sessionTitle,
                                sessionFee: first.sessionFee || 0,
                              });
                              setAddPlayerMode("existing");
                              setAddPlayerSearch("");
                              setAddPlayerSelectedId(null);
                              setNewPlayerName("");
                              setNewPlayerEmail("");
                              setNewPlayerGender("MALE");
                            }}
                            data-testid={`button-add-player-session-${sessionId}`}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add Player
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddCreditDialog({ sessionId, entries });
                              setCreditSelectedPlayers([]);
                              setCreditAmount("");
                              setCreditReason("");
                            }}
                            data-testid={`button-add-credit-session-${sessionId}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Credit
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8 px-2">
                                <input
                                  type="checkbox"
                                  checked={entries.every(e => selectedEntries.has(e.signupId))}
                                  onChange={() => {
                                    const allSelected = entries.every(e => selectedEntries.has(e.signupId));
                                    setSelectedEntries(prev => {
                                      const next = new Set(prev);
                                      entries.forEach(e => allSelected ? next.delete(e.signupId) : next.add(e.signupId));
                                      return next;
                                    });
                                  }}
                                  className="h-4 w-4 rounded cursor-pointer accent-primary"
                                  data-testid={`checkbox-select-all-${sessionId}`}
                                />
                              </TableHead>
                              <TableHead>
                                <button
                                  className="flex items-center gap-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSortPlayersAlpha((prev) => !prev);
                                  }}
                                  data-testid={`button-sort-players-${sessionId}`}
                                >
                                  Player
                                  <ArrowDownAZ className={`h-3 w-3 ${sortPlayersAlpha ? "text-foreground" : "text-muted-foreground"}`} />
                                </button>
                              </TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Credit Bal.</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Attendance</TableHead>
                              <TableHead>Notify</TableHead>
                              <TableHead>Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              let filtered = entries;
                              if (sessionPaymentView === "paid") {
                                filtered = entries.filter((e) => e.paymentStatus === "PAID");
                              } else if (sessionPaymentView === "unpaid") {
                                filtered = entries.filter((e) => e.paymentStatus === "UNPAID");
                              } else if (sessionPaymentView === "grouped") {
                                filtered = [...entries].sort((a, b) => {
                                  if (a.paymentStatus === b.paymentStatus) return 0;
                                  return a.paymentStatus === "UNPAID" ? -1 : 1;
                                });
                              }
                              if (sortPlayersAlpha) {
                                filtered = [...filtered].sort((a, b) => (a.playerName || "").localeCompare(b.playerName || ""));
                              }
                              if (filtered.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                      No {sessionPaymentView === "paid" ? "paid" : "unpaid"} players in this session.
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                              if (sessionPaymentView === "grouped" && !sortPlayersAlpha) {
                                const unpaidEntries = filtered.filter((e) => e.paymentStatus === "UNPAID");
                                const paidEntries = filtered.filter((e) => e.paymentStatus === "PAID");
                                return (
                                  <>
                                    {unpaidEntries.length > 0 && (
                                      <>
                                        <TableRow>
                                          <TableCell colSpan={7} className="font-semibold text-orange-600 bg-orange-500/5 py-1.5 text-xs">
                                            Unpaid ({unpaidEntries.length})
                                          </TableCell>
                                        </TableRow>
                                        {unpaidEntries.map((entry) => renderPlayerRow(entry))}
                                      </>
                                    )}
                                    {paidEntries.length > 0 && (
                                      <>
                                        <TableRow>
                                          <TableCell colSpan={7} className="font-semibold text-green-600 bg-green-500/5 py-1.5 text-xs">
                                            Paid ({paidEntries.length})
                                          </TableCell>
                                        </TableRow>
                                        {paidEntries.map((entry) => renderPlayerRow(entry))}
                                      </>
                                    )}
                                  </>
                                );
                              }
                              return filtered.map((entry) => renderPlayerRow(entry));
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      <Dialog open={!!attendanceModal} onOpenChange={(open) => { if (!open) setAttendanceModal(null); }}>
        <DialogContent data-testid="dialog-attendance-modal">
          <DialogHeader>
            <DialogTitle data-testid="text-attendance-modal-title">
              {attendanceModal ? `Update Attendance - ${ATTENDANCE_LABELS[attendanceModal.newStatus as AttendanceStatus]}` : ""}
            </DialogTitle>
            <DialogDescription>
              {attendanceModal ? `Player: ${attendanceModal.entry.playerName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {attendanceModal && (
            <div className="space-y-4">
              {["NO_SHOW", "JUSTIFIED_CANCELLATION", "SICKNESS", "EMERGENCY", "OTHER"].includes(attendanceModal.newStatus) && (
                <>
                  {attendanceModal.step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-policy-question">
                        Did the player meet the cancellation policy?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("yes")} data-testid="button-policy-yes">
                          Yes
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("no")} data-testid="button-policy-no">
                          No
                        </Button>
                      </div>
                    </div>
                  )}
                  {attendanceModal.step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-credit-question">
                        Convert session fee (£{formatPounds(attendanceModal.entry.fee)}) into credit for {attendanceModal.entry.playerName}?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("confirm")} data-testid="button-credit-confirm">
                          Confirm Credit
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-credit-cancel">
                          No Credit
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {attendanceModal.newStatus === "PARTIAL_ATTENDANCE" && (
                <>
                  {attendanceModal.step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-partial-question">
                        Did the player attend more than 50% of the session?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("yes")} data-testid="button-partial-yes">
                          Yes (no credit)
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("no")} data-testid="button-partial-no">
                          No (partial credit)
                        </Button>
                      </div>
                    </div>
                  )}
                  {attendanceModal.step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-partial-percent-label">
                        Select partial credit percentage:
                      </p>
                      <Select
                        value={String(attendanceModal.partialPercent || 30)}
                        onValueChange={(val) => setAttendanceModal({ ...attendanceModal, partialPercent: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="select-partial-percent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 30, 40, 50].map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p}% (£{formatPounds(Math.round((attendanceModal.entry.fee * p) / 100))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("confirm")} data-testid="button-partial-confirm">
                          Apply Partial Credit
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-partial-cancel">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {attendanceModal.newStatus === "LATE_ARRIVAL" && (
                <>
                  {attendanceModal.step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-late-question">
                        Did late arrival significantly affect participation?
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("yes")} data-testid="button-late-yes">
                          Yes (partial credit)
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("no")} data-testid="button-late-no">
                          No (no credit)
                        </Button>
                      </div>
                    </div>
                  )}
                  {attendanceModal.step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-late-percent-label">
                        Select partial credit percentage:
                      </p>
                      <Select
                        value={String(attendanceModal.partialPercent || 20)}
                        onValueChange={(val) => setAttendanceModal({ ...attendanceModal, partialPercent: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="select-late-percent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 30, 40, 50].map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p}% (£{formatPounds(Math.round((attendanceModal.entry.fee * p) / 100))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("confirm")} data-testid="button-late-confirm">
                          Apply Partial Credit
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-late-cancel">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {attendanceModal.newStatus === "SESSION_ABANDONED" && (
                <>
                  {attendanceModal.step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-abandoned-reason-label">
                        Why was the session abandoned?
                      </p>
                      <Select
                        value={attendanceModal.abandonedReason || ""}
                        onValueChange={(val) => setAttendanceModal({ ...attendanceModal, abandonedReason: val })}
                      >
                        <SelectTrigger data-testid="select-abandoned-reason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {ABANDONED_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => handleAttendanceModalAction("next")}
                          disabled={!attendanceModal.abandonedReason}
                          data-testid="button-abandoned-next"
                        >
                          Next
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-abandoned-cancel">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {attendanceModal.step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-completion-question">
                        How much of the session was completed?
                      </p>
                      <Select
                        value={attendanceModal.completionLevel || ""}
                        onValueChange={(val) => setAttendanceModal({ ...attendanceModal, completionLevel: val })}
                      >
                        <SelectTrigger data-testid="select-completion-level">
                          <SelectValue placeholder="Select completion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<50%">Less than 50% (full credit)</SelectItem>
                          <SelectItem value=">50%">More than 50% (partial credit)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => handleAttendanceModalAction("confirm")}
                          disabled={!attendanceModal.completionLevel}
                          data-testid="button-completion-confirm"
                        >
                          Confirm
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-completion-cancel">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {attendanceModal.step === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm" data-testid="text-abandoned-partial-label">
                        Select partial credit percentage (more than 50% completed):
                      </p>
                      <Select
                        value={String(attendanceModal.partialPercent || 30)}
                        onValueChange={(val) => setAttendanceModal({ ...attendanceModal, partialPercent: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="select-abandoned-partial-percent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 30, 40, 50].map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p}% (£{formatPounds(Math.round((attendanceModal.entry.fee * p) / 100))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleAttendanceModalAction("confirm")} data-testid="button-abandoned-partial-confirm">
                          Apply Partial Credit
                        </Button>
                        <Button variant="outline" onClick={() => handleAttendanceModalAction("cancel")} data-testid="button-abandoned-partial-cancel">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addCreditDialog} onOpenChange={(open) => { if (!open) setAddCreditDialog(null); }}>
        <DialogContent data-testid="dialog-add-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-add-credit-title">Add Manual Credit</DialogTitle>
            <DialogDescription>
              {addCreditDialog ? `Session: ${addCreditDialog.entries[0]?.sessionTitle || ""}` : ""}
            </DialogDescription>
          </DialogHeader>
          {addCreditDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Select Players</Label>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                  {addCreditDialog.entries.map((entry) => (
                    <label
                      key={entry.playerId}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`label-credit-player-${entry.playerId}`}
                    >
                      <input
                        type="checkbox"
                        checked={creditSelectedPlayers.includes(entry.playerId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreditSelectedPlayers([...creditSelectedPlayers, entry.playerId]);
                          } else {
                            setCreditSelectedPlayers(creditSelectedPlayers.filter((id) => id !== entry.playerId));
                          }
                        }}
                        data-testid={`checkbox-credit-player-${entry.playerId}`}
                      />
                      <span className="text-sm">{entry.playerName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="credit-amount" className="text-sm font-medium">Credit Amount (£)</Label>
                <Input
                  id="credit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-credit-amount"
                />
              </div>
              <div>
                <Label htmlFor="credit-reason" className="text-sm font-medium">Reason (required)</Label>
                <Textarea
                  id="credit-reason"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Enter reason for credit..."
                  data-testid="input-credit-reason"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddCreditDialog(null)} data-testid="button-cancel-add-credit">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCreditSubmit}
                  disabled={createCredit.isPending}
                  data-testid="button-submit-add-credit"
                >
                  {createCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Add Credit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!useCreditDialog} onOpenChange={(open) => { if (!open) setUseCreditDialog(null); }}>
        <DialogContent data-testid="dialog-use-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-use-credit-title">Use Credit</DialogTitle>
            <DialogDescription>
              {useCreditDialog ? `Player: ${useCreditDialog.entry.playerName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {useCreditDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Session Fee</Label>
                  <p className="text-lg font-bold" data-testid="text-use-credit-fee">
                    £{formatPounds(useCreditDialog.entry.fee)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Available Credit</Label>
                  <p className="text-lg font-bold text-green-600" data-testid="text-use-credit-balance">
                    £{formatPounds(useCreditDialog.balance)}
                  </p>
                </div>
              </div>

              {useCreditDialog.balance <= 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-credit-available">
                  No credit available for this player at this club.
                </p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="use-credit-amount" className="text-sm font-medium">Credit to Apply ({"\u00A3"})</Label>
                    <Input
                      id="use-credit-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(useCreditDialog.entry.fee > 0 ? Math.min(useCreditDialog.balance, useCreditDialog.entry.fee) : useCreditDialog.balance) / 100}
                      value={useCreditAmount}
                      onChange={(e) => setUseCreditAmount(e.target.value)}
                      data-testid="input-use-credit-amount"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining payable: £{formatPounds(Math.max(0, useCreditDialog.entry.fee - Math.round((parseFloat(useCreditAmount) || 0) * 100)))}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const maxApply = useCreditDialog.entry.fee > 0
                          ? Math.min(useCreditDialog.balance, useCreditDialog.entry.fee)
                          : useCreditDialog.balance;
                        setUseCreditAmount((maxApply / 100).toFixed(2));
                      }}
                      data-testid="button-use-full-credit"
                    >
                      Use Full Credit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const entryRef = useCreditDialog.entry;
                        setUseCreditDialog(null);
                        handleTogglePayment(entryRef);
                      }}
                      data-testid="button-mark-paid-no-credit"
                    >
                      Mark Paid (no credit)
                    </Button>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setUseCreditDialog(null)} data-testid="button-cancel-use-credit">
                  Cancel
                </Button>
                {useCreditDialog.balance > 0 && (
                  <Button
                    onClick={handleUseCreditSubmit}
                    disabled={useCredit.isPending}
                    data-testid="button-submit-use-credit"
                  >
                    {useCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Apply Credit
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveDialog} onOpenChange={(open) => { if (!open) setApproveDialog(null); }}>
        <DialogContent data-testid="dialog-approve-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-approve-credit-title">Approve Credit Request</DialogTitle>
            <DialogDescription>
              {approveDialog ? `Player: ${approveDialog.playerName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="font-medium">{approveDialog.subject}</p>
                {approveDialog.description && <p className="text-muted-foreground text-xs">{approveDialog.description}</p>}
              </div>
              <div className="space-y-2">
                <Label>Credit Amount (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  placeholder="e.g. 5.00"
                  data-testid="input-approve-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={approveReason}
                  onChange={(e) => setApproveReason(e.target.value)}
                  placeholder="Add a note about this approval..."
                  rows={2}
                  data-testid="input-approve-reason"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialog(null)} data-testid="button-approve-cancel">Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!approveAmount || parseFloat(approveAmount) <= 0 || approveCreditMutation.isPending}
                  onClick={() => {
                    approveCreditMutation.mutate({
                      ticketId: approveDialog.ticketId,
                      amount: Math.round(parseFloat(approveAmount) * 100),
                      reason: approveReason || "Admin Approved Credit",
                    });
                  }}
                  data-testid="button-approve-confirm"
                >
                  {approveCreditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve Credit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!declineDialog} onOpenChange={(open) => { if (!open) setDeclineDialog(null); }}>
        <DialogContent data-testid="dialog-decline-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-decline-credit-title">Decline Credit Request</DialogTitle>
            <DialogDescription>
              {declineDialog ? `Player: ${declineDialog.playerName} — ${declineDialog.subject}` : ""}
            </DialogDescription>
          </DialogHeader>
          {declineDialog && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why this request is being declined..."
                  rows={3}
                  data-testid="input-decline-reason"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeclineDialog(null)} data-testid="button-decline-cancel">Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={declineCreditMutation.isPending}
                  onClick={() => {
                    declineCreditMutation.mutate({
                      ticketId: declineDialog.ticketId,
                      reason: declineReason,
                    });
                  }}
                  data-testid="button-decline-confirm"
                >
                  {declineCreditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                  Decline Request
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCreditDialog} onOpenChange={(open) => { if (!open) setEditCreditDialog(null); }}>
        <DialogContent data-testid="dialog-edit-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-credit-title">Edit Credit Entry</DialogTitle>
            <DialogDescription>
              {editCreditDialog ? `Player: ${editCreditDialog.playerName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {editCreditDialog && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-credit-amount" className="text-sm font-medium">Amount ({"\u00A3"})</Label>
                <Input
                  id="edit-credit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCreditAmount}
                  onChange={(e) => setEditCreditAmount(e.target.value)}
                  data-testid="input-edit-credit-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {"\u00A3"}{formatPounds(Math.abs(editCreditDialog.amount))}
                </p>
              </div>
              {editCreditDialog.linkedSignupId && editCreditDialog.sessionFee && editCreditDialog.amount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const fee = editCreditDialog.sessionFee!;
                    setEditCreditAmount((fee / 100).toFixed(2));
                    setEditCreditReason(editCreditReason.replace(/£[\d.]+/, `£${(fee / 100).toFixed(2)}`) || `Updated to current session fee: £${(fee / 100).toFixed(2)}`);
                  }}
                  data-testid="button-update-to-session-fee"
                >
                  <PoundSterling className="h-3 w-3 mr-1" />
                  Update to Session Fee ({"\u00A3"}{formatPounds(editCreditDialog.sessionFee)})
                </Button>
              )}
              <div>
                <Label htmlFor="edit-credit-reason" className="text-sm font-medium">Reason</Label>
                <Textarea
                  id="edit-credit-reason"
                  value={editCreditReason}
                  onChange={(e) => setEditCreditReason(e.target.value)}
                  rows={2}
                  data-testid="input-edit-credit-reason"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditCreditDialog(null)} data-testid="button-cancel-edit-credit">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const amountPence = Math.round(parseFloat(editCreditAmount) * 100);
                    if (isNaN(amountPence) || amountPence <= 0) {
                      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
                      return;
                    }
                    if (!editCreditReason.trim()) {
                      toast({ title: "Reason Required", description: "Please enter a reason.", variant: "destructive" });
                      return;
                    }
                    const signedAmount = editCreditDialog.amount < 0 ? -amountPence : amountPence;
                    editCredit.mutate(
                      { id: editCreditDialog.id, amount: signedAmount, reason: editCreditReason.trim() },
                      {
                        onSuccess: () => {
                          toast({ title: "Credit Updated", description: `Credit entry updated to £${(amountPence / 100).toFixed(2)}.` });
                          setEditCreditDialog(null);
                        },
                        onError: (err: any) => {
                          toast({ title: "Error", description: err.message || "Failed to update credit.", variant: "destructive" });
                        },
                      }
                    );
                  }}
                  disabled={editCredit.isPending}
                  data-testid="button-submit-edit-credit"
                >
                  {editCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCreditDialog} onOpenChange={(open) => { if (!open) setDeleteCreditDialog(null); }}>
        <DialogContent data-testid="dialog-delete-credit">
          <DialogHeader>
            <DialogTitle>Delete Credit Entry</DialogTitle>
            <DialogDescription>
              {deleteCreditDialog ? `Are you sure you want to delete this ${deleteCreditDialog.amount > 0 ? "credit" : "debit"} of £${formatPounds(Math.abs(deleteCreditDialog.amount))} for ${deleteCreditDialog.playerName}? This action cannot be undone.` : ""}
            </DialogDescription>
          </DialogHeader>
          {deleteCreditDialog && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Reason: {deleteCreditDialog.reason}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteCreditDialog(null)} data-testid="button-cancel-delete-credit">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteCredit.mutate(deleteCreditDialog.id, {
                      onSuccess: () => {
                        toast({ title: "Credit Deleted", description: "Credit entry has been removed." });
                        setDeleteCreditDialog(null);
                      },
                      onError: (err: any) => {
                        toast({ title: "Error", description: err.message || "Failed to delete credit.", variant: "destructive" });
                      },
                    });
                  }}
                  disabled={deleteCredit.isPending}
                  data-testid="button-confirm-delete-credit"
                >
                  {deleteCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!removePlayerDialog} onOpenChange={(open) => { if (!open) setRemovePlayerDialog(null); }}>
        <DialogContent data-testid="dialog-remove-player">
          <DialogHeader>
            <DialogTitle>Remove Player from Session</DialogTitle>
            <DialogDescription>
              {removePlayerDialog ? `Are you sure you want to remove ${removePlayerDialog.entry.playerName} from "${removePlayerDialog.entry.sessionTitle}"? This will also remove them from the session signup list.` : ""}
            </DialogDescription>
          </DialogHeader>
          {removePlayerDialog && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemovePlayerDialog(null)} data-testid="button-cancel-remove-player">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const { sessionId, signupId, playerName, sessionTitle } = removePlayerDialog.entry;
                  removeFromSession.mutate(
                    { sessionId, signupId },
                    {
                      onSuccess: () => {
                        toast({ title: "Player Removed", description: `${playerName} has been removed from "${sessionTitle}".` });
                        setRemovePlayerDialog(null);
                      },
                      onError: () => {
                        toast({ title: "Error", description: "Failed to remove player from session.", variant: "destructive" });
                      },
                    }
                  );
                }}
                disabled={removeFromSession.isPending}
                data-testid="button-confirm-remove-player"
              >
                {removeFromSession.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Remove
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!addPlayerDialog} onOpenChange={(open) => { if (!open) setAddPlayerDialog(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-add-player">
          <DialogHeader>
            <DialogTitle>Add Player to Session</DialogTitle>
            <DialogDescription>
              {addPlayerDialog ? `Session: ${addPlayerDialog.sessionTitle}` : ""}
            </DialogDescription>
          </DialogHeader>
          {addPlayerDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <Button
                  size="sm"
                  variant={addPlayerMode === "existing" ? "default" : "ghost"}
                  onClick={() => setAddPlayerMode("existing")}
                  className="flex-1"
                  data-testid="button-add-existing-player"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Existing Member
                </Button>
                <Button
                  size="sm"
                  variant={addPlayerMode === "new" ? "default" : "ghost"}
                  onClick={() => setAddPlayerMode("new")}
                  className="flex-1"
                  data-testid="button-add-new-player"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  New Player
                </Button>
              </div>

              {addPlayerMode === "existing" ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="add-player-search" className="text-sm font-medium">Search Members</Label>
                    <Input
                      id="add-player-search"
                      placeholder="Search by name..."
                      value={addPlayerSearch}
                      onChange={(e) => {
                        setAddPlayerSearch(e.target.value);
                        setAddPlayerSelectedId(null);
                      }}
                      data-testid="input-add-player-search"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-md">
                    {(() => {
                      const filtered = (addPlayerMembers || [])
                        .filter((m: any) => m.user?.fullName?.toLowerCase().includes(addPlayerSearch.toLowerCase()) || m.user?.email?.toLowerCase().includes(addPlayerSearch.toLowerCase()))
                        .slice(0, 20);
                      if (filtered.length === 0) {
                        return <p className="text-sm text-muted-foreground p-3 text-center">No members found</p>;
                      }
                      return filtered.map((m: any) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${addPlayerSelectedId === m.id ? "bg-primary/10 text-primary" : ""}`}
                          onClick={() => setAddPlayerSelectedId(m.id)}
                          data-testid={`option-member-${m.id}`}
                        >
                          <div>
                            <span className="font-medium">{m.user?.fullName}</span>
                            <span className="text-xs text-muted-foreground ml-2">{m.user?.email?.includes("@guest.local") ? "Guest" : m.user?.email}</span>
                          </div>
                          {addPlayerSelectedId === m.id && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      ));
                    })()}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPlayerDialog(null)} data-testid="button-cancel-add-player">
                      Cancel
                    </Button>
                    <Button
                      disabled={!addPlayerSelectedId || addExistingPlayer.isPending}
                      onClick={() => {
                        if (!addPlayerSelectedId) return;
                        addExistingPlayer.mutate(
                          { sessionId: addPlayerDialog.sessionId, playerId: addPlayerSelectedId },
                          {
                            onSuccess: (data: any) => {
                              const msg = data?.addedToWaitingList
                                ? "Player added to waiting list (session is full)."
                                : "Player added to session.";
                              toast({ title: "Player Added", description: msg });
                              setAddPlayerDialog(null);
                            },
                            onError: (err: any) => {
                              const msg = err?.message || "Failed to add player.";
                              toast({ title: "Error", description: msg, variant: "destructive" });
                            },
                          }
                        );
                      }}
                      data-testid="button-confirm-add-existing"
                    >
                      {addExistingPlayer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                      Add to Session
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-player-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="new-player-name"
                      placeholder="e.g. John Smith"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      data-testid="input-new-player-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-player-email" className="text-sm font-medium">Email (optional)</Label>
                    <Input
                      id="new-player-email"
                      type="email"
                      placeholder="e.g. john@email.com"
                      value={newPlayerEmail}
                      onChange={(e) => setNewPlayerEmail(e.target.value)}
                      data-testid="input-new-player-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">If provided, they will receive an email to claim their account.</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    <Select value={newPlayerGender} onValueChange={setNewPlayerGender}>
                      <SelectTrigger data-testid="select-new-player-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPlayerDialog(null)} data-testid="button-cancel-add-new-player">
                      Cancel
                    </Button>
                    <Button
                      disabled={!newPlayerName.trim() || addGuestPlayer.isPending}
                      onClick={() => {
                        if (!newPlayerName.trim()) return;
                        addGuestPlayer.mutate(
                          {
                            sessionId: addPlayerDialog.sessionId,
                            fullName: newPlayerName.trim(),
                            email: newPlayerEmail.trim() || undefined,
                            gender: newPlayerGender,
                          },
                          {
                            onSuccess: () => {
                              toast({ title: "Player Created & Added", description: `${newPlayerName.trim()} has been created and added to the session.` });
                              setAddPlayerDialog(null);
                            },
                            onError: (err: any) => {
                              const msg = err?.message || "Failed to create and add player.";
                              toast({ title: "Error", description: msg, variant: "destructive" });
                            },
                          }
                        );
                      }}
                      data-testid="button-confirm-add-new"
                    >
                      {addGuestPlayer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                      Create & Add
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustCreditDialog} onOpenChange={(open) => { if (!open) setAdjustCreditDialog(null); }}>
        <DialogContent data-testid="dialog-adjust-credit">
          <DialogHeader>
            <DialogTitle data-testid="text-adjust-credit-title">Adjust Credit</DialogTitle>
            <DialogDescription>
              {adjustCreditDialog ? `${adjustCreditDialog.playerName} — Current balance: £${formatPounds(adjustCreditDialog.currentBalance)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {adjustCreditDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <Select value={adjustCreditType} onValueChange={(v) => setAdjustCreditType(v as "add" | "deduct")}>
                  <SelectTrigger data-testid="select-adjust-credit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Credit</SelectItem>
                    <SelectItem value="deduct">Deduct Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adjust-credit-amount" className="text-sm font-medium">Amount ({"\u00A3"})</Label>
                <Input
                  id="adjust-credit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustCreditAmount}
                  onChange={(e) => setAdjustCreditAmount(e.target.value)}
                  placeholder="e.g. 5.00"
                  data-testid="input-adjust-credit-amount"
                />
              </div>
              <div>
                <Label htmlFor="adjust-credit-reason" className="text-sm font-medium">Reason</Label>
                <Input
                  id="adjust-credit-reason"
                  value={adjustCreditReason}
                  onChange={(e) => setAdjustCreditReason(e.target.value)}
                  placeholder="e.g. Overpayment refund"
                  data-testid="input-adjust-credit-reason"
                />
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => setResetCreditConfirm({ userId: adjustCreditDialog.userId, clubId: adjustCreditDialog.clubId, playerName: adjustCreditDialog.playerName, currentBalance: adjustCreditDialog.currentBalance })}
                  data-testid="button-reset-credit"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />Reset to £0.00
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setAdjustCreditDialog(null)} data-testid="button-cancel-adjust-credit">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const pence = Math.round(parseFloat(adjustCreditAmount) * 100);
                    if (isNaN(pence) || pence <= 0) {
                      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
                      return;
                    }
                    if (!adjustCreditReason.trim()) {
                      toast({ title: "Reason Required", description: "Please enter a reason.", variant: "destructive" });
                      return;
                    }
                    const signedAmount = adjustCreditType === "deduct" ? -pence : pence;
                    createCredit.mutate(
                      { userId: adjustCreditDialog.userId, clubId: adjustCreditDialog.clubId, amount: signedAmount, reason: adjustCreditReason.trim(), linkedSessionId: adjustCreditDialog.sessionId, linkedSignupId: adjustCreditDialog.signupId },
                      {
                        onSuccess: () => {
                          toast({ title: "Credit Updated", description: `${adjustCreditType === "add" ? "Added" : "Deducted"} £${(pence / 100).toFixed(2)} ${adjustCreditType === "add" ? "to" : "from"} ${adjustCreditDialog.playerName}'s balance.` });
                          setAdjustCreditDialog(null);
                        },
                        onError: (err: any) => {
                          toast({ title: "Error", description: err.message || "Failed to adjust credit.", variant: "destructive" });
                        },
                      }
                    );
                  }}
                  disabled={createCredit.isPending}
                  data-testid="button-submit-adjust-credit"
                >
                  {createCredit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {adjustCreditType === "add" ? "Add Credit" : "Deduct Credit"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetCreditConfirm} onOpenChange={(open) => { if (!open) setResetCreditConfirm(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-reset-credit">
          <DialogHeader>
            <DialogTitle>Reset Credit Balance</DialogTitle>
            <DialogDescription>
              {resetCreditConfirm ? `Reset ${resetCreditConfirm.playerName}'s credit balance to £0.00` : ""}
            </DialogDescription>
          </DialogHeader>
          {resetCreditConfirm && (
            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-orange-50 dark:bg-orange-950/30">
                <p className="text-sm font-medium">Current Balance: <span className="text-orange-600">£{((resetCreditConfirm.currentBalance || 0) / 100).toFixed(2)}</span></p>
                <p className="text-xs text-muted-foreground mt-1">This will set the balance to £0.00 and sync with the wallet.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetCreditConfirm(null)} data-testid="button-cancel-reset-credit">Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={resetCreditMutation.isPending}
                  onClick={() => resetCreditMutation.mutate({ userId: resetCreditConfirm.userId, clubId: resetCreditConfirm.clubId, reason: "Credit reset to zero by admin" })}
                  data-testid="button-confirm-reset-credit"
                >
                  {resetCreditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Reset to £0.00
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSessionDialog} onOpenChange={(open) => { if (!open) setDeleteSessionDialog(null); }}>
        <DialogContent data-testid="dialog-delete-session">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteSessionDialog?.sessionTitle}"? This will permanently remove the session and all associated signups, matches, and financial records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSessionDialog(null)} data-testid="button-cancel-delete-session">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteSessionDialog) {
                  deleteSession.mutate(deleteSessionDialog.sessionId);
                }
              }}
              disabled={deleteSession.isPending}
              data-testid="button-confirm-delete-session"
            >
              {deleteSession.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialog} onOpenChange={(open) => { if (!open) setBulkDeleteDialog(false); }}>
        <DialogContent data-testid="dialog-bulk-delete-sessions">
          <DialogHeader>
            <DialogTitle>Delete {selectedSessions.size} Session{selectedSessions.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedSessions.size} selected session{selectedSessions.size !== 1 ? "s" : ""}? This will permanently remove the sessions and all associated signups, matches, and financial records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} data-testid="button-cancel-bulk-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                bulkDeleteSessions.mutate(Array.from(selectedSessions));
              }}
              disabled={bulkDeleteSessions.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteSessions.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete {selectedSessions.size} Session{selectedSessions.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revenueClubDialog} onOpenChange={(open) => { if (!open) setRevenueClubDialog(null); }}>
        <DialogContent className="sm:max-w-[700px]" data-testid="dialog-club-revenue">
          {revenueClubDialog && (() => {
            const club = clubRevenueData.find(c => c.clubId === revenueClubDialog.clubId);
            if (!club) return null;
            const sortedMembers = Object.values(club.members).sort((a, b) => b.totalFee - a.totalFee);
            return (
              <>
                <DialogHeader>
                  <DialogTitle data-testid="text-dialog-club-title">{revenueClubDialog.clubName} - Member Revenue</DialogTitle>
                  <DialogDescription data-testid="text-dialog-club-summary">
                    Total: {"\u00A3"}{formatPounds(club.totalRevenue)} | Paid: {"\u00A3"}{formatPounds(club.totalPaid)} | Outstanding: {"\u00A3"}{formatPounds(club.totalRevenue - club.totalPaid)}
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Total Fees</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMembers.map((member, idx) => (
                        <TableRow key={member.userId} data-testid={`row-member-revenue-${member.userId}`}>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium" data-testid={`text-member-name-${member.userId}`}>{member.name}</div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-member-email-${member.userId}`}>{member.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold" data-testid={`text-member-total-fee-${member.userId}`}>{"\u00A3"}{formatPounds(member.totalFee)}</TableCell>
                          <TableCell className="text-green-600" data-testid={`text-member-paid-${member.userId}`}>{"\u00A3"}{formatPounds(member.paidFee)}</TableCell>
                          <TableCell className={member.totalFee - member.paidFee > 0 ? "text-orange-600" : "text-muted-foreground"} data-testid={`text-member-outstanding-${member.userId}`}>
                            {"\u00A3"}{formatPounds(member.totalFee - member.paidFee)}
                          </TableCell>
                          <TableCell data-testid={`text-member-sessions-${member.userId}`}>{member.sessions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={outstandingDialogOpen} onOpenChange={(open) => { setOutstandingDialogOpen(open); if (!open) { setOutstandingEditingFee(null); setOutstandingFeeValue(""); } }}>
        <DialogContent className="sm:max-w-[700px]" data-testid="dialog-outstanding-details">
          <DialogHeader>
            <DialogTitle data-testid="text-outstanding-dialog-title">Outstanding Payments</DialogTitle>
            <DialogDescription>
              {outstandingByPlayer.length} player{outstandingByPlayer.length !== 1 ? "s" : ""} with outstanding sessions totalling {"\u00A3"}{formatPounds(outstandingTotal)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {outstandingByPlayer.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No outstanding payments</p>
            ) : (
              outstandingByPlayer.map((player) => (
                <Card key={player.playerUserId} data-testid={`card-outstanding-player-${player.playerUserId}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium flex items-center gap-1.5" data-testid={`text-outstanding-player-name-${player.playerUserId}`}>
                        {player.sessions.some((s: any) => s.membershipStatus === "ACTIVE") && (
                          <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        {player.playerName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-outstanding-player-email-${player.playerUserId}`}>{player.playerEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" data-testid={`badge-outstanding-total-${player.playerUserId}`}>
                        {"\u00A3"}{formatPounds(player.totalOwed)}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                        disabled={updatePayment.isPending}
                        data-testid={`button-mark-all-paid-${player.playerUserId}`}
                        onClick={() => {
                          player.sessions.forEach((session) => {
                            updatePayment.mutate(
                              { sessionId: session.sessionId, signupId: session.signupId, status: "PAID" },
                              {
                                onSuccess: () => {
                                  qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
                                },
                              }
                            );
                          });
                          toast({ title: "Marking All Paid", description: `Updating ${player.sessions.length} payment(s) for ${player.playerName}.` });
                        }}
                      >
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        Pay All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {player.sessions.map((session, idx) => (
                        <div key={`${session.sessionId}-${idx}`} className="flex items-center justify-between gap-2 text-xs py-1.5 border-t border-border/40 flex-wrap" data-testid={`row-outstanding-session-${session.sessionId}-${player.playerUserId}`}>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{session.sessionTitle}</span>
                            <span className="text-muted-foreground ml-2">
                              {session.sessionDate ? format(new Date(session.sessionDate), "dd MMM yyyy") : "N/A"}
                            </span>
                            <span className="text-muted-foreground ml-1">({session.clubName})</span>
                            {session.paymentStatus === "PENDING" && (
                              <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 h-4 text-yellow-600 border-yellow-300">Pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {outstandingEditingFee === session.signupId ? (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{"\u00A3"}</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-6 w-20 text-xs px-1"
                                  value={outstandingFeeValue}
                                  onChange={(e) => setOutstandingFeeValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const pence = Math.round(parseFloat(outstandingFeeValue) * 100);
                                      if (isNaN(pence) || pence < 0) {
                                        toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
                                        return;
                                      }
                                      updateFee.mutate({ signupId: session.signupId, fee: pence }, {
                                        onSuccess: () => {
                                          setOutstandingEditingFee(null);
                                          setOutstandingFeeValue("");
                                          qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
                                        }
                                      });
                                    } else if (e.key === "Escape") {
                                      setOutstandingEditingFee(null);
                                      setOutstandingFeeValue("");
                                    }
                                  }}
                                  autoFocus
                                  data-testid={`input-outstanding-fee-${session.signupId}`}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  disabled={updateFee.isPending}
                                  data-testid={`button-save-outstanding-fee-${session.signupId}`}
                                  onClick={() => {
                                    const pence = Math.round(parseFloat(outstandingFeeValue) * 100);
                                    if (isNaN(pence) || pence < 0) {
                                      toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
                                      return;
                                    }
                                    updateFee.mutate({ signupId: session.signupId, fee: pence }, {
                                      onSuccess: () => {
                                        setOutstandingEditingFee(null);
                                        setOutstandingFeeValue("");
                                        qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
                                      }
                                    });
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  data-testid={`button-cancel-outstanding-fee-${session.signupId}`}
                                  onClick={() => { setOutstandingEditingFee(null); setOutstandingFeeValue(""); }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className="font-medium text-orange-600 whitespace-nowrap cursor-pointer hover:underline"
                                  onClick={() => { setOutstandingEditingFee(session.signupId); setOutstandingFeeValue((session.fee / 100).toFixed(2)); }}
                                  title="Click to edit amount"
                                  data-testid={`text-outstanding-fee-${session.signupId}`}
                                >
                                  {"\u00A3"}{formatPounds(session.fee)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setOutstandingEditingFee(session.signupId); setOutstandingFeeValue((session.fee / 100).toFixed(2)); }}
                                  title="Edit amount"
                                  data-testid={`button-edit-outstanding-fee-${session.signupId}`}
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-1.5 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                              disabled={updatePayment.isPending}
                              data-testid={`button-mark-paid-${session.signupId}`}
                              onClick={() => {
                                updatePayment.mutate(
                                  { sessionId: session.sessionId, signupId: session.signupId, status: "PAID" },
                                  {
                                    onSuccess: () => {
                                      toast({ title: "Marked as Paid", description: `Payment updated for ${player.playerName} - ${session.sessionTitle}.` });
                                      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/financial") });
                                    },
                                    onError: () => {
                                      toast({ title: "Error", description: "Failed to update payment.", variant: "destructive" });
                                    },
                                  }
                                );
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-0.5" />
                              Paid
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <KpiDetailDialog
        open={finKpiDetail === "revenue"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Revenue Breakdown"
        description={`Total revenue: £${formatPounds(totalRevenue)}`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(paidTotal)}</div>
              <div className="text-xs text-muted-foreground">Collected ({filteredData.filter(e => e.paymentStatus === "PAID").length})</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{"\u00A3"}{formatPounds(pendingTotal)}</div>
              <div className="text-xs text-muted-foreground">Pending ({filteredData.filter(e => e.paymentStatus === "PENDING").length})</div>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{"\u00A3"}{formatPounds(unpaidTotal)}</div>
              <div className="text-xs text-muted-foreground">Unpaid ({filteredData.filter(e => e.paymentStatus === "UNPAID").length})</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Total from {filteredData.length} signups across all sessions
          </div>
        </div>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "collected"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Collected Payments"
        description={`${filteredData.filter(e => e.paymentStatus === "PAID").length} paid entries totalling £${formatPounds(paidTotal)}`}
      >
        <Table>
          <TableHeader><TableRow>
            <TableHead>Player</TableHead><TableHead>Session</TableHead><TableHead className="text-right">Fee</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredData.filter(e => e.paymentStatus === "PAID").slice(0, 15).map(e => (
              <TableRow key={e.signupId}>
                <TableCell className="font-medium">{e.playerName}</TableCell>
                <TableCell>{e.sessionTitle}</TableCell>
                <TableCell className="text-right">{"\u00A3"}{formatPounds(e.fee)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "pending"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Pending Payments"
        description={`${filteredData.filter(e => e.paymentStatus === "PENDING").length} pending entries totalling £${formatPounds(pendingTotal)}`}
      >
        <Table>
          <TableHeader><TableRow>
            <TableHead>Player</TableHead><TableHead>Session</TableHead><TableHead className="text-right">Fee</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredData.filter(e => e.paymentStatus === "PENDING").slice(0, 15).map(e => (
              <TableRow key={e.signupId}>
                <TableCell className="font-medium">{e.playerName}</TableCell>
                <TableCell>{e.sessionTitle}</TableCell>
                <TableCell className="text-right">{"\u00A3"}{formatPounds(e.fee)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "collection-rate"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Collection Rate"
        description={`Current rate: ${collectionRate}%`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(paidTotal)}</div>
              <div className="text-xs text-muted-foreground">Collected</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold">{"\u00A3"}{formatPounds(totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Collection rate is calculated as the percentage of total revenue that has been collected (paid). Formula: (Collected / Total Revenue) x 100 = {collectionRate}%
          </div>
        </div>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "total-income"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Total Income Breakdown"
        description={dashboardData ? `Total: £${formatPounds(dashboardData.totalIncome)}` : ""}
      >
        {dashboardData && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium">Session Income</span>
                <span className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(dashboardData.sessionIncome)}</span>
              </div>
              {dashboardData.inventorySales > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium">Inventory Sales</span>
                  <span className="text-lg font-bold text-blue-600">{"\u00A3"}{formatPounds(dashboardData.inventorySales)}</span>
                </div>
              )}
              {dashboardData.membershipPaid > 0 && (
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm font-medium">Membership Paid</span>
                  <span className="text-lg font-bold text-purple-600">{"\u00A3"}{formatPounds(dashboardData.membershipPaid)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "total-expenses"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Total Expenses Breakdown"
        description={dashboardData ? `Total: £${formatPounds(dashboardData.totalExpenses)}` : ""}
      >
        {dashboardData && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              {dashboardData.inventoryPurchases > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-sm font-medium">Inventory Purchases</span>
                  <span className="text-lg font-bold text-red-600">{"\u00A3"}{formatPounds(dashboardData.inventoryPurchases)}</span>
                </div>
              )}
              {dashboardData.generalExpenses > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-sm font-medium">General Expenses</span>
                  <span className="text-lg font-bold text-orange-600">{"\u00A3"}{formatPounds(dashboardData.generalExpenses)}</span>
                </div>
              )}
              {dashboardData.totalExpenses === 0 && (
                <div className="text-sm text-muted-foreground p-3">No expenses recorded</div>
              )}
            </div>
          </div>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "net-revenue"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Net Revenue"
        description={dashboardData ? `${dashboardData.netRevenue >= 0 ? "Profit" : "Loss"}: £${formatPounds(Math.abs(dashboardData.netRevenue))}` : ""}
      >
        {dashboardData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(dashboardData.totalIncome)}</div>
                <div className="text-xs text-muted-foreground">Total Income</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-lg font-bold text-red-600">{"\u00A3"}{formatPounds(dashboardData.totalExpenses)}</div>
                <div className="text-xs text-muted-foreground">Total Expenses</div>
              </div>
            </div>
            <div className={`text-center p-3 rounded-lg ${dashboardData.netRevenue >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
              <div className={`text-xl font-bold ${dashboardData.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`}>
                {dashboardData.netRevenue < 0 ? "-" : ""}{"\u00A3"}{formatPounds(Math.abs(dashboardData.netRevenue))}
              </div>
              <div className="text-xs text-muted-foreground">Net Revenue</div>
            </div>
          </div>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "stock-usage"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Stock Usage"
        description={dashboardData ? `${dashboardData.stockUsed} items used` : ""}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Stock used represents the total number of inventory items that have been consumed or allocated during sessions. This includes equipment and other consumables tracked through the inventory system.
          </div>
        </div>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "membership-revenue"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Membership Members"
        description={dashboardData ? `${dashboardData.membershipActiveCount} active members - Total: £${formatPounds(dashboardData.membershipTotalRevenue)}` : ""}
      >
        {dashboardData && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dashboardData.membershipMembers.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.fullName}</TableCell>
                  <TableCell>{m.planName}</TableCell>
                  <TableCell className="text-right">{"\u00A3"}{formatPounds(m.planPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={m.paymentStatus === "PAID" ? "default" : "destructive"} className="text-[10px]">
                      {m.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "membership-paid"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Paid Members"
        description={dashboardData ? `${dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "PAID").length} paid members` : ""}
      >
        {dashboardData && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "PAID").map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.fullName}</TableCell>
                  <TableCell>{m.planName}</TableCell>
                  <TableCell className="text-right">{"\u00A3"}{formatPounds(m.planPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "membership-unpaid"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Unpaid Members"
        description={dashboardData ? `${dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "UNPAID").length} unpaid members` : ""}
      >
        {dashboardData && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dashboardData.membershipMembers.filter(m => m.status === "ACTIVE" && m.paymentStatus === "UNPAID").map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.fullName}</TableCell>
                  <TableCell>{m.planName}</TableCell>
                  <TableCell className="text-right">{"\u00A3"}{formatPounds(m.planPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "membership-overdue"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Overdue Members"
        description={dashboardData ? `${dashboardData.membershipMembers.filter(m => m.isOverdue).length} overdue members` : ""}
      >
        {dashboardData && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>End Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {dashboardData.membershipMembers.filter(m => m.isOverdue).map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.fullName}</TableCell>
                  <TableCell>{m.planName}</TableCell>
                  <TableCell className="text-right">{"\u00A3"}{formatPounds(m.planPrice)}</TableCell>
                  <TableCell>{m.endDate ? format(new Date(m.endDate), "dd MMM yyyy") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "credit-outstanding"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Credit Overview"
        description={creditSummary ? `Outstanding credit balance: £${formatPounds(creditSummary.totalHeld)}` : ""}
      >
        {creditSummary && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="text-lg font-bold text-blue-600">{"\u00A3"}{formatPounds(creditSummary.totalHeld)}</div>
                <div className="text-xs text-muted-foreground">Currently Held</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="text-lg font-bold text-green-600">{"\u00A3"}{formatPounds(creditSummary.totalIssued)}</div>
                <div className="text-xs text-muted-foreground">Total Issued</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-lg font-bold">{"\u00A3"}{formatPounds(creditSummary.totalRedeemed)}</div>
                <div className="text-xs text-muted-foreground">Total Redeemed</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-lg font-bold">{creditSummary.totalIssued > 0 ? ((creditSummary.totalRedeemed / creditSummary.totalIssued) * 100).toFixed(1) : "0.0"}%</div>
                <div className="text-xs text-muted-foreground">Redemption Rate</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Outstanding credits represent the total value of credits currently held by members that have not yet been redeemed.</p>
          </div>
        )}
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "credit-issued"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Credits Issued"
        description={creditSummary ? `Total credits issued: £${formatPounds(creditSummary.totalIssued)}` : ""}
      >
        <div className="text-sm text-muted-foreground">
          <p>All credits issued to members across all time, including session cancellation credits, admin-approved credit claims, and manual credits.</p>
        </div>
      </KpiDetailDialog>

      <KpiDetailDialog
        open={finKpiDetail === "credit-redeemed"}
        onOpenChange={(open) => !open && setFinKpiDetail(null)}
        title="Credits Redeemed"
        description={creditSummary ? `Total credits redeemed: £${formatPounds(creditSummary.totalRedeemed)}` : ""}
      >
        <div className="text-sm text-muted-foreground">
          <p>All credits that have been used by members towards session payments.</p>
        </div>
      </KpiDetailDialog>
    </div>
  );
}

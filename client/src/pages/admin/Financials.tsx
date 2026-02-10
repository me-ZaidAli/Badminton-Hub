import { useState, useMemo, useCallback } from "react";
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
import { format, startOfMonth, endOfMonth, subMonths, isToday, startOfDay } from "date-fns";
import {
  DollarSign,
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
} from "lucide-react";

interface FinancialEntry {
  signupId: number;
  sessionId: number;
  playerId: number;
  fee: number;
  paymentStatus: "PAID" | "UNPAID";
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
  clubId: number;
  clubName: string;
  playerName: string;
  playerEmail: string;
  playerUserId: number;
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPounds(pence: number): string {
  return (pence / 100).toFixed(2);
}

export default function Financials() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const now = new Date();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [sessionType, setSessionType] = useState<string>("all");
  const [matchMode, setMatchMode] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"session" | "player">("session");

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

  const financialQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    if (sessionType !== "all") params.append("sessionType", sessionType);
    if (matchMode !== "all") params.append("matchMode", matchMode);
    if (searchQuery) params.append("search", searchQuery);
    const qs = params.toString();
    return `/api/admin/financial-summary${qs ? `?${qs}` : ""}`;
  }, [selectedClubId, dateFrom, dateTo, sessionType, matchMode, searchQuery]);

  const { data: financialData = [], isLoading } = useQuery<FinancialEntry[]>({
    queryKey: [financialQueryUrl],
  });

  const dashboardQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    const qs = params.toString();
    return `/api/admin/financial-dashboard${qs ? `?${qs}` : ""}`;
  }, [selectedClubId, dateFrom, dateTo]);

  const { data: dashboardData } = useQuery<{
    sessionIncome: number;
    sessionPaid: number;
    sessionOutstanding: number;
    inventorySales: number;
    inventoryPurchases: number;
    generalExpenses: number;
    totalIncome: number;
    totalExpenses: number;
    netRevenue: number;
    stockUsed: number;
    collectionRate: string;
  }>({ queryKey: [dashboardQueryUrl] });

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
  const unpaidTotal = useMemo(() => filteredData.filter((e) => e.paymentStatus === "UNPAID").reduce((sum, e) => sum + (e.fee || 0), 0), [filteredData]);
  const collectionRate = totalRevenue > 0 ? ((paidTotal / totalRevenue) * 100).toFixed(1) : "0.0";

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

  const playerGroups = useMemo(() => {
    const groups: Record<string, FinancialEntry[]> = {};
    filteredData.forEach((entry) => {
      const key = `${entry.playerUserId}-${entry.playerName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredData]);

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

  const handleMonthSelect = useCallback((monthIndex: number) => {
    const year = now.getFullYear();
    const monthStart = new Date(year, monthIndex, 1);
    setDateFrom(format(startOfMonth(monthStart), "yyyy-MM-dd"));
    setDateTo(format(endOfMonth(monthStart), "yyyy-MM-dd"));
  }, [now]);

  const handleClearFilters = useCallback(() => {
    setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
    setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
    setSelectedClubId("all");
    setSessionType("all");
    setMatchMode("all");
    setSearchQuery("");
    setPaymentFilter("all");
  }, [now]);

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
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive" });
        },
      }
    );
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
      setUseCreditDialog({ entry, balance: data.balance || 0 });
      setUseCreditAmount(Math.min(data.balance || 0, entry.fee).toString());
    } catch {
      toast({ title: "Error", description: "Failed to fetch credit balance.", variant: "destructive" });
    }
  };

  const handleUseCreditSubmit = () => {
    if (!useCreditDialog) return;
    const { entry, balance } = useCreditDialog;
    const amount = parseInt(useCreditAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance || amount > entry.fee) {
      toast({ title: "Invalid Amount", description: "Please enter a valid credit amount.", variant: "destructive" });
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
      <TableCell className="font-medium" data-testid={`text-player-name-${entry.signupId}`}>
        {entry.playerName}
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
        )}
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
        {entry.paymentStatus === "PAID" ? (
          <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-${entry.signupId}`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            PAID
          </Badge>
        ) : (
          <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-${entry.signupId}`}>
            <AlertCircle className="h-3 w-3 mr-1" />
            UNPAID
          </Badge>
        )}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenUseCredit(entry)}
            data-testid={`button-use-credit-${entry.signupId}`}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Use Credit
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
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-page-title">
            <DollarSign className="h-6 w-6 text-green-500" />
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground">Track revenue, payments and outstanding fees.</p>
        </div>
      </div>

      <Card data-testid="card-filter-bar">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px]"
                  data-testid="input-date-from"
                />
                <Label className="text-sm text-muted-foreground whitespace-nowrap">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px]"
                  data-testid="input-date-to"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {MONTH_NAMES.map((name, idx) => (
                  <Button
                    key={name}
                    size="sm"
                    variant={
                      dateFrom === format(startOfMonth(new Date(now.getFullYear(), idx, 1)), "yyyy-MM-dd") &&
                      dateTo === format(endOfMonth(new Date(now.getFullYear(), idx, 1)), "yyyy-MM-dd")
                        ? "default"
                        : "outline"
                    }
                    onClick={() => handleMonthSelect(idx)}
                    data-testid={`button-month-${name.toLowerCase()}`}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

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
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleClearFilters} data-testid="button-clear-filters">
                <X className="h-3 w-3 mr-1" />
                Clear Filters
              </Button>
            </div>

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
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              £{formatPounds(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{filteredData.length} signups</p>
          </CardContent>
        </Card>

        <Card data-testid="card-collected">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-collected">
              £{formatPounds(paidTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.filter((e) => e.paymentStatus === "PAID").length} paid
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-outstanding">
              £{formatPounds(unpaidTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.filter((e) => e.paymentStatus === "UNPAID").length} unpaid
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-collection-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-collection-rate">
              {collectionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paid vs total</p>
          </CardContent>
        </Card>
      </div>

      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-total-income">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-income">
                {"\u00A3"}{formatPounds(dashboardData.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sessions: {"\u00A3"}{formatPounds(dashboardData.sessionIncome)}
                {dashboardData.inventorySales > 0 && <> + Sales: {"\u00A3"}{formatPounds(dashboardData.inventorySales)}</>}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-expenses">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-total-expenses-dash">
                {"\u00A3"}{formatPounds(dashboardData.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardData.inventoryPurchases > 0 && <>Inventory: {"\u00A3"}{formatPounds(dashboardData.inventoryPurchases)} </>}
                {dashboardData.generalExpenses > 0 && <>General: {"\u00A3"}{formatPounds(dashboardData.generalExpenses)}</>}
                {dashboardData.totalExpenses === 0 && "No expenses"}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-net-revenue">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardData.netRevenue >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-net-revenue">
                {dashboardData.netRevenue < 0 ? "-" : ""}{"\u00A3"}{formatPounds(Math.abs(dashboardData.netRevenue))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Income minus expenses</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stock-usage">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Used</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-stock-used">
                {dashboardData.stockUsed}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items used in sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === "session" ? (
        <div className="space-y-3">
          {Object.keys(sessionGroups).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-sessions">
                No sessions found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            Object.entries(sessionGroups).map(([sessionIdStr, entries]) => {
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
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent>
                      <div className="flex justify-end mb-3">
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Player</TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Credit Bal.</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Attendance</TableHead>
                              <TableHead>Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => renderPlayerRow(entry))}
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
      ) : (
        <div className="space-y-3">
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
                                  <span className="font-medium" data-testid={`text-fee-player-${entry.signupId}`}>
                                    £{formatPounds(entry.fee || 0)}
                                  </span>
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
                                  {entry.paymentStatus === "PAID" ? (
                                    <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-player-${entry.signupId}`}>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      PAID
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-payment-player-${entry.signupId}`}>
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      UNPAID
                                    </Badge>
                                  )}
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
                    <Label htmlFor="use-credit-amount" className="text-sm font-medium">Credit to Apply (pence)</Label>
                    <Input
                      id="use-credit-amount"
                      type="number"
                      min="1"
                      max={Math.min(useCreditDialog.balance, useCreditDialog.entry.fee)}
                      value={useCreditAmount}
                      onChange={(e) => setUseCreditAmount(e.target.value)}
                      data-testid="input-use-credit-amount"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining payable: £{formatPounds(Math.max(0, useCreditDialog.entry.fee - (parseInt(useCreditAmount) || 0)))}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUseCreditAmount(String(Math.min(useCreditDialog.balance, useCreditDialog.entry.fee)))}
                      data-testid="button-use-full-credit"
                    >
                      Use Full Credit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleTogglePayment(useCreditDialog.entry);
                        setUseCreditDialog(null);
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
    </div>
  );
}

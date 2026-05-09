import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Image as ImageIcon,
  FileDown,
  Share2,
  Eye,
  EyeOff,
  X,
  CalendarDays,
  Clock,
  MapPin,
  User as UserIcon,
  Users,
  Receipt,
  PoundSterling,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Gift,
  UserPlus,
} from "lucide-react";

export interface SnapshotEntry {
  signupId: number;
  playerId: number;
  playerName: string;
  playerEmail?: string | null;
  playerUserId?: number | null;
  fee: number;
  paymentStatus: "PAID" | "UNPAID" | "PENDING";
  paymentMethod?: string | null;
  attendanceStatus?: string;
  partialPercentage?: number | null;
  creditApplied?: number;
  signupStatus?: string | null;
  membershipStatus?: string | null;
}

export interface SnapshotSessionInfo {
  sessionId: number;
  sessionTitle: string;
  sessionType?: string | null;
  matchMode?: string | null;
  sessionDate?: string | null;
  clubName?: string | null;
  clubId: number;
  invoiceNumber?: string | null;
}

interface SessionDetail {
  id: number;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status?: string | null;
  hallName?: string | null;
  venueId?: number | null;
  createdBy?: number | null;
  sessionType?: string | null;
  matchMode?: string | null;
  venue?: { id: number; name: string; address?: string | null; city?: string | null } | null;
  creator?: { id: number; fullName: string; email?: string | null; profilePictureUrl?: string | null } | null;
  coachUser?: { id: number; fullName: string; profilePictureUrl?: string | null } | null;
  coachUserId?: number | null;
}

interface ExpenseRow {
  id: number;
  name: string;
  amount: number;
  notes?: string | null;
}

function formatPounds(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateLong(d?: string | null): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "EEEE, d MMM yyyy");
  } catch {
    return "—";
  }
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const m = startTime?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const total = h * 60 + min + (durationMinutes || 0);
  const eh = Math.floor((total / 60) % 24);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface StatusInfo {
  label: string;
  className: string;
}

function statusFor(entry: SnapshotEntry): StatusInfo {
  const fee = entry.fee || 0;
  const credit = entry.creditApplied || 0;
  if (entry.signupStatus === "WAITING") {
    return {
      label: "Guest Player",
      className:
        "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    };
  }
  if (fee === 0 && entry.paymentStatus !== "PAID") {
    return {
      label: "Free",
      className:
        "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    };
  }
  if (entry.paymentMethod === "MEMBERSHIP_CREDIT" || (credit > 0 && credit >= fee)) {
    return {
      label: "Credit Used",
      className:
        "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    };
  }
  if (entry.paymentStatus === "PAID" && entry.partialPercentage && entry.partialPercentage < 100) {
    return {
      label: "Partial",
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    };
  }
  if (entry.paymentStatus === "PAID") {
    return {
      label: "Paid",
      className:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    };
  }
  if (entry.paymentStatus === "PENDING") {
    return {
      label: "Pending",
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    };
  }
  return {
    label: "Unpaid",
    className:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  };
}

function StatusIcon({ label }: { label: string }) {
  if (label === "Paid") return <CheckCircle2 className="h-3 w-3" />;
  if (label === "Credit Used") return <Wallet className="h-3 w-3" />;
  if (label === "Free") return <Gift className="h-3 w-3" />;
  if (label === "Guest Player") return <UserPlus className="h-3 w-3" />;
  return <AlertCircle className="h-3 w-3" />;
}

interface Props {
  open: boolean;
  onClose: () => void;
  session: SnapshotSessionInfo;
  entries: SnapshotEntry[];
}

export default function SessionFinancialSnapshot({
  open,
  onClose,
  session,
  entries,
}: Props) {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const [busy, setBusy] = useState<null | "png" | "pdf" | "share">(null);

  useEffect(() => {
    if (!open) setScreenshotMode(false);
  }, [open]);

  const { data: expenses = [] } = useQuery<ExpenseRow[]>({
    queryKey: ["/api/expenses", { sessionId: session.sessionId }],
    queryFn: async () => {
      const res = await fetch(
        `/api/expenses?clubId=${session.clubId}&sessionId=${session.sessionId}`,
        { credentials: "include" }
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: sessionDetail } = useQuery<SessionDetail>({
    queryKey: ["/api/sessions", session.sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${session.sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: open,
  });

  const venue = sessionDetail?.venue ?? null;
  const coachUser = sessionDetail?.coachUser ?? sessionDetail?.creator ?? null;

  const totals = useMemo(() => {
    const expected = entries.reduce((s, e) => s + (e.fee || 0), 0);
    const collected = entries
      .filter((e) => e.paymentStatus === "PAID")
      .reduce((s, e) => s + (e.fee || 0), 0);
    const outstanding = entries
      .filter((e) => e.paymentStatus !== "PAID")
      .reduce((s, e) => s + (e.fee || 0), 0);
    const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return {
      attendees: entries.length,
      expected,
      collected,
      outstanding,
      expensesTotal,
      coachEarnings: expected,
    };
  }, [entries, expenses]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const r = (a.paymentStatus === "PAID" ? 0 : 1) - (b.paymentStatus === "PAID" ? 0 : 1);
        if (r) return r;
        return a.playerName.localeCompare(b.playerName);
      }),
    [entries]
  );

  const startTime = sessionDetail?.startTime || "";
  const endTime = sessionDetail
    ? computeEndTime(sessionDetail.startTime, sessionDetail.durationMinutes)
    : "";
  const venueLabel =
    venue?.name ||
    sessionDetail?.hallName ||
    session.clubName ||
    "Venue not set";
  const status = sessionDetail?.status || "—";
  const coachName = coachUser?.fullName || "—";

  async function captureCanvas(scale = 2) {
    if (!reportRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(reportRef.current, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      scale,
      useCORS: true,
      logging: false,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });
  }

  async function exportImage(type: "png" | "jpeg") {
    setBusy("png");
    try {
      const canvas = await captureCanvas(2);
      if (!canvas) return;
      const mime = type === "jpeg" ? "image/jpeg" : "image/png";
      const dataUrl = canvas.toDataURL(mime, 0.95);
      const link = document.createElement("a");
      const safe = session.sessionTitle.replace(/[^\w\d-]+/g, "_").slice(0, 60);
      link.download = `snapshot_${safe}_${session.sessionId}.${type}`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Image Exported", description: `Saved as ${type.toUpperCase()}.` });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Could not capture image.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const canvas = await captureCanvas(2);
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= pageH - margin * 2) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
      } else {
        const sliceCanvas = document.createElement("canvas");
        const ctx = sliceCanvas.getContext("2d")!;
        const sliceHeightPx = Math.floor(((pageH - margin * 2) * canvas.width) / imgW);
        sliceCanvas.width = canvas.width;
        let sourceY = 0;
        let first = true;
        while (sourceY < canvas.height) {
          const h = Math.min(sliceHeightPx, canvas.height - sourceY);
          sliceCanvas.height = h;
          ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, sourceY, canvas.width, h, 0, 0, canvas.width, h);
          const sliceData = sliceCanvas.toDataURL("image/png");
          const sliceMm = (h * imgW) / canvas.width;
          if (!first) pdf.addPage();
          pdf.addImage(sliceData, "PNG", margin, margin, imgW, sliceMm, undefined, "FAST");
          sourceY += h;
          first = false;
        }
      }

      const safe = session.sessionTitle.replace(/[^\w\d-]+/g, "_").slice(0, 60);
      pdf.save(`snapshot_${safe}_${session.sessionId}.pdf`);
      toast({ title: "PDF Exported", description: "Snapshot saved as PDF." });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err?.message || "Could not create PDF.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function shareSnapshot() {
    setBusy("share");
    try {
      const canvas = await captureCanvas(2);
      if (!canvas) return;
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 0.95)
      );
      if (!blob) throw new Error("Could not create image.");
      const safe = session.sessionTitle.replace(/[^\w\d-]+/g, "_").slice(0, 60);
      const file = new File([blob], `snapshot_${safe}_${session.sessionId}.png`, {
        type: "image/png",
      });
      const shareText = `${session.sessionTitle} — Coach Earnings: £${formatPounds(
        totals.coachEarnings
      )}`;
      const navAny = navigator as any;
      if (navAny.canShare?.({ files: [file] }) && navAny.share) {
        await navAny.share({
          files: [file],
          title: session.sessionTitle,
          text: shareText,
        });
        toast({ title: "Shared", description: "Snapshot shared." });
      } else if (navAny.share) {
        await navAny.share({ title: session.sessionTitle, text: shareText });
        toast({
          title: "Shared (text only)",
          description: "Image sharing not supported on this device — image downloaded instead.",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Downloaded",
          description: "Native sharing not available — image downloaded.",
        });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast({
          title: "Share Failed",
          description: err?.message || "Could not share snapshot.",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[92vh] flex flex-col"
        data-testid="dialog-session-snapshot"
      >
        {!screenshotMode && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
            <div className="text-sm font-semibold">Session Financial Snapshot</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScreenshotMode(true)}
                data-testid="button-screenshot-mode"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Screenshot Mode
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportImage("png")}
                disabled={!!busy}
                data-testid="button-export-image"
              >
                {busy === "png" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                )}
                Export Image
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportPdf}
                disabled={!!busy}
                data-testid="button-export-pdf"
              >
                {busy === "pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                )}
                Export PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={shareSnapshot}
                disabled={!!busy}
                data-testid="button-share-snapshot"
              >
                {busy === "share" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                )}
                Share
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                data-testid="button-close-snapshot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {screenshotMode && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setScreenshotMode(false)}
              className="shadow-lg"
              data-testid="button-exit-screenshot-mode"
            >
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              Exit
            </Button>
          </div>
        )}

        <div className="overflow-y-auto bg-muted/30">
          <div
            ref={reportRef}
            className="bg-background p-5 sm:p-6 space-y-5"
            data-testid="snapshot-report"
          >
            {/* HEADER */}
            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {session.sessionType && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {session.sessionType}
                      </Badge>
                    )}
                    {session.matchMode && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {session.matchMode}
                      </Badge>
                    )}
                    {status && status !== "—" && (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {status}
                      </Badge>
                    )}
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-bold leading-tight tracking-tight"
                    data-testid="text-snapshot-title"
                  >
                    {session.sessionTitle}
                  </h2>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate" data-testid="text-snapshot-venue">
                      {venueLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-1 shrink-0">
                  {session.invoiceNumber && (
                    <div>
                      Invoice <span className="font-mono font-semibold">#{session.invoiceNumber}</span>
                    </div>
                  )}
                  <div>Generated {format(new Date(), "d MMM yyyy, HH:mm")}</div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-3 w-3" /> Date
                  </div>
                  <div className="font-medium" data-testid="text-snapshot-date">
                    {formatDateLong(session.sessionDate || sessionDetail?.date)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> Time
                  </div>
                  <div className="font-medium" data-testid="text-snapshot-time">
                    {startTime ? `${startTime}${endTime ? ` – ${endTime}` : ""}` : "—"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> Duration
                  </div>
                  <div className="font-medium" data-testid="text-snapshot-duration">
                    {sessionDetail?.durationMinutes ? `${sessionDetail.durationMinutes} min` : "—"}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <UserIcon className="h-3 w-3" /> Coach
                  </div>
                  <div className="font-medium truncate" data-testid="text-snapshot-coach">
                    {coachName}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3 w-3" /> Club
                  </div>
                  <div className="font-medium truncate" data-testid="text-snapshot-club">
                    {session.clubName || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <PoundSterling className="h-4 w-4" /> Financial Summary
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  Coach paid expenses in advance
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <SummaryTile label="Total Players" value={String(totals.attendees)} />
                <SummaryTile
                  label="Expected Income"
                  value={`£${formatPounds(totals.expected)}`}
                />
                <SummaryTile
                  label="Collected"
                  value={`£${formatPounds(totals.collected)}`}
                  tone="positive"
                />
                <SummaryTile
                  label="Outstanding"
                  value={`£${formatPounds(totals.outstanding)}`}
                  tone={totals.outstanding > 0 ? "warning" : "muted"}
                />
                <SummaryTile
                  label="Expenses (info)"
                  value={`£${formatPounds(totals.expensesTotal)}`}
                  tone="muted"
                />
                <SummaryTile
                  label="Coach Earnings"
                  value={`£${formatPounds(totals.coachEarnings)}`}
                  tone="hero"
                />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
                Coach earnings = total session fee (full expected income). Expenses are shown for
                reference only and are not deducted (coach paid them in advance).
              </p>
            </div>

            {/* ATTENDANCE */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Attendance & Payments
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {totals.attendees} {totals.attendees === 1 ? "player" : "players"}
                </Badge>
              </div>
              {sortedEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  No attendees recorded.
                </div>
              ) : (
                <ul className="divide-y">
                  {sortedEntries.map((entry) => {
                    const status = statusFor(entry);
                    return (
                      <li
                        key={entry.signupId}
                        className="flex items-center gap-3 py-2.5"
                        data-testid={`row-snapshot-player-${entry.signupId}`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="text-xs">
                            {initials(entry.playerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {entry.playerName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {entry.paymentMethod
                              ? entry.paymentMethod.replace(/_/g, " ")
                              : "—"}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${status.className}`}
                        >
                          <StatusIcon label={status.label} />
                          {status.label}
                        </Badge>
                        <div
                          className="text-sm font-semibold tabular-nums w-16 text-right"
                          data-testid={`text-snapshot-fee-${entry.signupId}`}
                        >
                          £{formatPounds(entry.fee || 0)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* EXPENSES */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="h-4 w-4" /> Expenses
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  Reference only
                </Badge>
              </div>
              {expenses.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No expenses recorded.
                </div>
              ) : (
                <ul className="divide-y">
                  {expenses.map((ex) => (
                    <li
                      key={ex.id}
                      className="flex items-center justify-between gap-3 py-2"
                      data-testid={`row-snapshot-expense-${ex.id}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{ex.name}</div>
                        {ex.notes && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {ex.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        £{formatPounds(ex.amount || 0)}
                      </div>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3 pt-3 mt-1 border-t">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Total Expenses
                    </div>
                    <div className="text-sm font-bold tabular-nums">
                      £{formatPounds(totals.expensesTotal)}
                    </div>
                  </li>
                </ul>
              )}
            </div>

            <div className="text-center text-[10px] text-muted-foreground pt-1">
              Generated by Club Master · {format(new Date(), "d MMM yyyy")}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "muted" | "hero";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "muted"
      ? "text-foreground/80"
      : tone === "hero"
      ? "text-primary"
      : "text-foreground";
  const ringClass =
    tone === "hero"
      ? "ring-1 ring-primary/30 bg-primary/5"
      : "bg-muted/40";
  return (
    <div className={`rounded-xl p-3 ${ringClass}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

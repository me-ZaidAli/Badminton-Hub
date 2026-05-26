import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, BadgePoundSterling, CheckCircle2, XCircle, Upload, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Floating session-payment-reminder card. Mounted once in AuthenticatedShell.
 * - Polls /api/session-payment-reminders/active every 8s.
 * - User CANNOT dismiss — only resolved by admin.
 * - Fully theme-token-aware (uses bg/foreground/border/destructive/primary CSS vars).
 * - On confirm → flips to VERIFYING server-side; on admin confirm → row leaves
 *   the active list and the card animates out.
 */

type ReminderStatus = "PENDING" | "VERIFYING" | "CONFIRMED" | "REJECTED";
interface Reminder {
  id: number;
  userId: number;
  sessionsCount: number;
  amountPence: number;
  description: string;
  note?: string | null;
  dueDate: string;
  status: ReminderStatus;
  rejectionReason?: string | null;
  userConfirmedAt?: string | null;
  proofUrl?: string | null;
  createdAt: string;
}

function fmtMoney(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

export function SessionPaymentReminderFloater() {
  const { data: user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);

  const enabled = !!user;
  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/session-payment-reminders/active"],
    enabled,
    refetchInterval: enabled ? 8000 : false,
    refetchOnWindowFocus: true,
  });

  // Clamp the carousel index whenever the list shrinks (e.g., admin confirmed one)
  useEffect(() => {
    if (activeIndex >= reminders.length && reminders.length > 0) setActiveIndex(0);
  }, [reminders.length, activeIndex]);

  const current = reminders[activeIndex];

  const confirmMutation = useMutation({
    mutationFn: async (vars: { id: number; file: File | null }) => {
      const fd = new FormData();
      if (vars.file) fd.append("proof", vars.file);
      const res = await fetch(`/api/session-payment-reminders/${vars.id}/confirm-payment`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to confirm");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/session-payment-reminders/active"] });
      toast({
        title: "Payment confirmation sent",
        description: "Your payment is now awaiting admin verification.",
      });
      setPendingFile(null);
      setConfirming(false);
    },
    onError: (err: any) => {
      toast({ title: "Could not send confirmation", description: err?.message || "Try again", variant: "destructive" });
      setConfirming(false);
    },
  });

  if (!user || reminders.length === 0 || !current) return null;

  const isVerifying = current.status === "VERIFYING";
  const isRejected = current.status === "REJECTED";
  // Status drives accent — token-based, never hardcoded color literals
  const accent = isVerifying ? "hsl(var(--primary))"
    : isRejected ? "hsl(var(--destructive))"
    : "hsl(var(--destructive))"; // PENDING = same as rejected (action needed)

  const StatusIcon = isVerifying ? Clock : isRejected ? XCircle : AlertTriangle;
  const heading = isVerifying ? "Payment under verification"
    : isRejected ? "Payment not verified"
    : "Session payment reminder";

  return (
    <div
      // Fixed bottom-right, never covered, accessible to keyboard, sits above
      // floating chat/etc but BELOW modal overlays (z-40). Mobile pads above
      // bottom-nav with safe-area inset.
      className="fixed right-3 sm:right-5 z-40 pointer-events-none"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 80px)` }}
      data-testid="session-payment-reminder-floater"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current.id}
          initial={{ y: 60, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="pointer-events-auto w-[min(92vw,360px)] rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            borderColor: accent,
            boxShadow: `0 12px 40px -8px ${accent.replace(")", " / 0.45)")}`,
          }}
          whileHover={{ y: -3, boxShadow: `0 18px 48px -10px ${accent.replace(")", " / 0.55)")}` }}
          role="alertdialog"
          aria-labelledby={`spr-title-${current.id}`}
        >
          {/* Accent bar */}
          <div className="h-1.5 w-full" style={{ background: accent }} />

          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div
                className="rounded-full p-2 shrink-0"
                style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}
              >
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  id={`spr-title-${current.id}`}
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: "hsl(var(--card-foreground))" }}
                  data-testid="text-reminder-title"
                >
                  {heading}
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Training / coaching sessions
                </p>
              </div>
              {reminders.length > 1 && (
                <div
                  className="text-[10px] font-bold rounded-full px-2 py-0.5"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
                  data-testid="text-reminder-count"
                >
                  {activeIndex + 1}/{reminders.length}
                </div>
              )}
            </div>

            {/* Status-specific body */}
            {isVerifying ? (
              <div className="mt-3 text-sm leading-relaxed" style={{ color: "hsl(var(--card-foreground))" }}>
                Thank you! Your session payment confirmation has been received and is
                being checked by our team.
              </div>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg p-2" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <dt className="opacity-70">Unpaid sessions</dt>
                    <dd className="font-bold text-sm" data-testid="text-sessions-count">
                      {current.sessionsCount}
                    </dd>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <dt className="opacity-70 flex items-center gap-1"><BadgePoundSterling className="h-3 w-3" /> Amount due</dt>
                    <dd className="font-bold text-sm" data-testid="text-amount-due">
                      {fmtMoney(current.amountPence)}
                    </dd>
                  </div>
                  <div className="rounded-lg p-2 col-span-2" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <dt className="opacity-70">Reason</dt>
                    <dd className="font-semibold text-sm break-words" data-testid="text-reason">
                      {current.description}
                    </dd>
                  </div>
                  <div className="rounded-lg p-2 col-span-2" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <dt className="opacity-70">Due by</dt>
                    <dd className="font-semibold text-sm" data-testid="text-due-date">
                      {fmtDate(current.dueDate)}
                    </dd>
                  </div>
                </dl>

                {current.note && (
                  <p className="mt-2 text-xs italic" style={{ color: "hsl(var(--muted-foreground))" }}>
                    “{current.note}”
                  </p>
                )}

                {isRejected && current.rejectionReason && (
                  <div
                    className="mt-3 rounded-lg p-2 text-xs"
                    style={{
                      background: `color-mix(in oklab, ${accent} 14%, transparent)`,
                      border: `1px solid ${accent.replace(")", " / 0.4)")}`,
                    }}
                  >
                    <div className="font-bold mb-0.5" style={{ color: accent }}>Admin message</div>
                    <div style={{ color: "hsl(var(--card-foreground))" }}>{current.rejectionReason}</div>
                    <div className="mt-1 opacity-80" style={{ color: "hsl(var(--card-foreground))" }}>
                      Please check and confirm again once payment is made.
                    </div>
                  </div>
                )}

                {/* File picker (optional proof) */}
                {pendingFile && (
                  <div className="mt-3 text-xs flex items-center justify-between rounded-md p-2"
                       style={{ background: "hsl(var(--muted) / 0.5)" }}>
                    <span className="truncate" data-testid="text-proof-filename">{pendingFile.name}</span>
                    <button
                      type="button"
                      className="opacity-70 hover:opacity-100"
                      onClick={() => setPendingFile(null)}
                      data-testid="button-clear-proof"
                    >Remove</button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingFile(f);
                    e.target.value = "";
                  }}
                  data-testid="input-proof-file"
                />

                <div className="mt-4 flex flex-col gap-2">
                  {!confirming ? (
                    <>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setConfirming(true)}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold w-full"
                        style={{
                          background: accent,
                          color: "hsl(var(--primary-foreground))",
                          // Force readable text on accent — primary-foreground is theme-bound
                          textShadow: "0 1px 1px rgba(0,0,0,0.15)",
                        }}
                        data-testid="button-i-have-paid"
                      >
                        I HAVE MADE THE PAYMENT
                      </motion.button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs flex items-center justify-center gap-1 underline opacity-80 hover:opacity-100"
                        style={{ color: "hsl(var(--card-foreground))" }}
                        data-testid="button-attach-proof"
                      >
                        <Upload className="h-3 w-3" /> {pendingFile ? "Change proof" : "Attach proof (optional)"}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border p-3"
                         style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}>
                      <p className="text-xs" style={{ color: "hsl(var(--card-foreground))" }}>
                        You are confirming payment for your unpaid sessions. This will be
                        sent to admin for verification. Continue?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-bold border"
                          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--card-foreground))", background: "hsl(var(--background))" }}
                          onClick={() => setConfirming(false)}
                          disabled={confirmMutation.isPending}
                          data-testid="button-confirm-cancel"
                        >Cancel</button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                          style={{ background: accent, color: "hsl(var(--primary-foreground))" }}
                          disabled={confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate({ id: current.id, file: pendingFile })}
                          data-testid="button-confirm-yes"
                        >
                          {confirmMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Yes, I've paid
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pagination dots — only when multiple */}
            {reminders.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5">
                {reminders.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-label={`Reminder ${i + 1}`}
                    onClick={() => { setActiveIndex(i); setConfirming(false); setPendingFile(null); }}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === activeIndex ? 18 : 6,
                      background: i === activeIndex ? accent : "hsl(var(--muted-foreground) / 0.4)",
                    }}
                    data-testid={`button-reminder-dot-${i}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

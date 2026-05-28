import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, CircleDollarSign } from "lucide-react";

export function SignupFeeEditor({ signup, canEdit, onSave, isSaving, membershipPlanName, membershipFee }: { signup: any; canEdit: boolean; onSave: (fee: number) => void; isSaving: boolean; membershipPlanName?: string | null; membershipFee?: number | null }) {
  const currentFeePence = Number(signup?.fee ?? 0);
  const currentFeePounds = currentFeePence / 100;
  const displayPounds = Number.isInteger(currentFeePounds) ? String(currentFeePounds) : currentFeePounds.toFixed(2);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(displayPounds);
  useEffect(() => { setValue(displayPounds); }, [displayPounds]);

  const isMemberRate = !!membershipPlanName && membershipFee != null && currentFeePence === membershipFee;
  const tooltip = membershipPlanName
    ? `${membershipPlanName} rate${membershipFee != null ? ` (£${(membershipFee / 100).toFixed(2)})` : ""}${canEdit ? " — click to edit" : ""}`
    : (canEdit ? "Click to edit fee" : `Session fee`);

  const commit = () => {
    const pounds = Number(value);
    if (!Number.isFinite(pounds) || pounds < 0) { setValue(displayPounds); setEditing(false); return; }
    const newPence = Math.round(pounds * 100);
    if (newPence !== currentFeePence) onSave(newPence);
    setEditing(false);
  };

  if (!canEdit) {
    return (
      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 ml-1" data-testid={`text-fee-${signup.id}`}>£{displayPounds}</span>
    );
  }

  return editing ? (
    <span className="inline-flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-muted-foreground">£</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); else if (e.key === "Escape") { setValue(displayPounds); setEditing(false); } }}
        onBlur={commit}
        autoFocus
        disabled={isSaving}
        className="h-6 w-16 px-1.5 py-0 text-[11px] font-medium"
        data-testid={`input-fee-${signup.id}`}
      />
    </span>
  ) : (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
        isMemberRate
          ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40"
          : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
      }`}
      data-testid={`button-edit-fee-${signup.id}`}
      title={tooltip}
    >
      £{displayPounds}
      {isMemberRate && <span className="text-[9px] uppercase tracking-wide opacity-75">m</span>}
      <Pencil className="w-2.5 h-2.5 opacity-70" />
    </button>
  );
}

export function CreditAdjustChip({ userId, clubId, sessionId, balancePence }: { userId: number; clubId: number; sessionId: number; balancePence: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"ADD" | "TAKE">("ADD");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const pounds = Number(amount);
      if (!Number.isFinite(pounds) || pounds <= 0) throw new Error("Enter a positive amount");
      if (!reason.trim()) throw new Error("Reason is required");
      const pence = Math.round(pounds * 100) * (direction === "ADD" ? 1 : -1);
      const res = await apiRequest("POST", `/api/sessions/${sessionId}/credit-adjust`, { userId, amount: pence, reason: reason.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: direction === "ADD" ? "Credit added" : "Credit deducted" });
      setOpen(false);
      setAmount("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "admin-financials"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "financial-overview"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions", sessionId, "manage-players"] });
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message || "Could not update credit", variant: "destructive" }),
  });

  const balancePounds = balancePence / 100;
  const balanceLabel = Number.isInteger(balancePounds) ? String(balancePounds) : balancePounds.toFixed(2);
  const positive = balancePence > 0;
  const negative = balancePence < 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
            positive
              ? "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40"
              : negative
                ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          onClick={(e) => e.stopPropagation()}
          title={positive ? "Credit balance — click to adjust" : negative ? "Negative balance (owes club) — click to adjust" : "No credit — click to add"}
          data-testid={`button-credit-${userId}`}
        >
          <CircleDollarSign className="w-2.5 h-2.5" />
          £{balanceLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" onClick={(e) => e.stopPropagation()} data-testid={`popover-credit-${userId}`}>
        <p className="text-xs font-semibold mb-2">Adjust player credit</p>
        <p className="text-[11px] text-muted-foreground mb-2">Current balance: <span className="font-medium text-foreground">£{balanceLabel}</span></p>
        <div className="flex gap-1 mb-2">
          <Button size="sm" type="button" variant={direction === "ADD" ? "default" : "outline"} onClick={() => setDirection("ADD")} className="flex-1 h-7 text-xs" data-testid="button-credit-add">Add</Button>
          <Button size="sm" type="button" variant={direction === "TAKE" ? "default" : "outline"} onClick={() => setDirection("TAKE")} className="flex-1 h-7 text-xs" data-testid="button-credit-take">Take</Button>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Amount (£)</label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-sm" data-testid="input-credit-amount" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Reason</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill refund" className="h-8 text-sm" data-testid="input-credit-reason" />
          </div>
          <Button size="sm" type="button" className="w-full h-8 text-xs" disabled={mutation.isPending} onClick={() => mutation.mutate()} data-testid="button-credit-save">
            {mutation.isPending ? "Saving..." : (direction === "ADD" ? "Add credit" : "Take credit")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

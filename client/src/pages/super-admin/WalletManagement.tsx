import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Wallet, Search, Plus, Loader2, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
  Eye, Globe, Lock, Pencil, Save, ArrowLeft, PoundSterling, RotateCcw, Sliders, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function WalletEditModal({ wallet, clubs, users, open, onClose, onCreate, onUpdate, isPending }: {
  wallet: any; clubs: any[]; users: any[]; open: boolean; onClose: () => void;
  onCreate: (data: any) => void; onUpdate: (data: any) => void; isPending: boolean;
}) {
  const isEdit = !!wallet;
  const [name, setName] = useState(wallet?.name || "");
  const [userId, setUserId] = useState<string>(wallet?.userId ? String(wallet.userId) : "");
  const [isGlobal, setIsGlobal] = useState(wallet?.isGlobal || false);
  const [selectedClubs, setSelectedClubs] = useState<number[]>(wallet?.allowedClubIds || []);
  const [threshold, setThreshold] = useState<string>(wallet?.lowBalanceThreshold ? String(wallet.lowBalanceThreshold / 100) : "5.00");
  const [isActive, setIsActive] = useState(wallet?.isActive !== false);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch) return users.slice(0, 50);
    const q = userSearch.toLowerCase();
    return users.filter((u: any) => u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)).slice(0, 50);
  }, [users, userSearch]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const thresholdPence = Math.round(parseFloat(threshold || "5") * 100);
    if (isEdit) {
      onUpdate({ walletId: wallet.id, name, isGlobal, allowedClubIds: isGlobal ? [] : selectedClubs, lowBalanceThreshold: thresholdPence, isActive });
    } else {
      if (!userId) return;
      onCreate({ userId: parseInt(userId), name, isGlobal, allowedClubIds: isGlobal ? [] : selectedClubs, lowBalanceThreshold: thresholdPence });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Wallet" : "Create Wallet"}</DialogTitle>
          <DialogDescription>{isEdit ? "Update wallet settings and club permissions." : "Create a new wallet for a user with optional club restrictions."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <div>
              <Label>User</Label>
              <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="mb-2" data-testid="input-wallet-user-search" />
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger data-testid="select-wallet-user"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {filteredUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Wallet Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Global Credit, Club A Funds" data-testid="input-wallet-name" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="wallet-global" checked={isGlobal} onCheckedChange={(v) => setIsGlobal(!!v)} data-testid="checkbox-wallet-global" />
            <Label htmlFor="wallet-global" className="text-sm cursor-pointer">Global wallet (usable across all clubs)</Label>
          </div>
          {!isGlobal && (
            <div>
              <Label className="mb-2 block">Allowed Clubs</Label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border rounded-lg p-2">
                {clubs.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`club-${c.id}`}
                      checked={selectedClubs.includes(c.id)}
                      onCheckedChange={(v) => {
                        setSelectedClubs(v ? [...selectedClubs, c.id] : selectedClubs.filter(id => id !== c.id));
                      }}
                      data-testid={`checkbox-wallet-club-${c.id}`}
                    />
                    <Label htmlFor={`club-${c.id}`} className="text-sm cursor-pointer">{c.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Low Balance Alert (£)</Label>
            <Input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} data-testid="input-wallet-threshold" />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox id="wallet-active" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} data-testid="checkbox-wallet-active" />
              <Label htmlFor="wallet-active" className="text-sm cursor-pointer">Wallet active</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim() || (!isEdit && !userId)} data-testid="button-wallet-save">
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {isEdit ? "Save Changes" : "Create Wallet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FundsModal({ wallet, mode, clubs, open, onClose, onSubmit, isPending }: {
  wallet: any; mode: "add" | "remove"; clubs: any[]; open: boolean; onClose: () => void;
  onSubmit: (data: any) => void; isPending: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [clubId, setClubId] = useState<string>("");

  const handleSubmit = () => {
    const pence = Math.round(parseFloat(amount || "0") * 100);
    if (pence <= 0) return;
    onSubmit({ walletId: wallet.id, amount: pence, reason: reason || (mode === "add" ? "Funds added by admin" : "Funds removed by admin"), clubId: clubId && clubId !== "none" ? parseInt(clubId) : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Funds" : "Remove Funds"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Add credit to" : "Remove credit from"} <strong>{wallet.userName || "User"}'s</strong> wallet "{wallet.name}" (Balance: £{(wallet.balance / 100).toFixed(2)})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount (£)</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" data-testid="input-funds-amount" />
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment" data-testid="input-funds-reason" />
          </div>
          <div>
            <Label>Associated Club (optional)</Label>
            <Select value={clubId} onValueChange={setClubId}>
              <SelectTrigger data-testid="select-funds-club"><SelectValue placeholder="No specific club" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific club</SelectItem>
                {clubs.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !amount || parseFloat(amount) <= 0} data-testid="button-funds-submit"
            className={mode === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : mode === "add" ? <ArrowUpCircle className="w-4 h-4 mr-1" /> : <ArrowDownCircle className="w-4 h-4 mr-1" />}
            {mode === "add" ? "Add Funds" : "Remove Funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransactionLogModal({ walletId, wallet, clubs, open, onClose }: {
  walletId: number; wallet: any; clubs: any[]; open: boolean; onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: unified, isLoading } = useQuery<any>({
    queryKey: ["/api/god-mode/wallets", walletId, "unified-view"],
    queryFn: async () => {
      const res = await fetch(`/api/god-mode/wallets/${walletId}/unified-view`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load unified view");
      return res.json();
    },
    enabled: open && !!walletId,
  });

  const [amendClubId, setAmendClubId] = useState<string>("");
  const [amendTarget, setAmendTarget] = useState<string>("");
  const [amendReason, setAmendReason] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setBalanceMutation = useMutation({
    mutationFn: async (data: { clubId: number; targetBalance: number; reason?: string }) => {
      const res = await apiRequest("POST", `/api/god-mode/wallets/${walletId}/set-balance`, data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.noop ? "No change" : "Balance updated",
        description: data.noop
          ? `Already at £${(data.newBalance / 100).toFixed(2)}.`
          : `£${(data.previousBalance / 100).toFixed(2)} → £${(data.newBalance / 100).toFixed(2)} (${data.delta >= 0 ? "+" : ""}£${(data.delta / 100).toFixed(2)})`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets", walletId, "unified-view"] });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/my-credits") });
      setAmendTarget("");
      setAmendReason("");
      setConfirmOpen(false);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message?.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const balances: { clubId: number; clubName: string; balance: number }[] = unified?.balances || [];
  const history: any[] = unified?.history || [];
  const walletBalance: number = unified?.walletBalance ?? wallet?.balance ?? 0;

  const targetPence = amendTarget === "" ? null : Math.round(parseFloat(amendTarget) * 100);
  const delta = targetPence === null ? null : targetPence - walletBalance;
  const canSubmit = !!amendClubId && targetPence !== null && Number.isFinite(targetPence);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto" data-testid="modal-wallet-unified-view">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> {wallet?.userName || "User"}'s Wallet · {wallet?.name}
          </DialogTitle>
          <DialogDescription>
            The single balance the user sees on their profile, plus a manual amend tool. Credit ledger and wallet table are kept in lockstep on every change.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {/* Single balance — what the user sees on their profile */}
            <Card data-testid="card-wallet-balance">
              <CardContent className="p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Current balance (what the user sees)
                </div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-wallet-balance-value">
                  £{(walletBalance / 100).toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Sourced from the wallet — same value as the user's profile and the credit ledger after every change.
                </div>
              </CardContent>
            </Card>

            {/* Per-club balances (matches what user sees on profile) */}
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Per-club balances (live from credit ledger)</div>
                {balances.some(b => b.balance !== 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    disabled={setBalanceMutation.isPending}
                    onClick={() => {
                      const nonZero = balances.filter(b => b.balance !== 0);
                      if (nonZero.length === 0) return;
                      const ok = window.confirm(
                        `Reset ALL ${nonZero.length} club wallet${nonZero.length > 1 ? "s" : ""} to £0.00?\n\n` +
                        nonZero.map(b => `• ${b.clubName}: £${(b.balance / 100).toFixed(2)} → £0.00`).join("\n") +
                        `\n\nWrites a corrective entry to the credit ledger AND wallets table for each. Cannot be undone.`
                      );
                      if (!ok) return;
                      nonZero.forEach(b => {
                        setBalanceMutation.mutate({
                          clubId: b.clubId,
                          targetBalance: 0,
                          reason: "Manual reset to zero",
                        });
                      });
                    }}
                    data-testid="button-reset-all-wallets-zero"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset all to £0
                  </Button>
                )}
              </div>
              {balances.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No credit-ledger entries for this user.</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-testid="list-per-club-balances">
                  {balances.map(b => (
                    <div
                      key={b.clubId}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${b.balance < 0 ? "border-red-300 text-red-600" : "border-emerald-300 text-emerald-700 dark:text-emerald-400"}`}
                      data-testid={`badge-club-balance-${b.clubId}`}
                    >
                      <span>{b.clubName}: {b.balance < 0 ? "-" : ""}£{(Math.abs(b.balance) / 100).toFixed(2)}</span>
                      {b.balance !== 0 && (
                        <button
                          type="button"
                          className="ml-1 inline-flex items-center justify-center rounded-sm h-4 w-4 text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                          title={`Reset ${b.clubName} to £0.00`}
                          disabled={setBalanceMutation.isPending}
                          onClick={() => {
                            const ok = window.confirm(
                              `Reset ${b.clubName} from £${(b.balance / 100).toFixed(2)} to £0.00?\n\nWrites a corrective entry to BOTH the credit ledger and wallets table.`
                            );
                            if (!ok) return;
                            setBalanceMutation.mutate({
                              clubId: b.clubId,
                              targetBalance: 0,
                              reason: "Manual reset to zero",
                            });
                          }}
                          data-testid={`button-reset-club-${b.clubId}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual amend */}
            <Card className="border-dashed" data-testid="card-manual-amend">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> Set exact balance (manual fix)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter the balance the user should see. The selected club is just where the audit entry gets tagged. Writes independent corrective amounts to BOTH the credit ledger and the wallets table so each side lands exactly on target — closes any past drift in one click.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Club</Label>
                    <Select value={amendClubId} onValueChange={setAmendClubId}>
                      <SelectTrigger data-testid="select-amend-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const balanceMap = new Map(balances.map(b => [b.clubId, b]));
                          const inScope = (cid: number) => wallet?.isGlobal || (Array.isArray(wallet?.allowedClubIds) && wallet.allowedClubIds.includes(cid));
                          const candidateIds = new Set<number>();
                          balances.forEach(b => { if (inScope(b.clubId)) candidateIds.add(b.clubId); });
                          (clubs || []).forEach((c: any) => { if (inScope(c.id)) candidateIds.add(c.id); });
                          return Array.from(candidateIds).map(cid => {
                            const existing = balanceMap.get(cid);
                            const name = existing?.clubName || (clubs || []).find((c: any) => c.id === cid)?.name || `Club #${cid}`;
                            const bal = existing?.balance ?? 0;
                            return (
                              <SelectItem key={cid} value={String(cid)}>
                                {name} (£{(bal / 100).toFixed(2)}{!existing ? " · no history" : ""})
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Target balance (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amendTarget}
                      onChange={(e) => setAmendTarget(e.target.value)}
                      placeholder="e.g. 20.00"
                      data-testid="input-amend-target"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason (optional)</Label>
                    <Input
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      placeholder="Manual fix"
                      data-testid="input-amend-reason"
                    />
                  </div>
                </div>
                {canSubmit && delta !== null && (
                  <div className="text-xs rounded-md border bg-muted/40 p-2" data-testid="text-amend-preview">
                    Will record <strong>{delta >= 0 ? "+" : ""}£{(delta / 100).toFixed(2)}</strong> against{" "}
                    <strong>{balances.find(b => b.clubId === Number(amendClubId))?.clubName || "selected club"}</strong>{" "}
                    so the user's balance moves £{(walletBalance / 100).toFixed(2)} → £{((targetPence ?? 0) / 100).toFixed(2)}.
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!canSubmit || setBalanceMutation.isPending}
                    onClick={() => setConfirmOpen(true)}
                    data-testid="button-amend-balance"
                  >
                    <Sliders className="h-4 w-4 mr-1" /> Set balance
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Unified history (matches user's profile) */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Transactions ({history.length}) · same feed as the user's profile
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">No transactions yet.</p>
              ) : (
                <div className="overflow-auto max-h-[40vh] border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/40 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Source</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Club</TableHead>
                        <TableHead className="text-xs">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((tx: any) => (
                        <TableRow key={tx.id} data-testid={`row-unified-tx-${tx.id}`}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${tx.source === "reward" ? "text-amber-600 border-amber-300" : "text-blue-600 border-blue-300"}`}>
                              {tx.source}
                            </Badge>
                          </TableCell>
                          <TableCell className={`font-semibold text-sm ${tx.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {tx.amount >= 0 ? "+" : ""}£{(Math.abs(tx.amount) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs">{tx.clubName || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={tx.reason}>
                            {tx.sessionTitle ? `Session: ${tx.sessionTitle} · ` : ""}{tx.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md" data-testid="modal-confirm-amend">
            <DialogHeader>
              <DialogTitle>Confirm balance change</DialogTitle>
              <DialogDescription>
                Set the user's balance to <strong>£{((targetPence ?? 0) / 100).toFixed(2)}</strong>
                {" "}(wallet shifts {delta !== null && delta >= 0 ? "+" : ""}£{((delta ?? 0) / 100).toFixed(2)}).
                Audit entry tagged on <strong>{balances.find(b => b.clubId === Number(amendClubId))?.clubName || "selected club"}</strong>.
                Reconciles credit ledger and wallets table to the same value.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} data-testid="button-cancel-amend">Cancel</Button>
              <Button
                disabled={setBalanceMutation.isPending || !canSubmit}
                onClick={() => setBalanceMutation.mutate({
                  clubId: Number(amendClubId),
                  targetBalance: targetPence!,
                  reason: amendReason || undefined,
                })}
                data-testid="button-confirm-amend"
              >
                {setBalanceMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sliders className="h-4 w-4 mr-1" />}
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

export default function WalletManagement() {
  const { toast } = useToast();
  const [walletSearch, setWalletSearch] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [editWallet, setEditWallet] = useState<any>(null);
  const [fundsModalOpen, setFundsModalOpen] = useState(false);
  const [fundsWallet, setFundsWallet] = useState<any>(null);
  const [fundsMode, setFundsMode] = useState<"add" | "remove">("add");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txWallet, setTxWallet] = useState<any>(null);

  const { data: clubs } = useQuery<any[]>({ queryKey: ["/api/clubs"] });

  const { data: allWallets, isLoading: walletsLoading } = useQuery<any[]>({
    queryKey: ["/api/god-mode/wallets"],
  });

  const filteredWallets = useMemo(() => {
    if (!allWallets) return [];
    if (!walletSearch) return allWallets;
    const q = walletSearch.toLowerCase();
    return allWallets.filter((w: any) =>
      w.userName?.toLowerCase().includes(q) || w.userEmail?.toLowerCase().includes(q) || w.name?.toLowerCase().includes(q)
    );
  }, [allWallets, walletSearch]);

  const lowBalanceWallets = useMemo(() => {
    if (!allWallets) return [];
    return allWallets.filter((w: any) => w.isActive && w.balance <= (w.lowBalanceThreshold || 500));
  }, [allWallets]);

  const { data: allUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: walletModalOpen,
  });

  const createWalletMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/god-mode/wallets", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wallet Created" });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      setWalletModalOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ walletId, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/god-mode/wallets/${walletId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Wallet Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      setWalletModalOpen(false);
      setEditWallet(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addFundsMutation = useMutation({
    mutationFn: async ({ walletId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/god-mode/wallets/${walletId}/add-funds`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Funds Added" });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      setFundsModalOpen(false);
      setFundsWallet(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeFundsMutation = useMutation({
    mutationFn: async ({ walletId, ...data }: any) => {
      const res = await apiRequest("POST", `/api/god-mode/wallets/${walletId}/remove-funds`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Funds Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      setFundsModalOpen(false);
      setFundsWallet(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const [resetWalletConfirm, setResetWalletConfirm] = useState<any>(null);

  const resetWalletMutation = useMutation({
    mutationFn: async ({ walletId }: { walletId: number }) => {
      const res = await apiRequest("POST", `/api/god-mode/wallets/${walletId}/reset`, { reason: "Wallet reset to zero by admin" });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Wallet Reset", description: `Balance reset to £0.00 (was £${((data.previousBalance || 0) / 100).toFixed(2)})` });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/credits") });
      setResetWalletConfirm(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/god-mode/wallets/migrate-credits");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Migration Complete", description: `${data.walletsCreated} wallets created, ${data.walletsUpdated} updated, ${data.skipped} already existed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/god-mode/wallets"] });
    },
    onError: (err: any) => toast({ title: "Migration Failed", description: err.message, variant: "destructive" }),
  });

  const totalBalance = useMemo(() => {
    if (!allWallets) return 0;
    return allWallets.reduce((sum: number, w: any) => sum + (w.balance || 0), 0);
  }, [allWallets]);

  const activeCount = useMemo(() => {
    if (!allWallets) return 0;
    return allWallets.filter((w: any) => w.isActive).length;
  }, [allWallets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/super-admin/god-mode">
            <Button variant="ghost" size="sm" data-testid="button-back-godmode">
              <ArrowLeft className="w-4 h-4 mr-1" /> God Mode
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-wallet-mgmt">
              <Wallet className="w-7 h-7 text-primary" />
              Wallet Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Create, manage, and monitor user wallets across all clubs</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => migrateMutation.mutate()} disabled={migrateMutation.isPending} data-testid="button-migrate-credits">
              {migrateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-1" />}
              Sync Credit Wallets
            </Button>
            <Button onClick={() => { setEditWallet(null); setWalletModalOpen(true); }} data-testid="button-create-wallet">
              <Plus className="w-4 h-4 mr-1" /> Create Wallet
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="stat-total-wallets">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Wallets</div>
              <div className="text-2xl font-bold mt-1">{allWallets?.length || 0}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-active-wallets">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active</div>
              <div className="text-2xl font-bold mt-1 text-green-600">{activeCount}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-balance">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Balance</div>
              <div className="text-2xl font-bold mt-1 flex items-center gap-1">
                <PoundSterling className="w-5 h-5" />{(totalBalance / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-low-balance">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Low Balance</div>
              <div className={`text-2xl font-bold mt-1 ${lowBalanceWallets.length > 0 ? "text-amber-600" : "text-foreground"}`}>
                {lowBalanceWallets.length}
                {lowBalanceWallets.length > 0 && <AlertTriangle className="inline w-5 h-5 ml-1.5 text-amber-500" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {lowBalanceWallets.length > 0 && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20" data-testid="alert-low-balance">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-semibold mb-2">
                <AlertTriangle className="h-4 w-4" />
                {lowBalanceWallets.length} wallet{lowBalanceWallets.length !== 1 ? "s" : ""} with low balance
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lowBalanceWallets.map((w: any) => (
                  <Badge key={w.id} variant="outline" className="text-xs border-amber-300 text-amber-600 dark:text-amber-400">
                    {w.userName} — {w.name}: £{(w.balance / 100).toFixed(2)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-wallets-table">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search wallets by user or name..." value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} className="pl-10" data-testid="input-search-wallets" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {walletsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Wallet Name</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWallets.map((w: any) => {
                      const isLow = w.isActive && w.balance <= (w.lowBalanceThreshold || 500);
                      return (
                        <TableRow key={w.id} data-testid={`row-wallet-${w.id}`}>
                          <TableCell>
                            <div className="font-medium text-sm" data-testid={`text-wallet-user-${w.id}`}>{w.userName}</div>
                            <div className="text-xs text-muted-foreground">{w.userEmail}</div>
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-wallet-name-${w.id}`}>{w.name}</TableCell>
                          <TableCell>
                            <div className={`font-semibold text-sm ${isLow ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`} data-testid={`text-wallet-balance-${w.id}`}>
                              £{(w.balance / 100).toFixed(2)}
                              {isLow && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            {w.isGlobal ? (
                              <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Globe className="h-3 w-3 mr-1" />Global</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />{w.allowedClubIds?.length || 0} club{(w.allowedClubIds?.length || 0) !== 1 ? "s" : ""}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${w.isActive ? "text-green-600 border-green-300" : "text-red-500 border-red-300"}`}>
                              {w.isActive ? "Active" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFundsWallet(w); setFundsMode("add"); setFundsModalOpen(true); }} data-testid={`button-add-funds-${w.id}`}>
                                <ArrowUpCircle className="h-3 w-3 mr-0.5 text-green-600" />Add
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFundsWallet(w); setFundsMode("remove"); setFundsModalOpen(true); }} data-testid={`button-remove-funds-${w.id}`}>
                                <ArrowDownCircle className="h-3 w-3 mr-0.5 text-red-500" />Remove
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setTxWallet(w); setTxModalOpen(true); }} data-testid={`button-view-tx-${w.id}`}>
                                <Eye className="h-3 w-3 mr-0.5" />Log
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => setResetWalletConfirm(w)} data-testid={`button-reset-wallet-${w.id}`}>
                                <RotateCcw className="h-3 w-3 mr-0.5" />Reset
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditWallet(w); setWalletModalOpen(true); }} data-testid={`button-edit-wallet-${w.id}`}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredWallets.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No wallets found. Click "Create Wallet" to get started.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {walletModalOpen && (
        <WalletEditModal
          wallet={editWallet}
          clubs={clubs || []}
          users={allUsers || []}
          open={walletModalOpen}
          onClose={() => { setWalletModalOpen(false); setEditWallet(null); }}
          onCreate={(data: any) => createWalletMutation.mutate(data)}
          onUpdate={(data: any) => updateWalletMutation.mutate(data)}
          isPending={createWalletMutation.isPending || updateWalletMutation.isPending}
        />
      )}

      {fundsModalOpen && fundsWallet && (
        <FundsModal
          wallet={fundsWallet}
          mode={fundsMode}
          clubs={clubs || []}
          open={fundsModalOpen}
          onClose={() => { setFundsModalOpen(false); setFundsWallet(null); }}
          onSubmit={(data: any) => fundsMode === "add" ? addFundsMutation.mutate(data) : removeFundsMutation.mutate(data)}
          isPending={addFundsMutation.isPending || removeFundsMutation.isPending}
        />
      )}

      {txModalOpen && txWallet && (
        <TransactionLogModal
          walletId={txWallet.id}
          wallet={txWallet}
          clubs={clubs || []}
          open={txModalOpen}
          onClose={() => { setTxModalOpen(false); setTxWallet(null); }}
        />
      )}

      <Dialog open={!!resetWalletConfirm} onOpenChange={(open) => { if (!open) setResetWalletConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Wallet</DialogTitle>
          </DialogHeader>
          {resetWalletConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will set the wallet balance to <strong>£0.00</strong> and record a reset transaction.
              </p>
              <div className="rounded-md border p-3 bg-orange-50 dark:bg-orange-950/30">
                <p className="text-sm font-medium">Current Balance: <span className="text-orange-600">£{((resetWalletConfirm.balance || 0) / 100).toFixed(2)}</span></p>
                <p className="text-xs text-muted-foreground mt-1">User ID: {resetWalletConfirm.userId}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResetWalletConfirm(null)} data-testid="button-cancel-reset-wallet">Cancel</Button>
                <Button variant="destructive" disabled={resetWalletMutation.isPending} onClick={() => resetWalletMutation.mutate({ walletId: resetWalletConfirm.id })} data-testid="button-confirm-reset-wallet">
                  {resetWalletMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                  Reset to £0.00
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

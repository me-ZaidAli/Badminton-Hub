import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Wallet as WalletIcon, Upload, Check, X, Hourglass, Copy, Banknote } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { BslSubNav } from "@/components/SubNav";
import { GlowPanel } from "./components/GlowPanel";
import { ActionButton } from "./components/ActionButton";
import { BSL } from "./components/BSLPalette";
import { useToast } from "@/hooks/use-toast";

export default function Wallet() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState(2000); // £20 default
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { data: wallet } = useQuery<any>({ queryKey: ["/api/bsl/wallet/me"] });
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });

  const topupMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("amount", String(amount));
      if (proofFile) fd.append("proof", proofFile);
      const r = await fetch("/api/bsl/wallet/topup", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/wallet/me"] });
      setShowTopup(false); setProofFile(null);
      toast({ title: "Top-up submitted", description: "Awaiting admin approval." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const balance = wallet?.balance || 0;
  const txs = wallet?.transactions || [];

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />
      <BslSubNav />
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8">
        <Link href="/bsl"><a className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-4" style={{ color: BSL.muted }}>
          <ArrowLeft className="h-3 w-3" /> Back to BSL
        </a></Link>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-8">
          BSL <span style={{ color: BSL.gold }}>Wallet</span>
        </h1>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 mb-6"
          style={{
            background: `linear-gradient(135deg, ${BSL.gold}22, hsla(222,40%,12%,0.95) 60%)`,
            border: `1px solid ${BSL.gold}55`,
            boxShadow: `0 24px 60px -20px ${BSL.gold}44`,
          }}
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: BSL.gold }} />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] mb-2 font-bold" style={{ color: BSL.gold }}>
                Available Balance
              </div>
              <motion.div
                key={balance}
                initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-5xl md:text-6xl font-black tabular-nums"
                style={{ color: BSL.text, textShadow: `0 0 40px ${BSL.gold}66` }}
                data-testid="text-balance"
              >
                £{(balance / 100).toFixed(2)}
              </motion.div>
              <div className="text-xs mt-2" style={{ color: BSL.muted }}>For league entry, kit, food & drink at the venue.</div>
            </div>
            <WalletIcon className="h-10 w-10" style={{ color: BSL.gold }} />
          </div>
          <div className="mt-5 flex gap-3">
            <ActionButton variant="gold" onClick={() => setShowTopup(true)} icon={<Plus className="h-4 w-4" />}>Top Up</ActionButton>
          </div>
        </motion.div>

        {/* Transactions */}
        <GlowPanel title="Transactions" subtitle={`${txs.length} total`} tone="cyan">
          {txs.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>
              No transactions yet. Top up to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {txs.map((tx: any) => {
                const isCredit = tx.type === "TOPUP";
                const tone = tx.status === "APPROVED" ? BSL.success : tx.status === "REJECTED" ? BSL.danger : BSL.gold;
                const Icon = tx.status === "APPROVED" ? Check : tx.status === "REJECTED" ? X : Hourglass;
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-3 py-3 rounded-lg" style={{ background: "hsla(0,0%,100%,0.03)" }} data-testid={`tx-${tx.id}`}>
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${tone}22`, color: tone }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{tx.description || tx.type}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>
                        {tx.reference} · {tx.status}
                      </div>
                    </div>
                    <div className="text-base font-black tabular-nums" style={{ color: isCredit ? BSL.success : BSL.danger }}>
                      {isCredit ? "+" : "−"}£{(tx.amount / 100).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlowPanel>
      </div>

      {/* Top-up modal */}
      <AnimatePresence>
        {showTopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "hsla(222, 60%, 4%, 0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowTopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: BSL.card, border: `1px solid ${BSL.gold}55`, boxShadow: `0 32px 80px -20px ${BSL.gold}44` }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid hsla(0,0%,100%,0.08)` }}>
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" style={{ color: BSL.gold }} />
                  <span className="font-bold uppercase tracking-widest text-sm">Top Up Wallet</span>
                </div>
                <button onClick={() => setShowTopup(false)} className="p-1 rounded hover:bg-white/10" data-testid="button-close-topup">
                  <X className="h-4 w-4" style={{ color: BSL.muted }} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold mb-2 block" style={{ color: BSL.muted }}>Amount (£)</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[1000, 2000, 5000, 10000].map(v => (
                      <button key={v} onClick={() => setAmount(v)}
                        className="px-3 py-2 rounded-lg text-sm font-bold transition-all"
                        style={{
                          background: amount === v ? `${BSL.gold}22` : "hsla(0,0%,100%,0.04)",
                          border: `1px solid ${amount === v ? BSL.gold : "hsla(0,0%,100%,0.1)"}`,
                          color: amount === v ? BSL.gold : BSL.text,
                        }}
                        data-testid={`amount-${v}`}>
                        £{v / 100}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={100}
                    value={amount / 100}
                    onChange={e => setAmount(Math.max(100, Math.round(Number(e.target.value) * 100)))}
                    className="w-full px-4 py-3 rounded-lg text-white outline-none"
                    style={{ background: "hsla(0,0%,100%,0.05)", border: `1px solid hsla(0,0%,100%,0.15)` }}
                    data-testid="input-topup-amount"
                  />
                </div>
                <div className="rounded-xl p-3" style={{ background: `${BSL.cyan}10`, border: `1px solid ${BSL.cyan}33` }}>
                  <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: BSL.cyan }}>Bank Details</div>
                  {[
                    ["Account", league?.bankAccountName],
                    ["Sort", league?.bankSortCode],
                    ["Number", league?.bankAccountNumber],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between text-xs py-1">
                      <span style={{ color: BSL.muted }}>{k}</span>
                      <span className="font-mono font-bold flex items-center gap-1.5">
                        {v}
                        <button onClick={() => navigator.clipboard.writeText(String(v))}><Copy className="h-3 w-3" style={{ color: BSL.cyan }} /></button>
                      </span>
                    </div>
                  ))}
                </div>
                <label className="block">
                  <input type="file" accept="image/*" hidden onChange={e => setProofFile(e.target.files?.[0] || null)} data-testid="input-topup-proof" />
                  <div className="h-28 rounded-xl flex flex-col items-center justify-center cursor-pointer"
                    style={{ background: "hsla(0,0%,100%,0.04)", border: `2px dashed hsla(0,0%,100%,0.2)` }}>
                    {proofFile ? (
                      <div className="text-center">
                        <Check className="h-6 w-6 mx-auto mb-1" style={{ color: BSL.success }} />
                        <div className="text-xs font-semibold">{proofFile.name}</div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mb-1" style={{ color: BSL.cyan }} />
                        <div className="text-xs" style={{ color: BSL.muted }}>Upload bank confirmation</div>
                      </>
                    )}
                  </div>
                </label>
                <ActionButton variant="gold" fullWidth onClick={() => topupMutation.mutate()} loading={topupMutation.isPending} disabled={!amount}>
                  Submit Top-Up
                </ActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

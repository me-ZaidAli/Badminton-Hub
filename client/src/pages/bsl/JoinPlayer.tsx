import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Copy, Hash, Upload, Hourglass, Banknote, Users, Sparkles } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { GlowPanel } from "./components/GlowPanel";
import { ActionButton } from "./components/ActionButton";
import { BSL } from "./components/BSLPalette";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const STEPS = ["code", "team", "payment", "proof", "done"] as const;

export default function JoinPlayer() {
  const [, setLoc] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<typeof STEPS[number]>("code");
  const [code, setCode] = useState("");
  const [validatedClub, setValidatedClub] = useState<any>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [createdPlayer, setCreatedPlayer] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const { data: clubTeams = [] } = useQuery<any[]>({
    queryKey: ["/api/bsl/clubs", validatedClub?.id, "teams"],
    enabled: !!validatedClub?.id,
    queryFn: async () => {
      const r = await fetch(`/api/bsl/clubs/${validatedClub.id}/teams`, { credentials: "include" });
      return r.json();
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/bsl/clubs", { credentials: "include" });
      const list = await r.json();
      const found = (list as any[]).find(c => c.inviteCode === code.toUpperCase() && c.status === "ACTIVE");
      if (!found) throw new Error("Invalid invite code");
      return found;
    },
    onSuccess: (club) => { setValidatedClub(club); setStep("team"); },
    onError: (e: any) => toast({ title: "Invalid code", description: e.message, variant: "destructive" }),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/bsl/players/join", { inviteCode: code.toUpperCase(), teamId });
      return r.json();
    },
    onSuccess: (player) => { setCreatedPlayer(player); setStep("payment"); qc.invalidateQueries({ queryKey: ["/api/bsl/players/me"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const proofMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile || !createdPlayer) throw new Error("Missing");
      const fd = new FormData();
      fd.append("proof", proofFile);
      const r = await fetch(`/api/bsl/players/${createdPlayer.id}/payment-proof`, { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (p) => { setCreatedPlayer(p); setStep("done"); qc.invalidateQueries({ queryKey: ["/api/bsl/players/me"] }); },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-8">
        <Link href="/bsl"><a className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-4" style={{ color: BSL.muted }}>
          <ArrowLeft className="h-3 w-3" /> Back to BSL
        </a></Link>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-2">
          Join as <span style={{ color: BSL.cyan }}>Player</span>
        </h1>
        <p className="text-sm mb-8" style={{ color: BSL.muted }}>
          Enter your club's invite code, pick your team, pay the £{((league?.playerFee || 0) / 100).toFixed(0)} player fee.
        </p>

        <GlowPanel title={
          step === "code" ? "Invite Code" :
          step === "team" ? "Pick Your Team" :
          step === "payment" ? "Bank Transfer" :
          step === "proof" ? "Upload Proof" : "Pending"
        } tone="cyan">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === "code" && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: BSL.muted }}>Get this 10-character code from your club captain.</p>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: BSL.cyan }} />
                    <input
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXYYYY"
                      className="w-full pl-12 pr-4 py-4 rounded-lg font-mono text-lg tracking-[0.4em] text-white placeholder-white/20 outline-none uppercase"
                      style={{ background: "hsla(0,0%,100%,0.05)", border: `1px solid ${BSL.cyan}55` }}
                      maxLength={12}
                      data-testid="input-invite-code"
                    />
                  </div>
                  <ActionButton variant="cyan" fullWidth onClick={() => validateMutation.mutate()} loading={validateMutation.isPending} disabled={code.length < 6}>
                    Validate Code
                  </ActionButton>
                </div>
              )}
              {step === "team" && validatedClub && (
                <div className="space-y-4">
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: `${BSL.cyan}10`, border: `1px solid ${BSL.cyan}33` }}>
                    <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center text-xs font-black"
                      style={{ background: `${BSL.cyan}22`, color: BSL.cyan }}>
                      {validatedClub.logoUrl ? <img src={validatedClub.logoUrl} className="h-full w-full object-cover" alt={validatedClub.name} /> : validatedClub.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold">{validatedClub.name}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>{validatedClub.division}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clubTeams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTeamId(t.id)}
                        className="rounded-xl px-4 py-4 text-left transition-all"
                        style={{
                          background: teamId === t.id ? `${BSL.cyan}22` : "hsla(0,0%,100%,0.04)",
                          border: `1px solid ${teamId === t.id ? BSL.cyan : "hsla(0,0%,100%,0.1)"}`,
                        }}
                        data-testid={`team-${t.id}`}
                      >
                        <Users className="h-4 w-4 mb-2" style={{ color: teamId === t.id ? BSL.cyan : BSL.muted }} />
                        <div className="font-bold">{t.name}</div>
                        <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>{t.division}</div>
                      </button>
                    ))}
                  </div>
                  <ActionButton variant="cyan" fullWidth onClick={() => joinMutation.mutate()} loading={joinMutation.isPending} disabled={!teamId} icon={<ArrowRight className="h-4 w-4" />}>
                    Confirm Team
                  </ActionButton>
                </div>
              )}
              {step === "payment" && createdPlayer && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4" style={{ background: `${BSL.cyan}10`, border: `1px solid ${BSL.cyan}55` }}>
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: BSL.cyan }}>Bank Transfer Details</div>
                    {[
                      ["Account Name", league?.bankAccountName],
                      ["Sort Code", league?.bankSortCode],
                      ["Account Number", league?.bankAccountNumber],
                      ["Amount", `£${((league?.playerFee || 0) / 100).toFixed(2)}`],
                      ["Reference", createdPlayer.paymentReference],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "hsla(0,0%,100%,0.05)" }}>
                        <span className="text-xs uppercase tracking-widest" style={{ color: BSL.muted }}>{k}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold" data-testid={`bank-${k}`}>{v}</span>
                          <button onClick={() => navigator.clipboard.writeText(String(v))} className="p-1 rounded hover:bg-white/10">
                            <Copy className="h-3 w-3" style={{ color: BSL.cyan }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ActionButton variant="cyan" fullWidth onClick={() => setStep("proof")} icon={<Check className="h-4 w-4" />}>
                    I Have Paid
                  </ActionButton>
                </div>
              )}
              {step === "proof" && (
                <div className="space-y-4">
                  <label className="block">
                    <input type="file" accept="image/*" hidden onChange={e => setProofFile(e.target.files?.[0] || null)} data-testid="input-player-proof" />
                    <div className="h-44 rounded-xl flex flex-col items-center justify-center cursor-pointer"
                      style={{ background: "hsla(0,0%,100%,0.04)", border: `2px dashed hsla(0,0%,100%,0.2)` }}>
                      {proofFile ? (
                        <div className="text-center">
                          <Check className="h-10 w-10 mx-auto mb-2" style={{ color: BSL.success }} />
                          <div className="text-sm font-semibold">{proofFile.name}</div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mb-2" style={{ color: BSL.cyan }} />
                          <div className="text-sm" style={{ color: BSL.muted }}>Upload payment confirmation</div>
                        </>
                      )}
                    </div>
                  </label>
                  <ActionButton variant="cyan" fullWidth onClick={() => proofMutation.mutate()} loading={proofMutation.isPending} disabled={!proofFile}>
                    Submit Proof
                  </ActionButton>
                </div>
              )}
              {step === "done" && (
                <div className="text-center py-6 space-y-4">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="h-20 w-20 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${BSL.cyan}, ${BSL.cyanDim})`, boxShadow: `0 0 48px ${BSL.cyan}88` }}
                  >
                    <Hourglass className="h-10 w-10" style={{ color: "hsl(222,50%,8%)" }} />
                  </motion.div>
                  <div className="text-2xl font-black uppercase">You're In Queue</div>
                  <p className="text-sm" style={{ color: BSL.muted }}>
                    We'll verify your payment shortly. You'll then be marked ACTIVE and able to top up your wallet.
                  </p>
                  <Link href="/bsl/wallet"><a><ActionButton variant="cyan" icon={<Sparkles className="h-4 w-4" />}>Open Wallet</ActionButton></a></Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </GlowPanel>
      </div>
    </div>
  );
}

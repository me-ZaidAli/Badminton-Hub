import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, User as UserIcon, Save, Wallet as WalletIcon, Check, Plus, X } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { GlowPanel } from "./components/GlowPanel";
import { ActionButton } from "./components/ActionButton";
import { BSL } from "./components/BSLPalette";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["MD", "WD", "XD"] as const;
const CAT_LABEL: Record<string, string> = { MD: "Men's Doubles", WD: "Women's Doubles", XD: "Mixed Doubles" };

export default function PlayerProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me, isLoading } = useQuery<any>({ queryKey: ["/api/bsl/players/me"] });
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName || "");
      setBio(me.bio || "");
      setDirty(false);
    }
  }, [me?.id]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PATCH", "/api/bsl/players/me", { displayName, bio });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/players/me"] }); setDirty(false); toast({ title: "Profile saved" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const registerCat = useMutation({
    mutationFn: async (category: string) => {
      const r = await apiRequest("POST", "/api/bsl/players/me/categories", { category });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bsl/players/me"] });
      qc.invalidateQueries({ queryKey: ["/api/bsl/wallet/me"] });
      toast({ title: "Registered for category" });
    },
    onError: (e: any) => toast({ title: "Cannot register", description: e.message, variant: "destructive" }),
  });

  const unregisterCat = useMutation({
    mutationFn: async (category: string) => {
      const r = await apiRequest("DELETE", `/api/bsl/players/me/categories/${category}`);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bsl/players/me"] }); toast({ title: "Unregistered (no automatic refund)" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen text-white" style={{ background: BSL.bgDeep }}>
        <BSLBackground />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center" style={{ color: BSL.muted }}>Loading…</div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen text-white" style={{ background: BSL.bgDeep }}>
        <BSLBackground />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <BackBar />
          <GlowPanel title="No BSL profile yet" tone="cyan" icon={<UserIcon className="h-4 w-4" />}>
            <p className="text-sm mb-4" style={{ color: BSL.muted }}>You haven't joined a BSL club yet.</p>
            <Link href="/bsl/join"><ActionButton variant="cyan">Join via invite code</ActionButton></Link>
          </GlowPanel>
        </div>
      </div>
    );
  }

  const fees = (league?.categoryFees || {}) as Record<string, number>;
  const playerFee = league?.playerFee ?? 2500;
  const myCats: string[] = me.categories || [];
  const balance: number = me.walletBalance ?? 0;

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <BackBar />

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs uppercase tracking-widest" style={{ color: BSL.cyan }}>BSL Profile</div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
            My <span style={{ color: BSL.gold }}>Player Card</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: BSL.muted }}>
            Status: <span style={{ color: me.status === "ACTIVE" ? BSL.success : BSL.gold }} data-testid="text-player-status">{me.status}</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Profile editor */}
          <GlowPanel title="Display name & bio" tone="cyan" icon={<UserIcon className="h-4 w-4" />}>
            <Field label="Display name (shown on the leaderboard)">
              <input value={displayName} onChange={e => { setDisplayName(e.target.value); setDirty(true); }}
                maxLength={80} placeholder="e.g. The Smasher"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                data-testid="input-display-name" />
            </Field>
            <Field label="Bio">
              <textarea value={bio} onChange={e => { setBio(e.target.value); setDirty(true); }}
                maxLength={600} rows={4} placeholder="Tell other players about yourself…"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: BSL.cardSoft, border: `1px solid ${BSL.border}`, color: "white" }}
                data-testid="input-bio" />
            </Field>
            <div className="text-right mt-3">
              <ActionButton variant="gold" onClick={() => saveProfile.mutate()} disabled={!dirty || saveProfile.isPending} icon={<Save className="h-3 w-3" />} testid="button-save-profile">
                {saveProfile.isPending ? "Saving…" : "Save profile"}
              </ActionButton>
            </div>
          </GlowPanel>

          {/* Wallet snapshot */}
          <GlowPanel title="Wallet" tone="gold" icon={<WalletIcon className="h-4 w-4" />}>
            <div className="text-center py-3">
              <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>Balance</div>
              <div className="text-4xl font-black mt-1" style={{ color: BSL.gold }} data-testid="text-wallet-balance">
                £{(balance / 100).toFixed(2)}
              </div>
            </div>
            <Link href="/bsl/wallet">
              <ActionButton variant="cyan" testid="button-go-wallet">Top up · view transactions</ActionButton>
            </Link>
          </GlowPanel>
        </div>

        {/* Category registration */}
        <GlowPanel title="Compete in categories" tone="gold" icon={<Plus className="h-4 w-4" />}>
          <p className="text-xs mb-1" style={{ color: BSL.muted }}>
            Each category has its own fee — debited from your BSL wallet on registration. Your club owner places you in a pair after you register.
          </p>
          <div className="text-[11px] mb-4 flex flex-wrap gap-x-3 gap-y-1" style={{ color: BSL.cyan }}>
            <span>Multi-category loyalty:</span>
            <span><span style={{ color: BSL.gold }}>1st</span> full price</span>
            <span><span style={{ color: BSL.gold }}>2nd</span> 50% off</span>
            <span><span style={{ color: BSL.gold }}>3rd</span> 70% off</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => {
              const baseFee = Number.isFinite(fees[cat]) ? fees[cat] : playerFee;
              const registered = myCats.includes(cat);
              // Discount tier is decided by how many cats the player will have
              // *before* this registration. Mirrors the server's SQL CASE.
              const tierCount = myCats.length;
              const fee = registered ? baseFee : tierCount === 0 ? baseFee : tierCount === 1 ? Math.floor(baseFee * 50 / 100) : Math.floor(baseFee * 30 / 100);
              const discountPct = !registered && tierCount > 0 ? (tierCount === 1 ? 50 : 70) : 0;
              const canAfford = balance >= fee;
              return (
                <div key={cat} className="rounded-xl p-4 relative overflow-hidden"
                  style={{
                    background: registered ? `${BSL.gold}15` : BSL.cardSoft,
                    border: `1px solid ${registered ? BSL.gold : BSL.border}`,
                  }}
                  data-testid={`card-category-${cat}`}>
                  {registered && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                      style={{ background: BSL.gold, color: "#1a1300" }}>
                      <Check className="h-3 w-3" /> Active
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-widest" style={{ color: BSL.cyan }}>{cat}</div>
                  <div className="text-sm font-bold mt-0.5">{CAT_LABEL[cat]}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <div className="text-2xl font-black" style={{ color: registered ? BSL.gold : "white" }}>
                      £{(fee / 100).toFixed(2)}
                    </div>
                    {discountPct > 0 && (
                      <>
                        <div className="text-xs line-through" style={{ color: BSL.muted }}>£{(baseFee / 100).toFixed(2)}</div>
                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${BSL.cyan}22`, color: BSL.cyan }}>−{discountPct}%</div>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] mb-3" style={{ color: BSL.muted }}>
                    one-off, per season{discountPct > 0 ? " · multi-cat discount applied" : ""}
                  </div>
                  {registered ? (
                    <ActionButton variant="ghost" onClick={() => unregisterCat.mutate(cat)} disabled={unregisterCat.isPending} icon={<X className="h-3 w-3" />} testid={`button-unregister-${cat}`}>
                      Unregister
                    </ActionButton>
                  ) : (
                    <ActionButton variant="gold" onClick={() => registerCat.mutate(cat)} disabled={registerCat.isPending || !canAfford || me.status !== "ACTIVE"} icon={<Plus className="h-3 w-3" />} testid={`button-register-${cat}`}>
                      {me.status !== "ACTIVE" ? "Pay league fee first" : !canAfford ? "Top up first" : "Register"}
                    </ActionButton>
                  )}
                </div>
              );
            })}
          </div>
        </GlowPanel>
      </div>
    </div>
  );
}

function BackBar() {
  return (
    <Link href="/bsl">
      <a className="inline-flex items-center gap-1.5 text-xs hover:opacity-80" style={{ color: BSL.muted }} data-testid="link-back-bsl">
        <ArrowLeft className="h-3 w-3" /> Back to BSL hub
      </a>
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

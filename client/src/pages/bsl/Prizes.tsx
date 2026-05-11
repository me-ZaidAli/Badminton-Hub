import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Sparkles, Lock, Gem, Star, Zap, ChevronLeft, Settings2 } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { BSL } from "./components/BSLPalette";
import { ActionButton } from "./components/ActionButton";
import { useUser } from "@/hooks/use-auth";

type Prize = {
  id: number;
  division: string | null;
  category: string | null;
  rank: number;
  tier: string;
  title: string;
  subtitle: string | null;
  prizeText: string;
  prizeAmountPence: number | null;
  isPublished: boolean;
  sortOrder: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  MD: "Men's Doubles", WD: "Women's Doubles", XD: "Mixed Doubles",
  MS1: "Men's Singles 1", MS2: "Men's Singles 2", WS: "Women's Singles",
};

// Tier definitions — locked to BSL palette family but with rich gradient surfaces.
const TIER: Record<string, { from: string; to: string; ring: string; glow: string; chip: string; label: string; icon: any }> = {
  DIAMOND:  { from: "hsl(195,100%,72%)", to: "hsl(210,90%,52%)", ring: "hsl(195,100%,80%)", glow: "hsla(195,100%,60%,0.55)", chip: "hsl(195,100%,90%)", label: "DIAMOND",  icon: Gem },
  PLATINUM: { from: "hsl(210,30%,88%)",  to: "hsl(220,30%,55%)", ring: "hsl(210,40%,90%)",  glow: "hsla(210,40%,80%,0.45)",  chip: "hsl(210,30%,95%)", label: "PLATINUM", icon: Sparkles },
  GOLD:     { from: "hsl(48,100%,68%)",  to: "hsl(36,90%,42%)",  ring: "hsl(48,100%,75%)",  glow: "hsla(42,95%,55%,0.55)",   chip: "hsl(48,100%,90%)", label: "GOLD",     icon: Crown },
  SILVER:   { from: "hsl(220,15%,82%)",  to: "hsl(220,15%,55%)", ring: "hsl(220,15%,86%)",  glow: "hsla(220,15%,75%,0.45)",  chip: "hsl(220,15%,92%)", label: "SILVER",   icon: Medal },
  BRONZE:   { from: "hsl(28,80%,62%)",   to: "hsl(20,75%,38%)",  ring: "hsl(28,80%,70%)",   glow: "hsla(28,80%,55%,0.45)",   chip: "hsl(28,80%,88%)",  label: "BRONZE",   icon: Medal },
  MYTHIC:   { from: "hsl(280,90%,70%)",  to: "hsl(320,80%,45%)", ring: "hsl(290,90%,75%)",  glow: "hsla(290,90%,65%,0.55)",  chip: "hsl(290,80%,92%)", label: "MYTHIC",   icon: Star },
  EPIC:     { from: "hsl(160,80%,55%)",  to: "hsl(180,90%,40%)", ring: "hsl(170,90%,65%)",  glow: "hsla(170,90%,55%,0.50)",  chip: "hsl(170,80%,90%)", label: "EPIC",     icon: Zap },
};

function tierOf(t: string) { return TIER[t?.toUpperCase()] || TIER.GOLD; }
function moneyGBP(p: number | null) { return p == null ? null : `£${(p / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`; }

export default function BslPrizes() {
  const { data: user } = useUser();
  const isAdmin = (user as any)?.role === "OWNER" || (user as any)?.role === "ADMIN";
  const { data: prizes = [], isLoading } = useQuery<Prize[]>({ queryKey: ["/api/bsl/prizes"] });
  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });

  // Group by division → category
  const grouped = useMemo(() => {
    const byDiv = new Map<string, Map<string, Prize[]>>();
    for (const p of prizes) {
      const d = p.division || "Overall";
      const c = p.category || "OPEN";
      if (!byDiv.has(d)) byDiv.set(d, new Map());
      const dm = byDiv.get(d)!;
      if (!dm.has(c)) dm.set(c, []);
      dm.get(c)!.push(p);
    }
    // Sort categories' prizes by rank, sortOrder
    for (const dm of byDiv.values()) {
      for (const arr of dm.values()) arr.sort((a, b) => a.rank - b.rank || a.sortOrder - b.sortOrder);
    }
    return byDiv;
  }, [prizes]);

  // Compute totals for hero
  const totals = useMemo(() => {
    const total = prizes.reduce((s, p) => s + (p.prizeAmountPence || 0), 0);
    return { total, count: prizes.length, divisions: grouped.size };
  }, [prizes, grouped]);

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <Link href="/bsl">
          <a className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] mb-5" style={{ color: BSL.muted }} data-testid="link-back">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to BSL
          </a>
        </Link>

        {/* === HERO === */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10"
          style={{
            background: `
              radial-gradient(80% 60% at 80% 0%, hsla(42,95%,55%,0.28), transparent 60%),
              radial-gradient(70% 60% at 0% 100%, hsla(195,100%,60%,0.22), transparent 60%),
              linear-gradient(140deg, hsla(222,55%,12%,0.95), hsla(222,75%,5%,0.98))`,
            border: `1px solid ${BSL.gold}55`,
            boxShadow: `0 32px 80px hsla(222,80%,2%,0.6), inset 0 1px 0 hsla(0,0%,100%,0.06)`,
          }}
          data-testid="hero-prizes"
        >
          {/* Floating rotating trophy */}
          <motion.div
            className="absolute -top-12 -right-12 md:-top-20 md:-right-20 pointer-events-none"
            animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="rounded-full"
              style={{
                width: 360, height: 360,
                background: `radial-gradient(circle at 30% 30%, ${BSL.gold}, transparent 60%)`,
                filter: "blur(20px)", opacity: 0.45,
              }}
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.9, type: "spring" }}
            className="absolute top-4 right-4 md:top-8 md:right-10 hidden sm:block pointer-events-none"
          >
            <Trophy className="h-24 md:h-44 w-24 md:w-44" style={{ color: BSL.gold, filter: `drop-shadow(0 0 32px ${BSL.gold}) drop-shadow(0 0 64px hsla(42,95%,55%,0.45))` }} />
          </motion.div>

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-[0.32em] px-2.5 py-1 rounded-full"
              style={{ background: `${BSL.gold}22`, color: BSL.gold, border: `1px solid ${BSL.gold}55` }}>
              <Sparkles className="h-3 w-3" /> Season {league?.name ? "·" : ""} {league?.name || "Birmingham Super League"}
            </span>
            <h1 className="mt-3 text-4xl md:text-6xl font-black uppercase leading-[0.95] tracking-tight">
              YEAR-END
              <span className="block" style={{ background: `linear-gradient(90deg, ${BSL.gold}, ${BSL.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PRIZE VAULT</span>
            </h1>
            <p className="mt-3 text-sm md:text-base max-w-xl" style={{ color: BSL.muted }}>
              Battle through the season — every division and every category has its own glowing tier of rewards waiting at the finish line.
            </p>

            {/* Stat strip */}
            <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3 max-w-lg">
              {[
                { v: totals.total ? moneyGBP(totals.total) : "—", l: "Prize Pool", c: BSL.gold },
                { v: totals.divisions || "—", l: "Divisions", c: BSL.cyan },
                { v: totals.count || "—", l: "Reward Tiers", c: BSL.gold },
              ].map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                  className="rounded-xl px-3 py-2.5 backdrop-blur-md"
                  style={{ background: `linear-gradient(140deg, hsla(0,0%,100%,0.06), hsla(0,0%,100%,0.02))`, border: `1px solid hsla(0,0%,100%,0.10)` }}
                >
                  <div className="text-xl md:text-2xl font-black tabular-nums" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: BSL.muted }}>{s.l}</div>
                </motion.div>
              ))}
            </div>

            {isAdmin && (
              <div className="mt-6">
                <Link href="/bsl/admin/prizes">
                  <a><ActionButton variant="cyan" icon={<Settings2 className="h-4 w-4" />}>Manage prizes</ActionButton></a>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* === DIVISIONS === */}
        {isLoading ? (
          <div className="mt-10 text-center text-sm" style={{ color: BSL.muted }}>Loading prize vault…</div>
        ) : grouped.size === 0 ? (
          <EmptyState isAdmin={isAdmin} />
        ) : (
          <div className="mt-10 space-y-12">
            {[...grouped.entries()].map(([division, cats], di) => (
              <DivisionSection key={division} division={division} cats={cats} index={di} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DivisionSection({ division, cats, index }: { division: string; cats: Map<string, Prize[]>; index: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      data-testid={`section-division-${division.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Division banner */}
      <div className="relative mb-5 overflow-hidden rounded-2xl px-5 py-4 md:px-7 md:py-5"
        style={{
          background: `linear-gradient(90deg, hsla(195,100%,60%,0.18), hsla(42,95%,55%,0.12))`,
          border: `1px solid hsla(195,100%,60%,0.30)`,
        }}>
        <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(180deg, ${BSL.cyan}, ${BSL.gold})` }} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.32em]" style={{ color: BSL.cyan }}>Division</div>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{division}</h2>
          </div>
          <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full"
            style={{ background: `${BSL.gold}1a`, color: BSL.gold, border: `1px solid ${BSL.gold}55` }}>
            {cats.size} {cats.size === 1 ? "category" : "categories"}
          </div>
        </div>
      </div>

      {/* Per-category groups */}
      <div className="space-y-8">
        {[...cats.entries()].map(([cat, prizes], ci) => (
          <CategoryGroup key={cat} cat={cat} prizes={prizes} index={ci} />
        ))}
      </div>
    </motion.section>
  );
}

function CategoryGroup({ cat, prizes, index }: { cat: string; prizes: Prize[]; index: number }) {
  const label = CATEGORY_LABEL[cat] || cat;
  return (
    <div data-testid={`group-category-${cat.toLowerCase()}`}>
      <div className="flex items-baseline justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[10px] font-black"
            style={{ background: `${BSL.gold}22`, color: BSL.gold, border: `1px solid ${BSL.gold}55` }}>{cat}</span>
          <h3 className="text-lg md:text-xl font-bold uppercase tracking-wider">{label}</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: BSL.muted }}>{prizes.length} {prizes.length === 1 ? "tier" : "tiers"}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {prizes.map((p, i) => <PrizeCard key={p.id} p={p} index={i} delay={index * 0.04} />)}
      </div>
    </div>
  );
}

function PrizeCard({ p, index, delay }: { p: Prize; index: number; delay: number }) {
  const t = tierOf(p.tier);
  const Icon = t.icon;
  const isFirst = p.rank === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: delay + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(180deg, hsla(222,40%,14%,0.92), hsla(222,60%,6%,0.96))`,
        border: `1px solid ${t.ring}55`,
        boxShadow: `0 24px 60px -16px ${t.glow}, inset 0 1px 0 hsla(0,0%,100%,0.05)`,
      }}
      data-testid={`prize-card-${p.id}`}
    >
      {/* Rim glow at top */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${t.ring}, transparent)` }} />
      {/* Floating soft glow blob */}
      <motion.div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${t.from}, transparent 70%)` }}
      />

      {/* Top: rank chip + tier chip */}
      <div className="relative flex items-start justify-between p-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
          style={{ background: "hsla(0,0%,0%,0.45)", color: "white", border: "1px solid hsla(0,0%,100%,0.10)" }}>
          {isFirst && <Crown className="h-3 w-3" style={{ color: BSL.gold }} />} #{p.rank}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md"
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, color: "hsl(222,50%,8%)" }}>
          <Icon className="h-3 w-3" /> {t.label}
        </span>
      </div>

      {/* Hero badge / shield */}
      <div className="relative flex items-center justify-center py-4">
        <motion.div
          className="relative flex items-center justify-center"
          whileHover={{ rotate: [0, -6, 6, -3, 0] }}
          transition={{ duration: 0.6 }}
        >
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              width: 144, height: 144,
              background: `conic-gradient(from 90deg, ${t.from}, ${t.to}, ${t.from})`,
              filter: "blur(12px)", opacity: 0.65,
            }}
          />
          {/* Shield */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: 132, height: 132,
              background: `linear-gradient(160deg, ${t.from}, ${t.to})`,
              clipPath: "polygon(50% 0%, 100% 18%, 100% 65%, 50% 100%, 0% 65%, 0% 18%)",
              boxShadow: `inset 0 2px 0 hsla(0,0%,100%,0.35), inset 0 -8px 24px hsla(0,0%,0%,0.35)`,
            }}
          >
            <Icon className="h-14 w-14" style={{ color: "white", filter: "drop-shadow(0 4px 12px hsla(0,0%,0%,0.45))" }} />
          </div>
          {/* Sparkle dots */}
          {isFirst && (
            <>
              <motion.div className="absolute -top-2 left-4 h-1.5 w-1.5 rounded-full" style={{ background: t.chip }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.4, 0.8] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="absolute -bottom-1 right-2 h-2 w-2 rounded-full" style={{ background: t.chip }}
                animate={{ opacity: [1, 0.3, 1], scale: [1.2, 0.8, 1.2] }} transition={{ duration: 2.4, repeat: Infinity }} />
              <motion.div className="absolute top-2 -right-2 h-1 w-1 rounded-full" style={{ background: t.chip }}
                animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }} />
            </>
          )}
        </motion.div>
      </div>

      {/* Body */}
      <div className="relative px-4 pb-4 pt-2">
        <h4 className="text-base md:text-lg font-black uppercase tracking-tight leading-tight" data-testid={`text-prize-title-${p.id}`}>{p.title}</h4>
        {p.subtitle && <p className="mt-1 text-xs" style={{ color: BSL.muted }}>{p.subtitle}</p>}

        <div className="mt-3 rounded-xl p-3"
          style={{ background: "hsla(0,0%,0%,0.35)", border: `1px solid ${t.ring}33` }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: t.chip }}>Reward</div>
          <div className="text-sm font-semibold leading-snug" style={{ color: "white" }}>{p.prizeText}</div>
          {p.prizeAmountPence != null && p.prizeAmountPence > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-black tabular-nums px-2 py-0.5 rounded"
              style={{ background: `${t.from}33`, color: t.chip }}>
              {moneyGBP(p.prizeAmountPence)}
            </div>
          )}
        </div>

        {!p.isPublished && (
          <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
            style={{ background: "hsla(0,0%,0%,0.5)", color: BSL.muted, border: `1px solid hsla(0,0%,100%,0.15)` }}>
            <Lock className="h-3 w-3" /> Hidden draft
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="mt-10 text-center rounded-2xl p-10"
      style={{ background: "hsla(0,0%,100%,0.03)", border: `1px dashed hsla(0,0%,100%,0.15)` }}
    >
      <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: BSL.muted }} />
      <h3 className="text-lg font-black uppercase tracking-wider">Prize vault is empty</h3>
      <p className="text-sm mt-1" style={{ color: BSL.muted }}>The Super Admin hasn't added any year-end prizes yet.</p>
      {isAdmin && (
        <div className="mt-5">
          <Link href="/bsl/admin/prizes">
            <a><ActionButton variant="gold" icon={<Sparkles className="h-4 w-4" />}>Set up prizes</ActionButton></a>
          </Link>
        </div>
      )}
    </motion.div>
  );
}

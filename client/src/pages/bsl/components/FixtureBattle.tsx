import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, Calendar, Clock, MapPin, Swords, Trophy, ChevronRight, Users, Download, Loader2 } from "lucide-react";
import { BSL } from "./BSLPalette";

function slugify(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fixture";
}

type Player = { id: number; name: string };
type Pair = { id: number; name: string; category: string | null; members: Player[] };
type Rubber = {
  id: number;
  rubberNumber: number;
  rubberType: string;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePair: Pair | null;
  awayPair: Pair | null;
};

export interface FixtureBattleProps {
  id: number;
  status: string;
  startTime: string | Date | null;
  court: number | null;
  category: string | null;
  division: string | null;
  homeRubbers: number;
  awayRubbers: number;
  homeClubName: string;
  awayClubName: string;
  homeClubLogo: string | null;
  awayClubLogo: string | null;
  rubbers: Rubber[];
}

function statusTone(status: string) {
  if (status === "LIVE") return { color: BSL.danger, label: "● LIVE NOW", pulse: true };
  if (status === "WARMUP") return { color: BSL.cyan, label: "WARMING UP", pulse: true };
  if (status === "FINISHED") return { color: BSL.muted, label: "FULL TIME", pulse: false };
  return { color: BSL.gold, label: "UPCOMING", pulse: false };
}

function pairLabel(p: Pair | null): { line: string; names: string } {
  if (!p) return { line: "TBA", names: "Awaiting pair assignment" };
  const names = (p.members || []).map(m => m.name).filter(Boolean);
  if (names.length === 0) return { line: p.name || "TBA", names: "Players TBA" };
  return { line: p.name || "Pair", names: names.join(" & ") };
}

function ClubCrest({ name, logo, leader, side }: { name: string; logo: string | null; leader: boolean; side: "home" | "away" }) {
  const accent = side === "home" ? BSL.cyan : BSL.gold;
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "home" ? -30 : 30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-3 sm:gap-4 min-w-0 ${side === "away" ? "flex-row-reverse text-right" : ""}`}
      data-testid={`battle-${side}`}
    >
      <div
        className="relative shrink-0 h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden flex items-center justify-center text-lg sm:text-2xl font-black"
        style={{
          background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
          border: `2px solid ${leader ? BSL.gold : accent + "66"}`,
          boxShadow: leader
            ? `0 0 30px ${BSL.gold}88, inset 0 0 18px ${BSL.gold}33`
            : `0 0 22px ${accent}44, inset 0 0 12px ${accent}22`,
          color: leader ? BSL.gold : accent,
        }}
      >
        {logo ? (
          <img src={logo} alt={name} crossOrigin="anonymous" className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 2).toUpperCase()
        )}
        {leader && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ boxShadow: `inset 0 0 22px ${BSL.gold}aa` }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
      <div className={`min-w-0 ${side === "away" ? "text-right" : ""}`}>
        <div
          className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color: accent }}
        >
          {side === "home" ? "HOME" : "AWAY"}
        </div>
        <div
          className="text-base sm:text-2xl md:text-3xl font-black leading-tight tracking-tight truncate"
          style={{
            color: leader ? BSL.gold : "white",
            textShadow: leader ? `0 0 18px ${BSL.gold}88` : `0 0 12px ${accent}55`,
          }}
          data-testid={`battle-${side}-name`}
        >
          {name}
        </div>
      </div>
    </motion.div>
  );
}

function RubberRow({ r, side }: { r: Rubber; side: "home" | "away" }) {
  const homeWon = (r.homeScore || 0) > (r.awayScore || 0);
  const awayWon = (r.awayScore || 0) > (r.homeScore || 0);
  const home = pairLabel(r.homePair);
  const away = pairLabel(r.awayPair);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: r.rubberNumber * 0.04, duration: 0.4 }}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: "linear-gradient(90deg, hsla(195,80%,18%,0.18), hsla(42,70%,18%,0.18))",
        border: `1px solid hsla(0,0%,100%,0.08)`,
      }}
      data-testid={`battle-rubber-${r.rubberNumber}`}
    >
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: homeWon ? BSL.gold : BSL.cyan }}>
          {home.line}
        </div>
        <div className={`text-xs sm:text-sm font-bold truncate ${homeWon ? "text-white" : "text-white/85"}`} title={home.names} data-testid={`battle-rubber-${r.rubberNumber}-home-names`}>
          {home.names}
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 px-2 shrink-0">
        <div
          className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest tabular-nums"
          style={{
            background: `${BSL.gold}22`,
            color: BSL.gold,
            border: `1px solid ${BSL.gold}44`,
          }}
        >
          R{r.rubberNumber} · {r.rubberType}
        </div>
        {(r.homeScore != null && r.awayScore != null && (r.homeScore > 0 || r.awayScore > 0)) ? (
          <div className="flex items-center gap-1 text-base font-black tabular-nums">
            <span style={{ color: homeWon ? BSL.gold : "white" }}>{r.homeScore}</span>
            <span className="text-white/40">–</span>
            <span style={{ color: awayWon ? BSL.gold : "white" }}>{r.awayScore}</span>
          </div>
        ) : (
          <div className="text-[9px] uppercase tracking-widest" style={{ color: BSL.muted }}>vs</div>
        )}
      </div>
      <div className="min-w-0 text-right">
        <div className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: awayWon ? BSL.gold : BSL.gold + "cc" }}>
          {away.line}
        </div>
        <div className={`text-xs sm:text-sm font-bold truncate ${awayWon ? "text-white" : "text-white/85"}`} title={away.names} data-testid={`battle-rubber-${r.rubberNumber}-away-names`}>
          {away.names}
        </div>
      </div>
    </motion.div>
  );
}

export function FixtureBattle(p: FixtureBattleProps) {
  const tone = statusTone(p.status);
  const homeLeads = p.homeRubbers > p.awayRubbers;
  const awayLeads = p.awayRubbers > p.homeRubbers;
  const rubberCount = p.rubbers?.length || 0;
  const playerCount = p.rubbers.reduce((acc, r) => {
    return acc + (r.homePair?.members?.length || 0) + (r.awayPair?.members?.length || 0);
  }, 0);
  const dt = p.startTime ? new Date(p.startTime) : null;

  // Snapshot-to-PNG via html2canvas. We mark the card root with a ref and a
  // `.battle-card-capturing` class while exporting so any elements tagged
  // `data-export-hide` (footer CTA, the export button itself, animated
  // scan-light) are visually removed for a clean printable card.
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function downloadPng() {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    const root = cardRef.current;
    root.classList.add("battle-card-capturing");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(root, {
        backgroundColor: "#070c1a",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `bsl-fixture-${p.id}-${slugify(p.homeClubName)}-vs-${slugify(p.awayClubName)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("[FixtureBattle] PNG export failed", e);
    } finally {
      root.classList.remove("battle-card-capturing");
      setExporting(false);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl overflow-hidden [&.battle-card-capturing_[data-export-hide]]:!hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 0% 0%, hsla(195,80%,16%,0.42), transparent 55%), radial-gradient(120% 100% at 100% 0%, hsla(42,80%,18%,0.36), transparent 60%), linear-gradient(160deg, hsla(222,55%,8%,0.95), hsla(222,55%,4%,0.98))",
        border: `1px solid ${tone.color}66`,
        boxShadow: `0 20px 60px hsla(0,0%,0%,0.55), 0 0 0 1px ${tone.color}22, 0 0 40px ${tone.color}22`,
      }}
      data-testid={`battle-card-${p.id}`}
    >
      {/* Floating PNG export button — hidden from the captured image itself. */}
      <button
        type="button"
        onClick={downloadPng}
        disabled={exporting}
        data-export-hide
        className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest transition hover:scale-105 disabled:opacity-60"
        style={{
          background: `${BSL.gold}22`,
          color: BSL.gold,
          border: `1px solid ${BSL.gold}66`,
          boxShadow: `0 4px 14px ${BSL.gold}22`,
        }}
        title="Download fixture card as PNG"
        data-testid={`battle-${p.id}-download-png`}
      >
        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        {exporting ? "Saving…" : "PNG"}
      </button>
      {/* Animated diagonal scan-light when LIVE */}
      {p.status === "LIVE" && (
        <motion.div
          data-export-hide
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(115deg, transparent 0%, transparent 40%, hsla(0,90%,60%,0.18) 50%, transparent 60%, transparent 100%)",
          }}
          animate={{ backgroundPosition: ["-200% 0%", "200% 0%"] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Top status strip */}
      <div className="relative flex items-center justify-between px-4 sm:px-5 pt-3 sm:pt-4">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-black" style={{ color: tone.color }}>
          {tone.pulse && (
            <motion.span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: tone.color, boxShadow: `0 0 10px ${tone.color}` }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          <span>{tone.label}</span>
          {p.division && (
            <>
              <span className="text-white/30">·</span>
              <span style={{ color: BSL.muted }}>{p.division}</span>
            </>
          )}
          {p.category && (
            <>
              <span className="text-white/30">·</span>
              <span style={{ color: BSL.muted }}>{p.category}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]" style={{ color: BSL.muted }}>
          {dt && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="h-3 w-3" /> {dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
          {dt && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3 w-3" /> {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {p.court != null && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Court {p.court}
            </span>
          )}
        </div>
      </div>

      {/* Battle row */}
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5 px-4 sm:px-6 py-4 sm:py-6">
        <ClubCrest name={p.homeClubName} logo={p.homeClubLogo} leader={homeLeads} side="home" />
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 text-4xl sm:text-5xl md:text-6xl font-black tabular-nums">
            <span style={{ color: homeLeads ? BSL.gold : "white", textShadow: homeLeads ? `0 0 20px ${BSL.gold}aa` : undefined }} data-testid={`battle-${p.id}-home-score`}>
              {p.homeRubbers}
            </span>
            <motion.span
              className="text-white/50"
              animate={p.status === "LIVE" ? { scale: [1, 1.08, 1], rotate: [-2, 2, -2] } : {}}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <Swords className="h-6 w-6 sm:h-8 sm:w-8" />
            </motion.span>
            <span style={{ color: awayLeads ? BSL.gold : "white", textShadow: awayLeads ? `0 0 20px ${BSL.gold}aa` : undefined }} data-testid={`battle-${p.id}-away-score`}>
              {p.awayRubbers}
            </span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] font-bold" style={{ color: BSL.muted }}>
            Rubbers won
          </div>
        </div>
        <ClubCrest name={p.awayClubName} logo={p.awayClubLogo} leader={awayLeads} side="away" />
      </div>

      {/* Rubber breakdown — pair names */}
      {rubberCount > 0 && (
        <div className="relative border-t px-3 sm:px-4 py-3 sm:py-4 space-y-1.5 sm:space-y-2" style={{ borderColor: "hsla(0,0%,100%,0.06)" }}>
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: BSL.cyan }}>
              <Trophy className="h-3 w-3" /> Battle Card · {rubberCount} {rubberCount === 1 ? "Rubber" : "Rubbers"}
            </div>
            {playerCount > 0 && (
              <div className="inline-flex items-center gap-1 text-[10px]" style={{ color: BSL.muted }}>
                <Users className="h-3 w-3" /> {playerCount} players
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {p.rubbers.map(r => <RubberRow key={r.id} r={r} side="home" />)}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <Link href={`/bsl/match/${p.id}`}>
        <a
          data-export-hide
          className="relative flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold transition-colors hover:bg-white/5"
          style={{
            background: "hsla(0,0%,0%,0.32)",
            color: BSL.cyan,
            borderTop: `1px solid ${tone.color}33`,
          }}
          data-testid={`battle-${p.id}-open`}
        >
          <span className="inline-flex items-center gap-1.5 uppercase tracking-widest">
            <Activity className="h-3 w-3" /> Open match centre
          </span>
          <span className="inline-flex items-center gap-1 uppercase tracking-widest">
            View <ChevronRight className="h-3 w-3" />
          </span>
        </a>
      </Link>
    </motion.div>
  );
}

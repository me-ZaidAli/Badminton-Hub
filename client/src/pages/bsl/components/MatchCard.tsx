import { motion } from "framer-motion";
import { Link } from "wouter";
import { Activity, ChevronRight } from "lucide-react";
import { BSL } from "./BSLPalette";

interface Props {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  homeClubLogo?: string | null;
  awayClubLogo?: string | null;
  homeRubbers: number;
  awayRubbers: number;
  status: string;
  court?: number | null;
  startTime?: string | Date | null;
}

function statusTone(status: string) {
  if (status === "LIVE") return { color: BSL.danger, label: "LIVE", pulse: true };
  if (status === "WARMUP") return { color: BSL.cyan, label: "WARMUP", pulse: true };
  if (status === "FINISHED") return { color: BSL.muted, label: "FT", pulse: false };
  return { color: BSL.gold, label: "UPCOMING", pulse: false };
}

function TeamBlock({ name, logo, score, leader }: { name: string; logo?: string | null; score: number; leader: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div
        className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-xs font-black overflow-hidden"
        style={{
          background: leader ? `${BSL.gold}22` : "hsla(0,0%,100%,0.05)",
          border: `1px solid ${leader ? BSL.gold + "55" : "hsla(0,0%,100%,0.1)"}`,
          color: leader ? BSL.gold : BSL.muted,
        }}
      >
        {logo ? <img src={logo} alt={name} className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: BSL.text }}>{name}</div>
      </div>
      <div
        className="ml-auto text-2xl font-black tabular-nums shrink-0"
        style={{ color: leader ? BSL.gold : BSL.text, textShadow: leader ? `0 0 12px ${BSL.gold}66` : undefined }}
      >
        {score}
      </div>
    </div>
  );
}

export function MatchCard(p: Props) {
  const tone = statusTone(p.status);
  const homeLeads = p.homeRubbers > p.awayRubbers;
  const awayLeads = p.awayRubbers > p.homeRubbers;
  return (
    <Link href={`/bsl/match/${p.id}`}>
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative rounded-xl overflow-hidden cursor-pointer"
        style={{
          background: "linear-gradient(140deg, hsla(222,40%,18%,0.75), hsla(222,45%,10%,0.92))",
          border: `1px solid ${tone.color}44`,
        }}
        data-testid={`match-card-${p.id}`}
      >
        <div className="flex items-center justify-between px-4 pt-3 text-[10px] uppercase tracking-[0.18em]">
          <div className="flex items-center gap-2" style={{ color: tone.color }}>
            {tone.pulse && (
              <motion.span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: tone.color }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            )}
            <span className="font-bold">{tone.label}</span>
          </div>
          <div style={{ color: BSL.muted }} className="flex items-center gap-2">
            {p.court != null && <span>Court {p.court}</span>}
            {p.startTime && <span>· {new Date(p.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <TeamBlock name={p.homeTeamName} logo={p.homeClubLogo} score={p.homeRubbers} leader={homeLeads} />
          <TeamBlock name={p.awayTeamName} logo={p.awayClubLogo} score={p.awayRubbers} leader={awayLeads} />
        </div>
        <div
          className="flex items-center justify-between px-4 py-2 text-[11px]"
          style={{ background: "hsla(0,0%,0%,0.25)", color: BSL.muted, borderTop: `1px solid hsla(0,0%,100%,0.05)` }}
        >
          <span className="inline-flex items-center gap-1.5"><Activity className="h-3 w-3" /> 6 Rubbers</span>
          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: BSL.cyan }}>
            View match <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

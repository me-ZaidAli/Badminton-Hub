import "./_group.css";
import { ArrowRight, ChevronDown, Clock, Layers, MapPin, PoundSterling, Timer } from "lucide-react";

const SESSION = {
  title: "Wednesday Club Night",
  startTime: "19:30",
  endTime: "21:30",
  durationMinutes: 120,
  fee: 600,
  courts: 4,
  hall: "Main Hall",
  venue: "Riverside Sports Centre, London",
  signupCount: 14,
  maxPlayers: 18,
  matchMode: "COMPETITIVE",
  intensity: "ELITE",
  grades: ["B1", "A3", "A2"],
  isLive: true,
  isSignedUp: true,
  isPaid: true,
  hype: "Hot session — filling fast",
  energy: 78,
  club: "Riverside Badminton Club",
};

export function Current() {
  const fillPct = Math.round((SESSION.signupCount / SESSION.maxPlayers) * 100);
  const filled = Math.round((fillPct / 100) * 10);
  const isFull = fillPct >= 100;
  const accentColor = SESSION.matchMode === "TRAINING" ? "bg-violet-500"
    : SESSION.matchMode === "COMPETITIVE" ? "bg-amber-500"
    : "bg-blue-500";

  return (
    <div className="cm-themed dark min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-[460px]">
        <div
          className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-xl ring-1 ring-amber-400/30"
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${SESSION.isLive ? "bg-green-500" : accentColor}`} />

          <div className="p-4 pl-5 border backdrop-blur-sm shadow-sm rounded-xl border-emerald-400/50 bg-emerald-500/[0.07]">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="font-bold text-base truncate">{SESSION.title}</h4>
                {SESSION.isLive && (
                  <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
                {SESSION.isSignedUp && (
                  <>
                    <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-500 text-white">Joined</span>
                    {SESSION.isPaid && <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white">Secured</span>}
                    {SESSION.isPaid && <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white">Paid</span>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1 rounded-md hover:bg-white/5">
                  <ArrowRight className="h-4 w-4 text-white/40" />
                </button>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </div>
            </div>

            <div className="h-px mb-2.5 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="flex items-center gap-1.5 mb-2 text-amber-400">
              <span className="text-[10px] font-semibold">🔥 {SESSION.hype}</span>
              <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden max-w-[50px] ml-auto">
                <div className="h-full rounded-full bg-orange-500" style={{ width: `${SESSION.energy}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/80 mb-2.5">
              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/60" /><span className="truncate">{SESSION.venue}</span></div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-white/60" /><span className="font-medium">{SESSION.startTime} → {SESSION.endTime}</span></div>
              <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-white/60" /><span>{SESSION.courts} Courts · {SESSION.hall}</span></div>
              <div className="flex items-center gap-1.5"><PoundSterling className="h-3.5 w-3.5 text-white/60" /><span className="font-medium">£{(SESSION.fee/100).toFixed(2)}</span></div>
              <div className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-white/60" /><span>2h</span></div>
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 bg-amber-500/20 text-amber-400 ring-amber-400/40">{SESSION.intensity}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase bg-red-900/40 text-red-300">{SESSION.matchMode}</span>
                {SESSION.grades.map(g => {
                  const tier = g[0];
                  const cls = tier === "A" ? "bg-amber-900/50 text-amber-300 ring-amber-700/50"
                    : tier === "B" ? "bg-blue-900/50 text-blue-300 ring-blue-700/50"
                    : "bg-emerald-900/50 text-emerald-300 ring-emerald-700/50";
                  return <span key={g} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cls}`}>{g}</span>;
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`w-[5px] h-[10px] rounded-[1px] ${
                      i < filled
                        ? (isFull ? "bg-red-500" : fillPct > 75 ? "bg-amber-500" : "bg-emerald-500")
                        : "bg-white/10"
                    }`} />
                  ))}
                </div>
                <span className="text-[11px] font-semibold tabular-nums text-white/80">
                  {SESSION.signupCount}/{SESSION.maxPlayers}
                </span>
              </div>
            </div>

            <div className="mt-2 text-sm font-semibold text-blue-400">{SESSION.club}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

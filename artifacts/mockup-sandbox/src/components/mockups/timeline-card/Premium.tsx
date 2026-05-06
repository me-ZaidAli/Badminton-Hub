import "./_group.css";
import { ArrowUpRight, Clock, Layers, MapPin, PoundSterling, Sparkles } from "lucide-react";

const SESSION = {
  title: "Wednesday Club Night",
  startTime: "19:30",
  endTime: "21:30",
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

function Pill({
  children,
  variant = "muted",
}: {
  children: React.ReactNode;
  variant?: "muted" | "primary" | "accent" | "destructive";
}) {
  const styles = {
    muted: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] ring-1 ring-[hsl(var(--border))]",
    primary: "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.25)]",
    accent: "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent)/0.30)]",
    destructive: "bg-[hsl(var(--destructive)/0.18)] text-[hsl(var(--destructive-foreground))] ring-1 ring-[hsl(var(--destructive)/0.4)]",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
      {children}
    </span>
  );
}

export function Premium() {
  const fillPct = Math.round((SESSION.signupCount / SESSION.maxPlayers) * 100);

  return (
    <div className="cm-themed dark min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-[460px]">
        <div
          className="cm-shine relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.985]"
          style={{
            background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 1px 0 hsl(var(--accent)/0.04) inset, 0 12px 30px -18px hsl(var(--primary)/0.45)",
          }}
        >
          {/* Subtle accent gradient halo, top-right */}
          <div
            aria-hidden
            className="absolute -top-24 -right-20 w-64 h-64 rounded-full opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent)/0.22), transparent 70%)" }}
          />
          {/* Left status rail */}
          <div
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ background: "linear-gradient(180deg, hsl(var(--accent)) 0%, hsl(var(--primary)) 100%)" }}
          />

          <div className="relative p-5 pl-6">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {SESSION.isLive && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                      style={{ background: "hsl(var(--destructive)/0.18)", color: "hsl(var(--foreground))", boxShadow: "inset 0 0 0 1px hsl(var(--destructive)/0.5)" }}
                    >
                      <span
                        className="cm-live-dot w-1.5 h-1.5 rounded-full"
                        style={{ background: "hsl(var(--destructive))", boxShadow: "0 0 8px hsl(var(--destructive))" }}
                      />
                      LIVE NOW
                    </span>
                  )}
                  <Pill variant="accent">{SESSION.intensity}</Pill>
                  <Pill variant="muted">{SESSION.matchMode}</Pill>
                </div>
                <h3
                  className="text-[17px] font-bold leading-tight tracking-tight truncate"
                  style={{ fontFamily: "var(--font-display)", color: "hsl(var(--foreground))" }}
                >
                  {SESSION.title}
                </h3>
                <div className="text-xs mt-0.5" style={{ color: "hsl(var(--primary))" }}>
                  {SESSION.club}
                </div>
              </div>
              <button
                className="shrink-0 rounded-full p-1.5 transition-colors duration-200 hover:bg-[hsl(var(--muted))]"
                aria-label="Open session"
              >
                <ArrowUpRight className="h-4 w-4" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            </div>

            {/* Joined / status row */}
            {SESSION.isSignedUp && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <Pill variant="primary">
                  <Sparkles className="h-3 w-3" /> Joined
                </Pill>
                {SESSION.isPaid && <Pill variant="accent">Paid · Secured</Pill>}
                {SESSION.grades.map((g) => (
                  <Pill key={g} variant="muted">{g}</Pill>
                ))}
              </div>
            )}

            {/* Capacity bar — single smooth gradient (no battery blocks) */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span style={{ color: "hsl(var(--muted-foreground))" }}>{SESSION.hype}</span>
                <span className="tabular-nums font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  {SESSION.signupCount}<span style={{ color: "hsl(var(--muted-foreground))" }}>/{SESSION.maxPlayers}</span>
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "hsl(var(--muted))" }}
              >
                <div
                  className="cm-cap-bar h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs" style={{ color: "hsl(var(--foreground))" }}>
              <Meta icon={<Clock className="h-3.5 w-3.5" />} label={`${SESSION.startTime} → ${SESSION.endTime}`} />
              <Meta icon={<Layers className="h-3.5 w-3.5" />} label={`${SESSION.courts} courts · ${SESSION.hall}`} />
              <Meta icon={<MapPin className="h-3.5 w-3.5" />} label={SESSION.venue} truncate />
              <Meta icon={<PoundSterling className="h-3.5 w-3.5" />} label={`£${(SESSION.fee/100).toFixed(2)}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, label, truncate = false }: { icon: React.ReactNode; label: string; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span style={{ color: "hsl(var(--muted-foreground))" }} className="shrink-0">{icon}</span>
      <span className={truncate ? "truncate" : ""}>{label}</span>
    </div>
  );
}

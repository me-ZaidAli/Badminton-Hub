import "./_group.css";
import { ArrowUpRight, Calendar, ChevronRight, MapPin, Trophy, Users } from "lucide-react";

const FEATURED = {
  name: "Spring Open Championships 2026",
  date: "Sat, 16 May",
  location: "Riverside Sports Centre",
  maxPlayers: 64,
};

const UPCOMING = [
  { id: 1, name: "Spring Open Championships 2026", date: "16 May", location: "Riverside Sports Centre", live: false, open: true },
  { id: 2, name: "Mixed Doubles Cup", date: "23 May", location: "Greenwich Sports Hub", live: true, open: false },
  { id: 3, name: "Junior Stars Tournament", date: "30 May", location: "City Arena", live: false, open: true },
  { id: 4, name: "Veterans Invitational", date: "6 Jun", location: "Riverside Sports Centre", live: false, open: true },
];

export function Premium() {
  return (
    <div className="cm-themed dark min-h-screen p-6" style={{ background: "hsl(var(--background))" }}>
      <div className="max-w-[1040px] mx-auto space-y-4">
        {/* Featured "Join Now" hero — theme-token only */}
        <a
          className="block relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.995] group"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 1px 0 hsl(var(--accent)/0.06) inset, 0 18px 40px -22px hsl(var(--primary)/0.55)",
          }}
        >
          {/* Drifting accent + primary halos (no hardcoded colors) */}
          <div
            aria-hidden
            className="cm-orb-a absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(closest-side, hsl(var(--accent)/0.22), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="cm-orb-b absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(closest-side, hsl(var(--primary)/0.22), transparent 70%)" }}
          />
          {/* Top hairline accent */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.6), transparent)" }}
          />

          <div className="relative z-10 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className="shrink-0 grid place-items-center h-11 w-11 rounded-xl"
                  style={{
                    background: "hsl(var(--accent)/0.14)",
                    boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.35)",
                  }}
                >
                  <Trophy className="h-5 w-5" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div className="min-w-0">
                  <div
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1.5"
                    style={{
                      background: "hsl(var(--accent)/0.14)",
                      color: "hsl(var(--accent))",
                      boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.30)",
                    }}
                  >
                    New Tournament
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-bold leading-tight tracking-tight"
                    style={{ fontFamily: "var(--font-display)", color: "hsl(var(--foreground))" }}
                  >
                    {FEATURED.name}
                  </h2>
                  <p className="text-[13px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Registration open · claim your spot before it fills
                  </p>
                </div>
              </div>
              <div
                className="shrink-0 grid place-items-center h-9 w-9 rounded-full transition-transform duration-300 group-hover:rotate-45"
                style={{
                  background: "hsl(var(--muted))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              <Stat icon={<Calendar className="h-4 w-4" />} label="When" value={FEATURED.date} />
              <Stat icon={<MapPin className="h-4 w-4" />} label="Where" value={FEATURED.location} />
              <Stat icon={<Users className="h-4 w-4" />} label="Field" value={`Up to ${FEATURED.maxPlayers} players`} />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs hidden sm:block" style={{ color: "hsl(var(--muted-foreground))" }}>
                Tap to view details and register your spot
              </span>
              <button
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.85) 100%)",
                  color: "hsl(var(--accent-foreground))",
                  boxShadow: "0 8px 24px -10px hsl(var(--accent)/0.7)",
                }}
              >
                Join Now <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </a>

        {/* Upcoming list */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div
                className="grid place-items-center h-8 w-8 rounded-lg"
                style={{ background: "hsl(var(--accent)/0.14)", boxShadow: "inset 0 0 0 1px hsl(var(--accent)/0.25)" }}
              >
                <Trophy className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
              </div>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: "hsl(var(--foreground))", fontFamily: "var(--font-display)" }}>
                  Upcoming Tournaments
                </div>
                <div className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {UPCOMING.length} tournaments coming up — pick one to compete in
                </div>
              </div>
            </div>
            <button
              className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200"
              style={{ color: "hsl(var(--primary))" }}
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            {UPCOMING.map((t, i) => (
              <a
                key={t.id}
                className="cm-row flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div
                  className="h-9 w-9 rounded-lg grid place-items-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--accent)/0.16), hsl(var(--primary)/0.16))",
                    boxShadow: "inset 0 0 0 1px hsl(var(--border))",
                  }}
                >
                  <Trophy className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {t.name}
                    </p>
                    {t.live && (
                      <span
                        className="inline-flex items-center text-[9px] font-bold px-1.5 py-0 rounded"
                        style={{
                          background: "hsl(var(--destructive)/0.18)",
                          color: "hsl(var(--foreground))",
                          boxShadow: "inset 0 0 0 1px hsl(var(--destructive)/0.4)",
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full mr-1 animate-pulse" style={{ background: "hsl(var(--destructive))" }} />
                        LIVE
                      </span>
                    )}
                    {t.open && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0 rounded"
                        style={{
                          background: "hsl(var(--primary)/0.14)",
                          color: "hsl(var(--primary))",
                          boxShadow: "inset 0 0 0 1px hsl(var(--primary)/0.3)",
                        }}
                      >
                        Open
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.date}</span>
                    <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /><span className="truncate max-w-[160px]">{t.location}</span></span>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 transition-all duration-200 group-hover:translate-x-0.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        background: "hsl(var(--background) / 0.6)",
        backdropFilter: "blur(6px)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      <span className="shrink-0" style={{ color: "hsl(var(--accent))" }}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-semibold leading-none mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</div>
        <div className="text-sm font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{value}</div>
      </div>
    </div>
  );
}

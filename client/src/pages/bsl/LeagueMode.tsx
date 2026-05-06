import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Users, Wallet as WalletIcon, Calendar, Zap, Crown, Shield, MapPin, Sparkles, ChevronRight, Activity } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { GlowPanel } from "./components/GlowPanel";
import { CountdownTimer } from "./components/CountdownTimer";
import { ActionButton } from "./components/ActionButton";
import { StatTile } from "./components/StatTile";
import { MatchCard } from "./components/MatchCard";
import { LeaderRow } from "./components/LeaderRow";
import { BSL } from "./components/BSLPalette";
import { useUser } from "@/hooks/use-auth";
import bslLogo from "@assets/bsl_logo_chrome_1778089580995.png";
import bslHeroPhoto from "@assets/1778089289327_1778089305815.png";

export default function LeagueMode() {
  const { data: user } = useUser();
  const isAdmin = (user as any)?.role === "OWNER" || (user as any)?.role === "ADMIN";

  const { data: league } = useQuery<any>({ queryKey: ["/api/bsl/league"] });
  const { data: standings = [] } = useQuery<any[]>({ queryKey: ["/api/bsl/standings"] });
  const { data: liveFixtures = [] } = useQuery<any[]>({ queryKey: ["/api/bsl/fixtures", { status: "LIVE" }], queryFn: async () => {
    const r = await fetch("/api/bsl/fixtures?status=LIVE", { credentials: "include" });
    return r.json();
  }});
  const { data: upcomingFixtures = [] } = useQuery<any[]>({ queryKey: ["/api/bsl/fixtures", { status: "SCHEDULED" }], queryFn: async () => {
    const r = await fetch("/api/bsl/fixtures?status=SCHEDULED", { credentials: "include" });
    return r.json();
  }});
  const { data: mvp = [] } = useQuery<any[]>({ queryKey: ["/api/bsl/mvp"] });
  const { data: clubs = [] } = useQuery<any[]>({ queryKey: ["/api/bsl/clubs"] });
  const { data: mePlayer } = useQuery<any>({ queryKey: ["/api/bsl/players/me"], enabled: !!user });

  const activeClubs = clubs.filter(c => c.status === "ACTIVE").length;
  const totalTeams = standings.length;

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />
      {/* HERO BANNER */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8">
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden rounded-3xl"
            style={{ border: `1px solid ${BSL.cyan}33`, boxShadow: `0 32px 80px hsla(222,80%,2%,0.6), 0 0 0 1px ${BSL.gold}22` }}
            data-testid="hero-banner"
          >
            <motion.img
              src={bslHeroPhoto}
              alt=""
              className="block w-full h-[260px] sm:h-[340px] md:h-[420px] lg:h-[480px] object-cover select-none"
              draggable={false}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Vignette + colour wash so the photo blends with the BSL palette */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(180deg, hsla(222,55%,4%,0.15) 0%, hsla(222,55%,4%,0.0) 35%, hsla(222,55%,4%,0.55) 78%, hsla(222,55%,4%,0.95) 100%)`,
            }} />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `radial-gradient(60% 80% at 50% 0%, hsla(195,100%,60%,0.18), transparent 60%), radial-gradient(40% 60% at 80% 90%, hsla(42,95%,55%,0.16), transparent 60%)`,
            }} />
            {/* Logo + content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8 lg:p-10">
              <motion.img
                src={bslLogo}
                alt="Birmingham Super League"
                className="block w-full max-w-[260px] sm:max-w-[340px] md:max-w-[420px] lg:max-w-[520px] h-auto select-none mb-3 md:mb-4"
                draggable={false}
                initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ filter: `drop-shadow(0 0 36px ${BSL.cyan}66) drop-shadow(0 14px 32px hsla(222,80%,2%,0.85))` }}
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col gap-1.5"
              >
                <span style={{ color: BSL.gold }} className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em]">{league?.tagline || "Compete · Connect · Elevate"}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em]" style={{ color: "hsla(0,0%,100%,0.78)" }}>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" style={{ color: BSL.cyan }} /> {league?.venueName || "One Central Venue"}</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" style={{ color: BSL.cyan }} /> One Saturday / Month</span>
                  <span className="inline-flex items-center gap-1.5"><Trophy className="h-3 w-3" style={{ color: BSL.cyan }} /> 12 Days A Year</span>
                </div>
              </motion.div>
            </div>
            {/* Countdown — floating top-right */}
            <motion.div
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute top-4 right-4 md:top-6 md:right-6 rounded-2xl px-4 py-3 backdrop-blur-xl"
              style={{
                background: "linear-gradient(140deg, hsla(42,95%,55%,0.16), hsla(195,100%,60%,0.10))",
                border: `1px solid ${BSL.gold}55`,
                boxShadow: `0 12px 32px hsla(222,80%,2%,0.6)`,
              }}
            >
              <div className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] mb-1.5 font-bold" style={{ color: BSL.gold }}>Next League Day</div>
              <CountdownTimer target={league?.nextLeagueDay} />
            </motion.div>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">

          {/* QUICK ACTIONS */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            {!mePlayer && (
              <Link href="/bsl/join"><a><ActionButton variant="cyan" icon={<Zap className="h-4 w-4" />}>Join as Player</ActionButton></a></Link>
            )}
            {mePlayer && (
              <Link href="/bsl/wallet"><a>
                <ActionButton variant="cyan" icon={<WalletIcon className="h-4 w-4" />}>
                  Wallet · £{((mePlayer.walletBalance || 0) / 100).toFixed(2)}
                </ActionButton>
              </a></Link>
            )}
            <Link href="/bsl/register-club"><a><ActionButton variant="gold" icon={<Shield className="h-4 w-4" />}>Register a Club</ActionButton></a></Link>
            {isAdmin && (
              <>
                <Link href="/bsl/admin/verify"><a><ActionButton variant="ghost" icon={<Sparkles className="h-4 w-4" />}>Verify Payments</ActionButton></a></Link>
                <Link href="/bsl/admin/fixtures"><a><ActionButton variant="ghost" icon={<Calendar className="h-4 w-4" />}>Fixture Board</ActionButton></a></Link>
              </>
            )}
          </motion.div>

          {/* STAT STRIP */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatTile label="Active Clubs" value={activeClubs} sub={`${clubs.length} total registered`} icon={<Shield className="h-4 w-4" />} tone="gold" />
            <StatTile label="Teams" value={totalTeams} sub="competing this season" icon={<Users className="h-4 w-4" />} tone="cyan" />
            <StatTile label="Live Matches" value={liveFixtures.length} sub="right now" icon={<Activity className="h-4 w-4" />} tone="gold" />
            <StatTile label="Upcoming" value={upcomingFixtures.length} sub="next league day" icon={<Calendar className="h-4 w-4" />} tone="cyan" />
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LIVE & UPCOMING (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          <GlowPanel
            title="Live Now"
            subtitle="Matches in progress"
            tone="gold"
            icon={<Activity className="h-4 w-4" />}
            action={
              <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: BSL.danger }}>
                ● {liveFixtures.length} live
              </span>
            }
          >
            {liveFixtures.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>
                No matches in progress. Check back on league day.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {liveFixtures.map(f => <MatchCard key={f.id} {...f} />)}
              </div>
            )}
          </GlowPanel>

          <GlowPanel
            title="Upcoming Fixtures"
            subtitle="Scheduled for the next league day"
            tone="cyan"
            icon={<Calendar className="h-4 w-4" />}
          >
            {upcomingFixtures.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>
                Fixtures will appear here once the admin generates them.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingFixtures.slice(0, 6).map(f => <MatchCard key={f.id} {...f} />)}
              </div>
            )}
          </GlowPanel>

          <GlowPanel
            title="Registered Clubs"
            subtitle="Approved clubs in this season"
            tone="gold"
            icon={<Shield className="h-4 w-4" />}
            action={<Link href="/bsl/register-club"><a className="text-[11px] uppercase tracking-widest font-bold inline-flex items-center gap-1" style={{ color: BSL.gold }}>Register <ChevronRight className="h-3 w-3" /></a></Link>}
          >
            {clubs.filter(c => c.status === "ACTIVE").length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>
                No clubs approved yet. Be the first to register.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {clubs.filter(c => c.status === "ACTIVE").map(c => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -2, scale: 1.02 }}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "hsla(0,0%,100%,0.04)", border: `1px solid hsla(0,0%,100%,0.08)` }}
                    data-testid={`club-tile-${c.id}`}
                  >
                    <div className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center text-xs font-black"
                      style={{ background: `${BSL.gold}22`, color: BSL.gold }}>
                      {c.logoUrl ? <img src={c.logoUrl} className="h-full w-full object-cover" alt={c.name} /> : c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.cyan }}>{c.division}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlowPanel>
        </div>

        {/* RIGHT COL */}
        <div className="space-y-5">
          <GlowPanel
            title="Standings"
            subtitle="League table"
            tone="gold"
            icon={<Trophy className="h-4 w-4" />}
          >
            {standings.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: BSL.muted }}>
                Standings build up after the first league day.
              </div>
            ) : (
              <div className="space-y-1">
                {standings.slice(0, 8).map((t: any) => (
                  <LeaderRow
                    key={t.id}
                    position={t.position}
                    name={t.name}
                    sub={`${t.clubName} · ${t.division}`}
                    logo={t.clubLogo}
                    played={t.played}
                    won={t.won}
                    drawn={t.drawn}
                    lost={t.lost}
                    points={t.points}
                    rubberDiff={t.rubberDiff}
                  />
                ))}
              </div>
            )}
          </GlowPanel>

          <GlowPanel
            title="Top Performers"
            subtitle="Most-winning players"
            tone="cyan"
            icon={<Sparkles className="h-4 w-4" />}
          >
            {mvp.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: BSL.muted }}>
                Player stats appear once matches are played.
              </div>
            ) : (
              <div className="space-y-2">
                {mvp.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: i === 0 ? `${BSL.cyan}10` : "transparent" }} data-testid={`mvp-row-${p.id}`}>
                    <div className="text-sm font-black w-6 text-center" style={{ color: i === 0 ? BSL.cyan : BSL.muted }}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">Player #{p.userId}</div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: BSL.muted }}>
                        {p.matchesWon}W · {p.matchesPlayed}P
                      </div>
                    </div>
                    <div className="text-base font-black tabular-nums" style={{ color: BSL.gold }}>{p.pointsScored}</div>
                  </div>
                ))}
              </div>
            )}
          </GlowPanel>

          <GlowPanel
            title="One City. One Venue."
            subtitle="The format"
            tone="gold"
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="space-y-3 text-sm" style={{ color: BSL.muted }}>
              <div className="flex justify-between"><span>Venue</span><span style={{ color: BSL.text }} className="font-semibold">{league?.venueName?.split(",")[0] || "TBD"}</span></div>
              <div className="flex justify-between"><span>Format</span><span style={{ color: BSL.text }} className="font-semibold">6 Rubbers / Tie</span></div>
              <div className="flex justify-between"><span>Schedule</span><span style={{ color: BSL.text }} className="font-semibold">1 Saturday / Month</span></div>
              <div className="flex justify-between"><span>Season</span><span style={{ color: BSL.text }} className="font-semibold">12 League Days</span></div>
              <div className="flex justify-between"><span>Club Fee</span><span style={{ color: BSL.gold }} className="font-bold">£{((league?.clubFee || 0) / 100).toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Player Fee</span><span style={{ color: BSL.gold }} className="font-bold">£{((league?.playerFee || 0) / 100).toFixed(0)}</span></div>
            </div>
          </GlowPanel>
        </div>
      </div>
    </div>
  );
}

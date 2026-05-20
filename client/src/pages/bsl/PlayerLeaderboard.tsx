import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Trophy, Search } from "lucide-react";
import { BSLBackground } from "./components/BSLBackground";
import { BSL } from "./components/BSLPalette";

type Row = {
  position: number;
  playerId: number;
  fullName: string;
  clubId: number | null;
  clubName: string;
  clubLogo: string | null;
  division: string;
  matchesPlayed: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  winRate: number;
};

export default function BslPlayerLeaderboard() {
  const [division, setDivision] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["/api/bsl/player-leaderboard", division || "all"],
    queryFn: async () => {
      const url = division
        ? `/api/bsl/player-leaderboard?division=${encodeURIComponent(division)}`
        : `/api/bsl/player-leaderboard`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const divisions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.division && r.division !== "—") s.add(r.division); });
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r =>
      r.fullName.toLowerCase().includes(needle) ||
      r.clubName.toLowerCase().includes(needle));
  }, [rows, search]);

  return (
    <div className="min-h-screen text-white pb-24" style={{ background: BSL.bgDeep }}>
      <BSLBackground />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-6">
        <Link href="/bsl">
          <button
            className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white"
            data-testid="link-back-bsl"
          ><ArrowLeft className="h-3.5 w-3.5" /> Back to BSL</button>
        </Link>

        <div>
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl inline-flex items-center justify-center"
              style={{ background: `${BSL.gold}22`, border: `1px solid ${BSL.gold}55`, color: BSL.gold }}
            ><Trophy className="h-6 w-6" /></div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-black tracking-tight"
                style={{ color: BSL.gold }}
                data-testid="text-player-leaderboard-title"
              >Player Leaderboard</h1>
              <p className="text-white/60 text-sm">
                Matches won / lost across every finished BSL rubber. Ranked by wins, then sets-difference.
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: BSL.card, border: `1px solid ${BSL.border}` }}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${BSL.border}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setDivision("")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{
                  background: division === "" ? `${BSL.gold}22` : "transparent",
                  color: division === "" ? BSL.gold : "white",
                  border: `1px solid ${division === "" ? BSL.gold : BSL.border}`,
                }}
                data-testid="button-division-all"
              >All divisions</button>
              {divisions.map(d => (
                <button
                  key={d}
                  onClick={() => setDivision(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: division === d ? `${BSL.cyan}22` : "transparent",
                    color: division === d ? BSL.cyan : "white",
                    border: `1px solid ${division === d ? BSL.cyan : BSL.border}`,
                  }}
                  data-testid={`button-division-${d}`}
                >{d}</button>
              ))}
            </div>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search player or club…"
                className="bg-black/40 border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2"
                style={{ borderColor: `${BSL.cyan}33` }}
                data-testid="input-search"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-12 text-center text-white/40 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/40 text-sm" data-testid="text-empty">
              No finished matches yet. Player records appear once admins save rubber scores.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/50 font-bold" style={{ borderBottom: `1px solid ${BSL.border}` }}>
                    <th className="px-3 py-2 text-left w-12">#</th>
                    <th className="px-3 py-2 text-left">Player</th>
                    <th className="px-3 py-2 text-left">Club</th>
                    <th className="px-3 py-2 text-center">Played</th>
                    <th className="px-3 py-2 text-center">Won</th>
                    <th className="px-3 py-2 text-center">Lost</th>
                    <th className="px-3 py-2 text-center">Sets ±</th>
                    <th className="px-3 py-2 text-center">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const diff = r.setsFor - r.setsAgainst;
                    const diffColor = diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-white/60";
                    return (
                      <tr
                        key={r.playerId}
                        className="hover:bg-white/5"
                        style={{ borderBottom: `1px solid ${BSL.border}` }}
                        data-testid={`row-player-${r.playerId}`}
                      >
                        <td className="px-3 py-2 font-black tabular-nums" style={{ color: r.position <= 3 ? BSL.gold : "white" }}>
                          {r.position}
                        </td>
                        <td className="px-3 py-2 font-bold" data-testid={`text-player-name-${r.playerId}`}>{r.fullName}</td>
                        <td className="px-3 py-2 text-white/70">
                          <span className="inline-flex items-center gap-1.5">
                            {r.clubLogo ? (
                              <img src={r.clubLogo} alt="" className="h-4 w-4 rounded-full object-cover" />
                            ) : null}
                            <span>{r.clubName}</span>
                            {r.division && r.division !== "—" ? (
                              <span className="text-[10px] font-bold opacity-60">· {r.division}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">{r.matchesPlayed}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold" style={{ color: BSL.gold }} data-testid={`text-won-${r.playerId}`}>{r.won}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-white/70" data-testid={`text-lost-${r.playerId}`}>{r.lost}</td>
                        <td className={`px-3 py-2 text-center tabular-nums font-bold ${diffColor}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">{r.winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

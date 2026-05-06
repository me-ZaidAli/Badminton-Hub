import "./_group.css";
import { Calendar, ChevronRight, MapPin, MapPinned, Trophy, Users, Zap } from "lucide-react";

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

export function Current() {
  return (
    <div className="cm-themed dark min-h-screen p-6">
      <div className="max-w-[1040px] mx-auto space-y-4">
        {/* Featured Join Now banner — current production */}
        <div className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-700 to-rose-700" />
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl" />

          <div className="relative z-10 p-5 sm:p-6">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner shrink-0">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center bg-white/20 text-white border border-white/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5">
                    <Zap className="h-3 w-3 mr-1" />New Tournament
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight truncate">{FEATURED.name}</h3>
                  <p className="text-xs text-amber-100 mt-0.5 font-medium">Sign up now and prove you're the champion</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                <Calendar className="h-4 w-4 text-white shrink-0" />
                <span className="text-sm text-white font-semibold">{FEATURED.date}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                <MapPinned className="h-4 w-4 text-white shrink-0" />
                <span className="text-sm text-white font-semibold truncate">{FEATURED.location}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                <Users className="h-4 w-4 text-white shrink-0" />
                <span className="text-sm text-white font-semibold">Up to {FEATURED.maxPlayers} players</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-amber-50 font-medium hidden sm:block">Tap to view details and register your spot</p>
              <button className="bg-white text-orange-600 hover:bg-amber-50 font-bold shadow-lg ml-auto rounded-md px-3 py-1.5 text-sm inline-flex items-center">
                Join Now <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming list — current */}
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/15">
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="text-base font-semibold">Upcoming Tournaments</div>
                <div className="text-xs text-white/60 mt-0.5">{UPCOMING.length} tournaments coming up — pick one to compete in</div>
              </div>
            </div>
            <button className="text-xs h-7 px-2 text-amber-400 hover:bg-amber-500/10 rounded-md inline-flex items-center">
              View all <ChevronRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>

          <div className="space-y-2">
            {UPCOMING.map(t => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-amber-500/5 hover:border-amber-500/30 transition-all duration-200 px-3 py-2.5 cursor-pointer group">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    {t.live && <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-[9px] font-bold px-1.5 py-0 rounded inline-flex items-center"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />LIVE</span>}
                    {t.open && <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0 rounded">Open</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/60 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.date}</span>
                    <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /><span className="truncate max-w-[140px]">{t.location}</span></span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

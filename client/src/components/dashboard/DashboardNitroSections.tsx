import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Flame,
  Award,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Check,
  Sparkles,
} from "lucide-react";

type NewsItem = { title: string; source: string; url: string; summary: string; publishedAt?: string; imageUrl?: string };

const ROW_ICONS = [Trophy, Flame, Award];
const ROW_COLORS = ["text-[#EB459E]", "text-[#5865F2]", "text-[#7289DA]"];

export function DashboardNewsCard() {
  const { data } = useQuery<{ items: NewsItem[] }>({
    queryKey: ["/api/daily-content/news"],
    staleTime: 6 * 60 * 60_000,
  });
  const items = data?.items ?? [];
  const featured = items[0];
  const rest = items.slice(1, 4);

  return (
    <section className="space-y-3" data-testid="section-news">
      <h2 className="text-xs font-bold text-white/60 tracking-[0.2em] uppercase pl-1">
        Badminton News &amp; Updates
      </h2>
      <div className="nitro-border-wrap group">
        <div className="rounded-[20px] p-5 sm:p-6 flex flex-col md:flex-row gap-6 bg-[hsl(var(--card)/0.85)] backdrop-blur-xl border border-white/5 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
          {featured ? (
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 group/feat"
              data-testid="link-news-featured"
            >
              <div className="relative h-44 sm:h-48 rounded-xl bg-gradient-to-br from-[#5865F2]/30 via-[#9932CC]/20 to-[#EB459E]/25 flex flex-col justify-between p-5 border border-white/5 overflow-hidden">
                {featured.imageUrl && (
                  <>
                    <img
                      src={featured.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      className="absolute inset-0 w-full h-full object-cover"
                      data-testid="img-news-featured"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  </>
                )}
                <Badge className="relative self-start bg-[#EB459E] hover:bg-[#EB459E]/90 text-white border-none shadow-lg">
                  Featured
                </Badge>
                <h3 className="relative text-lg sm:text-xl font-bold text-white drop-shadow-md group-hover/feat:text-white/90 transition-colors">
                  {featured.title}
                </h3>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/55 px-1">
                <span className="truncate">{featured.source}</span>
                <span className="inline-flex items-center gap-1 text-white/70 group-hover/feat:text-white">
                  Read <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ) : (
            <div className="flex-1 h-48 rounded-xl bg-white/5 animate-pulse" />
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
            {(rest.length > 0 ? rest : Array.from({ length: 3 })).map((n, i) => {
              const Icon = ROW_ICONS[i % ROW_ICONS.length];
              const color = ROW_COLORS[i % ROW_COLORS.length];
              const item = n as NewsItem | undefined;
              if (!item) {
                return <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />;
              }
              return (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group/item"
                  data-testid={`link-news-${i}`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                      data-testid={`img-news-${i}`}
                    />
                  ) : (
                    <div className={`p-2 rounded-lg bg-black/30 ${color} group-hover/item:scale-110 transition-transform shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white/90 group-hover/item:text-white line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-white/55 mt-0.5 truncate">
                      {item.source}{item.publishedAt ? ` · ${item.publishedAt}` : ""}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function DashboardThemesCard() {
  return (
    <section className="space-y-3" data-testid="section-themes">
      <h2 className="text-xs font-bold text-white/60 tracking-[0.2em] uppercase pl-1">
        Customise Your Space
      </h2>
      <div className="nitro-border-wrap group">
        <div className="rounded-[20px] p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-[hsl(var(--card)/0.85)] backdrop-blur-xl border border-white/5 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
          <div className="flex justify-center">
            <div className="w-full max-w-[220px] aspect-square rounded-xl bg-[#202225] border border-white/10 p-3 grid grid-cols-2 gap-2 shadow-inner">
              <div className="col-span-2 h-8 rounded-md bg-gradient-to-r from-[#5865F2] to-[#7289DA]" />
              <div className="h-12 rounded-md bg-[#313338] border border-white/5" />
              <div className="h-12 rounded-md bg-[#313338] border border-white/5" />
              <div className="col-span-2 flex justify-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-[#5865F2] shadow-[0_0_10px_#5865F2]" />
                <div className="w-6 h-6 rounded-full bg-[#EB459E]" />
                <div className="w-6 h-6 rounded-full bg-[#9932CC]" />
                <div className="w-6 h-6 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Make it yours</h3>
            <p className="text-white/70 text-sm sm:text-base">
              Choose from dozens of colour themes and styles to personalise your dashboard.
            </p>
            <Link href="/themes">
              <Button
                className="dashboard-pulse-glow bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-6 py-5 font-bold transition-all"
                data-testid="button-go-to-themes"
              >
                Go to Themes <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

type ClubLite = { id: number; name: string; planType?: string | null; membershipFee?: number | null };

const BASIC_FEATURES = [
  "Join sessions & social play",
  "Browse the community feed",
  "Standard match scheduling",
  "Basic player profile",
];
const PREMIUM_FEATURES = [
  "Unlimited match organising",
  "Priority session booking",
  "Advanced player analytics",
  "AI training challenges",
  "All themes & backgrounds",
  "Exclusive tournaments",
  "Priority support",
];

export function DashboardMembershipsSection() {
  const { data: clubs = [] } = useQuery<ClubLite[]>({
    queryKey: ["/api/clubs"],
    staleTime: 60_000,
  });
  const approvedClubs = useMemo(
    () => clubs.filter((c: any) => !c?.status || c.status === "APPROVED"),
    [clubs],
  );
  const [clubId, setClubId] = useState<string>("");
  const selected = approvedClubs.find((c) => String(c.id) === clubId);

  const hasFee = selected != null && selected.membershipFee != null && Number(selected.membershipFee) > 0;
  const premiumPrice = hasFee
    ? `£${(Number(selected!.membershipFee) / 100).toFixed(2)}`
    : selected
    ? "Not offered"
    : "Varies";

  return (
    <section className="space-y-4" data-testid="section-memberships">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xs font-bold text-white/60 tracking-[0.2em] uppercase pl-1">
          Pick Your Membership Plan
        </h2>
        <div className="relative">
          <select
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="appearance-none bg-[#313338] border border-white/10 text-white rounded-lg px-4 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#5865F2] text-sm cursor-pointer"
            data-testid="select-club-filter"
          >
            <option value="">All clubs</option>
            {approvedClubs.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Basic */}
        <div className="rounded-[20px] bg-[hsl(var(--card)/0.85)] backdrop-blur-xl p-7 border border-white/10 flex flex-col hover:-translate-y-0.5 transition-transform">
          <h3 className="text-xl font-bold text-white mb-1">Basic Membership</h3>
          <p className="text-xs text-white/55 mb-4">Free forever</p>
          <div className="text-4xl font-extrabold text-white mb-6">
            £0<span className="text-base text-white/55 font-medium">/yr</span>
          </div>
          <ul className="space-y-3 mb-6 flex-1">
            {BASIC_FEATURES.map((f) => (
              <li key={f} className="flex items-start text-sm text-white/75">
                <Check className="w-4 h-4 mr-2 mt-0.5 text-[#5865F2] shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <Link href={selected ? `/memberships?clubId=${selected.id}` : "/memberships"}>
            <Button
              className="w-full bg-[#313338] hover:bg-[#3f4147] text-white border border-white/10 py-5 rounded-xl font-bold"
              data-testid="button-membership-basic"
            >
              Request to Join
            </Button>
          </Link>
        </div>

        {/* Premium */}
        <div className="nitro-border-wrap group h-full">
          <div className="rounded-[20px] bg-[hsl(var(--card)/0.85)] backdrop-blur-xl p-7 relative flex flex-col h-full z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#EB459E] to-[#9932CC] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-[18px] uppercase tracking-wider">
              Popular
            </div>
            <h3 className="text-xl font-bold text-[#EB459E] mb-1 drop-shadow-[0_0_10px_rgba(235,69,158,0.3)] flex items-center gap-2">
              Premium Membership <Sparkles className="w-4 h-4" />
            </h3>
            <p className="text-xs text-white/55 mb-4">Everything in Basic, plus more</p>
            <div className="text-4xl font-extrabold text-white mb-6">
              {premiumPrice}
              {hasFee && <span className="text-base text-white/55 font-medium">/yr</span>}
              {!selected && <span className="text-base text-white/55 font-medium ml-1">/yr · pick a club</span>}
            </div>
            <ul className="space-y-3 mb-6 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start text-sm text-white/85">
                  <Check className="w-4 h-4 mr-2 mt-0.5 text-[#EB459E] shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href={selected ? `/memberships?clubId=${selected.id}&plan=premium` : "/memberships?plan=premium"}>
              <Button
                className="w-full bg-gradient-to-r from-[#5865F2] to-[#9932CC] hover:opacity-90 text-white py-5 rounded-xl font-bold shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:scale-[1.02] transition-transform"
                data-testid="button-membership-premium"
              >
                Request to Join
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-[#313338] to-[#2B2D31] border border-[#5865F2]/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(88,101,242,0.1)]">
        <div className="text-center md:text-left">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
            What are you waiting for?
          </h3>
          <p className="text-white/65 mt-1 text-sm">Join a membership today and unlock all features.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/memberships">
            <Button
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-6 font-bold shadow-lg"
              data-testid="button-cta-signup"
            >
              Sign Up
            </Button>
          </Link>
          <Link href="/memberships">
            <Button
              variant="outline"
              className="bg-transparent hover:bg-white/5 text-white border border-white/20 rounded-full px-6 font-bold"
              data-testid="button-cta-learn"
            >
              Learn More
            </Button>
          </Link>
        </div>
      </div>

      <style>{`
        .nitro-border-wrap {
          position: relative;
          border-radius: 20px;
          z-index: 1;
        }
        .nitro-border-wrap::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 21px;
          background: linear-gradient(135deg, rgba(88,101,242,0.5), rgba(235,69,158,0.5), rgba(114,137,218,0.5));
          z-index: -1;
          opacity: 0.35;
          transition: opacity 0.3s ease;
        }
        .nitro-border-wrap:hover::before {
          opacity: 1;
          background: linear-gradient(135deg, #5865F2, #EB459E, #7289DA);
        }
        @keyframes dashboard-pulse-glow {
          0%   { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.45); }
          70%  { box-shadow: 0 0 0 12px rgba(88, 101, 242, 0); }
          100% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0); }
        }
        .dashboard-pulse-glow {
          animation: dashboard-pulse-glow 2.2s infinite;
        }
      `}</style>
    </section>
  );
}

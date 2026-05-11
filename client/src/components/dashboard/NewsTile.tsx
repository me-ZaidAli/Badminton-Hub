import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, ExternalLink, ChevronRight, Loader2 } from "lucide-react";

type NewsItem = { title: string; source: string; url: string; summary: string; publishedAt?: string };
type NewsResp = { fetchedAt: number; items: NewsItem[] };

export function NewsTile() {
  const { data, isLoading } = useQuery<NewsResp>({
    queryKey: ["/api/daily-content/news"],
    staleTime: 30 * 60 * 1000,
  });

  const items = data?.items || [];
  const [idx, setIdx] = useState(0);

  // Auto-rotate every 9s
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), 9000);
    return () => clearInterval(id);
  }, [items.length]);

  const cur = items[idx % Math.max(1, items.length)] || null;

  return (
    <div
      className="group relative col-span-1 md:col-span-2 overflow-hidden rounded-2xl border border-amber-300/15 bg-gradient-to-br from-orange-700/25 via-rose-700/25 to-red-900/40 p-5 shadow-2xl"
      data-testid="hero-news"
    >
      {/* Glow halos */}
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-12 w-72 h-72 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-200/90 font-bold">Badminton news</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-white/70">Live · web</span>
              </div>
            </div>
          </div>
          {items.length > 1 && (
            <span className="text-[10px] text-white/55 tabular-nums font-bold shrink-0">{idx + 1}/{items.length}</span>
          )}
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/55 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading latest news…</span>
          </div>
        ) : !cur ? (
          <div className="text-sm text-white/70 py-4">No news right now.</div>
        ) : (
          <a
            href={cur.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block flex-1 -mx-1 px-1 py-1 rounded-lg hover:bg-white/5 transition group/link"
            data-testid={`link-news-${idx}`}
          >
            <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2 group-hover/link:text-amber-200 transition" data-testid="text-news-title">
              {cur.title}
            </h3>
            {cur.summary && (
              <p className="text-xs text-white/75 mt-1.5 line-clamp-2 leading-relaxed">{cur.summary}</p>
            )}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-amber-200/80 font-bold truncate">{cur.source}</span>
                {cur.publishedAt && (
                  <span className="text-[10px] text-white/45 truncate">· {cur.publishedAt}</span>
                )}
              </div>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-200 shrink-0">
                Read <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </a>
        )}

        {/* Pagination dots */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {items.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === (idx % items.length) ? "w-6 bg-amber-300" : "w-1.5 bg-white/25 hover:bg-white/40"}`}
                aria-label={`Show news ${i + 1}`}
                data-testid={`button-news-dot-${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Universal Global Search — floating, themed, role-aware.
//
// Pages/menus are sourced from useNavGroups() (already role-filtered by the
// sidebar) so the page list always matches what the user can actually open.
// DB records (clubs, players, sessions, venues, tournaments) come from
// GET /api/global-search?q=... (server-side permission-scoped).
//
// Behavior:
//   • Floating elevated input with theme-token colors (no hard-coded palette)
//   • Live debounced results (180ms) with framer-motion fade/stagger
//   • Keyboard nav: ArrowUp/Down, Enter, Esc; Cmd/Ctrl+K to focus
//   • Click outside or Esc closes the dropdown
//   • Grouped result panel: Pages, Clubs, Players, Sessions, Venues, Tournaments
//   • Empty state: "No results found — try different keywords"

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  ArrowRight,
  Building2,
  Users,
  Calendar,
  MapPin,
  Award,
  LayoutGrid,
  CornerDownLeft,
} from "lucide-react";
import { useNavGroups, collapseToHubs } from "@/components/layout/Sidebar";
import { useUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Hit = {
  id: number | string;
  title: string;
  subtitle?: string;
  href: string;
};

type ServerResults = {
  clubs: Hit[];
  players: Hit[];
  sessions: Hit[];
  venues: Hit[];
  tournaments: Hit[];
};

type Group = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: (Hit & { _icon?: React.ComponentType<{ className?: string }> })[];
};

const EMPTY_SERVER: ServerResults = {
  clubs: [],
  players: [],
  sessions: [],
  venues: [],
  tournaments: [],
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function rankHit(q: string, title: string): number {
  const t = title.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  // very loose token-prefix fallback (e.g. "fin" → "financials")
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 3;
  return 99;
}

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const { groups: rawNavGroups } = useNavGroups();
  const navGroups = useMemo(() => collapseToHubs(rawNavGroups), [rawNavGroups]);

  // Flattened page index from the (already role-filtered) sidebar.
  const pagesIndex = useMemo(() => {
    const out: { title: string; href: string; subtitle: string; Icon: any }[] = [];
    for (const g of navGroups) {
      for (const it of g.items) {
        out.push({
          title: it.label,
          href: it.href,
          subtitle: g.label,
          Icon: it.icon,
        });
      }
    }
    // De-dupe by href (hub items repeat the pinned passthroughs)
    const seen = new Set<string>();
    return out.filter((p) => {
      if (seen.has(p.href)) return false;
      seen.add(p.href);
      return true;
    });
  }, [navGroups]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const debounced = useDebounced(query.trim(), 180);
  const qLower = debounced.toLowerCase();
  const enabled = debounced.length >= 2 && !!user;

  const { data: serverData, isFetching } = useQuery<ServerResults>({
    queryKey: ["/api/global-search", debounced],
    enabled,
    queryFn: async () => {
      const res = await fetch(
        `/api/global-search?q=${encodeURIComponent(debounced)}`,
        { credentials: "include" },
      );
      if (!res.ok) return EMPTY_SERVER;
      return res.json();
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const groupedResults: Group[] = useMemo(() => {
    if (qLower.length < 2) return [];

    const pageHits = pagesIndex
      .map((p) => ({ ...p, _r: rankHit(qLower, p.title) }))
      .filter((p) => p._r < 99)
      .sort((a, b) => a._r - b._r)
      .slice(0, 8)
      .map((p) => ({
        id: p.href,
        title: p.title,
        subtitle: p.subtitle,
        href: p.href,
        _icon: p.Icon,
      }));

    const sd = serverData || EMPTY_SERVER;
    const groups: Group[] = [
      { key: "pages", label: "Pages & Menus", Icon: LayoutGrid, items: pageHits },
      { key: "clubs", label: "Clubs", Icon: Building2, items: sd.clubs },
      { key: "players", label: "Players", Icon: Users, items: sd.players },
      { key: "sessions", label: "Sessions", Icon: Calendar, items: sd.sessions },
      { key: "tournaments", label: "Tournaments", Icon: Award, items: sd.tournaments },
      { key: "venues", label: "Venues", Icon: MapPin, items: sd.venues },
    ].filter((g) => g.items.length > 0);
    return groups;
  }, [pagesIndex, serverData, qLower]);

  // Flat list of all hits (in render order) — drives keyboard nav.
  const flatHits = useMemo(
    () => groupedResults.flatMap((g) => g.items),
    [groupedResults],
  );

  // Reset highlight whenever the result set changes.
  useEffect(() => {
    setActiveIdx(0);
  }, [debounced, serverData]);

  // Cmd/Ctrl+K global focus shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = useCallback(
    (hit: Hit) => {
      setOpen(false);
      setQuery("");
      navigate(hit.href);
    },
    [navigate],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(flatHits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const hit = flatHits[activeIdx];
      if (hit) {
        e.preventDefault();
        choose(hit);
      }
    }
  };

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";
  const placeholder = isAdmin
    ? "Search menus, settings, clubs, players, matches, reports..."
    : "Search schedules, results, rankings, venues, help...";

  const showDropdown =
    open && qLower.length >= 2;

  // Build a "running index" so each list item knows its absolute position
  // across all groups (needed for keyboard highlight).
  let runningIdx = -1;

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", compact ? "max-w-full" : "max-w-2xl")}
      data-testid="global-search-root"
    >
      <motion.div
        animate={{ scale: open ? 1.01 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "relative flex items-center rounded-2xl border bg-card/95 backdrop-blur-md",
          "border-border/60 shadow-lg shadow-foreground/5",
          open && "shadow-xl shadow-primary/10 ring-2 ring-primary/30 border-primary/40",
          "transition-shadow duration-200",
        )}
      >
        <Search
          className="ml-3 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Global search"
          data-testid="input-global-search"
          className={cn(
            "flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
            "outline-none focus:outline-none border-0",
            compact ? "h-10" : "h-11",
          )}
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="mr-1.5 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Clear search"
            data-testid="button-global-search-clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd
            className={cn(
              "mr-3 hidden md:inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40",
              "px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground",
            )}
            aria-hidden
          >
            ⌘K
          </kbd>
        )}
      </motion.div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+8px)] z-[200]",
              "rounded-2xl border border-border/60 bg-popover text-popover-foreground",
              "shadow-2xl shadow-foreground/15 ring-1 ring-foreground/5",
              "max-h-[70vh] overflow-y-auto",
            )}
            data-testid="global-search-dropdown"
          >
            {isFetching && groupedResults.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Searching…
              </div>
            )}

            {!isFetching && groupedResults.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No results found — try different keywords
              </div>
            )}

            {groupedResults.map((group, gi) => (
              <div key={group.key} className={cn(gi > 0 && "border-t border-border/40")}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  <group.Icon className="h-3 w-3" />
                  {group.label}
                </div>
                <ul className="pb-2">
                  {group.items.map((hit) => {
                    runningIdx += 1;
                    // Snapshot the absolute index for THIS item — the closure
                    // below must capture `idx`, not the outer mutable counter,
                    // otherwise hover highlight resolves to the wrong row.
                    const idx = runningIdx;
                    const isActive = idx === activeIdx;
                    const ItemIcon = (hit as any)._icon || group.Icon;
                    return (
                      <motion.li
                        key={`${group.key}-${hit.id}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => choose(hit)}
                          data-testid={`global-search-result-${group.key}-${hit.id}`}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
                            "hover:bg-muted/60 active:scale-[0.99]",
                            isActive && "bg-primary/10",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40",
                              isActive
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "bg-muted/40 text-muted-foreground",
                            )}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-foreground truncate">
                              {hit.title}
                            </span>
                            {hit.subtitle && (
                              <span className="block text-xs text-muted-foreground truncate">
                                {hit.subtitle}
                              </span>
                            )}
                          </span>
                          {isActive ? (
                            <CornerDownLeft className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground bg-muted/20">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/60 bg-card px-1 py-0.5 font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/60 bg-card px-1 py-0.5 font-mono">↵</kbd>
                  open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/60 bg-card px-1 py-0.5 font-mono">esc</kbd>
                  close
                </span>
              </span>
              {isFetching && <span>updating…</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

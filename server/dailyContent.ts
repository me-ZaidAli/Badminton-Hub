import type { Express, Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FALLBACK_QUOTES = [
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "The only way to prove that you're a good sport is to lose.", author: "Ernie Banks" },
  { text: "Excellence is the gradual result of always striving to do better.", author: "Pat Riley" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
];

const FALLBACK_DEALS: Deal[] = [
  { brand: "Central Sports", offer: "Shop rackets, shoes & shuttles", url: "https://centralsports.co.uk/", category: "Sponsor", sponsored: true },
  { brand: "Central Sports", offer: "Yonex restringing service", url: "https://centralsports.co.uk/", category: "Service", sponsored: true },
  { brand: "Yonex", offer: "Up to 25% off rackets", url: "https://www.yonex.com/deals", category: "Rackets" },
  { brand: "Wilson", offer: "Free string with racket", url: "https://www.wilson.com", category: "Rackets" },
  { brand: "Decathlon", offer: "20% off Perfly badminton range", url: "https://www.decathlon.co.uk", category: "Apparel" },
  { brand: "Sports Direct", offer: "Buy 2 get 1 free shuttles", url: "https://www.sportsdirect.com", category: "Shuttles" },
  { brand: "Babolat", offer: "10% off junior rackets", url: "https://www.babolat.com", category: "Junior" },
  { brand: "MyProtein", offer: "30% off whey + free shaker", url: "https://www.myprotein.com", category: "Nutrition" },
];

const FALLBACK_POLLS = [
  { question: "Coffee or tea before a match?", options: ["Coffee", "Tea", "Neither"] },
  { question: "Best surface to play on?", options: ["Wood", "Synthetic", "Concrete"] },
  { question: "Pre-game playlist?", options: ["Hip-hop", "Rock", "Lo-fi", "Silence"] },
  { question: "Favourite recovery snack?", options: ["Banana", "Protein bar", "Smoothie", "Nothing"] },
  { question: "How do you warm up?", options: ["Light jog", "Stretching", "Shadow drills", "Straight in"] },
  { question: "Singles or doubles?", options: ["Singles", "Doubles", "Mixed"] },
  { question: "Match nerves: love or hate?", options: ["Love them", "Hate them", "Used to them"] },
];

type CachedQuote = { date: string; text: string; author: string };
type CachedPoll = { date: string; question: string; options: string[] };
type Deal = { brand: string; offer: string; url: string; category: string; imageUrl?: string; sponsored?: boolean };
type CachedDeals = { date: string; deals: Deal[] };
type NewsItem = { title: string; source: string; url: string; summary: string; publishedAt?: string; imageUrl?: string };
type CachedNews = { fetchedAt: number; items: NewsItem[] };
type BeTournament = { name: string; startDate: string; endDate?: string; location?: string; audience: "ADULT" | "JUNIOR"; level?: string; url: string };
type CachedBeTournaments = { date: string; adults: BeTournament[]; juniors: BeTournament[] };
type BeCoachCourse = { title: string; level?: string; startDate: string; endDate?: string; location?: string; url: string };
type CachedBeCoachCourses = { date: string; courses: BeCoachCourse[] };

const FALLBACK_NEWS: NewsItem[] = [
  { title: "BWF World Tour: Latest results & upcoming events", source: "BWF", url: "https://bwfbadminton.com/news/", summary: "Catch up on the latest match results, rankings and tournament schedules from the world tour." },
  { title: "Badminton England news hub", source: "Badminton England", url: "https://www.badmintonengland.co.uk/news/", summary: "National news, county updates, league results and grassroots stories." },
  { title: "Badminton Central — community & gear", source: "Badminton Central", url: "https://www.badmintoncentral.com/forums/", summary: "Discussions on rackets, strings and player tactics from the global community." },
  { title: "Yonex player news", source: "Yonex", url: "https://www.yonex.com/badminton/news", summary: "Sponsored player updates, new releases and tournament wins." },
];

let quoteCache: CachedQuote | null = null;
let pollCache: CachedPoll | null = null;
let dealsCache: CachedDeals | null = null;
let newsCache: CachedNews | null = null;
let beTournamentsCache: CachedBeTournaments | null = null;
let beCoachCoursesCache: CachedBeCoachCourses | null = null;
const NEWS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const FALLBACK_BE_TOURNAMENTS_ADULTS: BeTournament[] = [
  { name: "Browse all Badminton England senior tournaments", startDate: "", audience: "ADULT", url: "https://be.tournamentsoftware.com/tournaments" },
];
const FALLBACK_BE_TOURNAMENTS_JUNIORS: BeTournament[] = [
  { name: "Browse all Badminton England junior tournaments", startDate: "", audience: "JUNIOR", url: "https://be.tournamentsoftware.com/tournaments" },
];
const FALLBACK_BE_COURSES: BeCoachCourse[] = [
  { title: "Browse all Badminton England coach courses", startDate: "", url: "https://www.badmintonengland.co.uk/play/coaching-and-officiating/become-a-coach/" },
];

// In-memory tally per day. Key = YYYY-MM-DD, value = Map<optionIndex, Set<userId>>
const pollVotes = new Map<string, Map<number, Set<number>>>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickFallback<T>(arr: T[], dateStr: string): T {
  // deterministic by date
  const seed = dateStr.split("-").reduce((acc, p) => acc + parseInt(p, 10), 0);
  return arr[seed % arr.length];
}

async function generateQuote(dateStr: string): Promise<CachedQuote> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const f = pickFallback(FALLBACK_QUOTES, dateStr);
    return { date: dateStr, text: f.text, author: f.author };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: "You return ONLY a single short motivational sports quote (max 18 words) and the author's name. Reply strictly as JSON: {\"text\":\"...\",\"author\":\"...\"}. No preamble. Real or attributed quote that's broadly recognised." },
        { role: "user", content: `Give today's quote (${dateStr}) for a racket-sports club. Theme: discipline, focus, or grit.` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (parsed?.text && parsed?.author) {
      return { date: dateStr, text: String(parsed.text).slice(0, 240), author: String(parsed.author).slice(0, 80) };
    }
  } catch (e) {
    console.warn("[DAILY QUOTE] generation failed, using fallback:", (e as any)?.message);
  }
  const f = pickFallback(FALLBACK_QUOTES, dateStr);
  return { date: dateStr, text: f.text, author: f.author };
}

async function generatePoll(dateStr: string): Promise<CachedPoll> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const f = pickFallback(FALLBACK_POLLS, dateStr);
    return { date: dateStr, question: f.question, options: f.options };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: "You return ONLY a fun, light, low-stakes daily poll for a racket-sports club app. Reply strictly as JSON: {\"question\":\"...\",\"options\":[\"a\",\"b\",\"c\"]}. 2-4 options, each ≤ 18 chars. Question max 70 chars. No politics, no controversy. Examples: coffee/tea, favourite recovery snack, pre-match warm-up routine." },
        { role: "user", content: `Give today's poll (${dateStr}). Make it fresh and unrelated to recent days.` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (parsed?.question && Array.isArray(parsed?.options) && parsed.options.length >= 2) {
      const opts = parsed.options.slice(0, 4).map((o: any) => String(o).slice(0, 22));
      return { date: dateStr, question: String(parsed.question).slice(0, 100), options: opts };
    }
  } catch (e) {
    console.warn("[DAILY POLL] generation failed, using fallback:", (e as any)?.message);
  }
  const f = pickFallback(FALLBACK_POLLS, dateStr);
  return { date: dateStr, question: f.question, options: f.options };
}

async function generateDeals(dateStr: string): Promise<CachedDeals> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { date: dateStr, deals: FALLBACK_DEALS.slice(0, 6) };
  }
  // Try OpenAI Responses API with web_search tool first (real-time web results)
  try {
    const r = await fetch(`${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1"}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        tools: [{ type: "web_search" }],
        input: `Search the web right now for 6 CURRENT live deals on badminton/racket-sports gear available to UK shoppers today (${dateStr}).

IMPORTANT — SPONSORED PARTNER: The FIRST TWO deals MUST be live products from our club sponsor Central Sports (https://centralsports.co.uk/). Browse the site, pick two real product pages (rackets, shoes, shuttles, bags, strings or restringing), and use their real product URLs. Set "sponsored": true and "brand": "Central Sports" on those two. Try to include the product's main image URL in "imageUrl" (https only, must end in .jpg/.jpeg/.png/.webp or be a Shopify/cdn image URL).

The remaining 4 deals can be from other reputable UK retailers (Yonex, Victor, Li-Ning, Babolat, Decathlon, Sports Direct, RacketDepot, MyProtein, etc) — also include "imageUrl" where you can find a real product image.

Return STRICT JSON ONLY (no prose, no markdown) in this exact shape:
{"deals":[{"brand":"...","offer":"short under 40 chars","url":"https://...","category":"Rackets|Apparel|Shuttles|Shoes|Strings|Service|Nutrition|Junior|Bags|Sponsor","imageUrl":"https://...","sponsored":true}]}

Use the real product URLs and image URLs you actually found. Only include offers that look genuinely current.`,
      }),
    });
    if (r.ok) {
      const data: any = await r.json();
      const text = data?.output_text
        || data?.output?.flatMap((o: any) => o?.content || []).map((c: any) => c?.text).filter(Boolean).join("\n")
        || "";
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed?.deals) && parsed.deals.length > 0) {
          const cleaned: Deal[] = parsed.deals.slice(0, 8).map((d: any) => {
            const imgRaw = String(d.imageUrl || "").trim();
            const imgOk = /^https:\/\/.+/i.test(imgRaw) && imgRaw.length < 500;
            return {
              brand: String(d.brand || "").slice(0, 40),
              offer: String(d.offer || "").slice(0, 60),
              url: String(d.url || "").slice(0, 400),
              category: String(d.category || "Deal").slice(0, 24),
              imageUrl: imgOk ? imgRaw : undefined,
              sponsored: Boolean(d.sponsored) || String(d.url || "").includes("centralsports.co.uk") || String(d.brand || "").toLowerCase().includes("central sports"),
            };
          }).filter((d: Deal) => d.brand && d.offer && d.url.startsWith("http"));
          if (cleaned.length > 0) {
            // Ensure at least one Central Sports deal is present and sorted first
            const hasSponsor = cleaned.some(d => d.sponsored);
            if (!hasSponsor) {
              cleaned.unshift({ brand: "Central Sports", offer: "Shop rackets, shoes & shuttles", url: "https://centralsports.co.uk/", category: "Sponsor", sponsored: true });
            }
            cleaned.sort((a, b) => Number(Boolean(b.sponsored)) - Number(Boolean(a.sponsored)));
            console.log(`[DAILY DEALS] web-search returned ${cleaned.length} deals for ${dateStr} (sponsored: ${cleaned.filter(d => d.sponsored).length})`);
            return { date: dateStr, deals: cleaned.slice(0, 8) };
          }
        }
      }
    } else {
      console.warn(`[DAILY DEALS] responses API ${r.status}, falling back to chat completions`);
    }
  } catch (e) {
    console.warn("[DAILY DEALS] web_search path failed:", (e as any)?.message);
  }
  // Fallback: ask the model from its training knowledge
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: "Return STRICT JSON only: {\"deals\":[{\"brand\":\"...\",\"offer\":\"under 40 chars\",\"url\":\"https://realbrand.com\",\"category\":\"Rackets|Apparel|Shuttles|Shoes|Strings|Service|Nutrition|Junior|Sponsor\",\"sponsored\":false}]}. The FIRST TWO deals must be sponsor Central Sports — set brand=\"Central Sports\", url=\"https://centralsports.co.uk/\", sponsored=true, with a believable racket/shoe/shuttle offer. The remaining 4 are plausible CURRENT-STYLE offers from other UK-available brands (Yonex, Victor, Li-Ning, Babolat, Wilson, Decathlon, Sports Direct, MyProtein, RacketDepot, Pro:Direct). Use the brand's real homepage as the URL. Vary categories." },
        { role: "user", content: `Today is ${dateStr}. Give 6 deals.` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.deals) && parsed.deals.length > 0) {
      const cleaned: Deal[] = parsed.deals.slice(0, 8).map((d: any) => ({
        brand: String(d.brand || "").slice(0, 40),
        offer: String(d.offer || "").slice(0, 60),
        url: String(d.url || "").slice(0, 400),
        category: String(d.category || "Deal").slice(0, 24),
        sponsored: Boolean(d.sponsored) || String(d.url || "").includes("centralsports.co.uk") || String(d.brand || "").toLowerCase().includes("central sports"),
      })).filter((d: Deal) => d.brand && d.offer && d.url.startsWith("http"));
      if (cleaned.length > 0) {
        if (!cleaned.some(d => d.sponsored)) {
          cleaned.unshift({ brand: "Central Sports", offer: "Shop rackets, shoes & shuttles", url: "https://centralsports.co.uk/", category: "Sponsor", sponsored: true });
        }
        cleaned.sort((a, b) => Number(Boolean(b.sponsored)) - Number(Boolean(a.sponsored)));
        return { date: dateStr, deals: cleaned.slice(0, 8) };
      }
    }
  } catch (e) {
    console.warn("[DAILY DEALS] chat fallback failed:", (e as any)?.message);
  }
  return { date: dateStr, deals: FALLBACK_DEALS.slice(0, 6) };
}

async function generateNews(): Promise<CachedNews> {
  const now = Date.now();
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { fetchedAt: now, items: FALLBACK_NEWS };
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  // Try OpenAI Responses API with web_search for live news
  try {
    const resp: any = await (openai as any).responses.create({
      model: "gpt-5.1",
      tools: [{ type: "web_search" }],
      input: `Search the web RIGHT NOW for the 6 most important and recent badminton news stories worldwide (today is ${todayStr}). Cover BWF World Tour results, player news, transfers, tournament announcements, equipment launches, English/UK badminton news. Return STRICT JSON ONLY (no prose, no markdown) in this exact shape: {"items":[{"title":"...","source":"site name","url":"https://...","summary":"one sentence under 140 chars","publishedAt":"YYYY-MM-DD or relative","imageUrl":"https://..."}]}. Use REAL article URLs you actually found in the search results. For "imageUrl", include the actual lead/hero image displayed on the article page (og:image / featured image) — https only, ending in .jpg/.jpeg/.png/.webp, or a CDN image URL. If you genuinely can't find one, omit the field. Prefer reputable sources: BWF, Badminton England, BadmintonCentral, BWF Insidious, Olympic.org, ESPN, Yonex, Victor.`,
    });
    const text: string = resp?.output_text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        const cleaned: NewsItem[] = parsed.items.slice(0, 8).map((n: any) => {
          const imgRaw = String(n.imageUrl || "").trim();
          const imgOk = /^https:\/\/.+/i.test(imgRaw) && imgRaw.length < 600;
          return {
            title: String(n.title || "").slice(0, 140).trim(),
            source: String(n.source || "").slice(0, 40).trim(),
            url: String(n.url || "").trim(),
            summary: String(n.summary || "").slice(0, 200).trim(),
            publishedAt: n.publishedAt ? String(n.publishedAt).slice(0, 30) : undefined,
            imageUrl: imgOk ? imgRaw : undefined,
          };
        }).filter((n: NewsItem) => n.title && n.url.startsWith("http"));
        if (cleaned.length > 0) {
          console.log(`[DAILY NEWS] web-search returned ${cleaned.length} items`);
          return { fetchedAt: now, items: cleaned };
        }
      }
    }
  } catch (e) {
    console.warn("[DAILY NEWS] web_search path failed:", (e as any)?.message);
  }
  return { fetchedAt: now, items: FALLBACK_NEWS };
}

async function generateBeTournaments(dateStr: string): Promise<CachedBeTournaments> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { date: dateStr, adults: FALLBACK_BE_TOURNAMENTS_ADULTS, juniors: FALLBACK_BE_TOURNAMENTS_JUNIORS };
  }
  try {
    const resp: any = await (openai as any).responses.create({
      model: "gpt-5.1",
      tools: [{ type: "web_search" }],
      input: `Today is ${dateStr}. Search https://be.tournamentsoftware.com/tournaments (the official Badminton England tournament listing on Tournament Software) for upcoming Badminton England tournaments in the UK. Return up to 6 ADULT/senior events and up to 6 JUNIOR (U11/U13/U15/U17/U19) events, sorted by start date ascending, only future dates from today onward.

Return STRICT JSON ONLY (no prose, no markdown) in this exact shape:
{"adults":[{"name":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"city / venue","level":"e.g. Bronze / Silver / Gold / National","url":"https://be.tournamentsoftware.com/sport/tournament?id=..."}],"juniors":[{"name":"...","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"city / venue","level":"...","url":"https://..."}]}

The "url" MUST be the real tournament detail page on be.tournamentsoftware.com or badmintonengland.co.uk. Drop any event whose date you can't verify. "name" max 90 chars. "location" max 50 chars. "level" max 24 chars.`,
    });
    const text: string = resp?.output_text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      const clean = (arr: any[], audience: "ADULT" | "JUNIOR"): BeTournament[] => {
        if (!Array.isArray(arr)) return [];
        return arr.slice(0, 8).map((t: any) => ({
          name: String(t.name || "").slice(0, 120).trim(),
          startDate: String(t.startDate || "").slice(0, 10),
          endDate: t.endDate ? String(t.endDate).slice(0, 10) : undefined,
          location: t.location ? String(t.location).slice(0, 80).trim() : undefined,
          level: t.level ? String(t.level).slice(0, 32).trim() : undefined,
          audience,
          url: String(t.url || "").slice(0, 400),
        })).filter((t: BeTournament) => t.name && /^\d{4}-\d{2}-\d{2}$/.test(t.startDate) && t.url.startsWith("http"));
      };
      const adults = clean(parsed?.adults, "ADULT");
      const juniors = clean(parsed?.juniors, "JUNIOR");
      if (adults.length + juniors.length > 0) {
        console.log(`[BE TOURNAMENTS] web-search returned adults=${adults.length} juniors=${juniors.length} for ${dateStr}`);
        return { date: dateStr, adults: adults.length ? adults : FALLBACK_BE_TOURNAMENTS_ADULTS, juniors: juniors.length ? juniors : FALLBACK_BE_TOURNAMENTS_JUNIORS };
      }
    }
  } catch (e) {
    console.warn("[BE TOURNAMENTS] web_search failed:", (e as any)?.message);
  }
  return { date: dateStr, adults: FALLBACK_BE_TOURNAMENTS_ADULTS, juniors: FALLBACK_BE_TOURNAMENTS_JUNIORS };
}

async function generateBeCoachCourses(dateStr: string): Promise<CachedBeCoachCourses> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return { date: dateStr, courses: FALLBACK_BE_COURSES };
  }
  try {
    const resp: any = await (openai as any).responses.create({
      model: "gpt-5.1",
      tools: [{ type: "web_search" }],
      input: `Today is ${dateStr}. Search the Badminton England website (https://www.badmintonengland.co.uk/play/coaching-and-officiating/) and the BE course booking pages for UPCOMING coach qualification & CPD courses in the UK (e.g. Level 1 Coach Award, Level 2 Coach Award, Coach Activator, Coach Educator, Safeguarding, First Aid, CPD workshops). Return up to 8 future courses sorted by start date ascending.

Return STRICT JSON ONLY (no prose, no markdown):
{"courses":[{"title":"...","level":"Level 1 / Level 2 / CPD / Safeguarding","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","location":"city / venue","url":"https://www.badmintonengland.co.uk/..."}]}

The "url" MUST be the real BE booking / event page. Drop any course whose date you can't verify. "title" max 100 chars. "location" max 60 chars. "level" max 32 chars.`,
    });
    const text: string = resp?.output_text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed?.courses)) {
        const cleaned: BeCoachCourse[] = parsed.courses.slice(0, 12).map((c: any) => ({
          title: String(c.title || "").slice(0, 140).trim(),
          level: c.level ? String(c.level).slice(0, 40).trim() : undefined,
          startDate: String(c.startDate || "").slice(0, 10),
          endDate: c.endDate ? String(c.endDate).slice(0, 10) : undefined,
          location: c.location ? String(c.location).slice(0, 80).trim() : undefined,
          url: String(c.url || "").slice(0, 400),
        })).filter((c: BeCoachCourse) => c.title && /^\d{4}-\d{2}-\d{2}$/.test(c.startDate) && c.url.startsWith("http"));
        if (cleaned.length > 0) {
          console.log(`[BE COACH COURSES] web-search returned ${cleaned.length} for ${dateStr}`);
          return { date: dateStr, courses: cleaned };
        }
      }
    }
  } catch (e) {
    console.warn("[BE COACH COURSES] web_search failed:", (e as any)?.message);
  }
  return { date: dateStr, courses: FALLBACK_BE_COURSES };
}

export function registerDailyContentRoutes(app: Express): void {
  // GET /api/daily-content/quote
  app.get("/api/daily-content/quote", async (_req: Request, res: Response) => {
    const day = todayKey();
    if (!quoteCache || quoteCache.date !== day) {
      quoteCache = await generateQuote(day);
    }
    res.json(quoteCache);
  });

  // GET /api/daily-content/news
  app.get("/api/daily-content/news", async (_req: Request, res: Response) => {
    const now = Date.now();
    if (!newsCache || now - newsCache.fetchedAt > NEWS_TTL_MS) {
      newsCache = await generateNews();
    }
    res.json(newsCache);
  });

  // GET /api/daily-content/deals
  app.get("/api/daily-content/deals", async (_req: Request, res: Response) => {
    const day = todayKey();
    if (!dealsCache || dealsCache.date !== day) {
      dealsCache = await generateDeals(day);
    }
    res.json(dealsCache);
  });

  // GET /api/daily-content/be-tournaments
  app.get("/api/daily-content/be-tournaments", async (_req: Request, res: Response) => {
    const day = todayKey();
    if (!beTournamentsCache || beTournamentsCache.date !== day) {
      beTournamentsCache = await generateBeTournaments(day);
    }
    res.json(beTournamentsCache);
  });

  // GET /api/daily-content/be-coach-courses
  app.get("/api/daily-content/be-coach-courses", async (_req: Request, res: Response) => {
    const day = todayKey();
    if (!beCoachCoursesCache || beCoachCoursesCache.date !== day) {
      beCoachCoursesCache = await generateBeCoachCourses(day);
    }
    res.json(beCoachCoursesCache);
  });

  // GET /api/daily-content/poll
  app.get("/api/daily-content/poll", async (req: Request, res: Response) => {
    const day = todayKey();
    if (!pollCache || pollCache.date !== day) {
      pollCache = await generatePoll(day);
      pollVotes.set(day, new Map());
    }
    const dayMap = pollVotes.get(day) || new Map();
    const counts = pollCache.options.map((_o, idx) => (dayMap.get(idx)?.size || 0));
    const total = counts.reduce((a, b) => a + b, 0);
    let myVote: number | null = null;
    const userId = (req.user as any)?.id;
    if (userId) {
      for (const [idx, set] of dayMap.entries()) {
        if (set.has(userId)) { myVote = idx; break; }
      }
    }
    res.json({ date: day, question: pollCache.question, options: pollCache.options, counts, total, myVote });
  });

  // POST /api/daily-content/poll/vote { optionIndex }
  app.post("/api/daily-content/poll/vote", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const userId = (req.user as any).id as number;
    const day = todayKey();
    if (!pollCache || pollCache.date !== day) {
      pollCache = await generatePoll(day);
      pollVotes.set(day, new Map());
    }
    const optionIndex = Number(req.body?.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= pollCache.options.length) {
      return res.status(400).json({ message: "Invalid option" });
    }
    let dayMap = pollVotes.get(day);
    if (!dayMap) { dayMap = new Map(); pollVotes.set(day, dayMap); }
    // Remove prior vote
    for (const set of dayMap.values()) set.delete(userId);
    let bucket = dayMap.get(optionIndex);
    if (!bucket) { bucket = new Set(); dayMap.set(optionIndex, bucket); }
    bucket.add(userId);
    const counts = pollCache.options.map((_o, idx) => (dayMap!.get(idx)?.size || 0));
    const total = counts.reduce((a, b) => a + b, 0);
    res.json({ date: day, question: pollCache.question, options: pollCache.options, counts, total, myVote: optionIndex });
  });
}

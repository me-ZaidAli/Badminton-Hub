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

let quoteCache: CachedQuote | null = null;
let pollCache: CachedPoll | null = null;

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

export function registerDailyContentRoutes(app: Express): void {
  // GET /api/daily-content/quote
  app.get("/api/daily-content/quote", async (_req: Request, res: Response) => {
    const day = todayKey();
    if (!quoteCache || quoteCache.date !== day) {
      quoteCache = await generateQuote(day);
    }
    res.json(quoteCache);
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

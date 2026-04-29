import type { Request, Response, NextFunction } from "express";
import LRU from "lru-cache";

type Bucket = { count: number; resetAt: number };

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  message?: string;
  cacheSize?: number;
}) {
  const cache = new LRU<string, Bucket>({
    max: opts.cacheSize ?? 5000,
    maxAge: opts.windowMs,
  } as any);
  const message = opts.message || "Too many requests, please try again later.";

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV === "test") return next();
    const key = opts.keyFn
      ? opts.keyFn(req)
      : `${req.ip || "unknown"}:${req.path}`;
    const now = Date.now();
    const existing = cache.get(key);
    if (!existing || existing.resetAt <= now) {
      cache.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    existing.count += 1;
    if (existing.count > opts.max) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ message, retryAfter: retryAfterSec });
    }
    next();
  };
}

// Common limiter presets
export const authLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `login:${req.ip}:${((req.body?.email || req.body?.username) || "").toString().toLowerCase()}`,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

export const authRegisterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyFn: (req) => `register:${req.ip}`,
  message: "Too many registration attempts from this device. Please try again later.",
});

export const aiHeavyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 6,
  keyFn: (req) => `ai:${(req as any).user?.id || req.ip}`,
  message: "You're using AI features too quickly. Please wait a moment.",
});

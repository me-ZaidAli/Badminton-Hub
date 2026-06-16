import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { seedJuniorSkills } from "./juniorSkillsSeed";
import { seedExercises } from "./exerciseSeed";
import { seedPlayerSkillCategories } from "./playerSkillsSeed";
import { seedRecognitionCards } from "./cardsSeed";
import { serveStatic } from "./static";
import { createServer } from "http";
import { evaluateAllClubsGrades } from "./grading";
import { autoCloseInactiveTickets } from "./ticket-autoclose";
import { runNotificationScheduler } from "./notification-scheduler";
import { runPostSessionUnpaidReminder } from "./pushScheduler";
import {
  runProfileIncompleteReminder,
  runScheduledNotifications,
} from "./notificationCrons";
import { ensureRuleSeeds } from "./notificationRules";
import { syncParentChildLinks } from "./parentLinkSync";
import { ensureHotIndexes } from "./dbIndexes";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const SERVER_STARTED_AT = Date.now();
const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Default JSON body limit is conservative to limit DoS risk.
// Specific endpoints that legitimately receive larger payloads (e.g. base64
// image fallbacks during BSL club registration) opt into a higher cap below.
const jsonLargeRoutes = [/^\/api\/bsl\/clubs(?:\/|$)/];
const jsonStandard = express.json({
  limit: "256kb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});
const jsonLarge = express.json({
  limit: "8mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
});
app.use((req, res, next) => {
  const useLarge = jsonLargeRoutes.some((re) => re.test(req.path));
  return (useLarge ? jsonLarge : jsonStandard)(req, res, next);
});

app.use(express.urlencoded({ extended: false, limit: "256kb" }));

// Attach a request id to every request for log correlation. Clients may pass
// their own X-Request-Id (capped) or one is generated.
app.use((req, res, next) => {
  const incoming = req.header("x-request-id");
  const id =
    incoming && /^[A-Za-z0-9._-]{1,64}$/.test(incoming)
      ? incoming
      : randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round((Date.now() - SERVER_STARTED_AT) / 1000),
  });
});

// Readiness probe: confirms the database is reachable before declaring ready.
app.get("/api/health/ready", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.status(200).json({ status: "ready" });
  } catch (err: any) {
    res
      .status(503)
      .json({ status: "not-ready", error: err?.message || "db unavailable" });
  }
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = (req as any).requestId;

    console.error(
      `Internal Server Error [reqId=${requestId} path=${req.method} ${req.path}]:`,
      err,
    );

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message, requestId });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      ...(process.platform !== "darwin" && { reusePort: true }),
    },
    async () => {
      log(`serving on port ${port}`);
      console.log(
        `[APP BASE URL] ${process.env.APP_URL || process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "none detected"}`,
      );

      // Defer all idempotent boot work (index creation + seed checks +
      // parent-link sync) by 3s so the HTTP listener can start serving
      // requests immediately instead of competing with seven DB jobs
      // for the connection pool on cold start. This dramatically
      // improves first-request latency on Replit cold starts.
      setTimeout(() => {
        ensureHotIndexes().catch((err) =>
          console.error("Ensure hot indexes failed:", err),
        );
        ensureRuleSeeds().catch((err) =>
          console.error("Ensure rule seeds failed:", err),
        );
        seedJuniorSkills().catch((err) =>
          console.error("Seed junior skills failed:", err),
        );
        seedExercises().catch((err) =>
          console.error("Seed exercises failed:", err),
        );
        seedPlayerSkillCategories().catch((err) =>
          console.error("Seed player skills failed:", err),
        );
        seedRecognitionCards().catch((err) =>
          console.error("Seed recognition cards failed:", err),
        );
        syncParentChildLinks().catch((err) =>
          console.error("Sync parent links failed:", err),
        );
      }, 3000);

      setInterval(
        async () => {
          try {
            log("Running daily grading evaluation...", "grading");
            await evaluateAllClubsGrades();
            log("Daily grading evaluation complete", "grading");
          } catch (err) {
            console.error("Daily grading evaluation failed:", err);
          }
        },
        24 * 60 * 60 * 1000,
      );

      setInterval(
        async () => {
          try {
            const closed = await autoCloseInactiveTickets();
            if (closed > 0) {
              log(`Auto-closed ${closed} inactive ticket(s)`, "tickets");
            }
          } catch (err) {
            console.error("Auto-close tickets failed:", err);
          }
        },
        6 * 60 * 60 * 1000,
      );

      setInterval(
        async () => {
          try {
            await runNotificationScheduler();
          } catch (err) {
            console.error("Notification scheduler failed:", err);
          }
        },
        60 * 60 * 1000,
      );

      setTimeout(async () => {
        try {
          await runNotificationScheduler();
        } catch (err) {
          console.error("Initial notification scheduler run failed:", err);
        }
      }, 30 * 1000);

      // Push: post-session unpaid reminder, runs hourly + once on boot
      setInterval(
        async () => {
          try {
            await runPostSessionUnpaidReminder();
          } catch (e) {
            console.error("postSessionUnpaidReminder failed:", e);
          }
        },
        60 * 60 * 1000,
      );
      setTimeout(async () => {
        try {
          await runPostSessionUnpaidReminder();
        } catch (e) {
          console.error("Initial postSessionUnpaidReminder failed:", e);
        }
      }, 45 * 1000);

      // Phase 2: profile-incomplete reminder, weekly + once an hour after boot to pick up new signups
      setInterval(
        async () => {
          try {
            await runProfileIncompleteReminder();
          } catch (e) {
            console.error("profileIncompleteReminder failed:", e);
          }
        },
        7 * 24 * 60 * 60 * 1000,
      );
      setTimeout(async () => {
        try {
          await runProfileIncompleteReminder();
        } catch (e) {
          console.error("Initial profileIncompleteReminder failed:", e);
        }
      }, 60 * 1000);

      // Phase 4: scheduled notifications cron — sweep due rows every minute
      setInterval(async () => {
        try {
          await runScheduledNotifications();
        } catch (e) {
          console.error("scheduledNotifications failed:", e);
        }
      }, 60 * 1000);
    },
  );

  // Graceful shutdown: stop accepting new connections, drain in-flight requests,
  // then exit. Force-exits after 15s if anything is hanging.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`received ${signal}, shutting down...`);
    const forceExit = setTimeout(() => {
      console.error("Shutdown timed out, forcing exit");
      process.exit(1);
    }, 15000);
    forceExit.unref();
    httpServer.close((err) => {
      if (err) {
        console.error("Error during server close:", err);
        process.exit(1);
      }
      log("server closed cleanly");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();

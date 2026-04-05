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
import { syncParentChildLinks } from "./parentLinkSync";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
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

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
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
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);
      console.log(`[APP BASE URL] ${process.env.APP_URL || process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'none detected'}`);

      seedJuniorSkills().catch(err => console.error("Seed junior skills failed:", err));
      seedExercises().catch(err => console.error("Seed exercises failed:", err));
      seedPlayerSkillCategories().catch(err => console.error("Seed player skills failed:", err));
      seedRecognitionCards().catch(err => console.error("Seed recognition cards failed:", err));
      syncParentChildLinks().catch(err => console.error("Sync parent links failed:", err));

      setInterval(async () => {
        try {
          log("Running daily grading evaluation...", "grading");
          await evaluateAllClubsGrades();
          log("Daily grading evaluation complete", "grading");
        } catch (err) {
          console.error("Daily grading evaluation failed:", err);
        }
      }, 24 * 60 * 60 * 1000);

      setInterval(async () => {
        try {
          const closed = await autoCloseInactiveTickets();
          if (closed > 0) {
            log(`Auto-closed ${closed} inactive ticket(s)`, "tickets");
          }
        } catch (err) {
          console.error("Auto-close tickets failed:", err);
        }
      }, 6 * 60 * 60 * 1000);

      setInterval(async () => {
        try {
          await runNotificationScheduler();
        } catch (err) {
          console.error("Notification scheduler failed:", err);
        }
      }, 60 * 60 * 1000);

      setTimeout(async () => {
        try {
          await runNotificationScheduler();
        } catch (err) {
          console.error("Initial notification scheduler run failed:", err);
        }
      }, 30 * 1000);
    },
  );
})();

import express, { type Express, type Response } from "express";
import fs from "fs";
import path from "path";

function setNoCacheHtml(res: Response) {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          setNoCacheHtml(res);
          return;
        }
        // Vite emits hashed filenames under /assets/* — safe to cache forever.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.use("/{*path}", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.get("host") || "";
    const baseUrl = `${protocol}://${host}`;
    html = html.replace(/content="\/og-logo\.png"/g, `content="${baseUrl}/og-logo.png"`);
    setNoCacheHtml(res);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}

import { build as esbuildBuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");

  await esbuildBuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: [
      "vite",
      "@replit/vite-plugin-cartographer",
      "@replit/vite-plugin-dev-banner",
      "@replit/vite-plugin-runtime-error-modal",
      "googleapis",
      "google-auth-library",
      "brotli",
      "fontkit",
      "pdfkit",
      "openai",
      "pg",
      "pg-native",
      "drizzle-orm",
      "drizzle-kit",
      "passport",
      "passport-local",
      "express-session",
      "connect-pg-simple",
      "nodemailer",
      "tr46",
      "whatwg-url",
    ],
    logLevel: "info",
  });
}

buildAll().then(() => {
  console.log("Build completed successfully!");
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

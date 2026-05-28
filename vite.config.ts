import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Split heavy third-party libs out of the main bundle so cold loads
    // can fetch the shell quickly and pull in feature-specific vendors
    // (charts, maps, image export) only when those routes mount.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("leaflet") || id.includes("mapbox-gl")) return "vendor-maps";
          if (id.includes("html2canvas") || id.includes("jspdf")) return "vendor-export";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "vendor-icons";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (dev included) so the build tools (esbuild, vite, tsx) work
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install production deps only.
# drizzle-kit is in "dependencies" (not devDependencies) so it's included here.
COPY package*.json ./
RUN npm ci --omit=dev

# Built client (dist/public) and server bundle (dist/index.cjs)
COPY --from=builder /app/dist ./dist

# drizzle-kit needs these to run "db:push" at container startup
COPY drizzle.config.ts ./
COPY shared/ ./shared/

ENV NODE_ENV=production
EXPOSE 5000

# Run schema migration then start the server
CMD ["sh", "-c", "node node_modules/.bin/drizzle-kit push && node dist/index.cjs"]

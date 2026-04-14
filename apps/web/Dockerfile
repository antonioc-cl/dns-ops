FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/*/package.json packages/*/

# Install dependencies
RUN npm install -g bun && bun install

# Copy source
COPY . .

# Build
RUN bun run build --filter=@dns-ops/web

# Run migrations
WORKDIR /app/packages/db
RUN DATABASE_URL=$DATABASE_URL bunx drizzle-kit push:pg || true

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["node", "apps/web/.output/server/index.mjs"]

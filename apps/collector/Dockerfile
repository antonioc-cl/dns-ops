# DNS Ops Collector Worker Dockerfile
# Separate Node.js runtime for DNS collection and probes

FROM node:20-slim AS base

# Install DNS utilities for debugging
RUN apt-get update && apt-get install -y \
    dnsutils \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ../../package.json
COPY ../../pnpm-workspace.yaml ../../pnpm-workspace.yaml
COPY ../../tsconfig.base.json ../../tsconfig.base.json
COPY package.json ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Non-root user for security
RUN groupadd -r collector && useradd -r -g collector collector
USER collector

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "dist/index.js"]

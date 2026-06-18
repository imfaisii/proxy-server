# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies with a frozen lockfile for reproducible builds.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the source and build the Next.js standalone output.
COPY . .
RUN bun run build

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# conntrack + iproute2 are needed to read host conntrack (requires CAP_NET_ADMIN,
# granted by docker-compose). ca-certificates for outbound TLS (metrics/db-ip/etc).
RUN apt-get update \
    && apt-get install -y --no-install-recommends conntrack iproute2 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the Next.js standalone server output.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Run as the unprivileged node user; CAP_NET_ADMIN from compose still applies.
USER node

EXPOSE 3000
CMD ["node", "server.js"]

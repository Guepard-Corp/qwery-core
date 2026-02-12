# syntax=docker.io/docker/dockerfile:1
# Build context: monorepo root (.)
FROM node:24-slim AS base

FROM base AS deps
WORKDIR /app
ENV CI=true
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY tooling/ ./tooling/
COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rr
RUN mkdir -p /home/rr && chown rr:nodejs /home/rr
ENV HOME=/home/rr

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun

COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/server/package.json ./apps/server/package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/.npmrc ./.npmrc

COPY --from=deps /app/apps/server/ ./apps/server/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

ENV CI=true

RUN mkdir -p node_modules/@duckdb && \
    for pkg in node-api node-bindings; do \
      for dir in node_modules/.pnpm/@duckdb+${pkg}@*/node_modules/@duckdb/${pkg}; do \
        [ -d "$dir" ] && ln -sf "../$(echo "$dir" | sed 's|^node_modules/||')" node_modules/@duckdb/${pkg} && break; \
      done; \
    done

RUN mkdir -p /app/data && chown -R rr:nodejs /app/apps/server /app/data

ENV PATH="/usr/local/bin:$PATH"
ENV QWERY_STORAGE_DIR=/app/data/qwery.db
ENV WORKSPACE=/app/data/workspace

USER rr

EXPOSE 4096
ENV PORT=4096
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=90s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:4096/health || exit 1

CMD ["bun", "run", "apps/server/src/index.ts"]

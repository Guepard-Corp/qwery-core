# syntax=docker.io/docker/dockerfile:1
# Build context: monorepo root (.)
FROM node:24-slim AS base

FROM base AS deps
WORKDIR /app
ENV CI=true
RUN corepack enable pnpm
RUN npm install -g turbo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY turbo.json tsconfig.json ./
COPY packages/ ./packages/
COPY tooling/ ./tooling/
COPY apps/web/ ./apps/web/
COPY apps/server/ ./apps/server/

RUN echo "node-linker=hoisted" >> .npmrc
RUN pnpm install --frozen-lockfile
RUN npm rebuild lightingcss --build-from-source --verbose

FROM base AS builder
WORKDIR /app

RUN corepack enable pnpm
RUN npm install -g turbo

COPY --from=deps /app ./

ARG VITE_APP_VERSION
ARG VITE_APP_GIT_HASH
ARG VITE_SITE_URL=http://localhost:3000
ARG VITE_SITE_DESCRIPTION
ARG VITE_SENTRY_DSN

ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_GIT_HASH=$VITE_APP_GIT_HASH
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_SITE_DESCRIPTION=$VITE_SITE_DESCRIPTION
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV TURBO_TELEMETRY_DISABLED=1
ENV DO_NOT_TRACK=1

RUN turbo run build --filter=web...
RUN pnpm extensions:build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

ARG VITE_APP_VERSION
ARG VITE_APP_GIT_HASH
ARG VITE_SITE_URL=http://localhost:3000
ARG VITE_SITE_DESCRIPTION
ARG VITE_SENTRY_DSN

ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_GIT_HASH=$VITE_APP_GIT_HASH
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_SITE_DESCRIPTION=$VITE_SITE_DESCRIPTION
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rr
RUN mkdir -p /home/rr && chown rr:nodejs /home/rr
ENV HOME=/home/rr

RUN corepack enable pnpm

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc ./.npmrc

COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

ENV CI=true

COPY --from=builder /app/apps/web/lib/i18n/locales ./build/server/lib/i18n/locales
COPY --from=builder /app/apps/web/lib/i18n/locales ./build/client/lib/i18n/locales

RUN mkdir -p node_modules/@duckdb && \
    for pkg in node-api node-bindings; do \
      for dir in node_modules/.pnpm/@duckdb+${pkg}@*/node_modules/@duckdb/${pkg}; do \
        [ -d "$dir" ] && ln -sf "../$(echo "$dir" | sed 's|^node_modules/||')" node_modules/@duckdb/${pkg} && break; \
      done; \
    done

COPY --from=builder /app/apps/web/package.json ./package.json

RUN npm -g install cross-env @react-router/serve

RUN chown -R rr:nodejs /app/build

USER rr

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=90s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

CMD ["npm", "start"]

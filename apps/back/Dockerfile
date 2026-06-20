# syntax=docker/dockerfile:1.7

# Monorepo context: always build from repository root (--file apps/back/Dockerfile).
FROM node:24.13.1-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.8.0

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/back/package.json ./apps/back/package.json

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-back \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store --filter ./apps/back...

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/back ./apps/back

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-back \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store --filter ./apps/back...

RUN pnpm --filter ./apps/back run build \
  && chmod +x /app/apps/back/entrypoint.sh

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-back \
    rm -rf /app/node_modules /app/apps/back/node_modules \
    && pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store --filter ./apps/back...

FROM node:24.13.1-bookworm-slim AS runtime

ENV NODE_ENV=production

ARG APP_RELEASE=unknown

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.8.0 \
  && addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app --home /nonexistent --shell /usr/sbin/nologin app

WORKDIR /app

COPY --from=build --chown=app:app /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/apps/back ./apps/back

LABEL org.opencontainers.image.revision="${APP_RELEASE}"

USER app

WORKDIR /app/apps/back

ENTRYPOINT ["/app/apps/back/entrypoint.sh"]
EXPOSE 4001

CMD ["pnpm", "run", "start:prod"]

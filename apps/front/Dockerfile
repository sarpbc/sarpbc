# syntax=docker/dockerfile:1.7

# Monorepo context: always build from repository root (--file apps/front/Dockerfile).
FROM node:24.13.1-alpine AS base

WORKDIR /app
RUN apk add --no-cache libc6-compat \
  && npm install -g pnpm@11.17.0

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/front/package.json ./apps/front/package.json
COPY packages/composables/package.json ./packages/composables/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-front \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store --filter ./apps/front...

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/front ./apps/front

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-front \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store --filter ./apps/front...

WORKDIR /app/apps/front

ARG APP_RELEASE=unknown
ENV APP_RELEASE=${APP_RELEASE}

ENV NODE_OPTIONS=--max-old-space-size=8192

RUN pnpm run build

FROM node:24.13.1-alpine AS runtime

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=4000
ENV HOST=0.0.0.0
ENV PORT=4000

ARG APP_RELEASE=unknown
LABEL org.opencontainers.image.revision="${APP_RELEASE}"

RUN addgroup -g 1001 -S app && adduser -S -u 1001 -G app app

WORKDIR /app

COPY --from=build --chown=app:app /app/apps/front/.output/ ./

USER app
EXPOSE 4000

CMD ["node", "/app/server/index.mjs"]

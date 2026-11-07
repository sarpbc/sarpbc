# syntax=docker/dockerfile:1.7

# Monorepo context: always build from repository root (--file apps/admin/Dockerfile).
ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app
COPY package.json ./
RUN apk add --no-cache libc6-compat \
  && npm install -g "pnpm@$(node -p "require('./package.json').packageManager.replace(/^pnpm@|\+.*$/g, '')")"

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-admin \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store --filter ./apps/admin...

WORKDIR /app/apps/admin

ENV NODE_OPTIONS=--max-old-space-size=8192

RUN pnpm run build

FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=4002

ARG APP_RELEASE=unknown
LABEL org.opencontainers.image.revision="${APP_RELEASE}"

RUN addgroup -g 1001 -S app && adduser -S -u 1001 -G app app

WORKDIR /app

COPY --from=build --chown=app:app /app/apps/admin/.output/ ./

USER app
EXPOSE 4002

CMD ["node", "/app/server/index.mjs"]

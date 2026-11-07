# syntax=docker/dockerfile:1.7

# Monorepo context: always build from repository root (--file apps/back/Dockerfile).
ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.replace(/^pnpm@|\+.*$/g, '')")"

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY packages ./packages
COPY apps/back ./apps/back

# Install after package sources are present so workspace package
# node_modules (e.g. packages/utils → @sarpbc/types) are linked for nest/tsc.
# `--filter ./apps/back...` alone links packages into apps/back/node_modules only;
# nest/tsc then fails resolving imports from the utils sources.
# Without packages/types, `pnpm run` finds it has no modules directory and reinstalls
# with a narrower scope, which removes slugify (a utils-only dependency) from the virtual store.
RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-back \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store \
      --filter ./apps/back... \
      --filter ./packages/utils... \
      --filter ./packages/types...

RUN pnpm --filter ./apps/back run build \
  && test -f /app/apps/back/dist/mikro-orm.config.js \
  && test -f /app/apps/back/dist/main.js \
  && test -d /app/apps/back/dist/infrastructure/database/migrations \
  && chmod +x /app/apps/back/entrypoint.sh

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-store-back \
    rm -rf /app/node_modules /app/apps/back/node_modules /app/packages/utils/node_modules /app/packages/types/node_modules \
    && pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store \
      --filter ./apps/back... \
      --filter ./packages/utils...

FROM base AS runtime

ENV NODE_ENV=production
# Node can strip types, so the MikroORM CLI would otherwise load src/mikro-orm.config.ts, whose
# imports resolve to package sources that only a bundler can read.
ENV MIKRO_ORM_CLI_PREFER_TS=false

ARG APP_RELEASE=unknown

RUN addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 --ingroup app --home /nonexistent --shell /usr/sbin/nologin app

COPY --from=build --chown=app:app /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/packages ./packages
COPY --from=build --chown=app:app /app/apps/back ./apps/back

LABEL org.opencontainers.image.revision="${APP_RELEASE}"

USER app

WORKDIR /app/apps/back

ENTRYPOINT ["/app/apps/back/entrypoint.sh"]
EXPOSE 4001

CMD ["pnpm", "run", "start:prod"]

# syntax=docker/dockerfile:1

# Built from the repository root, not from apps/web: the web app depends on the
# workspace package @agent-wrapped/core, which lives outside this directory.
#   docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS base
# CI=true stops pnpm prompting to purge node_modules with no TTY attached.
# verifyDepsBeforeRun=false stops every `pnpm --filter ... run` from re-running
# install: node_modules arrives from the deps stage, so the check both wastes a
# network round trip and misfires once COPY . . lands the sources on top.
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=true \
    PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
RUN corepack enable


# --- dependencies -----------------------------------------------------------
# Manifests only, so a source-only change reuses the cached install layer.
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
# apps/web has a postinstall that runs `prisma generate`, so the schema has to
# be present before install. It is small and changes rarely, so copying it here
# does not meaningfully weaken the cached install layer.
COPY apps/web/prisma apps/web/prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile


# --- build ------------------------------------------------------------------
FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .

# core compiles to dist/, which apps/web resolves through the workspace link.
RUN pnpm --filter @agent-wrapped/core build

# Prisma's client is generated, not published, so it has to exist before the
# Next build type-checks anything that imports it.
RUN pnpm --filter @agent-wrapped/web exec prisma generate
RUN pnpm --filter @agent-wrapped/web exec next build


# --- runtime ----------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# The standalone output already contains a pruned node_modules with the traced
# workspace packages inlined, so nothing else needs copying.
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

# Migrations and the schema travel with the image, and the Prisma CLI is
# installed flat (npm, not pnpm) so Railway's pre-deploy step can run
# `prisma migrate deploy` without the workspace layout around it.
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/prisma ./apps/web/prisma
RUN npm install --global --no-fund --no-audit prisma@6.19.3

USER nextjs

ENV PORT=3000 \
    HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "apps/web/server.js"]

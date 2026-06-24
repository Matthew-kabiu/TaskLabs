# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate && pnpm config set store-dir /pnpm/store
WORKDIR /workspace

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN --mount=type=cache,id=tasklabs-pnpm-store,target=/pnpm/store \
    pnpm install --filter @tasklabs/frontend --filter @tasklabs/backend --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_CONVEX_URL
ARG TELEGRAM_API_ORIGIN
ARG NEXT_TURBOPACK_ROOT
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV TELEGRAM_API_ORIGIN=$TELEGRAM_API_ORIGIN
ENV NEXT_TURBOPACK_ROOT=$NEXT_TURBOPACK_ROOT
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/frontend/node_modules ./frontend/node_modules
COPY --from=deps /workspace/backend/node_modules ./backend/node_modules
COPY frontend ./frontend
COPY backend/convex ./backend/convex
WORKDIR /workspace/frontend
RUN pnpm build

FROM base AS run
ENV NODE_ENV=production
WORKDIR /workspace/frontend
COPY --from=build /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/frontend/node_modules ./node_modules
COPY --from=build /workspace/backend/node_modules /workspace/backend/node_modules
COPY --from=build /workspace/backend/convex /workspace/backend/convex
COPY --from=build /workspace/frontend/.next ./.next
COPY --from=build /workspace/frontend/public ./public
COPY --from=build /workspace/frontend/package.json ./package.json
CMD ["pnpm", "start"]

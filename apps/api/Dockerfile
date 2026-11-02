FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/chain/package.json packages/chain/
COPY packages/memory/package.json packages/memory/
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY packages/chain packages/chain
COPY packages/memory packages/memory
COPY apps/api apps/api
ENV NODE_ENV=production
USER bun
CMD ["bun", "apps/api/src/main.ts"]

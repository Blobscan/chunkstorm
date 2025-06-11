
FROM node:20-alpine AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

LABEL maintainer="Blobscan Team"
LABEL org.opencontainers.image.title="ChunkStorm"
LABEL org.opencontainers.image.description="Simple Node.js server that splits, stamps and distributes chunks to multiple Bee nodes."
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

ENV NODE_ENV=production

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --shell /bin/sh nodeuser && \
    chown -R nodeuser:nodejs /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist

USER nodeuser

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3050/health || exit 1

CMD ["node", "dist/index.js"]

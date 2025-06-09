
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-slim

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser && \
    chown -R nodeuser:nodejs /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist

USER nodeuser

ENV NODE_ENV=production \
    PORT=3050 \
    TARGET=http://localhost:1633

EXPOSE 3050

CMD ["node", "dist/index.js"]

# ---- deps: install prod dependencies only ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY db ./db
COPY docs ./docs
COPY scripts ./scripts

RUN addgroup -S agentden && adduser -S agentden -G agentden
USER agentden

EXPOSE 3000
CMD ["node", "src/server.js"]

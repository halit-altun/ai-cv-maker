# CV AI Maker Backend — Northflank / Docker
# Build context: Backend/ klasörü (repo root değil)
FROM node:22-bookworm-slim

WORKDIR /app

# Northflank Networking port ile aynı olmalı (şu an 3001)
ENV NODE_ENV=production \
    REACHER_AUTO_START=false \
    PORT=3001

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3001/health || exit 1

CMD ["node", "index.js"]

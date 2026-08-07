# CV AI Maker Backend — Northflank / Docker
# Build context: Backend/ klasörü
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    REACHER_AUTO_START=false \
    PORT=3001

# pdf-parse / native deps için minimal sistem paketleri
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# Northflank / container: prestart (Reacher docker) çalışmasın
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "index.js"]

# CV AI Maker Backend — Northflank / Docker
# Build context: Backend/ klasörü (repo root değil)
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    REACHER_AUTO_START=false \
    PORT=3001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

# npm start kullanma (prestart Reacher/Docker dener). Health check'i Northflank UI'dan /health yap.
CMD ["node", "index.js"]

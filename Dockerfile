# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Backend dependencies (production only)
COPY package*.json ./
RUN npm ci --omit=dev

# Backend source + knex config
COPY knexfile.js ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/

# React build — served by Express.static() in production
COPY --from=frontend-builder /app/client/dist ./client/dist

# Uploads directory
RUN mkdir -p /app/uploads

EXPOSE 10000

CMD ["node", "src/app.js"]

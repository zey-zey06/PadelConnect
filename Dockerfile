# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# nginx + supervisor
RUN apk add --no-cache nginx supervisor

# Backend dependencies (production only)
COPY package*.json ./
RUN npm ci --omit=dev

# Backend source
COPY knexfile.js ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/

# React build output → nginx root
COPY --from=frontend-builder /app/client/dist /var/www/html

# Config files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Uploads directory
RUN mkdir -p /app/uploads

EXPOSE 10000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

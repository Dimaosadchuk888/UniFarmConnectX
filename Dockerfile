# syntax=docker/dockerfile:1

# ---------- Builder: installs dev deps and builds client ----------
FROM node:18-alpine AS builder
WORKDIR /app

# Install system utilities if needed
RUN apk add --no-cache bash

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

# Build client to dist/public (uses package.json scripts)
RUN npm run build

# ---------- Runtime: production deps only ----------
FROM node:18-alpine AS runtime
WORKDIR /app

# Install runtime tools
RUN apk add --no-cache curl

# Install production dependencies and tsx
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy application source (server code, configs)
COPY . .

# Overwrite dist from builder (ensures built assets exist even if .dockerignore ignores dist locally)
COPY --from=builder /app/dist /app/dist

ENV NODE_ENV=production

# Expose default port (Railway sets PORT env; this is informational)
EXPOSE 3000

# Start the server
CMD ["tsx", "server/index.ts"] 
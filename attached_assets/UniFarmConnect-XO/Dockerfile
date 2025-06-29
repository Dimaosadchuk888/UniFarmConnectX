# Multi-stage Docker build for UniFarm production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd client && npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Build client and server
RUN npm run build
RUN cd client && npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 unifarm

# Copy built application
COPY --from=builder --chown=unifarm:nodejs /app/dist ./dist
COPY --from=builder --chown=unifarm:nodejs /app/client/dist ./client/dist
COPY --from=builder --chown=unifarm:nodejs /app/package*.json ./
COPY --from=deps --chown=unifarm:nodejs /app/node_modules ./node_modules

# Create logs directory
RUN mkdir -p logs && chown -R unifarm:nodejs logs

# Switch to non-root user
USER unifarm

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: process.env.PORT || 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server/index.js"]
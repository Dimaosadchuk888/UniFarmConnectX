# Railway deployment for UniFarm Connect v1.0.29
# FORCE REBUILD: Updated build pipeline - v1.0.29 - CLEAN REBUILD
# PRODUCTION BUILD PIPELINE
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl
# FORCE CACHE INVALIDATION v1.0.29

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy all source code
COPY . .

# Build the client
RUN npm run build:client

# Build the server
RUN npm run build:server

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Health check - simplified and with longer timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start application with compiled server
CMD ["node", "dist/server/index.js"] 
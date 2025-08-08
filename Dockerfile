# Railway deployment for UniFarm Connect v1.0.21
# FIXED: Ensure static files are copied to production
# NO BUILD STEP - DIRECT TSX EXECUTION
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies and tsx globally
RUN npm install --production && npm install -g tsx

# Copy all source code
COPY . .

# Ensure dist/public directory exists and copy static files
RUN mkdir -p dist/public && \
    cp -r client/public/* dist/public/ 2>/dev/null || true && \
    cp client/index.html dist/public/ 2>/dev/null || true

# Expose port
EXPOSE 3000

# Health check - simplified and with longer timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start application directly with tsx - NO BUILD STEP
CMD ["tsx", "server/index.ts"] 
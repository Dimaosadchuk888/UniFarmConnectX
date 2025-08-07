# Railway deployment for UniFarm Connect v1.0.5
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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v2/monitor/health || exit 1

# Start application directly with tsx - NO BUILD STEP
CMD ["tsx", "server/index.ts"] 
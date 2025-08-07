# Use Node.js 18 Alpine for smaller image size
# Railway deployment fix v1.0.2 - no TypeScript compilation
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including tsx globally
RUN npm install --production && npm install -g tsx

# Copy source code
COPY . .

# Create dist directory and copy files (no TypeScript compilation needed)
RUN mkdir -p dist && cp -r server dist/ && cp -r core dist/ && cp -r config dist/ && cp -r modules dist/ && cp -r types dist/ && cp package.json dist/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v2/monitor/health || exit 1

# Start the application
CMD ["npm", "start"] 